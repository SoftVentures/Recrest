import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { ListItemIcon, Menu, MenuItem } from "@mui/material";

import { AppRoute } from "@recrest/shared";

import { FolderPlus, Info, Search, Settings } from "lucide-react";

import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { SETTINGS_TAB_QUERY_PARAM, SettingsTab } from "@/lib/constants/settings.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setImportDialogOpen, setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

export interface AppMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Shared titlebar app-menu (Add repo / Search / Settings / About). Both the
 * Windows and macOS titlebars render it from their own hamburger button so the
 * entry list lives in exactly one place.
 */
export function AppMenu({ anchorEl, open, onClose }: AppMenuProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const runMenu = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem
        data-testid={TEST_IDS.titlebar.menuAddRepo}
        onClick={runMenu(() => dispatch(setImportDialogOpen(true)))}
      >
        <ListItemIcon>
          <FolderPlus size={15} aria-hidden />
        </ListItemIcon>
        {t("actions.add_repo")}
      </MenuItem>
      <MenuItem
        data-testid={TEST_IDS.titlebar.menuSearch}
        onClick={runMenu(() => dispatch(setSearchOpen(true)))}
      >
        <ListItemIcon>
          <Search size={15} aria-hidden />
        </ListItemIcon>
        {t("actions.search")}
      </MenuItem>
      <MenuItem
        data-testid={TEST_IDS.titlebar.menuSettings}
        onClick={runMenu(() => navigate(AppRoute.SETTINGS))}
      >
        <ListItemIcon>
          <Settings size={15} aria-hidden />
        </ListItemIcon>
        {t("nav.settings")}
      </MenuItem>
      <MenuItem
        data-testid={TEST_IDS.titlebar.menuAbout}
        onClick={runMenu(() =>
          navigate(`${AppRoute.SETTINGS}?${SETTINGS_TAB_QUERY_PARAM}=${SettingsTab.ABOUT}`),
        )}
      >
        <ListItemIcon>
          <Info size={15} aria-hidden />
        </ListItemIcon>
        {t("nav.about")}
      </MenuItem>
    </Menu>
  );
}

export default AppMenu;
