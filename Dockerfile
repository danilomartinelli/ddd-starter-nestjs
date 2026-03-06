# Stage 1: Prune monorepo for api scope
FROM node:22-alpine AS pruner
RUN corepack enable pnpm
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @repo/api --docker

# Stage 2: Install dependencies
FROM node:22-alpine AS installer
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 3: Build
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@repo/api...

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/apps/api/dist ./apps/api/dist
COPY --from=installer /app/packages/ ./packages/

USER nestjs
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/src/main.js"]
