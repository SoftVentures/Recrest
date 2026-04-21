// ESLint 9 flat config resolves `eslint.config.js` from CWD. Our configs live
// per workspace (`app/`, `shared/`, `tests/`, `landingpage/`), so lint-staged
// dispatches each staged file to a helper that runs ESLint with CWD set to the
// owning workspace.
const lintWorkspace = (workspace) => (files) =>
  `node scripts/lint-staged-eslint.mjs ${workspace} ${files
    .map((f) => JSON.stringify(f))
    .join(" ")}`;

export default {
  "*.{ts,tsx,js,jsx,cjs,mjs,json,css,html,md,svg,yml,yaml}": "prettier --write",
  "app/src/**/*.{ts,tsx}": lintWorkspace("app"),
  "shared/src/**/*.ts": lintWorkspace("shared"),
  "tests/src/**/*.ts": lintWorkspace("tests"),
  "landingpage/src/**/*.{ts,tsx}": lintWorkspace("landingpage"),
  "app/src-tauri/**/*.rs": "rustfmt --edition 2021",
};
