import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/compounds/Tabs";

const meta: Meta = {
  title: "Molecules/Compounds/Tabs",
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <Tabs defaultValue="overview" style={{ width: 420 }}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="branches">Branches</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-muted-foreground">
        Summary of the repository&rsquo;s current state.
      </TabsContent>
      <TabsContent value="branches" className="text-sm text-muted-foreground">
        All local branches and their upstream tracking.
      </TabsContent>
      <TabsContent value="activity" className="text-sm text-muted-foreground">
        Recent commits and CI runs.
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: StoryObj = {
  render: () => (
    <Tabs defaultValue="general" style={{ width: 520 }}>
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="providers">Providers</TabsTrigger>
        <TabsTrigger value="scan">Scan</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="text-sm text-muted-foreground">
        Basic settings like language and startup behaviour.
      </TabsContent>
      <TabsContent value="appearance" className="text-sm text-muted-foreground">
        Theme, accent, and typography.
      </TabsContent>
      <TabsContent value="providers" className="text-sm text-muted-foreground">
        Connect GitHub, GitLab, or Bitbucket.
      </TabsContent>
      <TabsContent value="scan" className="text-sm text-muted-foreground">
        Folders that Recrest indexes for repositories.
      </TabsContent>
      <TabsContent value="advanced" className="text-sm text-muted-foreground">
        Experimental flags.
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: StoryObj = {
  render: () => (
    <Tabs defaultValue="one" style={{ width: 420 }}>
      <TabsList>
        <TabsTrigger value="one">Available</TabsTrigger>
        <TabsTrigger value="two" disabled>
          Coming soon
        </TabsTrigger>
      </TabsList>
      <TabsContent value="one" className="text-sm text-muted-foreground">
        The first tab is selectable.
      </TabsContent>
      <TabsContent value="two" className="text-sm text-muted-foreground">
        You shouldn&rsquo;t be able to see this.
      </TabsContent>
    </Tabs>
  ),
};
