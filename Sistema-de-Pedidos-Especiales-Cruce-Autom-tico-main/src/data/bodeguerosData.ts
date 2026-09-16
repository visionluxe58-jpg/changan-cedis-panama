/**
 * ==============================================================================
 * EQUIPO OFICIAL DE BODEGA CENTRAL (CEDIS) - CHANGAN AUTO PANAMÁ
 * ==============================================================================
 * Trazabilidad y atribución de responsabilidad en recepción y escaneo de pallets.
 */

export interface BodegueroCedis {
  codigo: string;          // CE001 - CE007
  nombre: string;          // Nombre del colaborador
  cargo: string;           // Puesto oficial
  sucursal: string;        // 'Bodega Central'
  esAdmin?: boolean;       // Privilegios administrativos
  colorBadge?: string;     // Color distintivo
}

export const EQUIPO_BODEGA_CEDIS: BodegueroCedis[] = [
  {
    codigo: 'CE001',
    nombre: 'Issac',
    cargo: 'Asistente de bodega',
    sucursal: 'Bodega Central',
    colorBadge: 'border-blue-500/40 bg-blue-500/20 text-blue-300'
  },
  {
    codigo: 'CE002',
    nombre: 'Josue',
    cargo: 'Asistente de bodega',
    sucursal: 'Bodega Central',
    colorBadge: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
  },
  {
    codigo: 'CE003',
    nombre: 'Felix',
    cargo: 'Asistente de bodega',
    sucursal: 'Bodega Central',
    colorBadge: 'border-amber-500/40 bg-amber-500/20 text-amber-300'
  },
  {
    codigo: 'CE004',
    nombre: 'Dilan',
    cargo: 'Asistente de bodega',
    sucursal: 'Bodega Central',
    colorBadge: 'border-purple-500/40 bg-purple-500/20 text-purple-300'
  },
  {
    codigo: 'CE005',
    nombre: 'Joel (Admin)',
    cargo: 'Encargado de pedidos especiales',
    sucursal: 'Bodega Central',
    esAdmin: true,
    colorBadge: 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
  },
  {
    codigo: 'CE006',
    nombre: 'Emanuel',
    cargo: 'Analista de inventario',
    sucursal: 'Bodega Central',
    colorBadge: 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300'
  },
  {
    codigo: 'CE007',
    nombre: 'Angel',
    cargo: 'Asistente de bodega',
    sucursal: 'Bodega Central',
    colorBadge: 'border-rose-500/40 bg-rose-500/20 text-rose-300'
  }
];

const STORAGE_KEY_BODEGUERO = 'changan_bodeguero_activo_cedis';

export function obtenerBodegueroPorCodigo(codigo: string): BodegueroCedis | undefined {
  if (!codigo) return undefined;
  const codigoLimpio = codigo.trim().toUpperCase();
  return EQUIPO_BODEGA_CEDIS.find(b => b.codigo.toUpperCase() === codigoLimpio);
}

export function guardarBodegueroActivo(bodeguero: BodegueroCedis): void {
  try {
    localStorage.setItem(STORAGE_KEY_BODEGUERO, JSON.stringify(bodeguero));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

export function obtenerBodegueroActivo(): BodegueroCedis | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BODEGUERO);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error leyendo bodeguero activo:', e);
  }
  return null;
}

export const LISTA_BODEGUEROS_CEDIS = EQUIPO_BODEGA_CEDIS;
