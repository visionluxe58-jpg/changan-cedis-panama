import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appsScriptClient, USUARIOS_OFICIALES } from '../services/appsScriptClient';

describe('PDT Móvil y Despacho Físico Entrelazado con Matriz Central', () => {
  beforeEach(() => {
    // Mock global fetch para simular respuesta exitosa de Apps Script
    global.fetch = vi.fn().mockImplementation((url, init) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Despacho registrado en backend' })
      });
    });

    // Establecer usuario activo como Operador de CEDIS
    const operador = USUARIOS_OFICIALES.find(u => u.rol === 'OPERADOR_CEDIS') || {
      usuarioId: 'OP-TEST',
      nombre: 'Operador PDT Bodega',
      correo: 'pdt@changan.com.pa',
      sucursal: 'CEDIS',
      canal: 'CEDIS',
      rol: 'OPERADOR_CEDIS' as const,
      activo: true,
      movilHabilitado: true
    };
    appsScriptClient.setUsuarioActivo(operador);
  });

  it('permite a un operario de bodega despachar una línea y sincronizar la Matriz Central', async () => {
    const matrizAntes = appsScriptClient.getMatrizCentral();
    expect(matrizAntes.length).toBeGreaterThan(0);

    // Buscar una línea con saldo pendiente
    const lineaTarget = matrizAntes.find(f => (Number(f.saldoPendiente) > 0 || Number(f.cantidadSolicitada) > Number(f.cantidadDespachada)));
    expect(lineaTarget).toBeDefined();

    if (!lineaTarget) return;

    const cantDespachar = 1;
    const despAntes = Number(lineaTarget.cantidadDespachada) || 0;

    const res = await appsScriptClient.despacharLinea(lineaTarget.lineaId, cantDespachar);
    expect(res.success).toBe(true);

    // Verificar en Matriz Central
    const matrizDespues = appsScriptClient.getMatrizCentral();
    const lineaActualizada = matrizDespues.find(f => f.lineaId === lineaTarget.lineaId);
    expect(lineaActualizada).toBeDefined();

    if (lineaActualizada) {
      expect(Number(lineaActualizada.cantidadDespachada)).toBe(despAntes + cantDespachar);
      expect(Number(lineaActualizada.saldoPendiente)).toBe(Math.max(0, Number(lineaTarget.cantidadSolicitada) - (despAntes + cantDespachar)));
    }
  });

  it('registra el movimiento inmutable en Auditoria_Kardex con acción DESPACHO_FISICO', async () => {
    const auditoria = appsScriptClient.getAuditoria();
    const ultimoDespacho = auditoria.find(a => a.accion === 'DESPACHO_FISICO');
    expect(ultimoDespacho).toBeDefined();
    expect(ultimoDespacho?.entidad).toBe('Detalle_Repuestos');
  });

  it('bloquea el despacho físico si el usuario tiene rol SUCURSAL_ASESOR o CONSULTA', async () => {
    const asesor = {
      usuarioId: 'ASESOR-TEST',
      nombre: 'Asesor Sucursal',
      correo: 'asesor@changan.com.pa',
      sucursal: 'COSTA VERDE',
      canal: 'SUCURSAL',
      rol: 'SUCURSAL_ASESOR' as const,
      activo: true,
      movilHabilitado: true
    };
    appsScriptClient.setUsuarioActivo(asesor);

    const matriz = appsScriptClient.getMatrizCentral();
    const linea = matriz[0];

    const res = await appsScriptClient.despacharLinea(linea.lineaId, 1);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Permisos insuficientes');
  });
});
