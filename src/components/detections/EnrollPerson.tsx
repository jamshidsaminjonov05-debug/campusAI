"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useModalHistory } from "@/hooks/useModalHistory";
import { UnsavedExitDialog } from "@/components/common/UnsavedExitDialog";
import { createPortal } from "react-dom";
import { CheckCircle, UserPlus, X } from "@phosphor-icons/react";
import { enrollFaceFromEvent, type NvrEvent, type NvrPersonRole } from "@/lib/nvrApi";

/**
 * Kuzatuv posti yuz bazasi FAQAT ikkita toifani biladi — `NvrPersonRole`
 * da uchinchisi yo'q. "Xodim" bu yerda ATAYLAB yo'q (pastdagi izohga
 * qarang), boshqa hech narsa o'ylab topilmagan.
 */
const ROLES: { id: NvrPersonRole; label: string }[] = [
  { id: "student", label: "O'quvchi" },
  { id: "teacher", label: "O'qituvchi" },
];

/**
 * Hodisa oynasidan TO'G'RIDAN-TO'G'RI shaxs qo'shish.
 *
 * NEGA shu yerda: operator notanish yuzni ko'radi va uni kim ekanini
 * BILADI. Ilgari u "Shaxslar" bo'limiga o'tib, qaytadan qidirib, rasmni
 * qo'lda yuklashi kerak edi — amalda hech kim qilmasdi va baza to'lmasdi.
 * Endi ism yoziladi, toifa tanlanadi, tamom.
 *
 * ⚠️ **YO'L BUTUNLAY ALMASHTIRILDI (2026-09-06).** Ilgari bu yerdan
 * BIZNING backendga (`POST /persons`, rasm bilan) yozilardi va izoh
 * "kuzatuv posti yuz bazasiga qo'shish uchun ochiq API yo'q" derdi. Ikkalasi ham
 * ESKIRGAN edi:
 *   1. `FRONTEND.md` yangilanib `POST /api/v1/events/{id}/enroll` ni
 *      ochiq qildi — hodisaning O'Z KADRIDAN, to'g'ridan-to'g'ri kuzatuv
 *      posti yuz bazasiga qo'shadi (aynan shu yerga kerak bo'lgan narsa);
 *   2. bizning backend esa `onnxruntime` o'rnatilmagani sabab rasm
 *      biriktirilgan `POST /persons` so'rovini **doim** `400` bilan rad
 *      etadi (`lib/api.ts` `FACE_ENGINE_HINT` izohiga qarang) — ya'ni
 *      "Bazaga qo'shish" tugmasi ULARDAN BIRINI HAM ISHLATMASDI:
 *      operator ismni saqlardi-yu, kamera hech qachon o'sha odamni
 *      TANIMASDI (rasm bosqichi jim yiqilardi).
 *
 * Endi to'g'ridan-to'g'ri kuzatuv postiga yoziladi — u ishlaydi (bu
 * sessiyada 397 ta odam, shundan 228 tasi real tanilgan holda
 * tekshirilgan) va qo'shimcha ustunlik: hodisaning rasmi QAYTA
 * YUKLANMAYDI (server o'zining kadridan oladi), ustiga shu `face_id`ning
 * BARCHA eski kadrlari HAM darhol yangi ism bilan ko'rinadi.
 *
 * ⚠️ Shu sabab "Xodim" toifasi bu formadan OLIB TASHLANDI: kuzatuv posti
 * uni bilmaydi (`NvrPersonRole` — faqat `student`/`teacher`). Xodimni
 * kameraga tanitish kerak bo'lsa — "Yuz bazasi" bo'limidan qo'lda
 * qo'shiladi (`FaceDatabasePage.tsx`, u ham xuddi shu chegara bilan).
 */
