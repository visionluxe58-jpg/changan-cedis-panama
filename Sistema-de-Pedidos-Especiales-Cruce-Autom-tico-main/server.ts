import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_CATALOG, INITIAL_CONTAINERS, INITIAL_MODELS, INITIAL_ORDERS } from './src/data/mockData.js';
import { ChanganVehicleModel, MasterCatalogPart, ShippingContainer, SpecialOrder } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Ensure data directory and backup directory exist
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

[DATA_DIR, BACKUPS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ORDERS_FILE = path.join(DATA_DIR, 'orders_db.json');
const CONTAINERS_FILE = path.join(DATA_DIR, 'containers_db.json');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog_db.json');
const MODELS_FILE = path.join(DATA_DIR, 'models_db.json');
const METADATA_FILE = path.join(DATA_DIR, 'persistence_meta.json');

// In-Memory state synced to disk
let memoryOrders: SpecialOrder[] = [];
let memoryContainers: ShippingContainer[] = [];
let memoryCatalog: MasterCatalogPart[] = [];
let memoryModels: ChanganVehicleModel[] = [];

// Helper to write timestamped rotating backup snapshots
function writeRotatingSnapshot(prefix: string, data: any) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFile = path.join(BACKUPS_DIR, `${prefix}_snapshot_${timestamp}.json`);
    const latestFile = path.join(BACKUPS_DIR, `${prefix}_latest.json`);

    fs.writeFileSync(snapshotFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.writeFileSync(latestFile, JSON.stringify(data, null, 2), 'utf-8');

    // Keep maximum 20 latest snapshots per prefix
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith(`${prefix}_snapshot_`) && f.endsWith('.json'))
      .sort();

    if (files.length > 20) {
      const toDelete = files.slice(0, files.length - 20);
      toDelete.forEach((f) => {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, f));
        } catch {}
      });
    }
  } catch (err) {
    console.error(`[BACKUP] Error writing snapshot for ${prefix}:`, err);
  }
}

// Initialize DB from disk with Anti-Data-Loss Safety Lock
function initDatabase() {
  console.log('[DATABASE] Initializing persistent storage...');

  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryOrders = parsed;
        console.log(`[DATABASE] Loaded ${memoryOrders.length} orders from persistent disk storage.`);
      } else {
        // Self-healing: if empty, restore from backup or initial operational set
        const latestBackup = path.join(BACKUPS_DIR, 'orders_latest.json');
        if (fs.existsSync(latestBackup)) {
          try {
            const bRaw = fs.readFileSync(latestBackup, 'utf-8');
            const bParsed = JSON.parse(bRaw);
            if (Array.isArray(bParsed) && bParsed.length > 0) {
              memoryOrders = bParsed;
            } else {
              memoryOrders = [...INITIAL_ORDERS];
            }
          } catch {
            memoryOrders = [...INITIAL_ORDERS];
          }
        } else {
          memoryOrders = [...INITIAL_ORDERS];
        }
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2));
        console.log(`[DATABASE] Self-healed orders storage with ${memoryOrders.length} records.`);
      }
    } else {
      // Check if a backup snapshot exists before defaulting
      const latestBackup = path.join(BACKUPS_DIR, 'orders_latest.json');
      if (fs.existsSync(latestBackup)) {
        const raw = fs.readFileSync(latestBackup, 'utf-8');
        memoryOrders = JSON.parse(raw);
        console.log(`[DATABASE] Restored ${memoryOrders.length} orders from backup snapshot.`);
      } else {
        memoryOrders = [...INITIAL_ORDERS];
      }
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2));
    }
  } catch (err) {
    console.error('Error initializing orders db:', err);
    memoryOrders = [...INITIAL_ORDERS];
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2));
  }

  try {
    if (fs.existsSync(CONTAINERS_FILE)) {
      const raw = fs.readFileSync(CONTAINERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryContainers = parsed;
        console.log(`[DATABASE] Loaded ${memoryContainers.length} containers from persistent disk storage.`);
      } else {
        const latestBackup = path.join(BACKUPS_DIR, 'containers_latest.json');
        if (fs.existsSync(latestBackup)) {
          try {
            const bRaw = fs.readFileSync(latestBackup, 'utf-8');
            const bParsed = JSON.parse(bRaw);
            if (Array.isArray(bParsed) && bParsed.length > 0) {
              memoryContainers = bParsed;
            } else {
              memoryContainers = [...INITIAL_CONTAINERS];
            }
          } catch {
            memoryContainers = [...INITIAL_CONTAINERS];
          }
        } else {
          memoryContainers = [...INITIAL_CONTAINERS];
        }
        fs.writeFileSync(CONTAINERS_FILE, JSON.stringify(memoryContainers, null, 2));
      }
    } else {
      const latestBackup = path.join(BACKUPS_DIR, 'containers_latest.json');
      if (fs.existsSync(latestBackup)) {
        const raw = fs.readFileSync(latestBackup, 'utf-8');
        memoryContainers = JSON.parse(raw);
        console.log(`[DATABASE] Restored ${memoryContainers.length} containers from backup snapshot.`);
      } else {
        memoryContainers = [...INITIAL_CONTAINERS];
      }
      fs.writeFileSync(CONTAINERS_FILE, JSON.stringify(memoryContainers, null, 2));
    }
  } catch (err) {
    console.error('Error initializing containers db:', err);
    memoryContainers = [...INITIAL_CONTAINERS];
    fs.writeFileSync(CONTAINERS_FILE, JSON.stringify(memoryContainers, null, 2));
  }

  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      memoryCatalog = JSON.parse(raw);
    } else {
      memoryCatalog = [...INITIAL_CATALOG];
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(memoryCatalog, null, 2));
    }
  } catch (err) {
    console.error('Error initializing catalog db:', err);
    memoryCatalog = [...INITIAL_CATALOG];
  }

  try {
    if (fs.existsSync(MODELS_FILE)) {
      const raw = fs.readFileSync(MODELS_FILE, 'utf-8');
      memoryModels = JSON.parse(raw);
    } else {
      memoryModels = [...INITIAL_MODELS];
      fs.writeFileSync(MODELS_FILE, JSON.stringify(memoryModels, null, 2));
    }
  } catch (err) {
    console.error('Error initializing models db:', err);
    memoryModels = [...INITIAL_MODELS];
  }

  // Update persistence metadata
  try {
    fs.writeFileSync(
      METADATA_FILE,
      JSON.stringify(
        {
          lastBoot: new Date().toISOString(),
          ordersCount: memoryOrders.length,
          containersCount: memoryContainers.length,
          catalogCount: memoryCatalog.length,
          status: 'SECURED_PERSISTENCE_ACTIVE',
        },
        null,
        2
      )
    );
  } catch {}
}

