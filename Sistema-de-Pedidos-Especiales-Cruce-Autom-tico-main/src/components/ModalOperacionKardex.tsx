import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cedisService } from '../services/cedisService';

interface ModalOperacionKardexProps {
  isOpen: boolean;
  onClose: () => void;
  uidFila: string;
  codigoRepuesto: string;
  pallet: string;
  onSuccess: () => void;
}

export const ModalOperacionKardex: React.FC<ModalOperacionKardexProps> = ({
  isOpen,
  onClose,
  uidFila,
  codigoRepuesto,
  pallet,
  onSuccess,
}) => {
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('');
  const [responsable, setResponsable] = useState<string>('Auditor CEDIS');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmar = () => {
    if (cantidad <= 0) {
      setErrorMsg('Ingrese una cantidad válida mayor a cero.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    const res = cedisService.registrarAjusteMerma(
      uidFila,
      cantidad,
      motivo.trim() || 'Ajuste físico en pallet',
      responsable.trim() || 'Auditor CEDIS'
    );

    setProcesando(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Error al procesar el ajuste de inventario.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Ajuste de Inventario (Merma / Daño)</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Repuesto y Pallet</label>
            <input
              type="text"
              readOnly
              value={`${codigoRepuesto} (Pallet ${pallet})`}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Cantidad a Descontar *</label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Motivo / No. de Traslado</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Daño de empaque en descarga o rotura"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Responsable del Ajuste</label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-950/70 border border-red-800 text-red-300 text-xs p-2.5 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={procesando}
            onClick={handleConfirmar}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded text-xs transition shadow cursor-pointer"
          >
            {procesando ? 'Procesando...' : 'Confirmar Ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
};
