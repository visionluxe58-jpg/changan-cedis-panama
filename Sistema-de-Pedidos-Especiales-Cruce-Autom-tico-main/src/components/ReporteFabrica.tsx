import React, { useState, useMemo } from 'react';
import { 
  ItemOrderingTemplate, 
  SolicitudCabecera, 
  DetalleRepuesto,
  MetodoTransporteFabrica
} from '../types/cedis';
import { 
  ITEMS_EJEMPLO_REPORTE_FABRICA, 
  REGLAS_CLASIFICACION_ENVIO,
  clasificarRepuesto, 
  exportarLibroExcelReporteFabrica 
} from '../utils/clasificadorLogistica';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Plane, 
  Ship, 
  ShieldAlert, 
  Scale, 
  Building2, 
  Calendar, 
  Info,
  Check,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';

interface ReporteFabricaProps {
  cabeceras?: SolicitudCabecera[];
  detalles?: DetalleRepuesto[];
  onActualizar?: () => void;
}

type PestanaReporte = 'Ordering_Template' | 'Clasificacion_Envio' | 'Consolidado_Sucursales' | 'Detalle_Pedidos_Mes' | 'Protocolo_DGR_Airbag';

export const ReporteFabrica: React.FC<ReporteFabricaProps> = ({
  cabeceras = [],
  detalles = [],
  onActualizar
}) => {
  // Estado principal de ítems en el template
  const [items, setItems] = useState<ItemOrderingTemplate[]>(() => {
    // Intentar leer de localStorage o usar la plantilla base oficial del ejemplo
    const guardado = localStorage.getItem('changan_cedis_reporte_fabrica_v1');
    if (guardado) {
      try {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parseando reporte fábrica guardado:', e);
      }
    }
    return ITEMS_EJEMPLO_REPORTE_FABRICA;
  });

  // Pestaña activa idéntica a las hojas de Excel
  const [pestanaActiva, setPestanaActiva] = useState<PestanaReporte>('Ordering_Template');

  // Filtros de tabla
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroTransporte, setFiltroTransporte] = useState<'TODOS' | 'Aereo' | 'Maritimo'>('TODOS');
  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState<string>('1ra Quincena Septiembre 2026');

  // Notificaciones / feedback visual
  const [mensajeCopiado, setMensajeCopiado] = useState<boolean>(false);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState<boolean>(false);
  const [itemEnEdicion, setItemEnEdicion] = useState<ItemOrderingTemplate | null>(null);

  // Estados para el simulador de cubicaje y peso en la pestaña 2
  const [simuladorCodigo, setSimuladorCodigo] = useState<string>('B511F271301-0200');
  const [simuladorDesc, setSimuladorDesc] = useState<string>('FR BUMPER');
  const [simuladorPeso, setSimuladorPeso] = useState<number>(6.8);
  const [simuladorLargo, setSimuladorLargo] = useState<number>(185);
  const [simuladorAncho, setSimuladorAncho] = useState<number>(65);
  const [simuladorAlto, setSimuladorAlto] = useState<number>(50);

  // Formulario de nuevo ítem o edición
  const [formCodigo, setFormCodigo] = useState<string>('');
  const [formCantidad, setFormCantidad] = useState<number>(1);
  const [formComentario, setFormComentario] = useState<string>('');
  const [formTransporte, setFormTransporte] = useState<MetodoTransporteFabrica>('Aereo');
  const [formPeso, setFormPeso] = useState<number>(1.5);
  const [formLargo, setFormLargo] = useState<number>(30);
  const [formAncho, setFormAncho] = useState<number>(20);
  const [formAlto, setFormAlto] = useState<number>(15);
  const [formSucursal, setFormSucursal] = useState<string>('Villa Lucre');
  const [formCliente, setFormCliente] = useState<string>('');
  const [formModelo, setFormModelo] = useState<string>('UNI-T Elite');

  // Guardar en localStorage ante cambios
  const guardarItems = (nuevosItems: ItemOrderingTemplate[]) => {
    setItems(nuevosItems);
    localStorage.setItem('changan_cedis_reporte_fabrica_v1', JSON.stringify(nuevosItems));
  };

  // Cálculo en tiempo real del simulador
  const resultadoSimulacion = useMemo(() => {
    return clasificarRepuesto(simuladorCodigo, simuladorDesc, simuladorPeso, {
      largo: simuladorLargo,
      ancho: simuladorAncho,
      alto: simuladorAlto
    });
  }, [simuladorCodigo, simuladorDesc, simuladorPeso, simuladorLargo, simuladorAncho, simuladorAlto]);

  // Ítems filtrados para la tabla Ordering_Template
  const itemsFiltrados = useMemo(() => {
    return items.filter((it) => {
      const coincideBusqueda = 
        it.partsCode.toLowerCase().includes(busqueda.toLowerCase()) ||
        it.comment.toLowerCase().includes(busqueda.toLowerCase()) ||
        (it.sucursal && it.sucursal.toLowerCase().includes(busqueda.toLowerCase())) ||
        (it.modeloChangan && it.modeloChangan.toLowerCase().includes(busqueda.toLowerCase()));

      const coincideTransporte = 
        filtroTransporte === 'TODOS' || it.categorizacion === filtroTransporte;

      return coincideBusqueda && coincideTransporte;
    });
  }, [items, busqueda, filtroTransporte]);

  // Totales ejecutivos para el Gerente
  const metricasEjecutivas = useMemo(() => {
    const totalLineas = items.length;
    const totalPiezas = items.reduce((acc, curr) => acc + curr.orderingQuantity, 0);
    const lineasAereo = items.filter((it) => it.categorizacion === 'Aereo').length;
    const piezasAereo = items
      .filter((it) => it.categorizacion === 'Aereo')
      .reduce((acc, curr) => acc + curr.orderingQuantity, 0);
    const lineasMaritimo = items.filter((it) => it.categorizacion === 'Maritimo').length;
    const piezasMaritimo = items
      .filter((it) => it.categorizacion === 'Maritimo')
      .reduce((acc, curr) => acc + curr.orderingQuantity, 0);
    const pesoTotal = items.reduce((acc, curr) => acc + (curr.pesoUnitarioKg || 1) * curr.orderingQuantity, 0);
    const itemsDgr = items.filter((it) => it.esDGR).length;

    return {
      totalLineas,
      totalPiezas,
      lineasAereo,
      piezasAereo,
      lineasMaritimo,
      piezasMaritimo,
      pesoTotal: Number(pesoTotal.toFixed(2)),
      itemsDgr,
      porcentajeAereo: totalPiezas > 0 ? ((piezasAereo / totalPiezas) * 100).toFixed(1) : '0',
      porcentajeMaritimo: totalPiezas > 0 ? ((piezasMaritimo / totalPiezas) * 100).toFixed(1) : '0'
    };
  }, [items]);

  // Consolidado quincenal por sucursal
  const consolidadoSucursales = useMemo(() => {
    const map: Record<string, {
      sucursal: string;
      lineas: number;
      piezasTotales: number;
      piezasAereo: number;
      piezasMaritimo: number;
      pesoTotalKg: number;
      urgenciasVor: number;
    }> = {};

    items.forEach((it) => {
      const suc = it.sucursal || 'Central CEDIS';
      if (!map[suc]) {
        map[suc] = {
          sucursal: suc,
          lineas: 0,
          piezasTotales: 0,
          piezasAereo: 0,
          piezasMaritimo: 0,
          pesoTotalKg: 0,
          urgenciasVor: 0
        };
      }
      map[suc].lineas += 1;
      map[suc].piezasTotales += it.orderingQuantity;
      map[suc].pesoTotalKg += (it.pesoUnitarioKg || 1) * it.orderingQuantity;
      if (it.categorizacion === 'Aereo') {
        map[suc].piezasAereo += it.orderingQuantity;
      } else {
        map[suc].piezasMaritimo += it.orderingQuantity;
      }
      if (it.tipoSolicitud === 'VOR / Unidad Parada') {
        map[suc].urgenciasVor += 1;
      }
    });

    return Object.values(map);
  }, [items]);

  // Sincronizar pedidos pendientes de CEDIS al cuadro
  const handleSincronizarPedidosCEDIS = () => {
    // Buscar detalles de repuestos sin stock o pendientes de pedido
    let importados = 0;
    const nuevosItems = [...items];

    cabeceras.forEach((cab) => {
      // Tomar solicitudes activas de taller, vor, garantia o colision
      const lineasDeEstePedido = detalles.filter((d) => d.pedidoId === cab.pedidoId);
      lineasDeEstePedido.forEach((lin) => {
        // Verificar si ya existe en la lista para no duplicar
        const yaExiste = nuevosItems.some(
          (it) => it.partsCode === lin.codigoRepuesto && it.pedidoId === cab.pedidoId
        );
        if (!yaExiste) {
          const desc = lin.descripcionOficial || lin.codigoActualizado || lin.codigoRepuesto;
          const clasif = clasificarRepuesto(lin.codigoRepuesto, desc);
          nuevosItems.push({
            id: `REP-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            partsCode: lin.codigoRepuesto,
            orderingQuantity: lin.cantidadSolicitada || 1,
            comment: desc.toUpperCase(),
            categorizacion: clasif.categorizacion,
            pesoUnitarioKg: clasif.pesoUnitarioKg,
            largoCm: clasif.largoCm,
            anchoCm: clasif.anchoCm,
            altoCm: clasif.altoCm,
            pesoVolumetricoKg: clasif.pesoVolumetricoKg,
            categoriaEstructura: clasif.categoria,
            motivoClasificacion: clasif.motivo,
            esDGR: clasif.esDGR,
            sucursal: cab.sucursal,
            pedidoId: cab.pedidoId,
            modeloChangan: cab.modeloChangan,
            cliente: cab.cliente,
            vin: cab.vin,
            numeroOR: cab.numeroOR,
            tipoSolicitud: cab.tipoPedido,
            quincena: quincenaSeleccionada,
            fechaCreacion: cab.fechaCreacion.split(' ')[0]
          });
          importados++;
        }
      });
    });

    if (importados > 0) {
      guardarItems(nuevosItems);
      alert(`Se sincronizaron exitosamente ${importados} repuestos pendientes desde las solicitudes de sucursales.`);
    } else {
      alert('Todos los pedidos actuales ya se encuentran sincronizados en el Reporte Fábrica.');
    }
  };

  // Restaurar plantilla canónica del ejemplo del usuario
  const handleRestaurarEjemplo = () => {
    if (window.confirm('¿Deseas restablecer el cuadro al ejemplo oficial exacto de fábrica (20 repuestos clasificados)?')) {
      guardarItems(ITEMS_EJEMPLO_REPORTE_FABRICA);
    }
  };

  // Copiar al portapapeles con formato tabular (listo para pegar en Excel)
  const handleCopiarPortapapeles = () => {
    let texto = 'Parts code\tOrdering Quantity\tComment\tCategorizacion\n';
    items.forEach((it) => {
      texto += `${it.partsCode}\t${it.orderingQuantity}\t${it.comment}\t${it.categorizacion}\n`;
    });

    navigator.clipboard.writeText(texto).then(() => {
      setMensajeCopiado(true);
      setTimeout(() => setMensajeCopiado(false), 3000);
    });
  };

  // Exportar archivo Excel .xlsx con las 5 pestañas
  const handleDescargarExcel = () => {
    const fechaLimpia = quincenaSeleccionada.replace(/\s+/g, '_');
    exportarLibroExcelReporteFabrica(items, `Reporte_Fabrica_Changan_${fechaLimpia}.xlsx`);
  };

  // Abrir modal para nuevo repuesto
  const handleAbrirNuevo = () => {
    setItemEnEdicion(null);
    setFormCodigo('');
    setFormCantidad(1);
    setFormComentario('');
    setFormTransporte('Aereo');
    setFormPeso(1.0);
    setFormLargo(25);
    setFormAncho(20);
    setFormAlto(15);
    setFormSucursal('Villa Lucre');
    setFormCliente('');
    setFormModelo('UNI-T Elite');
    setModalNuevoAbierto(true);
  };

  // Abrir modal para editar
  const handleEditarItem = (item: ItemOrderingTemplate) => {
    setItemEnEdicion(item);
    setFormCodigo(item.partsCode);
    setFormCantidad(item.orderingQuantity);
    setFormComentario(item.comment);
    setFormTransporte(item.categorizacion);
    setFormPeso(item.pesoUnitarioKg || 1.0);
    setFormLargo(item.largoCm || 25);
    setFormAncho(item.anchoCm || 20);
    setFormAlto(item.altoCm || 15);
    setFormSucursal(item.sucursal || 'Villa Lucre');
    setFormCliente(item.cliente || '');
    setFormModelo(item.modeloChangan || 'UNI-T Elite');
    setModalNuevoAbierto(true);
  };

  // Auto-clasificar en el formulario
  const handleAutoclasificarEnForm = () => {
    if (!formComentario) {
      alert('Ingresa primero la descripción o comentario del repuesto en inglés/español.');
      return;
    }
    const clasif = clasificarRepuesto(formCodigo, formComentario, formPeso, {
      largo: formLargo,
      ancho: formAncho,
      alto: formAlto
    });
    setFormTransporte(clasif.categorizacion);
    setFormPeso(clasif.pesoUnitarioKg);
    setFormLargo(clasif.largoCm);
    setFormAncho(clasif.anchoCm);
    setFormAlto(clasif.altoCm);
  };

  // Guardar ítem nuevo o editado
  const handleGuardarFormulario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formComentario.trim()) {
      alert('El código de repuesto y la descripción son obligatorios.');
      return;
    }

    const clasif = clasificarRepuesto(formCodigo, formComentario, formPeso, {
      largo: formLargo,
      ancho: formAncho,
      alto: formAlto
    });

    if (itemEnEdicion) {
      // Editar existente
      const actualizados = items.map((it) => {
        if (it.id === itemEnEdicion.id) {
          return {
            ...it,
            partsCode: formCodigo.trim().toUpperCase(),
            orderingQuantity: formCantidad,
            comment: formComentario.trim().toUpperCase(),
            categorizacion: formTransporte,
            pesoUnitarioKg: formPeso,
            largoCm: formLargo,
            anchoCm: formAncho,
            altoCm: formAlto,
            pesoVolumetricoKg: Number(((formLargo * formAncho * formAlto) / 5000).toFixed(2)),
            categoriaEstructura: clasif.categoria,
            motivoClasificacion: clasif.motivo,
            esDGR: clasif.esDGR,
            sucursal: formSucursal,
            cliente: formCliente,
            modeloChangan: formModelo
          };
        }
        return it;
      });
      guardarItems(actualizados);
    } else {
      // Crear nuevo
      const nuevo: ItemOrderingTemplate = {
        id: `REP-USR-${Date.now()}`,
        partsCode: formCodigo.trim().toUpperCase(),
        orderingQuantity: formCantidad,
        comment: formComentario.trim().toUpperCase(),
        categorizacion: formTransporte,
        pesoUnitarioKg: formPeso,
        largoCm: formLargo,
        anchoCm: formAncho,
        altoCm: formAlto,
        pesoVolumetricoKg: Number(((formLargo * formAncho * formAlto) / 5000).toFixed(2)),
        categoriaEstructura: clasif.categoria,
        motivoClasificacion: clasif.motivo,
        esDGR: clasif.esDGR,
        sucursal: formSucursal,
        cliente: formCliente,
        modeloChangan: formModelo,
        quincena: quincenaSeleccionada,
        fechaCreacion: new Date().toISOString().split('T')[0]
      };
      guardarItems([nuevo, ...items]);
    }

    setModalNuevoAbierto(false);
  };

  // Eliminar ítem
  const handleEliminarItem = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este repuesto de la lista de orden a fábrica?')) {
      guardarItems(items.filter((it) => it.id !== id));
    }
  };

  // Alternar transporte de un ítem directamente con 1 click
  const handleToggleTransporte = (id: string) => {
    const actualizados = items.map((it) => {
      if (it.id === id) {
        const nuevoTransporte: MetodoTransporteFabrica = it.categorizacion === 'Aereo' ? 'Maritimo' : 'Aereo';
        return {
          ...it,
          categorizacion: nuevoTransporte,
          motivoClasificacion: `Reclasificado manualmente a ${nuevoTransporte} por instrucción de jefatura.`
        };
      }
      return it;
    });
    guardarItems(actualizados);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal del Módulo */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ORDEN QUINCENAL A FÁBRICA CHANGAN
              </span>
              <span className="text-xs text-slate-400">Ciclo cada 15 días para Gerencia</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              <span>Reporte Fábrica: Cuadro de Pedidos Especiales</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              Consolidación quincenal y clasificación técnica de método de transporte (<strong className="text-sky-400">Aéreo</strong> vs <strong className="text-indigo-400">Marítimo</strong>) según peso, envergadura volumétrica ($L \times W \times H / 5000$) y estructura automotriz.
            </p>
          </div>

          {/* Acciones principales de exportación y sincronización */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Seleccionar periodo quincenal del reporte a fábrica"
                value={quincenaSeleccionada}
                onChange={(e) => setQuincenaSeleccionada(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="1ra Quincena Septiembre 2026" className="bg-slate-900 text-white">1ra Quincena Septiembre 2026</option>
                <option value="2da Quincena Septiembre 2026" className="bg-slate-900 text-white">2da Quincena Septiembre 2026</option>
                <option value="1ra Quincena Agosto 2026" className="bg-slate-900 text-white">1ra Quincena Agosto 2026</option>
                <option value="2da Quincena Agosto 2026" className="bg-slate-900 text-white">2da Quincena Agosto 2026</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSincronizarPedidosCEDIS}
              className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
              title="Cargar solicitudes de sucursales pendientes a fábrica"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Pedidos CEDIS</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarPortapapeles}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
              title="Copiar las 4 columnas oficiales al portapapeles para pegar en Excel"
            >
              {mensajeCopiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{mensajeCopiado ? '¡Copiado!' : 'Copiar Tabla'}</span>
            </button>

            <button
              type="button"
              onClick={handleDescargarExcel}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition"
              title="Descargar libro Excel .xlsx completo con las 5 pestañas exactas del ejemplo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirNuevo}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Repuesto</span>
            </button>
          </div>
        </div>

        {/* Tarjetas métricas ejecutivas para el Gerente */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Líneas de Pedido</span>
            <p className="text-xl font-bold text-white mt-0.5">{metricasEjecutivas.totalLineas}</p>
            <span className="text-[10px] text-slate-400">SKUs requeridos</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Piezas a Ordenar</span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{metricasEjecutivas.totalPiezas}</p>
            <span className="text-[10px] text-slate-400">Volumen total</span>
          </div>

          <div className="bg-sky-950/40 p-3 rounded-xl border border-sky-800/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-sky-300 font-medium flex items-center gap-1">
                <Plane className="w-3 h-3 text-sky-400" />
                <span>Envío Aéreo</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded">
                {metricasEjecutivas.porcentajeAereo}%
              </span>
            </div>
            <p className="text-xl font-bold text-sky-300 mt-0.5">{metricasEjecutivas.piezasAereo} uds</p>
            <span className="text-[10px] text-slate-400">{metricasEjecutivas.lineasAereo} líneas livianas</span>
          </div>

          <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-indigo-300 font-medium flex items-center gap-1">
                <Ship className="w-3 h-3 text-indigo-400" />
                <span>Envío Marítimo</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                {metricasEjecutivas.porcentajeMaritimo}%
              </span>
            </div>
            <p className="text-xl font-bold text-indigo-300 mt-0.5">{metricasEjecutivas.piezasMaritimo} uds</p>
            <span className="text-[10px] text-slate-400">{metricasEjecutivas.lineasMaritimo} líneas colisión/pesadas</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Scale className="w-3 h-3 text-slate-400" />
              <span>Peso Estimado</span>
            </span>
            <p className="text-xl font-bold text-slate-200 mt-0.5">{metricasEjecutivas.pesoTotal} kg</p>
            <span className="text-[10px] text-slate-400">Tara física calculada</span>
          </div>

          <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-900/40">
            <span className="text-[11px] text-rose-300 font-medium flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Restricción DGR</span>
            </span>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{metricasEjecutivas.itemsDgr}</p>
            <span className="text-[10px] text-slate-400">Airbags / Químicos</span>
          </div>
        </div>
      </div>

      {/* Pestañas idénticas al archivo Excel de la captura */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        <div className="flex items-center space-x-1 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPestanaActiva('Ordering_Template')}
            className={`px-4 py-2.5 rounded-t-lg border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              pestanaActiva === 'Ordering_Template'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Ordering_Template</span>
            <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva('Clasificacion_Envio')}
            className={`px-4 py-2.5 rounded-t-lg border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              pestanaActiva === 'Clasificacion_Envio'
                ? 'bg-amber-50 text-amber-900 border-amber-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Clasificación_Envío</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva('Consolidado_Sucursales')}
            className={`px-4 py-2.5 rounded-t-lg border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              pestanaActiva === 'Consolidado_Sucursales'
                ? 'bg-sky-50 text-sky-900 border-sky-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>Consolidado_Sucursales</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva('Detalle_Pedidos_Mes')}
            className={`px-4 py-2.5 rounded-t-lg border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              pestanaActiva === 'Detalle_Pedidos_Mes'
                ? 'bg-purple-50 text-purple-900 border-purple-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Detalle_Pedidos_Mes</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva('Protocolo_DGR_Airbag')}
            className={`px-4 py-2.5 rounded-t-lg border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              pestanaActiva === 'Protocolo_DGR_Airbag'
                ? 'bg-rose-50 text-rose-900 border-rose-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span>Protocolo_DGR_Airbag</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 1: ORDERING_TEMPLATE (LA HOJA EXACTA DE LA IMAGEN) */}
      {/* ========================================================= */}
      {pestanaActiva === 'Ordering_Template' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, descripción (ej. BUMPER, FAN, CLIP) o sucursal..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-xs">
                <Filter className="w-3 h-3 text-slate-500" />
                <span className="text-slate-600 font-medium">Transporte:</span>
                <select
                  aria-label="Filtrar por método de transporte"
                  value={filtroTransporte}
                  onChange={(e) => setFiltroTransporte(e.target.value as any)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos ({items.length})</option>
                  <option value="Aereo">Solo Aéreo ({metricasEjecutivas.lineasAereo})</option>
                  <option value="Maritimo">Solo Marítimo ({metricasEjecutivas.lineasMaritimo})</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleRestaurarEjemplo}
                className="text-xs text-slate-600 hover:text-slate-900 underline px-2"
                title="Restablecer a los 20 repuestos del ejemplo oficial"
              >
                Cargar plantilla original
              </button>
            </div>
          </div>

          {/* Tabla de Excel idéntica a la imagen */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center text-slate-500">#</th>
                  <th className="py-2.5 px-4 border-r border-slate-300 w-48 font-bold">
                    <div className="flex items-center justify-between">
                      <span>Parts code</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-300 w-36 text-center font-bold">
                    <div className="flex items-center justify-center gap-1">
                      <span>Ordering Quantity</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-300 font-bold">
                    <span>Comment (Descripción Técnica)</span>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-300 w-40 text-center font-bold">
                    <span>Categorizacion</span>
                  </th>
                  <th className="py-2.5 px-3 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron repuestos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  itemsFiltrados.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50 transition ${
                        item.esDGR ? 'bg-rose-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-200 font-mono font-semibold text-slate-900">
                        {item.partsCode}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-200 text-center font-bold text-slate-900">
                        <span className="inline-block bg-slate-100 px-3 py-0.5 rounded border border-slate-300">
                          {item.orderingQuantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-200 text-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{item.comment}</span>
                          {item.esDGR && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>DGR IATA</span>
                            </span>
                          )}
                        </div>
                        {item.motivoClasificacion && (
                          <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                            {item.motivoClasificacion}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleTransporte(item.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-sm ${
                            item.categorizacion === 'Aereo'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                          }`}
                          title="Click para alternar entre Aéreo y Marítimo"
                        >
                          {item.categorizacion === 'Aereo' ? (
                            <>
                              <Plane className="w-3.5 h-3.5 text-sky-600" />
                              <span>Aereo</span>
                            </>
                          ) : (
                            <>
                              <Ship className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Maritimo</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditarItem(item)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition"
                            title="Editar repuesto o medidas"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarItem(item.id)}
                            className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-600 transition"
                            title="Eliminar de la orden"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-slate-800 font-bold">
                <tr>
                  <td colSpan={2} className="py-2.5 px-4 border-r border-slate-300">
                    TOTALIZADOR GENERAL ({itemsFiltrados.length} líneas)
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-300 text-center font-bold text-slate-900">
                    {itemsFiltrados.reduce((a, b) => a + b.orderingQuantity, 0)} piezas
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-300 text-slate-600 font-normal">
                    Flete aéreo sugerido: {metricasEjecutivas.piezasAereo} uds | Flete marítimo: {metricasEjecutivas.piezasMaritimo} uds
                  </td>
                  <td colSpan={2} className="py-2.5 px-4 text-center text-slate-700">
                    Peso Estimado: ~{metricasEjecutivas.pesoTotal} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2">
            <p>
              * La columna <strong>Categorizacion</strong> se evalúa canónicamente respetando peso real, peso volumétrico y estructura de colisión (bumpers y fenders siempre viajan marítimo).
            </p>
            <p className="font-semibold text-slate-700">
              Formato oficial para envío quincenal a Gerencia y China Mobitech CEDIS.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: CLASIFICACIÓN_ENVÍO (CRITERIOS Y SIMULADOR)    */}
      {/* ========================================================= */}
      {pestanaActiva === 'Clasificacion_Envio' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-700" />
              <span>Simulador Inteligente de Cubicaje y Selección de Transporte Aéreo vs Marítimo</span>
            </h3>
            <p className="text-xs text-amber-800 mt-1">
              Prueba cualquier repuesto Changan. El motor calcula automáticamente el peso volumétrico ($L \times W \times H / 5000$) y determina la conveniencia logística.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Código de Parte</label>
                <input
                  type="text"
                  value={simuladorCodigo}
                  onChange={(e) => setSimuladorCodigo(e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Descripción (Inglés / Español)</label>
                <input
                  type="text"
                  value={simuladorDesc}
                  onChange={(e) => setSimuladorDesc(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Peso Real (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simuladorPeso}
                  onChange={(e) => setSimuladorPeso(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Medidas L × W × H (cm)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={simuladorLargo}
                    onChange={(e) => setSimuladorLargo(Number(e.target.value))}
                    title="Largo cm"
                    className="w-1/3 text-xs px-1.5 py-1.5 bg-white border border-amber-300 rounded-lg text-center"
                  />
                  <span className="text-amber-600">×</span>
                  <input
                    type="number"
                    value={simuladorAncho}
                    onChange={(e) => setSimuladorAncho(Number(e.target.value))}
                    title="Ancho cm"
                    className="w-1/3 text-xs px-1.5 py-1.5 bg-white border border-amber-300 rounded-lg text-center"
                  />
                  <span className="text-amber-600">×</span>
                  <input
                    type="number"
                    value={simuladorAlto}
                    onChange={(e) => setSimuladorAlto(Number(e.target.value))}
                    title="Alto cm"
                    className="w-1/3 text-xs px-1.5 py-1.5 bg-white border border-amber-300 rounded-lg text-center"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className={`w-full p-2 rounded-lg border text-center font-bold text-xs ${
                  resultadoSimulacion.categorizacion === 'Aereo'
                    ? 'bg-sky-100 text-sky-900 border-sky-300'
                    : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                }`}>
                  Dictamen: {resultadoSimulacion.categorizacion.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Resultado detallado del simulador */}
            <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-amber-900">
                <span>Peso Volumétrico: <strong>{resultadoSimulacion.pesoVolumetricoKg} kg</strong></span>
                <span>Categoría: <strong>{resultadoSimulacion.categoria}</strong></span>
                {resultadoSimulacion.esDGR && (
                  <span className="text-rose-700 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Mercancía Peligrosa DGR
                  </span>
                )}
              </div>
              <p className="text-slate-700 italic max-w-2xl">
                {resultadoSimulacion.motivo}
              </p>
            </div>
          </div>

          {/* Matriz Oficial de Reglas Técnicas */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <span>Matriz Oficial de Criterios Logísticos de Envío (Changan Overseas Parts)</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-4">Categoría Estructural</th>
                    <th className="py-2.5 px-3 text-center">Transporte Recomendado</th>
                    <th className="py-2.5 px-4">Límite de Peso</th>
                    <th className="py-2.5 px-4">Criterio Dimensional / Cubicaje</th>
                    <th className="py-2.5 px-4">Justificación Técnica Logística</th>
                    <th className="py-2.5 px-4">Ejemplos Clave</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {REGLAS_CLASIFICACION_ENVIO.map((regla) => (
                    <tr key={regla.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {regla.nombre}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          regla.transporteRecomendado === 'Aereo'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        }`}>
                          {regla.transporteRecomendado === 'Aereo' ? (
                            <Plane className="w-3 h-3 text-sky-600" />
                          ) : (
                            <Ship className="w-3 h-3 text-indigo-600" />
                          )}
                          <span>{regla.transporteRecomendado}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{regla.criterioPeso}</td>
                      <td className="py-3 px-4 text-slate-700">{regla.criterioVolumen}</td>
                      <td className="py-3 px-4 text-slate-600 leading-relaxed">{regla.descripcionTecnica}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {regla.ejemplosRepuestos.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: CONSOLIDADO_SUCURSALES                         */}
      {/* ========================================================= */}
      {pestanaActiva === 'Consolidado_Sucursales' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Consolidado Quincenal por Sucursal</h3>
              <p className="text-xs text-slate-500">Distribución de piezas solicitadas, balance Aéreo/Marítimo y peso proyectado.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg border border-sky-200">
              Periodo: {quincenaSeleccionada}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {consolidadoSucursales.map((suc) => (
              <div key={suc.sucursal} className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{suc.sucursal}</h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {suc.piezasTotales} piezas
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Líneas distintas:</span>
                    <strong className="text-slate-900">{suc.lineas}</strong>
                  </div>
                  <div className="flex justify-between text-sky-700">
                    <span className="flex items-center gap-1">
                      <Plane className="w-3 h-3" /> Envío Aéreo:
                    </span>
                    <strong>{suc.piezasAereo} piezas</strong>
                  </div>
                  <div className="flex justify-between text-indigo-700">
                    <span className="flex items-center gap-1">
                      <Ship className="w-3 h-3" /> Envío Marítimo:
                    </span>
                    <strong>{suc.piezasMaritimo} piezas</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Peso estimado:</span>
                    <strong>~{suc.pesoTotalKg.toFixed(1)} kg</strong>
                  </div>
                  {suc.urgenciasVor > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold pt-1 border-t border-slate-200">
                      <span>Unidades Paradas VOR:</span>
                      <span>{suc.urgenciasVor}</span>
                    </div>
                  )}
                </div>

                {/* Barra de proporción Aéreo vs Marítimo */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-sky-500 h-full" 
                    style={{ width: `${suc.piezasTotales > 0 ? (suc.piezasAereo / suc.piezasTotales) * 100 : 50}%` }}
                    title={`Aéreo: ${suc.piezasAereo} piezas`}
                  ></div>
                  <div 
                    className="bg-indigo-600 h-full" 
                    style={{ width: `${suc.piezasTotales > 0 ? (suc.piezasMaritimo / suc.piezasTotales) * 100 : 50}%` }}
                    title={`Marítimo: ${suc.piezasMaritimo} piezas`}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Sucursal</th>
                  <th className="py-2.5 px-4 text-center">Líneas Solicitadas</th>
                  <th className="py-2.5 px-4 text-center">Total Piezas</th>
                  <th className="py-2.5 px-4 text-center text-sky-800">Piezas Aéreo</th>
                  <th className="py-2.5 px-4 text-center text-indigo-800">Piezas Marítimo</th>
                  <th className="py-2.5 px-4 text-center">% Aéreo</th>
                  <th className="py-2.5 px-4 text-right">Peso Estimado</th>
                  <th className="py-2.5 px-4 text-center">Unidades VOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {consolidadoSucursales.map((s) => (
                  <tr key={s.sucursal} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.sucursal}</td>
                    <td className="py-3 px-4 text-center">{s.lineas}</td>
                    <td className="py-3 px-4 text-center font-bold">{s.piezasTotales}</td>
                    <td className="py-3 px-4 text-center font-semibold text-sky-700">{s.piezasAereo}</td>
                    <td className="py-3 px-4 text-center font-semibold text-indigo-700">{s.piezasMaritimo}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      {s.piezasTotales > 0 ? `${((s.piezasAereo / s.piezasTotales) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{s.pesoTotalKg.toFixed(1)} kg</td>
                    <td className="py-3 px-4 text-center">
                      {s.urgenciasVor > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                          {s.urgenciasVor} VOR
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 4: DETALLE_PEDIDOS_MES (TRAZABILIDAD COMPLETA)     */}
      {/* ========================================================= */}
      {pestanaActiva === 'Detalle_Pedidos_Mes' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trazabilidad Línea por Línea de Pedidos Especiales</h3>
              <p className="text-xs text-slate-500">Mapeo de cada repuesto con su orden de trabajo (OR), cliente, modelo Changan y justificación técnica.</p>
            </div>
            <span className="text-xs text-slate-500">
              Mostrando {items.length} registros quincenales
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Pedido / OR</th>
                  <th className="py-2.5 px-3">Sucursal</th>
                  <th className="py-2.5 px-4">Modelo Changan / VIN</th>
                  <th className="py-2.5 px-3 font-mono">Parts Code</th>
                  <th className="py-2.5 px-4">Descripción Repuesto</th>
                  <th className="py-2.5 px-2 text-center">Cant</th>
                  <th className="py-2.5 px-3 text-center">Transporte</th>
                  <th className="py-2.5 px-4">Motivo Logístico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div>{it.pedidoId || 'N/A'}</div>
                      <span className="text-[10px] text-slate-400">{it.numeroOR || 'Sin OR'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{it.sucursal || 'Central'}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{it.modeloChangan || 'General'}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">{it.vin || 'Sin VIN'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{it.partsCode}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-medium">{it.comment}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900">{it.orderingQuantity}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        it.categorizacion === 'Aereo'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {it.categorizacion === 'Aereo' ? <Plane className="w-3 h-3" /> : <Ship className="w-3 h-3" />}
                        <span>{it.categorizacion}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px] leading-snug">
                      {it.motivoClasificacion || 'Clasificación estándar por peso y cubicaje.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 5: PROTOCOLO_DGR_AIRBAG (MERCANCÍAS PELIGROSAS)    */}
      {/* ========================================================= */}
      {pestanaActiva === 'Protocolo_DGR_Airbag' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
          <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-xl text-rose-700">
                <ShieldAlert className="w-8 h-8 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-950">
                  Protocolo de Seguridad DGR (Dangerous Goods Regulations) - IATA Clase 9
                </h3>
                <p className="text-xs text-rose-900 leading-relaxed">
                  Normativa internacional obligatoria para importaciones aéreas y marítimas de componentes de seguridad automotriz Changan que incorporan actuadores pirotécnicos, gases a presión o celdas de iones de litio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                  UN 3268 - CLASE 9
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-2">Bolsas de Aire (Airbags) & Pretensores</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Los módulos de Airbag (conductor, acompañante, laterales y cortina) poseen un generador de gas de azida o propulsor sólido.
                </p>
                <div className="mt-3 text-xs bg-amber-50 p-2.5 rounded border border-amber-200 text-amber-900">
                  <strong>Regla de Transporte:</strong> En avión civil de pasajeros está terminantemente prohibido sin embalaje UN certificado. Se aplica tarifa penal de ~$250 USD por bulto. <strong>Recomendación: Consolidar en contenedor marítimo FCL/LCL</strong>.
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">
                  UN 3480 / UN 3481
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-2">Baterías de Tracción Híbridas / EV</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Baterías de alta tensión y acumuladores de gran capacidad de modelos híbridos Changan (Deepal / UNI-K iDD / Hunter EV).
                </p>
                <div className="mt-3 text-xs bg-purple-50 p-2.5 rounded border border-purple-200 text-purple-900">
                  <strong>Regla de Transporte:</strong> Solo permitidas en vuelos de carga con estado de carga (SoC) menor al 30% y homologación UN 38.3. Embarque habitual: <strong>Marítimo exclusivo</strong>.
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                  UN 3159 - CLASE 2.2
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-2">Gases Refrigerantes (R134a / R1234yf)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Botellas presurizadas de gas licuado para sistemas de climatización de cabina.
                </p>
                <div className="mt-3 text-xs bg-blue-50 p-2.5 rounded border border-blue-200 text-blue-900">
                  <strong>Regla de Transporte:</strong> Gas no inflamable no tóxico. Por política de costo se recomienda suministro de recarga local en Panamá o marítimo.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AGREGAR O EDITAR REPUESTO EN ORDERING TEMPLATE     */}
      {/* ========================================================= */}
      {modalNuevoAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {itemEnEdicion ? 'Editar Repuesto en Reporte Fábrica' : 'Agregar Repuesto al Cuadro de Pedidos Especiales'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarFormulario} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Parts Code (Código OEM Changan) *</label>
                  <input
                    type="text"
                    required
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    placeholder="Ej: B511F271301-0200"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Ordering Quantity (Cantidad) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formCantidad}
                    onChange={(e) => setFormCantidad(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800">Comment (Descripción en Inglés / Español) *</label>
                  <button
                    type="button"
                    onClick={handleAutoclasificarEnForm}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                  >
                    <span>Auto-clasificar por estructura</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formComentario}
                  onChange={(e) => setFormComentario(e.target.value)}
                  placeholder="Ej: FR BUMPER, COOLING FAN ASSY, AIR CLEANER..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Selección manual o validada de transporte */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="font-bold text-slate-800 block mb-2">
                  Categorización de Transporte (Aéreo vs Marítimo)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormTransporte('Aereo')}
                    className={`p-2.5 rounded-xl border text-center font-bold flex items-center justify-center gap-2 transition ${
                      formTransporte === 'Aereo'
                        ? 'bg-sky-600 text-white border-sky-700 shadow ring-2 ring-sky-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Plane className="w-4 h-4" />
                    <span>Aéreo (Air Freight)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTransporte('Maritimo')}
                    className={`p-2.5 rounded-xl border text-center font-bold flex items-center justify-center gap-2 transition ${
                      formTransporte === 'Maritimo'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow ring-2 ring-indigo-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Ship className="w-4 h-4" />
                    <span>Marítimo (Ocean Freight)</span>
                  </button>
                </div>
              </div>

              {/* Medidas y peso técnico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Peso Unit. (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPeso}
                    onChange={(e) => setFormPeso(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-center text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Largo (cm)</label>
                  <input
                    type="number"
                    value={formLargo}
                    onChange={(e) => setFormLargo(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-center text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Ancho (cm)</label>
                  <input
                    type="number"
                    value={formAncho}
                    onChange={(e) => setFormAncho(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-center text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Alto (cm)</label>
                  <input
                    type="number"
                    value={formAlto}
                    onChange={(e) => setFormAlto(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-center text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Sucursal</label>
                  <select
                    value={formSucursal}
                    onChange={(e) => setFormSucursal(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Villa Lucre">Villa Lucre</option>
                    <option value="Costa Verde">Costa Verde</option>
                    <option value="Calle 50">Calle 50</option>
                    <option value="Tumba Muerto">Tumba Muerto</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Modelo Changan</label>
                  <input
                    type="text"
                    value={formModelo}
                    onChange={(e) => setFormModelo(e.target.value)}
                    placeholder="Ej: UNI-T, CS55 Plus..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Cliente / Ref</label>
                  <input
                    type="text"
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalNuevoAbierto(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-900/20"
                >
                  {itemEnEdicion ? 'Actualizar Repuesto' : 'Agregar al Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
