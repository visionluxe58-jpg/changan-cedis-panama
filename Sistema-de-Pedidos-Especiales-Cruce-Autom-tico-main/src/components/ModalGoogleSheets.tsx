import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Database,
  Lock,
  Code,
  HelpCircle,
  AlertTriangle,
  Activity,
  Check,
  Zap,
  PlusCircle,
  Copy,
  Sparkles
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';
import { googleWorkspaceService, SpreadsheetCreationResult, OFFICIAL_OAUTH_CLIENT_ID } from '../services/googleWorkspaceService';
import { AppsScriptApiConfig, ResultadoDiagnosticoCORS } from '../types/cedis';
import { CODIGO_APPS_SCRIPT_CEDIS } from '../data/appsScriptCode';

interface ModalGoogleSheetsProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const ModalGoogleSheets: React.FC<ModalGoogleSheetsProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [config, setConfig] = useState<AppsScriptApiConfig>(() => appsScriptClient.getConfig());
  const [webAppUrl, setWebAppUrl] = useState<string>(config.webAppUrl || '');
  const [tabActiva, setTabActiva] = useState<'crear' | 'conectar' | 'codigo'>('crear');
  
  // Estado de Creación Automática mediante OAuth
  const [creandoHoja, setCreandoHoja] = useState<boolean>(false);
  const [hojaCreada, setHojaCreada] = useState<SpreadsheetCreationResult | null>(null);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [nombreNuevaHoja, setNombreNuevaHoja] = useState<string>('CEDIS Changan Panamá - Base de Datos Oficial');
  
  // Estado de Inspección de Hoja Existente
  const [urlHojaExistente, setUrlHojaExistente] = useState<string>('');
  const [inspeccionandoHoja, setInspeccionandoHoja] = useState<boolean>(false);
  const [infoHojaExistente, setInfoHojaExistente] = useState<{ title: string; sheets: string[] } | null>(null);
  const [errorInspeccion, setErrorInspeccion] = useState<string | null>(null);

  // Estado de Diagnóstico Web App
  const [probandoConexion, setProbandoConexion] = useState<boolean>(false);
  const [diagnostico, setDiagnostico] = useState<ResultadoDiagnosticoCORS | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Auto-cargar si ya hay una hoja creada registrada en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('changan_ultima_hoja_creada');
      if (saved) {
        setHojaCreada(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  if (!isOpen) return null;

  // Acción 1: Crear la Google Sheet automáticamente en Google Drive
  const handleCrearHojaGoogle = async () => {
    setCreandoHoja(true);
    setErrorCreacion(null);

    try {
      // Pedir token OAuth con el Client ID oficial
      const token = await googleWorkspaceService.solicitarTokenOAuth(OFFICIAL_OAUTH_CLIENT_ID);

      const resultado = await googleWorkspaceService.crearHojaCEDISCompleta(
        token,
        nombreNuevaHoja.trim() || 'CEDIS Changan Panamá - Base de Datos Oficial'
      );

      setHojaCreada(resultado);
      localStorage.setItem('changan_ultima_hoja_creada', JSON.stringify(resultado));
      setTabActiva('crear');
    } catch (err: any) {
      console.error('Error al crear hoja en Google Drive:', err);
      setErrorCreacion(err.message || 'No se pudo crear la Google Sheet automáticamente.');
    } finally {
      setCreandoHoja(false);
    }
  };

  // Acción: Inspeccionar pestañas de una Google Sheet existente del usuario
  const handleInspeccionarHojaExistente = async () => {
    if (!urlHojaExistente.trim()) return;
    setInspeccionandoHoja(true);
    setErrorInspeccion(null);
    setInfoHojaExistente(null);

    try {
      const token = await googleWorkspaceService.solicitarTokenOAuth(OFFICIAL_OAUTH_CLIENT_ID);
      const info = await googleWorkspaceService.obtenerInfoHoja(token, urlHojaExistente.trim());
      setInfoHojaExistente(info);
    } catch (err: any) {
      console.error('Error al inspeccionar hoja existente:', err);
      setErrorInspeccion(err.message || 'No se pudo leer la hoja en Google Sheets. Verifique permisos o el enlace.');
    } finally {
      setInspeccionandoHoja(false);
    }
  };

  // Acción 2: Probar la Web App URL de Apps Script
  const handleGuardarYProbar = async () => {
    setProbandoConexion(true);
    setDiagnostico(null);

    const cleanUrl = webAppUrl.trim();

    if (!cleanUrl) {
      appsScriptClient.guardarConfig({
        webAppUrl: '',
        modoOfflineSimulado: true,
        estadoConexion: 'MODO_LOCAL_SEGURO'
      });
      const diagVacio = await appsScriptClient.diagnosticarConexion('');
      setDiagnostico(diagVacio);
      setProbandoConexion(false);
      onSyncComplete();
      return;
    }

    appsScriptClient.guardarConfig({
      webAppUrl: cleanUrl,
      modoOfflineSimulado: false
    });

    const resultado = await appsScriptClient.diagnosticarConexion(cleanUrl);
    setDiagnostico(resultado);
    setProbandoConexion(false);

    if (resultado.ok) {
      onSyncComplete();
    }
  };

  const copiarCodigoScript = () => {
    navigator.clipboard.writeText(CODIGO_APPS_SCRIPT_CEDIS);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-white my-8">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Base de Datos Google Sheets CEDIS</span>
                <span className="text-[10px] bg-emerald-900/80 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-700">
                  Google Drive & Apps Script
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Creación automática y conexión bidireccional en tiempo real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTabActiva('crear')}
            className={`px-3 py-2 font-semibold rounded-t-lg transition flex items-center gap-1.5 ${
              tabActiva === 'crear'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>1. Crear Hoja en tu Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('conectar')}
            className={`px-3 py-2 font-semibold rounded-t-lg transition flex items-center gap-1.5 ${
              tabActiva === 'conectar'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>2. Enlazar Web App API</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('codigo')}
            className={`px-3 py-2 font-semibold rounded-t-lg transition flex items-center gap-1.5 ${
              tabActiva === 'codigo'
                ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Código Apps Script (Code.gs)</span>
          </button>
        </div>

        {/* CONTENIDO TAB 1: CREAR HOJA AUTOMÁTICAMENTE */}
        {tabActiva === 'crear' && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Generador Automático de Google Sheet Oficial</span>
                  </h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    Crea automáticamente en tu cuenta de Google Drive la hoja de cálculo completa con las 7 pestañas maestras ya estructuradas, con formato corporativo Changan, filas inmovilizadas y datos semilla de pedidos y bodegas.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nombre del archivo en Google Drive:
                </label>
                <input
                  type="text"
                  value={nombreNuevaHoja}
                  onChange={(e) => setNombreNuevaHoja(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCrearHojaGoogle}
                  disabled={creandoHoja}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
                >
                  <RefreshCw className={`w-4 h-4 ${creandoHoja ? 'animate-spin' : ''}`} />
                  <span>{creandoHoja ? 'Creando hoja y escribiendo pestañas...' : 'Crear Hoja en mi Google Drive Ahora'}</span>
                </button>
              </div>

              {errorCreacion && (
                <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Error durante la creación:</p>
                    <p className="text-[11px] font-mono">{errorCreacion}</p>
                  </div>
                </div>
              )}

              {hojaCreada && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-600/90 rounded-xl text-emerald-100 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>¡Hoja de cálculo creada con éxito!</span>
                    </div>
                    <a
                      href={hojaCreada.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir en Google Sheets</span>
                    </a>
                  </div>

                  <p className="text-xs text-emerald-200/90">
                    Archivo: <strong>{hojaCreada.title}</strong>
                  </p>

                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-emerald-900/60 font-mono text-[11px] text-emerald-300 space-y-1">
                    <div className="font-bold text-emerald-400 font-sans uppercase text-[10px]">
                      Pestañas inicializadas ({hojaCreada.sheetsCreated.length}):
                    </div>
                    <div>{hojaCreada.sheetsCreated.join(' • ')}</div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <strong className="text-white block">Siguiente paso:</strong>
                    Abre la hoja en Google Sheets, ve a <em>Extensiones &gt; Apps Script</em>, pega el código de la pestaña <strong>"Código Apps Script"</strong> y publícala como Aplicación Web para tener sincronización automática bidireccional.
                  </div>
                </div>
              )}
            </div>

            {/* Pestañas Maestras Creadas */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 text-xs uppercase tracking-wider block">
                Estructura de pestañas canónicas del sistema:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-blue-400 font-bold block">1. Matriz_Central</span>
                  <span className="text-slate-400">Requisiciones, VOR, cliente, VIN, piezas y saldos pendientes.</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold block">2. DPL_Detalle</span>
                  <span className="text-slate-400">Inventario físico en bodega, ubicación, piezas asignadas y saldo libre.</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold block">3. DPL_Manifiestos</span>
                  <span className="text-slate-400">Contenedores de importación, pallets y saldos totales de absorción.</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-purple-400 font-bold block">4. Auditoria_Kardex</span>
                  <span className="text-slate-400">Bitácora inmutable de despachos, salidas y ajustes de merma.</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-teal-400 font-bold block">5. Ordering_Template</span>
                  <span className="text-slate-400">Plantilla de pedidos de fábrica por transporte aéreo o marítimo.</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-300 font-bold block">6. BD_Encargados</span>
                  <span className="text-slate-400">Directorio de encargados y asesores con permisos operativos.</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN: VINCULAR O INSPECCIONAR HOJA EXISTENTE DEL USUARIO */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4" />
                <span>¿Ya tienes un Google Sheet con tus propias pestañas?</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Pega el enlace o ID de tu hoja existente de Google Sheets para que el sistema la inspeccione y verifique los nombres de las pestañas que tienes configuradas:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlHojaExistente}
                  onChange={(e) => setUrlHojaExistente(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={inspeccionandoHoja || !urlHojaExistente.trim()}
                  onClick={handleInspeccionarHojaExistente}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shrink-0 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${inspeccionandoHoja ? 'animate-spin' : ''}`} />
                  <span>{inspeccionandoHoja ? 'Leyendo...' : 'Inspeccionar Hoja'}</span>
                </button>
              </div>

              {errorInspeccion && (
                <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Error al inspeccionar hoja:</p>
                    <p className="text-[11px] font-mono">{errorInspeccion}</p>
                  </div>
                </div>
              )}

              {infoHojaExistente && (
                <div className="p-3 bg-sky-950/80 border border-sky-600/80 rounded-xl text-sky-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-sky-300">
                      Hoja detectada: <span className="text-white">{infoHojaExistente.title}</span>
                    </div>
                    <span className="text-[10px] bg-sky-900 text-sky-200 px-2 py-0.5 rounded font-bold">
                      {infoHojaExistente.sheets.length} pestañas
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1 font-mono bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-sky-200">
                    <div className="font-bold font-sans text-slate-400 uppercase text-[10px]">
                      Pestañas actuales en tu archivo:
                    </div>
                    <div>{infoHojaExistente.sheets.join(' • ')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 2: ENLAZAR CON URL DE APPS SCRIPT */}
        {tabActiva === 'conectar' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                URL de la Aplicación Web de Google Apps Script
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
                {webAppUrl.trim().startsWith('http') && (
                  <a
                    href={`${webAppUrl.trim()}${webAppUrl.includes('?') ? '&' : '?'}action=ping`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1 shrink-0 font-semibold transition"
                    title="Abrir URL directamente en nueva pestaña para ver respuesta de Google"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir en navegador</span>
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>
                  Debe comenzar con <code>https://script.google.com/macros/s/</code> y finalizar en <code>/exec</code>.
                </span>
                <button
                  type="button"
                  onClick={() => setWebAppUrl('https://script.google.com/macros/s/AKfycbzUyPaDPSDjOSHqyFGH1RJQLmnsjAaVzMPwVrC1EpTQCPFluR6wpq8xSjRpT6bu-t5a/exec')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline decoration-dotted transition"
                >
                  Pegar URL de producción oficial
                </button>
              </div>
            </div>

            {diagnostico && (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  diagnostico.ok
                    ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-100'
                    : 'bg-rose-950/70 border-rose-600/80 text-rose-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {diagnostico.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span>{diagnostico.mensaje}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        diagnostico.corsHabilitado
                          ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600'
                          : 'bg-rose-800/80 text-rose-200 border border-rose-600'
                      }`}
                    >
                      {diagnostico.corsHabilitado ? 'CORS: OK' : 'CORS: Bloqueado'}
                    </span>
                    {diagnostico.latenciaMs > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {diagnostico.latenciaMs}ms
                      </span>
                    )}
                  </div>
                </div>

                {diagnostico.diagnosticoTecnico && (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1 font-sans font-semibold text-[10px] uppercase">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      <span>Diagnóstico de Red y Protocolo</span>
                    </div>
                    {diagnostico.diagnosticoTecnico}
                  </div>
                )}

                {diagnostico.pestanasDetectadas && diagnostico.pestanasDetectadas.length > 0 && (
                  <div className="bg-emerald-900/30 border border-emerald-700/50 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{diagnostico.pestanasDetectadas.length} pestañas maestras detectadas en la hoja:</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 font-mono">
                      {diagnostico.pestanasDetectadas.join(', ')}
                    </p>
                  </div>
                )}

                {diagnostico.pasosSugeridos && diagnostico.pasosSugeridos.length > 0 && !diagnostico.ok && (
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Pasos recomendados para resolver:</span>
                    </div>
                    <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-300">
                      {diagnostico.pasosSugeridos.map((paso, idx) => (
                        <li key={idx} className="leading-snug">{paso}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Guía Rápida */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Requisito en Google Apps Script</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Al implementar tu Web App en Google Apps Script:
              </p>
              <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside">
                <li>
                  Configura <strong className="text-white">"Quién tiene acceso" (Who has access)</strong> en <span className="text-emerald-400 font-bold">Cualquier persona (Anyone)</span>.
                </li>
                <li>
                  Ejecuta una vez la función <code>setupSpreadsheetCanonica</code> para autorizar los permisos de lectura y escritura en la hoja.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 3: CÓDIGO APPS SCRIPT LISTO PARA COPIAR */}
        {tabActiva === 'codigo' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block text-sm">
                  Código de Backend Google Apps Script (Code.gs)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Cópialo y pégalo en <em>Extensiones &gt; Apps Script</em> dentro de tu hoja.
                </span>
              </div>
              <button
                type="button"
                onClick={copiarCodigoScript}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 shadow"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? '¡Copiado al Portapapeles!' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-72 leading-relaxed">
              {CODIGO_APPS_SCRIPT_CEDIS}
            </pre>
          </div>
        )}

        {/* Botones del Pie de Modal */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition font-medium"
          >
            Cerrar
          </button>

          {tabActiva === 'conectar' && (
            <button
              type="button"
              disabled={probandoConexion}
              onClick={handleGuardarYProbar}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probandoConexion ? 'animate-spin' : ''}`} />
              <span>{probandoConexion ? 'Verificando Conexión...' : 'Guardar y Probar Conexión'}</span>
            </button>
          )}

          {tabActiva === 'crear' && !hojaCreada && (
            <button
              type="button"
              disabled={creandoHoja}
              onClick={handleCrearHojaGoogle}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Crear Hoja en Google Drive</span>
            </button>
          )}

          {tabActiva === 'codigo' && (
            <button
              type="button"
              onClick={copiarCodigoScript}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiado ? 'Copiado' : 'Copiar Código'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
