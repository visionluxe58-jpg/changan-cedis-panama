import { DetalleDPL, Pedido } from '../types/cedis';

export interface AIAnalysisResult {
  titulo: string;
  resumen: string;
  alertasPrioritarias: string[];
  recomendacionesPicking: Array<{
    pallet: string;
    contenedor: string;
    repuestos: string[];
    prioridad: 'ALTA' | 'MEDIA' | 'NORMAL';
    sugerencia: string;
  }>;
  sugerenciasAbastecimiento: string[];
}

export class AILogisticsService {
  /**
   * Analiza el estado actual de la matriz y el stock DPL para generar
   * recomendaciones de picking, alertas de unidades paradas (VOR) y optimización de pallets.
   */
  public static async analizarOperacionCedis(
    pedidos: Pedido[],
    detalleDPL: DetalleDPL[]
  ): Promise<AIAnalysisResult> {
    // 1. Detección de casos VOR urgentes
    const vors = pedidos.filter(p => p.prioridad === 'VOR / Unidad Parada');
    const alertas: string[] = [];

    vors.forEach(v => {
      if (v.cantAsignada < v.cantSolicitada) {
        alertas.push(`🔴 VOR CRÍTICO: Orden ${v.id} (${v.sucursal}) requiere ${v.codigoOEM} [${v.descripcion}] para ${v.modelo} sin stock disponible.`);
      } else {
        alertas.push(`🟡 VOR LISTO PARA DESPACHO: ${v.id} asignado en ${v.contenedorAsignado} (${v.palletAsignado}). Priorizar carga para trasbordo.`);
      }
    });

    // 2. Agrupación de picking por pallet para optimizar recorridos de montacargas
    const palletMap: Record<string, { contenedor: string; repuestos: Set<string>; count: number; hasVor: boolean }> = {};

    pedidos.forEach(p => {
      if (p.palletAsignado && p.contenedorAsignado && !p.estatusCruce.includes('DESPACHADO')) {
        const key = `${p.contenedorAsignado}___${p.palletAsignado}`;
        if (!palletMap[key]) {
          palletMap[key] = {
            contenedor: p.contenedorAsignado,
            repuestos: new Set(),
            count: 0,
            hasVor: false
          };
        }
        palletMap[key].repuestos.add(`${p.codigoOEM} (${p.cantAsignada}u - ${p.id})`);
        palletMap[key].count += p.cantAsignada;
        if (p.prioridad === 'VOR / Unidad Parada') {
          palletMap[key].hasVor = true;
        }
      }
    });

    const pickingList = Object.entries(palletMap).map(([key, data]) => {
      const [, pallet] = key.split('___');
      return {
        pallet,
        contenedor: data.contenedor,
        repuestos: Array.from(data.repuestos),
        prioridad: data.hasVor ? ('ALTA' as const) : data.count > 3 ? ('MEDIA' as const) : ('NORMAL' as const),
        sugerencia: data.hasVor 
          ? `Consolidar inmediatamente el pallet ${pallet} en la bahía de salida para despacho exprés VOR.`
          : `Extraer las piezas indicadas de ${pallet} para empaque regular hacia sucursal.`
      };
    });

    // 3. Análisis de quiebre de stock en DPL
    const abastecimiento: string[] = [];
    const criticos = detalleDPL.filter(d => d.saldoLibre <= 2 && d.cantTotal > 0);
    criticos.forEach(c => {
      abastecimiento.push(`Pieza ${c.codigoCompra} (${c.descripcion}): Saldo libre de solo ${c.saldoLibre} u. en ${c.contenedor}. Se sugiere emitir PO a Mobitech Changan.`);
    });

    // Construir respuesta estructurada
    return {
      titulo: 'Auditoría y Despacho Inteligente CEDIS (A.R.I.A. Logística)',
      resumen: `Se detectaron ${vors.length} solicitudes de Unidad Parada (VOR) y ${pedidos.filter(p => p.cantAsignada > 0 && !p.estatusCruce.includes('DESPACHADO')).length} repuestos listos para extracción en ${pickingList.length} pallets activos.`,
      alertasPrioritarias: alertas.length > 0 ? alertas : ['No hay alertas críticas de unidades paradas sin stock.'],
      recomendacionesPicking: pickingList,
      sugerenciasAbastecimiento: abastecimiento.slice(0, 4)
    };
  }
}