initDatabase();

function persistOrders() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(memoryOrders, null, 2));
    writeRotatingSnapshot('orders', memoryOrders);
  } catch (err) {
    console.error('Failed to write orders file:', err);
  }
}

function persistContainers() {
  try {
    fs.writeFileSync(CONTAINERS_FILE, JSON.stringify(memoryContainers, null, 2));
    writeRotatingSnapshot('containers', memoryContainers);
  } catch (err) {
    console.error('Failed to write containers file:', err);
  }
}

function persistCatalog() {
  try {
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(memoryCatalog, null, 2));
    writeRotatingSnapshot('catalog', memoryCatalog);
  } catch (err) {
    console.error('Failed to write catalog file:', err);
  }
}

function persistModels() {
  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(memoryModels, null, 2));
    writeRotatingSnapshot('models', memoryModels);
  } catch (err) {
    console.error('Failed to write models file:', err);
  }
}

// Consolidated database backup function
function createConsolidatedServerBackup() {
  return {
    version: '2.5.0',
    appName: 'CEDIS Changan Auto Panamá - Central Hub',
    exportedAt: new Date().toISOString(),
    totalOrders: memoryOrders.length,
    totalContainers: memoryContainers.length,
    totalCatalogParts: memoryCatalog.length,
    totalModels: memoryModels.length,
    orders: memoryOrders,
    containers: memoryContainers,
    catalog: memoryCatalog,
    models: memoryModels,
    integrityCheck: {
      ordersHash: `ORD-${memoryOrders.length}`,
      containersHash: `CONT-${memoryContainers.length}`,
      systemStatus: 'PERSISTED_REAL_DATA',
    },
  };
}

// Automatic periodic consolidation backup (runs every 5 minutes)
setInterval(() => {
  try {
    const fullBackup = createConsolidatedServerBackup();
    const dateStr = new Date().toISOString().split('T')[0];
    const fullBackupFile = path.join(BACKUPS_DIR, `full_cedis_changan_backup_${dateStr}.json`);
    fs.writeFileSync(fullBackupFile, JSON.stringify(fullBackup, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AUTO-BACKUP] Periodic backup failed:', err);
  }
}, 5 * 60 * 1000);

// Active SSE client connections for instant Real-Time Push
interface SSEClient {
  id: string;
  res: express.Response;
}

let sseClients: SSEClient[] = [];

function broadcastSSE(eventType: string, payload: any) {
  const data = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(data);
    } catch (e) {
      // client dropped
    }
  });
}

// Keep SSE connections alive with periodic comments
setInterval(() => {
  sseClients.forEach((client) => {
    try {
      client.res.write(': keepalive\n\n');
    } catch {
      // client dropped
    }
  });
}, 15000);

// ================= API ROUTES =================

// Health check and real-time statistics
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'CEDIS Changan Logistics Online',
    ordersCount: memoryOrders.length,
    containersCount: memoryContainers.length,
    catalogCount: memoryCatalog.length,
    modelsCount: memoryModels.length,
    activeSseClients: sseClients.length,
    timestamp: new Date().toISOString(),
  });
});

// ================= ADMIN PIN VERIFICATION =================
// El/los PIN(es) válidos viven SOLO aquí, en el servidor, leídos de una
// variable de entorno (ADMIN_PINS, separados por coma). Antes estaban escritos
// directamente en el código del cliente (visibles para cualquiera en el
// navegador). Configura ADMIN_PINS en tu panel de Vercel > Settings >
// Environment Variables. Si no se configura, usa 'CHANGAN2026' como
// respaldo — se recomienda cambiarlo en producción.
const ADMIN_PINS = (process.env.ADMIN_PINS || 'CHANGAN2026')
  .split(',')
  .map((p) => p.trim().toUpperCase())
  .filter(Boolean);

// Límite simple de intentos por IP para dificultar fuerza bruta
const pinAttempts = new Map<string, { count: number; firstAttempt: number }>();
const PIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const PIN_ATTEMPT_MAX = 8;

app.post('/api/admin/verify-pin', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const attempt = pinAttempts.get(ip) || { count: 0, firstAttempt: now };
  if (now - attempt.firstAttempt > PIN_ATTEMPT_WINDOW_MS) {
    attempt.count = 0;
    attempt.firstAttempt = now;
  }

  if (attempt.count >= PIN_ATTEMPT_MAX) {
    return res.status(429).json({
      success: false,
      message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.',
    });
  }

  const submittedPin = typeof req.body?.pin === 'string' ? req.body.pin.trim().toUpperCase() : '';
  const isValid = submittedPin.length > 0 && ADMIN_PINS.includes(submittedPin);

  attempt.count += 1;
  pinAttempts.set(ip, attempt);
  if (isValid) pinAttempts.delete(ip);

  return res.json({ success: isValid });
});

