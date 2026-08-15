import { type ReactNode } from "react";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const Section = styled(Box)({
  marginBottom: pxToRem(22),
}) as typeof Box;

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
})) as typeof Typography;

const SectionSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  margin: pxToRems(2, 0, 10),
})) as typeof Typography;

const SectionHeading = styled(Box)({
  marginBottom: pxToRem(10),
}) as typeof Box;

// The original mocks render every settings field as its own bordered tile
// — `border: 1px solid divider, border-radius: 8` — stacked vertically with
// a small gap. This reads as a list of "config slots" rather than a single
// flat list, which keeps the boundaries between unrelated settings
// (Theme vs. Accent vs. Font) legible even when each row is short.
const Card = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
}) as typeof Box;

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(16),
  padding: pxToRems(14, 16),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

const RowLeft = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const RowLabel = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  color: theme.palette.text.primary,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
})) as typeof Box;

const RowSub = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  marginTop: pxToRem(2),
})) as typeof Box;

const RowRight = styled(Box)({
  flexShrink: 0,
}) as typeof Box;

interface SettingsSectionProps {
  title: string;
  /** Optional short description that sits under the title, explaining what
   *  the section covers. Helpful when the section name on its own is too
   *  terse (e.g. "Design" vs. "Theme, accent, translucency, font size"). */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Optional `data-testid` mirrored onto the outer `<Section component="section">` so Playwright
   *  specs can target a section by name (e.g. `dev-section-build`). */
  testId?: string;
}

export function SettingsSection({ title, subtitle, children, testId }: SettingsSectionProps) {
  return (
    <Section component="section" data-testid={testId}>
      {subtitle ? (
        <SectionHeading>
          <SectionTitle component="h3">{title}</SectionTitle>
          <SectionSubtitle component="p">{subtitle}</SectionSubtitle>
        </SectionHeading>
      ) : (
        <SectionTitle component="h3" style={{ marginBottom: pxToRem(10) }}>
          {title}
        </SectionTitle>
      )}
      <Card>{children}</Card>
    </Section>
  );
}

interface SettingsRowProps {
  label: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
}

export function SettingsRow({ label, sub, children }: SettingsRowProps) {
  return (
    <Row>
      <RowLeft>
        <RowLabel>{label}</RowLabel>
        {sub && <RowSub>{sub}</RowSub>}
      </RowLeft>
      <RowRight>{children}</RowRight>
    </Row>
  );
}
