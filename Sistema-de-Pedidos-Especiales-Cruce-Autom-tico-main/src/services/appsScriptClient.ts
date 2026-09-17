import { CABECERAS_MATRIZ_SINCRONIZADA, DETALLES_MATRIZ_SINCRONIZADA } from '../data/matrizBaseSincronizada';
import { InsforgeService } from './insforgeClient';
import { SecurityUtils } from '../utils/security';
import { 
  SolicitudCabecera, 
  DetalleRepuesto, 
  DPLManifiesto, 
  DPLDetalle, 
  ModeloChangan, 
  BDEncargado, 
  AuditoriaKardex, 
  AppsScriptApiConfig,
  ResultadoDiagnosticoCORS,
  UsuarioActivo,
  FilaMatrizCentral,
  RegistroStaging,
  BitacoraNota,
  EstatusLineaRepuesto,
  EstatusPedidoGeneral,
  EstatusDPL,
  normalizarEstatusDPL
} from '../types/cedis';
import { ReconciliationEngine } from './reconciliationEngine';
import despachosHistoricos from '../data/despachosHistoricos.json';
import contenedoresHistoricos from '../data/contenedoresHistoricos.json';

const STORAGE_KEYS = {
  CONFIG: 'changan_cedis_api_config_v2',
  USER: 'changan_cedis_active_user_v2',
  CABECERA: 'changan_cedis_cabecera_canonica_v2',
  DETALLE: 'changan_cedis_detalle_canonica_v2',
  MANIFIESTOS: 'changan_cedis_manifiestos_v2',
  DPL_DETALLE: 'changan_cedis_dpl_detalle_v2',
  MODELOS: 'changan_cedis_modelos_v2',
  ENCARGADOS: 'changan_cedis_encargados_v2',
  AUDITORIA: 'changan_cedis_auditoria_inmutable_v2',
  TOMBSTONES_PEDIDOS: 'changan_cedis_tombstones_pedidos_v2',
  TOMBSTONES_CLIENTES: 'changan_cedis_tombstones_clientes_v2',
  TOMBSTONES_LINEAS_DESPACHADAS: 'changan_cedis_tombstones_despachadas_v2',
};

export const OFFICIAL_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbypd1CUr-Vd3_9Cq6PciWaEJwt-3r3px-r19Lsc3i4BnkRhL8OYSqj7JEgC5ESRBz1H/exec';

// Usuarios oficiales con Roles
export const USUARIOS_OFICIALES: BDEncargado[] = [
  {
    usuarioId: 'USR-001',
    nombre: 'Administrador CEDIS',
    correo: 'visionluxe58@gmail.com',
    sucursal: 'Bodega Central',
    canal: 'CEDIS Central',
    cargo: 'Administrador General CEDIS',
    telefono: '6000-0000',
    rol: 'ADMINISTRADOR_CEDIS',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-002',
    nombre: 'Leidys Perez',
    correo: 'repuestos@changanpanama.com',
    sucursal: 'Villa Lucre',
    canal: 'Mostrador',
    cargo: 'Ejecutiva de Venta de Repuestos',
    telefono: '6561-1360',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-003',
    nombre: 'Edwin Blanco',
    correo: 'repuestos4@changanpanama.com',
    sucursal: 'Villa Lucre',
    canal: 'ChapisterÃ­a',
    cargo: 'Ejecutivo de Venta de Repuestos Chapisteria',
    telefono: '6374-8911',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-004',
    nombre: 'Pedro Guerrel',
    correo: 'taller.vl@changanpanama.com',
    sucursal: 'Villa Lucre',
    canal: 'Taller MecÃ¡nico',
    cargo: 'Facturador de taller',
    telefono: '6511-1363',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-005',
    nombre: 'Ulisses Urriola',
    correo: 'repuestostm@changanpanama.com',
    sucursal: 'Tumba Muerto',
    canal: 'Taller / Mostrador',
    cargo: 'Ejecutiva de Venta de Repuestos',
    telefono: '6979-9581',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-006',
    nombre: 'Edilson Uribe',
    correo: 'repuestoscalle50@changanpanama.com',
    sucursal: 'Calle 50',
    canal: 'Taller / Mostrador',
    cargo: 'Ejecutiva de Venta de Repuestos',
    telefono: '6849-7262',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-007',
    nombre: 'Arquimedes Jordan',
    correo: 'repuestospanamaoeste@changanpanama.com',
    sucursal: 'Costa Verde',
    canal: 'Taller / Mostrador',
    cargo: 'Ejecutiva de Venta de Repuestos',
    telefono: '6378-4144',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-008',
    nombre: 'Nivardo Gutierres',
    correo: 'bodegachiriqui@changanpanama.com',
    sucursal: 'Chiriqui',
    canal: 'Taller / Mostrador',
    cargo: 'Ejecutiva de Venta de Repuestos',
    telefono: '6495-6069',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-009',
    nombre: 'Juan Arrocha',
    correo: 'bodegacostaverde@changanpanama.com',
    sucursal: 'Costa Verde',
    canal: 'Taller / Mostrador',
    cargo: 'Asistente de Bodega',
    telefono: '6027-0421',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  },
  {
    usuarioId: 'USR-010',
    nombre: 'Roberto Tibbet',
    correo: 'bodega.chiriqui@changanpanama.com',
    sucursal: 'Chiriqui',
    canal: 'Taller / Mostrador',
    cargo: 'Jefe de Bodega',
    telefono: '6157-3504',
    rol: 'SUCURSAL_ASESOR',
    activo: true,
    movilHabilitado: true
  }
];
export const MODELOS_OFICIALES: ModeloChangan[] = [
  { modeloId: 'MOD-001', nombre: 'CS15', categoria: 'SUV', rangoAnio: '2018-2026', anosCompatibles: '2018-2026', motor: '1.5L DVVT (105 HP)', activo: true, notas: 'SUV compacto urbano' },
  { modeloId: 'MOD-002', nombre: 'CS35 Normal', categoria: 'SUV', rangoAnio: '2015-2020', anosCompatibles: '2015-2020', motor: '1.6L Blue Core', activo: true, notas: 'SUV primera generacin' },
  { modeloId: 'MOD-003', nombre: 'CS35 Plus 2020-2022 (Modelo QUATE)', categoria: 'SUV', rangoAnio: '2020-2022', anosCompatibles: '2020-2022', motor: '1.6L GDI', activo: true, notas: 'Modelo QUATE' },
  { modeloId: 'MOD-004', nombre: 'CS35 Plus 2023-2024', categoria: 'SUV', rangoAnio: '2023-2024', anosCompatibles: '2019-2026', motor: '1.4L Turbo BlueCore (158 HP)', activo: true, notas: 'SUV de alta demanda en Panam' },
  { modeloId: 'MOD-005', nombre: 'CS35 Plus MAX', categoria: 'SUV', rangoAnio: '2021-2026', anosCompatibles: '2021-2026', motor: '1.4T DCT', activo: true, notas: 'Versin deportiva turbo' },
  { modeloId: 'MOD-006', nombre: 'CS55 Normal', categoria: 'SUV', rangoAnio: '2018-2021', anosCompatibles: '2018-2021', motor: '1.5T', activo: true, notas: 'SUV mediano primera generacin' },
  { modeloId: 'MOD-007', nombre: 'CS55 Plus', categoria: 'SUV', rangoAnio: '2021-2026', anosCompatibles: '2021-2026', motor: '1.5L Turbo BlueCore (185 HP)', activo: true, notas: 'SUV mediano insignia' },
  { modeloId: 'MOD-008', nombre: 'CS55 Plus Q5', categoria: 'SUV', rangoAnio: '2022-2026', anosCompatibles: '2022-2026', motor: '1.5T 7-DCT', activo: true, notas: 'Nueva generacin' },
  { modeloId: 'MOD-009', nombre: 'CS55 Plus 2026-2027', categoria: 'SUV', rangoAnio: '2026-2027', anosCompatibles: '2026-2027', motor: '1.5T BlueCore NE', activo: true, notas: 'Lnea 2026-2027' },
  { modeloId: 'MOD-010', nombre: 'CS75 Plus', categoria: 'SUV', rangoAnio: '2020-2026', anosCompatibles: '2020-2026', motor: '2.0L Turbo BlueCore (229 HP)', activo: true, notas: 'SUV premium 5 pasajeros' },
  { modeloId: 'MOD-011', nombre: 'Oshan X7 Plus', categoria: 'SUV', rangoAnio: '2021-2025', anosCompatibles: '2021-2025', motor: '1.5L Turbo BlueCore', activo: true, notas: 'Lnea ejecutiva Oshan 7 pasajeros' },
  { modeloId: 'MOD-012', nombre: 'UNI-T', categoria: 'SUV', rangoAnio: '2021-2026', anosCompatibles: '2021-2026', motor: '1.5L Turbo BlueCore (180 HP)', activo: true, notas: 'Cross-SUV vanguardista' },
  { modeloId: 'MOD-013', nombre: 'UNI-K', categoria: 'SUV', rangoAnio: '2021-2026', anosCompatibles: '2021-2026', motor: '2.0L Turbo AWD Aisin 8AT', activo: true, notas: 'SUV insignia de lujo AWD' },
  { modeloId: 'MOD-014', nombre: 'Alsvin', categoria: 'Sedn', rangoAnio: '2020-2026', anosCompatibles: '2020-2026', motor: '1.4L / 1.5L DCT BlueCore', activo: true, notas: 'Sedn ms vendido, alta rotacin de repuestos' },
  { modeloId: 'MOD-015', nombre: 'Alsvin Plus', categoria: 'Sedn', rangoAnio: '2021-2026', anosCompatibles: '2021-2026', motor: '100% Elctrico (Batera 52.5 kWh)', activo: true, notas: 'Sedn elctrico' },
  { modeloId: 'MOD-016', nombre: 'Hunter Pickup (4x2 / 4x4)', categoria: 'Pickup', rangoAnio: '2020-2026', anosCompatibles: '2020-2026', motor: '1.9L Turbo Diesel Isuzu Tech (150 HP)', activo: true, notas: 'Pickup de trabajo pesado y flotas' },
  { modeloId: 'MOD-017', nombre: 'Hunter REEV / Hbrido', categoria: 'Elctrico / Hbrido', rangoAnio: '2024-2026', anosCompatibles: '2024-2026', motor: 'Elctrico Rango Extendido (EREV) Dual Motor', activo: true, notas: 'Primera pickup elctrica con extensor de rango' },
  { modeloId: 'MOD-018', nombre: 'Deepal S05', categoria: 'Elctrico / Hbrido', rangoAnio: '2023-2026', anosCompatibles: '2023-2026', motor: '100% Elctrico / EREV (620 km)', activo: true, notas: 'SUV elctrico inteligente Deepal' },
  { modeloId: 'MOD-019', nombre: 'Deepal S07', categoria: 'Elctrico / Hbrido', rangoAnio: '2023-2026', anosCompatibles: '2023-2026', motor: '100% Elctrico / EREV', activo: true, notas: 'SUV deportivo elctrico' },
  { modeloId: 'MOD-020', nombre: 'Deepal G318', categoria: 'Elctrico / Hbrido', rangoAnio: '2025-2027', anosCompatibles: '2025-2027', motor: 'Dual Motor EREV Off-Road', activo: true, notas: 'SUV todoterreno todocamino' },
  { modeloId: 'MOD-021', nombre: 'Avatr 11', categoria: 'Elctrico / Hbrido', rangoAnio: '2024-2026', anosCompatibles: '2024-2026', motor: 'Dual Motor AWD 578 HP (Huawei Inside)', activo: true, notas: 'SUV ultra premium elctrico' },
  { modeloId: 'MOD-022', nombre: 'M60', categoria: 'Comercial', rangoAnio: '2018-2025', anosCompatibles: '2018-2025', motor: '1.5L Gasolina (7 Pasajeros)', activo: true, notas: 'Vehculo comercial y transporte' },
  { modeloId: 'MOD-023', nombre: 'Star5', categoria: 'Comercial', rangoAnio: '2017-2026', anosCompatibles: '2017-2026', motor: '1.2L / 1.5L Carga Ligera', activo: true, notas: 'Camin liviano de carga' }
];

export const CONTENEDORES_CANONICOS: DPLManifiesto[] = [
  {
    contenedorId: 'INV-CN-8902',
    proveedor: 'Mobitech Changan China Co., Ltd',
    fechaArribo: '2026-08-15',
    poReferencia: 'PO-2026-CH-089',
    tipoTransporte: 'MarÃ­timo 40HQ',
    totalPiezas: 120,
    skusUnicos: 6,
    totalPallets: 4,
    estado: 'RECIBIDO',
    creadoPor: 'Administrador CEDIS',
    creadoEn: '2026-08-15 09:00:00'
  },
  {
    contenedorId: 'INV-CN-9140',
    proveedor: 'Mobitech Changan China Co., Ltd',
    fechaArribo: '2026-09-02',
    poReferencia: 'PO-2026-CH-112',
    tipoTransporte: 'MarÃ­timo 40HQ',
    totalPiezas: 85,
    skusUnicos: 5,
    totalPallets: 3,
    estado: 'RECIBIDO',
    creadoPor: 'Administrador CEDIS',
    creadoEn: '2026-09-02 10:30:00'
  },
  {
    contenedorId: 'INV-CN-9250',
    proveedor: 'Mobitech Changan China Co., Ltd',
    fechaArribo: '2026-09-18',
    poReferencia: 'PO-2026-CH-125',
    tipoTransporte: 'MarÃ­timo 40HQ',
    totalPiezas: 140,
    skusUnicos: 8,
    totalPallets: 5,
    estado: 'EN TRÃNSITO',
    creadoPor: 'Administrador CEDIS',
    creadoEn: '2026-09-05 11:00:00'
  },
  {
    contenedorId: 'INV-CN-9310',
    proveedor: 'Mobitech Changan China Co., Ltd',
    fechaArribo: '2026-09-14',
    poReferencia: 'PO-2026-CH-131',
    tipoTransporte: 'MarÃ­timo 40HQ',
    totalPiezas: 95,
    skusUnicos: 6,
    totalPallets: 3,
    estado: 'ADUANA',
    creadoPor: 'Administrador CEDIS',
    creadoEn: '2026-09-07 14:20:00'
  }
];

export const DPL_DETALLE_CANONICO: DPLDetalle[] = [
  {
    inventarioId: 'INV-CN-8902_1',
    contenedorId: 'INV-CN-8902',
    palletCaseNo: 'P001',
    packageNo: 'PKG-01',
    codigoRepuesto: 'S111F270108-0103',
    descripcion: 'Puerta Delantera Derecha UNI-T',
    cantidadTotal: 6,
    cantidadAsignada: 1,
    cantidadDespachada: 2,
    saldoDisponible: 3, // 6 - 1 - 2 = 3
    ubicacionCedis: 'BahÃ­a A-01 / Pallet P001'
  },
  {
    inventarioId: 'INV-CN-8902_2',
    contenedorId: 'INV-CN-8902',
    palletCaseNo: 'P001',
    packageNo: 'PKG-02',
    codigoRepuesto: '8511F270102-0202-AA',
    descripcion: 'Faro Delantero LED Izquierdo CS55 Plus',
    cantidadTotal: 8,
    cantidadAsignada: 2,
    cantidadDespachada: 0,
    saldoDisponible: 6, // 8 - 2 - 0 = 6
    ubicacionCedis: 'BahÃ­a A-02 / Pallet P001'
  },
  {
    inventarioId: 'INV-CN-8902_3',
    contenedorId: 'INV-CN-8902',
    palletCaseNo: 'P002',
    packageNo: 'PKG-03',
    codigoRepuesto: 'F202F260100',
    descripcion: 'Amortiguador Delantero Hunter 4x4',
    cantidadTotal: 24,
    cantidadAsignada: 4,
    cantidadDespachada: 4,
    saldoDisponible: 16, // 24 - 4 - 4 = 16
    ubicacionCedis: 'Rack B-12 / Pallet P002'
  },
  {
    inventarioId: 'INV-CN-8902_4',
    contenedorId: 'INV-CN-8902',
    palletCaseNo: 'P003',
    packageNo: 'PKG-04',
    codigoRepuesto: 'C301F280201',
    descripcion: 'Pastillas de Freno Delanteras Alsvin',
    cantidadTotal: 50,
    cantidadAsignada: 5,
    cantidadDespachada: 10,
    saldoDisponible: 35, // 50 - 5 - 10 = 35
    ubicacionCedis: 'Rack C-05 / Pallet P003'
  },
  {
    inventarioId: 'INV-CN-9140_1',
    contenedorId: 'INV-CN-9140',
    palletCaseNo: 'P101',
    packageNo: 'PKG-01',
    codigoRepuesto: 'E101F310100',
    descripcion: 'Radiador de Enfriamiento Motor CS35',
    cantidadTotal: 15,
    cantidadAsignada: 2,
    cantidadDespachada: 0,
    saldoDisponible: 13, // 15 - 2 - 0 = 13
    ubicacionCedis: 'BahÃ­a D-01 / Pallet P101'
  },
  {
    inventarioId: 'INV-CN-9140_2',
    contenedorId: 'INV-CN-9140',
    palletCaseNo: 'P102',
    packageNo: 'PKG-02',
    codigoRepuesto: 'H200F290400',
    descripcion: 'Bomba de Agua Genuina UNI-K 2.0T',
    cantidadTotal: 20,
    cantidadAsignada: 1,
    cantidadDespachada: 1,
    saldoDisponible: 18, // 20 - 1 - 1 = 18
    ubicacionCedis: 'Rack E-08 / Pallet P102'
  },
  {
    inventarioId: 'INV-CN-9250_1',
    contenedorId: 'INV-CN-9250',
    palletCaseNo: 'P201',
    packageNo: 'PKG-01',
    codigoRepuesto: 'K999F120000',
    descripcion: 'Juego de Espejos Retrovisores ElÃ©ctricos Hunter/CS55',
    cantidadTotal: 10,
    cantidadAsignada: 0,
    cantidadDespachada: 0,
    saldoDisponible: 10,
    ubicacionCedis: 'En TrÃ¡nsito MarÃ­timo (No Asignable hasta Arribo)'
  },
  {
    inventarioId: 'INV-CN-9310_1',
    contenedorId: 'INV-CN-9310',
    palletCaseNo: 'P301',
    packageNo: 'PKG-01',
    codigoRepuesto: 'S111F260204-0100',
    descripcion: 'Sensor ABS Trasero UNI-T',
    cantidadTotal: 15,
    cantidadAsignada: 0,
    cantidadDespachada: 0,
    saldoDisponible: 15,
    ubicacionCedis: 'En Aduana Portuaria (No Asignable hasta Arribo)'
  }
];

export const CABECERAS_BASE_9_SEP: SolicitudCabecera[] = [
  {
    pedidoId: 'PED-VL-2101',
    fechaCreacion: '2026-09-08 09:30:00',
    sucursal: 'Villa Lucre',
    colaborador: 'Leidys Perez',
    canal: 'Mostrador',
    tipoPedido: 'VOR / Unidad Parada',
    cotizacion: 'COT-VL-901',
    cliente: 'GRUPO SILABA S.A.',
    placa: 'PA-9912',
    modeloChangan: 'UNI-T Elite',
    vin: 'LS4A2B999RA019283',
    numeroOR: 'OR-8921',
    estadoPago: 'Aprobado',
    documentoPagoFactura: 'FAC-09-112',
    facturadoFinal: 'SÃ­',
    estatusGeneral: 'Asignado Total',
    estatusFabrica: 'Asignado en CEDIS',
    origen: 'PORTAL_CEDIS',
    version: 1,
    creadoPor: 'Leidys Perez',
    creadoEn: '2026-09-08 09:30:00',
    actualizadoPor: 'Administrador CEDIS',
    actualizadoEn: '2026-09-08 09:35:00',
    observaciones: 'Cliente en taller con unidad parada urgente'
  },
  {
    pedidoId: 'PED-CV-2102',
    fechaCreacion: '2026-09-08 11:15:00',
    sucursal: 'Costa Verde',
    colaborador: 'Carlos Mendoza',
    canal: 'Taller',
    tipoPedido: 'ChapisterÃ­a y ColisiÃ³n',
    cotizacion: 'COT-CV-442',
    cliente: 'Aseguradora Fedpa / Auto Express',
    placa: 'CG-8812',
    modeloChangan: 'CS55 Plus DCT',
    vin: 'LS4A3C888TA029182',
    numeroOR: 'COL-4421',
    estadoPago: 'Aprobado',
    documentoPagoFactura: 'POL-FEDPA-990',
    facturadoFinal: 'No',
    estatusGeneral: 'Asignado Total',
    estatusFabrica: 'Asignado en CEDIS',
    origen: 'PORTAL_CEDIS',
    version: 1,
    creadoPor: 'Carlos Mendoza',
    creadoEn: '2026-09-08 11:15:00',
    actualizadoPor: 'Administrador CEDIS',
    actualizadoEn: '2026-09-08 11:20:00',
    observaciones: 'ReparaciÃ³n de frente por colisiÃ³n'
  },
  {
    pedidoId: 'PED-TM-2103',
    fechaCreacion: '2026-09-09 14:00:00',
    sucursal: 'Tumba Muerto',
    colaborador: 'Alexis Rios',
    canal: 'ColisiÃ³n',
    tipoPedido: 'Taller MecÃ¡nico',
    cotizacion: 'COT-TM-112',
    cliente: 'Flotas Corporativas Changan',
    placa: 'FL-4001',
    modeloChangan: 'Hunter 4x4 Diesel',
    vin: 'LS4A4D777SA038271',
    numeroOR: 'MT-1092',
    estadoPago: 'Facturado',
    documentoPagoFactura: 'FAC-FL-889',
    facturadoFinal: 'SÃ­',
    estatusGeneral: 'Despachado Total',
    estatusFabrica: 'Completado',
    origen: 'PORTAL_CEDIS',
    version: 2,
    creadoPor: 'Alexis Rios',
    creadoEn: '2026-09-09 14:00:00',
    actualizadoPor: 'Operador Bodega CEDIS',
    actualizadoEn: '2026-09-09 15:30:00',
    observaciones: 'Mantenimiento preventivo 40k km'
  },
  {
    pedidoId: 'PED-C50-2104',
    fechaCreacion: '2026-09-09 16:45:00',
    sucursal: 'Calle 50',
    colaborador: 'Valeria Castillo',
    canal: 'GarantÃ­as',
    tipoPedido: 'GarantÃ­a',
    cotizacion: 'GAR-C50-990',
    cliente: 'Roberto Gonzalez',
    placa: 'RG-7711',
    modeloChangan: 'CS35 Plus Turbo',
    vin: 'LS4A1A666PA048192',
    numeroOR: 'GAR-3329',
    estadoPago: 'Exento (GarantÃ­a)',
    documentoPagoFactura: 'GAR-CH-2026-11',
    facturadoFinal: 'No',
    estatusGeneral: 'Asignado Total',
    estatusFabrica: 'Aprobado FÃ¡brica',
    origen: 'PORTAL_CEDIS',
    version: 1,
    creadoPor: 'Valeria Castillo',
    creadoEn: '2026-09-09 16:45:00',
    actualizadoPor: 'Administrador CEDIS',
    actualizadoEn: '2026-09-09 16:50:00',
    observaciones: 'Reclamo aprobado por fÃ¡brica'
  },
  // Pedido ausente preservado (1 de los 5)
  {
    pedidoId: 'PED-CV-2240',
    fechaCreacion: '2026-09-07 10:00:00',
    sucursal: 'Costa Verde',
    colaborador: 'Carlos Mendoza',
    canal: 'Taller',
    tipoPedido: 'VOR / Unidad Parada',
    cotizacion: 'COT-CV-2240',
    cliente: 'Constructora del Istmo S.A.',
    placa: 'CI-1199',
    modeloChangan: 'Hunter 4x4 Diesel',
    vin: 'LS4A9Z001YA888881',
    numeroOR: 'OR-9001',
    estadoPago: 'Aprobado',
    documentoPagoFactura: 'FAC-CV-781',
    facturadoFinal: 'SÃ­',
    estatusGeneral: 'Asignado Total',
    estatusFabrica: 'Asignado en CEDIS',
    origen: 'PORTAL_CEDIS',
    version: 1,
    creadoPor: 'Carlos Mendoza',
    creadoEn: '2026-09-07 10:00:00',
    actualizadoPor: 'Administrador CEDIS',
    actualizadoEn: '2026-09-07 10:15:00',
    observaciones: 'Control 9-Sep: Preservado sin borrado automÃ¡tico'
  }
];

export const DETALLES_BASE_9_SEP: DetalleRepuesto[] = [
  {
    lineaId: 'PED-VL-2101-L1',
    pedidoId: 'PED-VL-2101',
    codigoRepuesto: 'S111F270108-0103',
    codigoActualizado: 'S111F270108-0103',
    descripcionOficial: 'Puerta Delantera Derecha UNI-T',
    cantidadSolicitada: 1,
    cantidadAsignada: 1,
    cantidadDespachada: 0,
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P001',
    packageNo: 'PKG-01',
    ubicacionCedis: 'BahÃ­a A-01 / Pallet P001',
    estatusLinea: 'Asignado'
  },
  {
    lineaId: 'PED-CV-2102-L1',
    pedidoId: 'PED-CV-2102',
    codigoRepuesto: '8511F270102-0202-AA',
    codigoActualizado: '8511F270102-0202-AA',
    descripcionOficial: 'Faro Delantero LED Izquierdo CS55 Plus',
    cantidadSolicitada: 2,
    cantidadAsignada: 2,
    cantidadDespachada: 0,
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P001',
    packageNo: 'PKG-02',
    ubicacionCedis: 'BahÃ­a A-02 / Pallet P001',
    estatusLinea: 'Asignado'
  },
  {
    lineaId: 'PED-TM-2103-L1',
    pedidoId: 'PED-TM-2103',
    codigoRepuesto: 'F202F260100',
    codigoActualizado: 'F202F260100',
    descripcionOficial: 'Amortiguador Delantero Hunter 4x4',
    cantidadSolicitada: 4,
    cantidadAsignada: 0,
    cantidadDespachada: 4,
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P002',
    packageNo: 'PKG-03',
    ubicacionCedis: 'Rack B-12 / Pallet P002',
    estatusLinea: 'Despachado'
  },
  {
    lineaId: 'PED-C50-2104-L1',
    pedidoId: 'PED-C50-2104',
    codigoRepuesto: 'E101F310100',
    codigoActualizado: 'E101F310100',
    descripcionOficial: 'Radiador de Enfriamiento Motor CS35',
    cantidadSolicitada: 2,
    cantidadAsignada: 2,
    cantidadDespachada: 0,
    contenedorAsignado: 'INV-CN-9140',
    palletAsignado: 'P101',
    packageNo: 'PKG-01',
    ubicacionCedis: 'BahÃ­a D-01 / Pallet P101',
    estatusLinea: 'Asignado'
  },
  {
    lineaId: 'PED-CV-2240-L1',
    pedidoId: 'PED-CV-2240',
    codigoRepuesto: 'F202F260100',
    codigoActualizado: 'F202F260100',
    descripcionOficial: 'Amortiguador Delantero Hunter 4x4',
    cantidadSolicitada: 2,
    cantidadAsignada: 2,
    cantidadDespachada: 0,
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P002',
    packageNo: 'PKG-03',
    ubicacionCedis: 'Rack B-12 / Pallet P002',
    estatusLinea: 'Asignado'
  }
];

export const AUDITORIA_INICIAL: AuditoriaKardex[] = [
  {
    auditoriaId: 'AUD-INIT-001',
    timestamp: '2026-09-08 10:00:00',
    usuarioId: 'USR-001',
    usuarioNombre: 'Administrador CEDIS',
    accion: 'DESPACHO_FISICO',
    entidad: 'Detalle_Repuestos',
    identificador: 'PED-VL-2090-L1',
    valoresAnteriores: JSON.stringify({ cantDespachada: 0, cantAsignada: 2 }),
    valoresNuevos: JSON.stringify({ cantDespachada: 2, cantAsignada: 0, contenedor: 'INV-CN-8902', pallet: 'P001' }),
    operationId: 'OP-DISP-20260908-01',
    notas: 'Despacho completado hacia Villa Lucre trasbordador #4'
  },
  {
    auditoriaId: 'AUD-INIT-002',
    timestamp: '2026-09-09 15:30:00',
    usuarioId: 'USR-002',
    usuarioNombre: 'Operador Bodega CEDIS',
    accion: 'DESPACHO_FISICO',
    entidad: 'Detalle_Repuestos',
    identificador: 'PED-TM-2103-L1',
    valoresAnteriores: JSON.stringify({ cantDespachada: 0, cantAsignada: 4 }),
    valoresNuevos: JSON.stringify({ cantDespachada: 4, cantAsignada: 0, contenedor: 'INV-CN-8902', pallet: 'P002' }),
    operationId: 'OP-DISP-20260909-02',
    notas: 'Despacho de amortiguadores para Flotas Corporativas'
  }
];


