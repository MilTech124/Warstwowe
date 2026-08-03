import { PageHeadingSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";

export default function TeamLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <TableSkeleton rows={4} cols={4} />
    </>
  );
}
