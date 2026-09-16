/**
 * @file googleSheets.ts
 * @description Cliente y utilidades para interactuar con la API de Google Sheets v4 utilizando OAuth 2.0.
 * Proporciona métodos GET y POST para la gestión de inventario y datos operativos de CEDIS.
 */

/**
 * Interfaz principal para representar un artículo de inventario.
 * Basada en la estructura requerida: SKU, Nombre, Stock, Ubicación,
 * con campos complementarios para la operación de repuestos y logística.
 */
export interface InventoryItem {
  /** Código único de identificación o referencia OEM */
  sku: string;
  /** Nombre comercial o descripción técnica del producto */
  nombre: string;
  /** Cantidad actual disponible en stock físico */
  stock: number;
  /** Ubicación física dentro del almacén / CEDIS (Rack, Pallet, Bahía, Pasillo) */
  ubicacion: string;
  /** Categoría o familia del producto (ej: Motor, Carrocería, Frenos, VOR) */
  categoria?: string;
  /** Descripción detallada o especificación técnica */
  descripcion?: string;
  /** Precio unitario de lista o costo referencial */
  precio?: number;
  /** Estado del artículo (ej: Disponible, Agotado, Bajo Stock, Comprometido) */
  estado?: 'Disponible' | 'Bajo Stock' | 'Agotado' | 'Comprometido' | string;
  /** Marca o modelo compatible (ej: UNI-T, CS55 Plus, Hunter) */
  modeloCompatible?: string;
  /** Fecha/hora de última actualización o sincronización */
  ultimaActualizacion?: string;
}

/**
 * Respuesta estándar devuelta por la API de Google Sheets en consultas GET de valores.
 */
export interface GoogleSheetsValueRange {
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  values?: (string | number | boolean)[][];
}

/**
 * Respuesta devuelta por la API de Google Sheets tras un método POST (append).
 */
export interface GoogleSheetsAppendResponse {
  spreadsheetId: string;
  tableRange?: string;
  updates: {
    spreadsheetId: string;
    updatedRange: string;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
  };
}

/**
 * Configuración para solicitudes a la API de Google Sheets.
 */
export interface SheetsRequestConfig {
  spreadsheetId: string;
  range: string;
  accessToken: string;
  valueInputOption?: 'USER_ENTERED' | 'RAW';
}

/**
 * Alcances (Scopes) oficiales de OAuth 2.0 requeridos para Google Sheets.
 */
export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
] as const;

/** URL base de la API v4 de Google Sheets */
const SHEETS_API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Cabeceras estándar esperadas en la primera fila de la hoja de cálculo.
 */
export const INVENTORY_SHEET_HEADERS = [
  'SKU',
  'Nombre',
  'Stock',
  'Ubicación',
  'Categoría',
  'Descripción',
  'Precio',
  'Estado',
  'Modelo Compatible',
  'Última Actualización'
];

/**
 * Genera las cabeceras HTTP de autorización OAuth 2.0.
 * @param accessToken Token de acceso Bearer obtenido vía OAuth 2.0.
 */