// Server-Sent Events stream for instant real-time notifications
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newClient: SSEClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial welcome & full current orders state
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, ordersCount: memoryOrders.length })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// ================= BACKUP & DATA PROTECTION ENDPOINTS =================

// Export complete server backup as JSON
app.get('/api/backup/export', (req, res) => {
  const backup = createConsolidatedServerBackup();
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `RESPALDO_CEDIS_CHANGAN_SERVIDOR_${dateStr}_${timeStr}.json`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(backup, null, 2));
});

// Restore backup safely to server
app.post('/api/backup/restore', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Payload de respaldo inválido' });
  }

  try {
    if (Array.isArray(incoming.orders)) {
      memoryOrders = incoming.orders;
      persistOrders();
    }
    if (Array.isArray(incoming.containers)) {
      memoryContainers = incoming.containers;
      persistContainers();
    }
    if (Array.isArray(incoming.catalog)) {
      memoryCatalog = incoming.catalog;
      persistCatalog();
    }
    if (Array.isArray(incoming.models)) {
      memoryModels = incoming.models;
      persistModels();
    }

    broadcastSSE('orders_updated', memoryOrders);
    broadcastSSE('containers_updated', memoryContainers);
    broadcastSSE('catalog_updated', memoryCatalog);
    broadcastSSE('models_updated', memoryModels);

    console.log(`[RESTORE] Successfully restored database: ${memoryOrders.length} orders, ${memoryContainers.length} containers.`);
    res.json({
      success: true,
      message: 'Base de datos restaurada y asegurada con éxito',
      ordersCount: memoryOrders.length,
      containersCount: memoryContainers.length,
      catalogCount: memoryCatalog.length,
    });
  } catch (err: any) {
    console.error('[RESTORE ERROR]:', err);
    res.status(500).json({ error: `Error al restaurar respaldo: ${err.message}` });
  }
});

