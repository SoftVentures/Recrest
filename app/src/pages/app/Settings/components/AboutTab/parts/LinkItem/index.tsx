import type { ComponentType, ReactNode } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ExternalLink } from "lucide-react";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(12),
  padding: pxToRems(12, 16),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
})) as typeof Box;

const Left = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const Title = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Box;

const Url = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(2),
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const OpenBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minHeight: pxToRem(28),
  padding: pxToRems(0, 10),
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: fontPxToRem(11.5),
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

interface LinkItemProps {
  icon: ComponentType<{ size?: number | string }>;
  title: ReactNode;
  url: ReactNode;
  onOpen: () => void;
  openLabel?: string;
}

function LinkItem({ icon: Icon, title, url, onOpen, openLabel = "Open" }: LinkItemProps) {
  return (
    <Row>
      <Left>
        <Title>
          <Icon size={pxToRem(13)} />
          {title}
        </Title>
        <Url>{url}</Url>
      </Left>
      <OpenBtn type="button" onClick={onOpen}>
        <ExternalLink size={pxToRem(11)} />
        {openLabel}
      </OpenBtn>
    </Row>
  );
}

export default LinkItem;
