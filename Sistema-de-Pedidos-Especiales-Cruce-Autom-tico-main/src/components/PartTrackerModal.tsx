import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Box,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Layers,
  MapPin,
  Package,
  Search,
  Ship,
  Sparkles,
  Truck,
  User,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { ContainerManifestItem, ShippingContainer, SpecialOrder } from '../types';

interface PartTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SpecialOrder[];
  containers: ShippingContainer[];
  onOpenJarvisWithPrompt?: (prompt: string) => void;
  initialSearchQuery?: string;
}

export const PartTrackerModal: React.FC<PartTrackerModalProps> = ({
  isOpen,
  onClose,
  orders,
  containers,
  onOpenJarvisWithPrompt,
  initialSearchQuery = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sync initial query when opened
  React.useEffect(() => {
    if (initialSearchQuery) {
      setSearchTerm(initialSearchQuery);
    }
  }, [initialSearchQuery, isOpen]);

  // Clean search query
  const cleanTerm = searchTerm.trim().toUpperCase();

  // Search results calculation
  const searchResults = useMemo(() => {
    if (!cleanTerm || cleanTerm.length < 2) {
      return {
        matchedOrders: [],
        matchedContainers: [],
        totalRequested: 0,
        totalAssigned: 0,
        totalInContainers: 0,
        totalInTransit: 0,
        totalInCedis: 0,
        partFound: false,
      };
    }

    // 1. Search in orders
    const matchedOrders: Array<{
      order: SpecialOrder;
      item: {
        code: string;
        description: string;
        quantityRequested: number;
        quantityAssigned: number;
      };
    }> = [];

    let totalRequested = 0;
    let totalAssigned = 0;

    orders.forEach((ord) => {
      ord.items.forEach((it) => {
        if (
          it.code.toUpperCase().includes(cleanTerm) ||
          it.description.toUpperCase().includes(cleanTerm)
        ) {
          matchedOrders.push({
            order: ord,
            item: {
              code: it.code,
              description: it.description,
              quantityRequested: it.quantityRequested,
              quantityAssigned: it.quantityAssigned,
            },
          });
          totalRequested += it.quantityRequested;
          totalAssigned += it.quantityAssigned;
        }
      });
    });

    // 2. Search in all containers (active, in transit, received, historical)
    const matchedContainers: Array<{
      container: ShippingContainer;
      manifestItem: ContainerManifestItem;
      status: string;
    }> = [];

    let totalInContainers = 0;
    let totalInTransit = 0;
    let totalInCedis = 0;

    containers.forEach((cont) => {
      cont.items.forEach((item) => {
        if (
          item.code.toUpperCase().includes(cleanTerm) ||
          item.description.toUpperCase().includes(cleanTerm)
        ) {
          matchedContainers.push({
            container: cont,
            manifestItem: item,
            status: cont.arrivalStatus,
          });

          totalInContainers += item.totalQuantity;
          if (cont.arrivalStatus === 'En Tránsito' || cont.arrivalStatus === 'En Puerto / Aduana') {
            totalInTransit += item.totalQuantity;
          } else {
            totalInCedis += item.totalQuantity;
          }
        }
      });
    });

    const partFound = matchedOrders.length > 0 || matchedContainers.length > 0;

    return {
      matchedOrders,
      matchedContainers,
      totalRequested,
      totalAssigned,
      totalInContainers,
      totalInTransit,
      totalInCedis,
      partFound,
    };
  }, [cleanTerm, orders, containers]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAskJarvis = () => {
    if (onOpenJarvisWithPrompt && cleanTerm) {
      onOpenJarvisWithPrompt(`¿El repuesto ${cleanTerm} fue solicitado por alguna sucursal y viene en algún contenedor en tránsito o recibido? Dame todos los detalles.`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in">
      <div className="bg-[#07090e] border border-cyan-500/50 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(6,182,212,0.35)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  RASTREADOR UNIVERSAL // CONTENEDORES & PEDIDOS
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Búsqueda Global de Repuestos Changan
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cleanTerm && (
              <button
                type="button"
                onClick={handleAskJarvis}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Consultar con JARVIS</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/30">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escriba el código de parte (ej. S111F260204, 1109011-M01) o nombre del repuesto..."
              className="w-full bg-slate-950 border-2 border-slate-700/80 focus:border-cyan-400 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white font-mono text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono text-slate-400">
            <span className="text-slate-500">Ejemplos rápidos:</span>
            {['S111F260204-0100', 'H15001-0800', '1109011-M01', '3501110-B01', 'Amortiguador'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setSearchTerm(sample)}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300 text-[11px] transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {!cleanTerm ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-300 font-mono">
                Ingrese un código de repuesto para escanear el sistema
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                El motor rastreará en tiempo real todos los pedidos de las 6 sucursales y todos los contenedores
                (en tránsito marítimo, aduanas, recibidos en CEDIS o históricos).
              </p>
            </div>
          ) : !searchResults.partFound ? (
            <div className="p-6 bg-rose-950/20 border border-rose-500/40 rounded-2xl text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-200 font-mono uppercase tracking-wider">
                  Repuesto No Encontrado en Base de Datos
                </h3>
                <p className="text-xs text-rose-300/80 mt-1 max-w-lg mx-auto">
                  El repuesto <strong>"{cleanTerm}"</strong> no figura en ningún pedido de sucursal ni en ningún
                  contenedor (ni en tránsito, ni en puerto, ni recibido en CEDIS).
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={handleAskJarvis}
                  className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/50 rounded-xl"
                >
                  Verificar con JARVIS AI
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              {/* Telemetry Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    1. En Pedidos de Sucursales
                  </span>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {searchResults.totalRequested} <span className="text-xs font-normal text-slate-400">unidades</span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 mt-1">
                    {searchResults.totalAssigned} ya asignadas / {searchResults.matchedOrders.length} pedidos
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    2. En Contenedores CEDIS
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {searchResults.totalInContainers} <span className="text-xs font-normal text-slate-400">unidades</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    En {searchResults.matchedContainers.length} embarques registrados
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    3. Estado Logístico
                  </span>
                  <div className="text-xl font-bold font-mono mt-1">
                    {searchResults.totalInCedis > 0 ? (
                      <span className="text-emerald-400">En Bodega CEDIS ({searchResults.totalInCedis} u.)</span>
                    ) : searchResults.totalInTransit > 0 ? (
                      <span className="text-cyan-400">En Tránsito ({searchResults.totalInTransit} u.)</span>
                    ) : (
                      <span className="text-amber-400">Pendiente de Embarque</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    {searchResults.totalInTransit > 0 ? `${searchResults.totalInTransit} u. en camino` : 'Sin tránsito activo'}
                  </div>
                </div>
              </div>

              {/* Section 1: Presencia en Contenedores */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Ship className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      ¿Viene en algún Contenedor? ({searchResults.matchedContainers.length} Embarques)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Importación Changan</span>
                </div>

                {searchResults.matchedContainers.length === 0 ? (
                  <div className="p-3 text-xs font-mono text-amber-400 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                    ⚠️ Este repuesto NO está registrado en ningún contenedor actual ni en tránsito. Se requiere emisión de PO a fábrica.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.matchedContainers.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyan-300">{item.container.containerNumber}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                              {item.container.type}
                            </span>
                            <span className="text-[11px] text-slate-400">Prov: {item.container.supplier}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            <strong>{item.manifestItem.code}</strong> — {item.manifestItem.description}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-3">
                            <span>Rack: <strong className="text-slate-200">{item.manifestItem.warehouseLocation}</strong></span>
                            <span>PO: <strong className="text-slate-200">{item.container.poNumber}</strong></span>
                            <span>Factura: <strong className="text-slate-200">{item.container.importInvoice}</strong></span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {item.manifestItem.totalQuantity} unidades
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.container.arrivalStatus === 'Recibido en CEDIS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                            }`}
                          >
                            {item.container.arrivalStatus} (ETA: {item.container.estimatedArrivalDate})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Solicitudes en Pedidos de Sucursales */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      ¿Fue solicitado en Pedidos Especiales? ({searchResults.matchedOrders.length} Pedidos)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Demanda de Sucursales</span>
                </div>

                {searchResults.matchedOrders.length === 0 ? (
                  <div className="p-3 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
                    ℹ️ Ninguna sucursal ha emitido solicitud activa para este repuesto en este momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.matchedOrders.map((elem, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{elem.order.orderNumber}</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-[10px] font-bold">
                              {elem.order.branch}
                            </span>
                            <span className="text-[11px] text-slate-400">{elem.order.clientName}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Vehículo: <strong className="text-cyan-300">{elem.order.vehicleModel}</strong> (VIN: {elem.order.vinNumber})
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Repuesto: <strong>{elem.item.code}</strong> — {elem.item.description}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-200">
                              Pedidas: <strong className="text-white">{elem.item.quantityRequested}</strong> | Asignadas:{' '}
                              <strong className="text-emerald-400">{elem.item.quantityAssigned}</strong>
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              elem.order.overallStatus === 'EN BODEGA CEDIS'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                                : elem.order.overallStatus === 'DESPACHADO'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {elem.order.overallStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Escaneo instantáneo sobre {orders.length} pedidos y {containers.length} embarques.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-mono uppercase"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
