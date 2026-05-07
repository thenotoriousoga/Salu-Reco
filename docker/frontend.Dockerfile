# syntax=docker/dockerfile:1.7

# ---- Stage: 開発用 ----
FROM node:24-bookworm-slim AS dev

RUN corepack enable \
    && corepack prepare pnpm@latest --activate

# pnpm ストアをプロジェクト外の固定パスに置く(Docker ボリュームとして永続化する前提)。
# node_modules と同じファイルシステムならハードリンクが効くのでディスク効率が高く、
# プロジェクト配下に .pnpm-store が作られる問題も防げる。
ENV PNPM_STORE_DIR=/pnpm-store
RUN mkdir -p /pnpm-store

WORKDIR /app
EXPOSE 3000


# ---- Stage: 本番ビルド ----
FROM node:24-bookworm-slim AS builder

RUN corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /build
COPY package.json ./
RUN pnpm install

COPY . .
RUN pnpm build


# ---- Stage: 本番実行 ----
FROM node:24-bookworm-slim AS runtime

WORKDIR /app
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
CMD ["node", "server.js"]
