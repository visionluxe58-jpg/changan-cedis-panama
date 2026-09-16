import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  PieChart,
  Play,
  Printer,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Zap
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CHANGAN_BRANCHES, CHANGAN_MODELS, CHANNELS } from '../data/mockData';
import { BranchName, Channel, ShippingContainer, SpecialOrder } from '../types';

interface ExecutiveReportViewProps {
  orders: SpecialOrder[];
  containers: ShippingContainer[];
  onSyncAll: () => void;
  onSimulateIncomingOrder?: () => void;
  onNavigateToDispatchSummary?: () => void;
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  orders,
  containers,
  onSyncAll,
  onSimulateIncomingOrder,
  onNavigateToDispatchSummary,
}) => {
  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [isBoardroomMode, setIsBoardroomMode] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Hace 2 minutos');

  // Trigger one-click sync
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncAll();
      setIsSyncing(false);
      const now = new Date();
      setLastSyncTime(
        `Hoy a las ${now.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      );
    }, 900);
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedBranch !== 'ALL' && order.branch !== selectedBranch) return false;
      if (selectedChannel !== 'ALL' && order.channel !== selectedChannel) return false;
      return true;
    });
  }, [orders, selectedBranch, selectedChannel]);

  // Aggregate Key Statistics
  const totalOrders = filteredOrders.length;
  const emergencyOrders = filteredOrders.filter((o) => o.orderType === 'Emergencia');
  
  const totalPartsRequested = filteredOrders.reduce(
    (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityRequested, 0),
    0
  );

  const totalPartsFulfilled = filteredOrders.reduce(
    (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + (item.quantityDispatched || item.quantityAssigned), 0),
    0
  );

  const totalPartsInCedis = filteredOrders.reduce(
    (acc, o) =>
      acc +
      o.items
        .filter((item) => item.status === 'EN BODEGA CEDIS')
        .reduce((iAcc, item) => iAcc + (item.quantityAssigned || 0), 0),
    0
  );

  const totalPartsInTransit = filteredOrders.reduce(
    (acc, o) =>
      acc +
      o.items
        .filter((item) => item.status === 'EN TRÁNSITO' || item.status === 'PENDIENTE')
        .reduce((iAcc, item) => iAcc + item.quantityRequested, 0),
    0
  );

  const fillRate = totalPartsRequested > 0 ? Math.round((totalPartsFulfilled / totalPartsRequested) * 100) : 100;

  const fullyBilledOrders = filteredOrders.filter((o) => o.isBilled || o.paymentStatus === 'Cancelado').length;
  const billingComplianceRate = totalOrders > 0 ? Math.round((fullyBilledOrders / totalOrders) * 100) : 100;

  // Breakdown by Branch
  const branchPerformance = useMemo(() => {
    return CHANGAN_BRANCHES.map((b) => {
      const bOrders = orders.filter((o) => o.branch === b);
      const req = bOrders.reduce(
        (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityRequested, 0),
        0
      );
      const fulfilled = bOrders.reduce(
        (acc, o) =>
          acc + o.items.reduce((iAcc, item) => iAcc + (item.quantityDispatched || item.quantityAssigned), 0),
        0
      );
      const pending = req - fulfilled;
      const rate = req > 0 ? Math.round((fulfilled / req) * 100) : 100;
      const unbilled = bOrders.filter((o) => !o.isBilled || o.paymentStatus !== 'Cancelado').length;

      return {
        branch: b,
        orderCount: bOrders.length,
        requested: req,
        fulfilled,
        pending,
        rate,
        unbilled,
      };
    }).sort((a, b) => b.orderCount - a.orderCount);
  }, [orders]);

  // Breakdown by Model
  const modelDemand = useMemo(() => {
    const modelMap: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const model = o.changanModel || 'Otros Modelos';
      modelMap[model] = (modelMap[model] || 0) + o.items.length;
    });

    return Object.entries(modelMap)
      .map(([model, count]) => ({
        model,
        count,
        percentage: totalPartsRequested > 0 ? Math.round((count / totalPartsRequested) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders, totalPartsRequested]);

  // Channel Distribution
  const channelBreakdown = useMemo(() => {
    return CHANNELS.map((ch) => {
      const chOrders = filteredOrders.filter((o) => o.channel === ch);
      const parts = chOrders.reduce(
        (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityRequested, 0),
        0
      );
      return {
        channel: ch,
        orders: chOrders.length,
        parts,
        percentage: totalOrders > 0 ? Math.round((chOrders.length / totalOrders) * 100) : 0,
      };
    });
  }, [filteredOrders, totalOrders]);

  // Critical / High-Attention Orders for Meeting
  const criticalOrdersForMeeting = useMemo(() => {
    return filteredOrders
      .filter((o) => o.orderType === 'Emergencia' || o.overallStatus === 'EN TRÁNSITO' || (!o.isBilled && o.overallStatus === 'DESPACHADO'))
      .slice(0, 8);
  }, [filteredOrders]);

  // Container by Branch Cross-Dock Matrix for Executive Review
  const containerBranchMatrix = useMemo(() => {
    return containers.map((cont) => {
      const contNum = cont.containerNumber.trim().toUpperCase();
      const branchCounts: Record<string, number> = {};
      CHANGAN_BRANCHES.forEach((b) => (branchCounts[b] = 0));

      let totalAssigned = 0;
      orders.forEach((ord) => {
        const ordCont = (ord.assignedContainerId || '').trim().toUpperCase();
        ord.items.forEach((it) => {
          const itCont = (it.containerId || '').trim().toUpperCase();
          if (
            itCont === contNum ||
            (ordCont === contNum &&
              (it.quantityAssigned > 0 || it.status === 'EN BODEGA CEDIS' || it.status === 'DESPACHADO'))
          ) {
            const qty = it.quantityAssigned > 0 ? it.quantityAssigned : it.quantityRequested;
            branchCounts[ord.branch] = (branchCounts[ord.branch] || 0) + qty;
            totalAssigned += qty;
          }
        });
      });

      const surplus = Math.max(0, cont.totalUnits - totalAssigned);

      return {
        container: cont,
        branchCounts,
        totalAssigned,
        surplus,
      };
    });
  }, [containers, orders]);

  const handlePrintExecutiveReport = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${isBoardroomMode ? 'fixed inset-0 z-50 bg-[#050608] p-6 overflow-y-auto' : ''}`}>
      {/* Boardroom Presentation Top Controls */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 lg:p-6 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] print:border-none print:shadow-none print:p-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-black print:pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-400 font-mono font-bold">
                DIRECCIÓN DE LOGÍSTICA & OPERACIONES // CHANGAN PANAMÁ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                REPORTE EN TIEMPO REAL
              </span>
            </div>
            <h2 className="text-xl lg:text-3xl font-black text-white font-mono tracking-tight print:text-black">
              Informe Ejecutivo de Gestión de Pedidos Especiales
            </h2>
            <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-3xl print:text-slate-700">
              Consolidación automática en vivo de la red nacional de sucursales, cruce de contenedores en CEDIS y estado financiero.
            </p>
          </div>

          {/* Action Bar (Hidden on Print) */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* One-Click Sync Button */}
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95 disabled:opacity-50"
              title="Consolidar y actualizar todas las órdenes de las sucursales con un solo clic"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Consolidando...' : 'Actualizar Todo en 1 Clic'}</span>
            </button>

            {/* Test Simulation Button */}
            {onSimulateIncomingOrder && (
              <button
                onClick={onSimulateIncomingOrder}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-mono transition-all"
                title="Simula que una sucursal acaba de enviar un pedido nuevo para ver cómo se refleja en vivo"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simular Envío de Sucursal</span>
              </button>
            )}

            {/* Print / Export PDF Dossier */}
            <button
              onClick={handlePrintExecutiveReport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-semibold"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Exportar PDF / Imprimir Dossier</span>
            </button>

            {/* Boardroom Presentation Toggle */}
            <button
              onClick={() => setIsBoardroomMode(!isBoardroomMode)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                isBoardroomMode
                  ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
              }`}
              title="Activar vista ampliada para proyector o pantalla de sala de juntas"
            >
              {isBoardroomMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isBoardroomMode ? 'Salir Modo Presentación' : 'Modo Sala de Juntas'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Executive Filter Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 print:hidden text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filtros Ejecutivos:</span>
            </span>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Consolidado Nacional (6 Sucursales)</option>
              {CHANGAN_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Channel Filter */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos los Canales ({filteredOrders.length})</option>
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            {/* Period selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPeriod('month')}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono ${
                  selectedPeriod === 'month' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-500'
                }`}
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('quarter')}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono ${
                  selectedPeriod === 'quarter' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-500'
                }`}
              >
                Trimestre Q3
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono ${
                  selectedPeriod === 'all' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-500'
                }`}
              >
                Histórico 2026
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Última sincronización: <b className="text-emerald-300">{lastSyncTime}</b></span>
          </div>
        </div>
      </div>

      {/* Network Intake Status HUD (6 Branches Live Status) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        {CHANGAN_BRANCHES.map((branch) => {
          const count = orders.filter((o) => o.branch === branch).length;
          const readyCount = orders.filter((o) => o.branch === branch && o.overallStatus === 'EN BODEGA CEDIS').length;

          return (
            <div
              key={branch}
              onClick={() => setSelectedBranch(selectedBranch === branch ? 'ALL' : branch)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedBranch === branch
                  ? 'bg-slate-800 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className="font-bold text-white truncate">{branch}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div className="flex items-baseline justify-between text-xs font-mono">
                <span className="text-slate-400">{count} pedidos</span>
                {readyCount > 0 && (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-950/80 px-1 rounded">
                    {readyCount} en CEDIS
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Executive Summary Briefing Card for Management */}
      <div className="bg-gradient-to-r from-[#0b0f17] via-slate-900/90 to-[#0b0f17] border-2 border-cyan-500/40 p-6 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono uppercase font-bold tracking-widest text-cyan-300">
                Dictamen Ejecutivo para Junta Directiva / Gerencia General
              </h3>
            </div>
            <p className="text-sm lg:text-base text-slate-200 leading-relaxed font-sans">
              A la fecha, el CEDIS Central ha recibido y coordinado un total de <b className="text-white font-mono">{totalOrders} órdenes especiales</b> ({totalPartsRequested} repuestos solicitados).
              El <b className="text-emerald-400 font-mono">Fill Rate nacional se ubica en {fillRate}%</b>, con <b className="text-cyan-300 font-mono">{totalPartsFulfilled} piezas</b> efectivamente asignadas o despachadas a sus sucursales.
              Actualmente hay <b className="text-amber-400 font-mono">{totalPartsInCedis} piezas listas en bodega</b> para traslado y <b className="text-purple-300 font-mono">{totalPartsInTransit} repuestos en tránsito marítimo/aéreo</b> con fecha programada de atraque.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center min-w-[160px]">
            <div className="text-[10px] uppercase font-mono text-slate-400">Eficiencia Operativa</div>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">{fillRate}%</div>
            <div className="text-[10px] text-emerald-500 font-mono flex items-center justify-center gap-1 mt-1">
              <ShieldCheck className="w-3 h-3" /> Sin errores de cruce
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fill Rate */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">Tasa de Cumplimiento (Fill Rate)</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-emerald-400">{fillRate}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${fillRate}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block font-mono">
            {totalPartsFulfilled} de {totalPartsRequested} repuestos abastecidos
          </span>
        </div>

        {/* In CEDIS Ready */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">Listos en CEDIS para Despacho</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-amber-400">{totalPartsInCedis} Piezas</div>
          <span className="text-[10px] text-emerald-400 mt-3 block font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Etiquetas térmicas generadas
          </span>
          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
            Listas para ruta hacia sucursales
          </span>
        </div>

        {/* In Transit */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">En Tránsito Marítimo / Aéreo</span>
            <Box className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-cyan-300">{totalPartsInTransit} Piezas</div>
          <span className="text-[10px] text-cyan-400 mt-3 block font-mono">
            {containers.length} Contenedores monitorizados
          </span>
          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
            Cruce automatizado programado al arribo
          </span>
        </div>

        {/* Financial Compliance */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">Facturación & Cobranza</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-purple-300">{billingComplianceRate}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-purple-400 h-full rounded-full" style={{ width: `${billingComplianceRate}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block font-mono">
            {fullyBilledOrders} de {totalOrders} órdenes 100% facturadas
          </span>
        </div>
      </div>

      {/* Grid: Branch Performance & Demand Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Branch Comparison Table & Progress (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/30 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Desempeño y Nivel de Cumplimiento por Sucursal
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Ranking Operativo</span>
          </div>

          <div className="space-y-3">
            {branchPerformance.map((bp, idx) => (
              <div key={bp.branch} className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white text-sm">{bp.branch}</span>
                  </div>
                  <div className="space-x-3">
                    <span className="text-slate-400">{bp.orderCount} órdenes</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-cyan-400 font-bold">{bp.fulfilled}/{bp.requested} repuestos</span>
                    <span className="text-emerald-400 font-bold">({bp.rate}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, bp.rate)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-0.5">
                  <span>Pendientes de arribo: <b className="text-cyan-300">{bp.pending} piezas</b></span>
                  {bp.unbilled > 0 ? (
                    <span className="text-rose-400 font-bold">⚠ {bp.unbilled} con alerta de cobranza</span>
                  ) : (
                    <span className="text-emerald-400">Cobranzas al día</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Demand & Channel Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Demand by Vehicle Model */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Demanda por Modelo Changan
                </h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {modelDemand.slice(0, 5).map((md) => (
                <div key={md.model} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-white font-bold">{md.model}</span>
                    <span className="text-cyan-400 font-bold">{md.count} repuestos ({md.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.max(5, md.percentage)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demand by Channel */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <PieChart className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Distribución por Canal de Venta
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              {channelBreakdown.map((ch) => (
                <div key={ch.channel} className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{ch.channel}</div>
                  <div className="text-xl font-bold text-white mt-1">{ch.orders}</div>
                  <div className="text-[10px] text-cyan-400 font-semibold">{ch.percentage}% del total</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Executive Container-to-Branch Cross-Dock Matrix */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-0">
        <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-[#080b11]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  AUDITORÍA EJECUTIVA DE ABASTECIMIENTO
                </span>
              </div>
              <h3 className="text-base lg:text-lg font-bold text-white font-mono uppercase tracking-tight mt-0.5">
                Resumen de Repuestos a Despachar por Contenedor por Sucursal
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Consolidado de unidades físicas asignadas a cada punto de la red nacional desde cada embarque.
              </p>
            </div>
          </div>

          {onNavigateToDispatchSummary && (
            <button
              onClick={onNavigateToDispatchSummary}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
            >
              <span>Ver Detalle & Picking Completo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                <th className="py-3 px-4">Contenedor / Invoice</th>
                <th className="py-3 px-3">Tipo / Estado</th>
                <th className="py-3 px-3 text-center">Total Piezas</th>
                {CHANGAN_BRANCHES.map((b) => (
                  <th key={b} className="py-3 px-3 text-center">
                    {b}
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Total Asignado</th>
                <th className="py-3 px-3 text-center">Stock Libre CEDIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs font-mono">
              {containerBranchMatrix.map((row) => {
                const isReceived = row.container.arrivalStatus === 'Recibido en CEDIS';
                return (
                  <tr key={row.container.id} className="hover:bg-slate-800/20 transition-colors">
                    {/* Container Info */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="text-cyan-300 text-sm">{row.container.containerNumber}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        PO: {row.container.poNumber} • {row.container.supplier}
                      </div>
                    </td>

                    {/* Type & Status */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                        {row.container.type}
                      </span>
                      <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{row.container.arrivalStatus}</span>
                      </div>
                    </td>

                    {/* Total Capacity */}
                    <td className="py-3.5 px-3 text-center font-bold text-white text-sm">
                      {row.container.totalUnits} un.
                    </td>

                    {/* Each Branch */}
                    {CHANGAN_BRANCHES.map((b) => {
                      const count = row.branchCounts[b] || 0;
                      return (
                        <td key={b} className="py-3.5 px-3 text-center">
                          {count > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold inline-block shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                              {count} u.
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Assigned */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/70 font-bold inline-block text-xs">
                        {row.totalAssigned} un.
                      </span>
                    </td>

                    {/* Free Stock to CEDIS */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/70 font-bold inline-block text-xs">
                        {row.surplus} un.
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Orders & Emergencies Table (For direct executive review) */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Casos Prioritarios & Pedidos de Emergencia para Seguimiento en Junta ({criticalOrdersForMeeting.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Monitoreo Directo</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                <th className="py-3 px-4">Nº Pedido</th>
                <th className="py-3 px-3">Sucursal</th>
                <th className="py-3 px-3">Cliente / Placa</th>
                <th className="py-3 px-3">Modelo</th>
                <th className="py-3 px-4">Repuestos Solicitados</th>
                <th className="py-3 px-3">Estatus General</th>
                <th className="py-3 px-3">Contenedor / ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {criticalOrdersForMeeting.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    <div className="flex items-center gap-1.5">
                      {order.orderType === 'Emergencia' && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      )}
                      <span>{order.orderNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">{order.quotationNumber}</div>
                  </td>

                  <td className="py-3 px-3 font-semibold text-slate-300">{order.branch}</td>

                  <td className="py-3 px-3">
                    <div className="text-slate-200 font-medium">{order.clientName}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{order.plate}</div>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-300">{order.changanModel}</td>

                  <td className="py-3 px-4 text-slate-300">
                    <div className="font-mono text-xs font-semibold text-cyan-300">
                      {order.items[0]?.code}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {order.items[0]?.description} ({order.items.length} ítems)
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        order.overallStatus === 'EN BODEGA CEDIS'
                          ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                          : order.overallStatus === 'DESPACHADO'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                          : 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
                      }`}
                    >
                      {order.overallStatus}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    {order.assignedContainerId ? (
                      <span className="text-cyan-400 font-bold">{order.assignedContainerId}</span>
                    ) : (
                      <span className="text-slate-600">Por Asignar en Cruce</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
