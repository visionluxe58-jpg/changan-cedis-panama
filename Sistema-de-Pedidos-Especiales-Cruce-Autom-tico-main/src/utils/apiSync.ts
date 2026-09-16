import * as XLSX from 'xlsx';
import { ChanganVehicleModel, MasterCatalogPart, ShippingContainer, SpecialOrder, VehicleCategory } from '../types';
import {
  loadCatalogFromStorage,
  loadContainersFromStorage,
  loadModelsFromStorage,
  loadOrdersFromStorage,
  saveCatalogToStorage,
  saveContainersToStorage,
  saveModelsToStorage,
  saveOrdersToStorage,
} from './storage';

// Play an instant pleasant dispatch chime using the browser Web Audio API
export function playOrderAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic chime: Note 1 (E5 / 659.25Hz), Note 2 (A5 / 880Hz), Note 3 (C#6 / 1108.73Hz)
    const tones = [
      { freq: 659.25, time: 0, dur: 0.25 },
      { freq: 880.0, time: 0.12, dur: 0.35 },
      { freq: 1108.73, time: 0.24, dur: 0.5 },
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.25, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (err) {
    console.warn('Audio alert could not be played automatically:', err);
  }
}

// Request Browser Notifications if supported
export function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }
}

export function triggerDesktopNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch {
      // Ignored
    }
  }
}

// API Endpoints with Non-Destructive Bidirectional Sync
export async function fetchOrdersFromServer(): Promise<SpecialOrder[]> {
  const localOrders = loadOrdersFromStorage();
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const serverOrders: SpecialOrder[] = await res.json();
    
    if (Array.isArray(serverOrders)) {
      // Intelligently merge without losing user orders
      const orderMap = new Map<string, SpecialOrder>();
      
      // 1. Index local orders first
      localOrders.forEach((o) => {
        const key = o.id || o.orderNumber;
        if (key) orderMap.set(key, o);
      });
      
      // 2. Merge server orders (updates matching, adds new ones)
      serverOrders.forEach((so) => {
        const key = so.id || so.orderNumber;
        if (key) {
          const existing = orderMap.get(key);
          if (existing) {
            orderMap.set(key, { ...existing, ...so });
          } else {
            orderMap.set(key, so);
          }
        }
      });
      
      const merged = Array.from(orderMap.values());
      saveOrdersToStorage(merged);
      
      // If client had orders that server didn't have yet, push them to server
      if (merged.length > serverOrders.length) {
        bootstrapClientStateToServer(
          merged,
          loadContainersFromStorage(),
          loadCatalogFromStorage(),
          loadModelsFromStorage()
        );
      }
      return merged;
    }
    return localOrders;
  } catch (err) {
    console.warn('Using local fallback for orders:', err);
    return localOrders;
  }
}

export async function createOrderOnServer(order: SpecialOrder): Promise<SpecialOrder> {
  // Save locally first
  const current = loadOrdersFromStorage();
  const updated = [order, ...current.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber)];
  saveOrdersToStorage(updated);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.order) return data.order;
    }
  } catch (err) {
    console.error('Server sync error on create order:', err);
  }
  return order;
}

export async function saveBulkOrdersToServer(orders: SpecialOrder[]): Promise<void> {
  const current = loadOrdersFromStorage();
  const importedIds = new Set(orders.map((o) => o.id));
  const importedNumbers = new Set(orders.map((o) => o.orderNumber));
  const filtered = current.filter((o) => !importedIds.has(o.id) && !importedNumbers.has(o.orderNumber));
  const merged = [...orders, ...filtered];
  saveOrdersToStorage(merged);

  try {
    await fetch('/api/orders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orders),
    });
  } catch (err) {
    console.error('Server sync error on bulk orders:', err);
  }
}

export async function updateOrderOnServer(order: SpecialOrder): Promise<SpecialOrder> {
  const current = loadOrdersFromStorage();
  const updated = current.map((o) => (o.id === order.id ? order : o));
  saveOrdersToStorage(updated);

  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.order) return data.order;
    }
  } catch (err) {
    console.error('Server sync error on update order:', err);
  }
  return order;
}

