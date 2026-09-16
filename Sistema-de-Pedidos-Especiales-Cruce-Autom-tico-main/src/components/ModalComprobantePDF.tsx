import React, { useRef, useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  CheckCircle2, 
  Copy, 
  Share2, 
  FileText,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CATALOGO_MODELOS_CHANGAN } from '../data/sucursalesData';


export interface ComprobantePedidoData {
  pedidoId: string;
  cliente: string;
  sucursal: string;
  asesor: string;
  cotizacion: string;
  fechaEmision: string;
  modeloAuto: string;
  placa: string;
  canal: string;
  tipoPedido: string;
  estadoPago: string;
  facturaFiscal?: string;
  vin?: string;
  observaciones?: string;
  idTransmision: string;
  fechaGenerado: string;
  piezas: Array<{
    codigo: string;
    descripcion: string;
    cantidad: number;
  }>;
}

interface ModalComprobantePDFProps {
  isOpen: boolean;
  onClose: () => void;
  datos: ComprobantePedidoData | null;
  onNuevoPedido?: () => void;
  onVerMisPedidos?: () => void;
}

// Generador nativo garantizado mediante jsPDF (no depende de canvas ni iframe)
export const generarPdfNativoDirecto = (data: ComprobantePedidoData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Header navy
    doc.setFillColor(11, 23, 42); // #0b172a
    doc.rect(10, 10, 190, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANGAN AUTO PANAMA', 16, 20);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text('CENTRO NACIONAL DE DISTRIBUCION DE REPUESTOS (CEDIS CENTRAL)', 16, 25);
    
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text('DISTRIBUIDORA AUTOMOTRIZ FORTUNE, S.A. | RUC: 155613501-2-2015 DV 61', 16, 30);
    doc.text('Ave. Domingo Diaz, a un costado de Cardoze y Lindo, a 300 mts. | Tel: 382-5488', 16, 34);

    // Box Seguimiento
    doc.setFillColor(18, 35, 63);
    doc.roundedRect(138, 14, 58, 22, 2, 2, 'F');
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('NO. DE SEGUIMIENTO:', 142, 21);
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(11);
    doc.text(data.pedidoId, 142, 30);

    // Titulo
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE OFICIAL DE TRANSMISION DE PEDIDO ESPECIAL', 10, 48);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Registro electronico inalterable emitido por el sistema logistico CEDIS Panama.', 10, 53);
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 55, 200, 55);

    // Bloque 1: Cliente y Sucursal
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 58, 92, 46, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, 58, 92, 46, 2, 2, 'S');
    
    doc.setTextColor(12, 74, 110);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('1. INFORMACION CLIENTE & SUCURSAL', 14, 64);
    doc.line(14, 66, 98, 66);

    const renderFila = (lbl: string, val: string, x: number, y: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6.8);
      doc.text(lbl, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const valCorto = val.length > 28 ? val.substring(0, 26) + '..' : val;
      doc.text(valCorto, x + 28, y);
    };

    renderFila('Cliente:', data.cliente || 'N/A', 14, 72);
    renderFila('Sucursal:', data.sucursal || 'N/A', 14, 78);
    renderFila('Asesor:', data.asesor || 'N/A', 14, 84);
    renderFila('Cotiz/Doc:', data.cotizacion || data.facturaFiscal || 'N/A', 14, 90);
    renderFila('Fecha:', data.fechaEmision || 'N/A', 14, 96);

    // Bloque 2: Vehiculo y Logistica
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(106, 58, 94, 46, 2, 2, 'F');
    doc.roundedRect(106, 58, 94, 46, 2, 2, 'S');

    doc.setTextColor(12, 74, 110);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('2. VEHICULO & ESTADO LOGISTICO', 110, 64);
    doc.line(110, 66, 196, 66);

    renderFila('Modelo Auto:', data.modeloAuto || 'N/A', 110, 72);
    renderFila('Placa:', data.placa || 'En Tramite', 110, 78);
    renderFila('VIN/Chasis:', data.vin || 'N/A', 110, 84);
    renderFila('Cond. Pago:', data.estadoPago || 'N/A', 110, 90);
    renderFila('Tipo:', data.tipoPedido || 'N/A', 110, 96);

    // Tabla Repuestos
    doc.setFillColor(15, 23, 42);
    doc.rect(10, 108, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', 14, 113.5);
    doc.text('CODIGO OEM', 30, 113.5);
    doc.text('DESCRIPCION OFICIAL DE PIEZA', 85, 113.5);
    doc.text('CANT.', 186, 113.5, { align: 'right' });

    let yPos = 121;
    data.piezas.forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, yPos - 4.5, 190, 6.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7);
      doc.text(String(idx + 1), 15, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(p.codigo || 'N/A', 30, yPos);
      doc.setFont('helvetica', 'normal');
      const desc = p.descripcion.length > 55 ? p.descripcion.substring(0, 52) + '...' : p.descripcion;
      doc.text(desc, 85, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(String(p.cantidad), 186, yPos, { align: 'right' });
      yPos += 6.5;
    });

    // Observaciones
    yPos += 3;
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(10, yPos, 190, 12, 1, 1, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(10, yPos, 190, 12, 1, 1, 'S');
    doc.setTextColor(146, 64, 14);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES DE SUCURSAL:', 14, yPos + 4.5);
    doc.setFont('helvetica', 'normal');
    const obs = data.observaciones ? data.observaciones.substring(0, 90) : 'Sin observaciones adicionales.';
    doc.text(obs, 14, yPos + 9);

    // Pie digital
    yPos += 16;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, yPos, 190, 14, 1, 1, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, yPos, 190, 14, 1, 1, 'S');
    doc.setTextColor(12, 74, 110);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEPCION DIGITAL CEDIS CENTRAL PANAMA - RADICADO EN COLA DPL', 14, yPos + 5.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`ID Transmision: ${data.idTransmision} | Generado: ${data.fechaGenerado}`, 14, yPos + 10.5);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Documento oficial expedido electronicamente por el Sistema Logistico CEDIS de Changan Auto Panama.', 105, 285, { align: 'center' });

    doc.save(`${data.pedidoId}_Comprobante_Changan.pdf`);
  } catch (err) {
    console.error('Error en generador PDF nativo:', err);
  }
};


