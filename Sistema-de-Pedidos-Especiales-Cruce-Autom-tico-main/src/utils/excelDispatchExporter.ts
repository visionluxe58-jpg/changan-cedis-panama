import * as XLSX from 'xlsx';
import { BranchName, ShippingContainer, SpecialOrder } from '../types';

export interface ContainerDispatchBranchSummary {
  branch: BranchName;
  orderCount: number;
  totalParts: number;
  emergencyParts: number;
  models: string[];
  items: {
    orderNumber: string;
    quotationNumber: string;
    clientName: string;
    plate: string;
    changanModel: string;
    partCode: string;
    description: string;
    quantity: number;
    locationInCedis: string;
    status: string;
    isEmergency: boolean;
  }[];
}

export interface PivotExcelRow {
  partCode: string;
  description: string;
  changanModel: string;
  locationInCedis: string;
  totalQuantity: number;
  branchQuantities: Record<BranchName, number>;
}

/**
 * Generates and triggers download of the Official Executive Dispatch Report (.xlsx)
 * with 4 detailed sheets: Pivot Table Matrix, Summary by Branch, Detailed Picking List by Order, and Surplus Stock.
 */
export function exportContainerDispatchToExcel(
  container: ShippingContainer,
  branchSummaries: ContainerDispatchBranchSummary[],
  unmatchedSurplus: { code: string; description: string; quantity: number; location: string }[],
  pivotRows?: PivotExcelRow[]
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tabla Dinámica (Matriz Repuesto x Sucursales)
  if (pivotRows && pivotRows.length > 0) {
    const pivotData: any[][] = [
      ['CHANGAN AUTO PANAMÁ // CEDIS CENTRAL - TABLA DINÁMICA DE DESPACHO'],
      ['EMBARQUE / CONTENEDOR:', container.containerNumber],
      ['FECHA:', new Date().toLocaleString('es-PA')],
      [],
      [
        'CÓDIGO REPUESTO',
        'DESCRIPCIÓN OFICIAL',
        'MODELO CHANGAN',
        'UBICACIÓN CEDIS',
        'TOTAL PENDIENTE',
        'CALLE 50',
        'COSTA VERDE',
        'TUMBA MUERTO',
        'VILLA LUCRE',
        'CHIRIQUÍ',
        'SANTA MARÍA',
      ],
    ];

    let grandTotal = 0;
    const branchTotals: Record<string, number> = {
      'Calle 50': 0,
      'Costa Verde': 0,
      'Tumba Muerto': 0,
      'Villa Lucre': 0,
      'Chiriquí': 0,
      'Santa María': 0,
    };

    pivotRows.forEach((row) => {
      grandTotal += row.totalQuantity;
      branchTotals['Calle 50'] += row.branchQuantities['Calle 50'] || 0;
      branchTotals['Costa Verde'] += row.branchQuantities['Costa Verde'] || 0;
      branchTotals['Tumba Muerto'] += row.branchQuantities['Tumba Muerto'] || 0;
      branchTotals['Villa Lucre'] += row.branchQuantities['Villa Lucre'] || 0;
      branchTotals['Chiriquí'] += row.branchQuantities['Chiriquí'] || 0;
      branchTotals['Santa María'] += row.branchQuantities['Santa María'] || 0;

      pivotData.push([
        row.partCode,
        row.description,
        row.changanModel,
        row.locationInCedis,
        row.totalQuantity,
        row.branchQuantities['Calle 50'] || 0,
        row.branchQuantities['Costa Verde'] || 0,
        row.branchQuantities['Tumba Muerto'] || 0,
        row.branchQuantities['Villa Lucre'] || 0,
        row.branchQuantities['Chiriquí'] || 0,
        row.branchQuantities['Santa María'] || 0,
      ]);
    });

    pivotData.push([]);
    pivotData.push([
      'TOTAL CONSOLIDADO',
      '',
      '',
      '',
      grandTotal,
      branchTotals['Calle 50'],
      branchTotals['Costa Verde'],
      branchTotals['Tumba Muerto'],
      branchTotals['Villa Lucre'],
      branchTotals['Chiriquí'],
      branchTotals['Santa María'],
    ]);

    const wsPivot = XLSX.utils.aoa_to_sheet(pivotData);
    wsPivot['!cols'] = [
      { wch: 24 }, // CODIGO
      { wch: 38 }, // DESCRIPCION
      { wch: 18 }, // MODELO
      { wch: 18 }, // UBICACION
      { wch: 16 }, // TOTAL
      { wch: 14 }, // CALLE 50
      { wch: 14 }, // COSTA VERDE
      { wch: 16 }, // TUMBA MUERTO
      { wch: 14 }, // VILLA LUCRE
      { wch: 14 }, // CHIRIQUI
      { wch: 14 }, // SANTA MARIA
    ];
    XLSX.utils.book_append_sheet(wb, wsPivot, 'Tabla_Dinamica_Picking');
  }

  // Sheet 2: Resumen Ejecutivo por Sucursal
  const summaryData: any[][] = [
    ['CHANGAN AUTO PANAMÁ // CEDIS CENTRAL - REPORTE DE DESPACHO POR CONTENEDOR'],
    ['CONTENEDOR / INVOICE:', container.containerNumber],
    ['PROVEEDOR:', container.supplier],
    ['ORDEN DE COMPRA (PO):', container.poNumber],
    ['TIPO TRANSPORTE:', container.type],
    ['FECHA ARRIBO CEDIS:', container.actualArrivalDate || container.estimatedArrivalDate || 'N/A'],
    ['TOTAL PIEZAS EN CONTENEDOR:', container.totalUnits],
    ['FECHA DE GENERACIÓN:', new Date().toLocaleString('es-PA')],
    [],
    ['DISTRIBUCIÓN Y DESPACHO POR SUCURSAL:'],
    ['SUCURSAL DESTINO', 'TOTAL PEDIDOS', 'REPUESTOS ASIGNADOS', 'REPUESTOS EMERGENCIA', '% DEL CONTENEDOR', 'MODELOS CHANGAN ATENDIDOS'],
  ];

  let totalAllocatedParts = 0;
  let totalOrdersCount = 0;

  branchSummaries.forEach((bs) => {
    const pct = container.totalUnits > 0 ? ((bs.totalParts / container.totalUnits) * 100).toFixed(1) + '%' : '0%';
    totalAllocatedParts += bs.totalParts;
    totalOrdersCount += bs.orderCount;
    summaryData.push([
      bs.branch,
      bs.orderCount,
      bs.totalParts,
      bs.emergencyParts,
      pct,
      bs.models.join(', ') || 'N/A',
    ]);
  });

  const surplusTotal = container.totalUnits - totalAllocatedParts;
  summaryData.push([]);
  summaryData.push([
    'TOTAL ASIGNADO A SUCURSALES',
    totalOrdersCount,
    totalAllocatedParts,
    '',
    container.totalUnits > 0 ? ((totalAllocatedParts / container.totalUnits) * 100).toFixed(1) + '%' : '100%',
    '',
  ]);
  summaryData.push([
    'SOBRANTE A STOCK GENERAL CEDIS',
    '-',
    Math.max(0, surplusTotal),
    '-',
    container.totalUnits > 0 ? ((Math.max(0, surplusTotal) / container.totalUnits) * 100).toFixed(1) + '%' : '0%',
    'Inventario Libre Bodega',
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 28 }, // SUCURSAL
    { wch: 16 }, // TOTAL PEDIDOS
    { wch: 22 }, // REPUESTOS ASIGNADOS
    { wch: 24 }, // REPUESTOS EMERGENCIA
    { wch: 18 }, // % DEL CONTENEDOR
    { wch: 40 }, // MODELOS
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Por_Sucursal');

  // Sheet 2: Detalle Completo de Repuestos a Despachar (Picking List)
  const detailData: any[][] = [
    ['LISTADO DETALLADO DE PICKING Y DESPACHO POR PEDIDO // EMBARQUE ' + container.containerNumber],
    [],
    [
      'SUCURSAL DESTINO',
      'Nº PEDIDO',
      'Nº COTIZACIÓN',
      'CLIENTE',
      'PLACA',
      'MODELO CHANGAN',
      'CÓDIGO REPUESTO',
      'DESCRIPCIÓN OFICIAL',
      'CANTIDAD',
      'UBICACIÓN CEDIS',
      'TIPO PEDIDO',
      'ESTADO OPERATIVO',
    ],
  ];

  branchSummaries.forEach((bs) => {
    bs.items.forEach((item) => {
      detailData.push([
        bs.branch,
        item.orderNumber,
        item.quotationNumber,
        item.clientName,
        item.plate || 'S/P',
        item.changanModel,
        item.partCode,
        item.description,
        item.quantity,
        item.locationInCedis || 'CEDIS-ZONA-A',
        item.isEmergency ? 'EMERGENCIA' : 'NORMAL',
        item.status,
      ]);
    });
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 20 }, // SUCURSAL
    { wch: 18 }, // Nº PEDIDO
    { wch: 18 }, // Nº COTIZACIÓN
    { wch: 24 }, // CLIENTE
    { wch: 12 }, // PLACA
    { wch: 18 }, // MODELO
    { wch: 24 }, // CODIGO
    { wch: 38 }, // DESCRIPCION
    { wch: 12 }, // CANTIDAD
    { wch: 18 }, // UBICACION
    { wch: 16 }, // TIPO
    { wch: 20 }, // ESTADO
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle_Repuestos_Picking');

  // Sheet 3: Sobrantes a Stock General (si existen)
  if (unmatchedSurplus.length > 0) {
    const surplusData: any[][] = [
      ['REPUESTOS DEL CONTENEDOR ' + container.containerNumber + ' DESTINADOS A STOCK LIBRE CEDIS'],
      [],
      ['CÓDIGO REPUESTO', 'DESCRIPCIÓN OFICIAL', 'CANTIDAD LIBRE', 'UBICACIÓN EN BODEGA CEDIS', 'DESTINO'],
    ];

    unmatchedSurplus.forEach((s) => {
      surplusData.push([
        s.code,
        s.description,
        s.quantity,
        s.location || 'CEDIS-STOCK-GENERAL',
        'Inventario General CEDIS',
      ]);
    });

    const wsSurplus = XLSX.utils.aoa_to_sheet(surplusData);
    wsSurplus['!cols'] = [
      { wch: 24 },
      { wch: 40 },
      { wch: 16 },
      { wch: 25 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSurplus, 'Stock_Libre_CEDIS');
  }

  // Trigger Download
  const cleanContainerName = container.containerNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Reporte_Despacho_Sucursales_Contenedor_${cleanContainerName}.xlsx`);
}
