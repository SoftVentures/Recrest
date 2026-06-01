import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, FormControlLabel, MenuItem, TextField } from "@mui/material";

import type { GitConfigEntry, GitConfigLayer } from "@recrest/shared";

import { FileText, Lock } from "lucide-react";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import {
  BooleanRow,
  EditRow,
  FieldLabel,
  FieldLeft,
  FieldMeta,
  FieldRight,
  FieldRow,
  FieldSubtitle,
  ReadOnlyChip,
  SingleLayerHint,
  SourceBadge,
  SourceCondition,
  ValueText,
} from "@/components/molecules/gitConfig/LayeredField/GitConfigStyles";
import type { GitConfigFieldSpec } from "@/lib/constants/gitConfigSchema";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface LayeredFieldProps {
  field: GitConfigFieldSpec;
  origin: GitConfigEntry | undefined;
  writableLayers: readonly GitConfigLayer[];
  onSave: (filePath: string, value: string) => Promise<void>;
}

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? path : path.slice(idx + 1);
}

export default function LayeredField({ field, origin, writableLayers, onSave }: LayeredFieldProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);

  const sourceWritable = useMemo(() => {
    if (!origin) return false;
    return writableLayers.some((l) => l.path === origin.sourcePath);
  }, [origin, writableLayers]);

  const readOnly = origin !== undefined && !sourceWritable;
  const noWritable = writableLayers.length === 0;

  const defaultLayerPath = useMemo(() => {
    if (origin && writableLayers.some((l) => l.path === origin.sourcePath)) {
      return origin.sourcePath;
    }
    return writableLayers[0]?.path ?? "";
  }, [origin, writableLayers]);

  const originValue = origin?.value ?? "";
  const [value, setValue] = useState(originValue);
  const [selectedLayer, setSelectedLayer] = useState(defaultLayerPath);
  const committedValueRef = useRef(originValue);
  const isFocusedRef = useRef(false);

  // Sync local value when origin changes from outside (e.g. after refresh) —
  // unless the user is mid-edit in the text input.
  useEffect(() => {
    if (isFocusedRef.current) return;
    if (originValue !== committedValueRef.current) {
      setValue(originValue);
      committedValueRef.current = originValue;
    } else if (value !== originValue) {
      setValue(originValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originValue]);

  useEffect(() => {
    setSelectedLayer((prev) =>
      prev && writableLayers.some((l) => l.path === prev) ? prev : defaultLayerPath,
    );
  }, [defaultLayerPath, writableLayers]);

  const commit = async (nextValue: string) => {
    if (!selectedLayer) return;
    if (
      nextValue === committedValueRef.current &&
      selectedLayer === (origin?.sourcePath ?? defaultLayerPath)
    ) {
      return;
    }
    try {
      await onSave(selectedLayer, nextValue);
      committedValueRef.current = nextValue;
    } catch {
      // toast handled upstream; keep local value so user can retry
    }
  };

  const renderInput = (): ReactNode => {
    if (field.kind === "boolean") {
      const checked = value === "true";
      return (
        <FormControlLabel
          label={t(field.labelKey)}
          data-testid={TEST_IDS.gitConfigSettings.field(field.key)}
          control={
            <GeneralSwitchInput
              checked={checked}
              disabled={noWritable}
              onCheckedChange={(c) => {
                const next = c ? "true" : "false";
                setValue(next);
                void commit(next);
              }}
              aria-label={t(field.labelKey)}
            />
          }
        />
      );
    }
    if (field.kind === "select") {
      return (
        <TextField
          select
          size="small"
          value={value}
          disabled={noWritable}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            void commit(next);
          }}
          fullWidth
          slotProps={{
            htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.field(field.key) },
          }}
        >
          <MenuItem value="">—</MenuItem>
          {(field.options ?? []).map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      );
    }
    const longtext = field.kind === "longtext";
    return (
      <TextField
        size="small"
        type={field.kind === "email" ? "email" : "text"}
        value={value}
        disabled={noWritable}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          void commit(e.target.value);
        }}
        multiline={longtext}
        rows={longtext ? 3 : undefined}
        fullWidth
        slotProps={{
          htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.field(field.key) },
        }}
      />
    );
  };

  const renderLayerPicker = (): ReactNode => {
    if (writableLayers.length === 1) {
      const only = writableLayers[0];
      if (!only) return null;
      return (
        <SingleLayerHint
          aria-label={t("settings.git.layer_select_label")}
          tabIndex={0}
          data-testid={TEST_IDS.gitConfigSettings.layeredFieldLayerSelect(field.key)}
        >
          {basename(only.path)}
        </SingleLayerHint>
      );
    }
    return (
      <TextField
        select
        size="small"
        label={t("settings.git.layer_select_label")}
        value={selectedLayer}
        onChange={(e) => setSelectedLayer(e.target.value)}
        slotProps={{
          htmlInput: {
            "data-testid": TEST_IDS.gitConfigSettings.layeredFieldLayerSelect(field.key),
          },
        }}
      >
        {writableLayers.map((layer) => (
          <MenuItem key={layer.path} value={layer.path}>
            {basename(layer.path)}
            {layer.condition && (
              <SourceCondition style={{ marginLeft: 8 }}>{layer.condition}</SourceCondition>
            )}
          </MenuItem>
        ))}
      </TextField>
    );
  };

  const renderReadOnly = (): ReactNode => {
    if (field.kind === "boolean") {
      const checked = origin?.value === "true";
      return (
        <BooleanRow>
          <GeneralSwitchInput
            checked={checked}
            disabled
            aria-label={t(field.labelKey)}
            slotProps={{ input: { "aria-label": t(field.labelKey) } }}
          />
        </BooleanRow>
      );
    }
    return <ValueText>{origin?.value ?? ""}</ValueText>;
  };

  return (
    <FieldRow data-testid={TEST_IDS.gitConfigSettings.layeredField(field.key)}>
      <FieldLeft>
        <FieldLabel>{t(field.labelKey)}</FieldLabel>
        {field.helpKey && <FieldSubtitle>{t(field.helpKey)}</FieldSubtitle>}
      </FieldLeft>
      <FieldRight>
        <EditRow>
          {readOnly ? (
            renderReadOnly()
          ) : noWritable ? (
            <GeneralTooltip title={t("settings.git.no_writable_layer")} placement="top">
              <Box component="span">{renderInput()}</Box>
            </GeneralTooltip>
          ) : (
            <>
              {renderInput()}
              {renderLayerPicker()}
            </>
          )}
        </EditRow>
        {(origin || readOnly) && (
          <FieldMeta>
            {origin && (
              <SourceBadge
                data-testid={TEST_IDS.gitConfigSettings.layeredFieldSourceBadge(field.key)}
              >
                <FileText size={11} aria-hidden />
                {t("settings.git.source_badge_label", { source: basename(origin.sourcePath) })}
              </SourceBadge>
            )}
            {origin?.sourceCondition && <SourceCondition>{origin.sourceCondition}</SourceCondition>}
            {readOnly && (
              <ReadOnlyChip>
                <Lock size={11} aria-hidden />
                {t("settings.git.read_only")}
              </ReadOnlyChip>
            )}
          </FieldMeta>
        )}
      </FieldRight>
    </FieldRow>
  );
}
