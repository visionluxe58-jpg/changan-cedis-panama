import { 
  RegistroStaging, 
  ReporteConciliacion, 
  CategoriaClasificacion, 
  DecisionRevision,
  SolicitudCabecera,
  DetalleRepuesto,
  FilaMatrizCentral
} from '../types/cedis';

/**
 * Motor de Conciliación y Staging Canónico CEDIS Changan
 * Especializado en resolución de incidentes de sincronización (9 vs 10 de Septiembre 2026)
 */
export class ReconciliationEngine {
  // 5 Pedidos ausentes del 10 de septiembre identificados desde el control base del 9 de septiembre
  public static readonly PEDIDOS_AUSENTES_9_SEP = [
    'PED-CV-2240',
    'PED-VL-2195',
    'PED-TM-2088',
    'PED-C50-2174',
    'PED-VL-2211'
  ];

  /**
   * Genera el conjunto de datos de staging simulado de las 2,422 líneas / 1,490 pedidos
   * representativo de la exportación recuperada del panel local para demostración y auditoría
   */
  public static generarLoteStagingIncidente(): RegistroStaging[] {
    const registros: RegistroStaging[] = [];
    let lineaNo = 1;

    // 1. Los 5 pedidos ausentes preservados
    this.PEDIDOS_AUSENTES_9_SEP.forEach((pId, idx) => {
      registros.push({
        stagingId: `STG-${pId}-1`,
        numeroLineaArchivo: lineaNo++,
        pedidoId: pId,
        fechaRegistro: '2026-09-07 11:20:00',
        sucursal: idx % 2 === 0 ? 'Costa Verde' : 'Villa Lucre',
        colaborador: 'Carlos Mendoza',
        cliente: `Cliente Control 9-Sep (#${idx + 1})`,
        cotizacion: `COT-SEP-09-${idx + 10}`,
        vin: `LS4A9Z00${idx}YA88888${idx}`,
        placa: `CG-090${idx}`,
        modelo: 'CS55 Plus DCT',
        numeroOR: `OR-900${idx}`,
        tipoPedido: 'Garantía',
        codigoRepuesto: '8511F270102-0202-AA',
        descripcion: 'Faro Delantero LED Izquierdo CS55 Plus',
        cantidadSolicitada: 1,
        cantidadAsignada: 1,
        contenedor: 'INV-CN-8902',
        ubicacion: 'Bahía A-02 / Pallet P001',
        origenDetectado: 'BASE_VALIDADA_9_SEP',
        categoria: 'AUSENTE_PRESERVADO_9_SEP',
        motivoClasificacion: 'Presente el 9-sep, ausente en exportación del 10-sep. Preservado por regla inmutable sin borrado automático.',
        decision: 'CONSERVAR_AMBOS'
      });
    });

    // 2. Muestra de los 567 registros origen EXCEL (565 del 31 de agosto)
    for (let i = 1; i <= 20; i++) {
      const pId = `PED-XL-31AUG-${1000 + i}`;
      registros.push({
        stagingId: `STG-${pId}-1`,
        numeroLineaArchivo: lineaNo++,
        pedidoId: pId,
        fechaRegistro: '2026-08-31 08:00:00',
        sucursal: 'Villa Lucre',
        colaborador: 'Edwin Blanco',
        cliente: `Cliente Excel Lote Histórico #${i}`,
        cotizacion: `COT-AUG-31-${i}`,
        vin: `LS4A1B22${i}XA00112${i}`,
        placa: `XL-310${i}`,
        modelo: 'Alsvin V3',
        numeroOR: `OR-XL-${i}`,
        tipoPedido: 'Stock Regular',
        codigoRepuesto: 'C301F280201',
        descripcion: 'Pastillas de Freno Delanteras Alsvin',
        cantidadSolicitada: 2,
        cantidadAsignada: 0,
        contenedor: '',
        ubicacion: '',
        origenDetectado: 'EXCEL',
        categoria: 'LOTE_HISTORICO_EXCEL_PENDIENTE',
        motivoClasificacion: 'Lote histórico de Excel con fecha 31 de agosto de 2026 reincorporado sin validación previa. Requiere aprobación humana.',
        decision: 'PENDIENTE'
      });
    }

    // 3. Muestra de las 274 posibles coincidencias semánticas
    for (let i = 1; i <= 15; i++) {
      const pId = `PED-SEM-${2000 + i}`;
      registros.push({
        stagingId: `STG-${pId}-1`,
        numeroLineaArchivo: lineaNo++,
        pedidoId: pId,
        fechaRegistro: '2026-09-10 09:15:00',
        sucursal: 'Tumba Muerto',
        colaborador: 'Alexis Rios',
        cliente: `GRUPO SILABA S.A.`,
        cotizacion: `COT-TM-992`,
        vin: `LS4A2B999RA019283`, // Mismo VIN que pedido PED-VL-2101
        placa: `PA-9912`,
        modelo: 'UNI-T Elite',
        numeroOR: `MT-440${i}`,
        tipoPedido: 'VOR / Unidad Parada',
        codigoRepuesto: 'S111F270108-0103',
        descripcion: 'Puerta Delantera Derecha UNI-T',
        cantidadSolicitada: 1,
        cantidadAsignada: 0,
        contenedor: 'INV-CN-8902',
        ubicacion: 'Bahía A-01 / Pallet P001',
        origenDetectado: 'PORTAL_LOCAL',
        categoria: 'POSIBLE_DUPLICADO_SEMANTICO',
        motivoClasificacion: 'Coincidencia semántica con PED-VL-2101 (Mismo VIN y Código). Requiere determinar si es reemplazo legítimo o solicitud duplicada.',
        decision: 'PENDIENTE',
        similitudConPedidoId: 'PED-VL-2101'
      });
    }

    // 4. Muestra de nuevos confirmados creados post 9-sep
    for (let i = 1; i <= 10; i++) {
      const pId = `PED-NEW-${3000 + i}`;
      registros.push({
        stagingId: `STG-${pId}-1`,
        numeroLineaArchivo: lineaNo++,
        pedidoId: pId,
        fechaRegistro: '2026-09-10 14:30:00',
        sucursal: 'Calle 50',
        colaborador: 'Valeria Castillo',
        cliente: `Aseguradora Nacional Exp #${i}`,
        cotizacion: `COT-C50-${800 + i}`,
        vin: `LS4A3C99${i}TA0981${i}`,
        placa: `CN-55${i}`,
        modelo: 'CS35 Plus Turbo',
        numeroOR: `OR-C50-${i}`,
        tipoPedido: 'Chapistería y Colisión',
        codigoRepuesto: 'E101F310100',
        descripcion: 'Radiador de Enfriamiento Motor CS35',
        cantidadSolicitada: 1,
        cantidadAsignada: 1,
        contenedor: 'INV-CN-9140',
        ubicacion: 'Bahía D-01 / Pallet P101',
        origenDetectado: 'PORTAL_CEDIS',
        categoria: 'NUEVO_CONFIRMADO',
        motivoClasificacion: 'Pedido operativo legítimo creado el 10-sep por sucursal con validación de OR y cotización.',
        decision: 'APROBAR_IMPORTACION'
      });
    }

    return registros;
  }

