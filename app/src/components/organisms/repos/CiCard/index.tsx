import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  TauriCommand,
  type Workflow,
  type WorkflowInputs,
  type WorkflowRun,
} from "@recrest/shared";

import { ExternalLink, Play, Square } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import {
  Empty,
  Head,
  RunList,
  RunMain,
  RunMeta,
  RunRow,
  RunTitle,
  StatusDot,
  Title,
} from "@/components/organisms/repos/CiCard/CiCard.styles";
import RunForm from "@/components/organisms/repos/CiCard/parts/RunForm";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { timeAgo } from "@/lib/utils/timeAgo.utils";

interface Props {
  repoId: string;
}

const RUN_LIMIT = 10;

/** Maps a run's status/conclusion onto the four-tone status dot. A run that
 *  hasn't completed is amber (running); completed runs key off conclusion. */
function runTone(run: WorkflowRun): "passing" | "failing" | "running" | "idle" {
  const c = (run.conclusion ?? "").toLowerCase();
  if (c === "success" || c === "successful") return "passing";
  if (c === "failure" || c === "failed" || c === "error") return "failing";
  const s = run.status.toLowerCase();
  if (s === "completed") return "idle";
  return "running";
}

function isCancelable(run: WorkflowRun): boolean {
  const s = run.status.toLowerCase();
  return s !== "completed" && s !== "success" && s !== "failed";
}

export default function CiCard({ repoId }: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeWorkflow = workflows?.[0] ?? null;

  const loadRuns = useCallback(
    async (workflowId: string) => {
      const list = await invoke<WorkflowRun[]>(TauriCommand.LIST_WORKFLOW_RUNS, {
        repoId,
        workflowId,
        limit: RUN_LIMIT,
      });
      setRuns(list);
    },
    [repoId],
  );

  useEffect(() => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const wfs = await invoke<Workflow[]>(TauriCommand.LIST_WORKFLOWS, { repoId });
        if (cancelled) return;
        setWorkflows(wfs);
        if (wfs[0]) await loadRuns(wfs[0].id);
      } catch {
        if (!cancelled) setWorkflows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoId, loadRuns]);

  const onRun = async (gitRef: string, inputs: WorkflowInputs) => {
    if (!activeWorkflow) return;
    setBusy(true);
    try {
      await invoke<WorkflowRun>(TauriCommand.TRIGGER_WORKFLOW, {
        repoId,
        workflowId: activeWorkflow.id,
        gitRef,
        inputs,
      });
      toast.success(t("ci.run_started"));
      setFormOpen(false);
      await loadRuns(activeWorkflow.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t("ci.run_error"));
    } finally {
      setBusy(false);
    }
  };

  const onCancelRun = async (run: WorkflowRun) => {
    setBusy(true);
    try {
      await invoke(TauriCommand.CANCEL_WORKFLOW_RUN, { repoId, runId: run.id });
      toast.success(t("ci.cancel_done"));
      if (activeWorkflow) await loadRuns(activeWorkflow.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t("ci.cancel_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GeneralCard padding="14px 16px">
      <Box data-testid={TEST_IDS.ci.section}>
        <Head>
          <Title>{t("ci.title")}</Title>
          {activeWorkflow && !formOpen && (
            <GeneralButton
              variant="outline"
              onClick={() => setFormOpen(true)}
              data-testid={TEST_IDS.ci.runBtn}
            >
              <Play size={12} />
              <Box component="span">{t("ci.run")}</Box>
            </GeneralButton>
          )}
        </Head>

        {formOpen && activeWorkflow && (
          <RunForm
            workflow={activeWorkflow}
            busy={busy}
            onSubmit={(gitRef, inputs) => void onRun(gitRef, inputs)}
            onCancel={() => setFormOpen(false)}
          />
        )}

        {loading ? (
          <Empty>{t("ci.loading")}</Empty>
        ) : !activeWorkflow ? (
          <Empty>{t("ci.empty")}</Empty>
        ) : runs.length === 0 ? (
          <Empty>{t("ci.runs_empty")}</Empty>
        ) : (
          <RunList>
            {runs.map((run) => (
              <RunRow key={run.id} data-testid={TEST_IDS.ci.run}>
                <StatusDot tone={runTone(run)} />
                <RunMain>
                  <RunTitle>{t("ci.run_number", { n: run.runNumber })}</RunTitle>
                  <RunMeta>
                    {run.conclusion ?? run.status}
                    {run.actor ? ` · ${run.actor}` : ""} · {timeAgo(run.createdAt)}
                  </RunMeta>
                </RunMain>
                {run.htmlUrl && (
                  <GeneralIconButton
                    size={IconButtonSize.SM}
                    aria-label={t("ci.run_number", { n: run.runNumber })}
                    onClick={() => void openExternal(run.htmlUrl)}
                    icon={<ExternalLink size={12} />}
                  />
                )}
                {isCancelable(run) && (
                  <GeneralIconButton
                    size={IconButtonSize.SM}
                    aria-label={t("ci.cancel")}
                    onClick={() => void onCancelRun(run)}
                    icon={<Square size={12} />}
                    data-testid={TEST_IDS.ci.cancelRun}
                  />
                )}
              </RunRow>
            ))}
          </RunList>
        )}
      </Box>
    </GeneralCard>
  );
}
