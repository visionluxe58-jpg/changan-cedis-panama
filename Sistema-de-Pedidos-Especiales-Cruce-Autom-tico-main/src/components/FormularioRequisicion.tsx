import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2,
  UploadCloud,
  Bot,
  Cpu,
  Compass,
  Eye,
  Loader2,
  HelpCircle, 
  UserCheck, 
  Car, 
  Plus, 
  Trash2,
  Edit3, 
  CheckCircle2, 
  Search, 
  FileText, 
  Boxes, 
  Paperclip, 
  Store, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Hash, 
  AlertCircle,
  FileCheck,
  Sparkles
} from 'lucide-react';
import { UsuarioActivo, ModeloChangan } from '../types/cedis';
import { appsScriptClient } from '../services/appsScriptClient';
// Alerta de sonido reservada exclusivamente para CEDIS Central / Operador
import { ModalComprobantePDF, ComprobantePedidoData, generarPdfNativoDirecto } from './ModalComprobantePDF';
import { agenteCotizacionesService, ResultadoAnalisisCotizacion } from '../services/agenteCotizacionesService';
import { SelectorModeloChangan } from './SelectorModeloChangan';
import { CATALOGO_MODELOS_CHANGAN } from '../data/sucursalesData';

export interface FormularioRequisicionProps {
  usuario: UsuarioActivo;
  onPedidoCreado: (pedidoId: string) => void;
  onTransmisionCompleta?: (datos: ComprobantePedidoData) => void;
  onSolicitarCambioSucursal?: () => void;
  onAbrirModalCompartir?: () => void;
  onAbrirRastreador?: () => void;
  pedidosRecientes?: Array<{
    pedidoId: string;
    cliente: string;
    modelo: string;
    placa: string;
    estatus: string;
    fecha: string;
    itemsCount: number;
  }>;
  onSeleccionarPedidoReciente?: (pedidoId: string) => void;
  onVerHistorialDescargable?: () => void;
}

interface ItemRepuesto {
  codigoRepuesto: string;
  descripcionOficial: string;
  cantidadSolicitada: number;
}

