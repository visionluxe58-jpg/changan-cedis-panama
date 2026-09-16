import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SpecialOrder, ShippingContainer, MasterCatalogPart, ChanganVehicleModel } from '../types';

export const COLLECTIONS = {
  ORDERS: 'orders',
  CONTAINERS: 'containers',
  CATALOG: 'catalog',
  MODELS: 'models',
  SETTINGS: 'settings',
};

// ----------------------------------------------------
// Realtime Listeners with onSnapshot
// ----------------------------------------------------

export function subscribeToOrdersFirestore(
  onOrdersReceived: (orders: SpecialOrder[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const ordersCol = collection(db, COLLECTIONS.ORDERS);
    return onSnapshot(
      ordersCol,
      (snapshot) => {
        const orders: SpecialOrder[] = [];
        snapshot.forEach((docSnap) => {
          orders.push(docSnap.data() as SpecialOrder);
        });
        // Sort newest first by createdAt or orderNumber
        orders.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return (b.orderNumber || '').localeCompare(a.orderNumber || '');
        });
        onOrdersReceived(orders);
      },
      (error) => {
        console.error('[FIRESTORE] Error listening to orders:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('[FIRESTORE] Failed to subscribe to orders:', err);
    return () => {};
  }
}

export function subscribeToContainersFirestore(
  onContainersReceived: (containers: ShippingContainer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const containersCol = collection(db, COLLECTIONS.CONTAINERS);
    return onSnapshot(
      containersCol,
      (snapshot) => {
        const containers: ShippingContainer[] = [];
        snapshot.forEach((docSnap) => {
          containers.push(docSnap.data() as ShippingContainer);
        });
        onContainersReceived(containers);
      },
      (error) => {
        console.error('[FIRESTORE] Error listening to containers:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('[FIRESTORE] Failed to subscribe to containers:', err);
    return () => {};
  }
}

export function subscribeToCatalogFirestore(
  onCatalogReceived: (catalog: MasterCatalogPart[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const catalogCol = collection(db, COLLECTIONS.CATALOG);
    return onSnapshot(
      catalogCol,
      (snapshot) => {
        const catalog: MasterCatalogPart[] = [];
        snapshot.forEach((docSnap) => {
          catalog.push(docSnap.data() as MasterCatalogPart);
        });
        onCatalogReceived(catalog);
      },
      (error) => {
        console.error('[FIRESTORE] Error listening to catalog:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('[FIRESTORE] Failed to subscribe to catalog:', err);
    return () => {};
  }
}

export function subscribeToModelsFirestore(
  onModelsReceived: (models: ChanganVehicleModel[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const modelsCol = collection(db, COLLECTIONS.MODELS);
    return onSnapshot(
      modelsCol,
      (snapshot) => {
        const models: ChanganVehicleModel[] = [];
        snapshot.forEach((docSnap) => {
          models.push(docSnap.data() as ChanganVehicleModel);
        });
        onModelsReceived(models);
      },
      (error) => {
        console.error('[FIRESTORE] Error listening to models:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('[FIRESTORE] Failed to subscribe to models:', err);
    return () => {};
  }
}

// ----------------------------------------------------
// Firestore Write Operations (Durable Cloud Storage)
// ----------------------------------------------------

export async function saveOrderToFirestore(order: SpecialOrder): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
    await setDoc(docRef, order, { merge: true });
    console.log(`[FIRESTORE] Saved order ${order.orderNumber} (${order.id}) to Cloud Firestore.`);
  } catch (err) {
    console.error(`[FIRESTORE] Error saving order ${order.id}:`, err);
    throw err;
  }
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await deleteDoc(docRef);
    console.log(`[FIRESTORE] Deleted order ${orderId} from Cloud Firestore.`);
  } catch (err) {
    console.error(`[FIRESTORE] Error deleting order ${orderId}:`, err);
    throw err;
  }
}

export async function batchSaveOrdersToFirestore(orders: SpecialOrder[]): Promise<void> {
  if (!orders || orders.length === 0) return;
  try {
    // Write in chunks of 450 (Firestore limit is 500 ops per batch)
    const chunkSize = 400;
    for (let i = 0; i < orders.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = orders.slice(i, i + chunkSize);
      chunk.forEach((order) => {
        const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
        batch.set(docRef, order, { merge: true });
      });
      await batch.commit();
    }
    console.log(`[FIRESTORE] Batch saved ${orders.length} orders to Cloud Firestore.`);
  } catch (err) {
    console.error('[FIRESTORE] Error batch saving orders:', err);
    throw err;
  }
}

export async function saveContainerToFirestore(container: ShippingContainer): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONTAINERS, container.id);
    await setDoc(docRef, container, { merge: true });
    console.log(`[FIRESTORE] Saved container ${container.containerNumber} to Cloud Firestore.`);
  } catch (err) {
    console.error(`[FIRESTORE] Error saving container ${container.id}:`, err);
    throw err;
  }
}

export async function deleteContainerFromFirestore(containerId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONTAINERS, containerId);
    await deleteDoc(docRef);
    console.log(`[FIRESTORE] Deleted container ${containerId} from Cloud Firestore.`);
  } catch (err) {
    console.error(`[FIRESTORE] Error deleting container ${containerId}:`, err);
    throw err;
  }
}

export async function batchSaveContainersToFirestore(containers: ShippingContainer[]): Promise<void> {
  if (!containers || containers.length === 0) return;
  try {
    const batch = writeBatch(db);
    containers.forEach((c) => {
      const docRef = doc(db, COLLECTIONS.CONTAINERS, c.id);
      batch.set(docRef, c, { merge: true });
    });
    await batch.commit();
    console.log(`[FIRESTORE] Batch saved ${containers.length} containers to Cloud Firestore.`);
  } catch (err) {
    console.error('[FIRESTORE] Error batch saving containers:', err);
    throw err;
  }
}

export async function saveCatalogPartToFirestore(part: MasterCatalogPart): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CATALOG, part.id);
    await setDoc(docRef, part, { merge: true });
  } catch (err) {
    console.error(`[FIRESTORE] Error saving catalog part ${part.id}:`, err);
    throw err;
  }
}

export async function batchSaveCatalogToFirestore(catalog: MasterCatalogPart[]): Promise<void> {
  if (!catalog || catalog.length === 0) return;
  try {
    const chunkSize = 400;
    for (let i = 0; i < catalog.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = catalog.slice(i, i + chunkSize);
      chunk.forEach((p) => {
        const docRef = doc(db, COLLECTIONS.CATALOG, p.id);
        batch.set(docRef, p, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('[FIRESTORE] Error batch saving catalog:', err);
    throw err;
  }
}

export async function saveModelToFirestore(model: ChanganVehicleModel): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MODELS, model.id);
    await setDoc(docRef, model, { merge: true });
  } catch (err) {
    console.error(`[FIRESTORE] Error saving model ${model.id}:`, err);
    throw err;
  }
}

export async function batchSaveModelsToFirestore(models: ChanganVehicleModel[]): Promise<void> {
  if (!models || models.length === 0) return;
  try {
    const batch = writeBatch(db);
    models.forEach((m) => {
      const docRef = doc(db, COLLECTIONS.MODELS, m.id);
      batch.set(docRef, m, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[FIRESTORE] Error batch saving models:', err);
    throw err;
  }
}

// ----------------------------------------------------
// One-Time Reads (used for manual "Sync All" refresh — Firestore is the
// single source of truth, so this replaces the old flow that pulled from
// the Express server's local JSON store, which only ever added records and
// never removed deleted ones, resurrecting deleted/duplicate orders).
// ----------------------------------------------------

export async function fetchOrdersOnceFromFirestore(): Promise<SpecialOrder[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.ORDERS));
  const orders: SpecialOrder[] = [];
  snap.forEach((docSnap) => orders.push(docSnap.data() as SpecialOrder));
  orders.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return (b.orderNumber || '').localeCompare(a.orderNumber || '');
  });
  return orders;
}

export async function fetchContainersOnceFromFirestore(): Promise<ShippingContainer[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.CONTAINERS));
  const containers: ShippingContainer[] = [];
  snap.forEach((docSnap) => containers.push(docSnap.data() as ShippingContainer));
  return containers;
}

