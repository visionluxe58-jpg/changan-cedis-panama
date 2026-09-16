/**
 * Módulo de Seguridad y Sanitización para Changan CEDIS Panamá
 * Protege el frontend y el backend contra:
 *  - XSS (Cross-Site Scripting)
 *  - Inyección de Fórmulas en Excel/CSV (Formula Injection / DDE)
 *  - Path Traversal y Nombres de Archivo Malformados
 *  - Manipulación Numérica y Desbordamientos (Tampering)
 *  - Inyección de Comandos / Caracteres de Escape
 *  - Ataques de Denegación de Servicio / Spam (Rate Limiting)
 *  - Fuga de datos en almacenamiento local (Secure Storage)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const memoryStorageFallback = new Map<string, string>();

export const SecurityUtils = {
  /**
   * Sanitiza cadenas de texto libre (Cliente, Observaciones, Notas)
   * Elimina tags HTML, scripts y neutraliza entidades.
   */
  sanitizeText(input: unknown, maxLength = 255): string {
    if (input === null || input === undefined) return '';
    let str = String(input).trim();
    
    // 1. Truncar longitud para evitar ataques de denegación de servicio por memoria
    if (str.length > maxLength) {
      str = str.substring(0, maxLength);
    }

    // 2. Eliminar etiquetas <script>, <iframe>, <object>, etc.
    str = str.replace(/<[^>]*>?/gm, '');

    // 3. Neutralizar entidades HTML y caracteres de control
    str = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return str;
  },

  /**
   * Sanitiza códigos de parte / números OEM
   * Solo permite caracteres alfanuméricos, guiones y barras.
   */
  sanitizeOEMCode(code: unknown): string {
    if (!code) return 'PENDIENTE-COD';
    const clean = String(code)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-_/]/g, '')
      .substring(0, 40);
    return clean || 'PENDIENTE-COD';
  },

  /**
   * Sanitiza placas vehiculares
   */
  sanitizePlate(plate: unknown): string {
    if (!plate) return 'S/P';
    return String(plate)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, '')
      .substring(0, 15);
  },

  /**
   * Sanitiza VIN de 17 dígitos
   */
  sanitizeVIN(vin: unknown): string {
    if (!vin) return 'SIN-VIN';
    const clean = String(vin)
      .trim()
      .toUpperCase()
      .replace(/[^A-HJ-NPR-Z0-9]/g, '') // Los VINs estándar no usan I, O, Q
      .substring(0, 17);
    return clean || 'SIN-VIN';
  },

  /**
   * Valida y normaliza cantidades numéricas contra desbordamiento o valores negativos
   */
  validateQuantity(qty: unknown, min = 1, max = 500): number {
    const num = Number(qty);
    if (isNaN(num) || !isFinite(num)) return min;
    const entero = Math.floor(num);
    if (entero < min) return min;
    if (entero > max) return max;
    return entero;
  },

  /**
   * Sanitiza celdas para exportación CSV
   * Previene CSV Formula Injection (DDE / Macro Injection en Microsoft Excel)
   */
  sanitizeCSVCell(val: unknown): string {
    if (val === null || val === undefined) return '""';
    let s = String(val).trim();

    // Si comienza con =, +, -, @, \t, \r, Excel intentará ejecutarlo como fórmula
    if (/^[=+\-@\t\r]/.test(s)) {
      s = "'" + s; // Prefijar comilla simple para forzar interpretación como texto
    }

    // Escapar comillas dobles internas
    const escaped = s.replace(/"/g, '""');
    return `"${escaped}"`;
  },

  /**
   * Sanitiza nombres de archivos para prevenir Path Traversal
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName) return 'archivo_adjunto.pdf';
    
    // Eliminar secuencias de escape de directorio ../ o ..\
    let safeName = fileName.replace(/\.\./g, '').replace(/[\\/]/g, '_');
    
    // Permitir solo caracteres seguros
    safeName = safeName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    
    // Limitar longitud
    if (safeName.length > 80) {
      const ext = safeName.slice(safeName.lastIndexOf('.'));
      safeName = safeName.slice(0, 70) + ext;
    }

    return safeName;
  },

  /**
   * Valida que el archivo adjunto tenga un formato permitido (PDF, JPG, PNG, WEBP)
   */
  isValidAttachmentMime(base64Data: string): boolean {
    if (!base64Data) return false;
    const allowedPrefixes = [
      'data:application/pdf;',
      'data:image/jpeg;',
      'data:image/jpg;',
      'data:image/png;',
      'data:image/webp;'
    ];
    return allowedPrefixes.some(prefix => base64Data.startsWith(prefix));
  },

  /**
   * Control de Tasa / Rate Limiting (Anti-Spam / Anti-Brute Force)
   * Previene ráfagas de envíos continuos de requisiciones o saturación de Google Apps Script.
   * @param actionKey Identificador único de la acción
   * @param maxAttempts Intentos permitidos dentro de la ventana de tiempo
   * @param windowMs Duración de la ventana en ms (por defecto 30 segundos)
   */
  checkRateLimit(actionKey: string, maxAttempts = 5, windowMs = 30000): { allowed: boolean; remainingAttempts: number; retryAfterSec: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(actionKey);

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(actionKey, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSec: 0 };
    }

    if (entry.count >= maxAttempts) {
      const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSec };
    }

    entry.count += 1;
    return { allowed: true, remainingAttempts: maxAttempts - entry.count, retryAfterSec: 0 };
  },

  /**
   * Restablece el contador de Rate Limiting (para pruebas o desbloqueos)
   */
  resetRateLimit(actionKey?: string): void {
    if (actionKey) {
      rateLimitMap.delete(actionKey);
    } else {
      rateLimitMap.clear();
    }
  },

  /**
   * Almacenamiento seguro ligero con codificación para evitar datos en texto plano
   * Compatible con navegadores y entornos de ejecución de pruebas (Node/Vitest)
   */
  secureStorage: {
    set(key: string, value: unknown): void {
      try {
        const raw = JSON.stringify(value);
        const encoded = btoa(encodeURIComponent(raw));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`changan_sec_${key}`, encoded);
        } else {
          memoryStorageFallback.set(`changan_sec_${key}`, encoded);
        }
      } catch {
        // Fallback seguro silencioso
      }
    },
    get<T>(key: string, fallback: T): T {
      try {
        let item: string | null | undefined = null;
        if (typeof localStorage !== 'undefined') {
          item = localStorage.getItem(`changan_sec_${key}`);
        } else {
          item = memoryStorageFallback.get(`changan_sec_${key}`);
        }
        if (!item) return fallback;
        const decoded = decodeURIComponent(atob(item));
        return JSON.parse(decoded) as T;
      } catch {
        return fallback;
      }
    }
  }
};
