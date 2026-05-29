import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  type Workflow,
  type WorkflowInputDef,
  WorkflowInputType,
  type WorkflowInputs,
} from "@recrest/shared";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import {
  CheckRow,
  Field,
  FormActions,
  FormWrap,
  Label,
  Req,
  SelectField,
  TextField,
} from "@/components/organisms/repos/CiCard/CiCard.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  workflow: Workflow;
  busy: boolean;
  onSubmit: (gitRef: string, inputs: WorkflowInputs) => void;
  onCancel: () => void;
}

/** Seeds the form value map from each input's declared default. */
function initialValues(defs: WorkflowInputDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of defs) {
    out[d.key] = d.default ?? (d.type === WorkflowInputType.BOOLEAN ? "false" : "");
  }
  return out;
}

export default function RunForm({ workflow, busy, onSubmit, onCancel }: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [gitRef, setGitRef] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(workflow.inputsSchema),
  );

  const setVal = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const missingRequired = workflow.inputsSchema.some(
    (d) => d.required && !(values[d.key] ?? "").trim(),
  );

  const submit = () => {
    const inputs: WorkflowInputs = {};
    for (const d of workflow.inputsSchema) {
      const raw = values[d.key] ?? "";
      if (d.type === WorkflowInputType.BOOLEAN) inputs[d.key] = raw === "true";
      else if (d.type === WorkflowInputType.NUMBER && raw !== "") inputs[d.key] = Number(raw);
      else if (raw !== "") inputs[d.key] = raw;
    }
    onSubmit(gitRef.trim() || "main", inputs);
  };

  return (
    <FormWrap data-testid={TEST_IDS.ci.runForm}>
      <Field>
        <Label component="label">{t("ci.ref_label")}</Label>
        <TextField
          value={gitRef}
          onChange={(e) => setGitRef(e.target.value)}
          placeholder={t("ci.ref_placeholder")}
          data-testid={TEST_IDS.ci.runFormRef}
        />
      </Field>

      {workflow.inputsSchema.length === 0 && <Label component="span">{t("ci.no_inputs")}</Label>}

      {workflow.inputsSchema.map((def) => {
        const id = TEST_IDS.ci.runFormField(def.key);
        const value = values[def.key] ?? "";
        if (def.type === WorkflowInputType.BOOLEAN) {
          return (
            <CheckRow key={def.key}>
              <input
                type="checkbox"
                id={id}
                checked={value === "true"}
                onChange={(e) => setVal(def.key, e.target.checked ? "true" : "false")}
                data-testid={id}
              />
              <Label component="label">{def.label}</Label>
            </CheckRow>
          );
        }
        return (
          <Field key={def.key}>
            <Label component="label">
              {def.label}
              {def.required && (
                <Req component="span" variant="caption">
                  {t("ci.required")}
                </Req>
              )}
            </Label>
            {def.type === WorkflowInputType.CHOICE && def.choices ? (
              <SelectField
                value={value}
                onChange={(e) => setVal(def.key, e.target.value)}
                data-testid={id}
              >
                <option value="" disabled>
                  —
                </option>
                {def.choices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            ) : (
              <TextField
                type={def.type === WorkflowInputType.NUMBER ? "number" : "text"}
                value={value}
                onChange={(e) => setVal(def.key, e.target.value)}
                data-testid={id}
              />
            )}
          </Field>
        );
      })}

      <FormActions>
        <GeneralButton variant="ghost" onClick={onCancel} data-testid={TEST_IDS.ci.runFormCancel}>
          {t("ci.cancel")}
        </GeneralButton>
        <GeneralButton
          variant="default"
          onClick={submit}
          disabled={busy || missingRequired}
          data-testid={TEST_IDS.ci.runFormSubmit}
        >
          <Box component="span">{t("ci.run_short")}</Box>
        </GeneralButton>
      </FormActions>
    </FormWrap>
  );
}
