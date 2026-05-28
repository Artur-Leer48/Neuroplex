"use client";

import { AppHeader } from "@/app/app-header";

const DECKS = [
  { name: "Neuroanatomie", due: 18, newCards: 7, tone: "border-sky-200 bg-sky-50" },
  { name: "Mathe Beweise", due: 9, newCards: 3, tone: "border-emerald-200 bg-emerald-50" },
  { name: "Latein Vokabeln", due: 31, newCards: 12, tone: "border-amber-200 bg-amber-50" },
];

const QUEUE = [
  "Basalganglien Schleifen",
  "LTP vs. LTD",
  "Bayes Regel",
  "Cicero Formen",
];

export default function KartenwerkPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="mx-auto w-full max-w-6xl">
        <AppHeader title="Kartenwerk" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Decks
              </p>
              <div className="mt-4 space-y-3">
                {DECKS.map((deck) => (
                  <div
                    key={deck.name}
                    className={`rounded-md border p-3 ${deck.tone}`}
                  >
                    <p className="text-sm font-semibold text-zinc-950">
                      {deck.name}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600">
                      <span>{deck.due} faellig</span>
                      <span>{deck.newCards} neu</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Naechste Karten
              </p>
              <div className="mt-4 space-y-2">
                {QUEUE.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-xs font-semibold text-zinc-500">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-zinc-800">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Review
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    Neuroanatomie
                  </h2>
                </div>
                <div className="flex gap-2">
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                    18 faellig
                  </span>
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                    7 neu
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Vorderseite
                </p>
                <p className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
                  Welche Rolle spielt der Hippocampus beim Lernen?
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Rueckseite Vorschau
                </p>
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  Der Hippocampus bindet neue deklarative Erinnerungen und hilft
                  beim Konsolidieren, bevor Inhalte langfristig verteilt
                  gespeichert werden.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["Nochmal", "Schwer", "Gut", "Leicht"].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className="h-10 rounded-md border border-zinc-300 bg-white text-sm font-semibold text-zinc-900"
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Karten-Editor
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Frage
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      Begriff, Formel oder offene Frage
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Antwort
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      Kompakte Antwort mit optionalen Beispielen
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Tagesprofil
                </p>
                <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-zinc-200">
                  <Metric label="Neu" value="22" />
                  <Metric label="Review" value="58" />
                  <Metric label="Quote" value="84%" />
                </div>
                <div className="mt-4 h-24 rounded-md border border-zinc-200 bg-zinc-50" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-zinc-200 p-3 last:border-r-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