// List server automated snapshots
app.get('/api/backup/list', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR).map((name) => {
      const filePath = path.join(BACKUPS_DIR, name);
      const stat = fs.statSync(filePath);
      return {
        name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    });
    res.json({ backups: files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Hard purge of demo data - leaves completely clean slate for REAL data entry
app.post('/api/production/purge-demo', (req, res) => {
  try {
    memoryOrders = [];
    memoryContainers = [];
    persistOrders();
    persistContainers();

    broadcastSSE('orders_updated', memoryOrders);
    broadcastSSE('containers_updated', memoryContainers);

    console.log('[PRODUCTION PURGE] Database wiped clean of demo records. Ready for real production data.');
    res.json({
      success: true,
      message: 'Sistema listo para producción. Se han purgado los registros de prueba y la persistencia está blindada.',
      ordersCount: 0,
      containersCount: 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all orders
app.get('/api/orders', (req, res) => {
  res.json(memoryOrders);
});

// POST bulk orders (from Excel import) - broadcasts a single orders_updated event
app.post('/api/orders/bulk', (req, res) => {
  const incoming = req.body;
  if (!incoming || !Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Array of orders expected' });
  }

  incoming.forEach((item: SpecialOrder) => {
    const idx = memoryOrders.findIndex((o) => o.id === item.id || o.orderNumber === item.orderNumber);
    if (idx >= 0) {
      memoryOrders[idx] = item;
    } else {
      memoryOrders.unshift(item);
    }
  });

  persistOrders();
  broadcastSSE('orders_updated', memoryOrders);
  console.log(`[BULK IMPORT] Successfully imported ${incoming.length} orders. Total orders in system: ${memoryOrders.length}`);
  res.json({ success: true, count: incoming.length, total: memoryOrders.length });
});

// POST new single order (e.g. from Branch Portal)
app.post('/api/orders', (req, res) => {
  const incoming = req.body;
  if (!incoming) {
    return res.status(400).json({ error: 'No data provided' });
  }

  if (Array.isArray(incoming)) {
    incoming.forEach((item) => {
      const idx = memoryOrders.findIndex((o) => o.id === item.id || o.orderNumber === item.orderNumber);
      if (idx >= 0) {
        memoryOrders[idx] = item;
      } else {
        memoryOrders.unshift(item);
      }
    });
    persistOrders();
    broadcastSSE('orders_updated', memoryOrders);
    return res.json({ success: true, count: memoryOrders.length });
  }

  const newOrder: SpecialOrder = incoming;
  const existingIdx = memoryOrders.findIndex(
    (o) => o.id === newOrder.id || o.orderNumber === newOrder.orderNumber
  );

  if (existingIdx >= 0) {
    memoryOrders[existingIdx] = newOrder;
  } else {
    memoryOrders.unshift(newOrder);
  }

  persistOrders();

  // Broadcast single new_order event (received by Admin CEDIS dashboard)
  broadcastSSE('new_order', newOrder);
  broadcastSSE('orders_updated', memoryOrders);

  console.log(`[REAL-TIME] New Order Created by Branch: ${newOrder.orderNumber} from ${newOrder.branch} (${newOrder.clientName})`);

  res.status(201).json({ success: true, order: newOrder, total: memoryOrders.length });
});

// PUT / PATCH update existing order
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const updated: SpecialOrder = req.body;

  const idx = memoryOrders.findIndex((o) => o.id === id || o.orderNumber === id);
  if (idx >= 0) {
    memoryOrders[idx] = { ...memoryOrders[idx], ...updated };
    persistOrders();
    broadcastSSE('order_updated', memoryOrders[idx]);
    broadcastSSE('orders_updated', memoryOrders);
    return res.json({ success: true, order: memoryOrders[idx] });
  }

  // If not found, add it
  memoryOrders.unshift(updated);
  persistOrders();
  broadcastSSE('new_order', updated);
  broadcastSSE('orders_updated', memoryOrders);
  res.json({ success: true, order: updated });
});

// DELETE order
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  memoryOrders = memoryOrders.filter((o) => o.id !== id && o.orderNumber !== id);
  persistOrders();
  broadcastSSE('orders_updated', memoryOrders);
  res.json({ success: true, remaining: memoryOrders.length });
});

// GET Containers
app.get('/api/containers', (req, res) => {
  res.json(memoryContainers);
});

// POST Containers
app.post('/api/containers', (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    memoryContainers = incoming;
  } else if (incoming) {
    const idx = memoryContainers.findIndex((c) => c.id === incoming.id || c.containerNumber === incoming.containerNumber);
    if (idx >= 0) {
      memoryContainers[idx] = incoming;
    } else {
      memoryContainers.unshift(incoming);
    }
  }
  persistContainers();
  broadcastSSE('containers_updated', memoryContainers);
  res.json({ success: true, containers: memoryContainers });
});

// PUT Container
app.put('/api/containers/:id', (req, res) => {
  const { id } = req.params;
  const updated: ShippingContainer = req.body;
  const idx = memoryContainers.findIndex((c) => c.id === id || c.containerNumber === id);
  if (idx >= 0) {
    memoryContainers[idx] = { ...memoryContainers[idx], ...updated };
  } else {
    memoryContainers.unshift(updated);
  }
  persistContainers();
  broadcastSSE('containers_updated', memoryContainers);
  res.json({ success: true, container: updated });
});

// DELETE Container
app.delete('/api/containers/:id', (req, res) => {
  const { id } = req.params;
  memoryContainers = memoryContainers.filter((c) => c.id !== id && c.containerNumber !== id);
  persistContainers();
  broadcastSSE('containers_updated', memoryContainers);
  res.json({ success: true, remaining: memoryContainers.length });
});

// GET Catalog
app.get('/api/catalog', (req, res) => {
  res.json(memoryCatalog);
});

// POST / PUT Catalog
app.post('/api/catalog', (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    memoryCatalog = incoming;
  } else if (incoming) {
    const idx = memoryCatalog.findIndex((c) => c.id === incoming.id || c.code === incoming.code);
    if (idx >= 0) {
      memoryCatalog[idx] = incoming;
    } else {
      memoryCatalog.unshift(incoming);
    }
  }
  persistCatalog();
  broadcastSSE('catalog_updated', memoryCatalog);
  res.json({ success: true, catalog: memoryCatalog });
});

// DELETE Catalog item
app.delete('/api/catalog/:id', (req, res) => {
  const { id } = req.params;
  memoryCatalog = memoryCatalog.filter((c) => c.id !== id && c.code !== id);
  persistCatalog();
  broadcastSSE('catalog_updated', memoryCatalog);
  res.json({ success: true, remaining: memoryCatalog.length });
});

// ================= MODELS DATABASE ROUTES =================
// GET Models
app.get('/api/models', (req, res) => {
  res.json(memoryModels);
});

// POST / PUT Models
app.post('/api/models', (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    memoryModels = incoming;
  } else if (incoming) {
    const idx = memoryModels.findIndex((m) => m.id === incoming.id || m.name.toLowerCase() === incoming.name?.toLowerCase());
    if (idx >= 0) {
      memoryModels[idx] = incoming;
    } else {
      memoryModels.push(incoming);
    }
  }
  persistModels();
  broadcastSSE('models_updated', memoryModels);
  res.json({ success: true, models: memoryModels });
});

// PUT single Model
app.put('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const updated: ChanganVehicleModel = req.body;
  const idx = memoryModels.findIndex((m) => m.id === id);
  if (idx >= 0) {
    memoryModels[idx] = { ...memoryModels[idx], ...updated };
  } else {
    memoryModels.push(updated);
  }
  persistModels();
  broadcastSSE('models_updated', memoryModels);
  res.json({ success: true, model: updated });
});

// DELETE Model
app.delete('/api/models/:id', (req, res) => {
  const { id } = req.params;
  memoryModels = memoryModels.filter((m) => m.id !== id && m.name !== id);
  persistModels();
  broadcastSSE('models_updated', memoryModels);
  res.json({ success: true, remaining: memoryModels.length });
});

// PURGE ALL DATA (Wipe test data and start 100% clean)
app.post('/api/purge-all', (req, res) => {
  const { preserveCatalog = true, preserveModels = true } = req.body || {};
  memoryOrders = [];
  memoryContainers = [];
  if (!preserveCatalog) {
    memoryCatalog = [];
  }
  if (!preserveModels) {
    memoryModels = [];
  }
  persistOrders();
  persistContainers();
  if (!preserveCatalog) persistCatalog();
  if (!preserveModels) persistModels();

  broadcastSSE('orders_updated', memoryOrders);
  broadcastSSE('containers_updated', memoryContainers);
  if (!preserveCatalog) broadcastSSE('catalog_updated', memoryCatalog);
  if (!preserveModels) broadcastSSE('models_updated', memoryModels);

  console.log('[SYSTEM PURGE] All orders and containers have been completely purged for real-data entry.');
  res.json({
    success: true,
    message: 'Base de datos purgada con éxito. Sistema listo para datos reales.',
    ordersCount: memoryOrders.length,
    containersCount: memoryContainers.length,
    catalogCount: memoryCatalog.length,
    modelsCount: memoryModels.length,
  });
});

