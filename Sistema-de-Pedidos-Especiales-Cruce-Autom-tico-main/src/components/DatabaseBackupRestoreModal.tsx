import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  FileJson,
  Layers,
  Box,
  ShoppingCart,
  HardDrive,
  CloudCheck,
} from 'lucide-react';
import { MasterCatalogPart, ShippingContainer, SpecialOrder, ChanganVehicleModel } from '../types';
import {
  createFullDatabaseBackup,
  downloadBackupJsonFile,
  parseAndValidateBackupJson,
  saveOrdersToStorage,
  saveContainersToStorage,
  saveCatalogToStorage,
  saveModelsToStorage,
  resetAllStorageToDefaults,
  FullDatabaseBackup,
} from '../utils/storage';
import { restoreFullBackupToServer, purgeAllServerData, bootstrapClientStateToServer } from '../utils/apiSync';
import {
  batchSaveOrdersToFirestore,
  batchSaveContainersToFirestore,
  batchSaveCatalogToFirestore,
  batchSaveModelsToFirestore,
} from '../utils/firestoreSync';

interface DatabaseBackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SpecialOrder[];
  containers: ShippingContainer[];
  catalog: MasterCatalogPart[];
  models?: ChanganVehicleModel[];
  onDataRestored: (newOrders: SpecialOrder[], newContainers: ShippingContainer[], newCatalog: MasterCatalogPart[], newModels?: ChanganVehicleModel[]) => void;
}

