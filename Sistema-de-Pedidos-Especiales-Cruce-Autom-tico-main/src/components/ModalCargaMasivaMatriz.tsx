import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Clipboard, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Layers, 
  Download, 
  Check, 
  RefreshCw,
  Box,
  Truck,
  ExternalLink,
  Info,
  Table,
  Copy,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { appsScriptClient } from '../services/appsScriptClient';
import { DPLDetalle } from '../types/cedis';
import { 
  TODAS_LAS_PLANTILLAS, 
  PLANTILLA_PEDIDOS_SUCURSALES, 
  PLANTILLA_MATRIZ_CENTRAL_COMPLETA, 
  PLANTILLA_MANIFIESTO_DPL, 
  descargarPlantillaExcel, 
  descargarPlantillaCSV, 
  copiarDatosTabulados,
  DefinicionPlantilla
} from '../data/plantillasMatriz';

interface ModalCargaMasivaMatrizProps {
  isOpen: boolean;
  onClose: () => void;
  onImportadoExitoso: () => void;
}

interface FilaImportadaPreview {
  idTemp: string;
  pedidoId?: string;
  lineaId?: string;
  fecha?: string;
  prioridad: string;
  sucursal: string;
  asesor: string;
  cliente: string;
  placa?: string;
  modelo: string;
  vin: string;
  numeroOR: string;
  cotizacion?: string;
  codigoRepuesto: string;
  codigoActualizado?: string;
  descripcion: string;
  cantidadSolicitada: number;
  cantidadAsignada?: number;
  cantidadDespachada?: number;
  observaciones?: string;
  // Cálculo preliminar de matching
  matchStatus: 'disponible' | 'parcial' | 'sin_stock';
  cantAsignable: number;
  contenedorDetectado?: string;
  palletDetectado?: string;
  packageNo?: string;
  ubicacionCedis?: string;
  estatusLinea?: string;
  esDuplicadoActivo?: boolean;
}

const EJEMPLOS_DEMO: Array<Omit<FilaImportadaPreview, 'idTemp' | 'matchStatus' | 'cantAsignable' | 'contenedorDetectado' | 'palletDetectado' | 'esDuplicadoActivo'>> = [
  {
    pedidoId: 'PED-VL-3001',
    prioridad: 'VOR / Unidad Parada',
    sucursal: 'Villa Lucre',
    asesor: 'Leidys Perez',
    cliente: 'Corporación TransCaribe S.A.',
    modelo: 'UNI-T 1.5T',
    vin: 'LS4A2D3C4P0198273',
    numeroOR: 'OR-8921',
    codigoRepuesto: 'S111F270108-0103',
    descripcion: 'Faro Delantero Derecho LED Original',
    cantidadSolicitada: 1,
    observaciones: 'Cliente en espera urgente con vehículo detenido en bahía 3'
  },
  {
    pedidoId: 'PED-CV-3002',
    prioridad: 'Garantía',
    sucursal: 'Costa Verde',
    asesor: 'Carlos Mendoza',
    cliente: 'Constructora del Istmo S.A.',
    modelo: 'Hunter Pick-Up 4x4',
    vin: 'LS4A2B1A2P0049182',
    numeroOR: 'OR-8922',
    codigoRepuesto: 'F202F260100-0100',
    descripcion: 'Bomba de Agua Enfriamiento Motor',
    cantidadSolicitada: 2,
    observaciones: 'Caso de garantía aprobado por gerencia de servicio'
  },
  {
    pedidoId: 'PED-VL-3003',
    prioridad: 'Chapistería y Colisión',
    sucursal: 'Villa Lucre',
    asesor: 'Edwin Blanco',
    cliente: 'Seguros FEDPA - Caso 9912',
    modelo: 'Alsvin 1.4 MT',
    vin: 'LS4A1A1A1P0019284',
    numeroOR: 'OR-8923',
    codigoRepuesto: 'C301F280201-0200',
    descripcion: 'Parachoques Trasero Superior Completo',
    cantidadSolicitada: 1,
    observaciones: 'Reparación de siniestro colisión trasera'
  },
  {
    pedidoId: 'PED-TM-3004',
    prioridad: 'Taller Mecánico',
    sucursal: 'Tumba Muerto',
    asesor: 'Alexis Rios',
    cliente: 'Renta Autos Panamá',
    modelo: 'CS35 Plus Turbo',
    vin: 'LS4A3B2B3P0081726',
    numeroOR: 'OR-8924',
    codigoRepuesto: 'H151F230101-0100',
    descripcion: 'Juego de Pastillas de Freno Delanteras Cerámicas',
    cantidadSolicitada: 4,
    observaciones: 'Mantenimiento preventivo flota de 50,000 km'
  },
  {
    pedidoId: 'PED-C50-3005',
    prioridad: 'Stock Regular',
    sucursal: 'Calle 50',
    asesor: 'Valeria Castillo',
    cliente: 'Mostrador Repuestos Calle 50',
    modelo: 'CS55 Plus DCT',
    vin: '',
    numeroOR: 'COT-4510',
    codigoRepuesto: 'C101F110101-0100',
    descripcion: 'Elemento Filtro de Aceite de Motor',
    cantidadSolicitada: 10,
    observaciones: 'Reabastecimiento regular mostrador'
  }
];

