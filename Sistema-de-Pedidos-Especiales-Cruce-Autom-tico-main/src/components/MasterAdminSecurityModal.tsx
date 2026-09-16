import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { CHANGAN_BRANCHES } from '../data/mockData';
import { BranchName, SpecialOrder } from '../types';

interface MasterAdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminUnlocked: boolean;
  onUnlockAdmin: (pin: string) => Promise<boolean>;
  onLockAdmin: () => void;
  onRunFirstLiveTest: () => void;
  orders: SpecialOrder[];
}

export const MasterAdminSecurityModal: React.FC<MasterAdminSecurityModalProps> = ({
  isOpen,
  onClose,
  isAdminUnlocked,
  onUnlockAdmin,
  onLockAdmin,
  onRunFirstLiveTest,
  orders,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const [isVerifying, setIsVerifying] = useState(false);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!pinInput) {
      setErrorMessage('Ingresa el PIN o contraseña de Administrador Maestro.');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await onUnlockAdmin(pinInput);
      if (success) {
        setSuccessMessage('¡Identidad y Autoridad Máxima Verificada! Acceso Total Concedido.');
        setPinInput('');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setErrorMessage('PIN incorrecto. Solo el Administrador Principal autorizado por Gerencia puede desbloquear el control total.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f17] border-2 border-cyan-500/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.25)]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-[#0d1424] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-950/80 border border-cyan-600/50 rounded-2xl text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800">
                  CONTROL MAESTRO & AUDITORÍA
                </span>
                <span className="text-[10px] font-mono text-slate-400">CEDIS CENTRAL</span>
              </div>
              <h2 className="text-xl font-bold text-white font-mono mt-0.5">
                Seguridad & Restricción de Autoridad
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-mono text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isAdminUnlocked
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl border ${
                  isAdminUnlocked
                    ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                    : 'bg-amber-900/50 border-amber-500 text-amber-400'
                }`}
              >
                {isAdminUnlocked ? <Lock className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-mono font-bold text-sm">
                  {isAdminUnlocked
                    ? 'Modo Administrador Maestro ACTIVO (Control Total)'
                    : 'Modo Consulta & Sucursales (Restringido - Solo Lectura / Envío)'}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {isAdminUnlocked
                    ? 'Tienes autorización para modificar estatus, borrar órdenes, cruzar contenedores y alterar inventario.'
                    : 'Las sucursales solo pueden ingresar nuevos pedidos. Ninguna sucursal puede modificar ni borrar registros de CEDIS.'}
                </div>
              </div>
            </div>

            {isAdminUnlocked && (
              <button
                onClick={onLockAdmin}
                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-600/60 text-rose-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Bloquear Control</span>
              </button>
            )}
          </div>

          {/* PIN Unlock Form (If locked) */}
          {!isAdminUnlocked ? (
            <form onSubmit={handleAuthorize} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Desbloquear Control Maestro de Administrador
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Por orden de Gerencia, solo el Administrador Central tiene autorización para editar, facturar, asignar bodegas y autorizar cruces.
                <br />
                <span className="text-cyan-400 font-bold">PIN Maestro por Defecto: 1234 (o CHANGAN2026)</span>
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Ingresa PIN de autorización..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-mono font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                >
                  {isVerifying ? 'Verificando...' : 'Verificar y Desbloquear'}
                </button>
              </div>

              {errorMessage && (
                <div className="text-xs font-mono text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/60 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-800/50 p-4 rounded-2xl text-xs font-mono text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {successMessage || 'Sesión de Administrador activa. Tienes control absoluto del sistema.'}
              </span>
            </div>
          )}

          {/* Section: Primera Prueba en Vivo */}
          <div className="bg-gradient-to-br from-slate-950 via-[#0d1424] to-slate-950 p-5 rounded-2xl border-2 border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Ejecución de Primera Prueba en Vivo (Sucursal ➔ CEDIS ➔ Gerencia)
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded text-[10px] font-mono font-bold">
                TEST DE VALIDACIÓN
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Esta prueba simula el envío inmediato de un pedido real desde la sucursal <b>Chiriquí / Costa Verde</b> hacia el CEDIS Central sin que tú tengas que transcribir nada.
              Observarás cómo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">1. Sucursal Emite</span>
                <span className="text-slate-400">Asesor registra cliente y repuesto sin acceso a alterar otros datos.</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">2. CEDIS Recibe</span>
                <span className="text-slate-400">Ingresa instantáneamente a la sábana con alerta sonora/visual.</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-purple-400 font-bold block mb-1">3. Gerencia Visualiza</span>
                <span className="text-slate-400">Los KPIs y reportes se recalculan en tiempo real con 0 clics manuales.</span>
              </div>
            </div>

            <button
              onClick={() => {
                onRunFirstLiveTest();
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Ejecutar Primera Prueba en Vivo Ahora</span>
            </button>
          </div>

          {/* Security & Access Breakdown Matrix */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase text-slate-400 font-bold">
              Matriz de Permisos & Seguridad Rigurosa
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-rose-400 font-bold block mb-1">⛔ Sucursales (Bloqueadas):</span>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>No pueden modificar pedidos enviados</li>
                  <li>No pueden alterar inventario ni contenedores</li>
                  <li>No pueden cambiar estatus a despachado</li>
                  <li>No pueden ver costos ni modificar facturación</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">👑 Administrador Central (Tú):</span>
                <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>Autoridad exclusiva sobre cruces y despachos</li>
                  <li>Edición y corrección de números de parte</li>
                  <li>Generación de etiquetas térmicas de salida</li>
                  <li>Presentación y exportación de reportes de gerencia</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-xl"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