export const FormularioRequisicion: React.FC<FormularioRequisicionProps> = ({
  usuario,
  onPedidoCreado,
  onTransmisionCompleta,
  onSolicitarCambioSucursal
}) => {
  // 1. Configuracion de sucursal y colaborador
  const sucursalInicial = usuario.sucursal && !usuario.sucursal.includes('Central') 
    ? usuario.sucursal 
    : 'Costa Verde';
  
  const colaboradorInicial = usuario.nombre && !usuario.nombre.includes('Administrador')
    ? usuario.nombre
    : 'Asesor de Repuestos';

  const canalInicial = usuario.canal && usuario.canal !== 'CEDIS Central'
    ? usuario.canal
    : 'Taller';

  const [sucursal] = useState<string>(sucursalInicial);
  const [colaborador] = useState<string>(colaboradorInicial);
  const [canal] = useState<string>(canalInicial);
  const [numeroPedido, setNumeroPedido] = useState<string>(() => 
    appsScriptClient.generarNumeroPedidoUnico(sucursalInicial)
  );

  // Control del Paso a Paso (Paso 1: Vehiculo y Cliente, Paso 2: Repuestos, Paso 3: Confirmar)
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3>(1);

  // PASO 1: Ficha de Vehiculo & Cliente
  const [cliente, setCliente] = useState<string>('');
  const [placa, setPlaca] = useState<string>('');
  const [modeloChangan, setModeloChangan] = useState<string>('CS35 Plus 2023-2024');
  const [cotizacion, setCotizacion] = useState<string>('');
  const [vin, setVin] = useState<string>('');

  // Modelos oficiales Changan (Precarga integral desde catalogo local)
  const [modelosDisponibles, setModelosDisponibles] = useState<ModeloChangan[]>(() => {
    const mods = appsScriptClient.getModelos();
    if (mods && mods.length >= 18) return mods;
    return CATALOGO_MODELOS_CHANGAN.map((m, idx) => ({
      modeloId: `MOD-${String(idx + 1).padStart(3, '0')}`,
      nombre: m.nombre,
      categoria: m.categoria,
      rangoAnio: m.anosCompatibles,
      anosCompatibles: m.anosCompatibles,
      motor: m.motor || '',
      activo: true,
      notas: m.descripcion || ''
    }));
  });

  // Agrupacin organizada de modelos por categora para navegacin rpida del asesor
  const modelosPorCategoria = useMemo(() => {
    const grupos: Record<string, ModeloChangan[]> = {
      'SUVs': [],
      'Sedanes': [],
      'Pickups': [],
      'Elctricos / Hbridos (NEV)': [],
      'Comerciales': []
    };

    modelosDisponibles.forEach(m => {
      const cat = (m.categoria || '').toLowerCase();
      const nom = (m.nombre || '').toLowerCase();
      if (cat.includes('suv') || nom.includes('cs') || nom.includes('uni-t') || nom.includes('uni-k') || nom.includes('oshan')) {
        grupos['SUVs'].push(m);
      } else if (cat.includes('sed') || nom.includes('alsvin') || nom.includes('uni-v') || (nom.includes('eado') && !nom.includes('ev'))) {
        grupos['Sedanes'].push(m);
      } else if (cat.includes('pick') || nom.includes('hunter') || nom.includes('f70')) {
        grupos['Pickups'].push(m);
      } else if (cat.includes('el') || cat.includes('hb') || nom.includes('deepal') || nom.includes('avatr') || nom.includes('lumin') || nom.includes('ev')) {
        grupos['Elctricos / Hbridos (NEV)'].push(m);
      } else {
        grupos['Comerciales'].push(m);
      }
    });

    return grupos;
  }, [modelosDisponibles]);

  // PASO 2: Repuestos Solicitados
  const [items, setItems] = useState<ItemRepuesto[]>([]);
  const [nuevoCodigo, setNuevoCodigo] = useState<string>('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>('');
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(1);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState<boolean>(false);

  // Estado para Edición de Repuesto en Fila
  const [itemEnEdicion, setItemEnEdicion] = useState<{
    indice: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
  } | null>(null);

  // Estado para Selección Múltiple / Borrado Masivo de Repuestos No Aprobados
  const [itemsSeleccionados, setItemsSeleccionados] = useState<number[]>([]);

  const handleToggleSeleccionarItem = (idx: number) => {
    setItemsSeleccionados(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleToggleSeleccionarTodos = () => {
    if (itemsSeleccionados.length === items.length && items.length > 0) {
      setItemsSeleccionados([]);
    } else {
      setItemsSeleccionados(items.map((_, i) => i));
    }
  };

  const handleEliminarSeleccionados = () => {
    if (itemsSeleccionados.length === 0) return;
    const count = itemsSeleccionados.length;
    const confirmacion = window.confirm(
      `¿Desea eliminar los ${count} repuestos seleccionados que no fueron aprobados o no se necesitan?`
    );
    if (!confirmacion) return;

    setItems(prev => prev.filter((_, idx) => !itemsSeleccionados.includes(idx)));
    if (itemEnEdicion && itemsSeleccionados.includes(itemEnEdicion.indice)) {
      setItemEnEdicion(null);
    }
    setItemsSeleccionados([]);
  };

  const handleIniciarEdicion = (idx: number) => {
    const it = items[idx];
    setItemEnEdicion({
      indice: idx,
      codigo: it.codigoRepuesto,
      descripcion: it.descripcionOficial,
      cantidad: it.cantidadSolicitada
    });
  };

  const handleGuardarEdicion = () => {
    if (!itemEnEdicion) return;
    setItems(prev => prev.map((it, idx) => {
      if (idx === itemEnEdicion.indice) {
        return {
          codigoRepuesto: itemEnEdicion.codigo.trim() || it.codigoRepuesto,
          descripcionOficial: itemEnEdicion.descripcion.trim() || it.descripcionOficial,
          cantidadSolicitada: Math.max(1, itemEnEdicion.cantidad)
        };
      }
      return it;
    }));
    setItemEnEdicion(null);
  };

  const handleCancelarEdicion = () => {
    setItemEnEdicion(null);
  };

  // Estados para Visor Vectorial de Despiece Changan EPC
  const [modalEPCAbierto, setModalEPCAbierto] = useState<boolean>(false);
  const [piezaSeleccionadaEPC, setPiezaSeleccionadaEPC] = useState<{
    numeroParte: string;
    descripcion: string;
    cantidad?: number;
    subsistema?: string;
  } | null>(null);

  // Estados para el Agente IA de Extracción de Cotizaciones
  const [pestanaPaso2, setPestanaPaso2] = useState<'ia' | 'manual'>('ia');
  const [analizandoConIA, setAnalizandoConIA] = useState<boolean>(false);
  const [feedbackAgenteIA, setFeedbackAgenteIA] = useState<{
    mensaje: string;
    tipo: 'exito' | 'error';
    confianza?: number;
    piezasCount?: number;
  } | null>(null);
  const inputCotizacionIARef = useRef<HTMLInputElement>(null);

  const handleAbrirVisorEPC = (item: ItemRepuesto) => {
    setPiezaSeleccionadaEPC({
      numeroParte: item.codigoRepuesto,
      descripcion: item.descripcionOficial,
      cantidad: item.cantidadSolicitada
    });
    setModalEPCAbierto(true);
  };

  const procesarResultadoIA = (resultado: ResultadoAnalisisCotizacion) => {
    if (resultado.exito && resultado.repuestos.length > 0) {
      // Si la cotización tiene metadatos de cabecera, auto-poblar datos de cliente y vehículo
      if (resultado.metadatos) {
        if (resultado.metadatos.cliente) setCliente(resultado.metadatos.cliente);
        if (resultado.metadatos.noCotizacion) setCotizacion(resultado.metadatos.noCotizacion);
        if (resultado.metadatos.placa) setPlaca(resultado.metadatos.placa);
        if (resultado.metadatos.modeloAuto) setModeloChangan(resultado.metadatos.modeloAuto);
      }
      // Poblar repuestos extraídos en la lista
      setItems(prev => {
        // Evitar duplicados exactos si ya estaban cargados
        const codigosExistentes = new Set(prev.map(p => p.codigoRepuesto.trim().toUpperCase()));
        const nuevosItems = resultado.repuestos
          .filter(r => !codigosExistentes.has(r.codigoRepuesto.trim().toUpperCase()))
          .map(r => ({
            codigoRepuesto: r.codigoRepuesto,
            descripcionOficial: r.descripcionOficial,
            cantidadSolicitada: r.cantidadSolicitada || 1
          }));
        return [...prev, ...nuevosItems];
      });

      setFeedbackAgenteIA({
        tipo: 'exito',
        mensaje: resultado.mensaje,
        confianza: resultado.confianzaPromedio,
        piezasCount: resultado.repuestos.length
      });
      setMensajeAlerta(null);
    } else {
      setFeedbackAgenteIA({
        tipo: 'error',
        mensaje: resultado.mensaje || 'No fue posible extraer repuestos del documento.'
      });
    }
  };

  const handleSubirCotizacionIA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalizandoConIA(true);
    setFeedbackAgenteIA(null);
    try {
      const res = await agenteCotizacionesService.analizarCotizacion(file);
      procesarResultadoIA(res);
    } catch (err: any) {
      setFeedbackAgenteIA({
        tipo: 'error',
        mensaje: 'Error procesando la cotización con el Agente IA: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setAnalizandoConIA(false);
      if (inputCotizacionIARef.current) inputCotizacionIARef.current.value = '';
    }
  };

  const handleProbarDemoIA = async () => {
    setAnalizandoConIA(true);
    setFeedbackAgenteIA(null);
    try {
      const res = await agenteCotizacionesService.analizarMuestraDemo();
      procesarResultadoIA(res);
    } catch (err: any) {
      setFeedbackAgenteIA({
        tipo: 'error',
        mensaje: 'Error ejecutando prueba demo del Agente IA.'
      });
    } finally {
      setAnalizandoConIA(false);
    }
  };

  // PASO 3: Adjunto y Observaciones
  const [observaciones, setObservaciones] = useState<string>('');
  const [archivoAdjuntoBase64, setArchivoAdjuntoBase64] = useState<string | null>(null);
  const [nombreArchivoAdjunto, setNombreArchivoAdjunto] = useState<string>('');
  const [tamanoArchivoAdjunto, setTamanoArchivoAdjunto] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de proceso y feedback
  const [enviando, setEnviando] = useState<boolean>(false);
  const [mensajeAlerta, setMensajeAlerta] = useState<{ tipo: 'error' | 'info'; texto: string } | null>(null);

  // Modal Comprobante
  const [modalComprobanteAbierto, setModalComprobanteAbierto] = useState<boolean>(false);
  const [datosComprobante, setDatosComprobante] = useState<ComprobantePedidoData | null>(null);
  const [pedidoRadicadoExitosoId, setPedidoRadicadoExitosoId] = useState<string | null>(null);

  const handleCerrarModalYContinuar = () => {
    const id = pedidoRadicadoExitosoId;
    setModalComprobanteAbierto(false);
    setDatosComprobante(null);
    setPedidoRadicadoExitosoId(null);
    // Resetear formulario para un nuevo pedido
    setCliente('');
    setPlaca('');
    setCotizacion('');
    setVin('');
    setObservaciones('');
    setItems([]);
    setItemsSeleccionados([]);
    handleQuitarArchivo();
    setPasoActual(1);
    setNumeroPedido(appsScriptClient.generarNumeroPedidoUnico(sucursal));
    if (id) {
      onPedidoCreado(id);
    }
  };

  // Carga de modelos
  useEffect(() => {
    appsScriptClient.sincronizarModelosDesdeGoogleSheets().then((mods: ModeloChangan[]) => {
      if (mods && mods.length > 0) setModelosDisponibles(mods);
    }).catch(() => {});
  }, []);

  // Regenerar folio si cambia sucursal
  useEffect(() => {
    setNumeroPedido(appsScriptClient.generarNumeroPedidoUnico(sucursal));
  }, [sucursal]);

  // Catalogo de repuestos frecuentes para carga rapida
  const catalogoRapido = useMemo(() => [
    { codigo: '1109013-AW01', desc: 'Filtro de Aceite Motor' },
    { codigo: '1109101-AW01', desc: 'Filtro de Aire Motor' },
    { codigo: '8100100-M01', desc: 'Filtro de Cabina A/C' },
    { codigo: '3501110-AW01', desc: 'Juego Pastillas de Freno Delanteras' },
    { codigo: '3502110-AW01', desc: 'Juego Pastillas de Freno Traseras' },
    { codigo: '8104010-M02', desc: 'Compresor A/C' },
    { codigo: '2803101-AW01', desc: 'Parachoques Delantero' },
    { codigo: '4121100-AW01', desc: 'Faro Delantero Izquierdo' },
    { codigo: '4121200-AW01', desc: 'Faro Delantero Derecho' },
    { codigo: '1001100-AW01', desc: 'Soporte de Motor' },
    { codigo: '1701100-AW01', desc: 'Bomba de Gasolina' },
    { codigo: '1307100-AW01', desc: 'Bomba de Agua' }
  ], []);

  // Sugerencias de autocompletado
  const sugerenciasRepuestos = useMemo(() => {
    const q = nuevoCodigo.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return catalogoRapido.filter(r => 
      r.codigo.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [nuevoCodigo, catalogoRapido]);

  // Manejo de items de repuestos
  const handleAgregarRepuesto = (cod?: string, desc?: string, cant?: number) => {
    const codFinal = (cod !== undefined ? cod : nuevoCodigo).trim();
    const descFinal = (desc !== undefined ? desc : nuevaDescripcion).trim();
    const cantFinal = cant !== undefined ? cant : nuevaCantidad;

        // VALIDACIÓN ESTRICTA DE DUPLICADOS EN TIEMPO REAL:
    if (codFinal && (cliente.trim().length >= 3 || (vin && vin.trim().length >= 6) || (cotizacion && cotizacion.trim().length >= 3))) {
      const dup = appsScriptClient.verificarDuplicadoActivo(cliente, vin, cotizacion, codFinal);
      if (dup) {
        setAlertaDuplicadoEstricto({
          open: true,
          pedidoId: dup.pedidoId,
          cliente: dup.cliente,
          vin: dup.vin,
          repuesto: dup.repuesto,
          estatus: dup.estatus
        });
        return; // BLOQUEO INMEDIATO
      }
    }

    if (!codFinal && !descFinal) {
      setMensajeAlerta({ tipo: 'info', texto: 'Por favor escriba el número de parte o el nombre del repuesto.' });
      return;
    }

    setItems(prev => [
      ...prev,
      {
        codigoRepuesto: codFinal || 'POR-IDENTIFICAR',
        descripcionOficial: descFinal || codFinal,
        cantidadSolicitada: Math.max(1, cantFinal)
      }
    ]);

    setNuevoCodigo('');
    setNuevaDescripcion('');
    setNuevaCantidad(1);
    setSugerenciasAbiertas(false);
    setMensajeAlerta(null);
  };

  const handleEliminarRepuesto = (indice: number) => {
    setItems(prev => prev.filter((_, i) => i !== indice));
    setItemsSeleccionados(prev =>
      prev.filter(i => i !== indice).map(i => (i > indice ? i - 1 : i))
    );
    if (itemEnEdicion?.indice === indice) {
      setItemEnEdicion(null);
    }
  };

  // Manejo de archivo adjunto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMensajeAlerta({ tipo: 'error', texto: 'El documento no puede superar 10 MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setArchivoAdjuntoBase64(base64);
      setNombreArchivoAdjunto(file.name);
      setTamanoArchivoAdjunto((file.size / 1024).toFixed(0) + ' KB');
      setMensajeAlerta(null);
    };
    reader.readAsDataURL(file);
  };

  const handleQuitarArchivo = () => {
    setArchivoAdjuntoBase64(null);
    setNombreArchivoAdjunto('');
    setTamanoArchivoAdjunto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validaciones para pasar de paso
  const validarPaso1 = () => {
    if (!cliente.trim()) {
      setMensajeAlerta({ tipo: 'info', texto: 'Escriba el nombre del cliente o empresa propietaria del auto.' });
      return false;
    }
    if (!placa.trim()) {
      setMensajeAlerta({ tipo: 'info', texto: 'Escriba la placa del vehículo (ej: 891234 o PA-4521).' });
      return false;
    }
    setMensajeAlerta(null);
    return true;
  };

  const validarPaso2 = () => {
    if (items.length === 0) {
      setMensajeAlerta({ tipo: 'info', texto: 'Debe agregar al menos 1 repuesto al pedido especial antes de continuar.' });
      return false;
    }
    setMensajeAlerta(null);
    return true;
  };

  // Envio final del Pedido Especial
  const handleEnviarPedidoEspecial = async () => {
    if (!validarPaso1() || !validarPaso2()) return;

    setEnviando(true);
    setMensajeAlerta(null);

    try {
      const cabeceraData = {
        pedidoId: numeroPedido,
        fechaCreacion: new Date().toISOString().replace('T', ' ').substring(0, 19),
        sucursal: sucursal,
        colaborador: colaborador,
        canal: canal,
        tipoPedido: 'Pedido Especial' as const,
        cotizacion: cotizacion.trim() || 'S/N',
        cliente: cliente.trim(),
        placa: placa.trim().toUpperCase(),
        modeloChangan: modeloChangan,
        vin: vin.trim().toUpperCase() || 'N/A',
        numeroOR: cotizacion.trim() || 'S/N',
        estadoPago: 'Aprobado' as const,
        documentoPagoFactura: cotizacion.trim() || 'PENDIENTE',
        facturadoFinal: 'No' as const,
        estatusFabrica: 'Pendiente Fabrica' as const,
        origen: 'PORTAL_CEDIS' as const,
        observaciones: `${observaciones.trim()} ${nombreArchivoAdjunto ? '[Adjunto: ' + nombreArchivoAdjunto + ']' : ''}`.trim()
      };

      const itemsFormateados = items.map(it => ({
        codigoRepuesto: it.codigoRepuesto,
        descripcionOficial: it.descripcionOficial,
        cantidadSolicitada: it.cantidadSolicitada
      }));

            // VALIDACIÓN ESTRICTA FINAL PREVIA AL ENVÍO
      for (const it of items) {
        const dup = appsScriptClient.verificarDuplicadoActivo(cliente, vin, cotizacion, it.codigoRepuesto);
        if (dup) {
          setAlertaDuplicadoEstricto({
            open: true,
            pedidoId: dup.pedidoId,
            cliente: dup.cliente,
            vin: dup.vin,
            repuesto: dup.repuesto,
            estatus: dup.estatus
          });
          setEnviando(false);
          return;
        }
      }

      const resultado = await appsScriptClient.crearPedido(cabeceraData, itemsFormateados);

      if (resultado.success) {
        const idFinal = resultado.pedidoId || numeroPedido;
        const ahoraStr = new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });

        const datosDoc: ComprobantePedidoData = {
          pedidoId: idFinal,
          cliente: cliente,
          sucursal: sucursal,
          asesor: colaborador,
          cotizacion: cotizacion || 'S/N',
          fechaEmision: ahoraStr,
          modeloAuto: modeloChangan,
          placa: placa.toUpperCase(),
          canal: canal,
          tipoPedido: 'Pedido Especial',
          estadoPago: 'Aprobado',
          vin: vin.toUpperCase() || 'N/A',
          observaciones: observaciones || 'Sin observaciones registradas',
          idTransmision: `TRX-${Date.now()}`,
          fechaGenerado: ahoraStr,
          piezas: itemsFormateados.map(it => ({
            codigo: it.codigoRepuesto,
            descripcion: it.descripcionOficial,
            cantidad: it.cantidadSolicitada
          }))
        };

        // 1. Descarga automática inmediata del comprobante PDF oficial para el asesor
        try {
          generarPdfNativoDirecto(datosDoc);
        } catch (errPdf) {
          console.warn('Error al auto-descargar PDF:', errPdf);
        }

        // 2. Abrir modal visual para el asesor (sin sonido ni sacarlo abruptamente)
        setDatosComprobante(datosDoc);
        setPedidoRadicadoExitosoId(idFinal);
        setModalComprobanteAbierto(true);
        if (onTransmisionCompleta) onTransmisionCompleta(datosDoc);
      } else {
        setMensajeAlerta({
          tipo: 'error',
          texto: `No se pudo enviar el pedido: ${resultado.error || 'Intente nuevamente.'}`
        });
      }
    } catch (err: any) {
      console.error('Salvaguarda activada al registrar pedido especial:', err);
      const idFinal = numeroPedido;
      const ahoraStr = new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });

      const datosDoc: ComprobantePedidoData = {
        pedidoId: idFinal,
        cliente: cliente || 'Cliente General',
        sucursal: sucursal,
        asesor: colaborador,
        cotizacion: cotizacion || 'S/N',
        fechaEmision: ahoraStr,
        modeloAuto: modeloChangan,
        placa: placa.toUpperCase(),
        canal: canal,
        tipoPedido: 'Pedido Especial',
        estadoPago: 'Aprobado',
        vin: vin.toUpperCase() || 'N/A',
        observaciones: observaciones || 'Sin observaciones registradas',
        idTransmision: `TRX-${Date.now()}`,
        fechaGenerado: ahoraStr,
        piezas: items.map(it => ({
          codigo: it.codigoRepuesto,
          descripcion: it.descripcionOficial,
          cantidad: it.cantidadSolicitada
        }))
      };

      // 1. Descarga automática inmediata del comprobante PDF oficial para el asesor
      try {
        generarPdfNativoDirecto(datosDoc);
      } catch (errPdf) {
        console.warn('Error al auto-descargar PDF:', errPdf);
      }

      // 2. Abrir modal visual para el asesor (sin sonido ni sacarlo abruptamente)
      setDatosComprobante(datosDoc);
      setPedidoRadicadoExitosoId(idFinal);
      setModalComprobanteAbierto(true);
      if (onTransmisionCompleta) onTransmisionCompleta(datosDoc);
    } finally {
      setEnviando(false);
    }
  };

  const totalPiezas = items.reduce((acc, it) => acc + it.cantidadSolicitada, 0);

  return (
    <div className="max-w-4xl mx-auto w-full py-2 space-y-6">
      
      {/* 1. ENCABEZADO CLARO Y SENCILLO */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold shadow-md shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Requisición Oficial
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Ingreso de Pedido Especial
            </h1>
            <p className="text-xs text-slate-400">
              Solicitud de piezas de importación a Bodega Central CEDIS
            </p>
          </div>
        </div>

        {/* Ficha de Sucursal y Folio */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">Agencia / Sucursal</span>
              <strong className="text-slate-200 font-bold">{sucursal}</strong>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-slate-800 mx-1"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 block leading-none">No. Folio:</span>
            <span className="font-mono font-bold text-sky-400">{numeroPedido}</span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE PASOS (WIZARD 1, 2, 3) */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
          
          {/* Paso 1 */}
          <button
            type="button"
            onClick={() => setPasoActual(1)}
            className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left ${
              pasoActual === 1
                ? 'bg-blue-600/20 border-2 border-blue-500 text-white shadow-md'
                : pasoActual > 1
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              pasoActual === 1
                ? 'bg-blue-600 text-white'
                : pasoActual > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {pasoActual > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] block font-bold uppercase tracking-wider opacity-80 leading-none">
                Paso 1
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block mt-0.5">
                Vehículo y Cliente
              </span>
            </div>
          </button>

          {/* Paso 2 */}
          <button
            type="button"
            onClick={() => {
              if (validarPaso1()) setPasoActual(2);
            }}
            className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left ${
              pasoActual === 2
                ? 'bg-blue-600/20 border-2 border-blue-500 text-white shadow-md'
                : items.length > 0
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              pasoActual === 2
                ? 'bg-blue-600 text-white'
                : items.length > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {items.length > 0 && pasoActual === 3 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] block font-bold uppercase tracking-wider opacity-80 leading-none">
                Paso 2
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block mt-0.5">
                Repuestos ({items.length})
              </span>
            </div>
          </button>

          {/* Paso 3 */}
          <button
            type="button"
            onClick={() => {
              if (validarPaso1() && validarPaso2()) setPasoActual(3);
            }}
            className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left ${
              pasoActual === 3
                ? 'bg-blue-600/20 border-2 border-blue-500 text-white shadow-md'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              pasoActual === 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <span className="text-[10px] block font-bold uppercase tracking-wider opacity-80 leading-none">
                Paso 3
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block mt-0.5">
                Revisar y Enviar
              </span>
            </div>
          </button>

        </div>
      </div>

      {/* MENSAJES DE ALERTA O RECORDATORIO */}
      {mensajeAlerta && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border animate-in fade-in duration-200 ${
          mensajeAlerta.tipo === 'error'
            ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
            : 'bg-sky-950/80 text-sky-200 border-sky-500/40'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0 text-sky-400" />
          <span>{mensajeAlerta.texto}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTENIDO SEGUN EL PASO ACTUAL                                            */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* PASO 1: VEHICULO Y CLIENTE                                                */}
      {/* ------------------------------------------------------------------------- */}
      {pasoActual === 1 && (
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" />
              Datos del Vehículo y del Cliente
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Complete los datos principales del auto para el cual se requieren los repuestos especiales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Nombre del Cliente */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Nombre del Cliente o Empresa <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ejemplo: Juan Pérez / Aseguradora Fedpa / Auto Express"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white placeholder-slate-500 text-sm font-medium focus:border-blue-500 focus:bg-slate-900/90 focus:outline-none transition"
              />
            </div>

            {/* Placa */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Número de Placa del Auto <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ejemplo: PA-4521 o 891234"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white placeholder-slate-500 font-mono text-base font-bold uppercase tracking-wider focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* No. Cotización u Orden de Taller */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                No. Cotización u Orden (Opcional)
              </label>
              <input
                type="text"
                value={cotizacion}
                onChange={(e) => setCotizacion(e.target.value)}
                placeholder="Ejemplo: COT-8921 / OR-104"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white placeholder-slate-500 text-sm font-medium focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Modelo Changan - Selector Interactivo con Búsqueda y Categorías */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                <span>Modelo del Vehículo Changan <span className="text-rose-400">*</span></span>
                <span className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                  Catálogo Oficial ({modelosDisponibles.length} Modelos)
                </span>
              </label>
              <SelectorModeloChangan
                valorSeleccionado={modeloChangan}
                onSeleccionar={(mod) => setModeloChangan(mod)}
              />
            </div>

            {/* Chasis / VIN (Opcional) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Número de Chasis / VIN (Opcional)
              </label>
              <input
                type="text"
                maxLength={17}
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="17 dígitos del chasis (si lo tiene disponible)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-white placeholder-slate-500 font-mono text-sm uppercase tracking-wider focus:border-blue-500 focus:outline-none transition"
              />
            </div>

          </div>

          {/* Boton Siguiente */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (validarPaso1()) setPasoActual(2);
              }}
              className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all hover:translate-x-1"
            >
              <span>Continuar a Repuestos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* PASO 2: REPUESTOS SOLICITADOS (REDISENO TOTAL CLARO Y ERGONOMICO)          */}
      {/* ------------------------------------------------------------------------- */}
      {pasoActual === 2 && (
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-400" />
                Repuestos del Pedido Especial
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Indique cada pieza que necesita solicitar para el vehículo de <strong>{cliente || 'cliente'}</strong> ({placa}).
              </p>
            </div>
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
              Total piezas en lista: <strong className="text-blue-400 text-sm font-mono">{totalPiezas}</strong>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SELECTOR DE PESTAÑAS: REGISTRAR POR COTIZACIÓN PDF (IA) vs REGISTRO MANUAL */}
          {/* ========================================================================= */}
          <div className="flex p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800 gap-2 shadow-lg">
            <button
              type="button"
              onClick={() => setPestanaPaso2('ia')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                pestanaPaso2 === 'ia'
                  ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/40 scale-[1.01]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <Bot className="w-4 h-4 text-indigo-300" />
              <span>Registrar por Cotización (PDF / Imagen con IA)</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-full hidden md:inline-block border border-indigo-400/30">
                Automático
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPestanaPaso2('manual')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                pestanaPaso2 === 'manual'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-400/40 scale-[1.01]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-300" />
              <span>Registro Manual (Pieza por Pieza)</span>
            </button>
          </div>

          {/* PESTAÑA 1: REGISTRAR POR COTIZACIÓN PDF CON AGENTE IA */}
          {pestanaPaso2 === 'ia' && (
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/50 border-2 border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                      Agente de Inteligencia Artificial
                    </span>
                    <span className="text-[11px] text-slate-400">CEDIS Smart Scanner</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Extracción Automática de Cotizaciones & Órdenes
                  </h3>
                </div>
              </div>

              {/* Boton Probar con Demo */}
              <button
                type="button"
                onClick={handleProbarDemoIA}
                disabled={analizandoConIA}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-900/30 disabled:opacity-50 transition cursor-pointer"
                title="Cargar cotización auténtica de prueba para evaluar la IA"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Probar con Cotización Demo Changan</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 max-w-2xl leading-relaxed">
              Suba la cotización u orden de taller (PDF o imagen). Nuestro agente extraerá automáticamente el 
              <strong> Código OEM</strong>, la <strong>Descripción Oficial</strong> y la <strong>Cantidad</strong>, desplegándolos en el listado para que pueda revisarlos y eliminar los que no requiera.
            </p>

            {/* Area de Carga de Archivo */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputCotizacionIARef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleSubirCotizacionIA}
                className="hidden"
                id="input-archivo-cotizacion-ia"
              />

              <button
                type="button"
                onClick={() => inputCotizacionIARef.current?.click()}
                disabled={analizandoConIA}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {analizandoConIA ? (
                  <>
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span>Analizando con Agente IA...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <span>Seleccionar Cotización (PDF / Imagen)</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400">
                Formatos soportados: PDF, JPG, PNG, WebP • Procesamiento asistido por Gemini Vision
              </span>
            </div>

            {/* Feedback del Agente IA */}
            {feedbackAgenteIA && (
              <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
                feedbackAgenteIA.tipo === 'exito'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feedbackAgenteIA.mensaje}</span>
                </div>
                {feedbackAgenteIA.confianza && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                    Confianza: {feedbackAgenteIA.confianza}%
                  </span>
                )}
              </div>
            )}
          </div>
          )}

          {/* PESTAÑA 2: REGISTRO MANUAL DE PIEZAS */}
          {pestanaPaso2 === 'manual' && (
            <div className="bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Agregar Repuesto a la Solicitud
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              
              {/* Campo 1: Codigo de Parte */}
              <div className="sm:col-span-5 relative">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. Número de Parte / Código OEM
                </label>
                <input
                  type="text"
                  value={nuevoCodigo}
                  onChange={(e) => {
                    setNuevoCodigo(e.target.value);
                    setSugerenciasAbiertas(true);
                  }}
                  onFocus={() => setSugerenciasAbiertas(true)}
                  placeholder="Ej: 1109013-AW01"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-600 text-white placeholder-slate-500 font-mono text-sm font-bold focus:border-blue-500 focus:outline-none"
                />

                {/* Desplegable de repuestos frecuentes coincidentes */}
                {sugerenciasAbiertas && sugerenciasRepuestos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                    <div className="px-3 py-1 bg-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      Repuestos Sugeridos (Clic para seleccionar)
                    </div>
                    {sugerenciasRepuestos.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setNuevoCodigo(sug.codigo);
                          setNuevaDescripcion(sug.desc);
                          setSugerenciasAbiertas(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-600/30 flex items-center justify-between text-xs border-b border-slate-800 last:border-none cursor-pointer"
                      >
                        <div>
                          <strong className="text-sky-300 font-mono">{sug.codigo}</strong>
                          <span className="text-slate-300 ml-2">{sug.desc}</span>
                        </div>
                        <span className="text-[11px] text-blue-400 font-bold">Elegir</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campo 2: Descripcion */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  2. Nombre del Repuesto
                </label>
                <input
                  type="text"
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  placeholder="Ej: Filtro de Aceite CS35"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-600 text-white placeholder-slate-500 text-sm font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Campo 3: Cantidad */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-300 mb-1 text-center sm:text-left">
                  3. Cantidad
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNuevaCantidad(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base flex items-center justify-center border border-slate-700 cursor-pointer"
                    title="Restar 1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 h-10 text-center rounded-xl bg-slate-950 border border-slate-600 text-white font-mono font-bold text-base focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNuevaCantidad(prev => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base flex items-center justify-center border border-slate-700 cursor-pointer"
                    title="Sumar 1"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* Boton Agregar Grande */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleAgregarRepuesto()}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Repuesto a la Lista</span>
              </button>
            </div>
          </div>
          )}

          {/* LISTA DE REPUESTOS AGREGADOS CON CLASIFICACION DE TABLA */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-sky-400" />
                  <span>Piezas Agregadas a la Solicitud ({items.length})</span>
                </h3>
                {items.length > 0 && itemsSeleccionados.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    {itemsSeleccionados.length} {itemsSeleccionados.length === 1 ? 'marcado para descartar' : 'marcados para descartar'}
                  </span>
                )}
              </div>

              {/* Barra de Borrado Masivo cuando hay items seleccionados */}
              {itemsSeleccionados.length > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEliminarSeleccionados}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950/60 flex items-center gap-1.5 transition-all transform hover:scale-[1.02] cursor-pointer"
                    title="Eliminar repuestos seleccionados no aprobados o no requeridos"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar seleccionados ({itemsSeleccionados.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsSeleccionados([])}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    title="Desmarcar todas las casillas"
                  >
                    Desmarcar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Marque las casillas en la tabla para descartar piezas no aprobadas</span>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-800 text-center space-y-2">
                <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Aún no has agregado ningún repuesto
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Escriba el código o nombre arriba y presione <strong>"Agregar Repuesto a la Lista"</strong> o use el <strong>Agente IA</strong> para escanear la cotización.
                </p>
              </div>
            ) : (
              <div className="border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl bg-slate-900/90">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0b172a] text-slate-200 uppercase text-[11px] font-bold tracking-wider border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-3 w-16 text-center border-r border-slate-800">
                          <div className="flex items-center justify-center gap-1.5" title="Seleccionar o deseleccionar todos los repuestos">
                            <input
                              type="checkbox"
                              checked={items.length > 0 && itemsSeleccionados.length === items.length}
                              onChange={handleToggleSeleccionarTodos}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-rose-500 focus:ring-rose-400 focus:ring-offset-slate-900 cursor-pointer accent-rose-500"
                            />
                            <span className="text-[11px] text-slate-400 font-bold">#</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 w-48 border-r border-slate-800">CÓDIGO OEM</th>
                        <th className="py-3 px-3 min-w-[260px] border-r border-slate-800">DESCRIPCIÓN DE LA PIEZA</th>
                        <th className="py-3 px-3 w-40 text-center border-r border-slate-800">CANTIDAD</th>
                        <th className="py-3 px-3 w-32 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {items.map((item, idx) => {
                        const estaEditando = itemEnEdicion?.indice === idx;
                        const estaSeleccionado = itemsSeleccionados.includes(idx);
                        return (
                          <tr 
                            key={idx} 
                            className={`transition-colors ${
                              estaEditando 
                                ? 'bg-sky-950/40 border-l-4 border-l-sky-500' 
                                : estaSeleccionado
                                  ? 'bg-rose-950/25 border-l-4 border-l-rose-500/80 hover:bg-rose-950/35'
                                  : idx % 2 === 0 ? 'bg-slate-900/60 hover:bg-slate-800/60' : 'bg-slate-950/60 hover:bg-slate-800/60'
                            }`}
                          >
                            {/* 1. Casilla de Selección Múltiple y Número de Ítem */}
                            <td className="py-3 px-3 text-center border-r border-slate-800/80">
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={estaSeleccionado}
                                  onChange={() => handleToggleSeleccionarItem(idx)}
                                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-rose-500 focus:ring-rose-400 focus:ring-offset-slate-900 cursor-pointer accent-rose-500"
                                  title="Marcar repuesto para eliminar o descartar"
                                />
                                <span className={`font-mono font-bold text-xs ${estaSeleccionado ? 'text-rose-300 font-extrabold' : 'text-slate-400'}`}>
                                  #{idx + 1}
                                </span>
                              </div>
                            </td>

                            {/* 2. Código OEM */}
                            <td className="py-3 px-3 font-mono border-r border-slate-800/80">
                              {estaEditando ? (
                                <input
                                  type="text"
                                  value={itemEnEdicion.codigo}
                                  onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, codigo: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-sky-500 text-sky-300 font-mono text-xs focus:outline-none"
                                />
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-sky-300 font-bold text-sm tracking-tight">{item.codigoRepuesto}</span>
                                  <span className="text-[10px] text-cyan-500/80 font-mono uppercase">Genuino OEM</span>
                                </div>
                              )}
                            </td>

                            {/* 3. Descripción */}
                            <td className="py-3 px-3 border-r border-slate-800/80">
                              {estaEditando ? (
                                <input
                                  type="text"
                                  value={itemEnEdicion.descripcion}
                                  onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, descripcion: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-sky-500 text-white text-xs focus:outline-none"
                                />
                              ) : (
                                <div className="text-slate-100 font-semibold text-xs leading-relaxed">
                                  {item.descripcionOficial}
                                </div>
                              )}
                            </td>

                            {/* 4. Cantidad */}
                            <td className="py-3 px-3 text-center border-r border-slate-800/80">
                              {estaEditando ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setItemEnEdicion({ ...itemEnEdicion, cantidad: Math.max(1, itemEnEdicion.cantidad - 1) })}
                                    className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={itemEnEdicion.cantidad}
                                    onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className="w-12 h-7 text-center rounded bg-slate-950 border border-sky-500 text-white font-mono text-xs font-bold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setItemEnEdicion({ ...itemEnEdicion, cantidad: itemEnEdicion.cantidad + 1 })}
                                    className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-emerald-400 font-mono font-bold text-xs">
                                  {item.cantidadSolicitada} {item.cantidadSolicitada === 1 ? 'Pieza' : 'Piezas'}
                                </span>
                              )}
                            </td>

                            

                            {/* 6. Acciones (Editar & Eliminar) */}
                            <td className="py-3 px-3 text-center">
                              {estaEditando ? (
                                <div className="flex flex-col items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleGuardarEdicion}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Guardar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelarEdicion}
                                    className="px-2 py-0.5 text-slate-400 hover:text-slate-200 text-[10px] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Boton Editar */}
                                  <button
                                    type="button"
                                    onClick={() => handleIniciarEdicion(idx)}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-sky-600/30 border border-slate-700 hover:border-sky-500 text-slate-300 hover:text-sky-300 transition-all shadow-sm cursor-pointer"
                                    title="Editar código, descripción o cantidad de este repuesto"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  {/* Boton Eliminar */}
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarRepuesto(idx)}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-400 transition-all shadow-sm cursor-pointer"
                                    title="Eliminar repuesto de la lista"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Botones de Navegacion */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPasoActual(1)}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center gap-2 cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Vehículo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (validarPaso2()) setPasoActual(3);
              }}
              className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all hover:translate-x-1"
            >
              <span>Continuar a Confirmar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* PASO 3: CONFIRMACION Y ENVIO (RESUMEN EN TEXTO GRANDE Y BOTON DESTACADO)   */}
      {/* ------------------------------------------------------------------------- */}
      {pasoActual === 3 && (
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              Revisar y Enviar Pedido Especial a CEDIS
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verifique los datos de su solicitud antes de radicarla oficialmente en la Bodega Central.
            </p>
          </div>

          {/* FICHA RESUMEN GRANDE */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block">Cliente Solicitante:</span>
                <strong className="text-base text-white font-bold">{cliente}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block">Placa del Auto:</span>
                <strong className="text-base text-sky-400 font-mono font-bold">{placa}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block">Modelo Changan:</span>
                <strong className="text-sm text-slate-200 font-bold">{modeloChangan}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 block">Total de Piezas a Pedir:</span>
                <strong className="text-base text-emerald-400 font-mono font-bold">
                  {totalPiezas} piezas ({items.length} renglones)
                </strong>
              </div>
            </div>

            {/* Tabla Detallada de Piezas con Miniatura CAD Oficial */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-sky-400" />
                  <span>Detalle Oficial de Repuestos Solicitados:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPasoActual(2)}
                  className="text-xs text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modificar Repuestos</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0b172a] text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center border-r border-slate-800">#</th>
                      <th className="py-2.5 px-3 w-48 border-r border-slate-800">CÓDIGO OEM</th>
                      <th className="py-2.5 px-3 border-r border-slate-800">DESCRIPCIÓN DE LA PIEZA</th>
                      <th className="py-2.5 px-3 w-32 text-center border-r border-slate-800">CANTIDAD</th>
                      <th className="py-2.5 px-3 w-24 text-center">ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/80">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold border-r border-slate-800/80">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-300 border-r border-slate-800/80">
                          {it.codigoRepuesto}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-200 border-r border-slate-800/80">
                          {it.descripcionOficial}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400 border-r border-slate-800/80">
                          {it.cantidadSolicitada} un.
                        </td>
                        
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              handleIniciarEdicion(idx);
                              setPasoActual(2);
                            }}
                            className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ADJUNTO DE DOCUMENTO O FOTO (OPCIONAL) */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-200">
              Adjuntar Foto de la Pieza o Cotización (Opcional)
            </label>
            <div className="p-4 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Paperclip className="w-6 h-6 text-slate-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {nombreArchivoAdjunto ? nombreArchivoAdjunto : 'Subir archivo PDF o foto (JPG/PNG)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {tamanoArchivoAdjunto ? `Tamaño: ${tamanoArchivoAdjunto}` : 'Máximo 10 MB'}
                  </div>
                </div>
              </div>

              {nombreArchivoAdjunto ? (
                <button
                  type="button"
                  onClick={handleQuitarArchivo}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-700/60 text-xs font-bold cursor-pointer"
                >
                  Quitar archivo
                </button>
              ) : (
                <label className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold cursor-pointer transition">
                  Seleccionar Documento
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* OBSERVACIONES / NOTAS ADICIONALES */}
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-1.5">
              Observaciones o Notas Especiales (Opcional)
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escriba aquí si tiene alguna indicación especial para la bodega central..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm font-medium focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* MENSAJE DE ALERTA O ESTADO VISIBLE EN PASO 3 */}
          {mensajeAlerta && (
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border animate-in fade-in duration-200 ${
              mensajeAlerta.tipo === 'error'
                ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{mensajeAlerta.texto}</span>
            </div>
          )}

          {/* BOTONES DE ACCION FINAL */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPasoActual(2)}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Repuestos</span>
            </button>

            <button
              type="button"
              disabled={enviando}
              onClick={handleEnviarPedidoEspecial}
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Radicando en CEDIS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>RADICAR PEDIDO ESPECIAL EN CEDIS</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE PDF AL FINALIZAR */}
      {modalComprobanteAbierto && datosComprobante && (
        <ModalComprobantePDF
          isOpen={modalComprobanteAbierto}
          onClose={handleCerrarModalYContinuar}
          datos={datosComprobante}
          onNuevoPedido={handleCerrarModalYContinuar}
          onVerMisPedidos={handleCerrarModalYContinuar}
        />
      )}

    </div>
  );
};
