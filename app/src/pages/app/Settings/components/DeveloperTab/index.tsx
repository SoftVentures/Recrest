import { Box } from "@mui/material";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import BuildSection from "@/pages/app/Settings/components/DeveloperTab/sections/BuildSection";
import FactoryResetSection from "@/pages/app/Settings/components/DeveloperTab/sections/FactoryResetSection";
import FeatureFlagsSection from "@/pages/app/Settings/components/DeveloperTab/sections/FeatureFlagsSection";
import I18nSection from "@/pages/app/Settings/components/DeveloperTab/sections/I18nSection";
import IpcSection from "@/pages/app/Settings/components/DeveloperTab/sections/IpcSection";
import NotificationsPlaygroundSection from "@/pages/app/Settings/components/DeveloperTab/sections/NotificationsPlaygroundSection";
import StorageSection from "@/pages/app/Settings/components/DeveloperTab/sections/StorageSection";
import UpdaterPlaygroundSection from "@/pages/app/Settings/components/DeveloperTab/sections/UpdaterPlaygroundSection";

export function DeveloperTab() {
  return (
    <Box data-testid={TEST_IDS.settings.developer.tab}>
      <BuildSection />
      <UpdaterPlaygroundSection />
      <NotificationsPlaygroundSection />
      <StorageSection />
      <IpcSection />
      <I18nSection />
      <FeatureFlagsSection />
      <FactoryResetSection />
    </Box>
  );
}

export default DeveloperTab;
