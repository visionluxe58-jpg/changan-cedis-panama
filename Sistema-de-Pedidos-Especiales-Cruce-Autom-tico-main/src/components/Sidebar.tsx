import React from 'react';
import { 
  BarChart3, 
  Layers, 
  Ship, 
  PenTool, 
  Boxes, 
  FileSpreadsheet, 
  History, 
  QrCode, 
  Building2, 
  Store, 
  ClipboardList, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  User,
  Sparkles,
  ExternalLink,
  Share2
} from 'lucide-react';
import { UsuarioActivo } from '../types/cedis';

export type ModuloActivo = 
  | 'dashboard' 
  | 'matriz' 
  | 'formulario' 
  | 'kardex' 
  | 'conciliacion' 
  | 'auditoria' 
  | 'cruce' 
  | 'reporte_fabrica' 
  | 'pdt'
  | 'historial'
  | 'portal';

interface SidebarProps {
  moduloActivo: ModuloActivo;
  setModuloActivo: (mod: ModuloActivo) => void;
  usuarioActivo: UsuarioActivo;
  colapsado: boolean;
  setColapsado: (col: boolean) => void;
  totalPedidos: number;
  totalContenedores: number;
  pedidosSucursal?: number;
  onAbrirRastreador?: () => void;
  onAbrirPortalSucursales?: () => void;
  onCompartirPortal?: () => void;
}

interface ItemNavegacion {
  id: ModuloActivo | 'rastreador_action';
  titulo: string;
  subtitulo?: string;
  icono: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  esAccion?: boolean;
}

