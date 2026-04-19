import type { Meta, StoryObj } from "@storybook/react-vite";

import { KpiCard } from "@/components/molecules/KpiCard";

const meta: Meta<typeof KpiCard> = {
  title: "Molecules/KpiCard",
  component: KpiCard,
};

export default meta;

export const Default: StoryObj<typeof KpiCard> = {
  args: { label: "Open PRs", value: 4, hint: "2 ready to merge" },
};
export const WithoutHint: StoryObj<typeof KpiCard> = {
  args: { label: "Repositories", value: 27 },
};
export const LargeValue: StoryObj<typeof KpiCard> = {
  args: { label: "Commits (30d)", value: "1,248", hint: "+12% vs last month" },
};
export const ZeroState: StoryObj<typeof KpiCard> = {
  args: { label: "Failing checks", value: 0, hint: "All green" },
};
export const RichValue: StoryObj<typeof KpiCard> = {
  args: {
    label: "Ahead / Behind",
    value: (
      <span>
        <span style={{ color: "var(--green)" }}>+3</span>
        {" / "}
        <span style={{ color: "var(--red)" }}>-1</span>
      </span>
    ),
    hint: "origin/main",
  },
};
