import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@mui/material';
import {
  usefetchcartAllProduct,
  updateCartQuantity,
  toggleCartProduct,
  checkPhonePeOrderStatus,
  createOrderApi,
} from '../../hooks/query';
import { useAppDispatch, useAppSelector } from '../../hooks/hoots';
import {
  updateCartItemQuantity,
  removeFromCartItem,
  clearCart,
} from '../../store/profile';
import SkeletonCartCard from '../../UI/SkeletonCartCard';
import CheckoutModal from './CheckoutModal';
import OrderSuccessModal from './OrderSuccessModal';
import './CartCart.css';

export interface CartProduct {
  _id: string;
  title: string;
  description?: string;
  price: number;
  newPrice?: number;
  offer: boolean;
  tag?: string;
  stock?: number;
  images?: {
    publicId?: string;
    url?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

function CartCart() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { profile, token } = useAppSelector((state) => state.profile);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data = [], isLoading, isError, error } = usefetchcartAllProduct();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Checkout & Payment Modals State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [placedOrderInfo, setPlacedOrderInfo] = useState<{
    orderId: string;
    paymentId: string;
    totalAmount: number;
    email: string;
    address: string;
    phone: string;
    paymentGateway?: string;
  } | null>(null);

  // PhonePe callback verification status
  const [phonePeStatus, setPhonePeStatus] = useState<{
    status: 'verifying' | 'failed' | 'pending' | null;
    message?: string;
  }>({ status: null });

  const cartItems: CartItem[] = Array.isArray(data) ? data : [];

  // Auto-open checkout modal if redirected with ?checkout=true (called unconditionally before early returns)
  useEffect(() => {
    if (searchParams.get('checkout') === 'true' && cartItems.length > 0) {
      setIsCheckoutOpen(true);
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, cartItems.length, setSearchParams]);

  // Handle PhonePe return callback verification
  const verifyPhonePeCallback = useCallback(async () => {
    const raw =
      sessionStorage.getItem('pending_phonepe_order') ||
      localStorage.getItem('pending_phonepe_order');

    if (!raw) {
      searchParams.delete('phonepe');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    setPhonePeStatus({
      status: 'verifying',
      message: 'Confirming PhonePe payment with your bank...',
    });

    try {
      const pending = JSON.parse(raw);
      const merchantOrderId =
        searchParams.get('merchantOrderId') || pending.merchantOrderId;

      if (!merchantOrderId) {
        throw new Error('Merchant order identifier was not found.');
      }

      // Verify status on backend (POST /payments/phonepe/verify)
      const statusRes = await checkPhonePeOrderStatus(merchantOrderId);
      const resData = (statusRes as any)?.data || statusRes;
      const state = (resData?.state || '').toUpperCase();
      const isSuccess =
        resData?.success !== false &&
        (state === 'COMPLETED' || state === 'SUCCESS');

      if (isSuccess) {
        const phonepeOrderId = resData?.orderId || pending.orderId;
        const phonepeTransactionId =
          resData?.paymentDetails?.[0]?.transactionId ||
          resData?.orderId ||
          pending.merchantOrderId;

        // Save paid order in DB (POST /orders/create)
        const created = await createOrderApi({
          ...pending.orderPayload,
          phonepeOrderId,
          phonepeTransactionId,
          paymentGateway: 'phonepe',
          payment: true,
        });

        // Clean up pending order from storages
        sessionStorage.removeItem('pending_phonepe_order');
        localStorage.removeItem('pending_phonepe_order');

        // Clear cart in Redux & React Query
        dispatch(clearCart());
        queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });
        queryClient.invalidateQueries({ queryKey: ['orderHistory'] });

        setPhonePeStatus({ status: null });
        searchParams.delete('phonepe');
        setSearchParams(searchParams, { replace: true });

        setPlacedOrderInfo({
          orderId: created?.Order?._id || phonepeOrderId,
          paymentId: phonepeTransactionId,
          totalAmount: pending.orderPayload.totalAmount,
          email: pending.orderPayload.email,
          address: pending.orderPayload.address,
          phone: pending.orderPayload.phone,
          paymentGateway: 'phonepe',
        });
        setIsSuccessOpen(true);
      } else if (state === 'PENDING') {
        setPhonePeStatus({
          status: 'pending',
          message:
            'Your payment is currently being confirmed by your bank. If the amount was debited, your order will be confirmed shortly.',
        });
      } else {
        sessionStorage.removeItem('pending_phonepe_order');
        localStorage.removeItem('pending_phonepe_order');
        setPhonePeStatus({
          status: 'failed',
          message:
            resData?.errorCode ||
            `PhonePe payment status: ${resData?.state || 'Payment was not completed or failed.'}`,
        });
      }
    } catch (err: any) {
      console.error('PhonePe callback processing error:', err);
      setPhonePeStatus({
        status: 'failed',
        message:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to complete PhonePe order verification.',
      });
    }
  }, [searchParams, setSearchParams, dispatch, queryClient]);

