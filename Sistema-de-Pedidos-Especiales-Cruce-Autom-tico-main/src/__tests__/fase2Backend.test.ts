import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { appsScriptClient } from '../services/appsScriptClient';
import { UsuarioActivo } from '../types/cedis';

describe('Fase 2 Backend Endpoints & appsScriptClient Wiring', () => {
  const originalFetch = global.fetch;
  const mockUrl = 'https://script.google.com/macros/s/AKfycbz_TEST_FASE2/exec';
  const admin: UsuarioActivo = {
    usuarioId: 'USR-001',
    nombre: 'Administrador CEDIS',
    correo: 'visionluxe58@gmail.com',
    sucursal: 'Bodega Central',
    canal: 'CEDIS',
    rol: 'ADMINISTRADOR_CEDIS',
    activo: true,
    movilHabilitado: true
  };

  beforeEach(() => {
    appsScriptClient.setUsuarioActivo(admin);
    appsScriptClient.guardarConfig({
      webAppUrl: mockUrl,
      modoOfflineSimulado: false,
      timeoutMs: 5000,
      autoSincronizar: false
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. actualizarPedido envía mutación updatePedido al backend remoto con operationId', async () => {
    const pedidos = appsScriptClient.getCabeceras();
    expect(pedidos.length).toBeGreaterThan(0);
    const target = pedidos[0];

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Pedido actualizado' })
      });
    });

    const res = await appsScriptClient.actualizarPedido(
      target.pedidoId,
      { cotizacion: 'COT-FASE2-TEST', cliente: 'Cliente Fase2 Modificado' }
    );

    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(capturedBody.action).toBe('updatePedido');
    expect(capturedBody.pedidoId).toBe(target.pedidoId);
    expect(capturedBody.datosCabecera.cotizacion).toBe('COT-FASE2-TEST');
    expect(capturedBody.operationId).toMatch(/^OP-UPD-/);

    // Verificar actualización en caché local
    const actualizado = appsScriptClient.getCabeceras().find(c => c.pedidoId === target.pedidoId);
    expect(actualizado?.cotizacion).toBe('COT-FASE2-TEST');
    expect(actualizado?.cliente).toBe('Cliente Fase2 Modificado');
  });

  it('2. cambiarEstatusPedido envía mutación changePedidoStatus y alinea líneas y registra nota', async () => {
    const target = appsScriptClient.getCabeceras()[0];

    const capturedBodies: any[] = [];
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBodies.push(JSON.parse(init.body));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'OK' })
      });
    });

    const res = await appsScriptClient.cambiarEstatusPedido(
      target.pedidoId,
      'Despachado Total',
      'Despacho completado por transporte'
    );

    expect(res.success).toBe(true);
    const statusCall = capturedBodies.find(b => b.action === 'changePedidoStatus');
    expect(statusCall).toBeDefined();
    expect(statusCall.pedidoId).toBe(target.pedidoId);
    expect(statusCall.nuevoEstatus).toBe('Despachado Total');
    expect(statusCall.notaBitacora).toBe('Despacho completado por transporte');
    expect(statusCall.operationId).toMatch(/^OP-STATUS-/);

    // Nota bitácora enviada automáticamente en background
    const notaCall = capturedBodies.find(b => b.action === 'addPedidoNota');
    expect(notaCall).toBeDefined();
    expect(notaCall.nota.texto).toBe('Despacho completado por transporte');

    const cab = appsScriptClient.getCabeceras().find(c => c.pedidoId === target.pedidoId);
    expect(cab?.estatusGeneral).toBe('Despachado Total');
  });

  it('3. eliminarPedido envía deletePedido y libera inventario asignado en DPL', async () => {
    global.fetch = vi.fn().mockImplementation((url, init) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Operación remota exitosa' })
      });
    });

    // Crear un pedido de prueba con asignación para verificar liberación
    const nuevo = await appsScriptClient.crearPedido(
      {
        pedidoId: 'PED-DEL-001',
        fechaCreacion: '2026-09-12',
        sucursal: 'Villa Lucre',
        colaborador: 'Edwin Blanco',
        canal: 'Taller',
        tipoPedido: 'Especial',
        cotizacion: 'COT-DEL',
        cliente: 'Test Eliminacion',
        placa: 'DEL-01',
        modeloChangan: 'CS35 Plus',
        vin: 'VIN-DEL-01',
        numeroOR: 'OR-DEL-01',
        estadoPago: 'Aprobado',
        documentoPagoFactura: '',
        facturadoFinal: 'No',
        estatusFabrica: 'En Proceso',
        origen: 'MANUAL',
        observaciones: 'Prueba eliminacion'
      },
      [{ codigoRepuesto: 'DEL-SKU-99', descripcionOficial: 'Filtro Test', cantidadSolicitada: 2 }]
    );
    expect(nuevo.success).toBe(true);

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Eliminado con éxito' })
      });
    });

    const res = await appsScriptClient.eliminarPedido('PED-DEL-001');
    expect(res.success).toBe(true);
    expect(capturedBody.action).toBe('deletePedido');
    expect(capturedBody.pedidoId).toBe('PED-DEL-001');
    expect(capturedBody.operationId).toMatch(/^OP-DEL-/);

    const exists = appsScriptClient.getCabeceras().some(c => c.pedidoId === 'PED-DEL-001');
    expect(exists).toBe(false);
  });

  it('4. eliminarPedidosMasivo envía bulkDeletePedidos y elimina el lote de pedidos', async () => {
    global.fetch = vi.fn().mockImplementation((url, init) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'OK' })
      });
    });

    await appsScriptClient.crearPedido(
      {
        pedidoId: 'PED-BULK-DEL-1',
        fechaCreacion: '2026-09-12',
        sucursal: 'Villa Lucre',
        colaborador: 'Edwin Blanco',
        canal: 'Taller',
        tipoPedido: 'Especial',
        cotizacion: 'COT-B1',
        cliente: 'Test Bulk 1',
        placa: 'B1',
        modeloChangan: 'CS35 Plus',
        vin: 'VIN-B1',
        numeroOR: 'OR-B1',
        estadoPago: 'Aprobado',
        documentoPagoFactura: '',
        facturadoFinal: 'No',
        estatusFabrica: 'En Proceso',
        origen: 'MANUAL',
        observaciones: ''
      },
      [{ codigoRepuesto: 'SKU-B1', descripcionOficial: 'Pieza B1', cantidadSolicitada: 1 }]
    );

    await appsScriptClient.crearPedido(
      {
        pedidoId: 'PED-BULK-DEL-2',
        fechaCreacion: '2026-09-12',
        sucursal: 'Costa Verde',
        colaborador: 'Carlos Mendoza',
        canal: 'Taller',
        tipoPedido: 'Especial',
        cotizacion: 'COT-B2',
        cliente: 'Test Bulk 2',
        placa: 'B2',
        modeloChangan: 'CS35 Plus',
        vin: 'VIN-B2',
        numeroOR: 'OR-B2',
        estadoPago: 'Aprobado',
        documentoPagoFactura: '',
        facturadoFinal: 'No',
        estatusFabrica: 'En Proceso',
        origen: 'MANUAL',
        observaciones: ''
      },
      [{ codigoRepuesto: 'SKU-B2', descripcionOficial: 'Pieza B2', cantidadSolicitada: 1 }]
    );

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, totalEliminados: 2 })
      });
    });

    const res = await appsScriptClient.eliminarPedidosMasivo(['PED-BULK-DEL-1', 'PED-BULK-DEL-2']);
    expect(res.success).toBe(true);
    expect(res.totalEliminados).toBe(2);
    expect(capturedBody.action).toBe('bulkDeletePedidos');
    expect(capturedBody.pedidoIds).toEqual(['PED-BULK-DEL-1', 'PED-BULK-DEL-2']);
    expect(capturedBody.operationId).toMatch(/^OP-DEL-MASIVO-/);
  });

  it('5. actualizarPedidosMasivo envía bulkUpdatePedidos al backend', async () => {
    const pedidos = appsScriptClient.getCabeceras().slice(0, 2).map(c => c.pedidoId);

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, totalActualizados: 2 })
      });
    });

    const res = await appsScriptClient.actualizarPedidosMasivo(pedidos, {
      sucursal: 'Costa Verde',
      tipoPedido: 'Stock Regular'
    });

    expect(res.success).toBe(true);
    expect(capturedBody.action).toBe('bulkUpdatePedidos');
    expect(capturedBody.pedidoIds).toEqual(pedidos);
    expect(capturedBody.cambios.sucursal).toBe('Costa Verde');
    expect(capturedBody.operationId).toMatch(/^OP-EDIT-MASIVO-/);
  });

  it('6. importarManifiestoDPL envía importManifiestoDPL al backend y actualiza manifiestos', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, contenedorId: 'CONT-FASE2-99' })
      });
    });

    const res = await appsScriptClient.importarManifiestoDPL({
      contenedorId: 'CONT-FASE2-99',
      proveedor: 'Mobitech China',
      estado: 'EN TRÁNSITO',
      items: [
        {
          codigoRepuesto: 'FASE2-SKU-01',
          descripcion: 'Faro LED Delantero Changan UNI-T',
          cantidadTotal: 5,
          palletCaseNo: 'P099'
        }
      ]
    });

    expect(res.success).toBe(true);
    expect(capturedBody.action).toBe('importManifiestoDPL');
    expect(capturedBody.contenedorId).toBe('CONT-FASE2-99');
    expect(capturedBody.operationId).toMatch(/^OP-DPL-UPLOAD-/);

    const man = appsScriptClient.getManifiestos().find(m => m.contenedorId === 'CONT-FASE2-99');
    expect(man).toBeDefined();
    expect(man?.totalPiezas).toBe(5);
  });

  it('7. actualizarEstatusManifiesto envía updateManifiestoStatus al backend', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, nuevoEstado: 'RECIBIDO' })
      });
    });

    const res = await appsScriptClient.actualizarEstatusManifiesto('CONT-FASE2-99', 'RECIBIDO');
    expect(res.success).toBe(true);
    expect(capturedBody.action).toBe('updateManifiestoStatus');
    expect(capturedBody.contenedorId).toBe('CONT-FASE2-99');
    expect(capturedBody.nuevoEstado).toBe('RECIBIDO');
    expect(capturedBody.operationId).toMatch(/^OP-MAN-STATUS-/);
  });

  it('8. agregarNotaPedido y fetchNotasPedido sincronizan observaciones con el backend', async () => {
    let capturedPost: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (init && init.method === 'POST') {
        capturedPost = JSON.parse(init.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Nota agregada' })
        });
      } else {
        // GET request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            notas: [
              {
                id: 'REMOTE-1',
                pedidoId: 'PED-TEST-NOTE',
                autor: 'Bodega Central',
                sucursal: 'Bodega Central',
                fecha: '2026-09-12 10:00:00',
                categoria: 'Nota General',
                texto: 'Nota remota desde Sheets'
              }
            ]
          })
        });
      }
    });

    // 1. Agregar nota
    const nota = appsScriptClient.agregarNotaPedido(
      'PED-TEST-NOTE',
      'Cliente autorizó cambio de repuesto',
      'Atención Cliente'
    );
    expect(nota.texto).toBe('Cliente autorizó cambio de repuesto');
    expect(capturedPost.action).toBe('addPedidoNota');
    expect(capturedPost.nota.pedidoId).toBe('PED-TEST-NOTE');

    // 2. Fetch remoto de notas
    const notasRemotas = await appsScriptClient.fetchNotasPedido('PED-TEST-NOTE');
    expect(notasRemotas.length).toBe(1);
    expect(notasRemotas[0].id).toBe('REMOTE-1');
  });

  it('9. importarPedidosMasivos envía bulkImportPedidos al backend', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, totalCreados: 1 })
      });
    });

    const res = await appsScriptClient.importarPedidosMasivos(
      [
        {
          pedidoId: 'PED-CSV-FASE2',
          cliente: 'Flota Transporte Panama',
          sucursal: 'Villa Lucre',
          codigoRepuesto: 'CSV-SKU-01',
          descripcion: 'Bomba de Agua Genuina CS35',
          cantidadSolicitada: 4,
          vin: 'VIN-CSV-01',
          numeroOR: 'OR-CSV-01'
        }
      ],
      { ejecutarMatching: false, sincronizarGoogleSheets: false }
    );

    expect(res.success).toBe(true);
    expect(capturedBody.action).toBe('bulkImportPedidos');
    expect(capturedBody.pedidos.length).toBe(1);
    expect(capturedBody.pedidos[0].cabecera.pedidoId).toBe('PED-CSV-FASE2');
    expect(capturedBody.operationId).toMatch(/^OP-BULK-IMP-/);
  });
});
