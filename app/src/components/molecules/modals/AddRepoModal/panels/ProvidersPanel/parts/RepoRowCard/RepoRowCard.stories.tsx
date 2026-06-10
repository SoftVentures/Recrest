import type { RemoteRepository } from "@recrest/shared";

import type { Meta, StoryObj } from "@storybook/react-vite";

import RepoRowCard from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/parts/RepoRowCard";

const sampleRepo: RemoteRepository = {
  id: "1",
  providerId: "github",
  fullName: "recrest/example",
  name: "example",
  ownerLogin: "recrest",
  description: "Example repository used in stories.",
  language: "TypeScript",
  isPrivate: false,
  isFork: false,
  isArchived: false,
  defaultBranch: "main",
  cloneUrlHttps: "https://github.com/recrest/example.git",
  cloneUrlSsh: "git@github.com:recrest/example.git",
  updatedAt: "2025-02-15T10:00:00Z",
  pushedAt: "2025-02-15T10:00:00Z",
  htmlUrl: "https://github.com/recrest/example",
  sizeKb: 1024,
  ownerAvatarUrl: null,
};

const meta = {
  title: "Molecules/Modals/AddRepoModal/Panels/ProvidersPanel/Parts/RepoRowCard",
  component: RepoRowCard,
  args: {
    repo: sampleRepo,
    selected: false,
    alreadyLocal: false,
    onToggle: () => {},
  },
} satisfies Meta<typeof RepoRowCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const AlreadyLocal: Story = { args: { alreadyLocal: true } };
export const Cloning: Story = { args: { progress: "cloning" } };
export const Done: Story = { args: { progress: "done" } };
export const Error: Story = { args: { progress: "error" } };
