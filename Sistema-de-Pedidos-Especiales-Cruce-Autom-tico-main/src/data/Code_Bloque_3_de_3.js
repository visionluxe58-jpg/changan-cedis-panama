
    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;
      var pId = String(data[i][colId] || '').trim();
      var cliente = String(data[i][colCliente] || '').trim();
      var cod = String(data[i][colCod] || '').trim().toUpperCase();
      var estatus = String(data[i][colEstatus] || '').toUpperCase();

      if (!cod || !pId) continue;

      var exactKey = pId + '__' + cod;
      if (seenExact[exactKey]) {
        filasAEliminar.push(rowNum);
        exactos++;
        continue;
      }
      seenExact[exactKey] = true;

      var isFinal = estatus.indexOf('DESPACH') !== -1 || estatus.indexOf('ENTREG') !== -1 || estatus.indexOf('CANCEL') !== -1;
      if (!isFinal && cliente) {
        var esDuplicado = false;
        for (var c = 0; c < activeClientParts.length; c++) {
          if (activeClientParts[c].cod === cod && sonMismoCliente(activeClientParts[c].cliente, cliente)) {
            esDuplicado = true;
            break;
          }
        }
        if (esDuplicado) {
          filasAEliminar.push(rowNum);
          clientesDups++;
          continue;
        }
        activeClientParts.push({ cliente: cliente, cod: cod, rowNum: rowNum, id: pId });
      }
    }

    filasAEliminar.sort(function(a, b) { return b - a; });
    for (var d = 0; d < filasAEliminar.length; d++) {
      hMatriz.deleteRow(filasAEliminar[d]);
    }

    var hAud = ss.getSheetByName(CONFIG.HOJA_AUDITORIA || 'Auditoria_Kardex');
    if (hAud) {
      hAud.appendRow([
        'AUD-' + new Date().getTime(),
        Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss'),
        'ADMINISTRADOR_CEDIS',
        'DEPURACIÓN AUTOMÁTICA DE DUPLICADOS',
        'SISTEMA_CEDIS',
        'MATRIZ_CENTRAL',
        filasAEliminar.length,
        'Se eliminaron ' + filasAEliminar.length + ' filas duplicadas/redundantes en Matriz_Central (' + exactos + ' líneas idénticas y ' + clientesDups + ' pedidos redundantes por cliente).'
      ]);
    }

    return {
      success: true,
      exactosEliminados: exactos,
      clientesDuplicadosEliminados: clientesDups,
      totalEliminados: filasAEliminar.length,
      filasRestantes: hMatriz.getLastRow() - 1,
      mensaje: 'Depuración exitosa: ' + filasAEliminar.length + ' filas duplicadas eliminadas en Google Sheets.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

function importarBackupJSON(jsonString) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var rawData = (typeof jsonString === 'string') ? JSON.parse(jsonString) : jsonString;
    var items = Array.isArray(rawData) ? rawData : (rawData.pedidos || rawData.matriz || []);

    if (items.length === 0) {
      throw new Error('El archivo JSON no contiene un arreglo de pedidos reconocible.');
    }

    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    if (!hMatriz) {
      inicializarSistemaCompleto();
      hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    }

    var pedidosExistentes = {};
    if (hMatriz.getLastRow() > 1) {
      var codsExistentes = hMatriz.getRange(2, 1, hMatriz.getLastRow() - 1, 1).getValues();
      codsExistentes.forEach(function(r) { pedidosExistentes[String(r[0]).trim()] = true; });
    }

    var insertados = 0;
    var omitidosPorId = 0;
    var omitidosPorDuplicadoCliente = 0;
    var filasAIngresar = [];

    items.forEach(function(p) {
      var idPed = String(p.id_pedido || p.id || p.codigo || '').trim();
      var codOEM = String(p.codigo_oem || p.codigo_repuesto || p.codigo || '').trim().toUpperCase();
      var cliente = String(p.cliente || p.nombre_cliente || 'Consumidor Final').trim();
      var vin = String(p.vin || p.chasis || '').trim().toUpperCase();

      if (idPed && pedidosExistentes[idPed]) {
        omitidosPorId++;
        return;
      }

      var dup = verificarDuplicadoActivo(cliente, vin, p.orden_rep || p.ordenReparacion, codOEM);
      if (dup) {
        omitidosPorDuplicadoCliente++;
        return;
      }

      filasAIngresar.push([
        idPed || ('PED-LEGACY-' + (1000 + insertados)),
        p.prioridad || p.tipo_solicitud || 'Stock Regular',
        p.fecha ? new Date(p.fecha) : new Date(),
        p.sucursal || 'Costa Verde',
        p.asesor || p.solicitante || 'Sistema Anterior',
        cliente,
        p.modelo || 'General',
        vin,
        p.orden_rep || p.ordenReparacion || p.no_orden || 'N/A',
        codOEM,
        p.descripcion || p.desc || 'Repuesto Genuino',
        Number(p.cant_sol || p.cantidad || p.qty) || 1,
        Number(p.cant_asig || p.asignado) || 0,
        p.status_cruce || p.estatus || 'Pendiente Fábrica • Sin arribo en CEDIS (0 stock)',
        p.contenedor || '',
        p.pallet || p.case_no || '',
        p.package_no || '',
        p.observaciones || 'Migrado de sistema anterior'
      ]);

      if (idPed) pedidosExistentes[idPed] = true;
      insertados++;
    });

    if (filasAIngresar.length > 0) {
      hMatriz.getRange(hMatriz.getLastRow() + 1, 1, filasAIngresar.length, filasAIngresar[0].length).setValues(filasAIngresar);
      sincronizarStockConMatriz();
    }

    return {
      success: true,
      mensaje: 'Migración exitosa: ' + insertados + ' pedidos importados (' + omitidosPorId + ' omitidos por ID idéntico, ' + omitidosPorDuplicadoCliente + ' bloqueados por duplicidad cliente+repuesto).'
    };

  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtener snapshot completo del dashboard para la aplicación React
 */
function obtenerDatosDashboard() {
  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    var hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);
    var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);

    if (!hMatriz || !hManif || !hDetalle) {
      inicializarSistemaCompleto();
      hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
      hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);
      hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
    }

    var limpiarFila = function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) {
          return Utilities.formatDate(cell, "GMT-5", "yyyy-MM-dd HH:mm");
        }
        return cell !== null && cell !== undefined ? String(cell) : '';
      });
    };

    var pedidosRaw = (hMatriz && hMatriz.getLastRow() > 1) 
      ? hMatriz.getRange(2, 1, hMatriz.getLastRow() - 1, hMatriz.getLastColumn()).getValues() : [];
    var manifRaw = (hManif && hManif.getLastRow() > 1) 
      ? hManif.getRange(2, 1, hManif.getLastRow() - 1, hManif.getLastColumn()).getValues() : [];
    var detalleRaw = (hDetalle && hDetalle.getLastRow() > 1) 
      ? hDetalle.getRange(2, 1, hDetalle.getLastRow() - 1, hDetalle.getLastColumn()).getValues() : [];

    var pedidos = pedidosRaw.map(limpiarFila).reverse();
    var contenedores = manifRaw.map(limpiarFila);
    var detalleDPL = detalleRaw.map(limpiarFila);

    var totDpl = 0, desp = 0, comp = 0, libre = 0;
    var skusMap = {};

    detalleRaw.forEach(function(r) {
      totDpl += Number(r[7]) || 0;
      desp += Number(r[8]) || 0;
      comp += Number(r[9]) || 0;
      libre += Number(r[10]) || 0;
      if (r[4]) skusMap[String(r[4]).trim()] = true;
    });

    return {
      success: true,
      pedidos: pedidos,
      contenedores: contenedores,
      detalleDPL: detalleDPL,
      kpis: {
        totalDpl: totDpl,
        despachado: desp,
        comprometido: comp,
        saldoLibre: libre,
        skus: Object.keys(skusMap).length
      }
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      pedidos: [],
      contenedores: [],
      detalleDPL: [],
      kpis: { totalDpl: 0, despachado: 0, comprometido: 0, saldoLibre: 0, skus: 0 }
    };
  }
}

