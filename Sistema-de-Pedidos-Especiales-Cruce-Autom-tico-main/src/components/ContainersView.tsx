import {
  AlertCircle,
  ArrowRight,
  Box,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Edit3,
  FileSpreadsheet,
  Layers,
  MapPin,
  Package,
  Plus,
  PlusCircle,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Truck,
  UploadCloud,
  X,
  Zap
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import {
  GlobalCrossDockResult,
  runAutoMatchAllocation,
  runGlobalCrossDockMatching
} from '../utils/matchingEngine';
import {
  downloadChanganManifestTemplate,
  parseContainerExcelFile,
  ParsedContainerExcel,
} from '../utils/excelContainerParser';
import {
  AutoMatchResult,
  BranchName,
  ContainerManifestItem,
  ShippingContainer,
  SpecialOrder
} from '../types';

interface ContainersViewProps {
  containers: ShippingContainer[];
  orders: SpecialOrder[];
  onUpdateContainersAndOrders: (
    updatedContainers: ShippingContainer[],
    updatedOrders: SpecialOrder[],
    matchResult: AutoMatchResult
  ) => void;
  onAddContainer: (container: ShippingContainer) => void;
  onUpdateContainer?: (container: ShippingContainer) => void;
  onDeleteContainer?: (containerId: string) => void;
  onNavigateToDispatchSummary?: (containerId?: string) => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  containers,
  orders,
  onUpdateContainersAndOrders,
  onAddContainer,
  onUpdateContainer,
  onDeleteContainer,
  onNavigateToDispatchSummary,
}) => {
  const [selectedContainer, setSelectedContainer] = useState<ShippingContainer | null>(
    containers[0] || null
  );
  const [isProcessingMatch, setIsProcessingMatch] = useState(false);
  const [isProcessingGlobalMatch, setIsProcessingGlobalMatch] = useState(false);
  const [matchResultModal, setMatchResultModal] = useState<AutoMatchResult | null>(null);
  const [globalMatchModalResult, setGlobalMatchModalResult] = useState<GlobalCrossDockResult | null>(null);
  const [isAddContainerModalOpen, setIsAddContainerModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<ShippingContainer | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [excelUploadSuccess, setExcelUploadSuccess] = useState<string | null>(null);
  const [excelUploadErrors, setExcelUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // New container form state
  const [newContainerNumber, setNewContainerNumber] = useState('');
  const [newSupplier, setNewSupplier] = useState('Mobitech CO, Ltd');
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newType, setNewType] = useState<'Marítimo' | 'Aéreo Express'>('Marítimo');
  const [newEstimatedDate, setNewEstimatedDate] = useState('');
  const [manifestRawText, setManifestRawText] = useState('');
  const [parsedManifestItemsPreview, setParsedManifestItemsPreview] = useState<ContainerManifestItem[]>([]);

  // Editing container form state
  const [editFormContainerNumber, setEditFormContainerNumber] = useState('');
  const [editFormSupplier, setEditFormSupplier] = useState('');
  const [editFormPoNumber, setEditFormPoNumber] = useState('');
  const [editFormType, setEditFormType] = useState<'Marítimo' | 'Aéreo Express'>('Marítimo');
  const [editFormArrivalStatus, setEditFormArrivalStatus] = useState<
    'En Tránsito' | 'En Puerto / Aduana' | 'Recibido en CEDIS'
  >('En Tránsito');
  const [editFormEstimatedDate, setEditFormEstimatedDate] = useState('');
  const [editFormActualDate, setEditFormActualDate] = useState('');
  const [editFormItems, setEditFormItems] = useState<ContainerManifestItem[]>([]);

  const handleFileUpload = async (file: File) => {
    setIsUploadingExcel(true);
    setExcelUploadErrors([]);
    setExcelUploadSuccess(null);

    try {
      const parsed: ParsedContainerExcel = await parseContainerExcelFile(file);

      // Create new container directly or populate form
      const totalUnits = parsed.items.reduce((acc, i) => acc + i.totalQuantity, 0);

      const newCont: ShippingContainer = {
        id: `CONT-${Date.now()}`,
        containerNumber: parsed.containerNumber,
        supplier: parsed.supplier,
        poNumber: parsed.poNumber,
        type: parsed.transportType,
        arrivalStatus: parsed.arrivalStatus || 'En Tránsito',
        estimatedArrivalDate: parsed.estimatedArrivalDate,
        actualArrivalDate: parsed.arrivalStatus === 'Recibido en CEDIS' ? new Date().toISOString().split('T')[0] : undefined,
        totalUnits,
        totalSkus: parsed.items.length,
        items: parsed.items,
        processedForMatching: false,
      };

      onAddContainer(newCont);
      setSelectedContainer(newCont);
      setExcelUploadSuccess(
        `¡Embarque / Contenedor ${newCont.containerNumber} cargado exitosamente (${newCont.arrivalStatus}) con ${parsed.items.length} códigos y ${totalUnits} unidades físicas!`
      );

      if (parsed.warnings.length > 0) {
        setExcelUploadErrors(parsed.warnings);
      }

      // Close modal if open
      setIsAddContainerModalOpen(false);
    } catch (err: any) {
      setExcelUploadErrors([err.message || 'Error al procesar el archivo Excel. Verifique el formato.']);
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handleModalExcelUpload = async (file: File) => {
    setIsUploadingExcel(true);
    try {
      const parsed: ParsedContainerExcel = await parseContainerExcelFile(file);
      setNewContainerNumber(parsed.containerNumber);
      setNewSupplier(parsed.supplier);
      setNewPoNumber(parsed.poNumber);
      setNewType(parsed.transportType);
      setNewEstimatedDate(parsed.estimatedArrivalDate);
      setParsedManifestItemsPreview(parsed.items);

      // Format text area
      const textLines = parsed.items
        .map((it) => `${it.code}, ${it.description}, ${it.totalQuantity}, ${it.warehouseLocation}`)
        .join('\n');
      setManifestRawText(textLines);
    } catch (err: any) {
      alert(`Error al leer Excel: ${err.message}`);
    } finally {
      setIsUploadingExcel(false);
    }
  };

  // Quick toggle to Mark Container as Recibido en CEDIS or En Tránsito
  const handleToggleArrivalStatus = (container: ShippingContainer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isCurrentlyReceived = container.arrivalStatus === 'Recibido en CEDIS';

    const newStatus = isCurrentlyReceived ? 'En Tránsito' : 'Recibido en CEDIS';
    const updated: ShippingContainer = {
      ...container,
      arrivalStatus: newStatus,
      actualArrivalDate: newStatus === 'Recibido en CEDIS' ? new Date().toISOString().split('T')[0] : undefined,
    };

    if (onUpdateContainer) {
      onUpdateContainer(updated);
    }
    if (selectedContainer?.id === container.id) {
      setSelectedContainer(updated);
    }
  };

  const handleExecuteAutoMatch = (container: ShippingContainer) => {
    // If container is still in transit, confirm arrival first
    if (container.arrivalStatus !== 'Recibido en CEDIS') {
      const confirmArrival = window.confirm(
        `📦 El contenedor "${container.containerNumber}" figura como "${container.arrivalStatus}".\n\n¿Desea marcarlo como RECIBIDO EN CEDIS y proceder con el cruce automático de repuestos?`
      );
      if (!confirmArrival) return;
    }

    setIsProcessingMatch(true);

    setTimeout(() => {
      const containerToMatch = {
        ...container,
        arrivalStatus: 'Recibido en CEDIS' as const,
        actualArrivalDate: container.actualArrivalDate || new Date().toISOString().split('T')[0],
      };

      const { updatedContainer, updatedOrders, result } = runAutoMatchAllocation(
        containerToMatch,
        orders
      );

      const updatedContainersList = containers.map((c) =>
        c.id === updatedContainer.id ? updatedContainer : c
      );

      onUpdateContainersAndOrders(updatedContainersList, updatedOrders, result);
      setSelectedContainer(updatedContainer);
      setIsProcessingMatch(false);
      setMatchResultModal(result);
    }, 600);
  };

  const handleExecuteGlobalMatch = () => {
    const receivedCount = containers.filter(
      (c) => c.arrivalStatus === 'Recibido en CEDIS' || c.arrivalStatus === 'En Bodega CEDIS'
    ).length;

    if (receivedCount === 0 && containers.length > 0) {
      alert(
        '⚠️ ATENCIÓN: Todos los contenedores están actualmente marcados como "En Tránsito".\n\nPara evitar asignaciones falsas antes de tiempo, el Cruce Automático solo procesa contenedores marcados como "Recibido en CEDIS".\n\nPor favor marque como "Recibido en CEDIS" los contenedores que hayan arribado físicamente a la bodega.'
      );
      return;
    }

    setIsProcessingGlobalMatch(true);
    setTimeout(() => {
      const { updatedContainers, updatedOrders, result } = runGlobalCrossDockMatching(
        containers,
        orders
      );

      onUpdateContainersAndOrders(updatedContainers, updatedOrders, {
        containerNumber: 'TODOS LOS CONTENEDORES CEDIS',
        totalItemsProcessed: result.totalContainersProcessed,
        matchedOrdersCount: result.matchedDetails.length,
        partialMatchesCount: result.ordersPartiallyFulfilledCount,
        allocatedItemsTotal: result.totalAllocatedItems,
        ordersFulfilledCount: result.ordersFulfilledCount,
        branchBreakdown: result.branchBreakdown,
        matchedDetails: result.matchedDetails.map((m) => ({
          orderNumber: m.orderNumber,
          clientName: m.clientName,
          branch: m.branch,
          partCode: m.partCode,
          description: m.description,
          quantity: m.quantity,
          locationInCedis: `${m.containerNumber} (${m.locationInCedis})`,
        })),
      });

      if (updatedContainers.length > 0) {
        setSelectedContainer(updatedContainers[0]);
      }
      setIsProcessingGlobalMatch(false);
      setGlobalMatchModalResult(result);
    }, 600);
  };

  const handleCreateContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainerNumber.trim()) return;

    let parsedItems: ContainerManifestItem[] = [];

    if (parsedManifestItemsPreview.length > 0) {
      parsedItems = parsedManifestItemsPreview;
    } else {
      // Parse manifest lines: Code, Description, Quantity, Location
      const lines = manifestRawText.split('\n').filter((l) => l.trim().length > 0);

      if (lines.length > 0) {
        lines.forEach((line, idx) => {
          const parts = line.split(/[,\t|]/).map((p) => p.trim());
          if (parts.length >= 2) {
            const code = parts[0];
            const description = parts[1] || 'Repuesto Changan';
            const qty = parseInt(parts[2]) || 1;
            const loc = parts[3] || 'CEDIS-ZONA-GENERAL';
            parsedItems.push({
              id: `MAN-${Date.now()}-${idx}`,
              code: code.toUpperCase(),
              description,
              totalQuantity: qty,
              assignedQuantity: 0,
              warehouseLocation: loc,
            });
          }
        });
      }
    }

    // Default fallback item if empty
    if (parsedItems.length === 0) {
      parsedItems.push({
        id: `MAN-${Date.now()}-0`,
        code: 'S111F260204-1504',
        description: 'SHOCK ABSORBER ASSY, RR',
        totalQuantity: 4,
        assignedQuantity: 0,
        warehouseLocation: 'E-02-B-A04',
      });
    }

    const totalUnits = parsedItems.reduce((acc, i) => acc + i.totalQuantity, 0);

    const newCont: ShippingContainer = {
      id: `CONT-${Date.now()}`,
      containerNumber: newContainerNumber.trim().toUpperCase(),
      supplier: newSupplier.trim() || 'Mobitech Changan China Co., Ltd',
      poNumber: newPoNumber.trim() || `REF-${Date.now()}`,
      type: newType,
      arrivalStatus: 'En Tránsito',
      estimatedArrivalDate: newEstimatedDate || new Date().toISOString().split('T')[0],
      totalUnits,
      totalSkus: parsedItems.length,
      items: parsedItems,
      processedForMatching: false,
    };

    onAddContainer(newCont);
    setSelectedContainer(newCont);
    setIsAddContainerModalOpen(false);

    // Reset Form
    setNewContainerNumber('');
    setNewPoNumber('');
    setManifestRawText('');
    setParsedManifestItemsPreview([]);
  };

  const handleOpenEditContainer = (cont: ShippingContainer) => {
    setEditingContainer(cont);
    setEditFormContainerNumber(cont.containerNumber);
    setEditFormSupplier(cont.supplier);
    setEditFormPoNumber(cont.poNumber);
    setEditFormType(cont.type);
    setEditFormArrivalStatus(cont.arrivalStatus);
    setEditFormEstimatedDate(cont.estimatedArrivalDate || '');
    setEditFormActualDate(cont.actualArrivalDate || '');
    setEditFormItems(JSON.parse(JSON.stringify(cont.items)));
  };

  const handleSaveEditContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContainer || !editFormContainerNumber.trim()) return;

    const totalUnits = editFormItems.reduce((acc, i) => acc + (Number(i.totalQuantity) || 0), 0);

    const updated: ShippingContainer = {
      ...editingContainer,
      containerNumber: editFormContainerNumber.trim().toUpperCase(),
      supplier: editFormSupplier.trim(),
      poNumber: editFormPoNumber.trim(),
      type: editFormType,
      arrivalStatus: editFormArrivalStatus,
      estimatedArrivalDate: editFormEstimatedDate,
      actualArrivalDate: editFormActualDate || undefined,
      totalUnits,
      totalSkus: editFormItems.length,
      items: editFormItems,
    };

    if (onUpdateContainer) {
      onUpdateContainer(updated);
    }
    if (selectedContainer?.id === updated.id) {
      setSelectedContainer(updated);
    }
    setEditingContainer(null);
  };

  const handleDeleteContainerClick = (cont: ShippingContainer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `¿Desea ELIMINAR el contenedor "${cont.containerNumber}" (${cont.totalUnits} piezas, ${cont.supplier})?\n\nEsta acción quitará el contenedor del sistema.`
    );
    if (confirmed) {
      if (onDeleteContainer) {
        onDeleteContainer(cont.id);
      }
      if (selectedContainer?.id === cont.id) {
        const remaining = containers.filter((c) => c.id !== cont.id);
        setSelectedContainer(remaining[0] || null);
      }
    }
  };

  const handleDeleteManifestItem = (itemId: string) => {
    if (!selectedContainer) return;
    const confirmed = window.confirm('¿Desea eliminar este repuesto del manifiesto del contenedor?');
    if (!confirmed) return;

    const updatedItems = selectedContainer.items.filter((it) => it.id !== itemId);
    const totalUnits = updatedItems.reduce((a, b) => a + b.totalQuantity, 0);
    const updated: ShippingContainer = {
      ...selectedContainer,
      items: updatedItems,
      totalUnits,
      totalSkus: updatedItems.length,
    };

    if (onUpdateContainer) {
      onUpdateContainer(updated);
    }
    setSelectedContainer(updated);
  };

  const handleAddEditItemRow = () => {
    const newItem: ContainerManifestItem = {
      id: `MAN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: '',
      description: '',
      totalQuantity: 1,
      assignedQuantity: 0,
      warehouseLocation: 'CEDIS-ZONA-A',
    };
    setEditFormItems([...editFormItems, newItem]);
  };

  const handleRemoveEditItemRow = (idx: number) => {
    setEditFormItems(editFormItems.filter((_, i) => i !== idx));
  };

  const handleUpdateEditItemField = (idx: number, field: keyof ContainerManifestItem, value: any) => {
    const updated = [...editFormItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditFormItems(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / HUD */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[90px] rounded-full pointer-events-none"></div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-mono font-bold">
                CONCILIACIÓN DE EMBARQUES // CEDIS CROSS-DOCKING ENGINE
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              Cruce & Manifiestos de Contenedores Changan
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Cargue el manifiesto de importación en formato Excel (.xlsx, .csv) o ingréselo manualmente.
              El motor cruza instantáneamente los repuestos recibidos con las solicitudes pendientes de las sucursales.
            </p>
          </div>

          {/* Action Buttons: Excel Upload, Template Download, Manual Entry */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hidden Excel File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                  e.target.value = '';
                }
              }}
            />

            <button
              onClick={() => downloadChanganManifestTemplate()}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
              title="Descargar plantilla oficial de Excel para carga masiva de contenedores"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Plantilla Excel</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/60 hover:border-emerald-400 text-emerald-300 rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{isUploadingExcel ? 'Procesando Excel...' : 'Subir Excel Contenedor'}</span>
            </button>

            {/* Global Cross-Docking Execution Button */}
            <button
              type="button"
              disabled={isProcessingGlobalMatch}
              onClick={handleExecuteGlobalMatch}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_16px_rgba(245,158,11,0.4)] border border-amber-300/40"
              title="Cruzar todos los contenedores ingresados contra todos los pedidos de sucursales"
            >
              {isProcessingGlobalMatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Cruzando Todos...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-slate-950 fill-current" />
                  <span>⚡ Cruce Global CEDIS</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsAddContainerModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Contenedor</span>
            </button>
          </div>
        </div>

        {/* Upload feedback alert */}
        {excelUploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs text-emerald-300 font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{excelUploadSuccess}</span>
            </div>
            <button onClick={() => setExcelUploadSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {excelUploadErrors.length > 0 && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl space-y-1 text-xs text-rose-300 font-mono animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Advertencias de Importación:</span>
              </div>
              <button onClick={() => setExcelUploadErrors([])} className="text-rose-400 hover:text-white">✕</button>
            </div>
            {excelUploadErrors.map((err, idx) => (
              <div key={idx} className="pl-6 text-[11px] text-rose-300/90">• {err}</div>
            ))}
          </div>
        )}
      </div>

      {/* Containers Grid & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Containers (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400 px-1">
            <span>Contenedores Registrados ({containers.length})</span>
            <span className="text-cyan-400 font-bold">En Tránsito & CEDIS</span>
          </div>

          <div className="space-y-3">
            {containers.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/30 border border-slate-800 rounded-2xl text-slate-500 text-xs font-mono">
                No hay contenedores registrados actualmente. Use el botón "Registrar Nuevo Contenedor" para agregar uno.
              </div>
            ) : (
              containers.map((cont) => {
                const isSelected = selectedContainer?.id === cont.id;
                const isProcessed = cont.processedForMatching;

                return (
                  <div
                    key={cont.id}
                    onClick={() => setSelectedContainer(cont)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-slate-800/80 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    {isProcessed && (
                      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                        <div className="bg-emerald-500 text-black text-[9px] font-mono font-black py-0.5 text-center transform rotate-45 translate-x-4 translate-y-2 shadow-sm">
                          CRUZADO
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                          cont.type === 'Marítimo'
                            ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
                            : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                        }`}
                      >
                        {cont.type}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                          cont.arrivalStatus === 'Recibido en CEDIS' || cont.arrivalStatus === 'En Bodega CEDIS'
                            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                            : 'bg-amber-950/70 border-amber-500/50 text-amber-300 animate-pulse'
                        }`}
                      >
                        {cont.arrivalStatus === 'Recibido en CEDIS' || cont.arrivalStatus === 'En Bodega CEDIS'
                          ? '🟢 Recibido en CEDIS'
                          : '🟡 En Tránsito (Por Llegar)'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      <span>{cont.containerNumber}</span>
                    </h3>

                    <div className="text-xs text-slate-400 mt-1">
                      Proveedor: <span className="text-slate-200">{cont.supplier}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">TOTAL UNIDADES</span>
                        <span className="text-white font-bold">{cont.totalUnits} piezas</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">LÍNEAS / SKUS</span>
                        <span className="text-cyan-400 font-bold">{cont.totalSkus} SKUs</span>
                      </div>
                    </div>

                    {/* Quick Reception Action Button */}
                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleToggleArrivalStatus(cont, e)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all border ${
                          cont.arrivalStatus === 'Recibido en CEDIS' || cont.arrivalStatus === 'En Bodega CEDIS'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                            : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                        }`}
                        title={
                          cont.arrivalStatus === 'Recibido en CEDIS'
                            ? 'Cambiar a En Tránsito'
                            : 'Dar luz verde de que el contenedor arribó físicamente al CEDIS'
                        }
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>
                          {cont.arrivalStatus === 'Recibido en CEDIS' || cont.arrivalStatus === 'En Bodega CEDIS'
                            ? 'Revertir a Tránsito'
                            : 'Marcar Recibido CEDIS'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditContainer(cont);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg text-[10px] font-mono flex items-center gap-1 border border-slate-700 transition-colors"
                          title="Editar datos del contenedor o manifiesto"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteContainerClick(cont, e)}
                          className="px-2 py-1 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg text-[10px] font-mono flex items-center gap-1 border border-slate-700 hover:border-rose-700 transition-colors"
                          title="Eliminar este contenedor"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Container Detailed Inspector & Auto-Match Engine (8 cols) */}
        {selectedContainer ? (
          <div className="lg:col-span-8 space-y-6">
            {/* Arrival Status Alert Banner */}
            {selectedContainer.arrivalStatus !== 'Recibido en CEDIS' && selectedContainer.arrivalStatus !== 'En Bodega CEDIS' ? (
              <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-200 font-mono flex items-center gap-2">
                      <span>🟡 CONTENEDOR EN TRÁNSITO (PENDIENTE DE LLEGADA FÍSICA)</span>
                    </h4>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Este contenedor está cargado en el sistema con su información completa pero <strong>NO se cruzará automáticamente</strong> hasta que usted confirme su llegada al CEDIS con el botón de "Dar Luz Verde".
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleArrivalStatus(selectedContainer)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-bold font-mono shrink-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>✅ Marcar Recibido en CEDIS</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>
                    <strong>🟢 FÍSICAMENTE RECIBIDO EN CEDIS</strong> • Fecha de arribo:{' '}
                    {selectedContainer.actualArrivalDate || selectedContainer.estimatedArrivalDate || 'Confirmado hoy'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleArrivalStatus(selectedContainer)}
                  className="text-[10px] text-slate-400 hover:text-amber-300 underline"
                  title="Cambiar nuevamente a En Tránsito si fue un error"
                >
                  Cambiar a En Tránsito
                </button>
              </div>
            )}

            {/* Action Card / Auto-Match Execution HUD */}
            <div className="bg-gradient-to-br from-slate-900/90 to-[#050608] border border-slate-800 p-6 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-bold">
                      DETALLES DEL MANIFIESTO // {selectedContainer.type.toUpperCase()}
                    </span>
                    {selectedContainer.processedForMatching ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-mono font-bold">
                        CRUCE EJECUTADO & ASIGNADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-mono font-bold">
                        {selectedContainer.arrivalStatus === 'Recibido en CEDIS'
                          ? 'LISTO PARA CRUCE'
                          : 'EN ESPERA DE ARRIBO'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white font-mono mt-1">
                    {selectedContainer.containerNumber}
                  </h2>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {onNavigateToDispatchSummary && (
                    <button
                      onClick={() => onNavigateToDispatchSummary(selectedContainer.id)}
                      className="px-3.5 py-2.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 hover:border-emerald-400 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      title="Ver matriz y lista de repuestos a despachar por sucursal desde este contenedor"
                    >
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Despacho x Sucursal</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditContainer(selectedContainer)}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all"
                    title="Editar información o manifiesto del contenedor"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Editar Contenedor</span>
                  </button>

                  <button
                    onClick={() => handleDeleteContainerClick(selectedContainer)}
                    className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 hover:border-rose-500 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all"
                    title="Eliminar permanentemente este contenedor"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Eliminar</span>
                  </button>

                  <button
                    onClick={() => handleExecuteAutoMatch(selectedContainer)}
                    disabled={isProcessingMatch}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] ${
                      selectedContainer.processedForMatching
                        ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40'
                        : selectedContainer.arrivalStatus === 'Recibido en CEDIS'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white'
                    }`}
                  >
                    {isProcessingMatch ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Cruzando...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-cyan-200" />
                        <span>
                          {selectedContainer.processedForMatching
                            ? 'Re-Ejecutar Cruce'
                            : selectedContainer.arrivalStatus === 'Recibido en CEDIS'
                            ? '⚡ Ejecutar Cruce CEDIS'
                            : '📥 Recibir en CEDIS & Cruzar'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono">
                <div className="bg-black/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px]">PROVEEDOR</span>
                  <span className="text-slate-200 font-semibold truncate block">
                    {selectedContainer.supplier}
                  </span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px]">PO / REFERENCIA ORIGEN</span>
                  <span className="text-cyan-300 font-semibold truncate block">
                    {selectedContainer.poNumber || selectedContainer.containerNumber}
                  </span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px]">TIPO DE TRANSPORTE</span>
                  <span className="text-slate-200 font-semibold truncate block">
                    {selectedContainer.type}
                  </span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px]">FECHA ARRIBO CEDIS</span>
                  <span className="text-emerald-400 font-semibold block">
                    {selectedContainer.actualArrivalDate || selectedContainer.estimatedArrivalDate || 'Por definir'}
                  </span>
                </div>
              </div>
            </div>

            {/* Container Manifest Items Table */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Contenido del Manifiesto ({selectedContainer.items.length} Códigos Changan)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedContainer.items.reduce((a, b) => a + b.totalQuantity, 0)} unidades físicas
                  </span>
                  <button
                    onClick={() => handleOpenEditContainer(selectedContainer)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-1 border border-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Añadir/Modificar Repuestos</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="sticky top-0 bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400 z-10">
                    <tr>
                      <th className="py-2.5 px-4">Código Repuesto</th>
                      <th className="py-2.5 px-4">Descripción Oficial</th>
                      <th className="py-2.5 px-3 text-center">Cant. Total</th>
                      <th className="py-2.5 px-3 text-center">Asignado a Sucursales</th>
                      <th className="py-2.5 px-3 text-center">Sobrante a Stock</th>
                      <th className="py-2.5 px-4">Ubicación CEDIS</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {selectedContainer.items.map((item) => {
                      const assigned = item.assignedQuantity || 0;
                      const surplus = Math.max(0, item.totalQuantity - assigned);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/20">
                          <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                            {item.code}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{item.description}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-white">
                            {item.totalQuantity}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold ${
                                assigned > 0
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                  : 'text-slate-500'
                              }`}
                            >
                              {assigned} u.
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {surplus} u.
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-cyan-500" />
                            <span className="text-cyan-400/90">{item.warehouseLocation}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteManifestItem(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Eliminar este repuesto del manifiesto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex items-center justify-center p-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 font-mono text-xs">
            Seleccione un contenedor o registre uno nuevo para inspeccionar su manifiesto y ejecutar el cruce.
          </div>
        )}
      </div>

      {/* Auto-Match Result Telemetry Modal */}
      {matchResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-cyan-500/60 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold">
                    RESULTADO DEL CRUCE AUTOMÁTICO
                  </div>
                  <h3 className="text-xl font-bold text-white font-mono">
                    Contenedor {matchResultModal.containerNumber}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setMatchResultModal(null)}
                className="text-slate-400 hover:text-white text-xs font-mono p-1.5"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* High Impact Telemetry Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Piezas Asignadas
                </span>
                <span className="text-3xl font-bold text-cyan-400 font-mono">
                  {matchResultModal.totalAllocatedItems}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">unidades físicas</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Órdenes Completadas
                </span>
                <span className="text-3xl font-bold text-emerald-400 font-mono">
                  {matchResultModal.ordersFulfilledCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">100% repuestos listos</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Sobrante a Stock
                </span>
                <span className="text-3xl font-bold text-slate-300 font-mono">
                  {matchResultModal.unmatchedSurplusItems.reduce((a, b) => a + b.quantity, 0)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">a estanterías CEDIS</span>
              </div>
            </div>

            {/* Branch Allocation Breakdown */}
            <div className="bg-black/40 border border-slate-800/80 p-4 rounded-2xl space-y-3">
              <div className="text-xs uppercase font-mono font-bold text-slate-300">
                Distribución Automática por Sucursal Changan
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                {Object.entries(matchResultModal.branchBreakdown).map(([branch, count]) => {
                  const numCount = Number(count);
                  return (
                    <div
                      key={branch}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800"
                    >
                      <span className="text-slate-400">{branch}:</span>
                      <span
                        className={`font-bold ${
                          numCount > 0 ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      >
                        {numCount} piezas
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setMatchResultModal(null)}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                Aceptar & Ver Despachos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Cross-Docking Audit Result Modal */}
      {globalMatchModalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#07090e] border border-cyan-500/60 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Resultado de Cruce Automático Global CEDIS
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conciliación inteligente en todos los contenedores con normalización Changan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGlobalMatchModalResult(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Repuestos Asignados</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  {globalMatchModalResult.totalAllocatedItems}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  unidades cruzadas
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Órdenes Completas</span>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-0.5">
                  {globalMatchModalResult.ordersFulfilledCount}
                </div>
                <div className="text-[10px] font-mono text-cyan-300">
                  100% en Bodega CEDIS
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Contenedores Cruzados</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  {globalMatchModalResult.receivedContainersCount || globalMatchModalResult.totalContainersProcessed}
                </div>
                <div className="text-[10px] font-mono text-emerald-300">
                  recibidos en CEDIS
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-mono text-slate-400 uppercase">En Tránsito (Excluidos)</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">
                  {globalMatchModalResult.inTransitContainersCount || 0}
                </div>
                <div className="text-[10px] font-mono text-amber-300">
                  protegidos sin cruce
                </div>
              </div>
            </div>

            {/* In Transit Safety Notice if any */}
            {(globalMatchModalResult.inTransitContainersCount || 0) > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs font-mono text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Aviso de Seguridad:</strong> {globalMatchModalResult.inTransitContainersCount} contenedor(es) en tránsito (
                  {globalMatchModalResult.inTransitContainerNumbers.join(', ')}) fueron excluidos para evitar falsas asignaciones hasta su recepción física.
                </span>
              </div>
            )}

            {/* Branch breakdown */}
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-2 font-bold">
                Asignación por Sucursal de Destino:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(globalMatchModalResult.branchBreakdown).map(([branch, count]) => {
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
                Detalle de Asignaciones ({globalMatchModalResult.matchedDetails.length}):
              </span>
              {globalMatchModalResult.matchedDetails.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-400 font-mono">
                  No se encontraron coincidencias pendientes entre los pedidos y los contenedores ingresados. Verifique que los números de parte coincidan o que los contenedores contengan inventario disponible.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {globalMatchModalResult.matchedDetails.map((match, idx) => (
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
              onClick={() => setGlobalMatchModalResult(null)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Cerrar y Ver Contenedores
            </button>
          </div>
        </div>
      )}

      {/* Add Container Modal */}
      {isAddContainerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <span>Registrar Contenedor o Manifiesto de Importación</span>
              </h3>
              <button
                onClick={() => setIsAddContainerModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Excel Quick Upload Box inside Modal */}
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">¿Tienes el manifiesto en Excel?</h4>
                  <p className="text-[11px] text-slate-400">Cárgalo aquí para autocompletar todos los datos y repuestos.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadChanganManifestTemplate()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded-lg text-xs font-mono"
                >
                  Plantilla .xlsx
                </button>

                <input
                  type="file"
                  ref={modalFileInputRef}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleModalExcelUpload(file);
                      e.target.value = '';
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold shadow-sm"
                >
                  Seleccionar Excel
                </button>
              </div>
            </div>

            {parsedManifestItemsPreview.length > 0 && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-300 flex items-center justify-between">
                <span>✓ Se detectaron {parsedManifestItemsPreview.length} repuestos en el archivo Excel</span>
                <button
                  type="button"
                  onClick={() => setParsedManifestItemsPreview([])}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Limpiar Excel
                </button>
              </div>
            )}

            <form onSubmit={handleCreateContainer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Nº de Contenedor / Invoice No. <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newContainerNumber}
                    onChange={(e) => setNewContainerNumber(e.target.value)}
                    placeholder="Ej. 2609M00000SF0042 o MSKU9921034"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tipo de Transporte
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="Marítimo">Marítimo (Contenedor 40ft)</option>
                    <option value="Aéreo Express">Aéreo Express (Urgencias)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="Ej. Mobitech CO, Ltd"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    PO / Referencia Origen
                  </label>
                  <input
                    type="text"
                    value={newPoNumber}
                    onChange={(e) => setNewPoNumber(e.target.value)}
                    placeholder="Ej. 260317MS01894SF o PO-9982"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Fecha Estimada Arribo
                  </label>
                  <input
                    type="date"
                    value={newEstimatedDate}
                    onChange={(e) => setNewEstimatedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Manifiesto de Repuestos (Código, Descripción, Cantidad, Ubicación)
                </label>
                <div className="text-[10px] text-slate-500 font-mono mb-1.5">
                  Formato por línea: CÓDIGO, DESCRIPCIÓN, CANTIDAD, UBICACIÓN (o cargue el archivo Excel arriba)
                </div>
                <textarea
                  value={manifestRawText}
                  onChange={(e) => setManifestRawText(e.target.value)}
                  rows={4}
                  placeholder={`B211075-1600, CLAMP NUTS, 50, R-01-A-H04\nB511F260202-0100, ARM ASSY FR-LH, 5, E-02-B-A04\nS111F260204-1504, SHOCK ABSORBER ASSY RR, 10, E-02-B-A04`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddContainerModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Registrar Manifiesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Container Modal */}
      {editingContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-cyan-500/50 rounded-3xl max-w-3xl w-full p-6 shadow-[0_0_70px_rgba(6,182,212,0.4)] max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white font-mono">
                  Editar Contenedor: {editingContainer.containerNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingContainer(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveEditContainer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nº de Contenedor / Invoice No. <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormContainerNumber}
                    onChange={(e) => setEditFormContainerNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Tipo de Transporte
                  </label>
                  <select
                    value={editFormType}
                    onChange={(e) => setEditFormType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    <option value="Marítimo">Marítimo</option>
                    <option value="Aéreo Express">Aéreo Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Estatus de Arribo
                  </label>
                  <select
                    value={editFormArrivalStatus}
                    onChange={(e) => setEditFormArrivalStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
                  >
                    <option value="En Tránsito">🟡 En Tránsito (Por Llegar a CEDIS)</option>
                    <option value="Recibido en CEDIS">🟢 Recibido en CEDIS (Físico en Bodega)</option>
                    <option value="En Aduana">🔵 En Aduana</option>
                    <option value="Completado">⚪ Completado / Despachado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={editFormSupplier}
                    onChange={(e) => setEditFormSupplier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    PO / Referencia Origen
                  </label>
                  <input
                    type="text"
                    value={editFormPoNumber}
                    onChange={(e) => setEditFormPoNumber(e.target.value)}
                    placeholder="Ej. 260317MS01894SF o PO-9982"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Fecha Estimada Arribo
                  </label>
                  <input
                    type="date"
                    value={editFormEstimatedDate}
                    onChange={(e) => setEditFormEstimatedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Fecha Real Llegada CEDIS
                  </label>
                  <input
                    type="date"
                    value={editFormActualDate}
                    onChange={(e) => setEditFormActualDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Manifest Items Table in Edit Modal */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    Líneas de Repuestos en el Manifiesto ({editFormItems.length}):
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditItemRow}
                    className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800/60 hover:border-cyan-500 rounded-lg text-xs font-mono flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Fila de Repuesto</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#050608] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Código</th>
                        <th className="p-2">Descripción</th>
                        <th className="p-2 text-center w-20">Cant. Total</th>
                        <th className="p-2">Ubicación CEDIS</th>
                        <th className="p-2 text-center w-12">Borrar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {editFormItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.code}
                              onChange={(e) =>
                                handleUpdateEditItemField(idx, 'code', e.target.value.toUpperCase())
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
                                handleUpdateEditItemField(idx, 'description', e.target.value)
                              }
                              placeholder="Descripción"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              required
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.totalQuantity}
                              onChange={(e) =>
                                handleUpdateEditItemField(
                                  idx,
                                  'totalQuantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                              required
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.warehouseLocation || ''}
                              onChange={(e) =>
                                handleUpdateEditItemField(
                                  idx,
                                  'warehouseLocation',
                                  e.target.value.toUpperCase()
                                )
                              }
                              placeholder="E-02-B-A04"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono uppercase"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEditItemRow(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Eliminar fila"
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
                  onClick={() => handleDeleteContainerClick(editingContainer)}
                  className="px-4 py-2 bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar Contenedor</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingContainer(null)}
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
