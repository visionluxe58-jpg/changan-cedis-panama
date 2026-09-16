import React from 'react';
import { 
  Building2, 
  Store, 
  MapPin, 
  UserCheck, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Truck,
  CheckCircle2
} from 'lucide-react';
import { SUCURSALES_PORTAL, ConfiguracionSucursal } from '../data/sucursalesData';

interface PantallaBienvenidaSucursalProps {
  onSeleccionarSucursal: (sucursal: ConfiguracionSucursal, asesorNombre?: string, canal?: string) => void;
  sucursalActual?: string;
}

export const PantallaBienvenidaSucursal: React.FC<PantallaBienvenidaSucursalProps> = ({
  onSeleccionarSucursal,
  sucursalActual
}) => {
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
              Sistema Integrado de Pedidos Especiales y Surtido a Bodega Central
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e293b] border border-slate-700 text-xs font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>CONECTADO A BASE CENTRAL CEDIS</span>
        </div>
      </header>

      {/* Main Container - Full Width */}
      <main className="w-full flex-1 px-6 lg:px-12 py-8 flex flex-col justify-center">
        
        {/* Banner de Bienvenida y Selección */}
        <div className="w-full mb-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5" /> Punto de Atención al Cliente y Taller
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            ¿En qué sucursal te encuentras hoy?
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Selecciona tu sucursal para cargar automáticamente los catálogos, folios de seguimiento y vincular tu inventario de postventa:
          </p>
        </div>

        {/* Mosaico de 6 Sucursales Oficiales Changan Panamá - Full Width Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SUCURSALES_PORTAL.map((suc) => {
            const esActual = sucursalActual && sucursalActual.toLowerCase() === suc.nombre.toLowerCase();

            return (
              <div
                key={suc.id}
                onClick={() => onSeleccionarSucursal(suc)}
                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between shadow-md relative overflow-hidden group ${
                  esActual 
                    ? 'bg-[#1e293b] border-blue-500 ring-2 ring-blue-500/40' 
                    : 'bg-[#111c2e] border-slate-700/80 hover:bg-[#16243b] hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold group-hover:scale-105 transition-transform">
                      <Store className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#0b1322] border border-slate-700 text-slate-300 font-semibold">
                      {suc.prefijo}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    {suc.nombre}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{suc.descripcionEquipo || "Sucursal Oficial Changan"}</span>
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-700/60 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Canal Habitual</span>
                    <span className="text-xs font-semibold text-slate-200">{suc.canalDefecto}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>Ingresar</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

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
