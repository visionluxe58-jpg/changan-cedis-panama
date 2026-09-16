
export type ValorSelectEstatus = 'PENDIENTE' | 'EN TRÁNSITO' | 'EN BODEGA' | 'POR ENVIAR' | 'DESPACHADO' | 'RECIBIDO';

export function normalizarValorSelectEstatus(estatusRaw: string = ''): ValorSelectEstatus {
  const s = String(estatusRaw || '').toUpperCase().trim();
  if (s.includes('DESPACH') || s.includes('RUTA')) return 'DESPACHADO';
  if (s.includes('RECIBID') || s.includes('ENTREG')) return 'RECIBIDO';
  if (s.includes('ENVIO') || s.includes('ENVÍO') || s.includes('LISTO')) return 'POR ENVIAR';
  if (s.includes('BODEGA') || s.includes('CEDIS') || s.includes('ASIGN')) return 'EN BODEGA';
  if (s.includes('TRANSIT') || s.includes('TRÁNSIT') || s.includes('ADUANA') || s.includes('PUERTO')) return 'EN TRÁNSITO';
  return 'PENDIENTE';
}

/**
 * Generador de Notificaciones Oficiales para CEDIS Changan Panamá
 * Envío de actualizaciones de estatus vía Correo (changanBodega2@outlook.es) y WhatsApp
 */

export interface ItemNotificacion {
  codigoRepuesto: string;
  descripcionOficial: string;
  cantidadSolicitada: number;
  cantidadAsignada: number;
  cantidadDespachada?: number;
  palletAsignado?: string;
  contenedorAsignado?: string;
  estatusLinea?: string;
}

export interface DatosPedidoNotificacion {
  pedidoId: string;
  fechaCreacion: string;
  sucursal: string;
  colaborador: string;
  correoDestinatario?: string;
  cotizacion?: string;
  canal?: string;
  tipoPedido?: string;
  cliente: string;
  modeloChangan: string;
  placa?: string;
  vin?: string;
  estadoPago?: string;
  estatusActual: string;
  items: ItemNotificacion[];
}

export const CORREO_REMITENTE_OFICIAL = 'changanBodega2@outlook.es';

export interface PlantillaNotificacionGenerada {
  de: string;
  para: string;
  asunto: string;
  cuerpoCorreoTexto: string;
  cuerpoWhatsAppTexto: string;
  urlMailto: string;
  urlWhatsAppWeb: string;
}

export function normalizarEstatusLogistico(estatusRaw: string): {
  clave: string;
  tituloEstatus: string;
  colorHex: string;
  descripcionBalance: (asig: number, tot: number, desp: number, sucursal: string) => string;
  estadoRepuestoTexto: string;
} {
  const e = (estatusRaw || '').toUpperCase();

  if (e.includes('DESPACH') || e.includes('RUTA')) {
    return {
      clave: 'DESPACHADO',
      tituloEstatus: 'DESPACHADO A SUCURSAL',
      colorHex: '#9333ea',
      descripcionBalance: (asig, tot, desp, suc) =>
        `${desp || asig || tot} de ${tot} piezas despachadas en transporte CEDIS hacia ${suc}`,
      estadoRepuestoTexto: 'En Ruta / Despachado a Sucursal'
    };
  }

  if (e.includes('RECIBID') || e.includes('ENTREG')) {
    return {
      clave: 'RECIBIDO',
      tituloEstatus: 'RECIBIDO EN SUCURSAL',
      colorHex: '#10b981',
      descripcionBalance: (asig, tot, desp, suc) =>
        `${desp || tot} de ${tot} piezas entregadas y confirmadas en ${suc}`,
      estadoRepuestoTexto: 'Recibido en Agencia / Listo para Entrega'
    };
  }

  if (e.includes('ESPERANDO') || e.includes('LISTO') || e.includes('ENVIO') || e.includes('ENVÍO') || e.includes('TOTAL')) {
    return {
      clave: 'ESPERANDO_ENVIO',
      tituloEstatus: 'ESPERANDO ENVÍO',
      colorHex: '#0284c7',
      descripcionBalance: (asig, tot) =>
        `${asig || tot} de ${tot} piezas en Bodega CEDIS (listas para envío)`,
      estadoRepuestoTexto: 'Recolectado / Listo'
    };
  }

  if (e.includes('BODEGA') || e.includes('CEDIS') || e.includes('ASIGN')) {
    return {
      clave: 'EN_BODEGA_CEDIS',
      tituloEstatus: 'EN BODEGA CEDIS',
      colorHex: '#0d9488',
      descripcionBalance: (asig, tot) =>
        `${asig || 1} de ${tot} piezas ubicadas en Bodega CEDIS (en preparación)`,
      estadoRepuestoTexto: 'Ubicado en Bodega CEDIS'
    };
  }

  if (e.includes('TRÁNSITO') || e.includes('TRANSITO') || e.includes('PUERTO') || e.includes('EMBARQ')) {
    return {
      clave: 'EN_TRANSITO',
      tituloEstatus: 'EN TRÁNSITO MARÍTIMO / ARRIBO',
      colorHex: '#f59e0b',
      descripcionBalance: (_asig, tot) =>
        `0 de ${tot} piezas en Bodega CEDIS (Contenedor en tránsito marítimo hacia Panamá)`,
      estadoRepuestoTexto: 'En Tránsito Internacional'
    };
  }

  // Por defecto: Pendiente
  return {
    clave: 'PENDIENTE',
    tituloEstatus: 'PENDIENTE',
    colorHex: '#eab308',
    descripcionBalance: (asig, tot) =>
      `${asig} de ${tot} piezas en Bodega CEDIS (En espera de confirmación / arribo de fábrica)`,
    estadoRepuestoTexto: 'En Espera de Asignación'
  };
}

