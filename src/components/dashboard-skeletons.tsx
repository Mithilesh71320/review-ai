import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40 bg-[#E7E5E4]" />
          <Skeleton className="h-4 w-72 bg-[#E7E5E4]" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-56 rounded-full bg-[#E7E5E4]" />
          <Skeleton className="h-10 w-10 rounded-lg bg-[#E7E5E4]" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28 bg-[#E7E5E4]" />
                <Skeleton className="h-10 w-20 bg-[#E7E5E4]" />
                <Skeleton className="h-4 w-32 bg-[#E7E5E4]" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full bg-[#E7E5E4]" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm xl:col-span-3">
          <Skeleton className="mb-4 h-6 w-36 bg-[#E7E5E4]" />
          <Skeleton className="h-56 w-full bg-[#E7E5E4]" />
        </Card>
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm xl:col-span-2">
          <Skeleton className="mb-4 h-6 w-44 bg-[#E7E5E4]" />
          <Skeleton className="mx-auto h-36 w-36 rounded-full bg-[#E7E5E4]" />
        </Card>
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36 bg-[#E7E5E4]" />
          <Skeleton className="h-4 w-80 bg-[#E7E5E4]" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-56 rounded-full bg-[#E7E5E4]" />
          <Skeleton className="h-10 w-10 rounded-lg bg-[#E7E5E4]" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm xl:col-span-2">
          <Skeleton className="mb-6 h-10 w-full bg-[#E7E5E4]" />
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-4 border-b border-[#E7E5E4] pb-5 last:border-0">
                <Skeleton className="h-10 w-10 rounded-full bg-[#E7E5E4]" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-48 bg-[#E7E5E4]" />
                  <Skeleton className="h-4 w-full bg-[#E7E5E4]" />
                  <Skeleton className="h-4 w-2/3 bg-[#E7E5E4]" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6 shadow-sm">
          <Skeleton className="mb-4 h-6 w-44 bg-[#E7E5E4]" />
          <div className="space-y-4">
            <Skeleton className="h-28 w-full bg-[#E7E5E4]" />
            <Skeleton className="h-28 w-full bg-[#E7E5E4]" />
            <Skeleton className="h-28 w-full bg-[#E7E5E4]" />
          </div>
        </Card>
      </div>
    </div>
  );
}
