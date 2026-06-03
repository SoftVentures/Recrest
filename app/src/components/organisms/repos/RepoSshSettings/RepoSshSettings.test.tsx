import { TauriCommand } from "@recrest/shared";

import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RepoSshSettings from "@/components/organisms/repos/RepoSshSettings";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke } from "@/lib/tauri";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: vi.fn(async (cmd: string) => {
    if (cmd === TauriCommand.LIST_SSH_KEYS) {
      return {
        dir: "/home/u/.ssh",
        keys: [{ path: "/home/u/.ssh/id_ed25519", name: "id_ed25519", hasPublic: true }],
      };
    }
    if (cmd === TauriCommand.REPO_STATUS) {
      return { id: "r1", name: "alpha", sshKeyPath: "/home/u/.ssh/id_ed25519" };
    }
    return undefined;
  }),
}));

describe("RepoSshSettings", () => {
  it("picking a detected key persists it via set_repo_ssh_key", async () => {
    const { findByTestId } = renderWithProviders(<RepoSshSettings repoId="r1" sshKeyPath={null} />);

    fireEvent.click(await findByTestId(TEST_IDS.ssh.option("id_ed25519")));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(TauriCommand.SET_REPO_SSH_KEY, {
        repoId: "r1",
        keyPath: "/home/u/.ssh/id_ed25519",
      }),
    );
  });

  it("selecting ssh-agent clears the key (keyPath: null)", async () => {
    const { findByTestId } = renderWithProviders(
      <RepoSshSettings repoId="r1" sshKeyPath="/home/u/.ssh/id_ed25519" />,
    );

    fireEvent.click(await findByTestId(TEST_IDS.ssh.none));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(TauriCommand.SET_REPO_SSH_KEY, {
        repoId: "r1",
        keyPath: null,
      }),
    );
  });

  it("unlock caches the passphrase via ssh_unlock_key", async () => {
    const { getByTestId } = renderWithProviders(
      <RepoSshSettings repoId="r1" sshKeyPath="/home/u/.ssh/id_ed25519" />,
    );

    fireEvent.change(getByTestId(TEST_IDS.repoDetail.ssh.passphrase), {
      target: { value: "hunter2" },
    });
    fireEvent.click(getByTestId(TEST_IDS.repoDetail.ssh.unlock));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(TauriCommand.SSH_UNLOCK_KEY, {
        repoId: "r1",
        passphrase: "hunter2",
      }),
    );
  });
});
