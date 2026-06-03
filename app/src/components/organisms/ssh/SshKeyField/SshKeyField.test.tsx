import { TauriCommand } from "@recrest/shared";

import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SshKeyField from "@/components/organisms/ssh/SshKeyField";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: vi.fn(async (cmd: string) =>
    cmd === TauriCommand.LIST_SSH_KEYS
      ? {
          dir: "/home/u/.ssh",
          keys: [
            { path: "/home/u/.ssh/id_ed25519", name: "id_ed25519", hasPublic: true },
            { path: "/home/u/.ssh/id_rsa", name: "id_rsa", hasPublic: true },
          ],
        }
      : undefined,
  ),
}));

describe("SshKeyField", () => {
  it("lists detected keys and selecting one calls onChange with its path", async () => {
    const onChange = vi.fn();
    const { findByTestId } = renderWithProviders(<SshKeyField value={null} onChange={onChange} />);

    fireEvent.click(await findByTestId(TEST_IDS.ssh.option("id_rsa")));

    expect(onChange).toHaveBeenCalledWith("/home/u/.ssh/id_rsa");
  });

  it("the ssh-agent option calls onChange(null)", async () => {
    const onChange = vi.fn();
    const { findByTestId } = renderWithProviders(
      <SshKeyField value="/home/u/.ssh/id_ed25519" onChange={onChange} />,
    );

    fireEvent.click(await findByTestId(TEST_IDS.ssh.none));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("opens the creation guide modal", async () => {
    const { getByTestId, findByTestId } = renderWithProviders(
      <SshKeyField value={null} onChange={vi.fn()} />,
    );

    fireEvent.click(getByTestId(TEST_IDS.ssh.guideOpen));

    await waitFor(() => expect(findByTestId(TEST_IDS.ssh.guideModal)).toBeTruthy());
  });
});
