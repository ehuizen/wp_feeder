# Builds WPFeeder into one image: the Express server plus the built React app it serves.

FROM node:24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
# Runtime needs only the server's production dependencies; the client is already static files.
RUN npm ci --omit=dev --workspace server && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY server/migrations server/migrations
COPY --from=build /app/client/dist client/dist

USER node
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Same as `npm start`: apply pending migrations, then hand the process over to the server.
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/index.js"]
