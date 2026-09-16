import { INITIAL_CATALOG, INITIAL_CONTAINERS, INITIAL_MODELS, INITIAL_ORDERS } from '../data/mockData';
import { ChanganVehicleModel, MasterCatalogPart, ShippingContainer, SpecialOrder } from '../types';

const STORAGE_KEYS = {
  ORDERS: 'changan_cedis_orders_v3',
  CONTAINERS: 'changan_cedis_containers_v3',
  CATALOG: 'changan_cedis_catalog_v3',
  MODELS: 'changan_cedis_models_v3',
  SETTINGS: 'changan_cedis_settings_v3',
  USER_DATA_FLAG: 'changan_cedis_has_user_custom_data_v3',
  LAST_BACKUP_DATE: 'changan_cedis_last_backup_date',
};

// Legacy keys to migrate seamlessly
const LEGACY_KEYS = {
  ORDERS: 'changan_cedis_orders_v2',
  CONTAINERS: 'changan_cedis_containers_v2',
  CATALOG: 'changan_cedis_catalog_v2',
  SETTINGS: 'changan_cedis_settings_v2',
};

export interface AppSettings {
  googleSheetUrl?: string;
  autoPrintLabelsOnMatch: boolean;
  webhookUrl?: string;
  regionalAmericasMode: boolean;
  autoSaveCloud: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  googleSheetUrl: 'https://docs.google.com/spreadsheets/d/1Changan-CEDIS-Logistics-Panama-Master/edit',
  autoPrintLabelsOnMatch: false,
  regionalAmericasMode: true,
  autoSaveCloud: true,
};

export interface FullDatabaseBackup {
  version: string;
  appName: string;
  exportedAt: string;
  totalOrders: number;
  totalContainers: number;
  totalCatalogParts: number;
  totalModels: number;
  orders: SpecialOrder[];
  containers: ShippingContainer[];
  catalog: MasterCatalogPart[];
  models: ChanganVehicleModel[];
  settings: AppSettings;
}

export function loadOrdersFromStorage(): SpecialOrder[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEYS.ORDERS);
      if (raw) {
        try {
          const legacyParsed = JSON.parse(raw);
          if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
            localStorage.setItem(STORAGE_KEYS.ORDERS, raw);
          } else {
            raw = null;
          }
        } catch {
          raw = null;
        }
      }
    }

    if (!raw) {
      saveOrdersToStorage(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }

    const parsed: SpecialOrder[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveOrdersToStorage(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }

    return parsed;
  } catch (err) {
    console.error('Error reading orders from storage:', err);
    return INITIAL_ORDERS;
  }
}

export function saveOrdersToStorage(orders: SpecialOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.USER_DATA_FLAG, 'true');
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, new Date().toISOString());
  } catch (err) {
    console.error('Error saving orders to localStorage', err);
  }
}

export function loadContainersFromStorage(): ShippingContainer[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.CONTAINERS);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEYS.CONTAINERS);
      if (raw) {
        try {
          const legacyParsed = JSON.parse(raw);
          if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
            localStorage.setItem(STORAGE_KEYS.CONTAINERS, raw);
          } else {
            raw = null;
          }
        } catch {
          raw = null;
        }
      }
    }

    if (!raw) {
      saveContainersToStorage(INITIAL_CONTAINERS);
      return INITIAL_CONTAINERS;
    }

    const parsed: ShippingContainer[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveContainersToStorage(INITIAL_CONTAINERS);
      return INITIAL_CONTAINERS;
    }

    return parsed;
  } catch (err) {
    console.error('Error reading containers from storage:', err);
    return INITIAL_CONTAINERS;
  }
}

export function saveContainersToStorage(containers: ShippingContainer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTAINERS, JSON.stringify(containers));
    localStorage.setItem(STORAGE_KEYS.USER_DATA_FLAG, 'true');
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, new Date().toISOString());
  } catch (err) {
    console.error('Error saving containers to localStorage', err);
  }
}

export function loadCatalogFromStorage(): MasterCatalogPart[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.CATALOG);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEYS.CATALOG);
      if (raw) {
        localStorage.setItem(STORAGE_KEYS.CATALOG, raw);
      }
    }

    if (!raw) {
      saveCatalogToStorage(INITIAL_CATALOG);
      return INITIAL_CATALOG;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveCatalogToStorage(INITIAL_CATALOG);
      return INITIAL_CATALOG;
    }

    return parsed;
  } catch {
    return INITIAL_CATALOG;
  }
}

export function saveCatalogToStorage(catalog: MasterCatalogPart[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
  } catch (err) {
    console.error('Error saving catalog to localStorage', err);
  }
}

export function loadModelsFromStorage(): ChanganVehicleModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MODELS);
    if (!raw) {
      saveModelsToStorage(INITIAL_MODELS);
      return INITIAL_MODELS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveModelsToStorage(INITIAL_MODELS);
      return INITIAL_MODELS;
    }

    return parsed;
  } catch {
    return INITIAL_MODELS;
  }
}

