import React, { useState, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { 
  CORREO_REMITENTE_OFICIAL, 
  DatosPedidoNotificacion, 
  generarNotificacionPedido,
  normalizarEstatusLogistico
} from '../utils/notificacionesPedido';

interface ModalNotificacionPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  datosPedido: DatosPedidoNotificacion | null;
  estatusInicial?: string;
  onEstatusCambiado?: (nuevoEstatus: string) => void;
}

const OPCIONES_ESTATUS_NOTIFICACION = [
  'PENDIENTE',
  'EN TRÁNSITO',
  'EN BODEGA CEDIS',
  'ESPERANDO ENVÍO',
  'DESPACHADO A SUCURSAL',
  'RECIBIDO EN SUCURSAL'
];

export const ModalNotificacionPedido: React.FC<ModalNotificacionPedidoProps> = ({
  isOpen,
  onClose,
  datosPedido,
  estatusInicial,
  onEstatusCambiado
}) => {
  const [estatusSeleccionado, setEstatusSeleccionado] = useState<string>(
    estatusInicial || datosPedido?.estatusActual || 'ESPERANDO ENVÍO'
  );
  const [canalActivo, setCanalActivo] = useState<'correo' | 'whatsapp'>('correo');
  const [correoDestino, setCorreoDestino] = useState<string>(
    datosPedido?.correoDestinatario || ''
  );
  const [copiado, setCopiado] = useState<boolean>(false);

  // Sincronizar correo destino si cambia el pedido
  React.useEffect(() => {
    if (datosPedido) {
      setEstatusSeleccionado(estatusInicial || datosPedido.estatusActual || 'ESPERANDO ENVÍO');
      if (datosPedido.correoDestinatario) {
        setCorreoDestino(datosPedido.correoDestinatario);
      } else if (datosPedido.colaborador) {
        const slug = datosPedido.colaborador.toLowerCase().trim().replace(/\s+/g, '.');
        setCorreoDestino(`${slug}@changanpanama.com`);
      }
    }
  }, [datosPedido, estatusInicial]);

  const notificacion = useMemo(() => {
    if (!datosPedido) return null;
    const pedidoConCorreo = { ...datosPedido, correoDestinatario: correoDestino };
    return generarNotificacionPedido(pedidoConCorreo, estatusSeleccionado);
  }, [datosPedido, estatusSeleccionado, correoDestino]);

  if (!isOpen || !datosPedido || !notificacion) return null;

  const infoMeta = normalizarEstatusLogistico(estatusSeleccionado);

  const handleCopiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleSeleccionarEstatus = (nuevoEstatus: string) => {
    setEstatusSeleccionado(nuevoEstatus);
    if (onEstatusCambiado) {
      onEstatusCambiado(nuevoEstatus);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b121e] border border-cyan-500/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Corporativa Oficial */}
        <div className="bg-gradient-to-r from-slate-950 via-[#0c1829] to-slate-950 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              {canalActivo === 'correo' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  CEDIS Changan Panamá
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {datosPedido.pedidoId}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Notificación Oficial de Trazabilidad
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {/* Banner del Correo Remitente Configurado */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-[11px]">
                <span className="text-slate-400 font-medium">Remitente oficial momentáneo: </span>
                <strong className="text-cyan-300 font-mono font-bold">{CORREO_REMITENTE_OFICIAL}</strong>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 hidden sm:block">
              Outlook Bodega CEDIS
            </div>
          </div>

          {/* Selector Rápido de Estatus (Cada vez que cambia, se recalcula el correo) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Estatus a Comunicar (Actualiza el contenido en tiempo real):</span>
              <span className="text-cyan-400 font-bold">{infoMeta.tituloEstatus}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {OPCIONES_ESTATUS_NOTIFICACION.map((est) => {
                const activo = estatusSeleccionado.toUpperCase().includes(est);
                return (
                  <button
                    key={est}
                    type="button"
                    onClick={() => handleSeleccionarEstatus(est)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border text-left cursor-pointer truncate ${
                      activo
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {est}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pestañas de Canal: Correo vs WhatsApp */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCanalActivo('correo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  canalActivo === 'correo'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Correo Electrónico (Outlook)</span>
              </button>

              <button
                type="button"
                onClick={() => setCanalActivo('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  canalActivo === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Mensajería</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              {datosPedido.items.length} {datosPedido.items.length === 1 ? 'ítem' : 'ítems'}
            </div>
          </div>

          {/* Campos Meta del Mensaje */}
          {canalActivo === 'correo' ? (
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">De (Remitente):</span>
                  <div className="text-cyan-300 font-mono text-xs font-semibold">{CORREO_REMITENTE_OFICIAL}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Para (Asesor / Sucursal):</span>
                  <input
                    type="email"
                    value={correoDestino}
                    onChange={(e) => setCorreoDestino(e.target.value)}
                    placeholder="correo@changanpanama.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Asunto:</span>
                <div className="text-white font-semibold text-xs">{notificacion.asunto}</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-slate-300 text-xs flex items-center justify-between">
              <div>
                <strong className="text-emerald-400">Destinatario WhatsApp: </strong>
                <span>{datosPedido.colaborador} ({datosPedido.sucursal}) &bull; Cliente: {datosPedido.cliente}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                wa.me Directo
              </span>
            </div>
          )}

          {/* Vista Previa del Texto Formateado */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vista Previa del Texto Generado:
              </span>
              <span className="text-[10px] text-slate-400">
                {canalActivo === 'correo' ? 'Formato de Correo Formal' : 'Formato de WhatsApp con Emojis'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap select-all">
              {canalActivo === 'correo' ? notificacion.cuerpoCorreoTexto : notificacion.cuerpoWhatsAppTexto}
            </div>
          </div>
        </div>

        {/* Barra Inferior de Acciones */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleCopiarTexto(canalActivo === 'correo' ? notificacion.cuerpoCorreoTexto : notificacion.cuerpoWhatsAppTexto)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiado ? '¡Copiado al Portapapeles!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              Cerrar
            </button>

            {canalActivo === 'correo' ? (
              <a
                href={notificacion.urlMailto}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir en Outlook / Correo</span>
              </a>
            ) : (
              <a
                href={notificacion.urlWhatsAppWeb}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
