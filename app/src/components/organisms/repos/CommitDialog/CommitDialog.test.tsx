import { act } from "react";

import { describe, expect, it } from "vitest";

import CommitDialog from "@/components/organisms/repos/CommitDialog";
import { renderCommitTemplate } from "@/components/organisms/repos/CommitDialog/template";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("renderCommitTemplate", () => {
  it("replaces {{author}} and {{date}} with the provided context", () => {
    expect(renderCommitTemplate("{{author}}: {{date}}", { author: "me", date: "2026-05-28" })).toBe(
      "me: 2026-05-28",
    );
  });

  it("tolerates whitespace inside the placeholder", () => {
    expect(
      renderCommitTemplate("{{ author }} on {{  date  }}", {
        author: "alice",
        date: "2026-01-01",
      }),
    ).toBe("alice on 2026-01-01");
  });
});

describe("CommitDialog", () => {
  it("renders root + subject + body + insert-template + submit/cancel when open", () => {
    const { getByTestId } = renderWithProviders(
      <CommitDialog open repoId={null} onClose={() => {}} />,
    );
    expect(getByTestId(TEST_IDS.commitDialog.root)).toBeTruthy();
    expect(getByTestId(TEST_IDS.commitDialog.subject)).toBeTruthy();
    expect(getByTestId(TEST_IDS.commitDialog.body)).toBeTruthy();
    expect(getByTestId(TEST_IDS.commitDialog.insertTemplate)).toBeTruthy();
    expect(getByTestId(TEST_IDS.commitDialog.submit)).toBeTruthy();
    expect(getByTestId(TEST_IDS.commitDialog.cancel)).toBeTruthy();
  });

  it("disables submit while the message is empty and enables it after insert-template", () => {
    const { getByTestId } = renderWithProviders(
      <CommitDialog open repoId="r1" onClose={() => {}} />,
    );
    const submit = getByTestId(TEST_IDS.commitDialog.submit) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    act(() => {
      (getByTestId(TEST_IDS.commitDialog.insertTemplate) as HTMLButtonElement).click();
    });
    expect(submit.disabled).toBe(false);
  });
});
