import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { PrEventKind } from "@recrest/shared";

import { GitCommit, GitMerge, GitPullRequest, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import {
  type FeedEvent,
  FeedIcon,
  FeedItem,
  FeedMeta,
  FeedMsg,
  commitUrl,
} from "@/components/organisms/activity/Timeline/parts/_shared";
import { daysAgo, relativeWhen } from "@/lib/activityStats";
import { FeedEventKind } from "@/lib/constants/feedEventKinds.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { openExternal } from "@/lib/tauri";

export interface FeedEventRowProps {
  event: FeedEvent;
  today: Date;
}

export function FeedEventRow({ event, today }: FeedEventRowProps) {
  const { t } = useTranslation();
  const day = daysAgo(event.at, today);
  const when = day >= 0 ? relativeWhen(event.at, day) : "";

  if (event.kind === FeedEventKind.COMMIT) {
    const url = commitUrl(event.repo?.remoteUrl, event.data.sha);
    const open = () => {
      if (url) void openExternal(url);
      else toast.info(t("activity.feed.no_remote"));
    };
    return (
      <FeedItem
        clickable
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
            e.preventDefault();
            open();
          }
        }}
      >
        <FeedIcon tone="commit">
          <GitCommit size={13} aria-hidden />
        </FeedIcon>
        <AuthorAvatar
          name={event.data.author}
          email={event.data.authorEmail ?? undefined}
          size={20}
        />
        <FeedMsg component="span" variant="caption">
          {event.data.summary}
        </FeedMsg>
        <FeedMeta component="span" variant="caption">
          {event.repo && <RepoAvatar repo={event.repo} size={14} radius={3} />}
          <Box component="span">{event.data.repoName}</Box>
          <Box component="span">· {event.data.sha.slice(0, 7)}</Box>
          <Box component="span">· {when}</Box>
        </FeedMeta>
      </FeedItem>
    );
  }

  if (event.kind === FeedEventKind.PR) {
    const e = event.data;
    const open = () => void openExternal(e.url);
    const tone: PrEventKind =
      e.kind === PrEventKind.OPENED
        ? PrEventKind.OPENED
        : e.kind === PrEventKind.MERGED
          ? PrEventKind.MERGED
          : PrEventKind.CLOSED;
    const Icon = e.kind === PrEventKind.MERGED ? GitMerge : GitPullRequest;
    return (
      <FeedItem
        clickable
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(ev) => {
          if (ev.key === KEYBOARD_KEYS.ENTER || ev.key === KEYBOARD_KEYS.SPACE) {
            ev.preventDefault();
            open();
          }
        }}
      >
        <FeedIcon tone={tone}>
          <Icon size={13} aria-hidden />
        </FeedIcon>
        <AuthorAvatar name={e.author} size={20} />
        <FeedMsg component="span" variant="caption">
          {e.kind.toUpperCase()} · {e.title}
        </FeedMsg>
        <FeedMeta component="span" variant="caption">
          {event.repo && <RepoAvatar repo={event.repo} size={14} radius={3} />}
          <Box component="span">{e.repoName}</Box>
          <Box component="span">· #{e.number}</Box>
          <Box component="span">· {when}</Box>
        </FeedMeta>
      </FeedItem>
    );
  }

  const s = event.data;
  const failingTone: "check-ok" | "check-fail" = s.failed > 0 ? "check-fail" : "check-ok";
  const Icon = s.failed > 0 ? ShieldAlert : ShieldCheck;
  const failedLabel =
    s.failed === 1
      ? t("activity.feed.failing_checks_one", { count: s.failed })
      : t("activity.feed.failing_checks_other", { count: s.failed });
  return (
    <FeedItem>
      <FeedIcon tone={failingTone}>
        <Icon size={13} aria-hidden />
      </FeedIcon>
      <Box />
      <FeedMsg component="span" variant="caption">
        {failedLabel} · {t("activity.feed.passing", { count: s.passed })}
      </FeedMsg>
      <FeedMeta component="span" variant="caption">
        {event.repo && <RepoAvatar repo={event.repo} size={14} radius={3} />}
        <Box component="span">{s.repoName}</Box>
        <Box component="span">· {when}</Box>
      </FeedMeta>
    </FeedItem>
  );
}

export default FeedEventRow;
