/**
 * ==============================================================================
 * CHANGAN AUTO PANAMÁ - MÓDULO DE RECEPCIÓN DE REPUESTOS ESPECIALES VÍA PDT (QR)
 * ==============================================================================
 * Especificación Técnica Oficial - Sistema de Pedidos Especiales
 * 
 * Funcionalidad:
 * 1. Validación atómica con LockService para evitar colisiones de concurrencia.
 * 2. Validación de formato de QR: PE-[AÑO]-[ID_PEDIDO]-[SECUENCIA_UNIDAD].
 * 3. Prevención estricta de duplicados.
 * 4. Actualización de estado en hoja 'PEDIDOS ESPECIALES' a 'RECIBIDO EN SUCURSAL'.
 * 5. Registro de auditoría inmutable en hoja 'REPUESTOS RECIBIDOS EN SUCURSAL'.
 */

var HOJA_PEDIDOS = 'PEDIDOS ESPECIALES';
var HOJA_RECEPCIONES = 'REPUESTOS RECIBIDOS EN SUCURSAL';

/**
 * Endpoint HTTP POST para el sistema web / Terminal PDT
 */
function doPost(e) {
  var output = { ok: false, error: 'Solicitud no procesada' };
  
  try {
    var rawData = e.postData ? e.postData.contents : '{}';
    var payload = JSON.parse(rawData);
    var action = payload.action || '';
    
    if (action === 'receivePart' || action === 'recepcionarRepuesto') {
      output = procesarRecepcionPDT(payload);
    } else if (action === 'receivePalletCEDIS') {
      output = procesarRecepcionPalletCEDIS(payload);
    } else {
      output = { ok: false, error: 'Acción desconocida: ' + action };
    }
  } catch (err) {
    output = { ok: false, error: 'Error interno: ' + err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Procesa la recepción con bloqueo atómico (LockService)
 */
function procesarRecepcionPDT(data) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  
  try {
    // 1. Intentar adquirir el cerrojo por hasta 10 segundos
    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return { 
        ok: false, 
        status: 'LOCK_TIMEOUT', 
        error: 'Servidor ocupado procesando otra transacción. Reintente en unos segundos.' 
      };
    }
    
    var qrId = (data.qrId || '').trim().toUpperCase();
    var codigo = (data.codigo || '').trim();
    var sucursal = (data.sucursal || '').trim();
    var operador = (data.operador || 'OPERADOR PDT').trim();
    var notas = (data.notas || '').trim();
    var idPedido = (data.idPedido || '').trim();
    
    // Validación sintáctica del QR
    var qrRegex = /^PE-\d{4}-[A-Z0-9]+-\d{2}$/;
    if (!qrRegex.test(qrId)) {
      return {
        ok: false,
        status: 'INVALID_FORMAT',
        error: 'Formato de QR no válido. Debe coincidir con PE-[AÑO]-[ID]-[SEC]'
      };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 2. Verificar y obtener hoja de recepciones (Historial / Auditoría)
    var sheetRecepciones = ss.getSheetByName(HOJA_RECEPCIONES);
    if (!sheetRecepciones) {
      sheetRecepciones = ss.insertSheet(HOJA_RECEPCIONES);
      sheetRecepciones.appendRow([
        'ID_QR',
        'FECHA_HORA',
        'CODIGO_REPUESTO',
        'DESCRIPCION',
        'SUCURSAL_RECEPTORA',
        'OPERADOR',
        'ID_PEDIDO',
        'NOTAS_RECEPCION'
      ]);
      sheetRecepciones.getRange('A1:H1').setFontWeight('bold').setBackground('#2B3445').setFontColor('#FFFFFF');
    }
    
    // 3. Verificación de Duplicados en hoja de recepciones
    var lastRowRec = sheetRecepciones.getLastRow();
    if (lastRowRec > 1) {
      var qrColumnValues = sheetRecepciones.getRange(2, 1, lastRowRec - 1, 1).getValues();
      for (var i = 0; i < qrColumnValues.length; i++) {
        if (qrColumnValues[i][0] && qrColumnValues[i][0].toString().trim().toUpperCase() === qrId) {
          // Ya fue recibido previamente
          var rowData = sheetRecepciones.getRange(i + 2, 1, 1, 7).getValues()[0];
          return {
            ok: false,
            status: 'DUPLICATE',
            message: 'PEDIDO YA RECIBIDO',
            receivedAt: rowData[1],
            operador: rowData[5],
            sucursal: rowData[4]
          };
        }
      }
    }
    
    // 4. Buscar pedido en hoja principal 'PEDIDOS ESPECIALES'
    var sheetPedidos = ss.getSheetByName(HOJA_PEDIDOS);
    var pedidoEncontrado = null;
    var filaPedido = -1;
    var colEstado = -1;
    var colFechaRecepcion = -1;
    var headers = [];
    
    if (sheetPedidos) {
      var lastRowPed = sheetPedidos.getLastRow();
      if (lastRowPed > 1) {
        headers = sheetPedidos.getRange(1, 1, 1, sheetPedidos.getLastColumn()).getValues()[0];
        
        // Mapear columnas
        for (var c = 0; c < headers.length; c++) {
          var h = headers[c].toString().toUpperCase().trim();
          if (h === 'ESTADO' || h === 'ESTADO_PEDIDO' || h === 'STATUS') colEstado = c + 1;
          if (h === 'FECHA_RECEPCION' || h === 'FECHA RECEPCION' || h === 'FECHA RECIBIDO') colFechaRecepcion = c + 1;
        }
        
        var datosPedidos = sheetPedidos.getRange(2, 1, lastRowPed - 1, headers.length).getValues();
        for (var p = 0; p < datosPedidos.length; p++) {
          var row = datosPedidos[p];
          // Comparar por ID_PEDIDO o por ID_QR o por CODIGO si coincide
          var rowId = (row[0] || '').toString().trim();
          
          if (rowId === idPedido || (row[0] && qrId.indexOf(rowId) !== -1)) {
            pedidoEncontrado = row;
            filaPedido = p + 2;
            break;
          }
        }
      }
    }
    
    var timestamp = Utilities.formatDate(new Date(), 'America/Panama', "yyyy-MM-dd'T'HH:mm:ssXXX");
    var descripcionRepuesto = data.descripcion || (pedidoEncontrado ? pedidoEncontrado[4] : 'Repuesto Especial');
    
    // 5. Actualizar estado en PEDIDOS ESPECIALES si existe
    if (sheetPedidos && filaPedido !== -1 && colEstado !== -1) {
      sheetPedidos.getRange(filaPedido, colEstado).setValue('RECIBIDO EN SUCURSAL');
      if (colFechaRecepcion !== -1) {
        sheetPedidos.getRange(filaPedido, colFechaRecepcion).setValue(timestamp);
      }
    }
    
    // 6. Registrar evento inmutable en 'REPUESTOS RECIBIDOS EN SUCURSAL'
    sheetRecepciones.appendRow([
      qrId,
      timestamp,
      codigo || (pedidoEncontrado ? pedidoEncontrado[3] : ''),
      descripcionRepuesto,
      sucursal,
      operador,
      idPedido || (pedidoEncontrado ? pedidoEncontrado[0] : ''),
      notas
    ]);
    
    // 7. Retornar éxito
    return {
      ok: true,
      status: 'SUCCESS',
      message: 'RECIBIDO EXITOSAMENTE',
      data: {
        qrId: qrId,
        idPedido: idPedido,
        codigo: codigo,
        descripcion: descripcionRepuesto,
        sucursal: sucursal,
        timestamp: timestamp,
        operador: operador
      }
    };
    
  } catch (err) {
    return {
      ok: false,
      status: 'ERROR',
      error: 'Error al procesar recepción: ' + err.toString()
    };
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}


/**
 * Procesa la recepción y desconsolidación de Pallet en CEDIS Central
 */
function procesarRecepcionPalletCEDIS(data) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  
  try {
    hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return { ok: false, status: 'LOCK_TIMEOUT', error: 'Servidor ocupado. Reintente en segundos.' };
    }
    
    var codigoPallet = (data.codigoPallet || '').trim().toUpperCase();
    var contenedorId = (data.contenedorId || '').trim();
    var operador = (data.operador || 'BODEGUERO CEDIS').trim();
    var pedidosIds = data.pedidosIds || [];
    var timestamp = Utilities.formatDate(new Date(), 'America/Panama', "yyyy-MM-dd'T'HH:mm:ssXXX");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPedidos = ss.getSheetByName(HOJA_PEDIDOS);
    var filasActualizadas = 0;
    
    if (sheetPedidos) {
      var lastRow = sheetPedidos.getLastRow();
      if (lastRow > 1) {
        var headers = sheetPedidos.getRange(1, 1, 1, sheetPedidos.getLastColumn()).getValues()[0];
        var colEstado = -1;
        var colPallet = -1;
        var colContenedor = -1;
        var colPedidoId = -1;
        
        for (var c = 0; c < headers.length; c++) {
          var h = headers[c].toString().toUpperCase().trim();
          if (h === 'ESTADO' || h === 'ESTADO_PEDIDO' || h === 'STATUS') colEstado = c + 1;
          if (h === 'PALLET' || h === 'PALLET_ASIGNADO' || h === 'PALLET_CASE_NO') colPallet = c + 1;
          if (h === 'CONTENEDOR' || h === 'CONTENEDOR_ASIGNADO') colContenedor = c + 1;
          if (h === 'ID_PEDIDO' || h === 'PEDIDO_ID' || h === 'PEDIDO') colPedidoId = c + 1;
        }
        
        var datos = sheetPedidos.getRange(2, 1, lastRow - 1, headers.length).getValues();
        for (var r = 0; r < datos.length; r++) {
          var fila = datos[r];
          var pId = (fila[colPedidoId - 1] || fila[0] || '').toString().trim();
          var pPallet = colPallet !== -1 ? (fila[colPallet - 1] || '').toString().trim().toUpperCase() : '';
          
          var match = (pPallet && pPallet === codigoPallet) || (pedidosIds.indexOf(pId) !== -1);
          if (match && colEstado !== -1) {
            sheetPedidos.getRange(r + 2, colEstado).setValue('En Almacen Central');
            filasActualizadas++;
          }
        }
      }
    }
    
    // Registrar en auditoría
    var sheetRecepciones = ss.getSheetByName(HOJA_RECEPCIONES);
    if (sheetRecepciones) {
      sheetRecepciones.appendRow([
        'PALLET-' + codigoPallet,
        timestamp,
        'LOTE_PALLET',
        'Desconsolidación de Pallet ' + codigoPallet + ' (Contenedor: ' + contenedorId + ')',
        'Bodega Central (CEDIS)',
        operador,
        pedidosIds.join(', '),
        'Pallet recibido en CEDIS. ' + filasActualizadas + ' repuestos actualizados.'
      ]);
    }
    
    return {
      ok: true,
      status: 'SUCCESS',
      mensaje: 'Pallet ' + codigoPallet + ' procesado en CEDIS. Filas actualizadas: ' + filasActualizadas,
      filasActualizadas: filasActualizadas
    };
    
  } catch (err) {
    return { ok: false, status: 'ERROR', error: err.toString() };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}
