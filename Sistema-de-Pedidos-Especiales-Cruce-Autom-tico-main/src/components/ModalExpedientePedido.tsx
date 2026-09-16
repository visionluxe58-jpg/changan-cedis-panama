import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Edit3, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Send,
  MessageCircle,
  AlertTriangle,
  User,
  Building2,
  Box,
  Layers
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';
import { FilaMatrizCentral, SolicitudCabecera, DetalleRepuesto, BitacoraNota } from '../types/cedis';
import { normalizarEstatusLogistico, CORREO_REMITENTE_OFICIAL } from '../utils/notificacionesPedido';

interface ModalExpedientePedidoProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string | null;
  filasMatriz: FilaMatrizCentral[];
  onActualizar: () => void;
  onEditarPedido: (pedidoId: string) => void;
  onEliminarPedido: (pedidoId: string) => void;
  onAbrirNotificacion: (datosPedido: any, estatus: string) => void;
  onImprimirComprobante?: (pedidoId: string) => void;
}

const ESTATUS_RAPIDOS = [
  { id: 'Pendiente', label: 'Pendiente' },
  { id: 'En Tránsito', label: 'En Tránsito' },
  { id: 'En Bodega CEDIS', label: 'En Bodega CEDIS' },
  { id: 'Esperando Envío', label: 'Esperando Envío' },
  { id: 'Despachado a Sucursal', label: 'Despachado a Sucursal' },
  { id: 'Recibido en Sucursal', label: 'Recibido en Sucursal' }
];