export const DatabaseBackupRestoreModal: React.FC<DatabaseBackupRestoreModalProps> = ({
  isOpen,
  onClose,
  orders,
  containers,
  catalog,
  models = [],
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'purge'>('backup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileBackup, setSelectedFileBackup] = useState<FullDatabaseBackup | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      setIsProcessing(true);
      const backup = createFullDatabaseBackup(orders, containers, catalog, models);
      downloadBackupJsonFile(backup);
      setSuccessMessage(`¡Respaldo descargado con éxito! Contiene ${orders.length} pedidos, ${containers.length} contenedores, ${catalog.length} repuestos y ${models.length} modelos Changan.`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Error al generar respaldo: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateBackupJson(content);
      if (res.isValid && res.data) {
        setSelectedFileBackup(res.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(res.error || 'Archivo de respaldo no válido.');
        setSelectedFileBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!selectedFileBackup) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const { orders: newOrders, containers: newContainers, catalog: newCatalog, models: newModels } = selectedFileBackup;

      // 1. Save to browser LocalStorage
      saveOrdersToStorage(newOrders);
      saveContainersToStorage(newContainers);
      saveCatalogToStorage(newCatalog);
      if (newModels && newModels.length > 0) {
        saveModelsToStorage(newModels);
      }

      // 2. Push to Cloud Firestore (durable cloud storage)
      if (newOrders && newOrders.length > 0) {
        await batchSaveOrdersToFirestore(newOrders);
      }
      if (newContainers && newContainers.length > 0) {
        await batchSaveContainersToFirestore(newContainers);
      }
      if (newCatalog && newCatalog.length > 0) {
        await batchSaveCatalogToFirestore(newCatalog);
      }
      if (newModels && newModels.length > 0) {
        await batchSaveModelsToFirestore(newModels);
      }

      // 3. Push to server backend
      await restoreFullBackupToServer(selectedFileBackup);

      // 4. Update React App State
      onDataRestored(newOrders, newContainers, newCatalog, newModels);

      setSuccessMessage(`¡Base de datos restaurada y grabada en Cloud Firestore! Se cargaron ${newOrders.length} pedidos, ${newContainers.length} contenedores y ${newCatalog.length} repuestos.`);
      setSelectedFileBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMessage(`Error al restaurar respaldo: ${err.message || 'Error de conexión'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromServerBackup = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/backup/download');
      if (!res.ok) {
        throw new Error('No se pudo conectar al servicio de respaldo del servidor.');
      }
      const backupData = await res.json();
      const { orders: newOrders, containers: newContainers, catalog: newCatalog, models: newModels } = backupData;

      if (!Array.isArray(newOrders) || newOrders.length === 0) {
        throw new Error('El respaldo del servidor está vacío. Cargue un archivo .JSON con sus pedidos.');
      }

      saveOrdersToStorage(newOrders);
      saveContainersToStorage(newContainers);
      saveCatalogToStorage(newCatalog);
      if (newModels && newModels.length > 0) {
        saveModelsToStorage(newModels);
      }

      // Also persist to Firestore Cloud
      if (newOrders && newOrders.length > 0) {
        await batchSaveOrdersToFirestore(newOrders);
      }
      if (newContainers && newContainers.length > 0) {
        await batchSaveContainersToFirestore(newContainers);
      }
      if (newCatalog && newCatalog.length > 0) {
        await batchSaveCatalogToFirestore(newCatalog);
      }
      if (newModels && newModels.length > 0) {
        await batchSaveModelsToFirestore(newModels);
      }

      onDataRestored(newOrders, newContainers, newCatalog, newModels);
      setSuccessMessage(`¡Base de datos recuperada y respaldada en Cloud Firestore! Se cargaron ${newOrders.length} pedidos y ${newContainers.length} contenedores.`);
    } catch (err: any) {
      setErrorMessage(`Error al recuperar datos del servidor: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecutePurge = async () => {
    if (purgeConfirmText !== 'BORRAR') {
      setErrorMessage('Escriba la palabra BORRAR exactamente para confirmar.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // 1. Wipe in local storage
      saveOrdersToStorage([]);
      saveContainersToStorage([]);

      // 2. Wipe in server
      await purgeAllServerData(true, true);

      // 3. Update state
      onDataRestored([], [], catalog, models);

      setSuccessMessage('Base de datos purgada a cero. El sistema está 100% listo para ingresar pedidos y contenedores nuevos.');
      setPurgeConfirmText('');
    } catch (err: any) {
      setErrorMessage(`Error al purgar datos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceCloudSync = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await bootstrapClientStateToServer(orders, containers, catalog, models);
      setSuccessMessage('¡Sincronización forzada completada! Los datos del navegador están 100% replicados en el servidor.');
    } catch (err: any) {
      setErrorMessage(`Error en sincronización: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#090d16] border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl text-cyan-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <span>Centro de Respaldos & Persistencia CEDIS</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                  v2.0 Anti-Pérdida
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Proteja, exporte o restaure toda la información operativa de pedidos, contenedores y cruces.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Summary Pill Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <ShoppingCart className="w-4 h-4 text-purple-400" />
            <span>{orders.length} Pedidos</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <Box className="w-4 h-4 text-cyan-400" />
            <span>{containers.length} Contenedores</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>{catalog.length} Catálogo</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs font-mono">
          <button
            onClick={() => {
              setActiveTab('backup');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 font-bold transition-all ${
              activeTab === 'backup'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Descargar Respaldo JSON</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('restore');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 font-bold transition-all ${
              activeTab === 'restore'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Restaurar Base de Datos</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('purge');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 font-bold transition-all ${
              activeTab === 'purge'
                ? 'border-rose-400 text-rose-300 bg-rose-950/20'
                : 'border-transparent text-slate-500 hover:text-rose-400'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar BD</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Feedback messages */}
          {successMessage && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-xs text-emerald-300 font-mono animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-xs text-rose-300 font-mono animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>Copia de Seguridad Integral (.JSON)</span>
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Descarga un archivo único e inmutable que contiene el 100% de la información: todos los pedidos de las 6 sucursales, contenedores con sus manifiestos completos, cruces ejecutados, estado de pagos y catálogo de repuestos.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleDownloadBackup}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all active:scale-95"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Descargar Respaldo Completo Ahora (.json)</span>
                  </button>
                </div>
              </div>

              {/* Force Cloud Sync */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <CloudCheck className="w-4 h-4 text-emerald-400" />
                    <span>Re-sincronizar con el Servidor Backend</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Fuerza la persistencia inmediata de los datos locales hacia el backend en caso de reinicio de contenedor.
                  </p>
                </div>
                <button
                  onClick={handleForceCloudSync}
                  disabled={isProcessing}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold border border-slate-700 text-[11px] whitespace-nowrap transition-all"
                >
                  Sincronizar
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'restore' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Restaurar desde Archivo .JSON</span>
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Selecciona un archivo de respaldo generado previamente para restaurar al instante todos tus pedidos y contenedores reales.
                </p>

                {/* File picker */}
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-5 text-center transition-colors bg-slate-950/60">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="backup-file-picker"
                  />
                  <label htmlFor="backup-file-picker" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileJson className="w-8 h-8 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Haga clic aquí para seleccionar el archivo .JSON de Respaldo
                    </span>
                    <span className="text-[10px] text-slate-500">Formato: RESPALDO_CEDIS_CHANGAN_*.json</span>
                  </label>
                </div>

                {/* Direct Server Recovery */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CloudCheck className="w-4 h-4 text-emerald-400" />
                    <span>Recuperación Directa del Servidor (1-Click)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Carga el último respaldo snapshot íntegro almacenado en el disco del servidor para restablecer tus datos inmediatamente.
                  </p>
                </div>
                <button
                  onClick={handleRestoreFromServerBackup}
                  disabled={isProcessing}
                  className="px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-xl font-bold border border-emerald-700/60 text-[11px] whitespace-nowrap transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                >
                  Restaurar Servidor
                </button>
              </div>
                {selectedFileBackup && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-xl space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Archivo Válido Detectado:</span>
                    </div>
                    <div className="text-[11px] text-slate-300 pl-6 space-y-0.5">
                      <div>• Fecha de Exportación: {new Date(selectedFileBackup.exportedAt).toLocaleString()}</div>
                      <div>• Pedidos Especiales: <strong>{selectedFileBackup.totalOrders}</strong></div>
                      <div>• Contenedores Registrados: <strong>{selectedFileBackup.totalContainers}</strong></div>
                    </div>
                  </div>
                )}

                {selectedFileBackup && (
                  <button
                    onClick={handleExecuteRestore}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Aplicar & Restaurar Base de Datos Ahora</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PURGE */}
          {activeTab === 'purge' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Limpieza de Base de Datos para Carga Real</span>
                </h3>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Esta acción elimina todos los pedidos y contenedores actuales para permitirte cargar la matriz real limpia desde cero.
                  <strong className="text-rose-400 block mt-1">¡Esta acción es irreversible! Te recomendamos descargar un respaldo antes.</strong>
                </p>

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] text-slate-400 block">
                    Para confirmar, escriba exactamente la palabra <strong className="text-white font-mono">BORRAR</strong> abajo:
                  </label>
                  <input
                    type="text"
                    value={purgeConfirmText}
                    onChange={(e) => setPurgeConfirmText(e.target.value)}
                    placeholder="Escriba BORRAR"
                    className="w-full bg-slate-950 border border-rose-800/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
                  />
                  <button
                    onClick={handleExecutePurge}
                    disabled={purgeConfirmText !== 'BORRAR' || isProcessing}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      purgeConfirmText === 'BORRAR' && !isProcessing
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>Confirmar y Purgar Base de Datos</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
