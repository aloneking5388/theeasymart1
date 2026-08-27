import { Skeleton } from "@/components/ui/skeleton";

const SkeletonBanner = () => {
  return (
    <div className="w-full sm:h-100 h-27.5 rounded-sm overflow-hidden">
      <Skeleton className="w-full h-full rounded-sm" />
    </div>
  );
};

export default SkeletonBanner;
