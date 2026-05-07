import { type ReactNode, useEffect, useRef, useState } from "react";

import { useDrawerSwipe } from "@/hooks/useDrawerSwipe";

/**
 * Shared right-side panel envelope used by `MergeRequestsPage`'s MR drawer
 * and (going forward) the repo detail PR drawer. The Phase 0.2 prop surface
 * is a discriminated union — callers pass either `children` for free-form
 * content or `tabs` for a tabbed shell. `tabs` is reserved for Plan 2 §C.5
 * ("Files Changed" tab) and not exercised yet; the type is locked in now so
 * Plan 2 can add it without breaking callers.
 */
export type DrawerTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type DrawerCommonProps = {
  open: boolean;
  side?: "right" | "left";
  size?: "sm" | "md" | "lg" | string;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Optional `data-testid` so callers can target the outer aside in tests. */
  testId?: string;
  /**
   * When true, a transparent backdrop is rendered behind the drawer; clicking
   * it dismisses the drawer (Plan 1 §A.1). Defaults to `true` for the
   * floating overlay variant and to `false` for the inline variant
   * (className contains `a-drawer-inline`) — inline drawers share their
   * column with surrounding chrome and a click-outside dismissal would
   * conflict with the host page. Pass an explicit value to override.
   */
  dismissOnBackdrop?: boolean;
};

type DrawerChildrenProps = DrawerCommonProps & {
  children: ReactNode;
  tabs?: never;
  defaultTabId?: never;
  onTabChange?: never;
};

type DrawerTabsProps = DrawerCommonProps & {
  tabs: DrawerTab[];
  defaultTabId?: string;
  onTabChange?: (id: string) => void;
  children?: never;
};

export type DrawerProps = DrawerChildrenProps | DrawerTabsProps;

function widthFor(size: DrawerProps["size"]): string | undefined {
  if (!size || size === "md") return undefined;
  if (size === "sm") return "300px";
  if (size === "lg") return "440px";
  return size;
}

export function Drawer(props: DrawerProps) {
  const {
    open,
    side = "right",
    size,
    onClose,
    header,
    footer,
    className,
    testId,
    dismissOnBackdrop,
  } = props;
  const asideRef = useRef<HTMLElement | null>(null);

  // Inline drawers ride inside the host grid (`a-drawer-inline` removes the
  // fixed-overlay positioning), so a backdrop spanning the viewport would
  // dismiss the drawer on completely unrelated clicks. Default the inline
  // variant to opt-out and the floating variant to opt-in; callers can
  // still override via the explicit prop.
  const isInline = (className ?? "").includes("a-drawer-inline");
  const backdropEnabled = dismissOnBackdrop ?? !isInline;

  // ESC closes the drawer. Bound only while the drawer is open so we don't
  // intercept Escape elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // D.5: swipe-to-dismiss on touch devices. Right-side drawers close on
  // a rightward swipe (toward the screen edge); left-side mirrors that.
  useDrawerSwipe({
    ref: asideRef,
    onClose,
    enabled: open,
    direction: side === "left" ? "left" : "right",
  });

  if (!open) return null;

  const widthOverride = widthFor(size);

  const sideClass = side === "left" ? "a-drawer-side-left" : "a-drawer-side-right";

  return (
    <>
      {backdropEnabled && (
        <div
          className="a-drawer-backdrop"
          onClick={onClose}
          data-testid={testId ? `${testId}-backdrop` : undefined}
          aria-hidden="true"
        />
      )}
      <aside
        ref={asideRef}
        className={["a-drawer", sideClass, className].filter(Boolean).join(" ")}
        style={widthOverride ? { width: widthOverride } : undefined}
        data-testid={testId}
        role="complementary"
      >
        {header && <div className="a-drawer-hdr">{header}</div>}
        <div className="a-drawer-body">
          {"tabs" in props && props.tabs ? (
            <DrawerTabs
              tabs={props.tabs}
              defaultTabId={props.defaultTabId}
              onTabChange={props.onTabChange}
            />
          ) : (
            props.children
          )}
        </div>
        {footer && <div className="a-drawer-footer">{footer}</div>}
      </aside>
    </>
  );
}

function DrawerTabs({
  tabs,
  defaultTabId,
  onTabChange,
}: {
  tabs: DrawerTab[];
  defaultTabId?: string;
  onTabChange?: (id: string) => void;
}) {
  const initial = defaultTabId ?? tabs[0]?.id ?? "";
  const [active, setActive] = useState(initial);
  const select = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="a-drawer-tabs">
      <div className="a-drawer-tabbar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === current?.id}
            className={`a-drawer-tab ${tab.id === current?.id ? "active" : ""}`}
            onClick={() => select(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="a-drawer-tabpanel" role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}
