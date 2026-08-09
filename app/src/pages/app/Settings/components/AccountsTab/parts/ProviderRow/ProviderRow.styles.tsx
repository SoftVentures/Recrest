import { Box, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";

export function GithubGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39s1.97.13 2.89.39c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function GitlabGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="#FC6D26"
        d="m23.6 9.6-.03-.08L20.3.6a.9.9 0 0 0-.84-.6.86.86 0 0 0-.85.6L15.5 9.3H8.5L5.4.6A.86.86 0 0 0 4.55 0a.9.9 0 0 0-.86.6L.43 9.5l-.03.08a6.2 6.2 0 0 0 2.06 7.16l.02.01.03.02 5.08 3.81 2.5 1.9 1.54 1.16a1 1 0 0 0 1.22 0l1.54-1.16 2.5-1.9 5.1-3.83.02-.01A6.2 6.2 0 0 0 23.6 9.6z"
      />
      <path fill="#E24329" d="M12 22.86 14.93 13.7H9.08z" />
      <path fill="#FC6D26" d="M12 22.86 9.08 13.7H4.98z" />
      <path fill="#FCA326" d="m4.98 13.7-.89 2.74a.61.61 0 0 0 .22.68L12 22.85z" />
      <path fill="#E24329" d="M4.98 13.7h4.1L7.32 8.32a.31.31 0 0 0-.6 0z" />
      <path fill="#FC6D26" d="M12 22.86 14.93 13.7h4.1z" />
      <path fill="#FCA326" d="m19.03 13.7.89 2.74a.61.61 0 0 1-.22.68L12 22.86z" />
      <path fill="#E24329" d="M19.03 13.7h-4.1l1.76-5.38a.31.31 0 0 1 .6 0z" />
    </svg>
  );
}

export function BitbucketGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="#2684FF"
        d="M.78 1A.77.77 0 0 0 0 1.92l3.27 19.74a1.05 1.05 0 0 0 1.03.87h15.7a.77.77 0 0 0 .77-.64L24 1.93a.77.77 0 0 0-.77-.92zm13.62 14.21H9.62l-1.3-6.78h7.27z"
      />
    </svg>
  );
}

export const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 10,
})) as typeof Box;

export const TopRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
}) as typeof Box;

export const BrandName = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const StatusPill = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "connected" | "disconnected" | "invalid" | "self-hosted";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "2px 7px",
  borderRadius: 100,
  color:
    tone === "connected"
      ? toneText(theme, StatusTone.SUCCESS)
      : tone === "self-hosted"
        ? toneText(theme, StatusTone.WARNING)
        : tone === "invalid"
          ? toneText(theme, StatusTone.ERROR)
          : theme.palette.text.information,
  backgroundColor:
    tone === "connected"
      ? `color-mix(in srgb, ${theme.palette.success.main} 18%, transparent)`
      : tone === "self-hosted"
        ? `color-mix(in srgb, ${theme.palette.warning.main} 22%, transparent)`
        : tone === "invalid"
          ? `color-mix(in srgb, ${theme.palette.error.main} 20%, transparent)`
          : theme.palette.surface.interface.backElevation,
}));

export const Spacer = styled(Box)({ flex: 1 }) as typeof Box;

export const ActionGroup = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}) as typeof Box;

export const Username = styled(Box)(({ theme }) => ({
  marginTop: 6,
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Box;

export const ApiRow = styled(Box)(({ theme }) => ({
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11.5,
  color: theme.palette.text.information,
  flexWrap: "wrap",
})) as typeof Box;

export const ApiLabel = styled(Typography)({ fontWeight: 500 }) as typeof Typography;

export const ApiCode = styled(Box)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: 11.5,
  padding: "3px 8px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
})) as typeof Box;

export const ApiChange = styled(Box)(({ theme }) => ({
  color: toneText(theme, StatusTone.PRIMARY),
  cursor: "pointer",
  fontSize: 11.5,
  textDecoration: "underline",
  textUnderlineOffset: 2,
  "&:hover": { textDecoration: "none" },
})) as typeof Box;

export const Form = styled(Box)(({ theme }) => ({
  marginTop: 12,
  paddingTop: 12,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.25),
})) as typeof Box;

export const FormHint = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Typography;

export const Field = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
})) as typeof Box;

export const TextInput = styled(TextField)({
  flex: 1,
  minWidth: 0,
  width: "100%",
});

export const InputRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
})) as typeof Box;

export const SaveRow = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
})) as typeof Box;

export const ErrorText = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 12,
  color: toneText(theme, StatusTone.ERROR),
})) as typeof Typography;

export const SuccessText = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 12,
  color: toneText(theme, StatusTone.SUCCESS),
})) as typeof Typography;
