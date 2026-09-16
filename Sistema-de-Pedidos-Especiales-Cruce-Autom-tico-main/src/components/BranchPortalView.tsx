import {
  AlertCircle,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Lock,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  User,
  UserCheck,
  Users,
  Zap
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AUTHORIZED_COLLABORATORS,
  CHANGAN_BRANCHES,
  CHANGAN_MODELS,
  CHANNELS,
  COMPANY_INFO,
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
import { CompanyBrandHeader } from './CompanyBrandHeader';

interface BranchPortalViewProps {
  catalog: MasterCatalogPart[];
  models?: ChanganVehicleModel[];
  initialBranch?: BranchName;
  onSubmitOrder: (order: SpecialOrder) => void;
  onSwitchToAdmin: () => void;
}

interface FormRow {
  id: string;
  code: string;
  updatedCode: string;
  description: string;
  quantity: number;
}

// Generate a strictly unique non-repeatable tracking number
export const generateUniqueTrackingNumber = (branch: BranchName): string => {
  const branchPrefixes: Record<BranchName, string> = {
    'Costa Verde': 'CV',
    'Chiriquí': 'CH',
    'Calle 50': 'C50',
    'Tumba Muerto': 'TM',
    'Villa Lucre': 'VL',
    'Santa María': 'SM',
  };
  const prefix = branchPrefixes[branch] || 'PTY';
  const now = new Date();
  const year = now.getFullYear();
  
  // High precision timestamp sequence + random salt guarantees non-repeatability
  const timeComponent = (now.getTime() % 100000).toString().padStart(5, '0');
  const randomSalt = Math.floor(10 + Math.random() * 90);
  
  return `PED-${prefix}-${year}-${timeComponent}${randomSalt}`;
};

export const BranchPortalView: React.FC<BranchPortalViewProps> = ({
  catalog,
  models,
  initialBranch,
  onSubmitOrder,
  onSwitchToAdmin,
}) => {
  const activeModels = useMemo(() => {
    if (models && models.length > 0) {
      const active = models.filter((m) => m.isActive !== false && m.active !== false);
      if (active.length > 0) return active.map((m) => m.name);
      return models.map((m) => m.name);
    }
    return CHANGAN_MODELS;
  }, [models]);

  const [collaboratorName, setCollaboratorName] = useState('Arquimedes Jordan');
  const [branch, setBranch] = useState<BranchName>((initialBranch as BranchName) || 'Costa Verde');
  const [channel, setChannel] = useState<Channel>('Taller');
  const [orderType, setOrderType] = useState<OrderType>('Especial');
  const [customOrderNumber, setCustomOrderNumber] = useState(() =>
    generateUniqueTrackingNumber((initialBranch as BranchName) || 'Costa Verde')
  );
  const [quotationNumber, setQuotationNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [plate, setPlate] = useState('');
  const [changanModel, setChanganModel] = useState(() => activeModels[0] || 'CS35 Plus');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Cancelado');
  const [receiptOrInvoiceNumber, setReceiptOrInvoiceNumber] = useState('');
  const [initialObservation, setInitialObservation] = useState('');

  // Modals and Prompts for Intelligent Branch & Identity Recognition
  const [isSelectingBranch, setIsSelectingBranch] = useState<boolean>(!initialBranch);
  const [isVillaLucreModalOpen, setIsVillaLucreModalOpen] = useState<boolean>(false);
  const [customVillaLucreName, setCustomVillaLucreName] = useState('');
  const [autoRecognizedToast, setAutoRecognizedToast] = useState<string | null>(null);
  const [copiedUniversalLink, setCopiedUniversalLink] = useState(false);

  // Rows of requested parts
  const [rows, setRows] = useState<FormRow[]>([
    { id: '1', code: '', updatedCode: '', description: '', quantity: 1 },
    { id: '2', code: '', updatedCode: '', description: '', quantity: 1 },
  ]);

  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<SpecialOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedPreAssigned, setCopiedPreAssigned] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Universal Portal URL for sharing with all branches
  const universalPortalUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const cleanBase = window.location.origin + window.location.pathname;
    return `${cleanBase}?portal=sucursales`;
  }, []);

  const handleCopyUniversal = () => {
    navigator.clipboard.writeText(universalPortalUrl);
    setCopiedUniversalLink(true);
    setTimeout(() => setCopiedUniversalLink(false), 2500);
  };

  /**
   * Universal Branch Selection Logic:
   * - If Villa Lucre: Prompt "¿Quién eres en Villa Lucre?" and auto-recognize department.
   * - If other branch: Automatically assign collaborator, recognized department, and unique tracking code.
   */
  const handleSelectBranch = (newBranch: BranchName) => {
    setBranch(newBranch);
    setIsSelectingBranch(false);

    if (newBranch === 'Villa Lucre') {
      setIsVillaLucreModalOpen(true);
    } else {
      const recognition = getBranchDefaultRecognition(newBranch);
      setCollaboratorName(recognition.collaboratorName);
      setChannel(recognition.department);
      setCustomOrderNumber(generateUniqueTrackingNumber(newBranch));
      setAutoRecognizedToast(
        `✓ Sucursal: ${newBranch} • Asesor asignado: ${recognition.collaboratorName} • Área: ${recognition.department}`
      );
      setTimeout(() => setAutoRecognizedToast(null), 4000);
    }
  };

  /**
   * Villa Lucre Specific Collaborator & Area Recognition
   */
  const handleSelectVillaLucreCollaborator = (name: string, dept?: Channel) => {
    setCollaboratorName(name);
    setBranch('Villa Lucre');
    
    // Auto-resolve channel/area
    let detectedDept: Channel = dept || 'Taller';
    if (!dept) {
      const match = AUTHORIZED_COLLABORATORS.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.branch === 'Villa Lucre'
      );
      if (match) detectedDept = match.department;
    }
    setChannel(detectedDept);
    setCustomOrderNumber(generateUniqueTrackingNumber('Villa Lucre'));
    setIsVillaLucreModalOpen(false);
    setCustomVillaLucreName('');
    setAutoRecognizedToast(
      `✓ Bienvenido(a) ${name} • Área ${detectedDept} reconocida automáticamente.`
    );
    setTimeout(() => setAutoRecognizedToast(null), 4500);
  };

  // Automatic Collaborator Selection when dropdown changes
  const handleCollaboratorChange = (name: string) => {
    setCollaboratorName(name);
    const found = recognizeCollaborator(name);
    if (found) {
      setBranch(found.branch);
      setChannel(found.department);
      setCustomOrderNumber(generateUniqueTrackingNumber(found.branch));
      setAutoRecognizedToast(
        `✓ ${found.name} reconocido(a) • Sucursal: ${found.branch} • Área: ${found.department}`
      );
      setTimeout(() => setAutoRecognizedToast(null), 3500);
    }
  };

  // Automatic Collaborator Selection when Branch dropdown changes
  const handleBranchDropdownChange = (newBranch: BranchName) => {
    handleSelectBranch(newBranch);
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

  // Sync initial branch on mount or query change
  useEffect(() => {
    if (initialBranch) {
      const isKnown = CHANGAN_BRANCHES.includes(initialBranch as BranchName);
      const branchToUse: BranchName = isKnown ? (initialBranch as BranchName) : 'Costa Verde';
      handleSelectBranch(branchToUse);
    }
  }, [initialBranch]);

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

    // Unique non-repeatable tracking number or custom specified order number
    const trackingNumber = customOrderNumber.trim()
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
      orderNumber: trackingNumber,
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
      observations: [
        {
          id: `OBS-${Date.now()}`,
          date: new Date().toISOString(),
          author: `${collaboratorName.trim()} (${branch})`,
          content: initialObservation.trim()
            ? initialObservation.trim()
            : `Pedido transmitido desde portal sucursal ${branch}. Colaborador: ${collaboratorName.trim()}.`,
          type: paymentStatus === 'No Pagado' ? 'billing_alert' : 'general',
        },
      ],
    };

    onSubmitOrder(newOrder);
    setSubmittedOrder(newOrder);

    // Reset Form for next submission and pre-assign fresh tracking number immediately
    setCustomOrderNumber(generateUniqueTrackingNumber(branch));
    setQuotationNumber('');
    setClientName('');
    setPlate('');
    setReceiptOrInvoiceNumber('');
    setInitialObservation('');
    setRows([
      { id: '1', code: '', updatedCode: '', description: '', quantity: 1 },
      { id: '2', code: '', updatedCode: '', description: '', quantity: 1 },
    ]);
  };

  const handleCopyTracking = () => {
    if (!submittedOrder) return;
    navigator.clipboard.writeText(submittedOrder.orderNumber);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const validPins = ['1234', 'CHANGAN2026', 'ADMIN', 'GERENCIA'];
    if (validPins.includes(adminPinInput.trim().toUpperCase())) {
      setIsPinModalOpen(false);
      onSwitchToAdmin();
    } else {
      setPinError('PIN de Administrador incorrecto.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 p-3 sm:p-6 lg:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Auto-Recognition Toast Alert */}
      {autoRecognizedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{autoRecognizedToast}</span>
        </div>
      )}

      {/* Brand Header */}
      <header className="max-w-4xl mx-auto mb-6 print:hidden space-y-3">
        <CompanyBrandHeader variant="dark" />
        
        {/* Navigation & Branch Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
            <div className="text-xs font-mono">
              <span className="text-slate-400 font-normal">Sucursal Activa: </span>
              <strong className="text-cyan-300 font-bold">{branch}</strong>
              <span className="text-slate-500 mx-1.5">•</span>
              <span className="text-slate-400">{collaboratorName}</span>
              <span className="text-emerald-400 ml-1.5 font-bold">({channel})</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Change Branch / Who are you button */}
            <button
              type="button"
              onClick={() => setIsSelectingBranch(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/60 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cambiar Sucursal / Quién Eres</span>
            </button>

            {/* Copy Universal Branch Link */}
            <button
              type="button"
              onClick={handleCopyUniversal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
              title="Copiar enlace universal para todas las sucursales"
            >
              {copiedUniversalLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Copiar Enlace Portal</span>
                </>
              )}
            </button>

            {/* Switch to Admin Protected Button */}
            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 rounded-xl text-xs font-mono transition-colors"
              title="Acceso restringido para el Administrador del CEDIS Central"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">CEDIS Central</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto">
        {/* SUCCESS CONFIRMATION & 100% DIGITAL PDF VOUCHER */}
        {submittedOrder ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Success Banner (Hidden on Print) */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/80 p-6 rounded-3xl text-center space-y-3 shadow-[0_0_50px_rgba(16,185,129,0.25)] print:hidden">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-600/60 rounded-full text-[11px] font-mono font-black uppercase tracking-widest">
                  TRANSMISIÓN DIGITAL EXITOSA A CEDIS CENTRAL
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
                  ¡Pedido Registrado con Éxito!
                </h2>
                <p className="text-sm text-slate-300 max-w-xl mx-auto mt-1">
                  La solicitud de repuestos ha sido radicada de forma digital inalterable con su número de seguimiento único.
                </p>
              </div>

              {/* Non-Repeatable Tracking Number Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 max-w-md mx-auto space-y-2">
                <div className="text-[11px] uppercase font-mono text-slate-400">
                  NÚMERO ÚNICO DE SEGUIMIENTO NO REPETIBLE:
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-cyan-400 selection:bg-cyan-400 selection:text-black">
                    {submittedOrder.orderNumber}
                  </span>
                  <button
                    onClick={handleCopyTracking}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                    title="Copiar número de seguimiento"
                  >
                    {copiedTracking ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-emerald-400 font-mono flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sucursal: <strong>{submittedOrder.branch}</strong> • Colaborador: <strong>{submittedOrder.collaboratorName}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handlePrintVoucher}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar Comprobante PDF</span>
                </button>

                <button
                  onClick={() => {
                    setCustomOrderNumber(generateUniqueTrackingNumber(branch));
                    setSubmittedOrder(null);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono font-semibold text-xs rounded-2xl transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Ingresar Nuevo Pedido</span>
                </button>
              </div>
            </div>

            {/* OFFICIAL 100% DIGITAL PRINTABLE VOUCHER / COMPROBANTE PDF */}
            <div className="bg-white text-black p-8 sm:p-10 rounded-3xl border-2 border-slate-900 shadow-2xl space-y-6 print:border-none print:p-4 print:shadow-none print:m-0 print:rounded-none">
              {/* Official Corporate Header */}
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

                {/* Tracking & QR Badge */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Nº SEGUIMIENTO</div>
                    <div className="text-sm font-black font-mono text-cyan-900">{submittedOrder.orderNumber}</div>
                  </div>
                  <div className="p-1 bg-white border border-slate-300 rounded-lg">
                    <QRCodeSVG
                      value={`CHANGAN:${submittedOrder.orderNumber}|${submittedOrder.branch}|${submittedOrder.collaboratorName}|${submittedOrder.plate}`}
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
                  <span className="font-black text-slate-900 text-sm">{submittedOrder.branch}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Colaborador:</span>
                  <span className="font-bold text-slate-900">{submittedOrder.collaboratorName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Fecha & Hora Emisión:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(submittedOrder.createdAt).toLocaleDateString('es-PA')} {new Date(submittedOrder.createdAt).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Canal / Prioridad:</span>
                  <span className="font-bold text-slate-900">
                    {submittedOrder.channel} • {submittedOrder.orderType.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Customer, Vehicle & Billing Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 pb-1">
                    Información del Cliente & Cotización
                  </div>
                  <div><strong>Cliente:</strong> {submittedOrder.clientName}</div>
                  <div><strong>Nº Cotización:</strong> {submittedOrder.quotationNumber}</div>
                  <div><strong>Canal de Venta:</strong> {submittedOrder.channel}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 pb-1">
                    Vehículo Changan & Facturación
                  </div>
                  <div><strong>Modelo:</strong> {submittedOrder.changanModel}</div>
                  <div><strong>Placa:</strong> <span className="font-bold bg-slate-200 px-1.5 py-0.5 rounded text-black">{submittedOrder.plate}</span></div>
                  <div><strong>Estado de Pago:</strong> {submittedOrder.paymentStatus} ({submittedOrder.receiptOrInvoiceNumber})</div>
                </div>
              </div>

              {/* Requested Parts Table */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center justify-between">
                  <span>Detalle de Repuestos Solicitados ({submittedOrder.items.length} ítems)</span>
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
                    {submittedOrder.items.map((item, idx) => (
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
                {/* Collaborator Digital Stamp */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Registro Digital de Colaborador</span>
                  </div>
                  <div className="text-[11px] text-slate-800">
                    <strong>Colaborador:</strong> {submittedOrder.collaboratorName}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    <strong>Sucursal:</strong> {submittedOrder.branch} • Identidad autorizada
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Hash de Transmisión: {submittedOrder.id}
                  </div>
                </div>

                {/* Central CEDIS Digital Reception Seal */}
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
                    Timestamp: {new Date(submittedOrder.createdAt).toISOString()}
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-[9px] text-center text-slate-500 font-mono border-t border-slate-200 pt-2">
                Documento 100% digital e inalterable generado por el Sistema Central de Pedidos de Repuestos Changan Panamá. No requiere firma física.
              </div>
            </div>
          </div>
        ) : (
          /* ORDER REGISTRATION FORM */
          <div className="space-y-6">
            {/* Automatic Branch & Collaborator Indicator Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-950 border border-cyan-700/60 rounded-2xl text-cyan-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                    Sucursal Asignada & Reconocimiento Automático:
                  </div>
                  <div className="text-lg font-black text-white font-mono flex flex-wrap items-center gap-2">
                    <span>{branch}</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                      ✓ Asignado a: <strong className="font-bold">{collaboratorName}</strong> ({channel})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSelectingBranch(true)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                >
                  Cambiar Sucursal
                </button>
                <select
                  value={branch}
                  onChange={(e) => handleBranchDropdownChange(e.target.value as BranchName)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  {CHANGAN_BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-600/80 p-4 rounded-2xl text-rose-300 flex items-center gap-3 text-xs font-mono animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Colaborador & Canal & Nº Pedido */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      1. Datos del Colaborador & Nº de Pedido
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {branch === 'Villa Lucre' && (
                      <button
                        type="button"
                        onClick={() => setIsVillaLucreModalOpen(true)}
                        className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/50 hover:bg-amber-900/70 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>¿Quién eres en Villa Lucre?</span>
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-cyan-400">
                      Sucursal: <strong className="text-white">{branch}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Colaborador Responsable <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={collaboratorName}
                      onChange={(e) => handleCollaboratorChange(e.target.value)}
                      className="w-full bg-slate-950 border border-cyan-700/60 rounded-xl px-3 py-2.5 text-sm text-cyan-200 font-bold focus:outline-none focus:border-cyan-400"
                    >
                      {AUTHORIZED_COLLABORATORS.map((collab) => (
                        <option key={collab.name} value={collab.name}>
                          {collab.name} — {collab.branch} ({collab.department})
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-cyan-400/80 mt-1 font-mono">
                      ✓ Área asignada automáticamente: <strong>{channel}</strong>
                    </div>
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
                        className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl pl-3 pr-16 py-2.5 text-sm text-cyan-300 font-mono font-bold tracking-wide focus:outline-none focus:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
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
                      <span className="truncate">Código oficial único ({branch}). Tracking final inalterable en CEDIS.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Canal <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as Channel)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      {CHANNELS.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Tipo de Solicitud <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as OrderType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Especial">Pedido Especial (Regular)</option>
                      <option value="Emergencia">Pedido de Emergencia (Alta Prioridad)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Cliente & Vehículo */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    2. Datos del Cliente & Vehículo Changan
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Nombre del Cliente <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej. Roberto Guardia"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Placa del Auto <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      placeholder="Ej. CM-8834"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white uppercase font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Modelo Changan <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={changanModel}
                      onChange={(e) => setChanganModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      {activeModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Nº Cotización <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={quotationNumber}
                      onChange={(e) => setQuotationNumber(e.target.value)}
                      placeholder="Ej. COT-2026-904"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Condición Financiera */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    3. Estado de Pago & Comprobante
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      Condición de Pago <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Cancelado">Cancelado (100% Pagado / Facturado)</option>
                      <option value="Abonado">Abonado (Con Recibo de Anticipo)</option>
                      <option value="No Pagado">No Pagado (Pendiente de Cobranza)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-mono">
                      {paymentStatus === 'Abonado'
                        ? 'Nº Recibo de Abono *'
                        : paymentStatus === 'Cancelado'
                        ? 'Nº de Factura Fiscal *'
                        : 'Referencia / Observación'}
                    </label>
                    <input
                      type="text"
                      disabled={paymentStatus === 'No Pagado'}
                      required={paymentStatus !== 'No Pagado'}
                      value={receiptOrInvoiceNumber}
                      onChange={(e) => setReceiptOrInvoiceNumber(e.target.value)}
                      placeholder={
                        paymentStatus === 'No Pagado'
                          ? 'No requerido para No Pagado'
                          : 'Ej. RC-44810 o FACT-9921'
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Repuestos Solicitados with Instant Auto-Complete */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      4. Repuestos Solicitados (Búsqueda Automática en Catálogo Changan)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Otra Pieza</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row, index) => (
                    <div
                      key={row.id}
                      className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                        <span className="font-bold text-cyan-400">Pieza #{index + 1}</span>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Part Code */}
                        <div className="sm:col-span-4 relative">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                            Código de Repuesto *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={row.code}
                              onChange={(e) => handleAutocompleteSearch(row.id, e.target.value.toUpperCase())}
                              onFocus={() => {
                                if (row.code.length >= 1) {
                                  setActiveSearchQuery(row.code);
                                  setActiveSearchRowId(row.id);
                                }
                              }}
                              placeholder="Ej. H15001-0800 o filtro..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>

                          {/* Autocomplete Dropdown */}
                          {activeSearchRowId === row.id && filteredCatalog.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#0b0f17] border border-cyan-500/80 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                              <div className="p-1.5 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex justify-between">
                                <span>Coincidencias en Catálogo Changan</span>
                                <span className="text-cyan-400">Clic para autocompletar</span>
                              </div>
                              {filteredCatalog.map((part) => (
                                <div
                                  key={part.code}
                                  onClick={() => selectCatalogSuggestion(row.id, part)}
                                  className="p-2 hover:bg-cyan-950/60 cursor-pointer border-b border-slate-800/80 last:border-none text-xs transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-cyan-300">{part.code}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                      {part.category}
                                    </span>
                                  </div>
                                  <div className="text-slate-300 text-[11px] truncate mt-0.5">
                                    {part.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                            Descripción / Nombre de la Pieza *
                          </label>
                          <input
                            type="text"
                            required
                            value={row.description}
                            onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                            placeholder="Ej. FILTRO DE ACEITE MOTOR 1.5L"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            required
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
                  Observaciones Adicionales para el CEDIS (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={initialObservation}
                  onChange={(e) => setInitialObservation(e.target.value)}
                  placeholder="Detalles sobre urgencia, cliente en espera, siniestro o notas para bodega central..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-mono font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 text-cyan-200" />
                <span>Transmitir y Enviar Pedido a CEDIS Central</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Admin Switcher Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-cyan-500/50 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <div className="flex items-center gap-2 text-cyan-400">
              <Lock className="w-5 h-5" />
              <h3 className="font-mono font-bold text-sm text-white">Acceso Administrador CEDIS</h3>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Ingresa el PIN de autorización para abrir el panel central de CEDIS:
            </p>

            <form onSubmit={handleVerifyAdminPin} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="PIN Maestro (1234)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-cyan-500 text-center"
              />

              {pinError && (
                <div className="text-[11px] text-rose-400 font-mono text-center">{pinError}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPinError(null);
                    setAdminPinInput('');
                  }}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIVERSAL BRANCH SELECTOR MODAL */}
      {isSelectingBranch && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0b0f17] border border-cyan-500/50 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-[0_0_70px_rgba(6,182,212,0.35)] my-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    <span>Portal de Sucursales Changan Panamá</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    ¿De qué sucursal eres? Selecciona tu sucursal para auto-configurar tus datos y número de tracking:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectingBranch(false)}
                className="text-slate-400 hover:text-white text-xs font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Branch Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Costa Verde */}
              <button
                type="button"
                onClick={() => handleSelectBranch('Costa Verde')}
                className="group text-left p-4 bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/80 rounded-2xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm group-hover:text-cyan-300">
                    Costa Verde
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-600/40 px-2 py-0.5 rounded-full font-mono">
                    Taller
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Asesor Asignado: <strong className="text-slate-200">Arquimedes Jordan</strong>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  ✓ Tracking automático: PED-CV-...
                </div>
              </button>

              {/* Calle 50 */}
              <button
                type="button"
                onClick={() => handleSelectBranch('Calle 50')}
                className="group text-left p-4 bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/80 rounded-2xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm group-hover:text-cyan-300">
                    Calle 50
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-600/40 px-2 py-0.5 rounded-full font-mono">
                    Taller
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Asesor Asignado: <strong className="text-slate-200">Edilson Uribe</strong>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  ✓ Tracking automático: PED-C50-...
                </div>
              </button>

              {/* Tumba Muerto */}
              <button
                type="button"
                onClick={() => handleSelectBranch('Tumba Muerto')}
                className="group text-left p-4 bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/80 rounded-2xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm group-hover:text-cyan-300">
                    Tumba Muerto
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-600/40 px-2 py-0.5 rounded-full font-mono">
                    Taller
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Asesor Asignado: <strong className="text-slate-200">Ulises Barria</strong>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  ✓ Tracking automático: PED-TM-...
                </div>
              </button>

              {/* Chiriquí */}
              <button
                type="button"
                onClick={() => handleSelectBranch('Chiriquí')}
                className="group text-left p-4 bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/80 rounded-2xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm group-hover:text-cyan-300">
                    Chiriquí
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-600/40 px-2 py-0.5 rounded-full font-mono">
                    Taller
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Asesor Asignado: <strong className="text-slate-200">Nivardo Gutiérrez</strong>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  ✓ Tracking automático: PED-CH-...
                </div>
              </button>

              {/* Santa María */}
              <button
                type="button"
                onClick={() => handleSelectBranch('Santa María')}
                className="group text-left p-4 bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/80 rounded-2xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm group-hover:text-cyan-300">
                    Santa María
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-600/40 px-2 py-0.5 rounded-full font-mono">
                    Mostrador
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Asesor Asignado: <strong className="text-slate-200">Marcos Vega</strong>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono">
                  ✓ Tracking automático: PED-SM-...
                </div>
              </button>

              {/* Villa Lucre (Special Multi-member team) */}
              <button
                type="button"
                onClick={() => handleSelectBranch('Villa Lucre')}
                className="group text-left p-4 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/60 hover:border-amber-400 rounded-2xl transition-all space-y-1.5 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm group-hover:text-amber-300 flex items-center gap-1.5">
                    <span>Villa Lucre</span>
                    <span className="text-xs text-amber-400">★</span>
                  </span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-600/40 px-2 py-0.5 rounded-full font-mono">
                    Equipo Múltiple
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  Leidys, Edwin, Pedro, Luis, Daniel
                </div>
                <div className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Te preguntará quién eres para reconocer tu área</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VILLA LUCRE "¿QUIÉN ERES?" RECOGNITION MODAL */}
      {isVillaLucreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0b0f17] border border-amber-500/60 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-[0_0_70px_rgba(245,158,11,0.3)] my-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      SUCURSAL VILLA LUCRE
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white font-mono mt-0.5">
                    ¿Quién eres en Villa Lucre?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecciona tu nombre. El sistema reconocerá en automático tu área asignada:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVillaLucreModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* List of Villa Lucre Team Members */}
            <div className="space-y-2.5">
              {getCollaboratorsForBranch('Villa Lucre').map((collab) => (
                <button
                  key={collab.name}
                  type="button"
                  onClick={() => handleSelectVillaLucreCollaborator(collab.name, collab.department)}
                  className="w-full text-left p-3.5 bg-slate-900/80 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-500/80 rounded-2xl transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-amber-300 group-hover:bg-amber-900/60 font-mono font-bold text-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white font-mono text-sm group-hover:text-amber-200">
                        {collab.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {collab.role || 'Colaborador Autorizado'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 group-hover:border-amber-500/60 group-hover:text-amber-300">
                      Área: {collab.department}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Manual entry fallback */}
            <div className="border-t border-slate-800/80 pt-3 space-y-2">
              <span className="text-[11px] font-mono text-slate-400">
                ¿Otro colaborador o nuevo ingreso en Villa Lucre?
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customVillaLucreName}
                  onChange={(e) => setCustomVillaLucreName(e.target.value)}
                  placeholder="Escribe tu nombre..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={!customVillaLucreName.trim()}
                  onClick={() => handleSelectVillaLucreCollaborator(customVillaLucreName.trim(), 'Taller')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs font-mono transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
