import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import {
  PROVIDER_IDS,
  PROVIDER_NAMES,
  type ProviderId,
  type RemoteRepository,
} from "@recrest/shared";

import { BrandIcon } from "@/components/atoms/BrandIcon";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Icon } from "@/components/atoms/Icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";
import { RemoteRepoListSkeleton } from "@/components/molecules/skeletons/RemoteRepoListSkeleton";
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { upsertConnection } from "@/store/slices/providersSlice";
import {
  SELF_KEY,
  cloneRemoteRepositoriesBulk,
  fetchRemoteOrganizations,
  fetchRemoteRepositories,
  keyFor,
} from "@/store/slices/remoteImportSlice";
import { gitCloneUrl, loadRepos } from "@/store/slices/reposSlice";
import { setImportDialogOpen } from "@/store/slices/uiSlice";

type Tab = "providers" | "url";

export function ImportFromProviderDialog() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.importDialogOpen);
  const connections = useAppSelector((s) => s.providers.connections);
  const connectedProviders = useMemo(
    () => PROVIDER_IDS.filter((id) => connections[id]?.connected),
    [connections],
  );
  const [tab, setTab] = useState<Tab>("providers");

  useEffect(() => {
    if (!open) return;
    if (connectedProviders.length === 0) setTab("url");
    else setTab("providers");
  }, [open, connectedProviders.length]);

  return (
    <Dialog open={open} onOpenChange={(v) => dispatch(setImportDialogOpen(v))}>
      <DialogContent className="max-w-3xl gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle>{t("import.title", { defaultValue: "Add repositories" })}</DialogTitle>
          <DialogDescription>
            {t("import.desc", {
              defaultValue:
                "Import from a connected provider or clone from any URL into a folder of your choice.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border px-6 pt-3">
          <TabButton
            active={tab === "providers"}
            onClick={() => setTab("providers")}
            label={t("import.tab.providers", { defaultValue: "From providers" })}
            badge={connectedProviders.length}
          />
          <TabButton
            active={tab === "url"}
            onClick={() => setTab("url")}
            label={t("import.tab.url", { defaultValue: "From URL" })}
          />
        </div>

        <div className="max-h-[560px] overflow-hidden">
          {tab === "providers" ? (
            <ProvidersPanel connectedProviders={connectedProviders} />
          ) : (
            <UrlPanel />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-2 text-sm transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {badge != null && badge > 0 ? (
        <span className="ml-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted px-1 text-[10px]">
          {badge}
        </span>
      ) : null}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />}
    </button>
  );
}

function ProvidersPanel({ connectedProviders }: { connectedProviders: ProviderId[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(
    connectedProviders[0] ?? null,
  );
  const [activeOrg, setActiveOrg] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProvider && connectedProviders[0]) setActiveProvider(connectedProviders[0]);
  }, [connectedProviders, activeProvider]);

  useEffect(() => {
    if (!activeProvider) return;
    void dispatch(fetchRemoteOrganizations(activeProvider));
    void dispatch(fetchRemoteRepositories({ providerId: activeProvider, orgSlug: activeOrg }));
  }, [dispatch, activeProvider, activeOrg]);

  const orgs = useAppSelector((s) =>
    activeProvider ? (s.remoteImport.organizations[activeProvider] ?? []) : [],
  );
  const listingKey = activeProvider ? keyFor(activeProvider, activeOrg) : null;
  const listing = useAppSelector((s) => (listingKey ? s.remoteImport.listings[listingKey] : null));
  const loading = useAppSelector((s) =>
    listingKey ? (s.remoteImport.loading[listingKey] ?? false) : false,
  );
  const progress = useAppSelector((s) => s.remoteImport.cloneProgress);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<string>("");
  const [cloning, setCloning] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = listing?.repositories ?? [];
    if (!q) return all;
    return all.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        r.ownerLogin.toLowerCase().includes(q),
    );
  }, [listing, query]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pickDestination = async () => {
    if (!isTauri()) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({ directory: true, multiple: false });
      if (typeof picked === "string") setDestination(picked);
    } catch {
      /* user cancelled */
    }
  };

  const onImport = async () => {
    if (!destination) {
      toast.error(t("import.pick_dest", { defaultValue: "Pick a destination folder first." }));
      return;
    }
    if (selected.size === 0 || !listing) return;

    const requests = filtered
      .filter((r) => selected.has(r.id) && !listing.localMatches[r.id])
      .map((r) => ({
        providerId: r.providerId,
        remoteRepoId: r.id,
        cloneUrl: r.cloneUrlHttps,
        destination,
        subFolder: r.name,
        useSsh: false,
        sshUrl: r.cloneUrlSsh,
      }));
    if (requests.length === 0) return;

    setCloning(true);
    try {
      const outcomes = await dispatch(cloneRemoteRepositoriesBulk(requests)).unwrap();
      const ok = outcomes.filter((o) => o.ok).length;
      const fail = outcomes.length - ok;
      if (ok > 0) {
        toast.success(
          t("import.cloned_n", { count: ok, defaultValue: "Cloned {{count}} repositories" }),
        );
        void dispatch(loadRepos());
      }
      if (fail > 0) {
        const firstErr = outcomes.find((o) => !o.ok)?.error;
        toast.error(firstErr ?? t("import.some_failed", { defaultValue: "Some clones failed" }));
      } else {
        dispatch(setImportDialogOpen(false));
      }
      setSelected(new Set());
    } catch (err) {
      toast.error(String((err as Error)?.message ?? err));
    } finally {
      setCloning(false);
    }
  };

  if (connectedProviders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <div className="flex items-center gap-3">
          <BrandIcon slug="github" size={28} color="brand" />
          <BrandIcon slug="gitlab" size={28} color="brand" />
          <BrandIcon slug="bitbucket" size={28} color="brand" />
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("import.connect_first", {
            defaultValue:
              "Connect GitHub, GitLab or Bitbucket in Settings to browse your remote repositories here.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[460px] grid-cols-[220px_1fr] gap-0">
      <aside className="flex flex-col gap-1 overflow-y-auto border-r border-border p-3 text-sm">
        {connectedProviders.map((id) => (
          <div key={id} className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                setActiveProvider(id);
                setActiveOrg(null);
                setSelected(new Set());
              }}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                activeProvider === id && activeOrg === null
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <BrandIcon slug={id} size={14} color="brand" />
              <span className="truncate font-medium">{PROVIDER_NAMES[id]}</span>
            </button>
            {activeProvider === id &&
              orgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setActiveOrg(org.slug)}
                  className={`ml-4 flex items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                    activeOrg === org.slug
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{org.displayName}</span>
                </button>
              ))}
          </div>
        ))}
      </aside>

      <section className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Icon
              name="search"
              size={12}
              color="var(--ink-3)"
              style={{ position: "absolute", left: 8, top: 10 }}
            />
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-7 py-2 text-xs"
              placeholder={t("import.search_placeholder", {
                defaultValue: "Search repositories…",
              })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {t("import.selected_count", {
              count: selected.size,
              defaultValue: "{{count}} selected",
            })}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && filtered.length === 0 ? (
            <RemoteRepoListSkeleton rows={8} />
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {t("import.no_results", { defaultValue: "No repositories." })}
            </div>
          ) : (
            filtered.map((r) => (
              <RepoCard
                key={r.id}
                repo={r}
                selected={selected.has(r.id)}
                alreadyLocal={Boolean(listing?.localMatches[r.id])}
                onToggle={() => toggle(r.id)}
                progress={progress[r.id]?.stage}
              />
            ))
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-border p-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              placeholder={t("import.dest_placeholder", { defaultValue: "Destination folder…" })}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              readOnly
              onClick={() => void pickDestination()}
            />
            <Button variant="outline" size="sm" onClick={() => void pickDestination()}>
              {t("import.browse", { defaultValue: "Browse…" })}
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => void onImport()}
            loading={cloning}
            disabled={cloning || selected.size === 0 || !destination}
          >
            {t("import.submit", { count: selected.size, defaultValue: "Import {{count}}" })}
          </Button>
        </DialogFooter>
      </section>
    </div>
  );
  // Silence unused import for later features
  void upsertConnection;
  void SELF_KEY;
}

function RepoCard({
  repo,
  selected,
  alreadyLocal,
  onToggle,
  progress,
}: {
  repo: RemoteRepository;
  selected: boolean;
  alreadyLocal: boolean;
  onToggle: () => void;
  progress?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 transition-colors ${
        selected ? "bg-muted/50" : "hover:bg-muted/30"
      } ${alreadyLocal ? "opacity-60" : ""}`}
    >
      <Checkbox
        checked={selected}
        disabled={alreadyLocal}
        onCheckedChange={() => !alreadyLocal && onToggle()}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{repo.fullName}</span>
          {repo.isPrivate && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              private
            </span>
          )}
          {repo.isFork && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              fork
            </span>
          )}
          {repo.isArchived && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              archived
            </span>
          )}
          {alreadyLocal && (
            <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">
              ✓ on system
            </span>
          )}
        </div>
        {repo.description && (
          <div className="truncate text-xs text-muted-foreground">{repo.description}</div>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          {repo.language && <span>{repo.language}</span>}
          {repo.language && repo.updatedAt && <span>·</span>}
          {repo.updatedAt && <span>updated {repo.updatedAt.slice(0, 10)}</span>}
        </div>
      </div>
      {progress === "cloning" && <span className="text-xs text-muted-foreground">cloning…</span>}
      {progress === "done" && <span className="text-xs text-green-500">✓</span>}
      {progress === "error" && <span className="text-xs text-destructive">✗</span>}
    </label>
  );
}

function UrlPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [subFolder, setSubFolder] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickDestination = async () => {
    if (!isTauri()) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({ directory: true, multiple: false });
      if (typeof picked === "string") setDestination(picked);
    } catch {
      /* user cancelled */
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !destination) return;
    setSubmitting(true);
    try {
      const repo = await dispatch(
        gitCloneUrl({
          url: url.trim(),
          destination,
          subFolder: subFolder.trim() || null,
        }),
      ).unwrap();
      toast.success(t("import.cloned_one", { name: repo.name, defaultValue: "Cloned {{name}}" }));
      dispatch(setImportDialogOpen(false));
      void dispatch(loadRepos());
    } catch (err) {
      toast.error(String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
    void invoke; // dedupe import
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 p-6">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">
          {t("import.url_label", { defaultValue: "Repository URL" })}
        </label>
        <input
          type="text"
          autoFocus
          required
          placeholder="https://github.com/owner/repo.git"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">
          {t("import.dest_label", { defaultValue: "Destination folder" })}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            readOnly
            placeholder={t("import.dest_placeholder", { defaultValue: "Choose a folder…" })}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={destination}
            onClick={() => void pickDestination()}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void pickDestination()}>
            {t("import.browse", { defaultValue: "Browse…" })}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">
          {t("import.subfolder_label", {
            defaultValue: "Subfolder name (optional)",
          })}
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={t("import.subfolder_placeholder", {
            defaultValue: "Auto from URL if left empty",
          })}
          value={subFolder}
          onChange={(e) => setSubFolder(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch(setImportDialogOpen(false))}
        >
          {t("actions.cancel", { ns: "common", defaultValue: "Cancel" })}
        </Button>
        <Button type="submit" loading={submitting} disabled={!url.trim() || !destination}>
          {t("import.clone_now", { defaultValue: "Clone" })}
        </Button>
      </DialogFooter>
    </form>
  );
}
