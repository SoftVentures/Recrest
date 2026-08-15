import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { type Organization, type RemoteRepository } from "@recrest/shared";

import { ArrowDown, Check, ChevronRight, FolderGit2, FolderOpen, Inbox } from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";
import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import {
  AsideHeading,
  AsideIcon,
  AsideItem,
  Badge,
  ConnectBrands,
  ConnectFirst,
  ConnectIcon,
  ConnectText,
  EmptyState,
  ProviderGroup,
  ProvidersAside,
  ProvidersGrid,
  ProvidersMain,
  RepoListScroll,
  SearchBar,
  SectionHeaderBar,
  SelectedPill,
  Spin,
} from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/ProvidersPanel.styles";
import RepoRowCard from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/parts/RepoRowCard";
import {
  BrowseBtn,
  Footer,
  Hint,
  Input,
  PrimaryBtn,
  RememberToggle,
  SecondaryBtn,
} from "@/components/molecules/modals/AddRepoModal/panels/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { PROVIDER_NAMES, Provider, type ProviderId } from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { hashCode } from "@/lib/utils/hash.utils";
import { pickFolder } from "@/lib/utils/pickFolder.utils";
import {
  cloneRemoteRepositoriesBulk,
  fetchRemoteOrganizations,
  fetchRemoteRepositories,
} from "@/store/actions/remoteImport.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { saveSettings } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { keyFor } from "@/store/types/remoteImport.types";
import { pxToRem } from "@/theme/scale";

interface ProvidersPanelProps {
  connectedProviders: ProviderId[];
  onClose: () => void;
}

// Stable empty-array reference so the `orgs` selector returns the same value
// on every render while a provider has no cached organizations — an inline
// `[]` literal makes react-redux warn about an unstable selector result.
const NO_ORGS: readonly Organization[] = [];

// Stable two-stop gradients for org chips when the provider didn't supply
// an `avatarUrl`. Matches the look of `RepoAvatar`/`AuthorAvatar`.
const ORG_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#4f8cff", "#7b2ff7"],
  ["#ff7a59", "#d6336c"],
  ["#10b981", "#0ea5a3"],
  ["#f59e0b", "#ef4444"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
];
function gradientForOrg(id: string): readonly [string, string] {
  const idx = hashCode(id.toLowerCase()) % ORG_GRADIENTS.length;
  return ORG_GRADIENTS[idx] ?? ORG_GRADIENTS[0]!;
}

