import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Check, FolderOpen, KeyRound, ServerCog, Sparkles } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import SshKeyGuideModal from "@/components/organisms/ssh/SshKeyGuideModal";
import { useSshKeys } from "@/hooks/useSshKeys";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { pickFile } from "@/lib/utils/pickFolder.utils";

const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

const OptionList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required for keyboard/focus on a selectable row
const Option = styled("button", { shouldForwardProp: (p) => p !== "selected" })<{
  selected: boolean;
}>(({ theme, selected }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected
    ? `color-mix(in srgb, ${theme.palette.primary.main} 8%, transparent)`
    : theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": { borderColor: theme.palette.border.hover },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

const OptionIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  flexShrink: 0,
  color: theme.palette.text.information,
})) as typeof Box;

const OptionBody = styled(Box)({ flex: 1, minWidth: 0 }) as typeof Box;

const OptionName = styled(Typography)({
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
}) as typeof Typography;

const OptionSub = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

const Tick = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  flexShrink: 0,
  color: theme.palette.primary.main,
})) as typeof Box;

const Actions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
}) as typeof Box;

const Spacer = styled(Box)({ flex: 1 }) as typeof Box;

export interface SshKeyFieldProps {
  value: string | null;
  onChange: (keyPath: string | null) => void;
}

export function SshKeyField({ value, onChange }: SshKeyFieldProps) {
  const { t } = useTranslation();
  const { listing } = useSshKeys();
  const [guideOpen, setGuideOpen] = useState(false);

  const detectedPaths = listing.keys.map((k) => k.path);
  const isCustom = !!value && !detectedPaths.includes(value);

  const browse = async () => {
    const picked = await pickFile(value ?? listing.dir ?? undefined);
    if (picked) onChange(picked);
  };

  return (
    <Wrap data-testid={TEST_IDS.ssh.field}>
      <OptionList>
        {listing.keys.map((key) => {
          const selected = value === key.path;
          return (
            <Option
              key={key.path}
              type="button"
              selected={selected}
              data-testid={TEST_IDS.ssh.option(key.name)}
              onClick={() => onChange(key.path)}
            >
              <OptionIcon>
                <KeyRound size={15} />
              </OptionIcon>
              <OptionBody>
                <OptionName>{key.name}</OptionName>
                <OptionSub variant="caption">{key.path}</OptionSub>
              </OptionBody>
              {selected && (
                <Tick>
                  <Check size={15} />
                </Tick>
              )}
            </Option>
          );
        })}

        {isCustom && (
          <Option type="button" selected data-testid={TEST_IDS.ssh.option("custom")}>
            <OptionIcon>
              <KeyRound size={15} />
            </OptionIcon>
            <OptionBody>
              <OptionName>{t("ssh.custom_key")}</OptionName>
              <OptionSub variant="caption">{value}</OptionSub>
            </OptionBody>
            <Tick>
              <Check size={15} />
            </Tick>
          </Option>
        )}

        <Option
          type="button"
          selected={value === null}
          data-testid={TEST_IDS.ssh.none}
          onClick={() => onChange(null)}
        >
          <OptionIcon>
            <ServerCog size={15} />
          </OptionIcon>
          <OptionBody>
            <OptionName>{t("ssh.use_agent_option")}</OptionName>
            <OptionSub variant="caption">{t("ssh.use_agent_sub")}</OptionSub>
          </OptionBody>
          {value === null && (
            <Tick>
              <Check size={15} />
            </Tick>
          )}
        </Option>
      </OptionList>

      <Actions>
        <GeneralButton
          variant="outline"
          size="sm"
          startIcon={<FolderOpen size={13} />}
          disabled={!isTauri()}
          data-testid={TEST_IDS.ssh.browse}
          onClick={() => void browse()}
        >
          {t("ssh.browse")}
        </GeneralButton>
        <Spacer />
        <GeneralButton
          variant="ghost"
          size="sm"
          startIcon={<Sparkles size={13} />}
          data-testid={TEST_IDS.ssh.guideOpen}
          onClick={() => setGuideOpen(true)}
        >
          {t("ssh.guide.trigger")}
        </GeneralButton>
      </Actions>

      <SshKeyGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </Wrap>
  );
}

export default SshKeyField;
