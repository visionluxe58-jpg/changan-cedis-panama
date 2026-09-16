import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  Clock, 
  Layers, 
  Barcode, 
  Search, 
  RefreshCw, 
  ShieldCheck,
  AlertOctagon,
  CheckCircle,
  PlusCircle,
  Filter
} from 'lucide-react';
import { DPLDetalle, UsuarioActivo } from '../types/cedis';
import { appsScriptClient } from '../services/appsScriptClient';

interface KardexStockProps {
  inventario: DPLDetalle[];
  usuario: UsuarioActivo;
  onActualizar: () => void;
}

export const KardexStock: React.FC<KardexStockProps> = ({
  inventario,
  usuario,
  onActualizar,
}) => {
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroContenedor, setFiltroContenedor] = useState<string>('TODOS');
  const [modalMerma, setModalMerma] = useState<DPLDetalle | null>(null);
  const [cantMerma, setCantMerma] = useState<number>(1);
  const [motivoMerma, setMotivoMerma] = useState<string>('Daño en desempaque');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const esRolAdmin = usuario.rol === 'ADMINISTRADOR_CEDIS';

  // Contenedores únicos para el dropdown
  const contenedores = useMemo(() => {
    const setC = new Set<string>();
    inventario.forEach(i => setC.add(i.contenedorId));
    return Array.from(setC);
  }, [inventario]);

  // Cálculos consolidados de KPI
  const kpis = useMemo(() => {
    let total = 0;
    let asignado = 0;
    let despachado = 0;
    let disponible = 0;

    inventario.forEach(i => {
      total += i.cantidadTotal;
      asignado += i.cantidadAsignada;
      despachado += i.cantidadDespachada;
      disponible += i.saldoDisponible;
    });

    return { total, asignado, despachado, disponible };
  }, [inventario]);

  const inventarioFiltrado = useMemo(() => {
    return inventario.filter(item => {
      if (filtroContenedor !== 'TODOS' && item.contenedorId !== filtroContenedor) {
        return false;
      }
      if (!filtroTexto.trim()) return true;
      const q = filtroTexto.toLowerCase();
      return (
        item.codigoRepuesto.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        (item.pallet || item.palletCaseNo || '').toLowerCase().includes(q) ||
        item.contenedorId.toLowerCase().includes(q) ||
        item.ubicacionCedis.toLowerCase().includes(q)
      );
    });
  }, [inventario, filtroTexto, filtroContenedor]);

  const handleRegistrarMerma = async () => {
    if (!modalMerma) return;
    setProcesando(true);
    setMensaje(null);

    try {
      const targetId = modalMerma.inventarioId || modalMerma.dplDetalleId || '';
      const res = await appsScriptClient.registrarAjusteMerma(
        targetId,
        cantMerma,
        motivoMerma
      );

      if (res.success) {
        setMensaje({ tipo: 'ok', texto: 'Merma de ' + cantMerma + ' unidades registrada y descontada en Kardex.' });
        setModalMerma(null);
        onActualizar();
      } else {
        setMensaje({ tipo: 'error', texto: res.error || 'Error registrando ajuste de merma.' });
      }
    } catch (err: any) {
      console.error('Error inesperado al registrar merma:', err);
      setMensaje({ tipo: 'error', texto: 'Ocurrió un error al procesar el ajuste de merma.' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Regla de Saldo Canónico */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300 px-2.5 py-0.5 rounded inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Regla Canónica: DPL_Detalle
              </span>
              <span className="text-xs text-slate-400 font-mono">
                saldoDisponible = cantidadTotal - cantidadAsignada - cantidadDespachada
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Control de Stock Físico Real & Kardex en Almacén Central CEDIS
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Cada movimiento actualiza el inventario físico en tiempo real con control de concurrencia y clave de idempotencia. Las salidas físicas descuentan definitivamente el stock de su contenedor y pallet de origen.
            </p>
          </div>

          <button
            onClick={onActualizar}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow transition self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" />
            <span>Refrescar Kardex</span>
          </button>
        </div>

        {mensaje && (
          <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${
            mensaje.tipo === 'ok' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Ingresado</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white">{kpis.total} <span className="text-xs font-normal text-slate-400">u.</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Manifiestos DPL recibidos</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4">
          <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Saldo Disponible</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">{kpis.disponible} <span className="text-xs font-normal text-emerald-500">u.</span></div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Libre para asignación inmediata</div>
        </div>

        <div className="bg-slate-900 border border-sky-900/40 rounded-xl p-4">
          <div className="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Comprometido / Asignado</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-300">{kpis.asignado} <span className="text-xs font-normal text-sky-500">u.</span></div>
          <div className="text-[11px] text-sky-500/80 mt-1">Reservado en CEDIS para pedidos</div>
        </div>

        <div className="bg-slate-900 border border-purple-900/40 rounded-xl p-4">
          <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Despachado a Sucursales</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">{kpis.despachado} <span className="text-xs font-normal text-purple-500">u.</span></div>
          <div className="text-[11px] text-purple-500/80 mt-1">Salidas físicas registradas</div>
        </div>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, pallet, descripción..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 whitespace-nowrap">Contenedor:</span>
          <select
            value={filtroContenedor}
            onChange={(e) => setFiltroContenedor(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="TODOS">Todos los Contenedores</option>
            {contenedores.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Inventario Físico DPL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-3">Contenedor / Lote</th>
                <th className="px-3.5 py-3">Pallet / Ubicación</th>
                <th className="px-3.5 py-3">Código Repuesto OEM</th>
                <th className="px-3.5 py-3">Descripción Oficial</th>
                <th className="px-3.5 py-3 text-center">Cant Total</th>
                <th className="px-3.5 py-3 text-center">Asignada</th>
                <th className="px-3.5 py-3 text-center">Despachada</th>
                <th className="px-3.5 py-3 text-center">Saldo Disponible</th>
                <th className="px-3.5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {inventarioFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron líneas en inventario coincidentes.
                  </td>
                </tr>
              ) : (
                inventarioFiltrado.map((item) => (
                  <tr key={item.dplDetalleId} className="hover:bg-slate-800/40 transition">
                    <td className="px-3.5 py-3 font-semibold text-white font-mono">
                      {item.contenedorId}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-sky-300">Pallet {item.pallet}</div>
                      <div className="text-[11px] text-slate-400">{item.ubicacionCedis}</div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-sky-400 font-bold">
                      {item.codigoRepuesto}
                    </td>
                    <td className="px-3.5 py-3 text-slate-300 max-w-xs truncate" title={item.descripcion}>
                      {item.descripcion}
                    </td>
                    <td className="px-3.5 py-3 text-center font-semibold text-white">
                      {item.cantidadTotal}
                    </td>
                    <td className="px-3.5 py-3 text-center text-sky-400 font-semibold">
                      {item.cantidadAsignada}
                    </td>
                    <td className="px-3.5 py-3 text-center text-purple-400 font-semibold">
                      {item.cantidadDespachada}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        item.saldoDisponible > 0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {item.saldoDisponible} u.
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {esRolAdmin ? (
                        <button
                          onClick={() => {
                            setModalMerma(item);
                            setCantMerma(1);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
                          title="Reportar ajuste de merma o daño"
                        >
                          Ajuste Merma
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Ajuste de Merma */}
      {modalMerma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              Ajuste de Merma / Daño Físico
            </h3>
            <p className="text-xs text-slate-300">
              Descuenta unidades no utilizables del saldo disponible registrando el evento en Kardex y en la bitácora inmutable.
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <div><strong className="text-slate-400">Repuesto:</strong> <span className="text-sky-300 font-mono">{modalMerma.codigoRepuesto}</span></div>
              <div><strong className="text-slate-400">Contenedor / Pallet:</strong> <span className="text-white">{modalMerma.contenedorId} (Pallet {modalMerma.pallet})</span></div>
              <div><strong className="text-slate-400">Saldo Disponible:</strong> <span className="text-emerald-400 font-bold">{modalMerma.saldoDisponible} u.</span></div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Cantidad a reportar como merma:</label>
              <input
                type="number"
                min={1}
                max={modalMerma.saldoDisponible}
                value={cantMerma}
                onChange={(e) => setCantMerma(Math.min(modalMerma.saldoDisponible, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Motivo justificado:</label>
              <input
                type="text"
                value={motivoMerma}
                onChange={(e) => setMotivoMerma(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalMerma(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarMerma}
                disabled={procesando || modalMerma.saldoDisponible <= 0}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition"
              >
                {procesando ? 'Guardando...' : 'Aplicar Merma en Kardex'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