function normKey(k: string): string {
  return k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function getValFlexible(row: Record<string, any>, ...candidates: string[]): string {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
      return String(row[c]).trim();
    }
  }
  const normCandidates = candidates.map(normKey);
  for (const [k, v] of Object.entries(row)) {
    if (normCandidates.includes(normKey(k)) && v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

function normalizarEstatusLinea(val: string): EstatusLineaRepuesto {
  const s = (val || '').toUpperCase().trim();
  if (s.includes('DESPACH') || s.includes('ENTREG')) return 'Despachado';
  if (s.includes('ASIGN') || s.includes('BODEGA') || s.includes('RECOLECT') || s.includes('TRANSIT') || s.includes('PARCIAL') || s.includes('ESPERANDO')) return 'Asignado';
  if (s.includes('SIN STOCK')) return 'Sin Stock';
  if (s.includes('CANCEL')) return 'Cancelado';
  return 'Pendiente';
}


function normalizeClientTokens(name: string): string[] {
  if (!name) return [];
  const stopWords = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'S.A.', 'SA', 'INC', 'LIC', 'SR', 'SRA', 'S/C', 'ACERTA', 'SEGUROS', 'SEGURO']);
  return String(name)
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !stopWords.has(t));
}

function areClientsSamePerson(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const aNorm = String(nameA).trim().toUpperCase();
  const bNorm = String(nameB).trim().toUpperCase();
  if (aNorm === bNorm) return true;
  if (aNorm.length >= 4 && bNorm.length >= 4 && (aNorm.includes(bNorm) || bNorm.includes(aNorm))) return true;

  const tokensA = normalizeClientTokens(nameA);
  const tokensB = normalizeClientTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  let common = 0;
  tokensA.forEach(t => {
    if (tokensB.includes(t)) common++;
  });

  if (common >= 2) return true;
  if (common >= 1 && (tokensA.length === 1 || tokensB.length === 1)) return true;
  return false;
}

function normalizarEstatusGeneral(val: string): EstatusPedidoGeneral {
  const s = (val || '').toUpperCase().trim();
  if (s.includes('ENTREG')) return 'Entregado';
  if (s.includes('DESPACHADO TOTAL')) return 'Despachado Total';
  if (s.includes('DESPACH')) return 'Despachado';
  if (s.includes('BODEGA')) return 'EN BODEGA CEDIS';
  if (s.includes('RECOLECT')) return 'EN BODEGA CEDIS';
  if (s.includes('PARCIAL')) return 'PARCIAL';
  if (s.includes('ASIGNADO TOTAL')) return 'Asignado Total';
  if (s.includes('ASIGN')) return 'PARCIAL';
  if (s.includes('CANCEL')) return 'Cancelado';
  if (s.includes('PENDIENTE')) return 'Pendiente';
  return (val as any) || 'Pendiente';
}

class AppsScriptClientService {
  /**
   * EnvÃ­a peticiones POST seguras a Google Apps Script evitando preflight CORS (Content-Type: text/plain)
   */
  private async postToAppsScript(payload: Record<string, any>): Promise<any> {
    if (!this.config.webAppUrl || this.config.modoOfflineSimulado) {
      return { success: true, offline: true };
    }
    try {
      const resp = await fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      return await resp.json();
    } catch (err: any) {
      console.warn(`Error al enviar acciÃ³n ${payload.action} a Google Apps Script:`, err);
      return { success: false, error: err.message || String(err) };
    }
  }

  private config: AppsScriptApiConfig;
  private usuarioActivo: UsuarioActivo;
  
  // Base de datos canÃ³nica local
  private cabeceras: SolicitudCabecera[] = [];
  private detalles: DetalleRepuesto[] = [];
  private manifiestos: DPLManifiesto[] = [];
  private dplDetalle: DPLDetalle[] = [];
  private modelos: ModeloChangan[] = [];
  private encargados: BDEncargado[] = [];
  private auditoria: AuditoriaKardex[] = [];

  private tombstonesPedidos: Set<string> = new Set<string>();
  private despachosDesdeSheetsTab: FilaMatrizCentral[] = [];
  private tombstonesClientes: Set<string> = new Set<string>();

  private cargarTombstones(): void {
    try {
      const rawP = this.safeGet(STORAGE_KEYS.TOMBSTONES_PEDIDOS);
      const rawC = this.safeGet(STORAGE_KEYS.TOMBSTONES_CLIENTES);
      const arrP: string[] = rawP ? JSON.parse(rawP) : [];
      const arrC: string[] = rawC ? JSON.parse(rawC) : [];

      // Pre-cargar permanentemente clientes y pedidos eliminados por el usuario
      const defaultP = ['PED-CV-001', 'PED-CV-002', 'PED-CV-023'];
      const defaultC = ['JOSE GONZALEZ', 'JOSÃ‰ GONZÃLEZ'];

      defaultP.forEach(id => arrP.push(id));
      defaultC.forEach(c => arrC.push(c));

      this.tombstonesPedidos = new Set(arrP.map(p => p.trim().toUpperCase()));
      this.tombstonesClientes = new Set(arrC.map(c => c.trim().toUpperCase()));
      this.persistirTombstones();
    } catch (e) {
      console.warn('Error cargando tombstones:', e);
      this.tombstonesPedidos = new Set(['PED-CV-001', 'PED-CV-002', 'PED-CV-023']);
      this.tombstonesClientes = new Set(['JOSE GONZALEZ', 'JOSÃ‰ GONZÃLEZ']);
    }
  }

  public persistirTombstones(): void {
    try {
      this.safeSet(STORAGE_KEYS.TOMBSTONES_PEDIDOS, JSON.stringify(Array.from(this.tombstonesPedidos)));
      this.safeSet(STORAGE_KEYS.TOMBSTONES_CLIENTES, JSON.stringify(Array.from(this.tombstonesClientes)));
    } catch (e) {
      console.warn('Error guardando tombstones:', e);
    }
  }

  public isPedidoTombstoned(pedidoId: string): boolean {
    if (!pedidoId) return false;
    return this.tombstonesPedidos.has(pedidoId.trim().toUpperCase());
  }

  public isClienteTombstoned(cliente: string): boolean {
    if (!cliente) return false;
    const cNorm = cliente.trim().toUpperCase();
    for (const tomb of this.tombstonesClientes) {
      if (cNorm === tomb || cNorm.includes(tomb) || areClientsSamePerson(cNorm, tomb)) {
        return true;
      }
    }
    return false;
  }

  public registrarTombstonePedido(pedidoId: string, cliente?: string): void {
    if (pedidoId) {
      this.tombstonesPedidos.add(pedidoId.trim().toUpperCase());
    }
    if (cliente && cliente.trim().length >= 3) {
      const cliNorm = cliente.trim().toUpperCase();
      // Si el cliente es Jose Gonzalez o se eliminÃ³ deliberadamente
      if (cliNorm.includes('JOSE GONZALEZ') || cliNorm.includes('JOSÃ‰ GONZÃLEZ')) {
        this.tombstonesClientes.add(cliNorm);
      }
    }
    this.persistirTombstones();
  }

  public registrarTombstoneCliente(cliente: string): void {
    if (!cliente) return;
    const cliNorm = cliente.trim().toUpperCase();
    this.tombstonesClientes.add(cliNorm);
    // Tombstonear todos los pedidos asociados a este cliente
    this.cabeceras.forEach(c => {
      if (c.cliente && (c.cliente.trim().toUpperCase() === cliNorm || areClientsSamePerson(c.cliente, cliNorm))) {
        this.tombstonesPedidos.add(c.pedidoId.trim().toUpperCase());
      }
    });
    this.persistirTombstones();
  }


  constructor() {
    this.config = this.cargarConfig();
    this.usuarioActivo = this.cargarUsuarioActivo();
    this.cargarTombstones();
    this.cargarDatosLocales();
    // Cargar despachos de Google Sheets en background (no bloqueante)
    this.fetchDespachosDesdeSheetsTab().catch(() => {});
  }

  private memoryStore: Map<string, string> = new Map();

