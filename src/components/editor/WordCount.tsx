"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";

interface WordCountProps {
  editor: Editor | null;
}

export function WordCount({ editor }: WordCountProps) {
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showWords, setShowWords] = useState(true);

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

  const handleToggle = () => {
    setShowWords(!showWords);
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-4 left-4 bg-background/80 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
      title={showWords ? "Click to show character count" : "Click to show word count"}
    >
      {showWords ? (
        <span>
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
      ) : (
        <span>
          {charCount} {charCount === 1 ? "char" : "chars"}
        </span>
      )}
    </button>
  );
}
