import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  FileSpreadsheet,
  Download,
  FileText,
  CloudUpload,
  CheckCircle2,
  AlertCircle, 
  Clock, 
  Building2, 
  Box, 
  User, 
  Layers, 
  Filter, 
  Search
} from 'lucide-react';
import { FilaMatrizCentral } from '../types/cedis';
import { appsScriptClient } from '../services/appsScriptClient';

interface ModalReporteAsignacionesProps {
  isOpen: boolean;
  onClose: () => void;
  filas: FilaMatrizCentral[];
}

export const ModalReporteAsignaciones: React.FC<ModalReporteAsignacionesProps> = ({
  isOpen,
  onClose,
  filas
}) => {
  const [filtroSucursal, setFiltroSucursal] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [fechaGeneracion] = useState<string>(() => new Date().toLocaleString());
  const [slaInicio] = useState<string>(() => new Date().toISOString());
  const [sincronizandoSheet, setSincronizandoSheet] = useState<boolean>(false);
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);
  const [mensajeSync, setMensajeSync] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const filasConAsignacion = useMemo(() => {
    return filas.filter(f => {
      const tieneAsignacion = (f.cantidadAsignada || 0) > 0 || !!f.palletAsignado || !!f.contenedorAsignado;
      if (!tieneAsignacion) return false;

      if (filtroSucursal !== 'TODAS' && f.sucursal !== filtroSucursal) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincide = 
          f.pedidoId.toLowerCase().includes(q) ||
          f.cliente.toLowerCase().includes(q) ||
          f.codigoRepuesto.toLowerCase().includes(q) ||
          f.descripcionOficial.toLowerCase().includes(q) ||
          (f.palletAsignado && f.palletAsignado.toLowerCase().includes(q)) ||
          (f.contenedorAsignado && f.contenedorAsignado.toLowerCase().includes(q));
        if (!coincide) return false;
      }
      return true;
    });
  }, [filas, filtroSucursal, busqueda]);

  const sucursales = useMemo(() => {
    const s = new Set<string>();
    filas.forEach(f => {
      if (f.sucursal) s.add(f.sucursal);
    });
    return Array.from(s).sort();
  }, [filas]);

  const agrupado = useMemo(() => {
    const mapa: Record<string, Record<string, Record<string, FilaMatrizCentral[]>>> = {};

    filasConAsignacion.forEach(f => {
      const suc = f.sucursal || 'Sin Sucursal';
      const pallet = f.palletAsignado || f.contenedorAsignado || 'Pallet General / Pendiente';
      const cli = f.cliente || 'SIN CLIENTE ASIGNADO';

      if (!mapa[suc]) mapa[suc] = {};
      if (!mapa[suc][pallet]) mapa[suc][pallet] = {};
      if (!mapa[suc][pallet][cli]) mapa[suc][pallet][cli] = [];

      mapa[suc][pallet][cli].push(f);
    });

    return mapa;
  }, [filasConAsignacion]);

  if (!isOpen) return null;

  const handleImprimir = () => {
    window.print();
  };


  const handleSincronizarGoogleSheets = async () => {
    setSincronizandoSheet(true);
    setMensajeSync(null);

    try {
      const datosParaHoja = filasConAsignacion.map(f => ({
        sucursal: f.sucursal,
        contenedorAsignado: f.contenedorAsignado,
        palletAsignado: f.palletAsignado,
        cliente: f.cliente,
        pedidoId: f.pedidoId,
        modeloChangan: f.modeloChangan,
        placa: f.placa,
        codigoRepuesto: f.codigoRepuesto,
        descripcionOficial: f.descripcionOficial,
        cantidadSolicitada: f.cantidadSolicitada,
        cantidadAsignada: f.cantidadAsignada,
        estatusGeneral: f.estatusGeneral,
        slaInicio: slaInicio,
        colaborador: f.colaborador
      }));

      const res = await appsScriptClient.sincronizarHojaAsignaciones(datosParaHoja);
      if (res.success) {
        setMensajeSync({
          tipo: 'ok',
          texto: '✅ Pestaña "Reporte_Asignaciones" creada/actualizada exitosamente en tu Google Sheet.'
        });
      } else {
        setMensajeSync({
          tipo: 'error',
          texto: res.error || 'Error al sincronizar con Google Sheets.'
        });
      }
    } catch (err: any) {
      setMensajeSync({
        tipo: 'error',
        texto: 'Error de conexión con Google Sheets: ' + (err.message || err)
      });
    } finally {
      setSincronizandoSheet(false);
    }
  };

  
  const handleExportarExcel = () => {
    const dataFilas = filasConAsignacion.map(f => ({
      'Sucursal Destino': f.sucursal || 'Central',
      'Contenedor': f.contenedorAsignado || 'CEDIS-CONT',
      'Pallet / Bulto': f.palletAsignado || 'General',
      'Cliente': f.cliente || 'SIN CLIENTE ASIGNADO',
      'ID Pedido': f.pedidoId || '',
      'Modelo': f.modeloChangan || '',
      'Placa': f.placa || '',
      'Código OEM SKU': f.codigoRepuesto || '',
      'Descripción Repuesto': f.descripcionOficial || '',
      'Cant. Solicitada': Number(f.cantidadSolicitada) || 1,
      'Cant. Asignada': Number(f.cantidadAsignada) || 1,
      'Estatus Logístico': f.estatusGeneral || 'ASIGNADO',
      'Fecha SLA Inicio': slaInicio,
      'Colaborador': f.colaborador || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataFilas);

    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 28 },
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 20 },
      { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 22 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Asignaciones');

    const fechaStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Reporte_Asignaciones_CEDIS_${fechaStr}.xlsm`, { bookType: 'xlsm' });
  };

    // Generador vectorial directo garantizado e instantáneo en formato Carta (8.5 x 11 in = 612 x 792 pt)
  const generarPdfDirectoVectorial = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });

      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 36; // 0.5 pulgada
      const printableWidth = pageWidth - (margin * 2);
      let y = margin;

      const agregarEncabezadoPagina = (numPag: number, totalPagEstimado?: number) => {
        // Franja azul oscura institucional
        doc.setFillColor(15, 23, 42); // #0f172a
        doc.rect(margin, y, printableWidth, 38, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('CHANGAN AUTO PANAMÁ', margin + 10, y + 16);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(56, 189, 248); // sky-400
        doc.text('CENTRO DE DISTRIBUCIÓN Y LOGÍSTICA CEDIS CENTRAL', margin + 10, y + 28);

        // Info lateral derecha
        doc.setTextColor(226, 232, 240);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Emisión: ${fechaGeneracion}`, pageWidth - margin - 10, y + 15, { align: 'right' });
        doc.text(`SLA Inicio: ${new Date(slaInicio).toLocaleTimeString()} | Pág. ${numPag}`, pageWidth - margin - 10, y + 27, { align: 'right' });

        y += 46;

        // Subtítulo del reporte
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE OFICIAL CONSOLIDADO DE ASIGNACIONES Y DESPACHO', margin, y);
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Filtro Sucursal: ${filtroSucursal} | Total ítems asignados: ${filasConAsignacion.length}`, margin, y + 10);
        
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.75);
        doc.line(margin, y + 14, pageWidth - margin, y + 14);

        y += 22;
      };

      const agregarPiePagina = (numPag: number) => {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('A.R.I.A. Sistema CEDIS • Distribuidora Automotriz Fortune, S.A. • Documento Operativo Oficial', margin, pageHeight - 20);
        doc.text(`Página ${numPag}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
      };

      let paginaActual = 1;
      agregarEncabezadoPagina(paginaActual);

      if (Object.keys(agrupado).length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('No hay piezas asignadas para mostrar con los filtros actuales.', margin, y + 20);
      } else {
        for (const [sucursalNombre, pallets] of Object.entries(agrupado)) {
          // Si queda poco espacio para la sucursal, salto de página
          if (y > pageHeight - 110) {
            agregarPiePagina(paginaActual);
            doc.addPage();
            paginaActual++;
            y = margin;
            agregarEncabezadoPagina(paginaActual);
          }

          // Header de Sucursal
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y, printableWidth, 18, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.rect(margin, y, printableWidth, 18, 'S');

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(14, 116, 144); // cyan-700
          doc.text(`SUCURSAL DESTINO: ${sucursalNombre.toUpperCase()}`, margin + 6, y + 12);

          const totalPiezasSuc = Object.values(pallets).reduce(
            (sum, clis) => sum + Object.values(clis).reduce((s2, items) => s2 + items.length, 0),
            0
          );
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`${totalPiezasSuc} repuestos asignados`, pageWidth - margin - 6, y + 12, { align: 'right' });

          y += 24;

          for (const [palletNombre, clientes] of Object.entries(pallets)) {
            if (y > pageHeight - 90) {
              agregarPiePagina(paginaActual);
              doc.addPage();
              paginaActual++;
              y = margin;
              agregarEncabezadoPagina(paginaActual);
            }

            // Header de Pallet / Contenedor
            doc.setFillColor(254, 243, 199); // amber-100
            doc.roundedRect(margin + 4, y, printableWidth - 8, 15, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(180, 83, 9); // amber-700
            doc.text(`PALLET / CONTENEDOR: ${palletNombre}`, margin + 10, y + 10.5);

            y += 19;

            for (const [clienteNombre, items] of Object.entries(clientes)) {
              if (y > pageHeight - 80) {
                agregarPiePagina(paginaActual);
                doc.addPage();
                paginaActual++;
                y = margin;
                agregarEncabezadoPagina(paginaActual);
              }

              // Info Cliente y Pedido
              doc.setFontSize(8);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              const pedidoStr = items[0]?.pedidoId ? ` (${items[0].pedidoId})` : '';
              doc.text(`• ${clienteNombre}${pedidoStr}`, margin + 8, y + 8);

              const extraInfo = [
                items[0]?.modeloChangan,
                items[0]?.placa ? `Placa: ${items[0].placa}` : ''
              ].filter(Boolean).join(' | ');

              if (extraInfo) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(extraInfo, pageWidth - margin - 8, y + 8, { align: 'right' });
              }

              y += 12;

              // Encabezado de tabla de piezas
              doc.setFillColor(248, 250, 252);
              doc.rect(margin + 8, y, printableWidth - 16, 12, 'F');
              doc.setFontSize(6.5);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(71, 85, 105);
              doc.text('CÓDIGO SKU OEM', margin + 12, y + 8.5);
              doc.text('DESCRIPCIÓN', margin + 120, y + 8.5);
              doc.text('SOL.', margin + 350, y + 8.5, { align: 'center' });
              doc.text('ASIG.', margin + 380, y + 8.5, { align: 'center' });
              doc.text('ESTATUS', margin + 440, y + 8.5);

              y += 14;

              // Filas de repuestos
              for (const item of items) {
                if (y > pageHeight - 45) {
                  agregarPiePagina(paginaActual);
                  doc.addPage();
                  paginaActual++;
                  y = margin;
                  agregarEncabezadoPagina(paginaActual);

                  // Re-dibujar header de tabla en nueva página
                  doc.setFillColor(248, 250, 252);
                  doc.rect(margin + 8, y, printableWidth - 16, 12, 'F');
                  doc.setFontSize(6.5);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(71, 85, 105);
                  doc.text('CÓDIGO SKU OEM', margin + 12, y + 8.5);
                  doc.text('DESCRIPCIÓN', margin + 120, y + 8.5);
                  doc.text('SOL.', margin + 350, y + 8.5, { align: 'center' });
                  doc.text('ASIG.', margin + 380, y + 8.5, { align: 'center' });
                  doc.text('ESTATUS', margin + 440, y + 8.5);
                  y += 14;
                }

                doc.setFontSize(7);
                doc.setFont('courier', 'bold');
                doc.setTextColor(14, 116, 144); // cyan-700
                doc.text(String(item.codigoRepuesto || ''), margin + 12, y + 7.5);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                const desc = String(item.descripcionOficial || '').slice(0, 46);
                doc.text(desc, margin + 120, y + 7.5);

                doc.setTextColor(71, 85, 105);
                doc.text(String(item.cantidadSolicitada || 1), margin + 350, y + 7.5, { align: 'center' });

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(16, 185, 129); // emerald-600
                doc.text(String(item.cantidadAsignada || 1), margin + 380, y + 7.5, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
                doc.text(String(item.estatusGeneral || 'ASIGNADO'), margin + 440, y + 7.5);

                // Línea divisoria muy suave
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.5);
                doc.line(margin + 8, y + 10, pageWidth - margin - 8, y + 10);

                y += 12;
              }

              y += 4;
            }

            y += 4;
          }

          y += 8;
        }
      }

      agregarPiePagina(paginaActual);

      const fechaStr = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `Reporte_Asignaciones_CEDIS_${fechaStr}.pdf`;
      
      doc.save(nombreArchivo);
      return true;
    } catch (err) {
      console.error('Error generando PDF vectorial:', err);
      return false;
    }
  };

  const handleDescargarPDF = async () => {
    setExportandoPdf(true);
    try {
      // 1. Intentar primero el generador vectorial directo de alta fidelidad garantizado
      const exito = generarPdfDirectoVectorial();
      if (exito) {
        return;
      }

      // 2. Si falla por algún motivo imprevisto, fallback con html2canvas
      const elemento = document.getElementById('reporte-asignaciones-imprimible');
      if (elemento) {
        const canvas = await html2canvas(elemento, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0b1320'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'letter'
        });

        const pageWidth = 612;
        const pageHeight = 792;
        const margin = 20;
        const printableWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * printableWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);

        while (heightLeft > 0) {
          position = margin - (imgHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
          heightLeft -= (pageHeight - margin * 2);
        }

        const fechaStr = new Date().toISOString().slice(0, 10);
        pdf.save(`Reporte_Asignaciones_CEDIS_${fechaStr}.pdf`);
      }
    } catch (err: any) {
      console.error('Error en descarga de PDF:', err);
      window.print();
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1320] border border-cyan-500/50 rounded-2xl max-w-5xl w-full max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: letter portrait;
            margin: 10mm 10mm 15mm 10mm;
          }
          @media print {
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              height: auto !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden !important;
            }
            #reporte-asignaciones-imprimible, #reporte-asignaciones-imprimible * {
              visibility: visible !important;
            }
            #reporte-asignaciones-imprimible {
              position: static !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #0f172a !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              overflow: visible !important;
            }
            .grupo-sucursal-print {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 12px !important;
              border: 1px solid #cbd5e1 !important;
              background: #ffffff !important;
              color: #0f172a !important;
            }
            .bloque-pallet-print {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 8px !important;
              border: 1px solid #e2e8f0 !important;
              background: #f8fafc !important;
              color: #0f172a !important;
            }
            .no-print {
              display: none !important;
            }
          }
        ` }} />

        {/* Encabezado */}
        <div className="bg-[#0c1727] border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Reporte de Asignaciones y Consolidación
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  Ticket 1
                </span>
              </h2>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>Total piezas asignadas: <strong className="text-cyan-400">{filasConAsignacion.length}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> SLA Inicio: {new Date(slaInicio).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSincronizarGoogleSheets}
              disabled={sincronizandoSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-400/50 shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
              title="Enviar y reflejar automáticamente esta consolidación en la pestaña 'Reporte_Asignaciones' de tu Google Sheet"
            >
              <CloudUpload className={`w-4 h-4 ${sincronizandoSheet ? 'animate-bounce' : ''}`} />
              <span>{sincronizandoSheet ? 'Sincronizando...' : 'Reflejar en Google Sheet'}</span>
            </button>

            <button
              onClick={handleDescargarPDF}
              disabled={exportandoPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 shadow transition cursor-pointer disabled:opacity-50"
              title="Descargar reporte completo paginado en formato PDF (Carta 8.5 x 11)"
            >
              <FileText className="w-4 h-4" />
              <span>{exportandoPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>

            <button
              onClick={handleExportarExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 shadow transition cursor-pointer"
              title="Descargar libro Excel oficial con macros (.xlsm)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel (.xlsm)</span>
            </button>

            <button
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
              title="Imprimir reporte oficial"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        {mensajeSync && (
          <div className={`p-3 mx-4 mt-3 rounded-xl text-xs flex items-center gap-2 border no-print ${
            mensajeSync.tipo === 'ok' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}>
            {mensajeSync.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{mensajeSync.texto}</span>
          </div>
        )}

        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center gap-3 no-print">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, pedido, pallet, SKU..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">Sucursal:</span>
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="TODAS">Todas las Sucursales</option>
              {sucursales.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contenido Imprimible / Listado */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs text-slate-200" id="reporte-asignaciones-imprimible">
          <div className="border-b-2 border-slate-700 pb-3 mb-4 flex justify-between items-start">
            <div>
              <div className="text-xl font-extrabold text-white tracking-wider flex items-center gap-2">
                <span className="text-cyan-400">CHANGAN AUTO PANAMÁ</span>
                <span className="text-xs text-slate-400 font-normal">| CEDIS Central</span>
              </div>
              <div className="text-sm font-bold text-cyan-300 mt-1">
                REPORTE CONSOLIDADO DE ASIGNACIONES Y DESPACHO
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <div>Fecha de Emisión: <strong className="text-white">{fechaGeneracion}</strong></div>
              <div>SLA Inicio: <strong className="text-amber-400">{new Date(slaInicio).toLocaleTimeString()}</strong></div>
              <div>Sucursal Filtro: <strong className="text-white">{filtroSucursal}</strong></div>
            </div>
          </div>

          {Object.keys(agrupado).length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
              No hay pedidos o piezas asignadas que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(agrupado).map(([sucursalNombre, pallets]) => (
                <div key={sucursalNombre} className="grupo-sucursal-print bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm break-inside-avoid text-slate-200 print:text-slate-900 print:bg-white print:border-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>{sucursalNombre}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {Object.values(pallets).reduce((sum, clis) => sum + Object.values(clis).reduce((s2, items) => s2 + items.length, 0), 0)} repuestos asignados
                    </span>
                  </div>

                  <div className="space-y-4 pl-2">
                    {Object.entries(pallets).map(([palletNombre, clientes]) => (
                      <div key={palletNombre} className="bloque-pallet-print bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 print:bg-slate-50 print:border-slate-300 text-slate-200 print:text-slate-900">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
                          <Box className="w-3.5 h-3.5" />
                          <span>Pallet / Contenedor: {palletNombre}</span>
                        </div>

                        <div className="space-y-3 pl-3 border-l border-slate-800">
                          {Object.entries(clientes).map(([clienteNombre, items]) => (
                            <div key={clienteNombre} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-white">
                                  <User className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{clienteNombre}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({items[0]?.pedidoId})</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {items[0]?.modeloChangan || ''} {items[0]?.placa ? `• Placa ${items[0]?.placa}` : ''}
                                </span>
                              </div>

                              <table className="w-full text-left text-[11px] border-collapse mt-1">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-1 px-2">Código SKU</th>
                                    <th className="py-1 px-2">Descripción</th>
                                    <th className="py-1 px-2 text-center">Sol.</th>
                                    <th className="py-1 px-2 text-center">Asig.</th>
                                    <th className="py-1 px-2 text-right">Estatus</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, idx) => (
                                    <tr key={item.lineaId || idx} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                                      <td className="py-1 px-2 font-mono font-bold text-cyan-300">{item.codigoRepuesto}</td>
                                      <td className="py-1 px-2 text-slate-300">{item.descripcionOficial}</td>
                                      <td className="py-1 px-2 text-center text-slate-400">{item.cantidadSolicitada}</td>
                                      <td className="py-1 px-2 text-center font-bold text-emerald-400">{item.cantidadAsignada}</td>
                                      <td className="py-1 px-2 text-right">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                          {item.estatusGeneral || 'PENDIENTE'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0c1727] border-t border-slate-800 p-3 px-5 flex items-center justify-between text-xs text-slate-400 no-print">
          <div>
            A.R.I.A. Sistema CEDIS &bull; Changan Auto Panamá &bull; Reporte Operativo de Consolidación
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
