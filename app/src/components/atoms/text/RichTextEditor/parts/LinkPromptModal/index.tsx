import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { styled } from "@mui/material/styles";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { opaqueSurfaceBg } from "@/lib/utils/translucency.utils";

export interface LinkPromptModalProps {
  open: boolean;
  /** Existing href when editing a link; empty for a fresh insert. */
  initialUrl: string;
  /** Submit the URL. An empty string removes the link (parity with the old
   *  `window.prompt` flow where clearing the field unset the mark). */
  onApply: (url: string) => void;
  onClose: () => void;
}

// eslint-disable-next-line no-restricted-syntax -- native <input> for URL entry (autofocus + IME + Enter-to-submit)
const UrlInput = styled("input")(({ theme }) => ({
  width: "100%",
  height: 36,
  padding: "0 12px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  background: opaqueSurfaceBg(theme),
  color: theme.palette.text.primary,
  fontFamily: MONO_STACK,
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box",
  "&:focus": { borderColor: theme.palette.border.hover },
  "&::placeholder": { color: theme.palette.text.informationLight },
}));

/** URL-entry dialog for the editor's link button. Replaces `window.prompt`,
 *  which the Tauri shell reroutes to the ACL-gated, async dialog plugin (it
 *  throws "dialog.prompt not allowed" there and never returns a string). */
function LinkPromptModal({ open, initialUrl, onApply, onClose }: LinkPromptModalProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const [value, setValue] = useState(initialUrl);

  // Re-seed the field each time the dialog opens so it reflects the current
  // selection's href instead of the previous edit's leftover value.
  useEffect(() => {
    if (open) setValue(initialUrl);
  }, [open, initialUrl]);

  const apply = () => onApply(value.trim());

  return (
    <GeneralModal
      open={open}
      modalWidth={420}
      customTitle={t("editor.link_prompt")}
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.editor.linkModal.root}
      contentChildren={
        <UrlInput
          autoFocus
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder={t("editor.link_placeholder")}
          data-testid={TEST_IDS.editor.linkModal.input}
        />
      }
      actionsChildren={
        <>
          <GeneralButton
            variant="ghost"
            onClick={onClose}
            data-testid={TEST_IDS.editor.linkModal.cancel}
          >
            {t("editor.link_cancel")}
          </GeneralButton>
          <GeneralButton onClick={apply} data-testid={TEST_IDS.editor.linkModal.apply}>
            {t("editor.link_apply")}
          </GeneralButton>
        </>
      }
    />
  );
}

export default LinkPromptModal;
