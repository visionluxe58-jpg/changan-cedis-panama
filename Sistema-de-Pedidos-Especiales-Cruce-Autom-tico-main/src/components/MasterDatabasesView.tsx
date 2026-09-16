import React, { useState, useRef } from 'react';
import {
  Database,
  Car,
  Package,
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  X,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Hash,
  MapPin,
  DollarSign
} from 'lucide-react';
import { ChanganVehicleModel, MasterCatalogPart, VehicleCategory } from '../types';
import {
  generateModelsExcelTemplate,
  generatePartsCatalogExcelTemplate,
  exportModelsToExcel,
  exportCatalogToExcel,
  parseModelsExcelFile,
  parseCatalogExcelFile
} from '../utils/apiSync';

interface MasterDatabasesViewProps {
  models: ChanganVehicleModel[];
  catalog: MasterCatalogPart[];
  onAddModel: (model: ChanganVehicleModel) => void;
  onUpdateModel: (model: ChanganVehicleModel) => void;
  onDeleteModel: (modelId: string) => void;
  onAddPart: (part: MasterCatalogPart) => void;
  onUpdatePart: (part: MasterCatalogPart) => void;
  onDeletePart: (partId: string) => void;
  onBulkImportModels?: (models: ChanganVehicleModel[]) => void;
  onBulkImportCatalog?: (parts: MasterCatalogPart[]) => void;
  isAdminUnlocked: boolean;
  onOpenSecurityModal: () => void;
}

