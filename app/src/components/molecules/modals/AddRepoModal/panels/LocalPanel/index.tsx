import { type FormEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import { ArrowDown, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import {
  BrowseBtn,
  Field,
  Footer,
  FormBody,
  FormFields,
  Hint,
  Input,
  Label,
  PathFieldRow,
  PrimaryBtn,
  SecondaryBtn,
} from "@/components/molecules/modals/AddRepoModal/panels/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { errorMessage } from "@/lib/utils/error.utils";
import { pickFolder } from "@/lib/utils/pickFolder.utils";
import { addRepo } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function LocalPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  // When the user hasn't typed anything yet, start the picker at the
  // repo-root folder they've already pointed Recrest at — almost always
  // where the next repo lives too.
  const browseFallback = useAppSelector(
    (s) => s.settings.backend?.defaultScanPath ?? s.repos.scanPaths[0] ?? null,
  );
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  const onBrowse = async () => {
    const picked = await pickFolder(path.trim() || browseFallback || undefined);
    if (picked) setPath(picked);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const repo = await dispatch(addRepo({ path: trimmed })).unwrap();
      toast.success(t("add_modal.toast_local_added", { ns: I18nNamespace.REPOS, name: repo.name }));
      setPath("");
      onClose();
    } catch (err) {
      toast.error(
        t("add_modal.toast_local_failed", {
          ns: I18nNamespace.REPOS,
          message: errorMessage(err),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormBody onSubmit={onSubmit}>
      <FormFields>
        <Field>
          <Label htmlFor="add-repo-path">{t("import.field.path")}</Label>
          <PathFieldRow>
            <Input
              id="add-repo-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={t("add_modal.local_path_placeholder", { ns: I18nNamespace.REPOS })}
              autoFocus
              data-testid={TEST_IDS.addRepoDialog.path}
            />
            <BrowseBtn
              type="button"
              onClick={() => void onBrowse()}
              disabled={!isTauri()}
              data-testid={TEST_IDS.addRepoDialog.pathBrowse}
            >
              <FolderOpen size={13} />
              {t("actions.browse")}
            </BrowseBtn>
          </PathFieldRow>
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
