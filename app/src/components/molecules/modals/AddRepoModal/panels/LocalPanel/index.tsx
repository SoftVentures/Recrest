import { type FormEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import { ArrowDown } from "lucide-react";
import { toast } from "sonner";

import {
  Field,
  Footer,
  FormBody,
  FormFields,
  Hint,
  Input,
  Label,
  PrimaryBtn,
  SecondaryBtn,
} from "@/components/molecules/modals/AddRepoModal/panels/_shared";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { addRepo } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

export function LocalPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const repo = await dispatch(addRepo({ path: trimmed })).unwrap();
      toast.success(`Added ${repo.name}`);
      setPath("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not add repository: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormBody onSubmit={onSubmit}>
      <FormFields>
        <Field>
          <Label htmlFor="add-repo-path">{t("import.field.path")}</Label>
          <Input
            id="add-repo-path"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/Code/my-repo"
            autoFocus
            data-testid={TEST_IDS.addRepoDialog.path}
          />
          <Hint>{t("import.field.path_hint")}</Hint>
        </Field>
      </FormFields>
      <Footer>
        <SecondaryBtn type="button" onClick={onClose}>
          {t("actions.cancel")}
        </SecondaryBtn>
        <PrimaryBtn
          type="submit"
          disabled={busy || !path.trim()}
          data-testid={TEST_IDS.addRepoDialog.submit}
        >
          <ArrowDown size={13} />
          {busy ? t("actions.adding") : t("actions.add")}
        </PrimaryBtn>
      </Footer>
    </FormBody>
  );
}

export default LocalPanel;
