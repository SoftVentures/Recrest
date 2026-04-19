import { Navigate, Route, Routes } from "react-router-dom";

import { AppRoute } from "@recrest/shared";

import { AppShell } from "@/components/organisms/layout/AppShell";
import { ActivityPage } from "@/pages/ActivityPage";
import { BranchesPage } from "@/pages/BranchesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MergeRequestsPage } from "@/pages/MergeRequestsPage";
import { RepoDetailPage } from "@/pages/RepoDetailPage";
import { ReposPage } from "@/pages/ReposPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path={AppRoute.ROOT} element={<Navigate to={AppRoute.DASHBOARD} replace />} />
        <Route path={AppRoute.DASHBOARD} element={<DashboardPage />} />
        <Route path={AppRoute.REPOS} element={<ReposPage />} />
        <Route path={AppRoute.REPOS_WITH_ID} element={<ReposPage />} />
        <Route path={AppRoute.REPO} element={<RepoDetailPage />} />
        <Route path={AppRoute.CHANGES} element={<ReposPage dirtyOnly />} />
        <Route path={AppRoute.MERGE_REQUESTS} element={<MergeRequestsPage />} />
        {/* Legacy path — keep working until deep links settle. */}
        <Route
          path={AppRoute.MERGE_REQUESTS_LEGACY}
          element={<Navigate to={AppRoute.MERGE_REQUESTS} replace />}
        />
        <Route path={AppRoute.BRANCHES} element={<BranchesPage />} />
        <Route path={AppRoute.ACTIVITY} element={<ActivityPage />} />
        <Route path={AppRoute.SETTINGS} element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}