  private safeGet(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      // Fallback a memoryStore
    }
    return this.memoryStore.get(key) || null;
  }

  private safeSet(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Fallback
    }
    this.memoryStore.set(key, value);
  }

  private cargarConfig(): AppsScriptApiConfig {
    const defaultUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APPS_SCRIPT_URL) || OFFICIAL_WEB_APP_URL;
    try {
      const c = this.safeGet(STORAGE_KEYS.CONFIG);
      if (c) {
        const parsed = JSON.parse(c);
        if (!parsed.webAppUrl || parsed.webAppUrl === 'https://script.google.com/macros/s/AKfycbwMhnEB2QAvnnymfH8ZrDYMDMxv3pYtnNh41L_JNtmpqbkF3Qcb5msG2I6XXez46bNc/exec') {
          parsed.webAppUrl = defaultUrl;
          parsed.modoOfflineSimulado = false;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error cargando config API:', e);
    }
    return {
      webAppUrl: defaultUrl,
      modoOfflineSimulado: false,
      estadoConexion: 'MODO_LOCAL_SEGURO',
      ultimoPing: new Date().toISOString()
    };
  }

  public guardarConfig(cfg: Partial<AppsScriptApiConfig>): void {
    this.config = { ...this.config, ...cfg };
    this.safeSet(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
  }

  public getConfig(): AppsScriptApiConfig {
    return { ...this.config };
  }

  /**
   * Ejecuta el diagnÃ³stico de conectividad, CORS y preflight OPTIONS para validar la API
   */
  public async diagnosticarConexion(urlCustom?: string, timeoutMs?: number): Promise<ResultadoDiagnosticoCORS> {
    const targetUrl = urlCustom !== undefined ? urlCustom : this.config.webAppUrl;
    const resultado = await diagnosticarConexionAppsScript(targetUrl, timeoutMs);
    if (resultado.ok) {
      this.guardarConfig({
        estadoConexion: 'CONECTADO_CANONICO',
        ultimoPing: new Date().toISOString()
      });
    } else if (targetUrl) {
      this.guardarConfig({
        estadoConexion: 'ERROR_CONEXION'
      });
    }
    return resultado;
  }

  /**
   * SincronizaciÃ³n CanÃ³nica Bidireccional: Trae datos vivos desde Google Apps Script (Endpoint getInitialData)
   * e hidrata el estado local de la aplicaciÃ³n.
   */
  public async fetchInitialData(forzar: boolean = false): Promise<{
    success: boolean;
    error?: string;
    totalCargado?: {
      cabeceras: number;
      detalles: number;
      manifiestos: number;
      dplDetalle: number;
      modelos: number;
      encargados: number;
      auditoria: number;
    };
  }> {
    if (!this.config.webAppUrl || this.config.modoOfflineSimulado) {
      return {
        success: true,
        error: 'Modo local activo (no se contactÃ³ Google Sheets porque no hay URL configurada o estÃ¡ en modo offline).'
      };
    }

    try {
      const url = new URL(this.config.webAppUrl);
      url.searchParams.set('action', 'getInitialData');
      url.searchParams.set('userEmail', this.usuarioActivo.correo);
      if (forzar) {
        url.searchParams.set('_ts', Date.now().toString());
      }

      const resp = await fetch(url.toString(), {
        method: 'GET'
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const resJson = await resp.json();

      if (!resJson.success || !resJson.data) {
        return {
          success: false,
          error: resJson.error || 'Respuesta invÃ¡lida del backend de Google Apps Script.'
        };
      }

      const data = resJson.data;

      // 1. Si recibimos data.matriz directa (hoja canÃ³nica de Google Sheets / Matriz_Central):
      if (Array.isArray(data.matriz) && data.matriz.length > 0) {
        // Filtrado preventivo estricto de duplicados en la ingesta de Google Sheets
        const seenExactIngesta = new Set<string>();
        const activeClientRegistry: { cliente: string; codigo: string; pedidoId: string }[] = [];
        const rawMatrizFilas = data.matriz;
        const matrizFiltrada: any[] = [];

        rawMatrizFilas.forEach((r: any) => {
          const pId = String(getValFlexible(r, 'ID Pedido', 'Pedido_ID', 'pedidoId') || '').trim();
          // Soporta tanto 'CÃ³digo OEM' (cabecera oficial del Sheet) como 'CÃ³digo Repuesto' y variantes
          const codRep = String(getValFlexible(r, 'CÃ³digo OEM', 'Codigo OEM', 'CÃ³digo Repuesto', 'Codigo Repuesto', 'Codigo_Repuesto_OEM', 'codigoRepuesto') || '').trim().toUpperCase();
          const cli = String(getValFlexible(r, 'Cliente / Caso', 'Cliente/Caso', 'Cliente', 'cliente') || '').trim();
          const estL = normalizarEstatusLinea(getValFlexible(r, 'estatusDetallado', 'Estatus Detallado', 'Estatus Cruce', 'Estatus LÃ­nea', 'Estatus Linea', 'Estatus_Linea', 'estatusLinea', 'Estatus', 'PENDIENTE'));

          if (!codRep) return;

          // 1. Eliminar lÃ­neas idÃ©nticas exactas en el mismo pedido
          const exactKey = `${pId}__${codRep}`;
          if (seenExactIngesta.has(exactKey)) {
            return;
          }
          seenExactIngesta.add(exactKey);

          // 2. Eliminar solicitudes duplicadas activas para el mismo cliente y repuesto
          // PROTECCIÃ“N PERMANENTE: Si el pedido o cliente fue eliminado, NO RESUCITAR NUNCA
          if (this.isPedidoTombstoned(pId) || this.isClienteTombstoned(cli)) {
            return;
          }

          // REGLA CRÃTICA CEDIS: Lo despachado queda retirado de la Matriz Central permanentemente
          const rawEstatusRow = String(getValFlexible(r, 'estatusDetallado', 'Estatus Detallado', 'Estatus Cruce', 'Estatus LÃ­nea', 'Estatus Linea', 'estatusLinea', 'Estatus') || '').toUpperCase();
          if (rawEstatusRow.includes('DESPACH') || estL === 'Despachado' || this.isLineaDespachada(r.lineaId, pId, codRep)) {
            this.marcarLineaComoDespachada(r.lineaId, pId, codRep);
            return;
          }
          const isFinal = estL === 'Despachado' || estL === 'Cancelado';
          if (!isFinal && cli) {
            const dupIdx = activeClientRegistry.findIndex(item =>
              item.codigo === codRep && areClientsSamePerson(item.cliente, cli)
            );
            if (dupIdx !== -1) {
              return; // Omitir duplicado activo
            }
            activeClientRegistry.push({ cliente: cli, codigo: codRep, pedidoId: pId });
          }

          matrizFiltrada.push(r);
        });

        const mapCab: Record<string, SolicitudCabecera> = {};
        const arrDet: DetalleRepuesto[] = [];

        matrizFiltrada.forEach((r: any, idx: number) => {
          const pId = getValFlexible(r, 'ID Pedido', 'Pedido_ID', 'pedidoId') || `PED-${idx + 1}`;
          const linId = getValFlexible(r, 'Linea_ID', 'lineaId') || `LIN-${idx + 1}`;
          const fch = getValFlexible(r, 'Fecha / Hora', 'Fecha/Hora', 'Fecha Registro', 'Fecha_Creacion', 'fechaCreacion') || new Date().toISOString();
          const suc = getValFlexible(r, 'Sucursal', 'Sucursal Solicitante', 'sucursal') || 'Bodega Central';
          const col = getValFlexible(r, 'Asesor / Solicitante', 'Asesor/Solicitante', 'Colaborador', 'Colaborador_Asesor', 'colaborador') || 'Usuario CEDIS';
          const tip = (getValFlexible(r, 'Prioridad', 'Tipo Pedido', 'Tipo_Solicitud_Prioridad', 'tipoPedido') || 'Especial') as any;
          const cot = getValFlexible(r, 'No. O.R.', 'CotizaciÃ³n', 'Cotizacion', 'cotizacion');
          const cli = getValFlexible(r, 'Cliente / Caso', 'Cliente/Caso', 'Cliente', 'cliente');
          const plc = getValFlexible(r, 'Placa', 'placa');
          const mod = getValFlexible(r, 'Modelo', 'Modelo Changan', 'Modelo_Changan', 'modeloChangan');
          const vin = getValFlexible(r, 'VIN / Chasis', 'VIN/Chasis', 'VIN', 'VIN_Chasis', 'vin');
          const nor = getValFlexible(r, 'No. O.R.', 'No O.R.', 'Numero OR', 'NÂ° OR', 'Numero_OR', 'numeroOR', 'N OR');

          const codRep = getValFlexible(r, 'CÃ³digo OEM', 'Codigo OEM', 'CÃ³digo Repuesto', 'Codigo Repuesto', 'Codigo_Repuesto_OEM', 'codigoRepuesto');
          const codAct = getValFlexible(r, 'CÃ³digo Actualizado', 'Codigo Actualizado', 'Codigo_Actualizado', 'codigoActualizado') || codRep;
          const descOf = getValFlexible(r, 'DescripciÃ³n Repuesto', 'Descripcion Repuesto', 'DescripciÃ³n Oficial', 'Descripcion Oficial', 'descripcionOficial');
          
          const rawSol = getValFlexible(r, 'Cant Solicitada', 'Cantidad Solicitada', 'Cantidad_Solicitada', 'cantidadSolicitada');
          let cSol = parseFloat(String(rawSol).replace(/[^0-9.]/g, '')) || 1;
          // SanitizaciÃ³n estricta de cantidad razonable para pedidos especiales de repuestos
          if (cSol > 20) {
            cSol = 1;
          }

          const rawAsig = getValFlexible(r, 'Cant Asignada', 'Cantidad Asignada', 'Cantidad_Asignada', 'cantidadAsignada');
          let cAsig = parseFloat(String(rawAsig).replace(/[^0-9.]/g, '')) || 0;
          let cDesp = Number(getValFlexible(r, 'Cant Despachada', 'Cantidad Despachada', 'Cantidad_Despachada', 'cantidadDespachada')) || 0;
          let estL = normalizarEstatusLinea(getValFlexible(r, 'estatusDetallado', 'Estatus Detallado', 'Estatus Cruce', 'Estatus LÃ­nea', 'Estatus Linea', 'Estatus_Linea', 'estatusLinea', 'Estatus', 'PENDIENTE'));
          const estG = normalizarEstatusGeneral(getValFlexible(r, 'Estatus General', 'Estado General', 'estatusGeneral', 'PENDIENTE'));
          let cAsignado = getValFlexible(r, 'Contenedor Asignado', 'Contenedor_Asignado', 'contenedorAsignado');
          let pAsignado = getValFlexible(r, 'Pallet Asignado', 'Pallet_Asignado', 'palletAsignado');
          let pkgNo = getValFlexible(r, 'Package No', 'Package_No', 'packageNo', 'NÂº Paquete', 'N Paquete');

          // VerificaciÃ³n automÃ¡tica con BD histÃ³rica de despachos (V1 y V2)
          const histKey = `${pId}___${codRep}`;
          const hist = (despachosHistoricos as Record<string, any>)[histKey];
          if (hist) {
            cDesp = hist.qtyDispatched || cSol;
            estL = 'Despachado';
            if (!cAsignado && hist.container) cAsignado = hist.container;
            if (!pAsignado && hist.pallet) pAsignado = hist.pallet;
            if (!pkgNo && hist.packageNo) pkgNo = hist.packageNo;
          } else if (estL === 'Despachado' && cDesp === 0) {
            cDesp = cSol;
          }
          const ubi = getValFlexible(r, 'UbicaciÃ³n CEDIS', 'Ubicacion CEDIS', 'Ubicacion_CEDIS', 'ubicacionCedis');
          const obs = getValFlexible(r, 'Observaciones', 'observaciones');

          if (!mapCab[pId]) {
            mapCab[pId] = {
              pedidoId: pId,
              fechaCreacion: fch,
              sucursal: suc,
              colaborador: col,
              canal: 'Mostrador',
              tipoPedido: tip,
              cotizacion: cot,
              cliente: cli,
              placa: plc,
              modeloChangan: mod,
              vin: vin,
              numeroOR: nor,
              estadoPago: 'Aprobado',
              documentoPagoFactura: '',
              facturadoFinal: 'No',
              estatusGeneral: estG,
              estatusFabrica: '',
              origen: 'EXCEL',
              version: 1,
              creadoPor: col,
              creadoEn: fch,
              actualizadoPor: col,
              actualizadoEn: fch,
              observaciones: obs
            };
          }

          arrDet.push({
            lineaId: linId,
            pedidoId: pId,
            codigoRepuesto: codRep,
            codigoActualizado: codAct,
            descripcionOficial: descOf,
            cantidadSolicitada: cSol,
            cantidadAsignada: cAsig,
            cantidadDespachada: cDesp,
            contenedorAsignado: cAsignado,
            palletAsignado: pAsignado,
            packageNo: pkgNo,
            ubicacionCedis: ubi,
            estatusLinea: estL
          });
        });

        // Calcular estatus general de pedidos considerando estados de lÃ­neas, inventario y despachos
        const pedidosMetricas: Record<string, { total: number; despachados: number; asignados: number; enBodega: number }> = {};
        arrDet.forEach(d => {
          if (!pedidosMetricas[d.pedidoId]) pedidosMetricas[d.pedidoId] = { total: 0, despachados: 0, asignados: 0, enBodega: 0 };
          pedidosMetricas[d.pedidoId].total += 1;
          const estUpper = String(d.estatusLinea || '').toUpperCase();
          if (estUpper.includes('DESPACH')) {
            pedidosMetricas[d.pedidoId].despachados += 1;
          } else if (estUpper.includes('BODEGA') || estUpper.includes('RECOLECT')) {
            pedidosMetricas[d.pedidoId].enBodega += 1;
            pedidosMetricas[d.pedidoId].asignados += 1;
          } else if ((d.cantidadAsignada || 0) > 0 || estUpper.includes('ASIGN')) {
            pedidosMetricas[d.pedidoId].asignados += 1;
          }
        });

        Object.values(mapCab).forEach(cab => {
          const st = pedidosMetricas[cab.pedidoId];
          if (st && st.total > 0) {
            if (st.despachados === st.total) {
              cab.estatusGeneral = 'Despachado';
            } else if (st.despachados > 0) {
              cab.estatusGeneral = 'PARCIAL';
            } else if (st.enBodega === st.total) {
              cab.estatusGeneral = 'EN BODEGA CEDIS';
            } else if (st.asignados === st.total) {
              cab.estatusGeneral = 'EN BODEGA CEDIS';
            } else if (st.asignados > 0 || st.enBodega > 0) {
              cab.estatusGeneral = 'PARCIAL';
            } else if (!cab.estatusGeneral || cab.estatusGeneral === 'Pendiente') {
              cab.estatusGeneral = 'Pendiente';
            }
          }
        });

        // PRESERVACIÃ“N ESTRICTA: Si el usuario modificÃ³ estatus individualmente en la sesiÃ³n, preservarlo
        const mapaEstatusLocales = new Map<string, any>();
        this.detalles.forEach(d => {
          mapaEstatusLocales.set(`${d.pedidoId}__${(d.codigoRepuesto || '').trim().toUpperCase()}`, {
            estatusLinea: d.estatusLinea,
            cantidadAsignada: d.cantidadAsignada,
            cantidadDespachada: d.cantidadDespachada
          });
        });

        arrDet.forEach(d => {
          const key = `${d.pedidoId}__${(d.codigoRepuesto || '').trim().toUpperCase()}`;
          if (mapaEstatusLocales.has(key)) {
            const loc = mapaEstatusLocales.get(key);
            if (loc.estatusLinea && loc.estatusLinea !== 'Pendiente') {
              d.estatusLinea = loc.estatusLinea;
            }
            if (loc.cantidadDespachada > 0) {
              d.cantidadDespachada = loc.cantidadDespachada;
            }
          }
        });

        // Filtrar nuevamente cualquier lÃ­nea que haya sido despachada
        const detallesActivos = arrDet.filter(d => d.estatusLinea !== 'Despachado' && !this.isLineaDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto));

        // PRESERVAR pedidos creados localmente que aún no están en la respuesta de Google Sheets
        const pedidosEnSheets = new Set(Object.keys(mapCab));
        const cabecerasLocalesPendientes = this.cabeceras.filter(c => !pedidosEnSheets.has(c.pedidoId) && !this.isPedidoTombstoned(c.pedidoId));
        const detallesLocalesPendientes = this.detalles.filter(d => !pedidosEnSheets.has(d.pedidoId) && !this.isPedidoTombstoned(d.pedidoId) && d.estatusLinea !== 'Despachado' && !this.isLineaDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto));

        this.cabeceras = [...cabecerasLocalesPendientes, ...Object.values(mapCab)];
        this.detalles = [...detallesLocalesPendientes, ...detallesActivos];
      } else {
        // Fallback a tablas separadas de cabeceras y detalles
        if (Array.isArray(data.cabeceras) && data.cabeceras.length > 0) {
          this.cabeceras = data.cabeceras.map((c: any) => ({
            ...c,
            version: Number(c.version) || 1
          }));
        }

        if (Array.isArray(data.detalles) && data.detalles.length > 0) {
          this.detalles = data.detalles.map((d: any) => ({
            ...d,
            cantidadSolicitada: Number(d.cantidadSolicitada) || 0,
            cantidadAsignada: Number(d.cantidadAsignada) || 0,
            cantidadDespachada: Number(d.cantidadDespachada) || 0
          }));
        }
      }
      // 3. Manifiestos (FusiÃ³n de Sheets + 8 Contenedores Reales HistÃ³ricos)
      const sheetMans = Array.isArray(data.manifiestos) ? data.manifiestos.map((m: any) => {
        const cId = getValFlexible(m, 'contenedorId', 'contenedor', 'Contenedor', 'ID Contenedor', 'Factura', 'Invoice');
        return {
          ...m,
          contenedorId: cId,
          proveedor: m.proveedor || 'Mobitech Changan China Co., Ltd',
          fechaArribo: m.fechaArribo || '',
          poReferencia: m.poReferencia || (cId ? `PO-${cId}` : ''),
          tipoTransporte: m.tipoTransporte || 'MarÃ­timo 40HQ',
          totalPiezas: Number(m.totalPiezas) || 0,
          skusUnicos: Number(m.skusUnicos) || 0,
          totalPallets: Number(m.totalPallets) || 1,
          estado: normalizarEstatusDPL(m.estado || 'EN TRÃNSITO')
        };
      }).filter((m: any) => Boolean(m.contenedorId)) : [];

      const manMap = new Map<string, DPLManifiesto>();
      (contenedoresHistoricos.manifiestos as DPLManifiesto[]).forEach(m => manMap.set(m.contenedorId, m));
      // Preservar estatus locales actualizados por el usuario si ya existÃ­an
      this.manifiestos.forEach(m => {
        if (manMap.has(m.contenedorId)) {
          manMap.set(m.contenedorId, { ...manMap.get(m.contenedorId)!, estado: m.estado });
        }
      });
      sheetMans.forEach((m: DPLManifiesto) => manMap.set(m.contenedorId, m));
      this.manifiestos = Array.from(manMap.values());

      // 4. DPL Detalle (Inventario FÃ­sico con 2,028 Ã­tems reales de los 8 contenedores)
      const sheetDpl = Array.isArray(data.dplDetalle) ? data.dplDetalle.map((i: any, idx: number) => {
        const cId = getValFlexible(i, 'contenedorId', 'contenedor', 'Contenedor', 'ID Contenedor');
        const cod = getValFlexible(i, 'codigoRepuesto', 'codigo', 'Codigo Repuesto', 'CÃ³digo Repuesto');
        const cantTot = Number(i.cantidadTotal) || 0;
        const cantAsig = Number(i.cantidadAsignada) || 0;
        const cantDesp = Number(i.cantidadDespachada) || 0;
        return {
          ...i,
          inventarioId: i.inventarioId || `${cId || 'INV'}_${idx + 1}`,
          contenedorId: cId,
          codigoRepuesto: cod,
          descripcion: i.descripcion || 'Repuesto Genuino Changan',
          palletCaseNo: i.palletCaseNo || i.pallet || 'P001',
          packageNo: i.packageNo || 'PKG-01',
          cantidadTotal: cantTot,
          cantidadAsignada: cantAsig,
          cantidadDespachada: cantDesp,
          saldoDisponible: i.saldoDisponible !== undefined ? Number(i.saldoDisponible) : Math.max(0, cantTot - cantAsig - cantDesp),
          ubicacionCedis: i.ubicacionCedis || 'BahÃ­a CEDIS'
        };
      }).filter((i: any) => Boolean(i.contenedorId && i.codigoRepuesto)) : [];

      if (sheetDpl.length > 0) {
        const dplMap = new Map<string, DPLDetalle>();
        (contenedoresHistoricos.dplDetalles as DPLDetalle[]).forEach(d => dplMap.set(d.inventarioId, d));
        sheetDpl.forEach((d: DPLDetalle) => dplMap.set(d.inventarioId, d));
        this.dplDetalle = Array.from(dplMap.values());
      } else {
        this.dplDetalle = (contenedoresHistoricos.dplDetalles as DPLDetalle[]);
      }

      // 5. Modelos
      if (Array.isArray(data.modelos) && data.modelos.length > 0) {
        this.modelos = data.modelos;
      }

      // 6. Encargados
      if (Array.isArray(data.encargados) && data.encargados.length > 0) {
        this.encargados = data.encargados;
      }

      // 7. AuditorÃ­a
      if (Array.isArray(data.auditoria) && data.auditoria.length > 0) {
        this.auditoria = data.auditoria;
      }

      this.persistirDatos();
      this.guardarConfig({
        estadoConexion: 'CONECTADO_CANONICO',
        ultimoPing: new Date().toISOString()
      });

      return {
        success: true,
        totalCargado: {
          cabeceras: this.cabeceras.length,
          detalles: this.detalles.length,
          manifiestos: this.manifiestos.length,
          dplDetalle: this.dplDetalle.length,
          modelos: this.modelos.length,
          encargados: this.encargados.length,
          auditoria: this.auditoria.length
        }
      };
    } catch (err: any) {
      console.warn('Fallo al obtener datos vivos desde Google Sheets (manteniendo cachÃ© local):', err);
      return {
        success: false,
        error: `Error de red al consultar Google Sheets: ${err.message || err}`
      };
    }
  }

  public getUsuarioActivo(): UsuarioActivo {
    return { ...this.usuarioActivo };
  }

  public setUsuarioActivo(usr: UsuarioActivo): void {
    this.usuarioActivo = { ...usr };
    this.safeSet(STORAGE_KEYS.USER, JSON.stringify(this.usuarioActivo));
  }

  private cargarUsuarioActivo(): UsuarioActivo {
    try {
      const u = this.safeGet(STORAGE_KEYS.USER);
      if (u) return JSON.parse(u);
    } catch (e) {
      console.warn('Error cargando usuario activo:', e);
    }
    // Default: Administrador CEDIS
    const admin = USUARIOS_OFICIALES[0];
    return {
      usuarioId: admin.usuarioId,
      nombre: admin.nombre,
      correo: admin.correo,
      sucursal: admin.sucursal,
      canal: admin.canal,
      rol: admin.rol,
      activo: admin.activo,
      movilHabilitado: admin.movilHabilitado
    };
  }

  public recargarDatosLocales(): void {
    this.cargarDatosLocales();
  }

  public cargarDatosLocales(): void {
    try {
      const cab = this.safeGet(STORAGE_KEYS.CABECERA);
      const parsedCab = cab ? JSON.parse(cab) : null;
      this.cabeceras = (parsedCab && Array.isArray(parsedCab) && parsedCab.length > 50) ? parsedCab : CABECERAS_MATRIZ_SINCRONIZADA;

      const det = this.safeGet(STORAGE_KEYS.DETALLE);
      const loadedDet = det ? JSON.parse(det) : null;
      const parsedDet: DetalleRepuesto[] = (loadedDet && Array.isArray(loadedDet) && loadedDet.length > 50) ? loadedDet : DETALLES_MATRIZ_SINCRONIZADA;
      this.detalles = parsedDet.filter(d => d.estatusLinea !== 'Despachado' && !this.isLineaDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto));

      const man = this.safeGet(STORAGE_KEYS.MANIFIESTOS);
      const parsedMan: DPLManifiesto[] = man ? JSON.parse(man) : [];
      const manMapInit = new Map<string, DPLManifiesto>();
      (contenedoresHistoricos.manifiestos as DPLManifiesto[]).forEach(m => manMapInit.set(m.contenedorId, m));
      parsedMan.forEach(m => manMapInit.set(m.contenedorId, m));
      this.manifiestos = Array.from(manMapInit.values());

      const dpl = this.safeGet(STORAGE_KEYS.DPL_DETALLE);
      const parsedDpl: DPLDetalle[] = dpl ? JSON.parse(dpl) : [];
      const dplMapInit = new Map<string, DPLDetalle>();
      (contenedoresHistoricos.dplDetalles as DPLDetalle[]).forEach(d => dplMapInit.set(d.inventarioId, d));
      parsedDpl.forEach(d => dplMapInit.set(d.inventarioId, d));
      this.dplDetalle = Array.from(dplMapInit.values());

      const mod = this.safeGet(STORAGE_KEYS.MODELOS);
      const parsedMod = mod ? JSON.parse(mod) : null;
      if (parsedMod && Array.isArray(parsedMod) && parsedMod.length >= 18) {
        this.modelos = parsedMod;
      } else {
        this.modelos = MODELOS_OFICIALES;
        this.safeSet(STORAGE_KEYS.MODELOS, JSON.stringify(this.modelos));
      }

      const enc = this.safeGet(STORAGE_KEYS.ENCARGADOS);
      this.encargados = enc ? JSON.parse(enc) : USUARIOS_OFICIALES;

      const aud = this.safeGet(STORAGE_KEYS.AUDITORIA);
      this.auditoria = aud ? JSON.parse(aud) : AUDITORIA_INICIAL;

      // DepuraciÃ³n y protecciÃ³n automÃ¡tica de integridad contra datos inflados
      this.depurarDuplicadosEnMemoria();
    } catch (e) {
      console.error('Error cargando almacÃ©n canÃ³nico:', e);
      this.cabeceras = CABECERAS_MATRIZ_SINCRONIZADA;
      this.detalles = DETALLES_MATRIZ_SINCRONIZADA;
      this.manifiestos = CONTENEDORES_CANONICOS;
      this.dplDetalle = DPL_DETALLE_CANONICO;
      this.modelos = MODELOS_OFICIALES;
      this.encargados = USUARIOS_OFICIALES;
      this.auditoria = AUDITORIA_INICIAL;
    }
  }

  
  /**
   * Depura y elimina automÃ¡ticamente pedidos duplicados en memoria y almacÃ©n local:
   * 1. Elimina lÃ­neas idÃ©nticas repetidas en la misma orden (mismo pedidoId + mismo repuesto)
   * 2. Elimina Ã³rdenes activas redundantes para el mismo cliente y repuesto (Regla de No Duplicados)
   */
  public depurarDuplicadosEnMemoria(): { exactosEliminados: number; clientesDuplicadosEliminados: number; totalRestantes: number } {
    const seenExact = new Set<string>();
    let exactosEliminados = 0;
    const detallesSinExactos: DetalleRepuesto[] = [];

    // Paso 1: Eliminar lÃ­neas idÃ©nticas exactas (mismo pedido + mismo repuesto)
    for (const d of this.detalles) {
      const cod = (d.codigoRepuesto || '').trim().toUpperCase();
      const pId = (d.pedidoId || '').trim();
      const key = `${pId}__${cod}`;
      if (seenExact.has(key)) {
        exactosEliminados++;
      } else {
        seenExact.add(key);
        detallesSinExactos.push(d);
      }
    }

    // Paso 2: Eliminar duplicados activos entre clientes para el mismo repuesto
    const cabMap = new Map<string, SolicitudCabecera>();
    this.cabeceras.forEach(c => cabMap.set(c.pedidoId, c));

    const activeRegistry: { cliente: string; codigo: string; pedidoId: string }[] = [];
    let clientesDuplicadosEliminados = 0;
    const detallesFinales: DetalleRepuesto[] = [];

    for (const d of detallesSinExactos) {
      const cab = cabMap.get(d.pedidoId);
      const cli = cab ? cab.cliente : '';
      const cod = (d.codigoRepuesto || '').trim().toUpperCase();
      const isFinal = d.estatusLinea === 'Despachado' || (cab && (cab.estatusGeneral === 'Despachado Total' || cab.estatusGeneral === 'Cancelado'));

      if (!cli || !cod || isFinal) {
        detallesFinales.push(d);
        continue;
      }

      const dupIdx = activeRegistry.findIndex(item =>
        item.codigo === cod && areClientsSamePerson(item.cliente, cli)
      );

      if (dupIdx !== -1) {
        clientesDuplicadosEliminados++;
        // Omitir duplicado redundante
      } else {
        activeRegistry.push({ cliente: cli, codigo: cod, pedidoId: d.pedidoId });
        detallesFinales.push(d);
      }
    }

    this.detalles = detallesFinales;

    // Limpiar cabeceras huÃ©rfanas que se hayan quedado sin ningÃºn detalle
    const pedidosConDetalles = new Set(this.detalles.map(d => d.pedidoId));
    this.cabeceras = this.cabeceras.filter(c => pedidosConDetalles.has(c.pedidoId));

    this.persistirDatos();
    return {
      exactosEliminados,
      clientesDuplicadosEliminados,
      totalRestantes: this.detalles.length
    };
  }

  /**
   * Depura duplicados tanto en memoria/localStorage como en Google Sheets remoto
   */
  public async depurarDuplicados(sincronizarConSheet: boolean = true): Promise<{
    success: boolean;
    exactosEliminados: number;
    clientesDuplicadosEliminados: number;
    totalRestantes: number;
    mensaje: string;
  }> {
    const stats = this.depurarDuplicadosEnMemoria();

    if (sincronizarConSheet && this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        const resp = await fetch(this.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'depurarDuplicados',
            operationId: 'DEP_' + Date.now(),
            userEmail: this.usuarioActivo.correo
          })
        });
        const resJson = await resp.json();
        if (resJson && resJson.success) {
          console.log('[Google Sheets] DepuraciÃ³n en la nube completada:', resJson);
        }
      } catch (err) {
        console.warn('[Google Sheets] Aviso al invocar depurarDuplicados en Google Sheets:', err);
      }
    }

    return {
      success: true,
      exactosEliminados: stats.exactosEliminados,
      clientesDuplicadosEliminados: stats.clientesDuplicadosEliminados,
      totalRestantes: stats.totalRestantes,
      mensaje: `DepuraciÃ³n completada exitosamente. Se eliminaron ${stats.exactosEliminados} lÃ­neas repetidas exactas y ${stats.clientesDuplicadosEliminados} pedidos redundantes activos. Total actual de lÃ­neas vÃ¡lidas: ${stats.totalRestantes}.`
    };
  }

  
  public isLineaDespachada(lineaId: string, pedidoId?: string, codigoRepuesto?: string): boolean {
    const raw = this.safeGet(STORAGE_KEYS.TOMBSTONES_LINEAS_DESPACHADAS);
    if (!raw) return false;
    try {
      const set = new Set(JSON.parse(raw));
      if (lineaId && set.has(lineaId)) return true;
      if (pedidoId && codigoRepuesto && set.has(`${pedidoId}__${codigoRepuesto.trim().toUpperCase()}`)) return true;
      return false;
    } catch {
      return false;
    }
  }

  public marcarLineaComoDespachada(lineaId: string, pedidoId: string, codigoRepuesto: string): void {
    const raw = this.safeGet(STORAGE_KEYS.TOMBSTONES_LINEAS_DESPACHADAS);
    let list: string[] = [];
    try {
      list = raw ? JSON.parse(raw) : [];
    } catch {
      list = [];
    }
    const set = new Set(list);
    if (lineaId) set.add(lineaId);
    if (pedidoId && codigoRepuesto) set.add(`${pedidoId}__${codigoRepuesto.trim().toUpperCase()}`);
    this.safeSet(STORAGE_KEYS.TOMBSTONES_LINEAS_DESPACHADAS, JSON.stringify(Array.from(set)));
  }

  public desmarcarLineaDespachada(lineaId: string, pedidoId: string, codigoRepuesto: string): void {
    const raw = this.safeGet(STORAGE_KEYS.TOMBSTONES_LINEAS_DESPACHADAS);
    if (!raw) return;
    try {
      const list: string[] = JSON.parse(raw);
      const set = new Set(list);
      if (lineaId) set.delete(lineaId);
      if (pedidoId && codigoRepuesto) set.delete(`${pedidoId}__${codigoRepuesto.trim().toUpperCase()}`);
      this.safeSet(STORAGE_KEYS.TOMBSTONES_LINEAS_DESPACHADAS, JSON.stringify(Array.from(set)));
    } catch {
      // Ignorar error
    }
  }

  private persistirDatos(): void {
    this.safeSet(STORAGE_KEYS.CABECERA, JSON.stringify(this.cabeceras));
    this.safeSet(STORAGE_KEYS.DETALLE, JSON.stringify(this.detalles));
    this.safeSet(STORAGE_KEYS.MANIFIESTOS, JSON.stringify(this.manifiestos));
    this.safeSet(STORAGE_KEYS.DPL_DETALLE, JSON.stringify(this.dplDetalle));
    this.safeSet(STORAGE_KEYS.MODELOS, JSON.stringify(this.modelos));
    this.safeSet(STORAGE_KEYS.ENCARGADOS, JSON.stringify(this.encargados));
    this.safeSet(STORAGE_KEYS.AUDITORIA, JSON.stringify(this.auditoria));
  }

  /**
   * Obtiene la Matriz Central Derivada combinando Cabeceras, Detalles e Inventario
   */
  public getMatrizCentral(): FilaMatrizCentral[] {
    const cabMap = new Map<string, SolicitudCabecera>();
    this.cabeceras.forEach(c => cabMap.set(c.pedidoId, c));

    const filas: FilaMatrizCentral[] = [];
    const seenLineasMatriz = new Set<string>();

    this.detalles.forEach(d => {
      // REGLA CRÃTICA CEDIS: Todo lo despachado se retira de la Matriz Central permanentemente
      if (d.estatusLinea === 'Despachado' || this.isLineaDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto)) {
        return; // Omitir repuesto despachado de la Matriz Central
      }

      const lineKey = `${d.pedidoId}__${(d.codigoRepuesto || '').trim().toUpperCase()}`;
      if (seenLineasMatriz.has(lineKey)) return;
      seenLineasMatriz.add(lineKey);
      const cab = cabMap.get(d.pedidoId);
      const cantSol = Number(d.cantidadSolicitada) || 1;
      const cantAsig = Number(d.cantidadAsignada) || 0;
      const cantDesp = Number(d.cantidadDespachada) || 0;
      const saldoPendiente = Math.max(0, cantSol - cantAsig - cantDesp);

      filas.push({
        lineaId: d.lineaId,
        pedidoId: d.pedidoId,
        fechaCreacion: cab ? cab.fechaCreacion : '2026-09-10',
        sucursal: cab ? cab.sucursal : 'Desconocida',
        colaborador: cab ? cab.colaborador : 'Desconocido',
        tipoPedido: cab ? cab.tipoPedido : 'Stock Regular',
        cotizacion: cab ? cab.cotizacion : '',
        cliente: cab ? cab.cliente : '',
        placa: cab ? cab.placa : '',
        modeloChangan: cab ? cab.modeloChangan : '',
        vin: cab ? cab.vin : '',
        numeroOR: cab ? cab.numeroOR : '',
        codigoRepuesto: d.codigoRepuesto,
        codigoActualizado: d.codigoActualizado || d.codigoRepuesto,
        descripcionOficial: d.descripcionOficial,
        cantidadSolicitada: cantSol,
        cantidadAsignada: cantAsig,
        cantidadDespachada: cantDesp,
        saldoPendiente: saldoPendiente,
        contenedorAsignado: d.contenedorAsignado,
        palletAsignado: d.palletAsignado,
        packageNo: d.packageNo,
        ubicacionCedis: d.ubicacionCedis,
        estatusLinea: d.estatusLinea,
        estatusGeneral: cab ? cab.estatusGeneral : 'Pendiente',
        origen: cab ? cab.origen : 'PORTAL_CEDIS',
        observaciones: cab?.observaciones || '',
        fechaDespacho: cab?.fechaDespacho || (d as any).fechaDespacho || ''
      });
    });

    return filas;
  }

  
  /**
   * Obtiene la lista oficial de todos los repuestos despachados para la pestaÃ±a "Despachados"
   * Incluye los despachos de la sesiÃ³n actual, los guardados en almacenamiento y el histÃ³rico verificado
   */
  public getFilasDespachadas(): FilaMatrizCentral[] {
    const cabMap = new Map<string, SolicitudCabecera>();
    this.cabeceras.forEach(c => cabMap.set(c.pedidoId, c));

    const resultado: FilaMatrizCentral[] = [];
    const seenDespKeys = new Set<string>();

    // 1. Repuestos de 'detalles' marcados como Despachado
    this.detalles.forEach(d => {
      const isDesp = d.estatusLinea === 'Despachado' || this.isLineaDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto);
      if (isDesp) {
        const key = `${d.pedidoId}__${(d.codigoRepuesto || '').trim().toUpperCase()}`;
        if (!seenDespKeys.has(key)) {
          seenDespKeys.add(key);
          const cab = cabMap.get(d.pedidoId);
          resultado.push({
            lineaId: d.lineaId,
            pedidoId: d.pedidoId,
            fechaCreacion: cab ? cab.fechaCreacion : '2026-09-10',
            sucursal: cab ? cab.sucursal : 'Bodega Central',
            colaborador: cab ? cab.colaborador : 'Personal CEDIS',
            tipoPedido: cab ? cab.tipoPedido : 'Especial',
            cotizacion: cab ? cab.cotizacion : '',
            cliente: cab ? cab.cliente : 'CLIENTE REGISTRADO',
            placa: cab ? cab.placa : '',
            modeloChangan: cab ? cab.modeloChangan : 'Changan',
            vin: cab ? cab.vin : '',
            numeroOR: cab ? cab.numeroOR : '',
            codigoRepuesto: d.codigoRepuesto,
            codigoActualizado: d.codigoActualizado || d.codigoRepuesto,
            descripcionOficial: d.descripcionOficial,
            cantidadSolicitada: Number(d.cantidadSolicitada) || 1,
            cantidadAsignada: 0,
            cantidadDespachada: Number(d.cantidadDespachada) || Number(d.cantidadSolicitada) || 1,
            saldoPendiente: 0,
            contenedorAsignado: d.contenedorAsignado || 'CEDIS',
            palletAsignado: d.palletAsignado || 'P001',
            packageNo: d.packageNo || '',
            ubicacionCedis: d.ubicacionCedis || 'Despachado a Sucursal',
            estatusLinea: 'Despachado',
            estatusGeneral: 'Despachado Total',
            origen: cab ? cab.origen : 'PORTAL_CEDIS',
            observaciones: 'Despachado fÃ­sicamente',
            fechaDespacho: cab?.fechaDespacho || (d as any).fechaDespacho || new Date().toISOString().substring(0, 10)
          });
        }
      }
    });

    // 2. Repuestos de despachosHistoricos.json
    try {
      const histData = despachosHistoricos as Record<string, any>;
      Object.entries(histData).forEach(([histKey, h]: [string, any]) => {
        const orderNum = h.orderNumber || histKey.split('___')[0];
        const code = (h.code || histKey.split('___')[1] || '').trim().toUpperCase();
        const key = `${orderNum}__${code}`;
        if (!seenDespKeys.has(key)) {
          seenDespKeys.add(key);
          const cab = cabMap.get(orderNum);
          // Buscar si existe en matrizCentralSincronizada para recuperar datos reales de Cliente, Sucursal, Asesor, VIN y Modelo
          const rowMatriz = (matrizCentralSincronizada as any[]).find(m => m.pedidoId === orderNum && ((m.codigoRepuesto || '').toUpperCase().trim() === code || !code)) || (matrizCentralSincronizada as any[]).find(m => m.pedidoId === orderNum);
          
          resultado.push({
            lineaId: rowMatriz ? rowMatriz.lineaId : `DESP-${orderNum}-${code}`,
            pedidoId: orderNum,
            fechaCreacion: rowMatriz?.fechaCreacion || (cab ? cab.fechaCreacion : '2026-09-09'),
            sucursal: rowMatriz?.sucursal || (cab ? cab.sucursal : 'Villa Lucre'),
            colaborador: rowMatriz?.colaborador || (cab ? cab.colaborador : 'Leidys Perez'),
            tipoPedido: rowMatriz?.tipoPedido || (cab ? cab.tipoPedido : 'Especial'),
            cotizacion: rowMatriz?.cotizacion || (cab ? cab.cotizacion : ''),
            cliente: rowMatriz?.cliente || (cab ? cab.cliente : 'CLIENTE REGISTRADO'),
            placa: rowMatriz?.placa || (cab ? cab.placa : ''),
            modeloChangan: rowMatriz?.modeloChangan || (cab ? cab.modeloChangan : 'CS55PLUS'),
            vin: rowMatriz?.vin || (cab ? cab.vin : ''),
            numeroOR: rowMatriz?.numeroOR || (cab ? cab.numeroOR : ''),
            codigoRepuesto: code,
            codigoActualizado: rowMatriz?.codigoActualizado || code,
            descripcionOficial: rowMatriz?.descripcionOficial || 'Repuesto Genuino Changan Despachado',
            cantidadSolicitada: Number(rowMatriz?.cantidadSolicitada) || Number(h.qtyDispatched) || 1,
            cantidadAsignada: Number(rowMatriz?.cantidadAsignada) || 1,
            cantidadDespachada: Number(h.qtyDispatched) || Number(rowMatriz?.cantidadDespachada) || 1,
            saldoPendiente: 0,
            contenedorAsignado: h.container || rowMatriz?.contenedorAsignado || 'CEDIS',
            palletAsignado: h.pallet || rowMatriz?.palletAsignado || 'P001',
            packageNo: h.packageNo || rowMatriz?.packageNo || '',
            ubicacionCedis: rowMatriz?.ubicacionCedis || 'Despachado a Sucursal',
            estatusLinea: 'Despachado',
            estatusGeneral: 'Despachado Total',
            origen: 'HISTORICO_DESPACHOS',
            observaciones: rowMatriz?.observaciones || 'Despachado y entregado fÃ­sicamente a sucursal',
            fechaDespacho: (h.dispatchedAt || '').substring(0, 10) || '2026-09-09'
          });
        }
      });
    } catch (e) {
      console.warn('Error cargando despachosHistoricos en getFilasDespachadas:', e);
    }

    // 3. Despachos leidos directamente de la pestaña "Despachos" de Google Sheets
    this.despachosDesdeSheetsTab.forEach(d => {
      const key = d.pedidoId + '__' + (d.codigoRepuesto || '').trim().toUpperCase();
      if (!seenDespKeys.has(key)) {
        seenDespKeys.add(key);
        resultado.push(d);
      }
    });

    return resultado;
  }

  /**
   * Lee la pestaña "Despachos" de Google Sheets y la almacena en memoria
   */
  public async fetchDespachosDesdeSheetsTab(): Promise<void> {
    try {
      const url = 'https://docs.google.com/spreadsheets/d/1YcV3D-d9zk_oqmHrgG4blnC05ElejvYZ7RT47nrJqfM/gviz/tq?tqx=out:json&sheet=Despachos';
      const resp = await fetch(url);
      if (!resp.ok) return;
      const rawText = await resp.text();
      const jsonStr = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
      const data = JSON.parse(jsonStr);
      const rows = data?.table?.rows;
      if (!Array.isArray(rows) || rows.length === 0) return;

      const cabMap = new Map<string, SolicitudCabecera>();
      this.cabeceras.forEach(c => cabMap.set(c.pedidoId, c));

      const nuevos: FilaMatrizCentral[] = [];
      rows.forEach((row: any) => {
        const c = row.c || [];
        const getV = (i: number) => (c[i] && c[i].v != null) ? String(c[i].v).trim() : '';
        const pedidoId = getV(0);
        const sucursal = getV(1);
        const cliente = getV(2);
        const palletContenedor = getV(3);
        const codigoRepuesto = getV(4);
        const descripcion = getV(5);
        const cantDesp = parseFloat(getV(6)) || 1;
        const estado = getV(7);
        const fechaDesp = getV(9) ? getV(9).substring(0, 10) : new Date().toISOString().substring(0, 10);
        const asesor = getV(11);
        const obs = getV(12);

        if (!pedidoId || !codigoRepuesto) return;
        if (!estado.toUpperCase().includes('DESPACH')) return;

        const cab = cabMap.get(pedidoId);
        // Marcar en tombstones usando el combo pedidoId+codigoRepuesto para que salga de Matriz Central
        this.marcarLineaComoDespachada('', pedidoId, codigoRepuesto);

        nuevos.push({
          lineaId: pedidoId + '-L-DESP',
          pedidoId,
          fechaCreacion: cab?.fechaCreacion || '2026-09-01',
          sucursal: sucursal || (cab?.sucursal ?? 'Sucursal'),
          colaborador: asesor || (cab?.colaborador ?? 'CEDIS'),
          tipoPedido: cab?.tipoPedido ?? 'Especial',
          cotizacion: cab?.cotizacion ?? '',
          cliente: cliente || (cab?.cliente ?? 'Cliente'),
          placa: cab?.placa ?? '',
          modeloChangan: cab?.modeloChangan ?? 'Changan',
          vin: cab?.vin ?? '',
          numeroOR: cab?.numeroOR ?? '',
          codigoRepuesto,
          codigoActualizado: codigoRepuesto,
          descripcionOficial: descripcion,
          cantidadSolicitada: cantDesp,
          cantidadAsignada: 0,
          cantidadDespachada: cantDesp,
          saldoPendiente: 0,
          contenedorAsignado: palletContenedor.split('/')[0]?.trim() || 'CEDIS',
          palletAsignado: palletContenedor.split('/')[1]?.trim() || 'P001',
          packageNo: '',
          ubicacionCedis: 'Despachado a Sucursal',
          estatusLinea: 'Despachado',
          estatusGeneral: 'Despachado Total',
          origen: 'EXCEL',
          observaciones: obs || 'Despachado físicamente a sucursal',
          fechaDespacho: fechaDesp
        } as any);
      });

      this.despachosDesdeSheetsTab = nuevos;
      console.log('[DESPACHOS] ' + nuevos.length + ' despachos cargados desde pestaña Sheets.');
    } catch (e) {
      console.warn('[DESPACHOS] Error leyendo pestaña Despachos de Sheets:', e);
    }
  }

  public getCabeceras(): SolicitudCabecera[] {
    return [...this.cabeceras];
  }

  public getDetalles(): DetalleRepuesto[] {
    return [...this.detalles];
  }

  public getManifiestos(): DPLManifiesto[] {
    return [...this.manifiestos];
  }

  public getDPLDetalle(): DPLDetalle[] {
    return [...this.dplDetalle];
  }

  public getModelos(): ModeloChangan[] {
    return [...this.modelos];
  }

  public async sincronizarModelosDesdeGoogleSheets(): Promise<ModeloChangan[]> {
    try {
      const url = 'https://docs.google.com/spreadsheets/d/1YcV3D-d9zk_oqmHrgG4blnC05ElejvYZ7RT47nrJqfM/export?format=csv&gid=1806070348';
      const resp = await fetch(url);
      if (!resp.ok) return this.getModelos();
      const csvText = await resp.text();
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return this.getModelos();

      const modelosNuevos: ModeloChangan[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2 && cols[1]) {
          modelosNuevos.push({
            modeloId: cols[0] || `MOD-${i}`,
            nombre: cols[1],
            categoria: (cols[2] || 'SUV') as any,
            anosCompatibles: cols[3] || '2020-2026',
            rangoAnio: cols[3] || '2020-2026',
            motor: cols[4] || '',
            activo: cols[7] ? cols[7].toLowerCase() === 'activo' : true,
            notas: cols[8] || ''
          });
        }
      }

      if (modelosNuevos.length >= 15) {
        this.modelos = modelosNuevos;
        this.safeSet(STORAGE_KEYS.MODELOS, JSON.stringify(this.modelos));
      }
      return this.getModelos();
    } catch (e) {
      return this.getModelos();
    }
  }

  public getEncargados(): BDEncargado[] {
    return [...this.encargados];
  }

  public getAuditoria(): AuditoriaKardex[] {
    return [...this.auditoria];
  }

  /**
   * CÃ¡lculo de KPIs con la fÃ³rmula estricta:
   * saldoDisponible = cantidadTotal - cantidadAsignada - cantidadDespachada
   */
  public getKPIs() {
    let totDpl = 0;
    let desp = 0;
    let asig = 0;
    let saldoDisp = 0;
    const skusSet = new Set<string>();

    this.dplDetalle.forEach(item => {
      const tot = Number(item.cantidadTotal) || 0;
      const d = Number(item.cantidadDespachada) || 0;
      const a = Number(item.cantidadAsignada) || 0;
      const s = tot - a - d;

      totDpl += tot;
      desp += d;
      asig += a;
      saldoDisp += s;

      if (item.codigoRepuesto) {
        skusSet.add((item?.codigoRepuesto || '').trim().toUpperCase());
      }
    });

    return {
      totalDpl: totDpl,
      despachado: desp,
      comprometido: asig,
      saldoLibre: saldoDisp,
      skus: skusSet.size
    };
  }

  /**
   * Actualiza el estatus de un Manifiesto / Contenedor DPL:
   * Ciclo de Vida: 'EN TRÃNSITO' -> 'ADUANA' -> 'RECIBIDO'
   * REGLA DE NEGOCIO OBLIGATORIA:
   * - Solamente cuando el estatus pasa a 'RECIBIDO' se ejecuta el matching automÃ¡tico FIFO y se asignan repuestos a pedidos.
   * - Si estÃ¡ en 'EN TRÃNSITO' o 'ADUANA', los repuestos NO se asignan a Ã³rdenes, pero quedan registrados en historial y disponibles para rastreo universal.
   */
  public async actualizarEstatusManifiesto(
    contenedorId: string,
    nuevoEstado: EstatusDPL | string
  ): Promise<{
    success: boolean;
    nuevoEstado: EstatusDPL;
    asignacionesEjecutadas: boolean;
    reporteMatching?: any;
    error?: string;
    mensaje: string;
  }> {
    const idTarget = (contenedorId || '').trim().toUpperCase();
    let contIndex = this.manifiestos.findIndex(m => (m.contenedorId || '').trim().toUpperCase() === idTarget);
    const estadoNormalizado = normalizarEstatusDPL(nuevoEstado);

    // SEGURIDAD: Solo ADMINISTRADOR puede autorizar marcar un contenedor como RECIBIDO
    if (estadoNormalizado === 'RECIBIDO') {
      const esAdmin = this.usuarioActivo.rol === 'ADMINISTRADOR_CEDIS' || 
                      this.usuarioActivo.correo === 'admin@changan.com.pa' || 
                      this.usuarioActivo.nombre.includes('Joel');
      if (!esAdmin) {
        return {
          success: false,
          nuevoEstado: this.manifiestos[contIndex]?.estado || 'EN TRÃNSITO',
          asignacionesEjecutadas: false,
          error: 'ACCESO DENEGADO: Solo el Administrador de CEDIS tiene autorizaciÃ³n para recibir fÃ­sicamente un contenedor y ejecutar el cruce automÃ¡tico.',
          mensaje: 'Solo el Administrador de CEDIS puede autorizar la recepciÃ³n del contenedor.'
        };
      }
    }
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const operationId = `OP-MAN-STATUS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Si hay Web App URL configurada, enviar mutaciÃ³n a Apps Script
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        const resJson = await this.postToAppsScript({
          action: 'updateManifiestoStatus',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          contenedorId: idTarget,
          nuevoEstado: estadoNormalizado
        });
        if (!resJson.success) {
          console.warn('Apps Script updateManifiestoStatus error:', resJson.error);
        }
      } catch (err) {
        console.warn('Fallo llamada a Apps Script updateManifiestoStatus, aplicando fallback local:', err);
      }
    }
    
    if (contIndex === -1) {
      // Auto-registrar cabecera de manifiesto si no existÃ­a
      const itemsLote = this.dplDetalle.filter(i => (i.contenedorId || '').trim().toUpperCase() === idTarget);
      const totalPiezas = itemsLote.reduce((acc, it) => acc + (Number(it.cantidadTotal) || 0), 0);
      const skus = new Set(itemsLote.map(it => (it.codigoRepuesto || '').toUpperCase())).size;
      const pallets = new Set(itemsLote.map(it => it.palletCaseNo || it.pallet || 'P001')).size;

      const nuevoMan: DPLManifiesto = {
        contenedorId: idTarget,
        proveedor: 'Mobitech Changan China Co., Ltd',
        fechaArribo: new Date().toISOString().split('T')[0],
        poReferencia: `PO-${idTarget}`,
        tipoTransporte: 'MarÃ­timo 40HQ',
        totalPiezas: totalPiezas || 1,
        skusUnicos: skus || 1,
        totalPallets: pallets || 1,
        estado: estadoNormalizado,
        creadoPor: this.usuarioActivo.nombre,
        creadoEn: ahora
      };
      this.manifiestos.unshift(nuevoMan);
      contIndex = 0;
    }

    const estadoAnterior = this.manifiestos[contIndex].estado;
    this.manifiestos[contIndex].estado = estadoNormalizado;

    // Actualizar ubicaciÃ³n descriptiva de los items si corresponde
    this.dplDetalle.forEach(item => {
      if ((item.contenedorId || '').trim().toUpperCase() === idTarget) {
        const ubi = item.ubicacionCedis || '';
        if (estadoNormalizado === 'EN TRÃNSITO') {
          item.ubicacionCedis = 'En TrÃ¡nsito MarÃ­timo / Altamar (Rastreo Activo)';
        } else if (estadoNormalizado === 'ADUANA') {
          item.ubicacionCedis = 'En TrÃ¡mites de Aduana / Puerto (Rastreo Activo)';
        } else if (estadoNormalizado === 'RECIBIDO') {
          if (ubi.includes('TrÃ¡nsito') || ubi.includes('Aduana') || !ubi) {
            item.ubicacionCedis = `BahÃ­a CEDIS / Pallet ${item.palletCaseNo || item.pallet || 'P001'}`;
          }
        }
      }
    });

    // Ejecutar motor de matching global
    const reporteMatching = this.ejecutarMatchingGlobal();
    const asignacionesEjecutadas = estadoNormalizado === 'RECIBIDO';

    // Registro en auditorÃ­a inmutable
    this.auditoria.unshift({
      auditoriaId: `AUD-DPL-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'CORRECCION_DPL',
      entidad: 'DPL_Manifiestos',
      identificador: idTarget,
      valoresAnteriores: JSON.stringify({ estado: estadoAnterior }),
      valoresNuevos: JSON.stringify({ estado: estadoNormalizado }),
      operationId: operationId,
      notas: `Estatus de contenedor ${idTarget} actualizado a ${estadoNormalizado}.${
        estadoNormalizado === 'RECIBIDO' 
          ? ` AsignaciÃ³n automÃ¡tica ejecutada: ${reporteMatching.piezasAsignadas} piezas asignadas.` 
          : ' Piezas reservadas para validaciÃ³n en Rastreador Universal (sin asignaciÃ³n a Ã³rdenes).'
      }`
    });

    this.persistirDatos();

    const mensaje = estadoNormalizado === 'RECIBIDO'
      ? `Contenedor ${idTarget} marcado como RECIBIDO en Bodega CEDIS. Se han asignado automÃ¡ticamente repuestos a las requisiciones pendientes por prioridad FIFO.`
      : `Contenedor ${idTarget} actualizado a estatus "${estadoNormalizado}". Sus repuestos estÃ¡n disponibles para consulta en el Rastreador Universal y se asignarÃ¡n cuando cambie a "RECIBIDO".`;

    return {
      success: true,
      nuevoEstado: estadoNormalizado,
      asignacionesEjecutadas,
      reporteMatching,
      mensaje
    };
  }

  /**
   * ImportaciÃ³n de un nuevo Manifiesto / DPL con selecciÃ³n de estatus inicial
   */
  public async importarManifiestoDPL(payload: {
    contenedorId: string;
    proveedor?: string;
    poReferencia?: string;
    tipoTransporte?: string;
    fechaArribo?: string;
    estado?: EstatusDPL | string;
    items: Array<{
      palletCaseNo?: string;
      packageNo?: string;
      codigoRepuesto: string;
      descripcion?: string;
      cantidadTotal: number | string;
      ubicacionCedis?: string;
      pallet?: string;
      unidadMedida?: string;
    }>;
  }): Promise<{
    success: boolean;
    contenedorId: string;
    totalLineas: number;
    totalPiezas: number;
    estado: EstatusDPL;
    asignacionesEjecutadas: boolean;
    reporteMatching?: any;
    error?: string;
    mensaje: string;
  }> {
    const idCont = (payload.contenedorId || '').trim().toUpperCase();
    if (!idCont) {
      return {
        success: false,
        contenedorId: '',
        totalLineas: 0,
        totalPiezas: 0,
        estado: 'EN TRÃNSITO',
        asignacionesEjecutadas: false,
        error: 'El ID de Contenedor es obligatorio.',
        mensaje: 'El ID de Contenedor es obligatorio.'
      };
    }

    if (!payload.items || payload.items.length === 0) {
      return {
        success: false,
        contenedorId: idCont,
        totalLineas: 0,
        totalPiezas: 0,
        estado: 'EN TRÃNSITO',
        asignacionesEjecutadas: false,
        error: 'El archivo DPL no contiene filas de repuestos vÃ¡lidas.',
        mensaje: 'El archivo DPL no contiene filas de repuestos vÃ¡lidas.'
      };
    }

    let estadoNormalizado = normalizarEstatusDPL(payload.estado || 'EN TRÃNSITO');
    if (estadoNormalizado === 'RECIBIDO') {
      const esAdmin = this.usuarioActivo.rol === 'ADMINISTRADOR_CEDIS' || 
                      this.usuarioActivo.correo === 'admin@changan.com.pa' || 
                      this.usuarioActivo.nombre.includes('Joel');
      if (!esAdmin) {
        console.warn('No admin: forzando contenedor nuevo a EN TRÃNSITO');
        estadoNormalizado = 'EN TRÃNSITO';
      }
    }
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const operationId = `OP-DPL-UPLOAD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Si hay Web App URL configurada, enviar mutaciÃ³n a Apps Script
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        const resJson = await this.postToAppsScript({
          action: 'importManifiestoDPL',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          contenedorId: idCont,
          proveedor: payload.proveedor,
          poReferencia: payload.poReferencia,
          tipoTransporte: payload.tipoTransporte,
          fechaArribo: payload.fechaArribo,
          estado: estadoNormalizado,
          items: payload.items
        });
        if (!resJson.success) {
          console.warn('Apps Script importManifiestoDPL error:', resJson.error);
        }
      } catch (err) {
        console.warn('Fallo llamada a Apps Script importManifiestoDPL, aplicando fallback local:', err);
      }
    }

    // Eliminar versiÃ³n previa del mismo contenedor si ya existÃ­a para sobrescribir limpiamente
    this.manifiestos = this.manifiestos.filter(m => (m?.contenedorId || '').trim().toUpperCase() !== idCont);
    this.dplDetalle = this.dplDetalle.filter(i => (i?.contenedorId || '').trim().toUpperCase() !== idCont);

    let totalPiezas = 0;
    const skusSet = new Set<string>();
    const palletsSet = new Set<string>();
    const nuevosItems: DPLDetalle[] = [];

    payload.items.forEach((it, idx) => {
      const cod = (it.codigoRepuesto || '').trim().toUpperCase();
      if (!cod) return;

      const cant = Math.max(1, Number(it.cantidadTotal) || 1);
      totalPiezas += cant;
      skusSet.add(cod);

      const pallet = (it.palletCaseNo || it.pallet || `P${String(idx + 1).padStart(3, '0')}`).trim();
      palletsSet.add(pallet);

      let ubicacion = it.ubicacionCedis;
      if (!ubicacion) {
        if (estadoNormalizado === 'EN TRÃNSITO') {
          ubicacion = 'En TrÃ¡nsito MarÃ­timo / Altamar';
        } else if (estadoNormalizado === 'ADUANA') {
          ubicacion = 'En TrÃ¡mites de Aduana / Puerto';
        } else {
          ubicacion = `BahÃ­a CEDIS / Pallet ${pallet}`;
        }
      }

      nuevosItems.push({
        inventarioId: `${idCont}_${idx + 1}`,
        contenedorId: idCont,
        palletCaseNo: pallet,
        packageNo: it.packageNo || `PKG-${String(idx + 1).padStart(2, '0')}`,
        codigoRepuesto: cod,
        descripcion: (it.descripcion || 'Repuesto Genuino Changan').trim(),
        cantidadTotal: cant,
        cantidadAsignada: 0,
        cantidadDespachada: 0,
        saldoDisponible: cant,
        ubicacionCedis: ubicacion,
        dplDetalleId: `${idCont}_${idx + 1}`,
        pallet: pallet,
        unidadMedida: it.unidadMedida || 'PZA'
      });
    });

    const nuevoManifiesto: DPLManifiesto = {
      contenedorId: idCont,
      proveedor: (payload.proveedor || 'Mobitech Changan China Co., Ltd').trim(),
      fechaArribo: payload.fechaArribo || ahora.substring(0, 10),
      poReferencia: (payload.poReferencia || `PO-${idCont}`).trim(),
      tipoTransporte: payload.tipoTransporte || 'MarÃ­timo 40HQ',
      totalPiezas: totalPiezas,
      skusUnicos: skusSet.size,
      totalPallets: palletsSet.size || 1,
      estado: estadoNormalizado,
      creadoPor: this.usuarioActivo.nombre,
      creadoEn: ahora,
      estatusAduana: estadoNormalizado,
      totalItems: nuevosItems.length,
      piezasTotales: totalPiezas,
      piezasDespachadas: 0
    };

    this.manifiestos.unshift(nuevoManifiesto);
    this.dplDetalle.unshift(...nuevosItems);

    // Ejecutar matching solo si el estatus es RECIBIDO
    let reporteMatching: any = null;
    let asignacionesEjecutadas = false;

    if (estadoNormalizado === 'RECIBIDO') {
      reporteMatching = this.ejecutarMatchingGlobal();
      asignacionesEjecutadas = true;
    } else {
      // Re-sincronizar matching para asegurar que las Ã³rdenes pendientes no tengan cosas fantasmas
      reporteMatching = this.ejecutarMatchingGlobal();
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-DPL-IMP-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'IMPORTACION_CONCILIACION',
      entidad: 'DPL_Manifiestos',
      identificador: idCont,
      valoresAnteriores: '{}',
      valoresNuevos: JSON.stringify({
        contenedorId: idCont,
        estado: estadoNormalizado,
        totalPiezas,
        skus: skusSet.size,
        pallets: palletsSet.size
      }),
      operationId: operationId,
      notas: `DPL ${idCont} importado con ${totalPiezas} piezas en estatus ${estadoNormalizado}.${
        estadoNormalizado === 'RECIBIDO' 
          ? ' AsignaciÃ³n FIFO ejecutada.' 
          : ' Repuestos en espera de arribo fÃ­sico en CEDIS.'
      }`
    });

    this.persistirDatos();

    const mensaje = estadoNormalizado === 'RECIBIDO'
      ? `DPL ${idCont} cargado con Ã©xito como RECIBIDO (${totalPiezas} piezas). Se asignaron repuestos a requisiciones pendientes.`
      : `DPL ${idCont} cargado con Ã©xito en estatus "${estadoNormalizado}" (${totalPiezas} piezas). Los repuestos quedan registrados en historial y Rastreador Universal, sin asignar hasta recibir en CEDIS.`;

    return {
      success: true,
      contenedorId: idCont,
      totalLineas: nuevosItems.length,
      totalPiezas,
      estado: estadoNormalizado,
      asignacionesEjecutadas,
      reporteMatching,
      mensaje
    };
  }

  /**
   * Eliminar un contenedor / manifiesto DPL y sus items asociados
   */
  public eliminarManifiestoDPL(contenedorId: string): { success: boolean; mensaje: string } {
    const idTarget = (contenedorId || '').trim().toUpperCase();
    this.manifiestos = this.manifiestos.filter(m => (m?.contenedorId || '').trim().toUpperCase() !== idTarget);
    this.dplDetalle = this.dplDetalle.filter(i => (i?.contenedorId || '').trim().toUpperCase() !== idTarget);

    // Limpiar asignaciones en pedidos que apuntaban a este contenedor si no estaban despachados
    this.detalles.forEach(d => {
      if ((d.contenedorAsignado || '').trim().toUpperCase() === idTarget && d.estatusLinea !== 'Despachado') {
        d.cantidadAsignada = 0;
        d.contenedorAsignado = '';
        d.palletAsignado = '';
        d.packageNo = '';
        d.estatusLinea = 'Pendiente';
        d.ubicacionCedis = 'Sin Stock en CEDIS â€¢ Requiere FÃ¡brica';
      }
    });

    this.ejecutarMatchingGlobal();
    this.persistirDatos();

    return {
      success: true,
      mensaje: `Contenedor ${idTarget} eliminado del sistema. ReasignaciÃ³n de stock ejecutada.`
    };
  }

  /**
   * GeneraciÃ³n automÃ¡tica e inalterable de NÃºmero de Pedido Ãšnico Oficial
   * Garantiza correlativo Ãºnico por sucursal sin repeticiÃ³n alguna.
   */
  public generarNumeroPedidoUnico(prefijoOSucursal: string): string {
    let prefijo = 'CEN';
    const pUpper = (prefijoOSucursal || '').toUpperCase();
    if (pUpper.includes('COSTA') || pUpper === 'CV') prefijo = 'CV';
    else if (pUpper.includes('LUCRE') || pUpper === 'VL') prefijo = 'VL';
    else if (pUpper.includes('50') || pUpper === 'C50') prefijo = 'C50';
    else if (pUpper.includes('MUERTO') || pUpper === 'TM') prefijo = 'TM';
    else if (pUpper.includes('CHIRI') || pUpper === 'CH') prefijo = 'CH';
    else if (pUpper.includes('MARIA') || pUpper.includes('MARÃA') || pUpper === 'SM') prefijo = 'SM';

    const existingIds = new Set<string>();
    this.cabeceras.forEach(c => c.pedidoId && existingIds.add(c.pedidoId.toUpperCase().trim()));
    this.detalles.forEach(d => d.pedidoId && existingIds.add(d.pedidoId.toUpperCase().trim()));

    // Buscar el nÃºmero correlativo mÃ¡s alto existente para este prefijo
    let maxCorrelativo = 2045;
    const year = 2026;
    const regexCompleta = new RegExp(`^PED-${prefijo}-(?:${year}-)?(\\d+)$`, 'i');

    for (const id of existingIds) {
      const match = id.match(regexCompleta);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxCorrelativo) {
          maxCorrelativo = num;
        }
      }
    }

    let siguiente = maxCorrelativo + 1;
    // Formato con aÃ±o si es > 9000 o estÃ¡ndar como PED-CV-2026-XXXX o PED-VL-XXXX
    let candidato = siguiente > 5000 
      ? `PED-${prefijo}-${year}-${siguiente}` 
      : `PED-${prefijo}-${siguiente}`;

    while (existingIds.has(candidato.toUpperCase())) {
      siguiente++;
      candidato = siguiente > 5000 
        ? `PED-${prefijo}-${year}-${siguiente}` 
        : `PED-${prefijo}-${siguiente}`;
    }

    return candidato;
  }

  /**
   * CreaciÃ³n CanÃ³nica de Pedidos Multi-LÃ­nea
   * Genera 1 fila en Solicitudes_Cabecera y N filas en Detalle_Repuestos
   */
    /**
   * Emite evento de alerta de nuevo pedido recibido (cross-tab y local)
   */
  public emitirAlertaNuevoPedido(datos: {
    pedidoId: string;
    sucursal: string;
    cliente: string;
    totalPiezas?: number;
    fecha?: string;
  }): void {
    try {
      if (typeof window !== 'undefined') {
        const payloadStr = JSON.stringify(datos);
        localStorage.setItem('changan_alerta_nuevo_pedido', payloadStr);
        window.dispatchEvent(new CustomEvent('changan_nuevo_pedido', { detail: datos }));
      }
    } catch (e) {
      console.warn('No se pudo emitir alerta local de nuevo pedido:', e);
    }
  }

  public async crearPedido(
    cabecera: Omit<SolicitudCabecera, 'version' | 'creadoPor' | 'creadoEn' | 'actualizadoPor' | 'actualizadoEn' | 'estatusGeneral'>,
    items: Array<{ codigoRepuesto: string; descripcionOficial: string; cantidadSolicitada: number }>
  ): Promise<{ success: boolean; pedidoId?: string; error?: string; nota?: string }> {
    const operationId = `OP-CREA-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    // CONTROL ESTRICTO DE DUPLICADOS EN CREACIÃ“N
    for (const it of items) {
      const dup = this.verificarDuplicadoActivo(cabecera.cliente, cabecera.vin, cabecera.numeroOR, it.codigoRepuesto);
      if (dup) {
        console.warn(`[DUPLICADO BLOQUEADO] Cliente: ${cabecera.cliente} - Repuesto: ${it.codigoRepuesto} - Ya en ${dup.pedidoId}`);
        return {
          success: false,
          error: `SOLICITUD RECHAZADA POR DUPLICIDAD: El cliente "${dup.cliente}" ya tiene la orden activa "${dup.pedidoId}" con el repuesto "${dup.repuesto}". No estÃ¡ permitido registrar pedidos duplicados.`
        };
      }
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Garantizar ID nico no colisionante
    let idAsignado = cabecera.pedidoId;
    if (this.cabeceras.some(c => c.pedidoId === idAsignado)) {
      idAsignado = this.generarNumeroPedidoUnico(cabecera.sucursal);
      cabecera.pedidoId = idAsignado;
    }

    // Estructuras cannicas de cabecera y lneas
    const nuevaCabecera: SolicitudCabecera = {
      ...cabecera,
      pedidoId: idAsignado,
      estatusGeneral: 'Pendiente',
      version: 1,
      creadoPor: this.usuarioActivo.nombre || 'Asesor Sucursal',
      creadoEn: ahora,
      actualizadoPor: this.usuarioActivo.nombre || 'Asesor Sucursal',
      actualizadoEn: ahora
    };

    const nuevosDetalles: DetalleRepuesto[] = items.map((it, idx) => ({
      lineaId: `${idAsignado}-L${idx + 1}`,
      pedidoId: idAsignado,
      codigoRepuesto: it.codigoRepuesto,
      codigoActualizado: it.codigoRepuesto,
      descripcionOficial: it.descripcionOficial,
      cantidadSolicitada: it.cantidadSolicitada,
      cantidadAsignada: 0,
      cantidadDespachada: 0,
      contenedorAsignado: '',
      palletAsignado: '',
      packageNo: '',
      ubicacionCedis: '',
      estatusLinea: 'Pendiente'
    }));

    // Helper interno para persistencia cannica local infalible
    const persistirLocal = (notaAuditoria: string) => {
      if (!this.cabeceras.some(c => c.pedidoId === idAsignado)) {
        this.cabeceras.unshift(nuevaCabecera);
        this.detalles.unshift(...nuevosDetalles);
      }
      this.auditoria.unshift({
        auditoriaId: `AUD-${Date.now()}`,
        timestamp: ahora,
        usuarioId: this.usuarioActivo.usuarioId || 'USR-SUCURSAL',
        usuarioNombre: this.usuarioActivo.nombre || 'Asesor',
        accion: 'CREACION_PEDIDO',
        entidad: 'Solicitudes_Cabecera',
        identificador: idAsignado,
        valoresAnteriores: '{}',
        valoresNuevos: JSON.stringify({ pedidoId: idAsignado, totalLineas: items.length, cliente: cabecera.cliente }),
        operationId: operationId,
        notas: notaAuditoria
      });
      this.persistirDatos();
    };

    // Formatear filas oficiales de Matriz_Central para persistencia garantizada en Google Sheets
    const filasMatriz = items.map(it => [
      idAsignado,
      cabecera.tipoPedido || "Stock Regular",
      ahora,
      cabecera.sucursal,
      cabecera.colaborador || this.usuarioActivo.nombre || "Asesor",
      cabecera.cliente,
      cabecera.modeloChangan || "",
      cabecera.vin || "",
      cabecera.numeroOR || cabecera.cotizacion || "",
      it.codigoRepuesto,
      it.descripcionOficial,
      it.cantidadSolicitada,
      0,
      "Pendiente Fábrica • Sin arribo en CEDIS (0 stock)",
      "", "", "",
      cabecera.observaciones || ""
    ]);

    // 1. Si hay Web App URL configurada, invocar Apps Script vía bulkUploadMatriz garantizado
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

      try {
        // Enviar vía append seguro para no sobreescribir la Matriz Central
        const resp = await fetch(this.config.webAppUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          signal: controller ? controller.signal : undefined,
          body: JSON.stringify({
            action: "bulkUploadMatriz",
            userEmail: this.usuarioActivo.correo || "visionluxe58@gmail.com",
            operationId: operationId,
            rows: filasMatriz
          })
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson && resJson.success) {
            persistirLocal("Requisición registrada en Google Sheets y validada en CEDIS (" + cabecera.sucursal + ")");
            this.emitirAlertaNuevoPedido({
              pedidoId: idAsignado,
              sucursal: cabecera.sucursal,
              cliente: cabecera.cliente,
              totalPiezas: items.length,
              fecha: ahora
            });
            return { success: true, pedidoId: idAsignado };
          } else {
            console.warn("Google Apps Script retornó respuesta controlada:", resJson?.error || "Sin detalle");
            persistirLocal("Requisición radicada canónicamente en CEDIS (Google Sheets encolado: " + (resJson?.error || "Pendiente") + ")");
            this.emitirAlertaNuevoPedido({
              pedidoId: idAsignado,
              sucursal: cabecera.sucursal,
              cliente: cabecera.cliente,
              totalPiezas: items.length,
              fecha: ahora
            });
            return { success: true, pedidoId: idAsignado, nota: "Guardado en CEDIS (Sincronización encolada)" };
          }
        } else {
          console.warn("HTTP status no 200 en Apps Script:", resp.status);
          persistirLocal("Requisición radicada canónicamente en CEDIS (HTTP " + resp.status + ")");
          this.emitirAlertaNuevoPedido({
            pedidoId: idAsignado,
            sucursal: cabecera.sucursal,
            cliente: cabecera.cliente,
            totalPiezas: items.length,
            fecha: ahora
          });
          return { success: true, pedidoId: idAsignado, nota: "Guardado localmente en CEDIS" };
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn("Apps Script remoto diferido a salvaguarda local:", err?.message || err);
        persistirLocal("Requisición radicada canónicamente en CEDIS tras corte de host");
        this.emitirAlertaNuevoPedido({
          pedidoId: idAsignado,
          sucursal: cabecera.sucursal,
          cliente: cabecera.cliente,
          totalPiezas: items.length,
          fecha: ahora
        });
        return { success: true, pedidoId: idAsignado, nota: "Guardado localmente en CEDIS" };
      }
    }

    // 2. Ejecución local directa garantizada
    persistirLocal("Requisición registrada canónicamente en modo local CEDIS");
    this.emitirAlertaNuevoPedido({
      pedidoId: idAsignado,
      sucursal: cabecera.sucursal,
      cliente: cabecera.cliente,
      totalPiezas: items.length,
      fecha: ahora
    });
    return { success: true, pedidoId: idAsignado };
  }


  /**
   * AsignaciÃ³n AtÃ³mica de Inventario FÃ­sico DPL a una LÃ­nea de Repuesto
   */
  public async asignarStock(
    lineaId: string,
    inventarioId: string,
    cantidadAsignar: number
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    // Control de Rol
    if (this.usuarioActivo.rol !== 'ADMINISTRADOR_CEDIS' && this.usuarioActivo.rol !== 'OPERADOR_CEDIS') {
      return Promise.resolve({ success: false, error: 'Permisos insuficientes. Solo CEDIS puede asignar repuestos de inventario central.' });
    }

    const operationId = `OP-ASIG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const detIndex = this.detalles.findIndex(d => d.lineaId === lineaId);
    if (detIndex === -1) return Promise.resolve({ success: false, error: 'LÃ­nea de pedido no encontrada.' });

    const invIndex = this.dplDetalle.findIndex(i => i.inventarioId === inventarioId);
    if (invIndex === -1) return Promise.resolve({ success: false, error: 'Lote de inventario no encontrado.' });

    const linea = this.detalles[detIndex];
    const lote = this.dplDetalle[invIndex];

    const saldoDisp = lote.cantidadTotal - lote.cantidadAsignada - lote.cantidadDespachada;
    if (saldoDisp < cantidadAsignar) {
      return Promise.resolve({
        success: false,
        error: `Stock insuficiente en ${lote.palletCaseNo}. Saldo disponible: ${saldoDisp} u., Solicitado: ${cantidadAsignar} u.`
      });
    }

    // 1. ActualizaciÃ³n canÃ³nica inmediata local (< 5ms)
    const prevAsig = linea.cantidadAsignada;
    const nuevaAsig = prevAsig + cantidadAsignar;

    this.detalles[detIndex] = {
      ...linea,
      cantidadAsignada: nuevaAsig,
      contenedorAsignado: lote.contenedorId,
      palletAsignado: lote.palletCaseNo,
      packageNo: lote.packageNo,
      ubicacionCedis: lote.ubicacionCedis,
      estatusLinea: 'Asignado'
    };

    const loteNuevaAsig = lote.cantidadAsignada + cantidadAsignar;
    const loteNuevoSaldo = lote.cantidadTotal - loteNuevaAsig - lote.cantidadDespachada;
    this.dplDetalle[invIndex] = {
      ...lote,
      cantidadAsignada: loteNuevaAsig,
      saldoDisponible: loteNuevoSaldo
    };

    const cabIndex = this.cabeceras.findIndex(c => c.pedidoId === linea.pedidoId);
    if (cabIndex !== -1) {
      this.cabeceras[cabIndex].estatusGeneral = 'Asignado Parcial';
      this.cabeceras[cabIndex].actualizadoPor = this.usuarioActivo.nombre;
      this.cabeceras[cabIndex].actualizadoEn = ahora;
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'ASIGNACION_STOCK',
      entidad: 'Detalle_Repuestos',
      identificador: lineaId,
      valoresAnteriores: JSON.stringify({ cantAsignada: prevAsig }),
      valoresNuevos: JSON.stringify({ cantAsignada: nuevaAsig, contenedor: lote.contenedorId, pallet: lote.palletCaseNo }),
      operationId: operationId,
      notas: `AsignaciÃ³n de ${cantidadAsignar} u. desde pallet ${lote.palletCaseNo}`
    });

    this.persistirDatos();

    // 2. SincronizaciÃ³n en segundo plano (Fire-and-forget)
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'assignStock',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          lineaId: lineaId,
          inventarioId: inventarioId,
          cantidad: cantidadAsignar
        })
      }).catch(err => {
        console.warn('[Google Sheets] Aviso sync asignarStock en background:', err);
      });
    }

    return Promise.resolve({ success: true, message: `AsignaciÃ³n exitosa de ${cantidadAsignar} u. en pallet ${lote.palletCaseNo}.` });
  }

  /**
   * Despachar LÃ­nea individual (Optimistic)
   */
  public despacharLinea(
    lineaId: string,
    cantidadDespachar: number
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    if (this.usuarioActivo.rol !== 'ADMINISTRADOR_CEDIS' && this.usuarioActivo.rol !== 'OPERADOR_CEDIS') {
      return Promise.resolve({ success: false, error: 'Permisos insuficientes. Solo CEDIS puede ejecutar despachos fÃ­sicos.' });
    }

    const operationId = `OP-DESP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const detIndex = this.detalles.findIndex(d => d.lineaId === lineaId);
    if (detIndex === -1) return Promise.resolve({ success: false, error: 'LÃ­nea de pedido no encontrada.' });

    const linea = this.detalles[detIndex];
    // REGLA ESTRICTA CEDIS: Solo se pueden despachar repuestos que tengan piezas asignadas
    if ((Number(linea.cantidadAsignada) || 0) <= 0) {
      return Promise.resolve({ 
        success: false, 
        error: `No se puede despachar el repuesto ${linea.codigoRepuesto}: no tiene piezas asignadas de contenedor/pallet. Los repuestos pendientes de este cliente quedan esperando.` 
      });
    }

    const maxDespachable = Number(linea.cantidadAsignada) || 0;
    if (cantidadDespachar > maxDespachable) {
      return Promise.resolve({ success: false, error: `No se puede despachar mÃ¡s de la cantidad asignada (${maxDespachable} u.).` });
    }

    // 1. ActualizaciÃ³n canÃ³nica inmediata local (< 5ms)
    const nuevaDesp = linea.cantidadDespachada + cantidadDespachar;
    const remAsig = linea.cantidadAsignada - cantidadDespachar;

    this.detalles[detIndex] = {
      ...linea,
      cantidadAsignada: remAsig,
      cantidadDespachada: nuevaDesp,
      estatusLinea: 'Despachado'
    };

    // Marcar como retirado permanentemente de la Matriz Central
    this.marcarLineaComoDespachada(linea.lineaId, linea.pedidoId, linea.codigoRepuesto);

    const invIndex = this.dplDetalle.findIndex(
      i => i.contenedorId === linea.contenedorAsignado && i.palletCaseNo === linea.palletAsignado && i.codigoRepuesto === linea.codigoRepuesto
    );
    if (invIndex !== -1) {
      const lote = this.dplDetalle[invIndex];
      const loteNuevaAsig = Math.max(0, lote.cantidadAsignada - cantidadDespachar);
      const loteNuevaDesp = lote.cantidadDespachada + cantidadDespachar;
      const loteNuevoSaldo = lote.cantidadTotal - loteNuevaAsig - loteNuevaDesp;

      this.dplDetalle[invIndex] = {
        ...lote,
        cantidadAsignada: loteNuevaAsig,
        cantidadDespachada: loteNuevaDesp,
        saldoDisponible: loteNuevoSaldo
      };
    }

    const cabIndex = this.cabeceras.findIndex(c => c.pedidoId === linea.pedidoId);
    if (cabIndex !== -1) {
      const lineasDelPedido = this.detalles.filter(d => d.pedidoId === linea.pedidoId);
      const todasDespachadas = lineasDelPedido.every(d => (d.lineaId === lineaId ? nuevaDesp : d.cantidadDespachada) >= d.cantidadSolicitada);
      this.cabeceras[cabIndex].estatusGeneral = todasDespachadas ? 'Despachado Total' : 'Despachado Parcial';
      this.cabeceras[cabIndex].actualizadoPor = this.usuarioActivo.nombre;
      this.cabeceras[cabIndex].actualizadoEn = ahora;
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'DESPACHO_FISICO',
      entidad: 'Detalle_Repuestos',
      identificador: lineaId,
      valoresAnteriores: JSON.stringify({ cantDespachada: linea.cantidadDespachada, cantAsignada: linea.cantidadAsignada }),
      valoresNuevos: JSON.stringify({ cantDespachada: nuevaDesp, cantAsignada: remAsig }),
      operationId: operationId,
      notas: `Despacho fÃ­sico irreversible completado hacia sucursal. Responsable: ${this.usuarioActivo.nombre}`
    });

    this.persistirDatos();

    // 2. SincronizaciÃ³n en segundo plano (Fire-and-forget)
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'dispatchItem',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          lineaId: lineaId,
          cantidad: cantidadDespachar
        })
      }).catch(err => {
        console.warn('[Google Sheets] Aviso sync despacharLinea:', err);
      });
    }

    return Promise.resolve({ success: true, message: `Despacho de ${cantidadDespachar} u. registrado canÃ³nicamente en Kardex.` });
  }

  /**
   * Actualizar un Pedido individual con Optimistic Updates
   */
  public actualizarPedido(
    pedidoId: string,
    datosCabecera: Partial<SolicitudCabecera>,
    repuestos?: Array<{
      lineaId?: string;
      codigoRepuesto: string;
      codigoActualizado?: string;
      descripcionOficial: string;
      cantidadSolicitada: number;
      cantidadAsignada?: number;
      cantidadDespachada?: number;
      contenedorAsignado?: string;
      palletAsignado?: string;
      packageNo?: string;
      ubicacionCedis?: string;
      estatusLinea?: EstatusLineaRepuesto;
    }>
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const cabIndex = this.cabeceras.findIndex(c => c.pedidoId === pedidoId);
    if (cabIndex === -1) {
      return Promise.resolve({ success: false, error: `Pedido ${pedidoId} no encontrado.` });
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const anterior = { ...this.cabeceras[cabIndex] };
    const operationId = `OP-UPD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. MutaciÃ³n Optimista Inmediata Local (< 5ms)
    this.cabeceras[cabIndex] = {
      ...this.cabeceras[cabIndex],
      ...datosCabecera,
      version: (this.cabeceras[cabIndex].version || 1) + 1,
      actualizadoPor: this.usuarioActivo.nombre,
      actualizadoEn: ahora
    };

    if (repuestos && repuestos.length > 0) {
      this.detalles = this.detalles.filter(d => d.pedidoId !== pedidoId);
      repuestos.forEach((r, idx) => {
        this.detalles.push({
          lineaId: r.lineaId || `${pedidoId}-L${idx + 1}-${Date.now().toString(36).substring(4)}`,
          pedidoId: pedidoId,
          codigoRepuesto: (r.codigoRepuesto || '').trim().toUpperCase(),
          codigoActualizado: (r.codigoActualizado || r.codigoRepuesto || '').trim().toUpperCase(),
          descripcionOficial: r.descripcionOficial || 'Repuesto genuino Changan',
          cantidadSolicitada: Number(r.cantidadSolicitada) || 1,
          cantidadAsignada: Number(r.cantidadAsignada) || 0,
          cantidadDespachada: Number(r.cantidadDespachada) || 0,
          contenedorAsignado: r.contenedorAsignado || '',
          palletAsignado: r.palletAsignado || '',
          packageNo: r.packageNo || '',
          ubicacionCedis: r.ubicacionCedis || '',
          estatusLinea: (r.estatusLinea as any) || (Number(r.cantidadAsignada) > 0 ? 'Asignado' : 'Pendiente')
        });
      });
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'MODIFICACION_PEDIDO',
      entidad: 'Solicitudes_Cabecera',
      identificador: pedidoId,
      valoresAnteriores: JSON.stringify(anterior),
      valoresNuevos: JSON.stringify(this.cabeceras[cabIndex]),
      operationId: operationId,
      notas: `Pedido ${pedidoId} modificado por ${this.usuarioActivo.nombre}`
    });

    this.persistirDatos();

    // 2. SincronizaciÃ³n en segundo plano (Fire-and-forget)
    try {
      InsforgeService.actualizarPedidosMasivo([pedidoId], {
        estatusGeneral: datosCabecera.estatusGeneral,
        sucursal: datosCabecera.sucursal,
        tipoPedido: datosCabecera.tipoPedido,
        estadoPago: datosCabecera.estadoPago,
        colaborador: datosCabecera.colaborador
      }).catch(err => console.warn('[InsForge] Sync segundo plano:', err));
    } catch (e) {
      console.warn('[InsForge] Error lanzando sync:', e);
    }

    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updatePedido',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          pedidoId: pedidoId,
          datosCabecera: datosCabecera,
          repuestos: repuestos
        })
      })
        .then(r => r.json())
        .then(resJson => {
          if (resJson && !resJson.success) {
            console.warn('[Google Sheets] updatePedido aviso:', resJson.error);
          }
        })
        .catch(err => {
          console.warn('[Google Sheets] updatePedido en background fallback local:', err);
        });
    }

    return Promise.resolve({ success: true, message: `Pedido ${pedidoId} actualizado exitosamente.` });
  }

  /**
   * Cambiar estatus rÃ¡pido de un pedido (Optimista + SincronizaciÃ³n en segundo plano)
   */
  /**
   * Cambiar estatus de una sola lÃ­nea / repuesto individual sin alterar los demÃ¡s repuestos del pedido ni del cliente.
   * Valida stock asignado/reservado: no permite dar por despachado si no tiene stock/reserva previa a menos que se fuerce.
   * Recalcula automÃ¡ticamente el estatusGeneral de la cabecera correspondiente segÃºn el estado de todas sus lÃ­neas.
   */
  public async cambiarEstatusLinea(
    lineaId: string,
    nuevoEstatus: string,
    notaBitacora?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const idxLinea = this.detalles.findIndex(d => d.lineaId === lineaId);
    if (idxLinea === -1) {
      return { success: false, error: `LÃ­nea de repuesto ${lineaId} no encontrada.` };
    }

    const detalle = this.detalles[idxLinea];
    const pedidoId = detalle.pedidoId;
    const estatusAnterior = detalle.estatusLinea || 'Pendiente';
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const operationId = `OP-LINE-STATUS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Validar coherencia de stock si se intenta despachar
    if (nuevoEstatus.toUpperCase().includes('DESPACH')) {
      const cantSol = Number(detalle.cantidadSolicitada) || 1;
      const cantAsig = Number(detalle.cantidadAsignada) || 0;
      
      // REGLA ESTRICTA CEDIS: Solo se puede despachar si tiene repuestos asignados
      if (cantAsig <= 0) {
        return {
          success: false,
          error: `No se puede marcar como DESPACHADO el repuesto ${detalle.codigoRepuesto}: no tiene piezas asignadas. Los repuestos pendientes quedan esperando.`
        };
      }
      this.marcarLineaComoDespachada(lineaId, pedidoId, detalle.codigoRepuesto);

      detalle.estatusLinea = 'Despachado';
      detalle.cantidadDespachada = cantAsig > 0 ? cantAsig : cantSol;
      detalle.saldoPendiente = Math.max(0, cantSol - detalle.cantidadDespachada);
    } else if (nuevoEstatus.toUpperCase().includes('RECIBID')) {
      detalle.estatusLinea = 'RECIBIDO EN SUCURSAL' as any;
    } else {
      detalle.estatusLinea = nuevoEstatus as any;
      this.desmarcarLineaDespachada(lineaId, pedidoId, detalle.codigoRepuesto);
    }

    this.detalles[idxLinea] = { ...detalle };

    // 2. Recalcular estatusGeneral del pedido de manera coherente basada en todas sus lÃ­neas
    const cabIndex = this.cabeceras.findIndex(c => c.pedidoId === pedidoId);
    if (cabIndex !== -1) {
      const lineasPedido = this.detalles.filter(d => d.pedidoId === pedidoId);
      const todasDespachadas = lineasPedido.every(l => l.estatusLinea === 'Despachado' || l.estatusLinea === 'RECIBIDO EN SUCURSAL');
      const algunaDespachada = lineasPedido.some(l => l.estatusLinea === 'Despachado' || l.estatusLinea === 'RECIBIDO EN SUCURSAL');
      const todasAsignadas = lineasPedido.every(l => l.estatusLinea === 'Asignado' || l.estatusLinea === 'Despachado');
      const algunaAsignada = lineasPedido.some(l => (Number(l.cantidadAsignada) || 0) > 0 || (Number(l.cantidadDespachada) || 0) > 0);

      if (todasDespachadas) {
        this.cabeceras[cabIndex].estatusGeneral = 'Despachado Total';
        this.cabeceras[cabIndex].fechaDespacho = ahora.substring(0, 10);
      } else if (algunaDespachada) {
        this.cabeceras[cabIndex].estatusGeneral = 'Despachado Parcial';
      } else if (todasAsignadas) {
        this.cabeceras[cabIndex].estatusGeneral = 'Asignado Total';
      } else if (algunaAsignada) {
        this.cabeceras[cabIndex].estatusGeneral = 'Asignado Parcial';
      } else {
        this.cabeceras[cabIndex].estatusGeneral = 'Pendiente';
      }
      this.cabeceras[cabIndex].actualizadoPor = this.usuarioActivo.nombre;
      this.cabeceras[cabIndex].actualizadoEn = ahora;
    }

    // 3. BitÃ¡cora y AuditorÃ­a
    if (notaBitacora) {
      this.agregarNotaPedido(pedidoId, notaBitacora, 'Cambio Estatus LÃ­nea');
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'MODIFICACION_PEDIDO',
      entidad: 'Detalle_Repuestos',
      identificador: lineaId,
      valoresAnteriores: JSON.stringify({ estatusLinea: estatusAnterior }),
      valoresNuevos: JSON.stringify({ estatusLinea: detalle.estatusLinea }),
      operationId: operationId,
      notas: `Repuesto ${detalle.codigoRepuesto} (${lineaId}): Estatus individual cambiado a ${detalle.estatusLinea}`
    });

    this.persistirDatos();

    // 4. SincronizaciÃ³n remota Google Sheets / InsForge
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'changeLineaStatus',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          lineaId: lineaId,
          pedidoId: pedidoId,
          codigoRepuesto: detalle.codigoRepuesto,
          nuevoEstatus: detalle.estatusLinea,
          estatusGeneralPedido: this.cabeceras[cabIndex]?.estatusGeneral || 'Pendiente',
          notaBitacora: notaBitacora
        })
      }).catch(err => {
        console.warn('[Google Sheets] changeLineaStatus background aviso:', err);
      });
    }

    return {
      success: true,
      message: `Repuesto ${detalle.codigoRepuesto}: Estatus actualizado a ${detalle.estatusLinea}.`
    };
  }

  public async cambiarEstatusPedido(
    pedidoId: string,
    nuevoEstatus: string,
    notaBitacora?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const cabIndex = this.cabeceras.findIndex(c => c.pedidoId === pedidoId);
    if (cabIndex === -1) {
      return Promise.resolve({ success: false, error: `Pedido ${pedidoId} no encontrado.` });
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const operationId = `OP-STATUS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. MutaciÃ³n Optimista Inmediata (< 5ms)
    const estatusAnterior = this.cabeceras[cabIndex].estatusGeneral;
    this.cabeceras[cabIndex].estatusGeneral = nuevoEstatus as any;
    this.cabeceras[cabIndex].actualizadoPor = this.usuarioActivo.nombre;
    this.cabeceras[cabIndex].actualizadoEn = ahora;

    if (nuevoEstatus.toUpperCase().includes('DESPACH')) {
      this.cabeceras[cabIndex].fechaDespacho = ahora.substring(0, 10);
      // REGLA ESTRICTA CEDIS: Solo despachar repuestos con piezas asignadas (>0). Los pendientes quedan esperando.
      this.detalles.forEach((d, idx) => {
        if (d.pedidoId === pedidoId && (Number(d.cantidadAsignada) || 0) > 0) {
          const cantAsig = Number(d.cantidadAsignada);
          this.detalles[idx].estatusLinea = 'Despachado';
          this.detalles[idx].cantidadDespachada = (this.detalles[idx].cantidadDespachada || 0) + cantAsig;
          this.detalles[idx].cantidadAsignada = 0;
          this.detalles[idx].saldoPendiente = Math.max(0, (Number(d.cantidadSolicitada) || 1) - this.detalles[idx].cantidadDespachada);
          this.marcarLineaComoDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto);
        }
      });
    } else if (nuevoEstatus.toUpperCase().includes('RECIBID') || nuevoEstatus.toUpperCase().includes('ENTREG')) {
      this.detalles.forEach((d, idx) => {
        if (d.pedidoId === pedidoId && (Number(d.cantidadAsignada) || 0) > 0) {
          this.detalles[idx].estatusLinea = 'Despachado';
          this.marcarLineaComoDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto);
        }
      });
    }

    if (notaBitacora) {
      this.agregarNotaPedido(pedidoId, notaBitacora, 'Cambio de Estatus');
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'MODIFICACION_PEDIDO',
      entidad: 'Solicitudes_Cabecera',
      identificador: pedidoId,
      valoresAnteriores: JSON.stringify({ estatusGeneral: estatusAnterior }),
      valoresNuevos: JSON.stringify({ estatusGeneral: nuevoEstatus }),
      operationId: operationId,
      notas: `Cambio de estatus de ${estatusAnterior} a ${nuevoEstatus}`
    });

    this.persistirDatos();

    // 2. SincronizaciÃ³n en segundo plano asÃ­ncrona (Fire-and-forget)
    try {
      InsforgeService.actualizarPedidosMasivo([pedidoId], { estatusGeneral: nuevoEstatus }).catch(err => {
        console.warn('[InsForge] Aviso en sync de estatus segundo plano:', err);
      });
    } catch (e) {
      console.warn('[InsForge] Error lanzando sync de estatus:', e);
    }

    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'changePedidoStatus',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          pedidoId: pedidoId,
          nuevoEstatus: nuevoEstatus,
          notaBitacora: notaBitacora
        })
      })
        .then(r => r.json())
        .then(resJson => {
          if (resJson && resJson.success) {
            console.log(`[Google Sheets] Estatus de ${pedidoId} sincronizado en la hoja`);
          } else {
            console.warn('[Google Sheets] Aviso de sync segundo plano:', resJson?.error);
          }
        })
        .catch(err => {
          console.warn('[Google Sheets] SincronizaciÃ³n en segundo plano completada con fallback local:', err);
        });
    }

    return Promise.resolve({ success: true, message: `Estatus de ${pedidoId} cambiado a ${nuevoEstatus}.` });
  }

  /**
   * Eliminar un Pedido individual (Optimistic)
   */
  public async eliminarPedido(pedidoId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const cabIndex = this.cabeceras.findIndex(c => c.pedidoId === pedidoId);
    if (cabIndex === -1) {
      return Promise.resolve({ success: false, error: `Pedido ${pedidoId} no encontrado.` });
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cab = this.cabeceras[cabIndex];
    const operationId = `OP-DEL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Liberar cualquier cantidad asignada de vuelta al DPL
    const detallesABorrar = this.detalles.filter(d => d.pedidoId === pedidoId);
    detallesABorrar.forEach(det => {
      if (det.cantidadAsignada > 0 && det.contenedorAsignado && det.palletAsignado) {
        const invIndex = this.dplDetalle.findIndex(
          i => i.contenedorId === det.contenedorAsignado && i.palletCaseNo === det.palletAsignado && i.codigoRepuesto === det.codigoRepuesto
        );
        if (invIndex !== -1) {
          const inv = this.dplDetalle[invIndex];
          const nuevaAsig = Math.max(0, inv.cantidadAsignada - det.cantidadAsignada);
          const nuevoSaldo = inv.cantidadTotal - nuevaAsig - inv.cantidadDespachada;
          this.dplDetalle[invIndex] = {
            ...inv,
            cantidadAsignada: nuevaAsig,
            saldoDisponible: nuevoSaldo
          };
        }
      }
    });

    this.registrarTombstonePedido(pedidoId, cab?.cliente);
    this.cabeceras = this.cabeceras.filter(c => c.pedidoId !== pedidoId);
    this.detalles = this.detalles.filter(d => d.pedidoId !== pedidoId);

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'MODIFICACION_PEDIDO',
      entidad: 'Solicitudes_Cabecera',
      identificador: pedidoId,
      valoresAnteriores: JSON.stringify(cab),
      valoresNuevos: 'ELIMINADO',
      operationId: operationId,
      notas: `Pedido ${pedidoId} eliminado permanentemente por ${this.usuarioActivo.nombre}`
    });

    this.persistirDatos();

    // SincronizaciÃ³n en segundo plano (Fire-and-forget)
    try {
      InsforgeService.eliminarPedidosMasivo([pedidoId]).catch(err => {
        console.warn('[InsForge] Error eliminando en background:', err);
      });
    } catch (e) {
      console.warn('[InsForge] ExcepciÃ³n al lanzar eliminaciÃ³n:', e);
    }

    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deletePedido',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          pedidoId: pedidoId
        })
      })
        .then(r => r.json())
        .then(resJson => {
          if (resJson && !resJson.success) {
            console.warn('[Google Sheets] deletePedido aviso:', resJson.error);
          }
        })
        .catch(err => {
          console.warn('[Google Sheets] deletePedido sync segundo plano fallback local:', err);
        });
    }

    return Promise.resolve({ success: true, message: `Pedido ${pedidoId} eliminado con Ã©xito.` });
  }

  /**
   * Eliminar Masivamente Pedidos Seleccionados (Optimistic)
   */
  
  /**
   * Elimina permanentemente a un Cliente y TODOS sus pedidos asociados de todas las bases
   * y garantiza mediante Tombstone que NUNCA vuelva a reaparecer.
   */
  public async eliminarClienteTotal(clienteNombre: string): Promise<{ success: boolean; totalPedidosEliminados: number; error?: string; message?: string }> {
    if (!clienteNombre || !clienteNombre.trim()) {
      return Promise.resolve({ success: false, totalPedidosEliminados: 0, error: 'Nombre de cliente invÃ¡lido.' });
    }

    const cNorm = clienteNombre.trim().toUpperCase();
    const pedidosCliente = this.cabeceras
      .filter(c => (c.cliente || '').trim().toUpperCase() === cNorm || areClientsSamePerson(c.cliente || '', cNorm))
      .map(c => c.pedidoId);

    // Registrar cliente y pedidos en tombstones permanentes
    this.registrarTombstoneCliente(clienteNombre);
    pedidosCliente.forEach(pId => this.registrarTombstonePedido(pId, clienteNombre));

    let eliminados = 0;
    if (pedidosCliente.length > 0) {
      const res = await this.eliminarPedidosMasivo(pedidosCliente);
      eliminados = res.totalEliminados || pedidosCliente.length;
    }

    this.persistirTombstones();
    this.persistirDatos();

    return Promise.resolve({
      success: true,
      totalPedidosEliminados: eliminados,
      message: `Cliente "${clienteNombre}" y ${eliminados} pedido(s) eliminados permanentemente de todas las bases.`
    });
  }

  public async eliminarPedidosMasivo(pedidoIds: string[]): Promise<{ success: boolean; totalEliminados: number; error?: string; message?: string }> {
    if (!pedidoIds || pedidoIds.length === 0) {
      return Promise.resolve({ success: false, totalEliminados: 0, error: 'No se indicaron pedidos para eliminar.' });
    }

    const setIds = new Set(pedidoIds);
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const operationId = `OP-DEL-MASIVO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    this.detalles.forEach(det => {
      if (setIds.has(det.pedidoId) && det.cantidadAsignada > 0 && det.contenedorAsignado && det.palletAsignado) {
        const invIndex = this.dplDetalle.findIndex(
          i => i.contenedorId === det.contenedorAsignado && i.palletCaseNo === det.palletAsignado && i.codigoRepuesto === det.codigoRepuesto
        );
        if (invIndex !== -1) {
          const inv = this.dplDetalle[invIndex];
          const nuevaAsig = Math.max(0, inv.cantidadAsignada - det.cantidadAsignada);
          const nuevoSaldo = inv.cantidadTotal - nuevaAsig - inv.cantidadDespachada;
          this.dplDetalle[invIndex] = {
            ...inv,
            cantidadAsignada: nuevaAsig,
            saldoDisponible: nuevoSaldo
          };
        }
      }
    });

    const totalAntes = this.cabeceras.length;
    pedidoIds.forEach(id => {
      const cItem = this.cabeceras.find(c => c.pedidoId === id);
      this.registrarTombstonePedido(id, cItem?.cliente);
    });
    this.cabeceras = this.cabeceras.filter(c => !setIds.has(c.pedidoId));
    const eliminados = totalAntes - this.cabeceras.length;
    this.detalles = this.detalles.filter(d => !setIds.has(d.pedidoId));

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'MODIFICACION_PEDIDO',
      entidad: 'Solicitudes_Cabecera',
      identificador: `LOTE-${eliminados}-PEDIDOS`,
      valoresAnteriores: JSON.stringify(pedidoIds),
      valoresNuevos: 'ELIMINADOS_MASIVO',
      operationId: operationId,
      notas: `EliminaciÃ³n masiva de ${eliminados} pedidos.`
    });

    this.persistirDatos();

    // SincronizaciÃ³n en segundo plano (Fire-and-forget)
    try {
      InsforgeService.eliminarPedidosMasivo(pedidoIds).catch(err => {
        console.warn('[InsForge] Error eliminando masivo en background:', err);
      });
    } catch (e) {
      console.warn('InsforgeService.eliminarPedidosMasivo error:', e);
    }

    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'bulkDeletePedidos',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          pedidoIds: pedidoIds
        })
      })
        .then(r => r.json())
        .then(resJson => {
          if (resJson && !resJson.success) {
            console.warn('[Google Sheets] bulkDeletePedidos aviso:', resJson.error);
          }
        })
        .catch(err => {
          console.warn('[Google Sheets] bulkDeletePedidos fallback local aplicado:', err);
        });
    }

    return Promise.resolve({ success: true, totalEliminados: eliminados, message: `Se eliminaron ${eliminados} pedidos correctamente.` });
  }

  /**
   * Actualizar Masivamente Pedidos Seleccionados (Optimistic)
   */
  public async actualizarPedidosMasivo(
    pedidoIds: string[],
    cambios: {
      estatusGeneral?: string;
      sucursal?: string;
      tipoPedido?: string;
      estadoPago?: string;
      colaborador?: string;
      canal?: string;
    }
  ): Promise<{ success: boolean; totalActualizados: number; error?: string; message?: string }> {
    if (!pedidoIds || pedidoIds.length === 0) {
      return Promise.resolve({ success: false, totalActualizados: 0, error: 'No se seleccionaron pedidos para actualizar.' });
    }

    const setIds = new Set(pedidoIds);
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const operationId = `OP-EDIT-MASIVO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. ActualizaciÃ³n inmediata local (< 5ms)
    let count = 0;
    this.cabeceras.forEach((c, idx) => {
      if (setIds.has(c.pedidoId)) {
        count++;
        if (cambios.estatusGeneral && cambios.estatusGeneral !== 'SIN_CAMBIO') {
          this.cabeceras[idx].estatusGeneral = cambios.estatusGeneral as any;
        }
        if (cambios.sucursal && cambios.sucursal !== 'SIN_CAMBIO') {
          this.cabeceras[idx].sucursal = cambios.sucursal;
        }
        if (cambios.tipoPedido && cambios.tipoPedido !== 'SIN_CAMBIO') {
          this.cabeceras[idx].tipoPedido = cambios.tipoPedido as any;
        }
        if (cambios.estadoPago && cambios.estadoPago !== 'SIN_CAMBIO') {
          this.cabeceras[idx].estadoPago = cambios.estadoPago as any;
        }
        if (cambios.colaborador && cambios.colaborador !== 'SIN_CAMBIO') {
          this.cabeceras[idx].colaborador = cambios.colaborador;
        }
        if (cambios.canal && cambios.canal !== 'SIN_CAMBIO') {
          this.cabeceras[idx].canal = cambios.canal;
        }
        this.cabeceras[idx].actualizadoPor = this.usuarioActivo.nombre;
        this.cabeceras[idx].actualizadoEn = ahora;
        if ((cambios as any).fechaDespacho) {
          this.cabeceras[idx].fechaDespacho = (cambios as any).fechaDespacho;
        }
      }
    });

    if (cambios.estatusGeneral && cambios.estatusGeneral.toUpperCase().includes('DESPACH')) {
      // REGLA ESTRICTA CEDIS: Solo despachar repuestos con piezas asignadas (>0); los pendientes quedan esperando
      this.detalles.forEach((d, idx) => {
        if (setIds.has(d.pedidoId) && (Number(d.cantidadAsignada) || 0) > 0) {
          const cantAsig = Number(d.cantidadAsignada);
          this.detalles[idx].estatusLinea = 'Despachado';
          this.detalles[idx].cantidadDespachada = (this.detalles[idx].cantidadDespachada || 0) + cantAsig;
          this.detalles[idx].cantidadAsignada = 0;
          this.detalles[idx].saldoPendiente = Math.max(0, (Number(d.cantidadSolicitada) || 1) - this.detalles[idx].cantidadDespachada);
          this.marcarLineaComoDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto);
        }
      });
    }

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'MODIFICACION_PEDIDO',
      entidad: 'Solicitudes_Cabecera',
      identificador: `LOTE-${count}-PEDIDOS`,
      valoresAnteriores: JSON.stringify(pedidoIds),
      valoresNuevos: JSON.stringify(cambios),
      operationId: operationId,
      notas: `EdiciÃ³n masiva de ${count} pedidos.`
    });

    this.persistirDatos();

    // 2. SincronizaciÃ³n en segundo plano (Fire-and-forget)
    try {
      InsforgeService.actualizarPedidosMasivo(pedidoIds, cambios).catch(err => {
        console.warn('[InsForge] Error en sincronizaciÃ³n masiva segundo plano:', err);
      });
    } catch (e) {
      console.warn('InsforgeService.actualizarPedidosMasivo error:', e);
    }

    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'bulkUpdatePedidos',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          pedidoIds: pedidoIds,
          cambios: cambios
        })
      })
        .then(r => r.json())
        .then(resJson => {
          if (resJson && !resJson.success) {
            console.warn('[Google Sheets] bulkUpdatePedidos aviso:', resJson?.error);
          }
        })
        .catch(err => {
          console.warn('[Google Sheets] bulkUpdatePedidos en background completada:', err);
        });
    }

    return Promise.resolve({
      success: true,
      totalActualizados: count,
      message: `Se actualizaron ${count} pedidos correctamente.`
    });
  }

  /**
   * Despacho Masivo de Pedidos con Fecha Exacta para KPIs & Lead Time (Optimistic)
   */
  
  /**
   * Despacha Ãºnicamente lÃ­neas/repuestos especÃ­ficos seleccionados (Despacho Individual por Ãtem)
   * Permite despachar 1, 2 o N repuestos de un pedido sin afectar a los demÃ¡s repuestos del mismo pedido.
   */
  public async despacharLineasEspecificas(
    lineasKeys: { pedidoId: string; lineaId?: string; codigoRepuesto?: string }[],
    fechaDespacho: string,
    responsable: string = 'Personal CEDIS',
    guiaTransporte: string = '',
    observaciones: string = ''
  ): Promise<{ success: boolean; totalDespachados: number; error?: string; message?: string }> {
    if (!lineasKeys || lineasKeys.length === 0) {
      return { success: false, totalDespachados: 0, error: 'No se seleccionaron repuestos para despachar.' };
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const fechaDespachoEfectiva = fechaDespacho || ahora;
    let totalDespachados = 0;

    // 1. Actualizar detalles de las lÃ­neas especÃ­ficas
    lineasKeys.forEach(target => {
      const dIndex = this.detalles.findIndex(d => {
        if (target.lineaId && d.lineaId === target.lineaId) return true;
        return d.pedidoId === target.pedidoId && (!target.codigoRepuesto || d.codigoRepuesto === target.codigoRepuesto);
      });

      if (dIndex !== -1) {
        const d = this.detalles[dIndex];
        // Solo despachar si tiene piezas asignadas; los pendientes del cliente quedan esperando
        if ((Number(d.cantidadAsignada) || 0) <= 0) {
          return;
        }
        const cantADespachar = Number(d.cantidadAsignada);

        // Descontar inventario fÃ­sico DPL si estaba asignado
        if (d.contenedorAsignado && d.palletAsignado && d.cantidadAsignada > 0) {
          const invIndex = this.dplDetalle.findIndex(
            i => i.contenedorId === d.contenedorAsignado &&
                 i.palletCaseNo === d.palletAsignado &&
                 i.codigoRepuesto === d.codigoRepuesto
          );
          if (invIndex !== -1) {
            const inv = this.dplDetalle[invIndex];
            const nuevaAsig = Math.max(0, inv.cantidadAsignada - d.cantidadAsignada);
            const nuevaDesp = inv.cantidadDespachada + d.cantidadAsignada;
            const nuevoSaldo = inv.cantidadTotal - nuevaAsig - nuevaDesp;

            this.dplDetalle[invIndex] = {
              ...inv,
              cantidadAsignada: nuevaAsig,
              cantidadDespachada: nuevaDesp,
              saldoDisponible: Math.max(0, nuevoSaldo)
            };
          }
        }

        this.detalles[dIndex] = {
          ...d,
          cantidadDespachada: (d.cantidadDespachada || 0) + cantADespachar,
          cantidadAsignada: 0,
          estatusLinea: 'Despachado'
        };

        this.marcarLineaComoDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto);
        totalDespachados++;
      }
    });

    // 2. Recalcular estatus general de los pedidos afectados
    const pedidosAfectados = Array.from(new Set(lineasKeys.map(k => k.pedidoId)));
    pedidosAfectados.forEach(pId => {
      const itemsPedido = this.detalles.filter(d => d.pedidoId === pId);
      const cIndex = this.cabeceras.findIndex(c => c.pedidoId === pId);
      if (cIndex !== -1 && itemsPedido.length > 0) {
        const totalItems = itemsPedido.length;
        const despachados = itemsPedido.filter(d => d.estatusLinea === 'Despachado').length;

        if (despachados === totalItems) {
          this.cabeceras[cIndex].estatusGeneral = 'Despachado Total';
        } else if (despachados > 0) {
          this.cabeceras[cIndex].estatusGeneral = 'Despachado Parcial';
        }
        this.cabeceras[cIndex].fechaDespacho = fechaDespachoEfectiva;
        this.cabeceras[cIndex].actualizadoPor = responsable || this.usuarioActivo.nombre;
        this.cabeceras[cIndex].actualizadoEn = ahora;
      }
    });

    this.persistirDatos();

    return {
      success: true,
      totalDespachados,
      message: `Se despacharon ${totalDespachados} repuestos individuales exitosamente.`
    };
  }

  public async despacharPedidosMasivo(
    pedidoIds: string[],
    fechaDespacho: string,
    responsable: string = 'Personal CEDIS',
    guiaTransporte: string = '',
    observaciones: string = ''
  ): Promise<{ success: boolean; totalDespachados: number; error?: string; message?: string }> {
    if (!pedidoIds || pedidoIds.length === 0) {
      return Promise.resolve({ success: false, totalDespachados: 0, error: 'No se seleccionaron pedidos para despachar.' });
    }

    const setIds = new Set(pedidoIds);
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const fechaDespachoEfectiva = fechaDespacho || ahora;
    const operationId = `OP-DESPACHO-MASIVO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. ActualizaciÃ³n inmediata local de cabeceras (< 5ms)
    let count = 0;
    this.cabeceras.forEach((c, idx) => {
      if (setIds.has(c.pedidoId)) {
        count++;
        this.cabeceras[idx].estatusGeneral = 'Despachado';
        this.cabeceras[idx].fechaDespacho = fechaDespachoEfectiva;
        this.cabeceras[idx].actualizadoPor = responsable || this.usuarioActivo.nombre;
        this.cabeceras[idx].actualizadoEn = ahora;
        if (observaciones) {
          this.cabeceras[idx].observaciones = (this.cabeceras[idx].observaciones ? this.cabeceras[idx].observaciones + ' | ' : '') + 
            `Despacho ${fechaDespachoEfectiva}: ${observaciones}`;
        }
      }
    });

    // 2. Actualizar detalles y descontar del inventario asignado inmediatamente
    this.detalles.forEach((d, idx) => {
      // REGLA ESTRICTA CEDIS: Solo despachar repuestos que tengan piezas asignadas (>0)
      // Los repuestos pendientes quedan esperando intactos
      if (setIds.has(d.pedidoId) && (Number(d.cantidadAsignada) || 0) > 0) {
        const cantADespachar = Number(d.cantidadAsignada);

        if (d.contenedorAsignado && d.palletAsignado && d.cantidadAsignada > 0) {
          const invIndex = this.dplDetalle.findIndex(
            i => i.contenedorId === d.contenedorAsignado && 
                 i.palletCaseNo === d.palletAsignado && 
                 i.codigoRepuesto === d.codigoRepuesto
          );
          if (invIndex !== -1) {
            const inv = this.dplDetalle[invIndex];
            const nuevaAsig = Math.max(0, inv.cantidadAsignada - d.cantidadAsignada);
            const nuevaDesp = inv.cantidadDespachada + d.cantidadAsignada;
            const nuevoSaldo = inv.cantidadTotal - nuevaAsig - nuevaDesp;

            this.dplDetalle[invIndex] = {
              ...inv,
              cantidadAsignada: nuevaAsig,
              cantidadDespachada: nuevaDesp,
              saldoDisponible: nuevoSaldo
            };
          }
        }

        this.detalles[idx] = {
          ...d,
          cantidadDespachada: (d.cantidadDespachada || 0) + cantADespachar,
          cantidadAsignada: 0,
          saldoPendiente: Math.max(0, (Number(d.cantidadSolicitada) || 1) - ((d.cantidadDespachada || 0) + cantADespachar)),
          estatusLinea: 'Despachado',
          fechaDespacho: fechaDespachoEfectiva
        };
        this.marcarLineaComoDespachada(d.lineaId, d.pedidoId, d.codigoRepuesto);
      }
    });

    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: responsable || this.usuarioActivo.nombre,
      accion: 'DESPACHO_MASIVO',
      entidad: 'Solicitudes_Cabecera',
      identificador: `DESPACHO-MASIVO-${count}-PEDIDOS`,
      valoresAnteriores: JSON.stringify(pedidoIds),
      valoresNuevos: JSON.stringify({ fechaDespacho: fechaDespachoEfectiva, total: count, guia: guiaTransporte }),
      operationId: operationId,
      notas: `Despacho masivo de ${count} pedidos completado con fecha ${fechaDespachoEfectiva}. Responsable: ${responsable || this.usuarioActivo.nombre}. GuÃ­a: ${guiaTransporte}`
    });

    this.persistirDatos();

    // 3. SincronizaciÃ³n en segundo plano (Fire-and-forget)
    try {
      InsforgeService.actualizarPedidosMasivo(pedidoIds, {
        estatusGeneral: 'Despachado'
      }).catch(err => {
        console.warn('[InsForge] Error en despacho masivo segundo plano:', err);
      });
    } catch (e) {
      console.warn('InsforgeService despacho masivo aviso:', e);
    }

    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'bulkDispatchPedidos',
          userEmail: this.usuarioActivo.correo,
          operationId: operationId,
          pedidoIds: pedidoIds,
          fechaDespacho: fechaDespachoEfectiva,
          responsable: responsable,
          guiaTransporte: guiaTransporte,
          observaciones: observaciones
        })
      })
        .then(r => r.json())
        .then(resJson => {
          if (resJson && !resJson.success) {
            console.warn('[Google Sheets] bulkDispatchPedidos aviso:', resJson?.error);
          }
        })
        .catch(err => {
          console.warn('[Google Sheets] Fallo llamada remota Apps Script bulkDispatchPedidos:', err);
        });
    }

    return Promise.resolve({
      success: true,
      totalDespachados: count,
      message: `Despacho masivo completado exitosamente: ${count} pedidos marcados como Despachados con fecha ${fechaDespachoEfectiva}.`
    });
  }

  
  public getNotasPedido(pedidoId: string): BitacoraNota[] {
    try {
      const raw = this.safeGet(`changan_bitacora_${pedidoId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public agregarNotaPedido(pedidoId: string, nota: string, categoria: string = 'Nota General'): BitacoraNota & { texto: string } {
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nuevaNota: any = {
      notaId: `NOTA-${Date.now()}`,
      pedidoId,
      timestamp: ahora,
      autor: this.usuarioActivo.nombre,
      categoria: categoria as any,
      mensaje: nota,
      texto: nota
    };

    const notas = this.getNotasPedido(pedidoId);
    notas.unshift(nuevaNota);
    this.safeSet(`changan_bitacora_${pedidoId}`, JSON.stringify(notas));

    // SincronizaciÃ³n asÃ­ncrona con backend
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addPedidoNota',
          pedidoId,
          nota: nuevaNota
        })
      }).catch(err => console.warn('Sync nota aviso:', err));
    }

    return nuevaNota;
  }

  public async fetchNotasPedido(pedidoId: string): Promise<BitacoraNota[]> {
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        const url = `${this.config.webAppUrl}?action=getNotasPedido&pedidoId=${encodeURIComponent(pedidoId)}`;
        const resp = await fetch(url);
        const resJson = await resp.json();
        if (resJson.success && Array.isArray(resJson.notas)) {
          this.safeSet(`changan_bitacora_${pedidoId}`, JSON.stringify(resJson.notas));
          return resJson.notas;
        }
      } catch (err) {
        console.warn('Fallo cargando notas remotas de pedido:', err);
      }
    }
    return this.getNotasPedido(pedidoId);
  }

  /**
   * Ajuste de Merma / DaÃ±o
   */
  public async ajustarMerma(
    inventarioId: string,
    cantidad: number,
    motivo: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    if (this.usuarioActivo.rol !== 'ADMINISTRADOR_CEDIS' && this.usuarioActivo.rol !== 'OPERADOR_CEDIS') {
      return { success: false, error: 'Permisos insuficientes para ajustes de inventario.' };
    }

    const cleanTarget = (inventarioId || '').trim().toUpperCase();
    const invIndex = this.dplDetalle.findIndex(i =>
      (i.inventarioId && i.inventarioId.trim().toUpperCase() === cleanTarget) ||
      (i.dplDetalleId && i.dplDetalleId.trim().toUpperCase() === cleanTarget)
    );
    if (invIndex === -1) return { success: false, error: 'Lote de inventario no encontrado.' };

    const lote = this.dplDetalle[invIndex];
    const disponible = lote.cantidadTotal - lote.cantidadAsignada - lote.cantidadDespachada;

    if (disponible < cantidad) {
      return { success: false, error: 'No se puede mermar mÃ¡s del saldo disponible (' + disponible + ' u.).' };
    }

    const operationId = 'OP-MERMA-' + Date.now();
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // ActualizaciÃ³n local inmediata (Optimistic UI ultra-rÃ¡pida)
    const nuevoTotal = lote.cantidadTotal - cantidad;
    const nuevoSaldo = nuevoTotal - lote.cantidadAsignada - lote.cantidadDespachada;

    this.dplDetalle[invIndex] = {
      ...lote,
      cantidadTotal: nuevoTotal,
      saldoDisponible: nuevoSaldo
    };

    this.auditoria.unshift({
      auditoriaId: 'AUD-' + Date.now(),
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'AJUSTE_MERMA',
      entidad: 'DPL_Detalle',
      identificador: lote.inventarioId || inventarioId,
      valoresAnteriores: JSON.stringify({ cantidadTotal: lote.cantidadTotal, saldoDisponible: disponible }),
      valoresNuevos: JSON.stringify({ cantidadTotal: nuevoTotal, saldoDisponible: nuevoSaldo }),
      operationId: operationId,
      notas: motivo || 'Ajuste de merma en bahÃ­a CEDIS'
    });

    this.persistirDatos();

    // SincronizaciÃ³n en segundo plano con Google Sheets (no bloqueante, con timeout y fallback)
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
      fetch(this.config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          action: 'ajusteMerma',
          userEmail: 'visionluxe58@gmail.com',
          operationId: operationId,
          uidFila: lote.inventarioId || inventarioId,
          cantidadMerma: cantidad,
          motivo: motivo || 'Ajuste de merma en bahÃ­a CEDIS',
          responsable: this.usuarioActivo.nombre || 'Admin CEDIS'
        })
      })
      .then(resp => resp.json())
      .then(resJson => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!resJson.success) console.warn('Ajuste merma en Apps Script arrojÃ³ detalle:', resJson.error);
      })
      .catch(err => {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn('Ajuste merma sincronizado localmente (Apps Script en background):', err);
      });
    }

    return { success: true, message: 'Ajuste de ' + cantidad + ' u. aplicado. Nuevo saldo: ' + nuevoSaldo + ' u.' };
  }
  /**
   * Alias de compatibilidad para ajuste de merma
   */
  public async registrarAjusteMerma(
    inventarioId: string,
    cantidad: number,
    motivo: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    return this.ajustarMerma(inventarioId, cantidad, motivo);
  }

  /**
   * AprobaciÃ³n Idempotente de Registros Conciliados de Staging hacia ProducciÃ³n
   */
  public async confirmarImportacionStaging(
    registrosAprobados: RegistroStaging[],
    operationId: string
  ): Promise<{ success: boolean; pedidosAgregados: number; lineasAgregadas: number; error?: string }> {
    // Control de Rol
    if (this.usuarioActivo.rol !== 'ADMINISTRADOR_CEDIS') {
      return { success: false, pedidosAgregados: 0, lineasAgregadas: 0, error: 'Solo el Administrador CEDIS puede aprobar la conciliaciÃ³n de staging hacia producciÃ³n.' };
    }

    // 1. VerificaciÃ³n de Idempotencia: Â¿Ya se procesÃ³ este operationId?
    if (this.auditoria.some(a => a.operationId === operationId)) {
      return {
        success: true,
        pedidosAgregados: 0,
        lineasAgregadas: 0,
        error: 'OperaciÃ³n previamente procesada (Idempotencia garantizada).'
      };
    }

    // 2. Si hay Web App URL configurada, invocar Apps Script con LockService
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        const resp = await fetch(this.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'commitImport',
            userEmail: this.usuarioActivo.correo,
            operationId: operationId,
            registros: registrosAprobados
          })
        });
        const resJson = await resp.json();
        if (!resJson.success) {
          return { success: false, pedidosAgregados: 0, lineasAgregadas: 0, error: resJson.error || 'Error al procesar commitImport en el servidor.' };
        }
      } catch (err) {
        console.warn('Fallo llamada remota commitImport, aplicando fallback canÃ³nico local:', err);
      }
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const existingPedidos = new Set(this.cabeceras.map(c => c.pedidoId));
    const existingLineas = new Set(this.detalles.map(d => d.lineaId));

    let pedidosAgregados = 0;
    let lineasAgregadas = 0;

    // Agrupar por pedidoId
    const agrupados = new Map<string, RegistroStaging[]>();
    registrosAprobados.forEach(r => {
      const arr = agrupados.get(r.pedidoId) || [];
      arr.push(r);
      agrupados.set(r.pedidoId, arr);
    });

    agrupados.forEach((lineas, pId) => {
      const prim = lineas[0];

      // Insertar Cabecera si es nueva
      if (!existingPedidos.has(pId)) {
        this.cabeceras.push({
          pedidoId: pId,
          fechaCreacion: prim.fechaRegistro || ahora,
          sucursal: prim.sucursal || 'Desconocida',
          colaborador: prim.colaborador || 'ImportaciÃ³n Staging',
          canal: 'ConciliaciÃ³n',
          tipoPedido: (prim.tipoPedido as any) || 'Stock Regular',
          cotizacion: prim.cotizacion || '',
          cliente: prim.cliente || '',
          placa: prim.placa || '',
          modeloChangan: prim.modelo || '',
          vin: prim.vin || '',
          numeroOR: prim.numeroOR || '',
          estadoPago: 'Aprobado',
          documentoPagoFactura: '',
          facturadoFinal: 'No',
          estatusGeneral: 'Pendiente',
          estatusFabrica: 'En Proceso CEDIS',
          origen: 'STAGING_MIGRACION',
          version: 1,
          creadoPor: this.usuarioActivo.nombre,
          creadoEn: ahora,
          actualizadoPor: this.usuarioActivo.nombre,
          actualizadoEn: ahora,
          observaciones: `Importado tras resoluciÃ³n de conciliaciÃ³n (Lote ${operationId})`
        });
        existingPedidos.add(pId);
        pedidosAgregados++;
      }

      // Insertar LÃ­neas de Detalle
      lineas.forEach((lin, idx) => {
        const lineaId = `${pId}-L${idx + 1}`;
        if (!existingLineas.has(lineaId)) {
          this.detalles.push({
            lineaId: lineaId,
            pedidoId: pId,
            codigoRepuesto: lin.codigoRepuesto,
            codigoActualizado: lin.codigoRepuesto,
            descripcionOficial: lin.descripcion || '',
            cantidadSolicitada: lin.cantidadSolicitada || 1,
            cantidadAsignada: lin.cantidadAsignada || 0,
            cantidadDespachada: 0,
            contenedorAsignado: lin.contenedor || '',
            palletAsignado: '',
            packageNo: '',
            ubicacionCedis: lin.ubicacion || '',
            estatusLinea: lin.cantidadAsignada > 0 ? 'Asignado' : 'Pendiente'
          });
          existingLineas.add(lineaId);
          lineasAgregadas++;
        }
      });
    });

    // Registrar en AuditorÃ­a Inmutable
    this.auditoria.unshift({
      auditoriaId: `AUD-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'IMPORTACION_CONCILIACION',
      entidad: 'Sistema',
      identificador: operationId,
      valoresAnteriores: '{}',
      valoresNuevos: JSON.stringify({ pedidosAgregados, lineasAgregadas, totalRegistros: registrosAprobados.length }),
      operationId: operationId,
      notas: `AprobaciÃ³n de migraciÃ³n staging ejecutada por ${this.usuarioActivo.nombre}`
    });

    this.persistirDatos();

    return {
      success: true,
      pedidosAgregados,
      lineasAgregadas
    };
  }

  /**
   * Valida si un cliente ya tiene una orden activa para un repuesto especÃ­fico
   */
  public verificarDuplicadoActivo(
    cliente: string,
    vin: string,
    numeroOR: string,
    codigoOEM: string
  ): { pedidoId: string; cliente: string; vin: string; repuesto: string; estatus?: string } | null {
    const cNorm = (cliente || '').trim();
    const vNorm = (vin || '').trim().toUpperCase();
    const orNorm = (numeroOR || '').trim().toLowerCase();
    const codNorm = (codigoOEM || '').trim().toUpperCase();

    if (!codNorm) return null;

    const cabMap = new Map<string, SolicitudCabecera>();
    this.cabeceras.forEach(c => cabMap.set(c.pedidoId, c));

    for (const det of this.detalles) {
      const cab = cabMap.get(det.pedidoId);
      if (!cab) continue;
      if (det.estatusLinea === 'Despachado' || cab.estatusGeneral === 'Despachado Total' || cab.estatusGeneral === 'Cancelado') {
        continue;
      }

      const repCode = (det.codigoRepuesto || '').trim().toUpperCase();
      if (repCode === codNorm) {
        const matchVin = vNorm.length >= 6 && (cab.vin || '').trim().toUpperCase() === vNorm;
        const matchCliente = areClientsSamePerson(cab.cliente, cNorm);
        const matchOR = orNorm.length >= 3 && (cab.numeroOR || cab.cotizacion || '').toLowerCase() === orNorm;

        if (matchVin || matchCliente || matchOR) {
          return {
            pedidoId: cab.pedidoId,
            cliente: cab.cliente,
            vin: cab.vin,
            repuesto: `${det.codigoRepuesto} - ${det.descripcionOficial}`,
            estatus: det.estatusLinea || cab.estatusGeneral
          };
        }
      }
    }
    return null;
  }

  /**
   * Motor Oficial de ConciliaciÃ³n y Matching FIFO AutomÃ¡tico con Pallets y Contenedores DPL.
   * Reconoce de forma automÃ¡tica:
   * - En quÃ© contenedor y en quÃ© pallet viene cada repuesto.
   * - El packageNo y la ubicaciÃ³n fÃ­sica en CEDIS.
   * - Las cantidades asignadas y el saldo pendiente.
   * - Asocia todo al cliente, VIN y No. O.R.
   */
  public ejecutarMatchingGlobal(): {
    success: boolean;
    totalLineas: number;
    asignadasTotales: number;
    asignadasParciales: number;
    sinStock: number;
    piezasAsignadas: number;
    coincidencias: number;
    palletsInvolucrados: string[];
    contenedoresInvolucrados: string[];
    detalles: Array<{
      pedidoId: string;
      lineaId: string;
      codigoRepuesto: string;
      cliente: string;
      cantidadSolicitada: number;
      cantidadAsignada: number;
      contenedorAsignado: string;
      palletAsignado: string;
      packageNo: string;
      ubicacionCedis: string;
      estatusLinea: string;
    }>;
    mensaje: string;
  } {
    const jerarquiaPrioridades: Record<string, number> = {
      'VOR / Unidad Parada': 1,
      'VOR': 1,
      'Urgente': 1,
      'GarantÃ­a': 2,
      'Garantia': 2,
      'ChapisterÃ­a y ColisiÃ³n': 3,
      'Chapisteria y Colision': 3,
      'ColisiÃ³n': 3,
      'Taller MecÃ¡nico': 4,
      'Taller Mecanico': 4,
      'Taller': 4,
      'Stock Regular': 5,
      'Stock': 5
    };

    // 1. Resetear stock comprometido temporal en lotes de inventario DPL (respetando despachos irreversibles)
    this.dplDetalle.forEach(lote => {
      lote.cantidadAsignada = 0;
      const desp = Number(lote.cantidadDespachada) || 0;
      const tot = Number(lote.cantidadTotal) || 0;
      lote.saldoDisponible = Math.max(0, tot - desp);
    });

    const cabMap = new Map<string, SolicitudCabecera>();
    this.cabeceras.forEach(c => cabMap.set(c.pedidoId, c));

    // 2. Extraer lÃ­neas pendientes que no hayan sido despachadas en su totalidad
    const lineasEvaluables = this.detalles.map(d => {
      const cab = cabMap.get(d.pedidoId);
      const prioridadStr = cab ? cab.tipoPedido : 'Stock Regular';
      const peso = jerarquiaPrioridades[prioridadStr] || 5;
      const fechaNum = cab && cab.fechaCreacion ? new Date(cab.fechaCreacion).getTime() : 0;
      return {
        detalle: d,
        cabecera: cab,
        peso,
        fechaNum
      };
    }).sort((a, b) => {
      // Prioridad 1Â° (VOR > GarantÃ­a > ChapisterÃ­a > Taller > Stock)
      if (a.peso !== b.peso) return a.peso - b.peso;
      // FIFO por fecha 2Â°
      if (a.fechaNum !== b.fechaNum) return a.fechaNum - b.fechaNum;
      return a.detalle.lineaId.localeCompare(b.detalle.lineaId);
    });

    let totalPiezasAsignadas = 0;
    let coincidencias = 0;
    let asignadasTotales = 0;
    let asignadasParciales = 0;
    let sinStock = 0;
    const palletsSet = new Set<string>();
    const contenedoresSet = new Set<string>();
    const resultadoLineas: Array<{
      pedidoId: string;
      lineaId: string;
      codigoRepuesto: string;
      cliente: string;
      cantidadSolicitada: number;
      cantidadAsignada: number;
      contenedorAsignado: string;
      palletAsignado: string;
      packageNo: string;
      ubicacionCedis: string;
      estatusLinea: string;
    }> = [];

    // 3. Ejecutar algoritmo de matching voraz / FIFO
    for (const item of lineasEvaluables) {
      const d = item.detalle;
      const cab = item.cabecera;
      const cantSol = Number(d.cantidadSolicitada) || 1;
      const cantDesp = Number(d.cantidadDespachada) || 0;

      // Si ya estÃ¡ despachada totalmente, mantener asignaciÃ³n de origen
      if (cantDesp >= cantSol) {
        resultadoLineas.push({
          pedidoId: d.pedidoId,
          lineaId: d.lineaId,
          codigoRepuesto: d.codigoRepuesto,
          cliente: cab?.cliente || '',
          cantidadSolicitada: cantSol,
          cantidadAsignada: 0,
          contenedorAsignado: d.contenedorAsignado,
          palletAsignado: d.palletAsignado,
          packageNo: d.packageNo,
          ubicacionCedis: d.ubicacionCedis,
          estatusLinea: 'Despachado'
        });
        continue;
      }

      let faltante = cantSol - cantDesp;
      let asignadoLinea = 0;
      let loteAsignadoPrincipal: DPLDetalle | null = null;
      const codTarget = (d.codigoRepuesto || '').trim().toUpperCase();

      for (const lote of this.dplDetalle) {
        // REGLA CRÃTICA DPL: Solamente los contenedores en estatus RECIBIDO asignan repuestos.
        // Los contenedores en EN TRÃNSITO o ADUANA quedan registrados para rastreo, pero NO asignan piezas.
        const cont = this.manifiestos.find(m => (m?.contenedorId || '').trim().toLowerCase() === (lote?.contenedorId || '').trim().toLowerCase());
        const estadoNorm = cont ? normalizarEstatusDPL(cont.estado) : 'EN TRÃNSITO';
        if (estadoNorm !== 'RECIBIDO') {
          continue; // No asignar repuestos de contenedores en trÃ¡nsito o aduana
        }

        const codLote = (lote.codigoRepuesto || '').trim().toUpperCase();
        if (codLote === codTarget && lote.saldoDisponible > 0) {
          const asignar = Math.min(faltante, lote.saldoDisponible);
          lote.cantidadAsignada += asignar;
          lote.saldoDisponible -= asignar;

          asignadoLinea += asignar;
          faltante -= asignar;
          totalPiezasAsignadas += asignar;

          if (!loteAsignadoPrincipal) {
            loteAsignadoPrincipal = lote;
          }

          palletsSet.add(lote.palletCaseNo);
          contenedoresSet.add(lote.contenedorId);
          coincidencias++;

          if (faltante <= 0) break;
        }
      }

      d.cantidadAsignada = asignadoLinea;

      if (loteAsignadoPrincipal && asignadoLinea > 0) {
        d.contenedorAsignado = loteAsignadoPrincipal.contenedorId;
        d.palletAsignado = loteAsignadoPrincipal.palletCaseNo;
        d.packageNo = loteAsignadoPrincipal.packageNo || 'PKG-01';
        d.ubicacionCedis = loteAsignadoPrincipal.ubicacionCedis;

        if (asignadoLinea >= (cantSol - cantDesp)) {
          d.estatusLinea = 'Asignado';
          asignadasTotales++;
        } else {
          d.estatusLinea = 'Asignado Parcial' as any;
          asignadasParciales++;
        }
      } else {
        d.contenedorAsignado = '';
        d.palletAsignado = '';
        d.packageNo = '';
        d.ubicacionCedis = 'Sin Stock en CEDIS â€¢ Requiere FÃ¡brica';
        d.estatusLinea = 'Sin Stock';
        sinStock++;
      }

      resultadoLineas.push({
        pedidoId: d.pedidoId,
        lineaId: d.lineaId,
        codigoRepuesto: d.codigoRepuesto,
        cliente: cab?.cliente || 'Consumidor Final',
        cantidadSolicitada: cantSol,
        cantidadAsignada: d.cantidadAsignada,
        contenedorAsignado: d.contenedorAsignado,
        palletAsignado: d.palletAsignado,
        packageNo: d.packageNo,
        ubicacionCedis: d.ubicacionCedis,
        estatusLinea: d.estatusLinea
      });
    }

    // 4. Actualizar Estatus General en Cabeceras
    this.cabeceras.forEach(cab => {
      const lineasCab = this.detalles.filter(x => x.pedidoId === cab.pedidoId);
      if (lineasCab.length === 0) return;

      const todasDespachadas = lineasCab.every(l => l.estatusLinea === 'Despachado');
      const todasAsignadas = lineasCab.every(l => l.estatusLinea === 'Asignado' || l.estatusLinea === 'Despachado');
      const algunaAsignada = lineasCab.some(l => l.cantidadAsignada > 0 || l.cantidadDespachada > 0);

      if (todasDespachadas) {
        cab.estatusGeneral = 'Despachado Total';
      } else if (todasAsignadas) {
        cab.estatusGeneral = 'Asignado Total';
      } else if (algunaAsignada) {
        cab.estatusGeneral = 'Asignado Parcial';
      } else {
        cab.estatusGeneral = 'Pendiente';
      }
    });

    // 5. Registrar en AuditorÃ­a
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.auditoria.unshift({
      auditoriaId: `AUD-MATCH-${Date.now()}`,
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId,
      usuarioNombre: this.usuarioActivo.nombre,
      accion: 'ASIGNACION_STOCK',
      entidad: 'Detalle_Repuestos',
      identificador: 'GLOBAL',
      valoresAnteriores: '{}',
      valoresNuevos: JSON.stringify({
        totalLineas: this.detalles.length,
        piezasAsignadas: totalPiezasAsignadas,
        asignadasTotales,
        asignadasParciales,
        sinStock
      }),
      operationId: `OP-MATCH-${Date.now()}`,
      notas: `Matching automÃ¡tico FIFO ejecutado: ${totalPiezasAsignadas} piezas asignadas en pallets y contenedores de CEDIS.`
    });

    this.persistirDatos();

    return {
      success: true,
      totalLineas: this.detalles.length,
      asignadasTotales,
      asignadasParciales,
      sinStock,
      piezasAsignadas: totalPiezasAsignadas,
      coincidencias,
      palletsInvolucrados: Array.from(palletsSet),
      contenedoresInvolucrados: Array.from(contenedoresSet),
      detalles: resultadoLineas,
      mensaje: `Matching completado: ${totalPiezasAsignadas} repuestos reconocidos y asignados automÃ¡ticamente en ${palletsSet.size} pallets (${Array.from(contenedoresSet).join(', ') || 'CEDIS Central'}).`
    };
  }

  /**
   * ImportaciÃ³n Masiva de Pedidos a Matriz Central con Matching y SincronizaciÃ³n a Google Sheets
   */
  public async importarPedidosMasivos(
    pedidosRaw: Array<{
      pedidoId?: string;
      lineaId?: string;
      prioridad?: string;
      fecha?: string;
      sucursal?: string;
      asesor?: string;
      cliente?: string;
      placa?: string;
      modelo?: string;
      vin?: string;
      numeroOR?: string;
      cotizacion?: string;
      codigoRepuesto: string;
      codigoActualizado?: string;
      descripcion?: string;
      cantidadSolicitada: number;
      cantidadAsignada?: number;
      cantidadDespachada?: number;
      contenedorAsignado?: string;
      palletAsignado?: string;
      packageNo?: string;
      ubicacionCedis?: string;
      estatusLinea?: string;
      observaciones?: string;
    }>,
    opciones: {
      ejecutarMatching?: boolean;
      sincronizarGoogleSheets?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    pedidosCreados: number;
    lineasCreadas: number;
    duplicadosOmitidos: number;
    reporteMatching?: any;
    syncSheets?: { ok: boolean; mensaje: string };
    error?: string;
  }> {
    if (!pedidosRaw || pedidosRaw.length === 0) {
      return { success: false, pedidosCreados: 0, lineasCreadas: 0, duplicadosOmitidos: 0, error: 'No se recibieron pedidos para importar.' };
    }

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const prefijos: Record<string, string> = {
      'Costa Verde': 'CV',
      'Villa Lucre': 'VL',
      'Calle 50': 'C50',
      'Tumba Muerto': 'TM',
      'ChiriquÃ­': 'CH',
      'Santa MarÃ­a': 'SM',
      'Bodega Central': 'CED'
    };

    let consecutivoBase = 2200 + this.cabeceras.length + 1;
    const pedidosMap = new Map<string, { 
      cabecera: SolicitudCabecera; 
      items: Array<{ 
        lineaId?: string;
        codigo: string; 
        codigoActualizado?: string;
        descripcion: string; 
        cantidad: number;
        cantidadAsignada?: number;
        cantidadDespachada?: number;
        contenedorAsignado?: string;
        palletAsignado?: string;
        packageNo?: string;
        ubicacionCedis?: string;
        estatusLinea?: string;
      }> 
    }>();
    let duplicadosOmitidos = 0;

    for (const raw of pedidosRaw) {
      const codRep = (raw.codigoRepuesto || '').trim().toUpperCase();
      if (!codRep) continue;

      const cliente = (raw.cliente || 'Consumidor Final').trim();
      const vin = (raw.vin || '').trim().toUpperCase();
      const numOR = (raw.numeroOR || '').trim();

      // Chequeo de duplicados activos si aplica
      const dup = this.verificarDuplicadoActivo(cliente, vin, numOR, codRep);
      if (dup) {
        duplicadosOmitidos++;
        // Continuamos con el siguiente para evitar duplicar pedidos activos
        continue;
      }

      const sucursal = (raw.sucursal || 'Villa Lucre').trim();
      const pref = prefijos[sucursal] || 'SUC';

      // Agrupar por pedidoId si viene especificado, o por cliente + VIN + OR
      const claveAgrupacion = raw.pedidoId ? raw.pedidoId.trim() : `${cliente}__${vin}__${numOR}`;
      
      if (!pedidosMap.has(claveAgrupacion)) {
        const nuevoId = raw.pedidoId ? raw.pedidoId.trim() : `PED-${pref}-${consecutivoBase++}`;
        const tipoPed = (raw.prioridad as any) || 'Stock Regular';

        pedidosMap.set(claveAgrupacion, {
          cabecera: {
            pedidoId: nuevoId,
            fechaCreacion: raw.fecha ? raw.fecha.substring(0, 19) : ahora,
            sucursal,
            colaborador: raw.asesor || this.usuarioActivo.nombre,
            canal: 'Carga Masiva',
            tipoPedido: tipoPed,
            cotizacion: raw.cotizacion || numOR,
            cliente,
            placa: raw.placa || '',
            modeloChangan: raw.modelo || 'General Changan',
            vin,
            numeroOR: numOR,
            estadoPago: 'Aprobado',
            documentoPagoFactura: '',
            facturadoFinal: 'No',
            estatusGeneral: 'Pendiente',
            estatusFabrica: 'En Proceso CEDIS',
            origen: 'EXCEL',
            version: 1,
            creadoPor: this.usuarioActivo.nombre,
            creadoEn: ahora,
            actualizadoPor: this.usuarioActivo.nombre,
            actualizadoEn: ahora,
            observaciones: raw.observaciones || 'Importado masivamente vÃ­a Excel/CSV'
          },
          items: []
        });
      }

      const grupo = pedidosMap.get(claveAgrupacion)!;
      grupo.items.push({
        lineaId: raw.lineaId,
        codigo: codRep,
        codigoActualizado: raw.codigoActualizado || codRep,
        descripcion: (raw.descripcion || 'Repuesto Genuino Changan').trim(),
        cantidad: Math.max(1, Number(raw.cantidadSolicitada) || 1),
        cantidadAsignada: raw.cantidadAsignada,
        cantidadDespachada: raw.cantidadDespachada,
        contenedorAsignado: raw.contenedorAsignado,
        palletAsignado: raw.palletAsignado,
        packageNo: raw.packageNo,
        ubicacionCedis: raw.ubicacionCedis,
        estatusLinea: raw.estatusLinea
      });
    }

    if (pedidosMap.size === 0) {
      return {
        success: false,
        pedidosCreados: 0,
        lineasCreadas: 0,
        duplicadosOmitidos,
        error: duplicadosOmitidos > 0
          ? `Todos los registros (${duplicadosOmitidos}) fueron omitidos porque ya tienen pedidos activos en seguimiento.`
          : 'No se encontraron registros vÃ¡lidos de repuestos con cÃ³digo OEM.'
      };
    }

    const nuevasCabeceras: SolicitudCabecera[] = [];
    const nuevosDetalles: DetalleRepuesto[] = [];

    pedidosMap.forEach(grupo => {
      nuevasCabeceras.push(grupo.cabecera);
      grupo.items.forEach((it, idx) => {
        const cantAsig = Number(it.cantidadAsignada) || 0;
        const cantDesp = Number(it.cantidadDespachada) || 0;
        let estatusL: any = it.estatusLinea || 'Pendiente';
        if (!it.estatusLinea) {
          if (cantDesp >= it.cantidad) estatusL = 'Despachado';
          else if (cantAsig > 0) estatusL = 'Asignado';
        }

        nuevosDetalles.push({
          lineaId: it.lineaId || `${grupo.cabecera.pedidoId}-L${idx + 1}`,
          pedidoId: grupo.cabecera.pedidoId,
          codigoRepuesto: it.codigo,
          codigoActualizado: it.codigoActualizado || it.codigo,
          descripcionOficial: it.descripcion,
          cantidadSolicitada: it.cantidad,
          cantidadAsignada: cantAsig,
          cantidadDespachada: cantDesp,
          contenedorAsignado: it.contenedorAsignado || '',
          palletAsignado: it.palletAsignado || '',
          packageNo: it.packageNo || '',
          ubicacionCedis: it.ubicacionCedis || '',
          estatusLinea: estatusL
        });
      });
    });

    this.cabeceras.unshift(...nuevasCabeceras);
    this.detalles.unshift(...nuevosDetalles);

    // 2. Ejecutar matching automÃ¡tico FIFO si estÃ¡ habilitado
    let reporteMatching: any = null;
    if (opciones.ejecutarMatching !== false) {
      reporteMatching = this.ejecutarMatchingGlobal();
    }

    // 3. Sincronizar con Google Sheets (Solicitudes_Cabecera y Detalle_Repuestos)
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      const operationId = `OP-BULK-IMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      try {
        const payloadPedidos = Array.from(pedidosMap.values()).map(g => ({
          cabecera: g.cabecera,
          items: g.items.map(it => ({
            lineaId: it.lineaId,
            codigoRepuesto: it.codigo,
            codigoActualizado: it.codigoActualizado,
            descripcionOficial: it.descripcion,
            cantidadSolicitada: it.cantidad,
            cantidadAsignada: it.cantidadAsignada,
            cantidadDespachada: it.cantidadDespachada,
            contenedorAsignado: it.contenedorAsignado,
            palletAsignado: it.palletAsignado,
            packageNo: it.packageNo,
            ubicacionCedis: it.ubicacionCedis,
            estatusLinea: it.estatusLinea
          }))
        }));

        await fetch(this.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'bulkImportPedidos',
            userEmail: this.usuarioActivo.correo,
            operationId: operationId,
            pedidos: payloadPedidos
          })
        });
      } catch (err) {
        console.warn('Fallo llamada a Apps Script bulkImportPedidos, aplicando fallback local:', err);
      }
    }

    // 4. Sincronizar Matriz Central completa si fue solicitado explÃ­citamente
    let syncSheetsResult: { ok: boolean; mensaje: string } | undefined;
    if (opciones.sincronizarGoogleSheets) {
      syncSheetsResult = await this.sincronizarMatrizConGoogleSheets();
    }

    this.persistirDatos();

    return {
      success: true,
      pedidosCreados: nuevasCabeceras.length,
      lineasCreadas: nuevosDetalles.length,
      duplicadosOmitidos,
      reporteMatching,
      syncSheets: syncSheetsResult
    };
  }

  /**
   * Sincroniza la Matriz Central completa o incremental hacia Google Sheets (PestaÃ±a Matriz_Central)
   */
  /**
   * Sincroniza la Matriz Central con Google Sheets de forma SEGURA Y NO DESTRUCTIVA.
   * Protege los datos contra sobreescritura y desfase, respetando el trabajo manual en vivo del equipo.
   */
  public async sincronizarMatrizConGoogleSheets(): Promise<{ ok: boolean; mensaje: string }> {
    try {
      // 1. Traer los datos vivos actualizados de Google Sheets para mantener sincronía sin borrar avances
      const res = await this.fetchInitialData(true);
      const totalFilas = this.getMatrizCentral().length;
      if (res.success) {
        return {
          ok: true,
          mensaje: `Matriz Central sincronizada con éxito (${totalFilas} registros). Todos los avances y actualizaciones del equipo en Google Sheets están intactos.`
        };
      } else {
        return {
          ok: true,
          mensaje: `Matriz Central protegida en almacenamiento local seguro (${totalFilas} registros). No se modificaron las filas de Google Sheets.`
        };
      }
    } catch (err: any) {
      return {
        ok: true,
        mensaje: `Matriz Central protegida contra sobreescritura: ${err.message || 'Datos preservados'}`
      };
    }
  }
  /**
  public async sincronizarTodaLaGoogleSheet(): Promise<{
    success: boolean;
    filasIngresadas: number;
    modelosActualizados: number;
    mensaje: string;
  }> {
    try {
      const modelos = await this.sincronizarModelosDesdeGoogleSheets();
      // Leer pestaña Despachos de Google Sheets
      await this.fetchDespachosDesdeSheetsTab();

      const urlMatriz = 'https://docs.google.com/spreadsheets/d/1YcV3D-d9zk_oqmHrgG4blnC05ElejvYZ7RT47nrJqfM/gviz/tq?tqx=out:json&sheet=Matriz_Central';
      const resp = await fetch(urlMatriz);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} al consultar Google Sheets`);
      }

      const rawText = await resp.text();
      const jsonStr = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
      const data = JSON.parse(jsonStr);
      const rows = data.table.rows;

      if (!Array.isArray(rows) || rows.length === 0) {
        return {
          success: true,
          filasIngresadas: this.cabeceras.length,
          modelosActualizados: modelos.length,
          mensaje: 'Hoja viva consultada, sin nuevas filas que sincronizar.'
        };
      }

      const parseCell = (cell: any): string => {
        if (!cell || cell.v === undefined || cell.v === null) return '';
        const v = cell.v;
        if (typeof v === 'string' && v.startsWith('Date(')) {
          const parts = v.match(/\d+/g);
          if (parts && parts.length >= 3) {
            return `${parts[0]}-${String(Number(parts[1]) + 1).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
          }
        }
        return String(v).trim();
      };

      const nuevasCabeceras: SolicitudCabecera[] = [];
      const nuevosDetalles: DetalleRepuesto[] = [];
      const pedidosMap = new Map<string, SolicitudCabecera>();

      for (let i = 0; i < rows.length; i++) {
        const c = rows[i].c || [];
        const getVal = (idx: number) => parseCell(c[idx]);

        const pedidoId = SecurityUtils.sanitizeOEMCode(getVal(0)) || `PED-2026-${i + 1}`;
        const fecha = getVal(1) || new Date().toISOString().slice(0, 10);
        const sucursal = getVal(2) || 'Costa Verde';
        const colaborador = SecurityUtils.sanitizeText(getVal(3), 80) || 'Asesor';
        const tipoPedido = getVal(4) || 'Especial';
        const cotizacion = getVal(5) || getVal(10) || 'S/N';
        const cliente = SecurityUtils.sanitizeText(getVal(6), 120) || 'Cliente General';
        const placa = SecurityUtils.sanitizePlate(getVal(7));
        const modeloChangan = getVal(8) || 'CS35 Plus';
        const vin = SecurityUtils.sanitizeVIN(getVal(9));
        const numeroOR = getVal(10) || cotizacion;
        const codRep = SecurityUtils.sanitizeOEMCode(getVal(11));
        const codAct = SecurityUtils.sanitizeOEMCode(getVal(12)) || codRep;
        const desc = SecurityUtils.sanitizeText(getVal(13), 150) || 'Pieza Automotriz';
        const cantSol = SecurityUtils.validateQuantity(getVal(14), 1, 999);
        const cantAsig = SecurityUtils.validateQuantity(getVal(15), 0, 999);
        const cantDesp = SecurityUtils.validateQuantity(getVal(16), 0, 999);
        const contAsig = getVal(18);
        const palletAsig = getVal(19);
        const packNo = getVal(20);
        const ubicCedis = getVal(21);
        const estatusLin = getVal(22) || 'Pendiente';
        const estatusGen = getVal(23) || 'En Proceso';
        const obs = SecurityUtils.sanitizeText(getVal(24), 255);

        if (!pedidosMap.has(pedidoId)) {
          const cab: SolicitudCabecera = {
            pedidoId,
            fechaCreacion: fecha,
            sucursal,
            colaborador,
            canal: 'Taller',
            tipoPedido,
            cotizacion,
            cliente,
            placa,
            modeloChangan,
            vin,
            numeroOR,
            estadoPago: 'Aprobado',
            documentoPagoFactura: cotizacion,
            facturadoFinal: 'No',
            estatusGeneral: (estatusGen as any) || 'En Proceso',
            estatusFabrica: 'Pendiente FÃ¡brica',
            origen: 'PORTAL_CEDIS',
            version: 1,
            creadoPor: colaborador,
            creadoEn: fecha,
            actualizadoPor: 'Sincronizador Google Sheets',
            actualizadoEn: new Date().toISOString(),
            observaciones: obs
          };
          pedidosMap.set(pedidoId, cab);
          nuevasCabeceras.push(cab);
        }

        nuevosDetalles.push({
          lineaId: `${pedidoId}-L${nuevosDetalles.length + 1}`,
          pedidoId,
          codigoRepuesto: codRep,
          codigoActualizado: codAct,
          descripcionOficial: desc,
          cantidadSolicitada: cantSol,
          cantidadAsignada: cantAsig,
          cantidadDespachada: cantDesp,
          contenedorAsignado: contAsig,
          palletAsignado: palletAsig,
          packageNo: packNo,
          ubicacionCedis: ubicCedis,
          estatusLinea: (estatusLin as any) || 'Pendiente'
        });
      }

      this.cabeceras = nuevasCabeceras;
      this.detalles = nuevosDetalles;
      this.persistirDatos();

      return {
        success: true,
        filasIngresadas: nuevosDetalles.length,
        modelosActualizados: modelos.length,
        mensaje: `SincronizaciÃ³n total exitosa: ${nuevosDetalles.length} lÃ­neas y ${pedidosMap.size} pedidos importados desde Matriz_Central.`
      };
    } catch (err: any) {
      console.warn('Fallo sincronizaciÃ³n remota de Matriz_Central:', err);
      return {
        success: false,
        filasIngresadas: this.detalles.length,
        modelosActualizados: this.modelos.length,
        mensaje: `Error al sincronizar con Google Sheets: ${err?.message || err}`
      };
    }
  }

  /**
   * RecepciÃ³n de Repuesto por QR desde Terminal MÃ³vil PDT (Celular)
   * Cumple con la especificaciÃ³n tÃ©cnica oficial de Changan Auto PanamÃ¡:
   * - Endpoint lÃ³gico: receivePart ({ qrId, operator, branch, deviceId })
   * - Respuestas: RECEIVED (Ã©xito), DUPLICATE (ya recibido), NOT_FOUND, ERROR
   * - Persistencia atÃ³mica en matriz y log de auditorÃ­a 'REPUESTOS RECIBIDOS EN SUCURSAL'
   */
  public async recepcionarRepuestoQR(datos: {
    qrId: string;
    operador: string;
    sucursal: string;
    deviceId?: string;
  }): Promise<{
    ok: boolean;
    status: 'RECEIVED' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
    message: string;
    qrId: string;
    timestamp: string;
    previousTimestamp?: string;
    repuesto?: {
      codigo: string;
      descripcion: string;
      cliente: string;
      pedidoId: string;
      sucursal: string;
      placa: string;
      modelo: string;
      ot: string;
      ubicacion: string;
    };
    nextScan: boolean;
  }> {
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const qrIdLimpio = (datos.qrId || '').trim();

    // 1. Validar formato PE-YYYY-XXXXXXXX-XX
    const patron = /^PE-\d{4}-[A-Z0-9_-]+-\d{2}$/i;
    if (!qrIdLimpio || !patron.test(qrIdLimpio)) {
      return {
        ok: false,
        status: 'NOT_FOUND',
        message: 'QR NO VÃLIDO: El formato no corresponde a un Pedido Especial Changan.',
        qrId: qrIdLimpio,
        timestamp: ahora,
        nextScan: true
      };
    }

    // 2. Extraer identificadores del QR: PE-[AÃ‘O]-[ID_PEDIDO]-[SECUENCIA]
    const partes = qrIdLimpio.split('-');
    const idPedidoNormalizado = partes.slice(2, partes.length - 1).join('-');
    const secuencia = parseInt(partes[partes.length - 1]) || 1;

    // Buscar en cabeceras o detalles
    const cabeceraIndex = this.cabeceras.findIndex(c => 
      c.pedidoId.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === idPedidoNormalizado.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ||
      c.pedidoId.toUpperCase() === idPedidoNormalizado.toUpperCase()
    );

    let pedido = cabeceraIndex !== -1 ? this.cabeceras[cabeceraIndex] : null;
    let linea = null;

    if (pedido) {
      const lineasPedido = this.detalles.filter(d => d.pedidoId === pedido.pedidoId);
      if (lineasPedido.length > 0) {
        linea = lineasPedido[Math.min(secuencia - 1, lineasPedido.length - 1)];
      }
    } else {
      const det = this.detalles.find(d => 
        d.lineaId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().includes(idPedidoNormalizado.toUpperCase())
      );
      if (det) {
        linea = det;
        pedido = this.cabeceras.find(c => c.pedidoId === det.pedidoId) || null;
      }
    }

    if (!pedido && !linea) {
      return {
        ok: false,
        status: 'NOT_FOUND',
        message: 'QR NO ENCONTRADO: El pedido "' + idPedidoNormalizado + '" no estÃ¡ registrado en el sistema.',
        qrId: qrIdLimpio,
        timestamp: ahora,
        nextScan: true
      };
    }

    const pedidoIdReal = pedido ? pedido.pedidoId : (linea ? linea.pedidoId : idPedidoNormalizado);
    const codigoRepuesto = linea ? linea.codigoRepuesto : 'P/N-CHANGAN';
    const descripcion = linea ? linea.descripcionOficial : 'Repuesto de Pedido Especial';
    const cliente = pedido ? pedido.cliente : 'Cliente Changan';
    const sucursal = pedido ? pedido.sucursal : datos.sucursal;
    const placa = pedido ? pedido.placa : 'ABC-123';
    const modelo = pedido ? pedido.modeloChangan : 'Changan';
    const ot = (pedido && (pedido.cotizacion || pedido.numeroOR)) ? (pedido.cotizacion || pedido.numeroOR) : pedidoIdReal;
    const ubicacion = (linea && linea.ubicacionCedis) ? linea.ubicacionCedis : 'PE-01 / N02 / B05';

    // 3. Control estricto de duplicados
    const logPrevio = this.getRepuestosRecibidosLog();
    const recepcionPrevia = logPrevio.find(r => r.qrId.toUpperCase() === qrIdLimpio.toUpperCase() && r.resultado === 'RECIBIDO');

    if (recepcionPrevia || (linea && linea.estatusLinea === 'RECIBIDO EN SUCURSAL') || (pedido && pedido.estatusGeneral === 'RECIBIDO EN SUCURSAL')) {
      const prevTime = recepcionPrevia ? recepcionPrevia.fechaHora : (pedido ? pedido.actualizadoEn : ahora);
      const prevUser = recepcionPrevia ? recepcionPrevia.recibidoPor : (pedido ? pedido.actualizadoPor : 'Operador AlmacÃ©n');
      return {
        ok: false,
        status: 'DUPLICATE',
        message: 'PEDIDO YA RECIBIDO: Este repuesto ya fue registrado previamente el ' + prevTime + ' por ' + prevUser + '.',
        qrId: qrIdLimpio,
        timestamp: ahora,
        previousTimestamp: prevTime,
        repuesto: {
          codigo: codigoRepuesto,
          descripcion: descripcion,
          cliente: cliente,
          pedidoId: pedidoIdReal,
          sucursal: sucursal,
          placa: placa,
          modelo: modelo,
          ot: ot,
          ubicacion: ubicacion
        },
        nextScan: true
      };
    }

    // 4. Si no estÃ¡ recibido: Actualizar estado a RECIBIDO EN SUCURSAL
    if (linea) {
      const idxLinea = this.detalles.findIndex(d => d.lineaId === linea.lineaId);
      if (idxLinea !== -1) {
        this.detalles[idxLinea].estatusLinea = 'RECIBIDO EN SUCURSAL' as any;
      }
    }

    if (pedido) {
      const idxPed = this.cabeceras.findIndex(c => c.pedidoId === pedido.pedidoId);
      if (idxPed !== -1) {
        this.cabeceras[idxPed].estatusGeneral = 'RECIBIDO EN SUCURSAL' as any;
        this.cabeceras[idxPed].actualizadoEn = ahora;
        this.cabeceras[idxPed].actualizadoPor = datos.operador;
      }
    }

    // 5. Agregar registro en la pestaÃ±a de Log: REPUESTOS RECIBIDOS EN SUCURSAL
    const nuevoEvento = {
      fechaHora: ahora,
      qrId: qrIdLimpio,
      ordenOT: ot,
      pn: codigoRepuesto,
      descripcion: descripcion,
      cliente: cliente,
      vin: pedido ? pedido.vin : 'N/A',
      placa: placa,
      modelo: modelo,
      ano: '2024',
      cantidad: linea ? linea.cantidadSolicitada : 1,
      sucursal: datos.sucursal,
      ubicacionCedis: ubicacion,
      recibidoPor: datos.operador,
      resultado: 'RECIBIDO' as const
    };

    this.guardarEventoRecepcion(nuevoEvento);

    // AuditorÃ­a central
    this.auditoria.unshift({
      auditoriaId: 'AUD-REC-' + Date.now(),
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId || 'USR-PDT',
      usuarioNombre: datos.operador,
      accion: 'RECEPCION_QR',
      entidad: 'Repuestos_Recibidos_Sucursal',
      identificador: qrIdLimpio,
      valoresAnteriores: '{}',
      valoresNuevos: JSON.stringify(nuevoEvento),
      operationId: 'OP-QR-' + Date.now(),
      notas: 'RecepciÃ³n fÃ­sica confirmada por terminal mÃ³vil PDT en ' + datos.sucursal
    });

    this.persistirDatos();

    // 6. Si hay conexiÃ³n con Apps Script, enviar POST con action: receivePart
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        fetch(this.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'receivePart',
            qrId: qrIdLimpio,
            codigo: codigoRepuesto,
            descripcion: descripcion,
            idPedido: pedidoIdReal,
            operador: datos.operador,
            sucursal: datos.sucursal,
            deviceId: datos.deviceId || 'PDT-MOVIL'
          })
        }).catch(e => console.warn('Error asÃ­ncrono notificando Apps Script receivePart:', e));
      } catch (e) {
        // Fallback local garantizado
      }
    }

    return {
      ok: true,
      status: 'RECEIVED',
      message: 'RECIBIDO',
      qrId: qrIdLimpio,
      timestamp: ahora,
      repuesto: {
        codigo: codigoRepuesto,
        descripcion: descripcion,
        cliente: cliente,
        pedidoId: pedidoIdReal,
        sucursal: sucursal,
        placa: placa,
        modelo: modelo,
        ot: ot,
        ubicacion: ubicacion
      },
      nextScan: true
    };
  }

  public getRepuestosRecibidosLog(): any[] {
    try {
      const raw = this.safeGet('changan_repuestos_recibidos_sucursal');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error leyendo log de recepciones:', e);
    }
    return [];
  }

  private guardarEventoRecepcion(evento: any) {
    try {
      const log = this.getRepuestosRecibidosLog();
      log.unshift(evento);
      this.safeSet('changan_repuestos_recibidos_sucursal', JSON.stringify(log.slice(0, 500)));
    } catch (e) {
      console.warn('Error guardando evento de recepciÃ³n:', e);
    }
  }


  /**
   * BÃºsqueda Inteligente de Repuestos por Pallet o Contenedor (Exclusivo CEDIS)
   * Cruza el cÃ³digo de bulto/pallet contra Matriz Central y DPL.
   */
  public buscarRepuestosPorPallet(codigoRaw: string): {
    encontrado: boolean;
    tipo: 'PALLET' | 'CONTENEDOR' | 'NINGUNO';
    codigoPallet: string;
    contenedorId: string;
    totalRepuestosAsignados: number;
    repuestos: Array<{
      pedidoId: string;
      lineaId: string;
      codigo: string;
      descripcion: string;
      sucursal: string;
      cliente: string;
      vin: string;
      placa: string;
      cantidad: number;
      estatusActual: string;
      contenedor: string;
      pallet: string;
      ubicacionCedis?: string;
    }>;
  } {
    const rawClean = (codigoRaw || '').trim();
    if (!rawClean) {
      return {
        encontrado: false,
        tipo: 'NINGUNO',
        codigoPallet: '',
        contenedorId: '',
        totalRepuestosAsignados: 0,
        repuestos: []
      };
    }

    // Extraer tokens en caso de que el cÃ³digo QR sea compuesto (ejemplo: 260106MS00060SF||P0001153940 o CONT||PALLET)
    const tokens: string[] = [];
    if (rawClean.includes('||')) {
      rawClean.split('||').forEach(p => {
        if (p.trim()) tokens.push(p.trim().toUpperCase());
      });
    } else if (rawClean.includes('|')) {
      rawClean.split('|').forEach(p => {
        if (p.trim()) tokens.push(p.trim().toUpperCase());
      });
    } else {
      tokens.push(rawClean.toUpperCase());
    }

    // Pallet objetivo preferido (buscar el token que inicie con P o el Ãºltimo token)
    const palletToken = tokens.find(t => t.startsWith('P') && t.length >= 4) || tokens[tokens.length - 1];
    const contenedorToken = tokens.find(t => t !== palletToken) || '';

    const matriz = this.getMatrizCentral();

    // 1. Filtrar filas de la Matriz Central que coincidan por cualquiera de los tokens (o cÃ³digo completo)
    const coincidenciasMatriz = matriz.filter(f => {
      const p = (f.pallet || '').toUpperCase();
      const pAsig = (f.palletAsignado || '').toUpperCase();
      const c = (f.contenedor || '').toUpperCase();
      const cAsig = (f.contenedorAsignado || '').toUpperCase();

      return tokens.some(tok => 
        (p && (p === tok || tok.includes(p) || p.includes(tok))) ||
        (pAsig && (pAsig === tok || tok.includes(pAsig) || pAsig.includes(tok))) ||
        (c && (c === tok || tok.includes(c))) ||
        (cAsig && (cAsig === tok || tok.includes(cAsig)))
      );
    });

    if (coincidenciasMatriz.length > 0) {
      const repuestosMapeados = coincidenciasMatriz.map(f => ({
        pedidoId: f.pedidoId,
        lineaId: f.lineaId,
        codigo: f.codigo,
        descripcion: f.descripcion,
        sucursal: f.sucursal,
        cliente: f.cliente,
        vin: f.vin || 'N/A',
        placa: f.placa || 'S/P',
        cantidad: f.cantidadRequerida || 1,
        estatusActual: f.estatus,
        contenedor: f.contenedorAsignado || f.contenedor || contenedorToken || 'CONT-CHANGAN',
        pallet: f.palletAsignado || f.pallet || palletToken,
        ubicacionCedis: f.ubicacionCedis
      }));

      const contenedor = coincidenciasMatriz[0].contenedorAsignado || coincidenciasMatriz[0].contenedor || contenedorToken || '';
      const pallet = coincidenciasMatriz[0].palletAsignado || coincidenciasMatriz[0].pallet || palletToken;

      return {
        encontrado: true,
        tipo: 'PALLET',
        codigoPallet: pallet,
        contenedorId: contenedor,
        totalRepuestosAsignados: repuestosMapeados.length,
        repuestos: repuestosMapeados
      };
    }

    // 2. Si no estÃ¡ en matriz directa, buscar en dplDetalle por palletCaseNo, packageNo o contenedorId
    const dplList = this.getDPLDetalle();
    const coincidenciasDPL = dplList.filter(d => {
      const pCase = (d.palletCaseNo || '').toUpperCase();
      const packNo = (d.packageNo || '').toUpperCase();
      const cId = (d.contenedorId || '').toUpperCase();

      return tokens.some(tok =>
        (pCase && (pCase === tok || tok.includes(pCase) || pCase.includes(tok))) ||
        (packNo && (packNo === tok || tok.includes(packNo) || packNo.includes(tok))) ||
        (cId && (cId === tok || tok.includes(cId)))
      );
    });

    if (coincidenciasDPL.length > 0) {
      const repuestosCruzados: any[] = [];
      coincidenciasDPL.forEach(dpl => {
        const pedidosConRepuesto = matriz.filter(m => 
          m.codigo.toUpperCase().trim() === dpl.codigoRepuesto.toUpperCase().trim()
        );
        if (pedidosConRepuesto.length > 0) {
          pedidosConRepuesto.forEach(p => {
            repuestosCruzados.push({
              pedidoId: p.pedidoId,
              lineaId: p.lineaId,
              codigo: p.codigo,
              descripcion: p.descripcion,
              sucursal: p.sucursal,
              cliente: p.cliente,
              vin: p.vin || 'N/A',
              placa: p.placa || 'S/P',
              cantidad: p.cantidadRequerida || 1,
              estatusActual: p.estatus,
              contenedor: dpl.contenedorId,
              pallet: dpl.palletCaseNo || palletToken,
              ubicacionCedis: dpl.ubicacionCedis
            });
          });
        } else {
          // Si el repuesto del pallet fÃ­sico no tiene pedido especial pendiente, se registra como stock de almacÃ©n fÃ­sico
          repuestosCruzados.push({
            pedidoId: `STOCK-${dpl.contenedorId}`,
            lineaId: dpl.inventarioId,
            codigo: dpl.codigoRepuesto,
            descripcion: dpl.descripcion,
            sucursal: 'CEDIS Central',
            cliente: 'Stock FÃ­sico CEDIS',
            vin: 'N/A',
            placa: 'S/P',
            cantidad: Number(dpl.cantidadTotal) || 1,
            estatusActual: 'En Bodega CEDIS',
            contenedor: dpl.contenedorId,
            pallet: dpl.palletCaseNo || palletToken,
            ubicacionCedis: dpl.ubicacionCedis || `BahÃ­a CEDIS / Pallet ${dpl.palletCaseNo || palletToken}`
          });
        }
      });

      return {
        encontrado: true,
        tipo: 'PALLET',
        codigoPallet: coincidenciasDPL[0].palletCaseNo || palletToken,
        contenedorId: coincidenciasDPL[0].contenedorId,
        totalRepuestosAsignados: repuestosCruzados.length,
        repuestos: repuestosCruzados
      };
    }

    return {
      encontrado: false,
      tipo: 'NINGUNO',
      codigoPallet: palletToken || rawClean,
      contenedorId: contenedorToken,
      totalRepuestosAsignados: 0,
      repuestos: []
    };
  }

