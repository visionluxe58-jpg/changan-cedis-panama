import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Ship, 
  Building2, 
  Layers, 
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cedisService } from '../services/cedisService';
import { appsScriptClient } from '../services/appsScriptClient';
import { EstatusDPL } from '../types/cedis';

interface ModalDPLProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDPLGuardado?: () => void;
}

export const ModalDPL: React.FC<ModalDPLProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onDPLGuardado 
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [contenedorId, setContenedorId] = useState<string>('');
  const [proveedor, setProveedor] = useState<string>('Mobitech Changan China Co., Ltd');
  const [fechaArribo, setFechaArribo] = useState<string>(new Date().toISOString().substring(0, 10));
  const [tipoTransporte, setTipoTransporte] = useState<string>('Marítimo 40HQ');
  const [estatusSeleccionado, setEstatusSeleccionado] = useState<EstatusDPL>('EN TRÁNSITO');
  
  const [infoDetectada, setInfoDetectada] = useState<{
    invoiceNo: string;
    totalPiezas: number;
    skus: number;
    items: Array<{
      caseNo?: string;
      packageNo?: string;
      purchaseCode?: string;
      suppliedCode?: string;
      description?: string;
      qty?: number;
    }>;
  } | null>(null);

  const [procesando, setProcesando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Detección de Invoice No
        let inv = '';
        for (let r = 0; r < Math.min(6, rows.length); r++) {
          const rowText = (rows[r] || []).join(' ');
          if (rowText.includes('Invoice No.:')) {
            const parts = (rowText.split('Invoice No.:')[1] || '').trim().split(' ');
            if (parts && parts.length > 0) inv = parts[0];
            break;
          }
        }
        if (!inv) {
          inv = file.name
            .replace('-DPL.xls', '')
            .replace('.xls', '')
            .replace('.xlsx', '')
            .toUpperCase();
        }

        const items: Array<{
          caseNo?: string;
          packageNo?: string;
          purchaseCode?: string;
          suppliedCode?: string;
          description?: string;
          qty?: number;
        }> = [];

        let totalQty = 0;
        const skusSet = new Set<string>();

        for (let r = 3; r < rows.length; r++) {
          const f = rows[r];
          if (f && (f[2] || f[3] || f[4])) {
            const pCode = String(f[2] || f[3] || '').trim();
            const sCode = String(f[3] || f[2] || '').trim();
            const qty = Number(f[6] || f[5] || 1) || 1;
            const desc = String(f[5] || f[4] || 'Repuesto Changan Genuino').trim();
            const caseNo = String(f[0] || 'P001').trim();
            const pkgNo = String(f[1] || 'PKG-01').trim();

            if (pCode || sCode) {
              items.push({
                caseNo,
                packageNo: pkgNo,
                purchaseCode: pCode,
                suppliedCode: sCode,
                description: desc,
                qty
              });
              totalQty += qty;
              if (pCode) skusSet.add(pCode);
            }
          }
        }

        setContenedorId(inv);
        setInfoDetectada({
          invoiceNo: inv,
          totalPiezas: totalQty,
          skus: skusSet.size,
          items
        });
      } catch (err: unknown) {
        setErrorMsg('Error al leer el archivo Excel: ' + (err instanceof Error ? err.message : 'Formato no soportado'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Carga de Manifiesto de Prueba pre-configurado para pruebas rápidas
  const cargarDPLPrueba = () => {
    const invDemo = `INV-CN-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsDemo = [
      { caseNo: 'P001', packageNo: 'PKG-01', purchaseCode: 'S111F260204-0100', description: 'Amortiguador Delantero Izquierdo Changan CS35 Plus', qty: 20 },
      { caseNo: 'P001', packageNo: 'PKG-02', purchaseCode: 'S111F260204-0200', description: 'Amortiguador Delantero Derecho Changan CS35 Plus', qty: 20 },
      { caseNo: 'P002', packageNo: 'PKG-03', purchaseCode: '1109011-M01', description: 'Filtro de Aire Motor Changan CS55 Pro', qty: 50 },
      { caseNo: 'P002', packageNo: 'PKG-04', purchaseCode: '3501110-B01', description: 'Pastillas de Freno Delanteras Changan Alsvin / Hunter', qty: 45 },
      { caseNo: 'P003', packageNo: 'PKG-05', purchaseCode: 'H15001-0800', description: 'Bomba de Agua Genuina Changan CS15', qty: 15 },
      { caseNo: 'P003', packageNo: 'PKG-06', purchaseCode: '2803101-MK01', description: 'Paragolpe Delantero Imprimado Changan Uni-T', qty: 10 }
    ];

    const totalPiezas = itemsDemo.reduce((acc, i) => acc + i.qty, 0);

    setContenedorId(invDemo);
    setInfoDetectada({
      invoiceNo: invDemo,
      totalPiezas,
      skus: itemsDemo.length,
      items: itemsDemo
    });
    setErrorMsg(null);
  };

  const handleProcesar = async () => {
    if (!infoDetectada || infoDetectada.items.length === 0) {
      setErrorMsg('No se detectaron repuestos válidos en el archivo.');
      return;
    }

    const idFinal = String(contenedorId || infoDetectada?.invoiceNo || '').trim().toUpperCase();
    if (!idFinal) {
      setErrorMsg('Debe especificar un ID de Contenedor o Invoice.');
      return;
    }

    // SEGURIDAD: Solo el Administrador de CEDIS puede autorizar la recepción física inicial
    if (estatusSeleccionado === 'RECIBIDO') {
      const confirmar = window.confirm(
        'AUTORIZACIÓN ADMINISTRATIVA REQUERIDA:\n\n¿Confirma que este contenedor ha sido FÍSICAMENTE RECIBIDO en CEDIS?\n\nSi aún está en barco o aduana, debe mantenerlo en "EN TRÁNSITO" o "ADUANA". Solo Admin puede dar por recibido.'
      );
      if (!confirmar) {
        setEstatusSeleccionado('EN TRÁNSITO');
        return;
      }
    }

    setProcesando(true);

    try {
      // 1. Importar en AppsScriptClient (Motor central Canónico)
      const resAppsScript = await appsScriptClient.importarManifiestoDPL({
        contenedorId: idFinal,
        proveedor,
        poReferencia: `PO-${idFinal}`,
        tipoTransporte,
        fechaArribo,
        estado: estatusSeleccionado,
        items: infoDetectada.items.map(it => ({
          palletCaseNo: it.caseNo || 'P001',
          packageNo: it.packageNo || 'PKG-01',
          codigoRepuesto: it.purchaseCode || it.suppliedCode || '',
          descripcion: it.description || 'Repuesto Genuino Changan',
          cantidadTotal: it.qty || 1,
          pallet: it.caseNo || 'P001'
        }))
      });

      // 2. Sincronizar en CedisService (capa de persistencia compatible)
      cedisService.importarManifiestoDPL({
        invoiceNo: idFinal,
        proveedor,
        estado: estatusSeleccionado,
        items: infoDetectada.items
      });

      setProcesando(false);

      if (resAppsScript.success) {
        if (onSuccess) onSuccess();
        if (onDPLGuardado) onDPLGuardado();
        onClose();
      } else {
        setErrorMsg(resAppsScript.error || 'Error al vincular el manifiesto.');
      }
    } catch (err: unknown) {
      setProcesando(false);
      setErrorMsg('Error al procesar el manifiesto: ' + (err instanceof Error ? err.message : 'Error inesperado'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Cargar Manifiesto DPL Changan</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Cross-Docking CEDIS // Ciclo de vida y asignación selectiva
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario Scrolleable */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Selector de Archivo o Plantilla Rápida */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Archivo oficial recibido de fábrica (.xls / .xlsx):
              </label>
              <button
                type="button"
                onClick={cargarDPLPrueba}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Cargar DPL de Prueba</span>
              </button>
            </div>

            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer border border-slate-800 rounded-xl bg-slate-950/60 p-1.5"
            />
          </div>

          {/* REGLA CRÍTICA: Selector de Estatus DPL */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-cyan-400" />
                <span>Estatus Inicial del Manifiesto / Embarque:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Regla Operativa CEDIS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* EN TRÁNSITO */}
              <button
                type="button"
                onClick={() => setEstatusSeleccionado('EN TRÁNSITO')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  estatusSeleccionado === 'EN TRÁNSITO'
                    ? 'bg-sky-950/80 border-sky-500 text-white shadow-md shadow-sky-950/40 ring-1 ring-sky-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-sky-400">🚢 EN TRÁNSITO</span>
                  {estatusSeleccionado === 'EN TRÁNSITO' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  En altamar. Rastreo activo sin asignar stock.
                </p>
              </button>

              {/* ADUANA */}
              <button
                type="button"
                onClick={() => setEstatusSeleccionado('ADUANA')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  estatusSeleccionado === 'ADUANA'
                    ? 'bg-amber-950/80 border-amber-500 text-white shadow-md shadow-amber-950/40 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400">🛃 ADUANA</span>
                  {estatusSeleccionado === 'ADUANA' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  En puerto o nacionalización. Rastreo activo sin asignar.
                </p>
              </button>

              {/* RECIBIDO */}
              <button
                type="button"
                onClick={() => setEstatusSeleccionado('RECIBIDO')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  estatusSeleccionado === 'RECIBIDO'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-400">🏢 RECIBIDO</span>
                  {estatusSeleccionado === 'RECIBIDO' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  En Bodega CEDIS. <strong className="text-emerald-300">Asigna repuestos de inmediato</strong>.
                </p>
              </button>
            </div>

            {/* Banner explicativo según estado seleccionado */}
            <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-2 border ${
              estatusSeleccionado === 'RECIBIDO'
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                : 'bg-sky-950/40 border-sky-800/60 text-sky-200'
            }`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              <div>
                {estatusSeleccionado === 'RECIBIDO' ? (
                  <span>
                    <strong>Asignación Automática Activada:</strong> Al guardar como <strong>RECIBIDO</strong>, el motor de CEDIS asignará inmediatamente las piezas a requisiciones de sucursales pendientes por orden de prioridad FIFO.
                  </span>
                ) : (
                  <span>
                    <strong>Modo Rastreo Anticipado:</strong> Este DPL quedará guardado en el historial y se podrá consultar con el botón <strong>Rastreador Universal</strong> para validar fechas de llegada, pero <strong>NO asignará repuestos</strong> a ningún pedido hasta que se cambie a <strong>RECIBIDO</strong>.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Información Detectada y Metadatos editables */}
          {infoDetectada && (
            <div className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>DPL Analizado Correctamente</span>
                </div>
                <span className="text-[11px] font-mono text-cyan-400">
                  {infoDetectada.totalPiezas} piezas / {infoDetectada.skus} SKUs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Número de Contenedor / Invoice:
                  </label>
                  <input
                    type="text"
                    value={contenedorId}
                    onChange={(e) => setContenedorId(e.target.value.toUpperCase())}
                    placeholder="Ej. INV-CN-9840"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Fecha Estimada / Arribo:
                  </label>
                  <input
                    type="date"
                    value={fechaArribo}
                    onChange={(e) => setFechaArribo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Proveedor:
                  </label>
                  <input
                    type="text"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tipo de Transporte:
                  </label>
                  <input
                    type="text"
                    value={tipoTransporte}
                    onChange={(e) => setTipoTransporte(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-950/70 border border-red-800 text-red-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!infoDetectada || procesando}
            onClick={handleProcesar}
            className={`font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-40 ${
              estatusSeleccionado === 'RECIBIDO'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>
              {procesando 
                ? 'Procesando Embarque...' 
                : estatusSeleccionado === 'RECIBIDO'
                ? 'Cargar & Asignar Repuestos a Pedidos'
                : `Cargar en ${estatusSeleccionado} (Para Rastreo)`
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
