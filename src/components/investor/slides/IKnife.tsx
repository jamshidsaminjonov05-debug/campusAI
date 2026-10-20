"use client";

import { useCopy } from "../copy";
import type { SlideProps } from "@/components/deck/types";
import ThreatCase from "./ThreatCase";

/** 8 — QUROL. Real kadr: `/video/investor/qurol.mp4` */
export default function IKnife(p: SlideProps) {
  return (
    <ThreatCase
      {...p}
      c={useCopy().knife}
      video={{ src: "/video/investor/qurol.mp4", poster: "/video/investor/qurol-poster.jpg" }}
      tone="#FF5C5C"
    />
  );
}
