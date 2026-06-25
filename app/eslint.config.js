import js from "@eslint/js";
import i18next from "eslint-plugin-i18next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * i18n coverage gate. `no-literal-string` in `jsx-only` mode flags user-visible
 * text — JSX text nodes plus the text-bearing attributes below — so every such
 * string must flow through `t()`. CSS values, variants, testids, and other
 * non-text attributes are NOT flagged (only the `include` list is checked), and
 * letter-free glyph/number strings (`·`, `—`, `↑12`) are excluded via `words`.
 * Toasts are gated separately in `no-restricted-syntax` (call args aren't JSX).
 */
const i18nNoLiteralString = [
  "error",
  {
    mode: "jsx-only",
    "jsx-attributes": {
      // Text-bearing props only. A string LITERAL on any of these must be t();
      // `prop={t(...)}` and non-text props (variant/tone/size/component/…) pass.
      include: [
        "title",
        "placeholder",
        "aria-label",
        "alt",
        "label",
        "description",
        "subtitle",
        "tooltip",
        "helperText",
        "hint",
        "heading",
      ],
    },
    words: {
      // Skip strings with no letters in any script (separators, counts, symbols,
      // emoji) and ALL-CAPS tokens; everything containing real letters is text.
      exclude: [/^[^\p{L}]+$/u, "[A-Z_-]+"],
    },
    callees: {
      // Args to these are NOT user text. Defaults + our translation-hook aliases
      // (`tAria`/`tPrs`/`tCommon`/… are all `t` under another name) + a few
      // method names whose string args are identifiers, not copy.
      exclude: [
        "i18n(ext)?",
        "t",
        "t[A-Z]\\w*",
        "require",
        "addEventListener",
        "removeEventListener",
        "postMessage",
        "getElementById",
        "dispatch",
        "commit",
        "includes",
        "indexOf",
        "endsWith",
        "startsWith",
        "isActive",
      ],
    },
  },
];

/**
 * `no-restricted-syntax` selectors that enforce the constants discipline.
 *
 * Every entry blocks one common way of sneaking a magic string back into
 * the codebase. Whenever you intentionally violate one of these (rare —
 * the anti-flash inline script in `index.html` is one such case), document
 * the exception inline and silence the rule with a targeted `eslint-disable`
 * comment rather than relaxing the rule globally.
 */
const noRestrictedSyntaxRules = [
  {
    selector: "JSXAttribute[name.name='data-testid'] > Literal",
    message: "Use TEST_IDS from @/lib/constants/testIds.constants instead of inline strings.",
  },
  {
    selector: "JSXAttribute[name.name='data-testid'] > JSXExpressionContainer > TemplateLiteral",
    message:
      "Use TEST_IDS generator functions (e.g. TEST_IDS.settings.tab(id)) instead of inline templates.",
  },
  {
    selector: "Literal[value=/^recrest:/]",
    message:
      "Use storage key constants from @/lib/constants/storage.constants (StorageKey.*, storageKeyForLogo, storageKeyForScroll, NOTIF_KEY_PREFIX, etc.).",
  },
  {
    selector: "CallExpression[callee.name='listen'] > Literal:first-child",
    message: "Use EventChannel constants from @recrest/shared instead of inline event names.",
  },
  {
    selector: "CallExpression[callee.name='invoke'] > Literal:first-child",
    message: "Use TauriCommand constants from @recrest/shared instead of inline command names.",
  },
  {
    selector: "CallExpression[callee.name='safeInvoke'] > Literal:first-child",
    message: "Use TauriCommand constants from @recrest/shared instead of inline command names.",
  },
  {
    selector: "Literal[value=/^(repo|clone|updater|oauth|settings):\\/\\//]",
    message:
      "Use EventChannel constants from @recrest/shared instead of inline IPC scheme strings.",
  },
  {
    selector:
      "CallExpression[callee.name='styled'][arguments.0.type='Literal'][arguments.0.value=/^(h[1-6]|p|span|div|button|section|article|nav|header|footer|main|aside|ul|ol|li|kbd|code|pre|a|label|input|textarea|select|option|form|img|table|thead|tbody|tr|td|th|strong|em|small|i|b|hr|figure|figcaption|blockquote|details|summary|dialog|address|cite|sub|sup|time|q|abbr|mark|del|ins|s|u)$/]",
    message:
      "Use Box/Typography (with `component` prop if a specific semantic tag is required) instead of styled('html-tag'). For native-chrome leaf nodes that *genuinely* need the raw element (titlebar caption, input field, etc.), keep the styled('tag') with an inline `// eslint-disable-next-line no-restricted-syntax -- reason` comment.",
  },
  {
    selector:
      "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^(div|span|p|h[1-6]|section|article|nav|header|footer|main|aside|strong|em|small)$/]",
    message:
      'Raw HTML elements (<div>, <span>, <p>, etc.) are forbidden — use MUI primitives: <Box> for layout, <Typography> for text, with the `component` prop when a specific tag is required (e.g. <Box component="span">). SVG elements (svg/path/circle/line/rect/text) are allowed inside SVG contexts.',
  },
  {
    // Toasts are user-facing but their text is a call argument, not JSX — so the
    // i18next gate can't see it. Block literal toast bodies (including the common
    // `err ?? "fallback"` / ternary shapes) so they go through `t()`.
    selector:
      "CallExpression[callee.object.name='toast'] > Literal, CallExpression[callee.object.name='toast'] > LogicalExpression > Literal, CallExpression[callee.object.name='toast'] > ConditionalExpression > Literal, CallExpression[callee.name='toast'] > Literal, CallExpression[callee.name='toast'] > LogicalExpression > Literal, CallExpression[callee.name='toast'] > ConditionalExpression > Literal",
    message:
      "User-facing toast text must come from i18n — pass a t(...) result, not a literal string.",
  },
];

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // eslint-plugin-react-hooks v7 added a batch of strict opinion rules
      // (`set-state-in-effect`, `immutability`, `static-components`, `refs`)
      // that flag patterns the codebase deliberately uses. Opting back in
      // would need a broader refactor than this dependency bump.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@radix-ui/*"],
              message: "Radix is removed — use the matching MUI component instead.",
            },
            {
              group: [
                "tailwindcss",
                "tw-animate-css",
                "class-variance-authority",
                "tailwind-merge",
              ],
              message:
                "Tailwind/CVA stack is removed — use MUI styled() components and theme tokens.",
            },
            {
              group: [
                "@/components/organisms/cards/HeatmapCard",
                "@/components/organisms/cards/LanguageDonutCard",
                "@/components/organisms/cards/ActivityCardShell",
                "@/components/molecules/placeholders/EmptyStatePlaceholder",
              ],
              message:
                "Removed duplicate. Use the survivor under @/components/organisms/activity/cards/* or @/components/molecules/feedback/EmptyState.",
            },
          ],
          paths: [
            {
              name: "@mui/material",
              importNames: [
                "Tooltip",
                "Dialog",
                "Drawer",
                "Modal",
                "Skeleton",
                "CircularProgress",
                "LinearProgress",
              ],
              message:
                "Use the Recrest wrappers instead: GeneralTooltip / GeneralModal / GeneralDrawer / GeneralSkeletonLoader / GeneralCircularLoader / GeneralLinearLoader / GeneralLoader. Raw MUI is allowed only inside the wrapper file itself.",
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...noRestrictedSyntaxRules],
      "max-lines": ["warn", { max: 800, skipBlankLines: true, skipComments: true }],
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    // Constants files own the magic strings — exempt them from the
    // no-restricted-syntax check, otherwise every `recrest:` literal in
    // storage.constants.ts and every kebab-case string in testIds.constants.ts
    // would trip the rule.
    files: ["src/lib/constants/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // `.styles.tsx` and `_shared.tsx` companion files intentionally co-locate
    // styled-component exports with the tiny private helpers that configure
    // them (`shouldForwardProp` predicates, prop-type interfaces, small SVG
    // glyph components). They're a closed implementation detail of the
    // sibling `index.tsx`, never a hot-reload entry point — so the
    // react-refresh "components-only" rule doesn't apply.
    files: ["src/**/*.styles.tsx", "src/**/_shared.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // `GeneralX` primitives in `atoms/buttons` and `atoms/loaders` deliberately
    // co-export their size/variant/tone/shape const-object enums next to the
    // component — that's the public API consumers import (and the enum lookup
    // tables the variants need). Splitting them would just produce paired
    // imports for no real fast-refresh benefit.
    files: [
      "src/components/atoms/buttons/GeneralIconButton/index.tsx",
      "src/components/atoms/buttons/OpenInIdeButton/index.tsx",
      "src/components/atoms/inputs/Kbd/index.tsx",
      "src/components/atoms/loaders/**/index.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Wrappers around raw MUI overlay/feedback primitives — these are the ONLY
    // places allowed to import Tooltip/Dialog/Drawer/Skeleton/Progress directly
    // from `@mui/material`. Everywhere else must compose the Recrest wrapper.
    files: [
      "src/components/atoms/feedback/GeneralTooltip/**",
      "src/components/atoms/loaders/**",
      "src/components/molecules/drawers/GeneralDrawer/**",
      "src/components/molecules/modals/GeneralModal/**",
      "src/components/atoms/cards/GeneralCard/**",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // i18n coverage gate — only JSX-bearing UI files. Tests, stories, and
    // styles companions are dev/build artifacts whose literal copy never ships
    // to users, so they're exempt.
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx", "src/**/*.stories.tsx", "src/**/*.styles.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": i18nNoLiteralString,
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src-tauri/**",
      "src-old/**",
      "storybook-static/**",
      "src/scripts/**",
    ],
  },
);
