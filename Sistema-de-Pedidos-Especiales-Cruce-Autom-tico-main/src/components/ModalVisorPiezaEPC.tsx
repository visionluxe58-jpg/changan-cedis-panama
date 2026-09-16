import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Search, ExternalLink, Image as ImageIcon, Link2 } from 'lucide-react';
import { servicioImagenesRepuestos } from '../services/servicioImagenesRepuestos';

interface ModalVisorPiezaEPCProps {
  isOpen: boolean;
  onClose: () => void;
  repuesto: {
    numeroParte: string;
    descripcion: string;
    cantidad?: number;
    subsistema?: string;
  } | null;
  modeloVehiculo?: string;
  onActualizarImagen?: (codigo: string, url: string) => void;
}

export const ModalVisorPiezaEPC: React.FC<ModalVisorPiezaEPCProps> = ({
  isOpen,
  onClose,
  repuesto,
  modeloVehiculo = 'Changan CS35 Plus / Universal',
  onActualizarImagen
}) => {
  const [urlPersonalizada, setUrlPersonalizada] = useState<string>('');
  const [mostrandoInputUrl, setMostrandoInputUrl] = useState<boolean>(false);

  if (!isOpen || !repuesto) return null;

  const fotoActual = servicioImagenesRepuestos.obtenerFotoRepuesto(repuesto.numeroParte, repuesto.descripcion);
  const enlaceGoogle = servicioImagenesRepuestos.generarEnlaceBusquedaGoogle(repuesto.numeroParte, repuesto.descripcion);

  const handleGuardarNuevaUrl = () => {
    if (urlPersonalizada.trim()) {
      servicioImagenesRepuestos.guardarFotoPersonalizada(repuesto.numeroParte, urlPersonalizada.trim());
      if (onActualizarImagen) {
        onActualizarImagen(repuesto.numeroParte, urlPersonalizada.trim());
      }
      setMostrandoInputUrl(false);
      setUrlPersonalizada('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior */}
        <div className="bg-[#0b172a] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <span>CHANGAN AUTO PANAMÁ</span>
              <span>/</span>
              <span>REPUESTO GENUINO DE PLANTA</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-2">
              <span className="font-mono text-sky-300">{repuesto.numeroParte}</span>
              <span className="text-slate-300 font-normal">&bull; {repuesto.descripcion}</span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal: Fotografía Real + Opciones de Búsqueda Online */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Lado Izquierdo: Fotografía Real de Producto Automotriz */}
          <div className="md:col-span-7 p-6 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm aspect-square bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-center overflow-hidden relative group">
              <img 
                src={fotoActual} 
                alt={repuesto.descripcion}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider">
                FOTO OFICIAL OEM
              </div>
            </div>

            <span className="text-xs text-slate-500 mt-3 text-center">
              Fotografía de componente real para verificación física del asesor en taller.
            </span>
          </div>

          {/* Lado Derecho: Acciones de Búsqueda en Internet & Ficha Técnica */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between bg-white">
            <div className="space-y-4">
              
              {/* Botón de Búsqueda en Google Imágenes */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200/80 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-sky-600" />
                  <span>Búsqueda en Línea del Repuesto</span>
                </span>
                
                <p className="text-xs text-slate-600 leading-relaxed">
                  ¿Desea corroborar fotos adicionales de este repuesto en internet o catálogos web?
                </p>

                <a
                  href={enlaceGoogle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Search className="w-4 h-4" />
                  <span>Buscar "{repuesto.numeroParte}" en Google Imágenes</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>

                {/* Opción de pegar URL directa */}
                {!mostrandoInputUrl ? (
                  <button
                    type="button"
                    onClick={() => setMostrandoInputUrl(true)}
                    className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold underline block pt-1 cursor-pointer"
                  >
                    + Vincular otra imagen de internet (pegar URL)
                  </button>
                ) : (
                  <div className="pt-2 space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-bold text-slate-700 block">
                      Pegar enlace directo de imagen (JPG / PNG):
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/repuesto.jpg"
                        value={urlPersonalizada}
                        onChange={(e) => setUrlPersonalizada(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleGuardarNuevaUrl}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shrink-0 cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ficha Técnica */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Vehículo Aplicable:</span>
                  <span className="font-bold text-slate-800">{modeloVehiculo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Cantidad Solicitada:</span>
                  <span className="font-mono font-bold text-emerald-700">{repuesto.cantidad || 1} un.</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Disponibilidad en CEDIS:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> En Stock para Despacho
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Todos los repuestos son originales Changan ensamblados bajo norma internacional ISO/TS 16949.
                </span>
              </div>
            </div>

            {/* Botón de Salida */}
            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0b172a] hover:bg-slate-800 text-white font-bold text-xs transition shadow cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirmar y Continuar</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
