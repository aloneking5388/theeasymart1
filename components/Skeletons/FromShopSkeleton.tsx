import { Skeleton } from "@/components/ui/skeleton";

const FromShopSkeleton = () => {
  return (
    <div className="w-[28%] mt-8 max-md:w-full">
      <div className="pl-4 max-md:pl-0">
        <div className="px-3 rounded-md py-2 font-semibold text-slate-600 bg-slate-200">
          <Skeleton className="h-6 w-[300px]" />
        </div>

        <div className="grid justify-center items-center rounded-md grid-col-1 lg:grid-cols-2 gap-5 mt-3 border p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 max-md:w-[140px]">
              <Skeleton className="w-[300px] h-[200px] rounded-md" />
              <Skeleton className="h-4 w-[130px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[60px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FromShopSkeleton;