  /**
   * Analiza un conjunto de líneas crudas (TSV o JSON) y genera la clasificación y reporte
   */
  public static analizarStaging(registros: RegistroStaging[]): ReporteConciliacion {
    const pedidosUnicos = new Set<string>();
    const conteos: Record<CategoriaClasificacion, number> = {
      BASE_VALIDADA_9_SEP: 0,
      NUEVO_CONFIRMADO: 0,
      LOTE_HISTORICO_EXCEL_PENDIENTE: 0,
      POSIBLE_DUPLICADO_SEMANTICO: 0,
      AUSENTE_PRESERVADO_9_SEP: 0,
      CONFLICTO_DATO_INCOMPLETO: 0
    };

    let aprobados = 0;
    let pendientes = 0;
    let descartados = 0;
    let semanticos = 0;
    let excelHistorico = 0;

    registros.forEach(r => {
      pedidosUnicos.add(r.pedidoId);
      conteos[r.categoria] = (conteos[r.categoria] || 0) + 1;

      if (r.categoria === 'POSIBLE_DUPLICADO_SEMANTICO') semanticos++;
      if (r.categoria === 'LOTE_HISTORICO_EXCEL_PENDIENTE') excelHistorico++;

      if (r.decision === 'APROBAR_IMPORTACION' || r.decision === 'CONSERVAR_AMBOS') {
        aprobados++;
      } else if (r.decision === 'DESCARTAR_DUPLICADO') {
        descartados++;
      } else {
        pendientes++;
      }
    });

    return {
      fechaAnalisis: new Date().toISOString().replace('T', ' ').substring(0, 19),
      totalLineasAnalizadas: registros.length,
      totalPedidosUnicos: pedidosUnicos.size,
      conteoPorCategoria: conteos,
      pedidosAusentesPreservados: [...this.PEDIDOS_AUSENTES_9_SEP],
      totalSemanticosDetectados: semanticos,
      totalLoteExcelHistorico: excelHistorico,
      registrosAprobados: aprobados,
      registrosPendientes: pendientes,
      registrosDescartados: descartados
    };
  }

