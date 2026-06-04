import { Card } from "./ui-kit";

type SkeletonProps = {
  className?: string;
};

const SkeletonLine = ({ className = "" }: SkeletonProps) => (
  <div className={`h-3 rounded-full bg-slate-200/80 ${className}`} />
);

export function DashboardTopSkeleton() {
  return (
    <section className="grid items-stretch gap-4 xl:grid-cols-[1.05fr_0.95fr_0.75fr]" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <Card key={item} className="p-5">
          <div className="animate-pulse space-y-5">
            <SkeletonLine className="w-28" />
            <SkeletonLine className={item === 0 ? "h-14 w-36" : "h-8 w-44"} />
            <div className="space-y-2">
              <SkeletonLine className="w-full" />
              <SkeletonLine className="w-4/5" />
              <SkeletonLine className="w-2/3" />
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden" aria-busy="true">
      <div className="animate-pulse">
        <div className="grid grid-cols-6 gap-3 border-b border-slate-100 bg-slate-50 p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonLine key={index} className="h-2" />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid grid-cols-6 gap-3 p-3">
              <SkeletonLine className="col-span-2" />
              <SkeletonLine />
              <SkeletonLine />
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ChartGridSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="animate-pulse space-y-4">
            <SkeletonLine className="w-40" />
            <SkeletonLine className="w-64" />
            <div className="h-64 rounded-lg border border-slate-100 bg-slate-100/80" />
          </div>
        </Card>
      ))}
    </section>
  );
}

export function MetadataSkeleton() {
  return (
    <Card className="p-5" aria-busy="true">
      <div className="animate-pulse space-y-4">
        <SkeletonLine className="w-48" />
        <div className="grid gap-3 md:grid-cols-3">
          <SkeletonLine className="h-16" />
          <SkeletonLine className="h-16" />
          <SkeletonLine className="h-16" />
        </div>
      </div>
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_0.48fr]" aria-busy="true">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="animate-pulse space-y-4">
            <SkeletonLine className="w-40" />
            <div className="grid gap-4 lg:grid-cols-3">
              <SkeletonLine className="h-28" />
              <SkeletonLine className="h-28" />
              <SkeletonLine className="h-28" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="animate-pulse space-y-4">
            <SkeletonLine className="w-52" />
            <div className="h-72 rounded-lg bg-slate-100" />
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <div className="animate-pulse space-y-4">
          <SkeletonLine className="w-32" />
          <SkeletonLine className="h-16 w-40" />
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-2/3" />
        </div>
      </Card>
    </section>
  );
}
