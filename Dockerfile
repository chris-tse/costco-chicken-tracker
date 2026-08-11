FROM oven/bun:1.2.22-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . ./
RUN bun run build

FROM oven/bun:1.2.22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/container-start.sh ./scripts/container-start.sh
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs

RUN mv ./.output/server/node_modules ./node_modules \
  && chmod 555 ./scripts/container-start.sh

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e 'fetch("http://127.0.0.1:3000/health").then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))'

ENTRYPOINT ["./scripts/container-start.sh"]
CMD ["serve"]
