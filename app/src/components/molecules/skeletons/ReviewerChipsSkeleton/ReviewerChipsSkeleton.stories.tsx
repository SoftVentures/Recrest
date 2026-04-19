import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReviewerChipsSkeleton } from "@/components/molecules/skeletons/ReviewerChipsSkeleton";

const meta: Meta<typeof ReviewerChipsSkeleton> = {
  title: "Molecules/Skeletons/ReviewerChipsSkeleton",
  component: ReviewerChipsSkeleton,
};

export default meta;

export const Default: StoryObj<typeof ReviewerChipsSkeleton> = {};

export const InPrDetailContext: StoryObj<typeof ReviewerChipsSkeleton> = {
  render: () => (
    <div style={{ width: 420 }}>
      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Reviewers</div>
      <ReviewerChipsSkeleton />
    </div>
  ),
};
