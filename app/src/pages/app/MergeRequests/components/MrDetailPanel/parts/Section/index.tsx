import { type ReactNode, useState } from "react";

import { Collapse } from "@mui/material";

import { ChevronDown, ChevronRight } from "lucide-react";

import {
  SectionBody,
  SectionBox,
  SectionCount,
  SectionHead,
  SectionTitle,
} from "@/pages/app/MergeRequests/components/MrDetailPanel/MrDetailPanel.styles";

export interface SectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  loading?: boolean;
  hideCount?: boolean;
  children: ReactNode;
}

/** Collapsible meta section used inside the MR detail drawer (Reviewers, Files, Timeline). */
function Section({ title, count, defaultOpen = true, hideCount = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionBox>
      <SectionHead type="button" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <SectionTitle component="span" variant="caption">
          {title}
        </SectionTitle>
        {!hideCount && (
          <SectionCount component="span" variant="caption">
            {count}
          </SectionCount>
        )}
      </SectionHead>
      <Collapse in={open} timeout="auto">
        <SectionBody>{children}</SectionBody>
      </Collapse>
    </SectionBox>
  );
}

export default Section;
