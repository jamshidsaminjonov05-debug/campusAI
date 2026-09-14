"use client";

/**
 * Root layout'da (eng yuqori daraja) xato bo'lganda ishlaydigan zaxira ekran.
 * Bu yerda o'z <html>/<body> berish shart — layout ishlamay qolgan bo'lishi mumkin.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ margin: 0, background: "#090B14", color: "#E2E8F0", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Tizim xatosi</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 20px", lineHeight: 1.6 }}>
              Kutilmagan xatolik yuz berdi. Sahifani qayta yuklang.
            </p>
            <button
              onClick={reset}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                color: "#0A0F1E",
                background: "linear-gradient(180deg, #C4D7FF, #7FA6F2)",
                cursor: "pointer",
              }}
            >
              Qayta yuklash
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