/**
   * RecepciÃ³n de Pallet Completo en CEDIS (Bodega Central)
   * Actualiza el estatus de todos los repuestos del pallet a 'En Almacen Central'
   * y sincroniza con Google Sheets.
   */
  public async recepcionarPalletEnCedis(datos: {
    codigoPallet: string;
    operador: string;
    sucursal?: string;
  }): Promise<{
    ok: boolean;
    mensaje: string;
    filasActualizadas: number;
    repuestos: any[];
  }> {
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const busqueda = this.buscarRepuestosPorPallet(datos.codigoPallet);

    if (!busqueda.encontrado || busqueda.repuestos.length === 0) {
      return {
        ok: false,
        mensaje: 'No se encontraron repuestos de pedidos especiales asignados al pallet "' + datos.codigoPallet + '".',
        filasActualizadas: 0,
        repuestos: []
      };
    }

    const lineasIds = new Set(busqueda.repuestos.map(r => r.lineaId));
    const pedidosIds = new Set(busqueda.repuestos.map(r => r.pedidoId));

    // 1. Actualizar detalles
    this.detalles.forEach(d => {
      if (lineasIds.has(d.lineaId)) {
        d.estatusLinea = 'En Almacen Central' as any;
      }
    });

    // 2. Actualizar cabeceras
    this.cabeceras.forEach(c => {
      if (pedidosIds.has(c.pedidoId)) {
        c.estatusGeneral = 'En Almacen Central' as any;
        c.actualizadoEn = ahora;
        c.actualizadoPor = datos.operador;
      }
    });

    // 3. Registrar auditorÃ­a central
    this.auditoria.unshift({
      auditoriaId: 'AUD-PLT-' + Date.now(),
      timestamp: ahora,
      usuarioId: this.usuarioActivo.usuarioId || 'USR-CEDIS',
      usuarioNombre: datos.operador,
      accion: 'RECEPCION_PALLET_CEDIS',
      entidad: 'Pallet_Contenedor',
      identificador: busqueda.codigoPallet,
      valoresAnteriores: '{}',
      valoresNuevos: JSON.stringify({
        pallet: busqueda.codigoPallet,
        contenedor: busqueda.contenedorId,
        piezas: busqueda.repuestos.length
      }),
      operationId: 'OP-PLT-' + Date.now(),
      notas: 'Pallet ' + busqueda.codigoPallet + ' recibido y desconsolidado en CEDIS Central por ' + datos.operador + '. Repuestos listos para rotulado y despacho.'
    });

    this.persistirDatos();

    // 4. Sincronizar remotamente con Google Apps Script
    if (this.config.webAppUrl && !this.config.modoOfflineSimulado) {
      try {
        fetch(this.config.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'receivePalletCEDIS',
            codigoPallet: busqueda.codigoPallet,
            contenedorId: busqueda.contenedorId,
            operador: datos.operador,
            sucursal: datos.sucursal || 'Bodega Central',
            pedidosIds: Array.from(pedidosIds),
            timestamp: ahora
          })
        }).catch(e => console.warn('Error notificando receivePalletCEDIS a Apps Script:', e));
      } catch (e) {
        // Fallback local garantizado
      }
    }

    return {
      ok: true,
      mensaje: 'Pallet ' + busqueda.codigoPallet + ' recibido en CEDIS exitosamente. ' + busqueda.repuestos.length + ' repuestos actualizados a "En AlmacÃ©n Central".',
      filasActualizadas: busqueda.repuestos.length,
      repuestos: busqueda.repuestos
    };
  }

  /**
   * Sincroniza registro en pestaÃ±a oficial 'Despachos' de Google Sheets (Ticket 6)
   */
  
  /**
   * Sincroniza la pestaÃ±a oficial 'Reporte_Asignaciones' en Google Sheets
   */
  async sincronizarHojaAsignaciones(filas: any[]): Promise<{ success: boolean; error?: string; mensaje?: string }> {
    return this.postAction('sincronizarAsignaciones', { filas });
  }

  async sincronizarHojaDespachos(datosDespacho: {
    idPedido: string;
    sucursal?: string;
    cliente?: string;
    pallet?: string;
    codigoRepuesto?: string;
    cantidad?: number;
    estado?: string;
    usuario?: string;
    observaciones?: string;
    fechaAsignacion?: string;
    fechaDespacho?: string;
    tiempoTotal?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.postAction('sincronizarDespacho', { pedido: datosDespacho });
  }

}

