/**
 * ==============================================================================
 * CHANGAN CEDIS PANAMÁ - MÓDULO OFICIAL DE DEPURACIÓN Y CONTROL DE NO DUPLICADOS
 * ==============================================================================
 * Este archivo implementa la Regla de Negocio Canónica:
 * "PROHIBICIÓN ESTRICTA DE SOLICITUDES DUPLICADAS PARA EL MISMO CLIENTE Y REPUESTO"
 * 
 * Modos de uso:
 * 1. Ejecución Manual en Google Sheets:
 *    - Abre tu hoja de cálculo: "CEDIS Changan Panamá - Base de Datos Oficial"
 *    - Ve a Extensiones > Apps Script
 *    - Selecciona la función "depurarDuplicadosMatriz" y haz clic en "Ejecutar".
 *    - Todas las filas repetidas exactas y solicitudes redundantes serán purgadas automáticamente.
 * 
 * 2. Invocación Automática vía API REST:
 *    - Enviando POST { action: "depurarDuplicados", userEmail: "...", operationId: "..." }
 * ==============================================================================
 */

/**
 * Función Principal para purgar duplicados en la pestaña Matriz_Central
 */
function depurarDuplicadosMatriz() {
  var lock = LockService.getScriptLock();
  // Esperar hasta 30 segundos para exclusión mutua segura
  lock.waitLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var files = DriveApp.getFilesByName('CEDIS Changan Panamá - Base de Datos Oficial');
      if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
      } else {
        files = DriveApp.getFilesByName('Control_Requisiciones_CEDIS');
        if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
      }
    }

    if (!ss) {
      Logger.log('ERROR: No se pudo localizar el Spreadsheet.');
      return { success: false, error: 'No se encontró el Spreadsheet.' };
    }

    var hMatriz = ss.getSheetByName('Matriz_Central') || 
                  ss.getSheetByName('MATRIZ CENTRAL') || 
                  ss.getSheetByName('Matriz Central') || 
                  ss.getSheets()[0];

    if (!hMatriz || hMatriz.getLastRow() <= 1) {
      Logger.log('AVISO: La hoja Matriz_Central no contiene datos.');
      return { success: true, eliminados: 0, mensaje: 'Matriz_Central vacía.' };
    }

    var lastRow = hMatriz.getLastRow();
    var lastCol = hMatriz.getLastColumn();
    var data = hMatriz.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });

    // Localizar columnas dinámicamente
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
    if (colEstatus === -1) colEstatus = headers.indexOf('estatus línea');
    if (colEstatus === -1) colEstatus = 13;

    var filasAEliminar = [];
    var seenExact = {};
    var activeClientParts = []; // { cliente: '', cod: '', rowNum: N, id: '' }

    // Función auxiliar para tokenizar y normalizar nombres de clientes
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

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1; // 1-indexado en Google Sheets
      var pId = String(data[i][colId] || '').trim();
      var cliente = String(data[i][colCliente] || '').trim();
      var cod = String(data[i][colCod] || '').trim().toUpperCase();
      var estatus = String(data[i][colEstatus] || '').toUpperCase();

      if (!cod || !pId) continue;

      // 1. Detección de línea exacta idéntica dentro del mismo pedido (ej. PED-C50-2039)
      var exactKey = pId + '__' + cod;
      if (seenExact[exactKey]) {
        filasAEliminar.push(rowNum);
        exactos++;
        continue;
      }
      seenExact[exactKey] = true;

      // 2. Detección de duplicado activo entre clientes (Regla de No Duplicados)
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

    Logger.log('Filas duplicadas identificadas para eliminación: ' + filasAEliminar.length + ' (' + exactos + ' exactas, ' + clientesDups + ' por cliente+repuesto).');

    // IMPORTANTE: Eliminar de abajo hacia arriba para que los números de fila no se desfasen
    filasAEliminar.sort(function(a, b) { return b - a; });
    for (var d = 0; d < filasAEliminar.length; d++) {
      hMatriz.deleteRow(filasAEliminar[d]);
    }

    // Registrar en Auditoria_Kardex si existe
    var hAud = ss.getSheetByName('Auditoria_Kardex');
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

    var resultado = {
      success: true,
      exactosEliminados: exactos,
      clientesDuplicadosEliminados: clientesDups,
      totalEliminados: filasAEliminar.length,
      filasRestantes: hMatriz.getLastRow() - 1,
      mensaje: 'Depuración exitosa: ' + filasAEliminar.length + ' filas duplicadas eliminadas en Google Sheets (' + exactos + ' exactas, ' + clientesDups + ' por cliente+repuesto).'
    };

    Logger.log(JSON.stringify(resultado));
    return resultado;

  } catch (err) {
    Logger.log('ERROR en depurarDuplicadosMatriz: ' + err.message);
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menú personalizado al abrir Google Sheets para depuración con 1 clic
 */
/**
 * Menú personalizado al abrir Google Sheets para control total con 1 clic
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚗 Changan CEDIS')
    .addItem('🛡️ Depurar Duplicados en Matriz', 'depurarDuplicadosMatriz')
    .addItem('🧹 Sanitizar Cantidades Exageradas (> 4 a 1)', 'sanitizarCantidadesExageradasSheet')
    .addItem('🗑️ Purgar Cliente Jose Gonzalez', 'purgarJoseGonzalez')
    .addToUi();
}


/**
 * Purgar permanentemente a Jose Gonzalez y pedidos asociados de la hoja de cálculo
 */
function purgarJoseGonzalez() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Matriz_Central') || 
             ss.getSheetByName('MATRIZ CENTRAL') || 
             ss.getSheetByName('Matriz Central') || 
             ss.getSheetByName('PEDIDOS ESPECIALES') ||
             ss.getSheets()[0];

  if (!hoja || hoja.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('Aviso', 'Hoja Matriz no disponible o vacía.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  var data = hoja.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var colCli = headers.indexOf('cliente');
  if (colCli === -1) colCli = 6;
  var colId = headers.indexOf('id pedido');
  if (colId === -1) colId = 0;

  var eliminados = 0;
  var pedidosEliminados = [];

  for (var r = data.length - 1; r >= 1; r--) {
    var cli = String(data[r][colCli] || '').trim().toUpperCase();
    var pId = String(data[r][colId] || '').trim().toUpperCase();

    if (cli === 'JOSE GONZALEZ' || cli === 'JOSÉ GONZÁLEZ' || pId === 'PED-CV-001' || pId === 'PED-CV-002' || pId === 'PED-CV-023') {
      pedidosEliminados.push(pId);
      hoja.deleteRow(r + 1);
      eliminados++;
    }
  }

  var msg = 'Se purgaron permanentemente ' + eliminados + ' fila(s) de Jose Gonzalez (' + pedidosEliminados.join(', ') + '). No volverán a aparecer.';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('Purga Exitosa', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
  return { success: true, eliminados: eliminados, pedidos: pedidosEliminados };
}

/**
 * Sanitizar cantidades de repuestos exageradas (> 4 unidades) en la hoja de cálculo
 */
function sanitizarCantidadesExageradasSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Matriz_Central') || 
             ss.getSheetByName('MATRIZ CENTRAL') || 
             ss.getSheetByName('Matriz Central') || 
             ss.getSheetByName('PEDIDOS ESPECIALES') ||
             ss.getSheets()[0];

  if (!hoja || hoja.getLastRow() < 2) return { success: true, corregidos: 0 };

  var data = hoja.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
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

  var msg = 'Se sanitizaron ' + corregidos + ' cantidades que excedían el límite normal de 1-4 repuestos (ajustadas a 1 unidad).';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('Sanitización Exitosa', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
  return { success: true, corregidos: corregidos };
}
