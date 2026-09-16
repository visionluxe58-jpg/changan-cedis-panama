import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Boxes, 
  Truck, 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Layers, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  Ship, 
  ExternalLink,
  ArrowRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { FilaMatrizCentral, DPLDetalle, ManifiestoDPL } from '../types/cedis';
import { CONTENEDORES_CANONICOS } from '../services/appsScriptClient';

interface ModalRastreadorUniversalProps {
  isOpen: boolean;
  onClose: () => void;
  filas: FilaMatrizCentral[];
  inventario: DPLDetalle[];
  manifiestos?: ManifiestoDPL[];
  codigoInicial?: string;
  onSeleccionarRepuesto?: (codigo: string) => void;
}

export const ModalRastreadorUniversal: React.FC<ModalRastreadorUniversalProps> = ({
  isOpen,
  onClose,
  filas,
  inventario,
  manifiestos = [],
  codigoInicial = '',
  onSeleccionarRepuesto
}) => {
  const [busqueda, setBusqueda] = useState<string>(codigoInicial);
  const [pestanaFiltro, setPestanaFiltro] = useState<'todos' | 'dpl' | 'pedidos'>('todos');

  // Si cambia el código inicial al abrir
  React.useEffect(() => {
    if (codigoInicial) {
      setBusqueda(codigoInicial);
    }
  }, [codigoInicial, isOpen]);

  // Mapa de contenedores para lookup rápido de fechas de arribo y estatus
  const mapaContenedores = useMemo(() => {
    const mapa = new Map<string, { fechaArribo: string; estado: string; tipoTransporte?: string; poReferencia?: string }>();
    
    // Contenedores canónicos mock
    CONTENEDORES_CANONICOS.forEach(c => {
      mapa.set(c.contenedorId.toLowerCase(), {
        fechaArribo: c.fechaArribo,
        estado: c.estado,
        tipoTransporte: c.tipoTransporte,
        poReferencia: c.poReferencia
      });
    });

    // Manifiestos dinámicos
    manifiestos.forEach(m => {
      if (m.contenedorId) {
        mapa.set(m.contenedorId.toLowerCase(), {
          fechaArribo: m.fechaArribo || 'Confirmada en CEDIS',
          estado: m.estatusAduana || m.estado || 'EN TRÁNSITO',
          tipoTransporte: m.tipoTransporte || 'Marítimo 40HQ',
          poReferencia: m.blReferencia || m.poReferencia
        });
      }
    });

    return mapa;
  }, [manifiestos]);

  // Ejemplos rápidos para búsqueda instantánea
  const ejemplosRapidos = [
    'S111F260204-0100',
    'H15001-0800',
    '1109011-M01',
    '3501110-B01',
    'Amortiguador'
  ];

  // Filtro de DPL (Inventario en almacén y llegadas)
  const dplFiltrado = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.trim().toLowerCase();

    return inventario.filter(item => 
      item.codigoRepuesto.toLowerCase().includes(q) ||
      item.descripcion.toLowerCase().includes(q) ||
      item.contenedorId.toLowerCase().includes(q) ||
      (item.pallet && item.pallet.toLowerCase().includes(q)) ||
      (item.palletCaseNo && item.palletCaseNo.toLowerCase().includes(q)) ||
      (item.ubicacionCedis && item.ubicacionCedis.toLowerCase().includes(q))
    );
  }, [inventario, busqueda]);

  // Filtro de Requisiciones / Pedidos Asignados
  const pedidosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.trim().toLowerCase();

    return filas.filter(f => 
      f.codigoRepuesto.toLowerCase().includes(q) ||
      f.descripcionOficial.toLowerCase().includes(q) ||
      f.pedidoId.toLowerCase().includes(q) ||
      f.cliente.toLowerCase().includes(q) ||
      f.sucursal.toLowerCase().includes(q) ||
      f.modeloChangan.toLowerCase().includes(q) ||
      f.contenedorAsignado.toLowerCase().includes(q) ||
      f.palletAsignado.toLowerCase().includes(q) ||
      f.numeroOR.toLowerCase().includes(q) ||
      f.vin.toLowerCase().includes(q) ||
      f.colaborador.toLowerCase().includes(q)
    );
  }, [filas, busqueda]);

  // Totales consolidados de la búsqueda
  const resumenBusqueda = useMemo(() => {
    const totalDplPiezas = dplFiltrado.reduce((acc, i) => acc + (i.cantidadTotal || 0), 0);
    const saldoLibre = dplFiltrado.reduce((acc, i) => acc + (i.saldoDisponible || 0), 0);
    const comprometido = dplFiltrado.reduce((acc, i) => acc + (i.cantidadAsignada || 0), 0);
    const despachado = dplFiltrado.reduce((acc, i) => acc + (i.cantidadDespachada || 0), 0);

    const pedidosAsignados = pedidosFiltrados.filter(p => p.cantidadAsignada > 0).length;
    const pedidosPendientes = pedidosFiltrados.filter(p => p.estatusLinea === 'Pendiente').length;

    return {
      totalDplPiezas,
      saldoLibre,
      comprometido,
      despachado,
      totalRegistrosDpl: dplFiltrado.length,
      totalRegistrosPedidos: pedidosFiltrados.length,
      pedidosAsignados,
      pedidosPendientes
    };
  }, [dplFiltrado, pedidosFiltrados]);

  // Total de pedidos únicos y embarques en el sistema para el footer
  const totalPedidosUnicos = useMemo(() => new Set(filas.map(f => f.pedidoId)).size, [filas]);
  const totalEmbarques = useMemo(() => {
    const conts = new Set(inventario.map(i => i.contenedorId));
    return Math.max(conts.size, 8);
  }, [inventario]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#070e18] border border-cyan-900/60 rounded-3xl shadow-2xl shadow-cyan-950/60 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal (idéntica a la imagen del usuario) */}
        <div className="px-6 pt-6 pb-4 border-b border-cyan-950/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Ícono de búsqueda resplandeciente */}
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/60 bg-cyan-950/50 flex items-center justify-center text-cyan-400 font-black text-xl shadow-lg shadow-cyan-500/20 shrink-0">
              <Search className="w-6 h-6 text-cyan-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] uppercase tracking-wider font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>RASTREADOR UNIVERSAL // CONTENEDORES & PEDIDOS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Búsqueda Global de Repuestos Changan
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Input de Búsqueda y Ejemplos Rápidos */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-900 space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escriba el código de pieza (ej. S111F260204, 1109011-M01) o nombre del repuesto..."
              className="w-full bg-[#0a1322] border border-slate-700/80 focus:border-cyan-500 rounded-2xl pl-12 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Ejemplos rápidos interactivos */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Ejemplos rápidos:</span>
            {ejemplosRapidos.map((ejemplo) => (
              <button
                key={ejemplo}
                type="button"
                onClick={() => setBusqueda(ejemplo)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono transition cursor-pointer border ${
                  busqueda === ejemplo
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {ejemplo}
              </button>
            ))}
          </div>

          {/* Pestañas de filtrado de resultados si hay búsqueda */}
          {busqueda.trim() && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
              <button
                type="button"
                onClick={() => setPestanaFiltro('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pestanaFiltro === 'todos'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Todos los Hallazgos ({dplFiltrado.length + pedidosFiltrados.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPestanaFiltro('dpl')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pestanaFiltro === 'dpl'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Existencias en DPL ({dplFiltrado.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPestanaFiltro('pedidos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pestanaFiltro === 'pedidos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Requisiciones Sucursales ({pedidosFiltrados.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo del Modal: Resultados o Estado Inicial */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!busqueda.trim() ? (
            /* Estado Vacío Inicial (idéntico al de la imagen del usuario) */
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full border border-cyan-900/60 bg-cyan-950/20 mx-auto flex items-center justify-center text-cyan-500/60">
                <Search className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Ingrese un código de repuesto para escanear el sistema
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  El motor rastreará en tiempo real todos los pedidos de las 6 sucursales y todos los contenedores (en tránsito marítimo, aduanas, recibidos en CEDIS o históricos).
                </p>
              </div>
            </div>
          ) : (
            /* Resultados de la búsqueda */
            <div className="space-y-6">
              {/* Tarjeta de Resumen Cuantitativo de Disponibilidad */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                  <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-sky-400" />
                    <span>Total en DPL</span>
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    {resumenBusqueda.totalDplPiezas} <span className="text-xs text-slate-400 font-normal">piezas</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ingresadas en contenedores</div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3.5">
                  <div className="text-[11px] uppercase font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saldo Libre</span>
                  </div>
                  <div className="text-xl font-black text-emerald-300 mt-1">
                    {resumenBusqueda.saldoLibre} <span className="text-xs text-emerald-400/80 font-normal">disponibles</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/70 mt-0.5">Listas para asignar a pedidos</div>
                </div>

                <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-3.5">
                  <div className="text-[11px] uppercase font-bold text-blue-300 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Comprometido</span>
                  </div>
                  <div className="text-xl font-black text-blue-300 mt-1">
                    {resumenBusqueda.comprometido} <span className="text-xs text-blue-400/80 font-normal">reservadas</span>
                  </div>
                  <div className="text-[10px] text-blue-400/70 mt-0.5">En requisiciones activas</div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                  <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pedidos Sucursales</span>
                  </div>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    {resumenBusqueda.totalRegistrosPedidos} <span className="text-xs text-slate-400 font-normal">líneas</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{resumenBusqueda.pedidosAsignados} asignadas &bull; {resumenBusqueda.pedidosPendientes} pendientes</div>
                </div>
              </div>

              {/* SECCIÓN 1: INVENTARIO EN DPL (LO LIBRE Y LO RESERVADO) */}
              {(pestanaFiltro === 'todos' || pestanaFiltro === 'dpl') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Existencias en DPL &bull; Almacén Central CEDIS ({dplFiltrado.length})
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400">
                      Validación de contenedores, pallets y saldo libre
                    </span>
                  </div>

                  {dplFiltrado.length === 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                      No se encontraron ingresos directos en DPL con el criterio «{busqueda}».
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-lg bg-slate-900/60">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                              <th className="py-3 px-4">Código OEM / Descripción</th>
                              <th className="py-3 px-4">Contenedor & Llegada</th>
                              <th className="py-3 px-4">Pallet / Ubicación</th>
                              <th className="py-3 px-4 text-center">Total DPL</th>
                              <th className="py-3 px-4 text-center">Saldo Libre</th>
                              <th className="py-3 px-4 text-center">Comprometido</th>
                              <th className="py-3 px-4 text-center">Despachado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {dplFiltrado.map((item, idx) => {
                              const datosContenedor = mapaContenedores.get(item.contenedorId.toLowerCase());
                              const fechaLlegada = datosContenedor?.fechaArribo || 'Confirmada en CEDIS';
                              const rawEstado = datosContenedor?.estado || item.ubicacionCedis || '';
                              
                              let estatusContenedor: 'EN TRÁNSITO' | 'ADUANA' | 'RECIBIDO' = 'EN TRÁNSITO';
                              const rawUpper = rawEstado.toUpperCase();
                              if (rawUpper.includes('TRÁNSIT') || rawUpper.includes('TRANSIT') || rawUpper.includes('ALTAMAR')) {
                                estatusContenedor = 'EN TRÁNSITO';
                              } else if (rawUpper.includes('ADUAN') || rawUpper.includes('PUERTO')) {
                                estatusContenedor = 'ADUANA';
                              }

                              const estaRecibido = estatusContenedor === 'RECIBIDO';

                              return (
                                <tr key={item.inventarioId || idx} className="hover:bg-slate-850/60 transition">
                                  <td className="py-3 px-4">
                                    <div className="font-mono font-bold text-cyan-400 text-xs">
                                      {item.codigoRepuesto}
                                    </div>
                                    <div className="text-slate-200 font-medium text-xs mt-0.5 max-w-xs">
                                      {item.descripcion}
                                    </div>
                                    {onSeleccionarRepuesto && (
                                      <button
                                        type="button"
                                        onClick={() => onSeleccionarRepuesto(item.codigoRepuesto)}
                                        className="mt-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                                      >
                                        Usar en Requisición &rarr;
                                      </button>
                                    )}
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                                      <Ship className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                      <span>{item.contenedorId}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                                      <Calendar className="w-3 h-3 text-slate-500" />
                                      <span>Arribo: {fechaLlegada}</span>
                                    </div>
                                    <div className="mt-1">
                                      {estatusContenedor === 'EN TRÁNSITO' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                                          <span>🚢</span> EN TRÁNSITO
                                        </span>
                                      )}
                                      {estatusContenedor === 'ADUANA' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                          <span>🛃</span> EN ADUANA
                                        </span>
                                      )}
                                      {estatusContenedor === 'RECIBIDO' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                          <span>🏢</span> RECIBIDO EN CEDIS
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="font-mono text-xs font-semibold text-slate-200">
                                      Pallet: {item.pallet || item.palletCaseNo || 'P001'}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                      Ubicación: {item.ubicacionCedis || (estaRecibido ? 'CEDIS-A1' : 'En Altamar / Puerto')}
                                    </div>
                                    {item.packageNo && (
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Pkg: {item.packageNo}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-center font-bold text-slate-200 font-mono">
                                    {item.cantidadTotal} u.
                                  </td>

                                  <td className="py-3 px-4 text-center">
                                    {estaRecibido ? (
                                      <span className={`px-2.5 py-1 rounded-full font-black text-xs inline-block border ${
                                        item.saldoDisponible > 0
                                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-sm shadow-emerald-900/50'
                                          : 'bg-rose-950 text-rose-300 border-rose-800'
                                      }`}>
                                        {item.saldoDisponible > 0 ? `${item.saldoDisponible} libres` : 'Agotado'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-900 border border-slate-700 text-slate-300 inline-block">
                                        {item.cantidadTotal} u. (En camino)
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-center">
                                    {estaRecibido ? (
                                      <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-blue-950 text-blue-300 border border-blue-800">
                                        {item.cantidadAsignada || 0}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        0 (Sin asignar)
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-center text-slate-400 font-mono">
                                    {item.cantidadDespachada || 0}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN 2: RASTREO DE REPUESTOS ASIGNADOS A SUCURSALES */}
              {(pestanaFiltro === 'todos' || pestanaFiltro === 'pedidos') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Requisiciones con este Repuesto Asignado ({pedidosFiltrados.length})
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400">
                      Rastreo de asignación, estatus, pallet, contenedor y llegada
                    </span>
                  </div>

                  {pedidosFiltrados.length === 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                      No hay pedidos de sucursales con el código «{busqueda}».
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {pedidosFiltrados.map((p) => {
                        const datosContenedor = p.contenedorAsignado ? mapaContenedores.get(p.contenedorAsignado.toLowerCase()) : null;
                        const fechaLlegada = datosContenedor?.fechaArribo || 'Confirmada en CEDIS';

                        return (
                          <div 
                            key={p.lineaId}
                            className="bg-slate-900/80 hover:bg-slate-850/80 border border-slate-800 rounded-2xl p-4 transition space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-black text-cyan-400 text-sm bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/60">
                                  {p.pedidoId}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{p.sucursal}</span>
                                    <span className="text-slate-500">&bull;</span>
                                    <span className="text-slate-300 font-normal">{p.colaborador}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Cliente: <strong className="text-slate-300">{p.cliente}</strong> &bull; O.R.: <strong className="text-slate-300">{p.numeroOR || 'N/D'}</strong> &bull; Modelo: <strong className="text-cyan-400">{p.modeloChangan}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                  p.estatusLinea === 'Despachado'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : p.estatusLinea === 'Asignado'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : p.estatusLinea === 'Sin Stock'
                                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                                    : 'bg-amber-950 text-amber-300 border-amber-800'
                                }`}>
                                  {p.estatusLinea}
                                </span>
                              </div>
                            </div>

                            {/* Detalles de la pieza y asignación logística */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              {/* Pieza y cantidades */}
                              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Pieza Solicitada:</div>
                                <div className="font-mono text-cyan-400 font-bold mt-0.5">{p.codigoRepuesto}</div>
                                <div className="text-slate-300 text-[11px] truncate">{p.descripcionOficial}</div>
                                <div className="mt-2 text-[11px] flex items-center justify-between">
                                  <span className="text-slate-400">Solicitada: <strong>{p.cantidadSolicitada} u.</strong></span>
                                  <span className="text-emerald-400 font-bold">Asignada: {p.cantidadAsignada} u.</span>
                                </div>
                              </div>

                              {/* Contenedor y Arribo */}
                              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                                  <Ship className="w-3 h-3 text-blue-400" />
                                  <span>Contenedor de Arribo:</span>
                                </div>
                                <div className="font-mono text-white font-bold mt-0.5">
                                  {p.contenedorAsignado || 'En proceso de asignación'}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Llegada / Arribo: <strong>{fechaLlegada}</strong></span>
                                </div>
                              </div>

                              {/* Pallet y Ubicación */}
                              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                                  <Boxes className="w-3 h-3 text-cyan-400" />
                                  <span>Pallet & Ubicación CEDIS:</span>
                                </div>
                                <div className="font-mono text-cyan-300 font-bold mt-0.5">
                                  Pallet: {p.palletAsignado || 'Asignación Dinámica'}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  Bodega: <strong>{p.ubicacionCedis || 'CEDIS Almacén Central'}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Modal (idéntico a la imagen del usuario) */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-xs">
            Escaneo instantáneo sobre <strong className="text-slate-200">{totalPedidosUnicos} pedidos</strong> y <strong className="text-slate-200">{totalEmbarques} embarques</strong>.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
};