export function saveModelsToStorage(models: ChanganVehicleModel[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));
  } catch (err) {
    console.error('Error saving models to localStorage', err);
  }
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettingsToStorage(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to localStorage', err);
  }
}

export function resetAllStorageToDefaults(): void {
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
  localStorage.removeItem(STORAGE_KEYS.CONTAINERS);
  localStorage.removeItem(STORAGE_KEYS.CATALOG);
  localStorage.removeItem(STORAGE_KEYS.MODELS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA_FLAG);
  saveOrdersToStorage(INITIAL_ORDERS);
  saveContainersToStorage(INITIAL_CONTAINERS);
  saveCatalogToStorage(INITIAL_CATALOG);
  saveModelsToStorage(INITIAL_MODELS);
  saveSettingsToStorage(DEFAULT_SETTINGS);
}

// Generate a complete single-file JSON backup
export function createFullDatabaseBackup(
  orders: SpecialOrder[],
  containers: ShippingContainer[],
  catalog: MasterCatalogPart[],
  models?: ChanganVehicleModel[],
  settings?: AppSettings
): FullDatabaseBackup {
  const currentModels = models && models.length > 0 ? models : loadModelsFromStorage();
  return {
    version: '2.5.0',
    appName: 'CEDIS Changan Auto Panamá - Special Orders & Cross-Docking Hub',
    exportedAt: new Date().toISOString(),
    totalOrders: orders.length,
    totalContainers: containers.length,
    totalCatalogParts: catalog.length,
    totalModels: currentModels.length,
    orders,
    containers,
    catalog,
    models: currentModels,
    settings: settings || loadSettingsFromStorage(),
  };
}

// Download JSON backup directly in browser
export function downloadBackupJsonFile(backup: FullDatabaseBackup): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `RESPALDO_CEDIS_CHANGAN_${dateStr}_${timeStr}.json`;
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse and validate an imported backup JSON file
export function parseAndValidateBackupJson(rawText: string): {
  isValid: boolean;
  error?: string;
  data?: FullDatabaseBackup;
} {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'El archivo no contiene un JSON válido.' };
    }

    if (!Array.isArray(parsed.orders) && !Array.isArray(parsed.containers)) {
      return {
        isValid: false,
        error: 'El archivo no tiene la estructura de pedidos ni contenedores de Changan CEDIS.',
      };
    }

    const backup: FullDatabaseBackup = {
      version: parsed.version || '2.5.0',
      appName: parsed.appName || 'CEDIS Changan',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      totalOrders: Array.isArray(parsed.orders) ? parsed.orders.length : 0,
      totalContainers: Array.isArray(parsed.containers) ? parsed.containers.length : 0,
      totalCatalogParts: Array.isArray(parsed.catalog) ? parsed.catalog.length : 0,
      totalModels: Array.isArray(parsed.models) ? parsed.models.length : INITIAL_MODELS.length,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      containers: Array.isArray(parsed.containers) ? parsed.containers : [],
      catalog: Array.isArray(parsed.catalog) ? parsed.catalog : INITIAL_CATALOG,
      models: Array.isArray(parsed.models) ? parsed.models : INITIAL_MODELS,
      settings: parsed.settings || DEFAULT_SETTINGS,
    };

    return { isValid: true, data: backup };
  } catch (err: any) {
    return { isValid: false, error: `Error al procesar JSON: ${err?.message || 'Formato inválido'}` };
  }
}

export function exportOrdersToCsv(orders: SpecialOrder[]): string {
  const headers = [
    'N_Pedido',
    'Fecha',
    'Sucursal',
    'Colaborador',
    'Canal',
    'Tipo_Pedido',
    'Cotizacion',
    'Cliente',
    'Placa',
    'Modelo_Changan',
    'Estado_Pago',
    'Doc_Pago',
    'Codigo_Repuesto',
    'Codigo_Actualizado',
    'Descripcion',
    'Cantidad_Solicitada',
    'Cantidad_Asignada',
    'Contenedor_Asignado',
    'Ubicacion_CEDIS',
    'Estado_General',
    'Facturado',
    'Factura_Final',
  ];

  const rows: string[] = [headers.join(',')];

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const escape = (val?: string | number | boolean) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      rows.push(
        [
          escape(order.orderNumber),
          escape(order.createdAt.split('T')[0]),
          escape(order.branch),
          escape(order.collaboratorName),
          escape(order.channel),
          escape(order.orderType),
          escape(order.quotationNumber),
          escape(order.clientName),
          escape(order.plate),
          escape(order.changanModel),
          escape(order.paymentStatus),
          escape(order.receiptOrInvoiceNumber),
          escape(item.code),
          escape(item.updatedCode || ''),
          escape(item.description),
          escape(item.quantityRequested),
          escape(item.quantityAssigned),
          escape(item.containerId || order.assignedContainerId || ''),
          escape(item.locationInCedis || ''),
          escape(order.overallStatus),
          escape(order.isBilled ? 'SI' : 'NO'),
          escape(order.billingInvoiceNumber || ''),
        ].join(',')
      );
    });
  });

  return rows.join('\n');
}
