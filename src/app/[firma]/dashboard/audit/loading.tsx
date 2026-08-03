import { PageHeadingSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";

export default function AuditLoading() {
  return (
    <>
      <PageHeadingSkeleton withActions={false} />
      <TableSkeleton rows={10} cols={4} />
    </>
  );
}