/**
 * Utilitario para leer filas de una pestaña convirtiéndolas a array de objetos
 */
function obtenerFilasDePestana(ss, nombrePestana) {
  var sheet = ss.getSheetByName(nombrePestana);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var resultado = [];
  for (var i = 1; i < data.length; i++) {
    var filaObj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        filaObj[headers[j]] = Utilities.formatDate(val, "GMT-5", "yyyy-MM-dd HH:mm:ss");
      } else {
        filaObj[headers[j]] = val;
      }
    }
    resultado.push(filaObj);
  }
  return resultado;
}

/**
 * Genera la respuesta HTTP en formato JSON o JSONP
 */
/**
 * Actualización masiva resiliente de pedidos en la hoja Matriz
 */
function procesarBulkUpdatePedidos(pedidoIds, cambios, operationId) {
  if (!pedidoIds || pedidoIds.length === 0) {
    return { success: true, actualizados: 0, mensaje: 'Lista de pedidos vacía' };
  }

  var ss = obtenerSpreadsheet();
  var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || 
                ss.getSheetByName('Matriz_Central') || 
                ss.getSheetByName('MATRIZ CENTRAL') || 
                ss.getSheetByName('Matriz Central') || 
                ss.getSheetByName('PEDIDOS ESPECIALES') ||
                ss.getSheets()[0];

  if (!hMatriz || hMatriz.getLastRow() < 2) {
    return { success: true, actualizados: 0, mensaje: 'Hoja Matriz no disponible o sin filas de datos' };
  }

  var data = hMatriz.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });

  var colId = headers.indexOf('id pedido');
  if (colId === -1) colId = headers.indexOf('pedido_id');
  if (colId === -1) colId = 0;

  var colSuc = headers.indexOf('sucursal');
  if (colSuc === -1) colSuc = headers.indexOf('sucursal solicitante');
  if (colSuc === -1) colSuc = 3;

  var colEstatus = headers.indexOf('estatus general');
  if (colEstatus === -1) colEstatus = headers.indexOf('estatus');
  if (colEstatus === -1) colEstatus = 23;

  var colTipo = headers.indexOf('tipo pedido');
  if (colTipo === -1) colTipo = headers.indexOf('prioridad');
  if (colTipo === -1) colTipo = 4;

  var colColab = headers.indexOf('colaborador');
  if (colColab === -1) colColab = headers.indexOf('asesor / solicitante');
  if (colColab === -1) colColab = 3;

  var mapIds = {};
  for (var i = 0; i < pedidoIds.length; i++) {
    mapIds[String(pedidoIds[i]).trim()] = true;
  }

  var actualizados = 0;
  for (var r = 1; r < data.length; r++) {
    var idActual = String(data[r][colId]).trim();
    if (mapIds[idActual]) {
      actualizados++;
      if (cambios.sucursal && cambios.sucursal !== 'SIN_CAMBIO' && colSuc >= 0) {
        hMatriz.getRange(r + 1, colSuc + 1).setValue(cambios.sucursal);
      }
      if (cambios.estatusGeneral && cambios.estatusGeneral !== 'SIN_CAMBIO' && colEstatus >= 0) {
        hMatriz.getRange(r + 1, colEstatus + 1).setValue(cambios.estatusGeneral);
      }
      if (cambios.tipoPedido && cambios.tipoPedido !== 'SIN_CAMBIO' && colTipo >= 0) {
        hMatriz.getRange(r + 1, colTipo + 1).setValue(cambios.tipoPedido);
      }
      if (cambios.colaborador && cambios.colaborador !== 'SIN_CAMBIO' && colColab >= 0) {
        hMatriz.getRange(r + 1, colColab + 1).setValue(cambios.colaborador);
      }
    }
  }

  return { success: true, actualizados: actualizados, operationId: operationId };
}


