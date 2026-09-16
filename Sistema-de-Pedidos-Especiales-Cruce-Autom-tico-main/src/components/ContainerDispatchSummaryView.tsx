import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  ListFilter,
  MapPin,
  Maximize2,
  Minimize2,
  Package,
  PackageCheck,
  PieChart,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Zap,
  CheckSquare,
  Square,
  Camera,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CHANGAN_BRANCHES } from '../data/mockData';
import { BranchName, ContainerManifestItem, ShippingContainer, SpecialOrder } from '../types';
import { exportContainerDispatchToExcel, PivotExcelRow } from '../utils/excelDispatchExporter';

interface ContainerDispatchSummaryViewProps {
  containers: ShippingContainer[];
  orders: SpecialOrder[];
  onOpenContainerCrossDock?: (containerId: string) => void;
  onNavigateToLabels?: (orderNumber?: string) => void;
}

export interface PivotPartRow {
  partCode: string;
  description: string;
  changanModel: string;
  locationInCedis: string;
  containerNumber: string;
  totalQuantity: number;
  emergencyQuantity: number;
  totalOrdersCount: number;
  branchQuantities: Record<BranchName, number>;
  branchBreakdowns: Record<
    BranchName,
    Array<{
      orderNumber: string;
      clientName: string;
      plate: string;
      quantity: number;
      isEmergency: boolean;
      quotationNumber: string;
      status: string;
    }>
  >;
}