export const MasterDatabasesView: React.FC<MasterDatabasesViewProps> = ({
  models,
  catalog,
  onAddModel,
  onUpdateModel,
  onDeleteModel,
  onAddPart,
  onUpdatePart,
  onDeletePart,
  onBulkImportModels,
  onBulkImportCatalog,
  isAdminUnlocked,
  onOpenSecurityModal,
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'catalog'>('models');
  
  // Search & Filters
  const [modelsSearch, setModelsSearch] = useState('');
  const [modelsCategoryFilter, setModelsCategoryFilter] = useState<string>('ALL');
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ChanganVehicleModel | null>(null);

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<MasterCatalogPart | null>(null);

  // Status & Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // File Inputs Ref
  const modelsFileInputRef = useRef<HTMLInputElement | null>(null);
  const catalogFileInputRef = useRef<HTMLInputElement | null>(null);

  // Model Form State
  const [modelName, setModelName] = useState('');
  const [modelCategory, setModelCategory] = useState<VehicleCategory>('SUV');
  const [modelYearRange, setModelYearRange] = useState('2022-2026');
  const [modelEngine, setModelEngine] = useState('');
  const [modelTransmission, setModelTransmission] = useState('');
  const [modelGeneration, setModelGeneration] = useState('');
  const [modelIsActive, setModelIsActive] = useState(true);
  const [modelNotes, setModelNotes] = useState('');

  // Part Form State
  const [partCode, setPartCode] = useState('');
  const [partUpdatedCode, setPartUpdatedCode] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partCategory, setPartCategory] = useState('Motor');
  const [partCompatibleModels, setPartCompatibleModels] = useState<string[]>([]);
  const [partLocation, setPartLocation] = useState('CEDIS-A-01');
  const [partPrice, setPartPrice] = useState<number | ''>('');
  const [partNotes, setPartNotes] = useState('');

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // ================= MODEL HANDLERS =================
  const handleOpenAddModel = () => {
    setEditingModel(null);
    setModelName('');
    setModelCategory('SUV');
    setModelYearRange('2022-2026');
    setModelEngine('');
    setModelTransmission('');
    setModelGeneration('');
    setModelIsActive(true);
    setModelNotes('');
    setIsModelModalOpen(true);
  };

  const handleOpenEditModel = (model: ChanganVehicleModel) => {
    setEditingModel(model);
    setModelName(model.name);
    setModelCategory(model.category || 'SUV');
    setModelYearRange(model.yearRange || '');
    setModelEngine(model.engine || '');
    setModelTransmission(model.transmission || '');
    setModelGeneration(model.generation || '');
    setModelIsActive(model.isActive !== false && model.active !== false);
    setModelNotes(model.notes || '');
    setIsModelModalOpen(true);
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) {
      showFeedback('error', 'El nombre del modelo es obligatorio.');
      return;
    }

    if (editingModel) {
      const updated: ChanganVehicleModel = {
        ...editingModel,
        name: modelName.trim(),
        category: modelCategory,
        yearRange: modelYearRange.trim() || undefined,
        engine: modelEngine.trim() || undefined,
        transmission: modelTransmission.trim() || undefined,
        generation: modelGeneration.trim() || undefined,
        isActive: modelIsActive,
        active: modelIsActive,
        notes: modelNotes.trim() || undefined,
      };
      onUpdateModel(updated);
      showFeedback('success', `Modelo "${updated.name}" actualizado correctamente.`);
    } else {
      const newId = `MOD-${Date.now().toString(36).toUpperCase()}`;
      const newModel: ChanganVehicleModel = {
        id: newId,
        name: modelName.trim(),
        category: modelCategory,
        yearRange: modelYearRange.trim() || undefined,
        engine: modelEngine.trim() || undefined,
        transmission: modelTransmission.trim() || undefined,
        generation: modelGeneration.trim() || undefined,
        isActive: modelIsActive,
        active: modelIsActive,
        notes: modelNotes.trim() || undefined,
      };
      onAddModel(newModel);
      showFeedback('success', `Nuevo modelo "${newModel.name}" agregado a la base de datos.`);
    }

    setIsModelModalOpen(false);
  };

  const handleToggleModelActive = (model: ChanganVehicleModel) => {
    const isCurrentlyActive = model.isActive !== false && model.active !== false;
    const updated: ChanganVehicleModel = {
      ...model,
      isActive: !isCurrentlyActive,
      active: !isCurrentlyActive,
    };
    onUpdateModel(updated);
    showFeedback('info', `Modelo "${model.name}" ${!isCurrentlyActive ? 'activado' : 'desactivado'} para selección en pedidos.`);
  };

  const handleImportModelsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showFeedback('info', 'Procesando archivo de modelos...');
      const parsed = await parseModelsExcelFile(file);
      if (parsed.length === 0) {
        showFeedback('error', 'No se encontraron modelos válidos en el archivo Excel. Asegúrese de que tenga la columna "Nombre Modelo".');
        return;
      }

      if (onBulkImportModels) {
        onBulkImportModels(parsed);
      } else {
        parsed.forEach((m) => onAddModel(m));
      }
      showFeedback('success', `¡Éxito! Se importaron/actualizaron ${parsed.length} modelos de vehículos Changan.`);
    } catch (err: any) {
      console.error('Import models error:', err);
      showFeedback('error', `Error al importar archivo: ${err.message || 'Formato no reconocido'}`);
    } finally {
      if (modelsFileInputRef.current) modelsFileInputRef.current.value = '';
    }
  };

  // ================= PART HANDLERS =================
  const handleOpenAddPart = () => {
    setEditingPart(null);
    setPartCode('');
    setPartUpdatedCode('');
    setPartDescription('');
    setPartCategory('Motor');
    setPartCompatibleModels(['CS35 Plus', 'CS55 Plus']);
    setPartLocation('CEDIS-A-01');
    setPartPrice('');
    setPartNotes('');
    setIsPartModalOpen(true);
  };

  const handleOpenEditPart = (part: MasterCatalogPart) => {
    setEditingPart(part);
    setPartCode(part.code);
    setPartUpdatedCode(part.updatedCode || '');
    setPartDescription(part.description);
    setPartCategory(part.category || 'General');
    setPartCompatibleModels(part.compatibleModels || []);
    setPartLocation(part.suggestedLocation || 'CEDIS-A-01');
    setPartPrice(part.priceEstimate || '');
    setPartNotes(part.notes || '');
    setIsPartModalOpen(true);
  };

  const handleSavePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partCode.trim() || !partDescription.trim()) {
      showFeedback('error', 'El código de parte y la descripción son campos obligatorios.');
      return;
    }

    const priceNum = typeof partPrice === 'number' ? partPrice : parseFloat(String(partPrice)) || undefined;

    if (editingPart) {
      const updated: MasterCatalogPart = {
        ...editingPart,
        code: partCode.trim().toUpperCase(),
        updatedCode: partUpdatedCode.trim().toUpperCase() || undefined,
        description: partDescription.trim(),
        category: partCategory,
        compatibleModels: partCompatibleModels.length > 0 ? partCompatibleModels : ['TODOS LOS MODELOS'],
        suggestedLocation: partLocation.trim().toUpperCase(),
        priceEstimate: priceNum,
        notes: partNotes.trim() || undefined,
      };
      onUpdatePart(updated);
      showFeedback('success', `Repuesto "${updated.code}" actualizado.`);
    } else {
      const newPart: MasterCatalogPart = {
        id: `CAT-${Date.now().toString(36).toUpperCase()}`,
        code: partCode.trim().toUpperCase(),
        updatedCode: partUpdatedCode.trim().toUpperCase() || undefined,
        description: partDescription.trim(),
        category: partCategory,
        compatibleModels: partCompatibleModels.length > 0 ? partCompatibleModels : ['TODOS LOS MODELOS'],
        suggestedLocation: partLocation.trim().toUpperCase(),
        standardLeadTimeDays: 25,
        priceEstimate: priceNum,
        notes: partNotes.trim() || undefined,
      };
      onAddPart(newPart);
      showFeedback('success', `Nuevo repuesto "${newPart.code}" registrado en el catálogo.`);
    }

    setIsPartModalOpen(false);
  };

  const handleToggleCompatibleModel = (mName: string) => {
    setPartCompatibleModels((prev) =>
      prev.includes(mName) ? prev.filter((x) => x !== mName) : [...prev, mName]
    );
  };

  const handleImportCatalogFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showFeedback('info', 'Procesando archivo de catálogo de repuestos...');
      const parsed = await parseCatalogExcelFile(file);
      if (parsed.length === 0) {
        showFeedback('error', 'No se encontraron repuestos válidos en el archivo. Asegúrese de incluir las columnas "Código de Parte" y "Descripción".');
        return;
      }

      if (onBulkImportCatalog) {
        onBulkImportCatalog(parsed);
      } else {
        parsed.forEach((p) => onAddPart(p));
      }
      showFeedback('success', `¡Éxito! Se importaron ${parsed.length} repuestos al Catálogo Maestro.`);
    } catch (err: any) {
      console.error('Import catalog error:', err);
      showFeedback('error', `Error al importar repuestos: ${err.message || 'Formato no reconocido'}`);
    } finally {
      if (catalogFileInputRef.current) catalogFileInputRef.current.value = '';
    }
  };

  // Filtered Lists
  const filteredModels = models.filter((m) => {
    if (modelsCategoryFilter !== 'ALL' && m.category !== modelsCategoryFilter) return false;
    if (modelsSearch.trim()) {
      const q = modelsSearch.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.engine && m.engine.toLowerCase().includes(q)) ||
        (m.yearRange && m.yearRange.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const catalogCategories = Array.from(new Set(catalog.map((c) => c.category || 'General')));

  const filteredCatalog = catalog.filter((part) => {
    if (catalogCategoryFilter !== 'ALL' && part.category !== catalogCategoryFilter) return false;
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      return (
        part.code.toLowerCase().includes(q) ||
        part.description.toLowerCase().includes(q) ||
        (part.updatedCode && part.updatedCode.toLowerCase().includes(q)) ||
        (part.suggestedLocation && part.suggestedLocation.toLowerCase().includes(q)) ||
        part.compatibleModels.some((m) => m.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const modelCategories: VehicleCategory[] = ['SUV', 'Sedán', 'Pickup', 'Comercial', 'Eléctrico / Híbrido'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Security Status */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
              <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-mono font-bold">
                PANEL MAESTRO DE ADMINISTRACIÓN // BASES DE DATOS CENTRALES
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
              <Database className="w-6 h-6 text-cyan-400" />
              Gestión de Modelos de Autos & Catálogo de Repuestos
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Aquí administras las 2 bases de datos maestras del sistema. Estas alimentan el autocompletado en tiempo real
              para los asesores y facturadores al ingresar pedidos en todas las sucursales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isAdminUnlocked ? (
              <button
                onClick={onOpenSecurityModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-300 rounded-xl text-xs font-mono font-bold transition-all shadow-md"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Desbloquear Edición de Administrador</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded-xl text-xs font-mono font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>MODO ADMINISTRADOR ACTIVO (TOTAL)</span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : feedbackMessage.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{feedbackMessage.text}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
              activeTab === 'models'
                ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>1. BASE DE DATOS DE MODELOS DE AUTOS ({models.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
              activeTab === 'catalog'
                ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. BASE DE DATOS DE REPUESTOS ({catalog.length})</span>
          </button>
        </div>
      </div>

      {/* Hidden File Inputs for Excel Import */}
      <input
        type="file"
        ref={modelsFileInputRef}
        onChange={handleImportModelsFile}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <input
        type="file"
        ref={catalogFileInputRef}
        onChange={handleImportCatalogFile}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* ================= TAB 1: VEHICLE MODELS DATABASE ================= */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Models Action Controls & Excel Template Bar */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar modelo, motor, año..."
                  value={modelsSearch}
                  onChange={(e) => setModelsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={modelsCategoryFilter}
                  onChange={(e) => setModelsCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer py-1"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="SUV">SUVs</option>
                  <option value="Sedán">Sedanes</option>
                  <option value="Pickup">Pickups</option>
                  <option value="Comercial">Comerciales</option>
                  <option value="Eléctrico / Híbrido">Eléctricos / Híbridos</option>
                </select>
              </div>
            </div>

            {/* Action Buttons: Add, Excel Template, Import & Export */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={generateModelsExcelTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
                title="Descarga la plantilla oficial en Excel pre-formateada con columnas e instrucciones para llenar nuevos modelos"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Descargar Plantilla Excel</span>
              </button>

              <button
                onClick={() => modelsFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
                title="Importar archivo Excel (.xlsx) con listado masivo de modelos Changan"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Importar Excel</span>
              </button>

              <button
                onClick={() => exportModelsToExcel(models)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
                title="Exportar base de datos actual de modelos a Excel"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Exportar</span>
              </button>

              <button
                onClick={handleOpenAddModel}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Modelo</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Modelos</span>
              <span className="text-lg font-bold text-white font-mono">{models.length}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-cyan-400 font-mono uppercase block">SUVs</span>
              <span className="text-lg font-bold text-cyan-300 font-mono">
                {models.filter((m) => m.category === 'SUV').length}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-blue-400 font-mono uppercase block">Sedanes</span>
              <span className="text-lg font-bold text-blue-300 font-mono">
                {models.filter((m) => m.category === 'Sedán').length}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-amber-400 font-mono uppercase block">Pickups</span>
              <span className="text-lg font-bold text-amber-300 font-mono">
                {models.filter((m) => m.category === 'Pickup').length}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-emerald-400 font-mono uppercase block">Eléctricos / EV</span>
              <span className="text-lg font-bold text-emerald-300 font-mono">
                {models.filter((m) => m.category === 'Eléctrico / Híbrido').length}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-emerald-400 font-mono uppercase block">Activos en Formulario</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {models.filter((m) => m.isActive !== false && m.active !== false).length}
              </span>
            </div>
          </div>

          {/* Models Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Modelo Changan</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Años Compatibles</th>
                    <th className="py-3 px-4">Motorización / Transmisión</th>
                    <th className="py-3 px-4">Generación</th>
                    <th className="py-3 px-4 text-center">Estado Selección</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredModels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron modelos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredModels.map((m) => {
                      const isActive = m.isActive !== false && m.active !== false;
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <Car className="w-4 h-4 text-cyan-400" />
                              <span>{m.name}</span>
                            </div>
                            {m.notes && <p className="text-[10px] text-slate-400 mt-0.5">{m.notes}</p>}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.category === 'SUV'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                                  : m.category === 'Sedán'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                                  : m.category === 'Pickup'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                                  : m.category === 'Eléctrico / Híbrido'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                  : 'bg-purple-950 text-purple-300 border border-purple-800/50'
                              }`}
                            >
                              {m.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {m.yearRange || <span className="text-slate-600">-</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div>{m.engine || <span className="text-slate-600">-</span>}</div>
                            {m.transmission && (
                              <div className="text-[10px] text-slate-400">{m.transmission}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {m.generation || <span className="text-slate-600">-</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleModelActive(m)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                isActive
                                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                              title="Activar o desactivar para que aparezca en el menú desplegable de los asesores"
                            >
                              {isActive ? '✓ ACTIVO' : '✕ INACTIVO'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModel(m)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                title="Editar Modelo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar el modelo "${m.name}" de la base de datos?`)) {
                                    onDeleteModel(m.id);
                                    showFeedback('info', `Modelo "${m.name}" eliminado.`);
                                  }
                                }}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg transition-colors border border-rose-800/40"
                                title="Eliminar Modelo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PARTS CATALOG DATABASE ================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Parts Action Controls & Excel Template Bar */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar código, repuesto, modelo compatible..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={catalogCategoryFilter}
                  onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer py-1"
                >
                  <option value="ALL">Todas las Categorías ({catalog.length})</option>
                  {catalogCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons: Add, Excel Template, Import & Export */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={generatePartsCatalogExcelTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
                title="Descarga la plantilla oficial en Excel pre-formateada con columnas e instrucciones para catálogo maestro de repuestos"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Descargar Plantilla Excel</span>
              </button>

              <button
                onClick={() => catalogFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
                title="Importar archivo Excel (.xlsx) con listado masivo de repuestos y códigos"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Importar Excel</span>
              </button>

              <button
                onClick={() => exportCatalogToExcel(catalog)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
                title="Exportar catálogo actual a Excel"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Exportar</span>
              </button>

              <button
                onClick={handleOpenAddPart}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Repuesto</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Repuestos Registrados</span>
              <span className="text-lg font-bold text-white font-mono">{catalog.length}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-cyan-400 font-mono uppercase block">Categorías Únicas</span>
              <span className="text-lg font-bold text-cyan-300 font-mono">{catalogCategories.length}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-emerald-400 font-mono uppercase block">Autocompletado Activo</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">100% Sincronizado</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-amber-400 font-mono uppercase block">Racks Asignados</span>
              <span className="text-lg font-bold text-amber-300 font-mono">CEDIS Central</span>
            </div>
          </div>

          {/* Parts Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Código de Parte</th>
                    <th className="py-3 px-4">Descripción Oficial</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Modelos Compatibles</th>
                    <th className="py-3 px-4">Ubicación CEDIS</th>
                    <th className="py-3 px-4 text-right">Precio Est. ($)</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron repuestos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 inline-block">
                            {part.code}
                          </span>
                          {part.updatedCode && (
                            <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              <span>Reemp: {part.updatedCode}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{part.description}</div>
                          {part.notes && <p className="text-[10px] text-slate-400 mt-0.5">{part.notes}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {part.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {part.compatibleModels.map((mod) => (
                              <span
                                key={mod}
                                className="text-[9px] bg-slate-950 text-cyan-300 px-1.5 py-0.5 rounded border border-slate-800"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold text-white">{part.suggestedLocation || 'A-01'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {part.priceEstimate ? (
                            <span className="font-bold text-emerald-400 font-mono">
                              ${part.priceEstimate.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditPart(part)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              title="Editar Repuesto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar el repuesto "${part.code} - ${part.description}" del catálogo?`)) {
                                  onDeletePart(part.id);
                                  showFeedback('info', `Repuesto "${part.code}" eliminado.`);
                                }
                              }}
                              className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg transition-colors border border-rose-800/40"
                              title="Eliminar Repuesto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT MODEL ================= */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingModel ? 'Editar Modelo de Auto Changan' : 'Agregar Nuevo Modelo de Auto Changan'}
                </h3>
              </div>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre del Modelo (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CS55 Plus, UNI-T, Deepal S07"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Categoría</label>
                  <select
                    value={modelCategory}
                    onChange={(e) => setModelCategory(e.target.value as VehicleCategory)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {modelCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Años Compatibles</label>
                  <input
                    type="text"
                    placeholder="Ej. 2021 - 2026"
                    value={modelYearRange}
                    onChange={(e) => setModelYearRange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Motorización</label>
                  <input
                    type="text"
                    placeholder="Ej. 1.5L Turbo BlueCore (185 HP)"
                    value={modelEngine}
                    onChange={(e) => setModelEngine(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Transmisión</label>
                  <input
                    type="text"
                    placeholder="Ej. 7-DCT / 8-AT Aisin"
                    value={modelTransmission}
                    onChange={(e) => setModelTransmission(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Generación / Versión</label>
                  <input
                    type="text"
                    placeholder="Ej. 2da Gen, Facelift Pro"
                    value={modelGeneration}
                    onChange={(e) => setModelGeneration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notas / Observaciones Técnicas</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre filtros, bujías o compatibilidades especiales..."
                  value={modelNotes}
                  onChange={(e) => setModelNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modelIsActive"
                  checked={modelIsActive}
                  onChange={(e) => setModelIsActive(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="modelIsActive" className="text-slate-300 font-bold cursor-pointer">
                  Activar este modelo en los formularios de pedidos para asesores
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Guardar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT PART ================= */}
      {isPartModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingPart ? 'Editar Repuesto del Catálogo' : 'Agregar Nuevo Repuesto al Catálogo'}
                </h3>
              </div>
              <button
                onClick={() => setIsPartModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePart} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Código de Parte (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 1017100-M01"
                    value={partCode}
                    onChange={(e) => setPartCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:border-cyan-500 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Código Actualizado / Reemplazo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 1017100-M02"
                    value={partUpdatedCode}
                    onChange={(e) => setPartUpdatedCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descripción Oficial del Repuesto (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. FILTRO DE ACEITE DE MOTOR BLUECORE 1.4T / 1.5T"
                  value={partDescription}
                  onChange={(e) => setPartDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej. Motor, Frenos, Suspensión..."
                    value={partCategory}
                    onChange={(e) => setPartCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Ubicación Rack CEDIS</label>
                  <input
                    type="text"
                    placeholder="Ej. A-02-B-04"
                    value={partLocation}
                    onChange={(e) => setPartLocation(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Precio Estimado ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={partPrice}
                    onChange={(e) => setPartPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Models Selector */}
              <div>
                <label className="block text-slate-400 mb-1.5">Modelos Changan Compatibles</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {models.map((m) => {
                    const isSelected = partCompatibleModels.includes(m.name);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleToggleCompatibleModel(m.name)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-cyan-600 text-white font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notas Técnicas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Información adicional, tipo de rosca, torque, especificaciones..."
                  value={partNotes}
                  onChange={(e) => setPartNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPartModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Guardar Repuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
