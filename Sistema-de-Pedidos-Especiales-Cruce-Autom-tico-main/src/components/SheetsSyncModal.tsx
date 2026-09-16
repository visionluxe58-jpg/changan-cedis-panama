import {
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  Save,
  Sparkles
} from 'lucide-react';
import React, { useState } from 'react';
import { exportOrdersToCsv } from '../utils/storage';
import { SpecialOrder } from '../types';

interface SheetsSyncModalProps {
  orders: SpecialOrder[];
  onClose: () => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({ orders, onClose }) => {
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1Changan-CEDIS-Logistics-Panama-Master/edit'
  );

  // Generate Tab-Separated Values (TSV) which pastes cleanly into Google Sheets cells with one Ctrl+V
  const generateTsv = () => {
    const headers = [
      'Nº Pedido',
      'Fecha',
      'Sucursal',
      'Colaborador',
      'Canal',
      'Tipo Pedido',
      'Cotización',
      'Cliente',
      'Placa',
      'Modelo Changan',
      'Estado Pago',
      'Doc Pago/Factura',
      'Código Repuesto',
      'Cód. Actualizado',
      'Descripción Oficial',
      'Cant. Solicitada',
      'Cant. Asignada',
      'Contenedor Asignado',
      'Ubicación CEDIS',
      'Estatus General',
      'Facturado Final',
    ];

    const rows: string[] = [headers.join('\t')];

    orders.forEach((order) => {
      order.items.forEach((item) => {
        rows.push(
          [
            order.orderNumber,
            order.createdAt.split('T')[0],
            order.branch,
            order.collaboratorName,
            order.channel,
            order.orderType,
            order.quotationNumber,
            order.clientName,
            order.plate,
            order.changanModel,
            order.paymentStatus,
            order.receiptOrInvoiceNumber,
            item.code,
            item.updatedCode || '',
            item.description,
            item.quantityRequested,
            item.quantityAssigned,
            item.containerId || order.assignedContainerId || '',
            item.locationInCedis || '',
            order.overallStatus,
            order.isBilled ? 'SÍ' : 'NO',
          ].join('\t')
        );
      });
    });

    return rows.join('\n');
  };

  const handleCopyTsv = () => {
    const tsv = generateTsv();
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2500);
  };

  const handleDownloadCsv = () => {
    const csv = exportOrdersToCsv(orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `changan_cedis_master_sheet_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const sampleAppsScript = `// Google Apps Script para sincronización automática con Changan CEDIS
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  // Agregar fila automática
  sheet.appendRow([
    data.orderNumber,
    new Date(),
    data.branch,
    data.collaboratorName,
    data.channel,
    data.clientName,
    data.plate,
    data.changanModel,
    data.code,
    data.quantityRequested,
    data.overallStatus
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({"result": "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(sampleAppsScript);
    setCopiedAppsScript(true);
    setTimeout(() => setCopiedAppsScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">
                INTEGRACIÓN Y EXPORTACIÓN // GOOGLE SHEETS & EXCEL
              </div>
              <h3 className="text-xl font-bold text-white font-mono">
                Sincronizador Sábana de Datos Changan
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-mono p-2"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Quick Action Banner */}
        <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Copiar para Pegar Directo en Google Sheets / Excel</span>
            </h4>
            <p className="text-xs text-slate-300">
              Copia toda la estructura con encabezados y datos con un solo clic. Solo abre tu Google Sheet y presiona <b>Ctrl+V</b>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTsv}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-1.5"
            >
              {copiedTsv ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Datos Copiados al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Sábana Completa</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Descargar .CSV</span>
            </button>
          </div>
        </div>

        {/* Google Sheets Link & Structure Config */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
          <label className="block text-slate-400 font-mono font-bold uppercase text-[10px]">
            Enlace a tu Google Spreadsheet Corporativo:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-mono flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Crear Nueva Hoja</span>
            </a>
          </div>
        </div>

        {/* Data Schema Columns Reference from PDF */}
        <div className="bg-black/50 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="text-[11px] font-mono uppercase font-bold text-cyan-400">
            Columnas Oficiales Sincronizadas (según requerimiento Changan CEDIS):
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-300">
            {[
              'Codigo',
              'Codigo actualizado',
              'Descripcion',
              'Cantidad',
              'Cliente',
              'Modelo',
              'Cotizacion',
              'Canal (Mostrador/Taller/Chapistería)',
              'Sucursal',
              'Estado Pago',
              'Nº Recibo/Factura',
              'Contenedor',
              'Ubicacion Bodega',
              'Estatus General',
            ].map((col) => (
              <span
                key={col}
                className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-cyan-300 font-semibold"
              >
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Optional Google Apps Script Automation Hook */}
        <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Script de Sincronización Automática (Google Apps Script)</span>
            </div>
            <button
              onClick={handleCopyAppsScript}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
            >
              {copiedAppsScript ? '¡Código Copiado!' : 'Copiar Script'}
            </button>
          </div>
          <pre className="bg-black p-3 rounded-xl text-[10px] font-mono text-slate-400 overflow-x-auto max-h-28">
            {sampleAppsScript}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
