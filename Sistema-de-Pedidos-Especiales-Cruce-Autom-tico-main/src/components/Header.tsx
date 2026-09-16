import {
  AlertTriangle,
  BarChart3,
  Bot,
  Box,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Layers,
  Lock,
  PlusCircle,
  Printer,
  QrCode,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  Unlock,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SpecialOrder } from '../types';
import { getOperatingScheduleStatus, OperatingStatus } from '../utils/apiSync';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  orders: SpecialOrder[];
  isAdminUnlocked: boolean;
  isRealtimeConnected?: boolean;
  onOpenSecurityModal: () => void;
  onOpenQr: () => void;
  onOpenSheets: () => void;
  onOpenBackup?: () => void;
  onResetData: () => void;
  onOpenJarvis?: () => void;
  onPurgeData?: () => void;
  onOpenPartTracker?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  orders,
  isAdminUnlocked,
  isRealtimeConnected = true,
  onOpenSecurityModal,
  onOpenQr,
  onOpenSheets,
  onOpenBackup,
  onResetData,
  onOpenJarvis,
  onPurgeData,
  onOpenPartTracker,
}) => {
  const [scheduleStatus, setScheduleStatus] = useState<OperatingStatus>(() => getOperatingScheduleStatus());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleOverride, setScheduleOverride] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setScheduleStatus(getOperatingScheduleStatus(scheduleOverride));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [scheduleOverride]);

  const pendingCount = orders.filter((o) => o.overallStatus === 'PENDIENTE').length;
  const inCedisCount = orders.filter((o) => o.overallStatus === 'EN BODEGA CEDIS').length;
  const unbilledAlerts = orders.filter((o) => !o.isBilled && o.overallStatus !== 'PENDIENTE').length;

  // Ordered logically according to the operational lifecycle
  const navItems = [
    {
      id: 'kpis',
      label: 'Dashboard & KPIs',
      icon: BarChart3,
      badge: 'En Vivo',
      badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    },
    {
      id: 'pedidos',
      label: 'Matriz Central de Pedidos',
      icon: FileText,
      badge: orders.length > 0 ? orders.length : undefined,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      id: 'contenedores',
      label: 'Cruce & Contenedores',
      icon: Box,
      badge: 'Auto-Match',
      badgeColor: 'bg-cyan-950 text-cyan-400 border border-cyan-800/50',
    },
    {
      id: 'resumen_despacho',
      label: 'Despacho x Contenedor',
      icon: Truck,
      badge: 'Por Sucursal',
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    },
    {
      id: 'nueva_orden',
      label: 'Ingreso Sucursales',
      icon: PlusCircle,
      badge: 'QR / Form',
      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-800/50',
    },
    {
      id: 'despacho_etiquetas',
      label: 'Despacho & Etiquetas',
      icon: Printer,
      badge: inCedisCount > 0 ? `${inCedisCount} Listos` : undefined,
      badgeColor: 'bg-amber-950 text-amber-400 border border-amber-800/50',
    },
    {
      id: 'alertas_facturacion',
      label: 'Auditoría & Cobros',
      icon: AlertTriangle,
      badge: unbilledAlerts > 0 ? `${unbilledAlerts} Alertas` : undefined,
      badgeColor: 'bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse',
    },
    {
      id: 'reportes_gerencia',
      label: 'Reportes Gerencia',
      icon: TrendingUp,
    },
    {
      id: 'catalogo',
      label: 'Bases de Datos',
      icon: Database,
      badge: '2 BDs',
      badgeColor: 'bg-cyan-950 text-cyan-400 border border-cyan-800/50',
    },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#050608]/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-3">
      {/* Top Bar: Brand, Status HUD & System Time */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/30">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-400 font-bold font-mono">
                CHANGAN AUTO PANAMÁ // CEDIS CENTRAL
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                HUB REGIONAL READY
              </span>
            </div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Sistema de Pedidos Especiales & Cruce Automático
            </h1>
          </div>
        </div>

        {/* Telemetry Chips & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-2.5">
          {/* JARVIS AI Copilot Trigger */}
          {onOpenJarvis && (
            <button
              onClick={onOpenJarvis}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_18px_rgba(6,182,212,0.4)] border border-cyan-400/40"
              title="Abrir Asistente de Inteligencia Artificial JARVIS Logistics"
            >
              <Bot className="w-4 h-4 text-cyan-200 animate-pulse" />
              <span className="font-bold">JARVIS AI</span>
            </button>
          )}

          {/* Operational Schedule HUD Chip */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
              scheduleStatus.isOpen
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            }`}
            title="Horario Operativo Oficial: L-V 7:00 AM - 6:00 PM | Sáb 7:00 AM - 5:00 PM | Dom Reposo"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                scheduleStatus.isOpen
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                  : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-bold hidden sm:inline">
              {scheduleStatus.isOpen ? 'TURNO ACTIVO' : 'MODO GUARDIA'}
            </span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="font-semibold text-white">{scheduleStatus.currentTimeString}</span>
          </button>

          {/* Real-time Cloud Firestore sync indicator */}
          <div
            className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-xs font-mono shadow-[0_0_10px_rgba(16,185,129,0.15)]"
            title="🔥 Conectado a Google Cloud Firestore: La base de datos es 100% permanente. La información no se pierde al suspender o reiniciar computadoras y se sincroniza en vivo con todas las sucursales."
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-ping'
              }`}
            ></span>
            <span className="text-emerald-300 text-[11px] font-bold hidden md:inline flex items-center gap-1">
              <span>🔥 NUBE FIRESTORE</span>
              <span className="text-emerald-400/80 font-normal">| PERMANENTE</span>
            </span>
          </div>

          {/* Admin Security Indicator & Control */}
          <button
            onClick={onOpenSecurityModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shadow-sm border ${
              isAdminUnlocked
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 hover:bg-slate-800 border-amber-500/60 text-amber-300'
            }`}
            title="Panel de Seguridad y Autorización de Administrador Maestro"
          >
            {isAdminUnlocked ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {isAdminUnlocked ? 'ADMIN (TOTAL)' : 'DESBLOQUEAR'}
            </span>
          </button>

          {/* Part Tracker Quick Button */}
          {onOpenPartTracker && (
            <button
              onClick={onOpenPartTracker}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-500/60 hover:border-cyan-400 text-cyan-200 rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
              title="Buscar si un repuesto viene en algún contenedor en tránsito o recibido, o si fue solicitado por alguna sucursal"
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Rastrear Repuesto</span>
            </button>
          )}

          {/* Branch QR Modal Trigger */}
          <button
            onClick={onOpenQr}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-medium transition-all shadow-sm"
            title="Generar código QR para que las sucursales ingresen pedidos desde su celular"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">QR Sucursales</span>
          </button>

          {/* Google Sheets / Excel Sync */}
          <button
            onClick={onOpenSheets}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/50 hover:border-emerald-500 text-emerald-300 rounded-xl text-xs font-medium transition-all shadow-sm"
            title="Sincronizar o exportar datos a Google Sheets / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Sheets / Excel</span>
          </button>

          {/* Database Backup & Persistence Hub */}
          {onOpenBackup && (
            <button
              onClick={onOpenBackup}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-cyan-950/90 to-blue-950/90 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.25)]"
              title="Centro de Respaldos, Exportación JSON y Blindaje de Datos"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Respaldos</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono">
                Blindado
              </span>
            </button>
          )}

          {/* Purge Demo Data Button */}
          {onPurgeData && (
            <button
              onClick={onPurgeData}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-500 text-rose-300 rounded-xl text-xs font-mono transition-colors"
              title="Borrar todos los datos de prueba e ingresar datos reales"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xl:inline">Limpiar Todo</span>
            </button>
          )}

          <button
            onClick={onResetData}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 rounded-xl border border-transparent hover:border-slate-700 transition-colors"
            title="Restablecer datos de demostración"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 relative ${
                isActive
                  ? 'bg-slate-800/90 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-cyan-400' : 'text-slate-500'
                }`}
              />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Schedule Info / Override Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#07090e] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Horario de Operación Oficial CEDIS
                </h3>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-cyan-400 font-bold">Lunes a Viernes:</span>
                  <span>07:00 a.m. a 06:00 p.m.</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-cyan-400 font-bold">Sábados:</span>
                  <span>07:00 a.m. a 05:00 p.m.</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-amber-400 font-bold">Domingos:</span>
                  <span>Descanso / Modo de Guardia</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                  <span>Estado Actual: {scheduleStatus.message}</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Próximo evento programado: <strong>{scheduleStatus.nextEvent}</strong>. El sistema permanece
                  en ejecución continua para recibir pedidos y sincronizar datos en tiempo real.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-white font-bold block">Anulación de Guardia (Supervisor)</span>
                  <span className="text-[10px] text-slate-400">Permite trabajo en horario extendido o domingo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleOverride(!scheduleOverride)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    scheduleOverride
                      ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {scheduleOverride ? 'ACTIVO 24/7' : 'DESACTIVADO'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono uppercase"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
