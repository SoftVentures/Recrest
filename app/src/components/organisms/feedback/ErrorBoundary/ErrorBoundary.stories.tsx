import type { Meta, StoryObj } from "@storybook/react-vite";

import { ErrorBoundary } from "@/components/organisms/feedback/ErrorBoundary";

function Boom(): never {
  throw new Error("demo: something went wrong");
}

const meta: Meta<typeof ErrorBoundary> = {
  title: "Organisms/Feedback/ErrorBoundary",
  component: ErrorBoundary,
};
export default meta;

export const Caught: StoryObj<typeof ErrorBoundary> = {
  render: () => (
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  ),
};

export const Passthrough: StoryObj<typeof ErrorBoundary> = {
  render: () => (
    <ErrorBoundary>
      <div className="p-4">content renders normally</div>
    </ErrorBoundary>
  ),
};

export const CustomFallback: StoryObj<typeof ErrorBoundary> = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div className="rounded border border-amber-400 bg-amber-50 p-3 text-sm">
          custom fallback UI
        </div>
      }
    >
      <Boom />
    </ErrorBoundary>
  ),
};
