import { DashboardTopSkeleton, TableSkeleton } from "../components/shared/data-skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <DashboardTopSkeleton />
      <TableSkeleton />
    </div>
  );
}
