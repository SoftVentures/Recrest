import { styled } from "@mui/material/styles";

/**
 * Screen-reader-only text. The clip-rect recipe is used instead of
 * `display: none` / `visibility: hidden` because those drop the node from the
 * accessibility tree, which would silence the `aria-live` announcements this
 * wraps. Shared by the button primitives and the repo chips so the three copies
 * that existed before cannot drift apart.
 */
// eslint-disable-next-line no-restricted-syntax -- visually-hidden text; a bare inline element that contributes no layout, so neither <Typography> nor <Box> is a fit
const VisuallyHidden = styled("span")({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  // The whole clip-rect recipe is device pixels on purpose — it is a
  // rendering trick, not a measured dimension.
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export default VisuallyHidden;
