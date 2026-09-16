import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ScanBarcode,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  MapPin,
  RefreshCw,
  Volume2,
  VolumeX,
  Check,
  X,
  ChevronRight,
  Building2,
  Camera,
  ArrowLeft
} from 'lucide-react';
import {
  FilaMatrizCentral,
  DPLDetalle,
  UsuarioActivo
} from '../types/cedis';

// Helper de audio sintetizado con Web Audio API para feedback de escaneo en bodega
class WarehouseAudioFeedback {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(en: boolean) {
    this.enabled = en;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Beep positivo doble (880Hz -> 1760Hz)
  public playSuccess() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1760, now + 0.08);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80]);
      }
    } catch {
      // Ignorar restricciones de audio del navegador
    }
  }

  // Beep de advertencia/error (grave)
  public playError() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 60, 150]);
      }
    } catch {}
  }

  // Fanfarria de despacho completado (acorde)
  public playDispatchComplete() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.25, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    } catch {}
  }
}

const warehouseAudio = new WarehouseAudioFeedback();

export interface ModuloPDTMovilProps {
  matriz: FilaMatrizCentral[];
  inventario: DPLDetalle[];
  usuarioActivo: UsuarioActivo;
  onActualizar: () => void;
  onDespachar: (lineaId: string, cantidad: number) => Promise<{ success: boolean; error?: string; message?: string }>;
  onVolverMatriz: () => void;
}

type ModoPDT = 'picking' | 'consulta_stock' | 'ruta_sucursal';

