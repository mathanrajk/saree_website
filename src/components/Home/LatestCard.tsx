import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../hooks/hoots";
import { addToCartItem, removeFromCartItem } from "../../store/profile";
import { checkIsCartProduct, toggleCartProduct } from "../../hooks/query";
import { LoginPromptModal } from "../../UI/LoginPromptModal";
import "./LatestCard.css";

export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  newPrice?: number;
  offer: boolean;
  tag?: string;
  images?: {
    publicId?: string;
    url?: string;
  };
}

interface LatestCardProps {
  product: Product;
  onAddToCart?: (product: Product, inCart: boolean) => void;
}

function LatestCard({ product, onAddToCart }: LatestCardProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { profile, token } = useAppSelector((state) => state.profile);

  // Check if product is in cart from Redux profile state
  const isInProfileCart = Boolean(
    profile?.cart?.some(
      (item) =>
        (typeof item.product === "string"
          ? item.product
          : (item.product as any)?._id) === product._id
    )
  );

  const [inCart, setInCart] = useState<boolean>(isInProfileCart);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with Redux profile state whenever it changes
  useEffect(() => {
    setInCart(isInProfileCart);
  }, [isInProfileCart]);

  // Once mounted, check backend endpoint /iscart/:productId if user is authenticated
  useEffect(() => {
    let isMounted = true;
    if (token || profile) {
      checkIsCartProduct(product._id).then((status) => {
        if (isMounted) {
          setInCart(status);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [product._id, token, profile]);

  const displayPrice =
    product.offer && product.newPrice ? product.newPrice : product.price;

  const discountPercent =
    product.offer && product.newPrice && product.price > product.newPrice
      ? Math.round(((product.price - product.newPrice) / product.price) * 100)
      : null;

  // When clicking the Add Cart button:
  const handleAddToCart = async () => {
    if (!token && !profile) {
      setShowLoginModal(true);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. Call POST /cart/:productId
      const result = await toggleCartProduct(product._id, 1);
      const isNowInCart = result.inCart;

      // 2. Update local state
      setInCart(isNowInCart);

      // 3. Update Redux store so Navbar cart badge reflects immediately
      if (isNowInCart) {
        dispatch(addToCartItem({ product: product._id, quantity: 1 }));
      } else {
        dispatch(removeFromCartItem(product._id));
      }

      // 4. Invalidate React Query cache for cart page and products
      queryClient.invalidateQueries({ queryKey: ["getCartAllProduct"] });
      queryClient.invalidateQueries({ queryKey: ["getAllProduct"] });
      queryClient.invalidateQueries({ queryKey: ["getLatestProduct"] });

      // 5. Optional parent callback
      if (onAddToCart) {
        onAddToCart(product, isNowInCart);
      }
    } catch (error: any) {
      console.error("Cart action failed:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to update cart. Please try again.";
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="latest-card">
      <Link to={`/products/${product._id}`} className="latest-image-link">
        <div className="latest-image-container">
          {product.images?.url ? (
            <img
              src={product.images.url}
              alt={product.title}
              className="latest-image"
            />
          ) : (
            <img
              src="https://placehold.co/300x300?text=No+Image"
              alt={product.title}
              className="latest-image placeholder"
            />
          )}

          {/* New Drop Badge */}
          <span className="latest-new-badge">✨ NEW</span>

          {/* Discount Badge */}
          {discountPercent !== null && (
            <span className="latest-discount-badge">{discountPercent}% OFF</span>
          )}
        </div>
      </Link>

      <div className="latest-info-column">
        <Link to={`/products/${product._id}`} className="latest-text-link">
          {product.tag && <span className="latest-tag">{product.tag}</span>}
          <h3 className="latest-title" title={product.title}>
            {product.title}
          </h3>
          <p className="latest-description" title={product.description}>
            {product.description}
          </p>

          <div className="latest-price-section">
            <span className="latest-current-price">
              ₹{displayPrice?.toLocaleString("en-IN")}
            </span>
            {product.offer && product.newPrice && (
              <span className="latest-original-price">
                ₹{product.price?.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </Link>

        <div className="latest-card-actions">
          <button
            type="button"
            className={`latest-add-to-cart-btn ${inCart ? "added" : ""} ${isLoading ? "loading" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={isLoading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={
              inCart
                ? `Remove ${product.title} from cart`
                : `Add ${product.title} to cart`
            }
          >
            {isLoading ? (
              <>
                <svg
                  className="latest-cart-spinner"
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
                <span>Updating...</span>
              </>
            ) : inCart ? (
              isHovered ? (
                <>
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
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Remove</span>
                </>
              ) : (
                <>
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
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>In Cart</span>
                </>
              )
            ) : (
              <>
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
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span>Add Cart</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="card-error-notice" role="alert">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        productTitle={product.title}
      />
    </div>
  );
}

export default LatestCard;
