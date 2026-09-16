import { 
  ItemOrderingTemplate, 
  MetodoTransporteFabrica, 
  CategoriaEstructuraRepuesto, 
  ReglaClasificacionEnvio,
  ResumenConsolidadoSucursal
} from '../types/cedis';
import * as XLSX from 'xlsx';

// Datos exactos extraídos del ejemplo oficial de fábrica proporcionado por el usuario
export const ITEMS_EJEMPLO_REPORTE_FABRICA: ItemOrderingTemplate[] = [
  {
    id: 'REP-01',
    partsCode: 'B511F210501-0100',
    orderingQuantity: 1,
    comment: 'AIR CLEANER ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 1.8,
    largoCm: 32,
    anchoCm: 25,
    altoCm: 20,
    pesoVolumetricoKg: 3.2,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Estructura plástica compacta y liviana (<5 kg). Óptimo para flete aéreo express.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2101',
    modeloChangan: 'UNI-T Elite',
    cliente: 'GRUPO SILABA S.A.',
    vin: 'LS4A2B999RA019283',
    numeroOR: 'OR-8921',
    tipoSolicitud: 'VOR / Unidad Parada',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-02',
    partsCode: 'B511F210714-0300',
    orderingQuantity: 1,
    comment: 'WATER OUTLET TUBE ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.6,
    largoCm: 28,
    anchoCm: 14,
    altoCm: 10,
    pesoVolumetricoKg: 0.78,
    categoriaEstructura: 'Refrigeración / A/C',
    motivoClasificacion: 'Tubería y manguera de refrigeración liviana. No excede límites dimensionales IATA.',
    esDGR: false,
    sucursal: 'Costa Verde',
    pedidoId: 'PED-CV-2102',
    modeloChangan: 'CS55 Plus DCT',
    cliente: 'TRANSPORTE LOGÍSTICA DEL PACÍFICO',
    vin: 'LS4A2C888RA028374',
    numeroOR: 'OR-8922',
    tipoSolicitud: 'Garantía',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-03',
    partsCode: 'B511F270102-0200-A',
    orderingQuantity: 1,
    comment: 'FR FENDER, RH',
    categorizacion: 'Maritimo',
    pesoUnitarioKg: 4.5,
    largoCm: 115,
    anchoCm: 75,
    altoCm: 25,
    pesoVolumetricoKg: 43.1,
    categoriaEstructura: 'Carrocería Mayor / Colisión',
    motivoClasificacion: 'Chapa de carrocería sobredimensionada. Alto cubicaje volumétrico (>40 kg vol.). Alto costo y riesgo de abolladura en aéreo.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2103',
    modeloChangan: 'CS35 Plus Turbo',
    cliente: 'AUTO MOTORES PANAMÁ',
    vin: 'LS4A2D777RA039485',
    numeroOR: 'OR-8923',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-04',
    partsCode: 'B511F270601-0102',
    orderingQuantity: 1,
    comment: 'HOOD LOCK ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.45,
    largoCm: 18,
    anchoCm: 12,
    altoCm: 8,
    pesoVolumetricoKg: 0.35,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Cerradura mecánica de capó de bajo peso. Despacho rápido en courier aéreo.',
    esDGR: false,
    sucursal: 'Calle 50',
    pedidoId: 'PED-C50-2104',
    modeloChangan: 'Alsvin 1.5L AT',
    cliente: 'SERVICIOS COMERCIALES DEL ISTMO',
    vin: 'LS4A1A666RA048596',
    numeroOR: 'OR-8924',
    tipoSolicitud: 'Taller Mecánico',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-05',
    partsCode: 'B511F270702-1203',
    orderingQuantity: 1,
    comment: 'RADIATOR BRACKET WELDING RH',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 1.1,
    largoCm: 35,
    anchoCm: 15,
    altoCm: 12,
    pesoVolumetricoKg: 1.26,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Soporte soldado de radiador mediano. Peso y dimensiones aceptables para bodega aérea.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2101',
    modeloChangan: 'UNI-T Elite',
    cliente: 'GRUPO SILABA S.A.',
    vin: 'LS4A2B999RA019283',
    numeroOR: 'OR-8921',
    tipoSolicitud: 'VOR / Unidad Parada',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-06',
    partsCode: 'B511F270702-1301-AA',
    orderingQuantity: 1,
    comment: 'BRACKET ASSY,FR UPPER MEMBE',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 1.4,
    largoCm: 45,
    anchoCm: 12,
    altoCm: 10,
    pesoVolumetricoKg: 1.08,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Travesaño superior frontal ligero. Relación peso/volumen balanceada para flete aéreo.',
    esDGR: false,
    sucursal: 'Tumba Muerto',
    pedidoId: 'PED-TM-2105',
    modeloChangan: 'Hunter 4x4 Diésel',
    cliente: 'INGENIERÍA Y CONSTRUCCIONES S.A.',
    vin: 'LS4A3E555RA059607',
    numeroOR: 'OR-8925',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-06'
  },
  {
    id: 'REP-07',
    partsCode: 'B511F270702-1401-AA',
    orderingQuantity: 1,
    comment: 'BRACKET ASSY,FR UPR MEMBER F',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 1.3,
    largoCm: 44,
    anchoCm: 12,
    altoCm: 10,
    pesoVolumetricoKg: 1.05,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Soporte estructural delantero modular menor. Envío aéreo preferente.',
    esDGR: false,
    sucursal: 'Tumba Muerto',
    pedidoId: 'PED-TM-2105',
    modeloChangan: 'Hunter 4x4 Diésel',
    cliente: 'INGENIERÍA Y CONSTRUCCIONES S.A.',
    vin: 'LS4A3E555RA059607',
    numeroOR: 'OR-8925',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-06'
  },
  {
    id: 'REP-08',
    partsCode: 'B511F270702-1501',
    orderingQuantity: 1,
    comment: 'RADIATOR BRACKET WELDING ASSY (SOPORTE SOLDADO DE RADIADOR)',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 1.9,
    largoCm: 50,
    anchoCm: 18,
    altoCm: 15,
    pesoVolumetricoKg: 2.7,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Ensamble de soporte soldado de radiador. No compromete cubicaje de contenedor aéreo.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2101',
    modeloChangan: 'UNI-T Elite',
    cliente: 'GRUPO SILABA S.A.',
    vin: 'LS4A2B999RA019283',
    numeroOR: 'OR-8921',
    tipoSolicitud: 'VOR / Unidad Parada',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-09',
    partsCode: 'B511F270803-0400-AA',
    orderingQuantity: 1,
    comment: 'FR TRIAGLE TRIM COVER ASSY,LH',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.15,
    largoCm: 16,
    anchoCm: 10,
    altoCm: 4,
    pesoVolumetricoKg: 0.13,
    categoriaEstructura: 'Molduras & Fijaciones',
    motivoClasificacion: 'Cubierta plástica triangular izquierda. Peso pluma y dimensión mínima.',
    esDGR: false,
    sucursal: 'Costa Verde',
    pedidoId: 'PED-CV-2102',
    modeloChangan: 'CS55 Plus DCT',
    cliente: 'TRANSPORTE LOGÍSTICA DEL PACÍFICO',
    vin: 'LS4A2C888RA028374',
    numeroOR: 'OR-8922',
    tipoSolicitud: 'Garantía',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-10',
    partsCode: 'B511F270803-0900-AA',
    orderingQuantity: 1,
    comment: 'FR TRIAGLE TRIM COVER ASSY,RH',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.15,
    largoCm: 16,
    anchoCm: 10,
    altoCm: 4,
    pesoVolumetricoKg: 0.13,
    categoriaEstructura: 'Molduras & Fijaciones',
    motivoClasificacion: 'Cubierta plástica triangular derecha. Idónea para aéreo express.',
    esDGR: false,
    sucursal: 'Costa Verde',
    pedidoId: 'PED-CV-2102',
    modeloChangan: 'CS55 Plus DCT',
    cliente: 'TRANSPORTE LOGÍSTICA DEL PACÍFICO',
    vin: 'LS4A2C888RA028374',
    numeroOR: 'OR-8922',
    tipoSolicitud: 'Garantía',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-11',
    partsCode: 'B511F271301-0200',
    orderingQuantity: 1,
    comment: 'FR BUMPER',
    categorizacion: 'Maritimo',
    pesoUnitarioKg: 6.8,
    largoCm: 185,
    anchoCm: 65,
    altoCm: 50,
    pesoVolumetricoKg: 120.25,
    categoriaEstructura: 'Carrocería Mayor / Colisión',
    motivoClasificacion: 'Defensa frontal de alta envergadura (>1.80m de largo). Peso volumétrico de 120 kg. Inviable en avión por sobredimensión.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2103',
    modeloChangan: 'CS35 Plus Turbo',
    cliente: 'AUTO MOTORES PANAMÁ',
    vin: 'LS4A2D777RA039485',
    numeroOR: 'OR-8923',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-12',
    partsCode: 'B511F271303-0200',
    orderingQuantity: 1,
    comment: 'RR BUMPER',
    categorizacion: 'Maritimo',
    pesoUnitarioKg: 6.2,
    largoCm: 180,
    anchoCm: 60,
    altoCm: 48,
    pesoVolumetricoKg: 103.68,
    categoriaEstructura: 'Carrocería Mayor / Colisión',
    motivoClasificacion: 'Defensa trasera sobredimensionada. Su flete aéreo costaría más que el repuesto. Debe viajar en contenedor marítimo FCL/LCL.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2103',
    modeloChangan: 'CS35 Plus Turbo',
    cliente: 'AUTO MOTORES PANAMÁ',
    vin: 'LS4A2D777RA039485',
    numeroOR: 'OR-8923',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-13',
    partsCode: 'B511F280306-0101',
    orderingQuantity: 1,
    comment: 'BATTERY TRAY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.95,
    largoCm: 34,
    anchoCm: 22,
    altoCm: 18,
    pesoVolumetricoKg: 2.69,
    categoriaEstructura: 'Pieza Mecánica / Motor',
    motivoClasificacion: 'Bandeja plástica portabatería (sin batería). Muy liviana y compacta.',
    esDGR: false,
    sucursal: 'Calle 50',
    pedidoId: 'PED-C50-2104',
    modeloChangan: 'Alsvin 1.5L AT',
    cliente: 'SERVICIOS COMERCIALES DEL ISTMO',
    vin: 'LS4A1A666RA048596',
    numeroOR: 'OR-8924',
    tipoSolicitud: 'Taller Mecánico',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-14',
    partsCode: 'C201108-3000',
    orderingQuantity: 10,
    comment: 'CLIP',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.01,
    largoCm: 3,
    anchoCm: 3,
    altoCm: 2,
    pesoVolumetricoKg: 0.01,
    categoriaEstructura: 'Molduras & Fijaciones',
    motivoClasificacion: 'Fijaciones plásticas y grapas de carrocería. Empaque en sobre/caja pequeña de mínima tara.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2103',
    modeloChangan: 'CS35 Plus Turbo',
    cliente: 'AUTO MOTORES PANAMÁ',
    vin: 'LS4A2D777RA039485',
    numeroOR: 'OR-8923',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-15',
    partsCode: 'C211F280104-0401',
    orderingQuantity: 1,
    comment: 'COOLING FAN ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 3.8,
    largoCm: 48,
    anchoCm: 45,
    altoCm: 14,
    pesoVolumetricoKg: 6.05,
    categoriaEstructura: 'Refrigeración / A/C',
    motivoClasificacion: 'Ensamble de electroventilador de enfriamiento. Vital para evitar calentamiento de motor.',
    esDGR: false,
    sucursal: 'Costa Verde',
    pedidoId: 'PED-CV-2102',
    modeloChangan: 'CS55 Plus DCT',
    cliente: 'TRANSPORTE LOGÍSTICA DEL PACÍFICO',
    vin: 'LS4A2C888RA028374',
    numeroOR: 'OR-8922',
    tipoSolicitud: 'Garantía',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-16',
    partsCode: 'C211F280104-1800-AA',
    orderingQuantity: 8,
    comment: 'PRESSURIZED LOW TEMPERATURE WATER RECEIVER ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 0.85,
    largoCm: 25,
    anchoCm: 20,
    altoCm: 18,
    pesoVolumetricoKg: 1.8,
    categoriaEstructura: 'Refrigeración / A/C',
    motivoClasificacion: 'Tanque de expansión presurizado para refrigerante. Lote liviano despachable vía aérea.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2101',
    modeloChangan: 'UNI-T Elite',
    cliente: 'GRUPO SILABA S.A.',
    vin: 'LS4A2B999RA019283',
    numeroOR: 'OR-8921',
    tipoSolicitud: 'VOR / Unidad Parada',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-17',
    partsCode: 'CD569F270502-0700-AA',
    orderingQuantity: 1,
    comment: 'WINDOW REGULATOR ASSY, RR FLOOR, LH',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 1.7,
    largoCm: 55,
    anchoCm: 30,
    altoCm: 10,
    pesoVolumetricoKg: 3.3,
    categoriaEstructura: 'Interior & Confort',
    motivoClasificacion: 'Mecanismo elevador de vidrio trasero izquierdo. Plano, liviano y apto para embalaje aéreo.',
    esDGR: false,
    sucursal: 'Tumba Muerto',
    pedidoId: 'PED-TM-2105',
    modeloChangan: 'Hunter 4x4 Diésel',
    cliente: 'INGENIERÍA Y CONSTRUCCIONES S.A.',
    vin: 'LS4A3E555RA059607',
    numeroOR: 'OR-8925',
    tipoSolicitud: 'Chapistería y Colisión',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-06'
  },
  {
    id: 'REP-18',
    partsCode: 'CD569F270803-0602',
    orderingQuantity: 2,
    comment: 'FR DOOR TRIM ASSY,RH',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 2.4,
    largoCm: 85,
    anchoCm: 55,
    altoCm: 16,
    pesoVolumetricoKg: 14.96,
    categoriaEstructura: 'Interior & Confort',
    motivoClasificacion: 'Panel de moldura interior de puerta delantera derecha. Permisible en aéreo por urgencia VOR/garantía.',
    esDGR: false,
    sucursal: 'Calle 50',
    pedidoId: 'PED-C50-2104',
    modeloChangan: 'Alsvin 1.5L AT',
    cliente: 'SERVICIOS COMERCIALES DEL ISTMO',
    vin: 'LS4A1A666RA048596',
    numeroOR: 'OR-8924',
    tipoSolicitud: 'Taller Mecánico',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-07'
  },
  {
    id: 'REP-19',
    partsCode: 'CD569F280104-0500-AB',
    orderingQuantity: 1,
    comment: 'COOLING FAN ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 3.9,
    largoCm: 48,
    anchoCm: 45,
    altoCm: 14,
    pesoVolumetricoKg: 6.05,
    categoriaEstructura: 'Refrigeración / A/C',
    motivoClasificacion: 'Ensamble de ventilador para radiador. Repuesto electromecánico prioritario de dimensiones medias.',
    esDGR: false,
    sucursal: 'Costa Verde',
    pedidoId: 'PED-CV-2102',
    modeloChangan: 'CS55 Plus DCT',
    cliente: 'TRANSPORTE LOGÍSTICA DEL PACÍFICO',
    vin: 'LS4A2C888RA028374',
    numeroOR: 'OR-8922',
    tipoSolicitud: 'Garantía',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  },
  {
    id: 'REP-20',
    partsCode: 'EA012-1100',
    orderingQuantity: 1,
    comment: 'COMPRESSOR ASSY',
    categorizacion: 'Aereo',
    pesoUnitarioKg: 6.5,
    largoCm: 26,
    anchoCm: 22,
    altoCm: 22,
    pesoVolumetricoKg: 2.52,
    categoriaEstructura: 'Refrigeración / A/C',
    motivoClasificacion: 'Compresor de A/C. Pieza densa de alta rotación pero de bajo volumen físico. Rápida desaduanización aérea.',
    esDGR: false,
    sucursal: 'Villa Lucre',
    pedidoId: 'PED-VL-2101',
    modeloChangan: 'UNI-T Elite',
    cliente: 'GRUPO SILABA S.A.',
    vin: 'LS4A2B999RA019283',
    numeroOR: 'OR-8921',
    tipoSolicitud: 'VOR / Unidad Parada',
    quincena: '1ra Quincena Septiembre 2026',
    fechaCreacion: '2026-09-08'
  }
];

