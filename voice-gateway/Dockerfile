# ARES VOICE GATEWAY - Production Container (ECS Fargate / App Runner)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY voice-gateway/ ./voice-gateway/
RUN npm run build:gateway

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV VOICE_GATEWAY_PORT=8088
ENV AWS_BEDROCK_REGION=us-west-2
ENV BEDROCK_MODEL_ID=amazon.nova-2-5-sonic

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist-gateway ./dist-gateway

EXPOSE 8088

# Ejecuta el servidor compilado en ESM nativo con Node.js puro sin dependencias de desarrollo
CMD ["node", "dist-gateway/server.js"]
