import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Search, 
  CheckCircle, 
  Clock, 
  Truck, 
  AlertCircle, 
  Download,
  Filter,
  SlidersHorizontal,
  Calendar,
  X,
  Building2,
  User,
  Boxes,
  Eye,
  Check,
  Package,
  Layers,
  ShieldCheck,
  UploadCloud,
  Zap,
  FileSpreadsheet,
  Box,
  RefreshCw,
  Sparkles,
  Edit3,
  Trash2,
  Mail,
  Send,
  FileText,
  CheckSquare,
  Square,
  ChevronDown,
  QrCode,
  Printer
} from 'lucide-react';
import { FilaMatrizCentral, UsuarioActivo } from '../types/cedis';
import { appsScriptClient } from '../services/appsScriptClient';
import { ModalCargaMasivaMatriz } from './ModalCargaMasivaMatriz';
import { ModalCentroPlantillas } from './ModalCentroPlantillas';
import { ModalEditarPedido } from './ModalEditarPedido';
import { ModalExpedientePedido } from './ModalExpedientePedido';
import { ModalNotificacionPedido } from './ModalNotificacionPedido';
import { ModalEditarMasivo } from './ModalEditarMasivo';
import { ModalDepurarDuplicados } from './ModalDepurarDuplicados';
import { ModalDespachoMasivo } from './ModalDespachoMasivo';
import { ModalEliminarMasivo } from './ModalEliminarMasivo';
import { ModalComprobantePDF, ComprobantePedidoData } from './ModalComprobantePDF';
import { ModalEtiquetaQR } from './ModalEtiquetaQR';
import { ModalReporteAsignaciones } from './ModalReporteAsignaciones';
import { generarDatosEtiqueta, EtiquetaRepuestoData } from '../services/etiquetasQRService';
import { CORREO_REMITENTE_OFICIAL, normalizarEstatusLogistico, normalizarValorSelectEstatus } from '../utils/notificacionesPedido';

interface MatrizCentralProps {
  filas: FilaMatrizCentral[];
  usuario: UsuarioActivo;
  onActualizar: () => void;
}

