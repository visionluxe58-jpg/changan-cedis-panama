import { describe, it, expect, beforeEach } from 'vitest';
import { ReconciliationEngine } from '../services/reconciliationEngine';
import { appsScriptClient } from '../services/appsScriptClient';
import { RegistroStaging, UsuarioActivo } from '../types/cedis';

describe('Pruebas Automatizadas CEDIS Changan - Reglas Críticas', () => {
  beforeEach(() => {
    // Resetear a usuario administrador antes de cada prueba
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
    appsScriptClient.setUsuarioActivo(admin);
    appsScriptClient.guardarConfig({
      modoOfflineSimulado: true
    });
  });

  describe('1. Regla de Saldo Disponible en DPL_Detalle', () => {
    it('debe calcular saldoDisponible = cantidadTotal - cantidadAsignada - cantidadDespachada', () => {
      const kpis = appsScriptClient.getKPIs();
      const lotes = appsScriptClient.getDPLDetalle();

      expect(lotes.length).toBeGreaterThan(0);
      lotes.forEach(lote => {
        const saldoCalculado = lote.cantidadTotal - lote.cantidadAsignada - lote.cantidadDespachada;
        expect(lote.saldoDisponible).toBe(saldoCalculado);
      });

      expect(kpis.totalDpl).toBeGreaterThan(0);
      expect(kpis.saldoLibre).toBe(kpis.totalDpl - kpis.comprometido - kpis.despachado);
    });

    it('debe rechazar una asignación que exceda el saldo disponible', async () => {
      const lotes = appsScriptClient.getDPLDetalle();
      const lote = lotes[0];
      const exceso = lote.saldoDisponible + 100;

      const res = await appsScriptClient.asignarStock('PED-VL-2101-L1', lote.inventarioId, exceso);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Stock insuficiente');
    });
  });

  describe('2. Control de Acceso Basado en Roles (RBAC)', () => {
    it('debe impedir que un usuario de sucursal asigne repuestos en CEDIS', async () => {
      const usuarioSucursal: UsuarioActivo = {
        usuarioId: 'USR-003',
        nombre: 'Leidys Perez',
        correo: 'repuestos@changanpanama.com',
        sucursal: 'Villa Lucre',
        canal: 'Mostrador',
        rol: 'SUCURSAL_ASESOR',
        activo: true,
        movilHabilitado: true
      };
      appsScriptClient.setUsuarioActivo(usuarioSucursal);

      const res = await appsScriptClient.asignarStock('PED-VL-2101-L1', 'INV-CN-8902_1', 1);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Permisos insuficientes');
    });

    it('debe impedir que un usuario de sucursal ejecute despachos físicos', async () => {
      const usuarioSucursal: UsuarioActivo = {
        usuarioId: 'USR-003',
        nombre: 'Leidys Perez',
        correo: 'repuestos@changanpanama.com',
        sucursal: 'Villa Lucre',
        canal: 'Mostrador',
        rol: 'SUCURSAL_ASESOR',
        activo: true,
        movilHabilitado: true
      };
      appsScriptClient.setUsuarioActivo(usuarioSucursal);

      const res = await appsScriptClient.despacharLinea('PED-VL-2101-L1', 1);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Permisos insuficientes');
    });
  });

  describe('3. Conciliación y Clasificación del Incidente (9 vs 10 de Septiembre)', () => {
    it('debe clasificar el lote de staging preservando los 5 pedidos ausentes sin borrarlos', () => {
      const staging = ReconciliationEngine.generarLoteStagingIncidente();
      const reporte = ReconciliationEngine.analizarStaging(staging);

      expect(reporte.pedidosAusentesPreservados.length).toBe(5);
      expect(reporte.pedidosAusentesPreservados).toContain('PED-CV-2240');

      const ausentesEnStaging = staging.filter(r => r.categoria === 'AUSENTE_PRESERVADO_9_SEP');
      expect(ausentesEnStaging.length).toBe(5);
      ausentesEnStaging.forEach(r => {
        expect(r.decision).not.toBe('DESCARTAR_DUPLICADO');
        expect(r.decision).toBe('CONSERVAR_AMBOS');
      });
    });

    it('no debe clasificar los registros históricos de Excel del 31 de agosto como pedidos nuevos del 10 de septiembre', () => {
      const staging = ReconciliationEngine.generarLoteStagingIncidente();
      const excelHistorico = staging.filter(r => r.categoria === 'LOTE_HISTORICO_EXCEL_PENDIENTE');

      expect(excelHistorico.length).toBeGreaterThan(0);
      excelHistorico.forEach(r => {
        expect(r.categoria).toBe('LOTE_HISTORICO_EXCEL_PENDIENTE');
        expect(r.fechaRegistro.startsWith('2026-08-31')).toBe(true);
        expect(r.decision).toBe('PENDIENTE'); // Requiere revisión humana antes de importar
      });
    });

    it('debe señalar coincidencias semánticas para revisión sin eliminarlas automáticamente', () => {
      const staging = ReconciliationEngine.generarLoteStagingIncidente();
      const semanticos = staging.filter(r => r.categoria === 'POSIBLE_DUPLICADO_SEMANTICO');

      expect(semanticos.length).toBeGreaterThan(0);
      semanticos.forEach(r => {
        expect(r.motivoClasificacion).toContain('Coincidencia semántica');
        expect(r.similitudConPedidoId).toBeDefined();
        expect(r.decision).toBe('PENDIENTE'); // Nunca borrado automático
      });
    });
  });

  describe('4. Idempotencia de la Importación con operationId', () => {
    it('al reintentar la misma importación con el mismo operationId no debe duplicar pedidos ni líneas', async () => {
      const opId = `OP-TEST-IDEMPOTENCY-${Date.now()}`;
      const registroPrueba: RegistroStaging = {
        stagingId: `STG-IDEMP-01`,
        numeroLineaArchivo: 1,
        pedidoId: `PED-IDEMP-${Date.now()}`,
        fechaRegistro: '2026-09-10 12:00:00',
        sucursal: 'Villa Lucre',
        colaborador: 'Leidys Perez',
        cliente: 'Prueba Idempotencia S.A.',
        cotizacion: 'COT-IDEMP-01',
        vin: 'LS4A9Z009YA999991',
        placa: 'ID-001',
        modelo: 'UNI-T Elite',
        numeroOR: 'OR-IDEMP-1',
        tipoPedido: 'VOR / Unidad Parada',
        codigoRepuesto: 'S111F270108-0103',
        descripcion: 'Puerta Delantera Derecha UNI-T',
        cantidadSolicitada: 1,
        cantidadAsignada: 0,
        contenedor: '',
        ubicacion: '',
        origenDetectado: 'STAGING_MIGRACION',
        categoria: 'NUEVO_CONFIRMADO',
        motivoClasificacion: 'Registro de prueba para verificación de idempotencia',
        decision: 'APROBAR_IMPORTACION'
      };

      // Primera Ejecución
      const primeraEjecucion = await appsScriptClient.confirmarImportacionStaging([registroPrueba], opId);
      expect(primeraEjecucion.success).toBe(true);
      expect(primeraEjecucion.pedidosAgregados).toBe(1);
      expect(primeraEjecucion.lineasAgregadas).toBe(1);

      // Segunda Ejecución con el mismo operationId (Reintento de red)
      const segundaEjecucion = await appsScriptClient.confirmarImportacionStaging([registroPrueba], opId);
      expect(segundaEjecucion.success).toBe(true);
      expect(segundaEjecucion.pedidosAgregados).toBe(0);
      expect(segundaEjecucion.lineasAgregadas).toBe(0);
      expect(segundaEjecucion.error).toContain('Idempotencia garantizada');
    });
  });

  describe('5. Auditoría Inmutable (Kardex)', () => {
    it('cada acción de pedido, asignación o despacho debe generar una fila en la bitácora', async () => {
      const prevAuditCount = appsScriptClient.getAuditoria().length;

      // Crear pedido multi-línea
      const nuevoPedidoId = `PED-TEST-AUD-${Date.now()}`;
      await appsScriptClient.crearPedido({
        pedidoId: nuevoPedidoId,
        fechaCreacion: '2026-09-10 15:00:00',
        sucursal: 'Costa Verde',
        colaborador: 'Carlos Mendoza',
        canal: 'Taller',
        tipoPedido: 'Taller Mecánico',
        cotizacion: 'COT-TEST-99',
        cliente: 'Transportes Rápidos',
        placa: 'TR-1020',
        modeloChangan: 'Hunter 4x4 Diesel',
        vin: 'LS4A4D777SA999999',
        numeroOR: 'OR-TEST-01',
        estadoPago: 'Aprobado',
        documentoPagoFactura: 'FAC-991',
        facturadoFinal: 'Sí',
        estatusFabrica: 'En Espera',
        origen: 'PORTAL_CEDIS'
      }, [
        { codigoRepuesto: 'F202F260100', descripcionOficial: 'Amortiguador Delantero Hunter 4x4', cantidadSolicitada: 2 }
      ]);

      const postAudit = appsScriptClient.getAuditoria();
      expect(postAudit.length).toBeGreaterThan(prevAuditCount);

      const ultimoEvento = postAudit[0];
      expect(ultimoEvento.identificador).toBe(nuevoPedidoId);
      expect(ultimoEvento.accion).toBe('CREACION_PEDIDO');
      expect(ultimoEvento.usuarioId).toBe('USR-001');
      expect(ultimoEvento.operationId).toBeDefined();
    });
  });
});
