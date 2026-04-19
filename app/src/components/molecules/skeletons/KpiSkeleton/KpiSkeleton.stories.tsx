import type { Meta, StoryObj } from "@storybook/react-vite";

import { KpiSkeleton } from "@/components/molecules/skeletons/KpiSkeleton";

const meta: Meta<typeof KpiSkeleton> = {
  title: "Molecules/Skeletons/KpiSkeleton",
  component: KpiSkeleton,
};

export default meta;

export const Default: StoryObj<typeof KpiSkeleton> = {};
