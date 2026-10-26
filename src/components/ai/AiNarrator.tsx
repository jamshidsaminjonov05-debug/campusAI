"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Clock,
  ShieldCheck,
  Siren,
  Sparkle,
  UserFocus,
  UsersThree,
  VideoCamera,
  WarningCircle,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { subscribeNvr, nvrTime, type NvrEvent } from "@/lib/nvr/nvrApi";
import { detectionLevel } from "@/lib/nvr/detectionLevel";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { uz } from "@/i18n/uz";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "AI TAHLILCHI" — MATNLI TAHLIL (2026-10-26)                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Pastki o'ngdagi "AI tahlilchi" tugmasi — bosilsa sahifaning O'Z sonlaridan
 * (`summary`) qisqa tahlil jumlalari oynada BIRIN-KETIN chiqadi; ochiq
 * turganda jonli oqim (`subscribeNvr("all")` — loyihadagi BITTA umumiy SSE)
 * xavfli/diqqat hodisani darhol, oddiy yuz oqimini har daqiqada bitta
 * jamlangan jumla bilan qo'shadi.
 *
 * 🔴 OVOZ OLIB TASHLANDI (o'sha kuni, foydalanuvchi: "ma'lumot faqat text
 * ko'rinishida chiqadi, ovoz holatini olib tashla, o'qishi mumkin xolos") —
 * TTS so'rovi, 🔈 tugmasi va "ovoz xizmati javob bermadi" qatori yo'q.
 */

export interface NarratorSummary {
  periodLabel: string;
  total: number;
  recognized: number | null;
  students: number | null;
  teachers: number | null;
  alarms: number;
  peakHour: number | null;
  peakCount: number;
  /** Server kategoriyasi (`face`/`gun`/`janjal`/`smoking`) va soni — nom o'zbek lug'atidan */
  byType: { id: string; count: number }[];
}

/** Ohang: `good` — yaxshi (yashil), `info` — oddiy (ko'k), `warn` — diqqat (sariq), `alarm` — xavfli (qizil). */
type Tone = "good" | "info" | "warn" | "alarm";
/** Jumla turi — ikonka shundan. */
type Kind = "records" | "people" | "peak" | "violations" | "calm" | "danger" | "event" | "digest";

interface Line {
  id: number;
  text: string;
  tone: Tone;
  kind: Kind;
  at: string;
}

type Draft = Pick<Line, "text" | "tone" | "kind">;

const KIND_ICON: Record<Kind, Icon> = {
  records: VideoCamera,
  people: UserFocus,
  peak: Clock,
  violations: WarningCircle,
  calm: ShieldCheck,
  danger: Siren,
  event: Bell,
  digest: UsersThree,
};

/* Rang — ohangdan (yorug' mavzuda `index.css` och matnni o'zi to'qlashtiradi) */
const TONE_STYLE: Record<Tone, { c: string; text: string }> = {
  good: { c: "#34D399", text: "text-emerald-100" },
  info: { c: "#60A5FA", text: "text-slate-200" },
  warn: { c: "#F59E0B", text: "text-amber-100" },
  alarm: { c: "#F43F5E", text: "text-rose-100" },
};

/** Raqamlar qalin — ko'z avval songa tushsin. */
function Emph({ text }: { text: string }) {
  const parts = text.split(/(\d[\d ]*(?:[.:]\d+)?%?)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} className="font-semibold text-white">
            {p}
          </b>
        ) : (
          p
        )
      )}
    </>
  );
}

const FACE_DIGEST_MS = 60_000;
/** Jumlalar orasidagi oraliq — o'qib ulgurish uchun, uzun jumlada biroz ko'proq. */
const lineDelay = (text: string) => Math.min(1600, 500 + text.length * 12);
const n = (v: number) => v.toLocaleString("uz-UZ").replace(/,/g, " ");

/** Sahifa sonlaridan tahlil jumlalari (o'zbekcha) — har biri o'z ohangi va ikonkasi bilan. */
function buildSummary(s: NarratorSummary): Draft[] {
  const out: Draft[] = [];
  out.push({ kind: "records", tone: "info", text: `${s.periodLabel} davomida kameralar ${n(s.total)} ta qayd yozdi.` });
  if (s.recognized != null)
    out.push({
      kind: "people",
      tone: "info",
      text:
        `Kamera ${n(s.recognized)} nafar odamni tanidi` +
        (s.students != null && s.teachers != null ? `: ${n(s.students)} o'quvchi va ${n(s.teachers)} o'qituvchi.` : "."),
    });
  if (s.peakHour != null && s.peakCount > 0)
    out.push({
      kind: "peak",
      tone: "info",
      text: `Eng gavjum vaqt soat ${String(s.peakHour).padStart(2, "0")}:00 da, ${n(s.peakCount)} ta qayd.`,
    });
  const names = uz.detect.category as Record<string, string>;
  const violations = s.byType.filter((t) => t.count > 0 && t.id !== "face");
  out.push(
    violations.length
      ? {
          kind: "violations",
          tone: "warn",
          text: `Aniqlangan holatlar: ${violations.map((v) => `${(names[v.id] ?? v.id).toLowerCase()} ${n(v.count)} ta`).join(", ")}.`,
        }
      : { kind: "calm", tone: "good", text: "Qoidabuzarlik aniqlanmadi." }
  );
  out.push(
    s.alarms > 0
      ? { kind: "danger", tone: "alarm", text: `Diqqat: ${n(s.alarms)} ta xavfli hodisa bor, ularni ko'rib chiqish kerak.` }
      : { kind: "calm", tone: "good", text: "Xavfli hodisa qayd etilmadi, vaziyat tinch." }
  );
  return out;
}

