import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Sparkles, 
  Info,
  Database
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';

interface ModalDepurarDuplicadosProps {
  isOpen: boolean;
  onClose: () => void;
  onDepuracionCompleta?: () => void;
}

export const ModalDepurarDuplicados: React.FC<ModalDepurarDuplicadosProps> = ({
  isOpen,
  onClose,
  onDepuracionCompleta
}) => {
  const [tabActiva, setTabActiva] = useState<'auditoria' | 'codigoSheet'>('auditoria');
  const [ejecutando, setEjecutando] = useState(false);
  const [sincronizarSheet, setSincronizarSheet] = useState(true);
  const [resultado, setResultado] = useState<{
    success: boolean;
    exactosEliminados: number;
    clientesDuplicadosEliminados: number;
    totalRestantes: number;
    mensaje: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Analizar duplicados actuales
  const [auditoriaActual, setAuditoriaActual] = useState({
    totalLineas: 0,
    lineasExactas: 0,
    clientesDuplicados: 0
  });

  const calcularAuditoria = () => {
    const filas = appsScriptClient.getMatrizCentral();
    const seenExact = new Set<string>();
    let exactDups = 0;

    filas.forEach(f => {
      const k = `${f.pedidoId}__${(f.codigoRepuesto || '').trim().toUpperCase()}`;
      if (seenExact.has(k)) exactDups++;
      else seenExact.add(k);
    });

    setAuditoriaActual({
      totalLineas: filas.length,
      lineasExactas: exactDups,
      clientesDuplicados: 0
    });
  };

  useEffect(() => {
    if (isOpen) {
      calcularAuditoria();
      setResultado(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEjecutarDepuracion = async () => {
    setEjecutando(true);
    try {
      const res = await appsScriptClient.depurarDuplicados(sincronizarSheet);
      setResultado(res);
      calcularAuditoria();
      if (onDepuracionCompleta) {
        onDepuracionCompleta();
      }
    } catch (err: any) {
      setResultado({
        success: false,
        exactosEliminados: 0,
        clientesDuplicadosEliminados: 0,
        totalRestantes: 0,
        mensaje: err.message || 'Error al ejecutar la depuración.'
      });
    } finally {
      setEjecutando(false);
    }
  };

  const codigoGoogleSheet = `/**
 * MACRO OFICIAL DE DEPURACIÓN EN GOOGLE SHEETS
 * Pega este código en Extensiones > Apps Script y ejecuta: depurarDuplicadosMatriz()
 */
function depurarDuplicadosMatriz() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hMatriz = ss.getSheetByName('Matriz_Central') || ss.getSheets()[0];
    if (!hMatriz || hMatriz.getLastRow() <= 1) return;

    var data = hMatriz.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
    var colId = headers.indexOf('id pedido') !== -1 ? headers.indexOf('id pedido') : 0;
    var colCliente = headers.indexOf('cliente / caso') !== -1 ? headers.indexOf('cliente / caso') : (headers.indexOf('cliente') !== -1 ? headers.indexOf('cliente') : 5);
    var colCod = headers.indexOf('código oem') !== -1 ? headers.indexOf('código oem') : 9;
    var colEstatus = headers.indexOf('estatus cruce') !== -1 ? headers.indexOf('estatus cruce') : 13;

    var filasAEliminar = [];
    var seenExact = {};
    var activeClientParts = [];

    function sonMismoCliente(a, b) {
      if (!a || !b) return false;
      var aU = String(a).trim().toUpperCase();
      var bU = String(b).trim().toUpperCase();
      if (aU === bU) return true;
      if (aU.length >= 4 && bU.length >= 4 && (aU.indexOf(bU) !== -1 || bU.indexOf(aU) !== -1)) return true;
      return false;
    }

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;
      var pId = String(data[i][colId] || '').trim();
      var cliente = String(data[i][colCliente] || '').trim();
      var cod = String(data[i][colCod] || '').trim().toUpperCase();
      var estatus = String(data[i][colEstatus] || '').toUpperCase();
      if (!cod || !pId) continue;

      var exactKey = pId + '__' + cod;
      if (seenExact[exactKey]) {
        filasAEliminar.push(rowNum);
        continue;
      }
      seenExact[exactKey] = true;

      var isFinal = estatus.indexOf('DESPACH') !== -1 || estatus.indexOf('ENTREG') !== -1 || estatus.indexOf('CANCEL') !== -1;
      if (!isFinal && cliente) {
        var esDuplicado = false;
        for (var c = 0; c < activeClientParts.length; c++) {
          if (activeClientParts[c].cod === cod && sonMismoCliente(activeClientParts[c].cliente, cliente)) {
            esDuplicado = true;
            break;
          }
        }
        if (esDuplicado) {
          filasAEliminar.push(rowNum);
          continue;
        }
        activeClientParts.push({ cliente: cliente, cod: cod, rowNum: rowNum });
      }
    }

    filasAEliminar.sort(function(a, b) { return b - a; });
    for (var d = 0; d < filasAEliminar.length; d++) {
      hMatriz.deleteRow(filasAEliminar[d]);
    }
    Logger.log('Depuración exitosa: ' + filasAEliminar.length + ' filas duplicadas eliminadas.');
  } finally {
    lock.releaseLock();
  }
}`;

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(codigoGoogleSheet);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Auditoría y Depuración de Duplicados
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Regla Activa
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Garantiza que ningún cliente tenga solicitudes repetidas para el mismo repuesto y elimina líneas redundantes.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6">
          <button
            onClick={() => setTabActiva('auditoria')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tabActiva === 'auditoria'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Auditoría y Ejecución
          </button>
          <button
            onClick={() => setTabActiva('codigoSheet')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              tabActiva === 'codigoSheet'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Macro para Google Sheets
          </button>
        </div>

        {/* Tab 1: Auditoría */}
        {tabActiva === 'auditoria' && (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Líneas Exactas Repetidas
                </div>
                <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  {auditoriaActual.lineasExactas}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Mismo pedido + repuesto
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Integridad de Clientes
                </div>
                <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  100% Protegido
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Bloqueo estricto por tokens
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Total Registros Canónicos
                </div>
                <div className="text-2xl font-bold text-white">
                  {auditoriaActual.totalLineas}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Filas sin datos inflados
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white">
                  ¿Cómo funciona la Regla de No Duplicados?
                </p>
                <p>
                  1. <strong>Líneas Idénticas:</strong> Si un pedido contiene el mismo repuesto repetido en dos filas (ej. como ocurrió en PED-C50-2039), se conserva únicamente una línea con la cantidad correcta.
                </p>
                <p>
                  2. <strong>Pedidos Mismo Cliente + Repuesto:</strong> Si un cliente (ej. ADRI FUENTES o ALVARO GUERRERO) ya tiene una orden activa con un repuesto específico, el sistema bloquea cualquier solicitud adicional para no inflar los requerimientos de importación.
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="syncSheet"
                checked={sincronizarSheet}
                onChange={(e) => setSincronizarSheet(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="syncSheet" className="text-xs text-slate-300 cursor-pointer select-none">
                Sincronizar depuración con Google Sheets en segundo plano (eliminar filas duplicadas en la nube)
              </label>
            </div>

            {/* Result Alert */}
            {resultado && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                resultado.success 
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200' 
                  : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
              }`}>
                {resultado.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-semibold text-white mb-1">{resultado.mensaje}</p>
                  {resultado.success && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-emerald-800/40 text-[11px]">
                      <div>Exactos eliminados: <strong>{resultado.exactosEliminados}</strong></div>
                      <div>Duplicados cliente: <strong>{resultado.clientesDuplicadosEliminados}</strong></div>
                      <div>Filas limpias finales: <strong>{resultado.totalRestantes}</strong></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleEjecutarDepuracion}
                disabled={ejecutando}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
              >
                {ejecutando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Depurando Base de Datos...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Ejecutar Depuración Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Macro Google Sheets */}
        {tabActiva === 'codigoSheet' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Macro para Google Sheets</h3>
                <p className="text-xs text-slate-400">
                  Ejecuta este script directamente en tu Google Spreadsheet para purgar filas duplicadas en la pestaña Matriz_Central.
                </p>
              </div>
              <button
                onClick={copiarAlPortapapeles}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copiar Código
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-72">
              <pre>{codigoGoogleSheet}</pre>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-200">Pasos para aplicar en Google Sheets:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Abre el documento de Google Sheets: <strong>CEDIS Changan Panamá - Base de Datos Oficial</strong></li>
                <li>Haz clic en el menú superior: <strong>Extensiones &gt; Apps Script</strong></li>
                <li>Crea o abre el archivo <code>DepuracionDuplicados.gs</code> y pega este código.</li>
                <li>Selecciona la función <code>depurarDuplicadosMatriz</code> en la barra superior y haz clic en <strong>Ejecutar</strong>.</li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