  useEffect(() => {
    if (searchParams.get('phonepe') === 'callback') {
      verifyPhonePeCallback();
    }
  }, [searchParams, verifyPhonePeCallback]);

  // Handle increasing quantity by 1
  const handleIncrease = async (item: CartItem) => {
    const productId = item.product._id;
    const newQuantity = (item.quantity || 1) + 1;

    try {
      setUpdatingId(productId);
      await updateCartQuantity(productId, newQuantity);

      // Update Redux state
      dispatch(updateCartItemQuantity({ product: productId, quantity: newQuantity }));

      // Refetch cart data from server
      queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });
    } catch (err: any) {
      console.error('Failed to increase quantity:', err);
      alert(err.response?.data?.message || 'Could not update quantity. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle decreasing quantity by 1 (or removing if reaches 0)
  const handleDecrease = async (item: CartItem) => {
    const productId = item.product._id;
    const currentQty = item.quantity || 1;
    const newQuantity = currentQty - 1;

    try {
      setUpdatingId(productId);

      if (newQuantity <= 0) {
        // Remove item from cart
        await updateCartQuantity(productId, 0);
        dispatch(removeFromCartItem(productId));
      } else {
        await updateCartQuantity(productId, newQuantity);
        dispatch(updateCartItemQuantity({ product: productId, quantity: newQuantity }));
      }

      // Refetch cart query
      queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });
    } catch (err: any) {
      console.error('Failed to decrease quantity:', err);
      alert(err.response?.data?.message || 'Could not update quantity. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle direct item removal
  const handleRemove = async (productId: string) => {
    try {
      setUpdatingId(productId);
      await toggleCartProduct(productId);
      dispatch(removeFromCartItem(productId));
      queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });
    } catch (err: any) {
      console.error('Failed to remove item:', err);
      alert(err.response?.data?.message || 'Could not remove item. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Render PhonePe Verification & Status Modal
  const renderPhonePeStatusModal = () => {
    if (!phonePeStatus.status) return null;

    return (
      <div className="phonepe-status-backdrop">
        <div className="phonepe-status-card" role="dialog" aria-modal="true" aria-labelledby="phonepe-status-title">
          {phonePeStatus.status === 'verifying' && (
            <div className="phonepe-status-content">
              <div className="phonepe-spinner-wrap">
                <div className="phonepe-spinner"></div>
                <span className="phonepe-spinner-icon">पे</span>
              </div>
              <h3 id="phonepe-status-title" className="phonepe-status-title">
                Verifying Payment
              </h3>
              <p className="phonepe-status-desc">
                Please wait while we confirm your PhonePe payment with your bank.
              </p>
              <div className="phonepe-status-warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Do not refresh or close this browser window.</span>
              </div>
            </div>
          )}

          {phonePeStatus.status === 'pending' && (
            <div className="phonepe-status-content">
              <div className="phonepe-status-icon warning">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h3 id="phonepe-status-title" className="phonepe-status-title">
                Payment Pending
              </h3>
              <p className="phonepe-status-desc">
                {phonePeStatus.message ||
                  'Your PhonePe payment is currently being processed by the bank. If money was debited, your order will be confirmed shortly.'}
              </p>
              <div className="phonepe-actions">
                <button
                  type="button"
                  className="phonepe-btn-primary"
                  onClick={() => verifyPhonePeCallback()}
                >
                  Check Status Again
                </button>
                <button
                  type="button"
                  className="phonepe-btn-secondary"
                  onClick={() => {
                    setPhonePeStatus({ status: null });
                    searchParams.delete('phonepe');
                    setSearchParams(searchParams, { replace: true });
                  }}
                >
                  Return to Cart
                </button>
              </div>
            </div>
          )}

          {phonePeStatus.status === 'failed' && (
            <div className="phonepe-status-content">
              <div className="phonepe-status-icon error">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3 id="phonepe-status-title" className="phonepe-status-title">
                Payment Unsuccessful
              </h3>
              <p className="phonepe-status-desc">
                {phonePeStatus.message ||
                  'PhonePe payment was not completed or was cancelled. Your cart items are preserved.'}
              </p>
              <div className="phonepe-actions">
                <button
                  type="button"
                  className="phonepe-btn-primary"
                  onClick={() => {
                    setPhonePeStatus({ status: null });
                    searchParams.delete('phonepe');
                    setSearchParams(searchParams, { replace: true });
                    setIsCheckoutOpen(true);
                  }}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  className="phonepe-btn-secondary"
                  onClick={() => {
                    setPhonePeStatus({ status: null });
                    searchParams.delete('phonepe');
                    setSearchParams(searchParams, { replace: true });
                  }}
                >
                  Back to Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (phonePeStatus.status) {
    return (
      <div className="cart-container">
        {renderPhonePeStatusModal()}
        <OrderSuccessModal
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          orderInfo={placedOrderInfo}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="cart-container">
        <div className="cart-header">
          <Skeleton variant="text" width={240} height={38} />
        </div>
        <div className="cart-layout">
          <div className="cart-items-list">
            {[1, 2, 3].map((key) => (
              <SkeletonCartCard key={key} />
            ))}
          </div>
          <div className="cart-summary-card">
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={1} sx={{ my: 2 }} />
            <Skeleton variant="text" width="100%" height={32} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: '8px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <h3 className="cart-empty-title">Unable to Load Cart</h3>
          <p className="cart-empty-text">
            {(error as any)?.response?.data?.message || 'Please log in to view your cart items.'}
          </p>
          <Link to="/" className="continue-shopping-btn">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Calculate totals
  const subtotal = cartItems.reduce((acc, item) => {
    const effectivePrice =
      item.product.offer && item.product.newPrice && item.product.newPrice > 0
        ? item.product.newPrice
        : item.product.price;
    return acc + (effectivePrice || 0) * (item.quantity || 1);
  }, 0);

  const totalQuantity = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const handleProceedToCheckout = () => {
    if (!token && !profile) {
      alert('Please log in to proceed with payment and order placement.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    // Block checkout up-front so a customer never pays for an item that the
    // server will reject for insufficient stock after the payment succeeds.
    const unavailable = cartItems.find(
      (item) =>
        typeof item.product?.stock === 'number' &&
        item.product.stock < (item.quantity || 1)
    );
    if (unavailable) {
      alert(
        `"${unavailable.product.title}" has only ${unavailable.product.stock} left in stock. ` +
          `Please reduce the quantity or remove it from your cart.`
      );
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (orderInfo: {
    orderId: string;
    paymentId: string;
    totalAmount: number;
    email: string;
    address: string;
    phone: string;
    paymentGateway?: string;
  }) => {
    setPlacedOrderInfo(orderInfo);
    setIsSuccessOpen(true);
  };

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h2 className="cart-title">My Shopping Cart</h2>
        <span className="cart-count-badge">
          ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
        </span>
      </div>

      {cartItems.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <h3 className="cart-empty-title">Your cart is empty</h3>
          <p className="cart-empty-text">Looks like you haven't added any sarees to your cart yet.</p>
          <Link to="/" className="continue-shopping-btn">
            Explore Sarees
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Cart Items List */}
          <div className="cart-items-list">
            {cartItems.map((item, idx) => {
              const product = item.product;
              if (!product) return null;

              const isUpdating = updatingId === product._id;
              const displayPrice =
                product.offer && product.newPrice && product.newPrice > 0
                  ? product.newPrice
                  : product.price;

              const itemTotal = displayPrice * (item.quantity || 1);

              return (
                <div key={product._id || idx} className="cart-item-card">
                  {/* Product Image */}
                  <div className="cart-item-image-wrapper">
                    {product.images?.url ? (
                      <img
                        src={product.images.url}
                        alt={product.title}
                        className="cart-item-image"
                      />
                    ) : (
                      <img
                        src="https://placehold.co/110x130?text=Saree"
                        alt={product.title}
                        className="cart-item-image placeholder"
                      />
                    )}
                    {product.tag && <span className="cart-item-tag">{product.tag}</span>}
                  </div>

                  {/* Product Info */}
                  <div className="cart-item-info">
                    <div className="cart-item-header">
                      <h3 className="cart-item-title">{product.title}</h3>
                      <button
                        type="button"
                        className="cart-item-remove-btn"
                        onClick={() => handleRemove(product._id)}
                        disabled={isUpdating}
                        title="Remove product from cart"
                        aria-label="Remove product"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>

                    {product.description && (
                      <p className="cart-item-description">{product.description}</p>
                    )}

                    <div className="cart-item-footer">
                      {/* Price Section */}
                      <div className="cart-item-prices">
                        <span className="cart-item-unit-price">
                          ₹{displayPrice?.toLocaleString('en-IN')}
                        </span>
                        {product.offer && product.newPrice && product.newPrice > 0 && (
                          <span className="cart-item-original-price">
                            ₹{product.price?.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="cart-item-subtotal">
                          Total:{' '}
                          <span className="cart-item-subtotal-val">
                            ₹{itemTotal?.toLocaleString('en-IN')}
                          </span>
                        </span>
                      </div>

                      {/* Quantity Stepper (+ / -) */}
                      <div className="cart-quantity-stepper">
                        <button
                          type="button"
                          className={`stepper-btn decrease-btn ${item.quantity === 1 ? 'is-delete' : ''}`}
                          onClick={() => handleDecrease(item)}
                          disabled={isUpdating}
                          title={item.quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                          aria-label="Decrease quantity"
                        >
                          {item.quantity === 1 ? (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          )}
                        </button>

                        <span className="stepper-quantity">
                          {isUpdating ? (
                            <svg
                              className="stepper-spinner"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                              <path d="M12 2a10 10 0 0 1 10 10"></path>
                            </svg>
                          ) : (
                            item.quantity
                          )}
                        </span>

                        <button
                          type="button"
                          className="stepper-btn increase-btn"
                          onClick={() => handleIncrease(item)}
                          disabled={isUpdating}
                          title="Increase quantity"
                          aria-label="Increase quantity"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="cart-summary-card">
            <h3 className="summary-title">Order Summary</h3>

            <div className="summary-row">
              <span>Items Total ({totalQuantity})</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="summary-row free-tag">
              <span>Shipping Fee</span>
              <span>FREE</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total">
              <span>Grand Total</span>
              <span className="total-amount">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <button
              type="button"
              className="checkout-btn"
              onClick={handleProceedToCheckout}
            >
              <span>Proceed to Pay ₹{subtotal.toLocaleString('en-IN')}</span>
            </button>

            <div className="checkout-razorpay-badge">
              <span className="phonepe-badge-icon" style={{ width: '16px', height: '16px', fontSize: '0.65rem' }}>पे</span>
              <span>PhonePe • Razorpay • UPI • Cards • NetBanking</span>
            </div>

            <div className="checkout-security-note">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>100% Secure Checkout</span>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Delivery & Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        subtotal={subtotal}
        totalQuantity={totalQuantity}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order & Payment Confirmation Modal */}
      <OrderSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        orderInfo={placedOrderInfo}
      />

      {/* PhonePe Verification & Status Modal */}
      {renderPhonePeStatusModal()}
    </div>
  );
}

export default CartCart;
