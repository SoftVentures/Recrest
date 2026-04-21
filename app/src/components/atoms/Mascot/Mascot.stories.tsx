import type { Meta, StoryObj } from "@storybook/react-vite";

import { Mascot, type MascotVariant } from "@/components/atoms/Mascot";

const meta: Meta<typeof Mascot> = {
  title: "Atoms/Mascot",
  component: Mascot,
  args: {
    variant: "snoozing",
    size: 128,
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: [
        "snoozing",
        "celebrating",
        "searching",
        "waving",
        "shrugging",
      ] satisfies MascotVariant[],
    },
    size: { control: { type: "number", min: 48, max: 256, step: 8 } },
  },
};

export default meta;

type Story = StoryObj<typeof Mascot>;

export const Snoozing: Story = { args: { variant: "snoozing" } };
export const Celebrating: Story = { args: { variant: "celebrating" } };
export const Searching: Story = { args: { variant: "searching" } };
export const Waving: Story = { args: { variant: "waving" } };
export const Shrugging: Story = { args: { variant: "shrugging" } };

export const AllPoses: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 24,
        color: "var(--ink-1)",
        padding: 24,
      }}
    >
      {(["snoozing", "celebrating", "searching", "waving", "shrugging"] as MascotVariant[]).map(
        (v) => (
          <div
            key={v}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Mascot variant={v} size={128} />
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{v}</span>
          </div>
        ),
      )}
    </div>
  ),
};
