import React, { useState, useRef, useEffect } from 'react';
import { UsuarioActivo, RolUsuario } from '../types/cedis';
import { USUARIOS_OFICIALES } from '../services/appsScriptClient';
import { 
  ShieldCheck, 
  Store, 
  Building2, 
  UserCheck, 
  ChevronDown, 
  LogOut, 
  User, 
  Sparkles,
  Phone,
  Mail,
  Briefcase,
  Check,
  RefreshCw,
  MapPin,
  Lock
} from 'lucide-react';

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
  const esAdmin = usuarioActivo.rol === 'ADMINISTRADOR_CEDIS';

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  const getRolConfig = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMINISTRADOR_CEDIS':
        return {
          titulo: 'Administrador CEDIS',
          badgeClase: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          avatarBg: 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950',
          bordeAvatar: 'ring-2 ring-emerald-400/40'
        };
      case 'BODEGA_OPERADOR':
        return {
          titulo: 'Operador de Bodega',
          badgeClase: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          avatarBg: 'bg-gradient-to-tr from-amber-600 to-orange-400 text-slate-950',
          bordeAvatar: 'ring-2 ring-amber-400/40'
        };
      case 'SUCURSAL_ASESOR':
      default:
        return {
          titulo: 'Asesor de Sucursal',
          badgeClase: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
          avatarBg: 'bg-gradient-to-tr from-sky-600 to-blue-400 text-white',
          bordeAvatar: 'ring-2 ring-sky-400/40'
        };
    }
  };

  const rolCfg = getRolConfig(usuarioActivo.rol);

  const handleSeleccionarUsuario = (user: any) => {
    onCambiarUsuario({
      usuarioId: user.usuarioId,
      nombre: user.nombre,
      correo: user.correo,
      sucursal: user.sucursal,
      canal: user.canal,
      cargo: user.cargo,
      telefono: user.telefono,
      rol: user.rol,
      movilHabilitado: user.movilHabilitado
    });
    setAbierto(false);
  };

  const iniciales = usuarioActivo.nombre
    ? usuarioActivo.nombre
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CH';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Trigger de Perfil */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-3 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 transition cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        title={`Usuario Activo: ${usuarioActivo.nombre} (${rolCfg.titulo})`}
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
                    {esAdmin && (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </h4>
                  {usuarioActivo.cargo && (
                    <p className="text-[11px] text-sky-400 font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[220px]">{usuarioActivo.cargo}</span>
                    </p>
                  )}
                  {usuarioActivo.correo && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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

          {/* AISLAMIENTO ESTRICTO DE SEGURIDAD:
              Solo el Administrador CEDIS puede ver la lista de todos los encargados y conmutar de usuario.
              Los asesores de sucursal NO deben ver a sus compañeros ni ser admin para evitar manipulación del sistema. */}
          {esAdmin ? (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-sky-400" />
                  Conmutador de Usuarios Oficiales (Solo Admin)
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
          ) : (
            /* Vista Segura para el Asesor: Estado de sesión protegido y exclusivo */
            <div className="p-4 bg-slate-900/50">
              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                  <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Sesión Segura de Sucursal</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Estás operando en modo asesor para <strong>{usuarioActivo.sucursal}</strong>. Todas las requisiciones creadas se registrarán exclusivamente bajo tu firma y punto de atención.
                </p>
                <div className="pt-2 border-t border-sky-500/20 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Sucursal: {usuarioActivo.sucursal}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Activo
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pie de Acciones */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
            {esAdmin ? (
              <div className="w-full flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  Modo Administrador CEDIS
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
            ) : (
              <div className="w-full flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="text-slate-400 text-[10px]">
                  DMS Changan Panamá • CEDIS v3.0
                </span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('changan_sucursal_configurada');
                    window.location.reload();
                  }}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition"
                  title="Cambiar sucursal activa"
                >
                  <MapPin className="w-3 h-3" />
                  Cambiar Sucursal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
