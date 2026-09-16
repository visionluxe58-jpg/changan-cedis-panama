import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  Boxes, 
  TrendingUp, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { DetalleDPL, Pedido } from '../types/cedis';
import { AILogisticsService, AIAnalysisResult } from '../services/aiLogisticsService';

interface ModalAILogisticsProps {
  isOpen: boolean;
  onClose: () => void;
  pedidos: Pedido[];
  detalleDPL: DetalleDPL[];
}

export const ModalAILogistics: React.FC<ModalAILogisticsProps> = ({
  isOpen,
  onClose,
  pedidos,
  detalleDPL,
}) => {
  const [analisis, setAnalisis] = useState<AIAnalysisResult | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);

  const ejecutarAnalisis = async () => {
    setCargando(true);
    try {
      const res = await AILogisticsService.analizarOperacionCedis(pedidos, detalleDPL);
      setAnalisis(res);
    } catch (e) {
      console.error('Error en AI Logistics:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      ejecutarAnalisis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-400">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Google AI (Gemini) Logística & Picking</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Optimización de rutas de montacargas, detección de quiebres y priorización VOR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
          {cargando ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <p>Procesando reglas heurísticas y modelos de despacho...</p>
            </div>
          ) : analisis ? (
            <>
              {/* Resumen */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="text-cyan-400 font-bold uppercase text-[10px] tracking-wider block">
                  Diagnóstico Operativo
                </span>
                <p className="text-slate-300 leading-relaxed">{analisis.resumen}</p>
              </div>

              {/* Alertas Críticas / VOR */}
              <div className="space-y-2">
                <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Alertas de Máxima Prioridad (VOR & Garantías)</span>
                </span>
                <div className="space-y-1.5">
                  {analisis.alertasPrioritarias.map((alerta, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-300 leading-relaxed text-[11px]"
                    >
                      {alerta}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendaciones de Picking por Pallet */}
              <div className="space-y-2">
                <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-blue-400" />
                  <span>Rutas de Picking Recomendadas por Pallet</span>
                </span>
                <div className="space-y-2">
                  {analisis.recomendacionesPicking.length === 0 ? (
                    <div className="bg-slate-950 p-3 rounded-lg text-slate-500 text-center">
                      No hay piezas asignadas pendientes de extracción física.
                    </div>
                  ) : (
                    analisis.recomendacionesPicking.map((p, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border space-y-2 ${
                          p.prioridad === 'ALTA'
                            ? 'bg-red-950/20 border-red-900/50'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-300">
                            Pallet {p.pallet} ({p.contenedor})
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              p.prioridad === 'ALTA'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Prioridad {p.prioridad}
                          </span>
                        </div>

                        <p className="text-slate-400 text-[11px]">{p.sugerencia}</p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.repuestos.map((rep, rIdx) => (
                            <span
                              key={rIdx}
                              className="bg-slate-900 border border-slate-700 text-white font-mono px-2 py-0.5 rounded text-[10px]"
                            >
                              {rep}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sugerencias de Abastecimiento Fábrica */}
              {analisis.sugerenciasAbastecimiento.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Recomendación de Reordenamiento Mobitech</span>
                  </span>
                  <div className="space-y-1.5">
                    {analisis.sugerenciasAbastecimiento.map((sug, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-300 text-[11px]"
                      >
                        {sug}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={ejecutarAnalisis}
            disabled={cargando}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span>Reevaluar con Gemini</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
