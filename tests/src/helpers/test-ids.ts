/**
 * Re-export of the canonical TEST_IDS registry from `@recrest/app`.
 *
 * Playwright specs may only address elements via `data-testid` (see
 * `tests/CLAUDE.md`), and the strings they pass to `getByTestId()` must
 * stay in lockstep with the values the React tree renders. This file
 * keeps both sides on a single source of truth — the app workspace owns
 * the registry, the test workspace imports it via this thin helper so
 * specs don't reach across workspace boundaries inline.
 */
export {
  TEST_IDS,
  navCountTestId,
  navTestId,
} from "../../../app/src/lib/constants/testIds.constants";
