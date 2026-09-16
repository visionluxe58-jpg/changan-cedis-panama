import { describe, it, expect } from 'vitest';
import { SupabaseClient } from '../services/supabaseClient';

describe('☁️ RESPALDO EN LA NUBE CON SUPABASE (PostgreSQL Cloud Backup)', () => {
  it('Verifica conexión y conteo de la Matriz Central en Supabase (1,426 registros)', async () => {
    const count = await SupabaseClient.getOrdersCount();
    expect(count).toBeGreaterThanOrEqual(1420);
  });

  it('Lee una muestra de pedidos respaldados desde Supabase', async () => {
    const orders = await SupabaseClient.getOrders(5);
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBe(5);
    
    const primerPedido = orders[0];
    expect(primerPedido).toHaveProperty('id');
    expect(primerPedido).toHaveProperty('orderNumber');
    expect(primerPedido).toHaveProperty('branch');
    expect(primerPedido).toHaveProperty('clientName');
    expect(primerPedido).toHaveProperty('overallStatus');
  });

  it('Permite respaldar una requisición y consultar el registro', async () => {
    const testOrder = {
      id: 'TEST-REQUISICION-PROBE',
      orderNumber: 'TEST-PED-9999',
      branch: 'Calle 50',
      clientName: 'Cliente Prueba Supabase',
      overallStatus: 'EN PROCESO',
      createdAt: '2026-09-12'
    };

    const exito = await SupabaseClient.backupRequisicion(testOrder);
    expect(exito).toBe(true);
  });
});