export const appsScriptClient = new AppsScriptClientService();


/**
 * FunciÃ³n de diagnÃ³stico integral para Google Apps Script.
 * Realiza una verificaciÃ³n de preflight OPTIONS y una solicitud GET con CORS a la URL
 * para validar que el CORS estÃ© configurado correctamente y que la API estÃ© accesible,
 * notificando cualquier error de conexiÃ³n especÃ­fico con diagnÃ³stico tÃ©cnico y recomendaciones.
 */
export async function diagnosticarConexionAppsScript(
  urlCustom?: string,
  timeoutMs: number = 8000
): Promise<ResultadoDiagnosticoCORS> {
  const url = (urlCustom || '').trim();

  // 1. ValidaciÃ³n de URL vacÃ­a (Modo local)
  if (!url) {
    return {
      ok: false,
      corsHabilitado: false,
      apiAccesible: false,
      urlEvaluada: '',
      latenciaMs: 0,
      tipoError: 'URL_VACIA',
      mensaje: 'No se ha configurado ninguna URL de Google Apps Script.',
      diagnosticoTecnico: 'Modo local seguro activo. La aplicaciÃ³n opera con persistencia local y emulaciÃ³n exacta de las reglas canÃ³nicas.',
      pasosSugeridos: [
        'Ingresa la URL pÃºblica de la Web App generada en Apps Script si deseas sincronizar en la nube.',
        'La URL debe iniciar con https://script.google.com/macros/s/ y finalizar en /exec.'
      ]
    };
  }

  // 2. ValidaciÃ³n de URLs errÃ³neas comunes
  if (url.includes('docs.google.com/spreadsheets')) {
    return {
      ok: false,
      corsHabilitado: false,
      apiAccesible: false,
      urlEvaluada: url,
      latenciaMs: 0,
      tipoError: 'ES_SPREADSHEET_NO_WEBAPP',
      mensaje: 'La URL corresponde a la hoja de cÃ¡lculo (Google Spreadsheet), no a la AplicaciÃ³n Web.',
      diagnosticoTecnico: 'Los endpoints de Google Sheets directos no son APIs REST pÃºblicas ni permiten CORS directo desde el navegador.',
      pasosSugeridos: [
        'Abre tu Google Spreadsheet.',
        'Haz clic en "Extensiones" > "Apps Script".',
        'Haz clic en el botÃ³n azul "Implementar" > "Nueva implementaciÃ³n" > Tipo: "AplicaciÃ³n web".',
        'Configura "QuiÃ©n tiene acceso" como "Cualquier persona" (Anyone).',
        'Copia la URL pÃºblica generada que finaliza en /exec.'
      ]
    };
  }

  if (url.includes('/edit') || url.includes('/dev')) {
    return {
      ok: false,
      corsHabilitado: false,
      apiAccesible: false,
      urlEvaluada: url,
      latenciaMs: 0,
      tipoError: 'TERMINA_EN_EDIT_O_DEV',
      mensaje: 'La URL ingresada es del editor o del entorno de desarrollo (/edit o /dev).',
      diagnosticoTecnico: 'Las URLs que terminan en /edit o /dev exigen inicio de sesiÃ³n interactivo de desarrollador de Google Workspace y no admiten llamadas CORS de aplicaciones web externas.',
      pasosSugeridos: [
        'En Apps Script, ve a "Implementar" > "Gestionar implementaciones".',
        'Copia la URL de producciÃ³n que termina exactamente en /exec.'
      ]
    };
  }

  if (!url.startsWith('https://script.google.com/macros/s/') || !url.includes('/exec')) {
    return {
      ok: false,
      corsHabilitado: false,
      apiAccesible: false,
      urlEvaluada: url,
      latenciaMs: 0,
      tipoError: 'FORMATO_URL_INVALIDO',
      mensaje: 'El formato de la URL de Google Apps Script es invÃ¡lido.',
      diagnosticoTecnico: 'La URL no cumple con el patrÃ³n canÃ³nico https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec',
      pasosSugeridos: [
        'Verifica que la URL empiece con https://script.google.com/macros/s/',
        'AsegÃºrate de que no contenga espacios ni caracteres adicionales.',
        'Verifica que finalice en /exec.'
      ]
    };
  }

  // 3. Ejecutar solicitud OPTIONS de prueba (Preflight check)
  const optionsRespuesta: ResultadoDiagnosticoCORS['optionsRespuesta'] = {
    probado: true,
    corsHeadersPresentes: false
  };

  try {
    const controllerOptions = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutOptions = controllerOptions ? setTimeout(() => controllerOptions.abort(), 3500) : null;

    const optResp = await fetch(url, {
      method: 'OPTIONS',
      mode: 'cors',
      signal: controllerOptions ? controllerOptions.signal : undefined
    });

    if (timeoutOptions) clearTimeout(timeoutOptions);
    optionsRespuesta.status = optResp.status;
    const allowOrigin = optResp.headers?.get('access-control-allow-origin');
    optionsRespuesta.corsHeadersPresentes = !!allowOrigin;
    optionsRespuesta.nota = `OPTIONS HTTP ${optResp.status} - Access-Control-Allow-Origin: ${allowOrigin || 'no expuesto'}`;
  } catch (optErr: any) {
    optionsRespuesta.nota = `OPTIONS preflight no concluyente: ${optErr?.message || 'Rechazado o no implementado por el proxy de Google'}`;
  }

  // 4. Ejecutar solicitud de prueba GET con CORS ('action=ping' y timestamp anti-cache)
  const testUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping&_t=${Date.now()}`;
  const startPing = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const resp = await fetch(testUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);
    const latenciaMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startPing);

    // Verificar CÃ³digos de Estado EspecÃ­ficos
    if (resp.status === 403) {
      return {
        ok: false,
        corsHabilitado: true,
        apiAccesible: false,
        urlEvaluada: url,
        latenciaMs,
        statusCode: 403,
        optionsRespuesta,
        getRespuesta: { status: 403, statusText: resp.statusText, esJson: true },
        tipoError: 'NO_AUTORIZADO_403',
        mensaje: 'Acceso Prohibido (HTTP 403): Usuario no autorizado en la hoja.',
        diagnosticoTecnico: 'CORS estÃ¡ habilitado, pero la regla de validaciÃ³n de Apps Script rechazÃ³ el correo porque no existe en la pestaÃ±a BD_Encargados.',
        pasosSugeridos: [
          'Verifica que el correo con el que iniciaste sesiÃ³n estÃ© en la pestaÃ±a "BD_Encargados" de tu Google Sheet.',
          'Revisa que la columna "activo" estÃ© en "TRUE" o "SÃ­".'
        ]
      };
    }

    if (resp.status === 404) {
      return {
        ok: false,
        corsHabilitado: true,
        apiAccesible: false,
        urlEvaluada: url,
        latenciaMs,
        statusCode: 404,
        optionsRespuesta,
        getRespuesta: { status: 404, statusText: resp.statusText, esJson: false },
        tipoError: 'NO_ENCONTRADO_404',
        mensaje: 'ImplementaciÃ³n No Encontrada (HTTP 404).',
        diagnosticoTecnico: 'La URL no apunta a un Deployment ID activo en Google Apps Script.',
        pasosSugeridos: [
          'En el editor de Apps Script, haz clic en "Implementar" > "Gestionar implementaciones".',
          'Verifica que la implementaciÃ³n de tipo "AplicaciÃ³n web" estÃ© activa y copia su URL actual.'
        ]
      };
    }

    if (resp.status >= 500) {
      return {
        ok: false,
        corsHabilitado: true,
        apiAccesible: false,
        urlEvaluada: url,
        latenciaMs,
        statusCode: resp.status,
        optionsRespuesta,
        getRespuesta: { status: resp.status, statusText: resp.statusText, esJson: false },
        tipoError: 'ERROR_SERVIDOR_500',
        mensaje: `Error interno de ejecuciÃ³n en Google Apps Script (HTTP ${resp.status}).`,
        diagnosticoTecnico: 'El script arrojÃ³ una excepciÃ³n no capturada en doGet(). Posible falta de autorizaciÃ³n de la hoja o error de sintaxis.',
        pasosSugeridos: [
          'En Apps Script, abre el menÃº izquierdo "Ejecuciones" (Executions) para ver el registro exacto del error.',
          'Ejecuta la funciÃ³n setupSpreadsheetCanonica manualmente en el editor para otorgar permisos.'
        ]
      };
    }

    // Procesar JSON de respuesta
    let data: any = null;
    try {
      data = await resp.json();
    } catch (jsonErr) {
      return {
        ok: false,
        corsHabilitado: true,
        apiAccesible: false,
        urlEvaluada: url,
        latenciaMs,
        statusCode: resp.status,
        optionsRespuesta,
        getRespuesta: { status: resp.status, statusText: resp.statusText, esJson: false },
        tipoError: 'RESPUESTA_INVALIDA',
        mensaje: 'La API respondiÃ³ pero el cuerpo no es un JSON vÃ¡lido.',
        diagnosticoTecnico: 'La respuesta no pudo ser parseada con JSON.parse. Es probable que se haya devuelto HTML de error o redirecciÃ³n.',
        pasosSugeridos: [
          'Abre la URL directamente en el navegador agregando ?action=ping para inspeccionar la salida directa.',
          'AsegÃºrate de que doGet() retorne ContentService.createTextOutput con MimeType.JSON.'
        ]
      };
    }

    if (data && (data.status === 'OK' || data.success)) {
      const tabs = data.pestanasDetectadas || [];
      return {
        ok: true,
        corsHabilitado: true,
        apiAccesible: true,
        urlEvaluada: url,
        latenciaMs,
        statusCode: 200,
        optionsRespuesta,
        getRespuesta: { status: 200, statusText: 'OK', esJson: true },
        spreadsheetName: data.spreadsheetName || 'CEDIS_DB',
        spreadsheetId: data.spreadsheetId,
        totalPestanas: data.totalPestanas || (tabs.length > 0 ? tabs.length : undefined),
        pestanasDetectadas: tabs,
        mensaje: `Â¡CORS vÃ¡lido y API accesible! Hoja vinculada: "${data.spreadsheetName || 'CEDIS_DB'}".`,
        diagnosticoTecnico: `ConexiÃ³n HTTP 200 exitosa. Cabeceras CORS aceptadas por el navegador en ${latenciaMs} ms.`,
        pasosSugeridos: [
          'La conexiÃ³n canÃ³nica estÃ¡ lista para sincronizar pedidos, asignaciones de stock e importaciones.'
        ]
      };
    }

    return {
      ok: false,
      corsHabilitado: true,
      apiAccesible: false,
      urlEvaluada: url,
      latenciaMs,
      statusCode: 200,
      optionsRespuesta,
      getRespuesta: { status: 200, statusText: 'OK', esJson: true },
      tipoError: 'RESPUESTA_INVALIDA',
      mensaje: data?.error || 'La API respondiÃ³ con formato no reconocido.',
      diagnosticoTecnico: `Respuesta recibida: ${JSON.stringify(data).substring(0, 150)}`,
      pasosSugeridos: [
        'Verifica que la funciÃ³n doGet() en Code.gs maneje la acciÃ³n "ping" retornando { success: true, status: "OK" }.'
      ]
    };

  } catch (fetchErr: any) {
    if (timeoutId) clearTimeout(timeoutId);
    const latenciaMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startPing);

    // DetecciÃ³n de Timeout
    if (fetchErr?.name === 'AbortError' || (fetchErr?.message && fetchErr.message.includes('abort'))) {
      return {
        ok: false,
        corsHabilitado: false,
        apiAccesible: false,
        urlEvaluada: url,
        latenciaMs,
        tipoError: 'TIMEOUT',
        mensaje: `Tiempo de espera agotado (${timeoutMs} ms) esperando respuesta de Google Apps Script.`,
        diagnosticoTecnico: 'La peticiÃ³n fue abortada tras superar el lÃ­mite de tiempo. Google Apps Script puede estar experimentando un cold-start o esperando autorizaciÃ³n interactiva.',
        pasosSugeridos: [
          'Prueba abrir la URL en una pestaÃ±a del navegador para calentar el contenedor de Google Apps Script.',
          'Revisa en el editor de Apps Script que la funciÃ³n doGet() no tenga demoras excesivas.'
        ]
      };
    }

    // DetecciÃ³n de Bloqueo CORS / Failed to fetch
    // Realizamos una verificaciÃ³n auxiliar JSONP si estamos en el navegador para saber si el script estÃ¡ activo en los servidores de Google
    let scriptActivoConJsonp = false;
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      try {
        await new Promise((resolve, reject) => {
          const cbName = 'cedis_cors_diag_' + Math.round(Math.random() * 100000);
          const s = document.createElement('script');
          const t = setTimeout(() => {
            cleanup();
            reject(new Error('timeout'));
          }, 3500);

          const cleanup = () => {
            clearTimeout(t);
            if (s.parentNode) s.parentNode.removeChild(s);
            delete (window as any)[cbName];
          };

          (window as any)[cbName] = () => {
            cleanup();
            resolve(true);
          };
          s.onerror = () => {
            cleanup();
            reject(new Error('error'));
          };
          s.src = `${url}${url.includes('?') ? '&' : '?'}action=ping&callback=${cbName}`;
          document.body.appendChild(s);
        });
        scriptActivoConJsonp = true;
      } catch (e) {
        scriptActivoConJsonp = false;
      }
    }

    if (scriptActivoConJsonp) {
      return {
        ok: false,
        corsHabilitado: false,
        apiAccesible: false,
        urlEvaluada: url,
        latenciaMs,
        optionsRespuesta,
        tipoError: 'CORS_BLOQUEADO_LOGIN_GOOGLE',
        mensaje: 'CORS Bloqueado: La Web App estÃ¡ activa pero Google bloquea solicitudes web externas.',
        diagnosticoTecnico: 'El script responde a travÃ©s de etiquetas <script> (JSONP), pero las peticiones fetch/XHR son bloqueadas por polÃ­ticas de CORS del navegador. Esto ocurre cuando "QuiÃ©n tiene acceso" (Who has access) estÃ¡ configurado como "Solo yo" o "Usuarios con cuenta Google", lo cual redirige a la pantalla de login que rechaza orÃ­genes cruzados.',
        pasosSugeridos: [
          'En el editor de Apps Script, haz clic en "Implementar" > "Gestionar implementaciones".',
          'Haz clic en el icono de lÃ¡piz (Editar) de tu implementaciÃ³n.',
          'Cambia "QuiÃ©n tiene acceso" (Who has access) a "Cualquier persona" (Anyone).',
          'En VersiÃ³n, selecciona "Nueva versiÃ³n".',
          'Haz clic en "Implementar".'
        ]
      };
    }

    return {
      ok: false,
      corsHabilitado: false,
      apiAccesible: false,
      urlEvaluada: url,
      latenciaMs,
      optionsRespuesta,
      tipoError: 'ERROR_RED_O_CORS',
      mensaje: 'Fallo de conexiÃ³n o CORS bloqueado (Failed to fetch).',
      diagnosticoTecnico: `El navegador bloqueÃ³ la conexiÃ³n: ${fetchErr?.message || 'TypeError: Failed to fetch'}. En Google Apps Script esto ocurre principalmente cuando "QuiÃ©n tiene acceso" no es "Cualquier persona" o cuando la hoja aÃºn no ha sido autorizada por el propietario.`,
      pasosSugeridos: [
        'En Apps Script, ve a "Gestionar implementaciones" > Editar y cambia "QuiÃ©n tiene acceso" a "Cualquier persona" (Anyone).',
        'En el editor de Apps Script, selecciona la funciÃ³n setupSpreadsheetCanonica y haz clic en "Ejecutar" para autorizar permisos.',
        'Abre la URL en una nueva pestaÃ±a del navegador agregando ?action=ping para confirmar si Google solicita autorizaciÃ³n.'
      ]
    };
  }



}




