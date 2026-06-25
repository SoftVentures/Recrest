import { type FormEvent, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, TextField } from "@mui/material";

import {
  ChangedFileStatus,
  type GitConfigSnapshot,
  type RepositoryId,
  TauriCommand,
} from "@recrest/shared";

import { ChevronDown, ChevronRight, FileText, GitBranch, User } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import {
  AuthorLine,
  BranchChip,
  ContextRow,
  ContextText,
  Field,
  FieldLabel,
  FieldLabelRow,
  FilePath,
  FileRow,
  FilesHeader,
  FilesHeaderLabel,
  FilesList,
  Form,
  HooksBadge,
  KindBadge,
  NoAuthorWarn,
  SubjectCounter,
  SubjectField,
  SubjectRow,
  TemplateSlot,
} from "@/components/organisms/repos/CommitDialog/CommitDialog.styles";
import { renderCommitTemplate } from "@/components/organisms/repos/CommitDialog/template";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { gitCommit } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface CommitDialogProps {
  open: boolean;
  repoId: RepositoryId | null;
  onClose: () => void;
}

/** Conventional subject line length — git's `--check` warns above this. */
const SUBJECT_SOFT_LIMIT = 50;
/** Hard ceiling commonly enforced by linters / GitHub UIs. */
const SUBJECT_HARD_LIMIT = 72;
/** Files list collapses by default above this count. */
const FILES_COLLAPSE_THRESHOLD = 5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function joinCommitMessage(subject: string, body: string): string {
  const s = subject.trim();
  const b = body.trim();
  return b ? `${s}\n\n${b}` : s;
}

