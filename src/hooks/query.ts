import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import { useAppSelector } from "./hoots";

export const fetchallProduct = async (): Promise<any[]> => {
  const { data } = await client.get('/products');
  // React Query queryFn must never return undefined
  return data?.Product ?? (Array.isArray(data) ? data : []);
};

export const usefetchAllProduct = () => {
  return useQuery({
    queryKey: ['getAllProduct'],
    queryFn: () => fetchallProduct(),
  });
};

export const fetchlatestProduct = async (): Promise<any[]> => {
  const { data } = await client.get('/products/latest');
  // React Query queryFn must never return undefined
  return data?.Product ?? (Array.isArray(data) ? data : []);
};

export const usefetchlatestProduct = () => {
  return useQuery({
    queryKey: ['getLatestProduct'],
    queryFn: () => fetchlatestProduct(),
  });
};

export const fetchCustomizedProducts = async (): Promise<any[]> => {
  try {
    const { data } = await client.get('/products', {
      params: { dressType: 'customized' },
    });
    const list = data?.Product ?? (Array.isArray(data) ? data : []);

    // Filter strictly for customized items
    const filtered = list.filter(
      (p: any) =>
        p.dressType?.toLowerCase() === 'customized' ||
        p.tag?.toLowerCase() === 'customized' ||
        p.isCustomized === true ||
        p.title?.toLowerCase().includes('custom')
    );

    if (filtered.length > 0) {
      return filtered;
    }

    // Fallback: check all products if query param is ignored by backend
    const allRes = await client.get('/products');
    const allList = allRes.data?.Product ?? (Array.isArray(allRes.data) ? allRes.data : []);
    return allList.filter(
      (p: any) =>
        p.dressType?.toLowerCase() === 'customized' ||
        p.tag?.toLowerCase() === 'customized' ||
        p.isCustomized === true ||
        p.title?.toLowerCase().includes('custom')
    );
  } catch (err: any) {
    console.error('fetchCustomizedProducts error:', err);
    return [];
  }
};

export const usefetchCustomizedProducts = () => {
  return useQuery({
    queryKey: ['getCustomizedProducts'],
    queryFn: () => fetchCustomizedProducts(),
  });
};
export const fetchProductById = async (productId: string): Promise<any> => {
  const { data } = await client.get(`/products/${productId}`);
  return data?.product ?? null;
};

export const usefetchProductById = (productId?: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId!),
    enabled: Boolean(productId),
  });
};

export const fetchcartsallProduct = async (): Promise<any[]> => {
  try {
    const { data } = await client.get('/products/carts');
    return data?.carts ?? (Array.isArray(data) ? data : []);
  } catch (err: any) {
    if (err.response?.status === 404) {
      const { data } = await client.get('/carts');
      return data?.carts ?? (Array.isArray(data) ? data : []);
    }
    console.error("fetchcartsallProduct error:", err);
    throw err;
  }
};

export const usefetchcartAllProduct = () => {
  const { token, profile } = useAppSelector((state) => state.profile);
  const isAuthenticated = Boolean(token || profile);

  return useQuery({
    queryKey: ['getCartAllProduct', token],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      return await fetchcartsallProduct();
    },
    enabled: isAuthenticated,
  });
};

/**
 * Checks whether a specific product is currently in the authenticated user's cart.
 * Calls endpoint POST /products/iscart/:productId (with fallback to /iscart/:productId).
 */
export const checkIsCartProduct = async (productId: string): Promise<boolean> => {
  try {
    const res = await client.post(`/products/iscart/${productId}`);
    return Boolean(res.data?.inCart);
  } catch (err: any) {
    if (err.response?.status === 404) {
      const res = await client.post(`/iscart/${productId}`);
      return Boolean(res.data?.inCart);
    }
    return false;
  }
};

/**
 * Toggles a product in the authenticated user's cart.
 * If already in cart -> removes it (returns { message: "removed from cart", inCart: false }).
 * If not in cart -> adds it (returns { message: "added into cart", inCart: true }).
 * Calls endpoint POST /products/cart/:productId (with fallback to /cart/:productId).
 */
