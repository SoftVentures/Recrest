/**
 * Tauri IPC command names. These must stay in sync with the
 * `tauri::generate_handler![...]` list in `app/src-tauri/src/lib.rs`.
 *
 * Every `invoke()` call in the frontend should reference a value from
 * `TauriCommand` instead of passing a raw string — typos are caught at
 * compile time and renames only need to happen in one place.
 */
export const TauriCommand = {
  // repos
  SCAN_REPOS: "scan_repos",
  LIST_REPOS: "list_repos",
  REPO_STATUS: "repo_status",
  ADD_REPO: "add_repo",
  REMOVE_REPO: "remove_repo",
  LIST_RECENT_COMMITS: "list_recent_commits",
  LOAD_LOGO_BYTES: "load_logo_bytes",
  OPEN_IN_IDE: "open_in_ide",
  DETECT_IDES: "detect_ides",
  OPEN_TERMINAL: "open_terminal",

  // git operations
  OPEN_IN_EXPLORER: "open_in_explorer",
  GIT_FETCH: "git_fetch",
  GIT_FETCH_ALL: "git_fetch_all",
  GIT_PULL: "git_pull",
  GIT_PUSH: "git_push",
  GIT_CHECKOUT: "git_checkout",
  GIT_CHECKOUT_REMOTE: "git_checkout_remote",
  GIT_LIST_BRANCHES: "git_list_branches",
  GIT_BRANCH_CREATE: "git_branch_create",
  GIT_MERGE: "git_merge",
  GIT_CLONE: "git_clone",

  // search
  FIND_ACROSS_REPOS: "find_across_repos",

  // remote import
  LIST_REMOTE_REPOSITORIES: "list_remote_repositories",
  LIST_REMOTE_ORGANIZATIONS: "list_remote_organizations",
  CLONE_REMOTE_REPOSITORY: "clone_remote_repository",
  CLONE_REMOTE_REPOSITORIES_BULK: "clone_remote_repositories_bulk",
  CREATE_AND_OPEN_WORKSPACE: "create_and_open_workspace",

  // providers
  LIST_PROVIDERS: "list_providers",
  SET_PROVIDER_TOKEN: "set_provider_token",
  SET_PROVIDER_BASE_URL: "set_provider_base_url",
  CLEAR_PROVIDER_TOKEN: "clear_provider_token",
  FETCH_PULL_REQUESTS: "fetch_pull_requests",
  GET_PR_DETAIL: "get_pr_detail",
  LIST_PR_EVENTS: "list_pr_events",
  LIST_CHECK_RUNS: "list_check_runs",

  // notifications
  NOTIFY: "notify",

  // oauth
  BEGIN_OAUTH: "begin_oauth",
  COMPLETE_OAUTH: "complete_oauth",

  // settings
  GET_SETTINGS: "get_settings",
  UPDATE_SETTINGS: "update_settings",

  // window
  SAVE_WINDOW_STATE: "save_window_state",
  LOAD_WINDOW_STATE: "load_window_state",
  VALIDATE_WINDOW_POSITION: "validate_window_position",

  // system
  GET_PLATFORM_INFO: "get_platform_info",
  CHECK_GIT: "check_git",
  UPDATE_TRAY_BADGE: "update_tray_badge",

  // updater
  CHECK_FOR_UPDATE: "check_for_update",
  INSTALL_UPDATE: "install_update",

  // dev (debug builds only — guarded on the Rust side and only invoked from
  // the Developer settings tab which is stripped from production builds)
  GET_DEV_PATHS: "get_dev_paths",
  GET_BUILD_TRIPLE: "get_build_triple",
  DEV_PANIC: "dev_panic",
} as const;

export type TauriCommandName = (typeof TauriCommand)[keyof typeof TauriCommand];
