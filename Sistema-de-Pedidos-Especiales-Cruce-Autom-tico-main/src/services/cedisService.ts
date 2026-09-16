import { 
  Asesor, 
  Pedido, 
  ContenedorManifiesto, 
  DetalleDPL, 
  MovimientoAuditoria, 
  CedisKPIs, 
  SolicitudPayload,
  TipoSolicitud,
  SheetsConfig
} from '../types/cedis';
import { appendSheetValues, getSheetValues } from '../utils/googleSheets';

const STORAGE_KEYS = {
  PEDIDOS: 'changan_cedis_pedidos_v1',
  CONTENEDORES: 'changan_cedis_contenedores_v1',
  DETALLE_DPL: 'changan_cedis_detalle_dpl_v1',
  ASESORES: 'changan_cedis_asesores_v1',
  AUDITORIA: 'changan_cedis_auditoria_v1',
  SHEETS_CONFIG: 'changan_cedis_sheets_config_v1',
};

// Asesores oficiales de Changan Auto Panamá
export const INITIAL_ASESORES: Asesor[] = [
  {
    nombre: 'Leidys Perez',
    sucursal: 'Villa Lucre',
    departamento: 'Mostrador',
    cargo: 'Ventas Mostrador',
    contacto: '+507 6561-1360',
    correo: 'repuestos@changanpanama.com',
    estado: 'Activo',
    habilitadoMovil: 'Sí'
  },
  {
    nombre: 'Edwin Blanco',
    sucursal: 'Villa Lucre',
    departamento: 'Chapistería',
    cargo: 'Chapisteria',
    contacto: '+507 6561-1360',
    correo: 'repuestos@changanpanama.com',
    estado: 'Activo',
    habilitadoMovil: 'Sí'
  },
  {
    nombre: 'Carlos Mendoza',
    sucursal: 'Costa Verde',
    departamento: 'Taller',
    cargo: 'Jefe de Taller',
    contacto: '+507 6712-4490',
    correo: 'taller.costaverde@changanpanama.com',
    estado: 'Activo',
    habilitadoMovil: 'Sí'
  },
  {
    nombre: 'Valeria Castillo',
    sucursal: 'Calle 50',
    departamento: 'Garantías',
    cargo: 'Coordinadora de Garantías',
    contacto: '+507 6223-9081',
    correo: 'garantias@changanpanama.com',
    estado: 'Activo',
    habilitadoMovil: 'Sí'
  },
  {
    nombre: 'Alexis Rios',
    sucursal: 'Tumba Muerto',
    departamento: 'Colisión',
    cargo: 'Asesor Técnico',
    contacto: '+507 6901-2244',
    correo: 'repuestos.tm@changanpanama.com',
    estado: 'Activo',
    habilitadoMovil: 'Sí'
  }
];

// Contenedores iniciales de fábrica
export const INITIAL_CONTENEDORES: ContenedorManifiesto[] = [
  {
    contenedor: 'INV-CN-8902',
    proveedor: 'Mobitech Changan China Co., Ltd',
    poReferencia: 'PO-2026-CH-089',
    tipoTransporte: 'Marítimo 40HQ',
    fechaArribo: '2026-08-15',
    estado: 'FÍSICAMENTE RECIBIDO EN CEDIS',
    totalPiezas: 120,
    skusUnicos: 6,
    totalPallets: 4,
    totalAsignadas: 14,
    saldoLibreTotal: 106
  },
  {
    contenedor: 'INV-CN-9140',
    proveedor: 'Mobitech Changan China Co., Ltd',
    poReferencia: 'PO-2026-CH-112',
    tipoTransporte: 'Marítimo 40HQ',
    fechaArribo: '2026-09-02',
    estado: 'FÍSICAMENTE RECIBIDO EN CEDIS',
    totalPiezas: 85,
    skusUnicos: 5,
    totalPallets: 3,
    totalAsignadas: 5,
    saldoLibreTotal: 80
  }
];

