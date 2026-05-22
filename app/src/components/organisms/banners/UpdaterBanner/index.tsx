import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
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
  const banner = useAppSelector((s) => s.ui.updaterBanner);
  const dispatch = useAppDispatch();
  if (!banner) return null;

  return (
    <Bar data-testid="updater-banner">
      <Message variant="body2">
        A new version is available: <strong>{banner.version}</strong>
        {banner.currentVersion ? ` (current ${banner.currentVersion})` : ""}
      </Message>
      {banner.canAutoInstall ? (
        <GeneralButton size="sm" variant="default" data-testid="updater-banner-install">
          Install &amp; restart
        </GeneralButton>
      ) : (
        <GeneralButton size="sm" variant="outline" data-testid="updater-banner-download">
          Download
        </GeneralButton>
      )}
      <GeneralButton
        size="sm"
        variant="ghost"
        onClick={() => dispatch(setUpdaterBanner(null))}
        data-testid="updater-banner-dismiss"
      >
        Dismiss
      </GeneralButton>
    </Bar>
  );
}

export default UpdaterBanner;
