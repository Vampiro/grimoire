import { useMemo, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { TablePlugin as LexicalTablePlugin } from "@lexical/react/LexicalTablePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import type { EditorState, SerializedEditorState } from "lexical";
import { $getRoot } from "lexical";

import { editorTheme } from "@/components/editor/themes/editor-theme";
import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { nodes } from "@/components/blocks/editor-00/nodes";
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin";
import { FontFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/font-format-toolbar-plugin";
import { LinkToolbarPlugin } from "@/components/editor/plugins/toolbar/link-toolbar-plugin";
import { LinkPlugin } from "@/components/editor/plugins/link-plugin";
import { AutoLinkPlugin } from "@/components/editor/plugins/auto-link-plugin";
import { FloatingLinkEditorPlugin } from "@/components/editor/plugins/floating-link-editor-plugin";
import { ListMaxIndentLevelPlugin } from "@/components/editor/plugins/list-max-indent-level-plugin";
import { TABLE } from "@/components/editor/transformers/markdown-table-transformer";
import { Separator } from "@/components/ui/separator";

const NOTE_TRANSFORMERS = [TABLE, ...TRANSFORMERS];

type SpellNoteEditorProps = {
  initialState?: SerializedEditorState;
  onSerializedChange?: (state: SerializedEditorState) => void;
  onTextChange?: (text: string) => void;
  autoFocus?: boolean;
};

export function SpellNoteEditor({
  initialState,
  onSerializedChange,
  onTextChange,
  autoFocus = false,
}: SpellNoteEditorProps) {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const initialConfig = useMemo(
    () => ({
      namespace: "SpellNoteEditor",
      theme: editorTheme,
      nodes,
      onError: (error: Error) => {
        console.error(error);
      },
      ...(initialState ? { editorState: JSON.stringify(initialState) } : {}),
    }),
    [initialState],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="overflow-hidden rounded-lg border bg-background">
        <ToolbarPlugin>
          {() => (
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <FontFormatToolbarPlugin />
              <Separator orientation="vertical" className="!h-7" />
              <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
            </div>
          )}
        </ToolbarPlugin>

        <RichTextPlugin
          contentEditable={
            <div
              className="relative"
              ref={(elem) => setFloatingAnchorElem(elem)}
            >
              <ContentEditable
                placeholder="Write your spell note..."
                className="min-h-40 px-4 py-3 focus:outline-none"
                placeholderClassName="px-4 py-3 text-muted-foreground"
              />
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>

      <HistoryPlugin />
      {autoFocus && <AutoFocusPlugin />}
      <ListPlugin />
      <CheckListPlugin />
      <LinkPlugin />
      <AutoLinkPlugin />
      <LexicalTablePlugin />
      <ListMaxIndentLevelPlugin maxDepth={7} />
      <MarkdownShortcutPlugin transformers={NOTE_TRANSFORMERS} />
      <FloatingLinkEditorPlugin
        anchorElem={floatingAnchorElem}
        isLinkEditMode={isLinkEditMode}
        setIsLinkEditMode={setIsLinkEditMode}
      />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState: EditorState) => {
          onSerializedChange?.(editorState.toJSON());
          const textContent = editorState.read(() =>
            $getRoot().getTextContent(),
          );
          onTextChange?.(textContent);
        }}
      />
    </LexicalComposer>
  );
}
