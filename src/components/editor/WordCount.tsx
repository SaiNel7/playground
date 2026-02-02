"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";

interface WordCountProps {
  editor: Editor | null;
}

export function WordCount({ editor }: WordCountProps) {
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateCounts = () => {
      const text = editor.getText();

      // Count characters (excluding whitespace)
      const chars = text.replace(/\s/g, "").length;

      // Count words (split by whitespace and filter empty strings)
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;

      setWordCount(text.trim().length === 0 ? 0 : words);
      setCharCount(chars);
    };

    // Update counts on mount
    updateCounts();

    // Update counts on editor changes
    editor.on("update", updateCounts);

    return () => {
      editor.off("update", updateCounts);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-3">
      <span>
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </span>
      <span className="text-border">|</span>
      <span>
        {charCount} {charCount === 1 ? "char" : "chars"}
      </span>
    </div>
  );
}