/**
 * Elimina permanentemente pedidos específicos de la hoja de cálculo
 */
function procesarEliminarPedidos(pedidoIds, operationId) {
  if (!pedidoIds || pedidoIds.length === 0) {
    return { success: true, totalEliminados: 0, mensaje: 'Lista de pedidos vacía' };
  }

  var ss = obtenerSpreadsheet();
  var hoja = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || 
             ss.getSheetByName('Matriz_Central') || 
             ss.getSheetByName('MATRIZ CENTRAL') || 
             ss.getSheetByName('Matriz Central') || 
             ss.getSheets()[0];

  if (!hoja || hoja.getLastRow() < 2) {
    return { success: true, totalEliminados: 0, mensaje: 'Hoja Matriz no disponible' };
  }

  var mapIds = {};
  for (var i = 0; i < pedidoIds.length; i++) {
    mapIds[String(pedidoIds[i]).trim().toUpperCase()] = true;
  }

  var data = hoja.getDataRange().getValues();
  var headers = data[0].map(function(head) { return String(head || '').trim().toLowerCase(); });
  var colId = headers.indexOf('id pedido');
  if (colId === -1) colId = headers.indexOf('pedido_id');
  if (colId === -1) colId = 0;

  var totalEliminados = 0;
  for (var r = data.length - 1; r >= 1; r--) {
    var idFila = String(data[r][colId] || '').trim().toUpperCase();
    if (mapIds[idFila]) {
      hoja.deleteRow(r + 1);
      totalEliminados++;
    }
  }

  return { success: true, totalEliminados: totalEliminados, operationId: operationId };
}

