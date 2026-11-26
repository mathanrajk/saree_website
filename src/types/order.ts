export const ORDER_STATUS = [
  "pending",
  "notStarted",
  "inProgress",
  "completed",
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export const DELIVERY_STATUS = [
  "waiting",
  "shipping",
  "delivered",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export interface OrderProductInfo {
  _id: string;
  title: string;
  description?: string;
  price: number;
  newPrice?: number;
  offer?: boolean;
  tag?: string;
  dressType?: string;
  images?: {
    publicId?: string;
    url?: string;
  };
}

export interface OrderItem {
  product: OrderProductInfo | string | null;
  quantity: number;
}

export interface OrderDocument {
  _id: string;
  ownerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  address: string;
  pinCode: string;
  payment: boolean;
  totalAmount: number;
  products: OrderItem[];
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  phonepeOrderId?: string;
  phonepeTransactionId?: string;
  paymentGateway?: string;
  createdAt?: string;
  updatedAt?: string;
}
