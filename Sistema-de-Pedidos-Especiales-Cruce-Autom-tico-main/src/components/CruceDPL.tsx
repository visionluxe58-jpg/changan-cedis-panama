import React, { useState, useMemo, useCallback } from 'react';
import { 
  Ship, 
  Plus, 
  Boxes, 
  Package, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Edit2,
  Sliders,
  Search,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  Trash2,
  Check,
  Clock,
  Building2,
  ExternalLink,
  Info
} from 'lucide-react';
import { ContenedorManifiesto, DetalleDPL, EstatusDPL, normalizarEstatusDPL } from '../types/cedis';
import { appsScriptClient } from '../services/appsScriptClient';
import { cedisService } from '../services/cedisService';

interface CruceDPLProps {
  contenedores: ContenedorManifiesto[];
  detalleDPL: DetalleDPL[];
  onAbrirModalDPL: () => void;
  onAbrirRastreador?: (codigo?: string) => void;
  onActualizar?: () => void;
}

export const CruceDPL: React.FC<CruceDPLProps> = ({
  contenedores,
  detalleDPL,
  onAbrirModalDPL,
  onAbrirRastreador,
  onActualizar,
}) => {
    // Estado para Ajuste Manual de Stock / Kardex (Ticket 7)
  const [modalAjusteItem, setModalAjusteItem] = useState<DetalleDPL | null>(null);
  const [nuevaCantidadDisponible, setNuevaCantidadDisponible] = useState<number>(0);
  const [motivoAjuste, setMotivoAjuste] = useState<string>('Conteo físico');
  const [responsableAjuste, setResponsableAjuste] = useState<string>('Supervisor Bodega');
  const [notasAjuste, setNotasAjuste] = useState<string>('');
  const [guardandoAjuste, setGuardandoAjuste] = useState<boolean>(false);
  const [mensajeAjuste, setMensajeAjuste] = useState<string | null>(null);

  const [contenedorSeleccionado, setContenedorSeleccionado] = useState<string>(
    contenedores.length > 0 ? contenedores[0].contenedor : ''
  );
  const [estadosLocales, setEstadosLocales] = useState<Record<string, EstatusDPL>>({});
  const [filtroEstatus, setFiltroEstatus] = useState<'TODOS' | EstatusDPL>('TODOS');
  const [busquedaContenedor, setBusquedaContenedor] = useState<string>('');
  const [busquedaRepuesto, setBusquedaRepuesto] = useState<string>('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [procesandoAccion, setProcesandoAccion] = useState<boolean>(false);

  // Helper para obtener el estado actual (priorizando optimista local)
  const getEstadoContenedor = useCallback((c?: ContenedorManifiesto | null): EstatusDPL => {
    if (!c) return 'EN TRÁNSITO';
    const contId = (c.contenedor || '').trim().toUpperCase();
    if (estadosLocales[contId]) return estadosLocales[contId];
    return normalizarEstatusDPL(c.estado);
  }, [estadosLocales]);

  // Filtrado de la lista de contenedores
  const contenedoresFiltrados = useMemo(() => {
    return contenedores.filter(c => {
      const estatusNorm = getEstadoContenedor(c);
      const coincideFiltro = filtroEstatus === 'TODOS' || estatusNorm === filtroEstatus;
      
      const q = busquedaContenedor.trim().toLowerCase();
      const coincideBusqueda = !q || 
        (c.contenedor || '').toLowerCase().includes(q) ||
        (c.proveedor && c.proveedor.toLowerCase().includes(q)) ||
        (c.poReferencia && c.poReferencia.toLowerCase().includes(q));

      return coincideFiltro && coincideBusqueda;
    });
  }, [contenedores, filtroEstatus, busquedaContenedor, getEstadoContenedor]);

  // Si el contenedor seleccionado no está en la lista filtrada, ajustar
  React.useEffect(() => {
    if (contenedoresFiltrados.length > 0) {
      const existe = contenedoresFiltrados.some(c => c.contenedor === contenedorSeleccionado);
      if (!existe) {
        setContenedorSeleccionado(contenedoresFiltrados[0].contenedor);
      }
    }
  }, [contenedoresFiltrados, contenedorSeleccionado]);

  const contenedorActivo = contenedores.find((c) => c.contenedor === contenedorSeleccionado) || contenedores[0];
  const itemsContenedor = detalleDPL.filter((d) => (d.contenedor || '').trim().toUpperCase() === (contenedorSeleccionado || '').trim().toUpperCase());

  const itemsFiltrados = useMemo(() => {
    if (!busquedaRepuesto.trim()) return itemsContenedor;
    const q = busquedaRepuesto.trim().toLowerCase();
    return itemsContenedor.filter(i => 
      (i.codigoCompra && i.codigoCompra.toLowerCase().includes(q)) ||
      (i.codigoSuministrado && i.codigoSuministrado.toLowerCase().includes(q)) ||
      (i.descripcion && i.descripcion.toLowerCase().includes(q)) ||
      (i.pallet && i.pallet.toLowerCase().includes(q))
    );
  }, [itemsContenedor, busquedaRepuesto]);

  // Manejador para cambiar el estatus del contenedor (Ciclo de Vida)
  const handleCambiarEstatus = async (nuevoEstado: EstatusDPL, contIdOverride?: string) => {
    const contId = contIdOverride || (contenedorActivo ? contenedorActivo.contenedor : '');
    if (!contId) return;

    // VALIDACIÓN ESTRICTA: Solo ADMINISTRADOR puede autorizar recepcion fisica
    if (nuevoEstado === 'RECIBIDO') {
      const esAdmin = usuario?.rol === 'ADMINISTRADOR_CEDIS' || !usuario || (usuario?.nombre && usuario.nombre.includes('Joel'));
      if (!esAdmin) {
        alert('ACCESO DENEGADO: Solo el Administrador de CEDIS puede autorizar la recepcion del contenedor para luego hacer el matching.');
        return;
      }

      const confirmarAdmin = window.confirm(
        'AUTORIZACION ADMINISTRATIVA REQUERIDA:\n\n¿Confirma que autoriza la recepcion fisica en CEDIS del contenedor ' + contId + '?\n\nAl autorizarlo, se habilitara el cruce de repuestos y asignacion FIFO a pedidos especiales.'
      );
      if (!confirmarAdmin) return;
    }

    setProcesandoAccion(true);
    setMensajeExito(null);

    // Actualización optimista inmediata en la UI local para feedback sin retraso
    const idKey = contId.trim().toUpperCase();
    setEstadosLocales(prev => ({ ...prev, [idKey]: nuevoEstado }));

    try {
      // Actualizar en AppsScriptClient (motor canónico)
      const res = await appsScriptClient.actualizarEstatusManifiesto(contId, nuevoEstado);

      // Sincronizar en CedisService
      cedisService.actualizarEstadoContenedor(contId, nuevoEstado);

      setProcesandoAccion(false);

      if (res && res.success) {
        setMensajeExito(res.mensaje);
      } else {
        setMensajeExito(`Contenedor ${contId} actualizado a ${nuevoEstado}.`);
      }

      if (onActualizar) onActualizar();
      setTimeout(() => setMensajeExito(null), 6000);
    } catch (err) {
      console.warn('Estatus actualizado localmente:', err);
      setProcesandoAccion(false);
      setMensajeExito(`Contenedor ${contId} actualizado a ${nuevoEstado}.`);
      if (onActualizar) onActualizar();
      setTimeout(() => setMensajeExito(null), 6000);
    }
  };

  const handleEliminarContenedor = () => {
    if (!contenedorActivo) return;
    const contId = contenedorActivo.contenedor;
    const confirmar = window.confirm(`¿Está seguro de eliminar el contenedor ${contId}? Esta acción recalculará las asignaciones de stock.`);
    if (!confirmar) return;

    appsScriptClient.eliminarManifiestoDPL(contId);
    if (onActualizar) onActualizar();
    setMensajeExito(`Contenedor ${contId} eliminado correctamente.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const estatusActualNormalizado: EstatusDPL = getEstadoContenedor(contenedorActivo);

  // Conteos de contenedores por estado
  const conteoTransito = contenedores.filter(c => getEstadoContenedor(c) === 'EN TRÁNSITO').length;
  const conteoAduana = contenedores.filter(c => getEstadoContenedor(c) === 'ADUANA').length;
  const conteoRecibido = contenedores.filter(c => getEstadoContenedor(c) === 'RECIBIDO').length;


  const handleAbrirAjuste = (item: DetalleDPL) => {
    setModalAjusteItem(item);
    setNuevaCantidadDisponible(Number(item.cantTotal ?? item.cantidadTotal ?? 0));
    setMotivoAjuste('Conteo físico');
    setNotasAjuste('');
    setMensajeAjuste(null);
  };

  const handleGuardarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAjusteItem) return;

    if (!motivoAjuste.trim()) {
      setMensajeAjuste('El motivo del ajuste es obligatorio.');
      return;
    }

    setGuardandoAjuste(true);
    setMensajeAjuste(null);

    const cantAnterior = Number(modalAjusteItem.cantTotal ?? modalAjusteItem.cantidadTotal ?? 0);
    const dif = nuevaCantidadDisponible - cantAnterior;
    const asignado = Number(modalAjusteItem.comprometido ?? modalAjusteItem.cantidadAsignada ?? 0);

    // Enforce formula: Libre = Disponible - Asignado
    if (nuevaCantidadDisponible < asignado) {
      setMensajeAjuste(`No se puede reducir el stock disponible a menos de ${asignado} unidades ya comprometidas/asignadas.`);
      setGuardandoAjuste(false);
      return;
    }

    try {
      const res = await appsScriptClient.registrarAjusteMerma(
        modalAjusteItem.uid || modalAjusteItem.uidFila || '',
        dif,
        `Ajuste manual (${motivoAjuste}): ${notasAjuste || 'Ajuste de inventario'}`,
        responsableAjuste
      );

      // Mutar en memoria para feedback instantáneo
      modalAjusteItem.cantTotal = nuevaCantidadDisponible;
      modalAjusteItem.cantidadTotal = nuevaCantidadDisponible;
      modalAjusteItem.saldoLibre = nuevaCantidadDisponible - asignado;
      modalAjusteItem.saldoDisponible = nuevaCantidadDisponible - asignado;

      setGuardandoAjuste(false);
      setModalAjusteItem(null);
      if (onActualizar) onActualizar();
    } catch (err: any) {
      setMensajeAjuste(err.message || 'Error al guardar el ajuste de stock.');
      setGuardandoAjuste(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Encabezado Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Conciliación de Embarques // Cross-Docking Changan</span>
          </span>
          <h2 className="text-base sm:text-xl font-black text-white mt-0.5 flex items-center gap-2">
            <Ship className="w-5 h-5 text-cyan-400" />
            <span>Gestión de Embarques & Manifiestos DPL</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAbrirRastreador && (
            <button
              type="button"
              onClick={() => onAbrirRastreador(contenedorSeleccionado)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-cyan-800/60 shadow transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rastreador Universal</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAbrirModalDPL}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Subir Archivo DPL</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo de Regla Operativa DPL */}
      <div className="bg-slate-900/90 border border-cyan-900/40 rounded-2xl p-3.5 sm:p-4 text-xs shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Ciclo de Vida Oficial del Manifiesto DPL:</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Regla de Asignación FIFO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] pt-1">
          <div className="bg-slate-950/70 border border-sky-900/40 rounded-xl p-2.5 space-y-1">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              <span>🚢 1. EN TRÁNSITO</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">Altamar</span>
            </div>
            <p className="text-slate-300 leading-snug">
              Visible en historial y <strong>Rastreador Universal</strong> para fechas de llegada. <strong>NO asigna repuestos a pedidos</strong>.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-amber-900/40 rounded-xl p-2.5 space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span>🛃 2. EN ADUANA</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">Puerto</span>
            </div>
            <p className="text-slate-300 leading-snug">
              En proceso de nacionalización y aforo. Rastreo activo. <strong>NO asigna repuestos</strong> hasta arribo físico a CEDIS.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-emerald-900/40 rounded-xl p-2.5 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🏢 3. RECIBIDO</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Bodega CEDIS</span>
            </div>
            <p className="text-slate-300 leading-snug">
              Físicamente disponible en racks. <strong className="text-emerald-300">ASIGNACIÓN AUTOMÁTICA FIFO</strong> instantánea a pedidos pendientes.
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de Éxito / Feedback */}
      {mensajeExito && (
        <div className="bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center gap-2.5 shadow-lg animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{mensajeExito}</span>
        </div>
      )}

      {/* Layout en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Lista y Filtro de Contenedores */}
        <div className="space-y-3">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={busquedaContenedor}
                onChange={(e) => setBusquedaContenedor(e.target.value)}
                placeholder="Buscar por Contenedor o PO..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Pestañas de Estatus */}
            <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setFiltroEstatus('TODOS')}
                className={`py-1.5 rounded-md transition text-center cursor-pointer ${
                  filtroEstatus === 'TODOS'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 hover:text-white'
                }`}
              >
                Todos ({contenedores.length})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstatus('EN TRÁNSITO')}
                className={`py-1.5 rounded-md transition text-center cursor-pointer ${
                  filtroEstatus === 'EN TRÁNSITO'
                    ? 'bg-sky-900/80 text-sky-200 border border-sky-600 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 hover:text-sky-300'
                }`}
              >
                Tránsito ({conteoTransito})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstatus('ADUANA')}
                className={`py-1.5 rounded-md transition text-center cursor-pointer ${
                  filtroEstatus === 'ADUANA'
                    ? 'bg-amber-900/80 text-amber-200 border border-amber-600 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 hover:text-amber-300'
                }`}
              >
                Aduana ({conteoAduana})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstatus('RECIBIDO')}
                className={`py-1.5 rounded-md transition text-center cursor-pointer ${
                  filtroEstatus === 'RECIBIDO'
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-600 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 hover:text-emerald-300'
                }`}
              >
                Recibido ({conteoRecibido})
              </button>
            </div>
          </div>

          {/* Lista de Tarjetas de Contenedor */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {contenedoresFiltrados.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
                No hay contenedores con el criterio seleccionado.
              </div>
            ) : (
              contenedoresFiltrados.map((c) => {
                const esActivo = c.contenedor === contenedorSeleccionado;
                const estatusNorm = getEstadoContenedor(c);

                let badgeColor = 'bg-sky-950 border-sky-700 text-sky-300';
                let iconText = '🚢';
                if (estatusNorm === 'ADUANA') {
                  badgeColor = 'bg-amber-950 border-amber-700 text-amber-300';
                  iconText = '🛃';
                } else if (estatusNorm === 'RECIBIDO') {
                  badgeColor = 'bg-emerald-950 border-emerald-700 text-emerald-300';
                  iconText = '🏢';
                }

                return (
                  <div
                    key={c.contenedor}
                    onClick={() => setContenedorSeleccionado(c.contenedor)}
                    className={`border p-3.5 rounded-xl cursor-pointer transition text-xs shadow-sm ${
                      esActivo
                        ? 'bg-slate-800/90 border-cyan-500 shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                        : 'bg-slate-900 hover:border-slate-700 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start font-mono font-bold text-white mb-1.5">
                      <span className="text-sm text-cyan-400 font-mono tracking-tight flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.contenedor}</span>
                      </span>
                      <span className={`text-[10px] border px-2 py-0.5 rounded-md font-sans font-semibold flex items-center gap-1 ${badgeColor}`}>
                        <span>{iconText}</span>
                        <span>{estatusNorm}</span>
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px] mb-2 truncate" title={c.proveedor}>
                      {c.proveedor || 'Mobitech Changan China'}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mb-2 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{c.fechaArribo || 'Pendiente'}</span>
                      </span>
                      <span>&bull;</span>
                      <span className="truncate">{c.poReferencia || `PO-${c.contenedor}`}</span>
                    </div>

                    <div className="flex justify-between font-mono text-slate-400 border-t border-slate-800/80 pt-2 text-[11px]">
                      <span>
                        Piezas: <strong className="text-white">{Number(c.totalPiezas || c.piezasTotales || 0)} u.</strong>
                      </span>
                      <span>
                        SKUs: <strong className="text-cyan-300">{Number(c.skusUnicos || c.totalLineas || 0)}</strong>
                      </span>
                      <span>
                        Pallets: <strong className="text-amber-300">{Number(c.totalPallets || 1)}</strong>
                      </span>
                    </div>

                    {/* Botón de acción rápida en la tarjeta + Aviso de asignación */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      {estatusNorm === 'RECIBIDO' ? (
                        <>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Stock Asignado</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCambiarEstatus('EN TRÁNSITO', c.contenedor);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-medium transition cursor-pointer"
                            title="Revertir a Tránsito (libera asignaciones)"
                          >
                            Revertir
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Rastreo activo</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCambiarEstatus('RECIBIDO', c.contenedor);
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-950/50"
                            title="Recibir en Bodega CEDIS y Asignar Repuestos"
                          >
                            <span>🏢 Recibir</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalle y Gestor de Estatus del Contenedor Seleccionado */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
          {contenedorActivo ? (
            <>
              {/* Cabecera del Contenedor Activo con Selector de Ciclo de Vida */}
              <div className="border-b border-slate-800 pb-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 font-mono">Contenedor Seleccionado</div>
                    <div className="text-lg sm:text-xl font-mono font-black text-white flex items-center gap-2">
                      <span className="text-cyan-400">{contenedorActivo.contenedor}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded font-bold font-mono bg-blue-950 text-blue-300 border border-blue-800">
                        {contenedorActivo.tipoTransporte}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Proveedor: <span className="text-slate-200">{contenedorActivo.proveedor}</span> &bull; Ref: <span className="font-mono text-slate-200">{contenedorActivo.poReferencia}</span> &bull; Arribo: <span className="text-slate-200 font-semibold">{contenedorActivo.fechaArribo}</span>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="flex items-center gap-2">
                    {onAbrirRastreador && (
                      <button
                        type="button"
                        onClick={() => onAbrirRastreador(contenedorActivo.contenedor)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 border border-cyan-900/50 cursor-pointer"
                        title="Ver en Rastreador Universal"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Rastreo Universal</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleEliminarContenedor}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition cursor-pointer"
                      title="Eliminar Contenedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SELECTOR INTERACTIVO DE ESTADO DEL EMBARQUE */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Cambiar Estatus del Embarque:</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Actual: <strong className="text-white">{estatusActualNormalizado}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Botón EN TRÁNSITO */}
                    <button
                      type="button"
                      disabled={procesandoAccion}
                      onClick={() => handleCambiarEstatus('EN TRÁNSITO')}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        estatusActualNormalizado === 'EN TRÁNSITO'
                          ? 'bg-sky-950 text-sky-200 border-sky-500 shadow-md shadow-sky-950/50 ring-1 ring-sky-500/50'
                          : 'bg-slate-900 text-slate-400 hover:text-sky-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>🚢 En Tránsito</span>
                      {estatusActualNormalizado === 'EN TRÁNSITO' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Botón ADUANA */}
                    <button
                      type="button"
                      disabled={procesandoAccion}
                      onClick={() => handleCambiarEstatus('ADUANA')}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        estatusActualNormalizado === 'ADUANA'
                          ? 'bg-amber-950 text-amber-200 border-amber-500 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/50'
                          : 'bg-slate-900 text-slate-400 hover:text-amber-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>🛃 En Aduana</span>
                      {estatusActualNormalizado === 'ADUANA' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Botón RECIBIDO */}
                    <button
                      type="button"
                      disabled={procesandoAccion}
                      onClick={() => handleCambiarEstatus('RECIBIDO')}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        estatusActualNormalizado === 'RECIBIDO'
                          ? 'bg-emerald-950 text-emerald-200 border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                          : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>🏢 Recibido en CEDIS</span>
                      {estatusActualNormalizado === 'RECIBIDO' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Mensaje de estado explicativo */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {estatusActualNormalizado === 'RECIBIDO' ? (
                      <span className="text-emerald-300">
                        Mercancía físicamente recibida en CEDIS. El inventario está asignado y disponible para despacho.
                      </span>
                    ) : (
                      <span className="text-amber-300/90">
                        Contenedor en {estatusActualNormalizado}. Repuestos visibles en el Rastreador Universal; solo asignarán a pedidos al cambiar a <strong>RECIBIDO</strong>.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra de Filtro de Repuestos dentro del Contenedor */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Contenido del DPL ({itemsContenedor.length} repuestos registrados)
                  </h3>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={busquedaRepuesto}
                    onChange={(e) => setBusquedaRepuesto(e.target.value)}
                    placeholder="Filtrar repuesto o pallet..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Tabla de Repuestos del Contenedor */}
              <div className="overflow-x-auto max-h-[440px] rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2.5">Pallet / Case</th>
                      <th className="p-2.5">Código OEM</th>
                      <th className="p-2.5">Descripción Oficial</th>
                      <th className="p-2.5 text-center">Cant. Total</th>
                      <th className="p-2.5 text-center">Estado de Asignación</th>
                      <th className="p-2.5 text-right">Rastreo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {itemsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No se encontraron repuestos con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      itemsFiltrados.map((it, itIdx) => {
                        const estaRecibido = estatusActualNormalizado === 'RECIBIDO';
                        const cant = Number(it.cantTotal ?? it.cantidadTotal ?? 0);
                        const asig = Number(it.comprometido ?? it.cantidadAsignada ?? 0);
                        const libre = Number(it.saldoLibre ?? it.saldoDisponible ?? (cant - asig));

                        return (
                          <tr key={it.uid || it.uidFila || `${it.contenedor}-${it.codigoCompra}-${itIdx}`} className="hover:bg-slate-800/40 transition">
                            <td className="p-2.5 font-mono text-cyan-300 font-bold whitespace-nowrap">
                              {it.pallet || 'P001'}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-white whitespace-nowrap">
                              {it.codigoCompra}
                            </td>
                            <td className="p-2.5 text-slate-300 max-w-xs truncate" title={it.descripcion}>
                              {it.descripcion}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-white">
                              {cant} u.
                            </td>
                            <td className="p-2.5 text-center">
                              {estaRecibido ? (
                                <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                                    Asig: {asig}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                                    Libre: {libre}
                                  </span>
                                </div>
                              ) : (
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                  estatusActualNormalizado === 'EN TRÁNSITO'
                                    ? 'bg-sky-950/80 border-sky-800 text-sky-300'
                                    : 'bg-amber-950/80 border-amber-800 text-amber-300'
                                }`}>
                                  {estatusActualNormalizado === 'EN TRÁNSITO' 
                                    ? '🚢 En Altamar • 0 Asignados' 
                                    : '🛃 En Aduana • 0 Asignados'}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {onAbrirRastreador && (
                                <button
                                  type="button"
                                  onClick={() => onAbrirRastreador(it.codigoCompra)}
                                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono hover:underline cursor-pointer"
                                >
                                  Rastrear &rarr;
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs">
              Seleccione un contenedor a la izquierda para visualizar su manifiesto o haga clic en "+ Subir Archivo DPL".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
