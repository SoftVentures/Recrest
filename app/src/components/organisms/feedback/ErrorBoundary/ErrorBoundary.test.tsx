import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "@/components/organisms/feedback/ErrorBoundary";

function Boom({ msg }: { msg: string }): never {
  throw new Error(msg);
}

describe("ErrorBoundary", () => {
  // Suppress the expected React error log.
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <span>ok</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("shows the default fallback on error", () => {
    render(
      <ErrorBoundary>
        <Boom msg="kaboom" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();
  });

  it("renders a supplied fallback", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom msg="x" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
  });
});
