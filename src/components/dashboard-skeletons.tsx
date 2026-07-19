import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  // Neutral slate bones — industry-agnostic
  const bone = "bg-slate-200";
  const card = "border-slate-200 bg-white";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className={`h-6 w-40 rounded-full ${bone}`} />
          <Skeleton className={`h-9 w-48 ${bone}`} />
          <Skeleton className={`h-4 w-80 ${bone}`} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className={`h-10 w-36 rounded-full ${bone}`} />
          <Skeleton className={`h-10 w-56 rounded-full ${bone}`} />
          <Skeleton className={`h-10 w-10 rounded-full ${bone}`} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className={`overflow-hidden rounded-3xl p-6 lg:col-span-4 ${card}`}>
          <Skeleton className={`mb-6 h-4 w-28 ${bone}`} />
          <Skeleton className={`mb-3 h-16 w-28 ${bone}`} />
          <Skeleton className={`mb-4 h-4 w-36 ${bone}`} />
          <Skeleton className={`h-4 w-full ${bone}`} />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className={`rounded-2xl p-5 shadow-none ${card}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <Skeleton className={`h-3 w-24 ${bone}`} />
                  <Skeleton className={`h-9 w-16 ${bone}`} />
                  <Skeleton className={`h-3 w-32 ${bone}`} />
                </div>
                <Skeleton className={`h-11 w-11 rounded-xl ${bone}`} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className={`rounded-3xl p-6 xl:col-span-3 ${card}`}>
          <Skeleton className={`mb-4 h-6 w-36 ${bone}`} />
          <Skeleton className={`h-60 w-full rounded-2xl ${bone}`} />
        </Card>
        <Card className={`rounded-3xl p-6 xl:col-span-2 ${card}`}>
          <Skeleton className={`mb-4 h-6 w-40 ${bone}`} />
          <Skeleton className={`mx-auto h-40 w-40 rounded-full ${bone}`} />
          <div className="mt-6 space-y-2">
            <Skeleton className={`h-9 w-full rounded-xl ${bone}`} />
            <Skeleton className={`h-9 w-full rounded-xl ${bone}`} />
            <Skeleton className={`h-9 w-full rounded-xl ${bone}`} />
          </div>
        </Card>
      </div>

      <Card className={`overflow-hidden rounded-3xl p-0 ${card}`}>
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <Skeleton className={`h-6 w-40 ${bone}`} />
        </div>
        <div className="space-y-0 divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-4 px-6 py-4">
              <Skeleton className={`h-10 w-10 rounded-xl ${bone}`} />
              <div className="flex-1 space-y-2">
                <Skeleton className={`h-4 w-48 ${bone}`} />
                <Skeleton className={`h-4 w-full ${bone}`} />
              </div>
            </div>
          ))}
        </div>
      </Card>
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