function CommitDialog({ open, repoId, onClose }: CommitDialogProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const dispatch = useAppDispatch();

  const repo = useAppSelector((s) => (repoId ? s.repos.items[repoId] : null));
  const template = useAppSelector(
    (s) => s.settings.backend?.commitMessageTemplate ?? "{{author}}: {{date}}",
  );
  const overrideUserName = useAppSelector(
    (s) => s.settings.backend?.gitConfigOverride.userName ?? null,
  );

  const stagedFiles = useMemo(
    () => (repo?.status.changedFiles ?? []).filter((f) => f.status === ChangedFileStatus.STAGED),
    [repo],
  );
  const branch = repo?.status.branch ?? null;

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hookActive, setHookActive] = useState(false);
  const [effectiveAuthor, setEffectiveAuthor] = useState<{
    name: string | null;
    email: string | null;
  }>({ name: null, email: null });
  const [filesExpanded, setFilesExpanded] = useState(false);

  // Reset the form, kick off hook detection, and resolve the effective git
  // identity for the context line. Hook detection + identity resolution are
  // best-effort: outside Tauri the wrapper rejects and we just don't show
  // the badge / fall back to the override.
  useEffect(() => {
    if (!open) return;
    setSubject("");
    setBody("");
    setSubmitting(false);
    setFilesExpanded(stagedFiles.length <= FILES_COLLAPSE_THRESHOLD);

    if (!repoId || !isTauri()) {
      setHookActive(false);
      setEffectiveAuthor({ name: overrideUserName, email: null });
      return;
    }
    let cancelled = false;
    void invoke<boolean>(TauriCommand.GIT_HAS_PRE_COMMIT_HOOK, { repoId })
      .then((on) => {
        if (!cancelled) setHookActive(on);
      })
      .catch(() => {
        if (!cancelled) setHookActive(false);
      });
    void invoke<GitConfigSnapshot>(TauriCommand.GET_GIT_CONFIG, { repoId })
      .then((snap) => {
        if (cancelled) return;
        const name = snap.entries["user.name"] ?? overrideUserName ?? null;
        const email = snap.entries["user.email"] ?? null;
        setEffectiveAuthor({ name, email });
      })
      .catch(() => {
        if (!cancelled) setEffectiveAuthor({ name: overrideUserName, email: null });
      });
    return () => {
      cancelled = true;
    };
    // We want this to re-fire on every open and when the repo changes — the
    // staged-files threshold check needs the current snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repoId]);

  const insertTemplate = () => {
    const rendered = renderCommitTemplate(template, {
      author: effectiveAuthor.name ?? overrideUserName ?? "you",
      date: todayIso(),
    });
    // Template goes into the subject — it's a one-liner like "{{author}}: {{date}}".
    setSubject(rendered);
  };

  const subjectLen = subject.trim().length;
  const counterTone =
    subjectLen > SUBJECT_HARD_LIMIT
      ? "error"
      : subjectLen > SUBJECT_SOFT_LIMIT
        ? "warn"
        : "default";

  const canSubmit = !!repoId && subject.trim().length > 0;

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit || !repoId) return;
    setSubmitting(true);
    try {
      await dispatch(gitCommit({ repoId, message: joinCommitMessage(subject, body) })).unwrap();
      toast.success(t("commit_dialog.submit_success"));
      onClose();
    } catch (err) {
      const raw = String((err as Error)?.message ?? err);
      if (raw.includes("requires-git-config")) {
        toast.error(t("commit_dialog.missing_git_config"));
      } else {
        toast.error(`${t("commit_dialog.submit_error")}: ${raw}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filesCount = stagedFiles.length;
  const filesLabel = t("commit_dialog.staged_files", { count: filesCount });

  const authorLabel = effectiveAuthor.name
    ? effectiveAuthor.email
      ? `${effectiveAuthor.name} <${effectiveAuthor.email}>`
      : effectiveAuthor.name
    : null;

  return (
    <GeneralModal
      open={open}
      modalWidth={640}
      customTitle={t("commit_dialog.title")}
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.commitDialog.root}
      contentChildren={
        <Form id="commit-dialog-form" onSubmit={(e) => void onSubmit(e)}>
          <ContextRow>
            <ContextText>
              <Box component="span">{filesLabel}</Box>
              {branch && (
                <>
                  <Box component="span">·</Box>
                  <BranchChip component="span">
                    <GitBranch size={11} aria-hidden />
                    {branch}
                  </BranchChip>
                </>
              )}
              {authorLabel ? (
                <>
                  <Box component="span">·</Box>
                  <AuthorLine component="span">
                    <User size={11} aria-hidden />
                    {t("commit_dialog.context_as_author", { author: authorLabel })}
                  </AuthorLine>
                </>
              ) : (
                <>
                  <Box component="span">·</Box>
                  <NoAuthorWarn component="span">
                    <User size={11} aria-hidden />
                    {t("commit_dialog.context_no_author")}
                  </NoAuthorWarn>
                </>
              )}
            </ContextText>
            {hookActive && (
              <GeneralTooltip title={t("commit_dialog.hooks_active_hint")} placement="top">
                <HooksBadge component="span" data-testid={TEST_IDS.commitDialog.hooksBadge}>
                  {t("commit_dialog.hooks_active")}
                </HooksBadge>
              </GeneralTooltip>
            )}
          </ContextRow>

          {filesCount > 0 && (
            <Box>
              <FilesHeader
                type="button"
                onClick={() => setFilesExpanded((v) => !v)}
                aria-expanded={filesExpanded}
                data-testid={TEST_IDS.commitDialog.filesToggle}
              >
                {filesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <FileText size={13} />
                <FilesHeaderLabel component="span">{filesLabel}</FilesHeaderLabel>
              </FilesHeader>
              {filesExpanded && (
                <FilesList data-testid={TEST_IDS.commitDialog.filesList}>
                  {stagedFiles.map((f) => (
                    <FileRow key={f.path}>
                      <KindBadge kind={f.kind}>{f.kind}</KindBadge>
                      <FilePath component="span">{f.path}</FilePath>
                    </FileRow>
                  ))}
                </FilesList>
              )}
            </Box>
          )}

          <Field>
            <FieldLabelRow>
              <FieldLabel htmlFor="commit-dialog-subject-input">
                {t("commit_dialog.subject_label")}
              </FieldLabel>
              <SubjectCounter tone={counterTone} variant="caption">
                {t("commit_dialog.subject_counter", {
                  length: subjectLen,
                  limit: SUBJECT_SOFT_LIMIT,
                })}
              </SubjectCounter>
            </FieldLabelRow>
            <SubjectRow>
              <SubjectField>
                <TextField
                  autoFocus
                  required
                  fullWidth
                  size="small"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("commit_dialog.subject_placeholder")}
                  id="commit-dialog-subject-input"
                  slotProps={{
                    htmlInput: {
                      "data-testid": TEST_IDS.commitDialog.subject,
                      maxLength: 200,
                    },
                  }}
                />
              </SubjectField>
              <TemplateSlot>
                <GeneralTooltip title={t("commit_dialog.insert_template_aria")} placement="top">
                  <Box component="span">
                    <GeneralButton
                      variant="outline"
                      onClick={insertTemplate}
                      data-testid={TEST_IDS.commitDialog.insertTemplate}
                    >
                      {t("commit_dialog.insert_template")}
                    </GeneralButton>
                  </Box>
                </GeneralTooltip>
              </TemplateSlot>
            </SubjectRow>
          </Field>

          <Field>
            <FieldLabel htmlFor="commit-dialog-body-input">
              {t("commit_dialog.body_label")}
            </FieldLabel>
            <TextField
              multiline
              minRows={4}
              maxRows={10}
              size="small"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("commit_dialog.body_placeholder")}
              id="commit-dialog-body-input"
              slotProps={{
                htmlInput: { "data-testid": TEST_IDS.commitDialog.body },
              }}
            />
          </Field>
        </Form>
      }
      actionsChildren={
        <>
          <GeneralButton
            variant="ghost"
            onClick={onClose}
            data-testid={TEST_IDS.commitDialog.cancel}
          >
            {t("commit_dialog.cancel")}
          </GeneralButton>
          <GeneralButton
            type="submit"
            form="commit-dialog-form"
            loading={submitting}
            disabled={!canSubmit}
            data-testid={TEST_IDS.commitDialog.submit}
          >
            {t("commit_dialog.submit")}
          </GeneralButton>
        </>
      }
    />
  );
}

export default CommitDialog;
