import type { Meta, StoryObj } from "@storybook/react-vite";

import { KpiSkeleton } from "@/components/molecules/skeletons/KpiSkeleton";

const meta: Meta<typeof KpiSkeleton> = {
  title: "Molecules/Skeletons/KpiSkeleton",
  component: KpiSkeleton,
};

export default meta;

export const Single: StoryObj<typeof KpiSkeleton> = {};

/** Matches the real four-column layout at the top of the repo detail view. */
export const FourColumnGrid: StoryObj<typeof KpiSkeleton> = {
  render: () => (
    <div className="grid grid-cols-4 gap-3" style={{ width: 720 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiSkeleton key={i} />
      ))}
    </div>
  ),
};