// Reglas técnicas canónicas de clasificación de transporte según estructura y cubicaje
export const REGLAS_CLASIFICACION_ENVIO: ReglaClasificacionEnvio[] = [
  {
    id: 'REG-01',
    nombre: 'Carrocería Mayor & Chapa de Colisión',
    categoria: 'Carrocería Mayor / Colisión',
    transporteRecomendado: 'Maritimo',
    criterioPeso: 'Peso real > 5 kg o peso volumétrico > 35 kg',
    criterioVolumen: 'Largo > 100 cm o volumen > 0.15 m³',
    descripcionTecnica: 'Paragolpes delanteros/traseros (Bumpers), guardafangos (Fenders), capó (Hood), compuertas (Tailgate), puertas y parabrisas tienen gran superficie y volumen. En avión ocupan espacio de bodega sobredimensionado y sufren riesgo elevado de alabeo o abolladura.',
    ejemplosRepuestos: ['FR BUMPER', 'RR BUMPER', 'FR FENDER', 'HOOD ASSY', 'DOOR SHELL', 'WINDSHIELD']
  },
  {
    id: 'REG-02',
    nombre: 'Mecánica Mediana & Enfriamiento Motor',
    categoria: 'Refrigeración / A/C',
    transporteRecomendado: 'Aereo',
    criterioPeso: 'Peso < 10 kg',
    criterioVolumen: 'Dimensiones máximas < 60 cm en cualquier arista',
    descripcionTecnica: 'Compresores de A/C, electroventiladores, depósitos de refrigerante y mangueras tienen baja tara volumétrica y son componentes críticos para rehabilitar unidades paradas en taller en tiempos de 5 a 10 días.',
    ejemplosRepuestos: ['COMPRESSOR ASSY', 'COOLING FAN ASSY', 'WATER RECEIVER', 'WATER OUTLET TUBE']
  },
  {
    id: 'REG-03',
    nombre: 'Soportes, Fijaciones & Estructuras Menores',
    categoria: 'Pieza Mecánica / Motor',
    transporteRecomendado: 'Aereo',
    criterioPeso: 'Peso < 4 kg',
    criterioVolumen: 'Largo < 70 cm, volumen < 0.05 m³',
    descripcionTecnica: 'Soportes soldados de radiador (Radiator Bracket Welding), travesaños superiores (Upper Member), cerraduras de capó y bandejas de batería son piezas de rigidez estructural compacta con excelente ratio costo/flete aéreo.',
    ejemplosRepuestos: ['RADIATOR BRACKET WELDING', 'BRACKET UPPER MEMBER', 'HOOD LOCK', 'BATTERY TRAY']
  },
  {
    id: 'REG-04',
    nombre: 'Molduras, Grapas & Clips de Fijación',
    categoria: 'Molduras & Fijaciones',
    transporteRecomendado: 'Aereo',
    criterioPeso: 'Peso < 1.5 kg',
    criterioVolumen: 'Dimensiones < 30 cm',
    descripcionTecnica: 'Clips, tapetas triangulares, emblemas, sellos y pernos se consolidan en paquetería de mínima dimensión sin impactar el flete por peso volumétrico.',
    ejemplosRepuestos: ['CLIP', 'TRIANGLE TRIM COVER', 'EMBLEM', 'WEATHERSTRIP FASTENER']
  },
  {
    id: 'REG-05',
    nombre: 'Componentes Eléctricos & Módulos Electrónicos',
    categoria: 'Eléctrico & Electrónica',
    transporteRecomendado: 'Aereo',
    criterioPeso: 'Peso < 5 kg',
    criterioVolumen: 'Dimensiones < 40 cm',
    descripcionTecnica: 'Módulos ECU, BCM, sensores de oxígeno, alternadores y arneses de cableado son de alto valor unitario y bajo volumen. El flete aéreo express protege la integridad de los microchips contra la humedad marítima prolongada.',
    ejemplosRepuestos: ['ENGINE CONTROL MODULE (ECM)', 'BODY CONTROL MODULE (BCM)', 'OXYGEN SENSOR', 'ALTERNATOR']
  },
  {
    id: 'REG-06',
    nombre: 'Powertrain Pesado (Bloque de Motor & Transmisión)',
    categoria: 'Pieza Mecánica / Motor',
    transporteRecomendado: 'Maritimo',
    criterioPeso: 'Peso > 30 kg',
    criterioVolumen: 'Embalaje en huacal de madera / pallet dedicado',
    descripcionTecnica: 'Motores completos (Long Block / Short Block), transmisiones automáticas/manuales y cajas de transferencia superan los límites de peso de aerolíneas comerciales de pasajeros y requieren flete marítimo en contenedor.',
    ejemplosRepuestos: ['ENGINE LONG BLOCK', 'TRANSMISSION ASSY', 'TRANSFER CASE', 'DIFFERENTIAL ASSY']
  },
  {
    id: 'REG-07',
    nombre: 'Protocolo Especial DGR / Mercancías Peligrosas',
    categoria: 'Seguridad Pirotécnica (DGR)',
    transporteRecomendado: 'Maritimo',
    criterioPeso: 'Variable',
    criterioVolumen: 'Regulado por normativas IATA DGR Clase 9 / UN 3268',
    descripcionTecnica: 'Las bolsas de aire (Airbags de conductor, pasajero, cortina) y pretensores de cinturón contienen generadores de gas pirotécnicos. Por regulación aérea estricta (IATA), requieren embalaje certificado UN, declaración Shipper DGR y solo viajan en cargueros exclusivos (CAO) con altas tarifas punitivas, por lo que la política óptima es embarque marítimo programado.',
    ejemplosRepuestos: ['DRIVER AIRBAG ASSY', 'PASSENGER AIRBAG ASSY', 'CURTAIN AIRBAG', 'SEATBELT PRE-TENSIONER']
  }
];

