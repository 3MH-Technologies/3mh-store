# ====== Stage 1: build the Vite application ======
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# VITE_* variables may be passed as build args for local builds.
# On Hugging Face Spaces the keys are injected at RUNTIME through the
# environment: scripts/server.mjs exposes them as /config.json.
ARG VITE_GITHUB_OWNER
ARG VITE_GITHUB_REPO
ARG VITE_GITHUB_BRANCH
ARG VITE_GITHUB_TOKEN
ARG VITE_ADMIN_PIN
ARG VITE_ASSET_SECRET
ENV VITE_GITHUB_OWNER=$VITE_GITHUB_OWNER \
    VITE_GITHUB_REPO=$VITE_GITHUB_REPO \
    VITE_GITHUB_BRANCH=$VITE_GITHUB_BRANCH \
    VITE_GITHUB_TOKEN=$VITE_GITHUB_TOKEN \
    VITE_ADMIN_PIN=$VITE_ADMIN_PIN \
    VITE_ASSET_SECRET=$VITE_ASSET_SECRET

RUN npm run build

# ====== Stage 2: runtime server (Hugging Face Spaces, port 7860) ======
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY scripts/server.mjs ./server.mjs
COPY scripts/write-config.cjs ./scripts/write-config.cjs
EXPOSE 7860
CMD ["node", "server.mjs"]