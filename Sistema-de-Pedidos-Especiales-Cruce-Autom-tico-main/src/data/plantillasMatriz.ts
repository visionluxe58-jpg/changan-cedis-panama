import * as XLSX from 'xlsx';

export interface CampoDiccionario {
  nombre: string;
  clave: string;
  obligatorio: boolean;
  tipo: 'Texto' | 'Número' | 'Fecha' | 'Selección';
  valoresPermitidos?: string[];
  descripcion: string;
  ejemplo: string;
}

export interface DefinicionPlantilla {
  id: 'pedidos_sucursales' | 'matriz_completa' | 'manifiesto_dpl';
  titulo: string;
  subtitulo: string;
  nombreArchivo: string;
  descripcion: string;
  cabeceras: string[];
  filasEjemplo: (string | number)[][];
  campos: CampoDiccionario[];
  anchoColumnas: number[];
}

// 1. PLANTILLA ESTÁNDAR: REQUISICIONES Y PEDIDOS DE SUCURSALES (La más usada por talleres y agencias)
export const PLANTILLA_PEDIDOS_SUCURSALES: DefinicionPlantilla = {
  id: 'pedidos_sucursales',
  titulo: 'Plantilla 1: Carga Masiva de Pedidos y Requisiciones (Sucursales/Talleres)',
  subtitulo: 'Recomendada para importar solicitudes desde talleres mecánicos, colisión y mostradores con matching automático.',
  nombreArchivo: 'Plantilla_Pedidos_Sucursales_CEDIS_Changan',
  descripcion: 'Diseñada para que las sucursales o talleres carguen listados de repuestos requeridos. El sistema le asigna automáticamente correlativo, detecta piezas en inventario DPL y vincula contenedores/pallets.',
  cabeceras: [
    'ID_Pedido',
    'Fecha',
    'Prioridad',
    'Sucursal',
    'Asesor',
    'Cliente',
    'Placa',
    'Modelo_Changan',
    'VIN',
    'Numero_OR',
    'Cotizacion',
    'Codigo_OEM',
    'Codigo_Actualizado',
    'Descripcion_Repuesto',
    'Cantidad_Solicitada',
    'Observaciones'
  ],
  anchoColumnas: [16, 12, 22, 16, 18, 25, 12, 18, 20, 14, 14, 20, 20, 30, 16, 30],
  filasEjemplo: [
    [
      'PED-VL-4001',
      '2024-10-14',
      'VOR / Unidad Parada',
      'Villa Lucre',
      'Leidys Perez',
      'Camilo Rodríguez',
      'CR8921',
      'UNI-T 1.5T',
      'LS4A2D3C4P0198273',
      'OR-8921',
      'COT-8921',
      'S111F270108-0103',
      '',
      'Faro Delantero Derecho LED',
      1,
      'Cliente con auto varado en bahía 3 esperando pieza urgente'
    ],
    [
      'PED-CV-4002',
      '2024-10-14',
      'Garantía',
      'Costa Verde',
      'Carlos Mendoza',
      'Constructora del Istmo S.A.',
      '893201',
      'Hunter Pick-Up 4x4',
      'LS4A2B1A2P0049182',
      'OR-8922',
      'COT-8922',
      'F202F260100-0100',
      '',
      'Bomba de Agua Enfriamiento Motor',
      2,
      'Garantía aprobada por fábrica Changan'
    ],
    [
      'PED-TM-4003',
      '2024-10-14',
      'Chapistería y Colisión',
      'Tumba Muerto',
      'Alexis Rios',
      'Seguros FEDPA - Reclamo 9921',
      'AB4412',
      'Alsvin 1.4 MT',
      'LS4A1A1A1P0019284',
      'OR-8923',
      'COT-8923',
      'C301F280201-0200',
      '',
      'Parachoques Trasero Superior Completo',
      1,
      'Caso siniestro de colisión trasera'
    ],
    [
      'PED-C50-4004',
      '2024-10-14',
      'Taller Mecánico',
      'Calle 50',
      'Valeria Castillo',
      'Transportes Rápidos S.A.',
      '991023',
      'CS35 Plus Turbo',
      'LS4A3B2B3P0081726',
      'OR-8924',
      'COT-8924',
      'H151F230101-0100',
      '',
      'Juego Pastillas de Freno Delanteras Cerámicas',
      4,
      'Mantenimiento preventivo 40,000 km'
    ],
    [
      'PED-C50-4005',
      '2024-10-14',
      'Stock Regular',
      'Calle 50',
      'Valeria Castillo',
      'Mostrador Repuestos Calle 50',
      '',
      'CS55 Plus DCT',
      '',
      '',
      'COT-4510',
      'C101F110101-0100',
      '',
      'Elemento Filtro de Aceite Motor',
      10,
      'Reabastecimiento regular vitrina'
    ]
  ],
  campos: [
    {
      nombre: 'ID_Pedido',
      clave: 'pedidoId',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Código identificador del pedido (Ej. PED-VL-4001). Si se deja vacío, el sistema generará automáticamente el correlativo oficial con el prefijo de la sucursal.',
      ejemplo: 'PED-VL-4001'
    },
    {
      nombre: 'Fecha',
      clave: 'fecha',
      obligatorio: false,
      tipo: 'Fecha',
      descripcion: 'Fecha de emisión en formato YYYY-MM-DD. Si se deja en blanco, se asignará la fecha y hora exacta actual.',
      ejemplo: '2024-10-14'
    },
    {
      nombre: 'Prioridad',
      clave: 'prioridad',
      obligatorio: true,
      tipo: 'Selección',
      valoresPermitidos: [
        'VOR / Unidad Parada',
        'Garantía',
        'Chapistería y Colisión',
        'Taller Mecánico',
        'Stock Regular'
      ],
      descripcion: 'Nivel de urgencia según la jerarquía oficial de CEDIS. Determina el orden de asignación FIFO del stock.',
      ejemplo: 'VOR / Unidad Parada'
    },
    {
      nombre: 'Sucursal',
      clave: 'sucursal',
      obligatorio: true,
      tipo: 'Selección',
      valoresPermitidos: [
        'Villa Lucre',
        'Costa Verde',
        'Calle 50',
        'Tumba Muerto',
        'Chiriquí',
        'Santa María',
        'Bodega Central'
      ],
      descripcion: 'Sede o taller desde donde se emite la requisición.',
      ejemplo: 'Villa Lucre'
    },
    {
      nombre: 'Asesor',
      clave: 'asesor',
      obligatorio: true,
      tipo: 'Texto',
      descripcion: 'Nombre completo del asesor de servicio, repuestero o colaborador solicitante.',
      ejemplo: 'Leidys Perez'
    },
    {
      nombre: 'Cliente',
      clave: 'cliente',
      obligatorio: true,
      tipo: 'Texto',
      descripcion: 'Nombre del cliente particular, empresa de flota o aseguradora.',
      ejemplo: 'Camilo Rodríguez'
    },
    {
      nombre: 'Placa',
      clave: 'placa',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Matrícula o placa del vehículo (opcional).',
      ejemplo: 'CR8921'
    },
    {
      nombre: 'Modelo_Changan',
      clave: 'modelo',
      obligatorio: true,
      tipo: 'Selección',
      valoresPermitidos: [
        'CS35 Plus Turbo',
        'CS55 Plus DCT',
        'UNI-T 1.5T',
        'Hunter Pick-Up 4x4',
        'Alsvin 1.4 MT',
        'CS15 Confort',
        'X7 Plus 7P',
        'EADO EV460 Eléctrico',
        'Deepal S07',
        'General Changan'
      ],
      descripcion: 'Línea de vehículo Changan correspondiente a la pieza.',
      ejemplo: 'UNI-T 1.5T'
    },
    {
      nombre: 'VIN',
      clave: 'vin',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Número de chasis (VIN de 17 caracteres). Muy recomendado en VOR, Garantía y Colisión.',
      ejemplo: 'LS4A2D3C4P0198273'
    },
    {
      nombre: 'Numero_OR',
      clave: 'numeroOR',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Número de Orden de Reparación del taller (Ej. OR-8921).',
      ejemplo: 'OR-8921'
    },
    {
      nombre: 'Cotizacion',
      clave: 'cotizacion',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Número de cotización previa del DMS o mostrador.',
      ejemplo: 'COT-8921'
    },
    {
      nombre: 'Codigo_OEM',
      clave: 'codigoRepuesto',
      obligatorio: true,
      tipo: 'Texto',
      descripcion: 'Número de parte oficial de fábrica Changan. Campo MANDATORIO.',
      ejemplo: 'S111F270108-0103'
    },
    {
      nombre: 'Codigo_Actualizado',
      clave: 'codigoActualizado',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Código sustituto o reemplazo actualizado por catálogo.',
      ejemplo: 'S111F270108-0200'
    },
    {
      nombre: 'Descripcion_Repuesto',
      clave: 'descripcion',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Nombre o denominación clara de la pieza.',
      ejemplo: 'Faro Delantero Derecho LED'
    },
    {
      nombre: 'Cantidad_Solicitada',
      clave: 'cantidadSolicitada',
      obligatorio: true,
      tipo: 'Número',
      descripcion: 'Cantidad de unidades requeridas (número entero mayor o igual a 1).',
      ejemplo: '1'
    },
    {
      nombre: 'Observaciones',
      clave: 'observaciones',
      obligatorio: false,
      tipo: 'Texto',
      descripcion: 'Notas operativas, bahía de trabajo o detalles de entrega.',
      ejemplo: 'Vehículo detenido en bahía 3'
    }
  ]
};

