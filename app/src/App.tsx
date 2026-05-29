import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppRoute } from "@recrest/shared";

import { AppLayout } from "@/layouts/AppLayout";
import ActivityPage from "@/pages/app/Activity";
import BranchesPage from "@/pages/app/Branches";
import ChangesPage from "@/pages/app/Changes";
import DashboardPage from "@/pages/app/Dashboard";
import MergeRequestsPage from "@/pages/app/MergeRequests";
import MrDetailPage from "@/pages/app/MrDetail";
import RepoDetailPage from "@/pages/app/RepoDetail";
import ReposPage from "@/pages/app/Repos";
import SettingsPage from "@/pages/app/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={AppRoute.ROOT} element={<Navigate to={AppRoute.DASHBOARD} replace />} />
          <Route path={AppRoute.DASHBOARD} element={<DashboardPage />} />
          <Route path={AppRoute.REPOS} element={<ReposPage />} />
          <Route path={AppRoute.REPOS_WITH_ID} element={<ReposPage />} />
          <Route path={AppRoute.REPO} element={<RepoDetailPage />} />
          <Route path={AppRoute.CHANGES} element={<ChangesPage />} />
          <Route path={AppRoute.MERGE_REQUESTS} element={<MergeRequestsPage />} />
          <Route path={AppRoute.MR} element={<MrDetailPage />} />
          <Route
            path={AppRoute.MERGE_REQUESTS_LEGACY}
            element={<Navigate to={AppRoute.MERGE_REQUESTS} replace />}
          />
          <Route path={AppRoute.BRANCHES} element={<BranchesPage />} />
          <Route path={AppRoute.ACTIVITY} element={<ActivityPage />} />
          <Route path={AppRoute.SETTINGS} element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={AppRoute.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