export function EnrollPerson({ ev }: { ev: NvrEvent }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("");
  const [first, setFirst] = useState("");
  const [role, setRole] = useState<NvrPersonRole>("student");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [doneName, setDoneName] = useState("");
  /** Tasdiq so'ralmoqda — formaga tegilgan, lekin saqlanmagan. */
  const [confirmExit, setConfirmExit] = useState(false);

  const enroll = useMutation({
    mutationFn: () =>
      enrollFaceFromEvent(ev.id, {
        first_name: first.trim(),
        last_name: last.trim() || undefined,
        role,
        note: note.trim() || undefined,
        // `index:0` — KESILGAN yuz; kuzatuv posti aynan shuni kutadi
        index: 0,
      }),
    onSuccess: (p) => {
      setDone(true);
      setDoneName(p.full_name);
      setOpen(false);
      /* Bu odam endi "Hammasi", "Yuz bazasi" va shu yuzning o'z tarixi
         (`getFace`) ro'yxatlarida darhol ko'rinishi kerak — eski kesh
         hali "Begona shaxs" deb ko'rsatib turmasin. */
      qc.invalidateQueries({ queryKey: ["nvr-people"] });
      qc.invalidateQueries({ queryKey: ["nvr-faces"] });
      qc.invalidateQueries({ queryKey: ["nvr-face"] });
      qc.invalidateQueries({ queryKey: ["nvr-face-by-name"] });
    },
  });

  /** Formada saqlanmagan matn bormi. */
  const dirty = !done && (last.trim() !== "" || first.trim() !== "" || note.trim() !== "");

  /**
   * Yopish so'rovi — X, fon va brauzerning "◀ orqaga" tugmasi shu yerga
   * tushadi. `false` qaytsa oyna yopilmaydi va tarix yozuvi qayta
   * qo'yiladi (`lib/modalHistory.ts`).
   */
  const requestClose = useCallback((): boolean => {
    if (!dirty) {
      setOpen(false);
      return true;
    }
    setConfirmExit(true);
    return false;
  }, [dirty]);

  /* ◀ "orqaga" — oyna ochiq bo'lgandagina ro'yxatga olinadi. */
  useModalHistory(requestClose, open);

  /**
   * Server xatosini odam o'qiydigan matnga aylantirish — `FRONTEND.md`
   * 10-bo'limda hujjatlangan uch kod. Boshqa xato bo'lsa xom matn
   * ko'rsatiladi (o'ylab topilmaydi).
   */
  function errorText(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    if (/^409/.test(msg) || /allaqachon/.test(msg)) return "Shu ism-familiyali odam bazada allaqachon bor";
    if (/^400/.test(msg)) return "Ism to'ldirilmagan yoki bu hodisada rasm yo'q";
    if (/^502/.test(msg)) return "Kuzatuv posti rasmni qabul qilmadi — birozdan keyin qayta urinib ko'ring";
    return msg;
  }

  function submit() {
    if (!first.trim()) return;
    enroll.mutate();
  }

  if (done) {
    return (
      <section className="nvr-dsr-block">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-300">
          <CheckCircle size={14} weight="fill" />
          {doneName} bazaga qo&apos;shildi — kamera bundan keyin ism bilan taniydi
        </p>
      </section>
    );
  }

  /* ── FORMA — MODAL ──
     ⚠️ Ilgari forma tafsilot oynasining TOR chap ustunida ochilardi
     (~300 px): maydonlar siqilib, "Familiya/Ism" bir qatorga zo'rg'a
     sig'ardi va tugmalar pastga tushib ketardi. Endi u alohida modal —
     `z-[95]`, ya'ni hodisa dossiyesidan (`z-[60]`) YUQORIDA. */
  const form = (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-md"
      onClick={() => requestClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Yuz bazasiga qo'shish"
        onClick={(e) => e.stopPropagation()}
        className="geo-strip-card w-[min(460px,94vw)] rounded-2xl p-4"
      >
        <header className="mb-3 flex items-center gap-2">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-emerald-400/15 text-emerald-300">
            <UserPlus size={16} weight="bold" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] font-bold text-slate-100">Yuz bazasiga qo&apos;shish</b>
            <i className="block text-[10px] not-italic text-slate-500">
              Hodisaning shu kadri yuz surati bo&apos;lib saqlanadi
            </i>
          </span>
          <button type="button" onClick={() => requestClose()} className="text-slate-400 hover:text-white" aria-label="Yopish">
            <X size={16} />
          </button>
        </header>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={last}
              onChange={(e) => setLast(e.target.value)}
              placeholder="Familiya"
              className="hik-input h-9 px-2.5 text-[12px] text-slate-100 outline-none placeholder:text-slate-600"
            />
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="Ism *"
              className="hik-input h-9 px-2.5 text-[12px] text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Toifa — FAQAT o'quvchi / o'qituvchi (yuqoridagi izohga qarang) */}
          <div className="flex gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`flex-1 rounded-lg border py-2 text-[11.5px] font-semibold transition-colors ${
                  role === r.id
                    ? "border-ice/60 bg-ice/[0.14] text-white"
                    : "border-white/[0.1] bg-white/[0.03] text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={role === "student" ? "Sinf / guruh" : "Bo'lim / lavozim"}
            className="hik-input h-9 w-full px-2.5 text-[12px] text-slate-100 outline-none placeholder:text-slate-600"
          />

          {enroll.isError && (
            <p className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">
              {errorText(enroll.error)}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={enroll.isPending || !first.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-400/15 py-2 text-[12px] font-semibold text-emerald-300 transition-colors hover:border-emerald-400/80 disabled:opacity-50"
            >
              {enroll.isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300/40 border-t-emerald-300" />
              )}
              Saqlash
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[12px] text-slate-400 hover:text-white"
            >
              Bekor
            </button>
          </div>
        </div>
      </div>

      {/* Saqlanmagan ma'lumot — X, fon va "◀ orqaga" shu yerga tushadi */}
      {confirmExit && (
        <UnsavedExitDialog
          onStay={() => setConfirmExit(false)}
          onLeave={() => {
            setConfirmExit(false);
            setOpen(false);
          }}
        />
      )}
    </div>
  );

  return (
    <section className="nvr-dsr-block">
      <p className="nvr-dsr-h">Yuz bazasi</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 py-2 text-[11.5px] font-semibold text-emerald-300 transition-colors hover:border-emerald-400/80 hover:text-emerald-200"
      >
        <UserPlus size={14} weight="bold" />
        Bazaga qo&apos;shish
      </button>

      {/* ⚠️ PORTAL: dossiye oynasida `backdrop-filter` bor va u
          `position:fixed` uchun yangi containing block yaratadi —
          portalsiz modal o'sha oyna ichida qirqilib qolardi. */}
      {open && typeof document !== "undefined" && createPortal(form, document.body)}
    </section>
  );
}