// 2. PLANTILLA COMPLETA DE MATRIZ CENTRAL (Los 25 campos exactos del modelo central)
export const PLANTILLA_MATRIZ_CENTRAL_COMPLETA: DefinicionPlantilla = {
  id: 'matriz_completa',
  titulo: 'Plantilla 2: Matriz Central Consolidada Completa (Esquema Oficial 25 Campos)',
  subtitulo: 'Estructura canónica de la base de datos de CEDIS con información logística, asignaciones, pallets y despachos.',
  nombreArchivo: 'Plantilla_Matriz_Central_Consolidada_25_Campos',
  descripcion: 'Contiene exactamente las 25 columnas de la tabla central de CEDIS. Ideal para migración de datos históricos, auditorías o consolidación completa de hojas de cálculo.',
  cabeceras: [
    'Pedido_ID',
    'Linea_ID',
    'Fecha_Creacion',
    'Sucursal',
    'Colaborador_Asesor',
    'Tipo_Solicitud_Prioridad',
    'Cotizacion',
    'Cliente',
    'Placa',
    'Modelo_Changan',
    'VIN_Chasis',
    'Numero_OR',
    'Codigo_Repuesto_OEM',
    'Codigo_Actualizado',
    'Descripcion_Oficial',
    'Cantidad_Solicitada',
    'Cantidad_Asignada',
    'Cantidad_Despachada',
    'Saldo_Pendiente',
    'Contenedor_Asignado',
    'Pallet_Asignado',
    'Package_No',
    'Ubicacion_CEDIS',
    'Estatus_Linea',
    'Observaciones'
  ],
  anchoColumnas: [
    16, 16, 14, 16, 18, 22, 14, 24, 12, 18, 20, 14, 20, 20, 30, 14, 14, 14, 14, 18, 16, 14, 16, 16, 30
  ],
  filasEjemplo: [
    [
      'PED-VL-2101',
      'LIN-001',
      '2024-10-12',
      'Villa Lucre',
      'Leidys Perez',
      'VOR / Unidad Parada',
      'COT-7710',
      'Grupo Automotriz del Pacífico',
      'CR9912',
      'UNI-T 1.5T',
      'LS4A2D3C4P0198273',
      'OR-5501',
      'S111F270108-0103',
      '',
      'Faro Delantero Derecho LED',
      1,
      1,
      0,
      0,
      'TCLU8849201',
      'P001',
      'BOX-04',
      'CEDIS-A1',
      'Asignado',
      'Pieza en bahía CEDIS lista para despacho'
    ],
    [
      'PED-CV-2102',
      'LIN-002',
      '2024-10-13',
      'Costa Verde',
      'Carlos Mendoza',
      'Garantía',
      'COT-7711',
      'Constructora del Istmo S.A.',
      '882190',
      'Hunter Pick-Up 4x4',
      'LS4A2B1A2P0049182',
      'OR-5502',
      'F202F260100-0100',
      '',
      'Bomba de Agua Enfriamiento Motor',
      2,
      2,
      2,
      0,
      'TCLU8849201',
      'P002',
      'BOX-11',
      'CEDIS-A2',
      'Despachado',
      'Entregado a ruta de mensajería Costa Verde'
    ],
    [
      'PED-TM-2103',
      'LIN-003',
      '2024-10-14',
      'Tumba Muerto',
      'Alexis Rios',
      'Taller Mecánico',
      'COT-7712',
      'Renta Autos Panamá',
      '991023',
      'Alsvin 1.4 MT',
      'LS4A1A1A1P0019284',
      'OR-5503',
      'H151F230101-0100',
      '',
      'Pastillas de Freno Delanteras',
      4,
      0,
      0,
      4,
      '',
      '',
      '',
      '',
      'Pendiente',
      'Requiere arribo de contenedor marítimo'
    ]
  ],
  campos: [
    { nombre: 'Pedido_ID', clave: 'pedidoId', obligatorio: true, tipo: 'Texto', descripcion: 'Código de pedido padre', ejemplo: 'PED-VL-2101' },
    { nombre: 'Linea_ID', clave: 'lineaId', obligatorio: false, tipo: 'Texto', descripcion: 'Identificador de la fila/ítem (autogenerado si vacío)', ejemplo: 'LIN-001' },
    { nombre: 'Fecha_Creacion', clave: 'fechaCreacion', obligatorio: true, tipo: 'Fecha', descripcion: 'Fecha de ingreso (YYYY-MM-DD)', ejemplo: '2024-10-12' },
    { nombre: 'Sucursal', clave: 'sucursal', obligatorio: true, tipo: 'Selección', valoresPermitidos: ['Villa Lucre', 'Costa Verde', 'Calle 50', 'Tumba Muerto', 'Chiriquí', 'Santa María', 'Bodega Central'], descripcion: 'Sede solicitante', ejemplo: 'Villa Lucre' },
    { nombre: 'Colaborador_Asesor', clave: 'colaborador', obligatorio: true, tipo: 'Texto', descripcion: 'Asesor que tramitó el pedido', ejemplo: 'Leidys Perez' },
    { nombre: 'Tipo_Solicitud_Prioridad', clave: 'tipoSolicitud', obligatorio: true, tipo: 'Selección', valoresPermitidos: ['VOR / Unidad Parada', 'Garantía', 'Chapistería y Colisión', 'Taller Mecánico', 'Stock Regular'], descripcion: 'Nivel de prioridad FIFO', ejemplo: 'VOR / Unidad Parada' },
    { nombre: 'Cotizacion', clave: 'cotizacion', obligatorio: false, tipo: 'Texto', descripcion: 'No. cotización comercial', ejemplo: 'COT-7710' },
    { nombre: 'Cliente', clave: 'cliente', obligatorio: true, tipo: 'Texto', descripcion: 'Propietario o empresa cliente', ejemplo: 'Grupo Automotriz del Pacífico' },
    { nombre: 'Placa', clave: 'placa', obligatorio: false, tipo: 'Texto', descripcion: 'Placa del automóvil', ejemplo: 'CR9912' },
    { nombre: 'Modelo_Changan', clave: 'modeloChangan', obligatorio: true, tipo: 'Texto', descripcion: 'Modelo del vehículo', ejemplo: 'UNI-T 1.5T' },
    { nombre: 'VIN_Chasis', clave: 'vin', obligatorio: false, tipo: 'Texto', descripcion: 'Número de chasis (17 dígitos)', ejemplo: 'LS4A2D3C4P0198273' },
    { nombre: 'Numero_OR', clave: 'numeroOR', obligatorio: false, tipo: 'Texto', descripcion: 'Orden de Reparación del taller', ejemplo: 'OR-5501' },
    { nombre: 'Codigo_Repuesto_OEM', clave: 'codigoRepuesto', obligatorio: true, tipo: 'Texto', descripcion: 'Código de parte Changan', ejemplo: 'S111F270108-0103' },
    { nombre: 'Codigo_Actualizado', clave: 'codigoActualizado', obligatorio: false, tipo: 'Texto', descripcion: 'Reemplazo o código sustituto', ejemplo: 'S111F270108-0200' },
    { nombre: 'Descripcion_Oficial', clave: 'descripcionOficial', obligatorio: false, tipo: 'Texto', descripcion: 'Descripción técnica del repuesto', ejemplo: 'Faro Delantero Derecho LED' },
    { nombre: 'Cantidad_Solicitada', clave: 'cantidadSolicitada', obligatorio: true, tipo: 'Número', descripcion: 'Piezas requeridas', ejemplo: '1' },
    { nombre: 'Cantidad_Asignada', clave: 'cantidadAsignada', obligatorio: false, tipo: 'Número', descripcion: 'Piezas apartadas en CEDIS', ejemplo: '1' },
    { nombre: 'Cantidad_Despachada', clave: 'cantidadDespachada', obligatorio: false, tipo: 'Número', descripcion: 'Piezas ya despachadas', ejemplo: '0' },
    { nombre: 'Saldo_Pendiente', clave: 'saldoPendiente', obligatorio: false, tipo: 'Número', descripcion: 'Faltante por surtir', ejemplo: '0' },
    { nombre: 'Contenedor_Asignado', clave: 'contenedorAsignado', obligatorio: false, tipo: 'Texto', descripcion: 'ID del contenedor de origen', ejemplo: 'TCLU8849201' },
    { nombre: 'Pallet_Asignado', clave: 'palletAsignado', obligatorio: false, tipo: 'Texto', descripcion: 'Pallet físico donde se encuentra', ejemplo: 'P001' },
    { nombre: 'Package_No', clave: 'packageNo', obligatorio: false, tipo: 'Texto', descripcion: 'Número de caja/bulto', ejemplo: 'BOX-04' },
    { nombre: 'Ubicacion_CEDIS', clave: 'ubicacionCedis', obligatorio: false, tipo: 'Texto', descripcion: 'Estante o bahía en bodega', ejemplo: 'CEDIS-A1' },
    { nombre: 'Estatus_Linea', clave: 'estatusLinea', obligatorio: false, tipo: 'Selección', valoresPermitidos: ['Pendiente', 'Asignado', 'Despachado', 'Sin Stock'], descripcion: 'Estado de la línea', ejemplo: 'Asignado' },
    { nombre: 'Observaciones', clave: 'observaciones', obligatorio: false, tipo: 'Texto', descripcion: 'Anotaciones adicionales', ejemplo: 'Pieza en bahía CEDIS lista para despacho' }
  ]
};

