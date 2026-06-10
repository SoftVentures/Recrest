import { Box, Typography } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Living-doc story that prints every token in `theme.palette` as a labelled
 * swatch, grouped by section. Switch theme via the toolbar paintbrush to
 * cross-check parity across `light`, `dark`, `oled`, and `glassy`. Add a new
 * section here whenever `mui.d.ts` grows a new palette branch — the surface is
 * intentionally manual so missing tokens show up as "undefined" instead of
 * disappearing silently.
 */

const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
  padding: theme.spacing(3),
  background: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
}));

const Section = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

const SectionTitle = styled(Typography)({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  opacity: 0.7,
}) as typeof Typography;

const Grid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: theme.spacing(1.5),
}));

const Card = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
  padding: theme.spacing(1),
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.surface.interface.background,
}));

interface ChipProps {
  background: string;
}

const Chip = styled(Box, {
  shouldForwardProp: (p) => p !== "background",
})<ChipProps>(({ background, theme }) => ({
  height: 48,
  borderRadius: theme.spacing(0.75),
  background,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
}));

const Label = styled(Typography)({
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.2,
  wordBreak: "break-word",
}) as typeof Typography;

const Value = styled(Typography)({
  fontSize: 10,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  opacity: 0.7,
  wordBreak: "break-all",
}) as typeof Typography;

interface SwatchProps {
  label: string;
  value: string | undefined;
}

function Swatch({ label, value }: SwatchProps) {
  const safe = value ?? "transparent";
  return (
    <Card>
      <Chip background={safe} />
      <Label>{label}</Label>
      <Value>{value ?? "—"}</Value>
    </Card>
  );
}

interface GroupProps {
  title: string;
  entries: Array<[string, string | undefined]>;
}

function Group({ title, entries }: GroupProps) {
  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      <Grid>
        {entries.map(([label, value]) => (
          <Swatch key={label} label={label} value={value} />
        ))}
      </Grid>
    </Section>
  );
}

function PaletteShowcase() {
  const theme = useTheme();
  const p = theme.palette;
  return (
    <Root>
      <Group
        title="Primary"
        entries={[
          ["primary.main", p.primary.main],
          ["primary.light", p.primary.light],
          ["primary.dark", p.primary.dark],
          ["primary.contrastText", p.primary.contrastText],
        ]}
      />
      <Group
        title="Secondary"
        entries={[
          ["secondary.main", p.secondary.main],
          ["secondary.light", p.secondary.light],
          ["secondary.dark", p.secondary.dark],
        ]}
      />
      <Group
        title="Text"
        entries={[
          ["text.primary", p.text.primary],
          ["text.secondary", p.text.secondary],
          ["text.disabled", p.text.disabled],
          ["text.default", p.text.default],
          ["text.link", p.text.link],
          ["text.information", p.text.information],
          ["text.informationLight", p.text.informationLight],
          ["text.contrast", p.text.contrast],
          ["text.hover", p.text.hover],
          ["text.system", p.text.system],
          ["text.warning", p.text.warning],
        ]}
      />
      <Group
        title="Icon"
        entries={[
          ["icon.primary", p.icon.primary],
          ["icon.secondary", p.icon.secondary],
          ["icon.contrast", p.icon.contrast],
          ["icon.information", p.icon.information],
          ["icon.disabled", p.icon.disabled],
          ["icon.alert", p.icon.alert],
        ]}
      />
      <Group
        title="Border"
        entries={[
          ["border.default", p.border.default],
          ["border.primary", p.border.primary],
          ["border.hover", p.border.hover],
          ["border.separator", p.border.separator],
          ["border.inactive", p.border.inactive],
          ["border.error", p.border.error],
          ["divider", p.divider],
        ]}
      />
      <Group
        title="Surface · Button"
        entries={[
          ["surface.button.primary", p.surface.button.primary],
          ["surface.button.hover", p.surface.button.hover],
          ["surface.button.secondary", p.surface.button.secondary],
          ["surface.button.hoverLight", p.surface.button.hoverLight],
          ["surface.button.disabled", p.surface.button.disabled],
          ["surface.button.focused", p.surface.button.focused],
          ["surface.button.cta", p.surface.button.cta],
          ["surface.button.ctaHover", p.surface.button.ctaHover],
          ["surface.button.ctaContrast", p.surface.button.ctaContrast],
        ]}
      />
      <Group
        title="Surface · Interface"
        entries={[
          ["surface.interface.base", p.surface.interface.base],
          ["surface.interface.background", p.surface.interface.background],
          ["surface.interface.content", p.surface.interface.content],
          ["surface.interface.backElevation", p.surface.interface.backElevation],
          ["surface.interface.active", p.surface.interface.active],
          ["surface.interface.dark", p.surface.interface.dark],
          ["surface.interface.navigation", p.surface.interface.navigation],
          ["surface.interface.overlay", p.surface.interface.overlay],
          ["surface.interface.disabled", p.surface.interface.disabled],
          ["surface.interface.boxShadow", p.surface.interface.boxShadow],
        ]}
      />
      <Group
        title="Surface · Alert"
        entries={[
          ["surface.alert.success", p.surface.alert.success],
          ["surface.alert.warning", p.surface.alert.warning],
          ["surface.alert.error", p.surface.alert.error],
          ["surface.alert.info", p.surface.alert.info],
        ]}
      />
      <Group
        title="Formatting · Code"
        entries={[
          ["formatting.code.inlineText", p.formatting.code.inlineText],
          ["formatting.code.inlineBackground", p.formatting.code.inlineBackground],
          ["formatting.code.blockBackground", p.formatting.code.blockBackground],
        ]}
      />
      <Group
        title="Formatting · Misc"
        entries={[
          ["formatting.mention.text", p.formatting.mention.text],
          ["formatting.mention.background", p.formatting.mention.background],
          ["formatting.blockquote.border", p.formatting.blockquote.border],
          ["formatting.blockquote.background", p.formatting.blockquote.background],
          ["formatting.table.headerBackground", p.formatting.table.headerBackground],
          ["formatting.table.borderColor", p.formatting.table.borderColor],
          ["formatting.link.text", p.formatting.link.text],
        ]}
      />
      <Group
        title="MUI semantic"
        entries={[
          ["success.main", p.success.main],
          ["warning.main", p.warning.main],
          ["error.main", p.error.main],
          ["info.main", p.info.main],
          ["background.default", p.background.default],
          ["background.paper", p.background.paper],
          ["action.hover", p.action.hover],
          ["action.selected", p.action.selected],
          ["action.disabled", p.action.disabled],
        ]}
      />
    </Root>
  );
}

const meta: Meta<typeof PaletteShowcase> = {
  title: "Theme/Palette",
  component: PaletteShowcase,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Visual reference for every `theme.palette` token. Switch theme in the toolbar to compare `light`, `dark`, `oled`, and `glassy`.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof PaletteShowcase>;

export const All: Story = {};
