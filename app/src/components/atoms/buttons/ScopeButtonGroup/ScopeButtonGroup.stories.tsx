import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ScopeButtonGroup from "@/components/atoms/buttons/ScopeButtonGroup";
import { RepoAddScope } from "@/lib/constants/repoAddScope.constants";

function ExpandedDemo() {
  const [v, setV] = useState<RepoAddScope>(RepoAddScope.LOCAL);
  return <ScopeButtonGroup value={v} onChange={setV} variant="expanded" />;
}

function CollapsedDemo() {
  const [v, setV] = useState<RepoAddScope>(RepoAddScope.LOCAL);
  return <ScopeButtonGroup value={v} onChange={setV} variant="collapsed" />;
}

const meta: Meta<typeof ScopeButtonGroup> = {
  title: "Atoms/Buttons/ScopeButtonGroup",
  component: ScopeButtonGroup,
};

export default meta;

type Story = StoryObj<typeof ScopeButtonGroup>;

export const Expanded: Story = { render: () => <ExpandedDemo /> };
export const Collapsed: Story = { render: () => <CollapsedDemo /> };
