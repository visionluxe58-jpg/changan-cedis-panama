import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';

interface ModalEliminarMasivoProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoIds: string[];
  onEliminadoExitoso: () => void;
}

export const ModalEliminarMasivo: React.FC<ModalEliminarMasivoProps> = ({
  isOpen,
  onClose,
  pedidoIds,
  onEliminadoExitoso
}) => {
  const [eliminando, setEliminando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmar = async () => {
    setEliminando(true);
    setError(null);

    const res = await appsScriptClient.eliminarPedidosMasivo(pedidoIds);
    setEliminando(false);

    if (res.success) {
      onEliminadoExitoso();
      onClose();
    } else {
      setError(res.error || 'Error al eliminar pedidos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b121e] border border-rose-600/50 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera de Advertencia */}
        <div className="bg-rose-950/40 border-b border-rose-900/40 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-600/50 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Eliminar Pedidos Masivamente
              </h2>
              <span className="text-[11px] text-rose-400 font-mono">
                {pedidoIds.length} pedidos seleccionados
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-6 space-y-4 text-xs text-slate-300">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 rounded-xl space-y-2">
            <p className="text-white font-semibold">
              ¿Está completamente seguro de eliminar {pedidoIds.length} pedidos de la Matriz Central?
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
              <li>Esta acción eliminará tanto las cabeceras como todas sus líneas de repuestos.</li>
              <li>Cualquier pieza asignada en DPL o Kardex será liberada automáticamente a stock disponible.</li>
              <li>La acción quedará registrada en la Auditoría Oficial Inmutable.</li>
            </ul>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-28 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 mb-1">Pedidos a eliminar:</div>
            <div className="flex flex-wrap gap-1.5">
              {pedidoIds.map(id => (
                <span key={id} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                  {id}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={eliminando}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={eliminando}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{eliminando ? 'Eliminando...' : `Sí, Eliminar ${pedidoIds.length} Pedidos`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