export const ModuloPDTMovil: React.FC<ModuloPDTMovilProps> = ({
  matriz,
  inventario,
  usuarioActivo,
  onActualizar,
  onDespachar,
  onVolverMatriz
}) => {
  const [modo, setModo] = useState<ModoPDT>('picking');
  const [codigoEscaneado, setCodigoEscaneado] = useState<string>('');
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<string>('');
  const [sucursalFiltro, setSucursalFiltro] = useState<string>('TODAS');
  const [soloPendientes, setSoloPendientes] = useState<boolean>(true);
  const [sonidoHabilitado, setSonidoHabilitado] = useState<boolean>(true);
  const [cargandoAccion, setCargandoAccion] = useState<boolean>(false);
  const [notificacionLocal, setNotificacionLocal] = useState<{ tipo: 'exito' | 'error' | 'info'; texto: string } | null>(null);

  // Cámara
  const [camaraActiva, setCamaraActiva] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Input de escaneo
  const inputScanRef = useRef<HTMLInputElement | null>(null);

  // Buffer de hardware scanner (detección de ráfaga rápida)
  const lastKeyTimeRef = useRef<number>(0);
  const scanBufferRef = useRef<string>('');

  const mostrarMensaje = (tipo: 'exito' | 'error' | 'info', texto: string) => {
    setNotificacionLocal({ tipo, texto });
    setTimeout(() => {
      setNotificacionLocal(null);
    }, 4000);
  };

  // Mantener foco en el input del escáner
  useEffect(() => {
    if (inputScanRef.current && !camaraActiva) {
      inputScanRef.current.focus();
    }
  }, [modo, camaraActiva, pedidoSeleccionadoId]);

  // Agrupación de pedidos de la Matriz Central
  const pedidosAgrupados = useMemo(() => {
    const map = new Map<string, {
      pedidoId: string;
      sucursal: string;
      cliente: string;
      modeloChangan: string;
      vin: string;
      tipoPedido: string;
      fechaCreacion: string;
      estatusGeneral: string;
      lineas: FilaMatrizCentral[];
      totalSolicitado: number;
      totalDespachado: number;
      totalPendiente: number;
    }>();

    matriz.forEach(f => {
      if (!map.has(f.pedidoId)) {
        map.set(f.pedidoId, {
          pedidoId: f.pedidoId,
          sucursal: f.sucursal || 'DESCONOCIDA',
          cliente: f.cliente || 'CLIENTE CEDIS',
          modeloChangan: f.modeloChangan || 'CHANGAN',
          vin: f.vin || 'N/A',
          tipoPedido: f.tipoPedido || 'Especial',
          fechaCreacion: f.fechaCreacion || '',
          estatusGeneral: f.estatusGeneral || 'Pendiente',
          lineas: [],
          totalSolicitado: 0,
          totalDespachado: 0,
          totalPendiente: 0
        });
      }

      const p = map.get(f.pedidoId)!;
      p.lineas.push(f);
      p.totalSolicitado += (Number(f.cantidadSolicitada) || 0);
      p.totalDespachado += (Number(f.cantidadDespachada) || 0);
      p.totalPendiente += (Number(f.saldoPendiente) || 0);
    });

    return Array.from(map.values());
  }, [matriz]);

  // Pedidos filtrados según sucursal y estado
  const pedidosFiltrados = useMemo(() => {
    return pedidosAgrupados.filter(p => {
      if (sucursalFiltro !== 'TODAS' && p.sucursal.toUpperCase() !== sucursalFiltro.toUpperCase()) {
        return false;
      }
      if (soloPendientes && p.totalPendiente <= 0 && p.estatusGeneral.toUpperCase().includes('DESPACH')) {
        return false;
      }
      return true;
    });
  }, [pedidosAgrupados, sucursalFiltro, soloPendientes]);

  // Pedido actualmente activo en pantalla de picking
  const pedidoActivo = useMemo(() => {
    if (!pedidoSeleccionadoId) return null;
    return pedidosAgrupados.find(p => p.pedidoId.toUpperCase() === pedidoSeleccionadoId.toUpperCase()) || null;
  }, [pedidosAgrupados, pedidoSeleccionadoId]);

  // Lista de sucursales únicas para pestañas rápidas
  const sucursalesDisponibles = useMemo(() => {
    const set = new Set<string>();
    pedidosAgrupados.forEach(p => {
      if (p.sucursal) set.add(p.sucursal.toUpperCase());
    });
    return Array.from(set).sort();
  }, [pedidosAgrupados]);

  // Procesamiento unificado de código escaneado (ya sea por pistola, cámara o teclado)
  const procesarCodigoEscaneado = useCallback((rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // 1. ¿Es un ID de Pedido? (ej. PED-CV-2240, PED-VL-2102)
    if (code.startsWith('PED-') || code.includes('-')) {
      const matchPedido = pedidosAgrupados.find(p => p.pedidoId.toUpperCase() === code || p.pedidoId.toUpperCase().includes(code));
      if (matchPedido) {
        setPedidoSeleccionadoId(matchPedido.pedidoId);
        setModo('picking');
        warehouseAudio.playSuccess();
        mostrarMensaje('exito', `Pedido ${matchPedido.pedidoId} cargado en PDT (${matchPedido.sucursal})`);
        setCodigoEscaneado('');
        return;
      }
    }

    // 2. ¿Es un código de repuesto OEM? (ej. 1109013-AW01, S111F...)
    const lineasRepuesto = matriz.filter(f => 
      f.codigoRepuesto.toUpperCase() === code || 
      f.codigoActualizado.toUpperCase() === code ||
      code.includes(f.codigoRepuesto.toUpperCase())
    );

    if (lineasRepuesto.length > 0) {
      warehouseAudio.playSuccess();
      // Si estamos en modo picking y tenemos un pedido activo, verificar si la pieza es de este pedido
      if (modo === 'picking' && pedidoActivo) {
        const itemEnPedido = pedidoActivo.lineas.find(l => 
          l.codigoRepuesto.toUpperCase() === code || 
          l.codigoActualizado.toUpperCase() === code
        );
        if (itemEnPedido) {
          mostrarMensaje('exito', `Repuesto ${code} verificado en Pedido ${pedidoActivo.pedidoId}`);
          setCodigoEscaneado('');
          return;
        } else {
          mostrarMensaje('info', `Repuesto ${code} escaneado. No pertenece a ${pedidoActivo.pedidoId}, pero figura en otros ${lineasRepuesto.length} pedidos.`);
          setModo('consulta_stock');
          setCodigoEscaneado(code);
          return;
        }
      } else {
        setModo('consulta_stock');
        setCodigoEscaneado(code);
        mostrarMensaje('exito', `Repuesto ${code} localizado: ${lineasRepuesto.length} solicitudes activas.`);
        return;
      }
    }

    // 3. Si no es ni pedido ni repuesto de matriz, buscar en Inventario DPL
    const stockDpl = inventario.filter(i => 
      i.codigoRepuesto.toUpperCase() === code || 
      code.includes(i.codigoRepuesto.toUpperCase())
    );

    if (stockDpl.length > 0) {
      warehouseAudio.playSuccess();
      setModo('consulta_stock');
      setCodigoEscaneado(code);
      mostrarMensaje('exito', `Pieza ${code} encontrada en stock DPL (${stockDpl.length} lotes/racks).`);
      return;
    }

    // No encontrado
    warehouseAudio.playError();
    mostrarMensaje('error', `Código "${code}" no encontrado en Matriz ni en DPL.`);
  }, [pedidosAgrupados, matriz, inventario, modo, pedidoActivo]);

  // Listener para pistolas y terminales de hardware (Zebra, Honeywell, etc.)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target !== inputScanRef.current && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'text'))) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (scanBufferRef.current.length > 2) {
          e.preventDefault();
          const bufferCode = scanBufferRef.current.trim().toUpperCase();
          scanBufferRef.current = '';
          procesarCodigoEscaneado(bufferCode);
        }
      } else if (e.key.length === 1) {
        if (diff < 70) {
          scanBufferRef.current += e.key;
        } else {
          scanBufferRef.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [procesarCodigoEscaneado]);

  // Manejador del botón "Despachar Pieza Físicamente"
  const handleDespacharPieza = async (linea: FilaMatrizCentral, cantidadADespachar: number) => {
    setCargandoAccion(true);
    try {
      const res = await onDespachar(linea.lineaId, cantidadADespachar);
      if (res.success) {
        warehouseAudio.playSuccess();
        mostrarMensaje('exito', `Despachado: ${linea.codigoRepuesto} (${cantidadADespachar} u.) -> ${linea.sucursal}`);
        onActualizar();
      } else {
        warehouseAudio.playError();
        mostrarMensaje('error', res.error || 'Error al despachar la pieza.');
      }
    } catch (err: any) {
      warehouseAudio.playError();
      mostrarMensaje('error', err?.message || 'Fallo de conexión al despachar.');
    } finally {
      setCargandoAccion(false);
    }
  };

  // Manejador del botón "Confirmar Despacho Total del Pedido"
  const handleDespacharTodoElPedido = async (pedido: typeof pedidosAgrupados[0]) => {
    const lineasPendientes = pedido.lineas.filter(l => (Number(l.saldoPendiente) > 0 || l.estatusLinea !== 'Despachado'));
    if (lineasPendientes.length === 0) {
      mostrarMensaje('info', 'Todas las piezas de este pedido ya fueron despachadas.');
      return;
    }

    if (!window.confirm(`¿Confirmar despacho físico de ${lineasPendientes.length} repuestos para ${pedido.sucursal} (${pedido.pedidoId})? Esta acción se reflejará irreversiblemente en la Matriz Central.`)) {
      return;
    }

    setCargandoAccion(true);
    let despachadosOk = 0;
    let errores = 0;

    for (const linea of lineasPendientes) {
      const cant = Number(linea.cantidadAsignada) > 0 ? Number(linea.cantidadAsignada) : (Number(linea.cantidadSolicitada) - Number(linea.cantidadDespachada));
      if (cant > 0) {
        const res = await onDespachar(linea.lineaId, cant);
        if (res.success) despachadosOk++;
        else errores++;
      }
    }

    setCargandoAccion(false);
    onActualizar();

    if (errores === 0) {
      warehouseAudio.playDispatchComplete();
      mostrarMensaje('exito', `¡Pedido ${pedido.pedidoId} despachado completamente! (${despachadosOk} piezas actualizadas en Matriz Central)`);
    } else {
      warehouseAudio.playError();
      mostrarMensaje('error', `Despachados ${despachadosOk} repuestos con ${errores} errores.`);
    }
  };

  // Cámara WebRTC para escanear en celular sin pistola
  const toggleCamara = async () => {
    if (camaraActiva) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCamaraActiva(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        setCamaraActiva(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 300);
      } catch (err) {
        mostrarMensaje('error', 'No se pudo acceder a la cámara del dispositivo.');
      }
    }
  };

  // Toggle sonido
  const toggleSonido = () => {
    const nuevo = !sonidoHabilitado;
    setSonidoHabilitado(nuevo);
    warehouseAudio.setEnabled(nuevo);
    if (nuevo) warehouseAudio.playSuccess();
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Header Ergonómico de Bodega */}
      <header className="bg-slate-950/95 border-b border-cyan-500/30 px-3 py-2.5 sm:px-5 sm:py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Logo y Nombre Operario */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onVolverMatriz}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
              title="Volver a la Matriz Central de Escritorio"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Matriz Central</span>
            </button>

            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <ScanBarcode className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono font-black text-emerald-400 tracking-wider uppercase">
                  PDT BODEGA // CEDIS
                </span>
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1 truncate max-w-[140px] sm:max-w-xs">
                <span>{usuarioActivo.nombre}</span>
                <span className="text-[10px] text-slate-400 font-mono">({usuarioActivo.sucursal})</span>
              </div>
            </div>
          </div>

          {/* Controles Rápidos: Sonido, Cámara, Sync */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleSonido}
              className={`p-2 rounded-xl border transition ${
                sonidoHabilitado
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={sonidoHabilitado ? 'Sonido Activado (Beeps industriales)' : 'Silencio'}
            >
              {sonidoHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleCamara}
              className={`p-2 rounded-xl border transition ${
                camaraActiva
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-900 border-slate-800 text-cyan-400 hover:border-cyan-500/50'
              }`}
              title="Activar Cámara Escáner para Móvil"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                onActualizar();
                warehouseAudio.playSuccess();
                mostrarMensaje('info', 'Datos sincronizados con la Matriz Central.');
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 transition"
              title="Recargar Matriz Central"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Visor de Cámara Si está Activa */}
      {camaraActiva && (
        <div className="bg-slate-950 border-b border-cyan-500/40 p-3 flex flex-col items-center justify-center animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover bg-black" />
            <div className="absolute inset-0 border-2 border-dashed border-cyan-400/60 rounded-xl m-4 pointer-events-none flex items-center justify-center">
              <span className="text-[10px] font-mono text-cyan-300 bg-black/60 px-2 py-0.5 rounded">
                Apunta al Código de Barras / QR
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCamara}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notificación Local Flotante */}
      {notificacionLocal && (
        <div className="max-w-md mx-auto w-full px-3 pt-2">
          <div
            className={`p-3 rounded-2xl text-xs font-mono font-bold flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top ${
              notificacionLocal.tipo === 'exito'
                ? 'bg-emerald-950/90 border border-emerald-400 text-emerald-200 shadow-emerald-950/50'
                : notificacionLocal.tipo === 'error'
                ? 'bg-rose-950/90 border border-rose-400 text-rose-200 shadow-rose-950/50'
                : 'bg-cyan-950/90 border border-cyan-400 text-cyan-200 shadow-cyan-950/50'
            }`}
          >
            <div className="flex items-center gap-2">
              {notificacionLocal.tipo === 'exito' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {notificacionLocal.tipo === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              {notificacionLocal.tipo === 'info' && <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />}
              <span>{notificacionLocal.texto}</span>
            </div>
            <button type="button" onClick={() => setNotificacionLocal(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Barra de Escáner Principal (Pistola o Teclado) */}
      <div className="bg-gradient-to-b from-slate-950 to-slate-900/60 p-3 sm:p-4 border-b border-slate-800">
        <div className="max-w-4xl mx-auto space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (codigoEscaneado.trim()) {
                procesarCodigoEscaneado(codigoEscaneado);
              }
            }}
            className="relative"
          >
            <ScanBarcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              ref={inputScanRef}
              type="text"
              value={codigoEscaneado}
              onChange={(e) => setCodigoEscaneado(e.target.value)}
              placeholder="Escanear con pistola láser o escribir (ej: PED-CV-2240, 1109013-AW01)..."
              className="w-full bg-slate-950 border-2 border-cyan-500/60 focus:border-cyan-400 rounded-2xl pl-11 pr-24 py-3 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {codigoEscaneado && (
                <button
                  type="button"
                  onClick={() => setCodigoEscaneado('')}
                  className="p-1 text-slate-400 hover:text-white text-xs font-mono"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold transition shadow"
              >
                PROCESAR
              </button>
            </div>
          </form>

          {/* Pestañas Modales de Operación */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-1">
            <button
              type="button"
              onClick={() => setModo('picking')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                modo === 'picking'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Picking & Despacho</span>
            </button>

            <button
              type="button"
              onClick={() => setModo('consulta_stock')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                modo === 'consulta_stock'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Consultar Repuesto / Racks</span>
            </button>

            <button
              type="button"
              onClick={() => setModo('ruta_sucursal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                modo === 'ruta_sucursal'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Salida Camión / Sucursal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal según el Modo Activo */}
      <main className="max-w-4xl mx-auto w-full p-3 sm:p-4 flex-1 space-y-4">
        {/* ============================================================ */}
        {/* MODO 1: PICKING Y DESPACHO POR PEDIDO                        */}
        {/* ============================================================ */}
        {modo === 'picking' && (
          <div className="space-y-4">
            {!pedidoActivo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <h2 className="text-xs sm:text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                      Pedidos Pendientes de Despacho en CEDIS ({pedidosFiltrados.length})
                    </h2>
                  </div>

                  {/* Filtro por Sucursal */}
                  <select
                    value={sucursalFiltro}
                    onChange={(e) => setSucursalFiltro(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl px-2.5 py-1 focus:outline-none"
                  >
                    <option value="TODAS">Todas las Sucursales</option>
                    {sucursalesDisponibles.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pedidosFiltrados.slice(0, 30).map(p => (
                    <div
                      key={p.pedidoId}
                      onClick={() => {
                        setPedidoSeleccionadoId(p.pedidoId);
                        warehouseAudio.playSuccess();
                      }}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 transition cursor-pointer space-y-2 group shadow-sm hover:shadow-cyan-950/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-cyan-300 group-hover:text-cyan-200">
                          {p.pedidoId}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40 text-[10px] font-mono font-bold">
                          {p.sucursal}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 truncate">
                        <strong>{p.cliente}</strong> · {p.modeloChangan}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">
                          Piezas: <strong className="text-white">{p.lineas.length}</strong> ({p.totalSolicitado} u.)
                        </span>
                        <span className="text-amber-400 font-bold">
                          {p.totalPendiente} u. pendientes
                        </span>
                      </div>
                    </div>
                  ))}

                  {pedidosFiltrados.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-300 font-mono">No hay pedidos pendientes para este filtro</h3>
                      <p className="text-xs text-slate-500">Escanee un código de barras o cambie el filtro de sucursal.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Detalle de Picking para el Pedido Seleccionado */
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-slate-900 border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPedidoSeleccionadoId('')}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Volver a lista
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {pedidoActivo.sucursal}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-xl font-black font-mono text-white tracking-tight">
                        {pedidoActivo.pedidoId}
                      </h2>
                      <div className="text-xs text-slate-300">
                        Cliente: <strong>{pedidoActivo.cliente}</strong> · Modelo: <span className="text-cyan-300">{pedidoActivo.modeloChangan}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        VIN: {pedidoActivo.vin} · Tipo: {pedidoActivo.tipoPedido}
                      </div>
                    </div>

                    <div className="text-right sm:text-right">
                      <div className="text-xs font-mono text-slate-400">Progreso Despacho</div>
                      <div className="text-lg font-black font-mono text-emerald-400">
                        {pedidoActivo.totalDespachado} / {pedidoActivo.totalSolicitado} <span className="text-xs font-normal text-slate-400">u.</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón Masivo de Despacho del Pedido */}
                  <button
                    type="button"
                    disabled={cargandoAccion || pedidoActivo.totalPendiente <= 0}
                    onClick={() => handleDespacharTodoElPedido(pedidoActivo)}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-mono font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>CONFIRMAR DESPACHO DE TODO EL PEDIDO EN MATRIZ CENTRAL</span>
                  </button>
                </div>

                {/* Lista de Repuestos para Picking */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Piezas del Pedido ({pedidoActivo.lineas.length})</span>
                    <span>Ubicación en Bodega</span>
                  </div>

                  {pedidoActivo.lineas.map((linea, idx) => {
                    const cantSolicitada = Number(linea.cantidadSolicitada) || 0;
                    const cantDespachada = Number(linea.cantidadDespachada) || 0;
                    const saldo = Number(linea.saldoPendiente) || Math.max(0, cantSolicitada - cantDespachada);
                    const estaDespachado = saldo <= 0 || linea.estatusLinea === 'Despachado';

                    return (
                      <div
                        key={linea.lineaId || idx}
                        className={`p-4 rounded-2xl border transition space-y-3 ${
                          estaDespachado
                            ? 'bg-slate-950/60 border-emerald-500/40 text-slate-400'
                            : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 text-white'
                        }`}
                      >
                        {/* Cabecera de la Pieza */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-base text-cyan-300">
                                {linea.codigoRepuesto}
                              </span>
                              {linea.codigoActualizado && linea.codigoActualizado !== linea.codigoRepuesto && (
                                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                                  Alt: {linea.codigoActualizado}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                  estaDespachado
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {estaDespachado ? 'DESPACHADO' : 'PENDIENTE'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 mt-0.5">
                              {linea.descripcionOficial}
                            </div>
                          </div>

                          {/* Badge de Ubicación en Bodega (RACK / PALLET / DPL) */}
                          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase">Ubicación Rack</div>
                              <div className="font-bold text-amber-300">
                                {linea.ubicacionCedis || 'BODEGA GENERAL'}
                              </div>
                            </div>
                            {linea.palletAsignado && (
                              <div className="border-l border-slate-800 pl-2">
                                <div className="text-[10px] text-slate-400">Pallet</div>
                                <div className="font-bold text-cyan-300">{linea.palletAsignado}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Detalle de Cantidades y Botón Despachar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
                          <div className="flex items-center gap-3">
                            <span>Sol: <strong className="text-white">{cantSolicitada}</strong></span>
                            <span>Asig: <strong className="text-cyan-400">{linea.cantidadAsignada || 0}</strong></span>
                            <span>Desp: <strong className="text-emerald-400">{cantDespachada}</strong></span>
                            <span>Pend: <strong className="text-amber-400">{saldo}</strong></span>
                          </div>

                          {!estaDespachado ? (
                            <button
                              type="button"
                              disabled={cargandoAccion}
                              onClick={() => handleDespacharPieza(linea, saldo)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Despachar ({saldo} u.)</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4" /> Despachado
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MODO 2: CONSULTA DE REPUESTO / RACKS / STOCK DPL             */}
        {/* ============================================================ */}
        {modo === 'consulta_stock' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Auditoría Rápida de Repuestos en CEDIS
              </h3>
              <p className="text-xs text-slate-400">
                Escanee el código de barras de cualquier repuesto frente al rack para saber si tiene pedidos de sucursales pendientes o consultar sus existencias en contenedores DPL.
              </p>
            </div>

            {codigoEscaneado && (
              <div className="space-y-4">
                {/* 1. Pedidos que esperan esta pieza */}
                <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase">
                        Pedidos Pendientes que Requieren "{codigoEscaneado}"
                      </h4>
                    </div>
                  </div>

                  {matriz.filter(f => 
                    f.codigoRepuesto.toUpperCase() === codigoEscaneado || 
                    f.codigoActualizado.toUpperCase() === codigoEscaneado ||
                    codigoEscaneado.includes(f.codigoRepuesto.toUpperCase())
                  ).length === 0 ? (
                    <div className="text-xs font-mono text-slate-400 p-3 bg-slate-950 rounded-xl">
                      ℹ️ Ninguna sucursal tiene pedidos pendientes para este código en este momento.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matriz.filter(f => 
                        f.codigoRepuesto.toUpperCase() === codigoEscaneado || 
                        f.codigoActualizado.toUpperCase() === codigoEscaneado ||
                        codigoEscaneado.includes(f.codigoRepuesto.toUpperCase())
                      ).map((f, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{f.pedidoId}</span>
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px]">
                                {f.sucursal}
                              </span>
                              <span className="text-slate-400">{f.cliente}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Rack sugerido: <strong className="text-amber-300">{f.ubicacionCedis || 'N/A'}</strong> · Pallet: {f.palletAsignado || 'N/A'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold">
                              {f.saldoPendiente} u. pendientes
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPedidoSeleccionadoId(f.pedidoId);
                                setModo('picking');
                              }}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs"
                            >
                              Ver Pedido
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Stock en Lotes DPL */}
                <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase">
                        Existencias en Contenedores DPL / Racks
                      </h4>
                    </div>
                  </div>

                  {inventario.filter(i => 
                    i.codigoRepuesto.toUpperCase() === codigoEscaneado || 
                    codigoEscaneado.includes(i.codigoRepuesto.toUpperCase())
                  ).length === 0 ? (
                    <div className="text-xs font-mono text-slate-400 p-3 bg-slate-950 rounded-xl">
                      ⚠️ Este repuesto no figura en el inventario de contenedores DPL cargados.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inventario.filter(i => 
                        i.codigoRepuesto.toUpperCase() === codigoEscaneado || 
                        codigoEscaneado.includes(i.codigoRepuesto.toUpperCase())
                      ).map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                          <div>
                            <div className="font-bold text-emerald-300">{item.contenedorId}</div>
                            <div className="text-slate-400 text-[11px]">
                              Pallet: {item.palletCaseNo} · Ubicación: <strong className="text-amber-300">{item.ubicacionCedis}</strong>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">
                              {item.saldoDisponible} <span className="text-xs text-slate-400">u. disponibles</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Total: {item.cantidadTotal} | Desp: {item.cantidadDespachada}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MODO 3: CARGA A CAMIÓN / DESPACHO CONSOLIDADO POR SUCURSAL   */}
        {/* ============================================================ */}
        {modo === 'ruta_sucursal' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" /> Carga a Camión y Despacho a Sucursales
              </h3>
              <p className="text-xs text-slate-400">
                Seleccione la sucursal de destino del camión para validar que todos los pedidos preparados suban a la ruta de transporte oficial de CEDIS.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sucursalesDisponibles.map(suc => {
                const pedidosSucursal = pedidosAgrupados.filter(p => p.sucursal.toUpperCase() === suc.toUpperCase());
                const pedidosPendientes = pedidosSucursal.filter(p => p.totalPendiente > 0);
                const totalPiezasPend = pedidosPendientes.reduce((acc, curr) => acc + curr.totalPendiente, 0);

                return (
                  <div
                    key={suc}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white font-mono text-sm">{suc}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                        {pedidosPendientes.length} pedidos listos
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-300">
                      Piezas por despachar: <strong className="text-amber-400">{totalPiezasPend}</strong> unidades
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSucursalFiltro(suc);
                        setModo('picking');
                        setSoloPendientes(true);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Ver Pedidos de {suc}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Barra Inferior Fija de Estado */}
      <footer className="fixed bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-800/80 px-4 py-2 text-[11px] font-mono text-slate-400 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Matriz Central: {matriz.length} líneas</span>
        </div>
        <button
          type="button"
          onClick={onVolverMatriz}
          className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
        >
          Ir a Matriz Central PC &rarr;
        </button>
      </footer>
    </div>
  );
};
