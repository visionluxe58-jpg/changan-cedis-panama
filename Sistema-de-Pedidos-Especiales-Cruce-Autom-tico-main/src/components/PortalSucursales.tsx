import { SecurityUtils } from '../utils/security';
import { appsScriptClient, USUARIOS_OFICIALES } from '../services/appsScriptClient';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ExternalLink, 
  Share2, 
  Filter, 
  Car, 
  Tag, 
  ShieldCheck, 
  ChevronRight, 
  Boxes, 
  ArrowRight, 
  UserCheck, 
  Store, 
  Zap, 
  Copy, 
  Check, 
  Download, 
  Paperclip, 
  Eye, 
  FileSpreadsheet, 
  Printer,
  QrCode,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';
import { UsuarioActivo, FilaMatrizCentral, DPLDetalle, ManifiestoDPL } from '../types/cedis';
import { FormularioRequisicion } from './FormularioRequisicion';
import { PantallaBienvenidaSucursal } from './PantallaBienvenidaSucursal';
import { ModalComprobantePDF, ComprobantePedidoData } from './ModalComprobantePDF';
import { ModalEtiquetaQR } from './ModalEtiquetaQR';
import { generarDatosEtiqueta, EtiquetaRepuestoData } from '../services/etiquetasQRService';
import { ModalRastreadorUniversal } from './ModalRastreadorUniversal';
import { SUCURSALES_PORTAL, ConfiguracionSucursal } from '../data/sucursalesData';

interface PortalSucursalesProps {
  usuario: UsuarioActivo;
  onCambiarUsuario: (usuario: UsuarioActivo) => void;
  filas: FilaMatrizCentral[];
  inventario: DPLDetalle[];
  manifiestos?: ManifiestoDPL[];
  onPedidoCreado: (pedidoId: string) => void;
  onAbrirMatrizCentral?: () => void;
  onAbrirModalCompartir?: () => void;
  tabExterna?: 'nueva' | 'historial';
  onCambiarTab?: (tab: 'nueva' | 'historial') => void;
}

