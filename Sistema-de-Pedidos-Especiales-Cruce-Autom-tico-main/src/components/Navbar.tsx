import React from 'react';
import { 
  RefreshCw,
  QrCode,
  Building2, 
  Boxes, 
  Ship, 
  FileSpreadsheet, 
  PenTool, 
  History, 
  Layers, 
  UserCheck, 
  CheckCircle2, 
  Settings,
  Share2,
  Lock,
  Upload,
  ExternalLink,
  BarChart3,
  Search
} from 'lucide-react';
import { UsuarioActivo, RolUsuario } from '../types/cedis';
import { USUARIOS_OFICIALES } from '../services/appsScriptClient';

export type ModuloActivo = 'dashboard' | 'matriz' | 'formulario' | 'kardex' | 'conciliacion' | 'auditoria' | 'cruce' | 'reporte_fabrica' | 'pdt';

interface NavbarProps {
  moduloActivo: ModuloActivo;
  setModuloActivo: (mod: ModuloActivo) => void;
  usuarioActivo: UsuarioActivo;
  onCambiarUsuario: (usuario: UsuarioActivo) => void;
  totalPedidos: number;
  totalContenedores: number;
  onAbrirModalSheets: () => void;
  onAbrirModalCompartir: () => void;
  onAbrirModalDPL: () => void;
  onAbrirPortalSucursales?: () => void;
  onAbrirRastreador?: () => void;
  onSincronizarNube?: () => void;
  sincronizandoNube?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  moduloActivo,
  setModuloActivo,
  usuarioActivo,
  onCambiarUsuario,
  totalPedidos,
  totalContenedores,
  onAbrirModalSheets,
  onAbrirModalCompartir,
  onAbrirModalDPL,
  onAbrirPortalSucursales,
  onAbrirRastreador,
  onSincronizarNube,
  sincronizandoNube = false
}) => {
  const getBadgeRol = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMINISTRADOR_CEDIS':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'OPERADOR_CEDIS':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'SUCURSAL_ASESOR':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CONSULTA':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="bg-[#080e1c]/95 backdrop-blur-md border-b border-sky-500/20 px-4 lg:px-6 py-2.5 sticky top-0 z-40 shadow-[0_0_25px_rgba(2,132,199,0.12)]">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo e Identidad */}
        <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20">
              <Ship className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-black text-sm tracking-tight">
                CHANGAN AUTO
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                CEDIS V3
              </span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-700 hidden sm:block"></div>

          {/* Selector de Usuario Activo y Rol */}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={usuarioActivo.usuarioId}
              onChange={(e) => {
                const found = USUARIOS_OFICIALES.find(u => u.usuarioId === e.target.value);
                if (found) {
                  onCambiarUsuario(found);
                }
              }}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {USUARIOS_OFICIALES.map(u => (
                <option key={u.usuarioId} value={u.usuarioId} className="bg-slate-900 text-slate-200">
                  {u.nombre} ({u.rol.replace('_', ' ')}) - {u.sucursal}
                </option>
              ))}
            </select>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeRol(usuarioActivo.rol)}`}>
              {usuarioActivo.rol === 'ADMINISTRADOR_CEDIS' && 'ADMIN'}
              {usuarioActivo.rol === 'OPERADOR_CEDIS' && 'OPERADOR'}
              {usuarioActivo.rol === 'SUCURSAL_ASESOR' && 'SUCURSAL'}
              {usuarioActivo.rol === 'CONSULTA' && 'CONSULTA'}
            </span>

            {/* Indicador de Conexión en Vivo con Google Sheets */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-medium text-emerald-300 shadow-sm" title="Conectado bidireccionalmente a Google Sheets (Spreadsheet Oficial)">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Sheets En Línea</span>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación Operativa V3 Prominentes */}
        <nav className="flex items-center flex-wrap gap-1.5">
          {/* 1. MATRIZ CENTRAL */}
          <button
            type="button"
            onClick={() => setModuloActivo('matriz')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              moduloActivo === 'matriz'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800'
            }`}
            title="Matriz Central de Pedidos y Repuestos"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Matriz Central</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-extrabold">{totalPedidos}</span>
          </button>

          {/* 2. DPL & CRUCE DE CONTENEDORES (Prominente y siempre visible) */}
          <button
            type="button"
            onClick={() => setModuloActivo('cruce')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              moduloActivo === 'cruce'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400'
                : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-800/50 hover:border-cyan-500/60'
            }`}
            title="DPL y Cruce Automático de Contenedores de Fábrica"
          >
            <Ship className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-extrabold tracking-wide">DPL & Contenedores</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-extrabold">{totalContenedores}</span>
          </button>

          {/* 3. + NUEVA REQUISICIÓN */}
          <button
            type="button"
            onClick={() => setModuloActivo('formulario')}
            className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              moduloActivo === 'formulario'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-slate-800'
            }`}
            title="Crear Requisición Interna de Repuestos"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Requisición</span>
          </button>

          {/* 4. ACCESO PORTAL SUCURSALES */}
          {onAbrirPortalSucursales && (
            <button
              type="button"
              onClick={onAbrirPortalSucursales}
              className="text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition bg-slate-900/90 hover:bg-indigo-950/80 border border-indigo-700/50 hover:border-indigo-500 text-indigo-300 shadow-sm cursor-pointer"
              title="Abrir vista exclusiva del Portal de Sucursales (?portal=sucursales)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Portal Asesores</span>
            </button>
          )}

          {/* 5. RASTREADOR UNIVERSAL */}
          {onAbrirRastreador && (
            <button
              type="button"
              onClick={onAbrirRastreador}
              className="text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-700/50 hover:border-cyan-500 text-cyan-300 shadow-sm cursor-pointer"
              title="Rastreador Universal de Repuestos, Llegadas, Estatus, Pallet, Contenedor y Stock DPL"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rastreador Universal</span>
            </button>
          )}
          {/* TERMINAL PDT MÓVIL (COLECTOR BODEGA) */}
          <button
            type="button"
            onClick={() => setModuloActivo('pdt')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              moduloActivo === 'pdt'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 hover:border-emerald-500/60'
            }`}
            title="Terminal Portátil PDT / Colector de Bodega para Escaneo y Despacho Físico"
          >
            <QrCode className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-extrabold tracking-wide">PDT Móvil</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-black uppercase">
              Bodega
            </span>
          </button>


          {/* 6. KPIS & DASHBOARD */}
          <button
            type="button"
            onClick={() => setModuloActivo('dashboard')}
            className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              moduloActivo === 'dashboard'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>KPIs</span>
          </button>

          {/* 7. KARDEX & AUDITORÍA */}
          <button
            type="button"
            onClick={() => setModuloActivo('kardex')}
            className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              moduloActivo === 'kardex'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-purple-400" />
            <span>Kardex</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloActivo('reporte_fabrica')}
            className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              moduloActivo === 'reporte_fabrica'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title="Cuadro de Pedidos Especiales y Reporte Fábrica Quincenal"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reporte Fábrica</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloActivo('auditoria')}
            className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
              moduloActivo === 'auditoria'
                ? 'bg-slate-700 text-white shadow'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Auditoría</span>
          </button>
        </nav>

        {/* Utilidades y Configuración Canónica */}
        <div className="flex items-center gap-2">
          {usuarioActivo.rol === 'ADMINISTRADOR_CEDIS' && (
            <button
              type="button"
              onClick={onAbrirModalDPL}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-2 rounded-lg flex items-center gap-1.5 transition"
              title="Subir Manifiesto DPL"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">+ DPL</span>
            </button>
          )}

          {onSincronizarNube && (
            <button
              type="button"
              onClick={onSincronizarNube}
              disabled={sincronizandoNube}
              className="bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-2.5 py-2 rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
              title="Sincronizar datos canónicos con Google Sheets en la nube"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizandoNube ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Nube Sheets</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAbrirModalSheets}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold px-2.5 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
            title="Configuración Google Apps Script API & Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">API Sheets</span>
          </button>

          <button
            type="button"
            onClick={onAbrirModalCompartir}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold px-2.5 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
            title="Compartir enlace con sucursales"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