export function generarNotificacionPedido(
  pedido: DatosPedidoNotificacion,
  estatusSeleccionado?: string
): PlantillaNotificacionGenerada {
  const estatusAUsar = estatusSeleccionado || pedido.estatusActual || 'PENDIENTE';
  const metaEstatus = normalizarEstatusLogistico(estatusAUsar);

  const totalSolicitadas = pedido.items.reduce((acc, it) => acc + (Number(it.cantidadSolicitada) || 1), 0);
  const totalAsignadas = pedido.items.reduce((acc, it) => acc + (Number(it.cantidadAsignada) || 0), 0);
  const totalDespachadas = pedido.items.reduce((acc, it) => acc + (Number(it.cantidadDespachada) || 0), 0);

  // Determinar contenedor representativo
  const primerContenedor = pedido.items.find(it => it.contenedorAsignado)?.contenedorAsignado || 'En programación';

  // Determinar correo del destinatario
  let correoDestino = pedido.correoDestinatario || '';
  if (!correoDestino && pedido.colaborador) {
    const slug = pedido.colaborador.toLowerCase().trim().replace(/\s+/g, '.');
    correoDestino = `${slug}@changanpanama.com`;
  }

  const asunto = `Actualización de su pedido ${pedido.pedidoId} — CEDIS Changan Panamá`;
  const nombreDestinatario = pedido.colaborador || pedido.cliente || 'Colaborador';
  const fechaLimpia = (pedido.fechaCreacion || '').substring(0, 10) || new Date().toISOString().substring(0, 10);
  const prioridadCanal = `${pedido.canal || 'Taller'} · ${pedido.tipoPedido || 'Especial'}`;
  const cotizacionOEstado = pedido.cotizacion || 'GARANTIA';
  const balanceTexto = metaEstatus.descripcionBalance(totalAsignadas, totalSolicitadas, totalDespachadas, pedido.sucursal);

  // Listado de Repuestos formateado
  const totalItems = pedido.items.length;
  const encabezadoItems = `📦 DETALLE DE REPUESTOS (${totalItems} ${totalItems === 1 ? 'ítem' : 'ítems'})`;

  const detalleItemsTexto = pedido.items.map((it, idx) => {
    const palletTxt = it.palletAsignado ? it.palletAsignado : 'Por asignar';
    const contTxt = it.contenedorAsignado ? it.contenedorAsignado : primerContenedor;
    const dispTxt = `${it.cantidadAsignada || 0} de ${it.cantidadSolicitada} unidad(es)`;

    return `${idx + 1}. ${it.codigoRepuesto} — ${it.descripcionOficial || 'Repuesto genuino Changan'}
   Estado: ${metaEstatus.estadoRepuestoTexto}
   Disponibilidad: ${dispTxt}
   Pallet: ${palletTxt} · Cont: ${contTxt}`;
  }).join('\n\n');

  // CUERPO COMPLETO DEL CORREO (Texto plano exacto al modelo solicitado)
  const cuerpoCorreoTexto = `Estimado(a) ${nombreDestinatario},

Le saludamos cordialmente desde el Centro Nacional de Distribución de Repuestos (CEDIS Changan Panamá). A continuación, la actualización de trazabilidad de su pedido.

📋 INFORMACIÓN DEL PEDIDO
Nº de Pedido: ${pedido.pedidoId}
Fecha de Registro: ${fechaLimpia}
Sucursal Destino: ${pedido.sucursal}
Asesor Encargado: ${pedido.colaborador}
Cotización Nº: ${cotizacionOEstado}
Canal / Prioridad: ${prioridadCanal}

🚗 VEHÍCULO Y CLIENTE
Propietario: ${pedido.cliente || 'N/A'}
Modelo Changan: ${pedido.modeloChangan || 'N/A'}
Placa: ${pedido.placa || 'N/A'}

🚦 ESTATUS ACTUAL: ${metaEstatus.tituloEstatus}
Balance físico: ${balanceTexto}
Embarque / Contenedor: ${primerContenedor}
Estado de pago: ${pedido.estadoPago || 'GARANTIA'}

${encabezadoItems}
${detalleItemsTexto}

Quedamos a su entera disposición para coordinar cualquier detalle logístico adicional.

Atentamente,
Equipo de Despacho & Trazabilidad CEDIS
Distribuidora Automotriz Fortune, S.A. (Changan Panamá)
Contacto: ${CORREO_REMITENTE_OFICIAL}`;

  // CUERPO COMPLETO PARA WHATSAPP (Con negritas y formato amigable)
  const detalleItemsWhatsApp = pedido.items.map((it, idx) => {
    const palletTxt = it.palletAsignado ? it.palletAsignado : 'Por asignar';
    const contTxt = it.contenedorAsignado ? it.contenedorAsignado : primerContenedor;
    const dispTxt = `${it.cantidadAsignada || 0} de ${it.cantidadSolicitada} u.`;

    return `*${idx + 1}. ${it.codigoRepuesto}* — ${it.descripcionOficial || 'Repuesto Changan'}
   _Estado:_ ${metaEstatus.estadoRepuestoTexto}
   _Disp:_ ${dispTxt} | _Pallet:_ ${palletTxt} | _Cont:_ ${contTxt}`;
  }).join('\n\n');

  const cuerpoWhatsAppTexto = `*CEDIS CHANGAN PANAMÁ* 🇵🇦
*Actualización de Pedido: ${pedido.pedidoId}*

Estimado(a) *${nombreDestinatario}*, le compartimos el estatus de trazabilidad de su requisición:

📋 *INFORMACIÓN DEL PEDIDO*
• *Nº Pedido:* ${pedido.pedidoId}
• *Fecha:* ${fechaLimpia}
• *Sucursal Destino:* ${pedido.sucursal}
• *Asesor:* ${pedido.colaborador}
• *Cotización:* ${cotizacionOEstado}
• *Prioridad:* ${prioridadCanal}

🚗 *VEHÍCULO Y CLIENTE*
• *Cliente:* ${pedido.cliente || 'N/A'}
• *Modelo:* ${pedido.modeloChangan || 'N/A'}
• *Placa:* ${pedido.placa || 'N/A'}

🚦 *ESTATUS ACTUAL: ${metaEstatus.tituloEstatus}*
• *Balance Físico:* ${balanceTexto}
• *Contenedor:* ${primerContenedor}
• *Estado Pago:* ${pedido.estadoPago || 'GARANTIA'}

${encabezadoItems}
${detalleItemsWhatsApp}

_Enviado desde CEDIS Changan Panamá (${CORREO_REMITENTE_OFICIAL})_`;

  const urlMailto = `mailto:${encodeURIComponent(correoDestino)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoCorreoTexto)}`;
  const urlWhatsAppWeb = `https://api.whatsapp.com/send?text=${encodeURIComponent(cuerpoWhatsAppTexto)}`;

  return {
    de: CORREO_REMITENTE_OFICIAL,
    para: correoDestino,
    asunto,
    cuerpoCorreoTexto,
    cuerpoWhatsAppTexto,
    urlMailto,
    urlWhatsAppWeb
  };
}
