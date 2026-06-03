// Plan 03/04 C.4 — CI workflows / pipelines.

export const WorkflowInputType = {
  STRING: "string",
  NUMBER: "number",
  CHOICE: "choice",
  BOOLEAN: "boolean",
} as const;
export type WorkflowInputType = (typeof WorkflowInputType)[keyof typeof WorkflowInputType];

export interface WorkflowInputDef {
  key: string;
  label: string;
  type: WorkflowInputType;
  required: boolean;
  default: string | null;
  choices: string[] | null;
}

export interface Workflow {
  id: string;
  name: string;
  path: string;
  state: string;
  inputsSchema: WorkflowInputDef[];
}

export interface WorkflowRun {
  id: string;
  runNumber: number;
  status: string;
  conclusion: string | null;
  headSha: string;
  createdAt: string; // ISO-8601
  htmlUrl: string;
  actor: string | null;
}

/** Untyped at the boundary: providers map this to their own dispatch payload
 *  shape (GitHub `inputs`, GitLab `variables`, Bitbucket ignores). */
export type WorkflowInputs = Record<string, unknown>;
