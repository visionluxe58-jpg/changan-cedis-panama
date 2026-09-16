import {
  AlertCircle,
  Box,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Upload,
  User,
  X,
  Zap
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { CHANGAN_BRANCHES, CHANGAN_MODELS, CHANNELS } from '../data/mockData';
import { exportOrdersToCsv } from '../utils/storage';
import {
  BranchName,
  Channel,
  OrderItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
  ShippingContainer,
  SpecialOrder
} from '../types';
import { downloadChanganOrdersTemplate, parseOrdersExcelFile } from '../utils/excelOrderParser';
import {
  GlobalCrossDockResult,
  runGlobalCrossDockMatching
} from '../utils/matchingEngine';

interface OrdersMasterTableProps {
  orders: SpecialOrder[];
  containers?: ShippingContainer[];
  isAdminUnlocked: boolean;
  onOpenSecurityModal: () => void;
  onUpdateOrder: (updatedOrder: SpecialOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onPrintLabelForOrder: (order: SpecialOrder) => void;
  onAddNewOrderClick: () => void;
  onImportOrders?: (importedOrders: SpecialOrder[]) => void;
  onOpenPartTracker?: (searchQuery?: string) => void;
  onUpdateContainersAndOrders?: (
    containers: ShippingContainer[],
    orders: SpecialOrder[],
    result: any
  ) => void;
}

export const OrdersMasterTable: React.FC<OrdersMasterTableProps> = ({
  orders,
  containers = [],
  isAdminUnlocked,
  onOpenSecurityModal,
  onUpdateOrder,
  onDeleteOrder,
  onPrintLabelForOrder,
  onAddNewOrderClick,
  onImportOrders,
  onOpenPartTracker,
  onUpdateContainersAndOrders,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCrossDockingGlobal, setIsCrossDockingGlobal] = useState(false);
  const [globalMatchResultModal, setGlobalMatchResultModal] = useState<GlobalCrossDockResult | null>(null);
  const [importSummary, setImportSummary] = useState<{
    totalOrders: number;
    totalItems: number;
    matchedReady: number;
    matchedPartial: number;
    warnings: string[];
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('ALL');

  // Detail Modal & Observation Modal State
  const [activeDetailOrder, setActiveDetailOrder] = useState<SpecialOrder | null>(null);
  const [newObservationText, setNewObservationText] = useState('');
  const [observationType, setObservationType] = useState<'general' | 'call_log' | 'billing_alert'>(
    'general'
  );

  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<SpecialOrder | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editBranch, setEditBranch] = useState<BranchName>('Costa Verde');
  const [editChannel, setEditChannel] = useState<Channel>('Taller');
  const [editOrderType, setEditOrderType] = useState<OrderType>('Especial');
  const [editCollaboratorName, setEditCollaboratorName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editChanganModel, setEditChanganModel] = useState('CS35 Plus');
  const [editVin, setEditVin] = useState('');
  const [editQuotationNumber, setEditQuotationNumber] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('Cancelado');
  const [editReceiptOrInvoiceNumber, setEditReceiptOrInvoiceNumber] = useState('');
  const [editOverallStatus, setEditOverallStatus] = useState<OrderStatus>('PENDIENTE');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

  // Filtered Orders with Deep Normalized Search
  const filteredOrders = useMemo(() => {
    const clean = (s: string) => (s || '').toLowerCase().trim();
    const normalize = (s: string) => clean(s).replace(/[\s\-_#./]/g, '');

    return orders.filter((order) => {
      // Branch filter
      if (selectedBranch !== 'ALL' && order.branch !== selectedBranch) return false;
      // Channel filter
      if (selectedChannel !== 'ALL' && order.channel !== selectedChannel) return false;
      // Status filter
      if (selectedStatus !== 'ALL' && order.overallStatus !== selectedStatus) return false;
      // Payment filter
      if (selectedPayment !== 'ALL' && order.paymentStatus !== selectedPayment) return false;
      // Order Type filter
      if (selectedOrderType !== 'ALL' && order.orderType !== selectedOrderType) return false;

      // Search term (tolerant to hyphens, spaces, and punctuation e.g. "PED 3445367" vs "PED-3445367" vs "3445367")
      if (searchTerm.trim()) {
        const q = clean(searchTerm);
        const normQ = normalize(searchTerm);

        const matchesOrderNum =
          clean(order.orderNumber).includes(q) ||
          normalize(order.orderNumber).includes(normQ) ||
          normQ.includes(normalize(order.orderNumber));
        const matchesQuotation =
          clean(order.quotationNumber).includes(q) ||
          normalize(order.quotationNumber).includes(normQ);
        const matchesReceipt =
          clean(order.receiptOrInvoiceNumber).includes(q) ||
          normalize(order.receiptOrInvoiceNumber).includes(normQ);
        const matchesClient =
          clean(order.clientName).includes(q) ||
          normalize(order.clientName).includes(normQ);
        const matchesPlate =
          clean(order.plate).includes(q) ||
          normalize(order.plate).includes(normQ);
        const matchesCollaborator =
          clean(order.collaboratorName).includes(q) ||
          normalize(order.collaboratorName).includes(normQ);
        const matchesBranch =
          clean(order.branch).includes(q) ||
          normalize(order.branch).includes(normQ);
        const matchesContainer =
          order.assignedContainerId &&
          (clean(order.assignedContainerId).includes(q) ||
            normalize(order.assignedContainerId).includes(normQ));
        const matchesItemCode = order.items.some(
          (i) =>
            clean(i.code).includes(q) ||
            normalize(i.code).includes(normQ) ||
            clean(i.description).includes(q) ||
            (i.updatedCode &&
              (clean(i.updatedCode).includes(q) || normalize(i.updatedCode).includes(normQ)))
        );
        const matchesObservations = order.observations.some((obs) =>
          clean(obs.content).includes(q)
        );

        if (
          !matchesOrderNum &&
          !matchesQuotation &&
          !matchesReceipt &&
          !matchesClient &&
          !matchesPlate &&
          !matchesCollaborator &&
          !matchesBranch &&
          !matchesContainer &&
          !matchesItemCode &&
          !matchesObservations
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    selectedBranch,
    selectedChannel,
    selectedStatus,
    selectedPayment,
    selectedOrderType,
    searchTerm,
  ]);

  const handleQuickStatusChange = (order: SpecialOrder, newStatus: OrderStatus) => {
    if (!isAdminUnlocked) {
      onOpenSecurityModal();
      return;
    }

    const updated: SpecialOrder = {
      ...order,
      overallStatus: newStatus,
      dispatchDate:
        newStatus === 'DESPACHADO' ? new Date().toISOString() : order.dispatchDate,
      branchReceivedDate:
        newStatus === 'RECIBIDO EN SUCURSAL'
          ? new Date().toISOString()
          : order.branchReceivedDate,
      items: order.items.map((it) => ({
        ...it,
        status: newStatus,
        quantityDispatched:
          newStatus === 'DESPACHADO' ? it.quantityAssigned : it.quantityDispatched,
      })),
    };

    updated.observations.unshift({
      id: `OBS-STAT-${Date.now()}`,
      date: new Date().toISOString(),
      author: 'CEDIS Operador',
      content: `Cambio de estatus manual a: ${newStatus}`,
      type: 'general',
    });

    onUpdateOrder(updated);
    if (activeDetailOrder?.id === order.id) {
      setActiveDetailOrder(updated);
    }
  };

  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetailOrder || !newObservationText.trim()) return;

    const newObs = {
      id: `OBS-${Date.now()}`,
      date: new Date().toISOString(),
      author: 'CEDIS Supervisor',
      content: newObservationText.trim(),
      type: observationType,
    };

    const updated: SpecialOrder = {
      ...activeDetailOrder,
      observations: [newObs, ...activeDetailOrder.observations],
    };

    onUpdateOrder(updated);
    setActiveDetailOrder(updated);
    setNewObservationText('');
  };

  const handleOpenEditOrder = (order: SpecialOrder) => {
    setEditingOrder(order);
    setEditOrderNumber(order.orderNumber);
    setEditBranch(order.branch);
    setEditChannel(order.channel);
    setEditOrderType(order.orderType);
    setEditCollaboratorName(order.collaboratorName);
    setEditClientName(order.clientName);
    setEditClientPhone(order.clientPhone || '');
    setEditClientEmail(order.clientEmail || '');
    setEditPlate(order.plate);
    setEditChanganModel(order.changanModel);
    setEditVin(order.vin || '');
    setEditQuotationNumber(order.quotationNumber);
    setEditPaymentStatus(order.paymentStatus);
    setEditReceiptOrInvoiceNumber(order.receiptOrInvoiceNumber);
    setEditOverallStatus(order.overallStatus);
    setEditItems(JSON.parse(JSON.stringify(order.items)));
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editOrderNumber.trim() || !editClientName.trim()) return;

    const updated: SpecialOrder = {
      ...editingOrder,
      orderNumber: editOrderNumber.trim().toUpperCase(),
      branch: editBranch,
      channel: editChannel,
      orderType: editOrderType,
      collaboratorName: editCollaboratorName.trim(),
      clientName: editClientName.trim(),
      clientPhone: editClientPhone.trim() || undefined,
      clientEmail: editClientEmail.trim() || undefined,
      plate: editPlate.trim().toUpperCase(),
      changanModel: editChanganModel,
      vin: editVin.trim().toUpperCase() || undefined,
      quotationNumber: editQuotationNumber.trim(),
      paymentStatus: editPaymentStatus,
      receiptOrInvoiceNumber: editReceiptOrInvoiceNumber.trim(),
      overallStatus: editOverallStatus,
      items: editItems,
    };

    onUpdateOrder(updated);
    if (activeDetailOrder?.id === updated.id) {
      setActiveDetailOrder(updated);
    }
    setEditingOrder(null);
  };

  const handleDeleteOrderClick = (order: SpecialOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `¿Desea ELIMINAR permanentemente el pedido "${order.orderNumber}" del cliente "${order.clientName}" (${order.branch})?\n\nEsta acción no se puede deshacer.`
    );
    if (confirmed) {
      if (onDeleteOrder) {
        onDeleteOrder(order.id);
      }
      if (activeDetailOrder?.id === order.id) {
        setActiveDetailOrder(null);
      }
    }
  };

  const handleAddEditOrderItem = () => {
    const newItem: OrderItem = {
      id: `ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: '',
      description: '',
      quantityRequested: 1,
      quantityAssigned: 0,
      quantityDispatched: 0,
      status: editOverallStatus,
    };
    setEditItems([...editItems, newItem]);
  };

  const handleRemoveEditOrderItem = (idx: number) => {
    setEditItems(editItems.filter((_, i) => i !== idx));
  };

  const handleUpdateEditOrderItemField = (idx: number, field: keyof OrderItem, value: any) => {
    const updated = [...editItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditItems(updated);
  };

  const handleDownloadCsv = () => {
    const csvData = exportOrdersToCsv(filteredOrders);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `changan_pedidos_especiales_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDIENTE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            PENDIENTE
          </span>
        );
      case 'EN TRÁNSITO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
            EN TRÁNSITO
          </span>
        );
      case 'EN BODEGA CEDIS':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            EN BODEGA CEDIS
          </span>
        );
      case 'DESPACHADO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-600/60">
            DESPACHADO
          </span>
        );
      case 'RECIBIDO EN SUCURSAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/60">
            RECIBIDO EN SUCURSAL
          </span>
        );
    }
  };

  // Execute Global Cross-Docking Matching between all containers and orders
  const handleExecuteGlobalCrossDock = () => {
    setIsCrossDockingGlobal(true);
    setTimeout(() => {
      const { updatedContainers, updatedOrders, result } = runGlobalCrossDockMatching(
        containers,
        orders
      );

      if (onUpdateContainersAndOrders) {
        onUpdateContainersAndOrders(updatedContainers, updatedOrders, result);
      } else {
        updatedOrders.forEach((o) => onUpdateOrder(o));
      }

      setIsCrossDockingGlobal(false);
      setGlobalMatchResultModal(result);
    }, 600);
  };

  // Intelligent Cross-Docking Matching Algorithm for Bulk Uploaded Orders
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const parsedResult = await parseOrdersExcelFile(file);
      const newOrders = parsedResult.orders;

      // Merge new orders with existing orders
      const newIds = new Set(newOrders.map((o) => o.id));
      const newNumbers = new Set(newOrders.map((o) => o.orderNumber));
      const filteredPrev = orders.filter(
        (o) => !newIds.has(o.id) && !newNumbers.has(o.orderNumber)
      );
      const mergedOrders = [...newOrders, ...filteredPrev];

      // Run resilient global cross-dock allocation against all containers
      const { updatedContainers, updatedOrders, result } = runGlobalCrossDockMatching(
        containers,
        mergedOrders
      );

      if (onUpdateContainersAndOrders) {
        onUpdateContainersAndOrders(updatedContainers, updatedOrders, result);
      } else if (onImportOrders) {
        onImportOrders(updatedOrders);
      }

      setGlobalMatchResultModal(result);
      setImportSummary({
        totalOrders: newOrders.length,
        totalItems: parsedResult.totalItems,
        matchedReady: result.ordersFulfilledCount,
        matchedPartial: result.ordersPartiallyFulfilledCount,
        warnings: parsedResult.warnings,
      });
    } catch (err: any) {
      alert(`Error al procesar el archivo Excel: ${err.message || 'Formato no compatible'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Bulk Import Success Summary Modal */}
      {importSummary && !globalMatchResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#07090e] border border-cyan-500/60 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.4)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  ¡Carga y Cruce de Pedidos Exitoso!
                </h3>
                <p className="text-xs text-slate-400">
                  Conciliación automática efectuada contra los contenedores en CEDIS.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Pedidos Importados</span>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  {importSummary.totalOrders} <span className="text-xs text-slate-400">órdenes</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {importSummary.totalItems} repuestos solicitados
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Listos para Despacho</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {importSummary.matchedReady} <span className="text-xs text-slate-400">órdenes 100%</span>
                </div>
                <div className="text-[11px] font-mono text-amber-400">
                  {importSummary.matchedPartial} con asignación parcial
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono">
              💡 Los pedidos ya están cargados en la Matriz Central y cruzados con los contenedores. Aquellos con piezas completas en bodega CEDIS pueden ser rotulados y despachados inmediatamente.
            </p>

            <button
              onClick={() => setImportSummary(null)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider"
            >
              Entendido / Ver Matriz de Pedidos
            </button>
          </div>
        </div>
      )}

      {/* Global Cross-Docking Audit Result Modal */}
      {globalMatchResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#07090e] border border-cyan-500/60 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Resultado de Cruce Automático CEDIS // Cross-Docking
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conciliación inteligente con normalización de códigos Changan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGlobalMatchResultModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Repuestos Asignados</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  {globalMatchResultModal.totalAllocatedItems}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  en {globalMatchResultModal.totalContainersProcessed} contenedor(es)
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Órdenes Completas</span>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-0.5">
                  {globalMatchResultModal.ordersFulfilledCount}
                </div>
                <div className="text-[10px] font-mono text-cyan-300">
                  100% en Bodega CEDIS
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Órdenes Parciales</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">
                  {globalMatchResultModal.ordersPartiallyFulfilledCount}
                </div>
                <div className="text-[10px] font-mono text-amber-300">
                  con piezas asignadas
                </div>
              </div>
            </div>

            {/* Branch breakdown pill bar */}
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-2 font-bold">
                Asignación por Sucursal de Destino:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(globalMatchResultModal.branchBreakdown).map(([branch, count]) => {
                  const numCount = Number(count) || 0;
                  return (
                    <div
                      key={branch}
                      className={`p-2 rounded-xl text-center border ${
                        numCount > 0
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] font-mono truncate">{branch}</div>
                      <div className="text-sm font-bold font-mono">{numCount} pzs</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matched Details List */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
                Detalle de Repuestos Conciliados ({globalMatchResultModal.matchedDetails.length}):
              </span>
              {globalMatchResultModal.matchedDetails.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-400 font-mono">
                  No se encontraron coincidencias pendientes entre los pedidos y los contenedores ingresados. Verifique que los números de parte coincidan o que los contenedores contengan inventario disponible.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {globalMatchResultModal.matchedDetails.map((match, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{match.partCode}</span>
                          <span className="text-slate-400 text-[11px] truncate max-w-xs">{match.description}</span>
                        </div>
                        <div className="text-[10px] text-cyan-400 mt-0.5">
                          {match.orderNumber} • {match.clientName} ({match.branch})
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                          +{match.quantity} asignadas
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Cont: {match.containerNumber} ({match.locationInCedis})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setGlobalMatchResultModal(null)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Cerrar y Ver Pedidos Asignados
            </button>
          </div>
        </div>
      )}

      {/* Control Header & Filters Bar */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <h2 className="text-lg lg:text-xl font-bold text-white font-mono tracking-tight">
                Matriz Central de Pedidos Especiales Changan
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoreo en tiempo real de repuestos solicitados por sucursales y cruce automático cross-docking con contenedores CEDIS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Part Tracker */}
            {onOpenPartTracker && (
              <button
                type="button"
                onClick={() => onOpenPartTracker()}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-950/90 to-blue-950/90 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/60 hover:border-cyan-400 text-cyan-200 rounded-xl text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                title="Rastrear si un repuesto viene en algún contenedor o fue solicitado por alguna sucursal"
              >
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rastrear Repuesto</span>
              </button>
            )}

            {/* Download Template Button */}
            <button
              type="button"
              onClick={downloadChanganOrdersTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-700/80 hover:border-emerald-500 text-emerald-300 rounded-xl text-xs font-semibold font-mono transition-all"
              title="Descargar plantilla oficial de Excel para rellenar pedidos de sucursales"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Plantilla Excel</span>
            </button>

            {/* Upload Bulk Orders Excel */}
            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/60 hover:border-emerald-400 text-emerald-200 rounded-xl text-xs font-bold font-mono transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              title="Subir archivo Excel (.xlsx, .xls, .csv) con los pedidos de las sucursales para cruzar con contenedores"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isImporting ? 'Procesando...' : 'Subir Excel Pedidos'}</span>
            </button>

            {/* Global Cross-Docking Execution Button */}
            <button
              type="button"
              disabled={isCrossDockingGlobal}
              onClick={handleExecuteGlobalCrossDock}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold font-mono transition-all shadow-[0_0_16px_rgba(245,158,11,0.4)] border border-amber-300/40"
              title="Ejecutar cruce automático entre todos los pedidos y los contenedores CEDIS"
            >
              {isCrossDockingGlobal ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Cruzando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  <span>⚡ Cruce Automático CEDIS</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 rounded-xl text-xs font-semibold font-mono transition-all"
              title="Descargar sábana de datos en formato CSV para Excel o Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={onAddNewOrderClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Nuevo Pedido</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Global Search Bar */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, cliente, código, pedido..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">Todas las Sucursales</option>
              {CHANGAN_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Filter */}
          <div>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">Todos los Canales</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">Todos los Estatus</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN TRÁNSITO">EN TRÁNSITO</option>
              <option value="EN BODEGA CEDIS">EN BODEGA CEDIS</option>
              <option value="DESPACHADO">DESPACHADO</option>
              <option value="RECIBIDO EN SUCURSAL">RECIBIDO EN SUCURSAL</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">Todos los Pagos</option>
              <option value="Cancelado">Cancelado (Pagado)</option>
              <option value="Abonado">Abonado (Recibo)</option>
              <option value="No Pagado">No Pagado (Alerta)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Mostrando <span className="text-cyan-400 font-bold">{filteredOrders.length}</span> órdenes
            ({filteredOrders.reduce((acc, o) => acc + o.items.length, 0)} ítems solicitados)
          </div>
          <div className="text-[11px] text-slate-500 hidden sm:block">
            * Use los botones de acción para editar, inspeccionar o eliminar pedidos
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                <th className="py-3 px-3.5">Nº Pedido</th>
                <th className="py-3 px-3">Sucursal / Canal</th>
                <th className="py-3 px-3">Cliente / Placa</th>
                <th className="py-3 px-3">Modelo</th>
                <th className="py-3 px-3">Repuestos (Código & Descripción)</th>
                <th className="py-3 px-2 text-center">Cant. Solicitada / Asignada</th>
                <th className="py-3 px-3">Contenedor / Ubic.</th>
                <th className="py-3 px-3">Estado Pago</th>
                <th className="py-3 px-3 text-center">Estatus General</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-mono">
                    No se encontraron órdenes que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const totalRequested = order.items.reduce((a, b) => a + b.quantityRequested, 0);
                  const totalAssigned = order.items.reduce((a, b) => a + b.quantityAssigned, 0);
                  const isFullyAssigned = totalAssigned >= totalRequested && totalRequested > 0;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Order Number & Type */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-white group-hover:text-cyan-300">
                          {order.orderNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <span>{order.createdAt.split('T')[0]}</span>
                          {order.orderType === 'Emergencia' && (
                            <span className="text-rose-400 font-bold px-1 bg-rose-950/60 rounded border border-rose-800/40">
                              EMERGENCIA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Branch & Channel */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{order.branch}</div>
                        <div className="text-[10px] text-cyan-400/90 font-mono">
                          {order.channel} — {order.collaboratorName}
                        </div>
                      </td>

                      {/* Client & Plate */}
                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-medium truncate max-w-[140px]">
                          {order.clientName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700/80 text-cyan-300 font-bold">
                            {order.plate}
                          </span>
                          <span className="text-slate-500 text-[9px]">{order.quotationNumber}</span>
                        </div>
                      </td>

                      {/* Changan Model */}
                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                        {order.changanModel}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-[11px]">
                              <span className="font-mono font-bold text-cyan-300">
                                {item.code}
                              </span>
                              <span className="text-slate-400 truncate block max-w-[200px] text-[10px]">
                                {item.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Quantities */}
                      <td className="py-3 px-2 text-center font-mono">
                        <div className="flex items-center justify-center gap-1 font-bold">
                          <span className="text-slate-400">{totalRequested} sol.</span>
                          <span className="text-slate-600">/</span>
                          <span
                            className={
                              isFullyAssigned
                                ? 'text-emerald-400'
                                : totalAssigned > 0
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }
                          >
                            {totalAssigned} asig.
                          </span>
                        </div>
                      </td>

                      {/* Container & Warehouse Location */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {order.assignedContainerId ? (
                          <div>
                            <span className="text-cyan-400 font-bold truncate block">
                              {order.assignedContainerId}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {order.items[0]?.locationInCedis || 'CEDIS-ZONA-A'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Por asignar</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3">
                        <div
                          className={`text-[10px] font-mono font-bold uppercase inline-flex items-center px-1.5 py-0.5 rounded border ${
                            order.paymentStatus === 'Cancelado'
                              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                              : order.paymentStatus === 'Abonado'
                              ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                              : 'bg-rose-950/60 border-rose-700/60 text-rose-300 animate-pulse'
                          }`}
                        >
                          {order.paymentStatus}
                        </div>
                        {order.receiptOrInvoiceNumber && order.receiptOrInvoiceNumber !== 'N/A (Pendiente)' && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-[100px]">
                            {order.receiptOrInvoiceNumber}
                          </div>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-3 px-3 text-center">{getStatusBadge(order.overallStatus)}</td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveDetailOrder(order)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                            title="Ver detalles completos y bitácora"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditOrder(order)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg border border-slate-700 transition-colors"
                            title="Editar este pedido"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onPrintLabelForOrder(order)}
                            className="p-1.5 bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-300 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-colors"
                            title="Imprimir etiqueta térmica Changan"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteOrderClick(order, e)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 hover:border-rose-700/60 transition-colors"
                            title="Eliminar este pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Order Detail & Observation Modal */}
      {activeDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold">
                      EXPEDIENTE DE PEDIDO ESPECIAL
                    </span>
                    {getStatusBadge(activeDetailOrder.overallStatus)}
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono mt-0.5">
                    {activeDetailOrder.orderNumber} — {activeDetailOrder.branch}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEditOrder(activeDetailOrder);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-mono flex items-center gap-1.5"
                  title="Editar pedido"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => handleDeleteOrderClick(activeDetailOrder)}
                  className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-mono flex items-center gap-1.5"
                  title="Eliminar pedido"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <button
                  onClick={() => setActiveDetailOrder(null)}
                  className="text-slate-400 hover:text-white text-xs font-mono p-2"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Quick Status Control Bar */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="text-[11px] uppercase font-mono text-slate-400 font-bold">
                Control Rápido de Estatus Logístico:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickStatusChange(activeDetailOrder, 'PENDIENTE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    activeDetailOrder.overallStatus === 'PENDIENTE'
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Pendiente
                </button>
                <button
                  onClick={() => handleQuickStatusChange(activeDetailOrder, 'EN TRÁNSITO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    activeDetailOrder.overallStatus === 'EN TRÁNSITO'
                      ? 'bg-cyan-900 text-cyan-200 border-cyan-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  En Tránsito
                </button>
                <button
                  onClick={() => handleQuickStatusChange(activeDetailOrder, 'EN BODEGA CEDIS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    activeDetailOrder.overallStatus === 'EN BODEGA CEDIS'
                      ? 'bg-amber-900 text-amber-200 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  En Bodega CEDIS
                </button>
                <button
                  onClick={() => handleQuickStatusChange(activeDetailOrder, 'DESPACHADO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    activeDetailOrder.overallStatus === 'DESPACHADO'
                      ? 'bg-blue-900 text-blue-200 border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Despachado a Sucursal
                </button>
                <button
                  onClick={() => handleQuickStatusChange(activeDetailOrder, 'RECIBIDO EN SUCURSAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    activeDetailOrder.overallStatus === 'RECIBIDO EN SUCURSAL'
                      ? 'bg-emerald-900 text-emerald-200 border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Recibido en Sucursal
                </button>
              </div>
            </div>

            {/* Order Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-black/40 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CLIENTE</span>
                <span className="text-white font-semibold">{activeDetailOrder.clientName}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PLACA / COTIZACIÓN</span>
                <span className="text-cyan-300 font-bold">
                  {activeDetailOrder.plate} ({activeDetailOrder.quotationNumber})
                </span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MODELO CHANGAN</span>
                <span className="text-slate-200">{activeDetailOrder.changanModel}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">ESTADO PAGO</span>
                <span className="text-amber-400 font-bold">
                  {activeDetailOrder.paymentStatus} — {activeDetailOrder.receiptOrInvoiceNumber}
                </span>
              </div>
            </div>

            {/* Parts Breakdown Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-slate-800 text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                <span>Repuestos en esta Solicitud:</span>
                <span className="text-[11px] text-cyan-400">
                  {activeDetailOrder.items.length} repuestos
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050608] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descripción</th>
                    <th className="p-2.5 text-center">Sol.</th>
                    <th className="p-2.5 text-center">Asig.</th>
                    <th className="p-2.5">Contenedor</th>
                    <th className="p-2.5">Ubicación CEDIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {activeDetailOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-mono font-bold text-cyan-300">{item.code}</td>
                      <td className="p-2.5 text-slate-300">{item.description}</td>
                      <td className="p-2.5 text-center font-mono">{item.quantityRequested}</td>
                      <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">
                        {item.quantityAssigned}
                      </td>
                      <td className="p-2.5 font-mono text-slate-400">
                        {item.containerId || 'Pendiente'}
                      </td>
                      <td className="p-2.5 font-mono text-cyan-400/90">
                        {item.locationInCedis || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observations & Call Log Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs uppercase font-mono font-bold text-white">
                  Bitácora de Observaciones y Llamadas a Sucursal
                </h4>
              </div>

              {/* Add Observation Form */}
              <form onSubmit={handleAddObservation} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newObservationText}
                    onChange={(e) => setNewObservationText(e.target.value)}
                    placeholder="Registrar nota, llamada a sucursal, o alerta de facturación..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={observationType}
                    onChange={(e) => setObservationType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="general">Nota General</option>
                    <option value="call_log">Llamada a Sucursal</option>
                    <option value="billing_alert">Alerta Cobro/Factura</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono"
                  >
                    Agregar
                  </button>
                </div>
              </form>

              {/* Existing Observations List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeDetailOrder.observations.length === 0 ? (
                  <div className="text-xs text-slate-600 font-mono italic p-2">
                    No hay observaciones registradas aún.
                  </div>
                ) : (
                  activeDetailOrder.observations.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-cyan-400 font-bold">{obs.author}</span>
                        <span className="text-slate-500">{new Date(obs.date).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{obs.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => onPrintLabelForOrder(activeDetailOrder)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold font-mono"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiquetas Térmicas de este Pedido</span>
              </button>

              <button
                onClick={() => setActiveDetailOrder(null)}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-cyan-500/60 rounded-3xl max-w-3xl w-full p-6 shadow-[0_0_70px_rgba(6,182,212,0.4)] max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white font-mono">
                  Editar Pedido: {editingOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nº de Pedido <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editOrderNumber}
                    onChange={(e) => setEditOrderNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Sucursal
                  </label>
                  <select
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value as BranchName)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    {CHANGAN_BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Canal de Venta
                  </label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value as Channel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nombre del Cliente <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Placa del Auto <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editPlate}
                    onChange={(e) => setEditPlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Modelo Changan
                  </label>
                  <select
                    value={editChanganModel}
                    onChange={(e) => setEditChanganModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    {CHANGAN_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Colaborador / Asesor
                  </label>
                  <input
                    type="text"
                    value={editCollaboratorName}
                    onChange={(e) => setEditCollaboratorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nº Cotización
                  </label>
                  <input
                    type="text"
                    value={editQuotationNumber}
                    onChange={(e) => setEditQuotationNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Tipo de Pedido
                  </label>
                  <select
                    value={editOrderType}
                    onChange={(e) => setEditOrderType(e.target.value as OrderType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    <option value="Especial">Especial (Marítimo Regular)</option>
                    <option value="Emergencia">Emergencia (Aéreo Express)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Estado de Pago
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    <option value="Cancelado">Cancelado (Pagado 100%)</option>
                    <option value="Abonado">Abonado (50% anticipo)</option>
                    <option value="No Pagado">No Pagado (Pendiente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nº Recibo / Factura
                  </label>
                  <input
                    type="text"
                    value={editReceiptOrInvoiceNumber}
                    onChange={(e) => setEditReceiptOrInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Estatus General
                  </label>
                  <select
                    value={editOverallStatus}
                    onChange={(e) => setEditOverallStatus(e.target.value as OrderStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="EN TRÁNSITO">EN TRÁNSITO</option>
                    <option value="EN BODEGA CEDIS">EN BODEGA CEDIS</option>
                    <option value="DESPACHADO">DESPACHADO</option>
                    <option value="RECIBIDO EN SUCURSAL">RECIBIDO EN SUCURSAL</option>
                  </select>
                </div>
              </div>

              {/* Items in Order */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    Repuestos en el Pedido ({editItems.length}):
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditOrderItem}
                    className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800/60 hover:border-cyan-500 rounded-lg text-xs font-mono flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Repuesto</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#050608] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Código</th>
                        <th className="p-2">Descripción</th>
                        <th className="p-2 text-center w-16">Cant. Sol.</th>
                        <th className="p-2 text-center w-16">Cant. Asig.</th>
                        <th className="p-2 text-center w-12">Borrar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {editItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.code}
                              onChange={(e) =>
                                handleUpdateEditOrderItemField(
                                  idx,
                                  'code',
                                  e.target.value.toUpperCase()
                                )
                              }
                              placeholder="Ej. S111F260204"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono uppercase"
                              required
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleUpdateEditOrderItemField(idx, 'description', e.target.value)
                              }
                              placeholder="Descripción del repuesto"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              required
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantityRequested}
                              onChange={(e) =>
                                handleUpdateEditOrderItemField(
                                  idx,
                                  'quantityRequested',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center"
                              required
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.quantityAssigned}
                              onChange={(e) =>
                                handleUpdateEditOrderItemField(
                                  idx,
                                  'quantityAssigned',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-emerald-400 font-mono text-center"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEditOrderItem(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Eliminar repuesto de la orden"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteOrderClick(editingOrder)}
                  className="px-4 py-2 bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar Pedido</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
