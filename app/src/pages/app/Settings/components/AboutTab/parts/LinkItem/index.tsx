import type { ComponentType, ReactNode } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ExternalLink } from "lucide-react";

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
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
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Box;

const Url = styled(Box)(({ theme }) => ({
  marginTop: 2,
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const OpenBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

interface LinkItemProps {
  icon: ComponentType<{ size?: number }>;
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
          <Icon size={13} />
          {title}
        </Title>
        <Url>{url}</Url>
      </Left>
      <OpenBtn type="button" onClick={onOpen}>
        <ExternalLink size={11} />
        {openLabel}
      </OpenBtn>
    </Row>
  );
}

export default LinkItem;
