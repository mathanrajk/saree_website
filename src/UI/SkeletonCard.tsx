import { Skeleton } from "@mui/material";

 function SkeletonCard() {
  return (
    <div>
      <Skeleton variant="rectangular" width={210} height={160} />
      <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
      <Skeleton variant="text" sx={{ fontSize: "1rem" }} />
      <Skeleton variant="text" sx={{ fontSize: "1rem", width: "60%" }} />
    </div>
  );
}

export default SkeletonCard