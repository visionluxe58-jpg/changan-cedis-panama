// Tipos de roles y autorización para CEDIS Changan
export type RolUsuario = 'ADMINISTRADOR_CEDIS' | 'OPERADOR_CEDIS' | 'SUCURSAL_ASESOR' | 'CONSULTA';

export interface UsuarioActivo {
  usuarioId: string;
  nombre: string;
  correo: string;
  sucursal: string;
  canal: string;
  rol: RolUsuario;
  activo: boolean;
  movilHabilitado: boolean;
}

export type TipoSolicitud = 
  | 'VOR / Unidad Parada' 
  | 'Garantía' 
  | 'Chapistería y Colisión' 
  | 'Taller Mecánico' 
  | 'Stock Regular'
  | 'Especial'
  | 'Emergencia'
  | string;

export type EstatusPedidoGeneral = 
  | 'Pendiente' 
  | 'Asignado Parcial' 
  | 'Asignado Total' 
  | 'Despachado Parcial' 
  | 'Despachado Total' 
  | 'Entregado' 
  | 'Cancelado';

export type EstatusLineaRepuesto = 
  | 'Pendiente' 
  | 'Asignado' 
  | 'Despachado' 
  | 'Sin Stock' 
  | 'Cancelado';

// 1. Solicitudes_Cabecera
export interface SolicitudCabecera {
  pedidoId: string; // ej: PED-CV-2240
  fechaCreacion: string; // YYYY-MM-DD HH:mm:ss
  sucursal: string;
  colaborador: string;
  canal: string;
  tipoPedido: TipoSolicitud;
  cotizacion: string;
  cliente: string;
  placa: string;
  modeloChangan: string;
  vin: string;
  numeroOR: string;
  estadoPago: 'Pendiente' | 'Aprobado' | 'Facturado' | 'Exento (Garantía)';
  documentoPagoFactura: string;
  facturadoFinal: 'Sí' | 'No';
  estatusGeneral: EstatusPedidoGeneral;
  estatusFabrica: string;
  origen: 'PORTAL_CEDIS' | 'EXCEL' | 'STAGING_MIGRACION' | 'API' | 'MANUAL';
  version: number;
  creadoPor: string;
  creadoEn: string;
  actualizadoPor: string;
  actualizadoEn: string;
  fechaDespacho?: string; // YYYY-MM-DD HH:mm:ss para cálculo de KPIs y Lead Time
  observaciones?: string;
  archivoAdjuntoBase64?: string;
  nombreArchivoAdjunto?: string;
  tipoArchivoAdjunto?: string;
}

// Bitácora de Observaciones y Llamadas por Pedido
export interface BitacoraNota {
  id: string;
  pedidoId: string;
  autor: string;
  sucursal: string;
  fecha: string;
  categoria: 'Nota General' | 'Llamada a Sucursal' | 'Alerta Logística' | 'Facturación' | 'Cambio de Estatus' | string;
  texto: string;
}

// 2. Detalle_Repuestos
export interface DetalleRepuesto {
  lineaId: string; // UUID o PED-CV-2240-L1
  pedidoId: string; // Clave foránea a Solicitudes_Cabecera
  codigoRepuesto: string;
  codigoActualizado: string;
  descripcionOficial: string;
  cantidadSolicitada: number;
  cantidadAsignada: number;
  cantidadDespachada: number;
  contenedorAsignado: string;
  palletAsignado: string;
  packageNo: string;
  ubicacionCedis: string;
  estatusLinea: EstatusLineaRepuesto;
  fechaDespacho?: string;
}

// 3. DPL_Manifiestos
export type EstatusDPL = 'EN TRÁNSITO' | 'ADUANA' | 'RECIBIDO';

export function normalizarEstatusDPL(estado: string): EstatusDPL {
  const norm = (estado || '').trim().toUpperCase();
  if (norm.includes('TRANSIT')) return 'EN TRÁNSITO';
  if (norm.includes('ADUANA') || norm.includes('PUERTO')) return 'ADUANA';
  if (norm.includes('RECIBID') || norm.includes('CONCILIAD')) return 'RECIBIDO';
  return 'EN TRÁNSITO';
}

export interface DPLManifiesto {
  contenedorId: string; // Único, ej: INV-CN-8902 o 2605M00000AL0264-DPL
  proveedor: string;
  fechaArribo: string;
  poReferencia: string;
  tipoTransporte: string;
  totalPiezas: number;
  skusUnicos: number;
  totalPallets: number;
  estado: EstatusDPL | 'TRANSITO' | 'EN PUERTO' | 'FÍSICAMENTE RECIBIDO EN CEDIS' | 'CONCILIADO' | string;
  creadoPor: string;
  creadoEn: string;
  estatusAduana?: string;
  blReferencia?: string;
  totalItems?: number;
  piezasTotales?: number;
  piezasDespachadas?: number;
}

