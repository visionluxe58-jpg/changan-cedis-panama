import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Check, 
  Copy, 
  X, 
  Table, 
  Info, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { 
  TODAS_LAS_PLANTILLAS, 
  DefinicionPlantilla, 
  descargarPlantillaExcel, 
  descargarPlantillaCSV, 
  copiarDatosTabulados 
} from '../data/plantillasMatriz';

interface ModalCentroPlantillasProps {
  isOpen: boolean;
  onClose: () => void;
  onCargarEnMatriz?: () => void;
}

export const ModalCentroPlantillas: React.FC<ModalCentroPlantillasProps> = ({
  isOpen,
  onClose,
  onCargarEnMatriz
}) => {
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<DefinicionPlantilla>(TODAS_LAS_PLANTILLAS[0]);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [tabVista, setTabVista] = useState<'campos' | 'vista_previa'>('campos');

  if (!isOpen) return null;

  const handleCopiarPortapapeles = () => {
    const exito = copiarDatosTabulados(plantillaSeleccionada);
    if (exito) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Principal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-md shadow-emerald-500/10">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Centro de Plantillas Oficiales CEDIS Changan
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Formatos Homologados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Descarga las plantillas Excel y CSV para alimentar masivamente la Matriz Central respetando todos los campos mandatorios.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Plantilla (3 Tipos) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-6 pt-4 pb-3 border-b border-slate-800 bg-slate-950/40">
          {TODAS_LAS_PLANTILLAS.map((plantilla) => {
            const esActiva = plantillaSeleccionada.id === plantilla.id;
            return (
              <button
                key={plantilla.id}
                type="button"
                onClick={() => {
                  setPlantillaSeleccionada(plantilla);
                  setCopiado(false);
                }}
                className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  esActiva
                    ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${esActiva ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {plantilla.id === 'pedidos_sucursales' && '1. Pedidos Sucursales / Talleres'}
                    {plantilla.id === 'matriz_completa' && '2. Matriz Central 25 Campos'}
                    {plantilla.id === 'manifiesto_dpl' && '3. Manifiesto DPL / Embarques'}
                  </span>
                  {esActiva ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {plantilla.cabeceras.length} col.
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {plantilla.subtitulo}
                </p>
              </button>
            );
          })}
        </div>

        {/* Barra de Acciones de Descarga para la Plantilla Seleccionada */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono font-bold border border-slate-700">
              {plantillaSeleccionada.cabeceras.length} Columnas
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {plantillaSeleccionada.titulo}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Copiar al Portapapeles */}
            <button
              type="button"
              onClick={handleCopiarPortapapeles}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Copiar datos tabulados al portapapeles para pegar en Google Sheets o Excel"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiado ? '¡Copiado a Portapapeles!' : 'Copiar para Excel / Sheets'}</span>
            </button>

            {/* Botón Descargar CSV */}
            <button
              type="button"
              onClick={() => descargarPlantillaCSV(plantillaSeleccionada)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Descargar archivo en formato CSV compatible con Excel"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Descargar .CSV</span>
            </button>

            {/* Botón Descargar Excel (.xlsx) */}
            <button
              type="button"
              onClick={() => descargarPlantillaExcel(plantillaSeleccionada)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              title="Descargar archivo oficial formateado en Microsoft Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel (.XLSX)</span>
            </button>

            {onCargarEnMatriz && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCargarEnMatriz();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer ml-1"
                title="Abrir la ventana de Carga Masiva para subir tu archivo ya completado"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ir a Carga Masiva</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Vista (Estructura de Campos vs. Vista Previa de Datos) */}
        <div className="flex items-center gap-2 px-6 pt-2.5 border-b border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={() => setTabVista('campos')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tabVista === 'campos'
                ? 'text-emerald-400 border-emerald-500 bg-slate-800/80'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Diccionario de Campos y Validaciones ({plantillaSeleccionada.campos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabVista('vista_previa')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tabVista === 'vista_previa'
                ? 'text-emerald-400 border-emerald-500 bg-slate-800/80'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Vista Previa de Filas de Ejemplo ({plantillaSeleccionada.filasEjemplo.length})</span>
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {tabVista === 'campos' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-3">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-white">Reglas y Consideraciones de Carga Masiva:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                    <li><strong className="text-emerald-300">Código OEM Changan:</strong> Es el identificador clave. Debe coincidir con el catálogo de partes (ej. <code className="text-emerald-400">S111F270108-0103</code>, <code className="text-emerald-400">F202F260100-0100</code>).</li>
                    <li><strong className="text-emerald-300">Prioridad:</strong> Respeta la jerarquía oficial FIFO: <em>VOR / Unidad Parada &gt; Garantía &gt; Chapistería y Colisión &gt; Taller Mecánico &gt; Stock Regular</em>.</li>
                    <li><strong className="text-emerald-300">Matching Automático:</strong> Al subir el archivo, el sistema cruza cada código contra los contenedores y pallets de DPL para asignar el stock físicamente disponible.</li>
                    <li><strong className="text-emerald-300">ID de Pedido:</strong> Si se deja vacío, el sistema asignará el consecutivo oficial correlativo correspondiente a la sucursal (ej. <em>PED-VL-4001</em>).</li>
                  </ul>
                </div>
              </div>

              {/* Tabla del Diccionario de Campos */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                        <th className="py-2.5 px-3 font-semibold">#</th>
                        <th className="py-2.5 px-3 font-semibold">Nombre de Columna en Excel</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Obligatorio</th>
                        <th className="py-2.5 px-3 font-semibold">Tipo</th>
                        <th className="py-2.5 px-3 font-semibold">Descripción &amp; Propósito</th>
                        <th className="py-2.5 px-3 font-semibold">Valores Aceptados / Desplegable</th>
                        <th className="py-2.5 px-3 font-semibold">Ejemplo Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {plantillaSeleccionada.campos.map((campo, idx) => (
                        <tr key={campo.clave} className="hover:bg-slate-900/40 transition">
                          <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-300 font-mono">
                            {campo.nombre}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {campo.obligatorio ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                SÍ
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-900 border border-slate-800">
                                Opcional
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">
                            {campo.tipo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs leading-relaxed">
                            {campo.descripcion}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans max-w-xs">
                            {campo.valoresPermitidos ? (
                              <div className="flex flex-wrap gap-1">
                                {campo.valoresPermitidos.map(val => (
                                  <span key={val} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300">
                                    {val}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic font-mono text-[10px]">Texto libre / Número</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-amber-300/90 font-mono">
                            {campo.ejemplo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabVista === 'vista_previa' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 flex items-center justify-between">
                <span>Esta es la estructura exacta que contendrá el archivo descargado:</span>
                <span className="text-[11px] text-slate-400">{plantillaSeleccionada.filasEjemplo.length} registros demostrativos</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                        {plantillaSeleccionada.cabeceras.map((cab, idx) => (
                          <th key={idx} className="py-2.5 px-3 font-semibold whitespace-nowrap text-emerald-300 font-mono">
                            {cab}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {plantillaSeleccionada.filasEjemplo.map((fila, fIdx) => (
                        <tr key={fIdx} className="hover:bg-slate-900/40 transition">
                          {fila.map((celda, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                              {celda !== '' ? String(celda) : <span className="text-slate-600">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Compatible con Microsoft Excel 2016+, Office 365, LibreOffice y Google Sheets.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => descargarPlantillaExcel(plantillaSeleccionada)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar {plantillaSeleccionada.nombreArchivo}.xlsx</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
