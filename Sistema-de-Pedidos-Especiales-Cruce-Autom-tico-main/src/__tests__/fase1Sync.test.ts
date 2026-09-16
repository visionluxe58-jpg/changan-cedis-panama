import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appsScriptClient } from '../services/appsScriptClient';
import { UsuarioActivo } from '../types/cedis';

describe('Pruebas Fase 1: Sincronización Canónica Bidireccional y Backend Apps Script', () => {
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
    vi.restoreAllMocks();
  });

  it('fetchInitialData opera con modo seguro local si no hay URL o está en modo offline', async () => {
    appsScriptClient.guardarConfig({
      webAppUrl: '',
      modoOfflineSimulado: true
    });

    const res = await appsScriptClient.fetchInitialData();
    expect(res.success).toBe(true);
    expect(res.error).toContain('Modo local activo');
  });

  it('fetchInitialData hidrata el estado local canónico cuando el Web App responde', async () => {
    appsScriptClient.guardarConfig({
      webAppUrl: 'https://script.google.com/macros/s/AKfycbz_fake/exec',
      modoOfflineSimulado: false
    });

    const mockData = {
      success: true,
      data: {
        cabeceras: [
          {
            pedidoId: 'PED-TEST-LIVE-01',
            fechaCreacion: '2026-09-12 00:00:00',
            sucursal: 'Calle 50',
            colaborador: 'Asesor Prueba',
            canal: 'Taller',
            tipoPedido: 'Stock Regular',
            cotizacion: 'COT-999',
            cliente: 'Cliente Test',
            placa: 'ABC-123',
            modeloChangan: 'CS35 Plus',
            vin: 'VIN12345678',
            numeroOR: 'OR-111',
            estadoPago: 'Aprobado',
            documentoPagoFactura: '',
            facturadoFinal: 'No',
            estatusGeneral: 'Pendiente',
            estatusFabrica: 'En Proceso CEDIS',
            origen: 'PORTAL_CEDIS',
            version: 1,
            creadoPor: 'Admin',
            creadoEn: '2026-09-12 00:00:00',
            actualizadoPor: 'Admin',
            actualizadoEn: '2026-09-12 00:00:00'
          }
        ],
        detalles: [
          {
            lineaId: 'PED-TEST-LIVE-01-L1',
            pedidoId: 'PED-TEST-LIVE-01',
            codigoRepuesto: 'H15002-1000',
            codigoActualizado: 'H15002-1000',
            descripcionOficial: 'Filtro Aceite Test',
            cantidadSolicitada: 5,
            cantidadAsignada: 0,
            cantidadDespachada: 0,
            contenedorAsignado: '',
            palletAsignado: '',
            packageNo: '',
            ubicacionCedis: '',
            estatusLinea: 'Pendiente'
          }
        ],
        manifiestos: [],
        dplDetalle: [],
        modelos: [],
        encargados: [],
        auditoria: []
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData
    } as any);

    const res = await appsScriptClient.fetchInitialData(true);
    expect(res.success).toBe(true);
    expect(res.totalCargado?.cabeceras).toBe(1);

    const cabeceras = appsScriptClient.getCabeceras();
    expect(cabeceras.some(c => c.pedidoId === 'PED-TEST-LIVE-01')).toBe(true);
  });

  it('crearPedido actualiza la caché local inmediatamente al recibir confirmación remota', async () => {
    appsScriptClient.guardarConfig({
      webAppUrl: 'https://script.google.com/macros/s/AKfycbz_fake/exec',
      modoOfflineSimulado: false
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        pedidoId: 'PED-REMOTE-9999',
        totalLineas: 1
      })
    } as any);

    const idUnico = `PED-REMOTE-${Date.now()}`;
    const resultado = await appsScriptClient.crearPedido(
      {
        pedidoId: idUnico,
        fechaCreacion: '2026-09-12 00:00:00',
        sucursal: 'Villa Lucre',
        colaborador: 'Asesor Remoto',
        canal: 'Mostrador',
        tipoPedido: 'Stock Regular',
        cotizacion: 'COT-888',
        cliente: 'Cliente Inmediato',
        placa: 'XYZ-789',
        modeloChangan: 'CS55 Plus',
        vin: 'VIN88888888',
        numeroOR: 'OR-777',
        estadoPago: 'Pendiente',
        documentoPagoFactura: '',
        facturadoFinal: 'No',
        estatusFabrica: 'En Proceso CEDIS',
        origen: 'PORTAL_CEDIS'
      },
      [
        {
          codigoRepuesto: 'H15002-2000',
          descripcionOficial: 'Pastillas de Freno',
          cantidadSolicitada: 2
        }
      ]
    );

    expect(resultado.success).toBe(true);
    // Verificar que aparece de inmediato en memoria sin recargar
    const cabeceras = appsScriptClient.getCabeceras();
    const detalles = appsScriptClient.getDetalles();
    expect(cabeceras.some(c => c.pedidoId === idUnico)).toBe(true);
    expect(detalles.some(d => d.pedidoId === idUnico)).toBe(true);
  });

  it('asignarStock y despacharLinea invocan los endpoints correspondientes de Apps Script', async () => {
    appsScriptClient.guardarConfig({
      webAppUrl: 'https://script.google.com/macros/s/AKfycbz_fake/exec',
      modoOfflineSimulado: false
    });

    const llamadas: any[] = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      llamadas.push(body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'OK'
        })
      };
    });

    const lotes = appsScriptClient.getDPLDetalle();
    const loteConSaldo = lotes.find(l => l.saldoDisponible >= 1);
    expect(loteConSaldo).toBeDefined();

    // Crear un pedido local para asignarle stock
    const pedId = `PED-ASIG-${Date.now()}`;
    await appsScriptClient.crearPedido(
      {
        pedidoId: pedId,
        fechaCreacion: '2026-09-12 00:00:00',
        sucursal: 'Bodega Central',
        colaborador: 'Admin',
        canal: 'CEDIS',
        tipoPedido: 'Stock Regular',
        cotizacion: '',
        cliente: 'Cliente Asig',
        placa: '',
        modeloChangan: 'Alsvin',
        vin: '',
        numeroOR: '',
        estadoPago: 'Aprobado',
        documentoPagoFactura: '',
        facturadoFinal: 'No',
        estatusFabrica: 'En Proceso CEDIS',
        origen: 'PORTAL_CEDIS'
      },
      [
        {
          codigoRepuesto: loteConSaldo!.codigoRepuesto,
          descripcionOficial: loteConSaldo!.descripcion,
          cantidadSolicitada: 1
        }
      ]
    );

    const lineaId = `${pedId}-L1`;
    const resAsig = await appsScriptClient.asignarStock(lineaId, loteConSaldo!.inventarioId, 1);
    expect(resAsig.success).toBe(true);
    expect(llamadas.some(ll => ll.action === 'assignStock' && ll.lineaId === lineaId)).toBe(true);

    const resDesp = await appsScriptClient.despacharLinea(lineaId, 1);
    expect(resDesp.success).toBe(true);
    expect(llamadas.some(ll => ll.action === 'dispatchItem' && ll.lineaId === lineaId)).toBe(true);
  });
});
