# ============================================
# Build stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json e lockfile para cache de dependências
COPY backend/package.json backend/package-lock.json* ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar source e prisma
COPY backend/tsconfig.json ./
COPY backend/prisma/ ./prisma/
COPY backend/src/ ./src/

# Gerar Prisma Client e compilar TypeScript
RUN npx prisma generate && npx tsc

# ============================================
# Production stage
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Copiar package.json para instalar apenas dependências de produção
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# Copiar Prisma schema + migrations (necessário para prisma migrate deploy)
COPY backend/prisma/ ./prisma/

# Gerar Prisma Client na imagem final
RUN npx prisma generate

# Copiar código compilado do builder
COPY --from=builder /app/dist ./dist

# Porta exposta
EXPOSE 3333

# Rodar migrations e iniciar o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
