import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  Building2, 
  Mail, 
  ChevronDown, 
  Check, 
  Sparkles,
  RefreshCw,
  UserCheck,
  Phone,
  Briefcase
} from 'lucide-react';
import { UsuarioActivo, RolUsuario } from '../types/cedis';
import { USUARIOS_OFICIALES } from '../services/appsScriptClient';

interface HeaderProfileDropdownProps {
  usuarioActivo: UsuarioActivo;
  onCambiarUsuario: (usuario: UsuarioActivo) => void;
  onSincronizarNube?: () => void;
  sincronizandoNube?: boolean;
}

export const HeaderProfileDropdown: React.FC<HeaderProfileDropdownProps> = ({
  usuarioActivo,
  onCambiarUsuario,
  onSincronizarNube,
  sincronizandoNube = false
}) => {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', handleClickAfuera);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getRolConfig = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMINISTRADOR_CEDIS':
        return {
          titulo: 'Administrador CEDIS',
          badgeClase: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          avatarBg: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-emerald-500/20',
          bordeAvatar: 'ring-2 ring-emerald-500/40'
        };
      case 'OPERADOR_CEDIS':
        return {
          titulo: 'Operador de Bodega',
          badgeClase: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          avatarBg: 'bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-sky-500/20',
          bordeAvatar: 'ring-2 ring-sky-500/40'
        };
      case 'SUCURSAL_ASESOR':
        return {
          titulo: 'Asesor de Sucursal',
          badgeClase: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          avatarBg: 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-amber-500/20',
          bordeAvatar: 'ring-2 ring-amber-500/40'
        };
      case 'CONSULTA':
      default:
        return {
          titulo: 'Consulta / Auditoria',
          badgeClase: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
          avatarBg: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-500/20',
          bordeAvatar: 'ring-2 ring-slate-500/40'
        };
    }
  };

  const rolCfg = getRolConfig(usuarioActivo.rol);

  const iniciales = usuarioActivo.nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const handleSeleccionarUsuario = (usuario: UsuarioActivo) => {
    onCambiarUsuario(usuario);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Boton Trigger */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        title="Ver Perfil y Conmutar Encargado"
      >
        <div className={`w-8 h-8 rounded-lg ${rolCfg.avatarBg} ${rolCfg.bordeAvatar} flex items-center justify-center font-bold text-xs shadow-md transition-transform hover:scale-105`}>
          {iniciales || <User className="w-4 h-4" />}
        </div>
        
        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-slate-100 max-w-[130px] truncate leading-tight">
            {usuarioActivo.nombre}
          </span>
          <span className="text-[10px] text-slate-400 font-mono leading-tight">
            {usuarioActivo.cargo || usuarioActivo.sucursal}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${abierto ? 'rotate-180 text-sky-400' : ''}`} />
      </button>

      {/* Menu Flotante Dropdown */}
      {abierto && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#090f1f]/98 backdrop-blur-xl border border-sky-500/30 shadow-[0_15px_50px_rgba(0,0,0,0.7)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Cabecera del Dropdown */}
          <div className="p-4 bg-gradient-to-b from-sky-950/40 to-transparent border-b border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${rolCfg.avatarBg} ${rolCfg.bordeAvatar} flex items-center justify-center font-bold text-sm shadow-md`}>
                  {iniciales}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {usuarioActivo.nombre}
                    {usuarioActivo.rol === 'ADMINISTRADOR_CEDIS' && (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </h4>
                  {usuarioActivo.cargo && (
                    <p className="text-[11px] text-sky-400 font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[220px]">{usuarioActivo.cargo}</span>
                    </p>
                  )}
                  {usuarioActivo.correo && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{usuarioActivo.correo}</span>
                    </p>
                  )}
                  {usuarioActivo.telefono && (
                    <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{usuarioActivo.telefono}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Badges de Sucursal y Canal */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
              <span className={`px-2.5 py-0.5 rounded-full font-bold border ${rolCfg.badgeClase} flex items-center gap-1`}>
                <ShieldCheck className="w-3 h-3" />
                {rolCfg.titulo}
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                {usuarioActivo.sucursal} ({usuarioActivo.canal})
              </span>
            </div>
          </div>

          {/* Lista de Encargados Oficiales */}
          <div className="p-3">
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-sky-400" />
                Encargados y Sucursales Oficiales
              </span>
              <span className="text-[10px] text-slate-400">
                {USUARIOS_OFICIALES.length} registrados
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scroll">
              {USUARIOS_OFICIALES.map((user) => {
                const esActual = user.usuarioId === usuarioActivo.usuarioId;
                const userRolCfg = getRolConfig(user.rol);
                return (
                  <button
                    key={user.usuarioId}
                    type="button"
                    onClick={() => handleSeleccionarUsuario(user)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer text-left ${
                      esActual
                        ? 'bg-sky-500/20 text-white border border-sky-500/40 shadow-sm'
                        : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg ${userRolCfg.avatarBg} flex items-center justify-center font-bold text-[11px] shrink-0`}>
                        {user.nombre[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-slate-200">
                          {user.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          <strong className="text-slate-300">{user.sucursal}</strong> &bull; {user.canal} {user.cargo ? `(${user.cargo})` : ''}
                        </div>
                      </div>
                    </div>
                    {esActual && (
                      <Check className="w-4 h-4 text-sky-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pie de Acciones */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
            {usuarioActivo.rol !== 'ADMINISTRADOR_CEDIS' ? (
              <button
                type="button"
                onClick={() => {
                  const admin = USUARIOS_OFICIALES.find(u => u.rol === 'ADMINISTRADOR_CEDIS');
                  if (admin) handleSeleccionarUsuario(admin);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Volver a Modo Administrador CEDIS
              </button>
            ) : (
              <div className="w-full flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  Administrador CEDIS Activo
                </span>
                {onSincronizarNube && (
                  <button
                    type="button"
                    onClick={() => {
                      onSincronizarNube();
                      setAbierto(false);
                    }}
                    disabled={sincronizandoNube}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${sincronizandoNube ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
