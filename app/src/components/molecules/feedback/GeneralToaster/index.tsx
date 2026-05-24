import { useTheme } from "@mui/material/styles";

import { Toaster } from "sonner";

/**
 * Thin sonner wrapper that picks colours from the active MUI theme so the
 * toast surface matches the app palette in light/dark/oled/glassy modes.
 */
function GeneralToaster() {
  const theme = useTheme();
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: theme.palette.surface.interface.base,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    />
  );
}

export default GeneralToaster;
