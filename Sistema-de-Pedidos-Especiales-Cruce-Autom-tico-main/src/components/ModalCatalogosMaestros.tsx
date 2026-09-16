import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Building2, 
  Users, 
  Package, 
  Car, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Search
} from 'lucide-react';
import { 
  InsforgeService, 
  InsforgeSucursal, 
  InsforgePersonalSucursal, 
  InsforgeBodeguero, 
  InsforgeModeloChangan 
} from '../services/insforgeClient';

interface ModalCatalogosMaestrosProps {
  abierto: boolean;
  onCerrar: () => void;
}

type TabTipo = 'sucursales' | 'personal' | 'bodegueros' | 'modelos';

export const ModalCatalogosMaestros: React.FC<ModalCatalogosMaestrosProps> = ({ abierto, onCerrar }) => {
  const [tabActiva, setTabActiva] = useState<TabTipo>('sucursales');
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // Datos
  const [sucursales, setSucursales] = useState<InsforgeSucursal[]>([]);
  const [personal, setPersonal] = useState<InsforgePersonalSucursal[]>([]);
  const [bodegueros, setBodegueros] = useState<InsforgeBodeguero[]>([]);
  const [modelos, setModelos] = useState<InsforgeModeloChangan[]>([]);

  // Estados de formularios de edición/creación
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [itemEditando, setItemEditando] = useState<any>(null);

  useEffect(() => {
    if (abierto) {
      cargarTodosLosDatos();
    }
  }, [abierto]);

  const cargarTodosLosDatos = async () => {
    setCargando(true);
    setMensajeError(null);
    try {
      const [sucs, pers, bods, mods] = await Promise.all([
        InsforgeService.obtenerSucursales(),
        InsforgeService.obtenerPersonal(),
        InsforgeService.obtenerBodegueros(),
        InsforgeService.obtenerModelos()
      ]);
      setSucursales(sucs);
      setPersonal(pers);
      setBodegueros(bods);
      setModelos(mods);
    } catch (err: any) {
      setMensajeError('Error cargando datos de InsForge: ' + (err.message || 'Error de conexión'));
    } finally {
      setCargando(false);
    }
  };

  const mostrarAlertaExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  };

  // Guardar Sucursal
  const guardarSucursal = async (s: InsforgeSucursal) => {
    try {
      setCargando(true);
      await InsforgeService.guardarSucursal(s);
      await cargarTodosLosDatos();
      setModoEdicion(false);
      setItemEditando(null);
      mostrarAlertaExito('Sucursal guardada exitosamente en InsForge.');
    } catch (err: any) {
      setMensajeError('Error guardando sucursal: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Guardar Personal
  const guardarPersonal = async (p: InsforgePersonalSucursal) => {
    try {
      setCargando(true);
      await InsforgeService.guardarPersonal(p);
      await cargarTodosLosDatos();
      setModoEdicion(false);
      setItemEditando(null);
      mostrarAlertaExito('Personal/Asesor guardado exitosamente en InsForge.');
    } catch (err: any) {
      setMensajeError('Error guardando personal: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Guardar Bodeguero
  const guardarBodeguero = async (b: InsforgeBodeguero) => {
    try {
      setCargando(true);
      await InsforgeService.guardarBodeguero(b);
      await cargarTodosLosDatos();
      setModoEdicion(false);
      setItemEditando(null);
      mostrarAlertaExito('Bodeguero CEDIS guardado exitosamente.');
    } catch (err: any) {
      setMensajeError('Error guardando bodeguero: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Guardar Modelo
  const guardarModelo = async (m: InsforgeModeloChangan) => {
    try {
      setCargando(true);
      await InsforgeService.guardarModelo(m);
      await cargarTodosLosDatos();
      setModoEdicion(false);
      setItemEditando(null);
      mostrarAlertaExito('Modelo Changan guardado exitosamente.');
    } catch (err: any) {
      setMensajeError('Error guardando modelo: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Eliminar
  const eliminarItem = async (tipo: TabTipo, id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro de la base de datos InsForge?')) return;
    try {
      setCargando(true);
      if (tipo === 'sucursales') await InsforgeService.eliminarSucursal(id);
      if (tipo === 'personal') await InsforgeService.eliminarPersonal(id);
      if (tipo === 'bodegueros') await InsforgeService.eliminarBodeguero(id);
      if (tipo === 'modelos') await InsforgeService.eliminarModelo(id);
      await cargarTodosLosDatos();
      mostrarAlertaExito('Registro eliminado correctamente.');
    } catch (err: any) {
      setMensajeError('Error al eliminar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ENCABEZADO */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Base de Datos & Catálogos Maestros</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  InsForge PostgreSQL Activo
                </span>
              </div>
              <p className="text-xs text-slate-400">Modifica sucursales, personal, bodegueros y modelos de auto directamente en la nube.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href="https://insforge.dev/dashboard/project/6ade1661-4076-4569-b676-3fad2ff518d8" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Abrir panel web de InsForge"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Ver en InsForge Web
            </a>
            <button 
              onClick={cargarTodosLosDatos}
              disabled={cargando}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={"w-4 h-4 " + (cargando ? "animate-spin text-blue-400" : "")} />
            </button>
            <button 
              onClick={onCerrar}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ALERTAS */}
        {mensajeExito && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {mensajeExito}
          </div>
        )}
        {mensajeError && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              {mensajeError}
            </div>
            <button onClick={() => setMensajeError(null)} className="text-red-500 hover:text-red-800 text-xs">Cerrar</button>
          </div>
        )}

        {/* PESTAÑAS */}
        <div className="flex items-center justify-between px-6 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => { setTabActiva('sucursales'); setModoEdicion(false); setBusqueda(''); }}
              className={"flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors " + (
                tabActiva === 'sucursales' 
                  ? "border-blue-600 text-blue-600 bg-white shadow-sm" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Building2 className="w-4 h-4" />
              Sucursales ({sucursales.length})
            </button>

            <button
              onClick={() => { setTabActiva('personal'); setModoEdicion(false); setBusqueda(''); }}
              className={"flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors " + (
                tabActiva === 'personal' 
                  ? "border-blue-600 text-blue-600 bg-white shadow-sm" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Users className="w-4 h-4" />
              Asesores & Personal ({personal.length})
            </button>

            <button
              onClick={() => { setTabActiva('bodegueros'); setModoEdicion(false); setBusqueda(''); }}
              className={"flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors " + (
                tabActiva === 'bodegueros' 
                  ? "border-blue-600 text-blue-600 bg-white shadow-sm" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Package className="w-4 h-4" />
              Bodegueros CEDIS ({bodegueros.length})
            </button>

            <button
              onClick={() => { setTabActiva('modelos'); setModoEdicion(false); setBusqueda(''); }}
              className={"flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors " + (
                tabActiva === 'modelos' 
                  ? "border-blue-600 text-blue-600 bg-white shadow-sm" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Car className="w-4 h-4" />
              Modelos Changan ({modelos.length})
            </button>
          </div>

          {/* BOTÓN NUEVO REGISTRO */}
          {!modoEdicion && (
            <button
              onClick={() => {
                if (tabActiva === 'sucursales') {
                  setItemEditando({ id: '', nombre: '', prefijo: '', tipo_equipo: 'INDIVIDUAL', badge: 'Normal', canal_defecto: 'Taller', activa: true });
                } else if (tabActiva === 'personal') {
                  setItemEditando({ id: 'usr_' + Date.now().toString().slice(-4), sucursal_id: sucursales[0]?.id || 'costa_verde', nombre: '', cargo: '', area: 'Taller', correo: '', activo: true });
                } else if (tabActiva === 'bodegueros') {
                  setItemEditando({ codigo: 'CE' + (bodegueros.length + 1).toString().padStart(3, '0'), nombre: '', cargo: 'Asistente de bodega' });
                } else if (tabActiva === 'modelos') {
                  setItemEditando({ nombre: '', categoria: 'SUV', anos_compatibles: '2024-2026', motor: '', descripcion: '', activo: true });
                }
                setModoEdicion(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </button>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* MODO EDICIÓN / FORMULARIO */}
          {modoEdicion && itemEditando && (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  {itemEditando.id || itemEditando.codigo ? 'Modificar Registro' : 'Crear Nuevo Registro'} ({tabActiva.toUpperCase()})
                </h3>
                <button 
                  onClick={() => { setModoEdicion(false); setItemEditando(null); }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>

              {/* Formulario según tab */}
              {tabActiva === 'sucursales' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ID Sucursal (Único)</label>
                    <input 
                      type="text" 
                      value={itemEditando.id} 
                      onChange={e => setItemEditando({...itemEditando, id: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                      placeholder="ej: david_chiriqui"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Sucursal</label>
                    <input 
                      type="text" 
                      value={itemEditando.nombre} 
                      onChange={e => setItemEditando({...itemEditando, nombre: e.target.value})}
                      placeholder="ej: David Chiriquí"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prefijo Pedido</label>
                    <input 
                      type="text" 
                      value={itemEditando.prefijo} 
                      onChange={e => setItemEditando({...itemEditando, prefijo: e.target.value.toUpperCase()})}
                      placeholder="ej: DCH"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Equipo</label>
                    <select 
                      value={itemEditando.tipo_equipo} 
                      onChange={e => setItemEditando({...itemEditando, tipo_equipo: e.target.value})}
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="INDIVIDUAL">INDIVIDUAL (Asesor fijo)</option>
                      <option value="MULTIPLE">MULTIPLE (Equipo de varios asesores)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Canal por Defecto</label>
                    <input 
                      type="text" 
                      value={itemEditando.canal_defecto || 'Taller'} 
                      onChange={e => setItemEditando({...itemEditando, canal_defecto: e.target.value})}
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => guardarSucursal(itemEditando)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Guardar Sucursal en InsForge
                    </button>
                  </div>
                </div>
              )}

              {tabActiva === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={itemEditando.nombre} 
                      onChange={e => setItemEditando({...itemEditando, nombre: e.target.value})}
                      placeholder="Nombre del Asesor"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sucursal Asignada</label>
                    <select 
                      value={itemEditando.sucursal_id} 
                      onChange={e => setItemEditando({...itemEditando, sucursal_id: e.target.value})}
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    >
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre} ({s.prefijo})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Área / Departamento</label>
                    <select 
                      value={itemEditando.area} 
                      onChange={e => setItemEditando({...itemEditando, area: e.target.value})}
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="Taller">Taller</option>
                      <option value="Mostrador">Mostrador</option>
                      <option value="Repuestos">Repuestos</option>
                      <option value="Garantías">Garantías</option>
                      <option value="Chapistería">Chapistería</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cargo Oficial</label>
                    <input 
                      type="text" 
                      value={itemEditando.cargo || ''} 
                      onChange={e => setItemEditando({...itemEditando, cargo: e.target.value})}
                      placeholder="ej: Asesor Senior de Servicio"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={itemEditando.correo || ''} 
                      onChange={e => setItemEditando({...itemEditando, correo: e.target.value})}
                      placeholder="asesor@changanpanama.com"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => guardarPersonal(itemEditando)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Guardar Personal en InsForge
                    </button>
                  </div>
                </div>
              )}

              {tabActiva === 'bodegueros' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Código Bodeguero (CE...)</label>
                    <input 
                      type="text" 
                      value={itemEditando.codigo} 
                      onChange={e => setItemEditando({...itemEditando, codigo: e.target.value.toUpperCase()})}
                      placeholder="CE008"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={itemEditando.nombre} 
                      onChange={e => setItemEditando({...itemEditando, nombre: e.target.value})}
                      placeholder="Nombre del Bodeguero"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                    <input 
                      type="text" 
                      value={itemEditando.cargo} 
                      onChange={e => setItemEditando({...itemEditando, cargo: e.target.value})}
                      placeholder="Asistente de bodega"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => guardarBodeguero(itemEditando)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Guardar Bodeguero en InsForge
                    </button>
                  </div>
                </div>
              )}

              {tabActiva === 'modelos' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Modelo</label>
                    <input 
                      type="text" 
                      value={itemEditando.nombre} 
                      onChange={e => setItemEditando({...itemEditando, nombre: e.target.value})}
                      placeholder="ej: Deepal S07 2026"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                    <select 
                      value={itemEditando.categoria} 
                      onChange={e => setItemEditando({...itemEditando, categoria: e.target.value})}
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="SUV">SUV</option>
                      <option value="Sedán">Sedán</option>
                      <option value="Pickup">Pickup</option>
                      <option value="Eléctrico / Híbrido">Eléctrico / Híbrido</option>
                      <option value="Comercial">Comercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Años Compatibles</label>
                    <input 
                      type="text" 
                      value={itemEditando.anos_compatibles || ''} 
                      onChange={e => setItemEditando({...itemEditando, anos_compatibles: e.target.value})}
                      placeholder="2024-2027"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Motorización</label>
                    <input 
                      type="text" 
                      value={itemEditando.motor || ''} 
                      onChange={e => setItemEditando({...itemEditando, motor: e.target.value})}
                      placeholder="1.5T BlueCore / Dual Motor EREV"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Notas</label>
                    <input 
                      type="text" 
                      value={itemEditando.descripcion || ''} 
                      onChange={e => setItemEditando({...itemEditando, descripcion: e.target.value})}
                      placeholder="SUV eléctrico deportivo insignia"
                      className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => guardarModelo(itemEditando)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Guardar Modelo en InsForge
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BUSCADOR DE REGISTROS */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar en este catálogo..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Sincronizado con PostgreSQL
            </div>
          </div>

          {/* TABLA DE SUCURSALES */}
          {tabActiva === 'sucursales' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Prefijo</th>
                    <th className="p-3">Tipo Equipo</th>
                    <th className="p-3">Canal Defecto</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sucursales
                    .filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()) || s.prefijo.toLowerCase().includes(busqueda.toLowerCase()))
                    .map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">{s.nombre}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs">{s.prefijo}</span></td>
                      <td className="p-3">{s.tipo_equipo}</td>
                      <td className="p-3 text-slate-600">{s.canal_defecto || 'Taller'}</td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{s.descripcion_equipo || '-'}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => { setItemEditando(s); setModoEdicion(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1" 
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => eliminarItem('sucursales', s.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" 
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLA DE PERSONAL */}
          {tabActiva === 'personal' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Sucursal</th>
                    <th className="p-3">Área</th>
                    <th className="p-3">Cargo</th>
                    <th className="p-3">Correo</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personal
                    .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.cargo && p.cargo.toLowerCase().includes(busqueda.toLowerCase())))
                    .map(p => {
                      const sucursalNombre = sucursales.find(s => s.id === p.sucursal_id)?.nombre || p.sucursal_id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-800">{p.nombre}</td>
                          <td className="p-3 font-medium text-slate-600">{sucursalNombre}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {p.area}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{p.cargo || '-'}</td>
                          <td className="p-3 text-slate-500 font-mono text-xs">{p.correo || '-'}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => { setItemEditando(p); setModoEdicion(true); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1" 
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => eliminarItem('personal', p.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" 
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLA DE BODEGUEROS CEDIS */}
          {tabActiva === 'bodegueros' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Código PDT</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Cargo en CEDIS</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bodegueros
                    .filter(b => b.nombre.toLowerCase().includes(busqueda.toLowerCase()) || b.codigo.toLowerCase().includes(busqueda.toLowerCase()))
                    .map(b => (
                    <tr key={b.codigo} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700 bg-blue-50/50">
                        {b.codigo}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{b.nombre}</td>
                      <td className="p-3 text-slate-600">{b.cargo}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => { setItemEditando(b); setModoEdicion(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1" 
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => eliminarItem('bodegueros', b.codigo)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" 
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLA DE MODELOS */}
          {tabActiva === 'modelos' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Modelo</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Años</th>
                    <th className="p-3">Motorización</th>
                    <th className="p-3">Notas</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modelos
                    .filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (m.categoria && m.categoria.toLowerCase().includes(busqueda.toLowerCase())))
                    .map(m => (
                    <tr key={m.id || m.nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{m.nombre}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {m.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{m.anos_compatibles || '-'}</td>
                      <td className="p-3 text-slate-600">{m.motor || '-'}</td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{m.descripcion || '-'}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => { setItemEditando(m); setModoEdicion(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1" 
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => eliminarItem('modelos', m.id || m.nombre)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" 
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* PIE DEL MODAL */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Todos los cambios se reflejan inmediatamente en la nube y en los formularios.</span>
          </div>
          <button 
            onClick={onCerrar}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