// Motor de clasificación algorítmica de repuestos
export function clasificarRepuesto(
  codigo: string,
  descripcion: string,
  pesoRealKg?: number,
  dimensiones?: { largo: number; ancho: number; alto: number }
): {
  categorizacion: MetodoTransporteFabrica;
  motivo: string;
  categoria: CategoriaEstructuraRepuesto;
  esDGR: boolean;
  pesoUnitarioKg: number;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  pesoVolumetricoKg: number;
} {
  const desc = descripcion.toUpperCase();
  const cod = codigo.toUpperCase();

  // 1. Detección prioritaria de Material Peligroso DGR (Airbags, pirotécnicos, baterías HV)
  const esAirbagDgr = 
    desc.includes('AIRBAG') || 
    desc.includes('AIR BAG') || 
    desc.includes('INFLATOR') || 
    desc.includes('PRE-TENSIONER') ||
    desc.includes('PRETENSIONER') ||
    desc.includes('BOLSA DE AIRE');

  if (esAirbagDgr) {
    const l = dimensiones?.largo || 30;
    const w = dimensiones?.ancho || 28;
    const h = dimensiones?.alto || 20;
    const pReal = pesoRealKg || 3.2;
    const pVol = Number(((l * w * h) / 5000).toFixed(2));
    return {
      categorizacion: 'Maritimo',
      motivo: 'Regulación IATA Clase 9 (UN 3268 - Dispositivos de Seguridad Pirotécnicos). Alto recargo y restricción aérea. Recomendado Marítimo.',
      categoria: 'Seguridad Pirotécnica (DGR)',
      esDGR: true,
      pesoUnitarioKg: pReal,
      largoCm: l,
      anchoCm: w,
      altoCm: h,
      pesoVolumetricoKg: pVol
    };
  }

  // 2. Detección de piezas voluminosas de colisión / carrocería mayor
  const esColisionVoluminosa = 
    desc.includes('BUMPER') || 
    desc.includes('FENDER') || 
    desc.includes('HOOD') || 
    desc.includes('BONNET') ||
    desc.includes('CAPO') ||
    desc.includes('GUARDAFANGO') ||
    desc.includes('DEFENSA') ||
    desc.includes('PARAGOLPES') ||
    desc.includes('WINDSHIELD') ||
    desc.includes('PARABRISAS') ||
    desc.includes('DOOR SHELL') ||
    (desc.includes('DOOR') && !desc.includes('TRIM') && !desc.includes('LOCK') && !desc.includes('HANDLE')) ||
    desc.includes('TAILGATE') ||
    desc.includes('TRUNK LID') ||
    desc.includes('ROOF PANEL') ||
    desc.includes('QUARTER PANEL') ||
    desc.includes('CROSSMEMBER') ||
    desc.includes('CUNA DE MOTOR') ||
    desc.includes('PUENTE TRASERO');

  if (esColisionVoluminosa) {
    let l = dimensiones?.largo || 160;
    let w = dimensiones?.ancho || 60;
    let h = dimensiones?.alto || 40;
    let pReal = pesoRealKg || 6.5;

    if (desc.includes('FENDER')) {
      l = dimensiones?.largo || 115;
      w = dimensiones?.ancho || 75;
      h = dimensiones?.alto || 25;
      pReal = pesoRealKg || 4.5;
    } else if (desc.includes('HOOD')) {
      l = dimensiones?.largo || 145;
      w = dimensiones?.ancho || 110;
      h = dimensiones?.alto || 18;
      pReal = pesoRealKg || 14.0;
    }

    const pVol = Number(((l * w * h) / 5000).toFixed(2));
    return {
      categorizacion: 'Maritimo',
      motivo: `Pieza de carrocería sobredimensionada (Volumétrico estimado ${pVol} kg). Costo excesivo en aéreo y riesgo de deformación mecánica.`,
      categoria: 'Carrocería Mayor / Colisión',
      esDGR: false,
      pesoUnitarioKg: pReal,
      largoCm: l,
      anchoCm: w,
      altoCm: h,
      pesoVolumetricoKg: pVol
    };
  }

  // 3. Detección de tren motriz pesado
  const esMotorPesado = 
    desc.includes('LONG BLOCK') || 
    desc.includes('SHORT BLOCK') || 
    desc.includes('ENGINE ASSY') || 
    desc.includes('TRANSMISSION') || 
    desc.includes('GEARBOX') ||
    (desc.includes('MOTOR') && desc.includes('COMPLETO'));

  if (esMotorPesado) {
    const l = dimensiones?.largo || 90;
    const w = dimensiones?.ancho || 80;
    const h = dimensiones?.alto || 85;
    const pReal = pesoRealKg || 110.0;
    const pVol = Number(((l * w * h) / 5000).toFixed(2));
    return {
      categorizacion: 'Maritimo',
      motivo: `Tren motriz de alto peso masivo (${pReal} kg). Excede la capacidad estándar de bodega comercial. Despacho marítimo en pallet.`,
      categoria: 'Pieza Mecánica / Motor',
      esDGR: false,
      pesoUnitarioKg: pReal,
      largoCm: l,
      anchoCm: w,
      altoCm: h,
      pesoVolumetricoKg: pVol
    };
  }

  // 4. Piezas mecánicas, eléctricas, refrigeración y accesorios menores -> Aéreo
  let categoria: CategoriaEstructuraRepuesto = 'Pieza Mecánica / Motor';
  let l = dimensiones?.largo || 30;
  let w = dimensiones?.ancho || 20;
  let h = dimensiones?.alto || 15;
  let pReal = pesoRealKg || 1.5;

  if (desc.includes('COMPRESSOR') || desc.includes('FAN') || desc.includes('WATER') || desc.includes('RECEIVER') || desc.includes('RADIATOR BRACKET')) {
    categoria = 'Refrigeración / A/C';
    pReal = pesoRealKg || (desc.includes('COMPRESSOR') ? 6.5 : 2.5);
    l = dimensiones?.largo || 35;
    w = dimensiones?.ancho || 25;
    h = dimensiones?.alto || 20;
  } else if (desc.includes('CLIP') || desc.includes('TRIM') || desc.includes('COVER') || desc.includes('FASTENER')) {
    categoria = 'Molduras & Fijaciones';
    pReal = pesoRealKg || (desc.includes('CLIP') ? 0.01 : 0.3);
    l = dimensiones?.largo || (desc.includes('CLIP') ? 4 : 20);
    w = dimensiones?.ancho || (desc.includes('CLIP') ? 4 : 12);
    h = dimensiones?.alto || (desc.includes('CLIP') ? 3 : 6);
  } else if (desc.includes('REGULATOR') || desc.includes('WINDOW') || desc.includes('SEAT') || desc.includes('PANEL')) {
    categoria = 'Interior & Confort';
    pReal = pesoRealKg || 2.0;
    l = dimensiones?.largo || 50;
    w = dimensiones?.ancho || 30;
    h = dimensiones?.alto || 12;
  } else if (desc.includes('SENSOR') || desc.includes('ECU') || desc.includes('MODULE') || desc.includes('ALTERNATOR') || desc.includes('SWITCH')) {
    categoria = 'Eléctrico & Electrónica';
    pReal = pesoRealKg || 1.2;
    l = dimensiones?.largo || 22;
    w = dimensiones?.ancho || 18;
    h = dimensiones?.alto || 10;
  }

  // Si se proveyeron dimensiones o peso manual que excede los límites
  const pVol = Number(((l * w * h) / 5000).toFixed(2));
  const excedePeso = pReal > 18.0 || pVol > 25.0 || l > 120;

  if (excedePeso) {
    return {
      categorizacion: 'Maritimo',
      motivo: `Supera el límite de cubicaje o peso para flete aéreo económico (${pReal} kg real / ${pVol} kg volumétrico). Conviene consolidar vía marítima.`,
      categoria,
      esDGR: false,
      pesoUnitarioKg: pReal,
      largoCm: l,
      anchoCm: w,
      altoCm: h,
      pesoVolumetricoKg: pVol
    };
  }

  return {
    categorizacion: 'Aereo',
    motivo: 'Estructura ligera/compacta (<15 kg y <120 cm). Ratio de peso volumétrico idóneo para importación aérea quincenal de fábrica.',
    categoria,
    esDGR: false,
    pesoUnitarioKg: pReal,
    largoCm: l,
    anchoCm: w,
    altoCm: h,
    pesoVolumetricoKg: pVol
  };
}

