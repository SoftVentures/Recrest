import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import SshKeyField from "@/components/organisms/ssh/SshKeyField";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { gitFetch, setRepoSshKey, sshUnlockKey } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
}) as typeof Box;

const Desc = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
})) as typeof Typography;

const InputRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / IME
const TextInput = styled("input")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  minHeight: pxToRem(32),
  padding: pxToRems(0, 10),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(12),
  fontFamily: MONO_STACK,
  outline: "none",
  "&::placeholder": { color: theme.palette.text.informationLight },
  "&:focus": { borderColor: theme.palette.border.hover },
}));

export interface RepoSshSettingsProps {
  repoId: string;
  sshKeyPath: string | null;
}

export function RepoSshSettings({ repoId, sshKeyPath }: RepoSshSettingsProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [passphrase, setPassphrase] = useState("");
  const [testing, setTesting] = useState(false);

  const apply = async (keyPath: string | null) => {
    try {
      await dispatch(setRepoSshKey({ repoId, keyPath })).unwrap();
      toast.success(keyPath ? t("ssh.key_set") : t("ssh.auto_set"));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t("ssh.failed"));
    }
  };

  const unlock = async () => {
    if (!passphrase) return;
    try {
      await dispatch(sshUnlockKey({ repoId, passphrase })).unwrap();
      setPassphrase("");
      toast.success(t("ssh.unlocked"));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t("ssh.failed"));
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await dispatch(gitFetch(repoId)).unwrap();
      toast.success(t("ssh.test_ok"));
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t("ssh.test_fail"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Wrap>
      <Desc component="p" variant="body2">
        {t("ssh.description")}
      </Desc>

      <SshKeyField value={sshKeyPath} onChange={(keyPath) => void apply(keyPath)} />

      <InputRow>
        <TextInput
          type="password"
          value={passphrase}
          placeholder={t("ssh.passphrase_placeholder")}
          onChange={(e) => setPassphrase(e.target.value)}
          data-testid={TEST_IDS.repoDetail.ssh.passphrase}
        />
        <GeneralButton
          variant="secondary"
          size="sm"
          disabled={!passphrase}
          data-testid={TEST_IDS.repoDetail.ssh.unlock}
          onClick={() => void unlock()}
        >
          {t("ssh.unlock")}
        </GeneralButton>
      </InputRow>

      <Box>
        <GeneralButton
          variant="outline"
          size="sm"
          loading={testing}
          disabled={!isTauri()}
          data-testid={TEST_IDS.repoDetail.ssh.test}
          onClick={() => void testConnection()}
        >
          {t("ssh.test")}
        </GeneralButton>
      </Box>
    </Wrap>
  );
}

export default RepoSshSettings;