export const ModalExpedientePedido: React.FC<ModalExpedientePedidoProps> = ({
  isOpen,
  onClose,
  pedidoId,
  filasMatriz,
  onActualizar,
  onEditarPedido,
  onEliminarPedido,
  onAbrirNotificacion,
  onImprimirComprobante
}) => {
  const [nuevaNota, setNuevaNota] = useState<string>('');
  const [categoriaNota, setCategoriaNota] = useState<string>('Nota General');
  const [notas, setNotas] = useState<BitacoraNota[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Cargar datos
  const cabeceras = appsScriptClient.getCabeceras();
  const detalles = appsScriptClient.getDetalles();

  const cabecera = useMemo(() => {
    return cabeceras.find(c => c.pedidoId === pedidoId) || null;
  }, [cabeceras, pedidoId]);

  const items = useMemo(() => {
    const list = detalles.filter(d => d.pedidoId === pedidoId);
    if (list.length > 0) return list;
    // Fallback a filasMatriz
    return filasMatriz.filter(f => f.pedidoId === pedidoId).map(f => ({
      lineaId: f.lineaId,
      pedidoId: f.pedidoId,
      codigoRepuesto: f.codigoRepuesto,
      codigoActualizado: f.codigoActualizado,
      descripcionOficial: f.descripcionOficial,
      cantidadSolicitada: f.cantidadSolicitada,
      cantidadAsignada: f.cantidadAsignada,
      cantidadDespachada: f.cantidadDespachada,
      contenedorAsignado: f.contenedorAsignado,
      palletAsignado: f.palletAsignado,
      packageNo: f.packageNo,
      ubicacionCedis: f.ubicacionCedis,
      estatusLinea: f.estatusLinea
    }));
  }, [detalles, pedidoId, filasMatriz]);

  // Cargar notas de bitácora
  useEffect(() => {
    if (!isOpen || !pedidoId) return;
    const n = appsScriptClient.getNotasPedido(pedidoId);
    if (n.length === 0 && cabecera) {
      // Nota de bienvenida inicial si está vacía
      const inicial = appsScriptClient.agregarNotaPedido(
        pedidoId,
        `Expediente iniciado en CEDIS para ${cabecera.cliente} (${cabecera.modeloChangan}). Solicitud registrada por ${cabecera.colaborador}.`,
        'Nota General'
      );
      setNotas([inicial]);
    } else {
      setNotas(n);
    }
  }, [isOpen, pedidoId, cabecera]);

  if (!isOpen || !pedidoId) return null;

  const estatusActual = cabecera?.estatusGeneral || (items[0] ? (items[0] as any).estatusGeneral : 'Pendiente') || 'Pendiente';
  const metaEstatus = normalizarEstatusLogistico(estatusActual);

  const handleCambiarEstatusRapido = async (nuevoEstatus: string) => {
    if (nuevoEstatus.toLowerCase() === estatusActual.toLowerCase()) return;

    const res = await appsScriptClient.cambiarEstatusPedido(
      pedidoId,
      nuevoEstatus,
      `Estatus logístico actualizado a: ${nuevoEstatus} desde el control rápido.`
    );

    if (res.success) {
      setMensajeExito(`Estatus actualizado a "${nuevoEstatus}".`);
      setTimeout(() => setMensajeExito(null), 3000);
      onActualizar();
      setNotas(appsScriptClient.getNotasPedido(pedidoId));

      // Abrir modal de notificación automáticamente para enviar por changanBodega2@outlook.es o WhatsApp
      onAbrirNotificacion(
        {
          pedidoId,
          fechaCreacion: cabecera?.fechaCreacion || new Date().toISOString(),
          sucursal: cabecera?.sucursal || '',
          colaborador: cabecera?.colaborador || '',
          cliente: cabecera?.cliente || '',
          placa: cabecera?.placa || '',
          modeloChangan: cabecera?.modeloChangan || '',
          cotizacion: cabecera?.cotizacion || '',
          canal: cabecera?.canal || 'Taller',
          tipoPedido: cabecera?.tipoPedido || 'Especial',
          estadoPago: cabecera?.estadoPago || 'GARANTIA',
          estatusActual: nuevoEstatus,
          items: items.map(i => ({
            codigoRepuesto: i.codigoRepuesto,
            descripcionOficial: i.descripcionOficial,
            cantidadSolicitada: i.cantidadSolicitada,
            cantidadAsignada: i.cantidadAsignada,
            cantidadDespachada: i.cantidadDespachada,
            palletAsignado: i.palletAsignado,
            contenedorAsignado: i.contenedorAsignado,
            estatusLinea: i.estatusLinea
          }))
        },
        nuevoEstatus
      );
    }
  };

  const handleAgregarNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNota.trim()) return;

    const notaAgregada = appsScriptClient.agregarNotaPedido(pedidoId, nuevaNota.trim(), categoriaNota);
    setNotas(prev => [notaAgregada, ...prev]);
    setNuevaNota('');
  };

  const sucursalTexto = cabecera?.sucursal || (items[0] ? (items[0] as any).sucursal : 'CEDIS Central') || 'CEDIS';
  const clienteTexto = cabecera?.cliente || (items[0] ? (items[0] as any).cliente : 'No especificado');
  const placaTexto = cabecera?.placa || (items[0] ? (items[0] as any).placa : 'Sin placa');
  const cotizacionTexto = cabecera?.cotizacion || (items[0] ? (items[0] as any).cotizacion : 'GARANTIA');
  const modeloTexto = cabecera?.modeloChangan || (items[0] ? (items[0] as any).modeloChangan : 'Changan');
  const estadoPagoTexto = cabecera?.estadoPago || 'No Pagado (Pendiente)';
  const facturaTexto = cabecera?.documentoPagoFactura || 'N/A (Pendiente)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0a111e] border border-cyan-500/50 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Cabecera idéntica a Imagen 3 */}
        <div className="bg-[#0b1626] border-b border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                  EXPEDIENTE DE PEDIDO ESPECIAL
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {estatusActual}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-mono font-bold text-white tracking-wide">
                {pedidoId} <span className="text-slate-400 font-normal">&mdash;</span> {sucursalTexto}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onImprimirComprobante && (
              <button
                type="button"
                onClick={() => onImprimirComprobante(pedidoId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
                title="Imprimir boleta o comprobante oficial"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onEditarPedido(pedidoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar pedido ${pedidoId}?`)) {
                  appsScriptClient.eliminarPedido(pedidoId);
                  onEliminarPedido(pedidoId);
                  onActualizar();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* Notificación rápida de éxito */}
        {mensajeExito && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 px-4 py-2 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Contenido con Scroll */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto text-xs">
          {/* CONTROL RÁPIDO DE ESTATUS LOGÍSTICO (Imagen 3) */}
          <div className="bg-[#0c1626] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                CONTROL RÁPIDO DE ESTATUS LOGÍSTICO:
              </span>
              <button
                type="button"
                onClick={() =>
                  onAbrirNotificacion(
                    {
                      pedidoId,
                      fechaCreacion: cabecera?.fechaCreacion || new Date().toISOString(),
                      sucursal: sucursalTexto,
                      colaborador: cabecera?.colaborador || '',
                      cliente: clienteTexto,
                      placa: placaTexto,
                      modeloChangan: modeloTexto,
                      cotizacion: cotizacionTexto,
                      canal: cabecera?.canal || 'Taller',
                      tipoPedido: cabecera?.tipoPedido || 'Especial',
                      estadoPago: estadoPagoTexto,
                      estatusActual,
                      items: items.map(i => ({
                        codigoRepuesto: i.codigoRepuesto,
                        descripcionOficial: i.descripcionOficial,
                        cantidadSolicitada: i.cantidadSolicitada,
                        cantidadAsignada: i.cantidadAsignada,
                        cantidadDespachada: i.cantidadDespachada,
                        palletAsignado: i.palletAsignado,
                        contenedorAsignado: i.contenedorAsignado,
                        estatusLinea: i.estatusLinea
                      }))
                    },
                    estatusActual
                  )
                }
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Mail className="w-3 h-3" />
                <span>Notificar por Correo ({CORREO_REMITENTE_OFICIAL}) / WhatsApp</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {ESTATUS_RAPIDOS.map(btn => {
                const activo = estatusActual.toLowerCase().includes(btn.id.toLowerCase());
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleCambiarEstatusRapido(btn.id)}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition border text-center cursor-pointer ${
                      activo
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Cards de Datos (Imagen 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0c1626] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase font-bold text-slate-400">CLIENTE</div>
              <div className="font-bold text-white text-xs mt-0.5 truncate" title={clienteTexto}>
                {clienteTexto}
              </div>
            </div>

            <div className="bg-[#0c1626] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase font-bold text-slate-400">PLACA / COTIZACIÓN</div>
              <div className="font-bold text-cyan-400 text-xs mt-0.5 font-mono">
                {placaTexto} {cotizacionTexto ? `(${cotizacionTexto})` : ''}
              </div>
            </div>

            <div className="bg-[#0c1626] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase font-bold text-slate-400">MODELO CHANGAN</div>
              <div className="font-bold text-white text-xs mt-0.5 truncate">
                {modeloTexto}
              </div>
            </div>

            <div className="bg-[#0c1626] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase font-bold text-slate-400">ESTADO PAGO</div>
              <div className="font-semibold text-amber-300 text-xs mt-0.5 truncate">
                {estadoPagoTexto} &ndash; {facturaTexto}
              </div>
            </div>
          </div>

          {/* Repuestos en esta Solicitud (Imagen 3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Repuestos en esta Solicitud:</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {items.length} repuestos
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">CÓDIGO</th>
                    <th className="p-3">DESCRIPCIÓN</th>
                    <th className="p-3 text-center">SOL.</th>
                    <th className="p-3 text-center">ASIG.</th>
                    <th className="p-3">CONTENEDOR</th>
                    <th className="p-3">UBICACIÓN CEDIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {items.map(it => (
                    <tr key={it.lineaId} className="hover:bg-slate-900/40">
                      <td className="p-3 font-mono font-bold text-cyan-400">
                        {it.codigoRepuesto}
                      </td>
                      <td className="p-3 font-medium text-slate-200">
                        {it.descripcionOficial}
                      </td>
                      <td className="p-3 text-center font-bold text-white">
                        {it.cantidadSolicitada}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400">
                        {it.cantidadAsignada}
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        {it.contenedorAsignado || 'Pendiente'}
                      </td>
                      <td className="p-3 text-slate-400">
                        {it.ubicacionCedis || (it.palletAsignado ? `Pallet ${it.palletAsignado}` : 'N/A')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BITÁCORA DE OBSERVACIONES Y LLAMADAS A SUCURSAL (Imagen 3) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs tracking-wide">
              <MessageCircle className="w-4 h-4" />
              <span>BITÁCORA DE OBSERVACIONES Y LLAMADAS A SUCURSAL</span>
            </div>

            {/* Input + Categoría + Botón Agregar (Imagen 3) */}
            <form onSubmit={handleAgregarNota} className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                placeholder="Registrar nota, llamada a sucursal, o alerta de facturación..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />

              <select
                value={categoriaNota}
                onChange={(e) => setCategoriaNota(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="Nota General">Nota General</option>
                <option value="Llamada a Sucursal">Llamada a Sucursal</option>
                <option value="Alerta Logística">Alerta Logística</option>
                <option value="Facturación">Facturación</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition cursor-pointer"
              >
                Agregar
              </button>
            </form>

            {/* Lista de notas históricas (Imagen 3) */}
            <div className="space-y-2">
              {notas.map(n => (
                <div
                  key={n.id}
                  className="bg-[#0b1524] border border-slate-800 rounded-xl p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <span>{n.autor}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-400 font-normal">({n.sucursal})</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 ml-1">
                        {n.categoria}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {n.fecha}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed font-sans text-xs">
                    {n.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
