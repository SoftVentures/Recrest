import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Info } from "lucide-react";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";

const Section = styled("section")({
  marginBottom: 22,
});

const SectionLabel = styled("h3")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
}));

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
}));

const CardLeft = styled(Box)({ flex: 1, minWidth: 0 });

const CardTitle = styled("div")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

const CardSub = styled("div")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  marginTop: 2,
}));

const InfoBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: 0,
  padding: 0,
  cursor: "help",
  color: theme.palette.text.information,
  "&:hover": { color: theme.palette.text.primary },
}));

const FactRow = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.primary,
  padding: "10px 16px",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  "& strong": {
    fontWeight: 600,
    fontFamily: "inherit",
    color: theme.palette.text.primary,
  },
  "& span": { color: theme.palette.text.information },
}));

const FactsBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  marginTop: 8,
  "& > div + div": { borderTop: `1px solid ${theme.palette.divider}` },
}));

export function StorageSection() {
  const { t } = useTranslation();
  const [crashReporting, setCrashReporting] = useState(false);
  return (
    <Section>
      <SectionLabel>
        {t("settings.storage.diagnostics", { defaultValue: "Diagnostics" })}
      </SectionLabel>
      <Card>
        <CardLeft>
          <CardTitle>
            {t("settings.storage.crash_reporting", { defaultValue: "Crash reporting" })}
            <Tooltip
              title={t("settings.storage.crash_reporting_info", {
                defaultValue:
                  "Crash reports are sent over HTTPS to our error tracker. No personal data is included.",
              })}
              arrow
              placement="top"
            >
              <InfoBtn type="button" aria-label="More info">
                <Info size={11} />
              </InfoBtn>
            </Tooltip>
          </CardTitle>
          <CardSub>
            {t("settings.storage.crash_reporting_sub", {
              defaultValue: "Send anonymised crash reports to help us fix bugs.",
            })}
          </CardSub>
        </CardLeft>
        <GeneralSwitchInput checked={crashReporting} onCheckedChange={setCrashReporting} />
      </Card>

      <FactsBox>
        <FactRow>
          <strong>Operating system:</strong>
          <span>macos 15.0 (x86_64)</span>
        </FactRow>
        <FactRow>
          <strong>Git:</strong>
          <span>2.44.0</span>
          <Tooltip
            title={t("settings.storage.git_info", {
              defaultValue: "Detected system git used by Recrest for shell-out operations.",
            })}
            arrow
            placement="top"
          >
            <InfoBtn type="button" aria-label="More info">
              <Info size={11} />
            </InfoBtn>
          </Tooltip>
        </FactRow>
      </FactsBox>
    </Section>
  );
}
