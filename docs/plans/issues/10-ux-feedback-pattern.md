# Phase 7 — UX-Feedback-Pattern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generisches `useActionFeedback`-Hook + `feedbackState`-Prop für `GeneralButton`/`GeneralIconButton`. Bestehende Reload-, Copy-, Save-, Pull/Fetch/Push-Buttons migrieren.

**Architecture:** Hook hält `state: 'idle' | 'loading' | 'success' | 'error'` mit Auto-Revert nach 1500ms. Buttons rendern Spinner / grünes Häkchen / rotes Kreuz inline statt Icon.

**Tech Stack:** React + MUI v9, vitest.

---

## File Structure

- Create: `app/src/lib/utils/useActionFeedback.ts`
- Create: `app/src/lib/utils/useActionFeedback.test.ts`
- Modify: `app/src/components/atoms/buttons/GeneralButton/index.tsx` — `feedbackState`-Prop
- Modify: `app/src/components/atoms/buttons/GeneralIconButton/index.tsx` — `feedbackState`-Prop
- Modify: Aufrufer der zu migrierenden Buttons (Reload, Copy, Save)

---

## Task 1: `useActionFeedback`-Hook

**Files:**

- Create: `app/src/lib/utils/useActionFeedback.ts`
- Create: `app/src/lib/utils/useActionFeedback.test.ts`

- [x] **Step 1: Tests schreiben**

```ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useActionFeedback } from "./useActionFeedback";

describe("useActionFeedback", () => {
  it("startet im idle-State", () => {
    const { result } = renderHook(() => useActionFeedback());
    expect(result.current.state).toBe("idle");
  });
  it("setzt loading während async-Action", async () => {
    const { result } = renderHook(() => useActionFeedback());
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    act(() => {
      result.current.run(() => promise);
    });
    expect(result.current.state).toBe("loading");
    await act(async () => {
      resolve();
      await promise;
    });
    expect(result.current.state).toBe("success");
  });
  it("revertet success zurück zu idle nach 1500ms", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useActionFeedback());
    await act(async () => {
      await result.current.run(() => Promise.resolve());
    });
    expect(result.current.state).toBe("success");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.state).toBe("idle");
    vi.useRealTimers();
  });
  it("setzt error wenn Action throws", async () => {
    const { result } = renderHook(() => useActionFeedback());
    await act(async () => {
      try {
        await result.current.run(() => Promise.reject(new Error("fail")));
      } catch {}
    });
    expect(result.current.state).toBe("error");
    expect(result.current.error?.message).toBe("fail");
  });
});
```

- [x] **Step 2: Test laufen lassen → fehlschlägt**

Run: `yarn workspace @recrest/app test useActionFeedback`

- [x] **Step 3: Hook implementieren**

```ts
import { useCallback, useEffect, useRef, useState } from "react";

export type ActionFeedbackState = "idle" | "loading" | "success" | "error";
const REVERT_MS = 1500;

export function useActionFeedback() {
  const [state, setState] = useState<ActionFeedbackState>("idle");
  const [error, setError] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    if (timer.current) clearTimeout(timer.current);
    setState("loading");
    setError(null);
    try {
      const result = await fn();
      setState("success");
      timer.current = setTimeout(() => setState("idle"), REVERT_MS);
      return result;
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e : new Error(String(e)));
      timer.current = setTimeout(() => setState("idle"), REVERT_MS);
      throw e;
    }
  }, []);

  return { state, error, run };
}
```

- [x] **Step 4: Tests grün**

Run: `yarn workspace @recrest/app test useActionFeedback`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/src/lib/utils
git commit -m "feat(ux): useActionFeedback hook with auto-revert"
```

---

## Task 2: `GeneralButton` + `GeneralIconButton` mit `feedbackState`

**Files:**

- Modify: `app/src/components/atoms/buttons/GeneralButton/index.tsx`
- Modify: `app/src/components/atoms/buttons/GeneralIconButton/index.tsx`

- [x] **Step 1: Props erweitern**

```tsx
// GeneralButton/index.tsx — Props
export interface GeneralButtonProps {
  // ...
  feedbackState?: ActionFeedbackState;
}
```

- [x] **Step 2: Inline-Indicator-Rendering**

```tsx
const showSpinner = feedbackState === "loading";
const showCheck = feedbackState === "success";
const showCross = feedbackState === "error";
const startIcon = showSpinner ? (
  <Spinner size={16} />
) : showCheck ? (
  <CheckIcon color="success" />
) : showCross ? (
  <ErrorIcon color="error" />
) : (
  props.startIcon
);
```

`GeneralIconButton` rendert den Indikator statt des Icons.

- [x] **Step 3: Visual-Test mit Storybook**

In `GeneralButton.stories.tsx` Story `WithFeedback` ergänzen, die alle 4 States zeigt.

- [x] **Step 4: Commit**

```bash
git add app/src/components/atoms/buttons
git commit -m "feat(buttons): feedbackState prop on GeneralButton and GeneralIconButton"
```

---

## Task 3: Reload-Buttons migrieren

**Files:**

- Modify: Reload-Buttons im App-Header, RepoDetail, MR-Liste, etc. (grep nach `reload\|refresh` in Components)

- [x] **Step 1: Pro Reload-Button: useActionFeedback ein-bauen**

```tsx
const { state, run } = useActionFeedback();
<GeneralIconButton
  icon={<RefreshIcon />}
  feedbackState={state}
  onClick={() => run(() => dispatch(reloadThunk()))}
/>;
```

- [x] **Step 2: Commit**

```bash
git add app/src
git commit -m "fix(ux): reload buttons show success feedback after refresh"
```

---

## Task 4: Copy-Buttons migrieren

**Files:**

- Modify: Copy-Buttons (PR-URLs, Branch-Namen, Token-Felder, Path-Felder)

- [x] **Step 1: Pro Copy-Button: useActionFeedback**

```tsx
const { state, run } = useActionFeedback();
<GeneralIconButton
  icon={<CopyIcon />}
  feedbackState={state}
  onClick={() =>
    run(async () => {
      await navigator.clipboard.writeText(value);
    })
  }
/>;
```

- [x] **Step 2: Commit**

```bash
git add app/src
git commit -m "fix(ux): copy buttons confirm success with check icon"
```

---

## Task 5: Save-Buttons in Settings migrieren

**Files:**

- Modify: Settings-Sektionen mit Save-Aktionen (siehe Phase 3 Provider-Karten, Settings allgemein)

- [x] **Step 1: Pro Save: useActionFeedback**

Analog zu Task 3.

- [x] **Step 2: Commit**

```bash
git add app/src
git commit -m "fix(ux): settings save buttons show feedback state"
```

---

## Verification

- [x] `yarn workspace @recrest/app test`
- [x] **Visual-Smoke (`yarn dev`)**: Reload, Copy, Save → grünes Häkchen blitzt nach Erfolg, dann zurück zu idle
- [x] Auf Fehler-Pfaden: rotes Kreuz mit Error-Tooltip
- [x] Pull/Fetch/Push aus Phase 6 nutzen dieses Pattern (siehe Phase 9-Plan)