// Detalle por Pallet y Repuesto Changan OEM (Kardex DPL)
export const INITIAL_DETALLE_DPL: DetalleDPL[] = [
  {
    uid: 'INV-CN-8902_1',
    contenedor: 'INV-CN-8902',
    pallet: 'P001',
    packageNo: 'PKG-01',
    codigoCompra: 'S111F270108-0103',
    codigoSuministrado: 'S111F270108-0103',
    descripcion: 'Puerta Delantera Derecha UNI-T',
    cantTotal: 6,
    despachado: 2,
    comprometido: 1,
    saldoLibre: 3,
    ubicacion: 'Bahía A-01 / Pallet P001',
    pedidosVinculados: 'PED-VL-2101 (1u)'
  },
  {
    uid: 'INV-CN-8902_2',
    contenedor: 'INV-CN-8902',
    pallet: 'P001',
    packageNo: 'PKG-02',
    codigoCompra: '8511F270102-0202-AA',
    codigoSuministrado: '8511F270102-0202-AA',
    descripcion: 'Faro Delantero LED Izquierdo CS55 Plus',
    cantTotal: 8,
    despachado: 0,
    comprometido: 2,
    saldoLibre: 6,
    ubicacion: 'Bahía A-02 / Pallet P001',
    pedidosVinculados: 'PED-CV-2102 (2u)'
  },
  {
    uid: 'INV-CN-8902_3',
    contenedor: 'INV-CN-8902',
    pallet: 'P002',
    packageNo: 'PKG-03',
    codigoCompra: 'F202F260100',
    codigoSuministrado: 'F202F260100',
    descripcion: 'Amortiguador Delantero Hunter 4x4',
    cantTotal: 24,
    despachado: 4,
    comprometido: 4,
    saldoLibre: 16,
    ubicacion: 'Rack B-12 / Pallet P002',
    pedidosVinculados: 'PED-TM-2103 (4u)'
  },
  {
    uid: 'INV-CN-8902_4',
    contenedor: 'INV-CN-8902',
    pallet: 'P003',
    packageNo: 'PKG-04',
    codigoCompra: 'C301F280201',
    codigoSuministrado: 'C301F280201',
    descripcion: 'Pastillas de Freno Delanteras Alsvin',
    cantTotal: 50,
    despachado: 10,
    comprometido: 5,
    saldoLibre: 35,
    ubicacion: 'Rack C-05 / Pallet P003',
    pedidosVinculados: ''
  },
  {
    uid: 'INV-CN-9140_1',
    contenedor: 'INV-CN-9140',
    pallet: 'P101',
    packageNo: 'PKG-01',
    codigoCompra: 'E101F310100',
    codigoSuministrado: 'E101F310100',
    descripcion: 'Radiador de Enfriamiento Motor CS35',
    cantTotal: 15,
    despachado: 0,
    comprometido: 2,
    saldoLibre: 13,
    ubicacion: 'Bahía D-01 / Pallet P101',
    pedidosVinculados: 'PED-C50-2104 (2u)'
  },
  {
    uid: 'INV-CN-9140_2',
    contenedor: 'INV-CN-9140',
    pallet: 'P102',
    packageNo: 'PKG-02',
    codigoCompra: 'H200F290400',
    codigoSuministrado: 'H200F290400',
    descripcion: 'Bomba de Agua Genuina UNI-K 2.0T',
    cantTotal: 20,
    despachado: 1,
    comprometido: 1,
    saldoLibre: 18,
    ubicacion: 'Rack E-08 / Pallet P102',
    pedidosVinculados: ''
  }
];

// Pedidos iniciales
export const INITIAL_PEDIDOS: Pedido[] = [
  {
    id: 'PED-VL-2101',
    prioridad: 'VOR / Unidad Parada',
    fecha: '2026-09-08 09:30',
    sucursal: 'Villa Lucre',
    asesor: 'Leidys Perez',
    cliente: 'GRUPO SILABA S.A.',
    modelo: 'UNI-T Elite',
    vin: 'LS4A2B999RA019283',
    ordenReparacion: 'OR-8921',
    codigoOEM: 'S111F270108-0103',
    descripcion: 'Puerta Delantera Derecha UNI-T',
    cantSolicitada: 1,
    cantAsignada: 1,
    estatusCruce: 'COMPROMETIDO en INV-CN-8902 • Pallet P001',
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P001',
    packageNo: 'PKG-01',
    observaciones: 'Cliente en taller con unidad parada urgente'
  },
  {
    id: 'PED-CV-2102',
    prioridad: 'Chapistería y Colisión',
    fecha: '2026-09-08 11:15',
    sucursal: 'Costa Verde',
    asesor: 'Carlos Mendoza',
    cliente: 'Aseguradora Fedpa / Auto Express',
    modelo: 'CS55 Plus DCT',
    vin: 'LS4A3C888TA029182',
    ordenReparacion: 'COL-4421',
    codigoOEM: '8511F270102-0202-AA',
    descripcion: 'Faro Delantero LED Izquierdo CS55 Plus',
    cantSolicitada: 2,
    cantAsignada: 2,
    estatusCruce: 'COMPROMETIDO en INV-CN-8902 • Pallet P001',
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P001',
    packageNo: 'PKG-02',
    observaciones: 'Reparación de frente por colisión'
  },
  {
    id: 'PED-TM-2103',
    prioridad: 'Taller Mecánico',
    fecha: '2026-09-09 14:00',
    sucursal: 'Tumba Muerto',
    asesor: 'Alexis Rios',
    cliente: 'Flotas Corporativas Changan',
    modelo: 'Hunter 4x4 Diesel',
    vin: 'LS4A4D777SA038271',
    ordenReparacion: 'MT-1092',
    codigoOEM: 'F202F260100',
    descripcion: 'Amortiguador Delantero Hunter 4x4',
    cantSolicitada: 4,
    cantAsignada: 4,
    estatusCruce: 'COMPROMETIDO en INV-CN-8902 • Pallet P002',
    contenedorAsignado: 'INV-CN-8902',
    palletAsignado: 'P002',
    packageNo: 'PKG-03',
    observaciones: 'Mantenimiento preventivo 40k km'
  },
  {
    id: 'PED-C50-2104',
    prioridad: 'Garantía',
    fecha: '2026-09-09 16:45',
    sucursal: 'Calle 50',
    asesor: 'Valeria Castillo',
    cliente: 'Roberto Gonzalez',
    modelo: 'CS35 Plus Turbo',
    vin: 'LS4A1A666PA048192',
    ordenReparacion: 'GAR-3329',
    codigoOEM: 'E101F310100',
    descripcion: 'Radiador de Enfriamiento Motor CS35',
    cantSolicitada: 2,
    cantAsignada: 2,
    estatusCruce: 'COMPROMETIDO en INV-CN-9140 • Pallet P101',
    contenedorAsignado: 'INV-CN-9140',
    palletAsignado: 'P101',
    packageNo: 'PKG-01',
    observaciones: 'Reclamo aprobado por fábrica'
  },
  {
    id: 'PED-VL-2105',
    prioridad: 'Stock Regular',
    fecha: '2026-09-10 10:20',
    sucursal: 'Villa Lucre',
    asesor: 'Edwin Blanco',
    cliente: 'Inventario Mostrador Villa Lucre',
    modelo: 'Hunter / CS55',
    vin: 'LS4A9Z000YA999999',
    ordenReparacion: 'STK-5512',
    codigoOEM: 'K999F120000',
    descripcion: 'Juego de Espejos Retrovisores Eléctricos',
    cantSolicitada: 5,
    cantAsignada: 0,
    estatusCruce: 'Pendiente Fábrica • Sin arribo en CEDIS (0 stock)',
    contenedorAsignado: '',
    palletAsignado: '',
    packageNo: '',
    observaciones: 'Reabastecimiento regular'
  }
];

