# ---- build stage ----
FROM node:20-slim AS builder
WORKDIR /app

# sir's review #2: the build needs devDependencies (tailwind, typescript),
# the runtime must not — the runner stage takes only the standalone output
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- run stage ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# run as non-root — node:20-slim ships the 'node' user
USER node

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "server.js"]
