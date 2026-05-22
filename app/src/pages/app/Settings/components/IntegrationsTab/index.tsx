import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Folder, FolderOpen, Plus, X } from "lucide-react";

const Section = styled("section")({
  marginBottom: 22,
});

const SectionLabel = styled("h3")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
}));

const SectionDesc = styled("p")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  margin: "0 0 10px 2px",
}));

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 10,
}));

const CardTitle = styled("div")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: 4,
}));

const CardSub = styled("div")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  marginBottom: 10,
}));

const InputRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const TextInput = styled("input")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  height: 32,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  outline: "none",
  "&::placeholder": { color: theme.palette.text.informationLight },
  "&:focus": { borderColor: theme.palette.border.hover },
}));

const BrowseBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

const AddBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 14px",
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
    borderColor: theme.palette.surface.button.ctaHover,
  },
}));

const PathRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  marginBottom: 6,
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  color: theme.palette.text.primary,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
}));

const PathText = styled("span")({ flex: 1, minWidth: 0 });

const PathRemove = styled("button")(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: 8,
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
}));

export function IntegrationsSection() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [paths, setPaths] = useState<string[]>(["~/Code"]);

  const onAdd = () => {
    const next = draft.trim();
    if (!next || paths.includes(next)) return;
    setPaths([...paths, next]);
    setDraft("");
  };

  const onRemove = (p: string) => setPaths(paths.filter((x) => x !== p));

  return (
    <Section>
      <SectionLabel>
        {t("settings.integrations.scan", { defaultValue: "Scan sources" })}
      </SectionLabel>
      <SectionDesc>
        {t("settings.integrations.scan_sub", {
          defaultValue: "Folders Recrest scans recursively for git repositories.",
        })}
      </SectionDesc>

      <Card>
        <CardTitle>{t("settings.integrations.add", { defaultValue: "Add scan path" })}</CardTitle>
        <CardSub>
          {t("settings.integrations.add_sub", {
            defaultValue: "Recrest scans this folder and every sub-folder for git repositories.",
          })}
        </CardSub>
        <InputRow>
          <TextInput
            placeholder="/path/to/repos"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
            }}
            data-testid="settings-scan-input"
          />
          <BrowseBtn type="button" data-testid="settings-scan-browse">
            <FolderOpen size={13} />
            Browse…
          </BrowseBtn>
          <AddBtn type="button" onClick={onAdd} data-testid="settings-scan-add">
            <Plus size={13} />
            Add
          </AddBtn>
        </InputRow>
      </Card>

      {paths.map((p) => (
        <PathRow key={p}>
          <Folder size={13} />
          <PathText>{p}</PathText>
          <PathRemove
            type="button"
            aria-label={`Remove ${p}`}
            onClick={() => onRemove(p)}
            data-testid={`settings-scan-remove-${p}`}
          >
            <X size={13} />
          </PathRemove>
        </PathRow>
      ))}
    </Section>
  );
}
