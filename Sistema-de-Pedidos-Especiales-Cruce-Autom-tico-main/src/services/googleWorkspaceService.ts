/**
 * Servicio para interactuar directamente con Google Sheets API y Google Drive API v3
 * utilizando el token de OAuth 2.0 (Google Identity Services).
 */

import firebaseConfig from '../../firebase-applet-config.json';

export interface GoogleUserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

export interface SpreadsheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheetsCreated: string[];
}

export const OFFICIAL_OAUTH_CLIENT_ID = (firebaseConfig as any)?.oAuthClientId || '940210961365-rnv2p2vqi4c0h4hjaobdiuc5jlpp3bvk.apps.googleusercontent.com';

class GoogleWorkspaceService {
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private tokenExpiry: number = 0;

  // Scopes solicitados y aprovisionados
  private readonly scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' ');

  constructor() {
    this.cargarTokenGuardado();
  }

  private cargarTokenGuardado() {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedToken = localStorage.getItem('changan_google_oauth_token');
        const savedExpiry = localStorage.getItem('changan_google_token_expiry');
        if (savedToken && savedExpiry && Number(savedExpiry) > Date.now()) {
          this.accessToken = savedToken;
          this.tokenExpiry = Number(savedExpiry);
        }
      }
    } catch (e) {
      console.warn('No se pudo recuperar el token local:', e);
    }
  }

  private guardarToken(token: string, expiresInSeconds: number = 3600) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + expiresInSeconds * 1000;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('changan_google_oauth_token', token);
        localStorage.setItem('changan_google_token_expiry', this.tokenExpiry.toString());
      }
    } catch (e) {
      console.warn('No se pudo guardar el token local:', e);
    }
  }

  public cerrarSesionGoogle() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('changan_google_oauth_token');
        localStorage.removeItem('changan_google_token_expiry');
      }
    } catch (e) {}
  }

  public estaAutenticado(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  public getAccessToken(): string | null {
    if (this.estaAutenticado()) {
      return this.accessToken;
    }
    return null;
  }

  /**
   * Inicializa el cliente de token de Google Identity Services (GSI)
   */
  public async solicitarTokenOAuth(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window no disponible'));
        return;
      }

      // Si ya hay un token vigente, retornarlo
      if (this.estaAutenticado() && this.accessToken) {
        resolve(this.accessToken);
        return;
      }

      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services SDK (gsi/client) no está cargado.'));
        return;
      }

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: this.scopes,
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              const expiresIn = Number(response.expires_in) || 3600;
              this.guardarToken(response.access_token, expiresIn);
              resolve(response.access_token);
            } else {
              reject(new Error('No se recibió access_token de Google.'));
            }
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Crea una nueva Google Sheet completa con todas las pestañas maestras canónicas
   * de Changan CEDIS y escribe los encabezados y filas iniciales.
   */
  public async crearHojaCEDISCompleta(
    token: string,
    tituloHoja: string = 'CEDIS Changan Panamá - Base de Datos Oficial'
  ): Promise<SpreadsheetCreationResult> {
    // 1. Definición de pestañas maestras exactas del sistema Changan CEDIS
    const sheetsDef = [
      {
        properties: {
          title: 'Matriz_Central',
          gridProperties: { rowCount: 500, columnCount: 18, frozenRowCount: 1 },
          tabColor: { red: 0.06, green: 0.09, blue: 0.16 } // #0f172a
        }
      },
      {
        properties: {
          title: 'DPL_Manifiestos',
          gridProperties: { rowCount: 150, columnCount: 11, frozenRowCount: 1 },
          tabColor: { red: 0.06, green: 0.09, blue: 0.16 } // #0f172a
        }
      },
      {
        properties: {
          title: 'DPL_Detalle',
          gridProperties: { rowCount: 500, columnCount: 13, frozenRowCount: 1 },
          tabColor: { red: 0.12, green: 0.16, blue: 0.23 } // #1e293b
        }
      },
      {
        properties: {
          title: 'BD_Encargados',
          gridProperties: { rowCount: 50, columnCount: 8, frozenRowCount: 1 },
          tabColor: { red: 0.06, green: 0.09, blue: 0.16 } // #0f172a
        }
      },
      {
        properties: {
          title: 'Auditoria_Kardex',
          gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 1 },
          tabColor: { red: 0.2, green: 0.25, blue: 0.33 } // #334155
        }
      },
      {
        properties: {
          title: 'Ordering_Template',
          gridProperties: { rowCount: 200, columnCount: 11, frozenRowCount: 1 },
          tabColor: { red: 0.1, green: 0.65, blue: 0.6 }
        }
      }
    ];

    // 2. Llamada POST a Google Sheets API v4 para crear el archivo
    const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: tituloHoja
        },
        sheets: sheetsDef
      })
    });

    if (!createResp.ok) {
      const errorData = await createResp.json().catch(() => ({}));
      throw new Error(`Fallo al crear la hoja en Google Sheets: ${errorData.error?.message || createResp.statusText}`);
    }

    const createdSheet = await createResp.json();
    const spreadsheetId = createdSheet.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 3. Escribir Encabezados y Datos Iniciales en cada pestaña mediante batchUpdate values
    await this.poblarDatosIniciales(token, spreadsheetId);

    return {
      spreadsheetId,
      spreadsheetUrl,
      title: tituloHoja,
      sheetsCreated: sheetsDef.map(s => s.properties.title)
    };
  }

  /**
   * Obtiene información y lista de pestañas de una Google Sheet existente
   */
  public async obtenerInfoHoja(token: string, spreadsheetId: string): Promise<{ title: string; sheets: string[] }> {
    const cleanId = spreadsheetId.includes('/d/') 
      ? spreadsheetId.split('/d/')[1].split('/')[0]
      : spreadsheetId.trim();

    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error ${resp.status}: No se pudo leer la hoja en Google Sheets`);
    }

    const data = await resp.json();
    const title = data.properties?.title || 'Google Sheet';
    const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);
    return { title, sheets };
  }

  /**
   * Escribe encabezados y datos semilla en la Google Sheet recién creada
   */
  private async poblarDatosIniciales(token: string, spreadsheetId: string) {
    // Encabezados canónicos idénticos al GS de producción
    const matrizHeaders = [
      'ID Pedido', 'Prioridad', 'Fecha / Hora', 'Sucursal', 'Asesor / Solicitante', 
      'Cliente / Caso', 'Modelo', 'VIN / Chasis', 'No. O.R.', 'Código OEM', 
      'Descripción Repuesto', 'Cant Solicitada', 'Cant Asignada', 'Estatus Cruce', 
      'Contenedor Asignado', 'Pallet Asignado', 'Package No', 'Observaciones'
    ];

    const dplHeaders = [
      'UID Fila', 'No. Contenedor', 'Pallet / Case No', 'Package No', 
      'Código Compra', 'Código Suministrado', 'Descripción Oficial', 'Cant Total DPL', 
      'Despachado (-)', 'Comprometido (-)', 'Saldo Libre (=)', 'Ubicación CEDIS', 'Pedidos Vinculados'
    ];

    const manifiestoHeaders = [
      'No. Contenedor / Factura', 'Proveedor', 'PO Referencia', 'Tipo Transporte', 
      'Fecha Arribo CEDIS', 'Estado Embarque', 'Total Piezas', 'SKUs Únicos', 
      'Total Pallets', 'Total Asignadas', 'Saldo Libre Total'
    ];

    const auditoriaHeaders = [
      'Fecha / Hora', 'Tipo Movimiento', 'ID Pedido', 'Código OEM', 
      'Descripción', 'Cantidad', 'Contenedor Origen', 'Pallet Origen', 
      'Usuario / Responsable', 'Observación'
    ];

    const orderingHeaders = [
      'Parts code', 'Ordering Quantity', 'Comment', 'Categorizacion', 
      'Peso Unitario (kg)', 'Dimensiones (L x W x H cm)', 'Peso Volumetrico IATA (kg)', 
      'Razon Clasificacion', 'Sucursal Solicitante', 'Pedido Ref', 'Fecha Creacion'
    ];

    const encargadosHeaders = [
      'Nombre del Encargado', 'Sucursal', 'Departamento / Canal', 
      'Cargo / Rol Operativo', 'Teléfono / WhatsApp', 'Correo Electrónico', 
      'Estado', 'Habilitado Móvil'
    ];

    // Filas iniciales de encargados según el GS
    const encargadosRows = [
      ['Leidys Perez', 'Villa Lucre', 'Mostrador', 'Ventas Mostrador', '+507 6561-1360', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
      ['Edwin Blanco', 'Villa Lucre', 'Chapistería', 'Chapisteria', '+507 6561-1360', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
      ['Carlos Mendoza', 'Costa Verde', 'Taller Mecánico', 'Taller', '+507 6561-1361', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
      ['Valeria Castillo', 'Calle 50', 'Garantías', 'Asesor Garantías', '+507 6561-1362', 'repuestos@changanpanama.com', 'Activo', 'Sí'],
      ['Alexis Rios', 'Tumba Muerto', 'Colisión', 'Chapistería y Pintura', '+507 6561-1363', 'repuestos@changanpanama.com', 'Activo', 'Sí']
    ];

    // Filas iniciales de manifiestos
    const manifiestosRows = [
      ['INV-CN-8902', 'Mobitech Changan China Co., Ltd', 'PO-2026-CH-089', 'Marítimo 40HQ', '2026-08-15', 'FÍSICAMENTE RECIBIDO EN CEDIS', 120, 6, 4, 3, 117],
      ['INV-CN-9140', 'Mobitech Changan China Co., Ltd', 'PO-2026-CH-112', 'Marítimo 40HQ', '2026-09-02', 'FÍSICAMENTE RECIBIDO EN CEDIS', 85, 4, 3, 2, 83]
    ];

    // Filas iniciales de DPL Detalle
    const dplRows = [
      ['INV-CN-8902_1', 'INV-CN-8902', 'P001', 'PKG-101', 'S101001-0100', 'S101001-0100', 'FILTRO DE ACEITE 1.5T BLUE CORE', 30, 0, 0, 30, 'Pallet P001', ''],
      ['INV-CN-8902_2', 'INV-CN-8902', 'P001', 'PKG-102', 'S201015-0200', 'S201015-0200', 'PASTILLAS DE FRENO DELANTERAS CS55', 20, 0, 1, 19, 'Pallet P001', 'PED-CV-2115 (1u)'],
      ['INV-CN-8902_3', 'INV-CN-8902', 'P002', 'PKG-103', 'S302005-0800', 'S302005-0800', 'AMORTIGUADOR DELANTERO DERECHO HUNTER', 15, 0, 2, 13, 'Pallet P002', 'PED-TM-2103 (2u)'],
      ['INV-CN-9140_1', 'INV-CN-9140', 'P003', 'PKG-201', 'S501002-0300', 'S501002-0300', 'FARO DELANTERO DERECHO LED UNI-T', 8, 0, 1, 7, 'Pallet P003', 'PED-VL-2090 (1u)'],
      ['INV-CN-9140_2', 'INV-CN-9140', 'P004', 'PKG-202', 'S602010-0400', 'S602010-0400', 'BOMBA DE AGUA MOTOR BLUE CORE', 12, 0, 1, 11, 'Pallet P004', 'PED-C50-2122 (1u)']
    ];

    // Filas de Matriz Central con los 18 campos exactos
    const matrizRows = [
      ['PED-VL-2090', 'VOR / Unidad Parada', '2026-09-08 10:15', 'Villa Lucre', 'Leidys Perez', 'Marta Gonzalez', 'UNI-T Elite / Luxury', 'LS5A3B123PA009812', 'OR-8821', 'S501002-0300', 'FARO DELANTERO DERECHO LED UNI-T', 1, 1, 'COMPROMETIDO en INV-CN-9140 • Pallet P003', 'INV-CN-9140', 'P003', 'PKG-201', 'Vehículo detenido en taller por colisión'],
      ['PED-TM-2103', 'Chapistería y Colisión', '2026-09-09 14:20', 'Tumba Muerto', 'Alexis Rios', 'Transportes del Istmo S.A.', 'Hunter 4x4 Diesel', 'LS5C4D567PA011234', 'OR-8904', 'S302005-0800', 'AMORTIGUADOR DELANTERO DERECHO HUNTER', 2, 2, 'COMPROMETIDO en INV-CN-8902 • Pallet P002', 'INV-CN-8902', 'P002', 'PKG-103', 'Flota comercial preventiva'],
      ['PED-CV-2115', 'Stock Regular', '2026-09-10 09:00', 'Costa Verde', 'Carlos Mendoza', 'Consumidor Final', 'CS55 Plus DCT', 'LS5B2A345PA008765', 'OR-8950', 'S201015-0200', 'PASTILLAS DE FRENO DELANTERAS CS55', 1, 1, 'COMPROMETIDO en INV-CN-8902 • Pallet P001', 'INV-CN-8902', 'P001', 'PKG-102', 'Reposición de mostrador sucursal'],
      ['PED-C50-2122', 'Garantía', '2026-09-10 16:45', 'Calle 50', 'Valeria Castillo', 'Ricardo Arjona', 'UNI-K 2.0T AWD', 'LS5D9E789PA003456', 'OR-9002', 'S602010-0400', 'BOMBA DE AGUA MOTOR BLUE CORE', 1, 1, 'COMPROMETIDO en INV-CN-9140 • Pallet P004', 'INV-CN-9140', 'P004', 'PKG-202', 'Fuga de refrigerante autorizada por planta']
    ];

    const dataPayload = [
      { range: 'Matriz_Central!A1:R', values: [matrizHeaders, ...matrizRows] },
      { range: 'DPL_Detalle!A1:M', values: [dplHeaders, ...dplRows] },
      { range: 'DPL_Manifiestos!A1:K', values: [manifiestoHeaders, ...manifiestosRows] },
      { range: 'Auditoria_Kardex!A1:J', values: [auditoriaHeaders] },
      { range: 'Ordering_Template!A1:K', values: [orderingHeaders] },
      { range: 'BD_Encargados!A1:H', values: [encargadosHeaders, ...encargadosRows] }
    ];

    const updateResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: dataPayload
        })
      }
    );

    if (!updateResp.ok) {
      console.warn('Advertencia al escribir datos semilla iniciales:', await updateResp.text());
    }
  }
}

export const googleWorkspaceService = new GoogleWorkspaceService();
