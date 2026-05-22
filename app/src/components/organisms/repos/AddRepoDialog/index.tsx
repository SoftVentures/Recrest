import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Checkbox, Dialog, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PROVIDER_IDS,
  PROVIDER_NAMES,
  type ProviderId,
  type RemoteRepository,
} from "@recrest/shared";

import {
  ArrowDown,
  Check,
  ChevronRight,
  FolderGit2,
  GitBranch,
  Inbox,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import GeneralBrandIcon from "@/components/atoms/icons/BrandIcon";
import { isTauri } from "@/lib/tauri";
import {
  cloneRemoteRepositoriesBulk,
  fetchRemoteOrganizations,
  fetchRemoteRepositories,
} from "@/store/actions/remoteImport.actions";
import { addRepo, gitCloneUrl, loadRepos } from "@/store/actions/repos.actions";
import { setImportDialogOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { keyFor } from "@/store/types/remoteImport.types";

type Tab = "providers" | "local" | "clone";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: 880,
    maxWidth: "94vw",
    height: 640,
    maxHeight: "90vh",
    borderRadius: 8,
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
}));

const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "18px 22px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
}));

const HeaderIcon = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 8,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  flexShrink: 0,
}));

const HeaderBody = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const TitleText = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
}));

const SubText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  marginTop: 2,
}));

const CloseBtn = styled("button")(({ theme }) => ({
  width: 28,
  height: 28,
  border: 0,
  background: "transparent",
  borderRadius: 8,
  color: theme.palette.text.information,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
}));

const TabBar = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 4,
  padding: "10px 20px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
}));

const TabButton = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active: boolean }>(({ theme, active }) => ({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 12px",
  background: "transparent",
  border: 0,
  marginBottom: -1,
  color: active ? theme.palette.text.primary : theme.palette.text.information,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "color 0.12s ease",
  "&:hover": {
    color: theme.palette.text.primary,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: active ? theme.palette.primary.main : "transparent",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
}));

const Badge = styled("span", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: active
    ? theme.palette.primary.main
    : theme.palette.surface.interface.backElevation,
  color: active ? theme.palette.primary.contrastText : theme.palette.text.information,
}));

const Body = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
});

const Footer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 20px 16px",
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  flexShrink: 0,
}));

const SecondaryBtn = styled("button")(({ theme }) => ({
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
}));

const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": { backgroundColor: theme.palette.surface.button.ctaHover },
  "&:disabled": {
    opacity: 0.55,
    cursor: "not-allowed",
  },
}));

const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const Label = styled("label")(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
}));

