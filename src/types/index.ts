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
  | 'PROCESSING'
  | 'REVIEW_PENDING'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'COATING_PENDING'
  | 'SHIPPING_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

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
  shippedQuantity?: number;
  shipped_quantity?: number;
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

export interface DispatchRecord {
  id: number;
  order_id: number;
  order_item_id: number;
  quantity_shipped: number;
  driver_name: string;
  vehicle_plate: string;
  waybill_number: string;
  notes?: string;
  creator_name?: string;
  created_at: string;
  customer_product_code?: string;
  product_name?: string;
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
  order_date: string;
  requested_delivery_date?: string;
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
  orderDate?: string;
  deliveryDate?: string;
}
