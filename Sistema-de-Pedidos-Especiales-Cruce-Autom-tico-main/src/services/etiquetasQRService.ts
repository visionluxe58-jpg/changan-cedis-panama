import QRCode from 'qrcode';

export interface EtiquetaRepuestoData {
  qrId: string;
  cliente: string;
  vehiculoModelo: string;
  vehiculoAno?: string;
  placa: string;
  vin: string;
  codigoRepuesto: string;
  descripcionOficial: string;
  cantidad: number;
  unidad?: string;
  ordenOT: string;
  fechaPedido: string;
  estado: string;
  ubicacionCedis: string;
  sucursal: string;
}

export const PATRON_QR_VALIDO = /^PE-\d{4}-[A-Z0-9_-]+-\d{2}$/i;

export const etiquetasQRService = {
  /**
   * Genera el ID opaco único según la especificación técnica:
   * PE-[AÑO]-[ID_PEDIDO]-[SECUENCIA_UNIDAD]
   * Ej: PE-2026-00012345-01
   */
  generarIdQROpaco(pedidoId: string, secuenciaUnidad: number = 1): string {
    const anio = new Date().getFullYear().toString();
    // Limpiar caracteres especiales de pedidoId
    const idLimpio = pedidoId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const secuenciaStr = secuenciaUnidad.toString().padStart(2, '0');
    return `PE-${anio}-${idLimpio}-${secuenciaStr}`;
  },

  /**
   * Valida si un string cumple con el estándar de QR de Pedidos Especiales
   */
  esQRValido(codigo: string): boolean {
    if (!codigo || typeof codigo !== 'string') return false;
    return PATRON_QR_VALIDO.test(codigo.trim());
  },

  /**
   * Genera la imagen QR en formato Base64 Data URL.
   * REGLA ESTRICTA DE PRIVACIDAD: El QR contiene ÚNICAMENTE el qrId opaco.
   * No contiene nombre del cliente, placa ni VIN.
   */
  async generarDataUrlQR(qrId: string): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(qrId.trim(), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return dataUrl;
    } catch (err) {
      console.error('Error generando QR Data URL:', err);
      return '';
    }
  },

  /**
   * Normaliza o infiere la ubicación CEDIS si no viene especificada
   */
  obtenerUbicacionCedis(ubicacion?: string): string {
    if (ubicacion && ubicacion.trim().length > 2) return ubicacion.trim();
    return 'PE-01 / N02 / B05';
  }
};

/**
 * Helper para construir rápidamente el objeto EtiquetaRepuestoData
 */
export function generarDatosEtiqueta(
  pedidoId: string,
  codigoRepuesto: string,
  descripcion: string,
  sucursalDestino: string,
  secuenciaUnidad: number = 1,
  totalUnidades: number = 1,
  contenedor?: string,
  pallet?: string,
  ubicacionCedis?: string,
  cliente?: string,
  modelo?: string,
  placa?: string,
  vin?: string,
  cotizacion?: string
): EtiquetaRepuestoData {
  const clienteLimpio = (cliente && cliente.trim()) ? cliente.trim().toUpperCase() : 'SIN CLIENTE ASIGNADO';

  return {
    qrId: etiquetasQRService.generarIdQROpaco(pedidoId, secuenciaUnidad),
    idPedido: pedidoId,
    cliente: clienteLimpio,
    vehiculoModelo: (modelo && modelo.trim()) ? modelo.trim() : 'Genuino Changan',
    placa: (placa && placa.trim()) ? placa.trim().toUpperCase() : 'N/D',
    vin: (vin && vin.trim()) ? vin.trim().toUpperCase() : 'N/D',
    codigoRepuesto,
    descripcion,
    descripcionOficial: descripcion,
    sucursal: sucursalDestino || 'Bodega Central',
    sucursalDestino: sucursalDestino || 'Bodega Central',
    secuenciaUnidad,
    totalUnidades,
    cantidad: totalUnidades,
    ordenOT: (cotizacion && cotizacion.trim()) ? cotizacion.trim() : 'GARANTIA',
    fechaPedido: new Date().toISOString().substring(0, 10),
    estado: 'Listo para Despacho',
    contenedor,
    pallet,
    ubicacionCedis: etiquetasQRService.obtenerUbicacionCedis(ubicacionCedis),
    fechaImpresion: new Date().toLocaleDateString('es-PA')
  };
}