/**
 * Elimina permanentemente a un cliente y todos sus pedidos de la hoja de cálculo
 */
function procesarEliminarCliente(clienteNombre, operationId) {
  if (!clienteNombre) return { success: false, error: 'Nombre de cliente requerido' };

  var ss = obtenerSpreadsheet();
  var hoja = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || 
             ss.getSheetByName('Matriz_Central') || 
             ss.getSheetByName('MATRIZ CENTRAL') || 
             ss.getSheetByName('Matriz Central') || 
             ss.getSheets()[0];

  if (!hoja || hoja.getLastRow() < 2) return { success: true, totalEliminados: 0 };

  var data = hoja.getDataRange().getValues();
  var headers = data[0].map(function(head) { return String(head || '').trim().toLowerCase(); });
  var colCli = headers.indexOf('cliente');
  if (colCli === -1) colCli = 6;

  var cliTarget = String(clienteNombre).trim().toUpperCase();
  var totalEliminados = 0;

  for (var r = data.length - 1; r >= 1; r--) {
    var cActual = String(data[r][colCli] || '').trim().toUpperCase();
    if (cActual === cliTarget || cActual.indexOf(cliTarget) !== -1) {
      hoja.deleteRow(r + 1);
      totalEliminados++;
    }
  }

  return { success: true, totalEliminados: totalEliminados, cliente: clienteNombre, operationId: operationId };
}

/**
 * Sanitiza cantidades exageradas (> 4) en la hoja de cálculo, fijándolas en 1 unidad
 */
function sanitizarCantidadesExageradasSheet() {
  var ss = obtenerSpreadsheet();
  var hoja = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || 
             ss.getSheetByName('Matriz_Central') || 
             ss.getSheetByName('MATRIZ CENTRAL') || 
             ss.getSheetByName('Matriz Central') || 
             ss.getSheets()[0];

  if (!hoja || hoja.getLastRow() < 2) return { success: true, corregidos: 0 };

  var data = hoja.getDataRange().getValues();
  var headers = data[0].map(function(head) { return String(head || '').trim().toLowerCase(); });
  var colCant = headers.indexOf('cant solicitada');
  if (colCant === -1) colCant = headers.indexOf('cantidad solicitada');
  if (colCant === -1) colCant = 10;

  var corregidos = 0;
  for (var r = 1; r < data.length; r++) {
    var val = Number(data[r][colCant]);
    if (val > 4) {
      hoja.getRange(r + 1, colCant + 1).setValue(1);
      corregidos++;
    }
  }

  return { success: true, corregidos: corregidos };
}

