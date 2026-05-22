import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { Preview } from "@storybook/react-vite";

import { THEMES, type ThemeId } from "@/lib/constants/theme.constants";
import { getTheme } from "@/theme";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    layout: "centered",
  },
  globalTypes: {
    themeId: {
      description: "App theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: THEMES.map((t) => ({ value: t.id, title: t.label })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const themeId = (ctx.globals.themeId ?? "light") as ThemeId;
      const theme = getTheme(themeId);
      return (
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
