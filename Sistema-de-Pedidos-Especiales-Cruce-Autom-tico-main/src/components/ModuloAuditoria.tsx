import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  FileText, 
  ShieldCheck,
  Tag
} from 'lucide-react';
import { AuditoriaKardex } from '../types/cedis';
import { appsScriptClient } from '../services/appsScriptClient';

export const ModuloAuditoria: React.FC = () => {
  const [auditoria] = useState<AuditoriaKardex[]>(() => appsScriptClient.getAuditoria());
  const [busqueda, setBusqueda] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('TODOS');

  const eventosFiltrados = auditoria.filter(ev => {
    const coincideAccion = filtroAccion === 'TODOS' || ev.accion === filtroAccion;
    const q = busqueda.toLowerCase().trim();
    const coincideTexto = !q ||
      ev.identificador.toLowerCase().includes(q) ||
      ev.usuarioNombre.toLowerCase().includes(q) ||
      ev.operationId.toLowerCase().includes(q) ||
      ev.notas.toLowerCase().includes(q);
    return coincideAccion && coincideTexto;
  });

  const exportarCSV = () => {
    const headers = ['auditoriaId', 'timestamp', 'usuarioId', 'usuarioNombre', 'accion', 'entidad', 'identificador', 'operationId', 'notas'];
    const rows = eventosFiltrados.map(e => [
      e.auditoriaId,
      `"${e.timestamp}"`,
      e.usuarioId,
      `"${e.usuarioNombre}"`,
      e.accion,
      e.entidad,
      e.identificador,
      e.operationId,
      `"${(e.notas || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Auditoria_Kardex_CEDIS_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Pestaña Canónica: Auditoria_Kardex
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
              Registro Inmutable (Append-Only)
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-sky-400" />
            Bitácora Oficial de Auditoría y Kardex
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Cada creación de pedido, asignación atómica de inventario, despacho físico a sucursal, ajuste de merma o conciliación de staging queda grabado con usuario, fecha, clave de idempotencia (operationId) y valores anteriores/nuevos.
          </p>
        </div>

        <button
          onClick={exportarCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
        >
          <Download className="w-4 h-4 text-sky-400" />
          Exportar Bitácora CSV
        </button>
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por identificador, usuario, operationId..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 whitespace-nowrap">Acción:</span>
          {[
            { id: 'TODOS', label: 'Todas' },
            { id: 'CREACION_PEDIDO', label: 'Creaciones' },
            { id: 'ASIGNACION_STOCK', label: 'Asignaciones' },
            { id: 'DESPACHO_FISICO', label: 'Despachos' },
            { id: 'IMPORTACION_CONCILIACION', label: 'Conciliación' },
            { id: 'AJUSTE_MERMA', label: 'Mermas' }
          ].map((act) => (
            <button
              key={act.id}
              onClick={() => setFiltroAccion(act.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                filtroAccion === act.id
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            Eventos Registrados ({eventosFiltrados.length})
          </div>
          <div className="text-xs text-slate-400">
            Zona horaria oficial: América / Panamá (GMT-5)
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Acción Ejecutada</th>
                <th className="px-4 py-3">Entidad / Identificador</th>
                <th className="px-4 py-3">Clave de Operación (operationId)</th>
                <th className="px-4 py-3">Notas Operativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                eventosFiltrados.map((ev) => (
                  <tr key={ev.auditoriaId} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                      {ev.timestamp}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{ev.usuarioNombre}</div>
                      <div className="text-xs text-slate-400 font-mono">{ev.usuarioId}</div>
                    </td>
                    <td className="px-4 py-3">
                      {ev.accion === 'CREACION_PEDIDO' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Creación Pedido
                        </span>
                      )}
                      {ev.accion === 'ASIGNACION_STOCK' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Asignación Stock
                        </span>
                      )}
                      {ev.accion === 'DESPACHO_FISICO' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Despacho Físico
                        </span>
                      )}
                      {ev.accion === 'IMPORTACION_CONCILIACION' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Conciliación Staging
                        </span>
                      )}
                      {ev.accion === 'AJUSTE_MERMA' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Ajuste de Merma
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400">{ev.entidad}</div>
                      <div className="font-semibold text-white font-mono text-xs">{ev.identificador}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-400">
                      {ev.operationId}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-xs truncate" title={ev.notas}>
                      {ev.notas}
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
