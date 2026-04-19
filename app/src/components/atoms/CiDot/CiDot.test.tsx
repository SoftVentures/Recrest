import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CiDot } from "@/components/atoms/CiDot";

describe("CiDot", () => {
  it("zeigt em-dash bei null-State", () => {
    render(<CiDot state={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("zeigt em-dash bei undefined-State", () => {
    render(<CiDot state={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("zeigt 'passing' Label bei passing-State", () => {
    render(<CiDot state="passing" />);
    expect(screen.getByText("passing")).toBeInTheDocument();
  });

  it("zeigt 'failing' Label bei failing-State", () => {
    render(<CiDot state="failing" />);
    expect(screen.getByText("failing")).toBeInTheDocument();
  });

  it("zeigt 'running' Label bei running-State", () => {
    render(<CiDot state="running" />);
    expect(screen.getByText("running")).toBeInTheDocument();
  });
});