export async function deleteOrderOnServer(orderId: string): Promise<void> {
  const current = loadOrdersFromStorage();
  saveOrdersToStorage(current.filter((o) => o.id !== orderId));

  try {
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Server sync error on delete order:', err);
  }
}

// Bootstrap local storage state to server on app boot
export async function bootstrapClientStateToServer(
  orders: SpecialOrder[],
  containers: ShippingContainer[],
  catalog: MasterCatalogPart[],
  models?: ChanganVehicleModel[]
): Promise<void> {
  try {
    const currentModels = models || loadModelsFromStorage();
    await fetch('/api/sync-bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders, containers, catalog, models: currentModels }),
    });
  } catch (err) {
    console.warn('Bootstrap sync to server warning:', err);
  }
}

// Restore entire database from full JSON backup
export async function restoreFullBackupToServer(backup: {
  orders: SpecialOrder[];
  containers: ShippingContainer[];
  catalog: MasterCatalogPart[];
  models?: ChanganVehicleModel[];
}): Promise<void> {
  const res = await fetch('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backup),
  });
  if (!res.ok) {
    throw new Error(`Error en el servidor: HTTP ${res.status}`);
  }
}

// Purge all data on server
export async function purgeAllServerData(preserveCatalog: boolean = true, preserveModels: boolean = true): Promise<void> {
  const res = await fetch('/api/purge-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preserveCatalog, preserveModels }),
  });
  if (!res.ok) {
    throw new Error(`Error al purgar en servidor: HTTP ${res.status}`);
  }
}

export async function fetchContainersFromServer(): Promise<ShippingContainer[]> {
  const localContainers = loadContainersFromStorage();
  try {
    const res = await fetch('/api/containers');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const serverContainers: ShippingContainer[] = await res.json();
    
    if (Array.isArray(serverContainers)) {
      const containerMap = new Map<string, ShippingContainer>();
      
      // Index local containers first
      localContainers.forEach((c) => {
        const key = c.id || c.containerNumber;
        if (key) containerMap.set(key, c);
      });
      
      // Merge server containers
      serverContainers.forEach((sc) => {
        const key = sc.id || sc.containerNumber;
        if (key) {
          const existing = containerMap.get(key);
          if (existing) {
            containerMap.set(key, { ...existing, ...sc });
          } else {
            containerMap.set(key, sc);
          }
        }
      });
      
      const merged = Array.from(containerMap.values());
      saveContainersToStorage(merged);
      
      if (merged.length > serverContainers.length) {
        saveContainersToServer(merged);
      }
      return merged;
    }
    return localContainers;
  } catch (err) {
    console.warn('Using local fallback for containers:', err);
    return localContainers;
  }
}

export async function saveContainersToServer(containers: ShippingContainer[]): Promise<void> {
  saveContainersToStorage(containers);
  try {
    await fetch('/api/containers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containers),
    });
  } catch (err) {
    console.error('Server sync error on containers:', err);
  }
}

export async function updateContainerOnServer(container: ShippingContainer): Promise<ShippingContainer> {
  const current = loadContainersFromStorage();
  const updated = current.map((c) => (c.id === container.id ? container : c));
  saveContainersToStorage(updated);
  try {
    const res = await fetch(`/api/containers/${encodeURIComponent(container.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(container),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.container) return data.container;
    }
  } catch (err) {
    console.error('Server sync error on update container:', err);
  }
  return container;
}

export async function deleteContainerOnServer(containerId: string): Promise<void> {
  const current = loadContainersFromStorage();
  const updated = current.filter((c) => c.id !== containerId);
  saveContainersToStorage(updated);
  try {
    await fetch(`/api/containers/${encodeURIComponent(containerId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Server sync error on delete container:', err);
  }
}

export async function fetchCatalogFromServer(): Promise<MasterCatalogPart[]> {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      saveCatalogToStorage(data);
      return data;
    }
    return loadCatalogFromStorage();
  } catch {
    return loadCatalogFromStorage();
  }
}

export async function saveCatalogPartToServer(part: MasterCatalogPart): Promise<void> {
  const current = loadCatalogFromStorage();
  const idx = current.findIndex((p) => p.id === part.id || p.code === part.code);
  let updated: MasterCatalogPart[];
  if (idx >= 0) {
    updated = current.map((p) => (p.id === part.id || p.code === part.code ? part : p));
  } else {
    updated = [part, ...current];
  }
  saveCatalogToStorage(updated);
  try {
    await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(part),
    });
  } catch (err) {
    console.error('Server sync error on catalog save:', err);
  }
}

