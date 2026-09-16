export type BranchName = 
  | 'Costa Verde'
  | 'Calle 50'
  | 'Tumba Muerto'
  | 'Villa Lucre'
  | 'Chiriquí'
  | 'Santa María';

export type Channel = 'Mostrador' | 'Taller' | 'Chapistería' | 'Garantía' | 'Repuestos' | 'Aseguradora' | 'Flotas' | 'Mesón';

export type OrderType = 'Especial' | 'Emergencia' | 'Garantía';

export type PaymentStatus = 'No Pagado' | 'Abonado' | 'Cancelado';

export type OrderStatus = 
  | 'PENDIENTE'
  | 'EN TRÁNSITO'
  | 'EN BODEGA CEDIS'
  | 'DESPACHADO'
  | 'RECIBIDO EN SUCURSAL'
  | 'PARCIAL';

export interface OrderItem {
  id: string;
  code: string;
  updatedCode?: string;
  description: string;
  quantityRequested: number;
  quantityAssigned: number;
  quantityDispatched: number;
  unitPriceEstimate?: number;
  containerId?: string;
  locationInCedis?: string;
  status: OrderStatus;
}

export interface SpecialOrder {
  id: string;
  orderNumber: string; // e.g. ORD-2026-0842
  createdAt: string;
  branch: BranchName;
  collaboratorName: string;
  channel: Channel;
  orderType: OrderType;
  quotationNumber: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  plate: string;
  changanModel: string;
  vin?: string;
  paymentStatus: PaymentStatus;
  receiptOrInvoiceNumber: string; // receipt if abonado, invoice if cancelado
  items: OrderItem[];
  overallStatus: OrderStatus;
  assignedContainerId?: string;
  arrivalDateAtCedis?: string;
  dispatchDate?: string;
  branchReceivedDate?: string;
  isBilled: boolean;
  billingInvoiceNumber?: string;
  observations: OrderObservation[];
}

export interface OrderObservation {
  id: string;
  date: string;
  author: string;
  content: string;
  type: 'general' | 'call_log' | 'billing_alert' | 'urgency';
}

export interface ContainerManifestItem {
  id: string;
  code: string;
  description: string;
  totalQuantity: number;
  assignedQuantity: number;
  warehouseLocation: string; // e.g. R-01-A-H04, E-02-B-A04
}

export interface ShippingContainer {
  id: string;
  containerNumber: string; // e.g. 2606M00000SF0005 or Invoice No.
  supplier: string; // e.g. Mobitech CO, Ltd
  poNumber: string; // e.g. 260317MS01894SF
  importInvoice?: string;
  type: 'Marítimo' | 'Aéreo Express';
  arrivalStatus: 'En Tránsito' | 'En Puerto / Aduana' | 'Recibido en CEDIS' | 'En Bodega CEDIS' | 'Recibido Parcial';
  estimatedArrivalDate: string;
  actualArrivalDate?: string;
  items: ContainerManifestItem[];
  totalUnits: number;
  totalSkus: number;
  processedForMatching: boolean;
}

export type VehicleCategory = 'SUV' | 'Sedán' | 'Pickup' | 'Comercial' | 'Eléctrico / Híbrido';

export interface ChanganVehicleModel {
  id: string;
  name: string; // e.g. "CS35 Plus", "UNI-T", "Deepal S07"
  category: VehicleCategory;
  yearRange?: string; // e.g. "2020-2026"
  engine?: string; // e.g. "1.4L Turbo BlueCore"
  transmission?: string; // e.g. "7-DCT", "8-AT", "6-MT"
  generation?: string; // e.g. "2da Gen", "Facelift"
  isActive?: boolean; // active for selection in advisor forms
  active?: boolean;
  notes?: string;
}

export interface MasterCatalogPart {
  id: string;
  code: string;
  updatedCode?: string;
  description: string;
  category: string;
  compatibleModels: string[];
  suggestedLocation: string;
  standardLeadTimeDays: number;
  priceEstimate?: number;
  notes?: string;
}

export interface AutoMatchResult {
  containerId: string;
  containerNumber: string;
  timestamp: string;
  totalAllocatedItems: number;
  ordersFulfilledCount: number;
  ordersPartiallyFulfilledCount: number;
  branchBreakdown: Record<BranchName, number>;
  unmatchedSurplusItems: { code: string; description: string; quantity: number }[];
}
