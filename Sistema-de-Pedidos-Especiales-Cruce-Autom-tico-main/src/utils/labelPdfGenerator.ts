import { jsPDF } from 'jspdf';
import { SpecialOrder } from '../types';

export interface LabelItemData {
  order: SpecialOrder;
  item: SpecialOrder['items'][0];
  unitIndex: number;
  totalUnits: number;
}

export type LabelFormat = 'thermal_75x50' | 'thermal_50x30' | 'sheet_letter';

/**
 * Draws a clean, high-contrast Changan label on a jsPDF document context
 */
function drawSingleLabel(
  doc: jsPDF,
  label: LabelItemData,
  x: number,
  y: number,
  w: number,
  h: number,
  isCompact: boolean = false
) {
  const { order, item, unitIndex, totalUnits } = label;

  // Outer border with subtle rounding
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);

  // Top header bar (Changan CEDIS Panama)
  const headerHeight = isCompact ? 5 : 6.5;
  doc.setFillColor(15, 23, 42); // dark slate/black
  doc.rect(x, y, w, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 6.5 : 8);
  doc.text('CHANGAN', x + 2, y + (isCompact ? 3.5 : 4.5));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isCompact ? 5 : 6);
  doc.text('CEDIS PANAMÁ // LOGÍSTICA', x + (isCompact ? 18 : 22), y + (isCompact ? 3.5 : 4.5));

  // Unit counter (e.g. 1/2)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 5.5 : 6.5);
  doc.text(`${unitIndex}/${totalUnits}`, x + w - 2, y + (isCompact ? 3.5 : 4.5), { align: 'right' });

  // Destination Banner (High Contrast Black Box)
  const destY = y + headerHeight + 1;
  const destHeight = isCompact ? 5.5 : 7;
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(x + 1.5, destY, w - 3, destHeight, 1, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 7.5 : 9.5);
  const destText = `DESTINO: ${order.branch.toUpperCase()}`;
  doc.text(destText, x + w / 2, destY + (isCompact ? 3.8 : 4.8), { align: 'center' });

  // Part Code Header & Value
  let curY = destY + destHeight + 2.5;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 4.5 : 5.5);
  doc.text('CÓDIGO DE REPUESTO:', x + 2, curY);

  curY += isCompact ? 3.2 : 4;
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(isCompact ? 9 : 11.5);
  doc.text(item.code || 'SIN-CODIGO', x + 2, curY);

  if (item.updatedCode && item.updatedCode !== item.code) {
    doc.setTextColor(70, 70, 70);
    doc.setFont('courier', 'bold');
    doc.setFontSize(isCompact ? 5 : 6);
    doc.text(`[Rev: ${item.updatedCode}]`, x + w - 2, curY, { align: 'right' });
  }

  // Part Description (clipped/split)
  curY += isCompact ? 2.8 : 3.5;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 5 : 6.5);
  const maxDescWidth = w - 4;
  const splitDesc = doc.splitTextToSize(item.description || '', maxDescWidth);
  const descLines = splitDesc.slice(0, isCompact ? 1 : 2);
  doc.text(descLines, x + 2, curY);

  curY += (descLines.length * (isCompact ? 2.5 : 3.2));

  // Separator line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(x + 1.5, curY, x + w - 1.5, curY);
  curY += 1.5;

  // Grid details: Client, Plate, Model, Quotation
  const col1X = x + 2;
  const col2X = x + (w / 2) + 1;

  // Row 1: Client & Plate/Model
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 4 : 4.8);
  doc.text('CLIENTE:', col1X, curY);
  doc.text('PLACA / MODELO:', col2X, curY);

  curY += isCompact ? 2.3 : 2.8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 5 : 6.2);
  const clientName = (order.clientName || 'CLIENTE GENERAL').slice(0, isCompact ? 18 : 22);
  doc.text(clientName, col1X, curY);
  const plateModel = `${order.plate || 'S/P'} - ${order.changanModel || ''}`.slice(0, isCompact ? 18 : 22);
  doc.text(plateModel, col2X, curY);

  // Row 2: Canal / Solicitante & Cotización
  curY += isCompact ? 2.8 : 3.5;
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 4 : 4.8);
  doc.text('CANAL / ASESOR:', col1X, curY);
  doc.text('COTIZACIÓN / ESTADO:', col2X, curY);

  curY += isCompact ? 2.3 : 2.8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 4.8 : 5.8);
  const channelText = `${order.channel} (${order.collaboratorName || 'S/A'})`.slice(0, isCompact ? 18 : 22);
  doc.text(channelText, col1X, curY);
  const quoteText = `${order.quotationNumber || 'S/C'} [${order.paymentStatus || 'Pend'}]`.slice(0, isCompact ? 18 : 22);
  doc.text(quoteText, col2X, curY);

  // Bottom Footer Box (Pedido, Contenedor, Ubic & Barcode representation)
  curY += isCompact ? 2.8 : 3.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x + 1.5, curY, x + w - 1.5, curY);
  curY += 1.8;

  // Tracking Meta
  doc.setTextColor(50, 50, 50);
  doc.setFont('courier', 'normal');
  doc.setFontSize(isCompact ? 4.2 : 5.2);
  doc.text(`PED: ${order.orderNumber}`, col1X, curY);
  curY += isCompact ? 2.2 : 2.6;
  const contText = `CONT: ${item.containerId || order.assignedContainerId || 'CEDIS-MANIF'}`.slice(0, 24);
  doc.text(contText, col1X, curY);
  curY += isCompact ? 2.2 : 2.6;
  const locText = `UBIC: ${item.locationInCedis || 'R-01-A'}`;
  doc.text(locText, col1X, curY);

  // Barcode graphics (Right side of bottom)
  const barcodeWidth = isCompact ? 20 : 25;
  const barcodeHeight = isCompact ? 5 : 7;
  const barcodeX = x + w - barcodeWidth - 2;
  const barcodeY = y + h - barcodeHeight - (isCompact ? 3.5 : 4.5);

  doc.setFillColor(0, 0, 0);
  // Draw simulated crisp barcode bars based on part code
  const codeStr = (item.code || order.orderNumber || 'CHANGAN').replace(/[^A-Z0-9]/gi, '');
  let barPos = barcodeX;
  for (let b = 0; b < codeStr.length; b++) {
    const charCode = codeStr.charCodeAt(b);
    const barW = (charCode % 3 + 1) * 0.35;
    const gapW = (charCode % 2 + 1) * 0.3;
    if (barPos + barW <= barcodeX + barcodeWidth) {
      doc.rect(barPos, barcodeY, barW, barcodeHeight, 'F');
    }
    barPos += barW + gapW;
  }

  // Barcode number text
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(isCompact ? 4 : 5);
  doc.text(item.code || order.orderNumber, barcodeX + (barcodeWidth / 2), barcodeY + barcodeHeight + 2.5, {
    align: 'center',
  });
}

