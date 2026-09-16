import * as XLSX from 'xlsx';
import { SpecialOrder, OrderItem, BranchName, Channel, PaymentStatus, OrderType } from '../types';
import { CHANGAN_BRANCHES } from '../data/mockData';

export interface ParsedOrdersExcelResult {
  orders: SpecialOrder[];
  totalOrders: number;
  totalItems: number;
  warnings: string[];
  branchBreakdown: Record<string, number>;
}

/**
 * Intelligent Excel & CSV parser for bulk Branch Special Orders (Pedidos Especiales de Sucursales)
 */
export async function parseOrdersExcelFile(file: File): Promise<ParsedOrdersExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo válidas.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  const warnings: string[] = [];

  if (matrix.length < 2) {
    throw new Error('El archivo Excel está vacío o no contiene filas de datos.');
  }

  // Detect header row index
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').toLowerCase().trim();
      if (
        cellVal.includes('codigo') ||
        cellVal.includes('código') ||
        cellVal.includes('orden') ||
        cellVal.includes('cotizacion') ||
        cellVal.includes('cotización') ||
        cellVal.includes('sucursal') ||
        cellVal.includes('cliente') ||
        cellVal.includes('repuesto')
      ) {
        headerRowIndex = r;
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headerRow = matrix[headerRowIndex] || [];
  let colOrderNo = -1;
  let colBranch = -1;
  let colClient = -1;
  let colPhone = -1;
  let colModel = -1;
  let colVin = -1;
  let colPlate = -1;
  let colPartCode = -1;
  let colPartDesc = -1;
  let colQtyReq = -1;
  let colChannel = -1;
  let colOrderType = -1;
  let colPayment = -1;
  let colNotes = -1;
  let colBilled = -1;
  let colCotiz = -1;

  headerRow.forEach((h: any, idx: number) => {
    const val = String(h || '').toLowerCase().trim();
    if (val.includes('orden') || val.includes('pedido') || val.includes('order')) {
      if (colOrderNo === -1) colOrderNo = idx;
    } else if (val.includes('cotiz') || val.includes('proforma')) {
      if (colCotiz === -1) colCotiz = idx;
    } else if (val.includes('sucursal') || val.includes('branch') || val.includes('agencia')) {
      if (colBranch === -1) colBranch = idx;
    } else if (val.includes('cliente') || val.includes('nombre') || val.includes('client') || val.includes('titular')) {
      if (colClient === -1) colClient = idx;
    } else if (val.includes('tel') || val.includes('cel') || val.includes('contacto') || val.includes('phone')) {
      if (colPhone === -1) colPhone = idx;
    } else if (val.includes('modelo') || val.includes('vehiculo') || val.includes('vehículo') || val.includes('auto')) {
      if (colModel === -1) colModel = idx;
    } else if (val.includes('vin') || val.includes('chasis') || val.includes('chassis')) {
      if (colVin === -1) colVin = idx;
    } else if (val.includes('placa') || val.includes('plate') || val.includes('matricula')) {
      if (colPlate === -1) colPlate = idx;
    } else if (val.includes('cod') || val.includes('cód') || val.includes('part') || val.includes('numero parte') || val.includes('sku')) {
      if (colPartCode === -1) colPartCode = idx;
    } else if (val.includes('desc') || val.includes('repuesto') || val.includes('pieza') || val.includes('articulo') || val.includes('item')) {
      if (colPartDesc === -1) colPartDesc = idx;
    } else if (val.includes('cant') || val.includes('qty') || val.includes('pedida') || val.includes('solicitada') || val.includes('unid')) {
      if (colQtyReq === -1) colQtyReq = idx;
    } else if (val.includes('canal') || val.includes('channel') || val.includes('tipo venta')) {
      if (colChannel === -1) colChannel = idx;
    } else if (val.includes('tipo') || val.includes('prioridad') || val.includes('emergencia')) {
      if (colOrderType === -1) colOrderType = idx;
    } else if (val.includes('pago') || val.includes('abono') || val.includes('estado pago') || val.includes('payment')) {
      if (colPayment === -1) colPayment = idx;
    } else if (val.includes('nota') || val.includes('observ') || val.includes('comentario')) {
      if (colNotes === -1) colNotes = idx;
    } else if (val.includes('factura') || val.includes('facturado') || val.includes('billed')) {
      if (colBilled === -1) colBilled = idx;
    }
  });

  // Fallbacks if columns are not named standardly
  if (colPartCode === -1) colPartCode = 0;
  if (colPartDesc === -1) colPartDesc = 1;
  if (colQtyReq === -1) colQtyReq = 2;

  // Intermediate order map to group rows by Order Number
  const ordersMap: Record<string, SpecialOrder> = {};
  let totalItemsCount = 0;
  let orderCounter = 1;

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const rawPartCode = colPartCode !== -1 && row[colPartCode] ? String(row[colPartCode]).trim() : '';
    if (!rawPartCode || rawPartCode.toLowerCase().includes('total') || rawPartCode.toLowerCase().includes('resumen')) {
      continue;
    }

    let orderNum = colOrderNo !== -1 && row[colOrderNo] ? String(row[colOrderNo]).trim().toUpperCase() : '';
    if (!orderNum) {
      orderNum = `ORD-2026-${String(orderCounter).padStart(4, '0')}`;
    }

    // Branch detection and normalization
    let rawBranch = colBranch !== -1 && row[colBranch] ? String(row[colBranch]).trim() : '';
    let branch: BranchName = 'Calle 50';
    const foundBranch = CHANGAN_BRANCHES.find((b) =>
      rawBranch.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(rawBranch.toLowerCase())
    );
    if (foundBranch) {
      branch = foundBranch;
    } else if (rawBranch) {
      branch = (CHANGAN_BRANCHES[0] || 'Calle 50') as BranchName;
    }

    // Client Info
    const clientName = colClient !== -1 && row[colClient] ? String(row[colClient]).trim() : 'Cliente Changan';
    const clientPhone = colPhone !== -1 && row[colPhone] ? String(row[colPhone]).trim() : '+507 6000-0000';
    const changanModel = colModel !== -1 && row[colModel] ? String(row[colModel]).trim() : 'Changan CS55 Plus';
    const vin = colVin !== -1 && row[colVin] ? String(row[colVin]).trim().toUpperCase() : `LS6A24E0XPA${Math.floor(100000 + Math.random() * 900000)}`;
    const plate = colPlate !== -1 && row[colPlate] ? String(row[colPlate]).trim().toUpperCase() : `CH-${Math.floor(1000 + Math.random() * 9000)}`;
    const quotationNumber = colCotiz !== -1 && row[colCotiz] ? String(row[colCotiz]).trim().toUpperCase() : `COT-${Math.floor(1000 + Math.random() * 9000)}`;

    // Channel
    let channel: Channel = 'Taller';
    if (colChannel !== -1 && row[colChannel]) {
      const rawChan = String(row[colChannel]).toLowerCase();
      if (rawChan.includes('mostrador') || rawChan.includes('counter')) channel = 'Mostrador';
      else if (rawChan.includes('chapisteria') || rawChan.includes('chapistería')) channel = 'Chapistería';
      else if (rawChan.includes('garantia') || rawChan.includes('garantía')) channel = 'Garantía';
      else channel = 'Taller';
    }

    // Order Type
    let orderType: OrderType = 'Especial';
    if (colOrderType !== -1 && row[colOrderType]) {
      const rawType = String(row[colOrderType]).toLowerCase();
      if (rawType.includes('emergencia') || rawType.includes('urgente') || rawType.includes('aereo')) {
        orderType = 'Emergencia';
      }
    }

    // Payment Status
    let paymentStatus: PaymentStatus = 'Abonado';
    if (colPayment !== -1 && row[colPayment]) {
      const rawPay = String(row[colPayment]).toLowerCase();
      if (rawPay.includes('cancelado') || rawPay.includes('100') || rawPay.includes('total') || rawPay.includes('pagado')) {
        paymentStatus = 'Cancelado';
      } else if (rawPay.includes('no') || rawPay.includes('pendiente') || rawPay.includes('0%')) {
        paymentStatus = 'No Pagado';
      } else {
        paymentStatus = 'Abonado';
      }
    }

    const isBilled = colBilled !== -1 && row[colBilled] 
      ? String(row[colBilled]).toLowerCase().includes('si') || String(row[colBilled]).toLowerCase().includes('true') || paymentStatus === 'Cancelado'
      : paymentStatus === 'Cancelado';

    const notes = colNotes !== -1 && row[colNotes] ? String(row[colNotes]).trim() : 'Cargado vía archivo Excel masivo';

    // Parse Part Item
    const partDescription = colPartDesc !== -1 && row[colPartDesc] ? String(row[colPartDesc]).trim() : 'Repuesto Changan';
    const rawQty = colQtyReq !== -1 && row[colQtyReq] ? row[colQtyReq] : 1;
    const quantityRequested = parseInt(String(rawQty).replace(/[^0-9]/g, '')) || 1;

    const item: OrderItem = {
      id: `ITEM-IMP-${Date.now()}-${totalItemsCount + 1}`,
      code: rawPartCode.toUpperCase().replace(/\s+/g, ''),
      description: partDescription,
      quantityRequested,
      quantityAssigned: 0,
      quantityDispatched: 0,
      status: 'PENDIENTE',
    };

    totalItemsCount++;

    if (!ordersMap[orderNum]) {
      ordersMap[orderNum] = {
        id: `ORD-${Date.now()}-${orderCounter}`,
        orderNumber: orderNum,
        createdAt: new Date().toISOString().split('T')[0],
        branch,
        collaboratorName: `Asesor ${branch}`,
        channel,
        orderType,
        quotationNumber,
        clientName,
        clientPhone,
        plate,
        changanModel,
        vin,
        paymentStatus,
        receiptOrInvoiceNumber: paymentStatus === 'Cancelado' ? `FACT-${Math.floor(10000 + Math.random() * 90000)}` : `REC-${Math.floor(10000 + Math.random() * 90000)}`,
        isBilled,
        overallStatus: 'PENDIENTE',
        items: [item],
        observations: [
          {
            id: `OBS-${Date.now()}`,
            date: new Date().toISOString(),
            author: 'Sistema Importación Excel',
            content: notes,
            type: 'general',
          },
        ],
      };
      orderCounter++;
    } else {
      // Append item to existing order
      ordersMap[orderNum].items.push(item);
    }
  }

  const parsedOrders = Object.values(ordersMap);

  if (parsedOrders.length === 0) {
    warnings.push('No se pudieron extraer pedidos válidos. Por favor verifique el formato de las columnas.');
  }

  const branchBreakdown: Record<string, number> = {};
  parsedOrders.forEach((o) => {
    branchBreakdown[o.branch] = (branchBreakdown[o.branch] || 0) + 1;
  });

  return {
    orders: parsedOrders,
    totalOrders: parsedOrders.length,
    totalItems: totalItemsCount,
    warnings,
    branchBreakdown,
  };
}