export const PortalSucursales: React.FC<PortalSucursalesProps> = ({
  usuario,
  onCambiarUsuario,
  filas,
  inventario,
  manifiestos = [],
  onPedidoCreado,
  onAbrirModalCompartir,
  tabExterna,
  onCambiarTab
}) => {
  const esAdmin = usuario.rol === 'ADMINISTRADOR_CEDIS';
  // Estado de configuraciÃ³n de sucursal
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<boolean>(() => {
    const guardada = localStorage.getItem('changan_sucursal_configurada');
    return Boolean(guardada && usuario.sucursal && !usuario.sucursal.includes('Central'));
  });

  const [tabActiva, setTabActiva] = useState<'nueva' | 'historial'>('nueva');
  const [modalPdfAbierto, setModalPdfAbierto] = useState<boolean>(false);
  const [modalRastreadorAbierto, setModalRastreadorAbierto] = useState<boolean>(false);
  const [modalPinAdminAbierto, setModalPinAdminAbierto] = useState<boolean>(false);
  const [pinAdminPortal, setPinAdminPortal] = useState<string>('');
  const [errorPinPortal, setErrorPinPortal] = useState<string>('');
  const [codigoInicialRastreo, setCodigoInicialRastreo] = useState<string>('');
  const [comprobantePdfData, setComprobantePdfData] = useState<ComprobantePedidoData | null>(null);
  const [modalEtiquetasData, setModalEtiquetasData] = useState<EtiquetaRepuestoData[] | null>(null);
  const [copiadoEnlace, setCopiadoEnlace] = useState<boolean>(false);

  // Modal para ver adjunto en el historial
  const [modalAdjuntoHistorial, setModalAdjuntoHistorial] = useState<{ base64: string; nombre: string; tipo: string } | null>(null);

  // Filtros del historial descargable
  const [filtroModelo, setFiltroModelo] = useState<string>('TODOS');
  const [busquedaPedidos, setBusquedaPedidos] = useState<string>('');

  // Sincronizar pestaa externa (ej: cuando se registra un pedido y se navega al libro de pedidos)
  useEffect(() => {
    if (tabExterna && tabExterna !== tabActiva) {
      setTabActiva(tabExterna);
    }
  }, [tabExterna]);

  const copiarEnlacePortal = () => {
    const url = window.location.origin + window.location.pathname + '?portal=sucursales';
    navigator.clipboard.writeText(url);
    setCopiadoEnlace(true);
    setTimeout(() => setCopiadoEnlace(false), 2500);
  };


  const handleValidarPinPortal = (e: React.FormEvent) => {
    e.preventDefault();
    const pinLimpio = pinAdminPortal.trim();
    if (pinLimpio === '2026' || pinLimpio === 'admin' || pinLimpio === 'CEDIS' || pinLimpio === 'cedis2026') {
      const admin = USUARIOS_OFICIALES.find(u => u.rol === 'ADMINISTRADOR_CEDIS') || USUARIOS_OFICIALES[0];
      localStorage.removeItem('changan_sucursal_configurada');
      onCambiarUsuario(admin);
      setModalPinAdminAbierto(false);
      setPinAdminPortal('');
      setErrorPinPortal('');
      window.location.href = window.location.pathname;
    } else {
      setErrorPinPortal('PIN incorrecto. Ingresa la clave autorizada.');
    }
  };
  const abrirRastreadorUniversal = (codigo = '') => {
    setCodigoInicialRastreo(codigo);
    setModalRastreadorAbierto(true);
  };

  const handleSeleccionarSucursalDesdeBienvenida = (suc: ConfiguracionSucursal, asesorSugerido?: string, canalSugerido?: string) => {
    const asesor = asesorSugerido || (suc.asesorFijo?.nombre || 'Asesor de Servicio');
    const canal = canalSugerido || suc.canalDefecto;

    onCambiarUsuario({
      ...usuario,
      sucursal: suc.nombre,
      nombre: asesor,
      canal: canal,
      rol: 'SUCURSAL_ASESOR'
    });

    localStorage.setItem('changan_sucursal_configurada', suc.nombre);
    setSucursalSeleccionada(true);
  };

  const handleReabrirSeleccionSucursal = () => {
    setSucursalSeleccionada(false);
  };

  // Filtrar filas estrictamente para la sucursal del asesor
  const filasDeMiSucursal = useMemo(() => {
    const suc = (usuario.sucursal || '').toUpperCase();
    return filas.filter(f => (f.sucursal || '').toUpperCase() === suc);
  }, [filas, usuario.sucursal]);

  // Historial agrupado por Pedido
  const pedidosAgrupados = useMemo(() => {
    const mapa = new Map<string, {
      pedidoId: string;
      cabecera: FilaMatrizCentral;
      items: FilaMatrizCentral[];
      totalPiezas: number;
      totalDespachadas: number;
      estatusGlobal: string;
    }>();

    filasDeMiSucursal.forEach(f => {
      if (!mapa.has(f.pedidoId)) {
        mapa.set(f.pedidoId, {
          pedidoId: f.pedidoId,
          cabecera: f,
          items: [],
          totalPiezas: 0,
          totalDespachadas: 0,
          estatusGlobal: f.estatusGeneral || 'Registrado'
        });
      }

      const p = mapa.get(f.pedidoId)!;
      p.items.push(f);
      p.totalPiezas += (f.cantidadSolicitada || 1);
      p.totalDespachadas += (f.cantidadDespachada || 0);
    });

    return Array.from(mapa.values());
  }, [filasDeMiSucursal]);

  // Pedidos filtrados para el buscador
  const pedidosFiltrados = useMemo(() => {
    return pedidosAgrupados.filter(p => {
      const matchModelo = filtroModelo === 'TODOS' || (p.cabecera.modeloChangan || '').toUpperCase().includes(filtroModelo.toUpperCase());
      const q = busquedaPedidos.trim().toUpperCase();
      const matchTexto = !q || 
        p.pedidoId.toUpperCase().includes(q) ||
        (p.cabecera.cliente || '').toUpperCase().includes(q) ||
        (p.cabecera.placa || '').toUpperCase().includes(q) ||
        (p.cabecera.cotizacion || '').toUpperCase().includes(q) ||
        (p.cabecera.vin || '').toUpperCase().includes(q) ||
        p.items.some(it => (it.codigoRepuesto || '').toUpperCase().includes(q) || (it.descripcionOficial || '').toUpperCase().includes(q));

      return matchModelo && matchTexto;
    });
  }, [pedidosAgrupados, filtroModelo, busquedaPedidos]);

  // Feed lateral
  const feedLateral = useMemo(() => {
    return pedidosAgrupados.slice(0, 8).map(p => ({
      pedidoId: p.pedidoId,
      cliente: p.cabecera.cliente || 'Cliente Changan',
      modelo: p.cabecera.modeloChangan || 'CS35 Plus',
      placa: p.cabecera.placa || 'S/P',
      estatus: p.estatusGlobal,
      fecha: p.cabecera.fechaCreacion || 'Reciente',
      itemsCount: p.items.length,
      archivoAdjuntoBase64: p.cabecera.archivoAdjuntoBase64,
      nombreArchivoAdjunto: p.cabecera.nombreArchivoAdjunto
    }));
  }, [pedidosAgrupados]);

  // Descargar Historial en CSV/Excel
  const descargarHistorialExcel = () => {
    if (pedidosAgrupados.length === 0) {
      alert('No hay pedidos registrados en el historial de esta sucursal para descargar.');
      return;
    }

    const headers = [
      'ID Pedido',
      'Fecha CreaciÃ³n',
      'Sucursal',
      'Asesor',
      'Tipo de RequisiciÃ³n',
      'Cliente',
      'Placa',
      'Modelo Changan',
      'VIN / Chasis',
      'CotizaciÃ³n / OR',
      'CÃ³digo Repuesto',
      'DescripciÃ³n Pieza',
      'Cantidad Solicitada',
      'Cantidad Despachada',
      'Saldo Pendiente',
      'Estado Pago',
      'Estatus LogÃ­stico'
    ];

    const rows: string[][] = [];

    pedidosAgrupados.forEach(p => {
      p.items.forEach(it => {
        rows.push([
          SecurityUtils.sanitizeCSVCell(p.pedidoId),
          SecurityUtils.sanitizeCSVCell(p.cabecera.fechaCreacion || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.sucursal || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.colaborador || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.tipoPedido || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.cliente || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.placa || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.modeloChangan || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.vin || ''),
          SecurityUtils.sanitizeCSVCell(p.cabecera.cotizacion || ''),
          SecurityUtils.sanitizeCSVCell(it.codigoRepuesto || ''),
          SecurityUtils.sanitizeCSVCell(it.descripcionOficial || ''),
          String(SecurityUtils.validateQuantity(it.cantidadSolicitada, 1, 999)),
          String(SecurityUtils.validateQuantity(it.cantidadDespachada, 0, 999)),
          String(SecurityUtils.validateQuantity(it.saldoPendiente, 0, 999)),
          SecurityUtils.sanitizeCSVCell(p.cabecera.estadoPago || 'Aprobado'),
          SecurityUtils.sanitizeCSVCell(p.estatusGlobal)
        ]);
      });
    });

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historial_Requisiciones_Changan_${usuario.sucursal.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  
  const handleGenerarEtiquetasPedido = (pedido: typeof pedidosAgrupados[0]) => {
    const etiquetas: EtiquetaRepuestoData[] = [];
    const c = pedido.cabecera;
    pedido.items.forEach(it => {
      const cant = it.cantidadSolicitada || 1;
      for (let s = 1; s <= cant; s++) {
        etiquetas.push(generarDatosEtiqueta(
          pedido.pedidoId,
          it.codigoRepuesto,
          it.descripcionOficial,
          c.sucursal || usuario.sucursal || 'Calle 50',
          s,
          cant,
          (it as any).contenedor,
          (it as any).pallet
        ));
      }
    });
    if (etiquetas.length > 0) {
      setModalEtiquetasData(etiquetas);
    }
  };

  const handleDescargarComprobantePdf = (pedido: typeof pedidosAgrupados[0]) => {
    const c = pedido.cabecera;
    const datosPdf: ComprobantePedidoData = {
      pedidoId: pedido.pedidoId,
      cliente: c.cliente || 'Cliente General',
      sucursal: c.sucursal || usuario.sucursal,
      asesor: c.colaborador || usuario.nombre,
      cotizacion: c.cotizacion || 'N/A',
      fechaEmision: c.fechaCreacion || new Date().toLocaleDateString('es-PA'),
      modeloAuto: c.modeloChangan || 'CS35 Plus',
      placa: c.placa || 'S/P',
      canal: c.tipoPedido || 'Taller',
      tipoPedido: c.tipoPedido || 'Pedido Especial (Regular)',
      estadoPago: c.estadoPago || 'Aprobado',
      vin: c.vin,
      observaciones: c.observaciones,
      idTransmision: 'TX-' + pedido.pedidoId,
      fechaGenerado: new Date().toLocaleString(),
      piezas: pedido.items.map(it => ({
        codigo: it.codigoRepuesto,
        descripcion: it.descripcionOficial,
        cantidad: it.cantidadSolicitada
      }))
    };

    setComprobantePdfData(datosPdf);
    setModalPdfAbierto(true);
  };

  if (!sucursalSeleccionada) {
    return (
      <PantallaBienvenidaSucursal
        onSeleccionarSucursal={handleSeleccionarSucursalDesdeBienvenida}
        sucursalActual={usuario.sucursal}
        onAbrirModalCompartir={onAbrirModalCompartir || copiarEnlacePortal}
      />
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#0b121e] text-slate-100 font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR ERP - FULL SCREEN / PANTALLA COMPLETA                       */}
      {/* ========================================================================= */}
      <header className="w-full bg-[#0f172a] border-b border-slate-700/80 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
        
        {/* Left: Brand & Sucursal Activa */}
        <div className="flex items-center gap-3.5">
          <div 
            onClick={handleReabrirSeleccionSucursal} 
            title="Cambiar de sucursal"
            className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shadow cursor-pointer hover:bg-blue-600/30 transition-all"
          >
            <Store className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-wide text-white uppercase">
                CHANGAN AUTOMOBILE // DMS REQUISICIONES
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {usuario.sucursal.toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Canal: {usuario.canal} | Asesor: <strong className="text-slate-200">{usuario.nombre}</strong>
            </span>
          </div>
        </div>

        {/* Center: Live Enlace */}
        <div className="hidden xl:flex items-center gap-3">
          <div className="px-3 py-1 rounded-md bg-[#1e293b] border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>RED CEDIS: ONLINE</span>
          </div>
          <div className="px-3 py-1 rounded-md bg-[#1e293b] border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>PEDIDOS SUCURSAL: <strong className="text-white">{pedidosAgrupados.length}</strong></span>
          </div>
        </div>

        {/* Right: Navigation Tabs ERP */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 bg-[#1e293b] p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => { setTabActiva('nueva'); if (onCambiarTab) onCambiarTab('nueva'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                tabActiva === 'nueva'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              + Nueva RequisiciÃ³n
            </button>
            <button
              type="button"
              onClick={() => { setTabActiva('historial'); if (onCambiarTab) onCambiarTab('historial'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                tabActiva === 'historial'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Libro de Pedidos ({pedidosAgrupados.length})
            </button>
          </nav>

          <button
            type="button"
            onClick={() => abrirRastreadorUniversal()}
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1e293b] hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Rastrear
          </button>

          {/* BotÃ³n para regresar al panel general CEDIS */}
          <button
            type="button"
            onClick={() => {
              if (esAdmin) {
                if (onAbrirMatrizCentral) onAbrirMatrizCentral();
              } else {
                setModalPinAdminAbierto(true);
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 rounded-lg border border-emerald-500/40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Regresar a Inicio / Panel Central CEDIS"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Panel CEDIS</span>
          </button>

          {/* Compartir enlace de asesores */}
          <button
            type="button"
            onClick={copiarEnlacePortal}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1e293b] hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Copiar enlace para asesores"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">{copiadoEnlace ? 'Copiado' : 'Compartir'}</span>
          </button>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* 2. BODY WORKSPACE: FULL SCREEN A PANTALLA COMPLETA                        */}
      {/* ========================================================================= */}
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {tabActiva === 'nueva' ? (
          <FormularioRequisicion
            usuario={usuario}
            onPedidoCreado={onPedidoCreado}
            onTransmisionCompleta={(datos) => {
              setComprobantePdfData(datos);
            }}
            onSolicitarCambioSucursal={handleReabrirSeleccionSucursal}
            onAbrirModalCompartir={copiarEnlacePortal}
            onAbrirRastreador={() => abrirRastreadorUniversal()}
            pedidosRecientes={feedLateral}
            onSeleccionarPedidoReciente={(id) => abrirRastreadorUniversal(id)}
            onVerHistorialDescargable={() => setTabActiva('historial')}
          />
        ) : (
          <div className="w-full flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-4 overflow-y-auto bg-[#0b121e]">
            
            {/* BARRA SUPERIOR DEL HISTORIAL ERP */}
            <div className="w-full bg-[#0f172a] border border-slate-700/80 p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wide">
                    Libro Oficial de Requisiciones - {usuario.sucursal}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {pedidosFiltrados.length} REGISTROS
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta de trazabilidad, estatus logÃ­stico y descarga de comprobantes oficiales de despacho en formato PDF o Excel.
                </p>
              </div>

              {/* Botones de acciÃ³n y filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    alert('Iniciando sincronizaciÃ³n completa con Google Sheets...');
                    const res = await appsScriptClient.sincronizarTodaLaGoogleSheet();
                    alert(res.mensaje);
                    window.location.reload();
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
                  title="Sincronizar toda la Google Sheet en vivo"
                >
                  <RefreshCw className="w-4 h-4" /> SINCRONIZAR GOOGLE SHEETS
                </button>

                <button
                  type="button"
                  onClick={descargarHistorialExcel}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
                  title="Exportar a Excel (CSV)"
                >
                  <FileSpreadsheet className="w-4 h-4" /> EXPORTAR A EXCEL (CSV)
                </button>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaPedidos}
                    onChange={(e) => setBusquedaPedidos(e.target.value)}
                    placeholder="Buscar por Folio, Cliente, Placa o CÃ³d. Parte..."
                    className="pl-9 pr-3 py-1.5 rounded-lg bg-[#1e293b] border border-slate-700 text-xs text-white placeholder-slate-500 w-72 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* TABLA ERP DE PANTALLA COMPLETA */}
            <div className="w-full flex-1 overflow-x-auto rounded-xl border border-slate-700/80 bg-[#0f172a] shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1e293b] border-b border-slate-700 text-[11px] font-mono text-slate-300 uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3 px-4">FOLIO REQUISICIÃ“N</th>
                    <th className="py-3 px-4">FECHA Y ASESOR</th>
                    <th className="py-3 px-4">CLIENTE / VEHÃCULO</th>
                    <th className="py-3 px-4">LÃNEAS SOLICITADAS</th>
                    <th className="py-3 px-4 text-center">TIPO / PRIORIDAD</th>
                    <th className="py-3 px-4 text-center">ESTADO CEDIS</th>
                    <th className="py-3 px-4 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No se encontraron requisiciones registradas con el criterio de bÃºsqueda.
                      </td>
                    </tr>
                  ) : (
                    pedidosFiltrados.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-300">
                          <span className="block text-sm">{p.pedidoId}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            OR: {p.cabecera.cotizacion || 'S/N'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">{p.cabecera.fechaCreacion || 'Reciente'}</div>
                          <div className="text-[11px] text-slate-400">{p.cabecera.colaborador}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{p.cabecera.cliente || 'Cliente General'}</div>
                          <div className="text-[11px] text-blue-400 font-mono">
                            {p.cabecera.modeloChangan} â€¢ {p.cabecera.placa}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {p.items.slice(0, 2).map((it, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-300 font-bold">{it.codigoRepuesto}</span>
                                <span className="text-slate-400 text-[11px]">({it.cantidadSolicitada} pza)</span>
                              </div>
                            ))}
                            {p.items.length > 2 && (
                              <span className="text-[10px] text-blue-400">+{p.items.length - 2} partes mÃ¡s...</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            (p.cabecera.tipoPedido || '').includes('Emergencia') || (p.cabecera.tipoPedido || '').includes('VOR')
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            {(p.cabecera.tipoPedido || '').includes('Emergencia') ? 'VOR Urgente' : 'Normal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                            {p.estatusGlobal}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDescargarComprobantePdf(p)}
                              className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Ver Comprobante Oficial PDF"
                            >
                              <Printer className="w-3.5 h-3.5" /> PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirRastreadorUniversal(p.pedidoId)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Rastrear despacho"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* MODAL ETIQUETAS QR OFICIALES CHANGAN */}
      {modalEtiquetasData && modalEtiquetasData.length > 0 && (
        <ModalEtiquetaQR
          isOpen={true}
          onClose={() => setModalEtiquetasData(null)}
          etiquetas={modalEtiquetasData}
        />
      )}

      {/* MODAL DEL COMPROBANTE PDF */}
      {modalPdfAbierto && comprobantePdfData && (
        <ModalComprobantePDF
          isOpen={modalPdfAbierto}
          onClose={() => setModalPdfAbierto(false)}
          datos={comprobantePdfData}
          onNuevoPedido={() => {
            setModalPdfAbierto(false);
            setTabActiva('nueva');
          }}
          onVerMisPedidos={() => {
            setModalPdfAbierto(false);
            setTabActiva('historial');
          }}
        />
      )}
      {/* MODAL PIN ADMINISTRADOR CEDIS - Regreso al panel central */}
      {modalPinAdminAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Modo Administrador</h3>
                  <p className="text-[11px] text-slate-400">Regresar al panel general CEDIS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setModalPinAdminAbierto(false); setErrorPinPortal(''); setPinAdminPortal(''); }}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleValidarPinPortal} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PIN o Clave de Administrador
                </label>
                <input
                  type="password"
                  value={pinAdminPortal}
                  onChange={(e) => { setPinAdminPortal(e.target.value); setErrorPinPortal(''); }}
                  placeholder="Ingresa PIN (ej. 2026)"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                />
                {errorPinPortal && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium">{errorPinPortal}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalPinAdminAbierto(false); setErrorPinPortal(''); setPinAdminPortal(''); }}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Ingresar como Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL RASTREADOR UNIVERSAL */}
      {modalRastreadorAbierto && (
        <ModalRastreadorUniversal
          isOpen={modalRastreadorAbierto}
          onClose={() => setModalRastreadorAbierto(false)}
          filas={filas}
          inventario={inventario}
          codigoInicial={codigoInicialRastreo}
          
        />
      )}

    </div>
  );
};


