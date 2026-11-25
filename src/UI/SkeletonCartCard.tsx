import { Skeleton } from "@mui/material";

function SkeletonCartCard() {
  return (
    <div className="cart-item-card">
      {/* Product Image Skeleton */}
      <Skeleton
        variant="rounded"
        width={110}
        height={130}
        sx={{ borderRadius: "8px", flexShrink: 0 }}
      />

      {/* Product Details Skeleton */}
      <div className="cart-item-info">
        {/* Title and Remove Button */}
        <div className="cart-item-header">
          <Skeleton variant="text" width="55%" height={26} />
          <Skeleton variant="circular" width={24} height={24} />
        </div>

        {/* Description */}
        <Skeleton variant="text" width="90%" height={18} sx={{ mt: 0.5 }} />
        <Skeleton variant="text" width="70%" height={18} />

        {/* Footer: Price & Quantity Stepper */}
        <div className="cart-item-footer" style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
          <div className="cart-item-prices">
            <Skeleton variant="text" width={90} height={28} />
            <Skeleton variant="text" width={110} height={20} />
          </div>

          <Skeleton
            variant="rounded"
            width={96}
            height={32}
            sx={{ borderRadius: "8px" }}
          />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCartCard;
