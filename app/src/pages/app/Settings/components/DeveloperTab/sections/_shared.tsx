import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";

export const ButtonRow = styled(Box)({
  display: "inline-flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const TextInput = styled("input")(({ theme }) => ({
  height: 30,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: MONO_STACK,
  outline: "none",
  "&::placeholder": { color: theme.palette.text.informationLight },
  "&:focus": { borderColor: theme.palette.border.hover },
}));

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const SelectNative = styled("select")(({ theme }) => ({
  height: 30,
  padding: "0 8px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
}));

export const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { borderBottom: 0 },
})) as typeof Box;

export const FactKey = styled(Box)(({ theme }) => ({
  flex: 1,
  fontSize: 12.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
})) as typeof Box;

export const FactVal = styled(Box)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: 12,
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
})) as typeof Box;

export const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  marginBottom: 18,
})) as typeof Box;

export const InlineLabel = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.secondary,
})) as typeof Typography;

export const SectionHeading = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
})) as typeof Typography;

export const SectionWrap = styled(Box)({
  marginBottom: 22,
}) as typeof Box;

const PathRowBody = styled(Box)({ flex: 1, minWidth: 0 }) as typeof Box;

const PathRowVal = styled(FactVal)({
  display: "block",
  marginTop: 2,
  wordBreak: "break-all",
});

interface PathRowProps {
  label: string;
  path: string | null;
}

export function PathRow({ label, path }: PathRowProps) {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const copyFeedback = useActionFeedback();
  const dash = "—";
  return (
    <FactRow>
      <PathRowBody>
        <FactKey>{label}</FactKey>
        <PathRowVal>{path ?? dash}</PathRowVal>
      </PathRowBody>
      <ButtonRow>
        <GeneralButton
          size="sm"
          variant="outline"
          disabled={!path}
          feedbackState={copyFeedback.state}
          onClick={() => {
            if (!path) return;
            void copyFeedback
              .run(async () => {
                await navigator.clipboard?.writeText(path);
              })
              .catch(() => {
                /* feedback hook already reflects the failure */
              });
          }}
        >
          {t("developer.build.copy")}
        </GeneralButton>
        <GeneralButton size="sm" variant="outline" disabled={!path}>
          {t("developer.build.open")}
        </GeneralButton>
      </ButtonRow>
    </FactRow>
  );
}
