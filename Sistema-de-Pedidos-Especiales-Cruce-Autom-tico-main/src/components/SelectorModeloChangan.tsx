import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Car, 
  Search, 
  ChevronDown, 
  Check, 
  Sparkles, 
  Filter, 
  X,
  Zap,
  Truck,
  ShieldCheck
} from 'lucide-react';
import { CATALOGO_MODELOS_CHANGAN, ModeloVehiculoChangan } from '../data/sucursalesData';

interface SelectorModeloChanganProps {
  valorSeleccionado: string;
  onSeleccionar: (modelo: string) => void;
  error?: boolean;
}

export const SelectorModeloChangan: React.FC<SelectorModeloChanganProps> = ({
  valorSeleccionado,
  onSeleccionar,
  error = false
}) => {
  const [abierto, setAbierto] = useState<boolean>(false);
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('TODAS');
  const contenedorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
    };
  }, [abierto]);

  // Lista de modelos
  const modelos = CATALOGO_MODELOS_CHANGAN;

  // Modelo actualmente seleccionado
  const modeloActual = useMemo(() => {
    return modelos.find(m => m.nombre === valorSeleccionado) || {
      nombre: valorSeleccionado || 'CS35 Plus 2023-2024',
      categoria: 'SUV' as const,
      anosCompatibles: '2019-2026',
      motor: '1.4L Turbo BlueCore (158 HP)',
      descripcion: 'SUV de alta rotación en Panamá'
    };
  }, [modelos, valorSeleccionado]);

  // Filtrado reactivo por texto y categoría
  const modelosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return modelos.filter(m => {
      const matchCat = categoriaActiva === 'TODAS' || m.categoria === categoriaActiva;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        m.nombre.toLowerCase().includes(q) ||
        (m.motor && m.motor.toLowerCase().includes(q)) ||
        (m.anosCompatibles && m.anosCompatibles.includes(q)) ||
        m.categoria.toLowerCase().includes(q) ||
        (m.descripcion && m.descripcion.toLowerCase().includes(q))
      );
    });
  }, [modelos, busqueda, categoriaActiva]);

  const getBadgeColor = (cat: string) => {
    switch (cat) {
      case 'SUV': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Sedán': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Pickup': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Eléctrico / Híbrido': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Comercial': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="relative w-full" ref={contenedorRef}>
      
      {/* BOTON SELECTOR PRINCIPAL */}
      <div
        onClick={() => setAbierto(!abierto)}
        className={`w-full px-4 py-3 rounded-xl bg-slate-900 border-2 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-inner ${
          error 
            ? 'border-rose-500 bg-rose-950/20' 
            : abierto 
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-900/95' 
              : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white tracking-wide truncate">
                {modeloActual.nombre}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getBadgeColor(modeloActual.categoria)}`}>
                {modeloActual.categoria}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
              {modeloActual.motor && <span>Motor: {modeloActual.motor}</span>}
              {modeloActual.anosCompatibles && <span>&bull; Años: {modeloActual.anosCompatibles}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <span className="hidden sm:inline text-xs text-slate-500 font-medium">Cambiar</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${abierto ? 'rotate-180 text-blue-400' : ''}`} />
        </div>
      </div>

      {/* PANEL FLOTANTE DESPLEGABLE CON BUSCADOR Y CATEGORIAS */}
      {abierto && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#0c1322] border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[420px] animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* BARRA SUPERIOR: BUSCADOR */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar modelo, motor o año (ej: CS35, Hunter, UNI-T, 1.4T)..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs font-medium focus:border-blue-500 focus:outline-none"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* FILTROS RAPIDOS DE CATEGORIA */}
          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['TODAS', 'SUV', 'Sedán', 'Pickup', 'Eléctrico / Híbrido', 'Comercial'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaActiva(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  categoriaActiva === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat === 'TODAS' ? `Todos (${modelos.length})` : cat}
              </button>
            ))}
          </div>

          {/* LISTA CON DESPLAZAMIENTO SUAVE */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scroll">
            {modelosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No se encontraron modelos con el criterio &quot;{busqueda}&quot;.
              </div>
            ) : (
              modelosFiltrados.map((m) => {
                const esSeleccionado = m.nombre === valorSeleccionado;
                return (
                  <div
                    key={m.nombre}
                    onClick={() => {
                      onSeleccionar(m.nombre);
                      setAbierto(false);
                      setBusqueda('');
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      esSeleccionado
                        ? 'bg-blue-600/25 border border-blue-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">
                          {m.nombre}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(m.categoria)}`}>
                          {m.categoria}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        {m.motor && <span className="text-slate-300">{m.motor}</span>}
                        {m.anosCompatibles && <span className="text-blue-400/90 font-mono">({m.anosCompatibles})</span>}
                        {m.descripcion && <span className="text-slate-400 italic hidden sm:inline">&bull; {m.descripcion}</span>}
                      </div>
                    </div>

                    {esSeleccionado && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* PIE DEL SELECTOR INFORMATIVO */}
          <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Catálogo Oficial Changan Automobile Panamá
            </span>
            <span className="text-slate-400 font-mono">{modelosFiltrados.length} disponibles</span>
          </div>

        </div>
      )}

    </div>
  );
};