// 4. DPL_Detalle
// Regla: saldoDisponible = cantidadTotal - cantidadAsignada - cantidadDespachada
export interface DPLDetalle {
  inventarioId: string; // ej: INV-CN-8902_1
  contenedorId: string;
  palletCaseNo: string;
  packageNo: string;
  codigoRepuesto: string;
  descripcion: string;
  cantidadTotal: number;
  cantidadAsignada: number;
  cantidadDespachada: number;
  saldoDisponible: number;
  ubicacionCedis: string;
  dplDetalleId?: string;
  pallet?: string;
  unidadMedida?: string;
}

// 6. Modelos Changan
export interface ModeloChangan {
  modeloId: string;
  nombre: string;
  categoria: 'SUV' | 'Sedán' | 'Pickup' | 'Pick-up' | 'Eléctrico / Híbrido' | 'Eléctrico' | 'Comercial' | string;
  rangoAnio: string;
  anosCompatibles?: string;
  motor?: string;
  activo: boolean;
  notas?: string;
}

// 7. BD_Encargados
export interface BDEncargado {
  usuarioId: string;
  nombre: string;
  correo: string;
  sucursal: string;
  canal: string;
  rol: RolUsuario;
  activo: boolean;
  movilHabilitado: boolean;
}

// Alias de compatibilidad
export type Asesor = any;
export type Pedido = any;
export type ManifiestoDPL = any;
export type ContenedorManifiesto = any;
export type DetalleDPL = any;
export type MovimientoAuditoria = any;
export interface CedisKPIs {
  totalDpl: number;
  despachado: number;
  comprometido: number;
  saldoLibre: number;
  skus: number;
}
export type SolicitudPayload = any;
export type SheetsConfig = any;

// 8. Auditoria_Kardex (Bitácora inmutable)
export interface AuditoriaKardex {
  auditoriaId: string;
  timestamp: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: 
    | 'CREACION_PEDIDO'
    | 'MODIFICACION_PEDIDO'
    | 'ASIGNACION_STOCK'
    | 'DESASIGNACION_STOCK'
    | 'DESPACHO_FISICO'
    | 'AJUSTE_MERMA'
    | 'IMPORTACION_CONCILIACION'
    | 'CORRECCION_DPL';
  entidad: 'Solicitudes_Cabecera' | 'Detalle_Repuestos' | 'DPL_Detalle' | 'DPL_Manifiestos' | 'Sistema';
  identificador: string;
  valoresAnteriores: string;
  valoresNuevos: string;
  operationId: string;
  notas: string;
}

// 9. Matriz_Central (Vista consolidada de línea)
export interface FilaMatrizCentral {
  lineaId: string;
  pedidoId: string;
  fechaCreacion: string;
  sucursal: string;
  colaborador: string;
  tipoPedido: TipoSolicitud;
  cotizacion: string;
  cliente: string;
  placa: string;
  modeloChangan: string;
  vin: string;
  numeroOR: string;
  codigoRepuesto: string;
  codigoActualizado: string;
  descripcionOficial: string;
  cantidadSolicitada: number;
  cantidadAsignada: number;
  cantidadDespachada: number;
  saldoPendiente: number;
  contenedorAsignado: string;
  palletAsignado: string;
  packageNo: string;
  ubicacionCedis: string;
  estatusLinea: EstatusLineaRepuesto;
  estatusGeneral: EstatusPedidoGeneral;
  origen: string;
  observaciones: string;
  archivoAdjuntoBase64?: string;
  nombreArchivoAdjunto?: string;
  tipoArchivoAdjunto?: string;
  estadoPago?: string;
  fechaDespacho?: string;
}

// Staging y Conciliación para Incidente del 10 de Septiembre
export type CategoriaClasificacion = 
  | 'BASE_VALIDADA_9_SEP'           // Perteneciente a los 900 pedidos validados
  | 'NUEVO_CONFIRMADO'              // Pedidos genuinos nuevos creados post 9-sep
  | 'LOTE_HISTORICO_EXCEL_PENDIENTE'// 567 registros origen EXCEL / 565 de 31-ago
  | 'POSIBLE_DUPLICADO_SEMANTICO'   // Las 274 coincidencias de cliente/cotización/vehículo
  | 'AUSENTE_PRESERVADO_9_SEP'      // Los 5 pedidos que estaban el 9 de sep y faltan el 10
  | 'CONFLICTO_DATO_INCOMPLETO';    // Registros con datos faltantes o códigos inconsistentes

export type DecisionRevision = 
  | 'PENDIENTE'
  | 'APROBAR_IMPORTACION'
  | 'CONSERVAR_AMBOS'
  | 'FUSIONAR_AUDITADO'
  | 'DESCARTAR_DUPLICADO';

