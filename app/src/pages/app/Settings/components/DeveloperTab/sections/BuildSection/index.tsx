import { useEffect, useState } from "react";

import { Box } from "@mui/material";

import { type PlatformInfo, TauriCommand } from "@recrest/shared";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import {
  Card,
  FactKey,
  FactRow,
  FactVal,
  PathRow,
  SectionHeading,
  SectionWrap,
} from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";

interface DevPaths {
  configDir: string | null;
  dataDir: string | null;
  cacheDir: string | null;
  logDir: string | null;
  binaryDir: string | null;
  workspaceRoot: string | null;
}

export function BuildSection() {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [tauriVersion, setTauriVersion] = useState<string | null>(null);
  const [buildTriple, setBuildTriple] = useState<string | null>(null);
  const [paths, setPaths] = useState<DevPaths | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await invoke<PlatformInfo>(TauriCommand.GET_PLATFORM_INFO);
        if (!cancelled) setPlatform(p);
      } catch {
        /* noop */
      }
      try {
        const app = await import("@tauri-apps/api/app");
        const v = await app.getTauriVersion();
        if (!cancelled) setTauriVersion(v);
      } catch {
        /* noop */
      }
      try {
        const triple = await invoke<string>(TauriCommand.GET_BUILD_TRIPLE);
        if (!cancelled) setBuildTriple(triple);
      } catch {
        /* noop */
      }
      try {
        const p = await invoke<DevPaths>(TauriCommand.GET_DEV_PATHS);
        if (!cancelled) setPaths(p);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dash = "—";
  const buildSha = typeof __GIT_SHA__ === "string" && __GIT_SHA__.length > 0 ? __GIT_SHA__ : dash;
  const buildTime =
    typeof __BUILD_TIME__ === "string" && __BUILD_TIME__.length > 0 ? __BUILD_TIME__ : dash;

  const rows: { key: string; value: string; copyable?: boolean }[] = [
    { key: "Git SHA", value: buildSha, copyable: true },
    { key: "Build time", value: buildTime },
    { key: "Mode", value: import.meta.env.MODE },
    {
      key: "Debug assertions",
      value: platform?.debugAssertions == null ? dash : String(platform.debugAssertions),
    },
    { key: "Tauri runtime", value: tauriVersion ?? dash },
    { key: "Build triple", value: buildTriple ?? dash },
    { key: "App identifier", value: "eu.softventures.recrest", copyable: true },
  ];

  return (
    <>
      <SectionWrap component="section" data-testid={TEST_IDS.settings.developer.sections.build}>
        <SectionHeading component="h3">Build</SectionHeading>
        <Card>
          {rows.map((r) => (
            <FactRow key={r.key}>
              <FactKey>{r.key}</FactKey>
              <FactVal>
                <Box component="span">{r.value}</Box>
                {r.copyable && r.value !== dash && (
                  <GeneralButton
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard?.writeText(r.value)}
                  >
                    Copy
                  </GeneralButton>
                )}
              </FactVal>
            </FactRow>
          ))}
        </Card>
      </SectionWrap>

      <SectionWrap component="section">
        <SectionHeading component="h3">Paths</SectionHeading>
        <Card>
          <PathRow label="Config dir" path={paths?.configDir ?? null} />
          <PathRow label="Data dir" path={paths?.dataDir ?? null} />
          <PathRow label="Cache dir" path={paths?.cacheDir ?? null} />
          <PathRow label="Log dir" path={paths?.logDir ?? null} />
          <PathRow label="Binary dir" path={paths?.binaryDir ?? null} />
          <PathRow label="Workspace root" path={paths?.workspaceRoot ?? null} />
        </Card>
      </SectionWrap>
    </>
  );
}

export default BuildSection;
