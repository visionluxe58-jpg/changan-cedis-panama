import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  User, 
  Building2, 
  Tag, 
  Package, 
  History, 
  Volume2, 
  VolumeX, 
  X,
  Keyboard,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Boxes,
  Printer,
  Truck,
  Check,
  Share2,
  UserCheck,
  Users
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { appsScriptClient } from '../services/appsScriptClient';
import { UsuarioActivo } from '../types/cedis';
import { ModalEtiquetaQR } from './ModalEtiquetaQR';
import { ModalCompartir } from './ModalCompartir';
import { generarDatosEtiqueta, EtiquetaRepuestoData } from '../services/etiquetasQRService';
import { 
  EQUIPO_BODEGA_CEDIS, 
  BodegueroCedis, 
  obtenerBodegueroPorCodigo, 
  guardarBodegueroActivo, 
  obtenerBodegueroActivo 
} from '../data/bodeguerosData';

export interface TerminalMovilPDTProps {
  modoExclusivo?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onCerrar?: () => void;
  usuario?: UsuarioActivo;
  sucursalActual?: string;
  nombreOperador?: string;
  onRecepcionCompletada?: () => void;
}

type EstadoEscaneo = 
  | 'ESPERANDO' 
  | 'ESCANEANDO' 
  | 'PROCESANDO' 
  | 'RECIBIDO' 
  | 'DUPLICADO' 
  | 'NO_VALIDO' 
  | 'ERROR_RED'
  | 'PALLET_DETECTADO';

