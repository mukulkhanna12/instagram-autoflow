import { PageSkeleton } from "@/components/skeletons";

/** Shown while a page in the app is being fetched on navigation. */
export default function AppLoading() {
  return <PageSkeleton />;
}
