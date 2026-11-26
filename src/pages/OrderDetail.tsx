import React, { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { Skeleton } from '@mui/material';
import { useFetchOrderById } from '../hooks/query';
import type { OrderDocument, OrderProductInfo } from '../types/order';
import {
  formatCurrencyINR,
  formatOrderDate,
  formatPaymentGateway,
  formatShortOrderId,
  getDeliveryStatusMeta,
  getOrderStatusMeta,
  normalizeOrderItem,
} from '../utils/orderHelpers';
import './OrderHistory.css';
import './OrderDetail.css';

interface LocationState {
  order?: OrderDocument;
}

const PROGRESS_STEPS = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipping', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const getActiveStepIndex = (order: OrderDocument): number => {
  if (order.delivery_status === 'delivered') return 3;
  if (order.delivery_status === 'shipping') return 2;
  if (order.status === 'inProgress' || order.status === 'completed') return 1;
  return 0;
};

export const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateOrder = (location.state as LocationState | null)?.order;

  const {
    data: fetchedOrder,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchOrderById(orderId);

  const order = useMemo<OrderDocument | null>(() => {
    if (fetchedOrder) {
      // If a remote backend returned unpopulated items while router state has populated items, merge them
      if (stateOrder && Array.isArray(stateOrder.products) && Array.isArray(fetchedOrder.products)) {
        const stateProductsById = new Map<string, OrderProductInfo>();
        stateOrder.products.forEach((item) => {
          if (item.product && typeof item.product === 'object' && '_id' in item.product) {
            stateProductsById.set(item.product._id, item.product);
          }
        });

        const mergedProducts = fetchedOrder.products.map((item) => {
          if (typeof item.product === 'string' && stateProductsById.has(item.product)) {
            return { ...item, product: stateProductsById.get(item.product) ?? item.product };
          }
          return item;
        });

        return { ...fetchedOrder, products: mergedProducts };
      }
      return fetchedOrder;
    }
    return stateOrder || null;
  }, [fetchedOrder, stateOrder]);

  useEffect(() => {
    document.title = orderId
      ? `Order ${formatShortOrderId(orderId)} | Appu Sarees`
      : 'Order Details | Appu Sarees';
  }, [orderId]);

  if (isLoading && !order) {
    return (
      <div className="order-detail-page page-container">
        <Skeleton variant="text" width={240} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" width="100%" height={96} sx={{ mb: 3, borderRadius: '16px' }} />
        <div className="order-detail-grid">
          <Skeleton variant="rounded" width="100%" height={320} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rounded" width="100%" height={320} sx={{ borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  if ((isError || !order) && !isLoading) {
    return (
      <div className="order-detail-page page-container">
        <nav className="order-breadcrumb" aria-label="Breadcrumb">
          <Link to="/" className="order-breadcrumb-link">
            Home
          </Link>
          <span className="order-breadcrumb-sep" aria-hidden="true">
            /
          </span>
          <Link to="/order-history" className="order-breadcrumb-link">
            Order History
          </Link>
          <span className="order-breadcrumb-sep" aria-hidden="true">
            /
          </span>
          <span className="order-breadcrumb-current" aria-current="page">
            Order Details
          </span>
        </nav>

        <section className="order-detail-error" role="alert">
          <h1 className="order-detail-error-title">Order Not Found</h1>
          <p className="order-detail-error-desc">
            {(error as AxiosError<{ message?: string }> | null)?.response?.data?.message ||
              'We could not find details for this order. It may have an invalid ID or be temporarily unavailable.'}
          </p>
          <div className="order-detail-error-actions">
            <Link to="/order-history" className="order-primary-btn">
              Back to Order History
            </Link>
            <button type="button" className="order-secondary-btn" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!order) return null;

  const items = (order.products || []).map(normalizeOrderItem);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const orderMeta = getOrderStatusMeta(order.status);
  const deliveryMeta = getDeliveryStatusMeta(order.delivery_status);
  const activeStep = getActiveStepIndex(order);
  const transactionRef = order.razorpayPaymentId || order.phonepeTransactionId || order.phonepeOrderId;

  return (
    <div className="order-detail-page page-container">
      <nav className="order-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="order-breadcrumb-link">
          Home
        </Link>
        <span className="order-breadcrumb-sep" aria-hidden="true">
          /
        </span>
        <Link to="/order-history" className="order-breadcrumb-link">
          Order History
        </Link>
        <span className="order-breadcrumb-sep" aria-hidden="true">
          /
        </span>
        <span className="order-breadcrumb-current" aria-current="page">
          Order {formatShortOrderId(order._id)}
        </span>
      </nav>

      <div className="order-detail-top-actions">
        <button
          type="button"
          className="order-back-btn"
          onClick={() => navigate('/order-history')}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Order History</span>
        </button>
      </div>

      <header className="order-detail-header">
        <div className="order-detail-title-group">
          <h1 className="order-detail-title">Order {formatShortOrderId(order._id)}</h1>
          <p className="order-detail-subtitle">
            <span>ID: {order._id}</span>
            {order.createdAt && (
              <>
                <span aria-hidden="true">•</span>
                <time dateTime={order.createdAt}>
                  Placed {formatOrderDate(order.createdAt, true)}
                </time>
              </>
            )}
          </p>
        </div>

        <div className="order-detail-badges">
          <span className={`order-status-badge tone-${orderMeta.tone}`}>{orderMeta.label}</span>
          <span className={`order-status-badge tone-${deliveryMeta.tone}`}>{deliveryMeta.label}</span>
        </div>
      </header>

      {/* Delivery Progress Tracker */}
      <section className="order-progress-card" aria-label="Order progress">
        <ol className="order-progress-steps" role="list">
          {PROGRESS_STEPS.map((step, index) => {
            const isComplete = index <= activeStep;
            const isCurrent = index === activeStep;

            return (
              <li
                key={step.key}
                className={`progress-step ${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}
              >
                <div className="progress-step-marker" aria-hidden="true">
                  {isComplete ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="progress-step-label">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="order-detail-grid">
        {/* Left Column: Ordered Items */}
        <section className="order-detail-card" aria-labelledby="ordered-items-heading">
          <div className="order-detail-card-head">
            <h2 id="ordered-items-heading" className="order-detail-card-title">
              Ordered Sarees ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})
            </h2>
          </div>

          <ul className="order-items-list" role="list">
            {items.map((item, idx) => {
              const lineTotal =
                item.unitPrice !== null ? item.unitPrice * item.quantity : null;

              return (
                <li key={`${item.productId || 'item'}-${idx}`} className="order-line-item">
                  <div className="order-line-media">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="order-line-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="order-line-placeholder" aria-hidden="true">
                        🥻
                      </div>
                    )}
                  </div>

                  <div className="order-line-info">
                    <div className="order-line-title-row">
                      {item.productId ? (
                        <Link to={`/products/${item.productId}`} className="order-line-title-link">
                          {item.title}
                        </Link>
                      ) : (
                        <span className="order-line-title">{item.title}</span>
                      )}
                      {item.tag && <span className="order-line-tag">{item.tag}</span>}
                    </div>

                    <div className="order-line-meta">
                      <span>Qty: {item.quantity}</span>
                      {item.unitPrice !== null && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span>Unit: {formatCurrencyINR(item.unitPrice)}</span>
                        </>
                      )}
                      {item.originalPrice !== null && (
                        <span className="order-line-original">
                          {formatCurrencyINR(item.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {lineTotal !== null && (
                    <div className="order-line-total">{formatCurrencyINR(lineTotal)}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right Column: Delivery & Payment Summary */}
        <aside className="order-detail-sidebar">
          <section className="order-detail-card" aria-labelledby="delivery-details-heading">
            <div className="order-detail-card-head">
              <h2 id="delivery-details-heading" className="order-detail-card-title">
                Delivery Details
              </h2>
            </div>

            <dl className="order-dl">
              {order.name && (
                <div className="order-dl-row">
                  <dt>Recipient</dt>
                  <dd>{order.name}</dd>
                </div>
              )}
              {order.phone && (
                <div className="order-dl-row">
                  <dt>Phone</dt>
                  <dd>{order.phone}</dd>
                </div>
              )}
              {order.email && (
                <div className="order-dl-row">
                  <dt>Email</dt>
                  <dd>{order.email}</dd>
                </div>
              )}
              <div className="order-dl-row">
                <dt>Address</dt>
                <dd>{order.address}</dd>
              </div>
              <div className="order-dl-row">
                <dt>PIN Code</dt>
                <dd>{order.pinCode}</dd>
              </div>
            </dl>
          </section>

          <section className="order-detail-card" aria-labelledby="payment-summary-heading">
            <div className="order-detail-card-head">
              <h2 id="payment-summary-heading" className="order-detail-card-title">
                Payment Summary
              </h2>
            </div>

            <dl className="order-dl">
              <div className="order-dl-row">
                <dt>Payment Status</dt>
                <dd className={order.payment ? 'payment-paid' : 'payment-unpaid'}>
                  {order.payment ? 'Paid' : 'Pending'}
                </dd>
              </div>
              <div className="order-dl-row">
                <dt>Method</dt>
                <dd>{formatPaymentGateway(order.paymentGateway)}</dd>
              </div>
              {transactionRef && (
                <div className="order-dl-row">
                  <dt>Transaction ID</dt>
                  <dd className="order-mono-val">{transactionRef}</dd>
                </div>
              )}
              <div className="order-dl-row">
                <dt>Shipping</dt>
                <dd className="payment-paid">FREE</dd>
              </div>
              <div className="order-dl-row is-total">
                <dt>Grand Total</dt>
                <dd className="order-grand-total">{formatCurrencyINR(order.totalAmount)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetail;
