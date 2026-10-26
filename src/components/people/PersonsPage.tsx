"use client";

import { useState } from "react";
import { GraduationCap, IdentificationCard, Users, UsersFour } from "@phosphor-icons/react";
import type { PersonType } from "@/lib/api";
import { FaceDatabasePage } from "./FaceDatabasePage";
import { TabPill } from "@/components/common/panels";

type Tab = "all" | PersonType;

const TABS: { id: Tab; label: string; Icon: typeof Users }[] = [
  { id: "all", label: "Hammasi", Icon: Users },
  { id: "teacher", label: "O'qituvchilar", Icon: GraduationCap },
  { id: "staff", label: "Xodimlar", Icon: IdentificationCard },
  { id: "student", label: "O'quvchilar", Icon: UsersFour },
];

/**
 * "Shaxslar" — to'rtta kesim, Statistikadagi kabi yuqori pilyula qatori.
 *
 * 🔴 **2026-10-23, foydalanuvchi so'rovi: "Hammasi"ning ichidagini olib
 * tashla, "Yuz bazasi"ning hamma ma'lumotini "Hammasi"ga o'tkaz.**
 * "Hammasi" endi kuzatuv postining O'Z yuz bazasi (`FaceDatabasePage` —
 * toifa kartochkalari → sinflar → ro'yxat, qo'shish/o'chirish); alohida
 * "Yuz bazasi" tabi YO'Q. Kamerada ko'ringan har bir odam ro'yxati
 * (`AllPeoplePage`, `GET /faces`) olib tashlandi va fayl o'chirildi —
 * o'sha odamlar "Aniqlanganlar" bo'limida va dossiyedan ochiladigan
 * shaxs tarixida ko'rinaveradi. Quyidagi tarixiy izoh eski tuzilmani
 * tasvirlaydi.
 *
 * ⚠️ **"Bugungi davomat" va "Haftalik davomat dinamikasi" OLIB TASHLANDI**
 * (2026-09-06). `AttendanceBoard` Boshqaruv panelida ALLAQACHON bor
 * (bosilganda Statistikaning shu toifa tabiga o'tkazadi —
 * `setPersonTypeTarget`), shuning uchun bu yerda takrorlanishi ortiqcha
 * edi va foydalanuvchi so'ragan yangi ikkita bo'lim uchun joy bo'shatildi:
 * "Hamma odamlar" (`AllPeoplePage`) va "Yuz bazasi" (`FaceDatabasePage`):
 * ilgari bu ikkalasi UMUMAN yo'q edi, faqat ro'yxatga OLINGAN shaxslar
 * ko'rinardi — kamerada ko'ringan 3000+ NOTANISH odam va yuz bazasini
 * boshqarish (qo'shish/o'chirish) hech qayerda ko'rsatilmasdi.
 *
 * - **Hammasi** — kamerada ko'ringan HAR BIR odam, `AllPeoplePage`
 *   (`GET /api/v1/faces` — bazaga qo'shilgani ham, notanishi ham).
 * - **Yuz bazasi** — kuzatuv postining o'z ro'yxati (`FaceDatabasePage`,
 *   `/nvr/people`): qo'shish/o'chirish, "tayyor"/"rasm yo'q" belgisi.
 *
 * ⚠️ **"O'qituvchilar" / "O'quvchilar" ENDI HAM `FaceDatabasePage`GA
 * QARAYDI** (2026-09-04, "bitta APIga o'tamiz" so'ralgach) —
 * `<FaceDatabasePage lockedRole="teacher"|"student">`, rol pilyulasi
 * yashiringan holda. Ilgari ikkalasi ham backend `Person`ga (`PeoplePage`)
 * qarardi va ro'yxat DEYARLI BO'SH edi (o'lchandi: 2 o'quvchi,
 * 1 o'qituvchi) — foydalanuvchi "umuman chiqmayabdi" deb xabar berdi.
 * Kuzatuv postining o'z bazasida esa HAQIQIY odamlar bor.
 *
 * ⚠️ **"Xodimlar" ESKI YO'LDA QOLDI** (`PeoplePage`, backend `Person`) —
 * kuzatuv posti `NvrPersonRole`da FAQAT `student`/`teacher` bor, kuzatuv posti
 * "xodim" tushunchasini UMUMAN bilmaydi (`EnrollPerson.tsx`dan ham shu
 * sabab "Xodim" olib tashlangan edi). Bitta API'ga TO'LIQ o'tish bu
 * toifa uchun texnik jihatdan MUMKIN EMAS — o'ylab topilmadi.
 *
 * `activePage` id'si — hali ham **"Shaxslar"** (o'zgartirilmagan, butun
 * kodga bog'langan: ovozli buyruq, global qidiruv, dashboard kartochkasi).
 */
/* 2026-10-26 — standart tab "Hammasi" (foydalanuvchi: "shaxslarni bosganda
   default hammasida turishi kerak"). Ilgari "O'quvchilar" edi. */
export function PersonsPage({ initialTab = "all" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex-none">
        <div className="hik-glass-blue inline-flex flex-wrap gap-1 rounded-xl p-1">
          {TABS.map((x) => (
            <TabPill
              key={x.id}
              group="persons-tab"
              active={tab === x.id}
              onClick={() => setTab(x.id)}
              Icon={x.Icon}
              /* Xodimlar — manba yo'q, bosilmaydi (2026-10-26) */
              disabled={x.id === "staff"}
              title={x.id === "staff" ? "Xodimlar bo'yicha ma'lumot hozircha yo'q" : undefined}
            >
              {x.label}
            </TabPill>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {/* 🔴 "Xodimlar" ham `FaceDatabasePage` (2026-10-23, foydalanuvchi:
            "xodimlar bossam xatolik chiqyapti"). Ilgari u eski backend
            (`PeoplePage` → `/persons`, `/attendance`, `/cameras`) ga qarardi;
            `NEXT_PUBLIC_API_ORIGIN` endi kuzatuv posti serveriga qaragani
            uchun o'sha yo'llar BOSHQA shaklda javob beradi (`/cameras` →
            `{cameras:[…]}`, `/attendance` → kunlik obyekt, `/persons` → HTML)
            va bo'lim `.map` da yiqilardi. Kuzatuv postida «xodim» toifasi
            yo'q — halol bo'sh holat ko'rsatiladi, hech narsa o'ylab topilmaydi. */}
        {tab === "all" ? <FaceDatabasePage /> : <FaceDatabasePage key={tab} lockedRole={tab} />}
      </div>
    </div>
  );
}
