import { AutoMatchResult, BranchName, ContainerManifestItem, ShippingContainer, SpecialOrder } from '../types';

/**
 * Normalizes a spare part code for ultra-resilient matching.
 * Strips hyphens, spaces, dots, slashes, underscores, and Excel ".0" artifacts.
 * e.g. "S111F260204-1504" -> "S111F2602041504"
 * e.g. "F11101 0200" -> "F111010200"
 * e.g. "1001010-AA01" -> "1001010AA01"
 * e.g. "3445367.0" -> "3445367"
 */
export function normalizePartCode(code: string | undefined | null): string {
  if (!code) return '';
  let clean = String(code).trim().toUpperCase();
  // Remove Excel numeric decimal suffix e.g. "12345.0"
  if (clean.endsWith('.0')) {
    clean = clean.slice(0, -2);
  }
  // Remove non-alphanumeric characters
  return clean.replace(/[^A-Z0-9]/g, '');
}

/**
 * Checks if two part codes match using exact, normalized, or updatedCode comparison.
 */
export function isPartCodeMatch(
  orderCode: string,
  containerCode: string,
  updatedCode?: string
): boolean {
  if (!orderCode || !containerCode) return false;

  const rawOrder = orderCode.trim().toUpperCase();
  const rawCont = containerCode.trim().toUpperCase();
  if (rawOrder === rawCont) return true;

  const normOrder = normalizePartCode(orderCode);
  const normCont = normalizePartCode(containerCode);
  if (normOrder && normCont && normOrder === normCont) return true;

  if (updatedCode) {
    const rawUpdated = updatedCode.trim().toUpperCase();
    if (rawUpdated === rawCont) return true;
    const normUpdated = normalizePartCode(updatedCode);
    if (normUpdated && normCont && normUpdated === normCont) return true;
  }

  // Prefix / Root match for codes with length >= 6 (e.g., base code without sub-dash)
  if (normOrder.length >= 6 && normCont.length >= 6) {
    if (normOrder.startsWith(normCont) || normCont.startsWith(normOrder)) {
      return true;
    }
  }

  return false;
}

export interface InventoryPoolItem {
  id: string;
  code: string;
  normalizedCode: string;
  description: string;
  available: number;
  initial: number;
  assigned: number;
  location: string;
  containerId: string;
  containerNumber: string;
  containerType: string;
}

/**
 * Runs intelligent Cross-Dock allocation for a single container against all orders.
 */
