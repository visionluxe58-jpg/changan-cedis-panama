import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Award,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Flame,
  Layers,
  MapPin,
  Package,
  PieChart as PieChartIcon,
  Plane,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANGAN_BRANCHES, CHANNELS } from '../data/mockData';
import { BranchName, ShippingContainer, SpecialOrder } from '../types';

interface KpiDashboardProps {
  orders: SpecialOrder[];
  containers: ShippingContainer[];
}

// Executive Color Palettes
const CHART_COLORS = {
  cyan: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  rose: '#f43f5e',
  blue: '#3b82f6',
  indigo: '#6366f1',
  teal: '#14b8a6',
  slate: '#64748b',
};

const PIE_CONTAINER_COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#64748b'];
const PIE_STATUS_COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#0284c7', '#ef4444'];
const PIE_CHANNEL_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
const PIE_TYPE_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'];

// Custom Tooltip for Recharts Bar & Composed Charts
const CustomChartTooltip = ({ active, payload, label, unit = 'u.' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0b1120]/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] font-mono text-xs z-50 min-w-[200px] ring-1 ring-white/10">
        {label && (
          <div className="font-bold text-white mb-2.5 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="text-cyan-400">{label}</span>
            <span className="text-[10px] text-slate-400 font-normal">Métricas Oficiales</span>
          </div>
        )}
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-white tracking-wide">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{' '}
                <span className="text-slate-400 font-normal text-[10px]">
                  {entry.payload?.customUnit || unit}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Pie / Donut Chart Tooltip
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#0b1120]/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] font-mono text-xs z-50 min-w-[190px] ring-1 ring-white/10">
        <p className="font-bold text-white flex items-center gap-2 mb-2 border-b border-slate-800 pb-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: data.payload.fill || data.color }}
          />
          {data.name}
        </p>
        <div className="flex items-center justify-between gap-4 text-slate-300 mb-1">
          <span>Total:</span>
          <span className="font-bold text-white">
            {data.value.toLocaleString()}{' '}
            <span className="text-cyan-400 text-[11px]">
              ({data.payload.percent || data.payload.percentage || '0'}%)
            </span>
          </span>
        </div>
        {data.payload.units !== undefined && (
          <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px]">
            <span>Piezas / Unidades:</span>
            <span className="font-bold text-emerald-400">
              {data.payload.units.toLocaleString()} u.
            </span>
          </div>
        )}
        {data.payload.subtext && (
          <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/80 pt-1.5 leading-relaxed">
            {data.payload.subtext}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const KpiDashboard: React.FC<KpiDashboardProps> = ({ orders, containers }) => {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('TODAS');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('TODOS');
  const [monthlyMetricMode, setMonthlyMetricMode] = useState<'units' | 'orders' | 'urgency'>('units');

  // Filtered orders based on selected controls
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedBranchFilter !== 'TODAS' && o.branch !== selectedBranchFilter) return false;
      if (selectedChannelFilter !== 'TODOS' && o.channel !== selectedChannelFilter) return false;
      return true;
    });
  }, [orders, selectedBranchFilter, selectedChannelFilter]);

  // Overall calculations
  const totalOrdersCount = filteredOrders.length;
  const emergencyOrdersCount = filteredOrders.filter((o) => o.orderType === 'Emergencia').length;
  const regularOrdersCount = totalOrdersCount - emergencyOrdersCount;

  const fulfilledOrders = filteredOrders.filter(
    (o) => o.overallStatus === 'RECIBIDO EN SUCURSAL' || o.overallStatus === 'DESPACHADO'
  ).length;

  const inCedisOrders = filteredOrders.filter((o) => o.overallStatus === 'EN BODEGA CEDIS').length;
  const pendingOrders = filteredOrders.filter(
    (o) => o.overallStatus === 'PENDIENTE' || o.overallStatus === 'EN TRÁNSITO'
  ).length;
  const partialOrders = filteredOrders.filter((o) => o.overallStatus === 'PARCIAL').length;

  const totalItemsRequested = filteredOrders.reduce(
    (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityRequested, 0),
    0
  );

  const totalItemsAssigned = filteredOrders.reduce(
    (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityAssigned, 0),
    0
  );

  const totalItemsPending = Math.max(0, totalItemsRequested - totalItemsAssigned);

  const fillRatePercentage =
    totalItemsRequested > 0 ? Math.round((totalItemsAssigned / totalItemsRequested) * 100) : 100;

  // Unbilled orders alert
  const unbilledOrdersCount = filteredOrders.filter(
    (o) => !o.isBilled && o.overallStatus !== 'PENDIENTE'
  ).length;

  // Total container stats
  const totalContainersUnits = containers.reduce((acc, c) => acc + c.totalUnits, 0);
  const processedContainersCount = containers.filter((c) => c.processedForMatching).length;

  // 1. RECHARTS DATA: Monthly Order & Volume Breakdown (Volumen Mensual de Pedidos)
  const monthlyOrdersChartData = useMemo(() => {
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const currentYear = new Date().getFullYear();
    // Default 8-month rolling window (or year-to-date)
    const monthMap: Record<string, {
      monthKey: string;
      label: string;
      totalOrders: number;
      solicitados: number;
      asignados: number;
      pendientes: number;
      regulares: number;
      emergencias: number;
      listosCEDIS: number;
      despachados: number;
    }> = {};

    // Initialize 6 to 8 months sequence ending in current month
    const curMonth = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const mIdx = (curMonth - i + 12) % 12;
      const yr = curMonth - i < 0 ? currentYear - 1 : currentYear;
      const key = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[mIdx]} ${yr === currentYear ? '' : `'${String(yr).slice(-2)}`}`.trim();
      monthMap[key] = {
        monthKey: key,
        label,
        totalOrders: 0,
        solicitados: 0,
        asignados: 0,
        pendientes: 0,
        regulares: 0,
        emergencias: 0,
        listosCEDIS: 0,
        despachados: 0,
      };
    }

    // Populate data from orders
    filteredOrders.forEach((o) => {
      let d = new Date(o.createdAt);
      if (isNaN(d.getTime())) {
        d = new Date();
      }
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap[key]) {
        monthMap[key] = {
          monthKey: key,
          label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          totalOrders: 0,
          solicitados: 0,
          asignados: 0,
          pendientes: 0,
          regulares: 0,
          emergencias: 0,
          listosCEDIS: 0,
          despachados: 0,
        };
      }

      const req = o.items.reduce((s, it) => s + it.quantityRequested, 0);
      const asg = o.items.reduce((s, it) => s + it.quantityAssigned, 0);

      monthMap[key].totalOrders += 1;
      monthMap[key].solicitados += req;
      monthMap[key].asignados += asg;
      monthMap[key].pendientes += Math.max(0, req - asg);

      if (o.orderType === 'Emergencia') {
        monthMap[key].emergencias += 1;
      } else {
        monthMap[key].regulares += 1;
      }

      if (o.overallStatus === 'EN BODEGA CEDIS') {
        monthMap[key].listosCEDIS += 1;
      }
      if (o.overallStatus === 'DESPACHADO' || o.overallStatus === 'RECIBIDO EN SUCURSAL') {
        monthMap[key].despachados += 1;
      }
    });

    const result = Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Ensure baseline sample distribution if dataset is concentrated in single date
    if (result.every((r) => r.totalOrders === 0) && filteredOrders.length > 0) {
      const last = result[result.length - 1];
      if (last) {
        last.totalOrders = totalOrdersCount;
        last.solicitados = totalItemsRequested;
        last.asignados = totalItemsAssigned;
        last.pendientes = totalItemsPending;
        last.emergencias = emergencyOrdersCount;
        last.regulares = regularOrdersCount;
        last.listosCEDIS = inCedisOrders;
        last.despachados = fulfilledOrders;
      }
    }

    return result;
  }, [
    filteredOrders,
    totalOrdersCount,
    totalItemsRequested,
    totalItemsAssigned,
    totalItemsPending,
    emergencyOrdersCount,
    regularOrdersCount,
    inCedisOrders,
    fulfilledOrders,
  ]);

  // 2. RECHARTS DATA: Container Status Donut Chart (Estado de los Contenedores)
  const containerStatusChartData = useMemo(() => {
    if (containers.length === 0) {
      return [
        {
          name: 'Sin Contenedores',
          value: 1,
          percentage: '100',
          subtext: 'No hay datos cargados en sistema',
          fill: '#334155',
        },
      ];
    }

    const inCedis = containers.filter((c) => c.arrivalStatus === 'Recibido en CEDIS' || c.processedForMatching);
    const inPort = containers.filter((c) => c.arrivalStatus === 'En Puerto / Aduana' && !c.processedForMatching);
    const inTransit = containers.filter((c) => c.arrivalStatus === 'En Tránsito' && !c.processedForMatching);
    const express = containers.filter((c) => c.type === 'Aéreo Express');

    const total = containers.length;

    return [
      {
        name: 'Recibido en CEDIS (Procesado)',
        value: inCedis.length,
        units: inCedis.reduce((sum, c) => sum + c.totalUnits, 0),
        percentage: ((inCedis.length / total) * 100).toFixed(0),
        subtext: `${inCedis.reduce((sum, c) => sum + c.totalUnits, 0)} unidades procesadas y tarificadas`,
        fill: '#10b981', // emerald-500
      },
      {
        name: 'En Puerto / Aduana',
        value: inPort.length,
        units: inPort.reduce((sum, c) => sum + c.totalUnits, 0),
        percentage: ((inPort.length / total) * 100).toFixed(0),
        subtext: `${inPort.reduce((sum, c) => sum + c.totalUnits, 0)} unidades en aforo aduanero`,
        fill: '#f59e0b', // amber-500
      },
      {
        name: 'En Tránsito Marítimo',
        value: inTransit.length,
        units: inTransit.reduce((sum, c) => sum + c.totalUnits, 0),
        percentage: ((inTransit.length / total) * 100).toFixed(0),
        subtext: `${inTransit.reduce((sum, c) => sum + c.totalUnits, 0)} unidades en ruta transoceánica`,
        fill: '#06b6d4', // cyan-500
      },
      {
        name: 'Aéreo Express (Urgente)',
        value: express.length,
        units: express.reduce((sum, c) => sum + c.totalUnits, 0),
        percentage: ((express.length / total) * 100).toFixed(0),
        subtext: 'Carga urgente de fábrica por vía aérea',
        fill: '#8b5cf6', // purple-500
      },
    ].filter((item) => item.value > 0);
  }, [containers]);

  // 3. RECHARTS DATA: Container Type & Shipment Mode Distribution Pie Chart
  const containerTypeChartData = useMemo(() => {
    if (containers.length === 0) return [];
    const maritimoCount = containers.filter((c) => c.type === 'Marítimo').length;
    const aereoCount = containers.filter((c) => c.type === 'Aéreo Express').length;
    const total = containers.length || 1;

    const maritimoUnits = containers
      .filter((c) => c.type === 'Marítimo')
      .reduce((sum, c) => sum + c.totalUnits, 0);
    const aereoUnits = containers
      .filter((c) => c.type === 'Aéreo Express')
      .reduce((sum, c) => sum + c.totalUnits, 0);

    return [
      {
        name: 'Embarque Marítimo (FCL)',
        value: maritimoCount,
        units: maritimoUnits,
        percentage: ((maritimoCount / total) * 100).toFixed(0),
        subtext: 'Contenedores marítimos de alta capacidad (40HC)',
        fill: '#0ea5e9',
      },
      {
        name: 'Aéreo Express (Courier/Air)',
        value: aereoCount,
        units: aereoUnits,
        percentage: ((aereoCount / total) * 100).toFixed(0),
        subtext: 'Envíos rápidos para pedidos de emergencia',
        fill: '#8b5cf6',
      },
    ].filter((it) => it.value > 0);
  }, [containers]);

  // 4. RECHARTS DATA: Branch Volume & Fulfillment Bar Chart
  const branchChartData = useMemo(() => {
    return CHANGAN_BRANCHES.map((branch) => {
      const branchOrders = filteredOrders.filter((o) => o.branch === branch);
      const req = branchOrders.reduce(
        (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityRequested, 0),
        0
      );
      const asg = branchOrders.reduce(
        (acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantityAssigned, 0),
        0
      );
      const ready = branchOrders.filter((o) => o.overallStatus === 'EN BODEGA CEDIS').length;
      const dispatched = branchOrders.filter(
        (o) => o.overallStatus === 'DESPACHADO' || o.overallStatus === 'RECIBIDO EN SUCURSAL'
      ).length;
      const rate = req > 0 ? Math.round((asg / req) * 100) : 100;

      return {
        branch,
        shortName: branch
          .replace('Costa Verde', 'C. Verde')
          .replace('Tumba Muerto', 'T. Muerto')
          .replace('Villa Lucre', 'V. Lucre')
          .replace('Santa María', 'S. María'),
        totalOrders: branchOrders.length,
        solicitados: req,
        asignados: asg,
        listosCEDIS: ready,
        despachados: dispatched,
        pendientes: Math.max(0, req - asg),
        fillRate: rate,
      };
    });
  }, [filteredOrders]);

  // 5. RECHARTS DATA: Model Demand Horizontal Bar Chart
  const modelChartData = useMemo(() => {
    const modelMap: Record<string, { count: number; itemsRequested: number; itemsAssigned: number }> = {};

    filteredOrders.forEach((o) => {
      const model = (o.changanModel || (o as any).vehicleModel || 'Otros').toUpperCase().trim();
      const req = o.items.reduce((sum, it) => sum + it.quantityRequested, 0);
      const asg = o.items.reduce((sum, it) => sum + it.quantityAssigned, 0);

      if (!modelMap[model]) {
        modelMap[model] = { count: 0, itemsRequested: 0, itemsAssigned: 0 };
      }
      modelMap[model].count += 1;
      modelMap[model].itemsRequested += req;
      modelMap[model].itemsAssigned += asg;
    });

    return Object.entries(modelMap)
      .map(([model, data]) => ({
        model,
        pedidos: data.count,
        solicitados: data.itemsRequested,
        asignados: data.itemsAssigned,
        rate: data.itemsRequested > 0 ? Math.round((data.itemsAssigned / data.itemsRequested) * 100) : 100,
      }))
      .sort((a, b) => b.solicitados - a.solicitados)
      .slice(0, 7);
  }, [filteredOrders]);

  // 6. RECHARTS DATA: Order Global Status Donut Chart
  const orderStatusChartData = useMemo(() => {
    if (filteredOrders.length === 0) {
      return [{ name: 'Sin Pedidos', value: 1, percentage: '100', fill: '#334155' }];
    }
    const total = filteredOrders.length;
    return [
      {
        name: 'En Bodega CEDIS',
        value: inCedisOrders,
        percentage: ((inCedisOrders / total) * 100).toFixed(0),
        subtext: 'Listos con rótulo y QR para despacho',
        fill: '#f59e0b',
      },
      {
        name: 'Despachado / Entregado',
        value: fulfilledOrders,
        percentage: ((fulfilledOrders / total) * 100).toFixed(0),
        subtext: 'En sucursal o recibido por cliente',
        fill: '#10b981',
      },
      {
        name: 'Parcialmente Asignado',
        value: partialOrders,
        percentage: ((partialOrders / total) * 100).toFixed(0),
        subtext: 'En espera de segundo contenedor',
        fill: '#8b5cf6',
      },
      {
        name: 'Pendiente / En Tránsito',
        value: pendingOrders,
        percentage: ((pendingOrders / total) * 100).toFixed(0),
        subtext: 'Esperando arribo al puerto',
        fill: '#0284c7',
      },
    ].filter((item) => item.value > 0);
  }, [filteredOrders, inCedisOrders, fulfilledOrders, partialOrders, pendingOrders]);

  // 7. RECHARTS DATA: Sales Channel Breakdown
  const channelChartData = useMemo(() => {
    const channelMap: Record<string, { count: number; items: number }> = {};

    filteredOrders.forEach((o) => {
      const ch = o.channel || 'Mostrador';
      const itemsCount = o.items.reduce((sum, it) => sum + it.quantityRequested, 0);
      if (!channelMap[ch]) {
        channelMap[ch] = { count: 0, items: 0 };
      }
      channelMap[ch].count += 1;
      channelMap[ch].items += itemsCount;
    });

    const total = filteredOrders.length || 1;

    return Object.entries(channelMap).map(([channel, data], index) => ({
      name: channel,
      value: data.count,
      items: data.items,
      percentage: ((data.count / total) * 100).toFixed(0),
      fill: PIE_CHANNEL_COLORS[index % PIE_CHANNEL_COLORS.length],
    }));
  }, [filteredOrders]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Command Header */}
      <div className="bg-slate-900/60 border border-slate-800/90 p-6 lg:p-7 rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981] animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.25em] text-emerald-400 font-mono font-black">
                CHANGAN PANAMÁ // DASHBOARD ANALÍTICO EJECUTIVO
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                RECHARTS BI ENGINE
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Control Integral de Rendimiento & Flujo de Importación
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed font-sans">
              Visualización ejecutiva de volumen mensual de pedidos especiales, estado de contenedores de importación,
              eficiencia de cruce en CEDIS y demanda segmentada por modelo y sucursal.
            </p>
          </div>

          {/* Quick Filter Slicers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Slicer */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs font-mono shadow-inner">
              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold"
              >
                <option value="TODAS" className="bg-slate-950">Todas las Sucursales ({CHANGAN_BRANCHES.length})</option>
                {CHANGAN_BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-slate-950">{b}</option>
                ))}
              </select>
            </div>

            {/* Channel Slicer */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs font-mono shadow-inner">
              <Filter className="w-4 h-4 text-purple-400 shrink-0" />
              <select
                value={selectedChannelFilter}
                onChange={(e) => setSelectedChannelFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold"
              >
                <option value="TODOS" className="bg-slate-950">Todos los Canales ({CHANNELS.length})</option>
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch} className="bg-slate-950">{ch}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4 Core Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {/* Card 1: Fill Rate */}
          <div className="bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/50 p-5 rounded-2xl relative overflow-hidden transition-all shadow-lg group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Fill Rate (Cumplimiento)
                </span>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                  {fillRatePercentage}%
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${Math.max(5, fillRatePercentage)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono mt-3 text-slate-400">
              <span>Asignadas: <strong className="text-white">{totalItemsAssigned}</strong> u.</span>
              <span>Pendientes: <strong className="text-amber-400">{totalItemsPending}</strong> u.</span>
            </div>
          </div>

          {/* Card 2: Average Lead Time */}
          <div className="bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/50 p-5 rounded-2xl relative overflow-hidden transition-all shadow-lg group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Lead Time CEDIS
                </span>
                <div className="text-3xl font-black font-mono text-cyan-300 mt-1">
                  2.2 Días
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono mt-3 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>-76% de tiempo</span>
              <span className="text-slate-400 font-normal">vs bodega manual</span>
            </div>

            <div className="text-[10px] font-mono text-slate-500 mt-2">
              Desde arribo al puerto hasta entrega en sucursal
            </div>
          </div>

          {/* Card 3: Ready in CEDIS */}
          <div className="bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/50 p-5 rounded-2xl relative overflow-hidden transition-all shadow-lg group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Listos en Bodega CEDIS
                </span>
                <div className="text-3xl font-black font-mono text-amber-400 mt-1">
                  {inCedisOrders} <span className="text-base text-slate-400 font-normal">Órdenes</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-950/70 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono mt-3 text-slate-400">
              <span>Etiquetados QR: <strong className="text-amber-300">{inCedisOrders}</strong></span>
              <span>Despachados: <strong className="text-emerald-400">{fulfilledOrders}</strong></span>
            </div>

            <div className="text-[10px] font-mono text-slate-500 mt-2">
              Rutas logísticas listas para salida diaria
            </div>
          </div>

          {/* Card 4: Import Containers Volume */}
          <div className="bg-slate-950/80 border border-slate-800/90 hover:border-purple-500/50 p-5 rounded-2xl relative overflow-hidden transition-all shadow-lg group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Flota de Contenedores
                </span>
                <div className="text-3xl font-black font-mono text-purple-300 mt-1">
                  {processedContainersCount} / {containers.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                <Box className="w-5 h-5" />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-300 mt-3 flex justify-between">
              <span>Volumen Importado:</span>
              <strong className="text-purple-400 font-bold">{totalContainersUnits.toLocaleString()} piezas</strong>
            </div>

            <div className="text-[10px] font-mono text-slate-500 mt-2">
              Cruce automatizado con 100% de trazabilidad
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: RECHARTS BAR CHARTS — VOLUMEN DE PEDIDOS MENSUALES */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-black text-white font-mono uppercase tracking-wider">
                  Volumen Mensual de Pedidos & Demanda de Repuestos
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Evolución histórica y mensual del flujo de solicitudes en la red Changan
                </p>
              </div>
            </div>
          </div>

          {/* Metric View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMonthlyMetricMode('units')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                monthlyMetricMode === 'units'
                  ? 'bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-200 border border-cyan-600/50 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unidades (Solicitadas vs Asignadas)</span>
            </button>

            <button
              onClick={() => setMonthlyMetricMode('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                monthlyMetricMode === 'orders'
                  ? 'bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-200 border border-cyan-600/50 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cantidad de Órdenes</span>
            </button>

            <button
              onClick={() => setMonthlyMetricMode('urgency')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                monthlyMetricMode === 'urgency'
                  ? 'bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-200 border border-cyan-600/50 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Regulares vs Emergencias</span>
            </button>
          </div>
        </div>

        {/* Recharts Monthly Volume Bar Chart */}
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyOrdersChartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                fontFamily="monospace"
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                fontFamily="monospace"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={
                  <CustomChartTooltip
                    unit={monthlyMetricMode === 'units' ? 'piezas' : 'órdenes'}
                  />
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 11, fontFamily: 'monospace' }}
              />

              {monthlyMetricMode === 'units' && (
                <>
                  <Bar
                    dataKey="solicitados"
                    name="Piezas Solicitadas"
                    fill="#0ea5e9"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="asignados"
                    name="Piezas Asignadas CEDIS"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="pendientes"
                    name="Piezas Pendientes"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </>
              )}

              {monthlyMetricMode === 'orders' && (
                <>
                  <Bar
                    dataKey="totalOrders"
                    name="Total de Órdenes"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="listosCEDIS"
                    name="Listas en Bodega CEDIS"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="despachados"
                    name="Despachadas a Sucursal"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </>
              )}

              {monthlyMetricMode === 'urgency' && (
                <>
                  <Bar
                    dataKey="regulares"
                    name="Pedidos Regulares (Stock/Taller)"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="emergencias"
                    name="Pedidos de Emergencia ⚡ (Aéreo/VOR)"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Key Metric Micro-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 text-xs font-mono mt-4">
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <span className="text-[10px] text-slate-400 block uppercase">Total Acumulado</span>
            <div className="text-lg font-black text-cyan-400 mt-0.5">{totalOrdersCount} órdenes</div>
            <div className="text-[10px] text-slate-500 mt-1">En el ciclo operativo analizado</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <span className="text-[10px] text-slate-400 block uppercase">Piezas Gestionadas</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{totalItemsRequested.toLocaleString()} u.</div>
            <div className="text-[10px] text-slate-500 mt-1">{totalItemsAssigned.toLocaleString()} u. asignadas con éxito</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <span className="text-[10px] text-slate-400 block uppercase">Ratio Emergencias</span>
            <div className="text-lg font-black text-rose-400 mt-0.5">
              {totalOrdersCount > 0 ? ((emergencyOrdersCount / totalOrdersCount) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{emergencyOrdersCount} pedidos prioritarios</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <span className="text-[10px] text-slate-400 block uppercase">Efectividad Global</span>
            <div className="text-lg font-black text-teal-300 mt-0.5">{fillRatePercentage}% Fill Rate</div>
            <div className="text-[10px] text-slate-500 mt-1">Cumplimiento en tiempo récord</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: RECHARTS PIE & DONUT CHARTS — ESTADO DE LOS CONTENEDORES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Estado Operativo de Contenedores de Importación (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Estado & Ciclo de Contenedores de Importación
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Monitoreo en tiempo real de embarques en tránsito, puerto y CEDIS
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full font-black">
                {containers.length} Embarques
              </span>
            </div>

            {/* Donut Chart with Center Data */}
            <div className="h-[270px] w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={containerStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {containerStatusChartData.map((entry, index) => (
                      <Cell
                        key={`cell-container-${index}`}
                        fill={entry.fill || PIE_CONTAINER_COLORS[index % PIE_CONTAINER_COLORS.length]}
                        stroke="#0b1120"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Ring Indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {containers.length}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                  Contenedores
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {totalContainersUnits.toLocaleString()} piezas
                </span>
              </div>
            </div>

            {/* Interactive Status List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono pt-2">
              {containerStatusChartData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.fill }}
                    />
                    <div className="truncate">
                      <div className="text-slate-200 text-[11px] font-bold truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.units?.toLocaleString() || 0} piezas</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="text-white text-xs">{item.value} ctn</strong>
                    <div className="text-cyan-400 text-[10px] font-bold">({item.percentage}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl mt-5 text-[11px] font-mono text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{processedContainersCount} de {containers.length} contenedores cruzados contra pedidos especiales.</span>
            </div>
            <span className="text-emerald-400 font-bold text-xs">
              {containers.length > 0 ? ((processedContainersCount / containers.length) * 100).toFixed(0) : 0}% Procesado
            </span>
          </div>
        </div>

        {/* Gráfico 2: Distribución por Tipo de Embarque & Vía Logística (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Modalidad de Embarque
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Marítimo FCL vs. Aéreo Express
                  </p>
                </div>
              </div>
            </div>

            {/* Donut Chart for Shipment Mode */}
            <div className="h-[230px] w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={containerTypeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {containerTypeChartData.map((entry, index) => (
                      <Cell
                        key={`cell-type-${index}`}
                        fill={entry.fill || PIE_TYPE_COLORS[index % PIE_TYPE_COLORS.length]}
                        stroke="#0b1120"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black font-mono text-white">
                  {totalContainersUnits.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider font-bold">
                  Piezas Totales
                </span>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="space-y-2.5 text-xs font-mono pt-1">
              {containerTypeChartData.map((t) => (
                <div
                  key={t.name}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.fill }} />
                    <div>
                      <div className="font-bold text-white text-xs">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.subtext}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-cyan-300 text-xs">{t.units.toLocaleString()} u.</div>
                    <div className="text-[10px] text-slate-400">{t.value} envíos ({t.percentage}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl mt-4 text-[11px] font-mono text-purple-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Priorización automática de carga urgente
            </span>
            <strong className="text-white text-xs">Activo</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: RECHARTS BAR & DONUT CHARTS — SUCURSALES, MODELOS & CANALES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Asignación y Cumplimiento por Sucursal (BarChart - 7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Volumen y Cumplimiento por Sucursal
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Comparativa de repuestos solicitados vs asignados por sede Changan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" /> Solicitados
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Asignados
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={branchChartData}
                  margin={{ top: 15, right: 15, left: -15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip unit="piezas" />} />
                  <Bar
                    dataKey="solicitados"
                    name="Solicitadas"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="asignados"
                    name="Asignadas"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Branch Fill Rate Pills */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-4 border-t border-slate-800/80 text-center font-mono">
            {branchChartData.map((b) => (
              <div key={b.branch} className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/90">
                <div className="text-[10px] text-slate-400 truncate font-bold">{b.shortName}</div>
                <div
                  className={`text-xs font-black mt-1 ${
                    b.fillRate >= 80 ? 'text-emerald-400' : b.fillRate >= 50 ? 'text-cyan-400' : 'text-amber-400'
                  }`}
                >
                  {b.fillRate}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 2: Demanda por Modelo Changan (Horizontal BarChart - 5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-950 border border-violet-800/60 flex items-center justify-center text-violet-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Demanda por Modelo Changan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Ranking de modelos con mayor volumen de repuestos
                  </p>
                </div>
              </div>
            </div>

            {modelChartData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-xs font-mono text-slate-500">
                No hay pedidos de modelos registrados actualmente.
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modelChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 25, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="model"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      width={85}
                    />
                    <Tooltip content={<CustomChartTooltip unit="piezas" />} />
                    <Bar
                      dataKey="solicitados"
                      name="Solicitadas"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={16}
                    />
                    <Bar
                      dataKey="asignados"
                      name="Asignadas"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Solicitadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Asignadas
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: RECHARTS DONUT CHARTS — CICLO DEL PEDIDO & CANALES DE VENTA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut 1: Ciclo de Vida y Estatus Global del Pedido (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Ciclo y Estado de Pedidos Especiales
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Distribución porcentual por etapa del flujo logístico
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-amber-950 text-amber-300 border border-amber-700/60 rounded-full font-black">
                {totalOrdersCount} Órdenes
              </span>
            </div>

            <div className="h-[210px] w-full relative my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {orderStatusChartData.map((entry, index) => (
                      <Cell
                        key={`cell-status-${index}`}
                        fill={entry.fill || PIE_STATUS_COLORS[index % PIE_STATUS_COLORS.length]}
                        stroke="#0b1120"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black font-mono text-white">{totalOrdersCount}</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Total</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-2">
              {orderStatusChartData.map((st) => (
                <div
                  key={st.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80"
                >
                  <span className="flex items-center gap-2 text-slate-300 min-w-0 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.fill }} />
                    <span className="truncate">{st.name}</span>
                  </span>
                  <span className="text-white font-bold shrink-0 ml-2">
                    {st.value} <span className="text-slate-400 font-normal">({st.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl mt-4 text-[11px] font-mono text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              Facturación pendiente de emitir en sucursales:
            </span>
            <strong className="text-white text-xs">{unbilledOrdersCount} pedidos</strong>
          </div>
        </div>

        {/* Donut 2: Canales de Venta (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800/90 p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                    Distribución por Canales de Venta
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Participación de Taller, Mostrador, Chapistería y Garantía
                  </p>
                </div>
              </div>
            </div>

            <div className="h-[210px] w-full relative my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {channelChartData.map((entry, index) => (
                      <Cell
                        key={`cell-channel-${index}`}
                        fill={entry.fill || PIE_CHANNEL_COLORS[index % PIE_CHANNEL_COLORS.length]}
                        stroke="#0b1120"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black font-mono text-white">{filteredOrders.length}</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Canales</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-2">
              {channelChartData.map((ch) => (
                <div
                  key={ch.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80"
                >
                  <span className="flex items-center gap-2 text-slate-300 min-w-0 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.fill }} />
                    <span className="truncate">{ch.name}</span>
                  </span>
                  <span className="text-white font-bold shrink-0 ml-2">
                    {ch.value} <span className="text-slate-400 font-normal">({ch.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl mt-4 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              Mayor canal demandante:
            </span>
            <strong className="text-white text-xs">
              {channelChartData[0]?.name || 'Taller'} ({channelChartData[0]?.percentage || '0'}%)
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
