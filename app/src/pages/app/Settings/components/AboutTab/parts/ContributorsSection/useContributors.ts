import { useEffect, useState } from "react";

import { type Contributor, fetchContributors } from "@/lib/contributors";

type Status = "loading" | "ready" | "error";

export interface ContributorsState {
  status: Status;
  contributors: Contributor[];
}

/** Loads the ranked contributor list once on mount. The underlying fetch is
 *  cached per session, so re-mounting the About tab won't re-hit the API. */
export function useContributors(): ContributorsState {
  const [state, setState] = useState<ContributorsState>({ status: "loading", contributors: [] });

  useEffect(() => {
    let alive = true;
    fetchContributors()
      .then((contributors) => {
        if (alive) setState({ status: "ready", contributors });
      })
      .catch(() => {
        if (alive) setState({ status: "error", contributors: [] });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