export function runAutoMatchAllocation(
  container: ShippingContainer,
  allOrders: SpecialOrder[]
): {
  updatedContainer: ShippingContainer;
  updatedOrders: SpecialOrder[];
  result: AutoMatchResult;
} {
  const containerCopy: ShippingContainer = JSON.parse(JSON.stringify(container));
  const ordersCopy: SpecialOrder[] = JSON.parse(JSON.stringify(allOrders));

  // Build inventory pool with multiple indexing keys for fast and resilient lookup
  const inventoryItems: InventoryPoolItem[] = [];

  containerCopy.items.forEach((item) => {
    const norm = normalizePartCode(item.code);
    inventoryItems.push({
      id: item.id,
      code: item.code,
      normalizedCode: norm,
      description: item.description,
      available: item.totalQuantity,
      initial: item.totalQuantity,
      assigned: 0,
      location: item.warehouseLocation || 'CEDIS-ZONA-A',
      containerId: containerCopy.id,
      containerNumber: containerCopy.containerNumber,
      containerType: containerCopy.type,
    });
  });

  // Filter pending orders that have unfulfilled items
  // We match ANY order where at least one item has quantityRequested > quantityAssigned
  // and overallStatus is not already DESPACHADO or RECIBIDO EN SUCURSAL.
  const eligibleOrdersIndices: number[] = [];

  ordersCopy.forEach((order, idx) => {
    const statusUpper = (order.overallStatus || '').trim().toUpperCase();
    if (statusUpper === 'DESPACHADO' || statusUpper === 'RECIBIDO EN SUCURSAL') {
      return;
    }

    const hasUnfulfilledItems = order.items.some(
      (it) => (it.quantityRequested || 0) > (it.quantityAssigned || 0)
    );

    if (hasUnfulfilledItems || statusUpper === 'PENDIENTE' || statusUpper === 'EN TRÁNSITO' || statusUpper === 'PARCIAL') {
      eligibleOrdersIndices.push(idx);
    }
  });

  // Sort: Emergencia orders first (Critical SLA), then FIFO by creation date
  eligibleOrdersIndices.sort((a, b) => {
    const ordA = ordersCopy[a];
    const ordB = ordersCopy[b];
    const isEmergA = ordA.orderType === 'Emergencia' || (ordA.orderType as string) === 'EMERGENCIA';
    const isEmergB = ordB.orderType === 'Emergencia' || (ordB.orderType as string) === 'EMERGENCIA';

    if (isEmergA && !isEmergB) return -1;
    if (!isEmergA && isEmergB) return 1;

    return new Date(ordA.createdAt || 0).getTime() - new Date(ordB.createdAt || 0).getTime();
  });

  let totalAllocatedItems = 0;
  let fulfilledCount = 0;
  let partialCount = 0;

  const branchBreakdown: Record<BranchName, number> = {
    'Costa Verde': 0,
    'Calle 50': 0,
    'Tumba Muerto': 0,
    'Villa Lucre': 0,
    'Chiriquí': 0,
    'Santa María': 0,
  };

  const nowIso = new Date().toISOString();

  // Perform allocation
  for (const orderIdx of eligibleOrdersIndices) {
    const order = ordersCopy[orderIdx];
    let allocatedInThisOrder = 0;
    let totalItemsNeeded = 0;
    let totalItemsFulfilled = 0;

    order.items.forEach((orderItem) => {
      const needed = Math.max(0, (orderItem.quantityRequested || 1) - (orderItem.quantityAssigned || 0));
      totalItemsNeeded += (orderItem.quantityRequested || 1);

      if (needed > 0) {
        // Find matching inventory in the pool
        const normOrderCode = normalizePartCode(orderItem.code);
        const normUpdatedCode = orderItem.updatedCode ? normalizePartCode(orderItem.updatedCode) : '';

        // Match priority: Exact Code -> Normalized Code -> Updated Code -> Substring Root
        let poolItem = inventoryItems.find(
          (inv) => inv.available > 0 && inv.code.trim().toUpperCase() === orderItem.code.trim().toUpperCase()
        );

        if (!poolItem && normOrderCode) {
          poolItem = inventoryItems.find(
            (inv) => inv.available > 0 && inv.normalizedCode === normOrderCode
          );
        }

        if (!poolItem && normUpdatedCode) {
          poolItem = inventoryItems.find(
            (inv) => inv.available > 0 && (inv.normalizedCode === normUpdatedCode || inv.code.trim().toUpperCase() === orderItem.updatedCode?.trim().toUpperCase())
          );
        }

        if (!poolItem && normOrderCode.length >= 6) {
          poolItem = inventoryItems.find(
            (inv) => inv.available > 0 && (inv.normalizedCode.startsWith(normOrderCode) || normOrderCode.startsWith(inv.normalizedCode))
          );
        }

        if (poolItem && poolItem.available > 0) {
          const alloc = Math.min(needed, poolItem.available);
          poolItem.available -= alloc;
          poolItem.assigned += alloc;
          orderItem.quantityAssigned = (orderItem.quantityAssigned || 0) + alloc;
          orderItem.containerId = containerCopy.containerNumber;
          orderItem.locationInCedis = poolItem.location;
          allocatedInThisOrder += alloc;
          totalAllocatedItems += alloc;
          if (order.branch && branchBreakdown[order.branch] !== undefined) {
            branchBreakdown[order.branch] += alloc;
          }

          if (orderItem.quantityAssigned >= orderItem.quantityRequested) {
            orderItem.status = 'EN BODEGA CEDIS';
          } else {
            orderItem.status = 'PARCIAL';
          }
        }
      }

      if ((orderItem.quantityAssigned || 0) >= (orderItem.quantityRequested || 1)) {
        totalItemsFulfilled += (orderItem.quantityRequested || 1);
      }
    });

    if (allocatedInThisOrder > 0) {
      order.assignedContainerId = containerCopy.containerNumber;
      order.arrivalDateAtCedis = nowIso;

      if (totalItemsFulfilled >= totalItemsNeeded) {
        order.overallStatus = 'EN BODEGA CEDIS';
        fulfilledCount++;
      } else {
        order.overallStatus = 'PARCIAL';
        partialCount++;
      }

      // Add auto system observation
      order.observations.unshift({
        id: `OBS-AUTO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: nowIso,
        author: 'CEDIS Auto-Match Engine',
        content: `Asignación automática desde contenedor ${containerCopy.containerNumber} (${containerCopy.type}). Cantidad asignada: ${allocatedInThisOrder} unidad(es).`,
        type: 'general',
      });
    }
  }

  // Update container item assigned quantities
  containerCopy.items.forEach((item) => {
    const norm = normalizePartCode(item.code);
    const pool = inventoryItems.find((inv) => inv.id === item.id || inv.normalizedCode === norm);
    if (pool) {
      item.assignedQuantity = pool.assigned;
    }
  });

  containerCopy.arrivalStatus = 'Recibido en CEDIS';
  containerCopy.processedForMatching = true;
  containerCopy.actualArrivalDate = containerCopy.actualArrivalDate || nowIso.split('T')[0];

  // Calculate surplus items (free stock for CEDIS general racks)
  const unmatchedSurplusItems: { code: string; description: string; quantity: number }[] = [];
  inventoryItems.forEach((inv) => {
    if (inv.available > 0) {
      unmatchedSurplusItems.push({
        code: inv.code,
        description: inv.description,
        quantity: inv.available,
      });
    }
  });

  const result: AutoMatchResult = {
    containerId: containerCopy.id,
    containerNumber: containerCopy.containerNumber,
    timestamp: nowIso,
    totalAllocatedItems,
    ordersFulfilledCount: fulfilledCount,
    ordersPartiallyFulfilledCount: partialCount,
    branchBreakdown,
    unmatchedSurplusItems,
  };

  return {
    updatedContainer: containerCopy,
    updatedOrders: ordersCopy,
    result,
  };
}

export interface GlobalCrossDockResult {
  timestamp: string;
  totalContainersProcessed: number;
  receivedContainersCount: number;
  inTransitContainersCount: number;
  inTransitContainerNumbers: string[];
  totalAllocatedItems: number;
  ordersFulfilledCount: number;
  ordersPartiallyFulfilledCount: number;
  branchBreakdown: Record<BranchName, number>;
  containerBreakdown: { containerNumber: string; allocated: number; total: number; status: string }[];
  matchedDetails: {
    orderNumber: string;
    clientName: string;
    branch: BranchName;
    partCode: string;
    description: string;
    quantity: number;
    containerNumber: string;
    locationInCedis: string;
  }[];
}

/**
 * Runs Global Cross-Docking ONLY across containers that have physically arrived (Recibido en CEDIS).
 * Containers in 'En Tránsito' or other pending states are strictly skipped to prevent false allocations.
 */
export function runGlobalCrossDockMatching(
  containers: ShippingContainer[],
  allOrders: SpecialOrder[]
): {
  updatedContainers: ShippingContainer[];
  updatedOrders: SpecialOrder[];
  result: GlobalCrossDockResult;
} {
  let currentContainers: ShippingContainer[] = JSON.parse(JSON.stringify(containers));
  let currentOrders: SpecialOrder[] = JSON.parse(JSON.stringify(allOrders));

  let totalAllocatedItems = 0;
  let fulfilledOrders = new Set<string>();
  let partialOrders = new Set<string>();
  const branchBreakdown: Record<BranchName, number> = {
    'Costa Verde': 0,
    'Calle 50': 0,
    'Tumba Muerto': 0,
    'Villa Lucre': 0,
    'Chiriquí': 0,
    'Santa María': 0,
  };
  const containerBreakdown: { containerNumber: string; allocated: number; total: number; status: string }[] = [];
  const matchedDetails: GlobalCrossDockResult['matchedDetails'] = [];

  const inTransitContainers = currentContainers.filter(
    (c) => c.arrivalStatus !== 'Recibido en CEDIS'
  );
  const inTransitContainerNumbers = inTransitContainers.map((c) => c.containerNumber);

  // Iterate through each container: ONLY allocate if status is 'Recibido en CEDIS'
  currentContainers = currentContainers.map((container) => {
    const isReceivedAtCedis = container.arrivalStatus === 'Recibido en CEDIS';

    if (!isReceivedAtCedis) {
      containerBreakdown.push({
        containerNumber: container.containerNumber,
        allocated: 0,
        total: container.totalUnits,
        status: container.arrivalStatus || 'En Tránsito',
      });
      return container; // Leave in-transit container untouched
    }

    const { updatedContainer, updatedOrders, result } = runAutoMatchAllocation(
      container,
      currentOrders
    );

    currentOrders = updatedOrders;
    totalAllocatedItems += result.totalAllocatedItems;

    containerBreakdown.push({
      containerNumber: container.containerNumber,
      allocated: result.totalAllocatedItems,
      total: container.totalUnits,
      status: 'Recibido en CEDIS',
    });

    Object.entries(result.branchBreakdown).forEach(([b, count]) => {
      if (branchBreakdown[b as BranchName] !== undefined) {
        branchBreakdown[b as BranchName] += count;
      }
    });

    return updatedContainer;
  });

  // Calculate final order counts
  currentOrders.forEach((order) => {
    if (order.overallStatus === 'EN BODEGA CEDIS') {
      fulfilledOrders.add(order.id);
    } else if (order.overallStatus === 'PARCIAL') {
      partialOrders.add(order.id);
    }

    order.items.forEach((item) => {
      if (item.quantityAssigned > 0 && item.containerId) {
        matchedDetails.push({
          orderNumber: order.orderNumber,
          clientName: order.clientName,
          branch: order.branch,
          partCode: item.code,
          description: item.description,
          quantity: item.quantityAssigned,
          containerNumber: item.containerId,
          locationInCedis: item.locationInCedis || 'CEDIS-ZONA-A',
        });
      }
    });
  });

  const receivedCount = currentContainers.filter(
    (c) => c.arrivalStatus === 'Recibido en CEDIS'
  ).length;

  const globalResult: GlobalCrossDockResult = {
    timestamp: new Date().toISOString(),
    totalContainersProcessed: receivedCount,
    receivedContainersCount: receivedCount,
    inTransitContainersCount: inTransitContainers.length,
    inTransitContainerNumbers,
    totalAllocatedItems,
    ordersFulfilledCount: fulfilledOrders.size,
    ordersPartiallyFulfilledCount: partialOrders.size,
    branchBreakdown,
    containerBreakdown,
    matchedDetails,
  };

  return {
    updatedContainers: currentContainers,
    updatedOrders: currentOrders,
    result: globalResult,
  };
}
