import { useState } from "react";
import { photoUrl } from "@/lib/api";

/* Ilgari `people/PeoplePage.tsx` ichida edi — o'sha 1 100 qatorli sahifa
   2026-10-26 da o'chirildi (render qilinmasdi, eski 7005 backend `/persons`
   ga qarardi), undan faqat shu komponent ishlatilardi. */
export function Avatar({ name, photo, size = 34 }: { name: string; photo?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const url = photoUrl(photo);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="flex-none rounded-full object-cover ring-1 ring-ice/25"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="grid flex-none place-items-center rounded-full bg-ice/15 font-bold text-ice-soft ring-1 ring-ice/25"
    >
      {initials}
    </div>
  );
}