export async function fetchCatalogOnceFromFirestore(): Promise<MasterCatalogPart[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.CATALOG));
  const catalog: MasterCatalogPart[] = [];
  snap.forEach((docSnap) => catalog.push(docSnap.data() as MasterCatalogPart));
  return catalog;
}

// ----------------------------------------------------
// Initial Cloud Seed & Synchronization
// ----------------------------------------------------

export async function initializeFirestoreDataIfEmpty(
  initialOrders: SpecialOrder[],
  initialContainers: ShippingContainer[],
  initialCatalog: MasterCatalogPart[],
  initialModels: ChanganVehicleModel[]
): Promise<void> {
  try {
    // Check if orders collection already has documents in Cloud Firestore
    const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    if (ordersSnap.empty && initialOrders.length > 0) {
      console.log('[FIRESTORE] Cloud database is fresh. Seeding initial operational orders...');
      await batchSaveOrdersToFirestore(initialOrders);
    }

    const containersSnap = await getDocs(collection(db, COLLECTIONS.CONTAINERS));
    if (containersSnap.empty && initialContainers.length > 0) {
      console.log('[FIRESTORE] Seeding initial containers...');
      await batchSaveContainersToFirestore(initialContainers);
    }

    const catalogSnap = await getDocs(collection(db, COLLECTIONS.CATALOG));
    if (catalogSnap.empty && initialCatalog.length > 0) {
      console.log('[FIRESTORE] Seeding initial parts catalog...');
      await batchSaveCatalogToFirestore(initialCatalog);
    }

    const modelsSnap = await getDocs(collection(db, COLLECTIONS.MODELS));
    if (modelsSnap.empty && initialModels.length > 0) {
      console.log('[FIRESTORE] Seeding vehicle models...');
      await batchSaveModelsToFirestore(initialModels);
    }
  } catch (err) {
    console.error('[FIRESTORE] Error during initial database seeding check:', err);
  }
}