interface GrupoNavegacion {
  titulo: string;
  items: ItemNavegacion[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  moduloActivo,
  setModuloActivo,
  usuarioActivo,
  colapsado,
  setColapsado,
  totalPedidos,
  totalContenedores,
  pedidosSucursal = 0,
  onAbrirRastreador,
  onAbrirPortalSucursales,
  onCompartirPortal
}) => {
  const esAsesor = usuarioActivo.rol === 'SUCURSAL_ASESOR';

  // Definicion de grupos de navegacion segun el rol
  const gruposNavegacion: GrupoNavegacion[] = esAsesor
    ? [
        {
          titulo: `SUCURSAL: ${usuarioActivo.sucursal.toUpperCase()}`,
          items: [
            {
              id: 'formulario',
              titulo: 'Nuevo Pedido',
              subtitulo: 'Ingreso de requisicion',
              icono: PenTool,
              badge: '+ Nuevo',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            },
            {
              id: 'historial',
              titulo: 'Mis Pedidos',
              subtitulo: 'Historial y comprobantes',
              icono: ClipboardList,
              badge: pedidosSucursal > 0 ? pedidosSucursal : undefined,
              badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            },
            {
              id: 'rastreador_action',
              titulo: 'Rastrear Pieza',
              subtitulo: 'Consulta por VIN o No. Parte',
              icono: Search,
              esAccion: true
            }
          ]
        }
      ]
    : [
        {
          titulo: 'GESTION PRINCIPAL',
          items: [
            {
              id: 'dashboard',
              titulo: 'Dashboard KPIs',
              subtitulo: 'Metricas y rendimiento',
              icono: BarChart3
            },
            {
              id: 'matriz',
              titulo: 'Matriz Central',
              subtitulo: 'Gestion de pedidos',
              icono: Layers,
              badge: totalPedidos,
              badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
            },
            {
              id: 'cruce',
              titulo: 'Cruce DPL Maritimo',
              subtitulo: 'Contenedores y llegada',
              icono: Ship,
              badge: totalContenedores,
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }
          ]
        },
        {
          titulo: 'OPERACIONES ALMACEN',
          items: [
            {
              id: 'kardex',
              titulo: 'Kardex de Stock',
              subtitulo: 'Inventario DPL fisico',
              icono: Boxes
            },
            {
              id: 'conciliacion',
              titulo: 'Conciliacion DPL',
              subtitulo: 'Cruce contra manifiestos',
              icono: FileSpreadsheet
            },
            {
              id: 'auditoria',
              titulo: 'Auditoria Inmutable',
              subtitulo: 'Registro de operaciones',
              icono: History
            },
            {
              id: 'pdt',
              titulo: 'PDT Movil Bodega',
              subtitulo: 'Colector de escaneo',
              icono: QrCode,
              badge: 'SCAN',
              badgeColor: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/40'
            }
          ]
        },
        {
          titulo: 'REPORTES & SUCURSALES',
          items: [
            {
              id: 'reporte_fabrica',
              titulo: 'Reporte Fabrica',
              subtitulo: 'Consolidado quincenal',
              icono: Building2
            },
            {
              id: 'formulario',
              titulo: '+ Requisicion',
              subtitulo: 'Ingreso manual central',
              icono: PenTool
            },
            {
              id: 'portal',
              titulo: 'Portal Asesores',
              subtitulo: 'Vista simulada sucursal',
              icono: Store
            }
          ]
        }
      ];

  const handleItemClick = (item: ItemNavegacion) => {
    if (item.id === 'rastreador_action') {
      if (onAbrirRastreador) onAbrirRastreador();
      return;
    }
    if (item.id === 'portal' && onAbrirPortalSucursales) {
      onAbrirPortalSucursales();
      return;
    }
    setModuloActivo(item.id as ModuloActivo);
  };

  return (
    <aside
      className={`relative z-30 flex flex-col shrink-0 bg-[#070d1a] border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${
        colapsado ? 'w-20' : 'w-64'
      }`}
    >
      {/* Cabecera del Sidebar con Logotipo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-[#060b16]/70">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-sky-500/25 shrink-0">
            <Ship className="w-5 h-5 text-white" />
          </div>
          {!colapsado && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <span className="text-white font-black text-sm tracking-tight truncate leading-tight">
                CHANGAN AUTO
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider leading-tight flex items-center gap-1">
                CEDIS LOGISTICS
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              </span>
            </div>
          )}
        </div>

        {/* Boton Toggle Colapsar/Expandir */}
        <button
          type="button"
          onClick={() => setColapsado(!colapsado)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer border border-transparent hover:border-slate-700"
          title={colapsado ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {colapsado ? (
            <ChevronRight className="w-4 h-4 text-sky-400" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Lista de Navegacion con Grupos */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scroll">
        {gruposNavegacion.map((grupo, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!colapsado && (
              <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 mb-2 flex items-center justify-between">
                <span>{grupo.titulo}</span>
              </h5>
            )}

            <div className="space-y-1">
              {grupo.items.map((item) => {
                const Icono = item.icono;
                const estaActivo = moduloActivo === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full group flex items-center rounded-xl transition-all duration-150 cursor-pointer text-left ${
                      colapsado
                        ? 'justify-center p-2.5'
                        : 'justify-between px-3 py-2.5'
                    } ${
                      estaActivo
                        ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/30 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 font-medium'
                    }`}
                    title={colapsado ? item.titulo : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition shrink-0 ${
                          estaActivo
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-sky-400 group-hover:scale-110'
                        }`}
                      >
                        <Icono className="w-4 h-4" />
                      </div>

                      {!colapsado && (
                        <div className="min-w-0">
                          <div className={`text-xs truncate ${estaActivo ? 'text-white font-bold' : 'text-slate-200'}`}>
                            {item.titulo}
                          </div>
                          {item.subtitulo && (
                            <div className="text-[10px] text-slate-400 truncate leading-tight">
                              {item.subtitulo}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!colapsado && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                          estaActivo
                            ? 'bg-white/20 text-white border-white/30'
                            : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {!colapsado && item.id === 'portal' && onCompartirPortal && (
                      <button
                        type="button"
                        data-share-portal-btn="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompartirPortal();
                        }}
                        className="p-1 rounded bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 hover:text-white border border-sky-500/30 transition-all cursor-pointer ml-1"
                        title="Compartir enlace con asesores"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pie del Sidebar con Perfil Resumido o Rol */}
      <div className="p-3 border-t border-slate-800/80 bg-[#060b16]/70">
        {!colapsado ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  esAsesor
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {esAsesor ? <Store className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {usuarioActivo.nombre}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {esAsesor ? 'Asesor Exclusivo' : 'Administrador Total'}
                </div>
              </div>
            </div>
            {esAsesor && (
              <button
                type="button"
                onClick={() => {
                  const admin = USUARIOS_OFICIALES.find(u => u.rol === 'ADMINISTRADOR_CEDIS') || USUARIOS_OFICIALES[0];
                  appsScriptClient.setUsuarioActivo(admin);
                  window.location.href = window.location.pathname;
                }}
                className="mt-2 w-full py-1.5 px-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                title="Regresar a Modo Administrador CEDIS (Acceso Total Central)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>👑 Regresar a Admin CEDIS</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center" title={`${usuarioActivo.nombre} (${usuarioActivo.rol})`}>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                esAsesor
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {esAsesor ? <Store className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
