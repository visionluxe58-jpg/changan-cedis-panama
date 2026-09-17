import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar, ModuloActivo } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { FormularioRequisicion } from './components/FormularioRequisicion';
import { MatrizCentral } from './components/MatrizCentral';
import { ModuloPDTMovil } from './components/ModuloPDTMovil';
import { KardexStock } from './components/KardexStock';
import { ModuloConciliacion } from './components/ModuloConciliacion';
import { ModuloAuditoria } from './components/ModuloAuditoria';
import { CruceDPL } from './components/CruceDPL';
import { PortalSucursales } from './components/PortalSucursales';
import { DashboardKPIs } from './components/DashboardKPIs';
import { ReporteFabrica } from './components/ReporteFabrica';
import { ModalDPL } from './components/ModalDPL';
import { ModalCompartir } from './components/ModalCompartir';
import { ModalGoogleSheets } from './components/ModalGoogleSheets';
import { ModalCatalogosMaestros } from './components/ModalCatalogosMaestros';
import { ModalRastreadorUniversal } from './components/ModalRastreadorUniversal';
import { TerminalMovilPDT } from './components/TerminalMovilPDT';
import { ErrorBoundary } from './components/ErrorBoundary';
import { appsScriptClient, USUARIOS_OFICIALES } from './services/appsScriptClient';
import { 
  UsuarioActivo, 
  FilaMatrizCentral, 
  DPLDetalle, 
  DPLManifiesto, 
  ContenedorManifiesto, 
  DetalleDPL,
  AuditoriaKardex,
  SolicitudCabecera,
  DetalleRepuesto
} from './types/cedis';
import { Bell, X, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { playOrderAlertSound } from './utils/apiSync';

export default function App() {
  // Detección inmediata de Modo PDT Exclusivo (Kiosk para Bodegueros / Sucursales)
  const esModoPDTExclusivo = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const pdt = params.get('pdt') || params.get('modo');
      const op = params.get('operador') || params.get('op');
      return pdt === 'cedis' || pdt === 'pdt-cedis' || Boolean(op);
    } catch (e) {
      return false;
    }
  }, []);

  const [usuarioActivo, setUsuarioActivo] = useState<UsuarioActivo>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('admin') === '1') {
        const admin = USUARIOS_OFICIALES.find(u => u.rol === 'ADMINISTRADOR_CEDIS') || USUARIOS_OFICIALES[0];
        appsScriptClient.setUsuarioActivo(admin);
        return admin;
      }
    }
    return appsScriptClient.getUsuarioActivo();
  });
  const esAsesor = usuarioActivo.rol === 'SUCURSAL_ASESOR';

  // Control del Modulo Activo con Seguridad de Rol
  const [moduloActivo, setModuloActivo] = useState<ModuloActivo>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modulo') === 'pdt' || params.get('pdt') === '1') {
        return 'pdt';
      }
      if (params.get('portal') === 'sucursales' || params.get('pdt') === 'sucursal' || params.get('modo') === 'sucursal') {
        return 'portal';
      }
    }
    const usr = appsScriptClient.getUsuarioActivo();
    return usr.rol === 'SUCURSAL_ASESOR' ? 'formulario' : 'dashboard';
  });

  // Estado del Sidebar retráctil estilo Modernize
  const [sidebarColapsado, setSidebarColapsado] = useState<boolean>(false);

  // Datos canonicos sincronizados
  const [matriz, setMatriz] = useState<FilaMatrizCentral[]>(() => appsScriptClient.getMatrizCentral());
  const [inventario, setInventario] = useState<DPLDetalle[]>(() => appsScriptClient.getDPLDetalle());
  const [manifiestos, setManifiestos] = useState<DPLManifiesto[]>(() => appsScriptClient.getManifiestos());
  const [auditoria, setAuditoria] = useState<AuditoriaKardex[]>(() => appsScriptClient.getAuditoria());
  const [cabeceras, setCabeceras] = useState<SolicitudCabecera[]>(() => appsScriptClient.getCabeceras());
  const [detalles, setDetalles] = useState<DetalleRepuesto[]>(() => appsScriptClient.getDetalles());

  // Modales
  const [modalDPLAbierto, setModalDPLAbierto] = useState<boolean>(false);
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState<boolean>(false);
  const [tabCompartirInicial, setTabCompartirInicial] = useState<'pdt' | 'portal'>('pdt');
  const [modalSheetsAbierto, setModalSheetsAbierto] = useState<boolean>(false);
  const [modalCatalogosAbierto, setModalCatalogosAbierto] = useState<boolean>(false);
  const [modalRastreadorAbierto, setModalRastreadorAbierto] = useState<boolean>(false);
  const [modalPDTAbierto, setModalPDTAbierto] = useState<boolean>(false);
  const [codigoRastreoDirecto, setCodigoRastreoDirecto] = useState<string>('');

  // Alerta de Nuevo Pedido en Vivo para CEDIS Central y Sucursales
  const [alertaNuevoPedido, setAlertaNuevoPedido] = useState<{
    pedidoId: string;
    sucursal: string;
    cliente: string;
    totalPiezas?: number;
    fecha?: string;
  } | null>(null);

  // Toast
  const [notificacion, setNotificacion] = useState<{
    tipo: 'exito' | 'error' | 'info';
    mensaje: string;
  } | null>(null);

  const mostrarNotificacion = (tipo: 'exito' | 'error' | 'info', mensaje: string) => {
    setNotificacion({ tipo, mensaje });
    setTimeout(() => {
      setNotificacion(null);
    }, 4500);
  };

  const recargarDatos = useCallback(() => {
    appsScriptClient.recargarDatosLocales();
    setMatriz(appsScriptClient.getMatrizCentral());
    setInventario(appsScriptClient.getDPLDetalle());
    setManifiestos(appsScriptClient.getManifiestos());
    setAuditoria(appsScriptClient.getAuditoria());
    setCabeceras(appsScriptClient.getCabeceras());
    setDetalles(appsScriptClient.getDetalles());
  }, []);

  const [sincronizandoNube, setSincronizandoNube] = useState<boolean>(false);

  const handleSincronizarNube = async () => {
    setSincronizandoNube(true);
    mostrarNotificacion('info', 'Sincronizando pedidos e inventario con Google Sheets...');
    try {
      const res = await appsScriptClient.fetchInitialData(true);
      if (res.success && res.totalCargado) {
        recargarDatos();
        mostrarNotificacion('exito', `Sincronizacion exitosa: ${res.totalCargado.detalles} repuestos (${res.totalCargado.cabeceras} pedidos) cargados desde Google Sheets.`);
      } else {
        mostrarNotificacion('error', res.error || 'No se pudo sincronizar con Google Sheets.');
      }
    } catch (err: any) {
      mostrarNotificacion('error', `Error de sincronizacion: ${err.message || err}`);
    } finally {
      setSincronizandoNube(false);
    }
  };

  
  // Detección de Acceso Rápido por Enlace Compartido (?pdt=cedis o ?pdt=sucursal)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pdtParam = params.get('pdt') || params.get('modo');
      const opParam = params.get('operador') || params.get('op');
      if (pdtParam === 'cedis' || pdtParam === 'pdt-cedis' || opParam) {
        const usrCedis = USUARIOS_OFICIALES.find(u => u.rol === 'ADMINISTRADOR_CEDIS') || USUARIOS_OFICIALES[0];
        handleCambiarUsuario(usrCedis);
        setModalPDTAbierto(true);
      } else if (pdtParam === 'sucursal' || pdtParam === 'true' || pdtParam === 'pdt') {
        const usrAsesor = USUARIOS_OFICIALES.find(u => u.rol === 'SUCURSAL_ASESOR') || USUARIOS_OFICIALES[1];
        handleCambiarUsuario(usrAsesor);
        setModuloActivo('portal');
      }
    } catch (e) {
      console.warn('Error leyendo query params:', e);
    }
  }, []);

  useEffect(() => {
    if (esModoPDTExclusivo) return;
    // PURGA AUTOMÁTICA ESTRICTA: Eliminar permanentemente del navegador cualquier pedido o cliente demo/prueba
    try {
      ['changan_pedidos_cabecera', 'changan_pedidos_detalle'].forEach(k => {
        const item = localStorage.getItem(k);
        if (item && (item.includes('TEST') || item.includes('PRUEBA') || item.includes('PED-CH-2044'))) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
              const clean = parsed.filter((x: any) => {
                const s = (x.pedidoId || x.cliente || x.codigoRepuesto || '').toUpperCase();
                return !s.includes('TEST') && !s.includes('PRUEBA') && !s.includes('DEMO') && x.pedidoId !== 'PED-CH-2044';
              });
              localStorage.setItem(k, JSON.stringify(clean));
            }
          } catch (e) {}
        }
      });
      const alerta = localStorage.getItem('changan_alerta_nuevo_pedido');
      if (alerta && (alerta.includes('TEST') || alerta.includes('PRUEBA'))) {
        localStorage.removeItem('changan_alerta_nuevo_pedido');
      }
    } catch (e) {}

    recargarDatos();

    // Sincronizacion Canonica al inicio
    const cfg = appsScriptClient.getConfig();
    if (cfg.webAppUrl && !cfg.modoOfflineSimulado) {
      setSincronizandoNube(true);
      appsScriptClient.fetchInitialData(true).then(res => {
        if (res.success && res.totalCargado) {
          recargarDatos();
          mostrarNotificacion('info', `Datos canonicos sincronizados desde Google Sheets (${res.totalCargado.cabeceras} pedidos, ${res.totalCargado.detalles} repuestos cargados).`);
        }
      }).catch(err => {
        console.warn('Carga inicial desde Google Sheets diferida a cache local:', err);
      }).finally(() => {
        setSincronizandoNube(false);
      });
    }
  }, [recargarDatos]);

  // Escucha activa y sondeo continuo para alertar a CEDIS de nuevos pedidos
  useEffect(() => {
    if (esModoPDTExclusivo) return;

    // Escuchar eventos en vivo (misma pestaña o entre pestañas del navegador)
    const handleEventoNuevoPedido = (e: any) => {
      let data = e.detail;
      if (!data && e.key === 'changan_alerta_nuevo_pedido' && e.newValue) {
        try {
          data = JSON.parse(e.newValue);
        } catch (err) {}
      }
      if (data && data.pedidoId) {
        recargarDatos();
        // La alerta con sonido y banner es EXCLUSIVA para CEDIS Central / Operador (no para asesores)
        if (usuarioActivo.rol !== 'SUCURSAL_ASESOR') {
          try {
            playOrderAlertSound();
          } catch (err) {}
          setAlertaNuevoPedido(data);
        }
      }
    };

    window.addEventListener('changan_nuevo_pedido', handleEventoNuevoPedido);
    window.addEventListener('storage', handleEventoNuevoPedido);

    // Sondeo de sincronización en fondo cada 20 segundos
    const pollInterval = setInterval(async () => {
      try {
        const idsPrevios = new Set(appsScriptClient.getCabeceras().map(c => c.pedidoId));
        const res = await appsScriptClient.fetchInitialData(true);
        if (res.success) {
          const actuales = appsScriptClient.getCabeceras();
          const nuevos = actuales.filter(p => !idsPrevios.has(p.pedidoId));
          if (nuevos.length > 0) {
            recargarDatos();
            // Alerta exclusiva para operador CEDIS Central
            if (usuarioActivo.rol !== 'SUCURSAL_ASESOR') {
              try {
                playOrderAlertSound();
              } catch (e) {}
              const primerNuevo = nuevos[0];
              setAlertaNuevoPedido({
                pedidoId: primerNuevo.pedidoId,
                sucursal: primerNuevo.sucursal,
                cliente: primerNuevo.cliente,
                fecha: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
              });
              mostrarNotificacion('info', `🔔 ¡Nuevo Pedido Recibido en CEDIS! ${primerNuevo.pedidoId} (${primerNuevo.sucursal}).`);
            }
          }
        }
      } catch (e) {}
    }, 20000);

    return () => {
      window.removeEventListener('changan_nuevo_pedido', handleEventoNuevoPedido);
      window.removeEventListener('storage', handleEventoNuevoPedido);
      clearInterval(pollInterval);
    };
  }, [recargarDatos, esModoPDTExclusivo]);

  // SEGURIDAD ESTRICTA POR ROLES (RBAC):
  // Si el usuario activo es un Asesor, SOLO puede estar en 'formulario' o 'historial'
  useEffect(() => {
    if (usuarioActivo.rol === 'SUCURSAL_ASESOR') {
      if (moduloActivo !== 'formulario' && moduloActivo !== 'historial') {
        setModuloActivo('formulario');
        mostrarNotificacion('info', `Perfil Asesor: Acceso restringido a ingreso de pedidos e historial de ${usuarioActivo.sucursal}.`);
      }
    }
  }, [usuarioActivo.rol, usuarioActivo.sucursal, moduloActivo]);

  const handleCambiarUsuario = (usr: UsuarioActivo) => {
    setUsuarioActivo(usr);
    appsScriptClient.setUsuarioActivo(usr);
    if (usr.rol === 'SUCURSAL_ASESOR') {
      setModuloActivo('formulario');
      mostrarNotificacion('info', `Modo Asesor activado: ${usr.nombre} (${usr.sucursal}). Solo Formulario e Historial.`);
    } else {
      setModuloActivo('dashboard');
      if (typeof window !== 'undefined' && window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      mostrarNotificacion('info', `Modo Administrador CEDIS activado: ${usr.nombre}. Acceso total a todos los modulos.`);
    }
  };

  const handlePedidoCreado = (pedidoId: string) => {
    recargarDatos();
    const pedidoReciente = appsScriptClient.getCabeceras().find(c => c.pedidoId === pedidoId);
    const cliente = pedidoReciente?.cliente || 'Cliente';
    const sucursal = pedidoReciente?.sucursal || usuarioActivo.sucursal || 'Sucursal';

    // Alerta y sonido SOLO para el operador CEDIS Central
    if (usuarioActivo.rol !== 'SUCURSAL_ASESOR') {
      try {
        playOrderAlertSound();
      } catch (e) {}

      setAlertaNuevoPedido({
        pedidoId,
        sucursal,
        cliente,
        fecha: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
      });

      mostrarNotificacion('exito', `Requisición ${pedidoId} recibida en CEDIS Central (${sucursal}).`);
      setModuloActivo('matriz');
    } else {
      mostrarNotificacion('exito', `Requisición ${pedidoId} registrada exitosamente. Comprobante PDF descargado.`);
    }
  };

  const handleMigracionExitosa = () => {
    recargarDatos();
    mostrarNotificacion('exito', 'Datos de staging migrados a la estructura canonica.');
  };

  // Conteo de pedidos unicos totales y de la sucursal del asesor
  const totalPedidosUnicos = useMemo(() => new Set(matriz.map(m => m.pedidoId)).size, [matriz]);
  const pedidosSucursalCount = useMemo(() => {
    if (!usuarioActivo.sucursal) return 0;
    const sucursalNormal = usuarioActivo.sucursal.toLowerCase().trim();
    return matriz.filter(f => f.sucursal && f.sucursal.toLowerCase().trim() === sucursalNormal).length;
  }, [matriz, usuarioActivo.sucursal]);

  // Adaptacion de datos para CruceDPL
  const contenedoresCompat: ContenedorManifiesto[] = useMemo(() => manifiestos.map(m => ({
    contenedor: m.contenedorId || '',
    proveedor: m.proveedor || 'Mobitech Changan China Co., Ltd',
    poReferencia: m.poReferencia || `PO-${m.contenedorId}`,
    tipoTransporte: m.tipoTransporte || 'Maritimo 40HQ',
    fechaArribo: m.fechaArribo || '',
    estado: m.estado || 'EN TRANSITO',
    totalPiezas: Number(m.totalPiezas || m.piezasTotales || 0),
    skusUnicos: Number(m.skusUnicos || m.totalItems || 0),
    totalPallets: Number(m.totalPallets || 1),
    piezasTotales: Number(m.piezasTotales || m.totalPiezas || 0),
    totalLineas: Number(m.totalItems || m.skusUnicos || 0),
    piezasDespachadas: Number(m.piezasDespachadas || 0),
    blReferencia: m.blReferencia || m.poReferencia || '',
    estatusAduana: m.estatusAduana || ''
  })), [manifiestos]);

  const detalleDPLCompat: DetalleDPL[] = useMemo(() => inventario.map((i, idx) => ({
    uid: i.inventarioId || i.dplDetalleId || `INV-${idx}`,
    uidFila: i.dplDetalleId || i.inventarioId || `INV-${idx}`,
    contenedor: i.contenedorId || '',
    pallet: i.pallet || i.palletCaseNo || 'P001',
    codigoCompra: i.codigoRepuesto || '',
    codigoSuministrado: i.codigoRepuesto || '',
    descripcion: i.descripcion || 'Repuesto Genuino Changan',
    cantidadTotal: Number(i.cantidadTotal) || 0,
    cantTotal: Number(i.cantidadTotal) || 0,
    despachado: Number(i.cantidadDespachada) || 0,
    comprometido: Number(i.cantidadAsignada) || 0,
    saldoLibre: Number(i.saldoDisponible) || 0,
    unidad: i.unidadMedida || 'PZA'
  })), [inventario]);

  
  // MODO EXCLUSIVO PDT: Seguridad total para bodegueros y velocidad de carga instantánea
  if (esModoPDTExclusivo) {
    const params = new URLSearchParams(window.location.search);
    const pdtParam = params.get('pdt') || params.get('modo');
    const esCedis = pdtParam === 'cedis' || pdtParam === 'pdt-cedis' || Boolean(params.get('operador'));
    const usuarioPdt: UsuarioActivo = esCedis
      ? (USUARIOS_OFICIALES.find(u => u.rol === 'ADMINISTRADOR_CEDIS') || USUARIOS_OFICIALES[0])
      : (USUARIOS_OFICIALES.find(u => u.rol === 'SUCURSAL_ASESOR') || USUARIOS_OFICIALES[1]);

    return (
      <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans fixed inset-0 z-50">
        <TerminalMovilPDT
          isOpen={true}
          modoExclusivo={true}
          usuario={usuarioPdt}
          sucursalActual={esCedis ? 'CEDIS Central' : 'Calle 50'}
          nombreOperador={esCedis ? 'Bodega CEDIS' : 'Operador Sucursal'}
          onCerrar={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050914] text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* Toast de Notificaciones Flotante */}
            {/* ALERTA EN VIVO: NUEVO PEDIDO RECIBIDO (CON SONIDO Y BANNER FLOTANTE) */}
      {alertaNuevoPedido && usuarioActivo.rol !== 'SUCURSAL_ASESOR' && (
        <div className="fixed top-4 right-6 z-[9999] max-w-md w-full animate-bounce-short shadow-2xl rounded-2xl border border-amber-500/60 bg-gradient-to-r from-[#0b1220] via-[#111c33] to-[#1a1708] p-4 text-white backdrop-blur-xl ring-2 ring-amber-400/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <Bell className="w-5 h-5 animate-pulse text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">¡Nuevo Pedido Recibido!</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/40">CEDIS Central</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">{alertaNuevoPedido.pedidoId} &bull; {alertaNuevoPedido.sucursal}</h4>
                <p className="text-xs text-slate-300">Cliente: <span className="font-semibold text-white">{alertaNuevoPedido.cliente}</span></p>
              </div>
            </div>
            <button
              onClick={() => setAlertaNuevoPedido(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between gap-2">
            <span className="text-[11px] text-amber-200/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span> Transmitido a CEDIS
            </span>
            <button
              onClick={() => {
                setModuloActivo('matriz');
                setAlertaNuevoPedido(null);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              Ver en Matriz Central &rarr;
            </button>
          </div>
        </div>
      )}

      {notificacion && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border backdrop-blur-xl ${
            notificacion.tipo === 'exito'
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
              : notificacion.tipo === 'error'
              ? 'bg-rose-950/95 text-rose-300 border-rose-500/50 shadow-rose-950/50'
              : 'bg-sky-950/95 text-sky-300 border-sky-500/50 shadow-sky-950/50'
          }`}>
            {notificacion.tipo === 'exito' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {notificacion.tipo === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {notificacion.tipo === 'info' && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{notificacion.mensaje}</span>
          </div>
        </div>
      )}

      {/* 1. BARRA LATERAL (SIDEBAR RETRACTIL ESTILO MODERNIZE) */}
      <Sidebar
        moduloActivo={moduloActivo}
        setModuloActivo={setModuloActivo}
        usuarioActivo={usuarioActivo}
        colapsado={sidebarColapsado}
        setColapsado={setSidebarColapsado}
        totalPedidos={totalPedidosUnicos}
        totalContenedores={manifiestos.length}
        pedidosSucursal={pedidosSucursalCount}
        onAbrirRastreador={() => setModalRastreadorAbierto(true)}
          onAbrirTerminalPDT={() => setModalPDTAbierto(true)}
        onAbrirPortalSucursales={() => setModuloActivo('portal')}
        onCompartirPortal={() => { setTabCompartirInicial('portal'); setModalCompartirAbierto(true); }}
      />

      {/* 2. AREA DE TRABAJO PRINCIPAL (HEADER + CONTENIDO SCROLLABLE + FOOTER) */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Cabecera Superior Despejada con Profile Dropdown */}
        <TopHeader
          moduloActivo={moduloActivo}
          usuarioActivo={usuarioActivo}
          onCambiarUsuario={handleCambiarUsuario}
          onToggleSidebar={() => setSidebarColapsado(!sidebarColapsado)}
          onAbrirCatalogos={() => setModalCatalogosAbierto(true)}
          onAbrirModalSheets={() => setModalSheetsAbierto(true)}
          onAbrirModalCompartir={() => { setTabCompartirInicial('portal'); setModalCompartirAbierto(true); }}
          onCompartirPDT={() => { setTabCompartirInicial('pdt'); setModalCompartirAbierto(true); }}
          onAbrirModalDPL={() => setModalDPLAbierto(true)}
          onAbrirRastreador={() => setModalRastreadorAbierto(true)}
          onSincronizarNube={handleSincronizarNube}
          sincronizandoNube={sincronizandoNube}
        />

        {/* Contenido Dinamico con Manejo de Errores y Seguridad */}
        <div className={`flex-1 overflow-y-auto custom-scroll space-y-5 ${moduloActivo === 'matriz' ? 'p-2 sm:p-3 lg:p-4' : 'p-4 sm:p-6 lg:p-8'}`}>
          <ErrorBoundary onReset={recargarDatos}>
            {/* VISTAS EXCLUSIVAS DEL ASESOR DE SUCURSAL */}
            {esAsesor ? (
              <PortalSucursales
                usuario={usuarioActivo}
                onCambiarUsuario={handleCambiarUsuario}
                filas={matriz}
                inventario={inventario}
                manifiestos={manifiestos}
                onPedidoCreado={handlePedidoCreado}
                onAbrirModalCompartir={() => setModalCompartirAbierto(true)}
                tabExterna={moduloActivo === 'historial' ? 'historial' : 'nueva'}
                onCambiarTab={(tab) => setModuloActivo(tab === 'historial' ? 'historial' : 'formulario')}
              />
            ) : (
              /* VISTAS ADMINISTRATIVAS COMPLETAS (ADMINISTRADOR CEDIS) */
              <>
                {moduloActivo === 'dashboard' && (
                  <DashboardKPIs
                    filas={matriz}
                    inventario={inventario}
                    manifiestos={manifiestos}
                    auditoria={auditoria}
                    usuario={usuarioActivo}
                    onActualizar={recargarDatos}
                    onNavegarModulo={(mod) => setModuloActivo(mod as any)}
                    onRastrearPedido={(cod) => {
                      if (cod) setCodigoRastreoDirecto(cod);
                      setModalRastreadorAbierto(true);
                    }}
                  />
                )}

                {moduloActivo === 'matriz' && (
                  <MatrizCentral
                    filas={matriz}
                    usuario={usuarioActivo}
                    onActualizar={recargarDatos}
                  />
                )}

                {moduloActivo === 'cruce' && (
                  <CruceDPL
                    contenedores={contenedoresCompat}
                    detalleDPL={detalleDPLCompat}
                    usuario={usuarioActivo}
                    onAbrirModalDPL={() => setModalDPLAbierto(true)}
                    onAbrirRastreador={(cod) => {
                      if (cod) setCodigoRastreoDirecto(cod);
                      setModalRastreadorAbierto(true);
                    }}
                    onActualizar={recargarDatos}
                  />
                )}

                {moduloActivo === 'kardex' && (
                  <KardexStock
                    inventario={inventario}
                    usuario={usuarioActivo}
                    onActualizar={recargarDatos}
                  />
                )}

                {moduloActivo === 'conciliacion' && (
                  <ModuloConciliacion
                    usuario={usuarioActivo}
                    onMigracionExitosa={handleMigracionExitosa}
                  />
                )}

                {moduloActivo === 'auditoria' && (
                  <ModuloAuditoria />
                )}

                {moduloActivo === 'pdt' && (
                  <div className="w-full">
                    <ModuloPDTMovil
                      matriz={matriz}
                      inventario={inventario}
                      usuarioActivo={usuarioActivo}
                      onActualizar={recargarDatos}
                      onDespachar={async (lineaId, cantidad) => {
                        const res = await appsScriptClient.despacharLinea(lineaId, cantidad);
                        recargarDatos();
                        return res;
                      }}
                      onVolverMatriz={() => setModuloActivo('matriz')}
                    />
                  </div>
                )}

                {moduloActivo === 'reporte_fabrica' && (
                  <ReporteFabrica
                    cabeceras={cabeceras}
                    detalles={detalles}
                    onActualizar={recargarDatos}
                  />
                )}

                {moduloActivo === 'formulario' && (
                  <FormularioRequisicion
                    usuario={usuarioActivo}
                    onPedidoCreado={handlePedidoCreado}
                  />
                )}

                {(moduloActivo === 'portal' || moduloActivo === 'historial') && (
                  <PortalSucursales
                    usuario={usuarioActivo}
                    onCambiarUsuario={handleCambiarUsuario}
                    filas={matriz}
                    inventario={inventario}
                    manifiestos={manifiestos}
                    onPedidoCreado={handlePedidoCreado}
                    onAbrirMatrizCentral={() => setModuloActivo('matriz')}
                    onAbrirModalCompartir={() => setModalCompartirAbierto(true)}
                    tabExterna={moduloActivo === 'historial' ? 'historial' : 'nueva'}
                    onCambiarTab={(tab) => setModuloActivo(tab === 'historial' ? 'historial' : 'formulario')}
                  />
                )}
              </>
            )}
          </ErrorBoundary>
        </div>

        {/* Footer Discreto y Elegante */}
        <footer className="h-10 shrink-0 border-t border-slate-900/90 bg-[#040812] px-6 flex items-center justify-between text-[11px] text-slate-500">
          <div>
            Sistema CEDIS Changan Auto Panama &bull; Repuestos Genuinos
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 hidden sm:flex">
            <span>Canonico: Google Sheets API</span>
            <span>&bull;</span>
            <span>Seguridad: Apps Script LockService</span>
            <span>&bull;</span>
            <span>Modo: {esAsesor ? 'Asesor Sucursal' : 'Administrador Global'}</span>
          </div>
        </footer>
      </div>

      {/* Modales Auxiliares Globales */}
      <ModalCatalogosMaestros
        abierto={modalCatalogosAbierto}
        onCerrar={() => setModalCatalogosAbierto(false)}
      />

      <ModalGoogleSheets
        isOpen={modalSheetsAbierto}
        onClose={() => setModalSheetsAbierto(false)}
        onSyncComplete={() => {
          recargarDatos();
          mostrarNotificacion('exito', 'Conexion y parametros canonicos actualizados.');
        }}
      />

      <ModalCompartir
        isOpen={modalCompartirAbierto}
        tabInicial={tabCompartirInicial}
        onClose={() => setModalCompartirAbierto(false)}
      />

      <ModalDPL
        isOpen={modalDPLAbierto}
        onClose={() => setModalDPLAbierto(false)}
        onDPLGuardado={() => {
          recargarDatos();
          mostrarNotificacion('exito', 'Manifiesto DPL procesado y sincronizado en almacen.');
        }}
      />

      {modalPDTAbierto && (
        <TerminalMovilPDT
          usuario={usuarioActivo}
          onRecepcionCompletada={recargarDatos}
          sucursalActual={usuarioActivo.sucursal || 'Calle 50'}
          nombreOperador={usuarioActivo.nombre}
          onCerrar={() => {
            setModalPDTAbierto(false);
            recargarDatos();
          }}
        />
      )}

      <ModalRastreadorUniversal
        isOpen={modalRastreadorAbierto}
        onClose={() => {
          setModalRastreadorAbierto(false);
          setCodigoRastreoDirecto('');
        }}
        filas={matriz}
        inventario={inventario}
        manifiestos={manifiestos}
        codigoInicial={codigoRastreoDirecto}
      />
    </div>
  );
}