export const INITIAL_AUDITORIA: MovimientoAuditoria[] = [
  {
    fecha: '2026-09-08 10:00',
    tipoMovimiento: 'DESPACHO FÍSICO A SUCURSAL',
    idPedido: 'PED-VL-2090',
    codigoOEM: 'S111F270108-0103',
    descripcion: 'Puerta Delantera Derecha UNI-T',
    cantidad: 2,
    contenedor: 'INV-CN-8902',
    pallet: 'P001',
    responsable: 'Bodega Central CEDIS',
    observacion: 'Despacho completado hacia Villa Lucre trasbordador #4'
  },
  {
    fecha: '2026-09-09 15:30',
    tipoMovimiento: 'DESPACHO FÍSICO A SUCURSAL',
    idPedido: 'PED-TM-2095',
    codigoOEM: 'C301F280201',
    descripcion: 'Pastillas de Freno Delanteras Alsvin',
    cantidad: 10,
    contenedor: 'INV-CN-8902',
    pallet: 'P003',
    responsable: 'Bodega Central CEDIS',
    observacion: 'Entregado a mostrador Tumba Muerto'
  }
];

class CedisService {
  private pedidos: Pedido[] = [];
  private contenedores: ContenedorManifiesto[] = [];
  private detalleDPL: DetalleDPL[] = [];
  private asesores: Asesor[] = [];
  private auditoria: MovimientoAuditoria[] = [];
  private sheetsConfig: SheetsConfig = {
    spreadsheetId: '',
    accessToken: '',
    isAutoSync: false
  };

  constructor() {
    this.cargarDatosLocales();
  }

  private cargarDatosLocales(): void {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.PEDIDOS);
      this.pedidos = p ? JSON.parse(p) : INITIAL_PEDIDOS;

      const c = localStorage.getItem(STORAGE_KEYS.CONTENEDORES);
      this.contenedores = c ? JSON.parse(c) : INITIAL_CONTENEDORES;

      const d = localStorage.getItem(STORAGE_KEYS.DETALLE_DPL);
      this.detalleDPL = d ? JSON.parse(d) : INITIAL_DETALLE_DPL;

      const a = localStorage.getItem(STORAGE_KEYS.ASESORES);
      this.asesores = a ? JSON.parse(a) : INITIAL_ASESORES;

      const aud = localStorage.getItem(STORAGE_KEYS.AUDITORIA);
      this.auditoria = aud ? JSON.parse(aud) : INITIAL_AUDITORIA;