export const ModalCargaMasivaMatriz: React.FC<ModalCargaMasivaMatrizProps> = ({
  isOpen,
  onClose,
  onImportadoExitoso
}) => {
  const [tabActiva, setTabActiva] = useState<'archivo' | 'plantillas' | 'pegar' | 'demo'>('archivo');
  const [plantillaActivaId, setPlantillaActivaId] = useState<'pedidos_sucursales' | 'matriz_completa' | 'manifiesto_dpl'>('pedidos_sucursales');
  const [copiadoPortapapeles, setCopiadoPortapapeles] = useState<boolean>(false);
  const [filasPreview, setFilasPreview] = useState<FilaImportadaPreview[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [procesandoSubida, setProcesandoSubida] = useState<boolean>(false);
  const [errorParseo, setErrorParseo] = useState<string | null>(null);
  const [resultadoSubida, setResultadoSubida] = useState<any | null>(null);

  // Opciones de importación
  const [ejecutarMatchingAuto, setEjecutarMatchingAuto] = useState<boolean>(true);
  const [sincronizarConSheets, setSincronizarConSheets] = useState<boolean>(true);
  const [omitirDuplicados, setOmitirDuplicados] = useState<boolean>(true);

  // Estado para pegar texto
  const [textoPegado, setTextoPegado] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const plantillaActual = TODAS_LAS_PLANTILLAS.find(p => p.id === plantillaActivaId) || PLANTILLA_PEDIDOS_SUCURSALES;

  const handleCopiarPortapapeles = (plantilla: DefinicionPlantilla) => {
    const exito = copiarDatosTabulados(plantilla);
    if (exito) {
      setCopiadoPortapapeles(true);
      setTimeout(() => setCopiadoPortapapeles(false), 2500);
    }
  };

  // Evalúa el matching preliminar con los pallets y contenedores de CEDIS
  const calcularPreMatching = (
    filasCrudas: Array<Omit<FilaImportadaPreview, 'idTemp' | 'matchStatus' | 'cantAsignable' | 'contenedorDetectado' | 'palletDetectado' | 'esDuplicadoActivo'>>
  ): FilaImportadaPreview[] => {
    const inventarioDPL: DPLDetalle[] = appsScriptClient.getDPLDetalle();
    
    // Crear copia de saldos para simular asignación en cascada
    const saldosSimulados = new Map<string, number>();
    inventarioDPL.forEach(inv => {
      const saldo = Math.max(0, (Number(inv.cantidadTotal) || 0) - (Number(inv.cantidadDespachada) || 0));
      saldosSimulados.set(inv.inventarioId, saldo);
    });

    return filasCrudas.map((fila, idx) => {
      const codBuscado = (fila.codigoRepuesto || '').trim().toUpperCase();
      const cantSol = Math.max(1, Number(fila.cantidadSolicitada) || 1);
      let asignable = 0;
      let primerContenedor = '';
      let primerPallet = '';

      // Buscar en lotes de inventario DPL
      for (const lote of inventarioDPL) {
        const codLote = (lote.codigoRepuesto || '').trim().toUpperCase();
        const saldoActual = saldosSimulados.get(lote.inventarioId) || 0;

        if (codLote === codBuscado && saldoActual > 0) {
          const asignar = Math.min(cantSol - asignable, saldoActual);
          asignable += asignar;
          saldosSimulados.set(lote.inventarioId, saldoActual - asignar);

          if (!primerContenedor) {
            primerContenedor = lote.contenedorId;
            primerPallet = lote.palletCaseNo;
          }

          if (asignable >= cantSol) break;
        }
      }

      // Validar duplicado activo
      const esDup = !!appsScriptClient.verificarDuplicadoActivo(
        fila.cliente,
        fila.vin,
        fila.numeroOR,
        fila.codigoRepuesto
      );

      let matchStatus: 'disponible' | 'parcial' | 'sin_stock' = 'sin_stock';
      if (asignable >= cantSol) {
        matchStatus = 'disponible';
      } else if (asignable > 0) {
        matchStatus = 'parcial';
      }

      return {
        ...fila,
        idTemp: `PREV-${idx + 1}`,
        matchStatus,
        cantAsignable: asignable,
        contenedorDetectado: primerContenedor,
        palletDetectado: primerPallet,
        esDuplicadoActivo: esDup
      };
    });
  };

  // Procesar archivo Excel (.xlsx / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargando(true);
    setErrorParseo(null);
    setResultadoSubida(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawRows.length < 2) {
          throw new Error('El archivo no contiene suficientes filas (se requiere fila de cabecera y al menos una fila de datos).');
        }

        const headers = (rawRows[0] as any[]).map(h => String(h || '').trim().toLowerCase());
        
        // Mapeo flexible de columnas compatible con las 3 plantillas y 25 campos
        const colMap = {
          pedidoId: headers.findIndex(h => h.includes('id_pedido') || h.includes('pedido_id') || h.includes('pedido')),
          lineaId: headers.findIndex(h => h.includes('linea_id') || h.includes('id_linea') || h.includes('linea')),
          fecha: headers.findIndex(h => h.includes('fecha')),
          prioridad: headers.findIndex(h => h.includes('prioridad') || h.includes('tipo')),
          sucursal: headers.findIndex(h => h.includes('sucursal') || h.includes('agencia') || h.includes('sede')),
          asesor: headers.findIndex(h => h.includes('asesor') || h.includes('solicitante') || h.includes('colaborador')),
          cliente: headers.findIndex(h => h.includes('cliente') || h.includes('caso') || h.includes('propietario')),
          placa: headers.findIndex(h => h.includes('placa') || h.includes('matricula')),
          modelo: headers.findIndex(h => h.includes('modelo') || h.includes('vehiculo') || h.includes('auto')),
          vin: headers.findIndex(h => h.includes('vin') || h.includes('chasis')),
          numeroOR: headers.findIndex(h => h.includes('numero_or') || h.includes('no_or') || h.includes('or') || h.includes('orden')),
          cotizacion: headers.findIndex(h => h.includes('cotiz') || h.includes('quote')),
          codigo: headers.findIndex(h => h.includes('codigo') || h.includes('código') || h.includes('repuesto') || h.includes('sku') || h.includes('oem') || h.includes('parte')),
          codigoActualizado: headers.findIndex(h => h.includes('actualiz') || h.includes('sustitut')),
          descripcion: headers.findIndex(h => h.includes('descrip') || h.includes('nombre') || h.includes('articulo')),
          cantidad: headers.findIndex(h => h.includes('cant') || h.includes('solicitada') || h.includes('qty')),
          cantidadAsignada: headers.findIndex(h => h.includes('asignad')),
          cantidadDespachada: headers.findIndex(h => h.includes('despach')),
          contenedor: headers.findIndex(h => h.includes('contened')),
          pallet: headers.findIndex(h => h.includes('pallet') || h.includes('case')),
          packageNo: headers.findIndex(h => h.includes('pack') || h.includes('caja') || h.includes('bulto')),
          ubicacion: headers.findIndex(h => h.includes('ubicac') || h.includes('bahia')),
          estatusLinea: headers.findIndex(h => h.includes('estatus') || h.includes('estado')),
          observaciones: headers.findIndex(h => h.includes('obs') || h.includes('nota') || h.includes('comentario'))
        };

        const filasProcesadas: any[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          // Código de repuesto es el campo mínimo mandatorio
          const cod = colMap.codigo !== -1 ? String(row[colMap.codigo] || '').trim().toUpperCase() : '';
          if (!cod) continue;

          const cant = colMap.cantidad !== -1 ? Math.max(1, parseInt(row[colMap.cantidad]) || 1) : 1;
          const desc = colMap.descripcion !== -1 ? String(row[colMap.descripcion] || 'Repuesto Changan').trim() : 'Repuesto Changan';
          const cli = colMap.cliente !== -1 ? String(row[colMap.cliente] || 'Cliente Sucursal').trim() : 'Cliente Sucursal';
          const suc = colMap.sucursal !== -1 ? String(row[colMap.sucursal] || 'Villa Lucre').trim() : 'Villa Lucre';
          const ase = colMap.asesor !== -1 ? String(row[colMap.asesor] || 'Asesor Sucursal').trim() : 'Asesor Sucursal';
          const prio = colMap.prioridad !== -1 ? String(row[colMap.prioridad] || 'Stock Regular').trim() : 'Stock Regular';
          const mod = colMap.modelo !== -1 ? String(row[colMap.modelo] || 'General Changan').trim() : 'General Changan';
          const v = colMap.vin !== -1 ? String(row[colMap.vin] || '').trim().toUpperCase() : '';
          const or = colMap.numeroOR !== -1 ? String(row[colMap.numeroOR] || '').trim() : '';
          const pedId = colMap.pedidoId !== -1 ? String(row[colMap.pedidoId] || '').trim() : '';
          const linId = colMap.lineaId !== -1 ? String(row[colMap.lineaId] || '').trim() : '';
          const fec = colMap.fecha !== -1 ? String(row[colMap.fecha] || '').trim() : '';
          const pla = colMap.placa !== -1 ? String(row[colMap.placa] || '').trim().toUpperCase() : '';
          const cot = colMap.cotizacion !== -1 ? String(row[colMap.cotizacion] || '').trim() : '';
          const codAct = colMap.codigoActualizado !== -1 ? String(row[colMap.codigoActualizado] || '').trim().toUpperCase() : '';
          const cantAsig = colMap.cantidadAsignada !== -1 ? parseInt(row[colMap.cantidadAsignada]) || 0 : 0;
          const cantDesp = colMap.cantidadDespachada !== -1 ? parseInt(row[colMap.cantidadDespachada]) || 0 : 0;
          const cont = colMap.contenedor !== -1 ? String(row[colMap.contenedor] || '').trim() : '';
          const pall = colMap.pallet !== -1 ? String(row[colMap.pallet] || '').trim() : '';
          const pack = colMap.packageNo !== -1 ? String(row[colMap.packageNo] || '').trim() : '';
          const ubi = colMap.ubicacion !== -1 ? String(row[colMap.ubicacion] || '').trim() : '';
          const estL = colMap.estatusLinea !== -1 ? String(row[colMap.estatusLinea] || '').trim() : '';
          const obs = colMap.observaciones !== -1 ? String(row[colMap.observaciones] || '').trim() : '';

          filasProcesadas.push({
            pedidoId: pedId || undefined,
            lineaId: linId || undefined,
            fecha: fec || undefined,
            prioridad: prio,
            sucursal: suc,
            asesor: ase,
            cliente: cli,
            placa: pla,
            modelo: mod,
            vin: v,
            numeroOR: or,
            cotizacion: cot,
            codigoRepuesto: cod,
            codigoActualizado: codAct,
            descripcion: desc,
            cantidadSolicitada: cant,
            cantidadAsignada: cantAsig,
            cantidadDespachada: cantDesp,
            contenedorDetectado: cont,
            palletDetectado: pall,
            packageNo: pack,
            ubicacionCedis: ubi,
            estatusLinea: estL,
            observaciones: obs
          });
        }

        if (filasProcesadas.length === 0) {
          throw new Error('No se detectaron códigos de repuesto válidos en el archivo. Por favor verifica las cabeceras.');
        }

        const previewConMatching = calcularPreMatching(filasProcesadas);
        setFilasPreview(previewConMatching);
      } catch (err: any) {
        console.error('Error al leer Excel:', err);
        setErrorParseo(err.message || 'Error al procesar el archivo Excel.');
      } finally {
        setCargando(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Procesar texto pegado (tab-delimited o coma)
  const handleProcesarPegado = () => {
    if (!textoPegado.trim()) {
      setErrorParseo('Pega los datos tabulares antes de continuar.');
      return;
    }

    setErrorParseo(null);
    setResultadoSubida(null);

    try {
      const lineas = textoPegado.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lineas.length === 0) throw new Error('El texto no contiene líneas válidas.');

      const delimitador = lineas[0].includes('\t') ? '\t' : (lineas[0].includes(';') ? ';' : ',');
      const filasProcesadas: any[] = [];

      // Verificar si la primera fila es cabecera
      const primeraFila = lineas[0].split(delimitador).map(c => c.trim().toLowerCase());
      const tieneCabecera = primeraFila.some(c => c.includes('cod') || c.includes('repuesto') || c.includes('oem') || c.includes('cliente'));
      const inicio = tieneCabecera ? 1 : 0;

      for (let i = inicio; i < lineas.length; i++) {
        const partes = lineas[i].split(delimitador).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (partes.length === 0) continue;

        // Asignación por orden o detección básica
        let cod = '';
        let desc = 'Repuesto Genuino Changan';
        let cant = 1;
        let cli = 'Cliente Sucursal';
        let prio = 'Stock Regular';
        let suc = 'Villa Lucre';
        let mod = 'General Changan';
        let vin = '';
        let or = '';

        if (partes.length === 1) {
          cod = partes[0].toUpperCase();
        } else if (partes.length >= 2) {
          // Si primera columna parece código (ej: S111F... o C301...)
          if (partes[0].length >= 5 && /\d/.test(partes[0])) {
            cod = partes[0].toUpperCase();
            desc = partes[1] || desc;
            cant = parseInt(partes[2]) || 1;
            cli = partes[3] || cli;
            suc = partes[4] || suc;
            prio = partes[5] || prio;
          } else {
            // Primera columna es cliente o pedido
            cli = partes[0];
            cod = (partes[1] || '').toUpperCase();
            desc = partes[2] || desc;
            cant = parseInt(partes[3]) || 1;
            suc = partes[4] || suc;
            prio = partes[5] || prio;
            mod = partes[6] || mod;
            vin = partes[7] || vin;
            or = partes[8] || or;
          }
        }

        if (cod) {
          filasProcesadas.push({
            prioridad: prio,
            sucursal: suc,
            asesor: 'Asesor Mostrador',
            cliente: cli,
            modelo: mod,
            vin,
            numeroOR: or,
            codigoRepuesto: cod,
            descripcion: desc,
            cantidadSolicitada: cant
          });
        }
      }

      if (filasProcesadas.length === 0) {
        throw new Error('No se detectaron filas válidas de repuestos con código OEM en el texto pegado.');
      }

      const preview = calcularPreMatching(filasProcesadas);
      setFilasPreview(preview);
    } catch (err: any) {
      setErrorParseo(err.message || 'Error al procesar el texto.');
    }
  };

  // Cargar datos de demostración
  const handleCargarDemo = () => {
    setErrorParseo(null);
    setResultadoSubida(null);
    const demoConMatching = calcularPreMatching(EJEMPLOS_DEMO);
    setFilasPreview(demoConMatching);
  };

  // Descargar plantilla oficial Excel (.xlsx)
  const handleDescargarPlantillaExcel = () => {
    const cabeceras = [
      'ID Pedido (Opcional)',
      'Prioridad (VOR, Garantía, Chapistería, Taller, Stock)',
      'Sucursal (Villa Lucre, Costa Verde, Calle 50, Tumba Muerto)',
      'Asesor / Solicitante',
      'Cliente / Caso',
      'Modelo Changan',
      'VIN / Chasis',
      'No. O.R. / Cotización',
      'Código OEM (*Obligatorio)',
      'Descripción Repuesto',
      'Cantidad Solicitada (*Obligatorio)',
      'Observaciones'
    ];

    const filasEjemplo = [
      ['PED-VL-4001', 'VOR / Unidad Parada', 'Villa Lucre', 'Leidys Perez', 'Camilo Rodríguez', 'UNI-T 1.5T', 'LS4A2D3C4P0198273', 'OR-7710', 'S111F270108-0103', 'Faro Delantero Derecho LED', 1, 'Auto varado en taller'],
      ['PED-CV-4002', 'Garantía', 'Costa Verde', 'Carlos Mendoza', 'Flotas Panamá Inc.', 'Hunter 4x4', 'LS4A2B1A2P0049182', 'OR-7711', 'F202F260100-0100', 'Bomba de Agua Motor', 2, 'Garantía de fábrica'],
      ['PED-TM-4003', 'Chapistería y Colisión', 'Tumba Muerto', 'Alexis Rios', 'Aseguradora Ancon', 'Alsvin 1.4', 'LS4A1A1A1P0019284', 'OR-7712', 'C301F280201-0200', 'Parachoques Trasero Superior', 1, 'Colisión frontal y trasera'],
      ['PED-C50-4004', 'Stock Regular', 'Calle 50', 'Valeria Castillo', 'Mostrador Repuestos', 'CS35 Plus', '', 'COT-9901', 'H151F230101-0100', 'Pastillas de Freno Delanteras', 5, 'Reposición de stock']
    ];

    const ws = XLSX.utils.aoa_to_sheet([cabeceras, ...filasEjemplo]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Pedidos_CEDIS');
    XLSX.writeFile(wb, 'Plantilla_Carga_Masiva_Pedidos_CEDIS_Changan.xlsx');
  };

  // Confirmar y subir masivamente a Matriz Central + Google Sheets
  const handleConfirmarSubida = async () => {
    if (filasPreview.length === 0) return;

    setProcesandoSubida(true);
    setErrorParseo(null);

    try {
      // Filtrar si el usuario eligió omitir duplicados
      const filasAImportar = omitirDuplicados
        ? filasPreview.filter(f => !f.esDuplicadoActivo)
        : filasPreview;

      if (filasAImportar.length === 0) {
        throw new Error('Todas las filas son duplicados activos de pedidos previos y la opción de omitir está activada.');
      }

      const res = await appsScriptClient.importarPedidosMasivos(
        filasAImportar.map(f => ({
          pedidoId: f.pedidoId,
          lineaId: f.lineaId,
          fecha: f.fecha,
          prioridad: f.prioridad,
          sucursal: f.sucursal,
          asesor: f.asesor,
          cliente: f.cliente,
          placa: f.placa,
          modelo: f.modelo,
          vin: f.vin,
          numeroOR: f.numeroOR,
          cotizacion: f.cotizacion,
          codigoRepuesto: f.codigoRepuesto,
          codigoActualizado: f.codigoActualizado,
          descripcion: f.descripcion,
          cantidadSolicitada: f.cantidadSolicitada,
          cantidadAsignada: f.cantidadAsignada,
          cantidadDespachada: f.cantidadDespachada,
          contenedorAsignado: f.contenedorDetectado,
          palletAsignado: f.palletDetectado,
          packageNo: f.packageNo,
          ubicacionCedis: f.ubicacionCedis,
          estatusLinea: f.estatusLinea,
          observaciones: f.observaciones
        })),
        {
          ejecutarMatching: ejecutarMatchingAuto,
          sincronizarGoogleSheets: sincronizarConSheets
        }
      );

      if (!res.success) {
        throw new Error(res.error || 'Error al ejecutar la carga masiva.');
      }

      setResultadoSubida(res);
      onImportadoExitoso();
    } catch (err: any) {
      console.error('Error al subir pedidos masivos:', err);
      setErrorParseo(err.message || 'Error al procesar la carga masiva.');
    } finally {
      setProcesandoSubida(false);
    }
  };

  const totalPiezasSolicitadas = filasPreview.reduce((sum, f) => sum + (f.cantidadSolicitada || 0), 0);
  const totalPiezasAsignadas = filasPreview.reduce((sum, f) => sum + (f.cantAsignable || 0), 0);
  const totalConMatch = filasPreview.filter(f => f.matchStatus === 'disponible').length;
  const totalParciales = filasPreview.filter(f => f.matchStatus === 'parcial').length;
  const totalSinStock = filasPreview.filter(f => f.matchStatus === 'sin_stock').length;
  const totalDuplicados = filasPreview.filter(f => f.esDuplicadoActivo).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Carga Masiva de Pedidos a Matriz Central
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Matching Automático FIFO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sube pedidos masivamente en Excel/CSV. El sistema reconoce automáticamente el contenedor, pallet, cantidades asignadas y cliente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Carga */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setTabActiva('archivo')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              tabActiva === 'archivo'
                ? 'text-emerald-400 border-emerald-500 bg-slate-900/90'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Subir Archivo Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('plantillas')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              tabActiva === 'plantillas'
                ? 'text-emerald-400 border-emerald-500 bg-slate-900/90'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Centro de Plantillas Oficiales ({TODAS_LAS_PLANTILLAS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('pegar')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              tabActiva === 'pegar'
                ? 'text-emerald-400 border-emerald-500 bg-slate-900/90'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Pegar Datos (Copiar y Pegar)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTabActiva('demo');
              if (filasPreview.length === 0) handleCargarDemo();
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer ${
              tabActiva === 'demo'
                ? 'text-emerald-400 border-emerald-500 bg-slate-900/90'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Cargar Ejemplos Demo</span>
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Alerta de Error */}
          {errorParseo && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorParseo}</span>
            </div>
          )}

          {/* Banner de Éxito cuando se completa la subida */}
          {resultadoSubida && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-2 text-emerald-200 text-xs shadow-lg">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>¡Carga Masiva y Matching Completados Exitosamente!</span>
              </div>
              <p className="leading-relaxed text-emerald-100">
                Se registraron <strong>{resultadoSubida.pedidosCreados} pedidos</strong> con un total de <strong>{resultadoSubida.lineasCreadas} líneas de repuesto</strong> en la Matriz Central.
                {resultadoSubida.reporteMatching && (
                  <span className="block mt-1 text-emerald-300 font-medium">
                    🎯 {resultadoSubida.reporteMatching.mensaje}
                  </span>
                )}
                {resultadoSubida.syncSheets && (
                  <span className="block mt-1 text-sky-300 font-mono text-[11px]">
                    📊 Google Sheets: {resultadoSubida.syncSheets.mensaje}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* CONTENIDO SEGÚN PESTAÑA */}
          {tabActiva === 'archivo' && (
            <div className="space-y-4">
              {/* Barra de Acceso Rápido a Descargas */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¿Aún no tienes la plantilla oficial?</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Descarga el formato exacto en Excel con los campos mandatorios listos para llenar:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => descargarPlantillaExcel(PLANTILLA_PEDIDOS_SUCURSALES)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Descargar Plantilla de Requisiciones de Sucursales (.xlsx)"
                  >
                    <Download className="w-3 h-3" />
                    <span>1. Pedidos Sucursales (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => descargarPlantillaExcel(PLANTILLA_MATRIZ_CENTRAL_COMPLETA)}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Descargar Plantilla de Matriz Completa 25 Campos (.xlsx)"
                  >
                    <Download className="w-3 h-3" />
                    <span>2. Matriz 25 Campos (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabActiva('plantillas')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Info className="w-3 h-3 text-amber-400" />
                    <span>Ver Diccionario &amp; Reglas</span>
                  </button>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-slate-950/50 hover:bg-slate-900/60 transition rounded-xl p-8 text-center cursor-pointer space-y-2 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto transition border border-emerald-500/20">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-200 font-semibold">
                  Haz clic para examinar o arrastra aquí tu archivo Excel o CSV
                </div>
                <div className="text-[11px] text-slate-400">
                  Soporta plantillas de pedidos de sucursal, consolidado de 25 campos o listados de repuestos OEM
                </div>
              </div>
            </div>
          )}

          {/* NUEVA PESTAÑA: CENTRO DE PLANTILLAS OFICIALES Y DICCIONARIO */}
          {tabActiva === 'plantillas' && (
            <div className="space-y-4">
              {/* Selector de las 3 plantillas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {TODAS_LAS_PLANTILLAS.map((plantilla) => {
                  const esActiva = plantillaActual.id === plantilla.id;
                  return (
                    <button
                      key={plantilla.id}
                      type="button"
                      onClick={() => {
                        setPlantillaActivaId(plantilla.id);
                        setCopiadoPortapapeles(false);
                      }}
                      className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        esActiva
                          ? 'bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${esActiva ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {plantilla.id === 'pedidos_sucursales' && '1. Pedidos Sucursales (Recomendada)'}
                          {plantilla.id === 'matriz_completa' && '2. Matriz Central 25 Campos'}
                          {plantilla.id === 'manifiesto_dpl' && '3. Manifiesto DPL / Embarques'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {plantilla.cabeceras.length} col.
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {plantilla.subtitulo}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Barra de Descarga de la Plantilla Seleccionada */}
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-xs font-mono font-bold border border-slate-700">
                    {plantillaActual.cabeceras.length} Columnas
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {plantillaActual.nombreArchivo}.xlsx
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopiarPortapapeles(plantillaActual)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiadoPortapapeles ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiadoPortapapeles ? '¡Copiado!' : 'Copiar para Excel/Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => descargarPlantillaCSV(plantillaActual)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Descargar .CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => descargarPlantillaExcel(plantillaActual)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Excel (.XLSX)</span>
                  </button>
                </div>
              </div>

              {/* Diccionario de Campos de la Plantilla Seleccionada */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-md">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Table className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Diccionario de Cabeceras y Validaciones Mandatorias</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {plantillaActual.campos.filter(c => c.obligatorio).length} campos obligatorios
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 text-slate-400 font-mono text-[10px] uppercase sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Columna en Excel</th>
                        <th className="py-2 px-3 text-center">Requerido</th>
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Descripción / Propósito</th>
                        <th className="py-2 px-3">Valores Válidos</th>
                        <th className="py-2 px-3">Ejemplo Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {plantillaActual.campos.map((campo, idx) => (
                        <tr key={campo.clave} className="hover:bg-slate-900/40 transition">
                          <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-emerald-300 font-mono">
                            {campo.nombre}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {campo.obligatorio ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                SÍ
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-900 border border-slate-800">
                                Opcional
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-sans">
                            {campo.tipo}
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-sans max-w-xs leading-relaxed">
                            {campo.descripcion}
                          </td>
                          <td className="py-2 px-3 text-slate-400 font-sans max-w-xs">
                            {campo.valoresPermitidos ? (
                              <div className="flex flex-wrap gap-1">
                                {campo.valoresPermitidos.map(val => (
                                  <span key={val} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300">
                                    {val}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic font-mono text-[10px]">Texto libre / Número</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-amber-300 font-mono">
                            {campo.ejemplo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'pegar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  Copia filas completas desde Microsoft Excel o Google Sheets y pégalas aquí:
                </span>
                <span className="text-[11px] text-slate-400">
                  Separado por tabulaciones o comas
                </span>
              </div>
              <textarea
                rows={5}
                value={textoPegado}
                onChange={(e) => setTextoPegado(e.target.value)}
                placeholder="Ejemplo:&#10;S111F270108-0103	Faro Delantero Derecho	1	Carlos Rodríguez	Villa Lucre	VOR&#10;F202F260100-0100	Bomba de Agua Motor	2	Constructora del Istmo	Costa Verde	Garantía"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600 leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcesarPegado}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Procesar Texto Pegado</span>
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'demo' && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    5 Solicitudes Oficiales Preparadas para Prueba
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Incluye casos VOR de unidad detenida, garantías y colisiones para modelos UNI-T, Hunter, Alsvin y CS35 Plus.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCargarDemo}
                  className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recargar Demo</span>
                </button>
              </div>
            </div>
          )}

          {/* TABLA DE PREVISUALIZACIÓN Y PRE-MATCHING */}
          {filasPreview.length > 0 && (
            <div className="space-y-3 pt-2">
              {/* Barra de Estadísticas Preliminares */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Líneas</span>
                  <span className="text-base font-bold text-white font-mono">{filasPreview.length}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Piezas Asignables</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {totalPiezasAsignadas} / {totalPiezasSolicitadas} u.
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-emerald-300 uppercase font-semibold block">Disponibles Pallet</span>
                  <span className="text-base font-bold text-emerald-300 font-mono">{totalConMatch}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">Asig. Parcial</span>
                  <span className="text-base font-bold text-amber-400 font-mono">{totalParciales}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-rose-400 uppercase font-semibold block">Sin Stock CEDIS</span>
                  <span className="text-base font-bold text-rose-400 font-mono">{totalSinStock}</span>
                </div>
              </div>

              {/* Mensaje de Duplicados */}
              {totalDuplicados > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-300 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Se detectaron <strong>{totalDuplicados} pedido(s) duplicados</strong> que ya tienen solicitudes activas con el mismo cliente/VIN.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={omitirDuplicados}
                      onChange={(e) => setOmitirDuplicados(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                    />
                    <span>Omitir duplicados automáticamente</span>
                  </label>
                </div>
              )}

              {/* Tabla de Registros */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 text-slate-400 font-mono text-[10px] uppercase sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="px-3 py-2.5">Prioridad / Cliente</th>
                        <th className="px-3 py-2.5">Sucursal / Asesor</th>
                        <th className="px-3 py-2.5">Código Repuesto OEM</th>
                        <th className="px-3 py-2.5 text-center">Cant Sol.</th>
                        <th className="px-3 py-2.5">Matching Reconocido (Contenedor / Pallet)</th>
                        <th className="px-3 py-2.5 text-center">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filasPreview.map((fila) => (
                        <tr
                          key={fila.idTemp}
                          className={`hover:bg-slate-800/30 transition ${
                            fila.esDuplicadoActivo && omitirDuplicados ? 'opacity-40 line-through' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-white truncate max-w-[170px]" title={fila.cliente}>
                              {fila.cliente}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <span className={`font-semibold ${
                                fila.prioridad.includes('VOR') ? 'text-rose-400' :
                                fila.prioridad.includes('Garantía') ? 'text-amber-400' : 'text-slate-300'
                              }`}>
                                {fila.prioridad}
                              </span>
                              {fila.vin && <span className="text-slate-500 font-mono ml-1.5">• VIN: {fila.vin.substring(0, 8)}...</span>}
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="text-slate-200">{fila.sucursal}</div>
                            <div className="text-[10px] text-slate-400">{fila.asesor}</div>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="font-mono text-sky-300 font-bold">{fila.codigoRepuesto}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={fila.descripcion}>
                              {fila.descripcion}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-center font-bold text-white">
                            {fila.cantidadSolicitada} u.
                          </td>

                          <td className="px-3 py-2.5">
                            {fila.contenedorDetectado ? (
                              <div>
                                <div className="font-semibold text-emerald-300 flex items-center gap-1 text-[11px]">
                                  <Box className="w-3 h-3 text-emerald-400" />
                                  <span>{fila.contenedorDetectado}</span>
                                </div>
                                <div className="text-[10px] text-slate-300 font-mono">
                                  Pallet: <strong className="text-white">{fila.palletDetectado}</strong> ({fila.cantAsignable} u. asignadas)
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic">
                                Sin stock disponible en pallets CEDIS
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {fila.matchStatus === 'disponible' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3" />
                                100% Asignado
                              </span>
                            )}
                            {fila.matchStatus === 'parcial' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Info className="w-3 h-3" />
                                Asig. Parcial ({fila.cantAsignable}u)
                              </span>
                            )}
                            {fila.matchStatus === 'sin_stock' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Sin Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Opciones Adicionales de Ejecución */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={ejecutarMatchingAuto}
                    onChange={(e) => setEjecutarMatchingAuto(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Ejecutar Matching FIFO Automático con Pallets y Contenedores</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={sincronizarConSheets}
                    onChange={(e) => setSincronizarConSheets(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Sincronizar y Escribir en Google Sheets (Matriz_Central)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            {resultadoSubida ? 'Cerrar' : 'Cancelar'}
          </button>

          {filasPreview.length > 0 && !resultadoSubida && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilasPreview([])}
                className="px-3 py-2 text-xs text-slate-400 hover:text-rose-400 transition"
              >
                Limpiar lista
              </button>

              <button
                type="button"
                onClick={handleConfirmarSubida}
                disabled={procesandoSubida}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {procesandoSubida ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Subiendo y Conciliando con Pallets...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>
                      Subir {filasPreview.length} Pedidos a Matriz Central
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {resultadoSubida && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Listo, Ver Pedidos en Matriz Central</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
