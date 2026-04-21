import {
  type ReactElement,
  type Ref,
  cloneElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";

interface Props {
  /** Tooltip text. If undefined/empty, renders children as-is. */
  content: string | undefined | null;
  /** Single child whose DOM node is measured for truncation.
   *  Must be a DOM element (e.g. `<span>`, `<p>`, `<div>`, `<code>`) — not a
   *  function component, because a ref is attached to decide whether the
   *  content is actually clipped. */
  children: ReactElement;
}

/**
 * Wraps children in a Tooltip only when the child's text is actually
 * horizontally truncated (`scrollWidth > clientWidth`). Keeps a11y and
 * hover noise down on labels that fit their container.
 *
 * Assumes `TooltipProvider` is mounted higher up (done once in `AppShell`).
 */
export function TruncatedTooltip({ content, children }: Props) {
  const innerRef = useRef<HTMLElement | null>(null);
  const [truncated, setTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, content]);

  const originalRef = (children as unknown as { ref?: Ref<HTMLElement> }).ref;
  const mergedRef = (node: HTMLElement | null) => {
    innerRef.current = node;
    if (typeof originalRef === "function") {
      originalRef(node);
    } else if (originalRef && typeof originalRef === "object") {
      (originalRef as { current: HTMLElement | null }).current = node;
    }
  };

  // `cloneElement` does not carry the child's exact props signature, so the
  // ref key must be injected via a loosely-typed props object. DOM elements
  // accept the `ref` prop at runtime regardless.
  const childWithRef = cloneElement(children, { ref: mergedRef } as unknown as Partial<unknown>);

  if (!content || !truncated) return childWithRef;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{childWithRef}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
