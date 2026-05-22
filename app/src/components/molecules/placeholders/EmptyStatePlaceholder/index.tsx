import type { ReactNode } from "react";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface EmptyStatePlaceholderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(6),
  color: theme.palette.text.secondary,
  textAlign: "center",
}));

const IconWrap = styled(Box)(({ theme }) => ({
  color: theme.palette.icon.secondary,
}));

const TitleText = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const Description = styled(Typography)({
  maxWidth: 420,
});

const ActionSlot = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

function EmptyStatePlaceholder({ icon, title, description, action }: EmptyStatePlaceholderProps) {
  return (
    <Root>
      {icon && <IconWrap>{icon}</IconWrap>}
      <TitleText variant="subtitle1">{title}</TitleText>
      {description && <Description variant="body2">{description}</Description>}
      {action && <ActionSlot>{action}</ActionSlot>}
    </Root>
  );
}

export default EmptyStatePlaceholder;
