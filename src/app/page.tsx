import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            P
          </div>
          <span className="font-semibold text-foreground">Playground</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-3.5 py-1.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-6 border border-border rounded-full px-3 py-1 inline-block">
            .edu accounts only
          </p>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-foreground mb-6">
            Write with an AI that{" "}
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              stays in the margins
            </span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl mx-auto">
            Playground is a writing editor with a persistent AI collaborator.
            Highlight any text, ask for a critique or rewrite — the AI responds
            as a comment, never overwriting your work.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors text-sm"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors text-sm text-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full text-left">
          <div className="p-5 rounded-xl border border-border bg-muted/30">
            <div className="text-base font-medium text-foreground mb-2">Critique mode</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Highlight a passage and ask AI to push back. Get honest, scoped
              feedback — not generic suggestions.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-border bg-muted/30">
            <div className="text-base font-medium text-foreground mb-2">Synthesize mode</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask AI to propose a rewrite. Review the diff, then accept or
              reject — you stay in control.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-border bg-muted/30">
            <div className="text-base font-medium text-foreground mb-2">Project Brain</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Give AI your goals, constraints, and key decisions. It remembers
              context across every session.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Playground</span>
        <span>Built for writers who think</span>
      </footer>
    </div>
  );
}