/**
 * Generates and downloads a complete PDF containing the selected labels
 */
export function generateLabelsPDF(
  labels: LabelItemData[],
  format: LabelFormat = 'thermal_75x50',
  fileName?: string
): void {
  if (labels.length === 0) {
    alert('No hay etiquetas para generar.');
    return;
  }

  if (format === 'thermal_75x50') {
    // 75mm wide x 50mm high (Landscape orientation for standard thermal roll)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 75],
    });

    labels.forEach((label, idx) => {
      if (idx > 0) doc.addPage([50, 75], 'landscape');
      drawSingleLabel(doc, label, 1, 1, 73, 48, false);
    });

    const defaultName = `Etiquetas_Termicas_75x50_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName || defaultName);
    return;
  }

  if (format === 'thermal_50x30') {
    // 50mm wide x 30mm high
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [30, 50],
    });

    labels.forEach((label, idx) => {
      if (idx > 0) doc.addPage([30, 50], 'landscape');
      drawSingleLabel(doc, label, 0.8, 0.8, 48.4, 28.4, true);
    });

    const defaultName = `Etiquetas_Termicas_50x30_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName || defaultName);
    return;
  }

  if (format === 'sheet_letter') {
    // Standard Letter page (215.9 x 279.4 mm) - 2 columns x 4 rows (8 labels per page)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = 215.9;
    const pageHeight = 279.4;
    const marginX = 10;
    const marginY = 12;
    const labelW = (pageWidth - marginX * 2 - 8) / 2; // ~93.95 mm
    const labelH = 58; // 4 rows = ~232 mm + gaps
    const gapX = 8;
    const gapY = 6;
    const labelsPerPage = 8;

    labels.forEach((label, idx) => {
      const pageIndex = Math.floor(idx / labelsPerPage);
      const posOnPage = idx % labelsPerPage;

      if (posOnPage === 0 && pageIndex > 0) {
        doc.addPage('letter', 'portrait');
      }

      const col = posOnPage % 2;
      const row = Math.floor(posOnPage / 2);

      const x = marginX + col * (labelW + gapX);
      const y = marginY + row * (labelH + gapY);

      drawSingleLabel(doc, label, x, y, labelW, labelH, false);
    });

    const defaultName = `Etiquetas_Hoja_Carta_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName || defaultName);
  }
}