// 3. PLANTILLA MANIFIESTO DPL / INVENTARIO FÍSICO DE CONTENEDORES
export const PLANTILLA_MANIFIESTO_DPL: DefinicionPlantilla = {
  id: 'manifiesto_dpl',
  titulo: 'Plantilla 3: Manifiesto DPL / Llegadas de Contenedores y Pallets',
  subtitulo: 'Para registrar el ingreso de nuevos contenedores marítimos, pallets, bultos y existencias a CEDIS.',
  nombreArchivo: 'Plantilla_Manifiesto_DPL_Contenedores_CEDIS',
  descripcion: 'Formato estándar para subir el despiece de un contenedor marítimo llegado de fábrica con número de contenedor, pallet, caja, repuestos y cantidades.',
  cabeceras: [
    'Contenedor_ID',
    'No_BL',
    'Fecha_Llegada',
    'Pallet_Case_No',
    'Package_No',
    'Codigo_Repuesto',
    'Descripcion_Oficial',
    'Cantidad_Total',
    'Ubicacion_CEDIS',
    'Estatus_Embarque'
  ],
  anchoColumnas: [18, 18, 14, 16, 14, 22, 30, 16, 16, 22],
  filasEjemplo: [
    ['TCLU8849201', 'BL-SH-2024-099', '2024-10-15', 'P001', 'BOX-01', 'S111F270108-0103', 'Faro Delantero Derecho LED', 10, 'CEDIS-A1', 'Recibido en CEDIS'],
    ['TCLU8849201', 'BL-SH-2024-099', '2024-10-15', 'P001', 'BOX-02', 'S111F270108-0104', 'Faro Delantero Izquierdo LED', 10, 'CEDIS-A1', 'Recibido en CEDIS'],
    ['TCLU8849201', 'BL-SH-2024-099', '2024-10-15', 'P002', 'BOX-03', 'F202F260100-0100', 'Bomba de Agua Enfriamiento Motor', 15, 'CEDIS-A2', 'Recibido en CEDIS'],
    ['MSKU4910283', 'BL-SH-2024-104', '2024-10-25', 'P003', 'BOX-01', 'C301F280201-0200', 'Parachoques Trasero Superior Completo', 6, 'CEDIS-B1', 'En Puerto Balboa'],
    ['MSKU4910283', 'BL-SH-2024-104', '2024-10-25', 'P004', 'BOX-02', 'H151F230101-0100', 'Juego Pastillas Freno Delanteras', 40, 'CEDIS-B2', 'Tránsito Marítimo']
  ],
  campos: [
    { nombre: 'Contenedor_ID', clave: 'contenedorId', obligatorio: true, tipo: 'Texto', descripcion: 'Número de contenedor marítimo (Ej. TCLU8849201)', ejemplo: 'TCLU8849201' },
    { nombre: 'No_BL', clave: 'blNumber', obligatorio: false, tipo: 'Texto', descripcion: 'Bill of Lading marítimo', ejemplo: 'BL-SH-2024-099' },
    { nombre: 'Fecha_Llegada', clave: 'fechaLlegada', obligatorio: true, tipo: 'Fecha', descripcion: 'Fecha de arribo a Panamá (YYYY-MM-DD)', ejemplo: '2024-10-15' },
    { nombre: 'Pallet_Case_No', clave: 'palletCaseNo', obligatorio: true, tipo: 'Texto', descripcion: 'Identificador del pallet o bulto (Ej. P001)', ejemplo: 'P001' },
    { nombre: 'Package_No', clave: 'packageNo', obligatorio: false, tipo: 'Texto', descripcion: 'Número de caja o submódulo', ejemplo: 'BOX-01' },
    { nombre: 'Codigo_Repuesto', clave: 'codigoRepuesto', obligatorio: true, tipo: 'Texto', descripcion: 'Código OEM Changan de la pieza', ejemplo: 'S111F270108-0103' },
    { nombre: 'Descripcion_Oficial', clave: 'descripcion', obligatorio: false, tipo: 'Texto', descripcion: 'Descripción oficial del repuesto', ejemplo: 'Faro Delantero Derecho LED' },
    { nombre: 'Cantidad_Total', clave: 'cantidadTotal', obligatorio: true, tipo: 'Número', descripcion: 'Cantidad de unidades contenidas', ejemplo: '10' },
    { nombre: 'Ubicacion_CEDIS', clave: 'ubicacionCedis', obligatorio: false, tipo: 'Texto', descripcion: 'Bahía o posición de almacenamiento en bodega', ejemplo: 'CEDIS-A1' },
    { nombre: 'Estatus_Embarque', clave: 'estatusEmbarque', obligatorio: false, tipo: 'Selección', valoresPermitidos: ['Recibido en CEDIS', 'En Puerto Balboa', 'Tránsito Marítimo'], descripcion: 'Fase de la importación', ejemplo: 'Recibido en CEDIS' }
  ]
};

