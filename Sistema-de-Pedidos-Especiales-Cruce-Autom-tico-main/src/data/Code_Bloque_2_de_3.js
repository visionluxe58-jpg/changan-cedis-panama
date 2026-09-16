  lock.waitLock(20000);

  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
    var hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);

    if (!hMatriz || !hDetalle || !hManif) {
      inicializarSistemaCompleto();
      hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
      hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
      hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);
    }

    var matrizData = (hMatriz && hMatriz.getLastRow() > 0) ? hMatriz.getDataRange().getValues() : [];
    var detalleData = (hDetalle && hDetalle.getLastRow() > 0) ? hDetalle.getDataRange().getValues() : [];

    if (matrizData.length <= 1 || detalleData.length <= 1) {
      return { success: false, mensaje: 'No hay pedidos o inventario DPL suficiente para conciliar.' };
    }

    var jerarquiaPrioridades = {
      'VOR / Unidad Parada': 1,
      'Garantía': 2,
      'Chapistería y Colisión': 3,
      'Taller Mecánico': 4,
      'Stock Regular': 5
    };

    var pedidosPendientes = [];
    for (var i = 1; i < matrizData.length; i++) {
      var cantSol = Number(matrizData[i][11]) || 0;
      var cantAsig = Number(matrizData[i][12]) || 0;
      var estadoCruce = String(matrizData[i][13] || '');

      if (cantAsig < cantSol && estadoCruce.indexOf('DESPACHADO FÍSICAMENTE') === -1) {
        pedidosPendientes.push({
          rowIdx: i,
          id: matrizData[i][0],
          prioridad: matrizData[i][1] || 'Stock Regular',
          peso: jerarquiaPrioridades[matrizData[i][1]] || 99,
          fecha: new Date(matrizData[i][2]),
          codigo: String(matrizData[i][9] || '').trim().toUpperCase(),
          faltante: cantSol - cantAsig,
          cantSol: cantSol,
          cantAsig: cantAsig
        });
      }
    }

    pedidosPendientes.sort(function(a, b) {
      if (a.peso !== b.peso) return a.peso - b.peso;
      return a.fecha - b.fecha;
    });

    var coincidencias = 0;

    // Mapear el estatus de cada contenedor registrado en DPL_Cabecera
    var mapaEstatusContenedor = {};
    if (hManif && hManif.getLastRow() > 0) {
      var manifRows = hManif.getDataRange().getValues();
      for (var mr = 1; mr < manifRows.length; mr++) {
        var cIdKey = String(manifRows[mr][0] || '').trim().toUpperCase();
        var estKey = String(manifRows[mr][5] || '').trim().toUpperCase();
        if (cIdKey) {
          mapaEstatusContenedor[cIdKey] = estKey;
        }
      }
    }

    for (var p = 0; p < pedidosPendientes.length; p++) {
      var ped = pedidosPendientes[p];

      for (var d = 1; d < detalleData.length; d++) {
        var cont = String(detalleData[d][1] || '').trim().toUpperCase();
        var estCont = mapaEstatusContenedor[cont] || '';
        
        // REGLA DE ORO DE CEDIS: Solamente contenedores autorizados como FÍSICAMENTE RECIBIDO pueden asignar repuestos.
        // Si el contenedor está en EN TRÁNSITO, ADUANA o no confirmado, NUNCA asignar repuestos de él.
        var estaRecibido = estCont.indexOf('RECIBID') !== -1 || estCont.indexOf('CEDIS') !== -1;
        if (!estaRecibido) {
          continue;
        }
        var pCode = String(detalleData[d][4] || '').trim().toUpperCase();
        var sCode = String(detalleData[d][5] || '').trim().toUpperCase();
        var desp = Number(detalleData[d][8]) || 0;
        var comp = Number(detalleData[d][9]) || 0;
        var tot = Number(detalleData[d][7]) || 0;
        var saldoLibre = tot - desp - comp;

        if ((pCode === ped.codigo || sCode === ped.codigo) && saldoLibre > 0) {
          var asignar = Math.min(ped.faltante, saldoLibre);

          comp += asignar;
          saldoLibre = tot - desp - comp;
          detalleData[d][9] = comp;
          detalleData[d][10] = saldoLibre;

          var cont = detalleData[d][1];
          var pallet = detalleData[d][2];
          var pkg = detalleData[d][3];
          var vActual = String(detalleData[d][12] || '');
          detalleData[d][12] = (vActual ? vActual + ', ' : '') + ped.id + ' (' + asignar + 'u)';

          ped.cantAsig += asignar;
          ped.faltante -= asignar;

          matrizData[ped.rowIdx][12] = ped.cantAsig;
          matrizData[ped.rowIdx][13] = 'COMPROMETIDO en ' + cont + ' • Pallet ' + pallet;
          matrizData[ped.rowIdx][14] = cont;
          matrizData[ped.rowIdx][15] = pallet;
          matrizData[ped.rowIdx][16] = pkg;

          coincidencias++;
          if (ped.faltante <= 0) break;
        }
      }
    }

    if (coincidencias > 0) {
      hMatriz.getRange(1, 1, matrizData.length, matrizData[0].length).setValues(matrizData);
      hDetalle.getRange(1, 1, detalleData.length, detalleData[0].length).setValues(detalleData);

      if (hManif) {
        var manifData = (hManif && hManif.getLastRow() > 0) ? hManif.getDataRange().getValues() : [];
        for (var m = 1; m < manifData.length; m++) {
          var contId = manifData[m][0];
          var totAsigCont = 0;
          var totLibreCont = 0;

          for (var d2 = 1; d2 < detalleData.length; d2++) {
            if (detalleData[d2][1] === contId) {
              totAsigCont += Number(detalleData[d2][9]) || 0;
              totLibreCont += Number(detalleData[d2][10]) || 0;
            }
          }
          manifData[m][9] = totAsigCont;
          manifData[m][10] = totLibreCont;
        }
        hManif.getRange(1, 1, manifData.length, manifData[0].length).setValues(manifData);
      }
    }

    return {
      success: true,
      matches: coincidencias,
      mensaje: 'Cruce completado: Se asignaron quirúrgicamente ' + coincidencias + ' repuestos a órdenes activas.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

function ejecutarCruceGlobal() {
  return sincronizarStockConMatriz();
}

/**
 * Carga masiva de pedidos a Matriz_Central y sincronización automática de matching con DPL
 */
function procesarBulkUploadMatriz(rows) {
  if (!rows || rows.length === 0) {
    return { success: false, error: 'No se enviaron filas para la matriz.' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || ss.insertSheet(CONFIG.HOJA_MATRIZ);
    var lastRow = hMatriz.getLastRow();

    if (lastRow === 0) {
      var cabMatriz = [
        'ID Pedido', 'Prioridad', 'Fecha / Hora', 'Sucursal', 'Asesor / Solicitante', 
        'Cliente / Caso', 'Modelo', 'VIN / Chasis', 'No. O.R.', 'Código OEM', 
        'Descripción Repuesto', 'Cant Solicitada', 'Cant Asignada', 'Estatus Cruce', 
        'Contenedor Asignado', 'Pallet Asignado', 'Package No', 'Observaciones'
      ];
      hMatriz.appendRow(cabMatriz);
      lastRow = 1;
    }

    // Agregar las filas masivas a la hoja
    hMatriz.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);

    // Ejecutar inmediatamente el motor de matching FIFO para asignar pallets y contenedores
    var resultadoMatching = sincronizarStockConMatriz();

    return {
      success: true,
      mensaje: 'Carga masiva procesada exitosamente en Matriz_Central.',
      filasInsertadas: rows.length,
      matching: resultadoMatching
    };
  } catch (e) {
    return { success: false, error: 'Error al subir pedidos a Google Sheets: ' + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Registro de despacho físico y descargo definitivo en Kardex
 */

/**
 * Sincroniza idempotentemente la pestaña oficial 'Despachos' en Google Sheets (Ticket 6)
 * Columnas: [ID Pedido, Sucursal, Cliente, Pallet/Contenedor, SKU/Repuesto, Cantidad, Estado, Fecha/Hora Asignación, Fecha/Hora Despacho, Tiempo Total, Usuario, Observaciones]
 */

/**
 * Genera y sincroniza la pestaña oficial 'Reporte_Asignaciones' en Google Sheets
 * Agrupa y vuelca todos los repuestos asignados por Contenedor, Pallet, Sucursal y Cliente con tiempos SLA
 */
function sincronizarHojaAsignaciones(filas) {
  var ss = obtenerSpreadsheet();
  var nombreHoja = CONFIG.HOJA_ASIGNACIONES || 'Reporte_Asignaciones';
  var hAsig = ss.getSheetByName(nombreHoja);

  // Si no existe, crear la pestaña con cabeceras oficiales
  if (!hAsig) {
    hAsig = ss.insertSheet(nombreHoja);
  }

  // Limpiar contenido previo para mantener la consolidación exacta y fresca
  hAsig.clear();

  var headers = [
    'Sucursal Destino',
    'Contenedor',
    'Pallet / Bulto',
    'Cliente',
    'ID Pedido',
    'Modelo Changan',
    'Placa',
    'Código OEM SKU',
    'Descripción Repuesto',
    'Cant. Solicitada',
    'Cant. Asignada',
    'Estatus Logístico',
    'Fecha / Hora SLA Inicio',
    'Usuario / Responsable'
  ];

  hAsig.getRange(1, 1, 1, headers.length).setValues([headers]);
  hAsig.getRange(1, 1, 1, headers.length)
    .setBackground('#002B49') // Azul institucional Changan
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  hAsig.setFrozenRows(1);

  var filasInsertar = [];
  var ahoraSla = new Date().toLocaleString();

  // Si nos enviaron filas desde el frontend, utilizarlas
  if (Array.isArray(filas) && filas.length > 0) {
    for (var i = 0; i < filas.length; i++) {
      var f = filas[i];
      filasInsertar.push([
        f.sucursal || 'Central',
        f.contenedorAsignado || f.contenedor || 'Por Arribar',
        f.palletAsignado || f.pallet || 'General',
        f.cliente || 'SIN CLIENTE ASIGNADO',
        f.pedidoId || f.idPedido || '',
        f.modeloChangan || f.modelo || '',
        f.placa || '',
        f.codigoRepuesto || f.codigo || '',
        f.descripcionOficial || f.descripcion || '',
        Number(f.cantidadSolicitada) || 1,
        Number(f.cantidadAsignada) || 1,
        f.estatusGeneral || f.estatus || 'ASIGNADO EN BODEGA',
        f.slaInicio || ahoraSla,
        f.colaborador || f.usuario || 'Operador CEDIS'
      ]);
    }
  } else {
    // Si no enviaron filas, extraer automáticamente de la Matriz_Central las que tienen asignación
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || ss.getSheets()[0];
    if (hMatriz && hMatriz.getLastRow() > 1) {
      var mData = hMatriz.getDataRange().getValues();
      for (var r = 1; r < mData.length; r++) {
        var row = mData[r];
        var cantAsig = Number(row[12]) || 0;
        var cont = String(row[14] || '').trim();
        var pal = String(row[15] || '').trim();

        if (cantAsig > 0 || cont !== '' || pal !== '') {
          filasInsertar.push([
            row[1] || 'Central',     // Sucursal
            cont || 'CEDIS-CONT',    // Contenedor
            pal || 'CEDIS-PALLET',   // Pallet
            row[2] || 'SIN CLIENTE', // Cliente
            row[0] || '',            // Pedido
            row[4] || '',            // Modelo
            row[3] || '',            // Placa
            row[9] || '',            // Código
            row[10] || '',           // Descripción
            Number(row[11]) || 1,    // Solicitada
            cantAsig || 1,           // Asignada
            row[13] || 'ASIGNADO',   // Estatus
            ahoraSla,                // SLA Inicio
            row[22] || 'CEDIS'       // Colaborador
          ]);
        }
      }
    }
  }

  if (filasInsertar.length > 0) {
    hAsig.getRange(2, 1, filasInsertar.length, headers.length).setValues(filasInsertar);
    // Aplicar bordes suaves
    hAsig.getRange(1, 1, filasInsertar.length + 1, headers.length).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }

  return {
    success: true,
    totalFilas: filasInsertar.length,
    hoja: nombreHoja,
    mensaje: 'Reporte de Asignaciones sincronizado exitosamente en pestaña ' + nombreHoja
  };
}

function sincronizarHojaDespachos(pedido) {
  if (!pedido || !pedido.idPedido) {
    return { success: false, error: 'Datos de pedido incompletos para registrar despacho' };
  }

  var ss = obtenerSpreadsheet();
  var hDespachos = ss.getSheetByName(CONFIG.HOJA_DESPACHOS || 'Despachos');

  // Si no existe la pestaña 'Despachos', crearla con formato oficial y cabeceras
  if (!hDespachos) {
    hDespachos = ss.insertSheet(CONFIG.HOJA_DESPACHOS || 'Despachos');
    var headers = [
      'ID Pedido',
      'Sucursal Destino',
      'Cliente',
      'Pallet / Contenedor',
      'SKU / Repuesto',
      'Cantidad',
      'Estado Despacho',
      'Fecha/Hora Asignación',
      'Fecha/Hora Despacho',
      'Tiempo Total Proceso',
      'Usuario Responsable',
      'Observaciones'
    ];
    hDespachos.getRange(1, 1, 1, headers.length).setValues([headers]);
    hDespachos.getRange(1, 1, 1, headers.length).setBackground('#0b2860').setFontColor('#ffffff').setFontWeight('bold');
    hDespachos.setFrozenRows(1);
  }

  var data = hDespachos.getDataRange().getValues();
  var idPedidoBuscado = String(pedido.idPedido).trim();
  var filaExistente = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === idPedidoBuscado) {
      filaExistente = i + 1; // 1-indexed
      break;
    }
  }

  var fechaDespacho = pedido.fechaDespacho || new Date().toLocaleString();
  var fechaAsignacion = pedido.fechaAsignacion || pedido.fechaCreacion || new Date().toLocaleString();
  var pallet = pedido.pallet || pedido.palletAsignado || pedido.contenedorAsignado || 'CEDIS-PALLET-01';
  var repuesto = pedido.codigoRepuesto || (pedido.items && pedido.items[0] ? pedido.items[0].codigoRepuesto : 'N/A');
  var cant = pedido.cantidad || (pedido.items && pedido.items[0] ? pedido.items[0].cantidadAsignada || pedido.items[0].cantidadSolicitada : 1);

  var nuevaFila = [
    idPedidoBuscado,
    pedido.sucursal || 'Central',
    pedido.cliente || 'SIN CLIENTE ASIGNADO',
    pallet,
    repuesto,
    cant,
    pedido.estado || 'DESPACHADO',
    fechaAsignacion,
    fechaDespacho,
    pedido.tiempoTotal || 'En tiempo (< 24h)',
    pedido.usuario || 'Operador CEDIS',
    pedido.observaciones || 'Sincronizado desde Sistema A.R.I.A.'
  ];

  if (filaExistente > 1) {
    // Actualización idempotente para no duplicar filas
    hDespachos.getRange(filaExistente, 1, 1, nuevaFila.length).setValues([nuevaFila]);
  } else {
    // Inserción de nuevo registro
    hDespachos.appendRow(nuevaFila);
  }

  return { 
    success: true, 
    idPedido: idPedidoBuscado, 
    fila: filaExistente > 1 ? filaExistente : hDespachos.getLastRow(),
    mensaje: 'Despacho sincronizado exitosamente en pestaña Despachos'
  };
}

function registrarDespachoFisico(idPedido, codigoRepuesto, cantidad, responsable, notas) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
    var hAudit = ss.getSheetByName(CONFIG.HOJA_AUDITORIA);

    var mData = hMatriz.getDataRange().getValues();
    var dData = (hDetalle && hDetalle.getLastRow() > 0) ? hDetalle.getDataRange().getValues() : [];

    var cont = '', pallet = '', descripcion = '';

    for (var i = 1; i < mData.length; i++) {
      if (mData[i][0] === idPedido && String(mData[i][9]).toUpperCase() === String(codigoRepuesto).toUpperCase()) {
        cont = mData[i][14];
        pallet = mData[i][15];
        descripcion = mData[i][10];
        mData[i][13] = 'DESPACHADO FÍSICAMENTE (En Ruta / Entregado)';
        sincronizarHojaDespachos({
          idPedido: idPedido,
          sucursal: mData[i][1] || 'Central',
          cliente: mData[i][2] || 'SIN CLIENTE ASIGNADO',
          pallet: pallet,
          codigoRepuesto: codigoRepuesto,
          cantidad: cantidad,
          estado: 'DESPACHADO',
          usuario: responsable,
          observaciones: notas
        });
        break;
      }
    }

    if (!cont || !pallet) {
      throw new Error('El pedido ' + idPedido + ' no cuenta con un contenedor y pallet asignado.');
    }

    var dplAfectado = false;
    for (var j = 1; j < dData.length; j++) {
      if (dData[j][1] === cont && dData[j][2] === pallet && 
         (String(dData[j][4]).toUpperCase() === String(codigoRepuesto).toUpperCase() || 
          String(dData[j][5]).toUpperCase() === String(codigoRepuesto).toUpperCase())) {
        
        var tot = Number(dData[j][7]) || 0;
        var desp = Number(dData[j][8]) || 0;
        var comp = Number(dData[j][9]) || 0;

        comp = Math.max(0, comp - Number(cantidad));
        desp += Number(cantidad);
        dData[j][8] = desp;
        dData[j][9] = comp;
        dData[j][10] = tot - desp - comp;
        dplAfectado = true;
        break;
      }
    }

    if (!dplAfectado) {
      throw new Error('No se localizó la línea del repuesto en el pallet indicado.');
    }

    hMatriz.getRange(1, 1, mData.length, mData[0].length).setValues(mData);
    hDetalle.getRange(1, 1, dData.length, dData[0].length).setValues(dData);

    if (hAudit) {
      hAudit.appendRow([
        new Date(),
        'DESPACHO FÍSICO A SUCURSAL',
        idPedido,
        codigoRepuesto,
        descripcion,
        cantidad,
        cont,
        pallet,
        responsable || 'Bodega Central',
        notas || 'Salida irreversible de inventario'
      ]);
    }

    return {
      success: true,
      mensaje: 'Repuesto ' + codigoRepuesto + ' despachado exitosamente de ' + cont + ' / Pallet ' + pallet + '.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ajuste de merma, rotura o daño con bitácora inmutable en Auditoria_Kardex
 */
function registrarAjusteMerma(uidFila, cantidadMerma, motivo, responsable) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = obtenerSpreadsheet();
    var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
    var hAudit = ss.getSheetByName(CONFIG.HOJA_AUDITORIA);

    var dData = (hDetalle && hDetalle.getLastRow() > 0) ? hDetalle.getDataRange().getValues() : [];
    var rowAfectada = -1;
    var contenedor = '', pallet = '', codigo = '', desc = '';

    for (var i = 1; i < dData.length; i++) {
      if (dData[i][0] === uidFila) {
        rowAfectada = i + 1;
        contenedor = dData[i][1];
        pallet = dData[i][2];
        codigo = dData[i][4];
        desc = dData[i][6];
        var tot = Number(dData[i][7]) || 0;
        var desp = Number(dData[i][8]) || 0;
        var comp = Number(dData[i][9]) || 0;
        var saldoLibre = tot - desp - comp;

        if (cantidadMerma > saldoLibre) {
          throw new Error('La merma no puede superar el saldo libre disponible.');
        }

        tot -= Number(cantidadMerma);
        dData[i][7] = tot;
        dData[i][10] = tot - desp - comp;
        break;
      }
    }

    if (rowAfectada === -1) throw new Error('Registro DPL no encontrado.');

    hDetalle.getRange(1, 1, dData.length, dData[0].length).setValues(dData);

    if (hAudit) {
      hAudit.appendRow([
        new Date(),
        'AJUSTE DE MERMA / DAÑO',
        uidFila,
        codigo,
        desc,
        cantidadMerma,
        contenedor,
        pallet,
        responsable || 'Auditor CEDIS',
        motivo || 'Deterioro o faltante físico'
      ]);
    }

    return { success: true, mensaje: 'Ajuste de merma registrado exitosamente.' };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Migración e importación masiva de respaldos JSON
 */
/**
 * Depura y elimina automáticamente filas duplicadas en Matriz_Central:
 * 1. Líneas idénticas exactas en el mismo pedido
 * 2. Solicitudes activas repetidas para el mismo cliente y repuesto
 */
function depurarDuplicadosMatriz(operationId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || 
                  ss.getSheetByName('Matriz_Central') || 
                  ss.getSheetByName('MATRIZ CENTRAL') || 
                  ss.getSheets()[0];

    if (!hMatriz || hMatriz.getLastRow() <= 1) {
      return { success: true, mensaje: 'Hoja Matriz sin datos.' };
    }

    var data = hMatriz.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });

    var colId = headers.indexOf('id pedido');
    if (colId === -1) colId = headers.indexOf('pedido_id');
    if (colId === -1) colId = 0;

    var colCliente = headers.indexOf('cliente / caso');
    if (colCliente === -1) colCliente = headers.indexOf('cliente');
    if (colCliente === -1) colCliente = 5;

    var colCod = headers.indexOf('código oem');
    if (colCod === -1) colCod = headers.indexOf('codigo oem');
    if (colCod === -1) colCod = headers.indexOf('codigo repuesto');
    if (colCod === -1) colCod = headers.indexOf('código repuesto');
    if (colCod === -1) colCod = 9;

    var colEstatus = headers.indexOf('estatus cruce');
    if (colEstatus === -1) colEstatus = headers.indexOf('estatus general');
    if (colEstatus === -1) colEstatus = 13;

    var filasAEliminar = [];
    var seenExact = {};
    var activeClientParts = [];

    function normalizarTokens(name) {
      if (!name) return [];
      var stopWords = { 'DE':1, 'DEL':1, 'LA':1, 'LAS':1, 'LOS':1, 'EL':1, 'Y':1, 'S.A.':1, 'SA':1, 'INC':1, 'LIC':1, 'SR':1, 'SRA':1, 'S/C':1 };
      var clean = String(name).toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/);
      var res = [];
      for (var k = 0; k < clean.length; k++) {
        if (clean[k].length >= 3 && !stopWords[clean[k]]) res.push(clean[k]);
      }
      return res;
    }

    function sonMismoCliente(a, b) {
      if (!a || !b) return false;
      var aU = String(a).trim().toUpperCase();
      var bU = String(b).trim().toUpperCase();
      if (aU === bU) return true;
      if (aU.length >= 4 && bU.length >= 4 && (aU.indexOf(bU) !== -1 || bU.indexOf(aU) !== -1)) return true;

      var tokA = normalizarTokens(a);
      var tokB = normalizarTokens(b);
      var matches = 0;
      for (var i = 0; i < tokA.length; i++) {
        if (tokB.indexOf(tokA[i]) !== -1) matches++;
      }
      if (matches >= 2) return true;
      if (matches >= 1 && (tokA.length === 1 || tokB.length === 1)) return true;
      return false;
    }

    var exactos = 0;
    var clientesDups = 0;