import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderSuccessModal.css';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderInfo: {
    orderId: string;
    paymentId: string;
    totalAmount: number;
    email: string;
    address: string;
    phone: string;
    paymentGateway?: string;
  } | null;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderInfo,
}) => {
  const navigate = useNavigate();

  if (!isOpen || !orderInfo) return null;

  const handleContinueShopping = () => {
    onClose();
    navigate('/');
  };

  const handleViewOrder = () => {
    onClose();
    const isObjectId = /^[a-f\d]{24}$/i.test(orderInfo.orderId);
    navigate(isObjectId ? `/order-history/${orderInfo.orderId}` : '/order-history');
  };

  const isPhonePe = orderInfo.paymentGateway === 'phonepe';

  return (
    <div className="order-success-backdrop" onClick={onClose}>
      <div
        className="order-success-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        {/* Animated Celebration Icon */}
        <div className="success-icon-badge">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>

        <h2 id="success-title" className="success-title">
          Payment Successful!
        </h2>
        <p className="success-subtitle">
          Your order has been placed successfully and is being prepared for dispatch.
        </p>

        {/* Order Details Summary */}
        <div className="success-info-table">
          <div className="info-row">
            <span className="info-label">Order ID:</span>
            <span className="info-value copyable">{orderInfo.orderId}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Payment Gateway:</span>
            <span className="info-value">
              {isPhonePe ? 'PhonePe PG' : 'Razorpay'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">
              {isPhonePe ? 'PhonePe Transaction ID:' : 'Razorpay Payment ID:'}
            </span>
            <span className="info-value">{orderInfo.paymentId}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Amount Paid:</span>
            <span className="info-value amount">
              ₹{orderInfo.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Confirmation Sent To:</span>
            <span className="info-value">{orderInfo.email}</span>
          </div>
        </div>

        {/* Note */}
        <div className="success-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>We've dispatched an order receipt with tracking details to your registered email.</span>
        </div>

        {/* Actions */}
        <div className="success-actions">
          <button
            type="button"
            className="continue-shop-btn"
            onClick={handleContinueShopping}
          >
            Explore More Sarees
          </button>
          <button
            type="button"
            className="view-order-history-btn"
            onClick={handleViewOrder}
          >
            View Order History
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessModal;
