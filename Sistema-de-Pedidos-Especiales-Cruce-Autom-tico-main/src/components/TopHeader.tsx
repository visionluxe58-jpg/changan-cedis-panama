import React from 'react';
import { 
  Database,
  Menu, 
  Search, 
  RefreshCw, 
  Upload, 
  FileSpreadsheet, 
  Share2, 
  Layers, 
  BarChart3, 
  Ship, 
  PenTool, 
  Boxes, 
  History, 
  QrCode, 
  Building2, 
  Store, 
  ClipboardList
} from 'lucide-react';
import { UsuarioActivo } from '../types/cedis';
import { ModuloActivo } from './Sidebar';
import { HeaderProfileDropdown } from './HeaderProfileDropdown';

interface TopHeaderProps {
  moduloActivo: ModuloActivo;
  usuarioActivo: UsuarioActivo;
  onCambiarUsuario: (usuario: UsuarioActivo) => void;
  onToggleSidebar?: () => void;
  onAbrirCatalogos?: () => void;
  onAbrirModalSheets?: () => void;
  onAbrirModalCompartir?: () => void;
  onAbrirModalDPL?: () => void;
  onAbrirRastreador?: () => void;
  onAbrirTerminalPDT?: () => void;
  onCompartirPDT?: () => void;
  onSincronizarNube?: () => void;
  sincronizandoNube?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  moduloActivo,
  usuarioActivo,
  onCambiarUsuario,
  onToggleSidebar,
  onAbrirCatalogos,
  onAbrirModalSheets,
  onAbrirModalCompartir,
  onAbrirModalDPL,
  onAbrirRastreador,
  onAbrirTerminalPDT,
  onCompartirPDT,
  onSincronizarNube,
  sincronizandoNube = false
}) => {
  const esAdmin = usuarioActivo.rol === 'ADMINISTRADOR_CEDIS';

  // Informacion del modulo activo para el breadcrumb
  const getModuloInfo = (mod: ModuloActivo) => {
    switch (mod) {
      case 'dashboard':
        return { titulo: 'Dashboard de Indicadores (KPIs)', subtitulo: 'Control gerencial de inventario y pedidos', icono: BarChart3 };
      case 'matriz':
        return { titulo: 'Matriz Central de Pedidos', subtitulo: 'Asignacion, cruce de stock y despacho', icono: Layers };
      case 'cruce':
        return { titulo: 'Cruce DPL Maritimo', subtitulo: 'Monitoreo de contenedores y transito', icono: Ship };
      case 'kardex':
        return { titulo: 'Kardex de Stock', subtitulo: 'Inventario DPL y saldos fisicos', icono: Boxes };
      case 'conciliacion':
        return { titulo: 'Modulo de Conciliacion', subtitulo: 'Importacion y validacion de manifiestos', icono: FileSpreadsheet };
      case 'auditoria':
        return { titulo: 'Auditoria Inmutable', subtitulo: 'Registro historico de cambios y transacciones', icono: History };
      case 'pdt':
        return { titulo: 'Terminal PDT Movil', subtitulo: 'Colector de bodega para escaneo y despacho', icono: QrCode };
      case 'reporte_fabrica':
        return { titulo: 'Reporte de Fabrica', subtitulo: 'Consolidado quincenal de pedidos especiales', icono: Building2 };
      case 'formulario':
        return { titulo: 'Formulario de Requisicion', subtitulo: 'Ingreso de pedidos de repuestos', icono: PenTool };
      case 'historial':
        return { titulo: 'Historial de Sucursal', subtitulo: `Seguimiento de pedidos de ${usuarioActivo.sucursal}`, icono: ClipboardList };
      case 'portal':
        return { titulo: 'Portal de Sucursales', subtitulo: 'Entorno de auto-gestion de agencias', icono: Store };
      default:
        return { titulo: 'Sistema CEDIS', subtitulo: 'Changan Auto Panama', icono: Layers };
    }
  };

  const info = getModuloInfo(moduloActivo);
  const IconoModulo = info.icono;

  return (
    <header className="h-16 shrink-0 bg-[#080e1c]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-3 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      {/* Lado Izquierdo: Boton Toggle y Titulo del Modulo */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition cursor-pointer"
            title="Mostrar / Ocultar barra lateral"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <IconoModulo className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-100 truncate leading-tight flex items-center gap-2">
              {info.titulo}
            </h1>
            <p className="text-[11px] text-slate-400 truncate leading-tight hidden sm:block">
              {info.subtitulo}
            </p>
          </div>
        </div>
      </div>

      {/* Lado Derecho: Utilidades, Acciones y Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Boton Terminal Movil PDT + Compartir */}
        {onAbrirTerminalPDT && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={onAbrirTerminalPDT}
              className="px-3 py-1.5 rounded-l-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/50 hover:border-blue-400 text-blue-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Abrir Terminal Móvil PDT para Escaneo de Repuestos y Pallets"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span className="hidden md:inline">Terminal PDT</span>
            </button>
            {onCompartirPDT && (
              <button
                type="button"
                onClick={onCompartirPDT}
                className="px-2 py-1.5 rounded-r-xl bg-blue-950/90 hover:bg-blue-900 border-t border-r border-b border-blue-500/50 hover:border-blue-400 text-blue-300 text-xs font-bold transition flex items-center cursor-pointer border-l-0"
                title="Compartir enlace o código QR de Terminal PDT a bodegueros"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        )}

        {/* Boton Rastreador Universal */}
        {onAbrirRastreador && (
          <button
            type="button"
            onClick={onAbrirRastreador}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-700/50 hover:border-cyan-500 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Rastreador Universal de Piezas, VIN, Contenedor y Stock"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Rastreador</span>
          </button>
        )}

        {/* Boton Sincronizar con Google Sheets (Solo para Administrador CEDIS) */}
        {esAdmin && onSincronizarNube && (
          <button
            type="button"
            onClick={onSincronizarNube}
            disabled={sincronizandoNube}
            className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title="Sincronizar con Google Sheets Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sincronizandoNube ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden lg:inline">Nube Sheets</span>
          </button>
        )}

        {/* Acciones exclusivas del Administrador */}
        {esAdmin && onAbrirModalDPL && (
          <button
            type="button"
            onClick={onAbrirModalDPL}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold transition hidden sm:flex items-center gap-1.5 cursor-pointer"
            title="Subir Manifiesto DPL"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">+ DPL</span>
          </button>
        )}

        {esAdmin && onAbrirCatalogos && (
          <button
            type="button"
            onClick={onAbrirCatalogos}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Base de Datos InsForge & Catálogos Maestros (Sucursales, Asesores, Bodegueros, Modelos)"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xl:inline">BD / Catálogos</span>
          </button>
        )}

        {esAdmin && onAbrirModalSheets && (
          <button
            type="button"
            onClick={onAbrirModalSheets}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Configuracion Google Sheets API"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">API</span>
          </button>
        )}

        {esAdmin && onAbrirModalCompartir && (
          <button
            type="button"
            onClick={onAbrirModalCompartir}
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition flex items-center cursor-pointer"
            title="Compartir enlace"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-6 w-[1px] bg-slate-800 hidden sm:block mx-0.5"></div>

        {/* Dropdown de Perfil Modernize */}
        <HeaderProfileDropdown
          usuarioActivo={usuarioActivo}
          onCambiarUsuario={onCambiarUsuario}
          onSincronizarNube={onSincronizarNube}
          sincronizandoNube={sincronizandoNube}
        />
      </div>
    </header>
  );
};
