export const metadata = {
  title: "About · Speed Reader",
  description: "About the Speed Reader project"
};

export default function AboutPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto grid w-full max-w-4xl gap-10">
        <header className="grid gap-4">
          <p className="text-xs uppercase tracking-[0.32em] text-muted">About</p>
          <h1 className="font-display text-4xl leading-tight text-ink md:text-6xl">
            Speed Reader
          </h1>
          <p className="max-w-2xl text-base text-muted">
            A focused reading tool built to help you stay in rhythm. Upload text
            or PDFs, paste content, or fetch a URL, then tune the speed and let
            the words flow.
          </p>
        </header>

        <section className="grid gap-6 rounded-2xl border border-line bg-panel p-8 shadow-halo">
          <div className="grid gap-3">
            <h2 className="font-display text-2xl text-ink">Why it exists</h2>
            <p className="text-sm leading-7 text-muted">
              Speed Reader uses RSVP (rapid serial visual presentation) with an
              adjustable pace to reduce scanning and keep your focus anchored.
              It highlights the optimal recognition point in each word, helping
              your eyes lock on without drifting.
            </p>
          </div>
          <div className="grid gap-3">
            <h2 className="font-display text-2xl text-ink">Features</h2>
            <ul className="grid gap-2 text-sm text-muted">
              <li>Upload .txt, .md, and .pdf files.</li>
              <li>Paste text or fetch articles by URL.</li>
              <li>Control speed, restart, reset, and theme.</li>
              <li>View the full source text at any time.</li>
            </ul>
          </div>
          <div className="grid gap-3">
            <h2 className="font-display text-2xl text-ink">Built with</h2>
            <p className="text-sm leading-7 text-muted">
              Next.js for the app framework, Tailwind CSS for styling, and PDF.js
              for extracting text from PDFs.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