/**
 * Generate and download official Changan Branch Orders Bulk Template (.xlsx)
 */
export function downloadChanganOrdersTemplate(): void {
  const wb = XLSX.utils.book_new();

  const rows = [
    {
      'N° ORDEN': 'ORD-2026-1001',
      'SUCURSAL': 'Calle 50',
      'COTIZACIÓN': 'COT-5501',
      'CLIENTE': 'Ricardo Martinelli C.',
      'TELÉFONO': '+507 6890-1122',
      'MODELO CHANGAN': 'CS55 Plus 2024',
      'VIN': 'LS6A24E01PA882190',
      'PLACA': 'CH-8921',
      'CANAL': 'Taller',
      'TIPO PEDIDO': 'Especial',
      'CÓDIGO DE REPUESTO': 'S111F260204-0100',
      'DESCRIPCIÓN DE REPUESTO': 'Amortiguador Delantero Derecho',
      'CANTIDAD PEDIDA': 2,
      'ESTADO DE PAGO': 'Abonado',
      'FACTURADO (SI/NO)': 'NO',
      'OBSERVACIONES': 'Cliente espera para entrega de taller'
    },
    {
      'N° ORDEN': 'ORD-2026-1001',
      'SUCURSAL': 'Calle 50',
      'COTIZACIÓN': 'COT-5501',
      'CLIENTE': 'Ricardo Martinelli C.',
      'TELÉFONO': '+507 6890-1122',
      'MODELO CHANGAN': 'CS55 Plus 2024',
      'VIN': 'LS6A24E01PA882190',
      'PLACA': 'CH-8921',
      'CANAL': 'Taller',
      'TIPO PEDIDO': 'Especial',
      'CÓDIGO DE REPUESTO': 'S111F260204-0200',
      'DESCRIPCIÓN DE REPUESTO': 'Amortiguador Delantero Izquierdo',
      'CANTIDAD PEDIDA': 2,
      'ESTADO DE PAGO': 'Abonado',
      'FACTURADO (SI/NO)': 'NO',
      'OBSERVACIONES': 'Juego completo de suspensión'
    },
    {
      'N° ORDEN': 'ORD-2026-1002',
      'SUCURSAL': 'Costa Verde',
      'COTIZACIÓN': 'COT-5502',
      'CLIENTE': 'Distribuidora Panamá Oeste S.A.',
      'TELÉFONO': '+507 6554-3322',
      'MODELO CHANGAN': 'Hunter 4x4 2024',
      'VIN': 'LS6A24E04PA771239',
      'PLACA': 'CO-4412',
      'CANAL': 'Mostrador',
      'TIPO PEDIDO': 'Emergencia',
      'CÓDIGO DE REPUESTO': 'H15001-0800',
      'DESCRIPCIÓN DE REPUESTO': 'Sensor de Presión de Riel Combustible',
      'CANTIDAD PEDIDA': 1,
      'ESTADO DE PAGO': 'Cancelado',
      'FACTURADO (SI/NO)': 'SI',
      'OBSERVACIONES': 'Camioneta de reparto detenida, urgencia máxima'
    },
    {
      'N° ORDEN': 'ORD-2026-1003',
      'SUCURSAL': 'Chiriquí',
      'COTIZACIÓN': 'COT-5503',
      'CLIENTE': 'Transportes Tierras Altas',
      'TELÉFONO': '+507 775-4000',
      'MODELO CHANGAN': 'Uni-T 2025',
      'VIN': 'LS6A24E09PA123456',
      'PLACA': 'CH-5519',
      'CANAL': 'Chapistería',
      'TIPO PEDIDO': 'Especial',
      'CÓDIGO DE REPUESTO': 'F10101-0100',
      'DESCRIPCIÓN DE REPUESTO': 'Faro Delantero LED Completo Derecho',
      'CANTIDAD PEDIDA': 1,
      'ESTADO DE PAGO': 'Abonado',
      'FACTURADO (SI/NO)': 'NO',
      'OBSERVACIONES': 'Caso aseguradora'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, // N° ORDEN
    { wch: 15 }, // SUCURSAL
    { wch: 14 }, // COTIZACIÓN
    { wch: 28 }, // CLIENTE
    { wch: 18 }, // TELÉFONO
    { wch: 20 }, // MODELO
    { wch: 22 }, // VIN
    { wch: 12 }, // PLACA
    { wch: 14 }, // CANAL
    { wch: 14 }, // TIPO PEDIDO
    { wch: 22 }, // CÓDIGO DE REPUESTO
    { wch: 38 }, // DESCRIPCIÓN DE REPUESTO
    { wch: 16 }, // CANTIDAD PEDIDA
    { wch: 16 }, // ESTADO DE PAGO
    { wch: 18 }, // FACTURADO
    { wch: 40 }, // OBSERVACIONES
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Especiales Sucursales');

  // Instructions Sheet
  const instructions = [
    { 'INSTRUCCIONES OFICIALES CEDIS': '1. Puede llenar pedidos de cualquiera de las 6 sucursales: Costa Verde, Calle 50, Tumba Muerto, Villa Lucre, Chiriquí, Santa María.' },
    { 'INSTRUCCIONES OFICIALES CEDIS': '2. Si un pedido tiene más de un repuesto, repita el mismo "N° ORDEN" en las filas siguientes.' },
    { 'INSTRUCCIONES OFICIALES CEDIS': '3. Al subir este archivo a la Matriz Central, el sistema CEDIS cruzará automáticamente los códigos contra los contenedores recibidos y asignará stock disponible.' },
    { 'INSTRUCCIONES OFICIALES CEDIS': '4. Las órdenes con 100% de repuestos en bodega pasarán a estado "EN BODEGA CEDIS" listas para rotular y despachar.' },
    { 'INSTRUCCIONES OFICIALES CEDIS': '5. JARVIS AI responderá cualquier consulta de si un repuesto fue pedido o en qué contenedor viene.' }
  ];

  const wsInst = XLSX.utils.json_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, `Changan_Plantilla_Pedidos_Sucursales_${new Date().toISOString().split('T')[0]}.xlsx`);
}
