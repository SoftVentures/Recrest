import type { ProviderConnection, ProviderId } from "@recrest/shared";

export interface ProvidersState {
  connections: Partial<Record<ProviderId, ProviderConnection>>;
  loading: boolean;
  error: string | null;
}