  /**
   * Clasifica una fila individual de exportación
   */
  public static clasificarLinea(
    fila: Partial<RegistroStaging>, 
    pedidosCanónicosExistentes: Set<string>,
    lineasPreviasEnLote: Map<string, RegistroStaging>
  ): { categoria: CategoriaClasificacion; motivo: string; similitudCon?: string } {
    const pId = fila.pedidoId || '';
    const vin = (fila.vin || '').toUpperCase().trim();
    const codigo = (fila.codigoRepuesto || '').toUpperCase().trim();
    const fecha = fila.fechaRegistro || '';
    const origen = (fila.origenDetectado || '').toUpperCase();

    // 1. Es uno de los 5 pedidos ausentes preservados
    if (this.PEDIDOS_AUSENTES_9_SEP.includes(pId)) {
      return {
        categoria: 'AUSENTE_PRESERVADO_9_SEP',
        motivo: 'Control de Integridad: Pedido validado el 9-sep ausente en exportación del 10-sep. Preservado obligatoriamente.'
      };
    }

    // 2. Lote histórico de Excel del 31 de agosto
    if (origen === 'EXCEL' || fecha.startsWith('2026-08-31') || pId.includes('XL-31AUG')) {
      return {
        categoria: 'LOTE_HISTORICO_EXCEL_PENDIENTE',
        motivo: 'Registro con firma de exportación Excel histórica del 31 de agosto de 2026. Requiere aprobación.'
      };
    }

    // 3. Comprobación de coincidencia semántica
    for (const [, prev] of lineasPreviasEnLote) {
      if (prev.pedidoId !== pId && prev.vin === vin && prev.codigoRepuesto.toUpperCase() === codigo && vin.length > 5) {
        return {
          categoria: 'POSIBLE_DUPLICADO_SEMANTICO',
          motivo: `Mismo VIN (${vin}) y código de repuesto solicitado en pedido ${prev.pedidoId}.`,
          similitudCon: prev.pedidoId
        };
      }
    }

    // 4. Pedido ya canónico existente
    if (pedidosCanónicosExistentes.has(pId)) {
      return {
        categoria: 'BASE_VALIDADA_9_SEP',
        motivo: 'Pedido existente en la base validada canónica.'
      };
    }

    // 5. Incompleto o conflicto
    if (!pId || !codigo || !fila.cliente) {
      return {
        categoria: 'CONFLICTO_DATO_INCOMPLETO',
        motivo: 'Faltan datos obligatorios (Código de repuesto, cliente o ID de pedido).'
      };
    }

    // 6. Nuevo confirmado
    return {
      categoria: 'NUEVO_CONFIRMADO',
      motivo: 'Requisición operativa posterior al 9 de septiembre con integridad de cabecera y línea.'
    };
  }
}
