import {
  Database,
  Download,
  Edit,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload
} from 'lucide-react';
import React, { useState } from 'react';
import { CHANGAN_MODELS } from '../data/mockData';
import { MasterCatalogPart } from '../types';

interface MasterCatalogViewProps {
  catalog: MasterCatalogPart[];
  onAddPart: (part: MasterCatalogPart) => void;
  onUpdatePart: (part: MasterCatalogPart) => void;
  onDeletePart: (partId: string) => void;
}

export const MasterCatalogView: React.FC<MasterCatalogViewProps> = ({
  catalog,
  onAddPart,
  onUpdatePart,
  onDeletePart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<MasterCatalogPart | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [updatedCode, setUpdatedCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Suspensión');
  const [compatibleModels, setCompatibleModels] = useState<string[]>(['CS35 Plus']);
  const [suggestedLocation, setSuggestedLocation] = useState('E-02-B-A04');

  const categories = Array.from(new Set(catalog.map((c) => c.category)));

  const filteredCatalog = catalog.filter((part) => {
    if (selectedCategory !== 'ALL' && part.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        part.code.toLowerCase().includes(q) ||
        part.description.toLowerCase().includes(q) ||
        (part.updatedCode && part.updatedCode.toLowerCase().includes(q)) ||
        part.compatibleModels.some((m) => m.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingPart(null);
    setCode('');
    setUpdatedCode('');
    setDescription('');
    setCategory('Suspensión');
    setCompatibleModels(['CS35 Plus']);
    setSuggestedLocation('CEDIS-A-01');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (part: MasterCatalogPart) => {
    setEditingPart(part);
    setCode(part.code);
    setUpdatedCode(part.updatedCode || '');
    setDescription(part.description);
    setCategory(part.category);
    setCompatibleModels(part.compatibleModels);
    setSuggestedLocation(part.suggestedLocation);
    setIsAddModalOpen(true);
  };

  const handleSavePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return;

    if (editingPart) {
      onUpdatePart({
        ...editingPart,
        code: code.trim().toUpperCase(),
        updatedCode: updatedCode.trim().toUpperCase() || undefined,
        description: description.trim(),
        category,
        compatibleModels,
        suggestedLocation: suggestedLocation.trim().toUpperCase(),
      });
    } else {
      onAddPart({
        id: `CAT-${Date.now()}`,
        code: code.trim().toUpperCase(),
        updatedCode: updatedCode.trim().toUpperCase() || undefined,
        description: description.trim(),
        category,
        compatibleModels,
        suggestedLocation: suggestedLocation.trim().toUpperCase(),
        standardLeadTimeDays: 25,
      });
    }

    setIsAddModalOpen(false);
  };

  const toggleModel = (model: string) => {
    setCompatibleModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const exportCatalogCsv = () => {
    const headers = ['Codigo', 'Codigo_Actualizado', 'Descripcion', 'Categoria', 'Modelos_Compatibles', 'Ubicacion_CEDIS'];
    const rows = [headers.join(',')];
    catalog.forEach((c) => {
      rows.push(
        `"${c.code}","${c.updatedCode || ''}","${c.description}","${c.category}","${c.compatibleModels.join(' / ')}","${c.suggestedLocation}"`
      );
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_maestro_changan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[90px] rounded-full pointer-events-none"></div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-mono font-bold">
                BASE DE DATOS MAESTRA // GERENCIA DE REPUESTOS
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              Catálogo Oficial de Repuestos Changan Panamá
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Alimenta el autocompletado en los formularios de las sucursales y la asignación inteligente
              de ubicaciones físicas en el CEDIS Central.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCatalogCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar Catálogo</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Repuesto al Catálogo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, descripción o modelo..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Categoría:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">Todas las Categorías ({catalog.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#0b0f17] border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                <th className="py-3 px-4">Código Changan</th>
                <th className="py-3 px-3">Cód. Actualizado</th>
                <th className="py-3 px-4">Descripción Oficial</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Modelos Compatibles</th>
                <th className="py-3 px-3">Ubicación CEDIS</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filteredCatalog.map((part) => (
                <tr key={part.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-300">{part.code}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {part.updatedCode || <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium">{part.description}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {part.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    {part.compatibleModels.join(', ')}
                  </td>
                  <td className="py-3 px-3 font-mono text-cyan-400/90 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-500" />
                    <span>{part.suggestedLocation}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(part)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                        title="Editar repuesto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Desea ELIMINAR el repuesto "${part.code} - ${part.description}" del catálogo maestro?`
                            )
                          ) {
                            onDeletePart(part.id);
                          }
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0f17] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>{editingPart ? 'Editar Repuesto' : 'Agregar Nuevo Repuesto al Catálogo'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePart} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Código Oficial *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej. S111F260204-1504"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono uppercase text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Código Actualizado / Rev</label>
                  <input
                    type="text"
                    value={updatedCode}
                    onChange={(e) => setUpdatedCode(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono uppercase text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descripción Oficial *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. SHOCK ABSORBER ASSY, RR"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Suspensión">Suspensión</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Motor & Escape">Motor & Escape</option>
                    <option value="Carrocería">Carrocería</option>
                    <option value="Dirección">Dirección</option>
                    <option value="Electrónica & Multimedia">Electrónica & Multimedia</option>
                    <option value="Sistema Eléctrico">Sistema Eléctrico</option>
                    <option value="Enfriamiento">Enfriamiento</option>
                    <option value="Sujeción y Chasis">Sujeción y Chasis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Ubicación Sugerida CEDIS</label>
                  <input
                    type="text"
                    value={suggestedLocation}
                    onChange={(e) => setSuggestedLocation(e.target.value)}
                    placeholder="Ej. E-02-B-A04"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono uppercase text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Modelos Changan Compatibles</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  {CHANGAN_MODELS.map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModel(mod)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        compatibleModels.includes(mod)
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-slate-400 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg font-mono uppercase text-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
