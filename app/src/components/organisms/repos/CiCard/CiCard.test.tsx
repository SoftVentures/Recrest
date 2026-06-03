import { TauriCommand, type Workflow, type WorkflowRun } from "@recrest/shared";

import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CiCard from "@/components/organisms/repos/CiCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: invokeMock,
  openExternal: vi.fn(),
}));

const WORKFLOW_WITH_INPUTS: Workflow = {
  id: "1",
  name: "CI",
  path: ".github/workflows/ci.yml",
  state: "active",
  inputsSchema: [
    {
      key: "environment",
      label: "Target environment",
      type: "choice",
      required: true,
      default: null,
      choices: ["staging", "production"],
    },
  ],
};

const WORKFLOW_NO_INPUTS: Workflow = {
  id: "pipelines",
  name: "widget",
  path: "bitbucket-pipelines.yml",
  state: "active",
  inputsSchema: [],
};

const RUNS: WorkflowRun[] = [
  {
    id: "9001",
    runNumber: 42,
    status: "completed",
    conclusion: "success",
    headSha: "abc",
    createdAt: new Date().toISOString(),
    htmlUrl: "https://example.com/runs/42",
    actor: "alice",
  },
];

function wireInvoke(workflows: Workflow[]) {
  invokeMock.mockImplementation(async (cmd: string) => {
    if (cmd === TauriCommand.LIST_WORKFLOWS) return workflows;
    if (cmd === TauriCommand.LIST_WORKFLOW_RUNS) return RUNS;
    if (cmd === TauriCommand.TRIGGER_WORKFLOW) return RUNS[0];
    return undefined;
  });
}

describe("CiCard", () => {
  afterEach(() => invokeMock.mockReset());

  it("lists workflow runs", async () => {
    wireInvoke([WORKFLOW_WITH_INPUTS]);
    const { findAllByTestId } = renderWithProviders(<CiCard repoId="demo" />);
    expect(await findAllByTestId(TEST_IDS.ci.run)).toHaveLength(1);
  });

  it("renders dynamic input fields from the workflow schema", async () => {
    wireInvoke([WORKFLOW_WITH_INPUTS]);
    const { findByTestId, getByTestId } = renderWithProviders(<CiCard repoId="demo" />);

    fireEvent.click(await findByTestId(TEST_IDS.ci.runBtn));
    // The "environment" choice field renders as a select.
    expect(getByTestId(TEST_IDS.ci.runFormField("environment"))).toBeTruthy();
  });

  it("Bitbucket-style workflow with no inputs shows only a branch field", async () => {
    wireInvoke([WORKFLOW_NO_INPUTS]);
    const { findByTestId, queryByTestId } = renderWithProviders(<CiCard repoId="demo" />);

    fireEvent.click(await findByTestId(TEST_IDS.ci.runBtn));
    expect(getByRef(queryByTestId)).toBeTruthy();
    expect(queryByTestId(TEST_IDS.ci.runFormField("environment"))).toBeNull();
  });

  it("submitting the form dispatches trigger_workflow", async () => {
    wireInvoke([WORKFLOW_NO_INPUTS]);
    const { findByTestId, getByTestId } = renderWithProviders(<CiCard repoId="demo" />);

    fireEvent.click(await findByTestId(TEST_IDS.ci.runBtn));
    fireEvent.change(getByTestId(TEST_IDS.ci.runFormRef), { target: { value: "main" } });
    fireEvent.click(getByTestId(TEST_IDS.ci.runFormSubmit));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        TauriCommand.TRIGGER_WORKFLOW,
        expect.objectContaining({ repoId: "demo", gitRef: "main" }),
      ),
    );
  });
});

// Local helper: the branch/ref field is always present in the run form.
function getByRef(queryByTestId: (id: string) => HTMLElement | null) {
  return queryByTestId(TEST_IDS.ci.runFormRef);
}
