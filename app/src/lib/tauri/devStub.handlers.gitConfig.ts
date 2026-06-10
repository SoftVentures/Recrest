// Dev:web stub handlers for the legacy + layered git-config commands.
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import {
  type DevStubState,
  findStubLayer,
  resolveLayers,
  resolveOrigins,
} from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

export function gitConfigStub(
  cmd: string,
  a: Args,
  state: DevStubState,
): unknown | typeof UNHANDLED {
  switch (cmd) {
    case "get_git_config":
      return {
        scope: a.repoId == null ? "global" : "repo",
        entries: a.repoId == null ? { ...state.globalGitConfig } : {},
      };

    case "set_git_config": {
      if (a.repoId == null) {
        const key = (a.key as string | undefined) ?? "";
        const value = (a.value as string | undefined) ?? "";
        if (value === "") delete state.globalGitConfig[key];
        else state.globalGitConfig[key] = value;
      }
      return {
        scope: a.repoId == null ? "global" : "repo",
        entries: a.repoId == null ? { ...state.globalGitConfig } : {},
      };
    }

    case "list_git_config_layers":
      return resolveLayers(state, (a.repoId as string | null | undefined) ?? null);

    case "get_git_config_with_origins":
      return resolveOrigins(resolveLayers(state, (a.repoId as string | null | undefined) ?? null));

    case "set_git_config_in_layer": {
      const filePath = (a.filePath as string | undefined) ?? "";
      const key = (a.key as string | undefined) ?? "";
      const value = (a.value as string | undefined) ?? "";
      let layer = findStubLayer(state, filePath);
      if (!layer && filePath.endsWith("/.git/config")) {
        // Repo-local layer is generated on demand by `resolveLayers`; persist
        // edits to it inside state.layers so subsequent reads see the value.
        layer = {
          path: filePath,
          condition: null,
          active: true,
          exists: true,
          entries: {},
        };
        state.layers.push(layer);
      }
      if (layer) {
        if (value === "") delete layer.entries[key];
        else layer.entries[key] = value;
      }
      return resolveOrigins(resolveLayers(state, (a.repoId as string | null | undefined) ?? null));
    }

    case "add_git_config_include": {
      const condition = (a.condition as string | null | undefined) ?? null;
      const targetPath = (a.targetPath as string | undefined) ?? "";
      const existing = state.layers.find((l) => l.path === targetPath && l.condition === condition);
      if (!existing) {
        state.layers.push({
          path: targetPath,
          condition,
          active: false,
          exists: true,
          entries: {},
        });
      }
      return undefined;
    }

    case "remove_git_config_include": {
      const condition = (a.condition as string | null | undefined) ?? null;
      const targetPath = (a.targetPath as string | undefined) ?? "";
      const idx = state.layers.findIndex((l) => l.path === targetPath && l.condition === condition);
      if (idx >= 0) state.layers.splice(idx, 1);
      return undefined;
    }

    default:
      return UNHANDLED;
  }
}
