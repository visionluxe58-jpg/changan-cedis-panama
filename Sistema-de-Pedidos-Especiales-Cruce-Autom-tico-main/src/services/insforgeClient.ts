import { createClient } from '@insforge/sdk';

// URL y clave anónima de InsForge (pedidos-changan)
const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://4bi62b34.us-east.insforge.app';
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || 'anon_14280c229b32b7ac55db1b8e761f198c14170546dc807fe50bd46edb21c8eb6f';

let _insforgeClient: any = null;
export function getInsforgeClient() {
  if (!_insforgeClient) {
    try {
      _insforgeClient = createClient({
        baseUrl: INSFORGE_URL,
        anonKey: INSFORGE_ANON_KEY
      });
    } catch (e) {
      console.warn('InsForge client deferred initialization:', e);
    }
  }
  return _insforgeClient;
}

export const insforge = new Proxy({} as any, {
  get(_, prop) {
    const c = getInsforgeClient();
    return c ? c[prop] : undefined;
  }
});

export interface InsforgeSucursal {
  id: string;
  nombre: string;
  prefijo: string;
  tipo_equipo: 'INDIVIDUAL' | 'MULTIPLE';
  badge?: string;
  canal_defecto?: string;
  descripcion_equipo?: string;
  activa?: boolean;
}

export interface InsforgePersonalSucursal {
  id: string;
  sucursal_id: string;
  nombre: string;
  cargo?: string;
  area: 'Mostrador' | 'Chapistería' | 'Taller' | 'Repuestos' | 'Garantías' | string;
  correo?: string;
  activo?: boolean;
}

export interface InsforgeModeloChangan {
  id?: string;
  nombre: string;
  categoria: 'SUV' | 'Sedán' | 'Eléctrico / Híbrido' | 'Pickup' | 'Comercial' | string;
  anos_compatibles?: string;
  motor?: string;
  descripcion?: string;
  activo?: boolean;
}

export interface InsforgeBodeguero {
  id?: string;
  codigo: string;
  nombre: string;
  cargo: string;
  created_at?: string;
}

export interface InsforgePedidoCabecera {
  id?: string;
  numero_solicitud: string;
  sucursal: string;
  asesor: string;
  cliente_nombre?: string;
  cliente_identificacion?: string;
  chasis_vin?: string;
  modelo_vehiculo?: string;
  fecha_solicitud?: string;
  estado?: string;
  created_at?: string;
}

export interface InsforgePedidoDetalle {
  id?: string;
  pedido_id?: string;
  numero_solicitud: string;
  numero_parte: string;
  descripcion?: string;
  modelo?: string;
  cantidad: number;
  recibido?: number;
  estado_pieza?: string;
  contenedor_asignado?: string;
  pallet_asignado?: string;
  bodeguero_responsable?: string;
  codigo_bodeguero?: string;
  created_at?: string;
}

export interface InsforgePalletRegistro {
  id?: string;
  numero_pallet: string;
  contenedor?: string;
  bodeguero_nombre?: string;
  bodeguero_codigo?: string;
  fecha_escaneo?: string;
  total_piezas?: number;
  detalles?: any;
}

export class InsforgeService {
  // ==========================================
  // SUCURSALES
  // ==========================================
  static async obtenerSucursales(): Promise<InsforgeSucursal[]> {
    try {
      const { data, error } = await insforge.database
        .from('sucursales')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      return (data as InsforgeSucursal[]) || [];
    } catch (err) {
      console.warn('Error obteniendo sucursales de InsForge:', err);
      return [];
    }
  }

  static async guardarSucursal(sucursal: InsforgeSucursal): Promise<any> {
    const { data, error } = await insforge.database
      .from('sucursales')
      .upsert([sucursal]);
    if (error) throw error;
    return data;
  }