export const ModalComprobantePDF: React.FC<ModalComprobantePDFProps> = ({
  isOpen,
  onClose,
  datos,
  onNuevoPedido,
  onVerMisPedidos
}) => {
  const comprobanteRef = useRef<HTMLDivElement>(null);
  const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [descargadoAuto, setDescargadoAuto] = useState<boolean>(false);

  // Auto-descargar PDF al abrir por primera vez con datos
  useEffect(() => {
    if (isOpen && datos && !descargadoAuto) {
      const timer = setTimeout(() => {
        descargarPDF();
        setDescargadoAuto(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, datos, descargadoAuto]);

  if (!isOpen || !datos) return null;

  const descargarPDF = async () => {
    setGenerandoPdf(true);
    try {
      if (comprobanteRef.current) {
        const element = comprobanteRef.current;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`${datos.pedidoId}_Comprobante_Changan.pdf`);
      } else {
        generarPdfNativoDirecto(datos);
      }
    } catch (error) {
      console.warn('html2canvas no pudo renderizar, usando generador PDF nativo directo:', error);
      generarPdfNativoDirecto(datos);
    } finally {
      setGenerandoPdf(false);
    }
  };

  const imprimirComprobante = () => {
    window.print();
  };

  const copiarID = () => {
    navigator.clipboard.writeText(datos.pedidoId);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:bg-white print:max-w-none">
        
        {/* Barra Superior de Controles (Oculta en impresión) */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Pedido Transmitido con Éxito</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                  {datos.pedidoId}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                El comprobante PDF oficial ha sido generado y descargado automáticamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copiarID}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Copiar número de pedido"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>{copiado ? '¡Copiado!' : 'Copiar Nº'}</span>
            </button>

            <button
              onClick={descargarPDF}
              disabled={generandoPdf}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5 disabled:opacity-50"
              title="Descargar archivo PDF"
            >
              <Download className={`w-3.5 h-3.5 ${generandoPdf ? 'animate-bounce' : ''}`} />
              <span>{generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>

            <button
              onClick={imprimirComprobante}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Imprimir comprobante"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENEDOR DEL COMPROBANTE OFICIAL (Formato idéntico a Image 6) */}
        <div className="p-4 sm:p-8 bg-slate-900 overflow-x-auto flex justify-center print:p-0 print:bg-white">
          <div 
            ref={comprobanteRef}
            className="w-[794px] min-h-[1050px] bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded-sm font-sans flex flex-col justify-between print:shadow-none print:w-full print:min-h-0 print:p-6"
            style={{ width: '794px', minHeight: '1050px' }}
          >
            <div>
              {/* Encabezado Corporativo Changan */}
              <div className="bg-[#0b172a] text-white p-6 rounded-md flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-wider text-white">
                    CHANGAN AUTO PANAMÁ
                  </h1>
                  <p className="text-xs font-semibold tracking-wide text-sky-200 uppercase">
                    CENTRO NACIONAL DE DISTRIBUCIÓN DE REPUESTOS (CEDIS CENTRAL)
                  </p>
                  <p className="text-[11px] text-slate-300">
                    DISTRIBUIDORA AUTOMOTRIZ FORTUNE, S.A. &bull; RUC: 155613501-2-2015 DV 61
                  </p>
                </div>

                <div className="bg-[#12233f] border border-sky-500/40 px-5 py-3 rounded-lg text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                    Nº DE SEGUIMIENTO:
                  </div>
                  <div className="text-xl font-black text-sky-400 font-mono tracking-tight">
                    {datos.pedidoId}
                  </div>
                </div>
              </div>

              {/* Título del Documento */}
              <div className="mt-6 pb-3 border-b-2 border-slate-200">
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  COMPROBANTE OFICIAL DE TRANSMISIÓN DE PEDIDO ESPECIAL
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Registro electrónico inalterable emitido por el sistema logístico de repuestos.
                </p>
              </div>

              {/* Bloques de Datos: Cliente / Sucursal y Vehículo */}
              <div className="grid grid-cols-2 gap-5 mt-5 text-xs">
                {/* 1. Información del Cliente & Sucursal */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-sky-900 uppercase text-[11px] tracking-wide border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-700" />
                    <span>1. INFORMACIÓN DEL CLIENTE & SUCURSAL</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Cliente:</span>
                      <span className="font-bold text-slate-900 text-right uppercase">{datos.cliente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Sucursal:</span>
                      <span className="font-bold text-slate-800">{datos.sucursal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Asesor:</span>
                      <span className="font-bold text-slate-800">{datos.asesor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Cotización / Doc:</span>
                      <span className="font-mono text-slate-800">{datos.cotizacion || datos.facturaFiscal || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Fecha Emisión:</span>
                      <span className="font-medium text-slate-700">{datos.fechaEmision}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Vehículo & Estado Logístico */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-sky-900 uppercase text-[11px] tracking-wide border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-700" />
                    <span>2. VEHÍCULO & ESTADO LOGÍSTICO</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {(() => {
                      const modeloInfo = CATALOGO_MODELOS_CHANGAN.find(m => m.nombre === datos.modeloAuto);
                      return (
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 font-medium">Modelo Auto:</span>
                          <span className="font-bold text-slate-900 text-right">
                            {datos.modeloAuto}
                            {modeloInfo && (
                              <span className="text-[10px] font-normal text-slate-500 block">
                                ({modeloInfo.categoria} &bull; Años {modeloInfo.anosCompatibles})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Placa:</span>
                      <span className="font-mono font-bold text-slate-800 uppercase">{datos.placa || 'En Trámite'}</span>
                    </div>
                    {datos.vin && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">VIN Chasis:</span>
                        <span className="font-mono text-[11px] text-slate-700">{datos.vin}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Canal / Tipo:</span>
                      <span className="font-semibold text-slate-800">{datos.canal} &bull; {datos.tipoPedido}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Estado de Pago:</span>
                      <span className={`font-semibold ${
                        datos.estadoPago.includes('Cancelado') || datos.estadoPago.includes('Aprobado')
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}>
                        {datos.estadoPago}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Estatus Inicial:</span>
                      <span className="font-bold text-sky-700 tracking-wider">PENDIENTE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de Repuestos Solicitados */}
              <div className="mt-6 border border-slate-300 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b172a] text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-48">CÓDIGO OEM (PARTS CODE)</th>
                      <th className="py-2.5 px-3">DESCRIPCIÓN DEL REPUESTO</th>
                      <th className="py-2.5 px-3 w-28 text-center">CANTIDAD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {datos.piezas.map((p, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                          {p.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 uppercase">
                          {p.descripcion || 'PIEZA ORIGINAL CHANGAN'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {p.cantidad} un.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Observaciones si existen */}
              {datos.observaciones && (
                <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200/80 rounded text-xs text-amber-900">
                  <strong className="font-bold">Observaciones Adicionales: </strong>
                  <span>{datos.observaciones}</span>
                </div>
              )}
            </div>

            {/* Parte Inferior: Sellos de Transmisión y Recepción */}
            <div className="mt-8 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-5 text-[11px]">
                {/* Sello Transmisión */}
                <div className="border border-slate-200 rounded p-3 bg-slate-50/60 space-y-1">
                  <div className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>SELLO DE TRANSMISIÓN DIGITAL</span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium">Colaborador:</span> {datos.asesor}
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium">Sucursal:</span> {datos.sucursal} &bull; Autorizado
                  </div>
                  <div className="text-slate-500 font-mono text-[10px] truncate">
                    <span className="font-medium">ID Transmisión:</span> {datos.idTransmision}
                  </div>
                </div>

                {/* Recepción CEDIS */}
                <div className="border border-slate-200 rounded p-3 bg-slate-50/60 space-y-1">
                  <div className="font-bold text-sky-900 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-sky-700" />
                    <span>RECEPCIÓN CEDIS CENTRAL PANAMÁ</span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium">Estado:</span> RADICADO EN COLA DE ASIGNACIÓN DPL
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium">Verificación:</span> 100% Digital e Inalterable
                  </div>
                  <div className="text-slate-500 font-medium text-[10px]">
                    <span className="font-medium">Generado:</span> {datos.fechaGenerado}
                  </div>
                </div>
              </div>

              {/* Pie de Página Legal */}
              <div className="mt-4 text-center text-[10px] text-slate-400 italic">
                Documento oficial expedido electrónicamente por el Sistema Logístico CEDIS de Changan Auto Panamá. No requiere firma autógrafa.
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Final (Oculta en impresión) */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-400">
            ¿Deseas tramitar otra requisición para esta sucursal?
          </div>
          <div className="flex items-center gap-2">
            {onVerMisPedidos && (
              <button
                onClick={() => {
                  onClose();
                  onVerMisPedidos();
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📋 Ver Mis Requisiciones</span>
              </button>
            )}
            {onNuevoPedido && (
              <button
                onClick={() => {
                  onClose();
                  onNuevoPedido();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Registrar Otro Pedido</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
