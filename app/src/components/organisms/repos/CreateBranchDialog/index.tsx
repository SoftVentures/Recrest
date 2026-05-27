import { type FormEvent, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, FormControlLabel, Switch, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { RepositoryId } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { gitBranchCreate } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface CreateBranchDialogProps {
  open: boolean;
  repoId: RepositoryId | null;
  onClose: () => void;
}

// Need an actual <form> element so the submit button + Enter-in-input
// dispatch submit events that the parent picks up via `form="..."`.
// eslint-disable-next-line no-restricted-syntax -- native <form> for submit semantics
const Form = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(0.5),
}));

const Description = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Box;

/**
 * Modal asking for a new branch name and whether to check out after creation.
 * The source branch defaults to the repo's current HEAD so the result matches
 * a plain `git checkout -b` from the same starting point.
 */
function CreateBranchDialog({ open, repoId, onClose }: CreateBranchDialogProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const dispatch = useAppDispatch();
  const repo = useAppSelector((s) => (repoId ? s.repos.items[repoId] : null));
  const currentBranch = repo?.status.branch ?? null;

  const [name, setName] = useState("");
  const [checkout, setCheckout] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCheckout(true);
      setSubmitting(false);
    }
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!repoId || !name.trim()) return;
    const trimmed = name.trim();
    setSubmitting(true);
    try {
      await dispatch(gitBranchCreate({ repoId, name: trimmed, from: null, checkout })).unwrap();
      toast.success(t("branch.created", { name: trimmed }));
      onClose();
    } catch (err) {
      toast.error(String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GeneralModal
      open={open}
      modalWidth={460}
      customTitle={t("branch.create_title")}
      subtitle={
        currentBranch
          ? t("branch.create_desc_from", { from: currentBranch })
          : t("branch.create_desc")
      }
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.createBranchDialog.root}
      contentChildren={
        <Form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          id="create-branch-form"
        >
          <TextField
            autoFocus
            required
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            label={t("branch.name_label")}
            placeholder={t("branch.name_placeholder")}
            slotProps={{
              htmlInput: { "data-testid": TEST_IDS.createBranchDialog.name },
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={checkout}
                onChange={(_, v) => setCheckout(v)}
                slotProps={{
                  input: {
                    "aria-label": t("branch.checkout_label"),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...({ "data-testid": TEST_IDS.createBranchDialog.checkout } as any),
                  },
                }}
              />
            }
            label={<Description component="span">{t("branch.checkout_label")}</Description>}
          />
        </Form>
      }
      actionsChildren={
        <>
          <GeneralButton
            variant="ghost"
            onClick={onClose}
            data-testid={TEST_IDS.createBranchDialog.cancel}
          >
            {t("branch.cancel")}
          </GeneralButton>
          <GeneralButton
            type="submit"
            form="create-branch-form"
            loading={submitting}
            disabled={!name.trim() || !repoId}
            data-testid={TEST_IDS.createBranchDialog.submit}
          >
            {t("branch.submit")}
          </GeneralButton>
        </>
      }
    />
  );
}

export default CreateBranchDialog;
