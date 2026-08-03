import { CardSkeleton, MetricGridSkeleton, PageHeadingSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";

export default function BillingLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <MetricGridSkeleton count={3} />
      <div className="grid gap-4">
        <CardSkeleton lines={4} />
        <TableSkeleton rows={5} cols={5} />
      </div>
    </>
  );
}
