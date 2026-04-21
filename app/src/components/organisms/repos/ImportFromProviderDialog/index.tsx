import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import {
  PROVIDER_IDS,
  PROVIDER_NAMES,
  type ProviderId,
  type RemoteRepository,
} from "@recrest/shared";

import { BrandIcon, type BrandSlug } from "@/components/atoms/BrandIcon";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Icon, type IconName } from "@/components/atoms/Icon";
import { LangDot } from "@/components/atoms/LangDot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/** GitHub's brand hex (#181717) disappears on dark backgrounds. Map it to
 *  `--ink-0` so it stays visible in both themes (near-black light, white dark).
 *  GitLab orange and Bitbucket blue render fine against either theme. */
function brandColor(slug: BrandSlug): string {
  return slug === "github" ? "var(--ink-0)" : "brand";
}

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
      <DialogContent
        className="max-w-3xl gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
        style={{
          background: "var(--surface)",
          boxShadow: "var(--shadow-pop)",
          border: "1px solid var(--border)",
        }}
      >
        <DialogHeader
          className="flex-row items-start gap-4 px-6 py-5 text-left"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "var(--accent-weak)",
              color: "var(--accent-ink)",
            }}
          >
            <Icon name="plus" size={20} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle style={{ color: "var(--ink-0)" }}>
              {t("import.title", { defaultValue: "Add repositories" })}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ink-3)" }}>
              {t("import.desc", {
                defaultValue:
                  "Import from a connected provider or clone from any URL into a folder of your choice.",
              })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex gap-1 px-5 pt-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <TabButton
            active={tab === "providers"}
            onClick={() => setTab("providers")}
            icon="repo"
            label={t("import.tab.providers", { defaultValue: "From providers" })}
            badge={connectedProviders.length}
          />
          <TabButton
            active={tab === "url"}
            onClick={() => setTab("url")}
            icon="external"
            label={t("import.tab.url", { defaultValue: "From URL" })}
          />
        </div>

        <div className="h-[560px] overflow-hidden" style={{ background: "var(--surface)" }}>
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
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors"
      style={{
        color: active ? "var(--ink-0)" : "var(--ink-3)",
      }}
    >
      <Icon name={icon} size={13} color={active ? "var(--accent)" : "currentColor"} />
      <span>{label}</span>
      {badge != null && badge > 0 ? (
        <span
          className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          style={{
            background: active ? "var(--accent-weak)" : "var(--surface-3)",
            color: active ? "var(--accent-ink)" : "var(--ink-2)",
          }}
        >
          {badge}
        </span>
      ) : null}
      {active && (
        <span
          className="absolute -bottom-px left-0 right-0 h-[2px] rounded-t-full"
          style={{ background: "var(--accent)" }}
        />
      )}
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

  const { filtered, groups } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = listing?.repositories ?? [];
    const matched = q
      ? all.filter(
          (r) =>
            r.fullName.toLowerCase().includes(q) ||
            (r.description?.toLowerCase().includes(q) ?? false) ||
            r.ownerLogin.toLowerCase().includes(q),
        )
      : all;
    // Sort by last-pushed desc (real activity), fallback to updatedAt.
    const byRecent = (a: RemoteRepository, b: RemoteRepository) => {
      const aKey = a.pushedAt ?? a.updatedAt ?? "";
      const bKey = b.pushedAt ?? b.updatedAt ?? "";
      return bKey.localeCompare(aKey);
    };
    const localMatches = listing?.localMatches ?? {};
    const sorted = [...matched].sort(byRecent);
    const available: RemoteRepository[] = [];
    const added: RemoteRepository[] = [];
    for (const r of sorted) {
      if (localMatches[r.id]) added.push(r);
      else available.push(r);
    }
    return { filtered: sorted, groups: { available, added } };
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
      <div className="flex flex-col items-center justify-center gap-4 p-14 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--accent-weak)" }}
        >
          <Icon name="key" size={24} color="var(--accent-ink)" />
        </div>
        <div className="flex items-center gap-3">
          <BrandIcon slug="github" size={22} color={brandColor("github")} />
          <BrandIcon slug="gitlab" size={22} color={brandColor("gitlab")} />
          <BrandIcon slug="bitbucket" size={22} color={brandColor("bitbucket")} />
        </div>
        <p className="max-w-sm text-sm" style={{ color: "var(--ink-3)" }}>
          {t("import.connect_first", {
            defaultValue:
              "Connect GitHub, GitLab or Bitbucket in Settings to browse your remote repositories here.",
          })}
        </p>
      </div>
    );
  }

  const canImport = !cloning && selected.size > 0 && Boolean(destination);

  return (
    <div className="grid h-full grid-cols-[232px_1fr] gap-0">
      <aside
        className="flex flex-col gap-0.5 overflow-y-auto p-3 text-sm"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <div
          className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--ink-4)" }}
        >
          {t("import.providers_heading", { defaultValue: "Providers" })}
        </div>
        {connectedProviders.map((id) => (
          <div key={id} className="flex flex-col gap-0.5">
            <SidebarItem
              active={activeProvider === id && activeOrg === null}
              onClick={() => {
                setActiveProvider(id);
                setActiveOrg(null);
                setSelected(new Set());
              }}
            >
              <BrandIcon slug={id} size={14} color={brandColor(id)} />
              <span className="truncate font-medium">{PROVIDER_NAMES[id]}</span>
            </SidebarItem>
            {activeProvider === id &&
              orgs.map((org) => (
                <SidebarItem
                  key={org.id}
                  active={activeOrg === org.slug}
                  onClick={() => setActiveOrg(org.slug)}
                  indent
                >
                  <OrgAvatar url={org.avatarUrl} name={org.displayName} />
                  <span className="truncate">{org.displayName}</span>
                </SidebarItem>
              ))}
          </div>
        ))}
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden">
        <div
          className="flex items-center gap-3 p-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative flex-1">
            <Icon
              name="search"
              size={12}
              color="var(--ink-3)"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              className="w-full rounded-md px-8 py-2 text-xs outline-none transition-colors"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--ink-1)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-weak)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder={t("import.search_placeholder", {
                defaultValue: "Search repositories…",
              })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {selected.size > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{
                background: "var(--accent-weak)",
                color: "var(--accent-ink)",
              }}
            >
              <Icon name="check" size={11} />
              {t("import.selected_count", {
                count: selected.size,
                defaultValue: "{{count}} selected",
              })}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && filtered.length === 0 ? (
            <RemoteRepoListSkeleton rows={8} />
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 p-10 text-center text-xs"
              style={{ color: "var(--ink-3)" }}
            >
              <Icon name="inbox" size={24} color="var(--ink-4)" />
              {t("import.no_results", { defaultValue: "No repositories." })}
            </div>
          ) : (
            <>
              {groups.available.length > 0 && (
                <>
                  <SectionHeader
                    label={t("import.group.available", {
                      defaultValue: "Available — recently active",
                    })}
                    count={groups.available.length}
                  />
                  {groups.available.map((r) => (
                    <RepoCard
                      key={r.id}
                      repo={r}
                      selected={selected.has(r.id)}
                      alreadyLocal={false}
                      onToggle={() => toggle(r.id)}
                      progress={progress[r.id]?.stage}
                    />
                  ))}
                </>
              )}
              {groups.added.length > 0 && (
                <>
                  <SectionHeader
                    label={t("import.group.added", { defaultValue: "Already on system" })}
                    count={groups.added.length}
                  />
                  {groups.added.map((r) => (
                    <RepoCard
                      key={r.id}
                      repo={r}
                      selected={selected.has(r.id)}
                      alreadyLocal
                      onToggle={() => toggle(r.id)}
                      progress={progress[r.id]?.stage}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <div
          className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <DestinationField value={destination} onPick={() => void pickDestination()} />
          <Button
            size="sm"
            onClick={() => void onImport()}
            loading={cloning}
            disabled={!canImport}
            style={
              canImport
                ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                : undefined
            }
          >
            <Icon name="arrowDown" size={13} />
            {t("import.submit", { count: selected.size, defaultValue: "Import {{count}}" })}
          </Button>
        </div>
      </section>
    </div>
  );
  // Silence unused import for later features
  void upsertConnection;
  void SELF_KEY;
}

function SidebarItem({
  active,
  onClick,
  indent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  indent?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
        indent ? "ml-4 text-xs" : ""
      }`}
      style={{
        background: active ? "var(--accent-weak)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--ink-2)",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        background: "var(--surface)",
        color: "var(--ink-4)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span>{label}</span>
      <span
        className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]"
        style={{ background: "var(--surface-3)", color: "var(--ink-3)" }}
      >
        {count}
      </span>
    </div>
  );
}

function OrgAvatar({ url, name }: { url: string | null; name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 shrink-0 rounded-[4px] object-cover"
        style={{ border: "1px solid var(--border)" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] text-[8px] font-semibold"
      style={{
        background: "var(--surface-3)",
        color: "var(--ink-2)",
        border: "1px solid var(--border)",
      }}
    >
      {initials}
    </span>
  );
}

function DestinationField({ value, onPick }: { value: string; onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onPick}
      className="group relative flex flex-1 items-center gap-2 overflow-hidden rounded-md px-2.5 py-1.5 text-left text-xs transition-colors"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: value ? "var(--ink-1)" : "var(--ink-4)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <Icon
        name="folder"
        size={13}
        color={value ? "var(--accent)" : "var(--ink-4)"}
        style={{ flexShrink: 0 }}
      />
      <span className="truncate">
        {value || t("import.dest_placeholder", { defaultValue: "Choose destination folder…" })}
      </span>
      <Icon
        name="chev"
        size={11}
        color="var(--ink-4)"
        style={{ marginLeft: "auto", flexShrink: 0 }}
      />
    </button>
  );
}

function MetaBadge({ tone, children }: { tone: "neutral" | "success"; children: ReactNode }) {
  if (tone === "success") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
        style={{ background: "var(--green-weak)", color: "var(--green)" }}
      >
        <Icon name="check" size={9} />
        {children}
      </span>
    );
  }
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: "var(--surface-3)", color: "var(--ink-3)" }}
    >
      {children}
    </span>
  );
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
      className="relative flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors"
      style={{
        borderBottom: "1px solid var(--border)",
        background: selected ? "var(--accent-weak)" : "transparent",
        opacity: alreadyLocal ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[2px]"
          style={{ background: "var(--accent)" }}
        />
      )}
      <Checkbox
        checked={selected}
        disabled={alreadyLocal}
        onCheckedChange={() => !alreadyLocal && onToggle()}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" style={{ color: "var(--ink-1)" }}>
            {repo.fullName}
          </span>
          {repo.isPrivate && <MetaBadge tone="neutral">private</MetaBadge>}
          {repo.isFork && <MetaBadge tone="neutral">fork</MetaBadge>}
          {repo.isArchived && <MetaBadge tone="neutral">archived</MetaBadge>}
          {alreadyLocal && <MetaBadge tone="success">on system</MetaBadge>}
        </div>
        {repo.description && (
          <div className="truncate text-xs" style={{ color: "var(--ink-3)" }}>
            {repo.description}
          </div>
        )}
        <div
          className="mt-0.5 flex items-center gap-2 text-[10px]"
          style={{ color: "var(--ink-4)" }}
        >
          {repo.language && (
            <span className="inline-flex items-center gap-1">
              <LangDot lang={repo.language} />
              {repo.language}
            </span>
          )}
          {repo.language && repo.updatedAt && <span aria-hidden>·</span>}
          {repo.updatedAt && <span>updated {repo.updatedAt.slice(0, 10)}</span>}
        </div>
      </div>
      {progress === "cloning" && (
        <span
          className="inline-flex items-center gap-1 text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          <Icon name="refresh" size={11} className="animate-spin" />
          cloning…
        </span>
      )}
      {progress === "done" && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: "var(--green)" }}
        >
          <Icon name="check" size={11} />
          done
        </span>
      )}
      {progress === "error" && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: "var(--red)" }}
        >
          <Icon name="x" size={11} />
          failed
        </span>
      )}
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

  const canSubmit = Boolean(url.trim()) && Boolean(destination) && !submitting;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-[460px] flex-col">
      <div className="flex-1 space-y-5 p-6">
        <FieldGroup
          icon="external"
          label={t("import.url_label", { defaultValue: "Repository URL" })}
          hint={t("import.url_hint", {
            defaultValue: "HTTPS or SSH — GitHub, GitLab, Bitbucket, or self-hosted.",
          })}
        >
          <input
            type="text"
            autoFocus
            required
            placeholder="https://github.com/owner/repo.git"
            className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--ink-1)",
              fontFamily: "var(--font-mono)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-weak)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </FieldGroup>

        <FieldGroup
          icon="folder"
          label={t("import.dest_label", { defaultValue: "Destination folder" })}
        >
          <DestinationField value={destination} onPick={() => void pickDestination()} />
        </FieldGroup>

        <FieldGroup
          icon="edit"
          label={t("import.subfolder_label", { defaultValue: "Subfolder name" })}
          hint={t("import.subfolder_hint", { defaultValue: "Auto from URL if left empty." })}
        >
          <input
            type="text"
            className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--ink-1)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-weak)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder={t("import.subfolder_placeholder", {
              defaultValue: "e.g. my-fork",
            })}
            value={subFolder}
            onChange={(e) => setSubFolder(e.target.value)}
          />
        </FieldGroup>
      </div>

      <div
        className="flex items-center justify-end gap-2 p-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatch(setImportDialogOpen(false))}
        >
          {t("actions.cancel", { ns: "common", defaultValue: "Cancel" })}
        </Button>
        <Button
          type="submit"
          size="sm"
          loading={submitting}
          disabled={!canSubmit}
          style={
            canSubmit
              ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
              : undefined
          }
        >
          <Icon name="arrowDown" size={13} />
          {t("import.clone_now", { defaultValue: "Clone" })}
        </Button>
      </div>
    </form>
  );
}

function FieldGroup({
  icon,
  label,
  hint,
  children,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={12} color="var(--ink-3)" />
        <label className="text-xs font-semibold" style={{ color: "var(--ink-1)" }}>
          {label}
        </label>
      </div>
      {children}
      {hint && (
        <p className="text-[11px]" style={{ color: "var(--ink-4)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
