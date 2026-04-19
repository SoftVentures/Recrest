import type { Meta, StoryObj } from "@storybook/react-vite";

function Welcome() {
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Recrest Component Library</h1>
      <p>Browse atoms, molecules, and organisms via the sidebar.</p>
    </div>
  );
}

const meta: Meta<typeof Welcome> = {
  title: "Welcome",
  component: Welcome,
};

export default meta;

export const Default: StoryObj<typeof Welcome> = {};
