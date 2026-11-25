import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../hooks/hoots";
import { addToCartItem, removeFromCartItem } from "../../store/profile";
import { checkIsCartProduct, toggleCartProduct } from "../../hooks/query";
import "./Card.css";

export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  newPrice?: number;
  offer: boolean;
  tag?: string;
  dressType?: string;
  stock?: number;
  images?: {
    publicId?: string;
    url?: string;
  };
}

interface CardProps {
  product: Product;
  onAddToCart?: (product: Product, inCart: boolean) => void;
}

function Card({ product, onAddToCart }: CardProps) {
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
      alert("Please login to manage your cart.");
      return;
    }

    try {
      setIsLoading(true);

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

      // 4. Invalidate React Query cache for cart page
      queryClient.invalidateQueries({ queryKey: ["getCartAllProduct"] });
      queryClient.invalidateQueries({ queryKey: ["getAllProduct"] });

      // 5. Optional parent callback
      if (onAddToCart) {
        onAddToCart(product, isNowInCart);
      }
    } catch (error: any) {
      console.error("Cart action failed:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to update cart. Please try again.";
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="product-card">
      <Link to={`/products/${product._id}`} className="product-card-link">
        <div className="product-image-container">
          {product.images?.url ? (
            <img
              src={product.images.url}
              alt={product.title}
              className="product-image"
            />
          ) : (
            <img
              src="https://placehold.co/300x300?text=No+Image"
              alt={product.title}
              className="product-image placeholder"
            />
          )}
          {product.tag && <span className="product-tag">{product.tag}</span>}
          {discountPercent !== null && (
            <span className="product-discount-badge">{discountPercent}% OFF</span>
          )}
        </div>

        <div className="product-content">
          <h3 className="product-title" title={product.title}>
            {product.title}
          </h3>
          <p className="product-description" title={product.description}>
            {product.description}
          </p>

          <div className="product-price-section">
            <span className="current-price">
              ₹{displayPrice?.toLocaleString("en-IN")}
            </span>
            {product.offer && product.newPrice && (
              <span className="original-price">
                ₹{product.price?.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="product-card-actions">
        <button
          type="button"
          className={`add-to-cart-btn ${inCart ? "added" : ""} ${isLoading ? "loading" : ""}`}
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
                className="cart-spinner"
                width="18"
                height="18"
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
              <span>Add Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Card;