export async function saveBulkCatalogToServer(parts: MasterCatalogPart[]): Promise<void> {
  const current = loadCatalogFromStorage();
  const importedCodes = new Set(parts.map((p) => p.code.toUpperCase()));
  const filtered = current.filter((p) => !importedCodes.has(p.code.toUpperCase()));
  const merged = [...parts, ...filtered];
  saveCatalogToStorage(merged);
  try {
    await fetch('/api/catalog/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: parts }),
    });
  } catch (err) {
    console.error('Server sync error on bulk catalog save:', err);
  }
}

export async function deleteCatalogPartOnServer(partId: string): Promise<void> {
  const current = loadCatalogFromStorage();
  const updated = current.filter((p) => p.id !== partId && p.code !== partId);
  saveCatalogToStorage(updated);
  try {
    await fetch(`/api/catalog/${encodeURIComponent(partId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Server sync error on delete catalog item:', err);
  }
}

// ================= MODELS API & STORAGE SYNC =================
export async function fetchModelsFromServer(): Promise<ChanganVehicleModel[]> {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      saveModelsToStorage(data);
      return data;
    }
    return loadModelsFromStorage();
  } catch {
    return loadModelsFromStorage();
  }
}

export async function saveModelsToServer(models: ChanganVehicleModel[]): Promise<void> {
  saveModelsToStorage(models);
  try {
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(models),
    });
  } catch (err) {
    console.error('Server sync error on save models:', err);
  }
}

export async function saveBulkModelsToServer(models: ChanganVehicleModel[]): Promise<void> {
  const current = loadModelsFromStorage();
  const importedNames = new Set(models.map((m) => m.name.toLowerCase()));
  const filtered = current.filter((m) => !importedNames.has(m.name.toLowerCase()));
  const merged = [...models, ...filtered];
  saveModelsToStorage(merged);
  try {
    await fetch('/api/models/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: models }),
    });
  } catch (err) {
    console.error('Server sync error on bulk models save:', err);
  }
}

export async function saveModelToServer(model: ChanganVehicleModel): Promise<void> {
  const current = loadModelsFromStorage();
  const idx = current.findIndex((m) => m.id === model.id || m.name.toLowerCase() === model.name.toLowerCase());
  let updated: ChanganVehicleModel[];
  if (idx >= 0) {
    updated = current.map((m) => (m.id === model.id || m.name.toLowerCase() === model.name.toLowerCase() ? model : m));
  } else {
    updated = [model, ...current];
  }
  saveModelsToStorage(updated);
  try {
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    });
  } catch (err) {
    console.error('Server sync error on save single model:', err);
  }
}

export async function deleteModelOnServer(modelId: string): Promise<void> {
  const current = loadModelsFromStorage();
  const updated = current.filter((m) => m.id !== modelId && m.name !== modelId);
  saveModelsToStorage(updated);
  try {
    await fetch(`/api/models/${encodeURIComponent(modelId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Server sync error on delete model:', err);
  }
}

// ================= EXCEL TEMPLATES & IMPORT / EXPORT UTILITIES =================

/**
 * Generates and downloads an Excel template for Changan Vehicle Models
 */
export function generateModelsExcelTemplate(): void {
  const templateData = [
    {
      'Nombre Modelo': 'CS55 PLUS',
      'Código / ID': 'MOD-CS55P',
      'Categoría (SUV / Sedan / Pickup / Comercial / EV)': 'SUV',
      'Años Compatibles (ej. 2021 - 2026)': '2021 - 2026',
      'Motorización (ej. 1.5L Turbo BlueCore)': '1.5L Turbo BlueCore (185 HP)',
      'Transmisión (ej. 7-DCT)': '7-DCT',
      'Generación / Fase': '2da Generación',
      'Estado (Activo / Descontinuado / Prototipo)': 'Activo',
      'Notas / Observaciones': 'Plataforma Changan P3. Filtro aceite genérico 1017100-M01',
    },
    {
      'Nombre Modelo': 'UNI-K',
      'Código / ID': 'MOD-UNIK',
      'Categoría (SUV / Sedan / Pickup / Comercial / EV)': 'SUV',
      'Años Compatibles (ej. 2021 - 2026)': '2022 - 2026',
      'Motorización (ej. 1.5L Turbo BlueCore)': '2.0L Turbo BlueCore (233 HP)',
      'Transmisión (ej. 7-DCT)': '8-AT Aisin',
      'Generación / Fase': 'Serie UNI',
      'Estado (Activo / Descontinuado / Prototipo)': 'Activo',
      'Notas / Observaciones': 'Tracción AWD disponible. Requiere aceite sintético 0W-20',
    },
    {
      'Nombre Modelo': 'HUNTER PLUS',
      'Código / ID': 'MOD-HNTP',
      'Categoría (SUV / Sedan / Pickup / Comercial / EV)': 'Pickup',
      'Años Compatibles (ej. 2021 - 2026)': '2023 - 2026',
      'Motorización (ej. 1.5L Turbo BlueCore)': '2.0L Turbo Gasolina / 1.9L Diesel',
      'Transmisión (ej. 7-DCT)': '8-AT ZF / 6-MT',
      'Generación / Fase': 'Facelift Pro',
      'Estado (Activo / Descontinuado / Prototipo)': 'Activo',
      'Notas / Observaciones': 'Doble cabina 4x4. Pastillas de freno Heavy Duty',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Column widths
  ws['!cols'] = [
    { wch: 22 }, // Modelo
    { wch: 16 }, // ID
    { wch: 18 }, // Categoría
    { wch: 22 }, // Años
    { wch: 32 }, // Motor
    { wch: 18 }, // Transmisión
    { wch: 20 }, // Generación
    { wch: 14 }, // Estado
    { wch: 45 }, // Notas
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelos_Changan');

  // Instructions Sheet
  const instructions = [
    { 'INSTRUCCIONES DE LLENADO': '1. Complete las filas con los modelos de vehículos Changan que comercializa su concesionario.' },
    { 'INSTRUCCIONES DE LLENADO': '2. La columna "Nombre Modelo" es obligatoria y se usará para el autocompletado de los asesores.' },
    { 'INSTRUCCIONES DE LLENADO': '3. Puede agregar tantas filas como necesite e importar el archivo desde el botón "Importar Excel".' },
    { 'INSTRUCCIONES DE LLENADO': '4. Categorías recomendadas: SUV, Sedan, Pickup, Comercial, EV.' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, 'PLANTILLA_MODELOS_CHANGAN_CEDIS.xlsx');
}

/**
 * Generates and downloads an Excel template for Parts Master Catalog
 */
export function generatePartsCatalogExcelTemplate(): void {
  const templateData = [
    {
      'Código de Parte (Número de Parte)': '1017100-M01',
      'Descripción del Repuesto': 'Filtro de Aceite de Motor BlueCore',
      'Categoría': 'Motor',
      'Modelos Compatibles (separados por coma)': 'CS35 PLUS, CS55 PLUS, UNI-T, ALSVIN',
      'Precio Estimado ($ USD)': 12.50,
      'Ubicación CEDIS (Pasillo/Rack)': 'A-01-04',
      'Stock Mínimo Sugerido': 50,
      'Notas Técnicas': 'Rosca M20x1.5. Compatible con toda la gama 1.4T y 1.5T',
    },
    {
      'Código de Parte (Número de Parte)': '3501110-B01',
      'Descripción del Repuesto': 'Juego de Pastillas de Freno Delanteras Cerámicas',
      'Categoría': 'Frenos',
      'Modelos Compatibles (separados por coma)': 'CS55 PLUS, CS75 PLUS, HUNTER',
      'Precio Estimado ($ USD)': 48.00,
      'Ubicación CEDIS (Pasillo/Rack)': 'B-03-12',
      'Stock Mínimo Sugerido': 20,
      'Notas Técnicas': 'Compuesto cerámico de bajo polvo. Incluye láminas silenciadoras',
    },
    {
      'Código de Parte (Número de Parte)': '8105010-U01',
      'Descripción del Repuesto': 'Filtro de Cabina / Aire Acondicionado PM2.5',
      'Categoría': 'Climatización',
      'Modelos Compatibles (separados por coma)': 'UNI-K, UNI-T, CS35 PLUS, EADO EV',
      'Precio Estimado ($ USD)': 18.00,
      'Ubicación CEDIS (Pasillo/Rack)': 'C-02-08',
      'Stock Mínimo Sugerido': 30,
      'Notas Técnicas': 'Carbón activado antibacterial',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  ws['!cols'] = [
    { wch: 28 }, // Código
    { wch: 45 }, // Descripción
    { wch: 18 }, // Categoría
    { wch: 38 }, // Modelos
    { wch: 22 }, // Precio
    { wch: 25 }, // Ubicación
    { wch: 20 }, // Stock
    { wch: 45 }, // Notas
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogo_Repuestos');

  const instructions = [
    { 'GUÍA DE IMPORTACIÓN DE REPUESTOS': '1. Ingrese el Código de Parte exacto (se utiliza para match de pedidos y autocompletado).' },
    { 'GUÍA DE IMPORTACIÓN DE REPUESTOS': '2. La columna "Modelos Compatibles" permite que al elegir un auto, el sistema sugiera piezas compatibles.' },
    { 'GUÍA DE IMPORTACIÓN DE REPUESTOS': '3. Al importar, se actualizarán los repuestos existentes y se agregarán los nuevos.' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, 'PLANTILLA_CATALOGO_REPUESTOS_CHANGAN.xlsx');
}

/**
 * Export current models database to Excel
 */
export function exportModelsToExcel(models: ChanganVehicleModel[]): void {
  const data = models.map((m) => ({
    'ID': m.id,
    'Nombre Modelo': m.name,
    'Categoría': m.category,
    'Años Compatibles': m.yearRange || '',
    'Motor': m.engine || '',
    'Transmisión': m.transmission || '',
    'Generación': m.generation || '',
    'Estado': m.active !== false ? 'Activo' : 'Inactivo',
    'Notas': m.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelos_Changan');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `BASE_DATOS_MODELOS_CHANGAN_${dateStr}.xlsx`);
}

/**
 * Export current parts catalog database to Excel
 */
export function exportCatalogToExcel(catalog: MasterCatalogPart[]): void {
  const data = catalog.map((p) => ({
    'Código de Parte': p.code,
    'Código Actualizado': p.updatedCode || '',
    'Descripción': p.description || '',
    'Categoría': p.category || 'General',
    'Modelos Compatibles': p.compatibleModels.join(', '),
    'Ubicación Rack CEDIS': p.suggestedLocation || 'A-01',
    'Precio Estimado ($)': p.priceEstimate || 0,
    'Notas Técnicas': p.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 24 },
    { wch: 20 },
    { wch: 45 },
    { wch: 18 },
    { wch: 35 },
    { wch: 22 },
    { wch: 18 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogo_Repuestos');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `BASE_DATOS_REPUESTOS_CHANGAN_${dateStr}.xlsx`);
}

/**
 * Parse an uploaded Excel file for Vehicle Models
 */
export async function parseModelsExcelFile(file: File): Promise<ChanganVehicleModel[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

  const parsedModels: ChanganVehicleModel[] = [];

  rawRows.forEach((row, index) => {
    // Look for name under multiple common header variations
    const name = (
      row['Nombre Modelo'] ||
      row['Modelo'] ||
      row['MODELO'] ||
      row['Nombre'] ||
      row['Name'] ||
      row['model'] ||
      ''
    ).toString().trim();

    if (!name) return;

    const id = (
      row['Código / ID'] ||
      row['ID'] ||
      row['Codigo'] ||
      row['id'] ||
      `MOD-${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${index + 1}`
    ).toString().trim();

    const categoryRaw = (
      row['Categoría (SUV / Sedan / Pickup / Comercial / EV)'] ||
      row['Categoría'] ||
      row['Categoria'] ||
      row['Category'] ||
      'SUV'
    ).toString().trim();

    let category: VehicleCategory = 'SUV';
    if (/sedan|sedán/i.test(categoryRaw)) category = 'Sedán';
    else if (/pickup/i.test(categoryRaw)) category = 'Pickup';
    else if (/comercial|van/i.test(categoryRaw)) category = 'Comercial';
    else if (/ev|electri|hibrid|híbrid/i.test(categoryRaw)) category = 'Eléctrico / Híbrido';

    const yearRange = (row['Años Compatibles (ej. 2021 - 2026)'] || row['Años Compatibles'] || row['Años'] || row['Year'] || '').toString().trim();
    const engine = (row['Motorización (ej. 1.5L Turbo BlueCore)'] || row['Motor'] || row['Engine'] || '').toString().trim();
    const transmission = (row['Transmisión (ej. 7-DCT)'] || row['Transmisión'] || row['Transmision'] || row['Transmission'] || '').toString().trim();
    const generation = (row['Generación / Fase'] || row['Generación'] || row['Generacion'] || '').toString().trim();
    const statusRaw = (row['Estado (Activo / Descontinuado / Prototipo)'] || row['Estado'] || 'Activo').toString().trim();
    const active = !/descontinuado|inactivo|false/i.test(statusRaw);
    const notes = (row['Notas / Observaciones'] || row['Notas'] || row['Observaciones'] || '').toString().trim();

    parsedModels.push({
      id,
      name,
      category,
      yearRange: yearRange || undefined,
      engine: engine || undefined,
      transmission: transmission || undefined,
      generation: generation || undefined,
      active,
      notes: notes || undefined,
    });
  });

  return parsedModels;
}

/**
 * Parse an uploaded Excel file for Parts Catalog
 */
export async function parseCatalogExcelFile(file: File): Promise<MasterCatalogPart[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

  const parsedParts: MasterCatalogPart[] = [];

  rawRows.forEach((row, index) => {
    const code = (
      row['Código de Parte (Número de Parte)'] ||
      row['Código de Parte'] ||
      row['Codigo de Parte'] ||
      row['Numero de Parte'] ||
      row['Código'] ||
      row['Codigo'] ||
      row['Part Number'] ||
      row['Code'] ||
      ''
    ).toString().trim().toUpperCase();

    const name = (
      row['Descripción del Repuesto'] ||
      row['Descripción'] ||
      row['Descripcion'] ||
      row['Nombre Repuesto'] ||
      row['Description'] ||
      ''
    ).toString().trim();

    if (!code || !name) return;

    const category = (
      row['Categoría'] ||
      row['Categoria'] ||
      row['Category'] ||
      'General'
    ).toString().trim();

    const compatibleModelsRaw = (
      row['Modelos Compatibles (separados por coma)'] ||
      row['Modelos Compatibles'] ||
      row['Modelos'] ||
      row['Compatible Models'] ||
      'TODOS LOS MODELOS'
    ).toString().trim();

    const compatibleModels = compatibleModelsRaw
      ? compatibleModelsRaw.split(/[,;\/|]/).map((s) => s.trim()).filter(Boolean)
      : ['TODOS LOS MODELOS'];

    const priceRaw = row['Precio Estimado ($ USD)'] || row['Precio Estimado ($)'] || row['Precio'] || row['Price'] || 0;
    const priceEstimate = typeof priceRaw === 'number' ? priceRaw : parseFloat(priceRaw.toString().replace(/[^0-9.]/g, '')) || 0;

    const locationRaw = (
      row['Ubicación Rack CEDIS'] ||
      row['Ubicación'] ||
      row['Ubicacion'] ||
      row['Rack'] ||
      row['Location'] ||
      'CEDIS-A-01'
    ).toString().trim().toUpperCase();

    const notes = (row['Notas Técnicas'] || row['Notas'] || row['Observaciones'] || '').toString().trim();

    parsedParts.push({
      id: `CAT-${code.replace(/[^a-zA-Z0-9]/g, '')}-${index + 1}`,
      code,
      description: name,
      category,
      compatibleModels,
      suggestedLocation: locationRaw || 'CEDIS-A-01',
      standardLeadTimeDays: 25,
      priceEstimate: priceEstimate > 0 ? priceEstimate : undefined,
      notes: notes || undefined,
    });
  });

  return parsedParts;
}

export async function resetServerDatabase(): Promise<void> {
  try {
    await fetch('/api/reset', { method: 'POST' });
  } catch (err) {
    console.error('Server reset error:', err);
  }
}

export async function purgeServerDatabase(preserveCatalog: boolean = true): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/purge-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preserveCatalog }),
    });
    if (res.ok) {
      saveOrdersToStorage([]);
      saveContainersToStorage([]);
      return await res.json();
    }
  } catch (err) {
    console.error('Server purge error:', err);
  }
  // Local fallback
  saveOrdersToStorage([]);
  saveContainersToStorage([]);
  return { success: true, message: 'Datos borrados localmente.' };
}

export async function askJarvisCopilot(prompt: string): Promise<{ success: boolean; answer: string; contextSummary?: any }> {
  try {
    const res = await fetch('/api/jarvis/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) {
      return await res.json();
    }
    return {
      success: false,
      answer: 'No fue posible conectar con el núcleo de JARVIS en este momento.',
    };
  } catch (err) {
    return {
      success: false,
      answer: 'Error de comunicación con el servicio de IA.',
    };
  }
}

// Operational Schedule Evaluator
export interface OperatingStatus {
  isOpen: boolean;
  isSunday: boolean;
  dayName: string;
  currentTimeString: string;
  openingTime: string;
  closingTime: string;
  message: string;
  nextEvent: string;
}

export function getOperatingScheduleStatus(overrideActive: boolean = false): OperatingStatus {
  const now = new Date();
  // Day of week: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTotalMinutes = hours * 60 + minutes;

  const daysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = daysSpanish[day];
  const currentTimeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (overrideActive) {
    return {
      isOpen: true,
      isSunday: day === 0,
      dayName,
      currentTimeString,
      openingTime: '07:00 AM',
      closingTime: '24/7 (Anulación de Guardia Activa)',
      message: 'Turno habilitado por anulación manual de supervisor.',
      nextEvent: 'Operación continua habilitada',
    };
  }

  // Sunday = 0: System rests
  if (day === 0) {
    return {
      isOpen: false,
      isSunday: true,
      dayName,
      currentTimeString,
      openingTime: '07:00 AM (Lunes)',
      closingTime: 'Descanso Dominical',
      message: 'Sistema en Reposo Dominical. Reinicia operaciones el Lunes a las 7:00 AM.',
      nextEvent: 'Apertura Lunes 7:00 AM',
    };
  }

  // Saturday = 6: 7:00 AM to 5:00 PM (17:00 = 1020 mins)
  if (day === 6) {
    const openMin = 7 * 60; // 420
    const closeMin = 17 * 60; // 1020
    const isOpen = currentTotalMinutes >= openMin && currentTotalMinutes < closeMin;
    return {
      isOpen,
      isSunday: false,
      dayName,
      currentTimeString,
      openingTime: '07:00 AM',
      closingTime: '05:00 PM',
      message: isOpen
        ? 'Sistema Operativo en Línea (Horario Sabatino 7:00 AM - 5:00 PM).'
        : currentTotalMinutes < openMin
        ? 'Fuera de Horario Sabatino. Abre hoy a las 7:00 AM.'
        : 'Cierre de Turno Sabatino (5:00 PM). El sistema entrará en reposo dominical.',
      nextEvent: isOpen ? 'Cierre Sabatino 5:00 PM' : currentTotalMinutes < openMin ? 'Apertura 7:00 AM' : 'Apertura Lunes 7:00 AM',
    };
  }

  // Monday to Friday (1 to 5): 7:00 AM to 6:00 PM (18:00 = 1080 mins)
  const openMin = 7 * 60; // 420
  const closeMin = 18 * 60; // 1080
  const isOpen = currentTotalMinutes >= openMin && currentTotalMinutes < closeMin;

  return {
    isOpen,
    isSunday: false,
    dayName,
    currentTimeString,
    openingTime: '07:00 AM',
    closingTime: '06:00 PM',
    message: isOpen
      ? 'Sistema Operativo en Línea (L-V 7:00 AM - 6:00 PM).'
      : currentTotalMinutes < openMin
      ? 'Fuera de Horario. Apertura de turno hoy a las 7:00 AM.'
      : 'Cierre de Turno Regular (6:00 PM). Modo guardia activo.',
    nextEvent: isOpen ? 'Cierre de Turno 6:00 PM' : 'Apertura siguiente 7:00 AM',
  };
}

// Live Real-Time Event Subscriber
export interface RealTimeCallbacks {
  onNewOrder?: (order: SpecialOrder) => void;
  onOrderUpdated?: (order: SpecialOrder) => void;
  onOrdersUpdated?: (orders: SpecialOrder[]) => void;
  onContainersUpdated?: (containers: ShippingContainer[]) => void;
  onCatalogUpdated?: (catalog: MasterCatalogPart[]) => void;
  onModelsUpdated?: (models: ChanganVehicleModel[]) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function subscribeToRealTime(callbacks: RealTimeCallbacks) {
  let eventSource: EventSource | null = null;
  let pollInterval: any = null;
  let isConnected = false;

  function connectSSE() {
    try {
      if (typeof window === 'undefined' || !('EventSource' in window)) {
        startPollingFallback();
        return;
      }

      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('connected', () => {
        isConnected = true;
        callbacks.onConnectionChange(true);
      });

      eventSource.addEventListener('new_order', (e) => {
        try {
          const order: SpecialOrder = JSON.parse(e.data);
          callbacks.onNewOrder(order);
        } catch (err) {
          console.error('SSE parse error on new_order:', err);
        }
      });

      eventSource.addEventListener('order_updated', (e) => {
        try {
          const order: SpecialOrder = JSON.parse(e.data);
          callbacks.onOrderUpdated(order);
        } catch (err) {
          console.error('SSE parse error on order_updated:', err);
        }
      });

      eventSource.addEventListener('orders_updated', (e) => {
        try {
          const orders: SpecialOrder[] = JSON.parse(e.data);
          callbacks.onOrdersUpdated(orders);
        } catch (err) {
          console.error('SSE parse error on orders_updated:', err);
        }
      });

      eventSource.addEventListener('containers_updated', (e) => {
        try {
          const containers: ShippingContainer[] = JSON.parse(e.data);
          callbacks.onContainersUpdated(containers);
        } catch (err) {
          console.error('SSE parse error on containers_updated:', err);
        }
      });

      eventSource.addEventListener('catalog_updated', (e) => {
        try {
          const catalog: MasterCatalogPart[] = JSON.parse(e.data);
          if (callbacks.onCatalogUpdated) {
            callbacks.onCatalogUpdated(catalog);
          }
        } catch (err) {
          console.error('SSE parse error on catalog_updated:', err);
        }
      });

      eventSource.addEventListener('models_updated', (e) => {
        try {
          const models: ChanganVehicleModel[] = JSON.parse(e.data);
          if (callbacks.onModelsUpdated) {
            callbacks.onModelsUpdated(models);
          }
        } catch (err) {
          console.error('SSE parse error on models_updated:', err);
        }
      });

      eventSource.onopen = () => {
        isConnected = true;
        callbacks.onConnectionChange(true);
      };

      eventSource.onerror = () => {
        isConnected = false;
        callbacks.onConnectionChange(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Retry in 3 seconds
        setTimeout(connectSSE, 3000);
      };
    } catch {
      startPollingFallback();
    }
  }

  // Backup polling to guarantee zero missed events
  function startPollingFallback() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const orders: SpecialOrder[] = await res.json();
          callbacks.onOrdersUpdated(orders);
          callbacks.onConnectionChange(true);
        }
      } catch {
        callbacks.onConnectionChange(false);
      }
    }, 2500);
  }

  connectSSE();
  startPollingFallback();

  return () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}
