import { CardSkeleton, PageHeadingSkeleton } from "@/components/dashboard/skeletons";

export default function SettingsLoading() {
  return (
    <>
      <PageHeadingSkeleton />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <CardSkeleton key={index} lines={3} />
          ))}
        </div>
        <CardSkeleton lines={2} />
      </div>
    </>
  );
}
