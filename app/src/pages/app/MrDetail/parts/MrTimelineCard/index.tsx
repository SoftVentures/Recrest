import { useTranslation } from "react-i18next";

import type { TimelineEvent } from "@recrest/shared";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { Empty } from "@/pages/app/MrDetail/MrDetail.styles";
import {
  Muted,
  TimelineBody,
  TimelineHead,
  TimelineItem,
  TimelineList,
  TimelineType,
} from "@/pages/app/MrDetail/parts/MrTimelineCard/MrTimelineCard.styles";

interface Props {
  events: TimelineEvent[] | undefined;
  loading: boolean;
}

export default function MrTimelineCard({ events, loading }: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const dt = useDateTimeFormat();

  return (
    <GeneralCard title={tPrs("detail.section_timeline")} sub={`${events?.length ?? 0}`} flushHeight>
      {loading && !events ? (
        <Empty>{tPrs("diff.loading")}</Empty>
      ) : !events || events.length === 0 ? (
        <Empty>{tPrs("detail.no_timeline")}</Empty>
      ) : (
        <TimelineList>
          {events.map((evt) => (
            <TimelineItem key={evt.id + evt.at}>
              <TimelineHead>
                {evt.actor && <AuthorAvatar name={evt.actor} avatarUrl={null} size={16} />}
                <TimelineType component="span" variant="caption">
                  {evt.type.replace(/_/g, " ")}
                </TimelineType>
                {evt.actor && (
                  <Muted component="span" variant="caption">
                    · {evt.actor}
                  </Muted>
                )}
                <Muted component="span" variant="caption">
                  · {dt.formatAbsolute(evt.at)}
                </Muted>
              </TimelineHead>
              {evt.body && <TimelineBody>{evt.body}</TimelineBody>}
            </TimelineItem>
          ))}
        </TimelineList>
      )}
    </GeneralCard>
  );
}
