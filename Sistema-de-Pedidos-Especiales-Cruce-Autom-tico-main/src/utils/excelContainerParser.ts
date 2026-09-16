import * as XLSX from 'xlsx';
import { ContainerManifestItem } from '../types';

export interface ParsedContainerExcel {
  containerNumber: string;
  supplier: string;
  poNumber: string;
  transportType: 'Marítimo' | 'Aéreo Express';
  arrivalStatus: 'En Tránsito' | 'Recibido en CEDIS';
  estimatedArrivalDate: string;
  items: ContainerManifestItem[];
  warnings: string[];
}

/**
 * Checks if a given string contains the word 'PLANTILLA' or 'TEMPLATE'
 * to explicitly ignore and discard template artifacts.
 */
function isPlantillaToken(text: any): boolean {
  if (text === null || text === undefined) return false;
  const str = String(text).trim().toUpperCase();
  return str.includes('PLANTILLA') || str.includes('TEMPLATE');
}

/**
 * Intelligent Excel / CSV parser for Shipping Containers & Manifests.
 * - Explicitly ignores any cell containing the word 'PLANTILLA'.
 * - Automatically remaps the 'Invoice No.' column / header directly as 'N° de contenedor'.
 * - Eliminates any field indicating 'Factura de importación'.
 */
