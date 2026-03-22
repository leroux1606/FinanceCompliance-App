# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Data directory for SQLite (must be mounted as a volume in production)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
