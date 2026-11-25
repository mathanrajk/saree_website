import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/hoots';
import { useQueryClient } from '@tanstack/react-query';
import { clearCart } from '../../store/profile';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createOrderApi,
  createPhonePeOrder,
} from '../../hooks/query';
import {
  loadRazorpayScript,
  type RazorpayOptions,
  type RazorpayResponse,
} from '../../utils/razorpay';
import type { CartItem } from './CartCart';
import './CheckoutModal.css';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  totalQuantity: number;
  onOrderSuccess: (orderInfo: {
    orderId: string;
    paymentId: string;
    totalAmount: number;
    email: string;
    address: string;
    phone: string;
    paymentGateway?: string;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  totalQuantity,
  onOrderSuccess,
}) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { profile } = useAppSelector((state) => state.profile);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    pinCode: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'phonepe'>('razorpay');

  // Initialize form with logged-in user profile info
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || profile?.name || '',
        email: prev.email || profile?.email || '',
      }));
      setFormErrors({});
      setErrorMessage(null);
      setIsProcessing(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Please enter your full name (minimum 2 characters)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const phoneClean = formData.phone.trim().replace(/\D/g, '');
    if (!phoneClean || phoneClean.length < 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.address.trim() || formData.address.trim().length < 6) {
      errors.address = 'Please enter your complete delivery address';
    }

    const pinClean = formData.pinCode.trim().replace(/\D/g, '');
    if (!pinClean || pinClean.length !== 6) {
      errors.pinCode = 'Please enter a valid 6-digit PIN code';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!validate()) {
      return;
    }

    // Never open the payment gateway for items the server cannot fulfil.
    // Otherwise the payment succeeds and order creation fails on stock.
    const unavailable = cartItems.find(
      (item) =>
        typeof item.product?.stock === 'number' &&
        item.product.stock < (item.quantity || 1)
    );
    if (unavailable) {
      setErrorMessage(
        `"${unavailable.product.title}" has only ${unavailable.product.stock} left in stock. ` +
          `Please reduce the quantity or remove it from your cart.`
      );
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    if (paymentMethod === 'phonepe') {
      try {
        const redirectUrl = `${window.location.origin}/cart?phonepe=callback`;
        const phoneDigits = formData.phone.trim().replace(/\D/g, '');
        const mobileNumber = phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;

        const res = await createPhonePeOrder({
          amount: subtotal,
          redirectUrl,
          mobileNumber,
          message: `Order payment - ${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`,
        });

        const targetUrl = res?.redirectUrl || res?.data?.redirectUrl;
        const orderId = res?.orderId || res?.data?.orderId;
        const merchantOrderId = res?.merchantOrderId || res?.data?.merchantOrderId;

        if (!targetUrl) {
          throw new Error('Failed to generate PhonePe payment request.');
        }

        // Save pending order details in sessionStorage and localStorage for return callback
        const pendingOrder = {
          merchantOrderId,
          orderId,
          orderPayload: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            pinCode: formData.pinCode.trim(),
            payment: true,
            totalAmount: subtotal,
            products: cartItems.map((item) => ({
              product: item.product._id,
              quantity: item.quantity || 1,
            })),
            phonepeOrderId: orderId,
            paymentGateway: 'phonepe',
          },
        };
        sessionStorage.setItem('pending_phonepe_order', JSON.stringify(pendingOrder));
        localStorage.setItem('pending_phonepe_order', JSON.stringify(pendingOrder));

        // Redirect to PhonePe payment page
        window.location.href = targetUrl;
      } catch (err: any) {
        console.error('PhonePe initialization error:', err);
        setIsProcessing(false);
        setErrorMessage(
          err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'Failed to connect to PhonePe. Please try again or select Razorpay.'
        );
      }
      return;
    }

    try {
      // 1. Ensure Razorpay SDK script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      // 2. Create Razorpay order on backend
      const paymentOrder = await createRazorpayOrder(subtotal);
      if (!paymentOrder || !paymentOrder.orderId) {
        throw new Error('Failed to generate Razorpay order. Please try again.');
      }
      if (!paymentOrder.keyId) {
        throw new Error('Payment gateway key is missing. Please contact support.');
      }

      // 3. Configure Razorpay checkout options (all methods shown by Razorpay)
      const options: RazorpayOptions = {
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || 'INR',
        name: 'Appu Sarees',
        description: `Order Payment for ${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        order_id: paymentOrder.orderId,
        prefill: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          contact: formData.phone.trim(),
        },
        theme: {
          color: '#881337',
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        handler: async (response: RazorpayResponse) => {
          try {
            setIsProcessing(true);

            // 4. Verify payment signature on backend
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 5. Create Order in Database
            const res = await createOrderApi({
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone.trim(),
              address: formData.address.trim(),
              pinCode: formData.pinCode.trim(),
              payment: true,
              totalAmount: subtotal,
              products: cartItems.map((item) => ({
                product: item.product._id,
                quantity: item.quantity || 1,
              })),
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              paymentGateway: 'razorpay',
            });

            // 6. Clear cart state in Redux & invalidate React Query
            dispatch(clearCart());
            queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });

            // 7. Invoke order success callback
            const createdOrder = res.Order;
            onOrderSuccess({
              orderId: createdOrder?._id || response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              totalAmount: subtotal,
              email: formData.email.trim(),
              address: formData.address.trim(),
              phone: formData.phone.trim(),
              paymentGateway: 'razorpay',
            });
            onClose();
          } catch (verifyErr: any) {
            console.error('Payment verification/order error:', verifyErr);
            setErrorMessage(
              verifyErr.response?.data?.error ||
                verifyErr.response?.data?.message ||
                verifyErr.message ||
                `Payment received (ID: ${response.razorpay_payment_id}), but order saving failed. Please contact support.`
            );
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failResponse: any) => {
        console.error('Razorpay payment failed:', failResponse);
        setIsProcessing(false);
        setErrorMessage(
          failResponse?.error?.description || 'Payment was unsuccessful or cancelled. Please try again.'
        );
      });

      rzp.open();
    } catch (err: any) {
      console.error('Razorpay initialization error:', err);
      setIsProcessing(false);
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Could not initiate payment. Please try again.'
      );
    }
  };

  return (
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <div
        className="checkout-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        {/* Modal Header */}
        <div className="checkout-modal-header">
          <div className="checkout-title-wrap">
            <div className="checkout-brand-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              <span>Instant UPI & Card Checkout</span>
            </div>
            <h2 id="checkout-title" className="checkout-modal-title">
              Delivery & Payment
            </h2>
          </div>
          <button
            type="button"
            className="checkout-modal-close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close checkout modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handlePayment} className="checkout-modal-body">
          {errorMessage && (
            <div className="checkout-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Shipping Inputs */}
          <div className="checkout-form-grid">
            {/* Full Name */}
            <div className="checkout-field">
              <label htmlFor="checkout-name">
                Full Name <span className="req">*</span>
              </label>
              <input
                id="checkout-name"
                name="name"
                type="text"
                placeholder="e.g. Priya Sharma"
                value={formData.name}
                onChange={handleChange}
                disabled={isProcessing}
                className={formErrors.name ? 'input-error' : ''}
              />
              {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
            </div>

            {/* Email Address */}
            <div className="checkout-field">
              <label htmlFor="checkout-email">
                Email Address <span className="req">*</span>
              </label>
              <input
                id="checkout-email"
                name="email"
                type="email"
                placeholder="e.g. priya@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isProcessing}
                className={formErrors.email ? 'input-error' : ''}
              />
              {formErrors.email && <span className="field-error-text">{formErrors.email}</span>}
            </div>

            {/* Phone Number */}
            <div className="checkout-field">
              <label htmlFor="checkout-phone">
                Phone Number (for Delivery & OTP) <span className="req">*</span>
              </label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">+91</span>
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isProcessing}
                  className={formErrors.phone ? 'input-error' : ''}
                />
              </div>
              {formErrors.phone && <span className="field-error-text">{formErrors.phone}</span>}
            </div>

            {/* PIN Code */}
            <div className="checkout-field">
              <label htmlFor="checkout-pincode">
                PIN Code <span className="req">*</span>
              </label>
              <input
                id="checkout-pincode"
                name="pinCode"
                type="text"
                maxLength={6}
                placeholder="600001"
                value={formData.pinCode}
                onChange={handleChange}
                disabled={isProcessing}
                className={formErrors.pinCode ? 'input-error' : ''}
              />
              {formErrors.pinCode && <span className="field-error-text">{formErrors.pinCode}</span>}
            </div>

            {/* Complete Address */}
            <div className="checkout-field full-width">
              <label htmlFor="checkout-address">
                Delivery Address <span className="req">*</span>
              </label>
              <textarea
                id="checkout-address"
                name="address"
                rows={2}
                placeholder="Flat / House No, Street, Landmark, City, State"
                value={formData.address}
                onChange={handleChange}
                disabled={isProcessing}
                className={formErrors.address ? 'input-error' : ''}
              />
              {formErrors.address && <span className="field-error-text">{formErrors.address}</span>}
            </div>
          </div>

          {/* Payment Method */}
          <div className="payment-method-section">
            <span className="payment-section-title">Payment Method</span>
            <div className="payment-options-grid">
              <div
                className={`payment-option-card ${paymentMethod === 'razorpay' ? 'selected' : ''}`}
                onClick={() => !isProcessing && setPaymentMethod('razorpay')}
              >
                <div className="payment-option-radio">
                  <span className={`radio-dot ${paymentMethod === 'razorpay' ? 'active' : ''}`}></span>
                </div>
                <div className="payment-option-content">
                  <div className="payment-logo-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                      <line x1="2" y1="10" x2="22" y2="10"></line>
                    </svg>
                    <span className="payment-name">Razorpay</span>
                  </div>
                  <span className="payment-desc">Cards, NetBanking, UPI & Wallets</span>
                </div>
              </div>

              <div
                className={`payment-option-card ${paymentMethod === 'phonepe' ? 'selected' : ''}`}
                onClick={() => !isProcessing && setPaymentMethod('phonepe')}
              >
                <div className="payment-option-radio">
                  <span className={`radio-dot ${paymentMethod === 'phonepe' ? 'active' : ''}`}></span>
                </div>
                <div className="payment-option-content">
                  <div className="payment-logo-wrap">
                    <span className="phonepe-badge-icon">पे</span>
                    <span className="payment-name">PhonePe PG</span>
                    <span className="fast-tag">Fast & Secure</span>
                  </div>
                  <span className="payment-desc">UPI, Cards, QR & NetBanking via PhonePe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="checkout-summary-box">
            <div className="summary-line">
              <span>Items Total ({totalQuantity} {totalQuantity === 1 ? 'saree' : 'sarees'})</span>
              <span className="summary-val">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-line free">
              <span>Delivery Charges</span>
              <span className="summary-val free-text">FREE</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-line grand-total">
              <span>Payable Amount</span>
              <span className="summary-val-highlight">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Badges */}
          <div className="checkout-badges">
            <span className="badge-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              {paymentMethod === 'phonepe' ? 'PhonePe PG Standard Checkout' : 'Secure Razorpay Checkout'}
            </span>
            <span className="badge-item">Cards, NetBanking &amp; UPI</span>
            <span className="badge-item">100% Encrypted</span>
          </div>

          {/* Action Buttons */}
          <div className="checkout-actions">
            <button
              type="button"
              className="checkout-btn-cancel"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`checkout-btn-pay ${paymentMethod === 'phonepe' ? 'btn-phonepe' : ''}`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                  </svg>
                  <span>Connecting to {paymentMethod === 'phonepe' ? 'PhonePe' : 'Razorpay'}...</span>
                </>
              ) : (
                <>
                  {paymentMethod === 'phonepe' ? (
                    <span className="phonepe-btn-icon">पे</span>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  )}
                  <span>
                    Pay ₹{subtotal.toLocaleString('en-IN')} {paymentMethod === 'phonepe' ? 'via PhonePe' : 'securely'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