export const TerminalMovilPDT: React.FC<TerminalMovilPDTProps> = ({
  isOpen = true,
  modoExclusivo = false,
  onClose,
  onCerrar,
  usuario,
  sucursalActual,
  nombreOperador,
  onRecepcionCompletada
}) => {
  const cerrarModal = onClose || onCerrar || (() => {});
  const sucursalEfectiva = sucursalActual || usuario?.sucursal || 'Calle 50';

  // Determinación de Rol: Solo CEDIS (Bodega Central) puede escanear pallets de fábrica
  const esCedis = (usuario?.rol === 'ADMINISTRADOR_CEDIS') || 
                  (usuario?.sucursal === 'Bodega Central') || 
                  (usuario?.sucursal === 'CEDIS Central') || 
                  (sucursalEfectiva === 'Bodega Central') || 
                  (sucursalEfectiva === 'CEDIS Central');

  // Estado del Bodeguero Activo (Issac CE001, Josue CE002, etc.)
  const [bodegueroActivo, setBodegueroActivo] = useState<BodegueroCedis | null>(() => {
    // 1. Intentar leer parámetro URL ?operador=CE00X
    try {
      const params = new URLSearchParams(window.location.search);
      const opCode = params.get('operador') || params.get('op');
      if (opCode) {
        const b = obtenerBodegueroPorCodigo(opCode);
        if (b) {
          guardarBodegueroActivo(b);
          return b;
        }
      }
    } catch (e) {}

    // 2. Intentar leer de localStorage si está en CEDIS
    return obtenerBodegueroActivo();
  });

  const [mostrarSelectorBodeguero, setMostrarSelectorBodeguero] = useState<boolean>(() => {
    return esCedis && !bodegueroActivo;
  });

  const operadorEfectivo = bodegueroActivo 
    ? `${bodegueroActivo.nombre} [${bodegueroActivo.codigo}]` 
    : (nombreOperador || usuario?.nombre || 'Operador Almacén');

  const [estado, setEstado] = useState<EstadoEscaneo>('ESPERANDO');
  const [ultimoResultado, setUltimoResultado] = useState<any>(null);
  const [cuentaSesion, setCuentaSesion] = useState<number>(0);
  const [historialSesion, setHistorialSesion] = useState<any[]>([]);
  const [sonidoHabilitado, setSonidoHabilitado] = useState<boolean>(true);
  const [codigoManual, setCodigoManual] = useState<string>('');
  const [modoManual, setModoManual] = useState<boolean>(false);
  const [mensajeErrorCamara, setMensajeErrorCamara] = useState<string | null>(null);
  const [solicitandoPermiso, setSolicitandoPermiso] = useState<boolean>(false);

  // Estados exclusivos para Desconsolidación de Pallets en CEDIS
  const [palletDetectado, setPalletDetectado] = useState<any | null>(null);
  const [procesandoPallet, setProcesandoPallet] = useState<boolean>(false);
  const [palletRecibidoExitoso, setPalletRecibidoExitoso] = useState<boolean>(false);
  const [etiquetasImpresionPallet, setEtiquetasImpresionPallet] = useState<EtiquetaRepuestoData[] | null>(null);
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'reader-pdt-changan';
  const autoResetTimerRef = useRef<any>(null);

  // Reproducir tono de audio sintetizado con Web Audio API
  const emitirBeep = (tipo: 'exito' | 'duplicado' | 'error') => {
    if (!sonidoHabilitado) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (tipo === 'exito') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
        if (navigator.vibrate) navigator.vibrate(80);
      } else if (tipo === 'duplicado') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn('Audio Web API no soportado o bloqueado:', e);
    }
  };

  
  // Solicitar permiso de cámara explícitamente mediante interacción del usuario
  const solicitarPermisoCamara = async () => {
    setMensajeErrorCamara(null);
    setSolicitandoPermiso(true);

    try {
      // 1. Verificar contexto seguro (HTTPS o localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setMensajeErrorCamara(
          'El navegador móvil bloquea la cámara en enlaces HTTP sin cifrar. Para usar la cámara en CEDIS o Sucursales, debes ingresar mediante el enlace seguro HTTPS oficial.'
        );
        setSolicitandoPermiso(false);
        setEstado('ESPERANDO');
        return;
      }

      // 2. Solicitar permiso mediante llamada nativa getUserMedia
      if (navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        // Si el usuario aceptó en el cuadro de diálogo del navegador, liberar el stream de prueba
        stream.getTracks().forEach(track => track.stop());
      } else {
        throw new Error('API de cámara no disponible en este navegador');
      }

      // 3. Iniciar el escáner QR
      await iniciarCamara();
    } catch (err: any) {
      console.error('Error al solicitar permiso de cámara:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMensajeErrorCamara(
          'Permiso de cámara denegado. Toca el candado 🔒 arriba en la barra del navegador, selecciona Permisos y activa "Cámara".'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMensajeErrorCamara('No se detectó ninguna cámara física en este dispositivo.');
      } else {
        setMensajeErrorCamara(`No se pudo iniciar la cámara (${err?.message || 'Error desconocido'}). Verifique los permisos del navegador.`);
      }
      setEstado('ESPERANDO');
    } finally {
      setSolicitandoPermiso(false);
    }
  };

  // Inicializar escáner de cámara
  const iniciarCamara = async () => {
    if (mostrarSelectorBodeguero) return;
    setMensajeErrorCamara(null);
    setEstado('ESCANEANDO');

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerElementId);
      }

      if (html5QrCodeRef.current.isScanning) {
        return;
      }

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleProcesarCodigoDetectado(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('Error al acceder a la cámara trasera:', err);
      try {
        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.start(
            { facingMode: 'user' },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            (decodedText) => handleProcesarCodigoDetectado(decodedText),
            () => {}
          );
        }
      } catch (fallbackErr: any) {
        console.error('Error total de cámara:', fallbackErr);
        setMensajeErrorCamara('No se pudo acceder a la cámara. Verifique los permisos o use el ingreso manual.');
        setEstado('ESPERANDO');
      }
    }
  };

  // Detener la cámara de manera segura
  const detenerCamara = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error deteniendo cámara:', e);
      }
    }
  };

  // Procesar código QR escaneado o ingresado
  const handleProcesarCodigoDetectado = async (codigoRaw: string) => {
    if (!codigoRaw || estado === 'PROCESANDO') return;
    const codigoLimpio = codigoRaw.trim().toUpperCase();

    // Pausar temporalmente el escáner
    setEstado('PROCESANDO');
    await detenerCamara();

    // -------------------------------------------------------------
    // CASO 1: Código Individual de Pedido Especial (PE-YYYY-XXXX-XX)
    // -------------------------------------------------------------
    if (codigoLimpio.startsWith('PE-')) {
      try {
        const res = await appsScriptClient.recepcionarRepuestoQR({
          qrId: codigoLimpio,
          operador: operadorEfectivo,
          sucursal: sucursalEfectiva,
          deviceId: 'PDT-SMARTPHONE'
        });

        setUltimoResultado(res);

        if (res.status === 'RECEIVED') {
          emitirBeep('exito');
          setEstado('RECIBIDO');
          setCuentaSesion(prev => prev + 1);
          setHistorialSesion(prev => [res, ...prev.slice(0, 19)]);
          if (onRecepcionCompletada) onRecepcionCompletada();

          if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
          autoResetTimerRef.current = setTimeout(() => {
            iniciarCamara();
          }, 1500);

        } else if (res.status === 'DUPLICATE') {
          emitirBeep('duplicado');
          setEstado('DUPLICADO');
        } else {
          emitirBeep('error');
          setEstado('NO_VALIDO');
        }
      } catch (err) {
        console.error('Error procesando recepción:', err);
        emitirBeep('error');
        setEstado('ERROR_RED');
      }
      return;
    }

    // -------------------------------------------------------------
    // CASO 2: Código que NO empieza con PE-... (Pallets / Fábrica)
    // -------------------------------------------------------------
    if (esCedis) {
      try {
        const resPallet = appsScriptClient.buscarRepuestosPorPallet(codigoLimpio);
        if (resPallet.encontrado && resPallet.repuestos.length > 0) {
          emitirBeep('exito');
          setPalletDetectado(resPallet);
          setPalletRecibidoExitoso(false);
          setEstado('PALLET_DETECTADO');
          return;
        } else {
          emitirBeep('error');
          setUltimoResultado({
            ok: false,
            status: 'NOT_FOUND',
            message: `El código "${codigoLimpio}" no coincide con ningún Pallet de contenedor ni Pedido Especial en el sistema.`
          });
          setEstado('NO_VALIDO');
        }
      } catch (err) {
        console.error('Error buscando pallet en CEDIS:', err);
        emitirBeep('error');
        setEstado('ERROR_RED');
      }
    } else {
      // EN BODEGAS EXTERNAS (SUCURSALES): REGLA ESTRICTA
      emitirBeep('error');
      setUltimoResultado({
        ok: false,
        status: 'FORBIDDEN_PALLET',
        message: `⚠️ CÓDIGO NO PERMITIDO EN SUCURSAL: El código "${codigoLimpio}" corresponde a un bulto o pallet de fábrica. En las sucursales únicamente debe escanear la etiqueta física oficial con código QR (PE-...) enviada por el CEDIS.`
      });
      setEstado('NO_VALIDO');
    }
  };

  // Confirmar recepción del Pallet completo en CEDIS con atribución de responsabilidad
  const handleConfirmarRecepcionPallet = async () => {
    if (!palletDetectado) return;
    setProcesandoPallet(true);

    try {
      const operadorResponsable = bodegueroActivo
        ? `${bodegueroActivo.nombre} [${bodegueroActivo.codigo}] (${bodegueroActivo.cargo})`
        : operadorEfectivo;

      const res = await appsScriptClient.recepcionarPalletEnCedis({
        codigoPallet: palletDetectado.codigoPallet,
        operador: operadorResponsable,
        sucursal: 'Bodega Central'
      });

      if (res.ok) {
        emitirBeep('exito');
        setPalletRecibidoExitoso(true);
        setCuentaSesion(prev => prev + res.filasActualizadas);
        if (onRecepcionCompletada) onRecepcionCompletada();
      } else {
        alert(res.mensaje);
      }
    } catch (err) {
      console.error('Error recibiendo pallet:', err);
      alert('Error de conexión al actualizar pallet en CEDIS.');
    } finally {
      setProcesandoPallet(false);
    }
  };

  // Generar etiquetas físicas QR para todos los repuestos del Pallet
  const handleImprimirEtiquetasPallet = () => {
    if (!palletDetectado || !palletDetectado.repuestos) return;

    const listaEtiquetas: EtiquetaRepuestoData[] = [];
    palletDetectado.repuestos.forEach((r: any) => {
      const cant = r.cantidad || 1;
      for (let s = 1; s <= cant; s++) {
        listaEtiquetas.push(generarDatosEtiqueta(
          r.pedidoId,
          r.codigo,
          r.descripcion,
          r.sucursal,
          s,
          cant,
          r.contenedor,
          r.pallet,
          r.ubicacionCedis
        ));
      }
    });

    if (listaEtiquetas.length > 0) {
      setEtiquetasImpresionPallet(listaEtiquetas);
    }
  };

  // Selección de Bodeguero en CEDIS
  const handleSeleccionarBodeguero = (b: BodegueroCedis) => {
    setBodegueroActivo(b);
    guardarBodegueroActivo(b);
    setMostrarSelectorBodeguero(false);
    setEstado('ESCANEANDO');
    setTimeout(() => {
      iniciarCamara();
    }, 200);
  };

  // Manejo de envío manual
  const handleEnviarManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoManual.trim()) return;
    const codigo = codigoManual.trim();
    setCodigoManual('');
    handleProcesarCodigoDetectado(codigo);
  };

  // Limpiar al cerrar
  
  // Soporte directo para Terminales PDT con Lector Láser Físico (Zebra, Honeywell, etc.)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo activamente en un input o textarea normal
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.id !== 'scanner-laser-hidden') {
        return;
      }

      const currentTime = Date.now();
      // Los lectores láser envían ráfagas rápidas de caracteres (< 50ms por tecla)
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleProcesarCodigoDetectado(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [operadorEfectivo, sucursalEfectiva, esCedis, estado]);

  useEffect(() => {
    if (!isOpen) {
      detenerCamara();
    } else if (!modoManual && estado !== 'PALLET_DETECTADO' && !mostrarSelectorBodeguero) {
      iniciarCamara();
    }

    return () => {
      detenerCamara();
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    };
  }, [isOpen, modoManual, mostrarSelectorBodeguero]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between text-slate-100 font-sans select-none animate-fadeIn">
      
      {/* 1. BARRA SUPERIOR DE ESTADO / CONTROL PDT */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${esCedis ? 'bg-blue-950/80 border-blue-500/40 text-blue-400' : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'}`}>
            {esCedis ? <Boxes className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider uppercase text-white">
                {esCedis ? 'CEDIS Central' : sucursalEfectiva}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${esCedis ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                {esCedis ? 'BODEGA CENTRAL' : 'SUCURSAL'}
              </span>
            </div>

            {/* Identificación del Operador / Bodeguero */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 text-slate-500 shrink-0" />
              {esCedis && bodegueroActivo ? (
                <div className="flex items-center gap-1">
                  <b className="text-cyan-300">{bodegueroActivo.nombre}</b>
                  <span className={`px-1 rounded text-[9px] font-mono font-bold border ${bodegueroActivo.colorBadge}`}>
                    {bodegueroActivo.codigo}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarSelectorBodeguero(true);
                      detenerCamara();
                    }}
                    className="text-[10px] text-slate-400 hover:text-cyan-400 underline ml-0.5 cursor-pointer"
                  >
                    (Cambiar)
                  </button>
                </div>
              ) : (
                <span>{operadorEfectivo}</span>
              )}
            </div>
          </div>
        </div>

        {/* Controles de Sonido, Compartir y Salir */}
        <div className="flex items-center gap-1.5">
          {/* Botón Compartir Terminal */}
          <button
            type="button"
            onClick={() => setModalCompartirAbierto(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition cursor-pointer"
            title="Compartir Terminal PDT con otro bodeguero"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            className={`p-2 rounded-lg border transition ${
              sonidoHabilitado 
                ? 'bg-slate-800 border-slate-700 text-cyan-400' 
                : 'bg-rose-950/50 border-rose-800/60 text-rose-400'
            }`}
            title={sonidoHabilitado ? 'Silenciar pitido' : 'Activar pitido'}
          >
            {sonidoHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!modoExclusivo && (
          <button
            type="button"
            onClick={cerrarModal}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Cerrar Terminal PDT"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        </div>
      </div>

      {/* 2. ÁREA CENTRAL: SELECTOR DE BODEGUERO, CÁMARA O VISTA DE PALLET */}
      <div className="flex-1 flex flex-col justify-center items-center p-3 sm:p-4 overflow-y-auto">
        
        {/* ========================================================= */}
        {/* PANTALLA TÁCTIL: SELECTOR DE BODEGUERO CEDIS              */}
        {/* ========================================================= */}
        {mostrarSelectorBodeguero && esCedis ? (
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-2xl animate-scaleIn">
            <div className="text-center border-b border-slate-800 pb-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                ¿Quién eres hoy en Bodega CEDIS?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecciona tu perfil para que los pallets escaneados queden registrados a tu nombre
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 custom-scroll">
              {EQUIPO_BODEGA_CEDIS.map((b) => (
                <button
                  key={b.codigo}
                  type="button"
                  onClick={() => handleSeleccionarBodeguero(b)}
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 hover:bg-blue-950/70 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-mono font-black border ${b.colorBadge}`}>
                      {b.codigo}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs sm:text-sm group-hover:text-cyan-300 transition">
                          {b.nombre}
                        </span>
                        {b.esAdmin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px] block">{b.cargo}</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>

            {bodegueroActivo && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarSelectorBodeguero(false);
                    iniciarCamara();
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar y mantener a {bodegueroActivo.nombre}
                </button>
              </div>
            )}
          </div>
        ) : estado === 'PALLET_DETECTADO' && palletDetectado ? (
          
          /* ========================================================= */
          /* CASO ESPECIAL: PALLET DETECTADO EN CEDIS                  */
          /* ========================================================= */
          <div className="w-full max-w-lg bg-slate-900 border-2 border-blue-500/60 rounded-2xl p-4 sm:p-5 shadow-2xl animate-scaleIn">
            
            {/* Cabecera del Pallet */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 inline-flex items-center gap-1">
                  <Boxes className="w-3 h-3" /> Pallet de Contenedor Detectado
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                  Pallet: <span className="text-cyan-400 font-mono">{palletDetectado.codigoPallet}</span>
                </h3>
                {palletDetectado.contenedorId && (
                  <p className="text-xs text-slate-400">
                    Contenedor: <span className="text-slate-200 font-semibold">{palletDetectado.contenedorId}</span>
                  </p>
                )}
                {/* Bodeguero Responsable Asignado */}
                <p className="text-[11px] text-cyan-300/90 mt-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Responsable: <b>{bodegueroActivo ? `${bodegueroActivo.nombre} [${bodegueroActivo.codigo}]` : operadorEfectivo}</b></span>
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                {palletDetectado.totalRepuestosAsignados} Repuestos
              </span>
            </div>

            {/* Mensaje de Confirmación si ya fue recibido */}
            {palletRecibidoExitoso && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Pallet registrado y notificado al Administrador (Joel) y Google Sheets a nombre de <b>{bodegueroActivo?.nombre || operadorEfectivo}</b>.
                </span>
              </div>
            )}

            {/* Lista de Repuestos Asignados a Pedidos Especiales */}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scroll mb-3">
              {palletDetectado.repuestos.map((rep: any, idx: number) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-xs">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="font-mono font-bold text-cyan-300">{rep.codigo}</span>
                      <p className="text-slate-300 font-medium truncate max-w-[240px]">{rep.descripcion}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 whitespace-nowrap">
                      {rep.sucursal}
                    </span>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Cliente: <b className="text-slate-200">{rep.cliente}</b></span>
                    <span>Cant: <b className="text-cyan-400">{rep.cantidad}</b></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Botones de Acción de Pallet en CEDIS */}
            <div className="space-y-2">
              {!palletRecibidoExitoso ? (
                <button
                  type="button"
                  onClick={handleConfirmarRecepcionPallet}
                  disabled={procesandoPallet}
                  className="w-full py-3 rounded-xl font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {procesandoPallet ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>CONFIRMAR RECEPCIÓN A NOMBRE DE {bodegueroActivo ? bodegueroActivo.nombre.toUpperCase() : 'BODEGA'}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleImprimirEtiquetasPallet}
                className="w-full py-3 rounded-xl font-black text-xs sm:text-sm bg-amber-600 hover:bg-amber-500 text-white shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>IMPRIMIR ETIQUETAS QR DE ESTE PALLET ({palletDetectado.totalRepuestosAsignados})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPalletDetectado(null);
                  setEstado('ESCANEANDO');
                  iniciarCamara();
                }}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Escanear Otro Código
              </button>
            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* MODO ESCÁNER NORMAL: CÁMARA + ESTADOS VISUALES             */
          /* ========================================================= */
          <div className="w-full max-w-sm flex flex-col items-center">
            
            {/* Badge de Modo */}
            <div className="mb-2 text-center">
              {esCedis ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 inline-flex items-center gap-1">
                  <Boxes className="w-3 h-3" /> CEDIS: Admite QR de Pallet y Etiquetas Individuales
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Sucursal: Solo Escaneo de Etiqueta Física PE-...
                </span>
              )}
            </div>

            {/* Contenedor del Visor de Cámara */}
            <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
              
              <div id={scannerElementId} className="w-full h-full object-cover"></div>

              {/* Guías visuales de encuadre */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-cyan-400/70 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                </div>
              </div>

              {/* OVERLAY DE ESTADOS VISUALES OBLIGATORIOS (Sección 13 PDF) */}
              
              {/* 1. 🟢 RECIBIDO (Auto-reset en 1.5s) */}
              {estado === 'RECIBIDO' && (
                <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-4 text-center animate-scaleIn">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">CONFIRMADO</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">RECIBIDO</h2>
                  <p className="text-xs text-emerald-200 mt-1 font-mono font-bold">
                    {ultimoResultado?.repuesto?.codigo || ultimoResultado?.qrId}
                  </p>
                  <p className="text-[11px] text-emerald-300/80 truncate max-w-[260px] mt-0.5">
                    {ultimoResultado?.repuesto?.descripcion}
                  </p>
                  <span className="text-[10px] text-emerald-400/60 mt-3 animate-pulse">
                    Listo para el siguiente escaneo (1.5s)...
                  </span>
                </div>
              )}

              {/* 2. 🟡 DUPLICADO (Bloqueo estricto) */}
              {estado === 'DUPLICADO' && (
                <div className="absolute inset-0 bg-amber-950/95 flex flex-col items-center justify-center p-4 text-center animate-scaleIn">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-2">
                    <AlertTriangle className="w-9 h-9 text-amber-400" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-amber-400 uppercase">ADVERTENCIA</span>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">PEDIDO YA RECIBIDO</h2>
                  
                  <div className="bg-slate-950/70 border border-amber-500/40 rounded-xl p-2 mt-2 text-left text-[11px] w-full max-w-[240px]">
                    <div className="text-slate-300 font-mono font-bold text-center border-b border-slate-800 pb-1 mb-1">
                      {ultimoResultado?.qrId}
                    </div>
                    <div className="text-amber-200/90 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{ultimoResultado?.previousTimestamp || 'Previamente registrado'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEstado('ESCANEANDO');
                      iniciarCamara();
                    }}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    Entendido, Continuar
                  </button>
                </div>
              )}

              {/* 3. 🔴 QR NO VÁLIDO */}
              {estado === 'NO_VALIDO' && (
                <div className="absolute inset-0 bg-rose-950/95 flex flex-col items-center justify-center p-4 text-center animate-scaleIn">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mb-2">
                    <XCircle className="w-9 h-9 text-rose-400" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-rose-400 uppercase">ERROR</span>
                  <h2 className="text-lg font-black text-white mt-0.5">CÓDIGO NO VÁLIDO</h2>
                  <p className="text-[11px] text-rose-200 mt-1 max-w-[260px] leading-relaxed">
                    {ultimoResultado?.message || 'El código no corresponde a un pedido especial ni pallet.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setEstado('ESCANEANDO');
                      iniciarCamara();
                    }}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* 4. ⚪ ERROR DE RED */}
              {estado === 'ERROR_RED' && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center animate-scaleIn">
                  <div className="w-16 h-16 rounded-full bg-slate-700/40 border-2 border-slate-500 flex items-center justify-center mb-2">
                    <RefreshCw className="w-8 h-8 text-slate-300" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-slate-400 uppercase">SIN CONEXIÓN</span>
                  <h2 className="text-lg font-black text-white mt-0.5">ERROR DE RED</h2>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-[240px]">
                    No se pudo contactar con Google Sheets. Se guardó copia local en el dispositivo.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setEstado('ESCANEANDO');
                      iniciarCamara();
                    }}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    Reanudar Escáner
                  </button>
                </div>
              )}

            </div>

            {/* Tarjeta interactiva de solicitud y desbloqueo de permiso de cámara */}
            {mensajeErrorCamara && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center z-20 animate-fadeIn overflow-y-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 mb-2 shadow-lg shadow-amber-500/10">
                  <Camera className="w-7 h-7 animate-pulse" />
                </div>
                
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {esCedis ? 'CEDIS CENTRAL' : 'SUCURSAL EXTERNA'}
                </span>
                <h3 className="text-white font-bold text-base mt-0.5 mb-1">
                  Permiso de Cámara Requerido
                </h3>
                
                <p className="text-slate-300 text-xs max-w-xs mb-3 leading-relaxed">
                  Para escanear códigos QR de {esCedis ? 'pallets y repuestos' : 'repuestos recibidos'}, el navegador necesita tu autorización para acceder a la cámara.
                </p>

                {/* Botón principal de solicitud de permiso */}
                <button
                  type="button"
                  disabled={solicitandoPermiso}
                  onClick={solicitarPermisoCamara}
                  className="w-full max-w-xs py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95 disabled:opacity-50"
                >
                  {solicitandoPermiso ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Solicitando autorización...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Conceder Permiso y Activar Cámara</span>
                    </>
                  )}
                </button>

                {/* Opción para usar teclado manual */}
                <button
                  type="button"
                  onClick={() => setModoManual(true)}
                  className="mt-2.5 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer py-1"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>O ingresar códigos con teclado</span>
                </button>

                {/* Mensaje de detalle de error */}
                <div className="mt-3 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-200 text-[11px] text-left max-w-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>¿Cómo activarlo si está bloqueado?</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-[10px] pl-1">
                    <li>Toca el candado <b>🔒</b> o ajustes en la barra del navegador.</li>
                    <li>Selecciona <b>Permisos del sitio</b> o <b>Cámara</b>.</li>
                    <li>Cambia a <b>Permitir</b> y pulsa el botón azul de arriba.</li>
                  </ol>
                  <p className="text-[10px] text-amber-400/90 pt-1 border-t border-amber-500/20">
                    {mensajeErrorCamara}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. BARRA INFERIOR: ENTRADA MANUAL + CONTADOR DE SESIÓN */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3 space-y-2">
        
        {/* Toggle para entrada manual por teclado */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setModoManual(!modoManual)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{modoManual ? 'Volver a Cámara' : (esCedis ? 'Ingresar Pallet o QR Manual' : 'Ingresar QR Manual')}</span>
          </button>

          <div className="text-slate-400 flex items-center gap-1 font-mono">
            <span>Escaneados:</span>
            <b className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              {cuentaSesion}
            </b>
          </div>
        </div>

        {/* Input Manual */}
        {modoManual && (
          <form onSubmit={handleEnviarManual} className="flex gap-1.5 animate-fadeIn">
            <input
              type="text"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value)}
              placeholder={esCedis ? "Ej: P0001114176 o PE-2026-..." : "Ej: PE-2026-00012345-01"}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span>Validar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

      </div>

      {/* Modal de Impresión de Etiquetas Físicas Changan para Pallet */}
      {etiquetasImpresionPallet && etiquetasImpresionPallet.length > 0 && (
        <ModalEtiquetaQR
          isOpen={true}
          onClose={() => setEtiquetasImpresionPallet(null)}
          etiquetas={etiquetasImpresionPallet}
        />
      )}

      {/* Modal de Difusión y Compartir Terminal PDT */}
      {modalCompartirAbierto && (
        <ModalCompartir
          isOpen={true}
          onClose={() => setModalCompartirAbierto(false)}
          tabInicial={esCedis ? 'pdt' : 'portal'}
        />
      )}

    </div>
  );
};
