import { useEffect } from "react";

import { useTranslation } from "react-i18next";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Code2,
  Italic,
  Link2Off,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Type,
} from "lucide-react";
import { Markdown } from "tiptap-markdown";

import {
  Divider,
  Root,
  Surface,
  ToolButton,
  Toolbar,
} from "@/components/atoms/text/RichTextEditor/RichTextEditor.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { sanitizeHtml } from "@/lib/utils/security.utils";

/** Narrow accessor for `tiptap-markdown`'s storage augmentation. The library
 *  patches `editor.storage` with a `.markdown.getMarkdown()` method but its
 *  d.ts doesn't declare the augmentation in a way TipTap's `Storage` type
 *  picks up, so we read it through this cast in one place rather than
 *  sprinkling `as` casts at every call site. */
function getMarkdown(editor: Editor): string {
  const storage = editor.storage as { markdown?: { getMarkdown(): string } };
  return storage.markdown?.getMarkdown() ?? "";
}

export interface RichTextEditorProps {
  /** Markdown source. The editor parses this into rich-text on mount and
   *  emits markdown back via `onChange`. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Forwarded to the inner editor element for E2E targeting. */
  "data-testid"?: string;
}

/** WYSIWYG markdown editor built on TipTap. Provider PR/MR descriptions live
 *  as markdown on the wire, so the editor reads markdown in and emits
 *  markdown out via the `tiptap-markdown` extension. Pasted HTML is run
 *  through DOMPurify before TipTap parses it (defense-in-depth) so even an
 *  attacker pasting `<script>` into the field can never reach the DOM. */
function RichTextEditor({
  value,
  onChange,
  placeholder,
  "data-testid": testId,
}: RichTextEditorProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);

  const editor = useEditor({
    extensions: [
      // Drop StarterKit's bundled Link extension so our custom Link below
      // (with stricter URL validation) doesn't collide with it.
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Restrict to safe schemes — TipTap defaults to allowing `mailto`,
        // `http(s)`, `ftp`, `tel`. Explicit block of `javascript:` is enforced
        // by the schema's URL validator below.
        protocols: ["http", "https", "mailto", "tel"],
        validate: (href) => /^(https?:|mailto:|tel:|#|\/)/i.test(href),
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Markdown.configure({
        html: false, // TipTap's `html: false` disables raw-HTML rendering
        tightLists: true,
        linkify: true,
        breaks: false,
      }),
    ],
    content: value,
    editorProps: {
      // Sanitise paste in case someone copies marketing HTML with inline
      // scripts/styles. TipTap's own schema would already drop unknown
      // tags but we run DOMPurify first for defense-in-depth.
      transformPastedHTML: (html) => sanitizeHtml(html),
      attributes: {
        ...(testId ? { "data-testid": testId } : {}),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(getMarkdown(ed));
    },
  });

  // Re-seed the editor when `value` changes from the *outside* (parent
  // reset, cancel + re-open). Skipping the update when the editor's own
  // snapshot already equals `value` avoids fighting the user mid-edit, and
  // guarding on `editor.isDestroyed` keeps us out of TipTap's teardown
  // window where ProseMirror's view is null and `commands` would throw.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (getMarkdown(editor) !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <Root>
      <Toolbar role="toolbar" aria-label="Formatting">
        <ToolBtn editor={editor} mark="bold" label={t("editor.bold")} icon={<Bold size={13} />} />
        <ToolBtn
          editor={editor}
          mark="italic"
          label={t("editor.italic")}
          icon={<Italic size={13} />}
        />
        <ToolBtn
          editor={editor}
          mark="strike"
          label={t("editor.strike")}
          icon={<Strikethrough size={13} />}
        />
        <Divider />
        <ToolButton
          type="button"
          aria-label={t("editor.heading")}
          title={t("editor.heading")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Type size={13} />
        </ToolButton>
        <ToolBtn
          editor={editor}
          mark="bulletList"
          label={t("editor.bullet_list")}
          icon={<List size={13} />}
        />
        <ToolBtn
          editor={editor}
          mark="orderedList"
          label={t("editor.ordered_list")}
          icon={<ListOrdered size={13} />}
        />
        <Divider />
        <ToolBtn editor={editor} mark="code" label={t("editor.code")} icon={<Code size={13} />} />
        <ToolBtn
          editor={editor}
          mark="codeBlock"
          label={t("editor.code_block")}
          icon={<Code2 size={13} />}
        />
        <ToolBtn
          editor={editor}
          mark="blockquote"
          label={t("editor.quote")}
          icon={<Quote size={13} />}
        />
        <Divider />
        <ToolButton
          type="button"
          aria-label={t("editor.link")}
          title={t("editor.link")}
          active={editor.isActive("link")}
          onClick={() => {
            const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
            // Prompt is the simplest UX for "enter a URL" — for a richer
            // popover we'd lift this into a controlled dialog. Until then,
            // the URL still goes through TipTap's `validate` regex above,
            // so `javascript:` etc. can't slip in.
            const url = window.prompt(t("editor.link_prompt"), previous);
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          <LinkIcon size={13} />
        </ToolButton>
        {editor.isActive("link") && (
          <ToolButton
            type="button"
            aria-label={t("editor.unlink")}
            title={t("editor.unlink")}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Link2Off size={13} />
          </ToolButton>
        )}
      </Toolbar>
      <Surface>
        <EditorContent editor={editor} />
      </Surface>
    </Root>
  );
}

interface ToolBtnProps {
  editor: Editor;
  mark:
    | "bold"
    | "italic"
    | "strike"
    | "code"
    | "codeBlock"
    | "blockquote"
    | "bulletList"
    | "orderedList";
  label: string;
  icon: React.ReactNode;
}

/** Thin shim around `ToolButton` that wires a TipTap mark/node toggle command
 *  and active-state look-up. Keeps the toolbar JSX one line per control. */
function ToolBtn({ editor, mark, label, icon }: ToolBtnProps) {
  const toggle = () => {
    const chain = editor.chain().focus();
    switch (mark) {
      case "bold":
        return chain.toggleBold().run();
      case "italic":
        return chain.toggleItalic().run();
      case "strike":
        return chain.toggleStrike().run();
      case "code":
        return chain.toggleCode().run();
      case "codeBlock":
        return chain.toggleCodeBlock().run();
      case "blockquote":
        return chain.toggleBlockquote().run();
      case "bulletList":
        return chain.toggleBulletList().run();
      case "orderedList":
        return chain.toggleOrderedList().run();
    }
  };
  return (
    <ToolButton
      type="button"
      aria-label={label}
      title={label}
      active={editor.isActive(mark)}
      onClick={toggle}
    >
      {icon}
    </ToolButton>
  );
}

export default RichTextEditor;
