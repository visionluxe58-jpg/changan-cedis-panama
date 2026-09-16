/**
 * Cliente de Conexión y Respaldo en la Nube con Supabase (PostgreSQL)
 * URL: https://tsgdzagpzuiupmdwmwgj.supabase.co
 */

const metaEnv = (import.meta as any).env;
const SUPABASE_URL = metaEnv?.VITE_SUPABASE_URL || 'https://tsgdzagpzuiupmdwmwgj.supabase.co';
const SUPABASE_KEY = metaEnv?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZ2R6YWdwenVpdXBtZHdtd2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzgzOTksImV4cCI6MjEwNDQxNDM5OX0.ayB728saQKPZuy7pNfT7Y8_X1cfXQ_F_oP15LeDiFVQ';

const getHeaders = (prefer?: string) => {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (prefer) headers['Prefer'] = prefer;
  return headers;
};

export interface SupabaseOrder {
  id: string;
  orderNumber: string;
  branch: string;
  clientName: string;
  overallStatus: string;
  createdAt: string;
  updatedAt?: string;
  items?: any;
  observations?: string;
  data?: any;
}

export const SupabaseClient = {
  /**
   * Obtiene la cantidad exacta de registros respaldados en la tabla orders de Supabase
   */
  async getOrdersCount(): Promise<number> {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=count`, {
        headers: getHeaders('count=exact')
      });
      const range = resp.headers.get('content-range');
      if (range && range.includes('/')) {
        const total = parseInt(range.split('/')[1], 10);
        return isNaN(total) ? 0 : total;
      }
      return 0;
    } catch (err) {
      console.warn('Error consultando conteo en Supabase:', err);
      return 0;
    }
  },

  /**
   * Consulta pedidos respaldados en Supabase
   */
  async getOrders(limit = 20): Promise<SupabaseOrder[]> {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&limit=${limit}&order=createdAt.desc`, {
        headers: getHeaders()
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (err) {
      console.warn('Error leyendo pedidos de Supabase:', err);
      return [];
    }
  },

  /**
   * Respalda una requisición individual en Supabase en tiempo real
   */
  async backupRequisicion(order: SupabaseOrder): Promise<boolean> {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: getHeaders('resolution=merge-duplicates'),
        body: JSON.stringify([order])
      });
      return resp.status === 201 || resp.status === 200;
    } catch (err) {
      console.warn('Error respaldando requisición en Supabase:', err);
      return false;
    }
  },

  /**
   * Registra un log de auditoría en Supabase
   */
  async logAudit(evento: string, data: Record<string, any>): Promise<void> {
    try {
      const log = [{
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        data: { evento, ...data }
      }];
      await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(log)
      });
    } catch (err) {
      console.warn('Error registrando auditoría en Supabase:', err);
    }
  }
};
