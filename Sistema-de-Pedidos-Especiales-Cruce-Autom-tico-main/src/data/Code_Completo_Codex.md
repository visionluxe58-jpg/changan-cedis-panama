# Backend Google Apps Script - Changan CEDIS Panamá (Code.gs)

> **Archivo Canónico Completo (1,928 líneas)**  
> **Sistema:** Control de Requisiciones, Cruce Automático FIFO e Inventario Físico DPL  
> **Entorno:** Google Apps Script / Google Spreadsheet `Control_Requisiciones_CEDIS`

```javascript
/**
 * =========================================================================
 * BACKEND OFICIAL GOOGLE APPS SCRIPT - CHANGAN CEDIS PANAMÁ
 * Versión: 3.0.0 Oficial Canónica
 * Características:
 *  - 5 Hojas canónicas: Matriz_Central, DPL_Manifiestos, DPL_Detalle, BD_Encargados, Auditoria_Kardex
 *  - Bloqueo y verificación de duplicados activos (Cliente, VIN, OR)
 *  - Alertas prioritarias por correo a bodegacentral@changanpanama.com ante urgencias VOR
 *  - Cruce inteligente FIFO por jerarquía de prioridades (VOR > Garantía > Chapistería > Taller > Stock)
 *  - Despacho físico irreversible y ajuste de mermas con auditoría inmutable
 *  - Soporte universal CORS / JSON API y Portal HTML integrado
 * =========================================================================
 */

const CONFIG = {
  HOJA_MATRIZ: 'Matriz_Central',
  HOJA_DPL_CABECERA: 'DPL_Manifiestos',
  HOJA_DPL_DETALLE: 'DPL_Detalle',
  HOJA_ENCARGADOS: 'BD_Encargados',
  HOJA_AUDITORIA: 'Auditoria_Kardex',
  HOJA_DESPACHOS: 'Despachos',
  HOJA_ASIGNACIONES: 'Reporte_Asignaciones',
  CORREO_CEDIS: 'bodegacentral@changanpanama.com',
  URL_APP_PRODUCCION: 'https://script.google.com/macros/s/AKfycbzUyPaDPSDjOSHqyFGH1RJQLmnsjAaVzMPwVrC1EpTQCPFluR6wpq8xSjRpT6bu-t5a/exec'
};

function obtenerSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var files = DriveApp.getFilesByName('Control_Requisiciones_CEDIS');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('Control_Requisiciones_CEDIS');
    }
  }
  return ss;
}

/**
 * Manejador de peticiones GET (Soporta API JSON, JSONP y Vista HTML)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;

  // 1. Diagnóstico / Ping
  if (action === 'depurarDuplicados' || action === 'eliminarDuplicados') {
    return responderJson(depurarDuplicadosMatriz('GET_' + new Date().getTime()));
  }

  if (action === 'ping') {
    try {
      var ss = obtenerSpreadsheet();
      var sheetNames = ss.getSheets().map(function(s) { return s.getName(); });
      return responderJson({
        success: true,
        status: 'OK',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        totalPestanas: sheetNames.length,
        pestanasDetectadas: sheetNames,
        timestamp: new Date().toISOString()
      }, callback);
    } catch (err) {
      return responderJson({ success: false, error: err.toString() }, callback);
    }
  }

  // 2. Obtener Datos del Dashboard y KPIs
  if (action === 'getDashboard') {
    return responderJson(obtenerDatosDashboard(), callback);
  }

  // 3. Obtener Asesores Habilitados
  if (action === 'getAsesores') {
    return responderJson({ success: true, asesores: obtenerAsesores() }, callback);
  }

  // 4. Obtener Base de Datos Completa
  if (action === 'getDatabase' || action === 'getInitialData') {
    try {
      var ssDb = obtenerSpreadsheet();
      var db = {
        matriz: obtenerFilasDePestana(ssDb, CONFIG.HOJA_MATRIZ),
        manifiestos: obtenerFilasDePestana(ssDb, CONFIG.HOJA_DPL_CABECERA),
        dplDetalle: obtenerFilasDePestana(ssDb, CONFIG.HOJA_DPL_DETALLE),
        encargados: obtenerFilasDePestana(ssDb, CONFIG.HOJA_ENCARGADOS),
        auditoria: obtenerFilasDePestana(ssDb, CONFIG.HOJA_AUDITORIA)
      };
      return responderJson({ success: true, data: db }, callback);
    } catch (errDb) {
      return responderJson({ success: false, error: errDb.toString() }, callback);
    }
  }

  // 5. Si no se especificó acción API, renderizar vista HTML si existe la plantilla
  try {
    var portal = (e && e.parameter && e.parameter.portal) ? e.parameter.portal.toString().toLowerCase().trim() : 'admin';
    var template = HtmlService.createTemplateFromFile('Index');
    template.portalModo = portal;
    template.urlApp = CONFIG.URL_APP_PRODUCCION;
    template.urlSucursales = CONFIG.URL_APP_PRODUCCION + '?portal=sucursales';

    var titulo = (portal === 'sucursales') 
      ? 'CHANGAN - Requisición de Repuestos a CEDIS' 
      : 'CHANGAN PANAMÁ - CEDIS Central (Admin & Kardex DPL)';

    return template.evaluate()
      .setTitle(titulo)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (eHtml) {
    // Si no existe la plantilla Index.html, devolver respuesta de estado JSON
    return responderJson({
      success: true,
      mensaje: 'Servicio Web App Changan CEDIS en ejecución activa.',
      version: '3.0.0',
      config: CONFIG
    }, callback);
  }
}

/**
 * Manejador de peticiones POST con LockService para proteger concurrencia
 */
function doPost(e) {
  var payload = {};
  if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return responderJson({ success: false, error: 'JSON malformado en postData' });
    }
  }

  var action = payload.action || 'procesarSolicitud';

  // Despacho de acciones
  if (action === 'procesarSolicitud' || action === 'crearPedido') {
    var datosSolicitud = payload.data || payload;
    return responderJson(procesarSolicitud(datosSolicitud));
  }

  if (action === 'importarManifiesto' || action === 'importManifiestoDPL') {
    return responderJson(importarManifiestoDPL(payload.manifiesto || payload));
  }

  if (action === 'updateManifiestoStatus' || action === 'actualizarEstatusManifiesto') {
    return responderJson(actualizarEstatusManifiestoSheet(payload.contenedorId, payload.nuevoEstado));
  }

  if (action === 'cruceGlobal' || action === 'sincronizarStock') {
    return responderJson(sincronizarStockConMatriz());
  }

  if (action === 'bulkUploadMatriz' || action === 'subirMasivoMatriz') {
    return responderJson(procesarBulkUploadMatriz(payload.rows || payload.data || []));
  }

  if (action === 'bulkUpdatePedidos') {
    return responderJson(procesarBulkUpdatePedidos(
      payload.pedidoIds || [],
      payload.cambios || {},
      payload.operationId
    ));
  }

  if (action === 'deletePedido' || action === 'eliminarPedido') {
    var pId = payload.pedidoId || payload.idPedido;
    return responderJson(procesarEliminarPedidos(pId ? [pId] : [], payload.operationId));
  }

  if (action === 'bulkDeletePedidos' || action === 'eliminarPedidosMasivo') {
    return responderJson(procesarEliminarPedidos(payload.pedidoIds || [], payload.operationId));
  }

  if (action === 'eliminarCliente' || action === 'purgarCliente') {
    return responderJson(procesarEliminarCliente(payload.cliente || payload.clienteNombre, payload.operationId));
  }

  if (action === 'sanitizarCantidades') {
    return responderJson(sanitizarCantidadesExageradasSheet());
  }

  if (action === 'sincronizarAsignaciones' || action === 'sincronizarHojaAsignaciones') {
    return responderJson(sincronizarHojaAsignaciones(payload.filas || payload.items || payload));
  }

  if (action === 'sincronizarDespacho' || action === 'sincronizarHojaDespachos') {
    return responderJson(sincronizarHojaDespachos(payload.pedido || payload));
  }

  if (action === 'changeLineaStatus' || action === 'cambiarEstatusLinea') {
    return responderJson(procesarCambioEstatusLineaIndividual(
      payload.pedidoId,
      payload.codigoRepuesto,
      payload.nuevoEstatus,
      payload.lineaId,
      payload.operationId
    ));
  }

  if (action === 'despachoFisico' || action === 'despacharLinea') {
    return responderJson(registrarDespachoFisicoConRetiro(
      payload.idPedido || payload.pedidoId,
      payload.codigoRepuesto,
      payload.cantidad,
      payload.responsable || payload.usuario,
      payload.notas || payload.observaciones,
      payload.lineaId
    ));
  }

  if (action === 'ajusteMerma') {
    return responderJson(registrarAjusteMerma(
      payload.uidFila,
      payload.cantidadMerma,
      payload.motivo,
      payload.responsable
    ));
  }

  if (action === 'backupJSON') {
    return responderJson(importarBackupJSON(payload.jsonString || payload.data));
  }

  return responderJson({ success: false, error: 'Acción POST no reconocida: ' + action });
}

/**
 * Inicialización completa de las 5 hojas canónicas y estilos corporativos
 */
function inicializarSistemaCompleto() {
  var ss = obtenerSpreadsheet();

  // 1. BD_Encargados
  var hAsesores = ss.getSheetByName(CONFIG.HOJA_ENCARGADOS) || ss.insertSheet(CONFIG.HOJA_ENCARGADOS);
  hAsesores.clear();
  var cabAsesores = [
    'Nombre del Encargado', 'Sucursal', 'Departamento / Canal', 
    'Cargo / Rol Operativo', 'Teléfono / WhatsApp', 'Correo Electrónico', 
    'Estado', 'Habilitado Móvil'
  ];
  var dataAsesores = [
    ['Leidys Perez', 'Villa Lucre', 'Mostrador', 'Ventas Mostrador', '+507 6561-1360', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
    ['Edwin Blanco', 'Villa Lucre', 'Chapistería', 'Chapisteria', '+507 6561-1360', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
    ['Carlos Mendoza', 'Costa Verde', 'Taller Mecánico', 'Taller', '+507 6561-1361', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
    ['Valeria Castillo', 'Calle 50', 'Garantías', 'Asesor Garantías', '+507 6561-1362', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
    ['Alexis Rios', 'Tumba Muerto', 'Colisión', 'Chapistería y Pintura', '+507 6561-1363', 'repuestos@changanpanama.com', 'Activo', 'Sí']
  ];
  hAsesores.appendRow(cabAsesores);
  hAsesores.getRange(1, 1, 1, cabAsesores.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  hAsesores.getRange(2, 1, dataAsesores.length, cabAsesores.length).setValues(dataAsesores);
  hAsesores.setFrozenRows(1);
  hAsesores.autoResizeColumns(1, cabAsesores.length);

  // 2. Matriz_Central
  var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ) || ss.insertSheet(CONFIG.HOJA_MATRIZ);
  if (hMatriz.getLastRow() === 0) {
    var cabMatriz = [
      'ID Pedido', 'Prioridad', 'Fecha / Hora', 'Sucursal', 'Asesor / Solicitante', 
      'Cliente / Caso', 'Modelo', 'VIN / Chasis', 'No. O.R.', 'Código OEM', 
      'Descripción Repuesto', 'Cant Solicitada', 'Cant Asignada', 'Estatus Cruce', 
      'Contenedor Asignado', 'Pallet Asignado', 'Package No', 'Observaciones'
    ];
    hMatriz.appendRow(cabMatriz);
    hMatriz.getRange(1, 1, 1, cabMatriz.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    hMatriz.setFrozenRows(1);
    hMatriz.autoResizeColumns(1, cabMatriz.length);
  }

  // 3. DPL_Manifiestos
  var hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA) || ss.insertSheet(CONFIG.HOJA_DPL_CABECERA);
  if (hManif.getLastRow() === 0) {
    var cabManif = [
      'No. Contenedor / Factura', 'Proveedor', 'PO Referencia', 'Tipo Transporte', 
      'Fecha Arribo CEDIS', 'Estado Embarque', 'Total Piezas', 'SKUs Únicos', 
      'Total Pallets', 'Total Asignadas', 'Saldo Libre Total'
    ];
    hManif.appendRow(cabManif);
    hManif.getRange(1, 1, 1, cabManif.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    hManif.setFrozenRows(1);
    hManif.autoResizeColumns(1, cabManif.length);
  }

  // 4. DPL_Detalle
  var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE) || ss.insertSheet(CONFIG.HOJA_DPL_DETALLE);
  if (hDetalle.getLastRow() === 0) {
    var cabDetalle = [
      'UID Fila', 'No. Contenedor', 'Pallet / Case No', 'Package No', 
      'Código Compra', 'Código Suministrado', 'Descripción Oficial', 'Cant Total DPL', 
      'Despachado (-)', 'Comprometido (-)', 'Saldo Libre (=)', 'Ubicación CEDIS', 'Pedidos Vinculados'
    ];
    hDetalle.appendRow(cabDetalle);
    hDetalle.getRange(1, 1, 1, cabDetalle.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    hDetalle.setFrozenRows(1);
    hDetalle.autoResizeColumns(1, cabDetalle.length);
  }

  // 5. Auditoria_Kardex
  var hAudit = ss.getSheetByName(CONFIG.HOJA_AUDITORIA) || ss.insertSheet(CONFIG.HOJA_AUDITORIA);
  if (hAudit.getLastRow() === 0) {
    var cabAudit = [
      'Fecha / Hora', 'Tipo Movimiento', 'ID Pedido', 'Código OEM', 
      'Descripción', 'Cantidad', 'Contenedor Origen', 'Pallet Origen', 
      'Usuario / Responsable', 'Observación'
    ];
    hAudit.appendRow(cabAudit);
    hAudit.getRange(1, 1, 1, cabAudit.length).setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
    hAudit.setFrozenRows(1);
    hAudit.autoResizeColumns(1, cabAudit.length);
  }

  return 'Sistema Changan CEDIS inicializado con éxito. 5 hojas operativas listas.';
}

function obtenerAsesores() {
  try {
    var ss = obtenerSpreadsheet();
    var hoja = ss.getSheetByName(CONFIG.HOJA_ENCARGADOS);
    if (!hoja || hoja.getLastRow() <= 1) {
      inicializarSistemaCompleto();
      hoja = ss.getSheetByName(CONFIG.HOJA_ENCARGADOS);
    }

    var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();

    return datos
      .filter(function(fila) { return String(fila[6]).trim() === 'Activo' && String(fila[7]).trim() === 'Sí'; })
      .map(function(fila) {
        return {
          nombre: String(fila[0] || '').trim(),
          sucursal: String(fila[1] || '').trim(),
          departamento: String(fila[2] || '').trim(),
          cargo: String(fila[3] || '').trim(),
          contacto: String(fila[4] || '').trim(),
          correo: String(fila[5] || '').trim()
        };
      });
  } catch (e) {
    return [];
  }
}

/**
 * Valida si existe un pedido activo para el mismo repuesto y cliente / VIN / OR
 */
function verificarDuplicadoActivo(cliente, vin, ordenRep, codigoOEM) {
  var ss = obtenerSpreadsheet();
  var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
  if (!hMatriz || hMatriz.getLastRow() <= 1) return null;

  var data = hMatriz.getRange(2, 1, hMatriz.getLastRow() - 1, hMatriz.getLastColumn()).getValues();

  var cNorm = String(cliente || '').trim().toLowerCase();
  var vNorm = String(vin || '').trim().toUpperCase();
  var orNorm = String(ordenRep || '').trim().toLowerCase();
  var codNorm = String(codigoOEM || '').trim().toUpperCase();

  for (var i = 0; i < data.length; i++) {
    var idPed = data[i][0];
    var fecha = data[i][2];
    var cExist = String(data[i][5] || '').trim().toLowerCase();
    var vExist = String(data[i][7] || '').trim().toUpperCase();
    var orExist = String(data[i][8] || '').trim().toLowerCase();
    var codExist = String(data[i][9] || '').trim().toUpperCase();
    var status = String(data[i][13] || '');

    if (status.indexOf('CANCELADO') !== -1 || status.indexOf('ANULADO') !== -1 || status.indexOf('DESPACHADO FÍSICAMENTE') !== -1) {
      continue;
    }

    if (codExist === codNorm) {
      var matchVin = vNorm.length >= 8 && vExist === vNorm;
      var matchCliente = cNorm.length >= 4 && (cExist.indexOf(cNorm) !== -1 || cNorm.indexOf(cExist) !== -1);
      var matchOR = orNorm.length >= 3 && orExist === orNorm;

      if (matchVin || matchCliente || matchOR) {
        return {
          idPedido: idPed,
          cliente: data[i][5],
          vin: data[i][7],
          sucursal: data[i][3],
          asesor: data[i][4],
          codigo: codExist,
          descripcion: data[i][10],
          status: status,
          fecha: (fecha instanceof Date) ? Utilities.formatDate(fecha, "GMT-5", "yyyy-MM-dd") : String(fecha)
        };
      }
    }
  }
  return null;
}

/**
 * Inserta solicitud en Matriz_Central, comprueba duplicados y dispara cruce automático
 */

/**
 * Sanitizador de seguridad para celdas de Google Sheets
 * Previene inyecciones de fórmulas (=HYPERLINK, =IMPORTXML, =IMAGE, =CMD)
 */
function sanitizarCeldaSheets(val) {
  if (val === null || val === undefined) return '';
  var s = String(val).trim();
  if (/^[=+\-@]/.test(s)) {
    return "'" + s;
  }
  return s;
}

function procesarSolicitud(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var ss = obtenerSpreadsheet();
    var hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    if (!hMatriz) {
      inicializarSistemaCompleto();
      hMatriz = ss.getSheetByName(CONFIG.HOJA_MATRIZ);
    }

    var items = data.items || [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var dup = verificarDuplicadoActivo(data.cliente, data.vin, data.ordenReparacion || data.numeroOR, it.codigo || it.codigoRepuesto);
      if (dup) {
        return {
          success: false,
          duplicado: true,
          error: 'BLOQUEO DE SEGURIDAD OPERATIVA: El cliente "' + dup.cliente + '" ya tiene una orden activa (' + dup.idPedido + ') para el repuesto [' + dup.codigo + ' - ' + dup.descripcion + '].',
          detalle: dup
        };
      }
    }

    var prefijos = {
      'Costa Verde': 'CV', 'Villa Lucre': 'VL', 'Calle 50': 'C50',
      'Tumba Muerto': 'TM', 'Chiriquí': 'CH', 'Santa María': 'SM'
    };
    var pref = prefijos[data.sucursal] || 'SUC';
    var consecutivo = 2100 + (hMatriz ? hMatriz.getLastRow() : 0);
    var idPedido = data.pedidoId || ('PED-' + pref + '-' + consecutivo);
    var fecha = new Date();

    var filasNuevas = [];
    items.forEach(function(item) {
      filasNuevas.push([
        idPedido,
        data.tipoSolicitud || data.tipoPedido || 'Stock Regular',
        fecha,
        data.sucursal,
        data.encargado || data.colaborador || 'Asesor',
        data.cliente || 'Consumidor Final',
        data.modelo || data.modeloChangan || 'General',
        String(data.vin || '').toUpperCase().trim(),
        data.ordenReparacion || data.numeroOR || 'N/A',
        String(item.codigo || item.codigoRepuesto || '').toUpperCase().trim(),
        String(item.descripcion || item.descripcionOficial || '').trim(),
        Number(item.cantidad || item.cantidadSolicitada) || 1,
        0,
        'Pendiente Fábrica • Sin arribo en CEDIS (0 stock)',
        '', '', '',
        data.observaciones || ''
      ]);
    });

    if (filasNuevas.length > 0) {
      hMatriz.getRange(hMatriz.getLastRow() + 1, 1, filasNuevas.length, filasNuevas[0].length).setValues(filasNuevas);
    }

    sincronizarStockConMatriz();

    var tipoSol = String(data.tipoSolicitud || data.tipoPedido || '');
    if (tipoSol.indexOf('VOR') !== -1 || tipoSol.indexOf('Urgente') !== -1) {
      enviarAlertaPrioritaria(idPedido, data);
    }

    return { success: true, folio: idPedido, totalItems: items.length };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Envío de alerta por correo electrónico a la bodega central
 */
function enviarAlertaPrioritaria(folio, data) {
  try {
    var asunto = '🚨 [URGENCIA VOR] Requisición ' + folio + ' - Sucursal ' + data.sucursal + ' (' + (data.modelo || data.modeloChangan) + ')';
    var tablaHtml = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-family:Arial,sans-serif; width:100%; font-size:12px;"><tr style="background-color:#fee2e2; color:#991b1b; text-align:left;"><th>Código OEM</th><th>Descripción</th><th style="text-align:center;">Cant.</th></tr>';
    
    var items = data.items || [];
    items.forEach(function(it) {
      tablaHtml += '<tr><td style="font-family:monospace; font-weight:bold;">' + (it.codigo || it.codigoRepuesto) + '</td><td>' + (it.descripcion || it.descripcionOficial) + '</td><td style="text-align:center; font-weight:bold;">' + (it.cantidad || it.cantidadSolicitada) + '</td></tr>';
    });
    tablaHtml += '</table>';

    var cuerpoHtml = '<div style="font-family:Arial,sans-serif; color:#1e293b; max-width:650px; border:1px solid #e2e8f0; border-radius:8px; padding:20px;">' +
      '<div style="background-color:#dc2626; color:#ffffff; padding:10px 15px; border-radius:6px; font-weight:bold; font-size:14px;">ALERTA CEDIS CENTRAL: UNIDAD PARADA / VOR</div>' +
      '<p style="font-size:13px; margin-top:15px;">Se ha recibido una requisición de máxima prioridad enviada desde <strong>' + data.sucursal + '</strong>.</p>' +
      '<ul style="font-size:13px; line-height:1.6;">' +
      '<li><strong>No. Solicitud:</strong> <span style="font-family:monospace; color:#2563eb; font-weight:bold;">' + folio + '</span></li>' +
      '<li><strong>Solicitante:</strong> ' + (data.encargado || data.colaborador) + '</li>' +
      '<li><strong>Modelo:</strong> ' + (data.modelo || data.modeloChangan) + '</li>' +
      '<li><strong>VIN / Chasis:</strong> <code style="background:#f1f5f9; padding:2px 4px;">' + (data.vin || '') + '</code></li>' +
      '<li><strong>No. O.R. / Caso:</strong> ' + (data.ordenReparacion || data.numeroOR || 'N/A') + '</li>' +
      '</ul>' +
      '<h4 style="color:#0f172a; margin-bottom:8px;">Repuestos Requeridos:</h4>' +
      tablaHtml +
      '</div>';

    MailApp.sendEmail({
      to: CONFIG.CORREO_CEDIS,
      subject: asunto,
      htmlBody: cuerpoHtml
    });
  } catch (e) {
    Logger.log('Error enviando alerta por correo: ' + e.toString());
  }
}

/**
 * Importación de manifiesto DPL (Cabecera y Detalle por Pallet)
 */
function importarManifiestoDPL(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);

  try {
    var ss = obtenerSpreadsheet();
    var hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);
    var hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);

    if (!hManif || !hDetalle) {
      inicializarSistemaCompleto();
      hManif = ss.getSheetByName(CONFIG.HOJA_DPL_CABECERA);
      hDetalle = ss.getSheetByName(CONFIG.HOJA_DPL_DETALLE);
    }

    var invoiceNo = String(payload.invoiceNo || payload.contenedorId || '').trim();
    var proveedor = payload.proveedor || 'Mobitech Changan China Co., Ltd';
    var transporte = payload.transporte || payload.tipoTransporte || 'Marítimo';
    var fechaArribo = payload.fechaArribo || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");
    var estadoParam = String(payload.estado || payload.nuevoEstado || 'EN TRÁNSITO').trim().toUpperCase();
    var estado = 'EN TRÁNSITO MARÍTIMO';
    if (estadoParam.indexOf('RECIBID') !== -1 || estadoParam.indexOf('CEDIS') !== -1) {
      estado = 'FÍSICAMENTE RECIBIDO EN CEDIS';
    } else if (estadoParam.indexOf('ADUAN') !== -1 || estadoParam.indexOf('PUERTO') !== -1) {
      estado = 'EN ADUANA / PUERTO';
    }
    var items = payload.items || [];

    var mData = (hManif && hManif.getLastRow() > 0) ? hManif.getDataRange().getValues() : [];
    for (var i = 1; i < mData.length; i++) {
      if (String(mData[i][0]).trim() === invoiceNo) {
        throw new Error('El contenedor/factura ' + invoiceNo + ' ya fue registrado en el sistema.');
      }
    }

    var totalPzas = 0;
    var palletsSet = {};
    var skusSet = {};
    var filasDetalle = [];

    items.forEach(function(it, idx) {
      var pCode = String(it.purchaseCode || it.codigoCompra || it.codigoRepuesto || '').trim().toUpperCase();
      var sCode = String(it.suppliedCode || it.codigoSuministrado || it.codigoActualizado || pCode).trim().toUpperCase();
      var qty = Number(it.qty || it.cantidadTotal) || 0;
      var caseNo = String(it.caseNo || it.palletCaseNo || 'P001').trim();
      var pkgNo = String(it.packageNo || 'PKG-01').trim();
      var desc = String(it.description || it.descripcion || '').trim();

      if (pCode || sCode) {
        totalPzas += qty;
        if (caseNo) palletsSet[caseNo] = true;
        if (pCode) skusSet[pCode] = true;

        filasDetalle.push([
          invoiceNo + '_' + (idx + 1),
          invoiceNo,
          caseNo,
          pkgNo,
          pCode,
          sCode,
          desc,
          qty,
          0,
          0,
          qty,
          'Pallet ' + caseNo,
          ''
        ]);
      }
    });

    if (filasDetalle.length > 0) {
      hDetalle.getRange(hDetalle.getLastRow() + 1, 1, filasDetalle.length, filasDetalle[0].length).setValues(filasDetalle);
    }

    var countPallets = Object.keys(palletsSet).length;
    var countSkus = Object.keys(skusSet).length;

    hManif.appendRow([
      invoiceNo,
      proveedor,
      payload.referencia || ('REF-' + invoiceNo),
      transporte,
      fechaArribo,
      estado,
      totalPzas,
      countSkus,
      countPallets,
      0,
      totalPzas
    ]);

    // REGLA CRÍTICA DPL: Solo si fue recibido se ejecuta el cruce automático
    if (estado === 'FÍSICAMENTE RECIBIDO EN CEDIS') {
      sincronizarStockConMatriz();
    }

    return {
      success: true,
      mensaje: 'Manifiesto ' + invoiceNo + ' registrado exitosamente en estatus (' + estado + '): ' + totalPzas + ' piezas en ' + countPallets + ' pallets.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Algoritmo Quirúrgico de Cruce FIFO con Jerarquía de Prioridades Operativas
 */
function sincronizarStockConMatriz() {
  var lock = LockService.getScriptLock();
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
```
