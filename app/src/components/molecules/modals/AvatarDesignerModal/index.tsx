import { createElement, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import {
  IconGrid,
  IconHeader,
  IconScroll,
  IconTile,
  Layout,
  NoMatches,
  Pickers,
  PreviewCol,
  PreviewLabel,
  Section,
  SectionLabel,
  Swatch,
  SwatchGrid,
} from "@/components/molecules/modals/AvatarDesignerModal/AvatarDesignerModal.styles";
import { buildAvatarSvg } from "@/components/molecules/modals/AvatarDesignerModal/buildAvatarSvg";
import { AVATAR_ICONS } from "@/components/molecules/modals/AvatarDesignerModal/icons";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import {
  AVATAR_BACKGROUNDS,
  type AvatarBackground,
  avatarBackgroundCss,
} from "@/lib/constants/avatarDesign.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { pxToRem } from "@/theme/scale";

interface Props {
  open: boolean;
  /** Fallback initial shown in the preview tile (only visible if no icon is
   *  selected — the designer always defaults to one, so it's a belt-and-braces
   *  guard for `GeneralAvatar`'s required `letter`). */
  letter: string;
  /** The repo's current avatar gradient stops. Preselected so opening the
   *  designer keeps the background the user already sees. When it doesn't match
   *  a curated swatch it's surfaced as a leading "current" swatch. */
  initialStops?: readonly [string, string];
  onClose: () => void;
  onSave: (svg: string) => void;
  busy?: boolean;
}

const DEFAULT_ICON_ID = "folder";
const CURRENT_BG_ID = "current";

const stopsEqual = (a: readonly [string, string], b: readonly [string, string]) =>
  a[0] === b[0] && a[1] === b[1];

export default function AvatarDesignerModal({
  open,
  letter,
  initialStops,
  onClose,
  onSave,
  busy,
}: Props) {
  const { t } = useTranslation(I18nNamespace.REPOS);

  // The selectable backgrounds, plus the repo's current gradient prepended as a
  // "current" swatch when it isn't already one of the curated options. `initialBgId`
  // is the swatch to preselect on open.
  const { backgrounds, initialBgId } = useMemo(() => {
    if (!initialStops) {
      return { backgrounds: AVATAR_BACKGROUNDS, initialBgId: AVATAR_BACKGROUNDS[0]!.id };
    }
    const match = AVATAR_BACKGROUNDS.find((b) => stopsEqual(b.stops, initialStops));
    if (match) return { backgrounds: AVATAR_BACKGROUNDS, initialBgId: match.id };
    const current: AvatarBackground = {
      id: CURRENT_BG_ID,
      stops: initialStops,
      gradient: initialStops[0] !== initialStops[1],
    };
    return { backgrounds: [current, ...AVATAR_BACKGROUNDS], initialBgId: CURRENT_BG_ID };
  }, [initialStops]);

  const [bgId, setBgId] = useState(initialBgId);
  const [iconId, setIconId] = useState(DEFAULT_ICON_ID);
  const [query, setQuery] = useState("");

  // Reset each time the designer is reopened so a previous session's pick doesn't
  // linger — background snaps back to the repo's current one.
  useEffect(() => {
    if (open) {
      setBgId(initialBgId);
      setIconId(DEFAULT_ICON_ID);
      setQuery("");
    }
  }, [open, initialBgId]);

  const background = backgrounds.find((b) => b.id === bgId) ?? backgrounds[0]!;
  const icon = AVATAR_ICONS.find((i) => i.id === iconId) ?? AVATAR_ICONS[0]!;
  const PreviewIcon = icon.Icon;

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AVATAR_ICONS;
    // Match the English id and the German synonyms so search works in both
    // locales (both are checked regardless of the active language).
    return AVATAR_ICONS.filter((entry) => entry.id.includes(q) || entry.de.includes(q));
  }, [query]);

  const handleSave = () => {
    if (busy) return;
    onSave(buildAvatarSvg(background.stops, icon.Icon));
  };

  return (
    <GeneralModal
      open={open}
      modalWidth={640}
      customTitle={t("avatar.designer.title")}
      subtitle={t("avatar.designer.subtitle")}
      onCloseModal={onClose}
      transparentBackdrop
      data-testid={TEST_IDS.repoDetail.avatarDesigner}
      contentChildren={
        <Layout>
          <PreviewCol>
            <GeneralAvatar
              size={96}
              radius={20}
              gradient={avatarBackgroundCss(background.stops)}
              letter={letter}
              glyph={<PreviewIcon size={pxToRem(48)} strokeWidth={2} aria-hidden />}
            />
            <PreviewLabel>{t("avatar.designer.preview_label")}</PreviewLabel>
          </PreviewCol>
          <Pickers>
            <Section>
              <SectionLabel>{t("avatar.designer.background_label")}</SectionLabel>
              <SwatchGrid>
                {backgrounds.map((b) => (
                  <Swatch
                    key={b.id}
                    type="button"
                    background={avatarBackgroundCss(b.stops)}
                    selected={b.id === bgId}
                    onClick={() => setBgId(b.id)}
                    aria-label={b.id}
                    data-testid={TEST_IDS.repoDetail.avatarDesignerBg(b.id)}
                  />
                ))}
              </SwatchGrid>
            </Section>
            <Section>
              <IconHeader>
                <SectionLabel>{t("avatar.designer.icon_label")}</SectionLabel>
                <GeneralSearchInput
                  value={query}
                  onChange={setQuery}
                  width={180}
                  placeholder={t("avatar.designer.icon_search")}
                  aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
                  clearLabel={t("search.clear", { ns: I18nNamespace.ARIA })}
                  data-testid={TEST_IDS.repoDetail.avatarDesignerSearch}
                />
              </IconHeader>
              {filteredIcons.length === 0 ? (
                <NoMatches>{t("avatar.designer.icon_empty")}</NoMatches>
              ) : (
                <IconScroll>
                  <IconGrid>
                    {filteredIcons.map((entry) => (
                      <IconTile
                        key={entry.id}
                        type="button"
                        selected={entry.id === iconId}
                        onClick={() => setIconId(entry.id)}
                        aria-label={entry.id}
                        data-testid={TEST_IDS.repoDetail.avatarDesignerIcon(entry.id)}
                      >
                        {createElement(entry.Icon, { size: pxToRem(18), "aria-hidden": true })}
                      </IconTile>
                    ))}
                  </IconGrid>
                </IconScroll>
              )}
            </Section>
          </Pickers>
        </Layout>
      }
      actionsChildren={
        <GeneralButton
          variant="default"
          onClick={handleSave}
          disabled={busy}
          data-testid={TEST_IDS.repoDetail.avatarDesignerSave}
        >
          {t("avatar.designer.save")}
        </GeneralButton>
      }
    />
  );
}
