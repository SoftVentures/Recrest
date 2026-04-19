import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExternalLink, GitPullRequest, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/atoms/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/molecules/compounds/DropdownMenu";

const meta: Meta = {
  title: "Molecules/Compounds/DropdownMenu",
};

export default meta;

function DefaultStory() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Repository actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>recrest</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Star /> Pin
        </DropdownMenuItem>
        <DropdownMenuItem>
          <GitPullRequest /> Open pull requests
          <DropdownMenuShortcut>{"\u2318P"}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ExternalLink /> Open in browser
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Trash2 /> Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WithCheckboxesStory() {
  const [drafts, setDrafts] = useState(true);
  const [own, setOwn] = useState(false);
  const [ready, setReady] = useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">PR filters</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={drafts} onCheckedChange={setDrafts}>
          Drafts
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={ready} onCheckedChange={setReady}>
          Ready for review
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={own} onCheckedChange={setOwn}>
          Authored by me
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WithRadioGroupStory() {
  const [sort, setSort] = useState("updated");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Sort by</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
          <DropdownMenuRadioItem value="updated">Last updated</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Default: StoryObj = { render: () => <DefaultStory /> };
export const WithCheckboxes: StoryObj = { render: () => <WithCheckboxesStory /> };
export const WithRadioGroup: StoryObj = { render: () => <WithRadioGroupStory /> };