export const TODAS_LAS_PLANTILLAS: DefinicionPlantilla[] = [
  PLANTILLA_PEDIDOS_SUCURSALES,
  PLANTILLA_MATRIZ_CENTRAL_COMPLETA,
  PLANTILLA_MANIFIESTO_DPL
];

/**
 * Genera y descarga un archivo Excel (.xlsx) con estilos y anchos de columna
 */
export function descargarPlantillaExcel(plantilla: DefinicionPlantilla) {
  const datos = [plantilla.cabeceras, ...plantilla.filasEjemplo];
  const ws = XLSX.utils.aoa_to_sheet(datos);

  // Configurar anchos de columna automáticos
  ws['!cols'] = plantilla.anchoColumnas.map(w => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, plantilla.nombreArchivo.substring(0, 31));

  XLSX.writeFile(wb, `${plantilla.nombreArchivo}.xlsx`);
}

/**
 * Genera y descarga un archivo CSV con BOM para compatibilidad con Excel en español
 */
export function descargarPlantillaCSV(plantilla: DefinicionPlantilla) {
  const escaparCampo = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lineas = [
    plantilla.cabeceras.map(escaparCampo).join(','),
    ...plantilla.filasEjemplo.map(fila => fila.map(escaparCampo).join(','))
  ];

  const contenido = '\uFEFF' + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plantilla.nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copia las cabeceras y filas de ejemplo formateadas en texto tabulado para pegar directamente en Excel o Google Sheets
 */
export function copiarDatosTabulados(plantilla: DefinicionPlantilla): boolean {
  try {
    const lineas = [
      plantilla.cabeceras.join('\t'),
      ...plantilla.filasEjemplo.map(fila => fila.join('\t'))
    ];
    const texto = lineas.join('\n');
    navigator.clipboard.writeText(texto);
    return true;
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    return false;
  }
}
