import React, { useState } from 'react';
import { X, FileCode, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { cedisService } from '../services/cedisService';

interface ModalJSONProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
}

export const ModalJSON: React.FC<ModalJSONProps> = ({ isOpen, onClose, onSuccess }) => {
  const [textoJSON, setTextoJSON] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTextoJSON(String(evt.target?.result || ''));
      setErrorMsg(null);
    };
    reader.readAsText(file);
  };

  const handleProcesar = () => {
    const clean = textoJSON.trim();
    if (!clean) {
      setErrorMsg('Pegue el contenido JSON o cargue un archivo .json');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    const res = cedisService.importarBackupJSON(clean);
    setProcesando(false);

    if (res.success && res.mensaje) {
      onSuccess(res.mensaje);
      onClose();
    } else {
      setErrorMsg(res.error || 'Error al procesar el archivo JSON.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <span>Importar Backup JSON (Sistema Anterior)</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-2">
            Seleccione el archivo .json o pegue el contenido a continuación:
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer mb-2"
          />
          <textarea
            rows={5}
            value={textoJSON}
            onChange={(e) => setTextoJSON(e.target.value)}
            placeholder='[ { "id": "PED-VL-2256", "cliente": "EDUARDO HERRERA", "codigo": "8511F270102-0202-AA", "prioridad": "VOR / Unidad Parada", ... } ]'
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
          ></textarea>
        </div>

        <div className="bg-slate-950 p-3 rounded text-[11px] text-slate-400 border border-slate-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Anti-Duplicado Automático:</strong> Se comprobará que ningún cliente reciba piezas ya solicitadas previamente ni se dupliquen IDs de orden existentes.
          </span>
        </div>

        {errorMsg && (
          <div className="bg-red-950/70 border border-red-800 text-red-300 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={procesando || !textoJSON.trim()}
            onClick={handleProcesar}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
          >
            {procesando ? 'Validando y Migrando...' : 'Validar & Migrar Pedidos'}
          </button>
        </div>
      </div>
    </div>
  );
};
