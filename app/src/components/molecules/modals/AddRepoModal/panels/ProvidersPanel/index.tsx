import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { type RemoteRepository } from "@recrest/shared";

import { ArrowDown, Check, ChevronRight, FolderGit2, Inbox } from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
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
  Footer,
  Input,
  PrimaryBtn,
  SecondaryBtn,
} from "@/components/molecules/modals/AddRepoModal/panels/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { PROVIDER_NAMES, Provider, type ProviderId } from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  cloneRemoteRepositoriesBulk,
  fetchRemoteOrganizations,
  fetchRemoteRepositories,
} from "@/store/actions/remoteImport.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { keyFor } from "@/store/types/remoteImport.types";

interface ProvidersPanelProps {
  connectedProviders: ProviderId[];
  onClose: () => void;
}

export function ProvidersPanel({ connectedProviders, onClose }: ProvidersPanelProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(
    connectedProviders[0] ?? null,
  );
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState("");
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
    activeProvider ? (s.remoteImport.organizations[activeProvider] ?? []) : [],
  );
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

    setCloning(true);
    try {
      const outcomes = await dispatch(cloneRemoteRepositoriesBulk(requests)).unwrap();
      const ok = outcomes.filter((o) => o.ok).length;
      const fail = outcomes.length - ok;
      if (ok > 0) {
        toast.success(`Cloned ${ok} ${ok === 1 ? "repository" : "repositories"}`);
        void dispatch(loadRepos());
      }
      if (fail > 0) {
        const firstErr = outcomes.find((o) => !o.ok)?.error;
        toast.error(firstErr ?? "Some clones failed");
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
          <FolderGit2 size={26} />
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
          <Box key={id} sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <AsideItem
              type="button"
              active={activeProvider === id && activeOrg === null}
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
              <ChevronRight size={12} />
            </AsideItem>
            {activeProvider === id &&
              orgs.map((org) => (
                <AsideItem
                  key={org.id}
                  type="button"
                  active={activeOrg === org.slug}
                  indent
                  onClick={() => {
                    setActiveOrg(org.slug);
                    setSelected(new Set());
                  }}
                >
                  <Box
                    component="span"
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {org.displayName}
                  </Box>
                </AsideItem>
              ))}
          </Box>
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
              <Check size={11} /> {selected.size} selected
            </SelectedPill>
          )}
        </SearchBar>

        <RepoListScroll>
          {loading && totalCount === 0 ? (
            <EmptyState>
              <Spin size={20} />
              {t("import.loading")}
            </EmptyState>
          ) : totalCount === 0 ? (
            <EmptyState>
              <Inbox size={22} />
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
                    />
                  ))}
                </>
              )}
            </>
          )}
        </RepoListScroll>

        <Footer>
          <Input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t("import.dest_placeholder")}
            data-testid={TEST_IDS.addRepoDialog.bulkDest}
            style={{ flex: 1, marginRight: 8 }}
          />
          <SecondaryBtn type="button" onClick={onClose}>
            {t("actions.cancel")}
          </SecondaryBtn>
          <PrimaryBtn
            type="button"
            onClick={() => void onImport()}
            disabled={!canImport}
            data-testid={TEST_IDS.addRepoDialog.import}
          >
            {cloning ? <Spin size={13} /> : <ArrowDown size={13} />}
            {cloning ? t("actions.importing") : t("import.submit", `Import ${selected.size}`)}
          </PrimaryBtn>
        </Footer>
      </ProvidersMain>
    </ProvidersGrid>
  );
}

export default ProvidersPanel;
