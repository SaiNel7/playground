"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createDocument, getAllDocuments } from "@/lib/store/documentStore";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [hasDocuments, setHasDocuments] = useState(false);

  useEffect(() => {
    const docs = getAllDocuments();
    setHasDocuments(docs.length > 0);

    // If there are documents, redirect to the most recent one
    if (docs.length > 0) {
      router.push(`/doc/${docs[0].id}`);
    }
  }, [router]);

  const handleNewDocument = () => {
    const newDoc = createDocument({ title: "Untitled" });
    router.push(`/doc/${newDoc.id}`);
  };

  // Don't render if we're redirecting
  if (hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          P
        </div>

        <h1 className="text-3xl font-semibold text-foreground mb-3">
          Welcome to Playground
        </h1>
        <p className="text-muted-foreground mb-8">
          A simple workspace for your documents. Create your first document to
          get started.
        </p>

        {/* Quick action */}
        <button
          onClick={handleNewDocument}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Create your first document
        </button>
      </div>

      {/* Empty state illustration */}
      <div className="mt-16 text-muted-foreground/30">
        <svg
          className="w-48 h-48"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="40"
            y="30"
            width="120"
            height="140"
            rx="8"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="60"
            y1="60"
            x2="140"
            y2="60"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="60"
            y1="80"
            x2="120"
            y2="80"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.5"
          />
          <line
            x1="60"
            y1="100"
            x2="130"
            y2="100"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.5"
          />
          <line
            x1="60"
            y1="120"
            x2="100"
            y2="120"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}
