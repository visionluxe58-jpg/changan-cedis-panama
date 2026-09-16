import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageSquare, 
  ExternalLink, 
  QrCode, 
  Boxes, 
  Smartphone, 
  Building2, 
  Users, 
  Send,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Wifi,
  Globe,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Asesor } from '../types/cedis';
import { EQUIPO_BODEGA_CEDIS, BodegueroCedis } from '../data/bodeguerosData';

interface ModalCompartirProps {
  isOpen: boolean;
  onClose: () => void;
  asesores?: Asesor[];
  tabInicial?: 'pdt' | 'portal';
}


// Enlaces HTTPS cortos garantizados para WhatsApp (reconocidos como hipervínculo azul en cualquier celular)
export const ENLACES_WHATSAPP_PDT: Record<string, string> = {
  CE001: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE001', // Issac
  CE002: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE002', // Josue
  CE003: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE003', // Felix
  CE004: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE004', // Dilan
  CE005: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE005', // Joel (Admin)
  CE006: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE006', // Emanuel
  CE007: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis&operador=CE007', // Angel
  cedis_general: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=cedis',
  sucursal_general: 'https://score-quote-pickup-church.trycloudflare.com/?pdt=sucursal',
};

const STORAGE_KEY_CUSTOM_HOST = 'changan_custom_share_host_v1';

export const ModalCompartir: React.FC<ModalCompartirProps> = ({ 
  isOpen, 
  onClose, 
  asesores = [],
  tabInicial = 'pdt'
}) => {
  const [tabActiva, setTabActiva] = useState<'pdt' | 'portal'>(tabInicial);
  const [copiadoGeneral, setCopiadoGeneral] = useState<boolean>(false);
  const [copiadoCodigo, setCopiadoCodigo] = useState<string | null>(null);
  const [mostrarAyudaWhatsApp, setMostrarAyudaWhatsApp] = useState<boolean>(false);

  // Host base personalizable (para reemplazar localhost por IP de red o dominio público)
  const [customHost, setCustomHost] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_HOST);
      if (saved) return saved;
    } catch (e) {}

    // Si está en localhost, sugerir la IP local de red detectada
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return 'https://score-quote-pickup-church.trycloudflare.com';
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
  });

  const [editandoHost, setEditandoHost] = useState<boolean>(false);
  const [usarEnlaceCorto, setUsarEnlaceCorto] = useState<boolean>(true);

  if (!isOpen) return null;

  const baseOrigin = customHost.trim().replace(/\/+$/, '') || window.location.origin;
  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const currentUrl = `${baseOrigin}${currentPath ? currentPath : ''}/`;
  
  const rawUrlPdtCedis = `${currentUrl}?pdt=cedis`;
  const urlPdtCedis = (usarEnlaceCorto && ENLACES_WHATSAPP_PDT.cedis_general) ? ENLACES_WHATSAPP_PDT.cedis_general : rawUrlPdtCedis;
  const rawUrlSucursales = `${currentUrl}?portal=sucursales`;
  const urlSucursales = (usarEnlaceCorto && ENLACES_WHATSAPP_PDT.sucursal_general) ? ENLACES_WHATSAPP_PDT.sucursal_general : rawUrlSucursales;

  const handleGuardarHost = (nuevo: string) => {
    const limpio = nuevo.trim().replace(/\/+$/, '');
    setCustomHost(limpio);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_HOST, limpio);
    } catch (e) {}
  };

  const handleCopiarGeneral = () => {
    const url = tabActiva === 'pdt' ? urlPdtCedis : urlSucursales;
    navigator.clipboard.writeText(url);
    setCopiadoGeneral(true);
    setTimeout(() => setCopiadoGeneral(false), 2500);
  };

  const handleCopiarPersonal = (codigo: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiadoCodigo(codigo);
    setTimeout(() => setCopiadoCodigo(null), 2500);
  };

  // Formato optimizado para WhatsApp: con saltos de línea limpios para forzar hipervínculo azul
  const whatsappPdtCedis = `https://api.whatsapp.com/send?text=${encodeURIComponent(
`📱 *CHANGAN AUTO - TERMINAL MÓVIL PDT (CEDIS)*

Equipo de Bodega Central, aquí tienen el enlace para escanear contenedores, pallets y repuestos especiales desde sus celulares:

${urlPdtCedis}

