import type { DeliveryStatus, OrderItem, OrderProductInfo, OrderStatus } from '../types/order';

export interface StatusMeta {
  label: string;
  tone: 'neutral' | 'info' | 'warning' | 'success';
}

const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'warning' },
  notStarted: { label: 'Order Placed', tone: 'info' },
  inProgress: { label: 'Processing', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

const DELIVERY_STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  waiting: { label: 'Preparing Dispatch', tone: 'neutral' },
  shipping: { label: 'Out for Delivery', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
};

export const getOrderStatusMeta = (status?: OrderStatus): StatusMeta => {
  if (status && status in ORDER_STATUS_META) {
    return ORDER_STATUS_META[status];
  }
  return { label: status || 'Order Placed', tone: 'info' };
};

export const getDeliveryStatusMeta = (status?: DeliveryStatus): StatusMeta => {
  if (status && status in DELIVERY_STATUS_META) {
    return DELIVERY_STATUS_META[status];
  }
  return { label: status || 'Preparing Dispatch', tone: 'neutral' };
};

export const formatCurrencyINR = (amount?: number): string => {
  const numeric = Number(amount) || 0;
  return `₹${numeric.toLocaleString('en-IN')}`;
};

export const formatOrderDate = (isoDate?: string, includeTime = false): string => {
  if (!isoDate) return 'Date unavailable';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed);
};

export const formatShortOrderId = (orderId?: string): string => {
  if (!orderId) return '—';
  return orderId.length > 8 ? `#${orderId.slice(-8).toUpperCase()}` : `#${orderId.toUpperCase()}`;
};

export interface NormalizedOrderLine {
  productId: string | null;
  title: string;
  imageUrl?: string;
  tag?: string;
  unitPrice: number | null;
  originalPrice: number | null;
  quantity: number;
}

export const normalizeOrderItem = (item: OrderItem): NormalizedOrderLine => {
  const quantity = Math.max(1, Number(item?.quantity) || 1);
  const rawProduct = item?.product;

  if (!rawProduct) {
    return {
      productId: null,
      title: 'Handloom Saree (Unavailable)',
      unitPrice: null,
      originalPrice: null,
      quantity,
    };
  }

  if (typeof rawProduct === 'string') {
    return {
      productId: rawProduct,
      title: `Saree #${rawProduct.slice(-6).toUpperCase()}`,
      unitPrice: null,
      originalPrice: null,
      quantity,
    };
  }

  const product = rawProduct as OrderProductInfo;
  const hasOffer = Boolean(product.offer && product.newPrice && product.newPrice > 0);
  const unitPrice = hasOffer ? product.newPrice! : product.price;

  return {
    productId: product._id || null,
    title: product.title || 'Handloom Saree',
    imageUrl: product.images?.url,
    tag: product.tag,
    unitPrice: typeof unitPrice === 'number' ? unitPrice : null,
    originalPrice:
      hasOffer && typeof product.price === 'number' && product.price > unitPrice
        ? product.price
        : null,
    quantity,
  };
};

export const formatPaymentGateway = (gateway?: string): string => {
  if (!gateway) return 'Online Payment';
  const normalized = gateway.toLowerCase();
  if (normalized === 'phonepe') return 'PhonePe PG';
  if (normalized === 'razorpay') return 'Razorpay';
  return gateway;
};
