import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { PullRequestsPage } from "@/pages/PullRequestsPage";
import { ReposPage } from "@/pages/ReposPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/repos" replace />} />
        <Route path="/repos" element={<ReposPage />} />
        <Route path="/repos/:repoId" element={<ReposPage />} />
        <Route path="/pull-requests" element={<PullRequestsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}
