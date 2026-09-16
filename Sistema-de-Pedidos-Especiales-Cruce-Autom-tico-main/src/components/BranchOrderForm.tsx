import {
  AlertCircle,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  FileCheck,
  FileText,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  Zap
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AUTHORIZED_COLLABORATORS,
  CHANGAN_BRANCHES,
  CHANGAN_MODELS,
  CHANNELS,
  getBranchDefaultRecognition,
  getCollaboratorsForBranch,
  recognizeCollaborator
} from '../data/mockData';
import {
  BranchName,
  Channel,
  ChanganVehicleModel,
  MasterCatalogPart,
  OrderItem,
  OrderType,
  PaymentStatus,
  SpecialOrder
} from '../types';
import { generateUniqueTrackingNumber } from './BranchPortalView';
import { CompanyBrandHeader } from './CompanyBrandHeader';

interface BranchOrderFormProps {
  catalog: MasterCatalogPart[];
  models?: ChanganVehicleModel[];
  onSubmitOrder: (order: SpecialOrder) => void;
  onViewOrders: () => void;
}

interface FormRow {
  id: string;
  code: string;
  updatedCode: string;
  description: string;
  quantity: number;
}

export const BranchOrderForm: React.FC<BranchOrderFormProps> = ({
  catalog,
  models,
  onSubmitOrder,
  onViewOrders,
}) => {
  const activeModels = useMemo(() => {
    if (models && models.length > 0) {
      const active = models.filter((m) => m.isActive !== false && m.active !== false);
      if (active.length > 0) return active.map((m) => m.name);
      return models.map((m) => m.name);
    }
    return CHANGAN_MODELS;
  }, [models]);

  const [collaboratorName, setCollaboratorName] = useState('Leidys Perez');
  const [branch, setBranch] = useState<BranchName>('Villa Lucre');
  const [channel, setChannel] = useState<Channel>('Taller');
  const [orderType, setOrderType] = useState<OrderType>('Especial');
  const [customOrderNumber, setCustomOrderNumber] = useState(() => generateUniqueTrackingNumber('Villa Lucre'));
  const [quotationNumber, setQuotationNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [plate, setPlate] = useState('');
  const [changanModel, setChanganModel] = useState(() => activeModels[0] || 'CS35 Plus');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Cancelado');
  const [receiptOrInvoiceNumber, setReceiptOrInvoiceNumber] = useState('');
  const [initialObservation, setInitialObservation] = useState('');

  // Rows of parts - Minimum 3 rows by default
  const [rows, setRows] = useState<FormRow[]>([
    { id: '1', code: '', updatedCode: '', description: '', quantity: 1 },
    { id: '2', code: '', updatedCode: '', description: '', quantity: 1 },
    { id: '3', code: '', updatedCode: '', description: '', quantity: 1 },
  ]);

  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [submittedSuccessOrder, setSubmittedSuccessOrder] = useState<SpecialOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedPreAssigned, setCopiedPreAssigned] = useState(false);

  // Automatic Branch & Area Detection when Collaborator changes
  const handleCollaboratorChange = (name: string) => {
    setCollaboratorName(name);
    const found = recognizeCollaborator(name);
    if (found) {
      setBranch(found.branch);
      setChannel(found.department);
      setCustomOrderNumber(generateUniqueTrackingNumber(found.branch));
    }
  };

  // Automatic Collaborator & Area Selection when Branch changes
  const handleBranchChange = (newBranch: BranchName) => {
    setBranch(newBranch);
    const recognition = getBranchDefaultRecognition(newBranch);
    setCollaboratorName(recognition.collaboratorName);
    setChannel(recognition.department);
    setCustomOrderNumber(generateUniqueTrackingNumber(newBranch));
  };

  const handleRegenerateCode = () => {
    const newCode = generateUniqueTrackingNumber(branch);
    setCustomOrderNumber(newCode);
  };

  const handleCopyPreAssigned = () => {
    navigator.clipboard.writeText(customOrderNumber);
    setCopiedPreAssigned(true);
    setTimeout(() => setCopiedPreAssigned(false), 2000);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        code: '',
        updatedCode: '',
        description: '',
        quantity: 1,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof FormRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // If updating code, attempt auto-match with catalog
        if (field === 'code') {
          const match = catalog.find(
            (c) => c.code.toUpperCase().trim() === String(value).toUpperCase().trim()
          );
          if (match) {
            updated.description = match.description;
            if (match.updatedCode) updated.updatedCode = match.updatedCode;
          }
        }
        return updated;
      })
    );
  };

  const selectCatalogSuggestion = (rowId: string, part: MasterCatalogPart) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          code: part.code,
          updatedCode: part.updatedCode || '',
          description: part.description,
        };
      })
    );
    setActiveSearchRowId(null);
    setActiveSearchQuery('');
  };

  const handleAutocompleteSearch = (rowId: string, query: string) => {
    updateRow(rowId, 'code', query);
    setActiveSearchQuery(query);
    setActiveSearchRowId(query.length >= 1 ? rowId : null);
  };

  const filteredCatalog = useMemo(() => {
    if (!activeSearchQuery) return [];
    const q = activeSearchQuery.toLowerCase().trim();
    return catalog
      .filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.updatedCode && c.updatedCode.toLowerCase().includes(q)) ||
          c.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [catalog, activeSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!collaboratorName.trim()) {
      setErrorMessage('Por favor seleccione o ingrese el nombre del colaborador responsable.');
      return;
    }
    if (!quotationNumber.trim()) {
      setErrorMessage('Por favor ingrese el número de cotización oficial.');
      return;
    }
    if (!clientName.trim()) {
      setErrorMessage('Por favor ingrese el nombre completo del cliente.');
      return;
    }
    if (!plate.trim()) {
      setErrorMessage('Por favor ingrese la placa del vehículo Changan.');
      return;
    }

    if (paymentStatus === 'Abonado' && !receiptOrInvoiceNumber.trim()) {
      setErrorMessage('Para pedidos "Abonados", el Número de Recibo de Abono es obligatorio.');
      return;
    }

    if (paymentStatus === 'Cancelado' && !receiptOrInvoiceNumber.trim()) {
      setErrorMessage('Para pedidos "Cancelados", el Número de Factura Fiscal es obligatorio.');
      return;
    }

    const validItems = rows.filter((r) => r.code.trim().length > 0 && r.quantity > 0);
    if (validItems.length === 0) {
      setErrorMessage('Debe ingresar al menos un código de repuesto válido con cantidad mayor a 0.');
      return;
    }

    const orderNumber = customOrderNumber.trim()
      ? customOrderNumber.trim().toUpperCase()
      : generateUniqueTrackingNumber(branch);

    const orderItems: OrderItem[] = validItems.map((r, index) => ({
      id: `ITM-${Date.now()}-${index}`,
      code: r.code.trim().toUpperCase(),
      updatedCode: r.updatedCode.trim().toUpperCase() || undefined,
      description: r.description.trim() || 'Repuesto Changan Solicitado por Sucursal',
      quantityRequested: Number(r.quantity),
      quantityAssigned: 0,
      quantityDispatched: 0,
      status: 'PENDIENTE',
    }));

    const newOrder: SpecialOrder = {
      id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      branch,
      collaboratorName: collaboratorName.trim(),
      channel,
      orderType,
      quotationNumber: quotationNumber.trim().toUpperCase(),
      clientName: clientName.trim().toUpperCase(),
      plate: plate.trim().toUpperCase(),
      changanModel,
      paymentStatus,
      receiptOrInvoiceNumber:
        paymentStatus === 'No Pagado' ? 'N/A (Pendiente)' : receiptOrInvoiceNumber.trim().toUpperCase(),
      items: orderItems,
      overallStatus: 'PENDIENTE',
      isBilled: paymentStatus === 'Cancelado',
      billingInvoiceNumber: paymentStatus === 'Cancelado' ? receiptOrInvoiceNumber.trim().toUpperCase() : undefined,
      observations: initialObservation.trim()
        ? [
            {
              id: `OBS-${Date.now()}`,
              date: new Date().toISOString(),
              author: `${collaboratorName.trim()} (${branch})`,
              content: initialObservation.trim(),
              type: paymentStatus === 'No Pagado' ? 'billing_alert' : 'general',
            },
          ]
        : [
            {
              id: `OBS-${Date.now()}`,
              date: new Date().toISOString(),
              author: `${collaboratorName.trim()} (${branch})`,
              content: `Pedido transmitido desde ${branch}. Colaborador responsable: ${collaboratorName.trim()}.`,
              type: paymentStatus === 'No Pagado' ? 'billing_alert' : 'general',
            },
          ],
    };

    onSubmitOrder(newOrder);
    setSubmittedSuccessOrder(newOrder);

    // Reset Form for next input and immediately pre-assign a brand new unique tracking code
    setCustomOrderNumber(generateUniqueTrackingNumber(branch));
    setQuotationNumber('');
    setClientName('');
    setPlate('');
    setReceiptOrInvoiceNumber('');
    setInitialObservation('');
    setRows([
      { id: '1', code: '', updatedCode: '', description: '', quantity: 1 },
      { id: '2', code: '', updatedCode: '', description: '', quantity: 1 },
      { id: '3', code: '', updatedCode: '', description: '', quantity: 1 },
    ]);
  };

  const handleCopyTracking = () => {
    if (!submittedSuccessOrder) return;
    navigator.clipboard.writeText(submittedSuccessOrder.orderNumber);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Official Corporate Banner */}
      <div className="bg-[#0b0f17] border border-slate-800 p-6 rounded-3xl relative overflow-hidden print:hidden">
        <CompanyBrandHeader variant="dark" />
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-900">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-mono font-bold">
                PORTAL SUCURSALES // INGRESO DIGITAL DE PEDIDOS A CEDIS CENTRAL
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-mono">
              Formulario de Pedidos Especiales, Taller, Mostrador y Garantía
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-xl text-xs text-slate-300 font-mono">
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Asignación Automática por Colaborador</span>
          </div>
        </div>
      </div>

      {/* Success Banner and 100% Digital PDF Certificate */}
      {submittedSuccessOrder && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-emerald-950/40 border-2 border-emerald-500/60 p-6 rounded-3xl text-emerald-300 space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider font-bold text-emerald-400">
                    ¡PEDIDO REGISTRADO CON ÉXITO EN CEDIS CENTRAL!
                  </div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    Nº de Seguimiento Único: <span className="text-cyan-400">{submittedSuccessOrder.orderNumber}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Sucursal: <strong className="text-white">{submittedSuccessOrder.branch}</strong> • Colaborador: <strong className="text-white">{submittedSuccessOrder.collaboratorName}</strong> ({submittedSuccessOrder.items.length} repuestos)
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyTracking}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono font-medium transition-colors"
                >
                  {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedTracking ? 'Copiado' : 'Copiar Seguimiento'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-xl text-xs font-mono font-bold shadow-md transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Comprobante PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomOrderNumber(generateUniqueTrackingNumber(branch));
                    setSubmittedSuccessOrder(null);
                  }}
                  className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium"
                >
                  Nuevo Pedido
                </button>
                <button
                  type="button"
                  onClick={onViewOrders}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors"
                >
                  Ver en Sábana
                </button>
              </div>
            </div>
          </div>

          {/* OFFICIAL 100% DIGITAL PRINTABLE VOUCHER / COMPROBANTE PDF */}
          <div className="bg-white text-black p-8 sm:p-10 rounded-3xl border-2 border-slate-900 shadow-2xl space-y-6 print:border-none print:p-4 print:shadow-none print:m-0 print:rounded-none">
            <CompanyBrandHeader variant="light" />

            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 pt-1">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase font-sans tracking-tight">
                  COMPROBANTE DE SOLICITUD DE PEDIDO ESPECIAL
                </h3>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Certificado Oficial de Transmisión Electrónica • Red de Distribución Nacional
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Nº SEGUIMIENTO</div>
                  <div className="text-sm font-black font-mono text-cyan-900">{submittedSuccessOrder.orderNumber}</div>
                </div>
                <div className="p-1 bg-white border border-slate-300 rounded-lg">
                  <QRCodeSVG
                    value={`CHANGAN:${submittedSuccessOrder.orderNumber}|${submittedSuccessOrder.branch}|${submittedSuccessOrder.collaboratorName}|${submittedSuccessOrder.plate}`}
                    size={54}
                    level="M"
                  />
                </div>
              </div>
            </div>

            {/* Order Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-300 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Sucursal Emisora:</span>
                <span className="font-black text-slate-900 text-sm">{submittedSuccessOrder.branch}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Colaborador:</span>
                <span className="font-bold text-slate-900">{submittedSuccessOrder.collaboratorName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Fecha & Hora Emisión:</span>
                <span className="font-medium text-slate-800">
                  {new Date(submittedSuccessOrder.createdAt).toLocaleDateString('es-PA')} {new Date(submittedSuccessOrder.createdAt).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Canal / Prioridad:</span>
                <span className="font-bold text-slate-900">
                  {submittedSuccessOrder.channel} • {submittedSuccessOrder.orderType.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Customer, Vehicle & Billing Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 pb-1">
                  Información del Cliente & Cotización
                </div>
                <div><strong>Cliente:</strong> {submittedSuccessOrder.clientName}</div>
                <div><strong>Nº Cotización:</strong> {submittedSuccessOrder.quotationNumber}</div>
                <div><strong>Canal de Venta:</strong> {submittedSuccessOrder.channel}</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 pb-1">
                  Vehículo Changan & Facturación
                </div>
                <div><strong>Modelo:</strong> {submittedSuccessOrder.changanModel}</div>
                <div><strong>Placa:</strong> <span className="font-bold bg-slate-200 px-1.5 py-0.5 rounded text-black">{submittedSuccessOrder.plate}</span></div>
                <div><strong>Estado de Pago:</strong> {submittedSuccessOrder.paymentStatus} ({submittedSuccessOrder.receiptOrInvoiceNumber})</div>
              </div>
            </div>

            {/* Requested Parts Table */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center justify-between">
                <span>Detalle de Repuestos Solicitados ({submittedSuccessOrder.items.length} ítems)</span>
                <span className="text-[10px] text-slate-600 font-medium">Estatus Inicial: PENDIENTE EN CEDIS</span>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300 text-xs font-mono">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 border-b border-slate-300 text-[10px] uppercase">
                    <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                    <th className="p-2 border-r border-slate-300">Código de Parte OEM</th>
                    <th className="p-2 border-r border-slate-300">Descripción del Repuesto</th>
                    <th className="p-2 text-center w-16">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {submittedSuccessOrder.items.map((item, idx) => (
                    <tr key={item.id} className="text-slate-900">
                      <td className="p-2 border-r border-slate-300 font-bold text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-blue-900">{item.code}</td>
                      <td className="p-2 border-r border-slate-300">{item.description}</td>
                      <td className="p-2 text-center font-bold text-slate-900">{item.quantityRequested}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 100% DIGITAL CERTIFICATES & SEALS (NO MANUAL SIGNATURE REQUIRED) */}
            <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Registro Digital de Colaborador</span>
                </div>
                <div className="text-[11px] text-slate-800">
                  <strong>Colaborador:</strong> {submittedSuccessOrder.collaboratorName}
                </div>
                <div className="text-[10px] text-slate-600">
                  <strong>Sucursal:</strong> {submittedSuccessOrder.branch} • Identidad autorizada
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  Hash de Transmisión: {submittedSuccessOrder.id}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-800 font-bold text-[11px] uppercase">
                  <FileCheck className="w-4 h-4" />
                  <span>Recepción Digital en CEDIS Central</span>
                </div>
                <div className="text-[11px] text-slate-800">
                  <strong>Estado:</strong> REGISTRADO EN COLA DE ASIGNACIÓN
                </div>
                <div className="text-[10px] text-slate-600">
                  Distribuidora Automotriz Fortune S.A. • Changan Panamá
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  Timestamp: {new Date(submittedSuccessOrder.createdAt).toISOString()}
                </div>
              </div>
            </div>

            <div className="text-[9px] text-center text-slate-500 font-mono border-t border-slate-200 pt-2">
              Documento 100% digital e inalterable generado por el Sistema Central de Pedidos de Repuestos Changan Panamá. No requiere firma física.
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-xl text-rose-300 flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Colaborador & Sucursal con Detección Automática */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                1. Datos del Colaborador, Sucursal & Nº de Pedido
              </h3>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              Sucursal Activa: <strong className="text-white">{branch}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Colaborador</span> <span className="text-cyan-400">*</span>
              </label>
              <select
                value={collaboratorName}
                onChange={(e) => handleCollaboratorChange(e.target.value)}
                className="w-full bg-slate-950 border border-cyan-700/60 rounded-xl px-3 py-2 text-sm text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
              >
                {AUTHORIZED_COLLABORATORS.map((collab) => (
                  <option key={collab.name} value={collab.name}>
                    {collab.name} — ({collab.branch})
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-cyan-400/80 mt-1 font-mono">
                ✓ Vinculado a {branch}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Sucursal <span className="text-cyan-400">*</span>
              </label>
              <select
                value={branch}
                onChange={(e) => handleBranchChange(e.target.value as BranchName)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"
              >
                {CHANGAN_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300 font-mono">
                  Nº Pedido (Tracking Oficial) <span className="text-cyan-400">*</span>
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-bold">
                  <Sparkles className="w-2.5 h-2.5" />
                  Auto-Asignado
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={customOrderNumber}
                  onChange={(e) => setCustomOrderNumber(e.target.value)}
                  placeholder="Ej: PED 3445367"
                  className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl pl-3 pr-16 py-2 text-sm text-cyan-300 font-mono font-bold tracking-wide focus:outline-none focus:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                  required
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyPreAssigned}
                    title="Copiar código asignado"
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded-lg transition-colors"
                  >
                    {copiedPreAssigned ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    title="Generar nuevo código correlativo"
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded-lg transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-emerald-400/90 mt-1 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Código oficial único pre-asignado ({branch}). Será el tracking final inalterable.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Canal <span className="text-cyan-400">*</span>
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-medium"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tipo de Pedido <span className="text-cyan-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('Especial')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    orderType === 'Especial'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Especial
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('Emergencia')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    orderType === 'Emergencia'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Emergencia
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Datos del Cliente, Vehículo y Cotización */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Car className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              2. Datos del Cliente, Placa y Cotización
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nombre del Cliente <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej. Roberto Guardia"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Placa del Vehículo <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="Ej. CP-8834"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono uppercase font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nº de Cotización <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                placeholder="Ej. COT-2026-904"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Modelo Changan <span className="text-cyan-400">*</span>
              </label>
              <select
                value={changanModel}
                onChange={(e) => setChanganModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-medium font-mono"
              >
                {activeModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Estado de Facturación y Pago */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              3. Estado de Pago y Validación Financiera
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Condición de Pago <span className="text-cyan-400">*</span>
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className={`w-full border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none ${
                  paymentStatus === 'Cancelado'
                    ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                    : paymentStatus === 'Abonado'
                    ? 'bg-amber-950/50 border-amber-500/60 text-amber-300'
                    : 'bg-rose-950/50 border-rose-500/60 text-rose-300'
                }`}
              >
                <option value="Cancelado">Cancelado (Pagado 100%)</option>
                <option value="Abonado">Abonado (Anticipo / Reserva)</option>
                <option value="No Pagado">No Pagado (Pendiente Cobro)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                <span>
                  {paymentStatus === 'Cancelado'
                    ? 'Nº de Factura de Cancelación'
                    : paymentStatus === 'Abonado'
                    ? 'Nº de Recibo de Abono'
                    : 'Referencia / Justificación No Pagado'}
                </span>
                {paymentStatus !== 'No Pagado' && (
                  <span className="text-rose-400 text-[11px] font-mono">Obligatorio</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={receiptOrInvoiceNumber}
                  onChange={(e) => setReceiptOrInvoiceNumber(e.target.value)}
                  placeholder={
                    paymentStatus === 'Cancelado'
                      ? 'Ej. FAC-CV-2026-9932'
                      : paymentStatus === 'Abonado'
                      ? 'Ej. REC-AB-7741'
                      : 'Cliente pagará al arribar el repuesto'
                  }
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  required={paymentStatus !== 'No Pagado'}
                />
                {paymentStatus === 'Cancelado' && (
                  <FileCheck className="w-4 h-4 text-emerald-400 absolute right-3 top-2.5" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Dynamic Table of Parts with Autocomplete */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                4. Lista de Repuestos Solicitados (Catálogo Changan Oficial)
              </h3>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {rows.length} {rows.length === 1 ? 'fila' : 'filas'}
              </span>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              <Plus className="w-4 h-4" />
              <span>Sumar Fila de Repuesto</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3 w-56">Código Changan</th>
                  <th className="py-2.5 px-3 w-40">Cód. Actualizado</th>
                  <th className="py-2.5 px-3">Descripción Oficial (Auto-Completada)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Cantidad</th>
                  <th className="py-2.5 px-3 w-12 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 group">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{idx + 1}</td>

                    {/* Part Code with Autocomplete */}
                    <td className="py-2.5 px-3 relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={row.code}
                          onChange={(e) => handleAutocompleteSearch(row.id, e.target.value.toUpperCase())}
                          onFocus={() => {
                            if (row.code.length >= 1) {
                              setActiveSearchRowId(row.id);
                              setActiveSearchQuery(row.code);
                            }
                          }}
                          placeholder="Ej. H15001-0800"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono uppercase font-semibold"
                        />
                        <Search className="w-3 h-3 text-slate-500 absolute right-2.5 top-2.5" />
                      </div>

                      {/* Dropdown Suggestions */}
                      {activeSearchRowId === row.id && filteredCatalog.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-96 bg-[#0b0f17] border border-cyan-500/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 p-2 max-h-56 overflow-y-auto">
                          <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold px-2 py-1 border-b border-slate-800 flex justify-between">
                            <span>Sugerencias Catálogo Changan</span>
                            <span className="text-slate-400">Clic para autocompletar</span>
                          </div>
                          {filteredCatalog.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectCatalogSuggestion(row.id, item)}
                              className="w-full text-left p-2 hover:bg-cyan-950/50 rounded-lg transition-colors border border-transparent hover:border-cyan-800/50 mt-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-white text-cyan-300">
                                  {item.code}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.category}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 truncate mt-0.5">
                                {item.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Updated Code */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.updatedCode}
                        onChange={(e) => updateRow(row.id, 'updatedCode', e.target.value)}
                        placeholder="Opcional"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono uppercase"
                      />
                    </td>

                    {/* Description */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="Descripción de la pieza"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 mx-auto bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-cyan-300 font-bold font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Observaciones / Bitácora */}
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-3">
          <label className="block text-xs font-medium text-slate-400">
            Observaciones o Notas Especiales para CEDIS (Opcional)
          </label>
          <textarea
            value={initialObservation}
            onChange={(e) => setInitialObservation(e.target.value)}
            rows={2}
            placeholder="Ej. Cliente requiere el repuesto para entrega el viernes. Vehículo detenido en taller."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          ></textarea>
        </div>

        {/* Submit Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 font-mono">
            * Los repuestos quedarán vinculados a <strong>{branch}</strong> (Colaborador: <strong>{collaboratorName}</strong>) con cruce prioritario.
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Enviar Pedido Especial a CEDIS Central</span>
          </button>
        </div>
      </form>
    </div>
  );
};