export const toggleCartProduct = async (
  productId: string,
  quantity = 1
): Promise<{ message: string; inCart: boolean }> => {
  let res;
  try {
    res = await client.post(`/products/cart/${productId}`, { quantity });
  } catch (err: any) {
    if (err.response?.status === 404) {
      res = await client.post(`/cart/${productId}`, { quantity });
    } else {
      throw err;
    }
  }
  const message = res.data?.message || "";
  const inCart = message === "added into cart";
  return { message, inCart };
};

/**
 * Updates the quantity of a product in the cart.
 * If quantity <= 0, the item is removed from the cart.
 * Calls endpoint POST /products/updateCart/:productId (with fallback to /updateCart/:productId).
 */
export const updateCartQuantity = async (
  productId: string,
  quantity: number
): Promise<{ message: string; cart?: any[] }> => {
  let res;
  try {
    res = await client.post(`/products/updateCart/${productId}`, { quantity });
  } catch (err: any) {
    if (err.response?.status === 404) {
      res = await client.post(`/updateCart/${productId}`, { quantity });
    } else {
      throw err;
    }
  }
  return res.data;
};

export interface CreatePaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  note?: any;
  keyId: string;
}

/**
 * Creates a Razorpay order on backend with the given amount in INR.
 */
export const createRazorpayOrder = async (
  amount: number
): Promise<CreatePaymentOrderResponse> => {
  const { data } = await client.post('/payments/create', { amount });
  return data;
};

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Verifies Razorpay payment signature on backend.
 */
export const verifyRazorpayPayment = async (
  payload: VerifyPaymentPayload
): Promise<{ success: boolean; message?: string }> => {
  const { data } = await client.post('/payments/verify', payload);
  return data;
};

export interface CreatePhonePeOrderPayload {
  amount: number;
  redirectUrl: string;
  mobileNumber?: string;
  message?: string;
}

export interface CreatePhonePeOrderResponse {
  success: boolean;
  orderId: string;
  merchantOrderId: string;
  state: string;
  redirectUrl: string;
  expireAt?: number;
  amount?: number;
  gateway?: "phonepe";
  data?: any;
}

export interface PhonePePaymentDetail {
  transactionId?: string;
  amount?: number;
  state?: string;
  responseCode?: string;
  paymentMode?: string;
  [key: string]: any;
}

export interface PhonePeStatusResponse {
  success: boolean;
  state: string;
  orderId: string;
  merchantOrderId: string;
  amount?: number;
  paymentDetails?: PhonePePaymentDetail[];
  errorCode?: string;
  detailedErrorCode?: string;
  data?: any;
}

/**
 * Creates PhonePe payment order on backend and returns checkout redirectUrl.
 * Endpoint: POST /payments/phonepe/create
 */
export const createPhonePeOrder = async (
  payload: CreatePhonePeOrderPayload
): Promise<CreatePhonePeOrderResponse> => {
  const { data } = await client.post('/payments/phonepe/create', payload);
  return data;
};

/**
 * Checks/verifies PhonePe payment status on backend.
 * Endpoint: POST /payments/phonepe/verify
 * Payload: { merchantOrderId }
 */
export const checkPhonePeOrderStatus = async (
  merchantOrderId: string
): Promise<PhonePeStatusResponse> => {
  const { data } = await client.post('/payments/phonepe/verify', {
    merchantOrderId,
  });
  return data;
};

export const verifyPhonePePayment = checkPhonePeOrderStatus;

export const fetchPaymentMethods = async (): Promise<{
  razorpay: boolean;
  phonepe: boolean;
}> => {
  const { data } = await client.get('/payments/methods');
  return data;
};

export interface CreateOrderPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  pinCode: string;
  payment: boolean;
  totalAmount: number;
  products: {
    product: string;
    quantity: number;
  }[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  phonepeOrderId?: string;
  phonepeTransactionId?: string;
  paymentGateway?: string;
}

/**
 * Creates order record in the database after successful payment.
 */
export const createOrderApi = async (
  orderPayload: CreateOrderPayload
): Promise<{ Order: any }> => {
  const { data } = await client.post('/orders/create', orderPayload);
  return data;
};