export async function parseContainerExcelFile(file: File): Promise<ParsedContainerExcel> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo válidas.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D matrix of raw strings
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  let containerNumber = '';
  let supplier = 'Mobitech Changan China Co., Ltd';
  let poNumber = '';
  let transportType: 'Marítimo' | 'Aéreo Express' = 'Marítimo';
  let arrivalStatus: 'En Tránsito' | 'Recibido en CEDIS' = 'En Tránsito';
  let estimatedArrivalDate = new Date().toISOString().split('T')[0];
  const warnings: string[] = [];

  // Words that must NEVER be treated as a container/invoice number or valid part code
  const blacklistedTokens = new Set([
    'PLANTILLA',
    'PLANTILLAS',
    'TEMPLATE',
    'TEMPLATES',
    'CHANGAN',
    'EXCEL',
    'CONTAINER',
    'CONTAINERS',
    'CONTENEDOR',
    'CONTENEDORES',
    'PEDIDO',
    'PEDIDOS',
    'IMPORT',
    'IMPORTACION',
    'MANIFIESTO',
    'MANIFIESTOS',
    'INVOICE',
    'INVOICES',
    'INVOICE_NO',
    'DESPACHO',
    'HOJA',
    'NUEVO',
    'ARCHIVOS',
    'FILE',
    'OFICIAL',
    'CEDIS',
    'PANAMA'
  ]);

  // 1. Check if the file name contains a specific alphanumeric serial (e.g. "2606M00000SF0042", "MSKU9921034")
  // Ignore completely if the file name is just a template name or contains PLANTILLA
  const cleanFileName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
  if (!isPlantillaToken(cleanFileName)) {
    const wordsInFileName = cleanFileName.split(/[^A-Z0-9]/).filter((w) => w.length >= 4);
    for (const word of wordsInFileName) {
      if (!isPlantillaToken(word) && !blacklistedTokens.has(word) && /\d/.test(word) && word.length >= 6) {
        containerNumber = word;
        break;
      }
    }
  }

  // 2. Scan top 25 rows for metadata key-values
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r];
    if (!row || !Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      
      // CRITICAL: Explicitly ignore any cell that contains the word 'PLANTILLA'
      if (isPlantillaToken(cellVal)) {
        continue;
      }

      const lower = cellVal.toLowerCase();

      // Remap 'Invoice No.' or Container identifier directly as containerNumber ('N° de contenedor')
      if (
        lower.includes('invoice_no') ||
        lower.includes('invoice no.') ||
        lower.includes('invoice no') ||
        lower.includes('invoice #') ||
        lower.includes('inv no') ||
        lower.includes('n° invoice') ||
        lower.includes('nº invoice') ||
        lower.includes('factura no') ||
        lower.includes('n° factura') ||
        lower.includes('nº factura') ||
        lower.includes('contenedor') ||
        lower.includes('container') ||
        lower.includes('bl / tracking') ||
        lower.includes('n° contenedor') ||
        lower.includes('b/l no')
      ) {
        const nextCell = String(row[c + 1] || '').trim();
        const split = cellVal.split(/[:=]/);
        const candidate = nextCell && nextCell.length > 2 ? nextCell : split[1]?.trim();

        if (candidate && !isPlantillaToken(candidate)) {
          const upperCandidate = candidate.toUpperCase();
          if (!blacklistedTokens.has(upperCandidate)) {
            containerNumber = upperCandidate;
          }
        }
      }

      // Check Supplier / Factory
      if (
        lower.includes('proveedor') ||
        lower.includes('supplier') ||
        lower.includes('fabrica') ||
        lower.includes('fábrica') ||
        lower.includes('origen') ||
        lower.includes('shipper')
      ) {
        const nextCell = String(row[c + 1] || '').trim();
        const split = cellVal.split(/[:=]/);
        const cand = nextCell || split[1]?.trim();
        if (cand && !isPlantillaToken(cand) && !blacklistedTokens.has(cand.toUpperCase())) {
          supplier = cand;
        }
      }

      // Check PO Number / Reference (Orden de compra / PO origen)
      if (
        lower.includes('orden de compra') ||
        lower.includes('purchase order') ||
        lower.includes('po no') ||
        lower.includes('p.o no') ||
        lower.includes('orden_compra_po') ||
        lower.includes('referencia_origen') ||
        lower === 'po' ||
        lower === 'p.o'
      ) {
        const nextCell = String(row[c + 1] || '').trim();
        const split = cellVal.split(/[:=]/);
        const cand = nextCell || split[1]?.trim();
        if (cand && !isPlantillaToken(cand) && !blacklistedTokens.has(cand.toUpperCase())) {
          poNumber = cand.toUpperCase();
        }
      }

      // Check Transport Type
      if (lower.includes('aereo') || lower.includes('aéreo') || lower.includes('air express') || lower.includes('express')) {
        transportType = 'Aéreo Express';
      }

      // Check Status
      if (lower.includes('recibido') || lower.includes('en bodega') || lower.includes('arribado')) {
        arrivalStatus = 'Recibido en CEDIS';
      } else if (lower.includes('transito') || lower.includes('tránsito') || lower.includes('en camino') || lower.includes('maritimo')) {
        arrivalStatus = 'En Tránsito';
      }

      // Check Estimated Date
      if (lower.includes('fecha') || lower.includes('arribo') || lower.includes('eta') || lower.includes('arrival')) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && !isPlantillaToken(nextCell) && (nextCell.includes('-') || nextCell.includes('/'))) {
          estimatedArrivalDate = nextCell;
        }
      }

      // Detect Table Header Row (containing Code, Description, Quantity or Invoice No columns)
      if (
        (lower.includes('codigo') ||
          lower.includes('código') ||
          lower.includes('codigo_parte') ||
          lower.includes('part no') ||
          lower.includes('part number') ||
          lower.includes('repuesto') ||
          lower.includes('item no') ||
          lower.includes('material no') ||
          lower.includes('referencia')) &&
        headerRowIndex === -1
      ) {
        headerRowIndex = r;
      }
    }
  }

  // If table header row was not detected, assume row 0 or 1
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  // 3. Find column indices in the header row
  const headerRow = matrix[headerRowIndex] || [];
  let colInvoice = -1;
  let colCode = -1;
  let colDesc = -1;
  let colQty = -1;
  let colLoc = -1;

  for (let c = 0; c < headerRow.length; c++) {
    const rawHeader = String(headerRow[c] || '').trim();
    if (isPlantillaToken(rawHeader)) continue;

    const title = rawHeader.toLowerCase();
    
    // Check if column is 'Invoice No.' to automatically remap as containerNumber
    if (
      title.includes('invoice') ||
      title.includes('inv_no') ||
      title.includes('n° invoice') ||
      title.includes('nº invoice') ||
      title.includes('n° factura') ||
      title.includes('nº de contenedor') ||
      title.includes('n° contenedor') ||
      title.includes('contenedor') ||
      title.includes('container')
    ) {
      if (colInvoice === -1) colInvoice = c;
    }

    if (
      title.includes('codigo') ||
      title.includes('código') ||
      title.includes('part') ||
      title.includes('item') ||
      title.includes('repuesto') ||
      title.includes('material')
    ) {
      if (colCode === -1) colCode = c;
    } else if (title.includes('descrip') || title.includes('nombre') || title.includes('name') || title.includes('detall')) {
      if (colDesc === -1) colDesc = c;
    } else if (title.includes('cant') || title.includes('qty') || title.includes('unidades') || title.includes('piezas') || title.includes('total')) {
      if (colQty === -1) colQty = c;
    } else if (title.includes('ubic') || title.includes('loc') || title.includes('posicion') || title.includes('rack') || title.includes('estanteria')) {
      if (colLoc === -1) colLoc = c;
    }
  }

  // Fallbacks if columns were not labeled standardly
  if (colCode === -1) colCode = 0;
  if (colDesc === -1) colDesc = headerRow.length > 1 ? 1 : 0;
  if (colQty === -1) colQty = headerRow.length > 2 ? 2 : headerRow.length - 1;

  // 4. Extract rows of manifest items
  const items: ContainerManifestItem[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    // Check if row has an Invoice No. column to remap as containerNumber if not yet set
    if (colInvoice >= 0 && row[colInvoice]) {
      const invCandidate = String(row[colInvoice]).trim();
      if (
        invCandidate &&
        !isPlantillaToken(invCandidate) &&
        !blacklistedTokens.has(invCandidate.toUpperCase()) &&
        (!containerNumber || containerNumber.startsWith('CONT-2606M-') || blacklistedTokens.has(containerNumber))
      ) {
        containerNumber = invCandidate.toUpperCase();
      }
    }

    const rawCode = String(row[colCode] || '').trim();
    if (!rawCode || rawCode.length < 2) continue;

    // CRITICAL: Explicitly ignore any row/cell that contains 'PLANTILLA'
    if (isPlantillaToken(rawCode)) {
      continue;
    }

    // Ignore totals, titles, or sub-headers
    const lowerCode = rawCode.toLowerCase();
    if (
      lowerCode.includes('total') ||
      lowerCode.includes('subtotal') ||
      lowerCode.includes('resumen') ||
      lowerCode.includes('firma') ||
      lowerCode.includes('observ') ||
      lowerCode.includes('codigo_parte') ||
      lowerCode.includes('part_no') ||
      lowerCode.startsWith('---')
    ) {
      continue;
    }

    let description = colDesc >= 0 && row[colDesc] ? String(row[colDesc]).trim() : 'Repuesto Changan CEDIS';
    if (isPlantillaToken(description)) {
      description = 'Repuesto Changan CEDIS';
    }

    const rawQty = colQty >= 0 ? row[colQty] : 1;
    const qty = Math.max(1, parseInt(String(rawQty).replace(/[^0-9]/g, '')) || 1);

    let location = colLoc >= 0 && row[colLoc] ? String(row[colLoc]).trim() : '';
    if (isPlantillaToken(location)) {
      location = '';
    }

    if (!location) {
      // Assign realistic CEDIS location based on part type
      if (description.toLowerCase().includes('filtro') || description.toLowerCase().includes('bujia')) {
        location = 'A-01-A-F01';
      } else if (description.toLowerCase().includes('amortiguador') || description.toLowerCase().includes('susp')) {
        location = 'E-02-B-A04';
      } else if (description.toLowerCase().includes('freno') || description.toLowerCase().includes('disco')) {
        location = 'G-01-A-A10';
      } else if (description.toLowerCase().includes('capo') || description.toLowerCase().includes('puerta') || description.toLowerCase().includes('parachoque')) {
        location = 'S-02-A-A01';
      } else {
        location = 'R-01-A-H04';
      }
    }

    items.push({
      id: `MAN-EXCEL-${Date.now()}-${items.length + 1}`,
      code: rawCode.toUpperCase(),
      description,
      totalQuantity: qty,
      assignedQuantity: 0,
      warehouseLocation: location,
    });
  }

  if (items.length === 0) {
    warnings.push('No se detectaron filas de repuestos en el archivo Excel. Por favor verifique las columnas.');
  }

  // If no container/invoice number was found, generate a clean identifier
  if (!containerNumber || isPlantillaToken(containerNumber) || blacklistedTokens.has(containerNumber.toUpperCase())) {
    const rndNum = Math.floor(1000 + Math.random() * 9000);
    containerNumber = `CONT-2606M-${rndNum}`;
    warnings.push(`No se especificó Nº de Contenedor/Invoice No. en el archivo. Se asignó: ${containerNumber} (puede editarlo libremente).`);
  }

  if (!poNumber || isPlantillaToken(poNumber)) {
    poNumber = `REF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  return {
    containerNumber,
    supplier,
    poNumber,
    transportType,
    arrivalStatus,
    estimatedArrivalDate,
    items,
    warnings,
  };
}

/**
 * Generate and download the official Changan CEDIS Container Manifest Template (.xlsx)
 * Uses clean, standardized headers without any confusing 'Factura de importación' fields.
 */
export function downloadChanganManifestTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Datos de Manifiesto
  const data = [
    ['METADATOS DEL EMBARQUE (N° de Contenedor / Invoice No.):'],
    ['INVOICE_NO', '2609M00000SF0042'],
    ['PROVEEDOR', 'Mobitech Changan China Co., Ltd'],
    ['REFERENCIA_ORIGEN_PO', '260317MS01894SF'],
    ['TIPO_TRANSPORTE', 'Marítimo'],
    ['ESTATUS_INICIAL', 'En Tránsito'],
    ['FECHA_ESTIMADA_ARRIBO', new Date().toISOString().split('T')[0]],
    [],
    ['LISTADO DE REPUESTOS DEL CONTENEDOR (OBLIGATORIO):'],
    ['INVOICE_NO', 'CODIGO_PARTE', 'DESCRIPCION_REPUESTO', 'CANTIDAD', 'UBICACION_CEDIS_SUGERIDA', 'MODELO_CHANGAN'],
    ['2609M00000SF0042', 'S111F260204-1504', 'AMORTIGUADOR TRASERO', 8, 'E-02-B-A04', 'UNI-T'],
    ['2609M00000SF0042', 'S301F280101-0100', 'PARACHOQUE DELANTERO', 4, 'B-01-A-001', 'CS55 PLUS'],
    ['2609M00000SF0042', 'H15002-0600', 'FILTRO DE ACEITE MOTOR BLUECORE', 50, 'A-01-C-010', 'HUNTER / CS35'],
    ['2609M00000SF0042', '3701100-M01', 'ALTERNADOR 12V 120A', 3, 'C-04-A-012', 'ALSVIN'],
    ['2609M00000SF0042', '2803101-U01', 'FARO DELANTERO DERECHO LED', 5, 'D-02-C-005', 'UNI-K'],
    ['2609M00000SF0042', '1001100-B01', 'SOPORTE DE MOTOR DERECHO', 6, 'E-01-A-003', 'CS35 PLUS'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 22 }, // INVOICE_NO
    { wch: 26 }, // CODIGO_PARTE
    { wch: 38 }, // DESCRIPCION_REPUESTO
    { wch: 14 }, // CANTIDAD
    { wch: 28 }, // UBICACION_CEDIS
    { wch: 20 }, // MODELO_CHANGAN
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Manifiesto_Contenedor');

  // Trigger Download
  XLSX.writeFile(wb, 'Plantilla_Oficial_Manifiesto_Contenedores_CEDIS_Changan.xlsx');
}

