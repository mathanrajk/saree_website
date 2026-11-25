import { Skeleton } from "@mui/material";

function SkeletonCardLatest() {
  return (
    <div className="skeleton-latest-card">
      <Skeleton
        variant="rectangular"
        className="skeleton-latest-image"
        sx={{ width: 135, height: "100%", borderRadius: 0 }}
      />
      <div className="skeleton-latest-content">
        <Skeleton variant="text" width="40%" height={16} />
        <Skeleton variant="text" width="85%" height={22} />
        <Skeleton variant="text" width="65%" height={16} />
        <div className="skeleton-latest-bottom">
          <Skeleton variant="text" width="45%" height={24} />
          <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: "6px" }} />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCardLatest;
