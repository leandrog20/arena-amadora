# ============================================
# Build stage
# ============================================
FROM node:20-alpine AS builder

# OpenSSL necessário para Prisma no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar package.json, lockfile E prisma schema antes do npm ci
# (postinstall roda prisma generate, que precisa do schema)
COPY backend/package.json backend/package-lock.json* ./
COPY backend/prisma/ ./prisma/

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar source
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/

# Compilar TypeScript (prisma generate já rodou no postinstall)
RUN npx tsc

# ============================================
# Production stage
# ============================================
FROM node:20-alpine AS production

# OpenSSL necessário para Prisma no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Copiar package.json e prisma schema antes do npm ci
COPY backend/package.json backend/package-lock.json* ./
COPY backend/prisma/ ./prisma/

# Instalar dependências de produção (postinstall roda prisma generate, schema já está lá)
RUN npm ci --omit=dev

# Copiar código compilado do builder
COPY --from=builder /app/dist ./dist

# Porta exposta
EXPOSE 3333

# Rodar migrations e iniciar o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
