import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { UpdaterBanner } from "@/components/organisms/feedback/UpdaterBanner";
import { store } from "@/store";
import { setUpdaterBanner } from "@/store/slices/uiSlice";

const meta: Meta<typeof UpdaterBanner> = {
  title: "Organisms/Feedback/UpdaterBanner",
  component: UpdaterBanner,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};
export default meta;

export const Available: StoryObj<typeof UpdaterBanner> = {
  render: () => {
    store.dispatch(
      setUpdaterBanner({
        version: "1.4.0",
        body: "Activity page redesign, new CI pass-rate trend, bug fixes.",
      }),
    );
    return <UpdaterBanner />;
  },
};

export const Minimal: StoryObj<typeof UpdaterBanner> = {
  render: () => {
    store.dispatch(setUpdaterBanner({ version: "1.4.1", body: null }));
    return <UpdaterBanner />;
  },
};
