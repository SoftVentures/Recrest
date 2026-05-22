import ReposPage from "@/pages/app/Repos";

/**
 * `/changes` is the dirty-only view of the Repos page (matches src-old's
 * `<ReposPage dirtyOnly />`). The wrapper exists so router-import paths
 * stay one-to-one with the page folder layout.
 */
export default function ChangesPage() {
  return <ReposPage dirtyOnly />;
}
