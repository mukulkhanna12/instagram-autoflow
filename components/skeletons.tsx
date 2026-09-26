import { Loading, Skeleton } from "@/components/ui/skeleton";

/**
 * Page-shaped loading states. Each mirrors the layout of the page it stands in
 * for, so content drops into place instead of the page jumping when it lands.
 */

function Heading({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: actions }, (_, i) => (
          <Skeleton key={i} className="h-12 w-40 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Loading label="Loading your dashboard" className="p-6 lg:p-8 space-y-5">
      <Heading actions={2} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 space-y-5">
          <Skeleton onDark className="h-4 w-24" />
          <Skeleton onDark className="h-12 w-20" />
          <Skeleton onDark className="h-3.5 w-40" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl p-6 bg-white space-y-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6 rounded-3xl bg-white p-6 space-y-6">
          <Skeleton className="h-5 w-44" />
          <div className="flex items-end gap-3 h-44">
            {[55, 75, 62, 90, 48, 70, 40].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-full" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="xl:col-span-3 rounded-3xl bg-white p-6 space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-12 w-full rounded-full mt-8" />
        </div>
        <div className="xl:col-span-3 rounded-3xl bg-white p-6 space-y-5">
          <Skeleton className="h-5 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <TableSkeleton rows={3} />
    </Loading>
  );
}

/** Analytics: filter row, tabs, headline banner, stat tiles and two chart panels. */
export function AnalyticsSkeleton() {
  return (
    <Loading label="Loading analytics" className="p-6 lg:p-8 space-y-6">
      <Heading actions={0} />
      <div className="flex gap-3">
        <Skeleton className="h-11 w-96 max-w-full rounded-full" />
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
      <div className="flex gap-6 border-b border-gray-200 pb-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="rounded-3xl p-8 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 space-y-4">
        <Skeleton onDark className="h-3 w-28" />
        <Skeleton onDark className="h-8 w-[28rem] max-w-full" />
        <Skeleton onDark className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl p-5 bg-white space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 rounded-3xl bg-white p-6 space-y-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <div className="xl:col-span-4 rounded-3xl bg-white p-6 space-y-5">
          <Skeleton className="h-5 w-28" />
          {[100, 70, 40].map((w) => (
            <Skeleton key={w} className="h-9 rounded-xl" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </Loading>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
      <div className="bg-[#fafbf8] border-b border-gray-200 px-6 py-4 flex gap-10">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14 ml-auto" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-6 py-5 flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-60 max-w-full" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
            <Skeleton className="h-4 w-8 hidden md:block" />
            <Skeleton className="h-4 w-8 hidden md:block" />
            <Skeleton className="h-8 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReelsGridSkeleton() {
  return (
    <Loading label="Loading your reels" className="p-8 space-y-6">
      <Heading />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-3 space-y-2.5">
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-8 w-full rounded-full mt-3" />
            </div>
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Reel editor: flow canvas across the top, step list and message form below. */
export function EditorSkeleton() {
  return (
    <Loading label="Loading this reel's flow" className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-72 max-w-full" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-56 shrink-0 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <FormFields />
      </div>
    </Loading>
  );
}

function FormFields() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-6 space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Settings-style pages: a heading and a stack of form cards. */
export function FormPageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Loading label={label} className="p-8 max-w-4xl space-y-6">
      <Heading />
      <FormFields />
      <FormFields />
    </Loading>
  );
}

/** Upcoming reels: an ordered list of prepared flows. */
export function QueueSkeleton() {
  return (
    <Loading label="Loading your upcoming reels" className="p-8 max-w-4xl space-y-6">
      <Heading />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Trigger builder: editing drawer on the left, canvas on the right. */
export function CanvasSkeleton() {
  return (
    <Loading label="Loading flow" className="flex h-screen">
      <div className="w-[380px] shrink-0 bg-white border-r border-gray-100 p-6 space-y-5">
        <Skeleton className="h-6 w-40" />
        <FormFields />
      </div>
      <div className="flex-1 p-10 flex flex-col items-center gap-8">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-72 rounded-2xl" />
        ))}
      </div>
    </Loading>
  );
}

/** The Instagram account row on Settings. */
export function AccountRowSkeleton() {
  return (
    <Loading label="Loading your Instagram account" className="flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    </Loading>
  );
}

/** Route-change fallback: a heading and neutral panels, for any page. */
export function PageSkeleton() {
  return (
    <Loading label="Loading" className="p-6 lg:p-8 space-y-6">
      <Heading />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl bg-white p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>
    </Loading>
  );
}
