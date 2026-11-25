import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@mui/material';
import { usefetchProductById, toggleCartProduct } from '../hooks/query';
import { useAppDispatch, useAppSelector } from '../hooks/hoots';
import { addToCartItem, removeFromCartItem } from '../store/profile';
import AllProduct from '../components/Home/AllProduct';
import './Product.css';

export const Product: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // If no specific product id is in the URL, render the AllProduct catalog
  if (!id) {
    return (
      <div className="page-container">
        <AllProduct />
      </div>
    );
  }

  const { data: product, isLoading, isError } = usefetchProductById(id);
  const { profile, token } = useAppSelector((state) => state.profile);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Check if currently in cart
  const isInCart = Boolean(
    profile?.cart?.some(
      (item) =>
        (typeof item.product === 'string'
          ? item.product
          : (item.product as any)?._id) === id
    )
  );

  const handleAddToCart = async () => {
    if (!token && !profile) {
      alert('Please log in to manage your cart.');
      return;
    }

    if (product && typeof product.stock === 'number' && product.stock <= 0) {
      alert('This saree is out of stock.');
      return;
    }

    try {
      setIsUpdating(true);
      const res = await toggleCartProduct(id, 1);
      const isNowInCart = res.inCart;

      if (isNowInCart) {
        dispatch(addToCartItem({ product: id, quantity: 1 }));
      } else {
        dispatch(removeFromCartItem(id));
      }

      queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });
    } catch (err: any) {
      console.error('Cart toggle failed:', err);
      alert(err.response?.data?.message || 'Failed to update cart. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBuyNow = async () => {
    if (!token && !profile) {
      alert('Please log in to continue with checkout.');
      return;
    }

    if (product && typeof product.stock === 'number' && product.stock <= 0) {
      alert('This saree is out of stock.');
      return;
    }

    if (!isInCart) {
      try {
        setIsUpdating(true);
        await toggleCartProduct(id, 1);
        dispatch(addToCartItem({ product: id, quantity: 1 }));
        queryClient.invalidateQueries({ queryKey: ['getCartAllProduct'] });
      } catch (err) {
        console.error('Add to cart failed:', err);
      } finally {
        setIsUpdating(false);
      }
    }
    navigate('/cart?checkout=true');
  };

  if (isLoading) {
    return (
      <div className="product-page-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <Skeleton variant="text" width={220} height={24} />
        </div>
        <div className="product-detail-layout">
          <Skeleton
            variant="rounded"
            width="100%"
            height={520}
            sx={{ borderRadius: '12px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="text" width="85%" height={40} />
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="rounded" width="100%" height={80} sx={{ borderRadius: '10px' }} />
            <Skeleton variant="text" width="50%" height={24} />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Skeleton variant="rounded" width="50%" height={48} sx={{ borderRadius: '8px' }} />
              <Skeleton variant="rounded" width="50%" height={48} sx={{ borderRadius: '8px' }} />
            </div>
            <Skeleton variant="rounded" width="100%" height={100} sx={{ mt: 2, borderRadius: '10px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="product-page-container">
        <div className="product-not-found">
          <h3>Saree Not Found</h3>
          <p>The saree you are looking for does not exist or may have been removed.</p>
          <Link to="/" className="continue-shopping-btn">
            ← Explore Other Sarees
          </Link>
        </div>
      </div>
    );
  }

  const displayPrice =
    product.offer && product.newPrice && product.newPrice > 0
      ? product.newPrice
      : product.price;

  const discountPercent =
    product.offer && product.newPrice && product.price > product.newPrice
      ? Math.round(((product.price - product.newPrice) / product.price) * 100)
      : null;

  return (
    <div className="product-page-container">
      {/* Breadcrumb Navigation */}
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          Home
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/products" className="breadcrumb-link">
          Sarees
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.title}</span>
      </nav>

      {/* Back Button */}
      <button type="button" className="back-btn" onClick={() => navigate(-1)}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back</span>
      </button>

      {/* Main Details Layout */}
      <div className="product-detail-layout">
        {/* Left Column: Image Preview */}
        <div className="product-gallery-section">
          <div className="product-main-image-wrapper">
            {product.images?.url ? (
              <img
                src={product.images.url}
                alt={product.title}
                className="product-main-image"
              />
            ) : (
              <img
                src="https://placehold.co/600x700?text=Saree+Preview"
                alt={product.title}
                className="product-main-image placeholder"
              />
            )}
            {product.tag && <span className="detail-tag-badge">{product.tag}</span>}
            {discountPercent !== null && (
              <span className="detail-discount-badge">{discountPercent}% OFF</span>
            )}
          </div>
        </div>

        {/* Right Column: Saree Details & Ordering */}
        <div className="product-info-section">
          <span className="product-type-label">
            {product.dressType ? `${product.dressType} Collection` : 'Handloom Saree'}
          </span>

          <h1 className="product-detail-title">{product.title}</h1>

          {/* Customer Reviews snippet */}
          <div className="product-rating-row">
            <div className="star-rating">★★★★★</div>
            <span className="rating-score">4.9</span>
            <span className="review-count">(118 verified customer ratings)</span>
          </div>

          {/* Pricing Box */}
          <div className="product-detail-price-box">
            <div className="price-main-row">
              <span className="detail-current-price">
                ₹{displayPrice?.toLocaleString('en-IN')}
              </span>
              {product.offer && product.newPrice && product.newPrice > 0 && (
                <span className="detail-original-price">
                  ₹{product.price?.toLocaleString('en-IN')}
                </span>
              )}
              {discountPercent !== null && (
                <span className="detail-savings">
                  Save ₹{(product.price - product.newPrice!).toLocaleString('en-IN')} ({discountPercent}% OFF)
                </span>
              )}
            </div>
            <span className="tax-included-text">Inclusive of all taxes & duties</span>
          </div>

          {/* Stock Availability */}
          <div className="stock-status-row">
            {product.stock !== undefined && product.stock <= 0 ? (
              <span className="stock-out">✕ Currently Out of Stock</span>
            ) : (
              <span className="stock-in">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                In Stock & Ready to Ship
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="product-actions-section">
            <div className="detail-buttons-row">
              <button
                type="button"
                className={`detail-add-cart-btn ${isInCart ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={isUpdating}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {isUpdating ? (
                  <>
                    <svg
                      className="stepper-spinner"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                      <path d="M12 2a10 10 0 0 1 10 10"></path>
                    </svg>
                    <span>Updating Cart...</span>
                  </>
                ) : isInCart ? (
                  isHovered ? (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span>Remove from Cart</span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Added to Cart</span>
                    </>
                  )
                ) : (
                  <>
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
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="detail-buy-now-btn"
                onClick={handleBuyNow}
                disabled={isUpdating}
              >
                <span>Buy Now</span>
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
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="trust-badges-grid">
            <div className="trust-badge-item">
              <span className="trust-badge-icon">🚚</span>
              <span>Free Delivery across India</span>
            </div>
            <div className="trust-badge-item">
              <span className="trust-badge-icon">✨</span>
              <span>100% Pure Authentic Fabric</span>
            </div>
            <div className="trust-badge-item">
              <span className="trust-badge-icon">🔄</span>
              <span>7 Days Easy Return & Exchange</span>
            </div>
            <div className="trust-badge-item">
              <span className="trust-badge-icon">💳</span>
              <span>Only Online Payment Available</span>
            </div>
          </div>

          {/* Description */}
          <div className="product-description-block">
            <h3 className="description-heading">Saree Details & Description</h3>
            <p className="description-text">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
