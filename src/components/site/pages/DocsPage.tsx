"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Frown, ListTree, Meh, Search, Smile } from "lucide-react";
import { useT } from "@/i18n";
import { SiteShell } from "../Footer";
import { WRAP } from "../ui";

/*
 * /qollanma — GitBook uslubidagi foydalanuvchi qo'llanmasi.
 * Chapda bo'limlar, markazda maqola, o'ngda "Ushbu sahifada".
 * Joriy maqola URL hash'ida (`/qollanma#alerts`) — havola bilan ulashiladi.
 */

/* Guruh → maqola id'lari. Matni lug'atda (`landing.docs.pages[id]`) */
const DOC_GROUPS = [
  { key: "start", ids: ["welcome", "login", "requirements"] },
  { key: "panel", ids: ["dashboard", "alerts", "detections", "cameras", "stats"] },
  { key: "faq", ids: ["detectors", "privacy"] },
] as const;

type DocId = (typeof DOC_GROUPS)[number]["ids"][number];
type DocPageT = { title: string; lead: string; sections: readonly { h: string; body: string; items: readonly string[] }[] };

const ORDER: DocId[] = DOC_GROUPS.flatMap((g) => [...g.ids]);
const isDocId = (v: string): v is DocId => (ORDER as string[]).includes(v);

const VOTES = [Smile, Meh, Frown];