export const MatrizCentral: React.FC<MatrizCentralProps> = ({
  filas,
  usuario,
  onActualizar
}) => {
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [despachadosList, setDespachadosList] = useState<FilaMatrizCentral[]>(() => appsScriptClient.getFilasDespachadas());

  // Actualizar lista de despachados cuando cambian las filas
  React.useEffect(() => {
    setDespachadosList(appsScriptClient.getFilasDespachadas());
  }, [filas]);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTE' | 'ASIGNADO' | 'DESPACHADO'>('TODOS');
  const [filtroEstatusGeneral, setFiltroEstatusGeneral] = useState<string>('TODOS');
  // Filtros Avanzados de Datos Masivos (Sucursales, Pallets, Contenedores, Asesores, Fechas, Modelos)
  const [filtroSucursal, setFiltroSucursal] = useState<string>('TODAS');
  const [filtroContenedor, setFiltroContenedor] = useState<string>('TODOS');
  const [filtroPallet, setFiltroPallet] = useState<string>('TODOS');
  const [filtroAsesor, setFiltroAsesor] = useState<string>('TODOS');
  const [filtroModelo, setFiltroModelo] = useState<string>('TODOS');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');
  const [panelFiltrosAbierto, setPanelFiltrosAbierto] = useState<boolean>(true);

  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<string[]>([]);
  // Selección granular por línea individual (Ticket Despacho Individual)
  const [lineasSeleccionadas, setLineasSeleccionadas] = useState<Set<string>>(new Set());
  const [modalDespacho, setModalDespacho] = useState<FilaMatrizCentral | null>(null);
  const [modalCargaMasiva, setModalCargaMasiva] = useState<boolean>(false);
  const [modalDepurar, setModalDepurar] = useState<boolean>(false);
  const [modalPlantillas, setModalPlantillas] = useState<boolean>(false);
  const [modalEditarPedidoId, setModalEditarPedidoId] = useState<string | null>(null);
  const [modalExpedientePedidoId, setModalExpedientePedidoId] = useState<string | null>(null);
  const [modalNotificacion, setModalNotificacion] = useState<{
    open: boolean;
    datos: any | null;
    estatus: string;
  }>({
    open: false,
    datos: null,
    estatus: 'ESPERANDO ENVÍO'
  });
  const [modalEditarMasivo, setModalEditarMasivo] = useState<boolean>(false);
  const [modalDespachoMasivo, setModalDespachoMasivo] = useState<boolean>(false);
  const [modalEliminarMasivo, setModalEliminarMasivo] = useState<boolean>(false);
  const [modalEtiquetasData, setModalEtiquetasData] = useState<EtiquetaRepuestoData[] | null>(null);
  const [modalReporteAsignacionesOpen, setModalReporteAsignacionesOpen] = useState<boolean>(false);
  const [modalComprobante, setModalComprobante] = useState<{
    open: boolean;
    datos: ComprobantePedidoData | null;
  }>({ open: false, datos: null });

  const [cantDespacho, setCantDespacho] = useState<number>(1);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [ejecutandoMatching, setEjecutandoMatching] = useState<boolean>(false);
  const [sincronizandoSheets, setSincronizandoSheets] = useState<boolean>(false);
  const [cargandoNube, setCargandoNube] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const esRolOperativo = usuario.rol === 'ADMINISTRADOR_CEDIS' || usuario.rol === 'OPERADOR_CEDIS';

  // Métricas rápidas de matching en la Matriz
  
  // Listas únicas dinámicas para filtros inteligentes en tiempo real
  const listaSucursales = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => { if (f.sucursal && f.sucursal.trim()) s.add(f.sucursal.trim()); });
    return Array.from(s).sort();
  }, [filas]);

  const listaContenedores = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => { if (f.contenedorAsignado && f.contenedorAsignado.trim()) s.add(f.contenedorAsignado.trim()); });
    return Array.from(s).sort();
  }, [filas]);

  const listaPallets = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => { if (f.palletAsignado && f.palletAsignado.trim()) s.add(f.palletAsignado.trim()); });
    return Array.from(s).sort();
  }, [filas]);

  const listaAsesores = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => { if (f.colaborador && f.colaborador.trim()) s.add(f.colaborador.trim()); });
    return Array.from(s).sort();
  }, [filas]);

  const listaModelos = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => { if (f.modeloChangan && f.modeloChangan.trim()) s.add(f.modeloChangan.trim()); });
    return Array.from(s).sort();
  }, [filas]);

  const totalFiltrosActivos = useMemo(() => {
    let c = 0;
    if (filtroTexto.trim()) c++;
    if (filtroEstado !== 'TODOS') c++;
    if (filtroEstatusGeneral !== 'TODOS') c++;
    if (filtroSucursal !== 'TODAS') c++;
    if (filtroContenedor !== 'TODOS') c++;
    if (filtroPallet !== 'TODOS') c++;
    if (filtroAsesor !== 'TODOS') c++;
    if (filtroModelo !== 'TODOS') c++;
    if (filtroFechaDesde) c++;
    if (filtroFechaHasta) c++;
    return c;
  }, [filtroTexto, filtroEstado, filtroEstatusGeneral, filtroSucursal, filtroContenedor, filtroPallet, filtroAsesor, filtroModelo, filtroFechaDesde, filtroFechaHasta]);

  const limpiarTodosLosFiltros = () => {
    setFiltroTexto('');
    setFiltroEstado('TODOS');
    setFiltroEstatusGeneral('TODOS');
    setFiltroSucursal('TODAS');
    setFiltroContenedor('TODOS');
    setFiltroPallet('TODOS');
    setFiltroAsesor('TODOS');
    setFiltroModelo('TODOS');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };

  const metricas = useMemo(() => {
    let piezasSolicitadas = 0;
    let piezasAsignadas = 0;
    let piezasDespachadas = 0;
    const palletsSet = new Set<string>();
    const contenedoresSet = new Set<string>();
    let lineasAsignadas = 0;
    let lineasPendientes = 0;

    filas.forEach(f => {
      piezasSolicitadas += (Number(f.cantidadSolicitada) || 0);
      piezasAsignadas += (Number(f.cantidadAsignada) || 0);
      piezasDespachadas += (Number(f.cantidadDespachada) || 0);

      if (f.palletAsignado) palletsSet.add(f.palletAsignado);
      if (f.contenedorAsignado) contenedoresSet.add(f.contenedorAsignado);

      if (f.estatusLinea === 'Asignado') lineasAsignadas++;
      else if (f.estatusLinea === 'Pendiente' || f.estatusLinea === 'Sin Stock') lineasPendientes++;
    });

    return {
      piezasSolicitadas,
      piezasAsignadas,
      piezasDespachadas,
      totalPallets: palletsSet.size,
      totalContenedores: contenedoresSet.size,
      lineasAsignadas,
      lineasPendientes
    };
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    // Si la pestaña seleccionada es DESPACHADO, tomar los registros archivados de despachos
    const fuenteFilas = filtroEstado === 'DESPACHADO' ? despachadosList : filas;

    return fuenteFilas.filter((f) => {
      // 1. Filtro de estado de línea (Todos, Asignado, Pendiente, Despachado)
      if (filtroEstado === 'PENDIENTE' && f.estatusLinea !== 'Pendiente' && f.estatusLinea !== 'Sin Stock') {
        return false;
      }
      if (filtroEstado === 'ASIGNADO' && f.estatusLinea !== 'Asignado') {
        return false;
      }
      if (filtroEstado === 'DESPACHADO') {
        // En pestaña de despachados, ya vienen de la fuente de despachos
        return true;
      }

      // 2. Filtro de Estatus General del Pedido
      if (filtroEstatusGeneral !== 'TODOS') {
        const estGeneral = (f.estatusGeneral || '').toUpperCase();
        if (!estGeneral.includes(filtroEstatusGeneral.toUpperCase())) {
          return false;
        }
      }

      // 3. Filtro por Sucursal
      if (filtroSucursal !== 'TODAS') {
        if ((f.sucursal || '').trim().toLowerCase() !== filtroSucursal.toLowerCase()) {
          return false;
        }
      }

      // 4. Filtro por Contenedor
      if (filtroContenedor !== 'TODOS') {
        const cAsig = (f.contenedorAsignado || '').trim().toUpperCase();
        if (filtroContenedor === 'CON_CONTENEDOR' && !cAsig) return false;
        if (filtroContenedor === 'SIN_CONTENEDOR' && cAsig) return false;
        if (filtroContenedor !== 'CON_CONTENEDOR' && filtroContenedor !== 'SIN_CONTENEDOR' && cAsig !== filtroContenedor.toUpperCase()) {
          return false;
        }
      }

      // 5. Filtro por Pallet
      if (filtroPallet !== 'TODOS') {
        const pAsig = (f.palletAsignado || '').trim().toUpperCase();
        if (filtroPallet === 'CON_PALLET' && !pAsig) return false;
        if (filtroPallet === 'SIN_PALLET' && pAsig) return false;
        if (filtroPallet !== 'CON_PALLET' && filtroPallet !== 'SIN_PALLET' && pAsig !== filtroPallet.toUpperCase()) {
          return false;
        }
      }

      // 6. Filtro por Asesor / Colaborador
      if (filtroAsesor !== 'TODOS') {
        if ((f.colaborador || '').trim().toLowerCase() !== filtroAsesor.toLowerCase()) {
          return false;
        }
      }

      // 7. Filtro por Modelo Changan
      if (filtroModelo !== 'TODOS') {
        if ((f.modeloChangan || '').trim().toLowerCase() !== filtroModelo.toLowerCase()) {
          return false;
        }
      }

      // 8. Filtro por Rango de Fechas
      if (filtroFechaDesde || filtroFechaHasta) {
        const fCreacion = (f.fechaCreacion || '').trim();
        let fechaIso = '';
        if (fCreacion.includes('-')) {
          fechaIso = fCreacion.substring(0, 10);
        } else if (fCreacion.includes('/')) {
          const parts = fCreacion.split('/');
          if (parts.length === 3) {
            fechaIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        if (fechaIso) {
          if (filtroFechaDesde && fechaIso < filtroFechaDesde) return false;
          if (filtroFechaHasta && fechaIso > filtroFechaHasta) return false;
        }
      }

      // 9. Filtro de texto multi-criterio libre
      if (!filtroTexto.trim()) return true;
      const q = filtroTexto.toLowerCase();
      return (
        f.pedidoId.toLowerCase().includes(q) ||
        f.codigoRepuesto.toLowerCase().includes(q) ||
        f.descripcionOficial.toLowerCase().includes(q) ||
        f.cliente.toLowerCase().includes(q) ||
        f.vin.toLowerCase().includes(q) ||
        f.sucursal.toLowerCase().includes(q) ||
        f.colaborador.toLowerCase().includes(q) ||
        f.modeloChangan.toLowerCase().includes(q) ||
        f.cotizacion.toLowerCase().includes(q) ||
        f.contenedorAsignado.toLowerCase().includes(q) ||
        f.palletAsignado.toLowerCase().includes(q) ||
        (f.estatusGeneral && f.estatusGeneral.toLowerCase().includes(q))
      );
    });
  }, [
    filas, 
    filtroTexto, 
    filtroEstado, 
    filtroEstatusGeneral, 
    filtroSucursal, 
    filtroContenedor, 
    filtroPallet, 
    filtroAsesor, 
    filtroModelo, 
    filtroFechaDesde, 
    filtroFechaHasta
  ]);

  const getFilaLineKey = (f: FilaMatrizCentral) => `${f.pedidoId}___${f.lineaId || f.codigoRepuesto}`;

  // IDs de pedidos únicos visibles en la vista filtrada
  const pedidosEnVista = useMemo(() => {
    return Array.from(new Set(filasFiltradas.map(f => f.pedidoId)));
  }, [filasFiltradas]);

  // Keys de líneas visibles en la vista filtrada
  const lineasEnVistaKeys = useMemo(() => {
    return filasFiltradas.map(f => getFilaLineKey(f));
  }, [filasFiltradas]);

  // Si hay líneas seleccionadas individualmente, verificar si todas las visibles están marcadas
  // Si no hay líneas seleccionadas individualmente, verificar pedidosEnVista
  const todosSeleccionados = useMemo(() => {
    if (filasFiltradas.length === 0) return false;
    if (lineasSeleccionadas.size > 0) {
      return lineasEnVistaKeys.every(k => lineasSeleccionadas.has(k));
    }
    return pedidosEnVista.length > 0 && pedidosEnVista.every(id => pedidosSeleccionados.includes(id));
  }, [filasFiltradas, lineasSeleccionadas, lineasEnVistaKeys, pedidosEnVista, pedidosSeleccionados]);

  // Cálculo inteligente de pedidos/repuestos seleccionados agrupados por sucursal
  const infoSeleccionMultiSucursal = useMemo(() => {
    const sucsMap: Record<string, number> = {};
    let totalPiezas = 0;
    
    // Si hay repuestos seleccionados puntualmente, calcular solo con ellos
    if (lineasSeleccionadas.size > 0) {
      filas.forEach(f => {
        if (lineasSeleccionadas.has(getFilaLineKey(f))) {
          const s = f.sucursal || 'Sin Sucursal';
          sucsMap[s] = (sucsMap[s] || 0) + 1;
          const cantAsig = Number(f.cantidadAsignada) || 0;
          totalPiezas += (cantAsig > 0 ? cantAsig : (Number(f.cantidadSolicitada) || 1));
        }
      });
    } else {
      filas.forEach(f => {
        if (pedidosSeleccionados.includes(f.pedidoId)) {
          const s = f.sucursal || 'Sin Sucursal';
          sucsMap[s] = (sucsMap[s] || 0) + 1;
          totalPiezas += (Number(f.cantidadSolicitada) || 1);
        }
      });
    }

    const nombresSucs = Object.keys(sucsMap);
    return {
      nombresSucs,
      totalPiezas,
      sucsMap
    };
  }, [filas, pedidosSeleccionados, lineasSeleccionadas]);

  // Selección acumulativa inteligente: alterna selección de los repuestos visibles en el filtro actual
  const handleToggleSeleccionarTodos = () => {
    if (todosSeleccionados) {
      // Deseleccionar únicamente los repuestos/pedidos de la vista o filtro actual
      setLineasSeleccionadas(prev => {
        const next = new Set(prev);
        lineasEnVistaKeys.forEach(k => next.delete(k));
        return next;
      });
      setPedidosSeleccionados(prev => prev.filter(id => !pedidosEnVista.includes(id)));
    } else {
      // Seleccionar todos los repuestos y pedidos visibles en la vista/filtro actual
      setLineasSeleccionadas(prev => {
        const next = new Set(prev);
        lineasEnVistaKeys.forEach(k => next.add(k));
        return next;
      });
      setPedidosSeleccionados(prev => Array.from(new Set([...prev, ...pedidosEnVista])));
    }
  };

  const handleToggleSeleccionFila = (f: FilaMatrizCentral) => {
    const key = getFilaLineKey(f);
    let estaraSeleccionada = false;
    let nextLineas = new Set<string>();

    setLineasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        estaraSeleccionada = false;
      } else {
        next.add(key);
        estaraSeleccionada = true;
      }
      nextLineas = next;
      return next;
    });

    // Sincronizar pedidosSeleccionados con exactitud
    setPedidosSeleccionados(prev => {
      if (estaraSeleccionada) {
        return prev.includes(f.pedidoId) ? prev : [...prev, f.pedidoId];
      } else {
        const quedanOtras = filas.some(row => row.pedidoId === f.pedidoId && getFilaLineKey(row) !== key && nextLineas.has(getFilaLineKey(row)));
        return quedanOtras ? prev : prev.filter(id => id !== f.pedidoId);
      }
    });
  };

  const handleToggleSeleccionPedido = (pedidoId: string) => {
    setPedidosSeleccionados(prev => {
      if (prev.includes(pedidoId)) {
        return prev.filter(id => id !== pedidoId);
      } else {
        return [...prev, pedidoId];
      }
    });
  };

  const handleAbrirNotificacionParaPedido = (pedidoId: string, nuevoEstatus?: string) => {
    const filasPedido = filas.filter(f => f.pedidoId === pedidoId);
    if (filasPedido.length === 0) return;
    const f0 = filasPedido[0];
    const estatusFinal = nuevoEstatus || f0.estatusGeneral || 'ESPERANDO ENVÍO';

    const cabeceras = appsScriptClient.getCabeceras();
    const cab = cabeceras.find(c => c.pedidoId === pedidoId);

    setModalNotificacion({
      open: true,
      estatus: estatusFinal,
      datos: {
        pedidoId,
        fechaCreacion: cab?.fechaCreacion || f0.fechaCreacion,
        sucursal: cab?.sucursal || f0.sucursal,
        colaborador: cab?.colaborador || f0.colaborador,
        cliente: cab?.cliente || f0.cliente,
        placa: cab?.placa || f0.placa,
        modeloChangan: cab?.modeloChangan || f0.modeloChangan,
        cotizacion: cab?.cotizacion || f0.cotizacion,
        canal: cab?.canal || (f0 as any).canal || 'Taller',
        tipoPedido: cab?.tipoPedido || f0.tipoPedido,
        estadoPago: cab?.estadoPago || 'GARANTIA',
        estatusActual: estatusFinal,
        items: filasPedido.map(fp => ({
          codigoRepuesto: fp.codigoRepuesto,
          descripcionOficial: fp.descripcionOficial,
          cantidadSolicitada: fp.cantidadSolicitada,
          cantidadAsignada: fp.cantidadAsignada,
          cantidadDespachada: fp.cantidadDespachada,
          palletAsignado: fp.palletAsignado,
          contenedorAsignado: fp.contenedorAsignado,
          ubicacionCedis: fp.ubicacionCedis,
          estatusLinea: fp.estatusLinea
        }))
      }
    });
  };

  const handleAbrirComprobante = (pedidoId: string) => {
    const filasPedido = filas.filter(f => f.pedidoId === pedidoId);
    if (filasPedido.length === 0) return;
    const f0 = filasPedido[0];
    const cabeceras = appsScriptClient.getCabeceras();
    const cab = cabeceras.find(c => c.pedidoId === pedidoId);

    setModalComprobante({
      open: true,
      datos: {
        pedidoId: f0.pedidoId,
        cliente: cab?.cliente || f0.cliente,
        sucursal: cab?.sucursal || f0.sucursal,
        asesor: cab?.colaborador || f0.colaborador,
        cotizacion: cab?.cotizacion || f0.cotizacion,
        fechaEmision: cab?.fechaCreacion || f0.fechaCreacion,
        modeloAuto: cab?.modeloChangan || f0.modeloChangan,
        placa: cab?.placa || f0.placa,
        canal: cab?.canal || (f0 as any).canal || 'Taller',
        tipoPedido: cab?.tipoPedido || f0.tipoPedido,
        estadoPago: cab?.estadoPago || 'GARANTIA',
        facturaFiscal: cab?.documentoPagoFactura,
        vin: f0.vin,
        idTransmision: `TX-${Date.now().toString(36).toUpperCase()}`,
        fechaGenerado: new Date().toISOString(),
        piezas: filasPedido.map(fp => ({
          codigo: fp.codigoRepuesto,
          descripcion: fp.descripcionOficial,
          cantidad: fp.cantidadSolicitada
        }))
      }
    });
  };

  
  const handleEliminarPedidoIndividual = async (pedidoId: string, cliente?: string) => {
    const confirmMsg = cliente 
      ? `¿Está seguro de eliminar permanentemente el pedido ${pedidoId} del cliente "${cliente}" de todas las bases de datos? El cliente no volverá a aparecer.`
      : `¿Está seguro de eliminar permanentemente el pedido ${pedidoId} de todas las bases de datos?`;
    
    if (!window.confirm(confirmMsg)) return;

    const res = await appsScriptClient.eliminarPedido(pedidoId);
    if (res.success) {
      onActualizar();
      setMensaje({ tipo: 'ok', texto: `🗑️ Pedido ${pedidoId} (${cliente || ''}) eliminado permanentemente de todas las bases.` });
    } else {
      setMensaje({ tipo: 'error', texto: res.error || 'Error al eliminar pedido.' });
    }
  };

  const handleCambiarEstatusRapidoTabla = async (fila: FilaMatrizCentral, nuevoEstatus: string) => {
    // Si hay repuestos seleccionados con checkbox, preguntar si desea aplicar solo a los seleccionados
    const keyActual = getFilaLineKey(fila);
    const estaSeleccionada = lineasSeleccionadas.has(keyActual);

    // Si tiene líneas seleccionadas y esta fila está seleccionada y hay más de 1 seleccionada:
    if (lineasSeleccionadas.size > 1 && estaSeleccionada) {
      const confirmarMasivo = window.confirm(
        `Tiene ${lineasSeleccionadas.size} repuestos seleccionados.\n\n¿Desea cambiar el estatus a "${nuevoEstatus}" ÚNICAMENTE para los ${lineasSeleccionadas.size} repuestos seleccionados?\n\nPresione Aceptar para cambio masivo en los seleccionados, o Cancelar para cambiar SOLO este repuesto (${fila.codigoRepuesto}).`
      );

      if (confirmarMasivo) {
        setProcesando(true);
        let countOk = 0;
        for (const key of Array.from(lineasSeleccionadas)) {
          const filaTarget = filas.find(f => getFilaLineKey(f) === key);
          if (filaTarget) {
            const r = await appsScriptClient.cambiarEstatusLinea(
              filaTarget.lineaId,
              nuevoEstatus,
              `Cambio masivo de estatus en repuesto seleccionado a ${nuevoEstatus}`
            );
            if (r.success) countOk++;
          }
        }
        setProcesando(false);
        onActualizar();
        setMensaje({ tipo: 'ok', texto: `Se actualizaron ${countOk} repuestos seleccionados a ${nuevoEstatus}.` });
        return;
      }
    }

    // VALIDACIÓN ESTRICTA: Solo se pueden despachar repuestos que tengan piezas asignadas
    if (nuevoEstatus === 'DESPACHADO' && (Number(fila.cantidadAsignada) || 0) <= 0) {
      alert(`ACCESO DENEGADO: El repuesto ${fila.codigoRepuesto} de ${fila.cliente} no tiene piezas asignadas (0 asig.).\n\nSolo se pueden despachar repuestos que tengan asignados del cliente. Los repuestos pendientes de este cliente quedan esperando.`);
      return;
    }

    // Cambio ESTRICTAMENTE INDIVIDUAL para este único repuesto (no afecta al resto del cliente)
    const res = await appsScriptClient.cambiarEstatusLinea(
      fila.lineaId,
      nuevoEstatus,
      `Cambio de estatus individual de repuesto ${fila.codigoRepuesto} (${fila.cliente}) a: ${nuevoEstatus}`
    );

    if (res.success) {
      onActualizar();
      setMensaje({ tipo: 'ok', texto: `⚡ Repuesto ${fila.codigoRepuesto} (${fila.cliente}): Estatus individual actualizado a ${nuevoEstatus}.` });
    } else {
      setMensaje({ tipo: 'error', texto: res.error || 'Error al cambiar estatus del repuesto.' });
    }
  };

  const handleEjecutarDespacho = async () => {
    if (!modalDespacho) return;
    setProcesando(true);
    setMensaje(null);

    if ((Number(modalDespacho.cantidadAsignada) || 0) <= 0) {
      setMensaje({ tipo: 'error', texto: 'Solo se pueden despachar los repuestos que tengan asignados del cliente.' });
      setProcesando(false);
      return;
    }
    const res = await appsScriptClient.despacharLinea(modalDespacho.lineaId, cantDespacho);
    setProcesando(false);

    if (res.success) {
      setMensaje({ tipo: 'ok', texto: res.message || 'Despacho completado con éxito.' });
      setModalDespacho(null);
      onActualizar();
    } else {
      setMensaje({ tipo: 'error', texto: res.error || 'Error al despachar el repuesto.' });
    }
  };

  const handleEjecutarMatchingGlobal = async () => {
    setEjecutandoMatching(true);
    setMensaje(null);

    try {
      const res = appsScriptClient.ejecutarMatchingGlobal();
      onActualizar();
      setMensaje({
        tipo: 'ok',
        texto: res.mensaje || `Matching FIFO completado: ${res.piezasAsignadas} piezas asignadas a pedidos pendientes en ${res.palletsInvolucrados.length} pallets.`
      });
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: 'Error al ejecutar el matching: ' + e.message });
    } finally {
      setEjecutandoMatching(false);
    }
  };

  const handleSincronizarSheets = async () => {
    setSincronizandoSheets(true);
    setMensaje(null);

    try {
      const res = await appsScriptClient.sincronizarMatrizConGoogleSheets();
      setMensaje({
        tipo: res.ok ? 'ok' : 'error',
        texto: res.mensaje
      });
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: 'Error al sincronizar con Google Sheets: ' + e.message });
    } finally {
      setSincronizandoSheets(false);
    }
  };

  const handleRecargarDesdeSheets = async () => {
    setCargandoNube(true);
    setMensaje(null);

    try {
      const res = await appsScriptClient.fetchInitialData(true);
      onActualizar();
      if (res.success && res.totalCargado) {
        setMensaje({
          tipo: 'ok',
          texto: `Datos vivos sincronizados desde Google Sheets: ${res.totalCargado.cabeceras} pedidos y ${res.totalCargado.dplDetalle} lotes de inventario DPL.`
        });
      } else if (res.error) {
        setMensaje({
          tipo: 'ok',
          texto: 'ℹ️ ' + res.error + ' (Operación 100% activa en almacenamiento local seguro).'
        });
      }
    } catch (e: any) {
      setMensaje({
        tipo: 'ok',
        texto: 'ℹ️ Google Sheets no respondió en vivo. La operación continúa con total normalidad en almacenamiento local seguro.'
      });
    } finally {
      setCargandoNube(false);
    }
  };

  const handleImprimirEtiquetasLote = (filasTarget?: FilaMatrizCentral[]) => {
    let sourceFilas: FilaMatrizCentral[] = [];

    if (filasTarget && filasTarget.length > 0) {
      sourceFilas = filasTarget;
    } else if (lineasSeleccionadas.size > 0) {
      // 1. PRIORIDAD ABSOLUTA: Usar ÚNICAMENTE los repuestos seleccionados con checkbox
      sourceFilas = filas.filter(f => lineasSeleccionadas.has(getFilaLineKey(f)));
    } else if (pedidosSeleccionados.length > 0) {
      // 2. Si se seleccionaron pedidos, respetar la vista filtrada (filtro de contenedor, pallet, etc.)
      sourceFilas = filasFiltradas.filter(f => pedidosSeleccionados.includes(f.pedidoId));
    } else {
      // 3. Si no hay selección manual, tomar ÚNICAMENTE los repuestos que tengan asignación (cantidadAsignada > 0 o contenedor asignado)
      // DENTRO de la vista actual filtrada (respeta filtro de contenedor, pallet, etc., NUNCA todo el sistema)
      sourceFilas = filasFiltradas.filter(f => (Number(f.cantidadAsignada) || 0) > 0 || !!f.contenedorAsignado || !!f.palletAsignado);
    }

    const items: EtiquetaRepuestoData[] = [];
    sourceFilas.forEach(f => {
      // Para repuestos asignados, la cantidad a etiquetar es la cantidad asignada si existe, o solicitada si aún no tiene asignación
      const cantAsig = Number(f.cantidadAsignada) || 0;
      const cantTotal = Number(f.cantidadSolicitada) || 1;
      const cant = cantAsig > 0 ? cantAsig : cantTotal;

      for (let u = 1; u <= Math.min(cant, 10); u++) {
        items.push(generarDatosEtiqueta(
          f.pedidoId,
          f.codigoRepuesto,
          f.descripcionOficial,
          f.sucursal,
          u,
          cant,
          f.contenedorAsignado,
          f.palletAsignado,
          f.ubicacionCedis,
          f.cliente,
          f.modeloChangan,
          f.placa,
          f.vin,
          f.cotizacion
        ));
      }
    });

    if (items.length > 0) {
      setModalEtiquetasData(items);
    } else {
      setMensaje({
        tipo: 'error',
        texto: 'No se encontraron repuestos válidos o asignados para generar etiquetas QR en la selección actual.'
      });
    }
  };

  const exportarCSV = () => {
    const headers = [
      'Pedido', 'Línea', 'Fecha', 'Sucursal', 'Asesor', 'Tipo Pedido', 'Cotización',
      'Cliente', 'Modelo', 'VIN', 'Código OEM', 'Descripción', 'Cant Solicitada',
      'Cant Asignada', 'Cant Despachada', 'Saldo Pendiente', 'Contenedor', 'Pallet',
      'Ubicación', 'Estatus Línea', 'Estatus Pedido'
    ];

    const rows = filasFiltradas.map(f => [
      f.pedidoId,
      f.lineaId,
      `"${f.fechaCreacion}"`,
      `"${f.sucursal}"`,
      `"${f.colaborador}"`,
      `"${f.tipoPedido}"`,
      `"${f.cotizacion}"`,
      `"${f.cliente.replace(/"/g, '""')}"`,
      `"${f.modeloChangan}"`,
      `"${f.vin}"`,
      `"${f.codigoRepuesto}"`,
      `"${f.descripcionOficial.replace(/"/g, '""')}"`,
      f.cantidadSolicitada,
      f.cantidadAsignada,
      f.cantidadDespachada,
      f.saldoPendiente,
      f.contenedorAsignado,
      f.palletAsignado,
      `"${f.ubicacionCedis}"`,
      f.estatusLinea,
      f.estatusGeneral
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Matriz_Central_CEDIS_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Tarjetas Resumen de Matching y Estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-sky-500 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Total en Matriz</span>
            <Table className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-white font-mono">{filas.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{metricas.piezasSolicitadas} unidades solicitadas</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 border-t-2 border-t-emerald-500 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 uppercase font-semibold">Asignadas en Pallets</span>
            <Box className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-300 font-mono">
            {metricas.piezasAsignadas} u.
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5 font-medium">
            En {metricas.totalPallets} pallets ({metricas.totalContenedores} contenedores)
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-900/40 border-t-2 border-t-amber-500 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 uppercase font-semibold">Pendientes de Stock</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-amber-300 font-mono">
            {metricas.piezasSolicitadas - metricas.piezasAsignadas - metricas.piezasDespachadas} u.
          </div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">
            {metricas.lineasPendientes} líneas requieren arribo / fábrica
          </div>
        </div>

        <div className="bg-slate-900 border border-purple-900/40 border-t-2 border-t-purple-500 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-purple-400 uppercase font-semibold">Despachadas</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-purple-300 font-mono">
            {metricas.piezasDespachadas} u.
          </div>
          <div className="text-[11px] text-purple-400/80 mt-0.5">Entregadas a sucursales</div>
        </div>
      </div>

      {/* Cabecera y Barra de Acciones */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Matriz_Central
            </span>
            <span className="text-xs text-slate-400">
              Matching Automático de Pallets, Contenedor y Cliente
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-sky-400" />
            Matriz Central Consolidada de Pedidos
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Botón: Centro de Etiquetas QR */}
          <button
            onClick={() => setModalReporteAsignacionesOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-900/90 to-blue-900/90 hover:from-cyan-800 hover:to-blue-800 text-cyan-200 border border-cyan-400/60 transition shadow-lg shadow-cyan-950/50 shrink-0 cursor-pointer"
            title="Ver e imprimir Reporte Consolidado Oficial de repuestos asignados agrupados por Contenedor, Pallet, Sucursal y Cliente con tiempos SLA"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-300" />
            <span>Reporte Pallets & Asignaciones</span>
          </button>

          <button
            onClick={() => handleImprimirEtiquetasLote()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-950/90 hover:bg-purple-900 border border-purple-500/50 text-purple-300 transition shadow shrink-0 cursor-pointer"
            title="Generar e imprimir etiquetas físicas oficiales con código QR para repuestos asignados o seleccionados"
          >
            <QrCode className="w-3.5 h-3.5 text-purple-400" />
            <span>Etiquetas QR Oficiales</span>
          </button>

          {/* Botón: Auditoría y Depuración de Duplicados */}
          <button
            onClick={() => setModalDepurar(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/40 transition shadow shrink-0 cursor-pointer"
            title="Auditar y depurar pedidos duplicados para proteger la integridad de los datos"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Depurar Duplicados</span>
          </button>

          {/* Botón: Centro de Plantillas Oficiales */}
          <button
            onClick={() => setModalPlantillas(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition shadow shrink-0 cursor-pointer"
            title="Descargar plantillas oficiales de Excel/CSV para pedidos de sucursales o matriz completa"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Plantillas (.xlsx)</span>
          </button>

          {/* Botón Principal: Carga Masiva de Pedidos */}
          <button
            onClick={() => setModalCargaMasiva(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition cursor-pointer"
            title="Subir pedidos masivamente desde archivo Excel, CSV o Portapapeles"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Carga Masiva de Pedidos</span>
          </button>

          {/* Botón: Ejecutar Matching FIFO */}
          <button
            onClick={handleEjecutarMatchingGlobal}
            disabled={ejecutandoMatching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition shadow disabled:opacity-50"
            title="Re-ejecutar matching FIFO de prioridad (VOR > Garantía > Chapistería > Taller > Stock) contra los pallets disponibles"
          >
            <Zap className={`w-3.5 h-3.5 ${ejecutandoMatching ? 'animate-spin' : ''}`} />
            <span>{ejecutandoMatching ? 'Matching...' : 'Matching FIFO'}</span>
          </button>

          {/* Botón: Sincronizar con Google Sheets */}
          <button
            onClick={handleSincronizarSheets}
            disabled={sincronizandoSheets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition shrink-0 disabled:opacity-50"
            title="Enviar los datos consolidados a la hoja Google Sheets (Pestaña Matriz_Central)"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${sincronizandoSheets ? 'animate-spin' : ''}`} />
            <span>{sincronizandoSheets ? 'Sincronizando...' : 'Sync Sheets'}</span>
          </button>

          {/* Botón: Traer de Sheets (Carga Bidireccional getInitialData) */}
          <button
            onClick={handleRecargarDesdeSheets}
            disabled={cargandoNube}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md shadow-sky-900/30 border border-sky-400/30 transition shrink-0 disabled:opacity-50 cursor-pointer"
            title="Traer información viva y actualizada de pedidos e inventario desde Google Sheets (getInitialData)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargandoNube ? 'animate-spin' : ''}`} />
            <span>{cargandoNube ? 'Trayendo...' : 'Traer de Sheets'}</span>
            <span className="hidden xl:inline-block text-[9px] px-1.5 py-0.5 bg-white/20 rounded font-bold uppercase tracking-wider">En Vivo</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shrink-0"
            title="Exportar a CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {mensaje && (
        <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow ${
          mensaje.tipo === 'ok' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
        }`}>
          {mensaje.tipo === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTRO AVANZADO DE FILTROS MASIVOS: SUCURSALES, PALLETS, CONTENEDORES, ASESORES, FECHAS */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        {/* Fila 1: Buscador + Tabs Rápidos + Botón Filtros Avanzados + Limpiar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 text-xs">
          
          {/* Campo de búsqueda con icono y botón de borrado rápido */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por código, pallet, contenedor, cliente, VIN, pedido, estatus..."
              className="bg-slate-900 border border-slate-800 text-xs rounded-xl pl-9 pr-8 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500 shadow-inner"
            />
            {filtroTexto && (
              <button
                type="button"
                onClick={() => setFiltroTexto('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector de Estado de Línea y Botón de Filtros Avanzados */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto shadow-sm">
              {[
                { id: 'TODOS', label: `Todos (${filas.length})` },
                { id: 'ASIGNADO', label: `Asignados (${metricas.lineasAsignadas})` },
                { id: 'PENDIENTE', label: `Pendientes (${metricas.lineasPendientes})` },
                { id: 'DESPACHADO', label: `Despachados (${despachadosList.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFiltroEstado(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap text-xs cursor-pointer ${
                    filtroEstado === tab.id
                      ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Toggle Panel de Filtros Avanzados */}
            <button
              type="button"
              onClick={() => setPanelFiltrosAbierto(!panelFiltrosAbierto)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition text-xs cursor-pointer ${
                panelFiltrosAbierto || totalFiltrosActivos > 0
                  ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-950/50'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
              title="Mostrar u ocultar filtros específicos por sucursal, pallet, contenedor, etc."
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filtros Específicos</span>
              {totalFiltrosActivos > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-cyan-500 text-slate-950">
                  {totalFiltrosActivos}
                </span>
              )}
            </button>

            {/* Botón Limpiar Todos los Filtros */}
            {totalFiltrosActivos > 0 && (
              <button
                type="button"
                onClick={limpiarTodosLosFiltros}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 border border-rose-500/40 transition text-xs cursor-pointer"
                title="Restablecer todos los filtros aplicados"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar ({totalFiltrosActivos})</span>
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: PANEL DE FILTROS AVANZADOS MULTI-CRITERIO (Desplegable) */}
        {panelFiltrosAbierto && (
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-xl space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
              
              {/* 1. SUCURSALES */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  <span>Sucursal</span>
                </label>
                <select
                  value={filtroSucursal}
                  onChange={(e) => setFiltroSucursal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="TODAS">Todas las Sucursales</option>
                  {listaSucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* 2. CONTENEDORES */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3 text-emerald-400" />
                  <span>Contenedor</span>
                </label>
                <select
                  value={filtroContenedor}
                  onChange={(e) => setFiltroContenedor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="TODOS">Todos los Contenedores</option>
                  <option value="CON_CONTENEDOR">🟢 Solo Con Contenedor</option>
                  <option value="SIN_CONTENEDOR">⚪ Sin Contenedor Asignado</option>
                  {listaContenedores.map(c => (
                    <option key={c} value={c}>📦 {c}</option>
                  ))}
                </select>
              </div>

              {/* 3. PALLETS */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Boxes className="w-3 h-3 text-blue-400" />
                  <span>Pallet Físico</span>
                </label>
                <select
                  value={filtroPallet}
                  onChange={(e) => setFiltroPallet(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="TODOS">Todos los Pallets</option>
                  <option value="CON_PALLET">🟦 Solo Con Pallet</option>
                  <option value="SIN_PALLET">⚪ Sin Pallet Asignado</option>
                  {listaPallets.map(p => (
                    <option key={p} value={p}>🏗️ {p}</option>
                  ))}
                </select>
              </div>

              {/* 4. ASESOR */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-violet-400" />
                  <span>Asesor Responsable</span>
                </label>
                <select
                  value={filtroAsesor}
                  onChange={(e) => setFiltroAsesor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="TODOS">Todos los Asesores</option>
                  {listaAsesores.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* 5. MODELO CHANGAN */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <span className="text-amber-400 font-mono">🚗</span>
                  <span>Modelo Auto</span>
                </label>
                <select
                  value={filtroModelo}
                  onChange={(e) => setFiltroModelo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="TODOS">Todos los Modelos</option>
                  {listaModelos.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 6. RANGO DE FECHAS (Desde - Hasta) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-400" />
                  <span>Rango de Fecha</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded-xl px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    title="Fecha Desde"
                  />
                  <span className="text-slate-500 text-xs">-</span>
                  <input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded-xl px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    title="Fecha Hasta"
                  />
                </div>
              </div>

            </div>

            {/* Subfila: Filtro Rápido por Estatus General de Solicitud */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">
                Estatus General:
              </span>
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'PENDIENTE', label: 'Pendiente' },
                { id: 'EN TRÁNSITO', label: 'En Tránsito' },
                { id: 'EN BODEGA CEDIS', label: 'En Bodega CEDIS' },
                { id: 'ESPERANDO ENVÍO', label: 'Esperando Envío' },
                { id: 'DESPACHADO', label: 'Despachado' },
                { id: 'RECIBIDO', label: 'Recibido' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setFiltroEstatusGeneral(item.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition whitespace-nowrap border cursor-pointer ${
                    filtroEstatusGeneral === item.id
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Chips de filtros activos + resumen de resultados */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-300">
                  Mostrando <b className="text-cyan-400 font-mono">{filasFiltradas.length}</b> de <b className="text-slate-400 font-mono">{filas.length}</b> repuestos ({pedidosEnVista.length} pedidos)
                </span>

                {filtroSucursal !== 'TODAS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px]">
                    Sucursal: {filtroSucursal}
                    <button type="button" onClick={() => setFiltroSucursal('TODAS')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filtroContenedor !== 'TODOS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px]">
                    Contenedor: {filtroContenedor}
                    <button type="button" onClick={() => setFiltroContenedor('TODOS')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filtroPallet !== 'TODOS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px]">
                    Pallet: {filtroPallet}
                    <button type="button" onClick={() => setFiltroPallet('TODOS')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filtroAsesor !== 'TODOS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300 text-[10px]">
                    Asesor: {filtroAsesor}
                    <button type="button" onClick={() => setFiltroAsesor('TODOS')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filtroModelo !== 'TODOS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px]">
                    Modelo: {filtroModelo}
                    <button type="button" onClick={() => setFiltroModelo('TODOS')} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {(filtroFechaDesde || filtroFechaHasta) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px]">
                    Fecha: {filtroFechaDesde || 'Inicio'} a {filtroFechaHasta || 'Hoy'}
                    <button type="button" onClick={() => { setFiltroFechaDesde(''); setFiltroFechaHasta(''); }} className="hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>

              {totalFiltrosActivos > 0 && (
                <button
                  type="button"
                  onClick={limpiarTodosLosFiltros}
                  className="text-rose-400 hover:text-rose-300 underline cursor-pointer text-[10px] font-semibold"
                >
                  Restablecer filtros
                </button>
              )}
            </div>

          </div>
        )}
      </div>

      {/* BARRA FLOTANTE DE ACCIONES MASIVAS CUANDO HAY SELECCIONADOS */}
      {pedidosSeleccionados.length > 0 && (
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950/80 to-slate-950 border border-cyan-500/50 rounded-xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-xs">
                      {lineasSeleccionadas.size > 0 ? `${lineasSeleccionadas.size} repuestos seleccionados` : `${pedidosSeleccionados.length} pedidos seleccionados`}
                    </span>
                    {lineasSeleccionadas.size > 0 && (
                      <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-semibold">
                        Despacho Individual por Ítem
                      </span>
                    )}
                  </div>
                  <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {infoSeleccionMultiSucursal.nombresSucs.length} {infoSeleccionMultiSucursal.nombresSucs.length === 1 ? 'sucursal' : 'sucursales'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    ({infoSeleccionMultiSucursal.totalPiezas} piezas)
                  </span>
                </div>
                {infoSeleccionMultiSucursal.nombresSucs.length > 1 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {infoSeleccionMultiSucursal.nombresSucs.map(suc => (
                      <span key={suc} className="bg-slate-900 border border-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded font-medium">
                        {suc}: <strong>{infoSeleccionMultiSucursal.sucsMap[suc]}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                (Acciones aplicables al lote completo en Matriz Central)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Despacho Masivo */}
            <button
              type="button"
              onClick={() => setModalDespachoMasivo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950/40 transition cursor-pointer"
              title="Despachar físicamente los pedidos seleccionados solicitando fecha exacta para KPIs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Despachar Masivamente</span>
            </button>

            {/* Botón Imprimir Etiquetas QR Masivas */}
            <button
              type="button"
              onClick={() => handleImprimirEtiquetasLote()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 transition cursor-pointer"
              title="Generar e imprimir etiquetas físicas con código QR de los pedidos seleccionados"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Imprimir Etiquetas QR ({lineasSeleccionadas.size > 0 ? lineasSeleccionadas.size : pedidosSeleccionados.length})</span>
            </button>

            {/* Botón Editar Masivo */}
            <button
              type="button"
              onClick={() => setModalEditarMasivo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition cursor-pointer"
              title="Modificar estatus, sucursal o prioridad en los pedidos seleccionados"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Masivamente</span>
            </button>

            {/* Botón Eliminar Masivo */}
            <button
              type="button"
              onClick={() => setModalEliminarMasivo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/60 shadow transition cursor-pointer"
              title="Eliminar permanentemente los pedidos seleccionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Borrar Masivamente</span>
            </button>

            {/* Botón Notificar Lote */}
            <button
              type="button"
              onClick={() => handleAbrirNotificacionParaPedido(pedidosSeleccionados[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
              title={`Generar notificación desde ${CORREO_REMITENTE_OFICIAL}`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Notificar Lote ({CORREO_REMITENTE_OFICIAL})</span>
              <span className="md:hidden">Notificar</span>
            </button>

            {/* Deseleccionar */}
            <button
              type="button"
              onClick={() => {
                setPedidosSeleccionados([]);
                setLineasSeleccionadas(new Set());
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Matriz Central con Pallets y Contenedores */}
      {/* Tabla de Matriz Central con Pallets y Contenedores (100% visible sin scroll horizontal) */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[640px] custom-scroll">
          <table className="w-full text-left text-xs table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "3.5%" }} />  {/* Checkbox */}
              <col style={{ width: "10%" }} />   {/* ID Pedido */}
              <col style={{ width: "9.5%" }} />  {/* Sucursal / Asesor */}
              <col style={{ width: "13%" }} />   {/* Cliente / Cotización */}
              <col style={{ width: "9%" }} />    {/* Modelo / VIN */}
              <col style={{ width: "18%" }} />   {/* Repuesto OEM */}
              <col style={{ width: "6.5%" }} />  {/* Cantidades */}
              <col style={{ width: "13%" }} />   {/* Contenedor / Pallet */}
              <col style={{ width: "10.5%" }} /> {/* Estatus */}
              <col style={{ width: "7%" }} />    {/* Acciones */}
            </colgroup>
            <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0 z-10 border-b border-slate-800 font-mono text-[10px]">
              <tr>
                <th className="px-1.5 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={handleToggleSeleccionarTodos}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                    title="Seleccionar o deseleccionar todos los pedidos visibles"
                  />
                </th>
                <th className="px-2 py-2.5">ID PEDIDO</th>
                <th className="px-2 py-2.5">SUCURSAL / ASESOR</th>
                <th className="px-2 py-2.5">CLIENTE / COTIZACIÓN</th>
                <th className="px-2 py-2.5">MODELO / VIN</th>
                <th className="px-2 py-2.5">REPUESTO OEM</th>
                <th className="px-1.5 py-2.5 text-center">CANT.</th>
                <th className="px-2 py-2.5">CONTENEDOR / PALLET</th>
                <th className="px-1.5 py-2.5 text-center">ESTATUS</th>
                <th className="px-1.5 py-2.5 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    {filtroEstado === 'DESPACHADO' ? 'No hay repuestos despachados que coincidan con los filtros actuales.' : 'No hay solicitudes que coincidan con la búsqueda. Puedes subir pedidos masivamente con el botón superior.'}
                  </td>
                </tr>
              ) : (
                filasFiltradas.map((fila) => {
                  // Selección ESTRICTAMENTE INDIVIDUAL por línea / repuesto
                  const filaKey = getFilaLineKey(fila);
                  const seleccionado = lineasSeleccionadas.has(filaKey);
                  // Estatus INDIVIDUAL del repuesto (fila.estatusLinea) con fallback al general
                  const estatusIndividual = fila.estatusLinea || fila.estatusGeneral || "PENDIENTE";
                  const estatusSelectValue = normalizarValorSelectEstatus(estatusIndividual);
                  const metaEst = normalizarEstatusLogistico(estatusIndividual);

                  return (
                    <tr
                      key={fila.lineaId}
                      className={`transition ${
                        seleccionado
                          ? "bg-cyan-950/40 border-l-2 border-cyan-400 hover:bg-cyan-950/50"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Checkbox de selección individual por repuesto / línea */}
                      <td className="px-1.5 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => handleToggleSeleccionFila(fila)}
                          title={`Seleccionar únicamente este repuesto: ${fila.codigoRepuesto} (${fila.cliente})`}
                          className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                      </td>

                      {/* 1. ID Pedido / Prioridad / Fecha */}
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModalExpedientePedidoId(fila.pedidoId)}
                            className="font-bold text-white font-mono hover:text-cyan-400 transition cursor-pointer text-left text-xs tracking-tight"
                            title="Ver expediente completo del pedido"
                          >
                            {fila.pedidoId}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-semibold ${
                            fila.tipoPedido.includes("VOR") ? "text-rose-400 font-bold" :
                            fila.tipoPedido.includes("Garantía") ? "text-amber-400" :
                            fila.tipoPedido.includes("Chapistería") ? "text-purple-400" : "text-slate-300"
                          }`}>
                            {fila.tipoPedido.replace("Pedido ", "")}
                          </span>
                          <span className="text-slate-500 text-[10px]">&bull;</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {fila.fechaCreacion ? fila.fechaCreacion.substring(5, 10) : ""}
                          </span>
                        </div>
                      </td>

                      {/* 2. Sucursal / Asesor */}
                      <td className="px-2 py-2 align-middle">
                        <div className="text-slate-100 font-semibold text-xs leading-tight">{fila.sucursal}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{fila.colaborador}</div>
                      </td>

                      {/* 3. Cliente / Cotización */}
                      <td className="px-2 py-2 align-middle">
                        <div className="font-semibold text-slate-100 text-xs break-words leading-snug" title={fila.cliente}>
                          {fila.cliente}
                        </div>
                        <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                          {fila.cotizacion || fila.numeroOR || "-"}
                        </div>
                      </td>

                      {/* 4. Modelo / VIN */}
                      <td className="px-2 py-2 align-middle">
                        <div className="text-slate-100 font-semibold text-xs leading-tight">{fila.modeloChangan}</div>
                        <div className="text-slate-400 font-mono text-[10px] mt-0.5 leading-tight break-all" title={fila.vin}>
                          {fila.vin ? (fila.vin.length > 10 ? `...${fila.vin.substring(fila.vin.length - 8)}` : fila.vin) : "Sin VIN"}
                        </div>
                      </td>

                      {/* 5. Repuesto OEM (Código y Descripción completa) */}
                      <td className="px-2 py-2 align-middle">
                        <div className="font-mono text-sky-400 font-bold text-xs tracking-tight">
                          {fila.codigoRepuesto}
                        </div>
                        <div className="text-slate-300 text-[11px] break-words leading-tight mt-0.5 font-normal" title={fila.descripcionOficial}>
                          {fila.descripcionOficial}
                        </div>
                      </td>

                      {/* 6. Cantidades */}
                      <td className="px-1.5 py-2 text-center align-middle">
                        <div className="font-bold text-white text-xs">{fila.cantidadSolicitada} u.</div>
                        <div className="text-[10px] mt-0.5">
                          {fila.cantidadAsignada > 0 && <span className="text-emerald-400 font-bold block">{fila.cantidadAsignada} asig.</span>}
                          {fila.cantidadDespachada > 0 && <span className="text-purple-400 font-bold block">{fila.cantidadDespachada} desp.</span>}
                          {fila.saldoPendiente > 0 && <span className="text-amber-400 font-bold block">{fila.saldoPendiente} pend.</span>}
                          {fila.cantidadAsignada === 0 && fila.cantidadDespachada === 0 && (
                            <span className="text-slate-500 block text-[9px]">0 asig.</span>
                          )}
                        </div>
                      </td>

                      {/* 7. Matching Logística (Contenedor & Pallet) */}
                      <td className="px-2 py-2 align-middle">
                        {fila.contenedorAsignado ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-emerald-300 flex items-center gap-1 text-[10px] font-mono leading-tight break-all">
                              <Box className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{fila.contenedorAsignado}</span>
                            </div>
                            <div className="text-[10px] text-slate-300 font-mono leading-tight">
                              Pallet: <strong className="text-white">{fila.palletAsignado}</strong> {fila.packageNo ? `(${fila.packageNo})` : ""}
                            </div>
                            {fila.ubicacionCedis && (
                              <div className="text-[9px] text-slate-400 leading-tight break-words">
                                {fila.ubicacionCedis}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[10px] block leading-tight">
                            Sin pallet (Pendiente arribo)
                          </span>
                        )}
                      </td>

                      {/* 8. Estatus General con Selector Compacto */}
                      <td className="px-1.5 py-2 text-center align-middle">
                        <select
                          value={estatusSelectValue}
                          onChange={(e) => handleCambiarEstatusRapidoTabla(fila, e.target.value)}
                          className={`w-full border rounded-md px-1 py-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer text-center transition ${
                            estatusSelectValue === 'DESPACHADO'
                              ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                              : estatusSelectValue === 'RECIBIDO'
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                              : estatusSelectValue === 'EN BODEGA'
                              ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                              : estatusSelectValue === 'POR ENVIAR'
                              ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                              : estatusSelectValue === 'EN TRÁNSITO'
                              ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                              : 'bg-slate-950 border-slate-700 text-slate-300'
                          }`}
                          title="Haz clic para cambiar el estatus y sincronizar inmediatamente"
                        >
                          <option value="PENDIENTE" className="bg-slate-900 text-slate-300">PENDIENTE</option>
                          <option value="EN TRÁNSITO" className="bg-slate-900 text-blue-400">EN TRÁNSITO</option>
                          <option value="EN BODEGA" className="bg-slate-900 text-sky-400">EN BODEGA</option>
                          <option value="POR ENVIAR" className="bg-slate-900 text-amber-400">POR ENVIAR</option>
                          <option value="DESPACHADO" disabled={fila.cantidadAsignada <= 0} className={fila.cantidadAsignada > 0 ? "bg-slate-900 text-purple-400" : "bg-slate-900 text-slate-600 italic"}>DESPACHADO {fila.cantidadAsignada <= 0 ? '(Requiere Asignación)' : ''}</option>
                          <option value="RECIBIDO" className="bg-slate-900 text-emerald-400">RECIBIDO</option>
                        </select>
                      </td>

                      {/* 9. Acciones por Fila */}
                      <td className="px-1 py-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          {/* Ver Expediente */}
                          <button
                            type="button"
                            onClick={() => setModalExpedientePedidoId(fila.pedidoId)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                            title="Ver expediente completo y bitácora de llamadas"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar Pedido */}
                          <button
                            type="button"
                            onClick={() => setModalEditarPedidoId(fila.pedidoId)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                            title="Editar pedido y repuestos"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Imprimir Etiqueta QR Oficial Individual */}
                          <button
                            type="button"
                            onClick={() => {
                              const cantAsig = Number(fila.cantidadAsignada) || 0;
                              const cantTotal = Number(fila.cantidadSolicitada) || 1;
                              const cant = cantAsig > 0 ? cantAsig : cantTotal;
                              const items: EtiquetaRepuestoData[] = [];
                              for (let s = 1; s <= Math.min(cant, 10); s++) {
                                items.push(generarDatosEtiqueta(
                                  fila.pedidoId,
                                  fila.codigoRepuesto,
                                  fila.descripcionOficial,
                                  fila.sucursal,
                                  s,
                                  cant,
                                  fila.contenedorAsignado,
                                  fila.palletAsignado,
                                  fila.ubicacionCedis,
                                  fila.cliente,
                                  fila.modeloChangan,
                                  fila.placa,
                                  fila.vin,
                                  fila.cotizacion
                                ));
                              }
                              setModalEtiquetasData(items);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 transition cursor-pointer"
                            title="Imprimir etiqueta física oficial con código QR para este repuesto"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Notificar por Correo / WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleAbrirNotificacionParaPedido(fila.pedidoId)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40 transition cursor-pointer"
                            title={`Enviar notificación desde ${CORREO_REMITENTE_OFICIAL} o WhatsApp`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar Pedido Individual */}
                          <button
                            type="button"
                            onClick={() => handleEliminarPedidoIndividual(fila.pedidoId, fila.cliente)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                            title={`Eliminar permanentemente ${fila.pedidoId} (${fila.cliente || 'Cliente'})`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Despachar si aplica */}
                          {esRolOperativo && fila.cantidadAsignada > 0 && (
                            <button
                              onClick={() => {
                                setModalDespacho(fila);
                                setCantDespacho(fila.cantidadAsignada);
                              }}
                              className="p-1 rounded text-purple-400 hover:text-purple-200 hover:bg-purple-950/60 transition cursor-pointer"
                              title="Despachar físicamente a sucursal"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Pedido */}
      <ModalEditarPedido
        isOpen={modalEditarPedidoId !== null}
        onClose={() => setModalEditarPedidoId(null)}
        pedidoId={modalEditarPedidoId}
        filasMatriz={filas}
        onPedidoGuardado={() => {
          onActualizar();
          setMensaje({ tipo: 'ok', texto: 'Pedido actualizado exitosamente en la Matriz Central.' });
        }}
        onEliminarPedido={(id) => {
          onActualizar();
          setMensaje({ tipo: 'ok', texto: `Pedido ${id} eliminado.` });
        }}
        onAbrirNotificacion={(datos, est) => {
          setModalNotificacion({
            open: true,
            datos,
            estatus: est
          });
        }}
      />

      {/* Modal Expediente de Pedido */}
      <ModalExpedientePedido
        isOpen={modalExpedientePedidoId !== null}
        onClose={() => setModalExpedientePedidoId(null)}
        pedidoId={modalExpedientePedidoId}
        filasMatriz={filas}
        onActualizar={onActualizar}
        onEditarPedido={(id) => {
          setModalExpedientePedidoId(null);
          setModalEditarPedidoId(id);
        }}
        onEliminarPedido={(id) => {
          setModalExpedientePedidoId(null);
          onActualizar();
        }}
        onAbrirNotificacion={(datos, est) => {
          setModalNotificacion({
            open: true,
            datos,
            estatus: est
          });
        }}
        onImprimirComprobante={(id) => handleAbrirComprobante(id)}
      />

      {/* Modal Notificación Oficial por Correo / WhatsApp */}
      <ModalNotificacionPedido
        isOpen={modalNotificacion.open}
        onClose={() => setModalNotificacion({ open: false, datos: null, estatus: 'ESPERANDO ENVÍO' })}
        datosPedido={modalNotificacion.datos}
        estatusInicial={modalNotificacion.estatus}
        onEstatusCambiado={async (nuevoEstatus) => {
          if (modalNotificacion.datos?.pedidoId) {
            await appsScriptClient.cambiarEstatusPedido(modalNotificacion.datos.pedidoId, nuevoEstatus);
            onActualizar();
          }
        }}
      />

      {/* Modal Despacho Masivo con Fecha Exacta para KPIs */}
      <ModalDespachoMasivo
        isOpen={modalDespachoMasivo}
        lineasSeleccionadasKeys={Array.from(lineasSeleccionadas)}
        onClose={() => setModalDespachoMasivo(false)}
        pedidoIds={pedidosSeleccionados}
        filasMatriz={filas}
        onDespachoExitoso={(tot, fDespacho) => {
          onActualizar();
          setMensaje({
            tipo: 'ok',
            texto: `${tot} pedidos despachados físicamente a sucursal con fecha oficial ${fDespacho}. KPIs de ciclo y OTIF actualizados.`
          });
          setPedidosSeleccionados([]);
          setLineasSeleccionadas(new Set());
        }}
        onAbrirNotificacionLote={(ids, est) => {
          if (ids.length > 0) {
            handleAbrirNotificacionParaPedido(ids[0], est);
          }
        }}
      />

      {/* Modal Edición Masiva */}
      <ModalEditarMasivo
        isOpen={modalEditarMasivo}
        onClose={() => setModalEditarMasivo(false)}
        pedidoIds={pedidosSeleccionados}
        onActualizadoExitoso={() => {
          onActualizar();
          setMensaje({
            tipo: 'ok',
            texto: `${pedidosSeleccionados.length} pedidos actualizados correctamente en la Matriz Central.`
          });
          setPedidosSeleccionados([]);
        }}
        onAbrirNotificacionLote={(ids, est) => {
          if (ids.length > 0) {
            handleAbrirNotificacionParaPedido(ids[0], est);
          }
        }}
      />

      {/* Modal Eliminación Masiva */}
      <ModalEliminarMasivo
        isOpen={modalEliminarMasivo}
        onClose={() => setModalEliminarMasivo(false)}
        pedidoIds={pedidosSeleccionados}
        onEliminadoExitoso={() => {
          onActualizar();
          setMensaje({
            tipo: 'ok',
            texto: `Se eliminaron ${pedidosSeleccionados.length} pedidos seleccionados.`
          });
          setPedidosSeleccionados([]);
        }}
      />

      {/* Modal de Etiquetas QR Físicas Oficiales Changan */}
      {modalEtiquetasData && modalEtiquetasData.length > 0 && (
        <ModalEtiquetaQR
          isOpen={true}
          onClose={() => setModalEtiquetasData(null)}
          etiquetas={modalEtiquetasData}
        />
      )}

      {/* Modal Oficial Reporte de Asignaciones por Contenedor, Pallet y Sucursal (Ticket 1) */}
      <ModalReporteAsignaciones
        isOpen={modalReporteAsignacionesOpen}
        onClose={() => setModalReporteAsignacionesOpen(false)}
        filas={filas}
      />

      {/* Modal Comprobante Oficial PDF */}
      {modalComprobante.datos && (
        <ModalComprobantePDF
          isOpen={modalComprobante.open}
          onClose={() => setModalComprobante({ open: false, datos: null })}
          datos={modalComprobante.datos}
        />
      )}

      {/* Modal Carga Masiva */}
      <ModalCargaMasivaMatriz
        isOpen={modalCargaMasiva}
        onClose={() => setModalCargaMasiva(false)}
        onImportadoExitoso={() => {
          onActualizar();
          setMensaje({
            tipo: 'ok',
            texto: 'Pedidos importados y reflejados en Matriz Central con matching de pallets y contenedores exitoso.'
          });
        }}
      />

      {/* Modal de Depuración y Protección de Duplicados */}
      <ModalDepurarDuplicados
        isOpen={modalDepurar}
        onClose={() => setModalDepurar(false)}
        onDepuracionCompleta={onActualizar}
      />

      {/* Modal Centro de Plantillas Oficiales */}
      <ModalCentroPlantillas
        isOpen={modalPlantillas}
        onClose={() => setModalPlantillas(false)}
      />

      {/* Modal Confirmación de Despacho */}
      {modalDespacho && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-400" />
              Confirmar Despacho Físico a Sucursal
            </h3>
            <p className="text-xs text-slate-300">
              Esta acción es irreversible y registrará la salida física del repuesto en el Kardex y en la bitácora inmutable.
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
              <div><strong className="text-slate-400">Pedido:</strong> <span className="text-white font-mono">{modalDespacho.pedidoId}</span></div>
              <div><strong className="text-slate-400">Cliente:</strong> <span className="text-white">{modalDespacho.cliente}</span></div>
              <div><strong className="text-slate-400">Repuesto:</strong> <span className="text-sky-300 font-mono">{modalDespacho.codigoRepuesto}</span> - {modalDespacho.descripcionOficial}</div>
              <div><strong className="text-slate-400">Destino:</strong> <span className="text-white">{modalDespacho.sucursal} ({modalDespacho.colaborador})</span></div>
              <div><strong className="text-slate-400">Lote Origen:</strong> <span className="text-emerald-400 font-semibold">{modalDespacho.contenedorAsignado} (Pallet {modalDespacho.palletAsignado})</span></div>
              <div><strong className="text-slate-400">Cantidad Asignada:</strong> <span className="text-white font-bold">{modalDespacho.cantidadAsignada} u.</span></div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Cantidad a despachar:</label>
              <input
                type="number"
                min={1}
                max={modalDespacho.cantidadAsignada}
                value={cantDespacho}
                onChange={(e) => setCantDespacho(Math.min(modalDespacho.cantidadAsignada, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalDespacho(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEjecutarDespacho}
                disabled={procesando}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                {procesando ? 'Despachando...' : 'Confirmar y Grabar en Kardex'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
