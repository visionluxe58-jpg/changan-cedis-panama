import jsPDF from 'jspdf';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Tag, 
  Check, 
  ShieldCheck, 
  User, 
  Search, 
  CheckSquare, 
  Square, 
  Building2, 
  Eye,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  Package
} from 'lucide-react';
import { EtiquetaRepuestoData, etiquetasQRService } from '../services/etiquetasQRService';

export interface ModalEtiquetaQRProps {
  isOpen: boolean;
  onClose: () => void;
  etiquetas: EtiquetaRepuestoData[];
  indiceInicial?: number;
}

export const ModalEtiquetaQR: React.FC<ModalEtiquetaQRProps> = ({
  isOpen,
  onClose,
  etiquetas,
  indiceInicial = 0
}) => {
  const [formato, setFormato] = useState<'estandar' | 'compacto' | 'carta'>('carta'); // Ticket 3: Hoja Carta (6 por página) por defecto o térmica individual
  const [indiceActual, setIndiceActual] = useState<number>(indiceInicial);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState<Set<string>>(new Set());
  const [filtroSucursal, setFiltroSucursal] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const contenedorImpresionRef = useRef<HTMLDivElement>(null);

  // Inicializar todas las etiquetas como seleccionadas al abrir
  useEffect(() => {
    if (isOpen && etiquetas.length > 0) {
      setEtiquetasSeleccionadas(new Set(etiquetas.map(e => e.qrId)));
      setIndiceActual(Math.min(indiceInicial, etiquetas.length - 1));
      setFiltroSucursal('TODAS');
      setBusqueda('');
    }
  }, [isOpen, etiquetas, indiceInicial]);

  // Generar QR Data URLs para todas las etiquetas cargadas
  useEffect(() => {
    if (!isOpen || etiquetas.length === 0) return;

    let isMounted = true;
    const generarQRs = async () => {
      const urls: Record<string, string> = {};
      for (const et of etiquetas) {
        if (!urls[et.qrId]) {
          urls[et.qrId] = await etiquetasQRService.generarDataUrlQR(et.qrId);
        }
      }
      if (isMounted) {
        setQrDataUrls(urls);
      }
    };

    generarQRs();
    return () => { isMounted = false; };
  }, [isOpen, etiquetas]);

  // Conteo de sucursales disponibles
  const conteoSucursales = useMemo(() => {
    const counts: Record<string, number> = {};
    etiquetas.forEach(e => {
      const suc = e.sucursal || 'Sin Sucursal';
      counts[suc] = (counts[suc] || 0) + 1;
    });
    return counts;
  }, [etiquetas]);

  const listaSucursales = useMemo(() => Object.keys(conteoSucursales).sort(), [conteoSucursales]);

  // Etiquetas filtradas por sucursal y búsqueda
  const etiquetasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return etiquetas.filter(e => {
      const matchSuc = filtroSucursal === 'TODAS' || e.sucursal === filtroSucursal;
      const matchSearch = !q ||
        e.qrId.toLowerCase().includes(q) ||
        e.codigoRepuesto.toLowerCase().includes(q) ||
        (e.cliente && e.cliente.toLowerCase().includes(q)) ||
        e.ordenOT.toLowerCase().includes(q) ||
        (e.descripcionOficial && e.descripcionOficial.toLowerCase().includes(q));
      return matchSuc && matchSearch;
    });
  }, [etiquetas, filtroSucursal, busqueda]);

  if (!isOpen || etiquetas.length === 0) return null;

  const etiquetaActiva = etiquetas[indiceActual] || etiquetas[0];
  const totalEtiquetas = etiquetas.length;
  const seleccionadasCount = etiquetasSeleccionadas.size;
  const todasVisibles = etiquetasFiltradas.length > 0 && etiquetasFiltradas.every(e => etiquetasSeleccionadas.has(e.qrId));

  // Manejo de selecciones
  const toggleEtiqueta = (qrId: string) => {
    setEtiquetasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(qrId)) {
        next.delete(qrId);
      } else {
        next.add(qrId);
      }
      return next;
    });
  };

  const seleccionarTodas = () => {
    setEtiquetasSeleccionadas(new Set(etiquetas.map(e => e.qrId)));
  };

  const deseleccionarTodas = () => {
    setEtiquetasSeleccionadas(new Set());
  };

  const seleccionarSoloSucursal = (sucursal: string) => {
    const ids = etiquetas.filter(e => e.sucursal === sucursal).map(e => e.qrId);
    setEtiquetasSeleccionadas(new Set(ids));
  };

  const toggleVisibles = () => {
    setEtiquetasSeleccionadas(prev => {
      const next = new Set(prev);
      if (todasVisibles) {
        etiquetasFiltradas.forEach(e => next.delete(e.qrId));
      } else {
        etiquetasFiltradas.forEach(e => next.add(e.qrId));
      }
      return next;
    });
  };

  // Navegación de vista previa
  const handleAnterior = () => {
    setIndiceActual(prev => (prev > 0 ? prev - 1 : totalEtiquetas - 1));
  };

  const handleSiguiente = () => {
    setIndiceActual(prev => (prev < totalEtiquetas - 1 ? prev + 1 : 0));
  };

  const [descargandoPdf, setDescargandoPdf] = useState<boolean>(false);

  // Descarga directa en PDF en hoja Carta (8.5 x 11 pulg.) con etiquetas horizontales nítidas
  const handleDescargarPDF = async () => {
    const seleccionadas = etiquetas.filter(et => etiquetasSeleccionadas.has(et.qrId));
    if (seleccionadas.length === 0) return;

    setDescargandoPdf(true);
    try {
      // Formato Carta Horizontal (Landscape): 279.4 x 215.9 mm
      // 2 columnas x 3 filas = 6 etiquetas horizontales por página
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = 279.4;
      const pageHeight = 215.9;
      
      const etiquetaAncho = 126; // 126 mm horizontal
      const etiquetaAlto = 60;   // 60 mm vertical
      const gapX = 7;
      const gapY = 6;
      const marginX = (pageWidth - (etiquetaAncho * 2 + gapX)) / 2; // ~10.2 mm
      const marginY = (pageHeight - (etiquetaAlto * 3 + gapY * 2)) / 2; // ~7.95 mm

      for (let i = 0; i < seleccionadas.length; i++) {
        const et = seleccionadas[i];
        const indiceEnPagina = i % 6;

        if (i > 0 && indiceEnPagina === 0) {
          doc.addPage();
        }

        const col = indiceEnPagina % 2;
        const row = Math.floor(indiceEnPagina / 2);

        const x = marginX + col * (etiquetaAncho + gapX);
        const y = marginY + row * (etiquetaAlto + gapY);

        // Borde redondeado exterior de la etiqueta - Alto contraste para B&N
        doc.setDrawColor(0, 0, 0); // negro puro
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255); // fondo blanco
        doc.roundedRect(x, y, etiquetaAncho, etiquetaAlto, 2, 2, 'FD');

        // 1. Encabezado - Diseño optimizado para blanco y negro (sin fondo oscuro sólido)
        // Fondo blanco con línea inferior divisoria nítida
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, etiquetaAncho, 8.5, 2, 2, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(x, y + 8.5, x + etiquetaAncho, y + 8.5);

        // Logo / Texto Changan (Negro sobre Blanco)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('CHANGAN AUTO PANAMÁ', x + 4, y + 5.8);

        // Badge Pedido Especial - Contorno negro con texto negro (legible al 100% en láser B&N)
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.35);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x + etiquetaAncho - 27, y + 1.8, 23, 4.8, 1, 1, 'FD');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('PEDIDO ESPECIAL', x + etiquetaAncho - 25.5, y + 5.1);

        // 2. Fila Cliente y Sucursal - Fondo Blanco / Gris muy claro con bordes nítidos
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.rect(x + 2.5, y + 10, etiquetaAncho - 5, 7, 'FD');

        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('CLIENTE:', x + 4, y + 12.6);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const cliTxt = (et.cliente && et.cliente.trim() && et.cliente !== 'CLIENTE GENERAL') ? et.cliente : 'SIN CLIENTE ASIGNADO';
        doc.text(cliTxt.slice(0, 38), x + 16, y + 15.2);

        // Badge Sucursal
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.25);
        doc.roundedRect(x + etiquetaAncho - 22, y + 10.8, 18, 5.2, 1, 1, 'FD');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.sucursal || 'CEDIS').slice(0, 14), x + etiquetaAncho - 20.5, y + 14.5);

        // 3. Fila Vehículo / Año / Placa - CAJAS 100% BLANCAS CON TIPOGRAFÍA NEGRA
        const wVeh = 50;
        const wAno = 18;
        const wPlaca = 20;

        // Caja Vehículo
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.3);
        doc.rect(x + 2.5, y + 18, wVeh, 7, 'FD');
        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(90, 90, 90);
        doc.text('VEHÍCULO', x + 4, y + 20.3);
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.vehiculoModelo || 'CHANGAN').slice(0, 22), x + 4, y + 23.8);

        // Caja Año (BLANCO con texto NEGRO legible)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.3);
        doc.rect(x + 2.5 + wVeh + 1, y + 18, wAno, 7, 'FD');
        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(90, 90, 90);
        doc.text('AÑO', x + 2.5 + wVeh + 2.5, y + 20.3);
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.vehiculoAno || 'N/A'), x + 2.5 + wVeh + 2.5, y + 23.8);

        // Caja Placa (BLANCO con texto NEGRO legible en monoespacio)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.3);
        doc.rect(x + 2.5 + wVeh + wAno + 2, y + 18, wPlaca, 7, 'FD');
        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(90, 90, 90);
        doc.text('PLACA', x + 2.5 + wVeh + wAno + 3.5, y + 20.3);
        doc.setFontSize(6.5);
        doc.setFont('courier', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.placa || 'PEND'), x + 2.5 + wVeh + wAno + 3.5, y + 23.8);

        // 4. Bloque SKU + Descripción
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.5);
        doc.setTextColor(90, 90, 90);
        doc.text('CÓDIGO OFICIAL CHANGAN OEM', x + 3.5, y + 28);

        // Caja SKU
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(140, 140, 140);
        doc.setLineWidth(0.4);
        doc.roundedRect(x + 2.5, y + 29.5, 88, 7.5, 1, 1, 'FD');
        doc.setFontSize(8.5);
        doc.setFont('courier', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.codigoRepuesto || ''), x + 5, y + 35);

        // Descripción de pieza
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const descOficial = String(et.descripcionOficial || '').slice(0, 48);
        doc.text(descOficial, x + 3.5, y + 40.5);

        // Cantidad y Orden
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.roundedRect(x + 2.5, y + 43.5, 28, 5, 1, 1, 'FD');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`CANT: ${et.cantidad} ${et.unidad || 'UND'}`, x + 4, y + 47.2);

        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(`OT/PEDIDO: ${et.ordenOT || et.pedidoId}`, x + 33, y + 47.2);

        // 5. Código QR a la derecha
        const qrUrl = qrDataUrls[et.qrId];
        if (qrUrl) {
          try {
            doc.addImage(qrUrl, 'PNG', x + etiquetaAncho - 31, y + 26, 26, 26);
          } catch (e) {
            console.warn('QR image draw error:', e);
          }
        }
        doc.setFontSize(4.5);
        doc.setFont('courier', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.qrId || '').slice(-16), x + etiquetaAncho - 18, y + 54, { align: 'center' });

        // 6. Pie de etiqueta: Ubicación y Garantía Genuine Parts
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(x + 2.5, y + 55, x + etiquetaAncho - 2.5, y + 55);

        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(90, 90, 90);
        doc.text('UBICACIÓN:', x + 4, y + 57.8);
        doc.setTextColor(0, 0, 0);
        doc.text(String(et.ubicacionCedis || 'CEDIS CENTRAL'), x + 16, y + 57.8);

        doc.setTextColor(90, 90, 90);
        doc.text(`FECHA: ${et.fechaPedido || ''}`, x + 62, y + 57.8);

        doc.setTextColor(0, 0, 0);
        doc.text('GENUINE PARTS', x + etiquetaAncho - 22, y + 57.8);
      }

      const fechaStr = new Date().toISOString().slice(0, 10);
      doc.save(`Etiquetas_Changan_${fechaStr}.pdf`);
    } catch (err) {
      console.error('Error al descargar PDF de etiquetas:', err);
      window.print();
    } finally {
      setDescargandoPdf(false);
    }
  };

  const handleImprimir = () => {
    if (seleccionadasCount === 0) return;
    window.print();
  };

  // Renderizador de etiqueta física oficial Changan
  const renderEtiqueta = (et: EtiquetaRepuestoData, idx: number) => {
    const qrSrc = qrDataUrls[et.qrId] || '';
    const esCompacto = formato === 'compacto';

    return (
      <div 
        key={et.qrId + idx}
        className={`etiqueta-changan-fisica bg-white text-slate-900 border-2 border-slate-400/80 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between font-sans select-none relative ${
          esCompacto 
            ? 'w-[320px] sm:w-[350px] min-h-[210px] p-2.5 text-[10px]' 
            : 'w-[360px] sm:w-[420px] min-h-[260px] p-3 text-xs'
        }`}
        style={{
          aspectRatio: esCompacto ? '7 / 4' : '10 / 6',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* 1. Cabecera Azul Institucional Changan */}
        <div className="bg-slate-900 print:bg-white print:text-black text-white px-2.5 py-1.5 -mx-3 -mt-3 mb-2 flex items-center justify-between border-b-2 border-slate-900 print:border-b-2 print:border-black">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center font-black text-[9px] tracking-tighter bg-blue-900">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-[11px] leading-tight uppercase">CHANGAN AUTO</span>
              <span className="text-[7.5px] tracking-widest text-cyan-200 font-semibold uppercase -mt-0.5">PANAMÁ</span>
            </div>
          </div>
          <div className="bg-sky-500 print:bg-white print:text-black print:border-black text-white font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase border border-sky-300">
            PEDIDO ESPECIAL
          </div>
        </div>

        {/* 2. Bloque Cliente y Vehículo */}
        <div className="grid grid-cols-12 gap-1.5 border-b border-slate-200 pb-1.5">
          <div className="col-span-12 bg-slate-50 border border-slate-200 rounded px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <div className="truncate">
                <span className="text-[8px] uppercase font-bold text-slate-500 block leading-none">CLIENTE</span>
                <span className="font-extrabold text-slate-900 text-[11px] uppercase tracking-tight truncate block">
                  {(et.cliente && et.cliente.trim() && et.cliente !== 'CLIENTE GENERAL') ? et.cliente : 'SIN CLIENTE ASIGNADO'}
                </span>
              </div>
            </div>
            <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
              {et.sucursal}
            </span>
          </div>

          <div className="col-span-6 bg-white border border-slate-400 rounded px-1.5 py-0.5 flex flex-col justify-center print:border-black print:bg-white">
            <span className="text-[7.5px] uppercase font-bold text-slate-600 print:text-black leading-none">VEHÍCULO</span>
            <span className="font-bold text-black text-[10px] truncate">{et.vehiculoModelo}</span>
          </div>

          <div className="col-span-3 bg-white border border-slate-400 rounded px-1 py-0.5 flex flex-col justify-center text-center print:border-black print:bg-white">
            <span className="text-[7.5px] uppercase font-bold text-slate-600 print:text-black leading-none">AÑO</span>
            <span className="font-bold text-black text-[10px]">{et.vehiculoAno || 'N/A'}</span>
          </div>

          <div className="col-span-3 bg-white border border-slate-400 rounded px-1 py-0.5 flex flex-col justify-center text-center print:border-black print:bg-white">
            <span className="text-[7.5px] uppercase font-bold text-slate-600 print:text-black leading-none">PLACA</span>
            <span className="font-black text-black text-[10px] font-mono">{et.placa || 'PEND'}</span>
          </div>
        </div>

        {/* 3. Bloque Central: Código Repuesto + Código QR Oculto */}
        <div className="grid grid-cols-12 gap-2 my-auto py-1.5 items-center">
          <div className="col-span-8 flex flex-col justify-center space-y-1">
            <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">CÓDIGO OFICIAL CHANGAN OEM</span>
            <div className="bg-slate-100 border border-slate-300 rounded px-2 py-1">
              <span className="font-black text-slate-900 font-mono text-sm sm:text-base tracking-wider block">
                {et.codigoRepuesto}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-snug line-clamp-2 mt-0.5">
              {et.descripcionOficial}
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase">
                CANT: {et.cantidad} {et.unidad || 'UND'}
              </span>
              <span className="text-[8px] text-slate-500 font-mono">
                OT/PEDIDO: <strong>{et.ordenOT}</strong>
              </span>
            </div>
          </div>

          <div className="col-span-4 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-1.5">
            {qrSrc ? (
              <img 
                src={qrSrc} 
                alt={`QR ${et.qrId}`} 
                className={esCompacto ? "w-20 h-20 object-contain" : "w-24 h-24 object-contain"}
              />
            ) : (
              <div className="w-20 h-20 bg-slate-200 animate-pulse rounded flex items-center justify-center text-[9px] text-slate-500">
                Generando...
              </div>
            )}
            <span className="text-[7.5px] font-mono font-bold text-slate-600 mt-1 tracking-tight text-center truncate max-w-full">
              {et.qrId}
            </span>
          </div>
        </div>

        {/* 4. Pie de Etiqueta: Ubicación CEDIS y Fecha */}
        <div className="bg-slate-100 border-t border-slate-300 px-2 py-1 -mx-3 -mb-3 flex items-center justify-between text-[8px] text-slate-600">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-slate-500">UBICACIÓN:</span>
            <span className="text-blue-900 font-mono font-black">{et.ubicacionCedis || 'CEDIS CENTRAL'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>PEDIDO: {et.fechaPedido}</span>
            <span className="font-extrabold text-blue-800">GENUINE PARTS</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Superior del Modal */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Centro Inteligente de Impresión de Etiquetas QR
                </h2>
                <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Multi-Sucursal Activo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Selecciona libremente qué etiquetas imprimir entre todas las sucursales sin perder tu selección.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Formato Térmico */}
            <div className="hidden sm:flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs gap-1">
              <button
                type="button"
                onClick={() => setFormato('carta')}
                className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  formato === 'carta'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Hoja Carta 8.5 x 11 (Multi-etiqueta: 2 columnas una al lado de la otra x 3 filas)"
              >
                <span>📄 Hoja Carta (2 cols × 3 filas)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormato('estandar')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  formato === 'estandar'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Rollo térmico individual estándar 100 x 60 mm"
              >
                Térmico (100 × 60 mm)
              </button>
              <button
                type="button"
                onClick={() => setFormato('compacto')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  formato === 'compacto'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Rollo térmico individual compacto 70 x 40 mm"
              >
                Térmico (70 × 40 mm)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo Dividido en 2 Columnas (Master-Detail) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* COLUMNA IZQUIERDA: Selector Inteligente de Etiquetas por Sucursal */}
          <div className="w-full md:w-[420px] lg:w-[460px] bg-slate-950/60 border-r border-slate-800/80 flex flex-col h-full">
            
            {/* Barra de Filtro y Búsqueda */}
            <div className="p-3 border-b border-slate-800/80 space-y-2 bg-slate-900/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por pedido, código, repuesto o cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
                {busqueda && (
                  <button 
                    onClick={() => setBusqueda('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Chips de Filtrado por Sucursal */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setFiltroSucursal('TODAS')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer ${
                    filtroSucursal === 'TODAS'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Todas ({etiquetas.length})
                </button>
                {listaSucursales.map(suc => (
                  <button
                    key={suc}
                    type="button"
                    onClick={() => setFiltroSucursal(suc)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                      filtroSucursal === suc
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>{suc}</span>
                    <span className="text-[9px] opacity-80 font-mono">({conteoSucursales[suc]})</span>
                  </button>
                ))}
              </div>

              {/* Botones de Acción de Selección Masiva */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={seleccionarTodas}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Seleccionar todas las etiquetas del modal"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Todas</span>
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={deseleccionarTodas}
                    className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Deseleccionar todas las etiquetas"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Ninguna</span>
                  </button>
                  {filtroSucursal !== 'TODAS' && (
                    <>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => seleccionarSoloSucursal(filtroSucursal)}
                        className="text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer"
                        title={`Seleccionar exclusivamente las de ${filtroSucursal}`}
                      >
                        Solo {filtroSucursal}
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleVisibles}
                  className="text-slate-400 hover:text-white text-[10px] transition cursor-pointer"
                >
                  {todasVisibles ? 'Desmarcar visibles' : 'Marcar visibles'}
                </button>
              </div>
            </div>

            {/* Lista Scrollable de Etiquetas Seleccionables */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/40">
              {etiquetasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No se encontraron etiquetas que coincidan con el filtro actual.
                </div>
              ) : (
                etiquetasFiltradas.map((et, fIdx) => {
                  const estaSeleccionada = etiquetasSeleccionadas.has(et.qrId);
                  const globalIdx = etiquetas.findIndex(e => e.qrId === et.qrId);
                  const esActiva = globalIdx === indiceActual;

                  return (
                    <div
                      key={et.qrId + fIdx}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                        esActiva 
                          ? 'bg-blue-950/40 border-cyan-400/80 shadow-md shadow-cyan-950/30' 
                          : estaSeleccionada
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                            : 'bg-slate-950/30 border-slate-900 opacity-60 hover:opacity-100 hover:bg-slate-900/40'
                      }`}
                      onClick={() => setIndiceActual(globalIdx)}
                    >
                      {/* Checkbox para imprimir */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEtiqueta(et.qrId);
                        }}
                        className="p-1 rounded hover:bg-slate-800 cursor-pointer shrink-0"
                        title={estaSeleccionada ? 'Excluir de la impresión' : 'Incluir en la impresión'}
                      >
                        {estaSeleccionada ? (
                          <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </div>

                      {/* Información de la etiqueta */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-white tracking-wide">
                            {et.ordenOT}
                          </span>
                          <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800/80 px-1.5 py-0.2 rounded font-semibold truncate">
                            {et.sucursal}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono ml-auto shrink-0">
                            {et.qrId.split('-').pop() || '01'}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-cyan-300 font-bold mt-0.5 truncate">
                          {et.codigoRepuesto}
                        </div>

                        <div className="text-[10px] text-slate-300 truncate">
                          {et.descripcionOficial}
                        </div>

                        <div className="text-[9px] text-slate-500 flex items-center justify-between mt-1">
                          <span className="truncate">Cliente: {(et.cliente && et.cliente.trim() && et.cliente !== 'General') ? et.cliente : 'SIN CLIENTE ASIGNADO'}</span>
                          <span className="font-semibold text-emerald-400 shrink-0">
                            Cant: {et.cantidad} {et.unidad || 'UND'}
                          </span>
                        </div>
                      </div>

                      {/* Botón Ojito para Previsualizar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIndiceActual(globalIdx);
                        }}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 transition ${
                          esActiva ? 'text-cyan-400 bg-cyan-950/60' : 'hover:bg-slate-800'
                        }`}
                        title="Ver vista previa en alta definición"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra Inferior del Panel Izquierdo: Resumen de Selección */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Seleccionadas: <strong className="text-cyan-300 font-mono text-sm">{seleccionadasCount}</strong> de {totalEtiquetas}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {listaSucursales.length} sucursal(es)
              </span>
            </div>

          </div>

          {/* COLUMNA DERECHA: Vista Previa HD y Navegador */}
          <div className="flex-1 bg-[#060b13] flex flex-col justify-between overflow-y-auto">
            
            {/* Barra de Control Superior de Vista Previa */}
            <div className="px-6 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Previsualizando etiqueta: <strong className="text-white font-mono">{indiceActual + 1}</strong> de {totalEtiquetas}
                </span>
                {etiquetasSeleccionadas.has(etiquetaActiva.qrId) ? (
                  <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Incluida para imprimir
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full">
                    ✕ Excluida de la impresión
                  </span>
                )}
              </div>

              {/* Botones Anterior / Siguiente */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAnterior}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
                  title="Etiqueta anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSiguiente}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
                  title="Etiqueta siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenedor Central de Vista Previa */}
            <div className="p-6 flex-1 flex flex-col items-center justify-center">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-2xl flex items-center justify-center transition-all transform hover:scale-[1.01]">
                {renderEtiqueta(etiquetaActiva, indiceActual)}
              </div>

              {/* Mensaje de Compatibilidad con Impresoras Térmicas */}
              <div className="mt-4 text-center max-w-md text-[11px] text-slate-400 space-y-1">
                <p className="flex items-center justify-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Código QR seguro: Vinculado a validación en CEDIS y Terminal PDT</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Formato compatible con impresoras Zebra (ZPL/Direct), Dymo, Brother y rollos térmicos de etiquetas adhesivas.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Principal del Modal con Botones de Impresión */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Package className="w-4 h-4 text-slate-500" />
            <span>
              Total en lote: <strong className="text-white font-mono">{totalEtiquetas}</strong> | 
              A imprimir: <strong className="text-cyan-300 font-mono text-sm">{seleccionadasCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              Cancelar / Cerrar
            </button>

            <button
              type="button"
              onClick={handleDescargarPDF}
              disabled={seleccionadasCount === 0 || descargandoPdf}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all border ${
                seleccionadasCount > 0
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/50 shadow-rose-950/40'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'
              }`}
              title="Descargar archivo PDF oficial listo para imprimir en hoja Carta"
            >
              <Download className="w-4 h-4" />
              <span>{descargandoPdf ? 'Generando PDF...' : 'Descargar PDF (Carta)'}</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              disabled={seleccionadasCount === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all transform ${
                seleccionadasCount > 0
                  ? 'bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-cyan-900/40 hover:scale-[1.02]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>
                {seleccionadasCount === 0
                  ? 'Selecciona al menos 1 etiqueta'
                  : seleccionadasCount === 1
                    ? 'Imprimir 1 Etiqueta'
                    : `Imprimir ${seleccionadasCount} Etiquetas`}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Contenedor Oculto para Impresión Limpia (print media CSS) */}
      <div className="hidden print:block print:w-full print:h-auto" ref={contenedorImpresionRef}>
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: ${formato === 'carta' ? 'letter landscape' : (formato === 'estandar' ? '100mm 60mm' : '70mm 40mm')};
            margin: ${formato === 'carta' ? '8mm 10mm 8mm 10mm' : '0mm'};
          }
          @media print {
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden !important;
            }
            .etiqueta-para-imprimir, .etiqueta-para-imprimir * {
              visibility: visible !important;
            }
            ${formato === 'carta' ? `
              .etiqueta-para-imprimir {
                position: static !important;
                width: 100% !important;
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                column-gap: 8mm !important;
                row-gap: 6mm !important;
                padding: 0 !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
              }
              .etiqueta-changan-fisica {
                width: 100% !important;
                max-width: 125mm !important;
                height: 59mm !important;
                min-height: 59mm !important;
                max-height: 59mm !important;
                box-sizing: border-box !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: 1.5px solid #000 !important;
                background: #ffffff !important;
                color: #000000 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                padding: 3mm !important;
              }
              /* Salto de página automático cada 6 etiquetas (2 cols x 3 filas) */
              .etiqueta-changan-fisica:nth-child(6n) {
                page-break-after: always !important;
                break-after: page !important;
              }
            ` : `
              .etiqueta-para-imprimir {
                position: static !important;
                margin: 0 !important;
              }
              .etiqueta-changan-fisica {
                width: ${formato === 'estandar' ? '100mm' : '70mm'} !important;
                height: ${formato === 'estandar' ? '60mm' : '40mm'} !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
                margin: 0 !important;
                border: 1px solid #000 !important;
              }
            `}
          }
        `}} />

        <div className="etiqueta-para-imprimir">
          {etiquetas
            .filter(et => etiquetasSeleccionadas.has(et.qrId))
            .map((et, idx) => renderEtiqueta(et, idx))
          }
        </div>
      </div>

    </div>
  );
};
