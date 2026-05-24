import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { FolderGit2, GitBranch, Plus } from "lucide-react";

import {
  Badge,
  Body,
  Header,
  HeaderIcon,
  TabBar,
  TabButton,
} from "@/components/molecules/modals/AddRepoModal/AddRepoModal.styles";
import ClonePanel from "@/components/molecules/modals/AddRepoModal/panels/ClonePanel";
import LocalPanel from "@/components/molecules/modals/AddRepoModal/panels/LocalPanel";
import ProvidersPanel from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { PROVIDER_IDS } from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setImportDialogOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type Tab = "providers" | "local" | "clone";

export default function AddRepoModal() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.importDialogOpen);
  const connections = useAppSelector((s) => s.providers.connections);
  const connectedProviders = useMemo(
    () => PROVIDER_IDS.filter((id) => connections[id]?.connected),
    [connections],
  );

  const [tab, setTab] = useState<Tab>("providers");

  useEffect(() => {
    if (!open) return;
    setTab(connectedProviders.length > 0 ? "providers" : "local");
  }, [open, connectedProviders.length]);

  const close = useCallback(() => {
    dispatch(setImportDialogOpen(false));
  }, [dispatch]);

  return (
    <GeneralModal
      open={open}
      onCloseModal={close}
      modalWidth={880}
      modalHeight={640}
      textCapitalize={false}
      data-testid={TEST_IDS.addRepoDialog.root}
      customTitle={
        <Header>
          <HeaderIcon>
            <Plus size={20} />
          </HeaderIcon>
          {t("import.title")}
        </Header>
      }
      subtitle={t("import.desc")}
      contentChildren={
        <>
          <TabBar role="tablist">
            <TabButton
              type="button"
              active={tab === "providers"}
              onClick={() => setTab("providers")}
              data-testid={TEST_IDS.addRepoDialog.tab.providers}
            >
              <FolderGit2 size={13} />
              {t("import.tab.providers")}
              {connectedProviders.length > 0 && (
                <Badge active={tab === "providers"}>{connectedProviders.length}</Badge>
              )}
            </TabButton>
            <TabButton
              type="button"
              active={tab === "local"}
              onClick={() => setTab("local")}
              data-testid={TEST_IDS.addRepoDialog.tab.local}
            >
              <FolderGit2 size={13} />
              {t("import.tab.local")}
            </TabButton>
            <TabButton
              type="button"
              active={tab === "clone"}
              onClick={() => setTab("clone")}
              data-testid={TEST_IDS.addRepoDialog.tab.clone}
            >
              <GitBranch size={13} />
              {t("import.tab.clone")}
            </TabButton>
          </TabBar>

          <Body>
            {tab === "providers" ? (
              <ProvidersPanel connectedProviders={connectedProviders} onClose={close} />
            ) : tab === "local" ? (
              <LocalPanel onClose={close} />
            ) : (
              <ClonePanel onClose={close} />
            )}
          </Body>
        </>
      }
    />
  );
}
