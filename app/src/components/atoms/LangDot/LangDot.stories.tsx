import type { Meta, StoryObj } from "@storybook/react-vite";

import { LangDot } from "@/components/atoms/LangDot";

const meta: Meta<typeof LangDot> = {
  title: "Atoms/LangDot",
  component: LangDot,
};

export default meta;

export const Rust: StoryObj<typeof LangDot> = { args: { lang: "rs" } };
export const TypeScript: StoryObj<typeof LangDot> = { args: { lang: "ts" } };
export const Python: StoryObj<typeof LangDot> = { args: { lang: "Python" } };
export const Go: StoryObj<typeof LangDot> = { args: { lang: "go" } };
export const Unknown: StoryObj<typeof LangDot> = { args: { lang: null } };