export function ProvidersPanel({ connectedProviders, onClose }: ProvidersPanelProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const importDefaults = useAppSelector((s) => s.settings.backend?.repoImportDefaults);
  const defaultProvider =
    importDefaults?.providerId &&
    connectedProviders.includes(importDefaults.providerId as ProviderId)
      ? (importDefaults.providerId as ProviderId)
      : null;
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(
    defaultProvider ?? connectedProviders[0] ?? null,
  );
  const [activeOrg, setActiveOrg] = useState<string | null>(
    defaultProvider ? (importDefaults?.groupId ?? null) : null,
  );
  const [rememberDefault, setRememberDefault] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const defaultDest = useAppSelector(
    (s) => s.settings.backend?.defaultScanPath ?? s.repos.scanPaths[0] ?? "",
  );
  const [destination, setDestination] = useState(defaultDest);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (!activeProvider && connectedProviders[0]) {
      setActiveProvider(connectedProviders[0]);
    }
  }, [connectedProviders, activeProvider]);

  useEffect(() => {
    if (!activeProvider) return;
    void dispatch(fetchRemoteOrganizations(activeProvider));
    void dispatch(fetchRemoteRepositories({ providerId: activeProvider, orgSlug: activeOrg }));
  }, [dispatch, activeProvider, activeOrg]);

  const orgs = useAppSelector((s) =>
    activeProvider ? (s.remoteImport.organizations[activeProvider] ?? NO_ORGS) : NO_ORGS,
  );

  // GitLab returns groups with path-style slugs (`northwind/infrastructure`).
  // We render subgroups indented under their parent when the parent is also in
  // the list, so navigation mirrors the actual group hierarchy instead of a
  // flat list of slashed display names.
  const decoratedOrgs = useMemo(() => {
    const slugSet = new Set(orgs.map((o) => o.slug));
    const sorted = [...orgs].sort((a, b) => a.slug.localeCompare(b.slug));
    return sorted.map((o) => {
      const parts = o.slug.split("/");
      let ancestorsInList = 0;
      for (let j = 1; j < parts.length; j++) {
        if (slugSet.has(parts.slice(0, j).join("/"))) ancestorsInList++;
      }
      const depth = 1 + ancestorsInList;
      // Strip path-prefix from display name when a parent is rendered above,
      // so the indent does the "this is a sub-thing" signalling alone.
      const labelSegments = o.displayName.split(/\s*\/\s*/);
      const label =
        ancestorsInList > 0 && labelSegments.length > 1
          ? (labelSegments[labelSegments.length - 1] ?? o.displayName)
          : o.displayName;
      return { org: o, depth, label };
    });
  }, [orgs]);
  const listingKey = activeProvider ? keyFor(activeProvider, activeOrg) : null;
  const listing = useAppSelector((s) =>
    listingKey ? s.remoteImport.listings[listingKey] : undefined,
  );
  const loading = useAppSelector((s) =>
    listingKey ? (s.remoteImport.loading[listingKey] ?? false) : false,
  );
  const progress = useAppSelector((s) => s.remoteImport.cloneProgress);

  const { available, added } = useMemo(() => {
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
    const byRecent = (a: RemoteRepository, b: RemoteRepository) => {
      const aKey = a.pushedAt ?? a.updatedAt ?? "";
      const bKey = b.pushedAt ?? b.updatedAt ?? "";
      return bKey.localeCompare(aKey);
    };
    const localMatches = listing?.localMatches ?? {};
    const sorted = [...matched].sort(byRecent);
    const av: RemoteRepository[] = [];
    const ad: RemoteRepository[] = [];
    for (const r of sorted) {
      if (localMatches[r.id]) ad.push(r);
      else av.push(r);
    }
    return { available: av, added: ad };
  }, [listing, query]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onBrowseDestination = async () => {
    const picked = await pickFolder(destination.trim() || undefined);
    if (picked) setDestination(picked);
  };

  const onImport = async () => {
    if (!destination.trim()) {
      toast.error(t("import.pick_dest"));
      return;
    }
    if (selected.size === 0 || !listing) return;
    const requests = (listing.repositories ?? [])
      .filter((r) => selected.has(r.id) && !listing.localMatches[r.id])
      .map((r) => ({
        providerId: r.providerId,
        remoteRepoId: r.id,
        cloneUrl: r.cloneUrlHttps,
        destination: destination.trim(),
        subFolder: r.name,
        useSsh: false,
        sshUrl: r.cloneUrlSsh,
      }));
    if (requests.length === 0) return;

    if (rememberDefault && activeProvider) {
      void dispatch(
        saveSettings({ repoImportDefaults: { providerId: activeProvider, groupId: activeOrg } }),
      );
    }

    setCloning(true);
    try {
      const outcomes = await dispatch(cloneRemoteRepositoriesBulk(requests)).unwrap();
      const ok = outcomes.filter((o) => o.ok).length;
      const fail = outcomes.length - ok;
      if (ok > 0) {
        toast.success(t("add_modal.toast_cloned_count", { ns: I18nNamespace.REPOS, count: ok }));
        void dispatch(loadRepos());
      }
      if (fail > 0) {
        const firstErr = outcomes.find((o) => !o.ok)?.error;
        toast.error(
          firstErr ?? t("add_modal.toast_some_clones_failed", { ns: I18nNamespace.REPOS }),
        );
      } else {
        onClose();
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
      <ConnectFirst>
        <ConnectIcon>
          <FolderGit2 size={pxToRem(26)} />
        </ConnectIcon>
        <ConnectBrands>
          <BrandIcon slug={Provider.GITHUB} size={22} />
          <BrandIcon slug={Provider.GITLAB} size={22} />
          <BrandIcon slug={Provider.BITBUCKET} size={22} />
        </ConnectBrands>
        <ConnectText>{t("import.connect_first")}</ConnectText>
      </ConnectFirst>
    );
  }

  const canImport = !cloning && selected.size > 0 && Boolean(destination.trim());
  const totalCount = (listing?.repositories ?? []).length;

  return (
    <ProvidersGrid>
      <ProvidersAside>
        <AsideHeading>{t("import.providers_heading")}</AsideHeading>
        {connectedProviders.map((id) => (
          <ProviderGroup key={id}>
            <AsideItem
              type="button"
              active={activeProvider === id && activeOrg === null}
              data-testid={TEST_IDS.addRepoDialog.providerItem(id)}
              data-active={activeProvider === id && activeOrg === null ? "true" : undefined}
              onClick={() => {
                setActiveProvider(id);
                setActiveOrg(null);
                setSelected(new Set());
              }}
            >
              <AsideIcon component="span">
                <BrandIcon slug={id} size={14} />
              </AsideIcon>
              <Box
                component="span"
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {PROVIDER_NAMES[id]}
              </Box>
              <ChevronRight size={pxToRem(12)} />
            </AsideItem>
            {activeProvider === id &&
              decoratedOrgs.map(({ org, depth, label }) => {
                const [g1, g2] = gradientForOrg(org.id);
                const letter = (label.trim().charAt(0) || "?").toUpperCase();
                return (
                  <AsideItem
                    key={org.id}
                    type="button"
                    active={activeOrg === org.slug}
                    depth={depth}
                    onClick={() => {
                      setActiveOrg(org.slug);
                      setSelected(new Set());
                    }}
                  >
                    <AsideIcon component="span">
                      <GeneralAvatar
                        size={18}
                        radius={4}
                        gradient={`linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`}
                        letter={letter}
                        label={org.displayName}
                        imageUrl={org.avatarUrl}
                      />
                    </AsideIcon>
                    <Box
                      component="span"
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={org.displayName}
                    >
                      {label}
                    </Box>
                  </AsideItem>
                );
              })}
          </ProviderGroup>
        ))}
      </ProvidersAside>

      <ProvidersMain>
        <SearchBar>
          <GeneralSearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("import.search_placeholder")}
            aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
            clearLabel={t("search.clear", { ns: I18nNamespace.ARIA })}
            width="100%"
            height={32}
            data-testid={TEST_IDS.addRepoDialog.search}
            clearTestId={TEST_IDS.addRepoDialog.searchClear}
          />
          {selected.size > 0 && (
            <SelectedPill component="span" variant="caption">
              <Check size={pxToRem(11)} />{" "}
              {t("add_modal.selected", { ns: I18nNamespace.REPOS, count: selected.size })}
            </SelectedPill>
          )}
        </SearchBar>

        <RepoListScroll>
          {loading && totalCount === 0 ? (
            <EmptyState>
              <Spin size={pxToRem(20)} />
              {t("import.loading")}
            </EmptyState>
          ) : totalCount === 0 ? (
            <EmptyState>
              <Inbox size={pxToRem(22)} />
              {t("import.no_results")}
            </EmptyState>
          ) : (
            <>
              {available.length > 0 && (
                <>
                  <SectionHeaderBar>
                    <Box component="span">{t("import.group.available")}</Box>
                    <Badge>{available.length}</Badge>
                  </SectionHeaderBar>
                  {available.map((r) => (
                    <RepoRowCard
                      key={r.id}
                      repo={r}
                      selected={selected.has(r.id)}
                      alreadyLocal={false}
                      onToggle={() => toggle(r.id)}
                      progress={progress[r.id]?.stage}
                      groupPrefix={activeOrg}
                    />
                  ))}
                </>
              )}
              {added.length > 0 && (
                <>
                  <SectionHeaderBar>
                    <Box component="span">{t("import.group.added")}</Box>
                    <Badge>{added.length}</Badge>
                  </SectionHeaderBar>
                  {added.map((r) => (
                    <RepoRowCard
                      key={r.id}
                      repo={r}
                      selected={selected.has(r.id)}
                      alreadyLocal
                      onToggle={() => toggle(r.id)}
                      progress={progress[r.id]?.stage}
                      groupPrefix={activeOrg}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </RepoListScroll>

        <Footer>
          <RememberToggle>
            <GeneralSwitchInput
              checked={rememberDefault}
              onCheckedChange={setRememberDefault}
              data-testid={TEST_IDS.addRepoDialog.rememberDefault}
              slotProps={{ input: { "aria-label": t("import.remember_default") } }}
            />
            <Hint component="span">{t("import.remember_default")}</Hint>
          </RememberToggle>
          <Input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t("import.dest_placeholder")}
            data-testid={TEST_IDS.addRepoDialog.bulkDest}
            style={{ flex: 1, marginRight: pxToRem(8) }}
          />
          <BrowseBtn
            type="button"
            onClick={() => void onBrowseDestination()}
            disabled={!isTauri()}
            data-testid={TEST_IDS.addRepoDialog.bulkDestBrowse}
          >
            <FolderOpen size={pxToRem(13)} />
            {t("actions.browse")}
          </BrowseBtn>
          <SecondaryBtn type="button" onClick={onClose}>
            {t("actions.cancel")}
          </SecondaryBtn>
          <PrimaryBtn
            type="button"
            onClick={() => void onImport()}
            disabled={!canImport}
            data-testid={TEST_IDS.addRepoDialog.import}
          >
            {cloning ? <Spin size={pxToRem(13)} /> : <ArrowDown size={pxToRem(13)} />}
            {cloning
              ? t("actions.importing")
              : t("add_modal.import_submit", { ns: I18nNamespace.REPOS, count: selected.size })}
          </PrimaryBtn>
        </Footer>
      </ProvidersMain>
    </ProvidersGrid>
  );
}

export default ProvidersPanel;
