import type { ReactElement, SVGProps } from "react";

import { siBitbucket, siGithub, siGitlab, siRss, siTauri } from "simple-icons";

import { SimpleIcon } from "./SimpleIcon";

type Icon = (props: SVGProps<SVGSVGElement>) => ReactElement;

const defaults = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ─── Brand icons (via simple-icons) ──────────────────── */

export const GithubIcon: Icon = ({ width = 16, height = 16, ...rest }) => (
  <SimpleIcon icon={siGithub} size={Number(width)} height={height} {...rest} />
);

export const GitlabIcon: Icon = ({ width = 20, height = 20, ...rest }) => (
  <SimpleIcon icon={siGitlab} size={Number(width)} height={height} {...rest} />
);

export const BitbucketIcon: Icon = ({ width = 20, height = 20, ...rest }) => (
  <SimpleIcon icon={siBitbucket} size={Number(width)} height={height} {...rest} />
);

// Marks used as tiny row/sidebar glyphs — same svg, just re-sized.
export const GitlabMark: Icon = (props) => <GitlabIcon width={14} height={14} {...props} />;
export const BitbucketMark: Icon = (props) => <BitbucketIcon width={14} height={14} {...props} />;

export const TauriIcon: Icon = ({ width = 16, height = 16, ...rest }) => (
  <SimpleIcon icon={siTauri} size={Number(width)} height={height} {...rest} />
);

export const RssIcon: Icon = ({ width = 16, height = 16, ...rest }) => (
  <SimpleIcon icon={siRss} size={Number(width)} height={height} {...rest} />
);

/* ─── UI icons (custom — not available in simple-icons) ── */

export const BrandMark: Icon = (props) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 448 320"
    fill="none"
    stroke="var(--brand-ink)"
    strokeWidth={52}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M0 200 L224 0 L448 200" />
    <path d="M0 320 L224 120 L448 320" opacity={0.5} />
  </svg>
);

export const SunIcon: Icon = (props) => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...defaults} {...props}>
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const MoonIcon: Icon = (props) => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...defaults} {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const DownloadIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export const LaptopIcon: Icon = (props) => (
  <svg width={12} height={12} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <rect x={2} y={4} width={20} height={16} rx={2} />
  </svg>
);

export const CheckSmallIcon: Icon = (props) => (
  <svg width={12} height={12} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <path d="M20 7 9 18l-5-5" />
  </svg>
);

export const LockIcon: Icon = (props) => (
  <svg width={12} height={12} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <rect x={3} y={11} width={18} height={11} rx={2} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const GridIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...defaults} {...props}>
    <rect x={3} y={3} width={7} height={7} rx={1} />
    <rect x={14} y={3} width={7} height={7} rx={1} />
    <rect x={3} y={14} width={7} height={7} rx={1} />
    <rect x={14} y={14} width={7} height={7} rx={1} />
  </svg>
);

export const BranchIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...defaults} {...props}>
    <path d="M6 3v12" />
    <circle cx={6} cy={18} r={3} />
    <circle cx={6} cy={6} r={3} />
    <circle cx={18} cy={6} r={3} />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

export const MergeIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...defaults} {...props}>
    <path d="M18 6 6 18" />
    <path d="M6 6h12v12" />
  </svg>
);

export const ActivityIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...defaults} {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const CheckIcon: Icon = (props) => (
  <svg width={10} height={10} viewBox="0 0 24 24" {...defaults} strokeWidth={3} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const HelpCircleIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <circle cx={12} cy={12} r={10} />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

export const CodeBracketsIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const MessageIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const ChevronDownIcon: Icon = (props) => (
  <svg width={12} height={12} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ShieldOffIcon: Icon = (props) => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...defaults} strokeWidth={2} {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m3 3 18 18" />
  </svg>
);

export const FeatherIcon: Icon = (props) => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...defaults} strokeWidth={2} {...props}>
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
    <line x1={16} y1={8} x2={2} y2={22} />
    <line x1={17.5} y1={15} x2={9} y2={15} />
  </svg>
);

export const CloudOffIcon: Icon = (props) => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...defaults} strokeWidth={2} {...props}>
    <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" />
    <line x1={1} y1={1} x2={23} y2={23} />
  </svg>
);

export const KeyIcon: Icon = (props) => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...defaults} strokeWidth={2} {...props}>
    <path d="m21 2-9.6 9.6" />
    <circle cx={7.5} cy={15.5} r={5.5} />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

export const FolderIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...defaults} {...props}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

export const ServerIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...defaults} {...props}>
    <rect x={2} y={3} width={20} height={7} rx={1} />
    <rect x={2} y={14} width={20} height={7} rx={1} />
    <line x1={6} y1={6.5} x2={6.01} y2={6.5} />
    <line x1={6} y1={17.5} x2={6.01} y2={17.5} />
  </svg>
);

export const TerminalIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <polyline points="4 17 10 11 4 5" />
    <line x1={12} y1={19} x2={20} y2={19} />
  </svg>
);

export const CodeIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const ExternalLinkIcon: Icon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" {...defaults} strokeWidth={2.2} {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1={10} y1={14} x2={21} y2={3} />
  </svg>
);
