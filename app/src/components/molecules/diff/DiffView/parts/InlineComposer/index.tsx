import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import RichTextEditor from "@/components/atoms/text/RichTextEditor";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  onSubmit: (body: string) => Promise<void> | void;
  onCancel: () => void;
}

/** Inline review-comment composer used for the per-line affordance in
 *  `DiffView`. Reuses `RichTextEditor` so the writing UX matches the MR
 *  description editor (markdown toolbar, link safety, paste sanitization). */
export default function InlineComposer({ onSubmit, onCancel }: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setBody("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap
      data-testid={TEST_IDS.mr.diff.composer}
      onKeyDown={(e) => {
        // Cmd/Ctrl+Enter submits — matches GitHub's composer.
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
        if (e.key === "Escape") onCancel();
      }}
    >
      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder={t("diff.comment_placeholder")}
        data-testid={TEST_IDS.mr.diff.composerInput}
      />
      <Actions>
        <GeneralButton
          variant="ghost"
          onClick={onCancel}
          data-testid={TEST_IDS.mr.diff.composerCancel}
        >
          {t("diff.comment_cancel")}
        </GeneralButton>
        <GeneralButton
          variant="default"
          onClick={() => void submit()}
          disabled={!body.trim() || busy}
          data-testid={TEST_IDS.mr.diff.composerSubmit}
        >
          {t("diff.comment_submit")}
        </GeneralButton>
      </Actions>
    </Wrap>
  );
}

const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

const Actions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
}) as typeof Box;
