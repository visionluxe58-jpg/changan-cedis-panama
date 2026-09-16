import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Printer,
  QrCode,
  Smartphone
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CHANGAN_BRANCHES } from '../data/mockData';
import { BranchName } from '../types';

interface BranchQrModalProps {
  onClose: () => void;
  onSelectBranchForForm: (branch: BranchName) => void;
}

export const BranchQrModal: React.FC<BranchQrModalProps> = ({
  onClose,
  onSelectBranchForForm,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<BranchName>('Costa Verde');
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [copiedUniversal, setCopiedUniversal] = useState(false);

  // Construct true standalone universal branch portal URL (for all branches)
  const universalPortalUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const cleanBase = window.location.origin + window.location.pathname;
    return `${cleanBase}?portal=sucursales`;
  }, []);

  // Construct specific branch direct link
  const branchFormUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const cleanBase = window.location.origin + window.location.pathname;
    return `${cleanBase}?portal=sucursales&branch=${encodeURIComponent(selectedBranch)}`;
  }, [selectedBranch]);

  const handleCopyUniversal = () => {
    navigator.clipboard.writeText(universalPortalUrl);
    setCopiedUniversal(true);
    setTimeout(() => setCopiedUniversal(false), 2500);
  };

  const handleCopyDirect = () => {
    navigator.clipboard.writeText(branchFormUrl);
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 2500);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_80px_rgba(0,0,0,0.9)] space-y-6 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Acceso y Enlaces del Portal de Sucursales</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  Formulario Únicamente
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Los asesores acceden únicamente al formulario sin ver las matrices de CEDIS.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-mono p-1"
          >
            ✕
          </button>
        </div>

        {/* UNIVERSAL LINK CARD (NEW) */}
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/40 p-4 rounded-2xl space-y-3 print:hidden shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-cyan-500 text-black font-mono font-black text-[10px] rounded uppercase">
                  ENLACE UNIVERSAL
                </span>
                <h4 className="text-sm font-bold text-white font-mono">
                  Enlace para Todas las Sucursales
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                Comparta este enlace único por WhatsApp con cualquier asesor o mecánico. Al abrirlo, eligen su sucursal, el sistema los reconoce automáticamente con su nombre, y en Villa Lucre les pregunta quiénes son para asignarles su área de trabajo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono truncate">
              {universalPortalUrl}
            </div>
            <button
              onClick={handleCopyUniversal}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono transition-all shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              {copiedUniversal ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Enlace Universal</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Branch Selector (Hidden during print) */}
        <div className="space-y-1.5 print:hidden">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-slate-300 font-bold">
              O generar Código QR / Afiche específico por Sucursal:
            </label>
            <span className="text-[11px] text-cyan-400 font-mono">
              Seleccionada: {selectedBranch}
            </span>
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
          >
            {CHANGAN_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Printable Poster Container */}
        <div className="bg-white text-black p-6 rounded-2xl border-4 border-black text-center space-y-4 shadow-xl print:border-2 print:p-8">
          <div className="flex items-center justify-center gap-2 border-b-2 border-black pb-2">
            <div className="bg-black text-white font-black text-xs px-2 py-0.5 tracking-tighter">
              CHANGAN
            </div>
            <span className="font-mono font-bold text-xs uppercase tracking-widest">
              PORTAL OFICIAL DE PEDIDOS ESPECIALES
            </span>
          </div>

          <div>
            <div className="text-[11px] font-mono font-bold uppercase text-slate-600">
              SUCURSAL ASIGNADA:
            </div>
            <h2 className="text-2xl font-black font-mono tracking-tight text-black">
              {selectedBranch.toUpperCase()}
            </h2>
          </div>

          {/* Genuine Dynamic Real-time Scannable QR Code */}
          <div className="relative w-52 h-52 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center border-2 border-black shadow-md">
            <QRCodeSVG
              value={branchFormUrl || 'https://changan.com.pa'}
              size={185}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-900">
              Escanee con la cámara de su teléfono para ingresar repuestos
            </p>
            <p className="text-[10px] text-slate-600 font-mono">
              Mostrador • Taller • Chapistería • Sincronización Inmediata con CEDIS
            </p>
          </div>
        </div>

        {/* Action Buttons (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
          <button
            onClick={handleCopyDirect}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
          >
            {copiedDirect ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Copiar Enlace Directo {selectedBranch}</span>
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={handlePrintPoster}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-mono"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir Afiche</span>
            </button>
            <button
              onClick={() => {
                onSelectBranchForForm(selectedBranch);
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

