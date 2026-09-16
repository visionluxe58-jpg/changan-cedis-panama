import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  Search,
  ShieldAlert,
  User
} from 'lucide-react';
import React, { useState } from 'react';
import { CHANGAN_BRANCHES } from '../data/mockData';
import { SpecialOrder } from '../types';

interface BillingAlertsViewProps {
  orders: SpecialOrder[];
  onUpdateOrder: (order: SpecialOrder) => void;
}

const BRANCH_CONTACTS: Record<
  string,
  { phone: string; manager: string; billingEmail: string }
> = {
  'Costa Verde': {
    phone: '+507 253-9010',
    manager: 'Carlos Samudio',
    billingEmail: 'facturacion.costaverde@changanpanama.com',
  },
  'Calle 50': {
    phone: '+507 264-8800',
    manager: 'Eduardo Morales',
    billingEmail: 'facturacion.calle50@changanpanama.com',
  },
  'Tumba Muerto': {
    phone: '+507 236-4100',
    manager: 'Marlon Arrocha',
    billingEmail: 'facturacion.tumbamuerto@changanpanama.com',
  },
  'Villa Lucre': {
    phone: '+507 277-5020',
    manager: 'Roberto Cedeño',
    billingEmail: 'facturacion.villalucre@changanpanama.com',
  },
  'Chiriquí': {
    phone: '+507 775-1290',
    manager: 'Marisol Pitty',
    billingEmail: 'facturacion.david@changanpanama.com',
  },
  'Santa María': {
    phone: '+507 302-8811',
    manager: 'Fernando Varela',
    billingEmail: 'facturacion.santamaria@changanpanama.com',
  },
};

