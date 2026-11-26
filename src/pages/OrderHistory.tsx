import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { Skeleton } from '@mui/material';
import { useAppSelector } from '../hooks/hoots';
import { useFetchOrderHistory } from '../hooks/query';
import type { OrderDocument } from '../types/order';
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

type OrderFilterKey = 'all' | 'active' | 'shipping' | 'delivered';

const FILTER_TABS: { key: OrderFilterKey; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'active', label: 'Processing' },
  { key: 'shipping', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export const OrderHistory: React.FC = () => {
  const { profile, token } = useAppSelector((state) => state.profile);
  const isAuthenticated = Boolean(token || profile);
  const userId = profile?._id || profile?.firebaseUid;

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchOrderHistory(userId);

  const [activeFilter, setActiveFilter] = useState<OrderFilterKey>('all');

  useEffect(() => {
    document.title = 'Order History | Appu Sarees';
  }, []);

  const openSignInModal = () => {
    window.dispatchEvent(
      new CustomEvent('open-auth-modal', {
        detail: {
          mode: 'login',
          message: 'Please sign in to view your order history and tracking details.',
        },
      })
    );
  };

  const filterCounts = useMemo(() => {
    const counts: Record<OrderFilterKey, number> = {
      all: orders.length,
      active: 0,
      shipping: 0,
      delivered: 0,
    };

    orders.forEach((order) => {
      if (order.delivery_status === 'delivered') {
        counts.delivered += 1;
      } else if (order.delivery_status === 'shipping') {
        counts.shipping += 1;
      } else {
        counts.active += 1;
      }
    });

    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    if (activeFilter === 'delivered') {
      return orders.filter((o) => o.delivery_status === 'delivered');
    }
    if (activeFilter === 'shipping') {
      return orders.filter((o) => o.delivery_status === 'shipping');
    }
    return orders.filter(
      (o) => o.delivery_status !== 'delivered' && o.delivery_status !== 'shipping'
    );
  }, [orders, activeFilter]);

  return (
    <div className="order-history-page page-container">
      <nav className="order-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="order-breadcrumb-link">
          Home
        </Link>
        <span className="order-breadcrumb-sep" aria-hidden="true">
          /
        </span>
        <span className="order-breadcrumb-current" aria-current="page">
          Order History
        </span>
      </nav>

      <header className="order-page-header">
        <div className="order-page-title-row">
          <span className="order-accent-bar" aria-hidden="true" />
          <h1 className="order-page-title">
            Order History
            {isAuthenticated && !isLoading && (
              <span className="order-count-pill">{orders.length}</span>
            )}
          </h1>
        </div>
        <p className="order-page-subtitle">
          Track your handcrafted saree orders, view payment receipts, and inspect delivery updates.
        </p>
        <div className="order-header-divider" aria-hidden="true" />
      </header>

      {!isAuthenticated ? (
        <section className="order-state-card" aria-labelledby="orders-auth-heading">
          <div className="order-state-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 id="orders-auth-heading" className="order-state-title">
            Sign in to view your orders
          </h2>
          <p className="order-state-desc">
            Access your past purchases, track shipments, and open full order receipts anytime.
          </p>
          <div className="order-state-actions">
            <button type="button" className="order-primary-btn" onClick={openSignInModal}>
              Sign In / Register
            </button>
            <Link to="/" className="order-secondary-btn">
              Browse Sarees
            </Link>
          </div>
        </section>
      ) : isLoading || !userId ? (
        <div className="order-skeleton-list" aria-label="Loading orders">
          {[1, 2, 3].map((item) => (
            <div key={item} className="order-card order-card-skeleton">
              <div className="order-card-top">
                <Skeleton variant="text" width={170} height={26} />
                <Skeleton variant="rounded" width={110} height={28} sx={{ borderRadius: '999px' }} />
              </div>
              <div className="order-card-body">
                <Skeleton variant="rounded" width={72} height={88} sx={{ borderRadius: '10px' }} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="75%" height={18} />
                </div>
              </div>
              <div className="order-card-footer">
                <Skeleton variant="text" width={120} height={28} />
                <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <section className="order-state-card" role="alert">
          <div className="order-state-icon is-error" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="order-state-title">Unable to load order history</h2>
          <p className="order-state-desc">
            {(error as AxiosError<{ message?: string }> | null)?.response?.data?.message ||
              'Something went wrong while retrieving your orders. Please try again.'}
          </p>
          <button type="button" className="order-primary-btn" onClick={() => refetch()}>
            Try Again
          </button>
        </section>
      ) : orders.length === 0 ? (
        <section className="order-state-card">
          <div className="order-state-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 className="order-state-title">No orders placed yet</h2>
          <p className="order-state-desc">
            Once you complete a purchase, your orders and delivery status updates will appear here.
          </p>
          <Link to="/" className="order-primary-btn">
            Explore Sarees
          </Link>
        </section>
      ) : (
        <>
          <div className="order-filter-bar" role="tablist" aria-label="Filter orders by delivery status">
            {FILTER_TABS.map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`order-filter-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveFilter(tab.key)}
                >
                  <span>{tab.label}</span>
                  <span className="order-filter-count">{filterCounts[tab.key]}</span>
                </button>
              );
            })}
          </div>

          {filteredOrders.length === 0 ? (
            <section className="order-state-card">
              <h2 className="order-state-title">No matching orders</h2>
              <p className="order-state-desc">
                There are no orders in this status right now.
              </p>
              <button
                type="button"
                className="order-secondary-btn"
                onClick={() => setActiveFilter('all')}
              >
                Show All Orders
              </button>
            </section>
          ) : (
            <ul className="order-list" role="list">
              {filteredOrders.map((order: OrderDocument) => {
                const normalizedItems = (order.products || []).map(normalizeOrderItem);
                const totalUnits = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
                const orderMeta = getOrderStatusMeta(order.status);
                const deliveryMeta = getDeliveryStatusMeta(order.delivery_status);
                const primaryItem = normalizedItems[0];
                const extraCount = normalizedItems.length - 1;

                return (
                  <li key={order._id} className="order-list-item">
                    <article className="order-card">
                      <div className="order-card-top">
                        <div className="order-id-block">
                          <span className="order-id-label">Order</span>
                          <span className="order-id-value">{formatShortOrderId(order._id)}</span>
                          {order.createdAt && (
                            <time className="order-date" dateTime={order.createdAt}>
                              Placed on {formatOrderDate(order.createdAt)}
                            </time>
                          )}
                        </div>

                        <div className="order-badges-group">
                          <span className={`order-status-badge tone-${orderMeta.tone}`}>
                            {orderMeta.label}
                          </span>
                          <span className={`order-status-badge tone-${deliveryMeta.tone}`}>
                            {deliveryMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="order-card-body">
                        <div className="order-thumbs-stack">
                          {normalizedItems.slice(0, 3).map((item, idx) => (
                            <div key={`${order._id}-thumb-${idx}`} className="order-thumb-box">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="order-thumb-img"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="order-thumb-placeholder" aria-hidden="true">
                                  🥻
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="order-summary-info">
                          <h2 className="order-items-headline">
                            {primaryItem ? primaryItem.title : 'Saree Order'}
                            {extraCount > 0 && (
                              <span className="order-more-items">
                                {' '}
                                + {extraCount} more {extraCount === 1 ? 'item' : 'items'}
                              </span>
                            )}
                          </h2>

                          <p className="order-meta-line">
                            <span>
                              {totalUnits} {totalUnits === 1 ? 'piece' : 'pieces'}
                            </span>
                            <span aria-hidden="true">•</span>
                            <span className={order.payment ? 'payment-paid' : 'payment-unpaid'}>
                              {order.payment
                                ? `Paid via ${formatPaymentGateway(order.paymentGateway)}`
                                : 'Payment Pending'}
                            </span>
                          </p>

                          <p className="order-address-preview">
                            Deliver to: {order.address}
                            {order.pinCode ? ` - ${order.pinCode}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="order-card-footer">
                        <div className="order-total-block">
                          <span className="order-total-label">Order Total</span>
                          <span className="order-total-amount">
                            {formatCurrencyINR(order.totalAmount)}
                          </span>
                        </div>

                        <Link
                          to={`/order-history/${order._id}`}
                          state={{ order }}
                          className="order-view-link"
                          aria-label={`View details for order ${formatShortOrderId(order._id)}`}
                        >
                          <span>View Order Details</span>
                          <svg
                            aria-hidden="true"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default OrderHistory;