const Input = styled("input")(({ theme }) => ({
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.12s ease, box-shadow 0.12s ease",
  "&:focus": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${theme.palette.primary.main} 22%, transparent)`,
  },
  "&::placeholder": {
    color: theme.palette.text.information,
  },
}));

const Hint = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
}));

const FormBody = styled("form")({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

const FormFields = styled(Box)({
  flex: 1,
  padding: "20px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  overflowY: "auto",
});

export default function AddRepoDialog() {
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
    setTab(connectedProviders.length > 0 ? "providers" : "local");
  }, [open, connectedProviders.length]);

  const close = useCallback(() => {
    dispatch(setImportDialogOpen(false));
  }, [dispatch]);

  return (
    <StyledDialog open={open} onClose={close} data-testid="add-repo-dialog">
      <Header>
        <HeaderIcon>
          <Plus size={20} />
        </HeaderIcon>
        <HeaderBody>
          <TitleText>{t("import.title", "Add repository")}</TitleText>
          <SubText>
            {t(
              "import.desc",
              "Import from a connected provider, add an existing folder, or clone from any URL.",
            )}
          </SubText>
        </HeaderBody>
        <CloseBtn type="button" onClick={close} aria-label="Close">
          <X size={16} />
        </CloseBtn>
      </Header>

      <TabBar role="tablist">
        <TabButton
          type="button"
          active={tab === "providers"}
          onClick={() => setTab("providers")}
          data-testid="add-repo-tab-providers"
        >
          <FolderGit2 size={13} />
          {t("import.tab.providers", "From providers")}
          {connectedProviders.length > 0 && (
            <Badge active={tab === "providers"}>{connectedProviders.length}</Badge>
          )}
        </TabButton>
        <TabButton
          type="button"
          active={tab === "local"}
          onClick={() => setTab("local")}
          data-testid="add-repo-tab-local"
        >
          <FolderGit2 size={13} />
          {t("import.tab.local", "Existing folder")}
        </TabButton>
        <TabButton
          type="button"
          active={tab === "clone"}
          onClick={() => setTab("clone")}
          data-testid="add-repo-tab-clone"
        >
          <GitBranch size={13} />
          {t("import.tab.clone", "Clone from URL")}
        </TabButton>
      </TabBar>

      <Body>
        {tab === "providers" ? (
          <ProvidersPanel connectedProviders={connectedProviders} onClose={close} />
        ) : tab === "local" ? (
          <LocalPanel onClose={close} />
        ) : (
          <ClonePanel onClose={close} />
        )}
      </Body>
    </StyledDialog>
  );
}

/* ────────────────────────── Local-folder panel ────────────────────────── */

function LocalPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const repo = await dispatch(addRepo({ path: trimmed })).unwrap();
      toast.success(`Added ${repo.name}`);
      setPath("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not add repository: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormBody onSubmit={onSubmit}>
      <FormFields>
        <Field>
          <Label htmlFor="add-repo-path">{t("import.field.path", "Repository folder")}</Label>
          <Input
            id="add-repo-path"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/Code/my-repo"
            autoFocus
            data-testid="add-repo-path"
          />
          <Hint>
            {t(
              "import.field.path_hint",
              "Absolute path to a folder that already contains a .git directory.",
            )}
          </Hint>
        </Field>
      </FormFields>
      <Footer>
        <SecondaryBtn type="button" onClick={onClose}>
          {t("actions.cancel", "Cancel")}
        </SecondaryBtn>
        <PrimaryBtn type="submit" disabled={busy || !path.trim()} data-testid="add-repo-submit">
          <ArrowDown size={13} />
          {busy ? t("actions.adding", "Adding…") : t("actions.add", "Add repository")}
        </PrimaryBtn>
      </Footer>
    </FormBody>
  );
}

/* ──────────────────────────── Clone-URL panel ─────────────────────────── */

function ClonePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [url, setUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [subFolder, setSubFolder] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = Boolean(url.trim() && destination.trim()) && !busy;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const repo = await dispatch(
        gitCloneUrl({
          url: url.trim(),
          destination: destination.trim(),
          subFolder: subFolder.trim() || null,
        }),
      ).unwrap();
      toast.success(`Cloned ${repo.name}`);
      void dispatch(loadRepos());
      setUrl("");
      setDestination("");
      setSubFolder("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Clone failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormBody onSubmit={onSubmit}>
      <FormFields>
        <Field>
          <Label htmlFor="add-repo-url">{t("import.field.url", "Repository URL")}</Label>
          <Input
            id="add-repo-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo.git"
            autoFocus
            data-testid="add-repo-url"
          />
          <Hint>
            {t("import.url_hint", "HTTPS or SSH — GitHub, GitLab, Bitbucket, or self-hosted.")}
          </Hint>
        </Field>
        <Field>
          <Label htmlFor="add-repo-dest">{t("import.field.dest", "Destination folder")}</Label>
          <Input
            id="add-repo-dest"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="/Users/you/Code"
            data-testid="add-repo-dest"
          />
          <Hint>
            {t(
              "import.field.dest_hint",
              "Parent folder. The clone lands in a subfolder named after the URL unless you override below.",
            )}
          </Hint>
        </Field>
        <Field>
          <Label htmlFor="add-repo-sub">{t("import.field.sub", "Subfolder name (optional)")}</Label>
          <Input
            id="add-repo-sub"
            type="text"
            value={subFolder}
            onChange={(e) => setSubFolder(e.target.value)}
            placeholder="e.g. my-fork"
            data-testid="add-repo-sub"
          />
        </Field>
      </FormFields>
      <Footer>
        <SecondaryBtn type="button" onClick={onClose}>
          {t("actions.cancel", "Cancel")}
        </SecondaryBtn>
        <PrimaryBtn type="submit" disabled={!canSubmit} data-testid="add-repo-clone">
          <ArrowDown size={13} />
          {busy ? t("actions.cloning", "Cloning…") : t("actions.clone", "Clone")}
        </PrimaryBtn>
      </Footer>
    </FormBody>
  );
}

/* ──────────────────────────── Providers panel ─────────────────────────── */

const ProvidersGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  height: "100%",
});

const ProvidersAside = styled(Box)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: 10,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 2,
}));

const AsideHeading = styled(Typography)(({ theme }) => ({
  padding: "6px 10px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
}));

const AsideItem = styled("button", {
  shouldForwardProp: (p) => p !== "active" && p !== "indent",
})<{ active: boolean; indent?: boolean }>(({ theme, active, indent }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  padding: indent ? "5px 10px 5px 28px" : "7px 10px",
  borderRadius: 8,
  border: 0,
  background: active
    ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
    : "transparent",
  color: active ? theme.palette.primary.dark : theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: active
      ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
      : theme.palette.surface.interface.active,
  },
}));

const AsideIcon = styled("span")({
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const ProvidersMain = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
});

const SearchBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const SearchField = styled(Box)({
  position: "relative",
  flex: 1,
});

const SearchInput = styled("input")(({ theme }) => ({
  width: "100%",
  height: 32,
  // Right-side padding reserves space for the inline clear-X so the text
  // doesn't run under the button when the user has typed something.
  padding: "0 32px 0 32px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12.5,
  outline: "none",
  transition: "border-color 0.12s ease, box-shadow 0.12s ease",
  "&:focus": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${theme.palette.primary.main} 18%, transparent)`,
  },
  "&::placeholder": {
    color: theme.palette.text.information,
  },
}));

