import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { GitMerge } from "lucide-react";

import GeneralModal from "@/components/molecules/modals/GeneralModal";
import {
  Body,
  DescTextArea,
  Field,
  PrimaryBtn,
  ProviderNote,
  SecondaryBtn,
  SectionLabel,
  StrategyDesc,
  StrategyList,
  StrategyName,
  StrategyOption,
  StrategyRadio,
  StrategyText,
  TitleInput,
} from "@/components/molecules/modals/MergeMrModal/MergeMrModal.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export type MergeStrategy = "merge" | "squash" | "rebase";

export interface MergeMrSubmit {
  strategy: MergeStrategy;
  title: string;
  description: string;
}

export interface MergeMrModalProps {
  open: boolean;
  /** The MR being merged — used to pre-fill the title + description fields. */
  prTitle: string;
  prNumber: number;
  prBody: string | null;
  sourceBranch: string;
  targetBranch: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (data: MergeMrSubmit) => void | Promise<void>;
}

const STRATEGIES: readonly MergeStrategy[] = ["merge", "squash", "rebase"];

/** Modal that confirms a PR/MR merge: lets the user pick the strategy
 *  (merge-commit / squash / rebase), edit the commit title and description,
 *  then triggers the merge via the parent's `onConfirm` callback. Title/body
 *  are seeded from the PR's own metadata so the common path is just
 *  "click Confirm" without typing. */
function MergeMrModal({
  open,
  prTitle,
  prNumber,
  prBody,
  sourceBranch,
  targetBranch,
  busy = false,
  onCancel,
  onConfirm,
}: MergeMrModalProps) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [strategy, setStrategy] = useState<MergeStrategy>("merge");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Re-seed every time the modal opens so re-opening on the same PR resets
  // any in-progress draft and switching to a different PR shows its own
  // fields instead of stale state from the previous one.
  useEffect(() => {
    if (!open) return;
    setStrategy("merge");
    setTitle(`${prTitle} (#${prNumber})`);
    setDescription(prBody ?? "");
  }, [open, prTitle, prNumber, prBody]);

  const submit = () => {
    if (busy || !title.trim()) return;
    void onConfirm({ strategy, title: title.trim(), description: description.trim() });
  };

  return (
    <GeneralModal
      open={open}
      modalWidth={600}
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
                const params = { source: sourceBranch, target: targetBranch };
                return (
                  <StrategyOption key={s} selected={selected} htmlFor={`merge-strategy-${s}`}>
                    <StrategyRadio
                      id={`merge-strategy-${s}`}
                      type="radio"
                      name="merge-strategy"
                      value={s}
                      checked={selected}
                      onChange={() => setStrategy(s)}
                      data-testid={TEST_IDS.mr.mergeModal.strategy(s)}
                    />
                    <StrategyText>
                      <StrategyName component="span">
                        {t(`detail.merge_modal.strategy_${s}`)}
                      </StrategyName>
                      <StrategyDesc component="span" variant="caption">
                        {t(`detail.merge_modal.strategy_${s}_desc`, params)}
                      </StrategyDesc>
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
              autoFocus
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
            <DescTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("detail.merge_modal.description_placeholder")}
              data-testid={TEST_IDS.mr.mergeModal.descInput}
            />
          </Field>

          <ProviderNote component="div" variant="caption">
            {t("detail.merge_modal.provider_note")}
          </ProviderNote>
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
