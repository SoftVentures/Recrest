import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { OpenInIdeButton } from "@/components/molecules/OpenInIdeButton";
import { store } from "@/store";
import { loadDetectedIdes } from "@/store/slices/settingsSlice";

// The stories need a Redux store because `useActiveIde()` reads
// `settings.detectedIdes` + `settings.defaultIde`. For demo purposes we
// inject a few detected IDEs via a fake `fulfilled` action.
store.dispatch({
  type: loadDetectedIdes.fulfilled.type,
  payload: ["vscode", "cursor", "webstorm"],
});

const meta: Meta<typeof OpenInIdeButton> = {
  title: "Molecules/OpenInIdeButton",
  component: OpenInIdeButton,
  args: { repoId: "demo-repo" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};

export default meta;

export const Primary: StoryObj<typeof OpenInIdeButton> = {
  args: { variant: "primary" },
};

export const Default: StoryObj<typeof OpenInIdeButton> = {
  args: { variant: "default" },
};

export const IconOnly: StoryObj<typeof OpenInIdeButton> = {
  args: { variant: "icon" },
};
