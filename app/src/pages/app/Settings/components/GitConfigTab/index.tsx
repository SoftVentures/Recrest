import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import type { GitConfigEntry, GitConfigLayer } from "@recrest/shared";

import { toast } from "sonner";

import { isKnownKey, isStructuredKey } from "@/lib/constants/gitConfigSchema";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import {
  LoadingText,
  Root,
} from "@/pages/app/Settings/components/GitConfigTab/GitConfigTab.styles";
import AliasesEditor from "@/pages/app/Settings/components/GitConfigTab/parts/AliasesEditor";
import CustomKeysList from "@/pages/app/Settings/components/GitConfigTab/parts/CustomKeysList";
import IncludeManager from "@/pages/app/Settings/components/GitConfigTab/parts/IncludeManager";
import SectionList from "@/pages/app/Settings/components/GitConfigTab/parts/SectionList";
import UrlRewritesEditor from "@/pages/app/Settings/components/GitConfigTab/parts/UrlRewritesEditor";
import {
  loadGitConfigLayers,
  loadGitConfigWithOrigins,
  setGitConfigInLayer,
} from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

export function GitConfigSection() {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const dispatch = useAppDispatch();

  const [layers, setLayers] = useState<GitConfigLayer[]>([]);
  const [origins, setOrigins] = useState<Record<string, GitConfigEntry>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isTauri()) return;
    setLoading(true);
    try {
      const [nextLayers, nextOrigins] = await Promise.all([
        dispatch(loadGitConfigLayers({ repoId: null })).unwrap(),
        dispatch(loadGitConfigWithOrigins({ repoId: null })).unwrap(),
      ]);
      setLayers(nextLayers ?? []);
      setOrigins(nextOrigins ?? {});
    } catch (err) {
      toast.error(`${t("settings.git.load_error")}: ${String((err as Error)?.message ?? err)}`);
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Dedupe by `path`: a real `~/.gitconfig` may have multiple [includeIf]
  // blocks (different gitdir conditions) pointing at the same identity file.
  // The layer-picker selects ONE file to write into, so it must list each
  // unique file once — duplicates produce React dup-key warnings on
  // <MenuItem key={layer.path}>.
  const writableLayers = useMemo(() => {
    const seen = new Set<string>();
    return layers.filter((l) => {
      if (!l.active || !l.exists) return false;
      if (seen.has(l.path)) return false;
      seen.add(l.path);
      return true;
    });
  }, [layers]);

  const rootConfigFile = useMemo(
    () => layers.find((l) => l.condition === null)?.path ?? "",
    [layers],
  );

  const customEntries = useMemo<ReadonlyArray<[string, GitConfigEntry]>>(
    () =>
      Object.entries(origins)
        .filter(([k]) => !isKnownKey(k) && !isStructuredKey(k))
        .sort(([a], [b]) => a.localeCompare(b)),
    [origins],
  );

  const saveField = useCallback(
    async (filePath: string, key: string, value: string) => {
      try {
        const updated = await dispatch(
          setGitConfigInLayer({ repoId: null, filePath, key, value }),
        ).unwrap();
        setOrigins(updated);
        // Refresh layers too so IncludeManager row entries stay consistent.
        await refresh();
        toast.success(t("settings.git.save_success"));
      } catch (err) {
        toast.error(`${t("settings.git.save_error")}: ${String((err as Error)?.message ?? err)}`);
        throw err;
      }
    },
    [dispatch, refresh, t],
  );

  return (
    <Root data-testid={TEST_IDS.gitConfigSettings.root}>
      {loading && layers.length === 0 && <LoadingText>{t("settings.git.intro")}</LoadingText>}
      <IncludeManager layers={layers} rootConfigFile={rootConfigFile} onRefresh={refresh} />
      <SectionList origins={origins} writableLayers={writableLayers} onSaveField={saveField} />
      <AliasesEditor origins={origins} writableLayers={writableLayers} onAfterWrite={refresh} />
      <UrlRewritesEditor origins={origins} writableLayers={writableLayers} onAfterWrite={refresh} />
      <CustomKeysList entries={customEntries} writableLayers={writableLayers} onSave={saveField} />
    </Root>
  );
}
