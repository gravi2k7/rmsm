"use client";

/** Catches errors in the root layout itself — must render its own <html>/<body>. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ padding: 32, textAlign: "center" }}>
          <h2>A critical error occurred</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
