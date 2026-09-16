import React, { useState } from 'react';
import { 
  Building2, 
  Store, 
  MapPin, 
  UserCheck, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Truck,
  CheckCircle2,
  Users,
  X,
  ChevronRight,
  Sparkles,
  Share2
} from 'lucide-react';
import { SUCURSALES_PORTAL, ConfiguracionSucursal, PersonalSucursal } from '../data/sucursalesData';

interface PantallaBienvenidaSucursalProps {
  onSeleccionarSucursal: (sucursal: ConfiguracionSucursal, asesorNombre?: string, canal?: string) => void;
  sucursalActual?: string;
  onAbrirModalCompartir?: () => void;
}

export const PantallaBienvenidaSucursal: React.FC<PantallaBienvenidaSucursalProps> = ({
  onSeleccionarSucursal,
  sucursalActual,
  onAbrirModalCompartir
}) => {
  // Estado para modal de selección de asesor en caso de sucursales con equipo múltiple (Villa Lucre y Costa Verde)
  const [sucursalParaEquipo, setSucursalParaEquipo] = useState<ConfiguracionSucursal | null>(null);

  const handleClicSucursal = (suc: ConfiguracionSucursal) => {
    // Si la sucursal es Villa Lucre o Costa Verde (tipoEquipo === 'MULTIPLE'), el asesor debe escoger su nombre
    if (suc.tipoEquipo === 'MULTIPLE' && suc.equipo && suc.equipo.length > 0) {
      setSucursalParaEquipo(suc);
    } else {
      // Para Chiriquí, Santa María, Calle 50, Tumba Muerto, el sistema en automático lo redirige a su usuario
      const asesor = suc.asesorFijo?.nombre || 'Asesor de Servicio';
      const canal = suc.asesorFijo?.area || suc.canalDefecto;
      onSeleccionarSucursal(suc, asesor, canal);
    }
  };

  const handleSeleccionarMiembro = (miembro: PersonalSucursal) => {
    if (!sucursalParaEquipo) return;
    onSeleccionarSucursal(sucursalParaEquipo, miembro.nombre, miembro.area || sucursalParaEquipo.canalDefecto);
    setSucursalParaEquipo(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#0b121e] text-slate-100 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Top Header ERP - Full Width */}
      <header className="w-full bg-[#0f172a] border-b border-slate-700/80 px-6 lg:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-lg lg:text-xl tracking-tight text-white uppercase">
                CHANGAN AUTOMOBILE // DMS POSTVENTA
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                CEDIS PANAMÁ
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Portal Oficial de Requisiciones, Repuestos y Taller de Sucursales
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onAbrirModalCompartir && (
            <button
              type="button"
              onClick={onAbrirModalCompartir}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              title="Compartir enlace seguro con asesores"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir Portal</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e293b] border border-slate-700 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CONECTADO A BASE CENTRAL CEDIS</span>
          </div>
        </div>
      </header>

      {/* Main Container - Full Width */}
      <main className="w-full flex-1 px-6 lg:px-12 py-8 flex flex-col justify-center max-w-7xl mx-auto">
        
        {/* Banner de Bienvenida y Selección */}
        <div className="w-full mb-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5" /> Punto de Atención al Cliente y Taller
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            ¿En qué sucursal te encuentras hoy?
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Selecciona tu sucursal para ingresar de inmediato a tu área de trabajo y registrar requisiciones de repuestos:
          </p>
        </div>

        {/* Mosaico de 6 Sucursales Oficiales Changan Panamá */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SUCURSALES_PORTAL.map((suc) => {
            const esActual = sucursalActual && sucursalActual.toLowerCase() === suc.nombre.toLowerCase();
            const esMultiple = suc.tipoEquipo === 'MULTIPLE';

            return (
              <div
                key={suc.id}
                onClick={() => handleClicSucursal(suc)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-md relative overflow-hidden group hover:scale-[1.01] ${
                  esActual 
                    ? 'bg-[#1e293b] border-blue-500 ring-2 ring-blue-500/40' 
                    : 'bg-[#111c2e] border-slate-700/80 hover:bg-[#16243b] hover:border-blue-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold group-hover:scale-105 transition-transform">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {esMultiple ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Equipo
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Acceso Directo
                        </span>
                      )}
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-[#0b1322] border border-slate-700 text-slate-300 font-bold">
                        {suc.prefijo}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                    {suc.nombre}
                  </h3>
                  
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {esMultiple ? 'Requiere elegir asesor de sucursal' : (suc.asesorFijo ? `Asesor: ${suc.asesorFijo.nombre}` : 'Sucursal Oficial Changan')}
                    </span>
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-700/60 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Canal Habitual</span>
                    <span className="text-xs font-semibold text-slate-300">{suc.canalDefecto}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>{esMultiple ? 'Elegir Asesor' : 'Ingresar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* Modal para selección de asesor en Villa Lucre y Costa Verde */}
      {sucursalParaEquipo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-5 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    {sucursalParaEquipo.nombre}
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                      {sucursalParaEquipo.prefijo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecciona tu nombre para ingresar a tu sesión
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSucursalParaEquipo(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Miembros de la Sucursal */}
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto custom-scroll">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
                Asesores Registrados en {sucursalParaEquipo.nombre}:
              </div>

              {sucursalParaEquipo.equipo?.map((miembro) => (
                <button
                  key={miembro.id}
                  type="button"
                  onClick={() => handleSeleccionarMiembro(miembro)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#131e33] hover:bg-blue-600/20 border border-slate-700/80 hover:border-blue-500/50 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-sm group-hover:scale-105 transition-transform shrink-0">
                      {miembro.nombre[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors truncate">
                        {miembro.nombre}
                      </div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                        <span className="text-sky-400 font-medium">{miembro.cargo}</span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="text-slate-400">{miembro.area}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              ))}
            </div>

            {/* Footer Informativo */}
            <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-500">
              Tus requisiciones se asociarán automáticamente a tu nombre y sucursal.
            </div>
          </div>
        </div>
      )}

      {/* Footer ERP - Full Width */}
      <footer className="w-full bg-[#0f172a] border-t border-slate-700/80 px-6 lg:px-12 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div>
          Changan Auto Panamá S.A. • Bodega Central CEDIS Logistics Platform v3.0
        </div>
        <div className="flex items-center gap-4">
          <span>Soporte Técnico: bodegacentral@changanpanama.com</span>
        </div>
      </footer>

    </div>
  );
};
