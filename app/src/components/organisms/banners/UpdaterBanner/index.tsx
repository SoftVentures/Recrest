import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setUpdaterBanner } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Bar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  backgroundColor: theme.palette.info.light,
  color: theme.palette.info.dark,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const Message = styled(Typography)({
  flex: 1,
});

function UpdaterBanner() {
  const { t } = useTranslation();
  const banner = useAppSelector((s) => s.ui.updaterBanner);
  const dispatch = useAppDispatch();
  if (!banner) return null;

  return (
    <Bar data-testid={TEST_IDS.updaterBanner.root}>
      <Message variant="body2">
        {t("updater.available")} <Box component="strong">{banner.version}</Box>
        {banner.currentVersion
          ? ` ${t("updater.current", { version: banner.currentVersion })}`
          : ""}
      </Message>
      {banner.canAutoInstall ? (
        <GeneralButton size="sm" variant="default" data-testid={TEST_IDS.updaterBanner.install}>
          {t("updater.install")}
        </GeneralButton>
      ) : (
        <GeneralButton size="sm" variant="outline" data-testid={TEST_IDS.updaterBanner.download}>
          {t("updater.download")}
        </GeneralButton>
      )}
      <GeneralButton
        size="sm"
        variant="ghost"
        onClick={() => dispatch(setUpdaterBanner(null))}
        data-testid={TEST_IDS.updaterBanner.dismiss}
      >
        {t("updater.dismiss")}
      </GeneralButton>
    </Bar>
  );
}

export default UpdaterBanner;
