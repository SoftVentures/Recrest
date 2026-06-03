/** Labelling schema for the git-config settings UI — NOT a backend
 *  whitelist. The backend (`is_valid_config_key` in `commands/git_config.rs`)
 *  accepts any key matching git's grammar; this file only governs how the UI
 *  groups and labels the keys it knows about. Unknown keys still render in
 *  the "custom" section. */
import { GitConfigKey } from "@recrest/shared";

export type GitConfigControlKind = "text" | "email" | "boolean" | "select" | "longtext";

export interface GitConfigFieldSpec {
  key: string;
  labelKey: string;
  helpKey?: string;
  kind: GitConfigControlKind;
  options?: readonly string[];
}

export interface GitConfigSectionSpec {
  id:
    | "identity"
    | "commit"
    | "push"
    | "pull"
    | "merge"
    | "rebase"
    | "editor"
    | "init"
    | "credentials"
    | "aliases"
    | "url-rewrites"
    | "custom";
  titleKey: string;
  fields: readonly GitConfigFieldSpec[];
}

export const GIT_CONFIG_SECTIONS: readonly GitConfigSectionSpec[] = [
  {
    id: "identity",
    titleKey: "settings.git.section.identity",
    fields: [
      {
        key: GitConfigKey.USER_NAME,
        labelKey: "settings.git.label_user_name",
        helpKey: "settings.git.help_user_name",
        kind: "text",
      },
      {
        key: GitConfigKey.USER_EMAIL,
        labelKey: "settings.git.label_user_email",
        helpKey: "settings.git.help_user_email",
        kind: "email",
      },
      {
        key: "user.signingkey",
        labelKey: "settings.git.label_signingkey",
        helpKey: "settings.git.help_signingkey",
        kind: "text",
      },
    ],
  },
  {
    id: "commit",
    titleKey: "settings.git.section.commit",
    fields: [
      {
        key: GitConfigKey.COMMIT_GPGSIGN,
        labelKey: "settings.git.label_commit_gpgsign",
        helpKey: "settings.git.help_commit_gpgsign",
        kind: "boolean",
      },
      {
        key: "commit.template",
        labelKey: "settings.git.label_commit_template",
        helpKey: "settings.git.help_commit_template",
        kind: "text",
      },
      {
        key: "gpg.format",
        labelKey: "settings.git.label_gpg_format",
        helpKey: "settings.git.help_gpg_format",
        kind: "select",
        options: ["openpgp", "x509", "ssh"],
      },
      {
        key: "gpg.program",
        labelKey: "settings.git.label_gpg_program",
        helpKey: "settings.git.help_gpg_program",
        kind: "text",
      },
    ],
  },
  {
    id: "push",
    titleKey: "settings.git.section.push",
    fields: [
      {
        key: "push.autoSetupRemote",
        labelKey: "settings.git.label_push_autosetup",
        helpKey: "settings.git.help_push_autosetup",
        kind: "boolean",
      },
      {
        key: "push.default",
        labelKey: "settings.git.label_push_default",
        helpKey: "settings.git.help_push_default",
        kind: "select",
        options: ["nothing", "current", "upstream", "simple", "matching"],
      },
      {
        key: "push.followTags",
        labelKey: "settings.git.label_push_followtags",
        helpKey: "settings.git.help_push_followtags",
        kind: "boolean",
      },
    ],
  },
  {
    id: "pull",
    titleKey: "settings.git.section.pull",
    fields: [
      {
        key: GitConfigKey.PULL_REBASE,
        labelKey: "settings.git.label_pull_rebase",
        helpKey: "settings.git.help_pull_rebase",
        kind: "select",
        options: ["true", "false", "merges", "interactive"],
      },
      {
        key: "pull.ff",
        labelKey: "settings.git.label_pull_ff",
        helpKey: "settings.git.help_pull_ff",
        kind: "select",
        options: ["true", "false", "only"],
      },
      {
        key: "fetch.prune",
        labelKey: "settings.git.label_fetch_prune",
        helpKey: "settings.git.help_fetch_prune",
        kind: "boolean",
      },
    ],
  },
  {
    id: "merge",
    titleKey: "settings.git.section.merge",
    fields: [
      {
        key: "merge.conflictstyle",
        labelKey: "settings.git.label_merge_conflictstyle",
        helpKey: "settings.git.help_merge_conflictstyle",
        kind: "select",
        options: ["merge", "diff3", "zdiff3"],
      },
    ],
  },
  {
    id: "rebase",
    titleKey: "settings.git.section.rebase",
    fields: [
      {
        key: "rebase.autoSquash",
        labelKey: "settings.git.label_rebase_autosquash",
        helpKey: "settings.git.help_rebase_autosquash",
        kind: "boolean",
      },
      {
        key: "rebase.autoStash",
        labelKey: "settings.git.label_rebase_autostash",
        helpKey: "settings.git.help_rebase_autostash",
        kind: "boolean",
      },
      {
        key: "rebase.updateRefs",
        labelKey: "settings.git.label_rebase_updaterefs",
        helpKey: "settings.git.help_rebase_updaterefs",
        kind: "boolean",
      },
    ],
  },
  {
    id: "editor",
    titleKey: "settings.git.section.editor",
    fields: [
      {
        key: GitConfigKey.CORE_EDITOR,
        labelKey: "settings.git.label_core_editor",
        helpKey: "settings.git.help_core_editor",
        kind: "text",
      },
      {
        key: GitConfigKey.CORE_AUTOCRLF,
        labelKey: "settings.git.label_core_autocrlf",
        helpKey: "settings.git.help_core_autocrlf",
        kind: "select",
        options: ["true", "false", "input"],
      },
      {
        key: "core.excludesfile",
        labelKey: "settings.git.label_core_excludesfile",
        helpKey: "settings.git.help_core_excludesfile",
        kind: "text",
      },
      {
        key: "core.hooksPath",
        labelKey: "settings.git.label_core_hookspath",
        helpKey: "settings.git.help_core_hookspath",
        kind: "text",
      },
    ],
  },
  {
    id: "init",
    titleKey: "settings.git.section.init",
    fields: [
      {
        key: GitConfigKey.INIT_DEFAULT_BRANCH,
        labelKey: "settings.git.label_init_default_branch",
        helpKey: "settings.git.help_init_default_branch",
        kind: "text",
      },
    ],
  },
  {
    id: "credentials",
    titleKey: "settings.git.section.credentials",
    fields: [
      {
        key: "credential.helper",
        labelKey: "settings.git.label_credential_helper",
        helpKey: "settings.git.help_credential_helper",
        kind: "text",
      },
      {
        key: "credential.useHttpPath",
        labelKey: "settings.git.label_credential_usehttppath",
        helpKey: "settings.git.help_credential_usehttppath",
        kind: "boolean",
      },
    ],
  },
];

export const ALIAS_PREFIX = "alias.";
export const URL_PREFIX = "url.";

export const STRUCTURED_PREFIXES = [ALIAS_PREFIX, URL_PREFIX] as const;

export function isStructuredKey(key: string): boolean {
  return STRUCTURED_PREFIXES.some((p) => key.startsWith(p));
}

const ALL_KNOWN_KEYS = new Set(GIT_CONFIG_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)));

export function isKnownKey(key: string): boolean {
  return ALL_KNOWN_KEYS.has(key);
}
