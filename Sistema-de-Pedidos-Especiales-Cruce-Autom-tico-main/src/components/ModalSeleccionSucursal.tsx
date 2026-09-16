import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  UserCheck, 
  Search, 
  X, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Users, 
  User, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  SUCURSALES_PORTAL, 
  ConfiguracionSucursal, 
  PersonalSucursal 
} from '../data/sucursalesData';

interface ModalSeleccionSucursalProps {
  isOpen: boolean;
  onClose: () => void;
  sucursalActual: string;
  colaboradorActual: string;
  onSeleccionar: (config: {
    sucursal: string;
    colaborador: string;
    canal: string;
    prefijo: string;
    personalId?: string;
  }) => void;
}

export const ModalSeleccionSucursal: React.FC<ModalSeleccionSucursalProps> = ({
  isOpen,
  onClose,
  sucursalActual,
  colaboradorActual,
  onSeleccionar
}) => {
  const [sucursalSeleccionadaParaEquipo, setSucursalSeleccionadaParaEquipo] = useState<ConfiguracionSucursal | null>(null);
  const [filtroTextoPersonal, setFiltroTextoPersonal] = useState<string>('');

  if (!isOpen) return null;

  const handleElegirSucursal = (suc: ConfiguracionSucursal) => {
    if (suc.tipoEquipo === 'INDIVIDUAL' && suc.asesorFijo) {
      // Para sucursales individuales se asigna automáticamente de inmediato
      onSeleccionar({
        sucursal: suc.nombre,
        colaborador: suc.asesorFijo.nombre,
        canal: suc.asesorFijo.area || suc.canalDefecto,
        prefijo: suc.prefijo,
        personalId: suc.asesorFijo.id
      });
      onClose();
    } else {
      // Para sucursales de equipo múltiple se abre la lista para buscar y seleccionar quién es
      setSucursalSeleccionadaParaEquipo(suc);
      setFiltroTextoPersonal('');
    }
  };

  const handleElegirMiembroEquipo = (persona: PersonalSucursal, suc: ConfiguracionSucursal) => {
    onSeleccionar({
      sucursal: suc.nombre,
      colaborador: persona.nombre,
      canal: persona.area || suc.canalDefecto,
      prefijo: suc.prefijo,
      personalId: persona.id
    });
    setSucursalSeleccionadaParaEquipo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#09111e] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_-10px_rgba(6,182,212,0.2)] overflow-hidden p-6 sm:p-8">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!sucursalSeleccionadaParaEquipo ? (
          /* VISTA 1: Selector Principal de Sucursales (Formato exacto de Image 1) */
          <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Portal de Sucursales Changan Panamá
                </h2>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                  ¿De qué sucursal eres? Selecciona tu sucursal para configurar automáticamente tus datos y número de seguimiento:
                </p>
              </div>
            </div>

            {/* Grid de Sucursales (2 columnas como en la captura) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {SUCURSALES_PORTAL.map((suc) => {
                const esMultiple = suc.tipoEquipo === 'MULTIPLE';
                const esActiva = sucursalActual.toLowerCase() === suc.nombre.toLowerCase();

                return (
                  <button
                    key={suc.id}
                    type="button"
                    onClick={() => handleElegirSucursal(suc)}
                    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                      esMultiple
                        ? 'border-amber-500/60 bg-gradient-to-br from-slate-900/90 via-amber-950/20 to-slate-900/90 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
                        : esActiva
                        ? 'border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800/90 bg-slate-950/60 hover:border-cyan-600/70 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white tracking-tight">
                          {suc.nombre}
                        </span>
                        {esMultiple && (
                          <span className="text-amber-400 text-sm">★</span>
                        )}
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        esMultiple
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {suc.badge}
                      </span>
                    </div>

                    {esMultiple ? (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-300 font-medium">
                          {suc.equipo?.map(e => e.nombre.split(' ')[0]).join(', ')}
                        </div>
                        <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Te preguntará quién eres para reconocer tu área</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-xs text-slate-300">
                          Asesor Asignado: <strong className="text-white font-semibold">{suc.asesorFijo?.nombre}</strong>
                        </div>
                        <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-mono">
                          <span>✓</span>
                          <span>Seguimiento automático: PED-{suc.prefijo}-...</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* VISTA 2: "¿Quién eres en [Sucursal]?" para Sucursales con Equipo Múltiple (Formato exacto de Image 2) */
          <div className="space-y-5">
            {/* Botón Volver */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSucursalSeleccionadaParaEquipo(null)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a sucursales</span>
              </button>

              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {sucursalSeleccionadaParaEquipo.nombre.toUpperCase()} SUCURSAL
              </span>
            </div>

            {/* Cabecera */}
            <div className="flex items-start gap-3.5 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  ¿Quién eres en {sucursalSeleccionadaParaEquipo.nombre}?
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Selecciona tu nombre. El sistema reconocerá automáticamente tu área asignada:
                </p>
              </div>
            </div>

            {/* Buscador de personal para sucursal con equipo múltiple */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={filtroTextoPersonal}
                onChange={(e) => setFiltroTextoPersonal(e.target.value)}
                placeholder="Buscar tu nombre o cargo en el listado..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            {/* Lista interactiva de colaboradores (como en Image 2) */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {sucursalSeleccionadaParaEquipo.equipo
                ?.filter(p => 
                  !filtroTextoPersonal.trim() ||
                  p.nombre.toLowerCase().includes(filtroTextoPersonal.toLowerCase()) ||
                  p.cargo.toLowerCase().includes(filtroTextoPersonal.toLowerCase()) ||
                  p.area.toLowerCase().includes(filtroTextoPersonal.toLowerCase())
                )
                .map((persona) => {
                  const esActivo = colaboradorActual.toLowerCase() === persona.nombre.toLowerCase();

                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => handleElegirMiembroEquipo(persona, sucursalSeleccionadaParaEquipo)}
                      className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between text-left group ${
                        esActivo
                          ? 'border-cyan-500 bg-cyan-950/40 shadow-lg'
                          : 'border-slate-800/80 bg-slate-950/60 hover:border-cyan-500/60 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white tracking-tight group-hover:text-cyan-300 transition">
                            {persona.nombre}
                          </div>
                          <div className="text-xs text-slate-400">
                            {persona.cargo}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                          Área: {persona.area}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
