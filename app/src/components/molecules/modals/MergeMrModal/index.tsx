import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Checkbox, FormControlLabel, Radio } from "@mui/material";

import { MergeStrategy } from "@recrest/shared";

import { GitMerge } from "lucide-react";

import RichTextEditor from "@/components/atoms/text/RichTextEditor";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import {
  Body,
  DeleteBranchHint,
  DeleteBranchLabel,
  DescriptionWrap,
  Field,
  PrimaryBtn,
  SecondaryBtn,
  SectionLabel,
  StrategyDesc,
  StrategyDisabledHint,
  StrategyList,
  StrategyName,
  StrategyOption,
  StrategyText,
  TitleInput,
} from "@/components/molecules/modals/MergeMrModal/MergeMrModal.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export { MergeStrategy } from "@recrest/shared";

export interface MergeMrSubmit {
  strategy: MergeStrategy;
  title: string;
  description: string;
  /** When true, the merge handler should call `git_branch_delete` on the
   *  source branch after a successful merge. Defaults to false in the UI —
   *  destructive operations require explicit opt-in. */
  deleteSourceBranch: boolean;
}

export interface MergeMrModalProps {
  open: boolean;
  prTitle: string;
  prNumber: number;
  prBody: string | null;
  sourceBranch: string;
  targetBranch: string;
  busy?: boolean;
  /** Provider id of the connected remote (`github`, `gitlab`, `bitbucket`).
   *  Drives strategy availability — Bitbucket Cloud has no rebase-on-merge
   *  endpoint, so the Rebase radio is disabled when this is `"bitbucket"`. */
  providerId?: string | null;
  onCancel: () => void;
  onConfirm: (data: MergeMrSubmit) => void | Promise<void>;
}

const STRATEGIES: readonly MergeStrategy[] = [
  MergeStrategy.MERGE,
  MergeStrategy.SQUASH,
  MergeStrategy.REBASE,
];

function MergeMrModal({
  open,
  prTitle,
  prNumber,
  prBody,
  sourceBranch,
  targetBranch,
  busy = false,
  providerId,
  onCancel,
  onConfirm,
}: MergeMrModalProps) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [strategy, setStrategy] = useState<MergeStrategy>(MergeStrategy.MERGE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deleteSourceBranch, setDeleteSourceBranch] = useState(false);

  const rebaseDisabled = providerId === "bitbucket";

  useEffect(() => {
    if (!open) return;
    setStrategy(MergeStrategy.MERGE);
    setTitle(`${prTitle} (#${prNumber})`);
    setDescription(prBody ?? "");
    setDeleteSourceBranch(false);
  }, [open, prTitle, prNumber, prBody]);

  const submit = () => {
    if (busy || !title.trim()) return;
    void onConfirm({
      strategy,
      title: title.trim(),
      description: description.trim(),
      deleteSourceBranch,
    });
  };

  return (
    <GeneralModal
      open={open}
      modalWidth={640}
      customTitle={t("detail.merge_modal.title")}
      subtitle={t("detail.merge_modal.subtitle")}
      textCapitalize={false}
      onCloseModal={() => !busy && onCancel()}
      data-testid={TEST_IDS.mr.mergeModal.root}
      contentChildren={
        <Body>
          <Field>
            <SectionLabel component="span">{t("detail.merge_modal.strategy_label")}</SectionLabel>
            <StrategyList>
              {STRATEGIES.map((s) => {
                const selected = strategy === s;
                const disabled = s === MergeStrategy.REBASE && rebaseDisabled;
                const params = { source: sourceBranch, target: targetBranch };
                return (
                  <StrategyOption
                    key={s}
                    selected={selected}
                    disabled={disabled}
                    htmlFor={`merge-strategy-${s}`}
                  >
                    <Radio
                      id={`merge-strategy-${s}`}
                      name="merge-strategy"
                      value={s}
                      checked={selected}
                      onChange={() => !disabled && setStrategy(s)}
                      disabled={disabled}
                      size="small"
                      color="primary"
                      slotProps={{
                        input: {
                          "data-testid": TEST_IDS.mr.mergeModal.strategy(s),
                        } as React.InputHTMLAttributes<HTMLInputElement>,
                      }}
                    />
                    <StrategyText>
                      <StrategyName component="span">
                        {t(`detail.merge_modal.strategy_${s}`)}
                      </StrategyName>
                      <StrategyDesc component="span" variant="caption">
                        {t(`detail.merge_modal.strategy_${s}_desc`, params)}
                      </StrategyDesc>
                      {disabled && (
                        <StrategyDisabledHint component="span">
                          {t("detail.merge_modal.provider_unsupported_rebase")}
                        </StrategyDisabledHint>
                      )}
                    </StrategyText>
                  </StrategyOption>
                );
              })}
            </StrategyList>
          </Field>

          <Field>
            <SectionLabel component="span">{t("detail.merge_modal.title_label")}</SectionLabel>
            <TitleInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("detail.merge_modal.title_placeholder")}
              data-testid={TEST_IDS.mr.mergeModal.titleInput}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
              }}
            />
          </Field>

          <Field>
            <SectionLabel component="span">
              {t("detail.merge_modal.description_label")}
            </SectionLabel>
            <DescriptionWrap>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder={t("detail.merge_modal.description_placeholder")}
                data-testid={TEST_IDS.mr.mergeModal.descInput}
              />
            </DescriptionWrap>
          </Field>

          <FormControlLabel
            control={
              <Checkbox
                size="small"
                color="primary"
                checked={deleteSourceBranch}
                onChange={(e) => setDeleteSourceBranch(e.target.checked)}
                slotProps={{
                  input: {
                    "data-testid": TEST_IDS.mr.mergeModal.deleteBranch,
                  } as React.InputHTMLAttributes<HTMLInputElement>,
                }}
              />
            }
            label={
              <Box component="span">
                <DeleteBranchLabel component="span">
                  {t("detail.merge_modal.delete_branch_label")}
                </DeleteBranchLabel>
                <DeleteBranchHint component="span">
                  {t("detail.merge_modal.delete_branch_hint", { source: sourceBranch })}
                </DeleteBranchHint>
              </Box>
            }
          />
        </Body>
      }
      actionsChildren={
        <>
          <SecondaryBtn
            type="button"
            onClick={onCancel}
            disabled={busy}
            data-testid={TEST_IDS.mr.mergeModal.cancel}
          >
            {t("detail.cancel")}
          </SecondaryBtn>
          <PrimaryBtn
            type="button"
            onClick={submit}
            disabled={busy || !title.trim()}
            data-testid={TEST_IDS.mr.mergeModal.confirm}
          >
            <GitMerge size={13} />
            <Box component="span">
              {busy ? t("detail.merge_modal.merging") : t("detail.merge_modal.confirm")}
            </Box>
          </PrimaryBtn>
        </>
      }
    />
  );
}

export default MergeMrModal;