export const ContainerDispatchSummaryView: React.FC<ContainerDispatchSummaryViewProps> = ({
  containers,
  orders,
  onOpenContainerCrossDock,
  onNavigateToLabels,
}) => {
  // Selected container state ("ALL" or container.id)
  const [selectedContainerId, setSelectedContainerId] = useState<string>(
    containers[0]?.id || 'ALL'
  );

  // View Mode: 'pivot' (Tabla Dinámica x Repuesto y Sucursal), 'pallets' (Consolidación de Salidas x Sucursal), 'detail' (Detalle x Orden)
  const [viewMode, setViewMode] = useState<'pivot' | 'pallets' | 'detail'>('pivot');

  // Dynamic Grouping Mode inside Pivot View: 'matrix' (Matriz Repuesto x Sucursales) | 'by-branch' (Agrupación por Sucursal)
  const [pivotGroupMode, setPivotGroupMode] = useState<'matrix' | 'by-branch'>('matrix');

  // PDF Export States & Ref
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Filters & Slicers
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Emergencia' | 'Normal'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');
  const [sortBy, setSortBy] = useState<'qty-desc' | 'qty-asc' | 'code-asc' | 'model-asc'>('qty-desc');
  
  // Interactive Warehouse Picking State (Bodega staff checking off items as they pick/box them)
  const [checkedParts, setCheckedParts] = useState<Set<string>>(new Set());
  const [expandedPartCode, setExpandedPartCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Active Container object
  const activeContainer = useMemo(() => {
    if (selectedContainerId === 'ALL') return null;
    return containers.find((c) => c.id === selectedContainerId) || containers[0] || null;
  }, [containers, selectedContainerId]);

  // Compute branch breakdown and dispatch item list for the selected container (or all containers)
  const dispatchData = useMemo(() => {
    const relevantContainers = activeContainer ? [activeContainer] : containers;
    const containerNumbersSet = new Set(relevantContainers.map((c) => c.containerNumber.trim().toUpperCase()));

    // Collect all matched items for each branch
    const branchMap = new Map<
      BranchName,
      {
        branch: BranchName;
        orderNumbers: Set<string>;
        totalParts: number;
        emergencyParts: number;
        models: Set<string>;
        items: {
          containerNumber: string;
          containerType: string;
          orderNumber: string;
          quotationNumber: string;
          clientName: string;
          plate: string;
          changanModel: string;
          partCode: string;
          description: string;
          quantity: number;
          locationInCedis: string;
          status: string;
          isEmergency: boolean;
        }[];
      }
    >();

    CHANGAN_BRANCHES.forEach((b) => {
      branchMap.set(b, {
        branch: b,
        orderNumbers: new Set(),
        totalParts: 0,
        emergencyParts: 0,
        models: new Set(),
        items: [],
      });
    });

    // Match orders that belong to the relevant container(s)
    orders.forEach((order) => {
      const orderAssignedContainer = (order.assignedContainerId || '').trim().toUpperCase();
      const orderMatchesContainer = containerNumbersSet.has(orderAssignedContainer);

      order.items.forEach((item) => {
        const itemContainer = (item.containerId || '').trim().toUpperCase();
        const matches =
          containerNumbersSet.has(itemContainer) ||
          (orderMatchesContainer && (item.quantityAssigned > 0 || item.status === 'EN BODEGA CEDIS' || item.status === 'DESPACHADO'));

        if (matches) {
          const qty = item.quantityAssigned > 0 ? item.quantityAssigned : item.quantityRequested;
          if (qty > 0) {
            const bData = branchMap.get(order.branch);
            if (bData) {
              bData.orderNumbers.add(order.orderNumber);
              bData.totalParts += qty;
              if (order.orderType === 'Emergencia') {
                bData.emergencyParts += qty;
              }
              if (order.changanModel) {
                bData.models.add(order.changanModel);
              }

              // Determine container number & type
              const matchingCont = relevantContainers.find(
                (c) => c.containerNumber.trim().toUpperCase() === (itemContainer || orderAssignedContainer)
              ) || relevantContainers[0];

              bData.items.push({
                containerNumber: matchingCont?.containerNumber || order.assignedContainerId || 'CONT-CEDIS',
                containerType: matchingCont?.type || 'Marítimo',
                orderNumber: order.orderNumber,
                quotationNumber: order.quotationNumber,
                clientName: order.clientName,
                plate: order.plate || 'S/P',
                changanModel: order.changanModel || 'Changan',
                partCode: item.code,
                description: item.description,
                quantity: qty,
                locationInCedis: item.locationInCedis || matchingCont?.items.find((mi) => mi.code.toUpperCase() === item.code.toUpperCase())?.warehouseLocation || 'CEDIS-ZONA-A',
                status: item.status || order.overallStatus,
                isEmergency: order.orderType === 'Emergencia',
              });
            }
          }
        }
      });
    });

    // Formatted branch summaries
    const branchSummaries = Array.from(branchMap.values()).map((b) => ({
      branch: b.branch,
      orderCount: b.orderNumbers.size,
      totalParts: b.totalParts,
      emergencyParts: b.emergencyParts,
      models: Array.from(b.models),
      items: b.items,
    }));

    // Calculate free stock / unmatched surplus for active container
    const unmatchedSurplus: { code: string; description: string; quantity: number; location: string }[] = [];
    if (activeContainer) {
      activeContainer.items.forEach((cItem) => {
        const assigned = cItem.assignedQuantity || 0;
        const surplus = cItem.totalQuantity - assigned;
        if (surplus > 0) {
          unmatchedSurplus.push({
            code: cItem.code,
            description: cItem.description,
            quantity: surplus,
            location: cItem.warehouseLocation || 'CEDIS-STOCK-GENERAL',
          });
        }
      });
    }

    // Available vehicle models
    const allAvailableModels = new Set<string>();
    branchSummaries.forEach((bs) => bs.models.forEach((m) => allAvailableModels.add(m)));

    // Totals
    const totalPartsAllocated = branchSummaries.reduce((acc, b) => acc + b.totalParts, 0);
    const totalOrdersFulfilled = branchSummaries.reduce((acc, b) => acc + b.orderCount, 0);
    const totalEmergencies = branchSummaries.reduce((acc, b) => acc + b.emergencyParts, 0);
    const containerTotalCapacity = activeContainer
      ? activeContainer.totalUnits
      : containers.reduce((acc, c) => acc + c.totalUnits, 0);

    const surplusTotal = Math.max(0, containerTotalCapacity - totalPartsAllocated);
    const allocationPercentage = containerTotalCapacity > 0 ? Math.round((totalPartsAllocated / containerTotalCapacity) * 100) : 100;

    return {
      branchSummaries,
      unmatchedSurplus,
      totalPartsAllocated,
      totalOrdersFulfilled,
      totalEmergencies,
      containerTotalCapacity,
      surplusTotal,
      allocationPercentage,
      availableModels: Array.from(allAvailableModels).sort(),
    };
  }, [activeContainer, containers, orders]);

  // Flatten and filter detailed items
  const filteredDetailItems = useMemo(() => {
    let allItems: any[] = [];
    dispatchData.branchSummaries.forEach((bs) => {
      if (selectedBranchFilter === 'ALL' || bs.branch === selectedBranchFilter) {
        bs.items.forEach((it) => {
          allItems.push({ ...it, branch: bs.branch });
        });
      }
    });

    return allItems.filter((item) => {
      if (priorityFilter === 'Emergencia' && !item.isEmergency) return false;
      if (priorityFilter === 'Normal' && item.isEmergency) return false;

      if (selectedModelFilter !== 'ALL' && item.changanModel !== selectedModelFilter) {
        return false;
      }

      if (statusFilter === 'PENDING' && item.status === 'DESPACHADO') return false;
      if (statusFilter === 'DISPATCHED' && item.status !== 'DESPACHADO') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.partCode.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchOrder = item.orderNumber.toLowerCase().includes(q);
        const matchClient = item.clientName.toLowerCase().includes(q);
        const matchPlate = item.plate.toLowerCase().includes(q);
        const matchModel = item.changanModel.toLowerCase().includes(q);
        const matchBranch = item.branch.toLowerCase().includes(q);
        const matchLoc = item.locationInCedis?.toLowerCase().includes(q);
        return matchCode || matchDesc || matchOrder || matchClient || matchPlate || matchModel || matchBranch || matchLoc;
      }
      return true;
    });
  }, [dispatchData, selectedBranchFilter, priorityFilter, selectedModelFilter, statusFilter, searchQuery]);

  // COMPUTE DYNAMIC PIVOT TABLE DATA (1 row per Part Code, branches in columns with pending dispatch quantities)
  const pivotTableData = useMemo(() => {
    const partMap = new Map<string, PivotPartRow>();

    filteredDetailItems.forEach((item) => {
      const codeKey = item.partCode.trim().toUpperCase();
      let row = partMap.get(codeKey);

      if (!row) {
        const emptyBranchQty: Record<BranchName, number> = {
          'Calle 50': 0,
          'Costa Verde': 0,
          'Tumba Muerto': 0,
          'Villa Lucre': 0,
          'Chiriquí': 0,
          'Santa María': 0,
        };
        const emptyBranchBreakdowns: Record<BranchName, any[]> = {
          'Calle 50': [],
          'Costa Verde': [],
          'Tumba Muerto': [],
          'Villa Lucre': [],
          'Chiriquí': [],
          'Santa María': [],
        };

        row = {
          partCode: item.partCode,
          description: item.description,
          changanModel: item.changanModel,
          locationInCedis: item.locationInCedis,
          containerNumber: item.containerNumber,
          totalQuantity: 0,
          emergencyQuantity: 0,
          totalOrdersCount: 0,
          branchQuantities: emptyBranchQty,
          branchBreakdowns: emptyBranchBreakdowns,
        };
        partMap.set(codeKey, row);
      }

      const branch = item.branch as BranchName;
      if (row.branchQuantities[branch] !== undefined) {
        row.branchQuantities[branch] += item.quantity;
        row.totalQuantity += item.quantity;
        row.totalOrdersCount += 1;
        if (item.isEmergency) {
          row.emergencyQuantity += item.quantity;
        }

        row.branchBreakdowns[branch].push({
          orderNumber: item.orderNumber,
          clientName: item.clientName,
          plate: item.plate,
          quantity: item.quantity,
          isEmergency: item.isEmergency,
          quotationNumber: item.quotationNumber,
          status: item.status,
        });
      }
    });

    let rows = Array.from(partMap.values());

    // Sort according to user preference
    rows.sort((a, b) => {
      if (sortBy === 'qty-desc') return b.totalQuantity - a.totalQuantity;
      if (sortBy === 'qty-asc') return a.totalQuantity - b.totalQuantity;
      if (sortBy === 'code-asc') return a.partCode.localeCompare(b.partCode);
      if (sortBy === 'model-asc') return a.changanModel.localeCompare(b.changanModel);
      return 0;
    });

    // Column totals across all rows
    const columnTotals: Record<BranchName, number> = {
      'Calle 50': 0,
      'Costa Verde': 0,
      'Tumba Muerto': 0,
      'Villa Lucre': 0,
      'Chiriquí': 0,
      'Santa María': 0,
    };
    let grandTotal = 0;
    let grandEmergencyTotal = 0;

    rows.forEach((r) => {
      grandTotal += r.totalQuantity;
      grandEmergencyTotal += r.emergencyQuantity;
      CHANGAN_BRANCHES.forEach((b) => {
        columnTotals[b] += r.branchQuantities[b] || 0;
      });
    });

    return {
      rows,
      columnTotals,
      grandTotal,
      grandEmergencyTotal,
      totalDistinctParts: rows.length,
    };
  }, [filteredDetailItems, sortBy]);

  // Bodega Picking Progress
  const pickingProgress = useMemo(() => {
    const total = pivotTableData.totalDistinctParts;
    if (total === 0) return 100;
    const countChecked = pivotTableData.rows.filter((r) => checkedParts.has(r.partCode)).length;
    return Math.round((countChecked / total) * 100);
  }, [pivotTableData, checkedParts]);

  const togglePartCheck = (partCode: string) => {
    setCheckedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partCode)) {
        next.delete(partCode);
      } else {
        next.add(partCode);
      }
      return next;
    });
  };

  const handleSelectAllPicking = () => {
    if (checkedParts.size === pivotTableData.rows.length) {
      setCheckedParts(new Set());
    } else {
      setCheckedParts(new Set(pivotTableData.rows.map((r) => r.partCode)));
    }
  };

  // Handle Excel Export (with Pivot Table sheet included)
  const handleExportExcel = () => {
    const containerToExport: ShippingContainer = activeContainer || {
      id: 'CONSOLIDADO-NACIONAL',
      containerNumber: 'CONSOLIDADO-NACIONAL-FLOTA',
      supplier: 'Consolidado CEDIS Changan Panamá',
      poNumber: 'PO-CONSOLIDADO',
      type: 'Marítimo',
      arrivalStatus: 'Recibido en CEDIS',
      estimatedArrivalDate: new Date().toISOString().split('T')[0],
      actualArrivalDate: new Date().toISOString().split('T')[0],
      totalUnits: dispatchData.containerTotalCapacity,
      totalSkus: 0,
      items: [],
      processedForMatching: true,
    };

    const pivotExcelRows: PivotExcelRow[] = pivotTableData.rows.map((r) => ({
      partCode: r.partCode,
      description: r.description,
      changanModel: r.changanModel,
      locationInCedis: r.locationInCedis,
      totalQuantity: r.totalQuantity,
      branchQuantities: r.branchQuantities,
    }));

    exportContainerDispatchToExcel(
      containerToExport,
      dispatchData.branchSummaries,
      dispatchData.unmatchedSurplus,
      pivotExcelRows
    );
  };

  // Handle Dedicated Vector PDF Export for Warehouse Picking & Labeling
  const handleExportPivotPdf = async () => {
    setIsExportingPdf(true);
    setPdfMenuOpen(false);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter', // 279.4 x 215.9 mm
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let currentY = 12;

      const containerName = activeContainer ? activeContainer.containerNumber : 'CONSOLIDADO NACIONAL FLOTA';
      const reportDate = new Date().toLocaleDateString('es-PA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Helper to print Header on each page
      const drawPageHeader = (pageNumber: number) => {
        // Top header background bar
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(margin, margin, pageWidth - margin * 2, 17, 'F');

        // Brand accent line
        doc.setFillColor(6, 182, 212); // cyan-500
        doc.rect(margin, margin + 16, pageWidth - margin * 2, 1, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('CHANGAN AUTO PANAMÁ — CEDIS CENTRAL LOGÍSTICA', margin + 4, margin + 6.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('MATRIZ DE PICKING, CONSOLIDACIÓN & ROTULADO DE REPUESTOS POR SUCURSAL', margin + 4, margin + 12);

        // Right metadata
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 182, 212);
        doc.text(`EMBARQUE: ${containerName}`, pageWidth - margin - 4, margin + 6, { align: 'right' });
        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Emisión: ${reportDate}`, pageWidth - margin - 4, margin + 10.5, { align: 'right' });
        doc.text(`Página ${pageNumber}`, pageWidth - margin - 4, margin + 14.5, { align: 'right' });

        currentY = margin + 20;
      };

      // Summary Bar
      const drawSummaryBar = () => {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin, currentY, pageWidth - margin * 2, 7.5, 'FD');

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);

        const itemsText = `TOTAL SKUs: ${pivotTableData.totalDistinctParts} códigos`;
        const unitsText = `TOTAL UNIDADES: ${pivotTableData.grandTotal} piezas`;
        const emergText = `EMERGENCIAS: ${pivotTableData.grandEmergencyTotal} piezas`;
        const filterText = `Filtro: ${selectedBranchFilter === 'ALL' ? 'Todas las Sucursales' : selectedBranchFilter} | Prioridad: ${priorityFilter}`;

        doc.text(itemsText, margin + 4, currentY + 5);
        doc.text(unitsText, margin + 55, currentY + 5);
        doc.setTextColor(pivotTableData.grandEmergencyTotal > 0 ? 225 : 15, 29, 72);
        doc.text(emergText, margin + 110, currentY + 5);
        doc.setTextColor(15, 23, 42);
        doc.text(filterText, margin + 165, currentY + 5);

        currentY += 10;
      };

      const cols = [
        { id: 'idx', title: '#', width: 8, align: 'center' },
        { id: 'code', title: 'CÓDIGO REPUESTO', width: 28, align: 'left' },
        { id: 'desc', title: 'DESCRIPCIÓN OFICIAL', width: 52, align: 'left' },
        { id: 'model', title: 'MODELO', width: 20, align: 'left' },
        { id: 'rack', title: 'RACK CEDIS', width: 22, align: 'left' },
        { id: 'total', title: 'TOTAL PEND.', width: 17, align: 'center' },
        { id: 'c50', title: 'CALLE 50', width: 16, align: 'center' },
        { id: 'cv', title: 'COSTA V.', width: 17, align: 'center' },
        { id: 'tm', title: 'T. MUERTO', width: 17, align: 'center' },
        { id: 'vl', title: 'V. LUCRE', width: 16, align: 'center' },
        { id: 'chi', title: 'CHIRIQUÍ', width: 16, align: 'center' },
        { id: 'sm', title: 'STA. MARÍA', width: 17, align: 'center' },
        { id: 'check', title: 'PICKING [✓]', width: 14, align: 'center' },
      ];

      let pageNum = 1;
      drawPageHeader(pageNum);
      drawSummaryBar();

      const drawTableHeader = () => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, currentY, 260, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);

        let x = margin;
        cols.forEach((col) => {
          if (col.align === 'center') {
            doc.text(col.title, x + col.width / 2, currentY + 4.8, { align: 'center' });
          } else {
            doc.text(col.title, x + 2, currentY + 4.8);
          }
          x += col.width;
        });

        currentY += 7;
      };

      drawTableHeader();

      const rows = pivotTableData.rows;
      const rowHeight = 6;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        if (currentY + rowHeight > pageHeight - 22) {
          doc.addPage('letter', 'landscape');
          pageNum++;
          drawPageHeader(pageNum);
          drawTableHeader();
        }

        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, currentY, 260, rowHeight, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(margin, currentY + rowHeight, margin + 260, currentY + rowHeight);

        let x = margin;
        doc.setFontSize(7);

        // Index
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`${i + 1}`, x + cols[0].width / 2, currentY + 4.2, { align: 'center' });
        x += cols[0].width;

        // Part Code
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(14, 116, 144);
        const truncatedCode = doc.splitTextToSize(r.partCode, cols[1].width - 3)[0] || r.partCode;
        doc.text(truncatedCode, x + 1.5, currentY + 4.2);
        x += cols[1].width;

        // Description
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const truncatedDesc = doc.splitTextToSize(r.description, cols[2].width - 3)[0] || r.description;
        doc.text(truncatedDesc, x + 1.5, currentY + 4.2);
        x += cols[2].width;

        // Model
        doc.setTextColor(71, 85, 105);
        const truncatedModel = doc.splitTextToSize(r.changanModel || 'Changan', cols[3].width - 3)[0] || 'Changan';
        doc.text(truncatedModel, x + 1.5, currentY + 4.2);
        x += cols[3].width;

        // Rack
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(3, 105, 161);
        doc.text(r.locationInCedis || 'CEDIS', x + 1.5, currentY + 4.2);
        x += cols[4].width;

        // Total Pending
        doc.setFillColor(220, 252, 231);
        doc.rect(x + 1, currentY + 0.8, cols[5].width - 2, rowHeight - 1.6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(21, 128, 61);
        doc.text(`${r.totalQuantity}`, x + cols[5].width / 2, currentY + 4.2, { align: 'center' });
        x += cols[5].width;

        // 6 Branches
        const branchKeys: BranchName[] = [
          'Calle 50',
          'Costa Verde',
          'Tumba Muerto',
          'Villa Lucre',
          'Chiriquí',
          'Santa María',
        ];

        branchKeys.forEach((b, bIdx) => {
          const qty = r.branchQuantities[b] || 0;
          const bCol = cols[6 + bIdx];
          if (qty > 0) {
            const isEmerg = (r.branchBreakdowns[b] || []).some((bk) => bk.isEmergency);
            if (isEmerg) {
              doc.setFillColor(255, 228, 230);
              doc.rect(x + 1, currentY + 0.8, bCol.width - 2, rowHeight - 1.6, 'F');
              doc.setTextColor(190, 18, 60);
              doc.setFont('helvetica', 'bold');
              doc.text(`${qty}⚡`, x + bCol.width / 2, currentY + 4.2, { align: 'center' });
            } else {
              doc.setTextColor(15, 23, 42);
              doc.setFont('helvetica', 'bold');
              doc.text(`${qty}`, x + bCol.width / 2, currentY + 4.2, { align: 'center' });
            }
          } else {
            doc.setTextColor(203, 213, 225);
            doc.setFont('helvetica', 'normal');
            doc.text('-', x + bCol.width / 2, currentY + 4.2, { align: 'center' });
          }
          x += bCol.width;
        });

        // Picking check square
        doc.setDrawColor(100, 116, 139);
        doc.rect(x + 4.5, currentY + 1.2, 3.6, 3.6);
        if (checkedParts.has(r.partCode)) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 185, 129);
          doc.text('✓', x + 5.2, currentY + 3.8);
        }

        currentY += rowHeight;
      }

      if (currentY + 30 > pageHeight - 10) {
        doc.addPage('letter', 'landscape');
        pageNum++;
        drawPageHeader(pageNum);
      }

      // Totals row
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currentY, 260, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTALES GENERALES PENDIENTES CEDIS:', margin + 6, currentY + 4.8);

      let totX = margin + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width;
      doc.setTextColor(52, 211, 153);
      doc.text(`${pivotTableData.grandTotal}`, totX + cols[5].width / 2, currentY + 4.8, { align: 'center' });
      totX += cols[5].width;

      const branchKeys: BranchName[] = [
        'Calle 50',
        'Costa Verde',
        'Tumba Muerto',
        'Villa Lucre',
        'Chiriquí',
        'Santa María',
      ];
      branchKeys.forEach((b, bIdx) => {
        const bCol = cols[6 + bIdx];
        const sum = pivotTableData.columnTotals[b] || 0;
        doc.setTextColor(103, 232, 249);
        doc.text(`${sum}`, totX + bCol.width / 2, currentY + 4.8, { align: 'center' });
        totX += bCol.width;
      });

      currentY += 10;

      // Sign-off box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, 260, 18, 'FD');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('VALIDACIÓN DE PICKING, ETIQUETADO Y DESPACHO EN BODEGA CEDIS', margin + 4, currentY + 3.5);

      const sigWidth = 58;
      const sigY = currentY + 12.5;
      const signers = [
        { role: 'BODEGUERO PICKING', note: 'Separación física en tarima' },
        { role: 'ENCARGADO DE ROTULADO', note: 'Pegado de rótulos con QR' },
        { role: 'SUPERVISOR CEDIS', note: 'Auditoría y Visto Bueno' },
        { role: 'CHOFER / TRANSPORTE', note: 'Recepción de bultos' },
      ];

      signers.forEach((s, sIdx) => {
        const sx = margin + 6 + sIdx * (sigWidth + 6);
        doc.setDrawColor(148, 163, 184);
        doc.line(sx, sigY, sx + sigWidth, sigY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(15, 23, 42);
        doc.text(s.role, sx + sigWidth / 2, sigY + 2.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text(s.note, sx + sigWidth / 2, sigY + 4.8, { align: 'center' });
      });

      const cleanContainer = containerName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Matriz_Picking_Rotulado_CEDIS_${cleanContainer}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating Pivot PDF:', err);
      alert('Ocurrió un error al generar el PDF de la Matriz de Picking.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Visual Snapshot Canvas PDF Export
  const handleExportVisualCanvasPdf = async () => {
    if (!tableContainerRef.current) return;
    setIsExportingPdf(true);
    setPdfMenuOpen(false);

    try {
      const element = tableContainerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a',
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight - 16) {
        doc.addImage(imgData, 'PNG', 8, 8, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 8;

        doc.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - pageHeight;
          doc.addPage('letter', 'landscape');
          doc.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const containerName = activeContainer ? activeContainer.containerNumber : 'CONSOLIDADO';
      const cleanContainer = containerName.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Captura_Visual_Matriz_CEDIS_${cleanContainer}.pdf`);
    } catch (err) {
      console.error('Error capturing Visual PDF:', err);
      alert('Ocurrió un error al capturar la vista.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Trigger Mass Labeling for all filtered orders
  const handleMassLabeling = () => {
    if (onNavigateToLabels && filteredDetailItems.length > 0) {
      const firstOrderNum = filteredDetailItems[0]?.orderNumber;
      onNavigateToLabels(firstOrderNum);
    }
  };

  // Copy Part summary to clipboard
  const handleCopySummary = (row: PivotPartRow) => {
    const lines = [
      `REPUESTO: ${row.partCode} - ${row.description} (${row.changanModel})`,
      `UBICACIÓN CEDIS: ${row.locationInCedis}`,
      `TOTAL A DESPACHAR: ${row.totalQuantity} unidades`,
      `DISTRIBUCIÓN POR SUCURSAL:`,
      ...CHANGAN_BRANCHES.filter((b) => (row.branchQuantities[b] || 0) > 0).map(
        (b) => ` • ${b}: ${row.branchQuantities[b]} un.`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedCode(row.partCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Presentation Header */}
      <div className="bg-slate-900/50 border border-slate-800 p-5 lg:p-6 rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] print:border-none print:shadow-none print:p-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none"></div>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-black print:pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-400 font-mono font-bold">
                CEDIS CHANGAN PANAMÁ // MATRIZ DE DISTRIBUCIÓN & ROTULADO
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                TABLA DINÁMICA DE DESPACHO
              </span>
            </div>
            <h2 className="text-xl lg:text-3xl font-black text-white font-mono tracking-tight print:text-black">
              Tabla Dinámica de Salidas & Consolidado de Repuestos por Sucursal
            </h2>
            <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-3xl print:text-slate-700">
              Vista matricial tipo Tabla Dinámica que agrupa por código de repuesto y sucursal las cantidades exactas pendientes de despacho para consolidar paletizado y agilizar el etiquetado masivo.
            </p>
          </div>

          {/* Action Bar (Etiquetado Masivo, Excel, PDF & Print) */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {onNavigateToLabels && (
              <button
                onClick={handleMassLabeling}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.45)] transition-all active:scale-95 ring-1 ring-cyan-400/50"
                title="Abrir generador masivo de rótulos de despacho con códigos QR para todas las órdenes pendientes"
              >
                <Tag className="w-4 h-4 text-cyan-100" />
                <span>🏷️ Etiquetado Masivo ({pivotTableData.grandTotal} Rótulos)</span>
              </button>
            )}

            {/* Dedicated PDF Export Dropdown & Primary Action */}
            <div className="relative">
              <div className="flex items-center rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50">
                <button
                  onClick={handleExportPivotPdf}
                  disabled={isExportingPdf || pivotTableData.rows.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-900 to-blue-900 hover:from-cyan-800 hover:to-blue-800 text-cyan-200 text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  title="Exportar Matriz de Picking & Rotulado a PDF de alta resolución optimizado para bodega"
                >
                  <FileDown className="w-4 h-4 text-cyan-400" />
                  <span>
                    {isExportingPdf ? 'Generando PDF...' : 'Exportar Matriz PDF'}
                  </span>
                </button>
                <button
                  onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
                  disabled={isExportingPdf}
                  className="px-2 py-2.5 bg-cyan-950 hover:bg-cyan-900 border-l border-cyan-700/60 text-cyan-300 transition-colors"
                  title="Opciones avanzadas de exportación a PDF"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* PDF Options Menu */}
              {pdfMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-xs font-mono animate-in fade-in">
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                    Opciones de Exportación PDF
                  </div>
                  <button
                    onClick={handleExportPivotPdf}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-white flex items-start gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-cyan-300">PDF Vectorial Imprimible (A4 / Carta)</div>
                      <div className="text-[10px] text-slate-400">
                        Formato oficial con membrete CEDIS, firmas de control y matriz por sucursal.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportVisualCanvasPdf}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-white flex items-start gap-2.5 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">Captura Visual de Pantalla</div>
                      <div className="text-[10px] text-slate-400">
                        Genera un PDF con el aspecto gráfico exacto renderizado en pantalla.
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 hover:border-emerald-400 text-emerald-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
              title="Descargar libro de Excel completo con la matriz de tabla dinámica y el desglose de picking"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-md transition-all active:scale-95"
              title="Imprimir o exportar PDF oficial de la Hoja de Picking & Rotulado de Bodega"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir Hoja</span>
            </button>
          </div>
        </div>

        {/* Container Selector Carousel / Pills */}
        <div className="pt-4 print:hidden space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-white">Seleccione Contenedor / Embarque a Auditar:</strong>
            </span>
            <span className="text-[11px] text-slate-500">
              {containers.length} Contenedores en Sistema
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            {/* All Containers Pill */}
            <button
              onClick={() => setSelectedContainerId('ALL')}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedContainerId === 'ALL'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flota Completa (Consolidado Nacional)</span>
            </button>

            {/* Individual Containers */}
            {containers.map((cont) => {
              const isSelected = selectedContainerId === cont.id;
              const isReceived = cont.arrivalStatus === 'Recibido en CEDIS';
              return (
                <button
                  key={cont.id}
                  onClick={() => setSelectedContainerId(cont.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isReceived
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                        : cont.type === 'Marítimo'
                        ? 'bg-blue-400'
                        : 'bg-amber-400'
                    }`}
                  ></span>
                  <span className="font-mono text-white">{cont.containerNumber}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({cont.totalUnits} un. • {cont.type})
                  </span>
                  {isReceived ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                      RECIBIDO
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950/80 text-amber-400 border border-amber-800/50">
                      {cont.arrivalStatus}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Container Inspector Metadata (When specific container is active) */}
      {activeContainer && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-950 border border-slate-800/80 p-4 lg:p-5 rounded-2xl shadow-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60">
              <span className="text-slate-500 text-[10px] block uppercase">Nº Contenedor / Factura</span>
              <span className="font-bold text-cyan-300 text-sm truncate block mt-0.5">
                {activeContainer.containerNumber}
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60">
              <span className="text-slate-500 text-[10px] block uppercase">Proveedor Origen</span>
              <span className="font-semibold text-slate-200 truncate block mt-0.5">
                {activeContainer.supplier}
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60">
              <span className="text-slate-500 text-[10px] block uppercase">Orden de Compra (PO)</span>
              <span className="font-semibold text-slate-300 truncate block mt-0.5">
                {activeContainer.poNumber}
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60">
              <span className="text-slate-500 text-[10px] block uppercase">Tipo de Flete</span>
              <span className="font-semibold text-amber-300 block mt-0.5">
                {activeContainer.type}
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60">
              <span className="text-slate-500 text-[10px] block uppercase">Fecha Arribo CEDIS</span>
              <span className="font-semibold text-emerald-400 block mt-0.5">
                {activeContainer.actualArrivalDate || activeContainer.estimatedArrivalDate}
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60">
              <span className="text-slate-500 text-[10px] block uppercase">Estado Operativo</span>
              <span
                className={`font-semibold block mt-0.5 ${
                  activeContainer.arrivalStatus === 'Recibido en CEDIS' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {activeContainer.arrivalStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Executive KPI Statistic Cards for Pivot Dispatch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SKUs Distinct Pending */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">SKUs Únicos en Despacho</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-cyan-300">
            {pivotTableData.totalDistinctParts} <span className="text-sm font-normal text-slate-400">códigos</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-mono text-slate-400">
            <Layers className="w-3 h-3 text-cyan-500" />
            <span>Distribuidos en las 6 sucursales Changan</span>
          </div>
        </div>

        {/* Assigned to Branches Total Units */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">Total Unidades Pendientes</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-emerald-400">
            {pivotTableData.grandTotal} <span className="text-sm font-normal text-slate-400">unidades</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(8, dispatchData.allocationPercentage))}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-emerald-400 mt-2 block font-mono">
            {dispatchData.allocationPercentage}% del contenedor asignado a pedidos
          </span>
        </div>

        {/* Emergency Orders Pending */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">Repuestos de Emergencia</span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-rose-300">
            {pivotTableData.grandEmergencyTotal} <span className="text-sm font-normal text-slate-400">piezas</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-mono text-rose-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {pivotTableData.grandEmergencyTotal > 0
                ? 'Rotulado prioritario requerido para taller'
                : 'Sin emergencias críticas pendientes'}
            </span>
          </div>
        </div>

        {/* Warehouse Picking Check Progress */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">Progreso Picking Bodega</span>
            <PackageCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl lg:text-4xl font-black font-mono text-purple-300">
            {pickingProgress}%{' '}
            <span className="text-sm font-normal text-slate-400">
              ({checkedParts.size}/{pivotTableData.totalDistinctParts})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${Math.max(4, pickingProgress)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-purple-400 mt-2 block font-mono">
            {checkedParts.size === pivotTableData.totalDistinctParts && pivotTableData.totalDistinctParts > 0
              ? '✅ 100% Repuestos separados en pallets'
              : 'Verifique y marque repuestos al separar'}
          </span>
        </div>
      </div>

      {/* Distribution Matrix by Branch (Interactive Quick Cards) */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 lg:p-6 rounded-3xl space-y-4 shadow-lg print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white font-mono uppercase tracking-wider">
                Resumen de Carga por Sucursal ({CHANGAN_BRANCHES.length} Destinos)
              </h3>
              <p className="text-xs text-slate-400">
                Haga clic en una sucursal para filtrar la tabla dinámica inferior o ver su carga consolidada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setSelectedBranchFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl border transition-all ${
                selectedBranchFilter === 'ALL'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Ver Todas ({dispatchData.totalPartsAllocated} piezas)
            </button>
          </div>
        </div>

        {/* 6 Branch Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {dispatchData.branchSummaries.map((bs) => {
            const isSelected = selectedBranchFilter === bs.branch;
            const percentage =
              dispatchData.totalPartsAllocated > 0
                ? Math.round((bs.totalParts / dispatchData.totalPartsAllocated) * 100)
                : 0;

            return (
              <div
                key={bs.branch}
                onClick={() => setSelectedBranchFilter(selectedBranchFilter === bs.branch ? 'ALL' : bs.branch)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="font-bold text-white truncate text-sm">{bs.branch}</span>
                  {bs.totalParts > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-2xl font-black font-mono text-cyan-400">
                    {bs.totalParts} <span className="text-xs font-normal text-slate-400">piezas</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>{bs.orderCount} órdenes</span>
                    <span className="text-slate-500 font-bold">{percentage}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2.5 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                    style={{ width: `${Math.max(4, percentage)}%` }}
                  ></div>
                </div>

                {bs.emergencyParts > 0 && (
                  <div className="mt-2 text-[10px] font-mono text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40 truncate">
                    ⚡ {bs.emergencyParts} de Emergencia
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN PIVOT MATRIX & DISPATCH CONTAINER */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-lg space-y-0 print:border-none print:shadow-none">
        {/* Table Header & View Mode Switcher */}
        <div className="p-4 lg:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-[#080b11] print:bg-white print:border-b-2 print:border-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 print:hidden">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white font-mono uppercase tracking-wider print:text-black flex items-center gap-2">
                {viewMode === 'pivot' && (
                  <span>📊 Matriz de Tabla Dinámica (Repuesto × Sucursal)</span>
                )}
                {viewMode === 'pallets' && (
                  <span>📦 Consolidación de Salidas & Bultos por Sucursal</span>
                )}
                {viewMode === 'detail' && (
                  <span>📋 Detalle Individual de Despacho x Pedido</span>
                )}
                <span className="text-xs font-normal text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
                  {pivotTableData.totalDistinctParts} SKUs • {pivotTableData.grandTotal} Unidades
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono print:text-slate-700">
                {viewMode === 'pivot' &&
                  'Agrupación matricial por código de repuesto y sucursal con totales consolidados para picking y rotulado.'}
                {viewMode === 'pallets' &&
                  'Resumen de empaque, bultos y tarimas organizadas por sucursal para coordinar la logística de transporte.'}
                {viewMode === 'detail' &&
                  'Desglose individual orden por orden con cliente, placa del vehículo, cotización y ubicación CEDIS.'}
              </p>
            </div>
          </div>

          {/* Controls Bar (View Switcher + Search + Slicers) */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('pivot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  viewMode === 'pivot'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ver Tabla Dinámica agrupada por repuesto y sucursal"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Tabla Dinámica</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('pallets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  viewMode === 'pallets'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ver consolidación de bultos y tarimas por sucursal"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Consolidado Salidas</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  viewMode === 'detail'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ver listado orden por orden detallado"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Detalle x Pedido</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar repuesto, rack..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Model Slicer */}
            {dispatchData.availableModels.length > 0 && (
              <select
                value={selectedModelFilter}
                onChange={(e) => setSelectedModelFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">🚗 Todos los Modelos</option>
                {dispatchData.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setPriorityFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                  priorityFilter === 'ALL'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('Emergencia')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                  priorityFilter === 'Emergencia'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Emergencias
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter('Normal')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                  priorityFilter === 'Normal'
                    ? 'bg-slate-800 text-slate-200 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Normales
              </button>
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="qty-desc">Mayor Cantidad Total</option>
              <option value="qty-asc">Menor Cantidad Total</option>
              <option value="code-asc">Código Repuesto (A-Z)</option>
              <option value="model-asc">Modelo Auto (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Quick Toolbar for Bodega Operators */}
        {viewMode === 'pivot' && (
          <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              {/* Grouping Mode Switcher */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPivotGroupMode('matrix')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    pivotGroupMode === 'matrix'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver tabla tipo matriz con repuestos en filas y sucursales en columnas"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Matriz 6 Sucursales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPivotGroupMode('by-branch')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    pivotGroupMode === 'by-branch'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver repuestos y cantidades agrupados por cada sucursal de destino"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Agrupado por Sucursal</span>
                </button>
              </div>

              <span className="text-slate-700">|</span>

              <button
                onClick={handleSelectAllPicking}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {checkedParts.size === pivotTableData.rows.length
                    ? 'Desmarcar Todos'
                    : 'Marcar Todos como Separados'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold text-[11px]">
                {checkedParts.size} de {pivotTableData.rows.length} SKUs listos
              </span>

              {/* Instant 1-Click PDF Export Button on Toolbar */}
              <button
                type="button"
                onClick={handleExportPivotPdf}
                disabled={isExportingPdf || pivotTableData.rows.length === 0}
                className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Descargar PDF oficial de la Matriz para etiquetado en bodega"
              >
                <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isExportingPdf ? 'Exportando...' : 'Exportar PDF Bodega'}</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW MODE 1: PIVOT TABLE (Repuesto x Sucursal) */}
        {viewMode === 'pivot' && pivotGroupMode === 'matrix' && (
          <div ref={tableContainerRef} className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1180px] print:min-w-full print:text-black">
              <thead>
                <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400 print:bg-slate-100 print:text-black print:border-black">
                  <th className="py-3 px-3 w-12 text-center print:hidden">
                    <button
                      onClick={handleSelectAllPicking}
                      className="text-slate-400 hover:text-white"
                      title="Marcar todos"
                    >
                      {checkedParts.size === pivotTableData.rows.length && pivotTableData.rows.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 w-10 text-center print:table-cell">#</th>
                  <th className="py-3 px-4">Código de Repuesto</th>
                  <th className="py-3 px-4">Descripción Oficial</th>
                  <th className="py-3 px-3">Modelo</th>
                  <th className="py-3 px-3">Ubicación Rack CEDIS</th>
                  <th className="py-3 px-3 text-center bg-cyan-950/60 text-cyan-300 border-x border-cyan-900/50 print:bg-slate-200 print:text-black font-black">
                    Total Pendiente Despacho
                  </th>
                  {/* 6 Branch Columns */}
                  {CHANGAN_BRANCHES.map((b) => (
                    <th
                      key={b}
                      className={`py-3 px-3 text-center transition-colors ${
                        selectedBranchFilter === b
                          ? 'bg-cyan-900/50 text-cyan-200 font-black ring-1 ring-cyan-500'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{b}</span>
                        <span className="text-[9px] font-normal text-slate-500">
                          ({pivotTableData.columnTotals[b]} u.)
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center print:hidden">Acciones / Rótulos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs font-mono print:divide-black">
                {pivotTableData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-14 text-center text-slate-500 font-mono text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Box className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                        <span className="text-slate-400 font-bold">No se encontraron repuestos con los filtros seleccionados</span>
                        <span className="text-slate-600 text-[11px]">Intente limpiando los términos de búsqueda o cambiando de contenedor.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pivotTableData.rows.map((row, idx) => {
                    const isExpanded = expandedPartCode === row.partCode;
                    const isChecked = checkedParts.has(row.partCode);
                    const hasEmergency = row.emergencyQuantity > 0;

                    return (
                      <React.Fragment key={row.partCode}>
                        <tr
                          className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-slate-800/40' : ''
                          } ${isChecked ? 'bg-emerald-950/15' : ''}`}
                          onClick={() => setExpandedPartCode(isExpanded ? null : row.partCode)}
                        >
                          {/* Bodega Picking Checkbox */}
                          <td
                            className="py-3 px-3 text-center print:hidden"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePartCheck(row.partCode);
                            }}
                          >
                            <button
                              type="button"
                              className={`p-1 rounded-lg transition-colors ${
                                isChecked
                                  ? 'text-emerald-400 bg-emerald-950 border border-emerald-700/60'
                                  : 'text-slate-600 hover:text-slate-400 border border-transparent'
                              }`}
                              title={isChecked ? 'Marcar como pendiente' : 'Marcar como separado en rack de salida'}
                            >
                              {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Row Number / Print marker */}
                          <td className="py-3 px-3 text-center text-slate-500 text-[11px] print:text-black">
                            <span className="print:hidden">{idx + 1}</span>
                            <span className="hidden print:inline font-mono">[ ]</span>
                          </td>

                          {/* Part Code */}
                          <td className="py-3 px-4 font-bold text-cyan-300 print:text-black">
                            <div className="flex items-center gap-1.5">
                              <span className={isChecked ? 'line-through text-slate-400' : ''}>
                                {row.partCode}
                              </span>
                              {hasEmergency && (
                                <span
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-bold animate-pulse"
                                  title={`Tiene ${row.emergencyQuantity} unidades de Emergencia`}
                                >
                                  ⚡ Emer.
                                </span>
                              )}
                              {row.totalQuantity > 1 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 print:hidden">
                                  {row.totalQuantity}x
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 text-slate-200 print:text-black max-w-[240px]">
                            <div
                              className={`truncate font-sans font-medium ${
                                isChecked ? 'text-slate-400' : ''
                              }`}
                              title={row.description}
                            >
                              {row.description}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono print:hidden">
                              Embarque: {row.containerNumber}
                            </div>
                          </td>

                          {/* Model */}
                          <td className="py-3 px-3 text-slate-300 print:text-black text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 print:border-black">
                              {row.changanModel || 'Changan'}
                            </span>
                          </td>

                          {/* Rack Location */}
                          <td className="py-3 px-3 text-cyan-400 font-bold text-[11px] print:text-black">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-500 print:hidden" />
                              <span>{row.locationInCedis}</span>
                            </div>
                          </td>

                          {/* Total Pending Quantity (Highlighted Column) */}
                          <td className="py-3 px-3 text-center bg-cyan-950/40 font-black text-emerald-400 text-sm border-x border-cyan-900/50 print:bg-slate-100 print:text-black">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-700/60 print:border-none shadow-sm">
                              {row.totalQuantity} u.
                            </span>
                          </td>

                          {/* 6 Branch Quantities */}
                          {CHANGAN_BRANCHES.map((b) => {
                            const qty = row.branchQuantities[b] || 0;
                            const breakdowns = row.branchBreakdowns[b] || [];
                            const isBranchEmergency = breakdowns.some((x) => x.isEmergency);

                            return (
                              <td
                                key={b}
                                className={`py-3 px-3 text-center text-xs font-bold ${
                                  qty > 0 ? 'bg-slate-900/30 text-white' : 'text-slate-600 print:text-slate-300'
                                }`}
                              >
                                {qty > 0 ? (
                                  <div className="flex flex-col items-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-lg border text-xs ${
                                        isBranchEmergency
                                          ? 'bg-rose-950/90 text-rose-300 border-rose-600 font-black animate-pulse'
                                          : 'bg-slate-800 text-cyan-300 border-slate-700'
                                      } print:bg-transparent print:text-black print:border-black`}
                                      title={breakdowns
                                        .map((bk) => `${bk.orderNumber} - ${bk.clientName} (${bk.quantity}u.)`)
                                        .join('\n')}
                                    >
                                      {qty} u.
                                    </span>
                                    {isBranchEmergency && (
                                      <span className="text-[8px] text-rose-400 print:hidden mt-0.5 font-bold">
                                        ⚡ Emer.
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-700 print:text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Quick Action Button */}
                          <td className="py-3 px-3 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {onNavigateToLabels && (
                                <button
                                  onClick={() => {
                                    const allAllocations = CHANGAN_BRANCHES.flatMap(
                                      (b) => row.branchBreakdowns[b] || []
                                    );
                                    const firstOrder = allAllocations.find((x) => x && x.orderNumber);
                                    onNavigateToLabels(firstOrder?.orderNumber);
                                  }}
                                  className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                                  title="Generar e imprimir rótulos de despacho con QR para este repuesto"
                                >
                                  <Tag className="w-3 h-3 text-cyan-400" />
                                  <span>Rótulos</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleCopySummary(row)}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                                title="Copiar resumen del repuesto al portapapeles"
                              >
                                {copiedCode === row.partCode ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => setExpandedPartCode(isExpanded ? null : row.partCode)}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                                title={isExpanded ? 'Contraer detalle' : 'Expandir detalle de órdenes'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Drilldown row with per-branch orders and clients */}
                        {isExpanded && (
                          <tr className="bg-slate-950/95 border-y border-cyan-800/60 animate-in fade-in">
                            <td colSpan={14} className="p-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2 font-mono">
                                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                                    <span>
                                      Desglose de Pedidos Asignados: {row.partCode} — {row.description} ({row.changanModel})
                                    </span>
                                  </div>

                                  <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
                                    <span>Ubicación Bodega: <strong className="text-white">{row.locationInCedis}</strong></span>
                                    <span>Total: <strong className="text-emerald-400">{row.totalQuantity} unidades</strong></span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                  {CHANGAN_BRANCHES.map((branch) => {
                                    const itemsForBranch = row.branchBreakdowns[branch] || [];
                                    if (itemsForBranch.length === 0) return null;

                                    return (
                                      <div
                                        key={branch}
                                        className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 text-xs"
                                      >
                                        <div className="flex justify-between items-center text-xs font-bold text-white border-b border-slate-800 pb-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                                            <span className="text-cyan-300 font-mono">{branch}</span>
                                          </div>
                                          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono text-[11px] border border-cyan-800/60">
                                            {row.branchQuantities[branch]} piezas
                                          </span>
                                        </div>

                                        <div className="space-y-2">
                                          {itemsForBranch.map((bk, bIdx) => (
                                            <div
                                              key={bIdx}
                                              className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] font-mono space-y-1"
                                            >
                                              <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1.5">
                                                  {bk.isEmergency && (
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                                  )}
                                                  <span className="text-cyan-300 font-bold">{bk.orderNumber}</span>
                                                </div>
                                                <span className="text-white font-bold px-1.5 py-0.2 bg-slate-800 rounded">
                                                  {bk.quantity} un.
                                                </span>
                                              </div>

                                              <div className="text-slate-300">
                                                Cliente: <strong className="text-white">{bk.clientName}</strong>
                                              </div>

                                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                <span>Placa: <strong className="text-cyan-400">{bk.plate}</strong></span>
                                                {bk.quotationNumber && <span>Cotiz: {bk.quotationNumber}</span>}
                                              </div>

                                              {onNavigateToLabels && (
                                                <button
                                                  onClick={() => onNavigateToLabels(bk.orderNumber)}
                                                  className="w-full mt-1.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                                >
                                                  <Tag className="w-3 h-3 text-cyan-400" />
                                                  <span>Imprimir Rótulo de este Pedido</span>
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer with Column Totals & Grand Total */}
              {pivotTableData.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-[#0e1420] border-t-2 border-slate-700 text-xs font-mono font-bold text-white print:bg-slate-200 print:text-black print:border-black">
                    <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-300 print:text-black">
                      TOTALES CONSOLIDADOS PICKING CEDIS:
                    </td>
                    <td className="py-3.5 px-3 text-center bg-cyan-900/70 text-emerald-300 font-black text-sm border-x border-cyan-700 print:bg-slate-300 print:text-black">
                      {pivotTableData.grandTotal} u.
                    </td>
                    {CHANGAN_BRANCHES.map((b) => (
                      <td key={b} className="py-3.5 px-3 text-center text-cyan-300 font-black text-xs print:text-black">
                        {pivotTableData.columnTotals[b]} u.
                      </td>
                    ))}
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* VIEW MODE 1.B: PIVOT GROUPED BY BRANCH */}
        {viewMode === 'pivot' && pivotGroupMode === 'by-branch' && (
          <div ref={tableContainerRef} className="p-5 lg:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Desglose Dinámico de Repuestos Agrupado por Sucursal</span>
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Lista de códigos y cantidades asignadas a cada sucursal para agilizar el armado de bultos y etiquetado físico.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPivotPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exportar PDF Matriz</span>
                </button>
              </div>
            </div>

            {/* List of Branches */}
            <div className="space-y-5">
              {CHANGAN_BRANCHES.filter(
                (b) => selectedBranchFilter === 'ALL' || selectedBranchFilter === b
              ).map((branch) => {
                // Collect all rows that have qty for this branch
                const branchRows = pivotTableData.rows.filter(
                  (r) => (r.branchQuantities[branch] || 0) > 0
                );
                const branchTotalUnits = pivotTableData.columnTotals[branch] || 0;
                const branchEmergencyUnits = branchRows.reduce((acc, r) => {
                  const bks = r.branchBreakdowns[branch] || [];
                  return acc + bks.filter((b) => b.isEmergency).reduce((s, x) => s + x.quantity, 0);
                }, 0);

                if (branchRows.length === 0) {
                  return (
                    <div
                      key={branch}
                      className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-center text-slate-500 font-mono text-xs"
                    >
                      <Building2 className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                      <span>{branch}: Sin repuestos pendientes de despacho con los filtros activos.</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={branch}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
                  >
                    {/* Branch Header Banner */}
                    <div className="bg-slate-950/80 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white font-mono text-sm">{branch}</h5>
                            {branchEmergencyUnits > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/80 animate-pulse">
                                ⚡ {branchEmergencyUnits} Emergencias
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {branchRows.length} SKUs distintos // {branchTotalUnits} Piezas totales
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-mono font-bold rounded-xl text-xs">
                          Total Sucursal: {branchTotalUnits} u.
                        </span>
                      </div>
                    </div>

                    {/* Branch Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px] text-xs font-mono">
                        <thead>
                          <tr className="bg-slate-950/40 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3 w-12 text-center">Picking</th>
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Descripción</th>
                            <th className="py-2.5 px-3">Modelo</th>
                            <th className="py-2.5 px-3">Ubicación Rack</th>
                            <th className="py-2.5 px-3 text-center bg-cyan-950/40 text-cyan-300 font-bold">
                              Cant. Asignada
                            </th>
                            <th className="py-2.5 px-3">Pedidos / Clientes</th>
                            <th className="py-2.5 px-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {branchRows.map((r, rIdx) => {
                            const qty = r.branchQuantities[branch] || 0;
                            const breakdowns = r.branchBreakdowns[branch] || [];
                            const isEmerg = breakdowns.some((x) => x.isEmergency);
                            const isChecked = checkedParts.has(r.partCode);

                            return (
                              <tr
                                key={r.partCode}
                                className={`hover:bg-slate-800/20 transition-colors ${
                                  isChecked ? 'bg-emerald-950/10' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                                  {rIdx + 1}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => togglePartCheck(r.partCode)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      isChecked
                                        ? 'text-emerald-400 bg-emerald-950 border border-emerald-700/60'
                                        : 'text-slate-600 hover:text-slate-400'
                                    }`}
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-cyan-300">
                                  <div className="flex items-center gap-1.5">
                                    <span className={isChecked ? 'line-through text-slate-400' : ''}>
                                      {r.partCode}
                                    </span>
                                    {isEmerg && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                        ⚡ Emer.
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-200 max-w-[200px]">
                                  <div className="truncate font-sans font-medium" title={r.description}>
                                    {r.description}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                  {r.changanModel || 'Changan'}
                                </td>
                                <td className="py-2.5 px-3 text-cyan-400 font-bold text-[11px]">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-cyan-500" />
                                    <span>{r.locationInCedis}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center bg-cyan-950/30 font-black text-cyan-300 text-sm">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                                    {qty} u.
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                                  <div className="space-y-0.5">
                                    {breakdowns.map((bk, bIdx) => (
                                      <div key={bIdx} className="flex items-center gap-1 text-[10px]">
                                        <span className="text-cyan-400 font-bold">{bk.orderNumber}</span>
                                        <span className="text-slate-400">({bk.clientName})</span>
                                        <span className="text-emerald-400 font-bold">[{bk.quantity}u]</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {onNavigateToLabels && breakdowns.length > 0 && (
                                    <button
                                      onClick={() => onNavigateToLabels(breakdowns[0].orderNumber)}
                                      className="p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                      title="Generar rótulo de despacho"
                                    >
                                      <Tag className="w-3 h-3 text-cyan-400" />
                                      <span>Rótulo</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW MODE 2: CONSOLIDATED OUTBOUND / PALLETS BY BRANCH */}
        {viewMode === 'pallets' && (
          <div className="p-5 lg:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                  Consolidación de Salidas & Tarimas de Despacho ({CHANGAN_BRANCHES.length} Rutas)
                </h4>
                <p className="text-xs text-slate-400">
                  Agrupación de repuestos por pallet y bulto para cada sucursal de destino.
                </p>
              </div>

              {onNavigateToLabels && (
                <button
                  onClick={handleMassLabeling}
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Generar Rótulos para Todos los Bultos</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dispatchData.branchSummaries.map((bs) => {
                const hasEmergencies = bs.emergencyParts > 0;
                // Group items by partCode inside this branch
                const groupedByPart = new Map<string, { code: string; desc: string; model: string; qty: number; loc: string; hasEmerg: boolean }>();

                bs.items.forEach((item) => {
                  const existing = groupedByPart.get(item.partCode);
                  if (existing) {
                    existing.qty += item.quantity;
                    if (item.isEmergency) existing.hasEmerg = true;
                  } else {
                    groupedByPart.set(item.partCode, {
                      code: item.partCode,
                      desc: item.description,
                      model: item.changanModel,
                      qty: item.quantity,
                      loc: item.locationInCedis,
                      hasEmerg: item.isEmergency,
                    });
                  }
                });

                const branchPartsList = Array.from(groupedByPart.values());
                const estimatedBoxes = Math.max(1, Math.ceil(bs.totalParts / 4));

                return (
                  <div
                    key={bs.branch}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-cyan-400" />
                          <h5 className="font-bold text-white font-mono text-sm">{bs.branch}</h5>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono font-bold border border-cyan-800/60">
                          {bs.totalParts} piezas
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Órdenes</span>
                          <span className="font-bold text-white text-sm">{bs.orderCount}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">SKUs Únicos</span>
                          <span className="font-bold text-cyan-300 text-sm">{branchPartsList.length}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Bultos Est.</span>
                          <span className="font-bold text-amber-300 text-sm">{estimatedBoxes} cajas</span>
                        </div>
                      </div>

                      {hasEmergencies && (
                        <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded-xl text-[11px] font-mono text-rose-300 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          <span>
                            Contiene <strong>{bs.emergencyParts} repuestos</strong> de EMERGENCIA prioritaria.
                          </span>
                        </div>
                      )}

                      {/* Repuestos a empacar en esta sucursal */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                          Manifiesto de Carga ({branchPartsList.length} SKUs):
                        </div>
                        {branchPartsList.map((bp, bpIdx) => (
                          <div
                            key={bpIdx}
                            className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="truncate max-w-[170px]">
                              <span className="text-cyan-300 font-bold block truncate">{bp.code}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{bp.desc}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-emerald-400">{bp.qty} un.</span>
                              <span className="text-[9px] text-slate-500 block">{bp.loc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions for this specific branch */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      {onNavigateToLabels && (
                        <button
                          onClick={() => {
                            const firstOrder = bs.items[0]?.orderNumber;
                            onNavigateToLabels(firstOrder);
                          }}
                          className="w-full py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Tag className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Rótulos de {bs.branch}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW MODE 3: DETAILED ORDER-BY-ORDER LIST */}
        {viewMode === 'detail' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                  <th className="py-3 px-4">Sucursal Destino</th>
                  <th className="py-3 px-3">Nº Pedido / Cotiz.</th>
                  <th className="py-3 px-4">Cliente & Placa</th>
                  <th className="py-3 px-3">Modelo Changan</th>
                  <th className="py-3 px-4">Código de Repuesto</th>
                  <th className="py-3 px-4">Descripción Oficial</th>
                  <th className="py-3 px-3 text-center">Cant. a Despachar</th>
                  <th className="py-3 px-3">Ubicación CEDIS</th>
                  <th className="py-3 px-3">Estatus Operativo</th>
                  <th className="py-3 px-3 text-center">Rótulo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs font-mono">
                {filteredDetailItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500 font-mono text-xs">
                      No se encontraron repuestos asignados para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredDetailItems.map((item, idx) => (
                    <tr
                      key={`${item.orderNumber}-${item.partCode}-${idx}`}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Branch */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-white font-mono px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs inline-block">
                          {item.branch}
                        </span>
                      </td>

                      {/* Order & Quotation */}
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          {item.isEmergency && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Pedido de Emergencia"></span>
                          )}
                          <span className="text-cyan-300">{item.orderNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal font-mono">
                          Cotiz: {item.quotationNumber || 'N/A'}
                        </div>
                      </td>

                      {/* Client & Plate */}
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium font-sans">{item.clientName}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          Placa: <b>{item.plate}</b>
                        </div>
                      </td>

                      {/* Model */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                          {item.changanModel}
                        </span>
                      </td>

                      {/* Part Code */}
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {item.partCode}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-slate-300 max-w-[220px]">
                        <div className="truncate font-sans" title={item.description}>
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Embarque: {item.containerNumber}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-xs">
                          {item.quantity} u.
                        </span>
                      </td>

                      {/* Location in CEDIS */}
                      <td className="py-3 px-3 font-mono text-slate-400">
                        <div className="flex items-center gap-1 text-cyan-400/90 text-[11px]">
                          <MapPin className="w-3 h-3 text-cyan-500" />
                          <span>{item.locationInCedis}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            item.status === 'EN BODEGA CEDIS'
                              ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                              : item.status === 'DESPACHADO'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                              : 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Direct Label */}
                      <td className="py-3 px-3 text-center">
                        {onNavigateToLabels && (
                          <button
                            onClick={() => onNavigateToLabels(item.orderNumber)}
                            className="p-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs transition-colors"
                            title="Ver e imprimir rótulo"
                          >
                            <Tag className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Free Surplus Stock Section (If Active Container Selected) */}
      {activeContainer && dispatchData.unmatchedSurplus.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-3xl space-y-3 print:hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Repuestos del Embarque Destinados a Stock General CEDIS ({dispatchData.surplusTotal} Piezas Libres)
              </h3>
            </div>
            <span className="text-xs text-amber-400 font-mono">Disponibles para Mostrador / Bodega</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            {dispatchData.unmatchedSurplus.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-cyan-300">{s.code}</div>
                  <div className="text-slate-400 text-[11px] truncate max-w-[180px]">{s.description}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-cyan-500" /> {s.location}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-amber-400">{s.quantity} u.</span>
                  <span className="text-[9px] text-slate-500 block">Stock Libre</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formal Printable Dispatch Sheet Sign-off Block (Visible on Print) */}
      <div className="hidden print:block pt-8 border-t-2 border-black mt-8 text-black font-sans">
        <div className="text-center font-bold text-lg uppercase mb-2">
          HOJA OFICIAL DE PICKING, SEPARACIÓN Y ROTULADO CEDIS CHANGAN
        </div>
        <div className="text-center text-xs text-slate-600 mb-6 font-mono">
          Documento para separación física de repuestos por sucursal y colocación de etiquetas de identificación Changan
        </div>
        <div className="grid grid-cols-4 gap-6 text-center text-xs mt-12">
          <div className="border-t border-black pt-2">
            <p className="font-bold">BODEGUERO PICKING</p>
            <p className="text-[10px] text-slate-600">Separación Física en Pallet</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">ENCARGADO ROTULADO</p>
            <p className="text-[10px] text-slate-600">Colocación de Etiquetas</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">JEFE ALMACÉN CEDIS</p>
            <p className="text-[10px] text-slate-600">Verificación y Visto Bueno</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">TRANSPORTE / SUCURSAL</p>
            <p className="text-[10px] text-slate-600">Recepción en Destino</p>
          </div>
        </div>
      </div>
    </div>
  );
};
