import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ReactRenderer } from "@tiptap/react";
import { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { SlashCommands, filterCommands } from "./slashCommands";
import { CommandMenu, CommandMenuRef, CommandItem } from "./CommandMenu";
import { CommentMark } from "./commentMark";

// Create suggestion render function for React
function createSuggestionRender() {
  let component: ReactRenderer<CommandMenuRef> | null = null;
  let popup: HTMLDivElement | null = null;

  return {
    onStart: (props: SuggestionProps) => {
      const items = filterCommands(props.query);

      component = new ReactRenderer(CommandMenu, {
        props: {
          items,
          command: (item: CommandItem) => {
            props.command(item);
          },
        },
        editor: props.editor,
      });

      popup = document.createElement("div");
      popup.style.position = "absolute";
      popup.style.zIndex = "50";
      document.body.appendChild(popup);
      popup.appendChild(component.element);

      // Position popup
      const { clientRect } = props;
      if (clientRect) {
        const rect = clientRect();
        if (rect) {
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 8}px`;
        }
      }
    },

    onUpdate: (props: SuggestionProps) => {
      const items = filterCommands(props.query);

      component?.updateProps({
        items,
        command: (item: CommandItem) => {
          props.command(item);
        },
      });

      // Update position
      if (popup) {
        const { clientRect } = props;
        if (clientRect) {
          const rect = clientRect();
          if (rect) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 8}px`;
          }
        }
      }
    },

    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") {
        popup?.remove();
        component?.destroy();
        popup = null;
        component = null;
        return true;
      }

      return component?.ref?.onKeyDown(props) ?? false;
    },

    onExit: () => {
      popup?.remove();
      component?.destroy();
      popup = null;
      component = null;
    },
  };
}

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
    codeBlock: {
      HTMLAttributes: {
        class: "editor-code-block",
      },
    },
    blockquote: {
      HTMLAttributes: {
        class: "editor-blockquote",
      },
    },
  }),
  Placeholder.configure({
    placeholder: "Type '/' for commands, or just start writing...",
    emptyEditorClass: "is-editor-empty",
  }),
  SlashCommands.configure({
    suggestion: {
      items: ({ query }: { query: string }) => filterCommands(query),
      render: createSuggestionRender,
    },
  }),
  CommentMark,
];
