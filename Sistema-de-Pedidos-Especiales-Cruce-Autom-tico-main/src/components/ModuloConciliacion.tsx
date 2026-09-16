import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  UploadCloud, 
  Check, 
  X, 
  Layers, 
  ArrowRight,
  Search,
  Eye,
  FileCheck2
} from 'lucide-react';
import { 
  RegistroStaging, 
  ReporteConciliacion, 
  CategoriaClasificacion, 
  DecisionRevision,
  UsuarioActivo 
} from '../types/cedis';
import { ReconciliationEngine } from '../services/reconciliationEngine';
import { appsScriptClient } from '../services/appsScriptClient';

interface ModuloConciliacionProps {
  usuario: UsuarioActivo;
  onMigracionExitosa: () => void;
}

export const ModuloConciliacion: React.FC<ModuloConciliacionProps> = ({ usuario, onMigracionExitosa }) => {
  const [registros, setRegistros] = useState<RegistroStaging[]>(() => 
    ReconciliationEngine.generarLoteStagingIncidente()
  );
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [ejecutandoCommit, setEjecutandoCommit] = useState<boolean>(false);
  const [mensajeResultado, setMensajeResultado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const reporte: ReporteConciliacion = ReconciliationEngine.analizarStaging(registros);

  const actualizarDecision = (stagingId: string, nuevaDecision: DecisionRevision) => {
    setRegistros(prev => prev.map(r => {
      if (r.stagingId === stagingId) {
        return {
          ...r,
          decision: nuevaDecision,
          decisionTomadaPor: usuario.nombre,
          decisionNotas: `Decisión manual tomada el ${new Date().toLocaleTimeString()} por ${usuario.nombre}`
        };
      }
      return r;
    }));
  };

  const aplicarDecisionEnBloque = (categoria: CategoriaClasificacion, decision: DecisionRevision) => {
    setRegistros(prev => prev.map(r => {
      if (r.categoria === categoria) {
        return {
          ...r,
          decision: decision,
          decisionTomadaPor: usuario.nombre,
          decisionNotas: `Resolución en bloque para categoría ${categoria}`
        };
      }
      return r;
    }));
  };

  const handleEjecutarImportacion = async () => {
    if (usuario.rol !== 'ADMINISTRADOR_CEDIS') {
      setMensajeResultado({
        tipo: 'error',
        texto: 'Permisos insuficientes: Solo el Administrador CEDIS puede autorizar la migración canónica a producción.'
      });
      return;
    }

    const aprobados = registros.filter(r => r.decision === 'APROBAR_IMPORTACION' || r.decision === 'CONSERVAR_AMBOS');
    if (aprobados.length === 0) {
      setMensajeResultado({
        tipo: 'error',
        texto: 'No hay registros aprobados para importar. Revisa la tabla de staging y aprueba los pedidos legítimos.'
      });
      return;
    }

    setEjecutandoCommit(true);
    setMensajeResultado(null);

    const operationId = `OP-MIG-${Date.now()}`;
    const resultado = await appsScriptClient.confirmarImportacionStaging(aprobados, operationId);

    setEjecutandoCommit(false);
    if (resultado.success) {
      setMensajeResultado({
        tipo: 'exito',
        texto: `Migración exitosa: Se incorporaron canónicamente ${resultado.pedidosAgregados} pedidos y ${resultado.lineasAgregadas} líneas con operationId: ${operationId}. Bitácora de auditoría actualizada.`
      });
      onMigracionExitosa();
    } else {
      setMensajeResultado({
        tipo: 'error',
        texto: resultado.error || 'Error al ejecutar la migración a Google Sheets.'
      });
    }
  };

  const registrosFiltrados = registros.filter(r => {
    const coincideCat = filtroCategoria === 'TODOS' || r.categoria === filtroCategoria;
    const q = busqueda.toLowerCase().trim();
    const coincideTexto = !q || 
      r.pedidoId.toLowerCase().includes(q) ||
      r.cliente.toLowerCase().includes(q) ||
      r.codigoRepuesto.toLowerCase().includes(q) ||
      r.vin.toLowerCase().includes(q) ||
      r.cotizacion.toLowerCase().includes(q) ||
      r.sucursal.toLowerCase().includes(q);
    return coincideCat && coincideTexto;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado e Incidente */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Punto de Control: Incidente 9 vs 10 Septiembre 2026
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Fuente Canónica: Google Sheets API
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Módulo de Staging, Conciliación y Deduplicación Jerárquica
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Garantiza una migración controlada sin rehidratar duplicados históricos. Compara el respaldo validado de 900 pedidos del 9 de septiembre frente a los 1,486 pedidos del 10 de septiembre, clasificando el lote histórico de Excel (567 registros) y preservando los 5 pedidos ausentes sin borrado destructivo.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setRegistros(ReconciliationEngine.generarLoteStagingIncidente())}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Recargar datos de staging recuperados"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar Staging
            </button>
            <button
              onClick={handleEjecutarImportacion}
              disabled={ejecutandoCommit || usuario.rol !== 'ADMINISTRADOR_CEDIS'}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg ${
                usuario.rol !== 'ADMINISTRADOR_CEDIS'
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              {ejecutandoCommit ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Escribiendo en Sheets...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Aprobar Migración ({reporte.registrosAprobados})
                </>
              )}
            </button>
          </div>
        </div>

        {mensajeResultado && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 text-sm ${
            mensajeResultado.tipo === 'exito' 
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
          }`}>
            {mensajeResultado.tipo === 'exito' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">{mensajeResultado.texto}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de Métricas del Incidente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Control Base 9-Sep</span>
            <CheckCircle className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">900</div>
          <div className="text-xs text-slate-400 mt-1">Pedidos validados canónicamente</div>
        </div>

        <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>5 Ausentes Preservados</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">5</div>
          <div className="text-xs text-amber-400/80 mt-1">Ausentes el 10-sep, protegidos</div>
        </div>

        <div className="bg-slate-900/90 border border-orange-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-orange-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Lote Histórico Excel</span>
            <FileSpreadsheet className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-300">567</div>
          <div className="text-xs text-orange-400/80 mt-1">565 con fecha 31-ago (requieren visto bueno)</div>
        </div>

        <div className="bg-slate-900/90 border border-purple-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-purple-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Semánticos Detectados</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">274</div>
          <div className="text-xs text-purple-400/80 mt-1">Mismo cliente/vehículo (revisión humana)</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Aprobados Para Migrar</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">{reporte.registrosAprobados}</div>
          <div className="text-xs text-emerald-400/80 mt-1">{reporte.registrosPendientes} pendientes de decisión</div>
        </div>
      </div>

      {/* Reglas de Deduplicación y Decisiones en Bloque */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-300">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-400" />
          Acciones de Conciliación en Bloque y Jerarquía de Confianza
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => aplicarDecisionEnBloque('AUSENTE_PRESERVADO_9_SEP', 'CONSERVAR_AMBOS')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950 text-amber-200 border border-amber-800 hover:bg-amber-900 transition flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Preservar los 5 pedidos ausentes (Conservar Ambos)
          </button>
          <button
            onClick={() => aplicarDecisionEnBloque('NUEVO_CONFIRMADO', 'APROBAR_IMPORTACION')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950 text-emerald-200 border border-emerald-800 hover:bg-emerald-900 transition flex items-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Aprobar todos los Nuevos Confirmados post 9-Sep
          </button>
          <button
            onClick={() => aplicarDecisionEnBloque('LOTE_HISTORICO_EXCEL_PENDIENTE', 'APROBAR_IMPORTACION')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-950 text-orange-200 border border-orange-800 hover:bg-orange-900 transition flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-orange-400" />
            Aprobar Lote Histórico Excel tras Visto Bueno
          </button>
          <button
            onClick={() => aplicarDecisionEnBloque('POSIBLE_DUPLICADO_SEMANTICO', 'CONSERVAR_AMBOS')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-950 text-purple-200 border border-purple-800 hover:bg-purple-900 transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Marcar Semánticos como Reemplazos Legítimos
          </button>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por pedido, repuesto, cliente, VIN..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 whitespace-nowrap">Categoría:</span>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'AUSENTE_PRESERVADO_9_SEP', label: '5 Ausentes 9-Sep' },
            { id: 'LOTE_HISTORICO_EXCEL_PENDIENTE', label: 'Excel Histórico' },
            { id: 'POSIBLE_DUPLICADO_SEMANTICO', label: 'Semánticos (274)' },
            { id: 'NUEVO_CONFIRMADO', label: 'Nuevos' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFiltroCategoria(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                filtroCategoria === cat.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Revisión Humana de Staging */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-base">Tabla de Decisión Humana de Staging</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
              {registrosFiltrados.length} líneas
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Ningún registro será escrito en Google Sheets hasta que sea formalmente aprobado.
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ID Pedido / Fecha</th>
                <th className="px-4 py-3">Sucursal / Asesor</th>
                <th className="px-4 py-3">Cliente / Cotización</th>
                <th className="px-4 py-3">Vehículo / VIN</th>
                <th className="px-4 py-3">Repuesto Requerido</th>
                <th className="px-4 py-3">Cant.</th>
                <th className="px-4 py-3">Clasificación Incidente</th>
                <th className="px-4 py-3 text-center">Decisión Humana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron registros que coincidan con los filtros actuales.
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((reg) => (
                  <tr key={reg.stagingId} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{reg.pedidoId}</div>
                      <div className="text-xs text-slate-400">{reg.fechaRegistro}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{reg.sucursal}</div>
                      <div className="text-xs text-slate-400">{reg.colaborador}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200 truncate max-w-[180px]" title={reg.cliente}>
                        {reg.cliente}
                      </div>
                      <div className="text-xs text-slate-400">{reg.cotizacion || 'Sin Cotización'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{reg.modelo}</div>
                      <div className="text-xs font-mono text-slate-400">{reg.vin}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-sky-400">{reg.codigoRepuesto}</div>
                      <div className="text-xs text-slate-300 truncate max-w-[200px]" title={reg.descripcion}>
                        {reg.descripcion}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {reg.cantidadSolicitada}
                    </td>
                    <td className="px-4 py-3">
                      {reg.categoria === 'AUSENTE_PRESERVADO_9_SEP' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          Ausente 9-Sep
                        </span>
                      )}
                      {reg.categoria === 'LOTE_HISTORICO_EXCEL_PENDIENTE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          <FileSpreadsheet className="w-3 h-3" />
                          Excel 31-Ago
                        </span>
                      )}
                      {reg.categoria === 'POSIBLE_DUPLICADO_SEMANTICO' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Layers className="w-3 h-3" />
                          Semántico ({reg.similitudConPedidoId})
                        </span>
                      )}
                      {reg.categoria === 'NUEVO_CONFIRMADO' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />
                          Nuevo Confirmado
                        </span>
                      )}
                      <div className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-tight">
                        {reg.motivoClasificacion}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => actualizarDecision(reg.stagingId, 'APROBAR_IMPORTACION')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            reg.decision === 'APROBAR_IMPORTACION'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                          title="Aprobar para escritura canónica"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => actualizarDecision(reg.stagingId, 'CONSERVAR_AMBOS')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            reg.decision === 'CONSERVAR_AMBOS'
                              ? 'bg-sky-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                          title="Conservar ambos (es un pedido independiente legítimo)"
                        >
                          Conservar
                        </button>
                        <button
                          onClick={() => actualizarDecision(reg.stagingId, 'DESCARTAR_DUPLICADO')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            reg.decision === 'DESCARTAR_DUPLICADO'
                              ? 'bg-rose-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                          title="Descartar por duplicidad comprobada"
                        >
                          Descartar
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
  );
};
