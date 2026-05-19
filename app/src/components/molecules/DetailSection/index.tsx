import { type ReactNode, useState } from "react";

import { Icon } from "@/components/atoms/Icon";

interface DetailSectionProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function DetailSection({ title, meta, children, defaultOpen = true }: DetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`a-dp-section ${open ? "open" : "closed"}`}>
      <div className="a-dp-sec-hdr-row">
        <button
          type="button"
          className="a-dp-sec-hdr"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open ? "true" : "false"}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
        >
          <span className="a-dp-sec-chev">
            <Icon name={open ? "chevDown" : "chev"} size={11} />
          </span>
          <span className="a-dp-sec-title">{title}</span>
        </button>
        {meta != null && <span className="a-dp-sec-meta">{meta}</span>}
      </div>
      {open && <div className="a-dp-sec-body">{children}</div>}
    </div>
  );
}
