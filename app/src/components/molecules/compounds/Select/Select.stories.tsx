import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";

const meta: Meta = {
  title: "Molecules/Compounds/Select",
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div style={{ width: 220 }}>
      <Select defaultValue="system">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const WithPlaceholder: StoryObj = {
  render: () => (
    <div style={{ width: 260 }}>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an IDE" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vscode">Visual Studio Code</SelectItem>
          <SelectItem value="webstorm">WebStorm</SelectItem>
          <SelectItem value="zed">Zed</SelectItem>
          <SelectItem value="sublime">Sublime Text</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Grouped: StoryObj = {
  render: () => (
    <div style={{ width: 260 }}>
      <Select defaultValue="github">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Cloud</SelectLabel>
            <SelectItem value="github">GitHub.com</SelectItem>
            <SelectItem value="gitlab">GitLab.com</SelectItem>
            <SelectItem value="bitbucket">Bitbucket</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Self-hosted</SelectLabel>
            <SelectItem value="ghe">GitHub Enterprise</SelectItem>
            <SelectItem value="gitlab-self">GitLab self-managed</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: StoryObj = {
  render: () => (
    <div style={{ width: 220 }}>
      <Select disabled defaultValue="en">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="de">Deutsch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