export interface RegistroStaging {
  stagingId: string;
  numeroLineaArchivo: number;
  pedidoId: string;
  fechaRegistro: string;
  sucursal: string;
  colaborador: string;
  cliente: string;
  cotizacion: string;
  vin: string;
  placa: string;
  modelo: string;
  numeroOR: string;
  tipoPedido: string;
  codigoRepuesto: string;
  descripcion: string;
  cantidadSolicitada: number;
  cantidadAsignada: number;
  contenedor: string;
  ubicacion: string;
  origenDetectado: string;
  categoria: CategoriaClasificacion;
  motivoClasificacion: string;
  decision: DecisionRevision;
  decisionTomadaPor?: string;
  decisionNotas?: string;
  similitudConPedidoId?: string;
}

export interface ReporteConciliacion {
  fechaAnalisis: string;
  totalLineasAnalizadas: number;
  totalPedidosUnicos: number;
  conteoPorCategoria: Record<CategoriaClasificacion, number>;
  pedidosAusentesPreservados: string[]; // Los 5 pedidos
  totalSemanticosDetectados: number; // 274
  totalLoteExcelHistorico: number; // 567 / 565 del 31-ago
  registrosAprobados: number;
  registrosPendientes: number;
  registrosDescartados: number;
}

// Configuración de API Google Apps Script
export interface AppsScriptApiConfig {
  webAppUrl: string;
  timeoutMs?: number;
  autoSincronizar?: boolean;
  modoOfflineSimulado: boolean;
  apiKey?: string;
  ultimoPing?: string;
  estadoConexion: 'CONECTADO' | 'CONECTADO_CANONICO' | 'MODO_LOCAL_SEGURO' | 'ERROR_CONEXION';
}

// Resultado detallado de diagnóstico CORS y accesibilidad API
export interface ResultadoDiagnosticoCORS {
  ok: boolean;
  corsHabilitado: boolean;
  apiAccesible: boolean;
  urlEvaluada: string;
  latenciaMs: number;
  optionsRespuesta?: {
    probado: boolean;
    status?: number;
    corsHeadersPresentes?: boolean;
    nota?: string;
  };
  getRespuesta?: {
    status?: number;
    statusText?: string;
    esJson?: boolean;
  };
  statusCode?: number;
  spreadsheetName?: string;
  spreadsheetId?: string;
  totalPestanas?: number;
  pestanasDetectadas?: string[];
  tipoError?:
    | 'URL_VACIA'
    | 'FORMATO_URL_INVALIDO'
    | 'ES_SPREADSHEET_NO_WEBAPP'
    | 'TERMINA_EN_EDIT_O_DEV'
    | 'CORS_BLOQUEADO_LOGIN_GOOGLE'
    | 'CORS_PREFLIGHT_FALLIDO'
    | 'ERROR_RED_O_CORS'
    | 'TIMEOUT'
    | 'NO_AUTORIZADO_403'
    | 'NO_ENCONTRADO_404'
    | 'ERROR_SERVIDOR_500'
    | 'RESPUESTA_INVALIDA';
  mensaje: string;
  diagnosticoTecnico: string;
  pasosSugeridos: string[];
}

// ==========================================
// TIPOS PARA REPORTE FÁBRICA & PEDIDOS ESPECIALES
// ==========================================

export type MetodoTransporteFabrica = 'Aereo' | 'Maritimo';

export type CategoriaEstructuraRepuesto =
  | 'Carrocería Mayor / Colisión'
  | 'Pieza Mecánica / Motor'
  | 'Eléctrico & Electrónica'
  | 'Refrigeración / A/C'
  | 'Molduras & Fijaciones'
  | 'Interior & Confort'
  | 'Seguridad Pirotécnica (DGR)';

export interface ItemOrderingTemplate {
  id: string;
  partsCode: string;
  orderingQuantity: number;
  comment: string;
  categorizacion: MetodoTransporteFabrica;
  // Campos técnicos y de cubicaje
  pesoUnitarioKg: number;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  pesoVolumetricoKg: number;
  categoriaEstructura: CategoriaEstructuraRepuesto;
  motivoClasificacion: string;
  esDGR?: boolean;
  // Trazabilidad de origen
  sucursal?: string;
  pedidoId?: string;
  modeloChangan?: string;
  cliente?: string;
  vin?: string;
  numeroOR?: string;
  tipoSolicitud?: TipoSolicitud;
  quincena?: string;
  fechaCreacion?: string;
}

export interface ReglaClasificacionEnvio {
  id: string;
  nombre: string;
  categoria: CategoriaEstructuraRepuesto;
  transporteRecomendado: MetodoTransporteFabrica;
  criterioPeso: string;
  criterioVolumen: string;
  descripcionTecnica: string;
  ejemplosRepuestos: string[];
}

export interface ResumenConsolidadoSucursal {
  sucursal: string;
  totalLineas: number;
  totalPiezas: number;
  piezasAereo: number;
  piezasMaritimo: number;
  pesoTotalEstimadoKg: number;
  pedidosVor: number;
  porcentajeAereo: number;
}

export interface ModeloVehiculoChangan {
  nombre: string;
  categoria: 'SUV' | 'Sedán' | 'Eléctrico / Híbrido' | 'Pickup' | 'Comercial' | string;
  anosCompatibles: string;
}