// CLIENT BOOTSTRAP SYNC (Ensures user-created data in browser isn't lost if server container restarted)
app.post('/api/sync-bootstrap', (req, res) => {
  const { orders, containers, catalog, models } = req.body || {};
  let updatedOrders = false;
  let updatedContainers = false;
  let updatedCatalog = false;
  let updatedModels = false;

  if (Array.isArray(orders) && orders.length > 0) {
    const orderMap = new Map<string, SpecialOrder>();
    memoryOrders.forEach((o) => {
      const key = o.id || o.orderNumber;
      if (key) orderMap.set(key, o);
    });
    orders.forEach((o: SpecialOrder) => {
      const key = o.id || o.orderNumber;
      if (key) {
        const existing = orderMap.get(key);
        if (existing) {
          orderMap.set(key, { ...existing, ...o });
        } else {
          orderMap.set(key, o);
        }
      }
    });
    memoryOrders = Array.from(orderMap.values());
    persistOrders();
    updatedOrders = true;
  }

  if (Array.isArray(containers) && containers.length > 0) {
    const containerMap = new Map<string, ShippingContainer>();
    memoryContainers.forEach((c) => {
      const key = c.id || c.containerNumber;
      if (key) containerMap.set(key, c);
    });
    containers.forEach((c: ShippingContainer) => {
      const key = c.id || c.containerNumber;
      if (key) {
        const existing = containerMap.get(key);
        if (existing) {
          containerMap.set(key, { ...existing, ...c });
        } else {
          containerMap.set(key, c);
        }
      }
    });
    memoryContainers = Array.from(containerMap.values());
    persistContainers();
    updatedContainers = true;
  }

  if (Array.isArray(catalog) && catalog.length > 0) {
    const catalogMap = new Map<string, MasterCatalogPart>();
    memoryCatalog.forEach((p) => {
      const key = p.id || p.code;
      if (key) catalogMap.set(key, p);
    });
    catalog.forEach((p: MasterCatalogPart) => {
      const key = p.id || p.code;
      if (key) {
        const existing = catalogMap.get(key);
        if (existing) {
          catalogMap.set(key, { ...existing, ...p });
        } else {
          catalogMap.set(key, p);
        }
      }
    });
    memoryCatalog = Array.from(catalogMap.values());
    persistCatalog();
    updatedCatalog = true;
  }

  if (Array.isArray(models) && models.length > 0) {
    const modelMap = new Map<string, ChanganVehicleModel>();
    memoryModels.forEach((m) => {
      const key = m.id || m.name.toLowerCase();
      if (key) modelMap.set(key, m);
    });
    models.forEach((m: ChanganVehicleModel) => {
      const key = m.id || m.name.toLowerCase();
      if (key) {
        const existing = modelMap.get(key);
        if (existing) {
          modelMap.set(key, { ...existing, ...m });
        } else {
          modelMap.set(key, m);
        }
      }
    });
    memoryModels = Array.from(modelMap.values());
    persistModels();
    updatedModels = true;
  }

  if (updatedOrders) broadcastSSE('orders_updated', memoryOrders);
  if (updatedContainers) broadcastSSE('containers_updated', memoryContainers);
  if (updatedCatalog) broadcastSSE('catalog_updated', memoryCatalog);
  if (updatedModels) broadcastSSE('models_updated', memoryModels);

  res.json({
    success: true,
    ordersCount: memoryOrders.length,
    containersCount: memoryContainers.length,
    catalogCount: memoryCatalog.length,
    modelsCount: memoryModels.length,
  });
});

// BACKUP EXPORT ENDPOINT (Get complete state as JSON)
app.get('/api/backup/export', (req, res) => {
  const backup = {
    version: '2.5.0',
    appName: 'CEDIS Changan Auto Panamá',
    exportedAt: new Date().toISOString(),
    totalOrders: memoryOrders.length,
    totalContainers: memoryContainers.length,
    totalCatalogParts: memoryCatalog.length,
    totalModels: memoryModels.length,
    orders: memoryOrders,
    containers: memoryContainers,
    catalog: memoryCatalog,
    models: memoryModels,
  };
  res.json(backup);
});

// BACKUP RESTORE ENDPOINT (Restore from full JSON backup)
app.post('/api/backup/restore', (req, res) => {
  const { orders, containers, catalog, models } = req.body || {};
  if (!Array.isArray(orders) && !Array.isArray(containers)) {
    return res.status(400).json({ error: 'Payload de respaldo inválido. Se requieren arreglos de órdenes y/o contenedores.' });
  }

  if (Array.isArray(orders)) {
    memoryOrders = orders;
    persistOrders();
  }
  if (Array.isArray(containers)) {
    memoryContainers = containers;
    persistContainers();
  }
  if (Array.isArray(catalog) && catalog.length > 0) {
    memoryCatalog = catalog;
    persistCatalog();
  }
  if (Array.isArray(models) && models.length > 0) {
    memoryModels = models;
    persistModels();
  }

  broadcastSSE('orders_updated', memoryOrders);
  broadcastSSE('containers_updated', memoryContainers);
  broadcastSSE('catalog_updated', memoryCatalog);
  broadcastSSE('models_updated', memoryModels);

  console.log(`[BACKUP RESTORED] Restored ${memoryOrders.length} orders, ${memoryContainers.length} containers, ${memoryCatalog.length} catalog items, ${memoryModels.length} models.`);
  res.json({
    success: true,
    message: 'Respaldo restaurado exitosamente en el servidor.',
    ordersCount: memoryOrders.length,
    containersCount: memoryContainers.length,
    catalogCount: memoryCatalog.length,
    modelsCount: memoryModels.length,
  });
});

