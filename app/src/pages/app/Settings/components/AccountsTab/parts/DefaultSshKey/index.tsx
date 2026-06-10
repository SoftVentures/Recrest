import SshKeyField from "@/components/organisms/ssh/SshKeyField";
import { Card } from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow/ProviderRow.styles";
import { saveSettings } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function DefaultSshKey() {
  const dispatch = useAppDispatch();
  const sshKey = useAppSelector((s) => s.settings.backend?.defaultSshKeyPath ?? null);

  const save = (keyPath: string | null) => {
    void dispatch(saveSettings({ defaultSshKeyPath: keyPath }));
  };

  return (
    <Card>
      <SshKeyField value={sshKey} onChange={save} />
    </Card>
  );
}

export default DefaultSshKey;
