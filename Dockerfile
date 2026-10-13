FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 BETTER_AUTH_SECRET=build-time-placeholder-secret-0123456789
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
# migrate, seed only if the DB is empty, then serve
CMD ["sh", "-c", "npx drizzle-kit migrate && [ \"$(npx tsx scripts/user-count.ts)\" = 0 ] && npx tsx src/db/seed.ts; exec npm start"]
