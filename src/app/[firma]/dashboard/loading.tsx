import { CardSkeleton, MetricGridSkeleton, PageHeadingSkeleton } from "@/components/dashboard/skeletons";

export default function DashboardLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <MetricGridSkeleton />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <CardSkeleton lines={1} height="13rem" />
        <CardSkeleton lines={5} />
      </div>
    </>
  );
}
