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
import { gitCloneUrl, loadRepos } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function ClonePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const defaultDest = useAppSelector(
    (s) => s.settings.backend?.defaultScanPath ?? s.repos.scanPaths[0] ?? "",
  );
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState(defaultDest);
  const [subFolder, setSubFolder] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = Boolean(url.trim() && destination.trim()) && !busy;

  const onBrowse = async () => {
    const picked = await pickFolder(destination.trim() || undefined);
    if (picked) setDestination(picked);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const repo = await dispatch(
        gitCloneUrl({
          url: url.trim(),
          destination: destination.trim(),
          subFolder: subFolder.trim() || null,
        }),
      ).unwrap();
      toast.success(t("add_modal.toast_cloned", { ns: I18nNamespace.REPOS, name: repo.name }));
      void dispatch(loadRepos());
      setUrl("");
      setDestination("");
      setSubFolder("");
      onClose();
    } catch (err) {
      toast.error(
        t("add_modal.toast_clone_failed", {
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
          <Label htmlFor="add-repo-url">{t("import.field.url")}</Label>
          <Input
            id="add-repo-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("add_modal.clone_url_placeholder", { ns: I18nNamespace.REPOS })}
            autoFocus
            data-testid={TEST_IDS.addRepoDialog.url}
          />
          <Hint>{t("import.url_hint")}</Hint>
        </Field>
        <Field>
          <Label htmlFor="add-repo-dest">{t("import.field.dest")}</Label>
          <PathFieldRow>
            <Input
              id="add-repo-dest"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={t("add_modal.clone_dest_placeholder", { ns: I18nNamespace.REPOS })}
              data-testid={TEST_IDS.addRepoDialog.dest}
            />
            <BrowseBtn
              type="button"
              onClick={() => void onBrowse()}
              disabled={!isTauri()}
              data-testid={TEST_IDS.addRepoDialog.destBrowse}
            >
              <FolderOpen size={13} />
              {t("actions.browse")}
            </BrowseBtn>
          </PathFieldRow>
          <Hint>{t("import.field.dest_hint")}</Hint>
        </Field>
        <Field>
          <Label htmlFor="add-repo-sub">{t("import.field.sub")}</Label>
          <Input
            id="add-repo-sub"
            type="text"
            value={subFolder}
            onChange={(e) => setSubFolder(e.target.value)}
            placeholder={t("add_modal.clone_sub_placeholder", { ns: I18nNamespace.REPOS })}
            data-testid={TEST_IDS.addRepoDialog.sub}
          />
        </Field>
      </FormFields>
      <Footer>
        <SecondaryBtn type="button" onClick={onClose}>
          {t("actions.cancel")}
        </SecondaryBtn>
        <PrimaryBtn type="submit" disabled={!canSubmit} data-testid={TEST_IDS.addRepoDialog.clone}>
          <ArrowDown size={13} />
          {busy ? t("actions.cloning") : t("actions.clone")}
        </PrimaryBtn>
      </Footer>
    </FormBody>
  );
}

export default ClonePanel;
