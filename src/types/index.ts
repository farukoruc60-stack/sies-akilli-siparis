export type Role = 'ADMIN' | 'STANDARD';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface Customer {
  id: number;
  name: string;
  taxOffice?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export type OrderStatus =
  | 'NEW'
  | 'PRODUCTION_PENDING'
  | 'IN_PRODUCTION'
  | 'COATING_PENDING'
  | 'COATING'
  | 'PAINTING'
  | 'PACKAGING'
  | 'READY_FOR_SHIPPING'
  | 'PARTIAL_SHIPPING'
  | 'SHIPPING_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PROCESSING'
  | 'REVIEW_PENDING'
  | 'APPROVED'
  | 'OVERDUE';

export interface OrderItem {
  id?: number;
  lineNo: number;
  line_no?: number;
  customerProductCode?: string;
  customer_product_code?: string;
  internalProductCode?: string;
  internal_product_code?: string;
  productName: string;
  product_name?: string;
  productDescription?: string;
  product_description?: string;
  widthMm?: number;
  heightMm?: number;
  lengthMm?: number;
  thicknessMm?: number;
  material?: string;
  surfaceCoating?: string;
  color?: string;
  quantity: number;
  productionQuantity?: number;
  production_quantity?: number;
  producedQuantity?: number;
  produced_quantity?: number;
  inProductionQuantity?: number;
  in_production_quantity?: number;
  coatingQuantity?: number;
  coating_quantity?: number;
  sentToCoatingQuantity?: number;
  sent_to_coating_quantity?: number;
  returnedFromCoatingQuantity?: number;
  returned_from_coating_quantity?: number;
  approvedQuantity?: number;
  approved_quantity?: number;
  defectQuantity?: number;
  defect_quantity?: number;
  shippedQuantity?: number;
  shipped_quantity?: number;
  remainingQuantity?: number;
  remaining_quantity?: number;
  unit: string;
  unitPrice: number;
  unit_price?: number;
  currency: string;
  lineTotal: number;
  line_total?: number;
  status?: string;
  sourcePage?: number;
  confidenceScore?: number;
}

export interface ProductionOrder {
  id: number;
  order_id: number;
  order_item_id: number;
  work_order_no: string;
  department?: string;
  planned_quantity: number;
  produced_quantity: number;
  defect_quantity: number;
  start_date?: string;
  planned_end_date?: string;
  actual_end_date?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  creator_name?: string;
  customer_product_code?: string;
  product_name?: string;
  unit?: string;
  created_at: string;
  updated_at?: string;
}

export interface SubcontractOrder {
  id: number;
  order_id: number;
  order_item_id: number;
  subcontractor_name: string;
  operation_type: string;
  waybill_no?: string;
  sent_quantity: number;
  returned_quantity: number;
  defect_quantity: number;
  sent_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  status: 'SENT' | 'PARTIALLY_RETURNED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  creator_name?: string;
  customer_product_code?: string;
  product_name?: string;
  unit?: string;
  created_at: string;
  updated_at?: string;
}

export interface DispatchRecord {
  id: number;
  order_id: number;
  order_item_id: number;
  quantity_shipped: number;
  driver_name: string;
  vehicle_plate: string;
  waybill_number: string;
  notes?: string;
  dispatch_date?: string;
  status?: 'ACTIVE' | 'CANCELLED';
  cancelled_at?: string;
  cancelled_by?: number;
  cancellation_reason?: string;
  creator_name?: string;
  created_at: string;
  customer_product_code?: string;
  product_name?: string;
  unit?: string;
}

export interface ReportSummary {
  openOrdersCount: number;
  overdueOrdersCount: number;
  inProductionCount: number;
  activeWorkOrdersCount: number;
  activeSubcontractCount: number;
  readyToShipItemsCount: number;
}

export interface OrderDocument {
  id: number;
  orderId?: number;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
  originalPath: string;
  pdfPath?: string;
  archiveStatus: 'PENDING' | 'ARCHIVED' | 'FAILED';
  yandexPath?: string;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: number;
  orderId: number;
  previousStatus?: string;
  newStatus: string;
  userName?: string;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: number;
  order_no: string;
  customer_id: number;
  customer_name: string;
  customer_tax_number?: string;
  customer_order_no?: string;
  project_no?: string;
  coating_type?: string;
  order_date: string;
  requested_delivery_date?: string;
  notes?: string;
  status: OrderStatus;
  creator_name?: string;
  updater_name?: string;
  version: number;
  total_items?: number;
  total_docs?: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractedCustomerInfo {
  name: string;
  taxOffice?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  orderNo?: string;
  projectNo?: string;
  coatingType?: string;
  notes?: string;
  orderDate?: string;
  deliveryDate?: string;
  requestedDeliveryDate?: string;
  exemptionDocId?: number;
}

export interface CustomerInsights {
  customerName: string;
  year: number;
  orderRankThisYear: number;
  totalOrdersThisYear: number;
  totalOrdersAllTime: number;
  totalCustomerRevenue: number;
  thisOrderAmount: number;
  thisOrderRevenueSharePercent: number;
  favoriteCoatings: { name: string; count: number }[];
  favoriteProducts: { product_name: string; cnt: number; total_qty?: number; unit?: string }[];
  aiSynthesisSummary: string;
}