const CATEGORY_UZ: Record<string, string> = {
  janjal: "janjal",
  gun: "qurol",
  smoking: "chekish yoki telefon",
  face: "begona shaxs",
};

function eventSentence(ev: NvrEvent): string {
  const what = ev.category === "face" ? (ev.name ? `${ev.name} aniqlandi` : "begona shaxs aniqlandi") : `${CATEGORY_UZ[ev.category] ?? ev.label} aniqlandi`;
  return `Yangi hodisa: ${what}, ${cameraPlaceLabel(ev.channel, ev.camera)}, soat ${nvrTime(ev.time).slice(0, 5)}.`;
}

/**
 * "AI" — Inter shriftida bosh "I" kichik "l" bilan bir xil ko'rinib, "Al
 * tahlilchi" deb o'qilardi (UX tahlili, 2026-10-26). Shu ikki harf IBM Plex
 * Mono'da — u yerda "I" serifli, adashmaydi.
 */
function AiTitle({ text }: { text: string }) {
  if (!text.startsWith("AI")) return <>{text}</>;
  return (
    <>
      <span className="font-mono font-bold tracking-tight">AI</span>
      {text.slice(2)}
    </>
  );
}

export function AiNarrator({ summary, ready }: { summary: NarratorSummary; ready: boolean }) {
  const t = useT().aiNarrator;
  const [on, setOn] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const idRef = useRef(0);
  const queueRef = useRef<Line[]>([]);
  const timerRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Navbatdagi jumlani chiqaradi, keyingisini o'qish oralig'idan keyin. */
  const pump = useCallback(() => {
    if (timerRef.current != null) return;
    const next = queueRef.current.shift();
    if (!next) return;
    setLines((cur) => [...cur.slice(-60), next]);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      pump();
    }, lineDelay(next.text));
  }, []);

  const say = useCallback(
    (d: Draft) => {
      queueRef.current.push({ ...d, id: ++idRef.current, at: new Date().toTimeString().slice(0, 5) });
      pump();
    },
    [pump]
  );

  const reset = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    queueRef.current = [];
  }, []);

  /* Yangi jumla — pastga aylantirish */
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  /* Jonli oqim — faqat oyna ochiq bo'lganda */
  useEffect(() => {
    if (!on) return;
    let faces = 0;
    let known = 0;
    const timer = window.setInterval(() => {
      if (faces > 0)
        say({ kind: "digest", tone: "info", text: `Oxirgi daqiqada kameradan ${n(faces)} kishi o'tdi, ${n(known)} tasi tanildi.` });
      faces = 0;
      known = 0;
    }, FACE_DIGEST_MS);
    const off = subscribeNvr("all", (ev) => {
      const level = detectionLevel(ev);
      if (ev.category !== "face" || level !== "info") {
        say({ kind: level === "alarm" ? "danger" : "event", tone: level === "alarm" ? "alarm" : "warn", text: eventSentence(ev) });
      } else {
        faces += 1;
        if (ev.recognized) known += 1;
      }
    });
    return () => {
      window.clearInterval(timer);
      off();
    };
  }, [on, say]);

  useEffect(() => reset, [reset]);

  const start = () => {
    reset();
    setLines([]);
    setOn(true);
    for (const d of buildSummary(summary)) say(d);
  };
  const stop = () => {
    reset();
    setOn(false);
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {!on && (
        <button
          type="button"
          disabled={!ready}
          onClick={start}
          className="fixed bottom-5 right-[76px] z-40 flex h-12 items-center gap-2 rounded-full border border-cyan-300/40 bg-[#0B1220] px-4 text-[12.5px] font-semibold text-cyan-100 shadow-lg transition-colors hover:bg-cyan-500/15 disabled:opacity-50"
        >
          <Sparkle size={16} weight="fill" className="text-cyan-300" />
          <AiTitle text={t.title} />
        </button>
      )}

      <AnimatePresence>
        {on && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-5 right-[76px] z-40 flex h-[min(420px,60vh)] w-[min(380px,90vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl"
          >
            <header className="flex flex-none items-center gap-2 border-b border-white/[0.07] px-4 py-3">
              <Sparkle size={15} weight="fill" className="text-cyan-300" />
              <span className="text-[13px] font-semibold text-white"><AiTitle text={t.title} /></span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" title={t.live} />
              <button
                type="button"
                onClick={stop}
                title={t.stop}
                aria-label={t.stop}
                className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </header>

            <div ref={listRef} className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
              {lines.map((l) => {
                const st = TONE_STYLE[l.tone];
                const KindIcon = KIND_ICON[l.kind];
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ ["--c" as string]: st.c }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg"
                      style={{ background: `color-mix(in srgb, ${st.c} 16%, transparent)`, color: st.c }}
                    >
                      <KindIcon size={17} weight="duotone" />
                    </span>
                    <p className={`min-w-0 flex-1 text-[13px] leading-relaxed ${st.text}`}>
                      <Emph text={l.text} />
                      <span className="ml-1.5 font-mono text-[10px] text-slate-500">{l.at}</span>
                    </p>
                  </motion.div>
                );
              })}
            </div>
            <p className="flex-none border-t border-white/[0.07] px-4 py-2 text-[10.5px] text-slate-500">{t.waiting}</p>
          </motion.section>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