_Toca el enlace azul arriba para abrir la cámara de la terminal._`
  )}`;

  const whatsappGroupPortal = `https://api.whatsapp.com/send?text=${encodeURIComponent(
`🚗 *CHANGAN PANAMÁ - PORTAL DE PEDIDOS A CEDIS*

Estimado asesor, ingresa tus solicitudes de repuestos, colisión y garantías en el siguiente enlace:

${urlSucursales}

_Toca el enlace azul arriba para abrir el portal._`
  )}`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-scaleIn max-h-[94vh] flex flex-col">
        
        {/* Cabecera Principal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl border ${tabActiva === 'pdt' ? 'bg-blue-950/80 border-blue-500/40 text-blue-400' : 'bg-purple-950/80 border-purple-500/40 text-purple-400'}`}>
              {tabActiva === 'pdt' ? <Smartphone className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                {tabActiva === 'pdt' ? 'Terminal PDT CEDIS: Acceso para Bodegueros' : 'Difusión del Portal de Sucursales'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {tabActiva === 'pdt' 
                  ? 'Enlaces con hipervínculo directo para el equipo de bodega (CE001 a CE007)' 
                  : 'Enlace oficial para requisiciones de repuestos desde sucursales'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Selección */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTabActiva('pdt')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === 'pdt'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 PDT CEDIS (Bodegueros)</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('portal')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === 'portal'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏢 Portal Sucursales (Asesores)</span>
          </button>
        </div>

        {/* BARRA DE CONFIGURACIÓN DE DIRECCIÓN / IP (Resuelve el problema de hipervínculo en celulares) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              Dirección de Red para Celulares:
            </span>
            <button
              type="button"
              onClick={() => setEditandoHost(!editandoHost)}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              {editandoHost ? 'Listo' : 'Cambiar IP / Dominio'}
            </button>
          </div>

          {editandoHost ? (
            <div className="mt-1.5 space-y-1.5">
              <input
                type="text"
                value={customHost}
                onChange={(e) => handleGuardarHost(e.target.value)}
                placeholder="http://192.168.0.3:3002 o https://tudominio.com"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-cyan-500/50 rounded-lg text-white font-mono text-[11px] focus:outline-none"
              />
              <div className="flex gap-1.5 flex-wrap text-[10px]">
                <button
                  type="button"
                  onClick={() => handleGuardarHost(`http://192.168.0.3:${window.location.port || '3002'}`)}
                  className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono"
                >
                  Usar IP Local: 192.168.0.3
                </button>
                <button
                  type="button"
                  onClick={() => handleGuardarHost(window.location.origin)}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono"
                >
                  Usar Origen Navegador ({window.location.hostname})
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-cyan-300 truncate">{baseOrigin}</span>
              <span className="text-[10px] text-emerald-400 font-sans font-bold shrink-0 ml-2">✓ Activo</span>
            </div>
          )}
        </div>

        {/* ALERTA / AYUDA SOBRE HIPERVÍNCULOS EN WHATSAPP */}
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200/90 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <b className="text-white block font-bold">¿Por qué WhatsApp a veces no muestra el enlace en azul?</b>
            1. <b>Si usas "localhost":</b> WhatsApp no lo convierte en enlace azul porque no es un dominio público ni IP. Con la IP <b>{baseOrigin}</b> sí se activa como hipervínculo.
            <br />
            2. <b>Medida Anti-Spam de WhatsApp:</b> Si el bodeguero <b>no tiene tu número guardado en sus contactos</b>, WhatsApp bloquea los hipervínculos por seguridad hasta que el bodeguero agregue tu contacto o te responda cualquier mensaje (ej. <i>"Ok"</i>).
          </div>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scroll">
          
          {/* ======================================================== */}
          {/* TAB 1: TERMINAL PDT PARA BODEGUEROS CEDIS                 */}
          {/* ======================================================== */}
          {tabActiva === 'pdt' ? (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Input con Botón Copiar General */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Enlace General para Bodega (Con Selector de Nombre)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={urlPdtCedis}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-cyan-400 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopiarGeneral}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition whitespace-nowrap cursor-pointer"
                  >
                    {copiadoGeneral ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiadoGeneral ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Grid QR en Pantalla & Difusión WhatsApp Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 items-center">
                
                {/* Código QR para Escaneo Inmediato desde la pantalla */}
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                        urlPdtCedis
                      )}`}
                      alt="Código QR Terminal PDT CEDIS"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-cyan-300 mt-2 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                    Escanear desde la pantalla
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Abre el PDT de CEDIS en el teléfono
                  </span>
                </div>

                {/* Enlace WhatsApp a Grupo */}
                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Grupo de WhatsApp CEDIS
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Envía el enlace al grupo general de bodega con formato de hipervínculo limpio.
                  </p>
                  <a
                    href={whatsappPdtCedis}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-2.5 rounded-xl flex items-center justify-center gap-2 shadow transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Compartir al Grupo</span>
                  </a>
                </div>
              </div>

              {/* DIRECTORIO DE BODEGUEROS CEDIS CON ENLACE PERSONALIZADO */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-300 uppercase flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    Enlaces Personalizados por Bodeguero ({EQUIPO_BODEGA_CEDIS.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Identificación directa</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scroll">
                  {EQUIPO_BODEGA_CEDIS.map((b) => {
                    const urlPersonal = (usarEnlaceCorto && ENLACES_WHATSAPP_PDT[b.codigo]) ? ENLACES_WHATSAPP_PDT[b.codigo] : `${rawUrlPdtCedis}&operador=${b.codigo}`;
                    const msgWa = encodeURIComponent(
`📱 *CHANGAN CEDIS - TERMINAL MÓVIL PDT*

Hola *${b.nombre}* (${b.cargo}), aquí tienes tu acceso directo personalizado para escanear y desconsolidar pallets en CEDIS:

${urlPersonal}

_Toca el enlace azul arriba para abrir la terminal con tu perfil._`
                    );
                    const linkWa = `https://api.whatsapp.com/send?text=${msgWa}`;
                    const estaCopiado = copiadoCodigo === b.codigo;

                    return (
                      <div 
                        key={b.codigo}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border ${b.colorBadge}`}>
                            {b.codigo}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{b.nombre}</span>
                              {b.esAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 text-[11px] block">{b.cargo}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopiarPersonal(b.codigo, urlPersonal)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition cursor-pointer"
                            title="Copiar enlace personalizado"
                          >
                            {estaCopiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          
                          <a
                            href={linkWa}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition cursor-pointer"
                            title={`Enviar hipervínculo a WhatsApp de ${b.nombre}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* TAB 2: DIFUSIÓN DEL PORTAL DE SUCURSALES                 */
            /* ======================================================== */
            <div className="space-y-4 animate-fadeIn">
              
              {/* Input con Botón Copiar */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Enlace Oficial para Asesores
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={urlSucursales}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-purple-400 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopiarGeneral}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition whitespace-nowrap cursor-pointer"
                  >
                    {copiadoGeneral ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiadoGeneral ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Grid QR & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 items-center">
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="bg-white p-2 rounded-xl shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                        urlSucursales
                      )}`}
                      alt="Código QR Portal Sucursales"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2">
                    Escanear con cámara para abrir Portal
                  </span>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                  <span className="text-xs font-bold text-white">Difusión Inmediata por WhatsApp</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Envía el enlace oficial junto con el formato de requisición directamente al grupo operativo de sucursales.
                  </p>
                  <a
                    href={whatsappGroupPortal}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-2.5 rounded-xl flex items-center justify-center gap-2 shadow transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Compartir al Grupo</span>
                  </a>
                </div>
              </div>

              {/* Directorio de Contactos Rápidos */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase block mb-2">
                  Directorio de Asesores de Sucursal
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 custom-scroll">
                  {asesores.map((a) => {
                    const numLimpio = (a.contacto || '').replace(/[^0-9]/g, '');
                    const msg = encodeURIComponent(
`🚗 *CHANGAN PANAMÁ - PORTAL DE PEDIDOS A CEDIS*

Hola ${a.nombre}, aquí tienes el portal oficial de requisición de repuestos a CEDIS:

${urlSucursales}

_Toca el enlace azul arriba para abrir el portal._`
                    );
                    const waLink = `https://api.whatsapp.com/send?phone=${numLimpio}&text=${msg}`;

                    return (
                      <div
                        key={a.nombre}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 text-xs border border-slate-800"
                      >
                        <div>
                          <span className="font-bold text-white block">{a.nombre}</span>
                          <span className="text-slate-400 text-[11px]">
                            {a.sucursal} - {a.cargo}
                          </span>
                        </div>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-950 border border-emerald-700 hover:bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Changan Auto Panamá • Trazabilidad CEDIS v2</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
