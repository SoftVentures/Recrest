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
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { pickFolder } from "@/lib/utils/pickFolder.utils";
import { gitCloneUrl, loadRepos } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

export function ClonePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
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
      toast.success(`Cloned ${repo.name}`);
      void dispatch(loadRepos());
      setUrl("");
      setDestination("");
      setSubFolder("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Clone failed: ${msg}`);
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
            placeholder="https://github.com/owner/repo.git"
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
              placeholder="/Users/you/Code"
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
            placeholder="e.g. my-fork"
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