function responderJson(objeto, callback) {
  var salida;
  var mime;

  if (callback) {
    salida = callback + '(' + JSON.stringify(objeto) + ');';
    mime = ContentService.MimeType.JAVASCRIPT;
  } else {
    salida = JSON.stringify(objeto);
    mime = ContentService.MimeType.JSON;
  }

  return ContentService.createTextOutput(salida).setMimeType(mime);
}


/**
 * Actualiza el estatus de un contenedor en la hoja DPL_Cabecera y ejecuta cruce si pasa a RECIBIDO
 */
function actualizarEstatusManifiestoSheet(contenedorId, nuevoEstado) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = obtenerSpreadsheet();
    var hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);
    if (!hManif) {
      return { success: false, error: 'Hoja DPL_Cabecera no encontrada.' };
    }

    var targetId = String(contenedorId || '').trim().toUpperCase();
    var estParam = String(nuevoEstado || 'EN TRÁNSITO').trim().toUpperCase();
    var estadoFinal = 'EN TRÁNSITO MARÍTIMO';
    if (estParam.indexOf('RECIBID') !== -1 || estParam.indexOf('CEDIS') !== -1) {
      estadoFinal = 'FÍSICAMENTE RECIBIDO EN CEDIS';
    } else if (estParam.indexOf('ADUAN') !== -1 || estParam.indexOf('PUERTO') !== -1) {
      estadoFinal = 'EN ADUANA / PUERTO';
    }

    var mData = hManif.getDataRange().getValues();
    var filaEncontrada = -1;
    for (var i = 1; i < mData.length; i++) {
      if (String(mData[i][0] || '').trim().toUpperCase() === targetId) {
        filaEncontrada = i + 1;
        break;
      }
    }

    if (filaEncontrada === -1) {
      return { success: false, error: 'Contenedor ' + targetId + ' no existe en DPL_Cabecera.' };
    }

    // Actualizar columna 6 (Estado)
    hManif.getRange(filaEncontrada, 6).setValue(estadoFinal);

    // Solo si el nuevo estado es RECIBIDO se ejecuta el matching automático FIFO
    if (estadoFinal === 'FÍSICAMENTE RECIBIDO EN CEDIS') {
      sincronizarStockConMatriz();
    }

    return {
      success: true,
      contenedorId: targetId,
      nuevoEstado: estadoFinal,
      mensaje: 'Contenedor ' + targetId + ' actualizado a ' + estadoFinal + ' en Google Sheets.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza el estatus individual de un repuesto específico en Matriz_Central sin tocar otros repuestos del cliente
 */
function procesarCambioEstatusLineaIndividual(pedidoId, codigoRepuesto, nuevoEstatus, lineaId, operationId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    if (!hMatriz || hMatriz.getLastRow() < 2) {
      return { success: false, error: 'Hoja Matriz_Central no disponible' };
    }

    var data = hMatriz.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
    
    var colId = headers.indexOf('id pedido');
    if (colId === -1) colId = 0;
    var colCod = headers.indexOf('código oem');
    if (colCod === -1) colCod = headers.indexOf('codigo repuesto');
    if (colCod === -1) colCod = 9;
    var colEstatusCruce = headers.indexOf('estatus cruce');
    if (colEstatusCruce === -1) colEstatusCruce = 13;

    var targetId = String(pedidoId || '').trim().toUpperCase();
    var targetCod = String(codigoRepuesto || '').trim().toUpperCase();
    var modificado = false;

    for (var r = 1; r < data.length; r++) {
      var rId = String(data[r][colId] || '').trim().toUpperCase();
      var rCod = String(data[r][colCod] || '').trim().toUpperCase();

      if (rId === targetId && (!targetCod || rCod === targetCod)) {
        // Modificar ESTRICTAMENTE esta fila específica
        hMatriz.getRange(r + 1, colEstatusCruce + 1).setValue(nuevoEstatus);
        modificado = true;
        break; // Solo esta línea individual
      }
    }

    return { success: true, modificado: modificado, pedidoId: targetId, codigoRepuesto: targetCod, nuevoEstatus: nuevoEstatus };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Registra el despacho de repuestos asignados, los guarda en 'Despachos' y los retira de Matriz_Central
 */
function registrarDespachoFisicoConRetiro(idPedido, codigoRepuesto, cantidad, responsable, notas, lineaId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
    var hDespachos = ss.getSheetByName(CONFIG.HOJA_DESPACHOS || 'Despachos');

    if (!hDespachos) {
      hDespachos = ss.insertSheet(CONFIG.HOJA_DESPACHOS || 'Despachos');
      var cabDesp = [
        'ID Pedido', 'Sucursal Destino', 'Cliente', 'Pallet / Contenedor',
        'SKU / Repuesto', 'Cantidad', 'Estado Despacho', 'Fecha/Hora Asignación',
        'Fecha/Hora Despacho', 'Tiempo Total Proceso', 'Usuario Responsable', 'Observaciones'
      ];
      hDespachos.getRange(1, 1, 1, cabDesp.length).setValues([cabDesp]);
      hDespachos.getRange(1, 1, 1, cabDesp.length).setBackground('#0b2860').setFontColor('#ffffff').setFontWeight('bold');
      hDespachos.setFrozenRows(1);
    }

    var mData = (hMatriz && hMatriz.getLastRow() > 0) ? hMatriz.getDataRange().getValues() : [];
    var headers = mData.length > 0 ? mData[0].map(function(h) { return String(h || '').trim().toLowerCase(); }) : [];
    var colId = headers.indexOf('id pedido') >= 0 ? headers.indexOf('id pedido') : 0;
    var colCod = headers.indexOf('código oem') >= 0 ? headers.indexOf('código oem') : 9;

    var targetId = String(idPedido || '').trim().toUpperCase();
    var targetCod = String(codigoRepuesto || '').trim().toUpperCase();

    var filaMatrizIdx = -1;
    var datosFila = null;

    for (var r = 1; r < mData.length; r++) {
      var rId = String(mData[r][colId] || '').trim().toUpperCase();
      var rCod = String(mData[r][colCod] || '').trim().toUpperCase();

      if (rId === targetId && (!targetCod || rCod === targetCod)) {
        filaMatrizIdx = r + 1; // 1-indexed para getRange/deleteRow
        datosFila = mData[r];
        break;
      }
    }

    var ahoraStr = Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd HH:mm:ss");
    var palletCont = (datosFila && (datosFila[14] || datosFila[15])) ? (datosFila[14] + ' / ' + datosFila[15]) : 'CEDIS';
    var cantNum = Number(cantidad) || 1;

    // 1. Guardar en pestaña 'Despachos' de Google Sheets
    var filaDesp = [
      targetId,
      datosFila ? (datosFila[3] || 'Central') : 'Central',
      datosFila ? (datosFila[5] || 'CLIENTE') : 'CLIENTE',
      palletCont,
      targetCod,
      cantNum,
      'DESPACHADO',
      datosFila ? (datosFila[2] || ahoraStr) : ahoraStr,
      ahoraStr,
      'Completado',
      responsable || 'Personal CEDIS',
      notas || 'Despachado y retirado de Matriz Central'
    ];
    hDespachos.appendRow(filaDesp);

    // 2. Retirar físicamente de Matriz_Central para que no vuelva a aparecer
    if (filaMatrizIdx > 1) {
      hMatriz.deleteRow(filaMatrizIdx);
    }

    return {
      success: true,
      mensaje: 'Repuesto ' + targetCod + ' (' + targetId + ') despachado exitosamente, archivado en Despachos y retirado de Matriz Central.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}