      const cfg = localStorage.getItem(STORAGE_KEYS.SHEETS_CONFIG);
      if (cfg) {
        this.sheetsConfig = JSON.parse(cfg);
      }
    } catch (e) {
      console.error('Error cargando datos locales:', e);
      this.pedidos = INITIAL_PEDIDOS;
      this.contenedores = INITIAL_CONTENEDORES;
      this.detalleDPL = INITIAL_DETALLE_DPL;
      this.asesores = INITIAL_ASESORES;
      this.auditoria = INITIAL_AUDITORIA;
    }
  }

  private guardarDatosLocales(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PEDIDOS, JSON.stringify(this.pedidos));
      localStorage.setItem(STORAGE_KEYS.CONTENEDORES, JSON.stringify(this.contenedores));
      localStorage.setItem(STORAGE_KEYS.DETALLE_DPL, JSON.stringify(this.detalleDPL));
      localStorage.setItem(STORAGE_KEYS.ASESORES, JSON.stringify(this.asesores));
      localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify(this.auditoria));
      localStorage.setItem(STORAGE_KEYS.SHEETS_CONFIG, JSON.stringify(this.sheetsConfig));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  public getAsesores(): Asesor[] {
    return [...this.asesores];
  }

  public getPedidos(): Pedido[] {
    return [...this.pedidos];
  }

  public getContenedores(): ContenedorManifiesto[] {
    return [...this.contenedores];
  }

  public getDetalleDPL(): DetalleDPL[] {
    return [...this.detalleDPL];
  }

  public getAuditoria(): MovimientoAuditoria[] {
    return [...this.auditoria];
  }

  public getSheetsConfig(): SheetsConfig {
    return { ...this.sheetsConfig };
  }

  public setSheetsConfig(cfg: Partial<SheetsConfig>): void {
    this.sheetsConfig = { ...this.sheetsConfig, ...cfg };
    this.guardarDatosLocales();
  }

  public getKPIs(): CedisKPIs {
    let totDpl = 0;
    let desp = 0;
    let comp = 0;
    let libre = 0;
    const skusSet = new Set<string>();

    this.detalleDPL.forEach(r => {
      totDpl += Number(r.cantTotal) || 0;
      desp += Number(r.despachado) || 0;
      comp += Number(r.comprometido) || 0;
      libre += Number(r.saldoLibre) || 0;
      if (r?.codigoCompra) skusSet.add(String(r.codigoCompra).trim().toUpperCase());
      if (r?.codigoSuministrado) skusSet.add(String(r.codigoSuministrado).trim().toUpperCase());
    });

    return {
      totalDpl: totDpl,
      despachado: desp,
      comprometido: comp,
      saldoLibre: libre,
      skus: skusSet.size
    };
  }

  /**
   * Valida si un cliente ya tiene una orden activa para este repuesto
   */
  public verificarDuplicadoActivo(
    cliente: string, 
    vin: string, 
    ordenRep: string, 
    codigoOEM: string
  ): Pedido | null {
    const cNorm = (cliente || '').trim().toLowerCase();
    const vNorm = (vin || '').trim().toUpperCase();
    const orNorm = (ordenRep || '').trim().toLowerCase();
    const codNorm = (codigoOEM || '').trim().toUpperCase();

    for (const ped of this.pedidos) {
      if (ped.estatusCruce.includes('CANCELADO') || ped.estatusCruce.includes('DESPACHADO FÍSICAMENTE')) {
        continue;
      }

      if (ped.codigoOEM.toUpperCase() === codNorm) {
        const matchVin = vNorm.length >= 8 && ped.vin.toUpperCase() === vNorm;
        const matchCliente = cNorm.length >= 4 && (ped.cliente.toLowerCase().includes(cNorm) || cNorm.includes(ped.cliente.toLowerCase()));
        const matchOR = orNorm.length >= 3 && ped.ordenReparacion.toLowerCase() === orNorm;

        if (matchVin || matchCliente || matchOR) {
          return ped;
        }
      }
    }
    return null;
  }

  /**
   * Procesa la solicitud enviada desde la sucursal o manual en CEDIS
   */
  public procesarSolicitud(payload: SolicitudPayload): {
    success: boolean;
    folio?: string;
    duplicado?: boolean;
    detalle?: Pedido;
    error?: string;
  } {
    // 1. Verificación de duplicados
    for (const it of payload.items) {
      const dup = this.verificarDuplicadoActivo(payload.cliente, payload.vin, payload.ordenReparacion, it.codigo);
      if (dup) {
        return {
          success: false,
          duplicado: true,
          error: `BLOQUEO DE SEGURIDAD OPERATIVA: El cliente "${dup.cliente}" ya tiene una orden activa (${dup.id}) para el repuesto [${dup.codigoOEM} - ${dup.descripcion}].`,
          detalle: dup
        };
      }
    }

    // 2. Generación de ID
    const prefijos: Record<string, string> = {
      'Costa Verde': 'CV',
      'Villa Lucre': 'VL',
      'Calle 50': 'C50',
      'Tumba Muerto': 'TM',
      'Chiriquí': 'CH',
      'Santa María': 'SM'
    };
    const pref = prefijos[payload.sucursal] || 'SUC';
    const consecutivo = 2100 + this.pedidos.length + 1;
    const idPedido = `PED-${pref}-${consecutivo}`;
    const fecha = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const nuevosPedidos: Pedido[] = payload.items.map((it: any) => ({
      id: idPedido,
      prioridad: payload.tipoSolicitud,
      fecha,
      sucursal: payload.sucursal,
      asesor: payload.encargado,
      cliente: payload.cliente || 'Consumidor Final',
      modelo: payload.modelo,
      vin: payload.vin.toUpperCase().trim(),
      ordenReparacion: payload.ordenReparacion,
      codigoOEM: it.codigo.toUpperCase().trim(),
      descripcion: String(it?.descripcion || '').trim(),
      cantSolicitada: Number(it.cantidad) || 1,
      cantAsignada: 0,
      estatusCruce: 'Pendiente Fábrica • Sin arribo en CEDIS (0 stock)',
      contenedorAsignado: '',
      palletAsignado: '',
      packageNo: '',
      observaciones: payload.observaciones || ''
    }));

    this.pedidos = [...nuevosPedidos, ...this.pedidos];
    // REGLA CRÍTICA DPL: Solo si está físicamente recibido se ejecuta cruce con matriz
    if (estadoNormalizado === 'FÍSICAMENTE RECIBIDO EN CEDIS') {
      this.sincronizarStockConMatriz();
    }
    this.guardarDatosLocales();

    // Sincronizar con Google Sheets si está configurado
    if (this.sheetsConfig.spreadsheetId && this.sheetsConfig.accessToken) {
      this.syncPedidoToSheets(nuevosPedidos).catch(err => console.warn('Sync a Sheets en background:', err));
    }

    return {
      success: true,
      folio: idPedido
    };
  }

  /**
   * Motor de Cruce y Conciliación Logística (Reglas #15 & #16 Changan)
   */
  public sincronizarStockConMatriz(): { success: boolean; matches: number; mensaje: string } {
    const jerarquiaPrioridades: Record<TipoSolicitud, number> = {
      'VOR / Unidad Parada': 1,
      'Garantía': 2,
      'Chapistería y Colisión': 3,
      'Taller Mecánico': 4,
      'Stock Regular': 5
    };

    // 1. Resetear asignaciones DPL temporales de pedidos no despachados
    this.detalleDPL.forEach(d => {
      d.comprometido = 0;
      const cantTot = Number(d.cantTotal) || 0;
      const desp = Number(d.despachado) || 0;
      d.saldoLibre = Math.max(0, cantTot - desp);
      d.pedidosVinculados = '';
    });

    this.pedidos.forEach(p => {
      const estCruce = p.estatusCruce || '';
      if (!estCruce.includes('DESPACHADO FÍSICAMENTE')) {
        p.cantAsignada = 0;
        p.estatusCruce = 'Pendiente Fábrica • Sin arribo en CEDIS (0 stock)';
        p.contenedorAsignado = '';
        p.palletAsignado = '';
        p.packageNo = '';
      }
    });

    // 2. Extraer pedidos pendientes ordenados por prioridad y fecha
    const pendientes = this.pedidos
      .filter(p => !(p.estatusCruce || '').includes('DESPACHADO FÍSICAMENTE') && (Number(p.cantAsignada) || 0) < (Number(p.cantSolicitada) || 0))
      .map(p => ({
        pedido: p,
        peso: (jerarquiaPrioridades as any)[p.prioridad] || 99,
        fecha: p.fecha ? new Date(p.fecha).getTime() : 0,
        faltante: (Number(p.cantSolicitada) || 0) - (Number(p.cantAsignada) || 0)
      }))
      .sort((a, b) => a.peso - b.peso || a.fecha - b.fecha);

    let coincidencias = 0;

    for (const item of pendientes) {
      const p = item.pedido;
      const codBuscado = (p.codigoOEM || '').toUpperCase().trim();
      if (!codBuscado) continue;

      for (const d of this.detalleDPL) {
        // REGLA CRÍTICA DPL: Solamente contenedores en estatus RECIBIDO pueden asignar repuestos.
        // Contenedores en EN TRÁNSITO o ADUANA quedan registrados para rastreo universal, pero NO asignan piezas.
        const dCont = (d.contenedor || '').trim().toLowerCase();
        const cont = this.contenedores.find(c => (c.contenedor || '').trim().toLowerCase() === dCont);
        const estadoC = (cont?.estado || '').trim().toUpperCase();
        if (!estadoC.includes('RECIBID') && !estadoC.includes('CONCILIAD')) {
          continue; // No asignar repuestos si no está físicamente recibido en CEDIS
        }

        const codCompra = (d.codigoCompra || '').toUpperCase().trim();
        const codSum = (d.codigoSuministrado || '').toUpperCase().trim();

        if ((codCompra === codBuscado || codSum === codBuscado) && (Number(d.saldoLibre) || 0) > 0) {
          const saldoLibre = Number(d.saldoLibre) || 0;
          const asignar = Math.min(item.faltante, saldoLibre);

          d.comprometido = (Number(d.comprometido) || 0) + asignar;
          d.saldoLibre = (Number(d.cantTotal) || 0) - (Number(d.despachado) || 0) - d.comprometido;
          d.pedidosVinculados = (d.pedidosVinculados ? d.pedidosVinculados + ', ' : '') + `${p.id} (${asignar}u)`;

          p.cantAsignada = (Number(p.cantAsignada) || 0) + asignar;
          item.faltante -= asignar;

          p.estatusCruce = `COMPROMETIDO en ${d.contenedor} • Pallet ${d.pallet || 'P001'}`;
          p.contenedorAsignado = d.contenedor || '';
          p.palletAsignado = d.pallet || '';
          p.packageNo = d.packageNo || '';

          coincidencias++;
          if (item.faltante <= 0) break;
        }
      }
    }

    // 3. Recalcular métricas de cada contenedor
    this.contenedores.forEach(c => {
      let asigTotal = 0;
      let libreTotal = 0;
      this.detalleDPL.filter(d => d.contenedor === c.contenedor).forEach(d => {
        asigTotal += d.comprometido;
        libreTotal += d.saldoLibre;
      });
      c.totalAsignadas = asigTotal;
      c.saldoLibreTotal = libreTotal;
    });

    this.guardarDatosLocales();

    return {
      success: true,
      matches: coincidencias,
      mensaje: `Cruce completado: Se asignaron quirúrgicamente ${coincidencias} repuestos según jerarquía de prioridad.`
    };
  }

  /**
   * Registro irreversible de Despacho Físico a Sucursal (Regla Operativa #15)
   */
  public registrarDespachoFisico(
    idPedido: string, 
    codigoRepuesto: string, 
    cantidad: number, 
    responsable: string = 'Bodega Central',
    notas: string = 'Salida irreversible de inventario'
  ): { success: boolean; mensaje?: string; error?: string } {
    const ped = this.pedidos.find(p => p.id === idPedido && p.codigoOEM.toUpperCase() === codigoRepuesto.toUpperCase());
    if (!ped) {
      return { success: false, error: 'Pedido no encontrado.' };
    }
    if (!ped.contenedorAsignado || !ped.palletAsignado) {
      return { success: false, error: `El pedido ${idPedido} no cuenta con un contenedor y pallet asignado.` };
    }

    const dplItem = this.detalleDPL.find(d => 
      d.contenedor === ped.contenedorAsignado && 
      d.pallet === ped.palletAsignado && 
      (d.codigoCompra.toUpperCase() === codigoRepuesto.toUpperCase() || d.codigoSuministrado.toUpperCase() === codigoRepuesto.toUpperCase())
    );

    if (!dplItem) {
      return { success: false, error: 'No se localizó la línea del repuesto en el pallet correspondiente.' };
    }

    const cantDesp = Number(cantidad) || 1;
    dplItem.comprometido = Math.max(0, dplItem.comprometido - cantDesp);
    dplItem.despachado += cantDesp;
    dplItem.saldoLibre = Math.max(0, dplItem.cantTotal - dplItem.despachado - dplItem.comprometido);

    ped.estatusCruce = 'DESPACHADO FÍSICAMENTE (En Ruta / Entregado)';

    // Auditoría
    this.auditoria.unshift({
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipoMovimiento: 'DESPACHO FÍSICO A SUCURSAL',
      idPedido,
      codigoOEM: codigoRepuesto,
      descripcion: ped.descripcion,
      cantidad: cantDesp,
      contenedor: ped.contenedorAsignado,
      pallet: ped.palletAsignado,
      responsable,
      observacion: notas
    });

    this.sincronizarStockConMatriz();
    this.guardarDatosLocales();

    return {
      success: true,
      mensaje: `Repuesto ${codigoRepuesto} despachado exitosamente de ${ped.contenedorAsignado} / Pallet ${ped.palletAsignado}. Descontado de inventario de forma irreversible.`
    };
  }

  /**
   * Registro de Ajuste por Merma o Daño físico
   */
  public registrarAjusteMerma(
    uidFila: string, 
    cantidadMerma: number, 
    motivo: string, 
    responsable: string = 'Auditor CEDIS'
  ): { success: boolean; mensaje?: string; error?: string } {
    const dplItem = this.detalleDPL.find(d => d.uid === uidFila);
    if (!dplItem) {
      return { success: false, error: 'Registro DPL no encontrado.' };
    }

    const cant = Number(cantidadMerma);
    if (cant > dplItem.saldoLibre) {
      return { success: false, error: 'La merma no puede superar el saldo libre disponible.' };
    }

    dplItem.cantTotal -= cant;
    dplItem.saldoLibre = dplItem.cantTotal - dplItem.despachado - dplItem.comprometido;

    this.auditoria.unshift({
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipoMovimiento: 'AJUSTE DE MERMA / DAÑO',
      codigoOEM: dplItem.codigoCompra,
      descripcion: dplItem.descripcion,
      cantidad: cant,
      contenedor: dplItem.contenedor,
      pallet: dplItem.pallet,
      responsable,
      observacion: motivo || 'Deterioro o faltante físico'
    });

    this.sincronizarStockConMatriz();
    this.guardarDatosLocales();

    return {
      success: true,
      mensaje: `Ajuste de merma procesado: Se descontaron ${cant} unidades del pallet ${dplItem.pallet}.`
    };
  }

  /**
   * Importación de Manifiesto DPL recibido de fábrica
   */
  public importarManifiestoDPL(payload: {
    invoiceNo: string;
    proveedor?: string;
    estado?: string;
    items: Array<{
      caseNo?: string;
      packageNo?: string;
      purchaseCode?: string;
      suppliedCode?: string;
      description?: string;
      qty?: number | string;
    }>;
  }): { success: boolean; mensaje?: string; error?: string } {
    const invoiceNo = (payload.invoiceNo || '').trim();
    if (!invoiceNo) {
      return { success: false, error: 'Número de factura / contenedor requerido.' };
    }

    if (this.contenedores.some(c => c.contenedor.toLowerCase() === invoiceNo.toLowerCase())) {
      return { success: false, error: `El contenedor/factura ${invoiceNo} ya fue registrado en el sistema.` };
    }

    const estadoParam = (payload.estado || 'EN TRÁNSITO').trim().toUpperCase();
    let estadoNormalizado: any = 'EN TRÁNSITO';
    if (estadoParam.includes('RECIBID')) {
      estadoNormalizado = 'FÍSICAMENTE RECIBIDO EN CEDIS';
    } else if (estadoParam.includes('ADUAN')) {
      estadoNormalizado = 'EN ADUANA / PUERTO';
    } else {
      estadoNormalizado = 'EN TRÁNSITO MARÍTIMO';
    }

    let totalPzas = 0;
    const palletsSet = new Set<string>();
    const skusSet = new Set<string>();
    const nuevasFilas: DetalleDPL[] = [];

    payload.items.forEach((it, idx) => {
      const pCode = (it.purchaseCode || '').trim().toUpperCase();
      const sCode = (it.suppliedCode || '').trim().toUpperCase();
      const qty = Number(it.qty) || 0;
      const caseNo = (it.caseNo || 'P001').trim();
      const pkgNo = (it.packageNo || 'PKG-01').trim();
      const desc = (it.description || 'Repuesto Changan Genuino').trim();

      if (pCode || sCode) {
        totalPzas += qty;
        if (caseNo) palletsSet.add(caseNo);
        if (pCode) skusSet.add(pCode);

        let ubic = `Bahía CEDIS / Pallet ${caseNo}`;
        if (estadoNormalizado === 'EN TRÁNSITO MARÍTIMO') {
          ubic = 'En Tránsito Marítimo / Altamar (Rastreo Activo)';
        } else if (estadoNormalizado === 'EN ADUANA / PUERTO') {
          ubic = 'En Trámites de Aduana / Puerto (Rastreo Activo)';
        }

        nuevasFilas.push({
          uid: `${invoiceNo}_${idx + 1}`,
          contenedor: invoiceNo,
          pallet: caseNo,
          packageNo: pkgNo,
          codigoCompra: pCode,
          codigoSuministrado: sCode,
          descripcion: desc,
          cantTotal: qty,
          despachado: 0,
          comprometido: 0,
          saldoLibre: qty,
          ubicacion: ubic,
          pedidosVinculados: ''
        });
      }
    });

    const nuevoContenedor: ContenedorManifiesto = {
      contenedor: invoiceNo,
      proveedor: payload.proveedor || 'Mobitech Changan China Co., Ltd',
      poReferencia: `PO-${invoiceNo}`,
      tipoTransporte: 'Marítimo 40HQ',
      fechaArribo: new Date().toISOString().substring(0, 10),
      estado: estadoNormalizado,
      totalPiezas: totalPzas,
      skusUnicos: skusSet.size,
      totalPallets: palletsSet.size,
      totalAsignadas: 0,
      saldoLibreTotal: totalPzas
    };

    this.contenedores.unshift(nuevoContenedor);
    this.detalleDPL.push(...nuevasFilas);

    this.sincronizarStockConMatriz();
    this.guardarDatosLocales();

    return {
      success: true,
      mensaje: `Manifiesto ${invoiceNo} procesado exitosamente (${estadoNormalizado}): ${totalPzas} piezas registradas.`
    };
  }

  public actualizarEstadoContenedor(contenedorId: string, nuevoEstado: string): { success: boolean; mensaje: string } {
    const idTarget = (contenedorId || '').trim().toLowerCase();
    let c = this.contenedores.find(x => (x.contenedor || '').trim().toLowerCase() === idTarget);
    
    const nNorm = (nuevoEstado || '').trim().toUpperCase();
    let estadoAsignado = 'EN TRÁNSITO MARÍTIMO';
    if (nNorm.includes('RECIBID')) {
      estadoAsignado = 'FÍSICAMENTE RECIBIDO EN CEDIS';
    } else if (nNorm.includes('ADUAN')) {
      estadoAsignado = 'EN ADUANA / PUERTO';
    }

    if (!c) {
      // Si no existía en el listado de contenedores, auto-registrarlo
      c = {
        contenedor: contenedorId || 'CONT-DESCONOCIDO',
        proveedor: 'Mobitech Changan China Co., Ltd',
        poReferencia: `PO-${contenedorId}`,
        tipoTransporte: 'Marítimo 40HQ',
        fechaArribo: new Date().toISOString().split('T')[0],
        estado: estadoAsignado,
        totalPiezas: 0,
        skusUnicos: 0,
        totalPallets: 1,
        totalAsignadas: 0,
        saldoLibreTotal: 0
      };
      this.contenedores.unshift(c);
    } else {
      c.estado = estadoAsignado;
    }

    this.sincronizarStockConMatriz();
    this.guardarDatosLocales();
    return {
      success: true,
      mensaje: `Estatus de contenedor ${contenedorId} actualizado a ${c.estado}.`
    };
  }

  /**
   * Importación de Backup JSON (Sistema Anterior) con verificación anti-duplicados
   */
  public importarBackupJSON(jsonString: string): { success: boolean; mensaje?: string; error?: string } {
    try {
      const rawData = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const items = Array.isArray(rawData) ? rawData : (rawData.pedidos || rawData.matriz || []);

      if (!items || items.length === 0) {
        return { success: false, error: 'El archivo JSON no contiene un arreglo de pedidos reconocible.' };
      }

      const pedidosExistentes = new Set(this.pedidos.map(p => p.id));
      let insertados = 0;
      let omitidosPorId = 0;
      let omitidosPorDuplicadoCliente = 0;
      const nuevos: Pedido[] = [];

      items.forEach((p: Record<string, unknown>) => {
        const idPed = String(p.id_pedido || p.id || p.codigo || '').trim();
        const codOEM = String(p?.codigo_oem || p?.codigo_repuesto || p?.codigo || '').trim().toUpperCase();
        const cliente = String(p.cliente || p.nombre_cliente || 'Consumidor Final').trim();
        const vin = String(p.vin || p.chasis || '').trim().toUpperCase();
        const ordenRep = String(p.orden_rep || p.ordenReparacion || p.no_orden || 'N/A').trim();

        if (idPed && pedidosExistentes.has(idPed)) {
          omitidosPorId++;
          return;
        }

        const dup = this.verificarDuplicadoActivo(cliente, vin, ordenRep, codOEM);
        if (dup) {
          omitidosPorDuplicadoCliente++;
          return;
        }

        const nuevo: Pedido = {
          id: idPed || `PED-LEGACY-${1000 + insertados}`,
          prioridad: (p.prioridad as TipoSolicitud) || (p.tipo_solicitud as TipoSolicitud) || 'Stock Regular',
          fecha: p.fecha ? String(p.fecha) : new Date().toISOString().replace('T', ' ').substring(0, 16),
          sucursal: String(p.sucursal || 'Costa Verde'),
          asesor: String(p.asesor || p.solicitante || 'Sistema Anterior'),
          cliente,
          modelo: String(p.modelo || 'General Changan'),
          vin,
          ordenReparacion: ordenRep,
          codigoOEM: codOEM,
          descripcion: String(p.descripcion || p.desc || 'Repuesto Genuino Changan'),
          cantSolicitada: Number(p.cant_sol || p.cantidad || p.qty) || 1,
          cantAsignada: Number(p.cant_asig || p.asignado) || 0,
          estatusCruce: String(p.status_cruce || p.estatus || 'Pendiente Fábrica • Sin arribo en CEDIS (0 stock)'),
          contenedorAsignado: String(p.contenedor || ''),
          palletAsignado: String(p.pallet || p.case_no || ''),
          packageNo: String(p.package_no || ''),
          observaciones: String(p.observaciones || 'Migrado de backup JSON')
        };

        if (idPed) pedidosExistentes.add(idPed);
        nuevos.push(nuevo);
        insertados++;
      });

      if (nuevos.length > 0) {
        this.pedidos.unshift(...nuevos);
        this.sincronizarStockConMatriz();
        this.guardarDatosLocales();
      }

      return {
        success: true,
        mensaje: `Migración completada: ${insertados} pedidos importados (${omitidosPorId} omitidos por ID idéntico, ${omitidosPorDuplicadoCliente} bloqueados por duplicidad activa).`
      };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Error al procesar JSON' };
    }
  }

  /**
   * Sincronización en segundo plano con Google Sheets
   */
  private async syncPedidoToSheets(pedidos: Pedido[]): Promise<void> {
    const { spreadsheetId, accessToken } = this.sheetsConfig;
    if (!spreadsheetId || !accessToken) return;

    const rows = pedidos.map(p => [
      p.id,
      p.prioridad,
      p.fecha,
      p.sucursal,
      p.asesor,
      p.cliente,
      p.modelo,
      p.vin,
      p.ordenReparacion,
      p.codigoOEM,
      p.descripcion,
      p.cantSolicitada,
      p.cantAsignada,
      p.estatusCruce,
      p.contenedorAsignado,
      p.palletAsignado,
      p.packageNo,
      p.observaciones
    ]);

    await appendSheetValues(spreadsheetId, 'Matriz_Central!A:R', rows, accessToken);
  }

  /**
   * Cargar datos desde Google Sheets
   */
  public async syncFromGoogleSheets(): Promise<{ success: boolean; count: number; error?: string }> {
    const { spreadsheetId, accessToken } = this.sheetsConfig;
    if (!spreadsheetId || !accessToken) {
      return { success: false, count: 0, error: 'Configuración de Google Sheets incompleta (Spreadsheet ID o Token ausente).' };
    }

    try {
      const rows = await getSheetValues(spreadsheetId, 'Matriz_Central!A2:R', accessToken);
      if (!rows || rows.length === 0) {
        return { success: true, count: 0 };
      }

      const sheetsPedidos: Pedido[] = rows.map(r => ({
        id: String(r[0] || ''),
        prioridad: (r[1] as TipoSolicitud) || 'Stock Regular',
        fecha: String(r[2] || ''),
        sucursal: String(r[3] || 'Villa Lucre'),
        asesor: String(r[4] || ''),
        cliente: String(r[5] || ''),
        modelo: String(r[6] || ''),
        vin: String(r[7] || ''),
        ordenReparacion: String(r[8] || ''),
        codigoOEM: String(r[9] || ''),
        descripcion: String(r[10] || ''),
        cantSolicitada: Number(r[11]) || 1,
        cantAsignada: Number(r[12]) || 0,
        estatusCruce: String(r[13] || ''),
        contenedorAsignado: String(r[14] || ''),
        palletAsignado: String(r[15] || ''),
        packageNo: String(r[16] || ''),
        observaciones: String(r[17] || '')
      }));

      // Unir evitando duplicados
      const ids = new Set(this.pedidos.map(p => p.id));
      const nuevos = sheetsPedidos.filter(p => p.id && !ids.has(p.id));
      if (nuevos.length > 0) {
        this.pedidos.unshift(...nuevos);
        this.sincronizarStockConMatriz();
        this.guardarDatosLocales();
      }

      this.sheetsConfig.lastSync = new Date().toLocaleTimeString();
      this.guardarDatosLocales();

      return { success: true, count: nuevos.length };
    } catch (err: unknown) {
      return { success: false, count: 0, error: err instanceof Error ? err.message : 'Error consultando Sheets' };
    }
  }

  /**
   * Resetear a datos iniciales de fábrica
   */
  public resetToFactory(): void {
    this.pedidos = INITIAL_PEDIDOS;
    this.contenedores = INITIAL_CONTENEDORES;
    this.detalleDPL = INITIAL_DETALLE_DPL;
    this.asesores = INITIAL_ASESORES;
    this.auditoria = INITIAL_AUDITORIA;
    this.guardarDatosLocales();
  }
}

export const cedisService = new CedisService();