const SearchAdornment = styled("span")(({ theme }) => ({
  position: "absolute",
  left: 10,
  top: "50%",
  transform: "translateY(-50%)",
  color: theme.palette.text.information,
  display: "inline-flex",
}));

const SearchClear = styled("button")(({ theme }) => ({
  position: "absolute",
  right: 6,
  top: "50%",
  transform: "translateY(-50%)",
  width: 20,
  height: 20,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  cursor: "pointer",
  borderRadius: "50%",
  padding: 0,
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const SelectedPill = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 100,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: 10.5,
  fontWeight: 700,
}));

const RepoListScroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
});

const SectionHeaderBar = styled(Box)(({ theme }) => ({
  position: "sticky",
  top: 0,
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const RepoRow = styled("label", {
  shouldForwardProp: (p) => p !== "selected" && p !== "disabled",
})<{ selected: boolean; disabled?: boolean }>(({ theme, selected, disabled }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
  backgroundColor: selected
    ? `color-mix(in srgb, ${theme.palette.primary.main} 10%, transparent)`
    : "transparent",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: selected
      ? `color-mix(in srgb, ${theme.palette.primary.main} 12%, transparent)`
      : disabled
        ? "transparent"
        : theme.palette.surface.interface.active,
  },
  ...(selected
    ? {
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: theme.palette.primary.main,
        },
      }
    : {}),
}));

const RepoBody = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const RepoTitleRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const RepoTitle = styled("span")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const RepoDesc = styled("div")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const RepoMeta = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
  fontSize: 10.5,
  color: theme.palette.text.informationLight,
}));

const LangChip = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

const LangDot = styled("span")(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
}));

const MetaBadge = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "neutral" | "success" }>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "1px 6px",
  borderRadius: 8,
  fontSize: 10,
  fontWeight: 600,
  backgroundColor:
    tone === "success"
      ? `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`
      : theme.palette.surface.interface.backElevation,
  color: tone === "success" ? theme.palette.success.main : theme.palette.text.information,
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "60px 20px",
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
}));

const ConnectFirst = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: 60,
  textAlign: "center",
  height: "100%",
});

const ConnectIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 56,
  height: 56,
  borderRadius: "50%",
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 18%, transparent)`,
  color: theme.palette.primary.main,
}));

const ConnectBrands = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 14,
});

const ConnectText = styled(Typography)(({ theme }) => ({
  maxWidth: 360,
  fontSize: 13,
  color: theme.palette.text.information,
}));

const StatusInline = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  color: theme.palette.text.information,
}));

const Spin = styled(RefreshCw)({
  animation: "addrepo-spin 0.9s linear infinite",
  "@keyframes addrepo-spin": {
    to: { transform: "rotate(360deg)" },
  },
});

function ProvidersPanel({
  connectedProviders,
  onClose,
}: {
  connectedProviders: ProviderId[];
  onClose: () => void;
}) {
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
      toast.error(t("import.pick_dest", "Pick a destination folder first."));
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
          <GeneralBrandIcon slug="github" size={22} />
          <GeneralBrandIcon slug="gitlab" size={22} />
          <GeneralBrandIcon slug="bitbucket" size={22} />
        </ConnectBrands>
        <ConnectText>
          {t(
            "import.connect_first",
            "Connect GitHub, GitLab or Bitbucket in Settings to browse your remote repositories here.",
          )}
        </ConnectText>
      </ConnectFirst>
    );
  }

  const canImport = !cloning && selected.size > 0 && Boolean(destination.trim());
  const totalCount = (listing?.repositories ?? []).length;

  return (
    <ProvidersGrid>
      <ProvidersAside>
        <AsideHeading>{t("import.providers_heading", "Providers")}</AsideHeading>
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
              <AsideIcon>
                <GeneralBrandIcon slug={id} size={14} />
              </AsideIcon>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {PROVIDER_NAMES[id]}
              </span>
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
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {org.displayName}
                  </span>
                </AsideItem>
              ))}
          </Box>
        ))}
      </ProvidersAside>

      <ProvidersMain>
        <SearchBar>
          <SearchField>
            <SearchAdornment>
              <SearchIcon size={13} />
            </SearchAdornment>
            <SearchInput
              type="text"
              placeholder={t("import.search_placeholder", "Search repositories…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="add-repo-search"
            />
            {query && (
              <SearchClear
                type="button"
                aria-label={t("common.clear_search", { defaultValue: "Clear search" })}
                data-testid="add-repo-search-clear"
                onClick={() => setQuery("")}
              >
                <X size={12} aria-hidden />
              </SearchClear>
            )}
          </SearchField>
          {selected.size > 0 && (
            <SelectedPill>
              <Check size={11} /> {selected.size} selected
            </SelectedPill>
          )}
        </SearchBar>

        <RepoListScroll>
          {loading && totalCount === 0 ? (
            <EmptyState>
              <Spin size={20} />
              {t("import.loading", "Loading repositories…")}
            </EmptyState>
          ) : totalCount === 0 ? (
            <EmptyState>
              <Inbox size={22} />
              {t("import.no_results", "No repositories.")}
            </EmptyState>
          ) : (
            <>
              {available.length > 0 && (
                <>
                  <SectionHeaderBar>
                    <span>{t("import.group.available", "Available — recently active")}</span>
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
                    <span>{t("import.group.added", "Already on system")}</span>
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
            placeholder={t("import.dest_placeholder", "Destination folder (/Users/you/Code)")}
            data-testid="add-repo-bulk-dest"
            style={{ flex: 1, marginRight: 8 }}
          />
          <SecondaryBtn type="button" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </SecondaryBtn>
          <PrimaryBtn
            type="button"
            onClick={() => void onImport()}
            disabled={!canImport}
            data-testid="add-repo-import"
          >
            {cloning ? <Spin size={13} /> : <ArrowDown size={13} />}
            {cloning
              ? t("actions.importing", "Importing…")
              : t("import.submit", `Import ${selected.size}`)}
          </PrimaryBtn>
        </Footer>
      </ProvidersMain>
    </ProvidersGrid>
  );
  void isTauri;
}

function RepoRowCard({
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
}): ReactNode {
  return (
    <RepoRow selected={selected} disabled={alreadyLocal}>
      <Checkbox
        size="small"
        checked={selected}
        disabled={alreadyLocal}
        onChange={() => !alreadyLocal && onToggle()}
        sx={{ p: 0 }}
        data-testid="add-repo-row-checkbox"
      />
      <RepoBody>
        <RepoTitleRow>
          <RepoTitle>{repo.fullName}</RepoTitle>
          {repo.isPrivate && <MetaBadge tone="neutral">private</MetaBadge>}
          {repo.isFork && <MetaBadge tone="neutral">fork</MetaBadge>}
          {repo.isArchived && <MetaBadge tone="neutral">archived</MetaBadge>}
          {alreadyLocal && (
            <MetaBadge tone="success">
              <Check size={9} /> on system
            </MetaBadge>
          )}
        </RepoTitleRow>
        {repo.description && <RepoDesc>{repo.description}</RepoDesc>}
        <RepoMeta>
          {repo.language && (
            <LangChip>
              <LangDot />
              {repo.language}
            </LangChip>
          )}
          {repo.language && repo.updatedAt && <span aria-hidden>·</span>}
          {repo.updatedAt && <span>updated {repo.updatedAt.slice(0, 10)}</span>}
        </RepoMeta>
      </RepoBody>
      {progress === "cloning" && (
        <StatusInline>
          <Spin size={11} />
          cloning…
        </StatusInline>
      )}
      {progress === "done" && (
        <StatusInline style={{ color: "var(--mui-palette-success-main, #16a34a)" }}>
          <Check size={11} /> done
        </StatusInline>
      )}
      {progress === "error" && (
        <StatusInline style={{ color: "var(--mui-palette-error-main, #dc2626)" }}>
          <X size={11} /> failed
        </StatusInline>
      )}
    </RepoRow>
  );
}
