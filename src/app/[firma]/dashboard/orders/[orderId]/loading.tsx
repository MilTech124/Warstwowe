import { CardSkeleton, PageHeadingSkeleton } from "@/components/dashboard/skeletons";

export default function OrderDetailLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={6} />
        </div>
        <div className="grid gap-4">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </>
  );
}