// RESTORE SAMPLE DATA (For demo or testing when needed)
app.post('/api/reset', (req, res) => {
  memoryOrders = [...INITIAL_ORDERS];
  memoryContainers = [...INITIAL_CONTAINERS];
  memoryCatalog = [...INITIAL_CATALOG];
  memoryModels = [...INITIAL_MODELS];
  persistOrders();
  persistContainers();
  persistCatalog();
  persistModels();
  broadcastSSE('orders_updated', memoryOrders);
  broadcastSSE('containers_updated', memoryContainers);
  broadcastSSE('catalog_updated', memoryCatalog);
  broadcastSSE('models_updated', memoryModels);
  res.json({ success: true, message: 'Datos de prueba restaurados correctamente.' });
});

// ================= JARVIS AI LOGISTICS COPILOT =================
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (genAiClient) return genAiClient;
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    genAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

app.post('/api/jarvis/chat', async (req, res) => {
  const { prompt, orders: clientOrders, containers: clientContainers } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt requerido' });
  }

  // If client supplied recent orders or containers, keep memory in sync
  if (Array.isArray(clientOrders) && clientOrders.length > 0) {
    memoryOrders = clientOrders;
  }
  if (Array.isArray(clientContainers) && clientContainers.length > 0) {
    memoryContainers = clientContainers;
  }

  // Calculate live database context for JARVIS
  const totalOrders = memoryOrders.length;
  const statusCounts = {
    cedisListo: memoryOrders.filter((o) => o.overallStatus === 'EN BODEGA CEDIS').length,
    parcial: memoryOrders.filter((o) => o.overallStatus === 'PARCIAL').length,
    pendiente: memoryOrders.filter((o) => o.overallStatus === 'PENDIENTE' || o.overallStatus === 'EN TRÁNSITO').length,
    despachado: memoryOrders.filter((o) => o.overallStatus === 'DESPACHADO' || o.overallStatus === 'RECIBIDO EN SUCURSAL').length,
  };

  const totalContainers = memoryContainers.length;
  const pendingContainers = memoryContainers.filter((c) => c.arrivalStatus === 'En Tránsito' || c.arrivalStatus === 'En Puerto / Aduana');
  const receivedContainers = memoryContainers.filter((c) => c.arrivalStatus === 'Recibido en CEDIS');

  let totalItemsRequested = 0;
  let totalItemsAssigned = 0;
  let totalItemsDispatched = 0;
  const missingPartsMap: Record<string, { code: string; desc: string; needed: number; orders: string[] }> = {};
  const branchStats: Record<string, { totalOrders: number; pending: number; ready: number }> = {};

  // Build complete flat lists for deep part querying
  const allOrderItemsList: Array<{
    orderNumber: string;
    branch: string;
    clientName: string;
    model: string;
    vin: string;
    plate: string;
    code: string;
    description: string;
    quantityRequested: number;
    quantityAssigned: number;
    overallStatus: string;
    isBilled: boolean;
  }> = [];

  memoryOrders.forEach((o) => {
    if (!branchStats[o.branch]) {
      branchStats[o.branch] = { totalOrders: 0, pending: 0, ready: 0 };
    }
    branchStats[o.branch].totalOrders += 1;
    if (o.overallStatus === 'PENDIENTE' || o.overallStatus === 'PARCIAL') branchStats[o.branch].pending += 1;
    if (o.overallStatus === 'EN BODEGA CEDIS') branchStats[o.branch].ready += 1;

    o.items.forEach((it) => {
      totalItemsRequested += it.quantityRequested;
      totalItemsAssigned += it.quantityAssigned;
      totalItemsDispatched += it.quantityDispatched || 0;

      allOrderItemsList.push({
        orderNumber: o.orderNumber,
        branch: o.branch,
        clientName: o.clientName,
        model: o.changanModel || 'Changan',
        vin: o.vin || 'S/V',
        plate: o.plate,
        code: it.code,
        description: it.description,
        quantityRequested: it.quantityRequested,
        quantityAssigned: it.quantityAssigned,
        overallStatus: o.overallStatus,
        isBilled: o.isBilled,
      });

      const diff = it.quantityRequested - it.quantityAssigned;
      if (diff > 0 && o.overallStatus !== 'DESPACHADO' && o.overallStatus !== 'RECIBIDO EN SUCURSAL') {
        if (!missingPartsMap[it.code]) {
          missingPartsMap[it.code] = { code: it.code, desc: it.description, needed: 0, orders: [] };
        }
        missingPartsMap[it.code].needed += diff;
        if (!missingPartsMap[it.code].orders.includes(o.orderNumber)) {
          missingPartsMap[it.code].orders.push(o.orderNumber);
        }
      }
    });
  });

  // Flat list of all container items
  const allContainerItemsList: Array<{
    containerNumber: string;
    supplier: string;
    type: string;
    arrivalStatus: string;
    eta: string;
    poNumber: string;
    code: string;
    description: string;
    quantity: number;
    warehouseLocation: string;
  }> = [];

  memoryContainers.forEach((c) => {
    c.items.forEach((it) => {
      allContainerItemsList.push({
        containerNumber: c.containerNumber,
        supplier: c.supplier,
        type: c.type,
        arrivalStatus: c.arrivalStatus,
        eta: c.estimatedArrivalDate,
        poNumber: c.poNumber,
        code: it.code,
        description: it.description,
        quantity: it.totalQuantity,
        warehouseLocation: it.warehouseLocation || 'CEDIS-GRAL',
      });
    });
  });

  const topMissingParts = Object.values(missingPartsMap).slice(0, 20);
  const fillRate = totalItemsRequested > 0 ? ((totalItemsAssigned / totalItemsRequested) * 100).toFixed(1) : '100.0';

  const readyToDispatch = memoryOrders.filter((o) => o.overallStatus === 'EN BODEGA CEDIS');
  const unbilledReady = readyToDispatch.filter((o) => !o.isBilled);

  const contextData = {
    metrics: {
      totalOrders,
      statusCounts,
      totalContainers,
      pendingContainers: pendingContainers.map((c) => ({ num: c.containerNumber, type: c.type, eta: c.estimatedArrivalDate, supplier: c.supplier })),
      receivedContainersCount: receivedContainers.length,
      fillRatePercent: fillRate,
      totalItemsRequested,
      totalItemsAssigned,
      totalItemsDispatched,
      branchStats,
      readyToDispatchCount: readyToDispatch.length,
      unbilledReadyCount: unbilledReady.length,
    },
    allContainersManifests: memoryContainers.map((c) => ({
      num: c.containerNumber,
      supplier: c.supplier,
      type: c.type,
      status: c.arrivalStatus,
      eta: c.estimatedArrivalDate,
      totalUnits: c.totalUnits,
      skus: c.items.map((i) => ({ code: i.code, desc: i.description, qty: i.totalQuantity, rack: i.warehouseLocation })),
    })),
    allOrdersList: memoryOrders.map((o) => ({
      orderNumber: o.orderNumber,
      branch: o.branch,
      clientName: o.clientName,
      model: o.changanModel || 'Changan',
      vin: o.vin || 'S/V',
      plate: o.plate,
      status: o.overallStatus,
      isBilled: o.isBilled,
      items: o.items.map((i) => ({ code: i.code, desc: i.description, req: i.quantityRequested, asg: i.quantityAssigned })),
    })),
    topMissingParts,
  };

  const ai = getGeminiClient();

  if (ai) {
    try {
      const systemInstruction = `Eres JARVIS CEDIS Logistics AI, el asistente táctico y cerebro operativo del Centro de Distribución Changan Auto Panamá (CEDIS).
Tu especialidad es la logística automotriz, rastreo de repuestos, manifiestos de contenedores y satisfacción de órdenes de sucursales.

REGLAS DE RESPUESTA CRÍTICAS:
1. CONSULTAS DE REPUESTOS / PART CODES:
   Si el usuario pregunta si un repuesto fue solicitado, o si viene en algún contenedor (ej: "¿el repuesto S111F260204 fue pedido?", "¿dónde viene el alternador?", "¿tenemos amortiguadores?"):
   - Escanea minuciosamente tanto la lista de 'allOrdersList' como 'allContainersManifests'.
   - Estructura tu respuesta en 3 bloques claros:
     a) 📋 **¿Fue Solicitado por alguna Sucursal?**: Si SÍ, indica Orden N°, Sucursal, Cliente, Modelo de Auto / VIN, Cantidad Pedida vs Asignada y Estado. Si NO, indica textualmente: "❌ No ha sido solicitado por ninguna sucursal actualmente."
     b) 🚢 **¿Viene o está en Contenedores?**: Si SÍ, indica N° de Contenedor, Tipo (Marítimo/Aéreo), Proveedor, Fecha ETA / Llegada, Cantidad y Ubicación en Bodega (Rack). Si NO, indica textualmente: "❌ NO figura en la base de datos de ningún contenedor (ni en tránsito, ni en puerto/aduana, ni recibido en CEDIS, ni históricos)."
     c) 💡 **Dictamen Logístico / Recomendación**: Indica si se puede despachar, si hay que esperar el arribo del contenedor, o si se debe generar una Orden de Compra urgente a fábrica.
2. CONSULTAS GENERALES O REPORTES:
   - Responde con métricas exactas (Fill Rate, órdenes listas, alertas de facturación, desglose por sucursales de Calle 50, Costa Verde, Chiriquí, Tumba Muerto, Villa Lucre, Santa María).
3. Mantén un tono sumamente ejecutivo, seguro, profesional y con formato Markdown nítido (listas con viñetas, números en negrita).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Consulta del usuario: "${prompt}"\n\nBase de Datos en Tiempo Real CEDIS:\n${JSON.stringify(contextData, null, 2)}`,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      return res.json({
        success: true,
        answer: response.text || 'Sin respuesta del modelo.',
        contextSummary: {
          totalOrders,
          fillRate: `${fillRate}%`,
          readyToDispatch: readyToDispatch.length,
        },
      });
    } catch (err: any) {
      console.error('Error calling Gemini in Jarvis endpoint:', err);
    }
  }

  // Intelligent algorithmic fallback if no Gemini key or on error
  let fallbackAnswer = `**[JARVIS CEDIS Logistics Copilot - Modo Autónomo]**\n\n`;
  const lower = prompt.toLowerCase().trim();

  // Check if query is looking for a specific part code or description
  const cleanTokens = prompt.split(/[\s,;:?¿!¡]+/).map((t) => t.trim().toUpperCase()).filter((t) => t.length >= 3);
  let matchedOrderItems: typeof allOrderItemsList = [];
  let matchedContainerItems: typeof allContainerItemsList = [];
  let searchedCodeOrName = '';

  for (const token of cleanTokens) {
    const oMatches = allOrderItemsList.filter((it) => it.code.toUpperCase().includes(token) || it.description.toUpperCase().includes(token));
    const cMatches = allContainerItemsList.filter((it) => it.code.toUpperCase().includes(token) || it.description.toUpperCase().includes(token));

    if (oMatches.length > 0 || cMatches.length > 0) {
      matchedOrderItems = oMatches;
      matchedContainerItems = cMatches;
      searchedCodeOrName = token;
      break;
    }
  }

  if (matchedOrderItems.length > 0 || matchedContainerItems.length > 0) {
    fallbackAnswer += `🔍 **Resultado de Búsqueda para:** \`${searchedCodeOrName}\`\n\n`;

    // 1. Order Status
    fallbackAnswer += `📋 **1. Estado en Solicitudes de Sucursales:**\n`;
    if (matchedOrderItems.length === 0) {
      fallbackAnswer += `• ℹ️ Este repuesto **NO ha sido solicitado** en ningún pedido activo de sucursal.\n\n`;
    } else {
      fallbackAnswer += `• Se registran **${matchedOrderItems.length} solicitudes** en pedidos especiales:\n`;
      matchedOrderItems.forEach((it) => {
        fallbackAnswer += `  - **Orden ${it.orderNumber}** (${it.branch}) | Cliente: ${it.clientName} | Auto: ${it.model} (VIN: ${it.vin})\n`;
        fallbackAnswer += `    * Cantidad: **${it.quantityRequested} pedidas** (Asignadas: ${it.quantityAssigned}) | Estado: **${it.overallStatus}**\n`;
      });
      fallbackAnswer += `\n`;
    }

    // 2. Container Status
    fallbackAnswer += `🚢 **2. Presencia en Contenedores & Manifiestos:**\n`;
    if (matchedContainerItems.length === 0) {
      fallbackAnswer += `• ❌ **NO figura en ningún contenedor** (ni en tránsito, ni en aduana, ni recibido en CEDIS, ni histórico).\n\n`;
    } else {
      fallbackAnswer += `• Encontrado en **${matchedContainerItems.length} embarques**:\n`;
      matchedContainerItems.forEach((c) => {
        fallbackAnswer += `  - **Contenedor ${c.containerNumber}** (${c.type}) | Prov: ${c.supplier}\n`;
        fallbackAnswer += `    * Estado: **${c.arrivalStatus}** (ETA: ${c.eta}) | Cantidad: **${c.quantity} unidades** | Rack: **${c.warehouseLocation}**\n`;
      });
      fallbackAnswer += `\n`;
    }

    // 3. Recommended action
    fallbackAnswer += `💡 **Dictamen Logístico:**\n`;
    if (matchedContainerItems.some((c) => c.arrivalStatus === 'Recibido en CEDIS')) {
      fallbackAnswer += `• ✅ El repuesto está disponible físicamente en bodega CEDIS listo para asignación y despacho.\n`;
    } else if (matchedContainerItems.some((c) => c.arrivalStatus === 'En Tránsito' || c.arrivalStatus === 'En Puerto / Aduana')) {
      fallbackAnswer += `• 🚢 El repuesto viene en camino en contenedor en tránsito. Proceder al cruce una vez arribe a CEDIS.\n`;
    } else {
      fallbackAnswer += `• ⚠️ Requiere emisión de Orden de Compra (PO) a fábrica Changan ya que no viene en ningún embarque activo.\n`;
    }
  } else if (lower.includes('faltante') || lower.includes('piezas') || lower.includes('repuestos') || lower.includes('stock')) {
    fallbackAnswer += `📋 **Reporte de Repuestos Críticos Pendientes de Asignación:**\n`;
    if (topMissingParts.length === 0) {
      fallbackAnswer += `✅ Excelente: Actualmente no hay repuestos pendientes de asignación en los pedidos activos.\n`;
    } else {
      fallbackAnswer += `Se registran **${topMissingParts.length} referencias** requeridas sin stock asignado:\n`;
      topMissingParts.slice(0, 5).forEach((p) => {
        fallbackAnswer += `• **${p.code}** (${p.desc}): **${p.needed} unid.** requeridas (Órdenes: ${p.orders.join(', ')})\n`;
      });
    }
  } else if (lower.includes('sucursal') || lower.includes('sucursales') || lower.includes('rendimiento')) {
    fallbackAnswer += `🏢 **Métricas de Órdenes por Sucursal:**\n`;
    Object.entries(branchStats).forEach(([br, st]) => {
      fallbackAnswer += `• **${br}**: ${st.totalOrders} órdenes totales | 🟡 ${st.pending} pendientes | 🟢 ${st.ready} listas\n`;
    });
  } else if (lower.includes('listo') || lower.includes('despacho') || lower.includes('completado')) {
    fallbackAnswer += `📦 **Órdenes Listas para Despacho:**\n`;
    fallbackAnswer += `• Hay **${readyToDispatch.length} pedidos** con el 100% de piezas asignadas en CEDIS.\n`;
    if (unbilledReady.length > 0) {
      fallbackAnswer += `⚠️ **Alerta de Cartera:** ${unbilledReady.length} órdenes listas aún no tienen facturación cancelada.\n`;
    }
  } else {
    fallbackAnswer += `📊 **Resumen Ejecutivo de Operación CEDIS:**\n`;
    fallbackAnswer += `• **Total de Pedidos Especiales:** ${totalOrders}\n`;
    fallbackAnswer += `• **Tasa de Asignación (Fill Rate):** ${fillRate}%\n`;
    fallbackAnswer += `• **Contenedores Registrados:** ${totalContainers} (${pendingContainers.length} en tránsito)\n`;
    fallbackAnswer += `• **Órdenes Listas en Bodega:** ${readyToDispatch.length}\n`;
    fallbackAnswer += `• **Piezas Faltantes Totales:** ${Object.values(missingPartsMap).reduce((acc, x) => acc + x.needed, 0)} unid.\n\n`;
    fallbackAnswer += `💡 *Puede consultarme directamente por cualquier código de repuesto (ej: "búscame el repuesto S111F260204-0100") y revisaré todos los pedidos y contenedores del sistema.*`;
  }

  return res.json({
    success: true,
    answer: fallbackAnswer,
    contextSummary: {
      totalOrders,
      fillRate: `${fillRate}%`,
      readyToDispatch: readyToDispatch.length,
    },
  });
});

// ================= VITE / FRONTEND SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CEDIS REALTIME SERVER] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

