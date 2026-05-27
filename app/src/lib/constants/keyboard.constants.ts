/**
 * Canonical DOM `KeyboardEvent.key` values used across the renderer.
 *
 * `KeyboardEvent.key` is web-spec terminology — these strings are dictated by
 * browsers and are not "magic" in the project sense, but funnelling them
 * through a single constant means a rename or accessibility audit hits one
 * place rather than every keydown handler.
 */
export const KEYBOARD_KEYS = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  SPACE: " ",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  TAB: "Tab",
  K: "K",
} as const;

export type KeyboardKey = (typeof KEYBOARD_KEYS)[keyof typeof KEYBOARD_KEYS];
