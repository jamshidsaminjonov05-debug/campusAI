# syntax=docker/dockerfile:1

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  Campus AI — production image (2026-09-06 da qo'shildi)              ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# ⚠️ **BU FAYL DOCKER'DA HALI SINALMAGAN** — shu muhitda Docker yo'q.
# Ishlatishdan oldin `docker build` bilan bir marta qo'lda tekshiring.
#
# ── OFFLINE QOIDASI (CLAUDE.md) ──────────────────────────────────────
# Manzillar bu faylga YOZILMAYDI — hammasi build/run paytida beriladi.
#
# ── BUILD PAYTIDA KERAK (server ENV, `config/services.mjs`) ──────────
# `next build` `next.config.mjs` orqali `validateServices()` ni chaqiradi
# — bu manzillarning HAQIQIY ishlashi SHART emas (faqat sintaksis
# tekshiriladi), lekin BOR bo'lishi shart, aks holda build yiqiladi:
#
#   docker build \
#     --build-arg BACKEND_ORIGIN=http://<backend-ip>:7005 \
#     --build-arg TILES_ORIGIN=http://<tiles-ip>:8080 \
#     --build-arg NVR_ORIGIN=http://<nvr-ip>:7007 \
#     --build-arg NVR_API_KEY=<haqiqiy-kalit> \
#     -t campus-ai .
#
# `NEXT_PUBLIC_*` (`NEXT_PUBLIC_API_ORIGIN`/`NEXT_PUBLIC_TILES_ORIGIN`)
# ATAYLAB BUILD ARG SIFATIDA HAM BOR — bo'sh qoldirilsa (TAVSIYA)
# proxy rejimi ishlaydi; to'ldirilsa klient bundle'ga QOTIRILADI
# (CLAUDE.md: o'zgartirsangiz QAYTA build kerak).
#
# ── ISHGA TUSHIRISHDA KERAK (runtime ENV — build ARG bilan BIR XIL,
#    QAYTA berilishi shart, konteyner ular bilan ko'tariladi) ─────────
#
#   docker run -p 3080:3080 \
#     -e BACKEND_ORIGIN=http://<backend-ip>:7005 \
#     -e TILES_ORIGIN=http://<tiles-ip>:8080 \
#     -e NVR_ORIGIN=http://<nvr-ip>:7007 \
#     -e NVR_API_KEY=<haqiqiy-kalit> \
#     campus-ai

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ARG BACKEND_ORIGIN
ARG TILES_ORIGIN
ARG NVR_ORIGIN
ARG NVR_API_KEY
ARG NEXT_PUBLIC_API_ORIGIN=""
ARG NEXT_PUBLIC_TILES_ORIGIN=""
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN \
    TILES_ORIGIN=$TILES_ORIGIN \
    NVR_ORIGIN=$NVR_ORIGIN \
    NVR_API_KEY=$NVR_API_KEY \
    NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN \
    NEXT_PUBLIC_TILES_ORIGIN=$NEXT_PUBLIC_TILES_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3080

# Root'da ishlatilmaydi — konteyner buzilsa ham host tizimga ta'siri kam
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/config ./config

USER nextjs
EXPOSE 3080

# `HEALTHCHECK` — `/healthz` (`app/healthz/route.ts`), login talab qilmaydi
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