export function getAuthHeaders(accessToken: string): HeadersInit {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Se requiere un token de acceso OAuth 2.0 válido (Bearer token).');
  }

  return {
    'Authorization': `Bearer ${accessToken.trim()}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Mapea una fila de valores planos (array de celdas de Sheets) a un objeto `InventoryItem`.
 * @param row Fila de celdas obtenida de Google Sheets
 */
export function mapRowToInventoryItem(row: (string | number | boolean | null | undefined)[]): InventoryItem {
  const parseNum = (val: unknown, fallback = 0): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.-]+/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  const cleanStr = (val: unknown): string => {
    return val !== null && val !== undefined ? String(val).trim() : '';
  };

  const rawStock = parseNum(row[2], 0);

  return {
    sku: cleanStr(row[0]),
    nombre: cleanStr(row[1]),
    stock: rawStock,
    ubicacion: cleanStr(row[3]),
    categoria: cleanStr(row[4]) || undefined,
    descripcion: cleanStr(row[5]) || undefined,
    precio: row[6] !== undefined && row[6] !== '' ? parseNum(row[6]) : undefined,
    estado: cleanStr(row[7]) || (rawStock <= 0 ? 'Agotado' : rawStock < 5 ? 'Bajo Stock' : 'Disponible'),
    modeloCompatible: cleanStr(row[8]) || undefined,
    ultimaActualizacion: cleanStr(row[9]) || undefined,
  };
}

/**
 * Convierte un objeto `InventoryItem` a un arreglo de celdas listo para insertar en Google Sheets.
 * @param item Objeto InventoryItem
 */
export function mapInventoryItemToRow(item: InventoryItem): (string | number)[] {
  return [
    item.sku ? item.sku.trim().toUpperCase() : '',
    item.nombre ? item.nombre.trim() : '',
    typeof item.stock === 'number' ? item.stock : Number(item.stock) || 0,
    item.ubicacion ? item.ubicacion.trim() : '',
    item.categoria ? item.categoria.trim() : '',
    item.descripcion ? item.descripcion.trim() : '',
    item.precio !== undefined ? Number(item.precio) || 0 : '',
    item.estado || (item.stock <= 0 ? 'Agotado' : item.stock < 5 ? 'Bajo Stock' : 'Disponible'),
    item.modeloCompatible ? item.modeloCompatible.trim() : '',
    item.ultimaActualizacion || new Date().toISOString().replace('T', ' ').substring(0, 19)
  ];
}

/**
 * Maneja respuestas de error de la API de Google Sheets y lanza mensajes comprensibles.
 */
async function handleSheetsError(response: Response, actionDescription: string): Promise<never> {
  let errorMsg = `${actionDescription} falló con estado HTTP ${response.status} (${response.statusText})`;
  try {
    const errorBody = await response.json();
    if (errorBody && errorBody.error && errorBody.error.message) {
      errorMsg += `: ${errorBody.error.message}`;
    }
  } catch {
    // Si no es JSON legible, conservar el mensaje base
  }

  if (response.status === 401) {
    throw new Error(`[OAuth 2.0 No Autorizado] El token de acceso ha expirado o no es válido. Vuelva a iniciar sesión: ${errorMsg}`);
  }
  if (response.status === 403) {
    throw new Error(`[Permisos Insuficientes] La cuenta no tiene permisos para acceder o modificar esta hoja de cálculo: ${errorMsg}`);
  }
  if (response.status === 404) {
    throw new Error(`[Hoja No Encontrada] El ID de la hoja de cálculo (${response.url}) no existe o fue eliminada: ${errorMsg}`);
  }

  throw new Error(errorMsg);
}

// ============================================================================
// MÉTODOS GET (Lectura de Google Sheets)
// ============================================================================

/**
 * Método GET general para obtener una matriz de celdas desde un rango especificado.
 *
 * @param spreadsheetId ID del documento de Google Sheets (extraído de la URL del spreadsheet)
 * @param range Rango en notación A1 (ej: 'Inventario!A2:J' o 'Hoja 1!A:D')
 * @param accessToken Token de acceso OAuth 2.0 con permisos de lectura
 * @returns Matriz de celdas (filas y columnas)
 *
 * @example
 * ```ts
 * const rows = await getSheetValues('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'Inventario!A2:E', token);
 * ```
 */
export async function getSheetValues(
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<(string | number | boolean)[][]> {
  if (!spreadsheetId) throw new Error('El parámetro spreadsheetId es requerido.');
  if (!range) throw new Error('El parámetro range es requerido.');
  if (!accessToken) throw new Error('El parámetro accessToken (OAuth 2.0) es requerido.');

  const encodedRange = encodeURIComponent(range);
  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    await handleSheetsError(response, `Lectura GET en rango "${range}"`);
  }

  const data: GoogleSheetsValueRange = await response.json();
  return data.values || [];
}

/**
 * Método GET especializado para obtener la lista estructurada de artículos de inventario.
 * Omite automáticamente filas vacías y mapea los datos según la interfaz `InventoryItem`.
 *
 * @param spreadsheetId ID de la hoja de cálculo
 * @param accessToken Token OAuth 2.0 del usuario autenticado
 * @param range Rango opcional (por defecto 'Inventario!A2:J' o 'A2:J')
 * @returns Arreglo de elementos InventoryItem
 */
export async function getInventory(
  spreadsheetId: string,
  accessToken: string,
  range: string = 'Inventario!A2:J'
): Promise<InventoryItem[]> {
  try {
    const rawRows = await getSheetValues(spreadsheetId, range, accessToken);

    // Filtrar filas que tengan al menos SKU o Nombre
    return rawRows
      .filter(row => row && row.length > 0 && (row[0] || row[1]))
      .map(row => mapRowToInventoryItem(row));
  } catch (err: unknown) {
    // Si la hoja 'Inventario' no existe, intentar con la primera hoja por defecto 'Sheet1!A2:J'
    if (range.includes('Inventario') && err instanceof Error && err.message.includes('Unable to parse range')) {
      console.warn('Rango "Inventario" no encontrado, intentando fallback con "Sheet1!A2:J"...');
      const rawRows = await getSheetValues(spreadsheetId, 'Sheet1!A2:J', accessToken);
      return rawRows
        .filter(row => row && row.length > 0 && (row[0] || row[1]))
        .map(row => mapRowToInventoryItem(row));
    }
    throw err;
  }
}

/**
 * Método GET para buscar un artículo por SKU en la hoja de cálculo.
 * @param spreadsheetId ID de la hoja de cálculo
 * @param sku Código SKU a buscar
 * @param accessToken Token de acceso OAuth 2.0
 * @param range Rango a consultar
 */
export async function getInventoryItemBySku(
  spreadsheetId: string,
  sku: string,
  accessToken: string,
  range: string = 'Inventario!A2:J'
): Promise<InventoryItem | null> {
  const items = await getInventory(spreadsheetId, accessToken, range);
  const normalizedSku = sku.trim().toUpperCase();
  const found = items.find(item => item.sku.trim().toUpperCase() === normalizedSku);
  return found || null;
}

// ============================================================================
// MÉTODOS POST (Inserción y Agregación de filas en Google Sheets)
// ============================================================================

/**
 * Método POST general para agregar (append) una o múltiples filas al final de una hoja o tabla.
 * Utiliza el endpoint `:append` de la API v4 de Google Sheets.
 *
 * @param spreadsheetId ID de la hoja de cálculo
 * @param range Rango o nombre de pestaña donde agregar (ej: 'Inventario!A:J' o 'Inventario')
 * @param rows Matriz de filas a insertar
 * @param accessToken Token OAuth 2.0 con permisos de escritura
 * @param valueInputOption 'USER_ENTERED' para procesar fórmulas y tipos automáticamente, o 'RAW'
 * @returns Detalles de las celdas y filas actualizadas
 *
 * @example
 * ```ts
 * const result = await appendSheetValues(sheetId, 'Inventario!A:D', [['SKU-001', 'Filtro Aceite', 12, 'Rack B-3']], token);
 * ```
 */
export async function appendSheetValues(
  spreadsheetId: string,
  range: string,
  rows: (string | number | boolean)[][],
  accessToken: string,
  valueInputOption: 'USER_ENTERED' | 'RAW' = 'USER_ENTERED'
): Promise<GoogleSheetsAppendResponse> {
  if (!spreadsheetId) throw new Error('El parámetro spreadsheetId es requerido.');
  if (!range) throw new Error('El parámetro range es requerido.');
  if (!rows || rows.length === 0) throw new Error('Se debe proporcionar al menos una fila para insertar.');
  if (!accessToken) throw new Error('El parámetro accessToken (OAuth 2.0) es requerido.');

  const encodedRange = encodeURIComponent(range);
  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`;

  const requestBody = {
    range: range,
    majorDimension: 'ROWS',
    values: rows,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    await handleSheetsError(response, `Inserción POST en rango "${range}"`);
  }

  const result: GoogleSheetsAppendResponse = await response.json();
  return result;
}

/**
 * Método POST especializado para registrar un nuevo artículo de inventario.
 *
 * @param spreadsheetId ID de la hoja de cálculo
 * @param item Objeto `InventoryItem` a registrar
 * @param accessToken Token OAuth 2.0 de autorización
 * @param sheetName Nombre de la pestaña de destino (por defecto 'Inventario')
 * @returns Respuesta con las filas actualizadas
 */
export async function addInventoryItem(
  spreadsheetId: string,
  item: InventoryItem,
  accessToken: string,
  sheetName: string = 'Inventario'
): Promise<GoogleSheetsAppendResponse> {
  if (!item.sku || !item.sku.trim()) {
    throw new Error('El SKU del artículo es obligatorio para registrarlo en el inventario.');
  }
  if (!item.nombre || !item.nombre.trim()) {
    throw new Error('El Nombre o descripción técnica del artículo es obligatorio.');
  }

  const row = mapInventoryItemToRow(item);
  return await appendSheetValues(spreadsheetId, `${sheetName}!A:J`, [row], accessToken);
}

/**
 * Método POST para registrar en lote múltiples artículos de inventario en una sola llamada API.
 * Optimiza cuotas de red y llamadas a la API de Google Sheets.
 *
 * @param spreadsheetId ID de la hoja de cálculo
 * @param items Arreglo de artículos `InventoryItem` a insertar
 * @param accessToken Token OAuth 2.0 de autorización
 * @param sheetName Nombre de la pestaña de destino (por defecto 'Inventario')
 * @returns Respuesta con las filas actualizadas
 */
export async function addInventoryItemsBatch(
  spreadsheetId: string,
  items: InventoryItem[],
  accessToken: string,
  sheetName: string = 'Inventario'
): Promise<GoogleSheetsAppendResponse> {
  if (!items || items.length === 0) {
    throw new Error('La lista de artículos a insertar no puede estar vacía.');
  }

  const rows = items.map(item => mapInventoryItemToRow(item));
  return await appendSheetValues(spreadsheetId, `${sheetName}!A:J`, rows, accessToken);
}

/**
 * Método auxiliar para inicializar los encabezados de una hoja de inventario si se encuentra vacía.
 * @param spreadsheetId ID de la hoja de cálculo
 * @param accessToken Token de acceso OAuth 2.0
 * @param sheetName Nombre de la pestaña (ej: 'Inventario')
 */
export async function initializeInventoryHeaders(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string = 'Inventario'
): Promise<GoogleSheetsAppendResponse> {
  return await appendSheetValues(
    spreadsheetId,
    `${sheetName}!A1:J1`,
    [INVENTORY_SHEET_HEADERS],
    accessToken,
    'USER_ENTERED'
  );
}
