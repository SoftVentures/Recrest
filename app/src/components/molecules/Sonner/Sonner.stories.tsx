import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";
import { toast } from "sonner";

import { Button } from "@/components/atoms/Button";
import { Toaster } from "@/components/molecules/Sonner";
import { store } from "@/store";

const meta: Meta<typeof Toaster> = {
  title: "Molecules/Sonner",
  component: Toaster,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;

export const Default: StoryObj<typeof Toaster> = {
  render: () => (
    <div className="p-6">
      <Toaster />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast("Settings saved")}>Neutral</Button>
        <Button variant="secondary" onClick={() => toast.success("Repository scan finished")}>
          Success
        </Button>
        <Button variant="destructive" onClick={() => toast.error("Failed to fetch pull requests")}>
          Error
        </Button>
      </div>
    </div>
  ),
};

export const WithDescription: StoryObj<typeof Toaster> = {
  render: () => (
    <div className="p-6">
      <Toaster />
      <Button
        onClick={() =>
          toast("New pull request", {
            description: "#482 Improve scanner cancellation handling",
          })
        }
      >
        Show toast with description
      </Button>
    </div>
  ),
};

export const WithAction: StoryObj<typeof Toaster> = {
  render: () => (
    <div className="p-6">
      <Toaster />
      <Button
        onClick={() =>
          toast("Token removed", {
            description: "GitHub integration disconnected.",
            action: { label: "Undo", onClick: () => toast.success("Restored") },
          })
        }
      >
        Show toast with action
      </Button>
    </div>
  ),
};
