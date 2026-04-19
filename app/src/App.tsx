import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { detailHashId } from "@/components/layout/popout";
import { ActivityPage } from "@/pages/ActivityPage";
import { BranchesPage } from "@/pages/BranchesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MergeRequestsPage } from "@/pages/MergeRequestsPage";
import { ReposPage } from "@/pages/ReposPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StandaloneDetailPage } from "@/pages/StandaloneDetailPage";

export default function App() {
  const standaloneRepoId = detailHashId();
  if (standaloneRepoId) {
    return <StandaloneDetailPage repoId={standaloneRepoId} />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/repos" element={<ReposPage />} />
        <Route path="/repos/:repoId" element={<ReposPage />} />
        <Route path="/dirty" element={<ReposPage dirtyOnly />} />
        <Route path="/merge-requests" element={<MergeRequestsPage />} />
        {/* Legacy path — keep working until deep links settle. */}
        <Route path="/pull-requests" element={<Navigate to="/merge-requests" replace />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}
