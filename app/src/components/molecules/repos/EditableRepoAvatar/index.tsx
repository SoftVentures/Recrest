import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type Repository } from "@recrest/shared";

import { Palette, Pencil, Upload, X } from "lucide-react";
import { toast } from "sonner";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import { repoGradientStops } from "@/components/atoms/avatars/RepoAvatar/repoGradient";
import ContextMenu from "@/components/molecules/menus/ContextMenu";
import AvatarDesignerModal from "@/components/molecules/modals/AvatarDesignerModal";
import type { ContextMenuPosition } from "@/hooks/useContextMenu";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { pickImageFile } from "@/lib/utils/pickFolder.utils";
import { clearRepoLogo, setRepoLogo, setRepoLogoSvg } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";
import { pxToRem } from "@/theme/scale";

interface Props {
  repo: Repository;
  size: number;
  radius: number;
  /** Reset-affordance is intentionally opt-in. The repo-list right drawer
   *  shows it inline; the detail page header shows it via the same prop. */
  showResetAffordance?: boolean;
}

export default function EditableRepoAvatar({
  repo,
  size,
  radius,
  showResetAffordance = true,
}: Props) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<ContextMenuPosition | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);

  // The pencil opens a small menu (upload vs. design) anchored at the cursor;
  // `stopPropagation` keeps the click from triggering the surrounding row's
  // navigate-to-detail handler.
  function openMenu(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setMenuPos({ left: e.clientX, top: e.clientY });
  }

  async function doUpload() {
    if (busy) return;
    // Default the picker to the repo's own folder so the user can pull a
    // logo straight from `assets/`, `public/`, etc. without having to
    // navigate from $HOME every time.
    const picked = await pickImageFile(repo.path);
    if (!picked) return;
    setBusy(true);
    try {
      await dispatch(setRepoLogo({ repoId: repo.id, sourcePath: picked })).unwrap();
      toast.success(t("avatar.uploaded"));
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? t("avatar.upload_error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function doSaveDesign(svg: string) {
    if (busy) return;
    setBusy(true);
    try {
      await dispatch(setRepoLogoSvg({ repoId: repo.id, svg })).unwrap();
      toast.success(t("avatar.uploaded"));
      setDesignerOpen(false);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? t("avatar.upload_error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await dispatch(clearRepoLogo(repo.id)).unwrap();
      toast.success(t("avatar.reset_done"));
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? t("avatar.upload_error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // Icon sizes track avatar size: the edit chip should look like a thumb,
  // not eat the entire tile on a small (36px) drawer avatar.
  const chip = Math.max(18, Math.round(size * 0.34));
  const iconSize = Math.max(10, Math.round(chip * 0.55));
  const isCustom = repo.logoIsCustom === true;
  const cleaned = repo.name.replace(/^[\W_]+/, "") || repo.name;
  const letter = cleaned.charAt(0).toUpperCase();
  // Preselect the designer on the repo's current fallback gradient so opening
  // "design your own" keeps the background the user already sees — they can then
  // just pick an icon, or change the background too.
  const currentStops = repoGradientStops(repo.id || repo.name);

  return (
    <Wrap>
      <RepoAvatar repo={repo} size={size} radius={radius} />
      <EditBtn
        type="button"
        onClick={openMenu}
        chip={chip}
        title={t("avatar.edit")}
        aria-label={t("avatar.edit_aria")}
        data-testid={TEST_IDS.repoDetail.avatarEdit}
        disabled={busy}
      >
        <Pencil size={iconSize} aria-hidden />
      </EditBtn>
      {showResetAffordance && isCustom && (
        <ResetBtn
          type="button"
          onClick={onReset}
          chip={chip}
          title={t("avatar.reset")}
          aria-label={t("avatar.reset_aria")}
          data-testid={TEST_IDS.repoDetail.avatarReset}
          disabled={busy}
        >
          <X size={iconSize} aria-hidden />
        </ResetBtn>
      )}
      <ContextMenu
        position={menuPos}
        onClose={() => setMenuPos(null)}
        data-testid={TEST_IDS.repoDetail.avatarMenu}
        sections={[
          {
            items: [
              {
                key: "avatar-upload",
                label: t("avatar.menu_upload"),
                icon: <Upload size={pxToRem(15)} aria-hidden />,
                onSelect: () => void doUpload(),
              },
              {
                key: "avatar-design",
                label: t("avatar.menu_design"),
                icon: <Palette size={pxToRem(15)} aria-hidden />,
                onSelect: () => setDesignerOpen(true),
              },
            ],
          },
        ]}
      />
      <AvatarDesignerModal
        open={designerOpen}
        letter={letter}
        initialStops={currentStops}
        busy={busy}
        onClose={() => setDesignerOpen(false)}
        onSave={(svg) => void doSaveDesign(svg)}
      />
    </Wrap>
  );
}

const Wrap = styled(Box)({
  position: "relative",
  display: "inline-block",
  lineHeight: 0,
  // Show the edit affordance on hover/focus only — the avatar would look
  // noisy otherwise across every list/card surface composing this widget.
  "&:hover button, & button:focus-visible": {
    opacity: 1,
    pointerEvents: "auto",
  },
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: the chip sits on top of the avatar and must remain keyboard-focusable without nested-interactive issues
const EditBtn = styled("button", {
  shouldForwardProp: (p) => p !== "chip",
})<{ chip: number }>(({ theme, chip }) => ({
  position: "absolute",
  right: pxToRem(-2),
  bottom: pxToRem(-2),
  width: pxToRem(chip),
  height: pxToRem(chip),
  borderRadius: "50%",
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  // Hidden until hovered/focused — see `Wrap` for the activation rule.
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 120ms ease",
  boxShadow: theme.shadows[2],
  "&:hover": { background: theme.palette.surface.interface.active },
  "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> same rationale as EditBtn
const ResetBtn = styled("button", {
  shouldForwardProp: (p) => p !== "chip",
})<{ chip: number }>(({ theme, chip }) => ({
  position: "absolute",
  right: pxToRem(-2),
  top: pxToRem(-2),
  width: pxToRem(chip),
  height: pxToRem(chip),
  borderRadius: "50%",
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 120ms ease",
  boxShadow: theme.shadows[2],
  "&:hover": { background: theme.palette.surface.interface.active },
  "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));
