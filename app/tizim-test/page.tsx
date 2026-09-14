"use client";

/**
 * Tizim diagnostikasi — `/tizim-test`.
 *
 * Reyestrdagi (`config/services.mjs`) HAR BIR xizmatni o'zi tekshiradi:
 * yangi xizmat qo'shsangiz uning testi ham avtomatik paydo bo'ladi.
 * Oxirida xarita alohida sinaladi (WebGL + haqiqiy MapLibre).
 *
 * DIQQAT: brauzerdagi tekshiruv `curl`dan muhimroq — faqat brauzer CORS
 * qoidasini majburlaydi va faqat brauzerda WebGL bor.
 */
import { useEffect, useRef, useState } from "react";
import { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SERVICES } from "../../config/services.mjs";
import { isDirect, serviceBase, type ServiceId } from "@/config/endpoints";
import { MAP_STYLE_URL, TILES_BASE } from "@/config/mapConfig";

interface Row {
  id: string;
  label: string;
  mode: string;
  url: string;
  ok: boolean | null;
  info: string;
}

export default function TizimTest() {
  const [rows, setRows] = useState<Row[]>([]);
  const [webgl, setWebgl] = useState<{ ok: boolean; info: string } | null>(null);
  const [mapMsg, setMapMsg] = useState("kutilmoqda...");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1) WebGL — xarita chizilishining SHARTI
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
      const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
      setWebgl({
        ok: !!gl,
        info: gl
          ? String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "mavjud")
          : "YO'Q — brauzerda apparat tezlashtirishni yoqing",
      });
    } catch (e) {
      setWebgl({ ok: false, info: String(e) });
    }

    // 2) Reyestrdagi har bir xizmat — avtomatik
    const ids = (Object.keys(SERVICES) as ServiceId[]).filter((id) => SERVICES[id].probe);
    const init: Row[] = ids.map((id) => ({
      id,
      label: SERVICES[id].label,
      mode: isDirect(id) ? "TO'G'RIDAN" : "proxy",
      url: `${serviceBase(id)}${SERVICES[id].probe}`,
      ok: null,
      info: "tekshirilmoqda...",
    }));
    setRows(init);

    init.forEach(async (row, i) => {
      const t0 = performance.now();
      try {
        const r = await fetch(row.url, { cache: "no-store" });
        const ms = Math.round(performance.now() - t0);
        const expect: number[] = SERVICES[row.id as ServiceId].expect ?? [200];
        const ok = expect.includes(r.status);
        setRows((prev) => {
          const next = [...prev];
          next[i] = { ...row, ok, info: `${r.status} · ${ms} ms${ok ? "" : ` (kutilgan: ${expect.join("/")})`}` };
          return next;
        });
      } catch (e) {
        const ms = Math.round(performance.now() - t0);
        setRows((prev) => {
          const next = [...prev];
          next[i] = { ...row, ok: false, info: `${String(e)} · ${ms} ms — tarmoq yoki CORS` };
          return next;
        });
      }
    });

    // 3) Haqiqiy xarita
    if (!boxRef.current) return;
    try {
      const map = new MlMap({
        container: boxRef.current,
        style: MAP_STYLE_URL,
        center: [69.2797, 41.3111],
        zoom: 11,
        attributionControl: false,
        // Proxy rejimida uslub ichidagi mutlaq manzillarni `/tiles` ga buradi
        transformRequest: (url: string) => ({
          url: url.replace(/^https?:\/\/[^/]+(?=\/(?:styles|data|fonts|sprites?)\/)/, TILES_BASE),
        }),
      });
      // Diagnostika uchun xaritani global qilamiz (faqat shu sahifada)
      (window as unknown as { __map?: unknown }).__map = map;
      map.on("load", () => setMapMsg("✅ chizildi"));
      map.on("styledata", () => console.log("[map] styledata, isStyleLoaded =", map.isStyleLoaded()));
      map.on("sourcedata", (e: unknown) => {
        const s = e as { sourceId?: string; isSourceLoaded?: boolean };
        console.log("[map] sourcedata", s.sourceId, "loaded =", s.isSourceLoaded);
      });
      map.on("error", (e: unknown) => {
        const err = e as { error?: { message?: string }; sourceId?: string };
        const m = err?.error?.message ?? String(e);
        console.error("[map] ERROR", err?.sourceId ?? "", m);
        setMapMsg((p) => (p.startsWith("✅") ? p : `❌ ${m}`));
      });
      return () => map.remove();
    } catch (e) {
      setMapMsg(`❌ ${e}`);
    }
  }, []);

  const cell: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #1e293b", fontSize: 12.5 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", color: "#e2e8f0", background: "#070c1a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Tizim diagnostikasi</h1>
      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 18 }}>
        Xizmatlar <code>config/services.mjs</code> reyestridan olinadi. Qizil qator — muammo shu yerda.
      </p>

      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 980 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>
            <th style={cell}>Xizmat</th>
            <th style={cell}>Rejim</th>
            <th style={cell}>Manzil</th>
            <th style={cell}>Natija</th>
          </tr>
        </thead>
        <tbody>
          {webgl && (
            <tr>
              <td style={cell}>WebGL</td>
              <td style={cell}>brauzer</td>
              <td style={{ ...cell, fontFamily: "monospace", fontSize: 11 }}>{webgl.info}</td>
              <td style={{ ...cell, color: webgl.ok ? "#4ade80" : "#fca5a5" }}>{webgl.ok ? "✅" : "❌ xarita chizilmaydi"}</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={cell}>
                <b>{r.id}</b>
                <div style={{ color: "#64748b", fontSize: 11 }}>{r.label}</div>
              </td>
              <td style={{ ...cell, color: r.mode === "proxy" ? "#4ade80" : "#fbbf24" }}>{r.mode}</td>
              <td style={{ ...cell, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{r.url}</td>
              <td style={{ ...cell, color: r.ok === null ? "#94a3b8" : r.ok ? "#4ade80" : "#fca5a5" }}>
                {r.ok === null ? "…" : r.ok ? "✅ " : "❌ "}
                {r.info}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ margin: "20px 0 8px", fontSize: 14, fontWeight: 700 }}>Xarita: {mapMsg}</p>
      <div ref={boxRef} style={{ width: "100%", maxWidth: 980, height: 380, border: "1px solid #334155", borderRadius: 12, background: "#04070f" }} />
    </div>
  );
}
