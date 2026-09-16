import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  Barcode,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileDown,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Printer,
  QrCode,
  Search,
  Sparkles,
  Tag,
  Truck,
  X
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { CHANGAN_BRANCHES } from '../data/mockData';
import { BranchName, SpecialOrder } from '../types';
import {
  generateLabelsPDF,
  LabelFormat,
  LabelItemData
} from '../utils/labelPdfGenerator';

interface DispatchLabelsModalProps {
  orders: SpecialOrder[];
  preselectedOrder?: SpecialOrder | null;
  onClose: () => void;
  onMarkAsDispatched: (orderIds: string[]) => void;
}

export const DispatchLabelsModal: React.FC<DispatchLabelsModalProps> = ({
  orders,
  preselectedOrder,
  onClose,
  onMarkAsDispatched,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>(
    preselectedOrder ? preselectedOrder.branch : 'ALL'
  );
  const [selectedOnlyReadyForDispatch, setSelectedOnlyReadyForDispatch] = useState<boolean>(true);
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLabelKeys, setSelectedLabelKeys] = useState<Set<string>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isCapturingCanvasPdf, setIsCapturingCanvasPdf] = useState<boolean>(false);
  const [showPdfMenu, setShowPdfMenu] = useState<boolean>(false);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  // Filter orders for label generation
  const candidateOrders = useMemo(() => {
    if (preselectedOrder) return [preselectedOrder];

    const q = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      if (selectedBranch !== 'ALL' && order.branch !== selectedBranch) return false;
      if (
        selectedOnlyReadyForDispatch &&
        order.overallStatus !== 'EN BODEGA CEDIS' &&
        order.overallStatus !== 'DESPACHADO'
      ) {
        return false;
      }
      if (q) {
        const matchOrder =
          order.orderNumber.toLowerCase().includes(q) ||
          order.clientName.toLowerCase().includes(q) ||
          order.plate.toLowerCase().includes(q) ||
          order.changanModel.toLowerCase().includes(q) ||
          order.quotationNumber.toLowerCase().includes(q) ||
          order.items.some(
            (it) =>
              it.code.toLowerCase().includes(q) ||
              it.description.toLowerCase().includes(q) ||
              (it.updatedCode && it.updatedCode.toLowerCase().includes(q))
          );
        if (!matchOrder) return false;
      }
      return true;
    });
  }, [orders, preselectedOrder, selectedBranch, selectedOnlyReadyForDispatch, searchQuery]);

  // Expand items for individual physical labels with unique keys
  const allLabels: (LabelItemData & { uniqueKey: string })[] = useMemo(() => {
    const labelsList: (LabelItemData & { uniqueKey: string })[] = [];

    candidateOrders.forEach((order) => {
      order.items.forEach((item, itemIdx) => {
        const unitsToPrint = Math.max(1, item.quantityAssigned || item.quantityRequested);
        for (let u = 1; u <= unitsToPrint; u++) {
          const uniqueKey = `${order.id}-${item.id || itemIdx}-${u}`;
          labelsList.push({
            order,
            item,
            unitIndex: u,
            totalUnits: unitsToPrint,
            uniqueKey,
          });
        }
      });
    });

    return labelsList;
  }, [candidateOrders]);

  // Handle Select All / Unselect All
  const areAllSelected = allLabels.length > 0 && selectedLabelKeys.size === allLabels.length;

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedLabelKeys(new Set());
    } else {
      setSelectedLabelKeys(new Set(allLabels.map((l) => l.uniqueKey)));
    }
  };

  const toggleLabelSelection = (key: string) => {
    setSelectedLabelKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Determine effective labels for printing/downloading
  const activeLabelsToExport = useMemo(() => {
    if (selectedLabelKeys.size === 0) {
      return allLabels; // default to all visible if none specifically picked
    }
    return allLabels.filter((l) => selectedLabelKeys.has(l.uniqueKey));
  }, [allLabels, selectedLabelKeys]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = (format: LabelFormat) => {
    if (activeLabelsToExport.length === 0) {
      alert('No hay etiquetas seleccionadas para descargar.');
      return;
    }
    setIsExportingPdf(true);
    setShowPdfMenu(false);

    try {
      const branchTag = selectedBranch === 'ALL' ? 'Todas_Sucursales' : selectedBranch.replace(/\s+/g, '_');
      const formatTag =
        format === 'thermal_75x50' ? '75x50mm' : format === 'thermal_50x30' ? '50x30mm' : 'Hoja_Carta';
      const fileName = `Etiquetas_Changan_${branchTag}_${formatTag}_${new Date().toISOString().slice(0, 10)}.pdf`;

      generateLabelsPDF(activeLabelsToExport, format, fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Ocurrió un error al generar el archivo PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download PDF using html2canvas & jsPDF capturing the exact visual design of the rendered labels
  const handleDownloadHtml2CanvasPdf = async (mode: 'multi-labels' | 'full-grid' = 'multi-labels') => {
    const container = labelsContainerRef.current;
    if (!container || activeLabelsToExport.length === 0) {
      alert('No hay etiquetas seleccionadas para descargar.');
      return;
    }

    setIsCapturingCanvasPdf(true);
    setShowPdfMenu(false);

    try {
      // Find all individual label card elements
      const labelCards: HTMLElement[] = Array.from(
        container.querySelectorAll('[data-label-card="true"]')
      ) as HTMLElement[];

      // Filter only active/selected cards if specific ones are selected
      const targetCards: HTMLElement[] =
        selectedLabelKeys.size > 0
          ? labelCards.filter((card: HTMLElement) => {
              const key = card.getAttribute('data-label-key');
              return key ? selectedLabelKeys.has(key) : true;
            })
          : labelCards;

      if (targetCards.length === 0) {
        alert('No se encontraron elementos de etiquetas para capturar.');
        return;
      }

      if (mode === 'multi-labels') {
        // High quality label format (100mm width x 70mm height landscape)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [100, 70],
        });

        for (let i = 0; i < targetCards.length; i++) {
          const cardEl = targetCards[i];
          const canvas = await html2canvas(cardEl, {
            scale: 3, // High DPI render
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            ignoreElements: (element) => {
              return element.classList.contains('canvas-ignore');
            },
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) {
            pdf.addPage([100, 70], 'landscape');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 100, 70);
        }

        const branchTag = selectedBranch === 'ALL' ? 'General' : selectedBranch.replace(/\s+/g, '_');
        const orderTag = preselectedOrder ? `_Ped_${preselectedOrder.orderNumber}` : `_${branchTag}`;
        const fileName = `Etiquetas_Captura_Diseno${orderTag}_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
      } else {
        // Full grid capture
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0b0f17',
          logging: false,
          ignoreElements: (element) => {
            return element.classList.contains('canvas-ignore');
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter',
        });

        const imgWidth = 195;
        const pageHeight = 265;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 10;

        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + 10;
          pdf.addPage('letter', 'portrait');
          pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const fileName = `Mosaico_Etiquetas_Changan_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
      }
    } catch (err) {
      console.error('Error al capturar etiquetas con html2canvas y jsPDF:', err);
      alert('Ocurrió un error al capturar el diseño en PDF.');
    } finally {
      setIsCapturingCanvasPdf(false);
    }
  };

  const handleDispatchAll = () => {
    const targetOrders = activeLabelsToExport.map((l) => l.order.id);
    const orderIds = Array.from(new Set(targetOrders));
    if (orderIds.length === 0) {
      alert('No hay órdenes seleccionadas.');
      return;
    }
    onMarkAsDispatched(orderIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-h-[95vh] flex flex-col">
        {/* Header Controls (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold">
                  MÓDULO DE DESPACHO & ETIQUETAS ADHESIVAS
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/40">
                  jsPDF & html2canvas
                </span>
              </div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                Generador de Etiquetas Changan
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct html2canvas PDF Capture Button */}
            <button
              type="button"
              onClick={() => handleDownloadHtml2CanvasPdf('multi-labels')}
              disabled={isCapturingCanvasPdf || isExportingPdf || allLabels.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
              title="Captura el diseño visual exacto de las etiquetas en PDF usando html2canvas y jsPDF"
            >
              <Camera className="w-4 h-4" />
              <span>
                {isCapturingCanvasPdf
                  ? 'Capturando PDF...'
                  : `Descargar Diseño PDF (${activeLabelsToExport.length})`}
              </span>
            </button>

            {/* PDF Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPdfMenu(!showPdfMenu)}
                disabled={isExportingPdf || isCapturingCanvasPdf || allLabels.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>
                  {isExportingPdf
                    ? 'Generando...'
                    : `Formatos PDF (${activeLabelsToExport.length})`}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showPdfMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 font-mono text-xs">
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    Opciones de Exportación PDF:
                  </div>

                  <button
                    onClick={() => handleDownloadHtml2CanvasPdf('multi-labels')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-300 text-slate-200 flex items-center justify-between group transition-colors border border-emerald-900/40 bg-emerald-950/20"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        Captura Visual (html2canvas)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Renderiza el diseño exacto actual de cada etiqueta
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                      Fiel 100%
                    </span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf('thermal_75x50')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                        Rollo Térmico 75x50 mm (Vectorial)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        1 etiqueta por página (Zebra, Xprinter, Rongta)
                      </div>
                    </div>
                    <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded">
                      Estándar
                    </span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf('thermal_50x30')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                        Rollo Térmico 50x30 mm (Vectorial)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Formato compacto para piezas pequeñas
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      Chica
                    </span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf('sheet_letter')}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-cyan-950/60 hover:text-cyan-300 text-slate-200 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Hoja Carta Adhesiva (8 por pág)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Para impresoras láser o de inyección de tinta
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">
                      Carta
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Direct Browser Print */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir</span>
            </button>

            {/* Dispatch confirmation */}
            <button
              onClick={handleDispatchAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4" />
              <span>Marcar Despachado</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-mono p-2 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar (Hidden during print) */}
        {!preselectedOrder && (
          <div className="py-3 border-b border-slate-800 print:hidden space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Branch Filter */}
              <div className="sm:col-span-4">
                <label className="block text-slate-400 text-[10px] mb-1 font-bold">
                  SUCURSAL DESTINO:
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Todas las Sucursales ({allLabels.length} etiquetas)</option>
                  {CHANGAN_BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search in labels */}
              <div className="sm:col-span-5">
                <label className="block text-slate-400 text-[10px] mb-1 font-bold">
                  BÚSQUEDA RÁPIDA:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Código de repuesto, cliente, placa, cotización..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3 flex items-end">
                <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={selectedOnlyReadyForDispatch}
                    onChange={(e) => setSelectedOnlyReadyForDispatch(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-slate-300 text-xs truncate">
                    Solo listos en CEDIS
                  </span>
                </label>
              </div>
            </div>

            {/* Selection & Format Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-slate-400">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    areAllSelected ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-slate-600'
                  }`}>
                    {areAllSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{areAllSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'}</span>
                </button>

                <span className="text-slate-600">|</span>

                <span className="text-slate-400">
                  {selectedLabelKeys.size > 0 ? (
                    <span className="text-emerald-400 font-bold">
                      {selectedLabelKeys.size} de {allLabels.length} etiquetas marcadas
                    </span>
                  ) : (
                    <span>Mostrando {allLabels.length} etiquetas (todas activas para PDF)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Vista previa:</span>
                <button
                  type="button"
                  onClick={() => setLabelSize('standard')}
                  className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                    labelSize === 'standard'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  75x50 mm
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('compact')}
                  className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                    labelSize === 'compact'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  50x30 mm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Labels Display Area */}
        <div ref={labelsContainerRef} className="flex-1 overflow-y-auto py-4 space-y-4">
          {allLabels.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-mono text-xs bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Tag className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 font-bold text-sm">No hay etiquetas disponibles</p>
              <p className="text-slate-600 mt-1">Prueba cambiando el filtro de sucursal o quitando la búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
              {allLabels.map((lbl, idx) => {
                const { order, item, unitIndex, totalUnits, uniqueKey } = lbl;
                const isSelected = selectedLabelKeys.has(uniqueKey);

                return (
                  <div
                    key={uniqueKey}
                    data-label-card="true"
                    data-label-key={uniqueKey}
                    onClick={() => toggleLabelSelection(uniqueKey)}
                    className={`changan-label-card bg-white text-black p-4 rounded-xl border-2 cursor-pointer transition-all print:border print:shadow-none print:break-inside-avoid relative overflow-hidden font-sans ${
                      isSelected
                        ? 'border-cyan-500 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'border-black hover:border-slate-600 shadow-md'
                    }`}
                  >
                    {/* Selection Indicator Badge (Hidden on print & ignored by html2canvas) */}
                    <div className="absolute top-2 right-2 print:hidden canvas-ignore z-10">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-cyan-600 border-cyan-500 text-white'
                            : 'bg-white/80 border-slate-400 text-transparent hover:border-black'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    {/* Brand Header */}
                    <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2 pr-6">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-black text-white font-bold text-[10px] px-1.5 py-0.5 tracking-tighter">
                          CHANGAN
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
                          CEDIS PANAMÁ // LOGÍSTICA
                        </span>
                      </div>
                      <div className="text-[9px] font-mono font-bold">
                        {unitIndex}/{totalUnits}
                      </div>
                    </div>

                    {/* Destination Branch (High Visibility Box) */}
                    <div className="bg-black text-white px-3 py-1 text-center font-bold tracking-widest text-sm uppercase rounded mb-2 font-mono shadow-inner">
                      DESTINO: {order.branch}
                    </div>

                    {/* Part Code & Description */}
                    <div className="mb-2">
                      <div className="text-[9px] uppercase font-bold text-slate-600 font-mono flex items-center justify-between">
                        <span>CÓDIGO DE REPUESTO:</span>
                        {item.updatedCode && (
                          <span className="text-amber-800 font-bold bg-amber-100 px-1 rounded text-[8px]">
                            REV: {item.updatedCode}
                          </span>
                        )}
                      </div>
                      <div className="text-base font-black font-mono tracking-tight text-black flex items-center gap-2">
                        {item.code}
                      </div>
                      <div className="text-xs font-semibold leading-tight text-slate-900 mt-0.5 line-clamp-2">
                        {item.description}
                      </div>
                    </div>

                    {/* Client, Plate, Model & Quotation Details */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] border-t border-b border-black py-1.5 mb-2 font-mono">
                      <div>
                        <span className="text-slate-600 font-bold block text-[8px]">CLIENTE:</span>
                        <span className="font-bold truncate block">{order.clientName}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold block text-[8px]">PLACA / MODELO:</span>
                        <span className="font-bold">
                          {order.plate} — {order.changanModel}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold block text-[8px]">CANAL / SOLICITANTE:</span>
                        <span className="font-bold">{order.channel} ({order.collaboratorName})</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold block text-[8px]">COTIZACIÓN / ESTADO:</span>
                        <span className="font-bold">{order.quotationNumber} [{order.paymentStatus}]</span>
                      </div>
                    </div>

                    {/* Barcode & Container Tracking Footer */}
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <div>
                        <div>PED: <span className="font-bold">{order.orderNumber}</span></div>
                        <div>CONT: <span className="font-bold">{item.containerId || order.assignedContainerId || 'CEDIS-MANIFIESTO'}</span></div>
                        <div>UBIC: <span className="font-bold">{item.locationInCedis || 'R-01-A'}</span></div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        {/* Simulated Barcode */}
                        <div className="flex items-center gap-[2px] h-6 bg-slate-100 p-0.5 border border-slate-300">
                          <div className="w-[2px] h-full bg-black"></div>
                          <div className="w-[1px] h-full bg-black"></div>
                          <div className="w-[3px] h-full bg-black"></div>
                          <div className="w-[1px] h-full bg-black"></div>
                          <div className="w-[2px] h-full bg-black"></div>
                          <div className="w-[1px] h-full bg-black"></div>
                          <div className="w-[3px] h-full bg-black"></div>
                          <div className="w-[2px] h-full bg-black"></div>
                          <div className="w-[1px] h-full bg-black"></div>
                        </div>
                        <span className="text-[8px] font-bold tracking-widest mt-0.5">{item.code}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info (Hidden during print) */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Descarga con html2canvas + jsPDF captura fiel del diseño y tipografía de etiquetas.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDownloadHtml2CanvasPdf('multi-labels')}
              disabled={isCapturingCanvasPdf || allLabels.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 border border-emerald-500/50 text-white rounded-lg flex items-center gap-1.5 font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-300" />
              <span>
                {isCapturingCanvasPdf ? 'Procesando...' : 'Descargar PDF (html2canvas)'}
              </span>
            </button>

            <button
              onClick={() => handleDownloadPdf('thermal_75x50')}
              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rollo Térmico (75x50mm)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
