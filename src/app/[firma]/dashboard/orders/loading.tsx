import { PageHeadingSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";

export default function OrdersLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableSkeleton rows={8} cols={6} />
    </>
  );
}
