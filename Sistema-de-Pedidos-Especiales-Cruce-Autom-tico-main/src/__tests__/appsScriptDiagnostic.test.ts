import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diagnosticarConexionAppsScript, appsScriptClient } from '../services/appsScriptClient';

describe('Diagnóstico de Conexión y CORS para Google Apps Script', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('detecta correctamente URL vacía e informa modo local seguro', async () => {
    const diag = await diagnosticarConexionAppsScript('');
    expect(diag.ok).toBe(false);
    expect(diag.tipoError).toBe('URL_VACIA');
    expect(diag.corsHabilitado).toBe(false);
    expect(diag.apiAccesible).toBe(false);
    expect(diag.pasosSugeridos.length).toBeGreaterThan(0);
  });

  it('detecta si el usuario ingresó la URL del Google Spreadsheet en vez del Web App', async () => {
    const diag = await diagnosticarConexionAppsScript('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
    expect(diag.ok).toBe(false);
    expect(diag.tipoError).toBe('ES_SPREADSHEET_NO_WEBAPP');
    expect(diag.mensaje).toContain('hoja de cálculo');
  });

  it('detecta si la URL termina en /edit o /dev', async () => {
    const diagEdit = await diagnosticarConexionAppsScript('https://script.google.com/macros/s/AKfycbw123/edit');
    expect(diagEdit.ok).toBe(false);
    expect(diagEdit.tipoError).toBe('TERMINA_EN_EDIT_O_DEV');

    const diagDev = await diagnosticarConexionAppsScript('https://script.google.com/macros/s/AKfycbw123/dev');
    expect(diagDev.ok).toBe(false);
    expect(diagDev.tipoError).toBe('TERMINA_EN_EDIT_O_DEV');
  });

  it('detecta formatos inválidos que no cumplen con https://script.google.com/macros/s/.../exec', async () => {
    const diag = await diagnosticarConexionAppsScript('https://miapi.com/endpoint');
    expect(diag.ok).toBe(false);
    expect(diag.tipoError).toBe('FORMATO_URL_INVALIDO');
  });

  it('valida exitosamente cuando OPTIONS y GET retornan 200 con CORS y status OK', async () => {
    const mockUrl = 'https://script.google.com/macros/s/AKfycbtest_valid_deployment/exec';

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'OPTIONS') {
        return Promise.resolve({
          status: 200,
          headers: new Headers({
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, OPTIONS'
          })
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: 'OK',
        json: async () => ({
          success: true,
          status: 'OK',
          spreadsheetName: 'CEDIS_DB_PRODUCCION',
          spreadsheetId: '1AbC123TestId',
          totalPestanas: 7,
          pestanasDetectadas: [
            'Solicitudes_Cabecera',
            'Detalle_Repuestos',
            'DPL_Manifiestos',
            'DPL_Detalle',
            'Modelos',
            'BD_Encargados',
            'Auditoria_Kardex'
          ]
        })
      });
    });

    const diag = await diagnosticarConexionAppsScript(mockUrl);
    expect(diag.ok).toBe(true);
    expect(diag.corsHabilitado).toBe(true);
    expect(diag.apiAccesible).toBe(true);
    expect(diag.spreadsheetName).toBe('CEDIS_DB_PRODUCCION');
    expect(diag.pestanasDetectadas?.length).toBe(7);
    expect(diag.latenciaMs).toBeGreaterThanOrEqual(0);
  });

  it('notifica error 403 cuando el usuario no está autorizado en BD_Encargados', async () => {
    const mockUrl = 'https://script.google.com/macros/s/AKfycbtest_403/exec';

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'OPTIONS') {
        return Promise.resolve({ status: 200, headers: new Headers() });
      }
      return Promise.resolve({
        status: 403,
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({ success: false, error: 'Usuario no autorizado' })
      });
    });

    const diag = await diagnosticarConexionAppsScript(mockUrl);
    expect(diag.ok).toBe(false);
    expect(diag.tipoError).toBe('NO_AUTORIZADO_403');
    expect(diag.statusCode).toBe(403);
    expect(diag.corsHabilitado).toBe(true);
    expect(diag.apiAccesible).toBe(false);
  });

  it('notifica error 404 cuando el Deployment ID no existe', async () => {
    const mockUrl = 'https://script.google.com/macros/s/AKfycbtest_404/exec';

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'OPTIONS') {
        return Promise.resolve({ status: 404, headers: new Headers() });
      }
      return Promise.resolve({
        status: 404,
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not Found' })
      });
    });

    const diag = await diagnosticarConexionAppsScript(mockUrl);
    expect(diag.ok).toBe(false);
    expect(diag.tipoError).toBe('NO_ENCONTRADO_404');
    expect(diag.statusCode).toBe(404);
  });

  it('notifica bloqueo de CORS cuando fetch falla con TypeError (Failed to fetch)', async () => {
    const mockUrl = 'https://script.google.com/macros/s/AKfycbtest_cors_block/exec';

    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const diag = await diagnosticarConexionAppsScript(mockUrl);
    expect(diag.ok).toBe(false);
    expect(['CORS_BLOQUEADO_LOGIN_GOOGLE', 'ERROR_RED_O_CORS']).toContain(diag.tipoError);
    expect(diag.corsHabilitado).toBe(false);
    expect(diag.diagnosticoTecnico).toContain('Failed to fetch');
    expect(diag.pasosSugeridos.length).toBeGreaterThan(0);
  });

  it('método diagnosticarConexion en appsScriptClient sincroniza la configuración', async () => {
    const mockUrl = 'https://script.google.com/macros/s/AKfycbtest_service/exec';

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      statusText: 'OK',
      json: async () => ({
        success: true,
        status: 'OK',
        spreadsheetName: 'CEDIS_TEST',
        pestanasDetectadas: ['Solicitudes', 'Detalle']
      })
    });

    const resultado = await appsScriptClient.diagnosticarConexion(mockUrl);
    expect(resultado.ok).toBe(true);
    expect(appsScriptClient.getConfig().estadoConexion).toBe('CONECTADO_CANONICO');
  });
});
