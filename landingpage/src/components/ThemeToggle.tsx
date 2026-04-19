import { useTranslation } from "react-i18next";

import { MoonIcon, SunIcon } from "./icons";

type Props = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: Props) {
  const { t } = useTranslation();
  const label = t("nav.toggleTheme");

  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onToggle}>
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
