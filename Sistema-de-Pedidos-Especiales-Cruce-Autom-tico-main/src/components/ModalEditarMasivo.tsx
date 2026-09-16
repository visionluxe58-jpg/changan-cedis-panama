import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  Check, 
  AlertCircle,
  CheckSquare, 
  Layers, 
  Mail, 
  Save, 
  Truck,
  Building2
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';
import { SUCURSALES_PORTAL } from '../data/sucursalesData';
import { CORREO_REMITENTE_OFICIAL } from '../utils/notificacionesPedido';

interface ModalEditarMasivoProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoIds: string[];
  onActualizadoExitoso: () => void;
  onAbrirNotificacionLote?: (pedidoIds: string[], estatus: string) => void;
}

export const ModalEditarMasivo: React.FC<ModalEditarMasivoProps> = ({
  isOpen,
  onClose,
  pedidoIds,
  onActualizadoExitoso,
  onAbrirNotificacionLote
}) => {
  const [estatusGeneral, setEstatusGeneral] = useState<string>('SIN_CAMBIO');
  const [sucursal, setSucursal] = useState<string>('SIN_CAMBIO');
  const [tipoPedido, setTipoPedido] = useState<string>('SIN_CAMBIO');
  const [estadoPago, setEstadoPago] = useState<string>('SIN_CAMBIO');
  const [colaborador, setColaborador] = useState<string>('SIN_CAMBIO');
  const [fechaDespacho, setFechaDespacho] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [notificar, setNotificar] = useState<boolean>(true);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAplicar = async (e: React.FormEvent) => {
    e.preventDefault();

    const cambios: any = {
      estatusGeneral,
      sucursal,
      tipoPedido,
      estadoPago,
      colaborador
    };

    const hayCambios = Object.values(cambios).some(v => v !== 'SIN_CAMBIO');
    if (!hayCambios) {
      setError('Seleccione al menos un campo para modificar masivamente.');
      return;
    }

    setProcesando(true);
    setError(null);

    const res = await appsScriptClient.actualizarPedidosMasivo(pedidoIds, cambios);
    setProcesando(false);

    if (res.success) {
      onActualizadoExitoso();
      onClose();

      if (notificar && estatusGeneral !== 'SIN_CAMBIO' && onAbrirNotificacionLote) {
        onAbrirNotificacionLote(pedidoIds, estatusGeneral);
      }
    } else {
      setError(res.error || 'Error al actualizar pedidos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1320] border border-cyan-500/50 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="bg-[#0c1727] border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Edición Masiva de Pedidos
              </h2>
              <div className="text-xs text-slate-400 font-mono">
                {pedidoIds.length} pedidos seleccionados en la Matriz
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleAplicar} className="p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-slate-300">
            Los campos seleccionados con un valor nuevo se aplicarán simultáneamente a los <strong className="text-cyan-400">{pedidoIds.length}</strong> pedidos seleccionados. Aquellos que deje en <em>&quot;Sin cambios&quot;</em> conservarán su valor original.
          </p>

          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            {/* Estatus General */}
            <div>
              <label className="block text-cyan-400 font-bold mb-1">
                Cambiar Estatus Logístico General:
              </label>
              <select
                value={estatusGeneral}
                onChange={(e) => setEstatusGeneral(e.target.value)}
                className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="SIN_CAMBIO">&mdash; Conservar estatus actual &mdash;</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN TRÁNSITO">EN TRÁNSITO</option>
                <option value="EN BODEGA CEDIS">EN BODEGA CEDIS</option>
                <option value="ESPERANDO ENVÍO">ESPERANDO ENVÍO</option>
                <option value="DESPACHADO A SUCURSAL">DESPACHADO A SUCURSAL</option>
                <option value="RECIBIDO EN SUCURSAL">RECIBIDO EN SUCURSAL</option>
              </select>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Cambiar Sucursal Destino:
              </label>
              <select
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="SIN_CAMBIO">&mdash; Conservar sucursales originales &mdash;</option>
                {SUCURSALES_PORTAL.map(s => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Pedido */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Cambiar Tipo / Prioridad de Pedido:
              </label>
              <select
                value={tipoPedido}
                onChange={(e) => setTipoPedido(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="SIN_CAMBIO">&mdash; Conservar prioridades originales &mdash;</option>
                <option value="VOR / Unidad Parada">VOR / Unidad Parada</option>
                <option value="Garantía">Garantía</option>
                <option value="Chapistería y Colisión">Chapistería y Colisión</option>
                <option value="Taller Mecánico">Taller Mecánico</option>
                <option value="Stock Regular">Stock Regular</option>
                <option value="Especial (Marítimo Regular)">Especial (Marítimo Regular)</option>
              </select>
            </div>

            {/* Estado de Pago */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Cambiar Estado de Pago:
              </label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="SIN_CAMBIO">&mdash; Conservar estado de pago &mdash;</option>
                <option value="No Pagado (Pendiente)">No Pagado (Pendiente)</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Pagado">Pagado</option>
                <option value="Facturado">Facturado</option>
                <option value="Exento (Garantía)">Exento (Garantía)</option>
              </select>
            </div>
          </div>

          {/* Notificar checkbox */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notificar}
                onChange={(e) => setNotificar(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700"
              />
              <span>
                Generar notificación de despacho / actualización ({CORREO_REMITENTE_OFICIAL})
              </span>
            </label>
            <Mail className="w-4 h-4 text-cyan-400" />
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={procesando}
              className="px-4 py-2 rounded-xl font-semibold text-slate-400 hover:text-white bg-slate-900 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={procesando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Continuar con {pedidoIds.length} Pedidos...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
