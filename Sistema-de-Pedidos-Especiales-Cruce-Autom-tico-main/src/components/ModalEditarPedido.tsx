import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle, 
  Mail, 
  Save,
  Clock,
  Car
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';
import { SolicitudCabecera, DetalleRepuesto, FilaMatrizCentral } from '../types/cedis';
import { SUCURSALES_PORTAL, CATALOGO_MODELOS_CHANGAN } from '../data/sucursalesData';
import { normalizarValorSelectEstatus } from '../utils/notificacionesPedido';

interface ModalEditarPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string | null;
  filasMatriz: FilaMatrizCentral[];
  onPedidoGuardado: () => void;
  onEliminarPedido?: (pedidoId: string) => void;
  onAbrirNotificacion?: (datosPedido: any, estatus: string) => void;
}

interface ItemRepuestoForm {
  lineaId?: string;
  codigoRepuesto: string;
  descripcionOficial: string;
  cantidadSolicitada: number;
  cantidadAsignada: number;
  contenedorAsignado?: string;
  palletAsignado?: string;
}


// Error Boundary para proteger el modal contra datos corruptos (Ticket 5)
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class ModalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error en ModalEditarPedido:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-900 border border-rose-500/50 rounded-2xl max-w-lg mx-auto text-white space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle className="w-8 h-8" />
            <h3 className="text-base font-bold">Error al Cargar los Datos del Pedido</h3>
          </div>
          <p className="text-xs text-slate-300">
            El pedido contiene registros con formato inconsistente o valores nulos. Hemos protegido la pantalla para evitar que el sistema se congele.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg text-rose-300 font-mono text-[11px] overflow-auto max-h-32">
            {this.state.error?.message || 'Error desconocido al renderizar el formulario'}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={this.props.onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ModalEditarPedido: React.FC<ModalEditarPedidoProps> = ({
  isOpen,
  onClose,
  pedidoId,
  filasMatriz,
  onPedidoGuardado,
  onEliminarPedido,
  onAbrirNotificacion
}) => {
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notificarAlGuardar, setNotificarAlGuardar] = useState<boolean>(true);

  // Campos del Formulario
  const [numPedido, setNumPedido] = useState<string>('');
  const [sucursal, setSucursal] = useState<string>('Calle 50');
  const [canalVenta, setCanalVenta] = useState<string>('Mostrador');
  const [nombreCliente, setNombreCliente] = useState<string>('');
  const [placaAuto, setPlacaAuto] = useState<string>('');
  const [modeloChangan, setModeloChangan] = useState<string>('CS35 Plus');
  const [colaboradorAsesor, setColaboradorAsesor] = useState<string>('');
  const [numCotizacion, setNumCotizacion] = useState<string>('');
  const [tipoPedido, setTipoPedido] = useState<string>('Especial (Marítimo Regular)');
  const [estadoPago, setEstadoPago] = useState<string>('No Pagado (Pendiente)');
  const [numReciboFactura, setNumReciboFactura] = useState<string>('N/A (Pendiente)');
  const [estatusGeneral, setEstatusGeneral] = useState<string>('PENDIENTE');

  // Repuestos
  const [repuestos, setRepuestos] = useState<ItemRepuestoForm[]>([]);

  useEffect(() => {
    if (!isOpen || !pedidoId) return;

    setError(null);
    const cabeceras = appsScriptClient.getCabeceras();
    const detalles = appsScriptClient.getDetalles();

    const cab = cabeceras.find(c => c.pedidoId === pedidoId);
    const itemsDelPedido = detalles.filter(d => d.pedidoId === pedidoId);

    if (cab) {
      setNumPedido(cab.pedidoId);
      setSucursal(cab.sucursal || 'Calle 50');
      setCanalVenta(cab.canal || 'Mostrador');
      setNombreCliente(cab.cliente || 'SIN CLIENTE ASIGNADO');
      setPlacaAuto(cab.placa || '');
      setModeloChangan(cab.modeloChangan || 'CS35 Plus');
      setColaboradorAsesor(cab.colaborador || '');
      setNumCotizacion(cab.cotizacion || '');
      setTipoPedido(cab.tipoPedido || 'Especial (Marítimo Regular)');
      setEstadoPago(cab.estadoPago || 'No Pagado (Pendiente)');
      setNumReciboFactura(cab.documentoPagoFactura || 'N/A (Pendiente)');
      setEstatusGeneral(normalizarValorSelectEstatus(cab.estatusGeneral));
    } else {
      // Fallback usando las filas filtradas de la matriz
      const f = filasMatriz.find(row => row.pedidoId === pedidoId);
      if (f) {
        setNumPedido(f.pedidoId);
        setSucursal(f.sucursal);
        setNombreCliente(f.cliente || 'SIN CLIENTE ASIGNADO');
        setPlacaAuto(f.placa || '');
        setModeloChangan(f.modeloChangan || 'CS35 Plus');
        setColaboradorAsesor(f.colaborador || '');
        setNumCotizacion(f.cotizacion || '');
        setTipoPedido(f.tipoPedido || 'Especial (Marítimo Regular)');
        setEstatusGeneral(normalizarValorSelectEstatus(f.estatusGeneral));
      }
    }

    if (itemsDelPedido.length > 0) {
      setRepuestos(
        itemsDelPedido.map(d => ({
          lineaId: d.lineaId,
          codigoRepuesto: d.codigoRepuesto,
          descripcionOficial: d.descripcionOficial,
          cantidadSolicitada: d.cantidadSolicitada,
          cantidadAsignada: d.cantidadAsignada,
          contenedorAsignado: d.contenedorAsignado,
          palletAsignado: d.palletAsignado
        }))
      );
    } else {
      const itemsDesdeFilas = filasMatriz.filter(row => row.pedidoId === pedidoId);
      if (itemsDesdeFilas.length > 0) {
        setRepuestos(
          itemsDesdeFilas.map(d => ({
            lineaId: d.lineaId,
            codigoRepuesto: d.codigoRepuesto,
            descripcionOficial: d.descripcionOficial,
            cantidadSolicitada: d.cantidadSolicitada,
            cantidadAsignada: d.cantidadAsignada,
            contenedorAsignado: d.contenedorAsignado,
            palletAsignado: d.palletAsignado
          }))
        );
      } else {
        setRepuestos([
          {
            codigoRepuesto: '',
            descripcionOficial: '',
            cantidadSolicitada: 1,
            cantidadAsignada: 0
          }
        ]);
      }
    }
  }, [isOpen, pedidoId, filasMatriz]);

  if (!isOpen || !pedidoId) return null;

  const handleAgregarRepuesto = () => {
    setRepuestos(prev => [
      ...prev,
      {
        codigoRepuesto: '',
        descripcionOficial: '',
        cantidadSolicitada: 1,
        cantidadAsignada: 0
      }
    ]);
  };

  const handleRemoverRepuesto = (index: number) => {
    if (repuestos.length <= 1) {
      setError('El pedido debe tener al menos un repuesto.');
      return;
    }
    setRepuestos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRepuestoChange = (index: number, campo: keyof ItemRepuestoForm, valor: any) => {
    setRepuestos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [campo]: valor };
      return next;
    });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCliente.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const datosCabecera: Partial<SolicitudCabecera> = {
        sucursal,
        canal: canalVenta,
        cliente: nombreCliente.trim(),
        placa: placaAuto.trim().toUpperCase(),
        modeloChangan,
        colaborador: colaboradorAsesor.trim(),
        cotizacion: numCotizacion.trim(),
        tipoPedido: tipoPedido as any,
        estadoPago: estadoPago as any,
        documentoPagoFactura: numReciboFactura.trim(),
        estatusGeneral: estatusGeneral as any
      };

      const repuestosLimpios = repuestos.map(r => ({
        lineaId: r.lineaId,
        codigoRepuesto: r.codigoRepuesto.trim().toUpperCase(),
        descripcionOficial: r.descripcionOficial.trim() || 'Repuesto genuino Changan',
        cantidadSolicitada: Number(r.cantidadSolicitada) || 1,
        cantidadAsignada: Number(r.cantidadAsignada) || 0,
        contenedorAsignado: r.contenedorAsignado,
        palletAsignado: r.palletAsignado
      }));

      const res = await appsScriptClient.actualizarPedido(numPedido, datosCabecera, repuestosLimpios);

      if (res.success) {
        onPedidoGuardado();
        onClose();

        if (notificarAlGuardar && onAbrirNotificacion) {
          onAbrirNotificacion(
            {
              pedidoId: numPedido,
              fechaCreacion: new Date().toISOString(),
              sucursal,
              colaborador: colaboradorAsesor,
              cliente: nombreCliente,
              placa: placaAuto,
              modeloChangan,
              cotizacion: numCotizacion,
              canal: canalVenta,
              tipoPedido,
              estadoPago,
              estatusActual: estatusGeneral,
              items: repuestosLimpios
            },
            estatusGeneral
          );
        }
      } else {
        setError(res.error || 'Error al guardar los cambios en el pedido.');
      }
    } catch (err: any) {
      setError('Error inesperado: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm(`¿Está completamente seguro de eliminar el pedido ${numPedido}? Esta acción removerá el pedido de la Matriz Central y devolverá cualquier pieza asignada al stock libre.`)) {
      return;
    }

    setGuardando(true);
    const res = await appsScriptClient.eliminarPedido(numPedido);
    setGuardando(false);

    if (res.success) {
      if (onEliminarPedido) {
        onEliminarPedido(numPedido);
      }
      onPedidoGuardado();
      onClose();
    } else {
      setError(res.error || 'Error al eliminar el pedido.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b1320] border border-cyan-500/50 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Cabecera idéntica a la Imagen 2 */}
        <div className="bg-[#0c1626] border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow">
              <Edit3 className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide">
              Editar Pedido: <span className="text-cyan-400">{numPedido}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cerrar</span>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="p-4 sm:p-6 space-y-5 text-xs">
          {error && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid de 3 columnas para Datos Principales (Imagen 2) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fila 1 */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">Nº de Pedido *</label>
              <input
                type="text"
                value={numPedido}
                readOnly
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono opacity-80 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Sucursal</label>
              <select
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                {SUCURSALES_PORTAL.map(s => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Canal de Venta</label>
              <select
                value={canalVenta}
                onChange={(e) => setCanalVenta(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Mostrador">Mostrador</option>
                <option value="Taller">Taller</option>
                <option value="Chapistería">Chapistería</option>
                <option value="Garantía">Garantía</option>
                <option value="Flotas">Flotas</option>
                <option value="Aseguradoras">Aseguradoras</option>
              </select>
            </div>

            {/* Fila 2 */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">Nombre del Cliente *</label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Placa del Auto *</label>
              <input
                type="text"
                value={placaAuto}
                onChange={(e) => setPlacaAuto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400 uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Modelo Changan</label>
              <select
                value={modeloChangan}
                onChange={(e) => setModeloChangan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                {CATALOGO_MODELOS_CHANGAN.map(m => (
                  <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fila 3 */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">Colaborador / Asesor</label>
              <input
                type="text"
                value={colaboradorAsesor}
                onChange={(e) => setColaboradorAsesor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Nº Cotización</label>
              <input
                type="text"
                value={numCotizacion}
                onChange={(e) => setNumCotizacion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400 uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Tipo de Pedido</label>
              <select
                value={tipoPedido}
                onChange={(e) => setTipoPedido(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Especial (Marítimo Regular)">Especial (Marítimo Regular)</option>
                <option value="VOR / Unidad Parada">VOR / Unidad Parada</option>
                <option value="Garantía">Garantía</option>
                <option value="Chapistería y Colisión">Chapistería y Colisión</option>
                <option value="Taller Mecánico">Taller Mecánico</option>
                <option value="Stock Regular">Stock Regular</option>
              </select>
            </div>

            {/* Fila 4 */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">Estado de Pago</label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="No Pagado (Pendiente)">No Pagado (Pendiente)</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Pagado">Pagado</option>
                <option value="Facturado">Facturado</option>
                <option value="Exento (Garantía)">Exento (Garantía)</option>
                <option value="GARANTIA">GARANTIA</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Nº Recibo / Factura</label>
              <input
                type="text"
                value={numReciboFactura}
                onChange={(e) => setNumReciboFactura(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400 uppercase"
              />
            </div>

            <div>
              <label className="block text-cyan-400 font-bold mb-1">Estatus General</label>
              <select
                value={normalizarValorSelectEstatus(estatusGeneral)}
                onChange={(e) => setEstatusGeneral(e.target.value)}
                className="w-full bg-slate-950 border border-cyan-600/80 rounded-lg px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN TRÁNSITO">EN TRÁNSITO</option>
                <option value="EN BODEGA">EN BODEGA</option>
                <option value="POR ENVIAR">POR ENVIAR</option>
                <option value="DESPACHADO">DESPACHADO</option>
                <option value="RECIBIDO">RECIBIDO</option>
              </select>
            </div>
          </div>

          {/* Sección: Repuestos en el Pedido (Imagen 2) */}
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-xs tracking-wide">
                Repuestos en el Pedido ({repuestos.length}):
              </span>
              <button
                type="button"
                onClick={handleAgregarRepuesto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Repuesto</span>
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">CÓDIGO</th>
                    <th className="p-2.5">DESCRIPCIÓN</th>
                    <th className="p-2.5 text-center w-24">CANT. SOL.</th>
                    <th className="p-2.5 text-center w-24">CANT. ASIG.</th>
                    <th className="p-2.5 text-center w-16">BORRAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {repuestos.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-900/40">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.codigoRepuesto}
                          onChange={(e) => handleRepuestoChange(index, 'codigoRepuesto', e.target.value)}
                          placeholder="Código OEM..."
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-cyan-400 font-mono font-bold uppercase focus:outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.descripcionOficial}
                          onChange={(e) => handleRepuestoChange(index, 'descripcionOficial', e.target.value)}
                          placeholder="Descripción del repuesto..."
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 uppercase focus:outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidadSolicitada}
                          onChange={(e) => handleRepuestoChange(index, 'cantidadSolicitada', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-white font-bold focus:outline-none focus:border-cyan-400 mx-auto block"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.cantidadAsignada}
                          onChange={(e) => handleRepuestoChange(index, 'cantidadAsignada', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-emerald-400 font-bold focus:outline-none focus:border-cyan-400 mx-auto block"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoverRepuesto(index)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          title="Eliminar repuesto"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Opciones Adicionales: Notificar */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={notificarAlGuardar}
                onChange={(e) => setNotificarAlGuardar(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs">
                Notificar actualización automáticamente por Correo (<strong className="text-cyan-400">changanBodega2@outlook.es</strong>) o WhatsApp
              </span>
            </label>
            <Mail className="w-4 h-4 text-cyan-400" />
          </div>

          {/* Barra de Acciones Inferior (Imagen 2) */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleEliminar}
              disabled={guardando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-400 border border-rose-900 hover:bg-rose-950/50 hover:border-rose-700 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Pedido</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 uppercase tracking-wide transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{guardando ? 'Guardando...' : 'GUARDAR CAMBIOS'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