// Función para generar y exportar el libro Excel auténtico con las 5 pestañas exactas
export function exportarLibroExcelReporteFabrica(
  items: ItemOrderingTemplate[],
  nombreArchivo: string = 'Reporte_Fabrica_Changan_Quincena.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // 1. Pestaña: Ordering_Template (Columnas exactas del Excel del usuario)
  const dataOrdering = items.map((it) => ({
    'Parts code': it.partsCode,
    'Ordering Quantity': it.orderingQuantity,
    'Comment': it.comment,
    'Categorizacion': it.categorizacion
  }));
  const wsOrdering = XLSX.utils.json_to_sheet(dataOrdering);
  wsOrdering['!cols'] = [
    { wch: 26 }, // Parts code
    { wch: 18 }, // Ordering Quantity
    { wch: 45 }, // Comment
    { wch: 16 }  // Categorizacion
  ];
  XLSX.utils.book_append_sheet(wb, wsOrdering, 'Ordering_Template');

  // 2. Pestaña: Clasificación_Envío (Reglas técnicas y criterios de transporte)
  const dataClasificacion = REGLAS_CLASIFICACION_ENVIO.map((r) => ({
    'Categoría Estructural': r.categoria,
    'Transporte Recomendado': r.transporteRecomendado,
    'Criterio de Peso': r.criterioPeso,
    'Criterio de Cubicaje / Volumen': r.criterioVolumen,
    'Explicación Técnica Logística': r.descripcionTecnica,
    'Ejemplos Clave': r.ejemplosRepuestos.join(', ')
  }));
  const wsClasificacion = XLSX.utils.json_to_sheet(dataClasificacion);
  wsClasificacion['!cols'] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 30 },
    { wch: 30 },
    { wch: 60 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsClasificacion, 'Clasificación_Envío');

  // 3. Pestaña: Consolidado_Sucursales
  const sucursalesMap: Record<string, ResumenConsolidadoSucursal> = {};
  items.forEach((it) => {
    const suc = it.sucursal || 'Sin Sucursal Asignada';
    if (!sucursalesMap[suc]) {
      sucursalesMap[suc] = {
        sucursal: suc,
        totalLineas: 0,
        totalPiezas: 0,
        piezasAereo: 0,
        piezasMaritimo: 0,
        pesoTotalEstimadoKg: 0,
        pedidosVor: 0,
        porcentajeAereo: 0
      };
    }
    sucursalesMap[suc].totalLineas += 1;
    sucursalesMap[suc].totalPiezas += it.orderingQuantity;
    sucursalesMap[suc].pesoTotalEstimadoKg += (it.pesoUnitarioKg || 1) * it.orderingQuantity;
    if (it.categorizacion === 'Aereo') {
      sucursalesMap[suc].piezasAereo += it.orderingQuantity;
    } else {
      sucursalesMap[suc].piezasMaritimo += it.orderingQuantity;
    }
    if (it.tipoSolicitud === 'VOR / Unidad Parada') {
      sucursalesMap[suc].pedidosVor += 1;
    }
  });

  const dataConsolidado = Object.values(sucursalesMap).map((s) => ({
    'Sucursal Changan': s.sucursal,
    'Líneas Pedidas': s.totalLineas,
    'Total Piezas': s.totalPiezas,
    'Piezas Aéreo': s.piezasAereo,
    'Piezas Marítimo': s.piezasMaritimo,
    '% Aéreo': s.totalPiezas > 0 ? `${((s.piezasAereo / s.totalPiezas) * 100).toFixed(1)}%` : '0%',
    'Peso Estimado (kg)': Number(s.pesoTotalEstimadoKg.toFixed(2)),
    'Urgencias VOR': s.pedidosVor
  }));
  const wsConsolidado = XLSX.utils.json_to_sheet(dataConsolidado);
  wsConsolidado['!cols'] = [
    { wch: 26 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsConsolidado, 'Consolidado_Sucursales');

  // 4. Pestaña: Detalle_Pedidos_Mes
  const dataDetalle = items.map((it) => ({
    'Periodo Quincenal': it.quincena || '1ra Quincena Septiembre 2026',
    'Pedido CEDIS': it.pedidoId || 'N/A',
    'Sucursal': it.sucursal || 'Central',
    'Cliente': it.cliente || 'Consumidor Final',
    'Modelo Changan': it.modeloChangan || 'General',
    'VIN': it.vin || 'N/A',
    'Número O.R.': it.numeroOR || 'N/A',
    'Parts Code': it.partsCode,
    'Descripción Repuesto': it.comment,
    'Cantidad': it.orderingQuantity,
    'Categorización': it.categorizacion,
    'Tipo Solicitud': it.tipoSolicitud || 'General',
    'Peso Unit. (kg)': it.pesoUnitarioKg,
    'Volumétrico (kg)': it.pesoVolumetricoKg,
    'Justificación Técnica': it.motivoClasificacion
  }));
  const wsDetalle = XLSX.utils.json_to_sheet(dataDetalle);
  wsDetalle['!cols'] = [
    { wch: 25 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
    { wch: 14 },
    { wch: 22 },
    { wch: 35 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle_Pedidos_Mes');

  // 5. Pestaña: Protocolo_DGR_Airbag
  const dataDGR = [
    {
      'Código UN': 'UN 3268',
      'Clase IATA': 'Clase 9 - Mercancías Peligrosas Diversas',
      'Denominación Oficial': 'SAFETY DEVICES, electrically initiated',
      'Aplica a': 'Módulos de Airbag de Conductor, Pasajero, Cortina, Pretensores de Cinturón de Seguridad',
      'Requisito Aéreo': 'Embalaje con homologación UN Pop-box, declaración de expedidor DGR, flete en carguero exclusivo (CAO). Tarifa punitiva $250+ por bulto.',
      'Recomendación CEDIS': 'Embarque consolidado vía Marítima (LCL/FCL) con certificado MSDS de Changan Automobile Ltd.'
    },
    {
      'Código UN': 'UN 3480 / UN 3481',
      'Clase IATA': 'Clase 9 - Baterías de Ion de Litio',
      'Denominación Oficial': 'LITHIUM ION BATTERIES',
      'Aplica a': 'Baterías de tracción híbridas/EV, baterías de respaldo de alta capacidad',
      'Requisito Aéreo': 'Carga máxima estado de carga <30% SoC, embalaje certificado UN Clase 9, prohibido en vuelos de pasajeros.',
      'Recomendación CEDIS': 'Despacho Marítimo estricto.'
    },
    {
      'Código UN': 'UN 3159',
      'Clase IATA': 'Clase 2.2 - Gases No Inflamables No Tóxicos',
      'Denominación Oficial': '1,1,1,2-TETRAFLUOROETHANE (GAS REFRIGERANT R134a)',
      'Aplica a': 'Cilindros de gas refrigerante para aire acondicionado',
      'Requisito Aéreo': 'Cilindros a presión con válvula de seguridad y embalaje especial.',
      'Recomendación CEDIS': 'Abastecimiento local o flete marítimo.'
    }
  ];
  const wsDGR = XLSX.utils.json_to_sheet(dataDGR);
  wsDGR['!cols'] = [
    { wch: 16 },
    { wch: 35 },
    { wch: 35 },
    { wch: 45 },
    { wch: 65 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDGR, 'Protocolo_DGR_Airbag');

  // Descarga del archivo en el navegador
  XLSX.writeFile(wb, nombreArchivo);
}
