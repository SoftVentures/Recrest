import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface ComingSoonPlaceholderProps {
  title: string;
  phase?: string;
}

const Root = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
}));

function ComingSoonPlaceholder({ title, phase = "Phase 4" }: ComingSoonPlaceholderProps) {
  return (
    <Root>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Coming soon — {phase}
      </Typography>
    </Root>
  );
}

export default ComingSoonPlaceholder;