export const BillingAlertsView: React.FC<BillingAlertsViewProps> = ({
  orders,
  onUpdateOrder,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [activeCallOrder, setActiveCallOrder] = useState<SpecialOrder | null>(null);
  const [callNotes, setCallNotes] = useState('');
  const [callerName, setCallerName] = useState('Operador CEDIS Central');
  const [resolvedInvoiceNumber, setResolvedInvoiceNumber] = useState('');
  const [markAsFullyPaid, setMarkAsFullyPaid] = useState(false);

  // Orders that need billing attention:
  // 1. Arrived in branch or in CEDIS, but paymentStatus is "No Pagado" or "Abonado" and not yet officially billed
  const unbilledOrders = orders.filter((order) => {
    if (selectedBranch !== 'ALL' && order.branch !== selectedBranch) return false;
    return !order.isBilled || order.paymentStatus === 'No Pagado' || order.paymentStatus === 'Abonado';
  });

  const criticalOrders = unbilledOrders.filter(
    (o) => o.overallStatus === 'RECIBIDO EN SUCURSAL' || o.overallStatus === 'DESPACHADO'
  );

  const handleSaveCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallOrder || !callNotes.trim()) return;

    const nowIso = new Date().toISOString();
    const updated: SpecialOrder = {
      ...activeCallOrder,
      observations: [
        {
          id: `CALL-${Date.now()}`,
          date: nowIso,
          author: `${callerName} (Llamada a ${activeCallOrder.branch})`,
          content: callNotes.trim(),
          type: 'call_log',
        },
        ...activeCallOrder.observations,
      ],
    };

    if (markAsFullyPaid && resolvedInvoiceNumber.trim()) {
      updated.isBilled = true;
      updated.paymentStatus = 'Cancelado';
      updated.billingInvoiceNumber = resolvedInvoiceNumber.trim();
      updated.receiptOrInvoiceNumber = resolvedInvoiceNumber.trim();
    } else if (resolvedInvoiceNumber.trim()) {
      updated.billingInvoiceNumber = resolvedInvoiceNumber.trim();
    }

    onUpdateOrder(updated);
    setActiveCallOrder(null);
    setCallNotes('');
    setResolvedInvoiceNumber('');
    setMarkAsFullyPaid(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[90px] rounded-full pointer-events-none"></div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-ping"></span>
              <span className="text-[11px] uppercase tracking-widest text-rose-400 font-mono font-bold">
                MONITOR DE ALERTAS & SEGUIMIENTO DE FACTURACIÓN // CEDIS
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              Control de Repuestos No Facturados y Cobranzas
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Supervisión de piezas recibidas en bodega o despachadas a sucursales sin cancelación definitiva.
              Registre llamadas y gestione la regularización contable.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-rose-950/40 border border-rose-800/60 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-mono text-rose-300 block">
                Alertas Críticas (En Sucursal)
              </span>
              <span className="text-2xl font-bold font-mono text-rose-400">
                {criticalOrders.length}
              </span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/60 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-mono text-amber-300 block">
                Total Pendientes Pago
              </span>
              <span className="text-2xl font-bold font-mono text-amber-400">
                {unbilledOrders.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Contacts & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {CHANGAN_BRANCHES.map((b) => {
          const count = orders.filter(
            (o) => o.branch === b && (!o.isBilled || o.paymentStatus !== 'Cancelado')
          ).length;
          const info = BRANCH_CONTACTS[b];

          return (
            <div
              key={b}
              onClick={() => setSelectedBranch(selectedBranch === b ? 'ALL' : b)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedBranch === b
                  ? 'bg-slate-800 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span className="truncate">{b}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    count > 0 ? 'bg-rose-950 text-rose-400 border border-rose-800/50' : 'text-slate-500'
                  }`}
                >
                  {count} {count === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Phone className="w-2.5 h-2.5 text-cyan-400" />
                <span>{info.phone}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{info.manager}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Listado de Órdenes con Alertas de Facturación ({unbilledOrders.length})
            </h3>
          </div>
          {selectedBranch !== 'ALL' && (
            <button
              onClick={() => setSelectedBranch('ALL')}
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              Ver todas las sucursales
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                <th className="py-3 px-3.5">Nº Pedido</th>
                <th className="py-3 px-3">Sucursal / Contacto</th>
                <th className="py-3 px-3">Cliente / Placa</th>
                <th className="py-3 px-3">Estado Financiero</th>
                <th className="py-3 px-3">Estatus Físico Pieza</th>
                <th className="py-3 px-3">Última Observación</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {unbilledOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-mono">
                    ¡Excelente! No hay alertas pendientes de facturación en este momento.
                  </td>
                </tr>
              ) : (
                unbilledOrders.map((order) => {
                  const isDeliveredUnpaid =
                    order.overallStatus === 'RECIBIDO EN SUCURSAL' ||
                    order.overallStatus === 'DESPACHADO';

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isDeliveredUnpaid ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-white">
                        {order.orderNumber}
                        <div className="text-[10px] text-slate-500">{order.quotationNumber}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{order.branch}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {BRANCH_CONTACTS[order.branch]?.phone || 'CEDIS'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-300">{order.clientName}</div>
                        <div className="text-[10px] text-cyan-300 font-mono font-bold">
                          {order.plate} — {order.changanModel}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            order.paymentStatus === 'No Pagado'
                              ? 'bg-rose-950 text-rose-300 border-rose-700/60 animate-pulse'
                              : 'bg-amber-950 text-amber-300 border-amber-700/60'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                        {order.receiptOrInvoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {order.receiptOrInvoiceNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span
                          className={`font-bold ${
                            isDeliveredUnpaid ? 'text-rose-400 font-black' : 'text-slate-300'
                          }`}
                        >
                          {order.overallStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-400 max-w-[240px]">
                        {order.observations[0] ? (
                          <div className="truncate">
                            <span className="text-slate-300 font-mono text-[10px]">
                              [{order.observations[0].author.split('(')[0].trim()}]:
                            </span>{' '}
                            {order.observations[0].content}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Sin llamadas registradas</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setActiveCallOrder(order);
                            setResolvedInvoiceNumber(order.billingInvoiceNumber || '');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-mono font-bold transition-all mx-auto shadow-sm"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Registrar Llamada</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Log / Billing Resolution Modal */}
      {activeCallOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Registrar Seguimiento con Sucursal {activeCallOrder.branch}
                </h3>
              </div>
              <button
                onClick={() => setActiveCallOrder(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/50 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Orden:</span>
                <span className="text-white font-bold">{activeCallOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente / Placa:</span>
                <span className="text-cyan-300">
                  {activeCallOrder.clientName} ({activeCallOrder.plate})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono Sucursal:</span>
                <span className="text-emerald-400 font-bold">
                  {BRANCH_CONTACTS[activeCallOrder.branch]?.phone} ({BRANCH_CONTACTS[activeCallOrder.branch]?.manager})
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveCallLog} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Notas de la Conversación / Respuesta de la Sucursal <span className="text-cyan-400">*</span>
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={3}
                  placeholder="Ej. Se llamó a facturación de Costa Verde. Indican que el cliente cancela mañana a las 9:00 AM contra entrega."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  required
                ></textarea>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paidCheck"
                    checked={markAsFullyPaid}
                    onChange={(e) => setMarkAsFullyPaid(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="paidCheck" className="text-xs font-bold text-white cursor-pointer">
                    ¿La sucursal ya emitió la factura definitiva? (Marcar Cancelado)
                  </label>
                </div>

                {markAsFullyPaid && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Nº de Factura Emitida por la Sucursal:
                    </label>
                    <input
                      type="text"
                      value={resolvedInvoiceNumber}
                      onChange={(e) => setResolvedInvoiceNumber(e.target.value)}
                      placeholder="Ej. FAC-CV-2026-9950"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-cyan-500"
                      required={markAsFullyPaid}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCallOrder(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Guardar Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