export function DocsPage() {
  const d = useT().landing.docs;
  const [id, setId] = useState<DocId>("welcome");
  const [q, setQ] = useState("");
  const [vote, setVote] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (isDocId(h)) setId(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => setVote(null), [id]);

  const page = (id: DocId) => d.pages[id] as DocPageT;
  const go = (next: DocId) => {
    setId(next);
    // history.state saqlanadi — Next router o'z ma'lumotini shu yerda ushlaydi
    window.history.replaceState(window.history.state, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const needle = q.trim().toLowerCase();
  const matches = (pid: DocId) => {
    if (!needle) return true;
    const p = page(pid);
    return [p.title, p.lead, ...p.sections.map((s) => s.h)].join(" ").toLowerCase().includes(needle);
  };
  const anyMatch = ORDER.some(matches);

  const cur = page(id);
  const idx = ORDER.indexOf(id);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  return (
    <SiteShell overDark={false} cta={false}>
      <div className="bg-transparent">
        <div className={`${WRAP} grid gap-10 pb-24 pt-[120px] lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_210px]`}>
          {/* ---- Chap: qidiruv + bo'limlar ---- */}
          <aside className="lg:sticky lg:top-[104px] lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
            <label className="flex items-center gap-2.5 rounded-xl border border-[var(--s-line-strong)] bg-[var(--s-card)] px-3.5 py-2.5 transition-colors focus-within:border-[#2584FF] focus-within:shadow-[0_0_0_4px_rgba(37,132,255,0.12)]">
              <Search size={16} className="text-[var(--s-text3)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={d.search}
                className="w-full bg-transparent text-[14.5px] text-[var(--s-text)] outline-none placeholder:text-[var(--s-text3)]"
              />
            </label>

            <nav className="mt-6 flex flex-col gap-6" aria-label={d.sections}>
              {DOC_GROUPS.map((g) => {
                const ids = g.ids.filter(matches);
                if (!ids.length) return null;
                return (
                  <div key={g.key}>
                    <p className="rounded-lg bg-[linear-gradient(90deg,rgba(37,132,255,0.08),transparent)] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--s-text)]">
                      {d.groups[g.key]}
                    </p>
                    <ul className="mt-2 flex flex-col">
                      {ids.map((pid) => {
                        const on = pid === id;
                        return (
                          <li key={pid}>
                            <a
                              href={`#${pid}`}
                              onClick={(e) => {
                                e.preventDefault();
                                go(pid);
                              }}
                              className={`relative block rounded-lg px-3 py-2 text-[15px] transition-colors duration-200 ${
                                on ? "font-medium text-[#2584FF]" : "text-[var(--s-text-soft)] hover:bg-[var(--s-hover)] hover:text-[var(--s-text)]"
                              }`}
                            >
                              {on && (
                                <motion.span
                                  layoutId="docs-active"
                                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[#2584FF]"
                                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                                />
                              )}
                              {page(pid).title}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {!anyMatch && <p className="px-3 text-[14px] text-[var(--s-text3)]">{d.noResults}</p>}
            </nav>
          </aside>

          {/* ---- Markaz: maqola ---- */}
          <main className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.article
                key={id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-[clamp(30px,3vw,44px)] font-bold tracking-[-0.03em] text-[var(--s-text)]">{cur.title}</h1>
                <p className="mt-3 text-[19px] text-[var(--s-text2)]">{cur.lead}</p>

                {cur.sections.map((s, i) => (
                  <section key={s.h} id={`doc-s${i}`} className="mt-12 scroll-mt-28">
                    <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--s-text)]">{s.h}</h2>
                    {s.body && <p className="mt-4 text-[17px] leading-[1.75] text-[var(--s-text-soft)]">{s.body}</p>}
                    {s.items.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-2.5">
                        {s.items.map((it) => (
                          <li key={it} className="flex gap-3 text-[17px] leading-[1.6] text-[var(--s-text-soft)]">
                            <span className="mt-[11px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--s-text3)]" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}

                <div className="mt-16 grid gap-4 sm:grid-cols-2">
                  {prev ? (
                    <button
                      type="button"
                      onClick={() => go(prev)}
                      className="group flex items-center gap-3 rounded-2xl border border-[var(--s-line)] bg-[var(--s-card)] px-5 py-4 text-left transition-all duration-300 hover:border-[#2584FF] hover:shadow-[0_12px_30px_-20px_rgba(37,132,255,0.6)]"
                    >
                      <ChevronLeft size={18} className="text-[var(--s-text3)] transition-transform group-hover:-translate-x-1 group-hover:text-[#2584FF]" />
                      <span>
                        <span className="block text-[12.5px] text-[var(--s-text3)]">{d.prev}</span>
                        <span className="block text-[16px] font-medium text-[var(--s-text)]">{page(prev).title}</span>
                      </span>
                    </button>
                  ) : (
                    <span />
                  )}
                  {next && (
                    <button
                      type="button"
                      onClick={() => go(next)}
                      className="group flex items-center justify-end gap-3 rounded-2xl border border-[var(--s-line)] bg-[var(--s-card)] px-5 py-4 text-right transition-all duration-300 hover:border-[#2584FF] hover:shadow-[0_12px_30px_-20px_rgba(37,132,255,0.6)]"
                    >
                      <span>
                        <span className="block text-[12.5px] text-[var(--s-text3)]">{d.next}</span>
                        <span className="block text-[16px] font-medium text-[var(--s-text)]">{page(next).title}</span>
                      </span>
                      <ChevronRight size={18} className="text-[var(--s-text3)] transition-transform group-hover:translate-x-1 group-hover:text-[#2584FF]" />
                    </button>
                  )}
                </div>
              </motion.article>
            </AnimatePresence>
          </main>

          {/* ---- O'ng: ushbu sahifada + baho ---- */}
          <aside className="hidden xl:sticky xl:top-[104px] xl:block xl:self-start">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--s-text-soft)]">
              <ListTree size={14} />
              {d.onThisPage}
            </p>
            <ul className="mt-4 flex flex-col gap-1 border-l border-[var(--s-line)]">
              {cur.sections.map((s, i) => (
                <li key={s.h}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`doc-s${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="-ml-px border-l border-transparent py-1.5 pl-4 text-left text-[14.5px] text-[var(--s-text-soft)] transition-colors hover:border-[#2584FF] hover:text-[#2584FF]"
                  >
                    {s.h}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-[var(--s-line)] pt-6">
              <p className="text-[14px] text-[var(--s-text-soft)]">{vote === null ? d.helpful : d.thanks}</p>
              <div className="mt-3 inline-flex gap-1 rounded-full border border-[var(--s-line-strong)] bg-[var(--s-card)] p-1">
                {VOTES.map((Icon, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setVote(i)}
                    aria-pressed={vote === i}
                    className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-200 hover:scale-110 ${
                      vote === i ? "bg-[#2584FF] text-[#FFFFFF]" : "text-[var(--s-text3)] hover:text-[#2584FF]"
                    }`}
                  >
                    <Icon size={17} />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
