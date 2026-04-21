import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import type { WeekPair } from "@/lib/activityStats";

interface Props {
  authors: WeekPair;
  /** Top contributors rendered as stacked avatars. Pass the email (if
   *  available) so the avatars render Gravatars instead of plain initials. */
  topAuthors: { name: string; email: string | null }[];
}

export function AuthorsHero({ authors, topAuthors }: Props) {
  const { t } = useTranslation();
  const dir = authors.delta === 0 ? "flat" : authors.delta > 0 ? "up" : "down";
  const deltaLabel =
    authors.delta === 0
      ? t("activity.kpi.delta_flat")
      : authors.delta > 0
        ? t("activity.kpi.delta_up", { delta: authors.delta })
        : t("activity.kpi.delta_down", { delta: authors.delta });
  return (
    <div className={`a-act-kpi tone-${dir}`}>
      <div className="a-act-kpi-label">{t("activity.kpi.authors_week")}</div>
      <div className="a-act-kpi-value">{authors.current}</div>
      <div className="a-act-hero-foot">
        <div className="a-act-avstack" aria-hidden>
          {topAuthors.slice(0, 3).map((a) => (
            <AuthorAvatar key={a.name} name={a.name} email={a.email} size={22} />
          ))}
        </div>
        <div className="a-act-kpi-delta ml-auto">
          {dir === "up" && <Icon name="arrowUp" size={11} />}
          {dir === "down" && <Icon name="arrowDown" size={11} />}
          <span>{deltaLabel}</span>
        </div>
      </div>
    </div>
  );
}
