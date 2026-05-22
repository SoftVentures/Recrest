import { type ComponentType, type ReactNode } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import Mascot, { type MascotVariant } from "@/components/atoms/brand/Mascot";

/**
 * Centered empty-state block used inside cards and full-page placeholders.
 * Renders a friendly mascot (preferred), an optional Lucide-style icon, the
 * required title, optional description and an action slot below.
 *
 * The mascot is the primary signifier of Recrest's brand voice in empty
 * states — callers should default to picking a variant that matches the
 * semantic of the empty state ("celebrating" for success-shaped empties,
 * "snoozing" for nothing-to-do, "searching" for no-hits, "waving" for
 * onboarding, "shrugging" for generic).
 */
export interface EmptyStateProps {
  /** Optional Lucide-style icon. Ignored when `mascot` is set. */
  icon?: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  /** Friendly Recrest character to show above the text. Takes precedence over `icon`. */
  mascot?: MascotVariant;
  /** Pixel size of the mascot SVG. Default 112; use ~88 in compact cards. */
  mascotSize?: number;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  width: "100%",
  minHeight: 180,
  padding: "32px 24px",
  textAlign: "center",
});

const IconBubble = styled(Box)(({ theme }) => ({
  display: "flex",
  width: 48,
  height: 48,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor: theme.palette.surface.interface.active,
  color: theme.palette.text.information,
}));

const TextBlock = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const Title = styled("h3")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  margin: 0,
  letterSpacing: "-0.01em",
}));

const Description = styled("p")(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.information,
  margin: 0,
  maxWidth: 360,
  lineHeight: 1.5,
}));

const ActionSlot = styled(Box)({
  marginTop: 4,
});

const MascotInk = styled(Box)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "rgba(255,255,255,0.85)" : "rgba(20,22,28,0.85)",
  lineHeight: 0,
}));

function EmptyState({
  icon: Icon,
  mascot,
  mascotSize = 112,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Root className={className} data-testid="empty-state">
      {mascot ? (
        <MascotInk>
          <Mascot variant={mascot} size={mascotSize} />
        </MascotInk>
      ) : (
        Icon && (
          <IconBubble>
            <Icon size={24} aria-hidden />
          </IconBubble>
        )
      )}
      <TextBlock>
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
      </TextBlock>
      {action && <ActionSlot>{action}</ActionSlot>}
    </Root>
  );
}

export default EmptyState;