  static async eliminarSucursal(id: string): Promise<any> {
    const { data, error } = await insforge.database
      .from('sucursales')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  // ==========================================
  // PERSONAL / ASESORES
  // ==========================================
  static async obtenerPersonal(): Promise<InsforgePersonalSucursal[]> {
    try {
      const { data, error } = await insforge.database
        .from('personal_sucursales')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      return (data as InsforgePersonalSucursal[]) || [];
    } catch (err) {
      console.warn('Error obteniendo personal de InsForge:', err);
      return [];
    }
  }

  static async guardarPersonal(persona: InsforgePersonalSucursal): Promise<any> {
    const { data, error } = await insforge.database
      .from('personal_sucursales')
      .upsert([persona]);
    if (error) throw error;
    return data;
  }

  static async eliminarPersonal(id: string): Promise<any> {
    const { data, error } = await insforge.database
      .from('personal_sucursales')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  // ==========================================
  // MODELOS CHANGAN
  // ==========================================
  static async obtenerModelos(): Promise<InsforgeModeloChangan[]> {
    try {
      const { data, error } = await insforge.database
        .from('modelos_changan')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      return (data as InsforgeModeloChangan[]) || [];
    } catch (err) {
      console.warn('Error obteniendo modelos de InsForge:', err);
      return [];
    }
  }

  static async guardarModelo(modelo: InsforgeModeloChangan): Promise<any> {
    const { data, error } = await insforge.database
      .from('modelos_changan')
      .upsert([modelo]);
    if (error) throw error;
    return data;
  }

  static async eliminarModelo(id: string): Promise<any> {
    const { data, error } = await insforge.database
      .from('modelos_changan')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  // ==========================================
  // BODEGUEROS CEDIS
  // ==========================================
  static async obtenerBodegueros(): Promise<InsforgeBodeguero[]> {
    try {
      const { data, error } = await insforge.database
        .from('bodegueros')
        .select('*')
        .order('codigo', { ascending: true });
      if (error) throw error;
      return (data as InsforgeBodeguero[]) || [];
    } catch (err) {
      console.warn('Error obteniendo bodegueros desde InsForge:', err);
      return [];
    }
  }

  static async guardarBodeguero(bodeguero: InsforgeBodeguero): Promise<any> {
    const { data, error } = await insforge.database
      .from('bodegueros')
      .upsert([bodeguero]);
    if (error) throw error;
    return data;
  }

  static async eliminarBodeguero(codigo: string): Promise<any> {
    const { data, error } = await insforge.database
      .from('bodegueros')
      .delete()
      .eq('codigo', codigo);
    if (error) throw error;
    return data;
  }

  // ==========================================
  // PALLETS & PEDIDOS
  // ==========================================
  static async registrarPallet(pallet: InsforgePalletRegistro): Promise<any> {
    try {
      const { data, error } = await insforge.database
        .from('pallets_registro')
        .insert([pallet]);
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error registrando pallet en InsForge:', err);
      throw err;
    }
  }

    static async actualizarPedidosMasivo(
    pedidoIds: string[],
    cambios: {
      estatusGeneral?: string;
      sucursal?: string;
      tipoPedido?: string;
      estadoPago?: string;
      colaborador?: string;
    }
  ): Promise<any> {
    try {
      const payload: any = {};
      if (cambios.estatusGeneral && cambios.estatusGeneral !== 'SIN_CAMBIO') {
        payload.estado = cambios.estatusGeneral;
      }
      if (cambios.sucursal && cambios.sucursal !== 'SIN_CAMBIO') {
        payload.sucursal = cambios.sucursal;
      }
      if (cambios.colaborador && cambios.colaborador !== 'SIN_CAMBIO') {
        payload.asesor = cambios.colaborador;
      }
      if (Object.keys(payload).length > 0) {
        const { data, error } = await insforge.database
          .from('pedidos_cabecera')
          .update(payload)
          .in('numero_solicitud', pedidoIds);
        if (error) console.warn('InsForge actualizarPedidosMasivo warning:', error);
        return data;
      }
    } catch (err) {
      console.warn('Error al actualizar pedidos masivo en InsForge:', err);
    }
  }

  static async eliminarPedidosMasivo(pedidoIds: string[]): Promise<any> {
    try {
      const { data, error } = await insforge.database
        .from('pedidos_cabecera')
        .delete()
        .in('numero_solicitud', pedidoIds);
      if (error) console.warn('InsForge eliminarPedidosMasivo warning:', error);
      return data;
    } catch (err) {
      console.warn('Error al eliminar pedidos masivo en InsForge:', err);
    }
  }

  static async guardarPedido(cabecera: InsforgePedidoCabecera, detalles: Omit<InsforgePedidoDetalle, 'pedido_id'>[]): Promise<any> {
    try {
      const { data: cabeceraCreada, error: errorCab } = await insforge.database
        .from('pedidos_cabecera')
        .insert([cabecera])
        .select();

      if (errorCab) throw errorCab;
      const cabId = cabeceraCreada?.[0]?.id;

      if (detalles && detalles.length > 0) {
        const detallesConId = detalles.map(d => ({
          ...d,
          pedido_id: cabId
        }));
        const { data: detallesCreados, error: errorDet } = await insforge.database
          .from('pedidos_detalle')
          .insert(detallesConId);
        if (errorDet) throw errorDet;
        return { cabecera: cabeceraCreada, detalles: detallesCreados };
      }

      return { cabecera: cabeceraCreada, detalles: [] };
    } catch (err) {
      console.error('Error guardando pedido en InsForge:', err);
      throw err;
    }
  }
}
