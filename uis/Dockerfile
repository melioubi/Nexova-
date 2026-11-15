FROM node:24-alpine AS development
WORKDIR /app
COPY website/package*.json ./website/
RUN npm --prefix website ci
COPY backoffice/package*.json ./backoffice/
RUN npm --prefix backoffice ci
COPY website ./website
COPY backoffice ./backoffice
COPY start.sh /usr/local/bin/start-uis.sh
RUN mkdir -p website/.next backoffice/.next && chown -R node:node /app
USER node
EXPOSE 3000 3001
CMD ["/bin/sh", "/usr/local/bin/start-uis.sh"]

FROM development AS production
ARG BACKEND_API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_INVENTORY_API_URL
ARG NEXT_PUBLIC_BACKOFFICE_URL
ENV BACKEND_API_URL=$BACKEND_API_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_INVENTORY_API_URL=$NEXT_PUBLIC_INVENTORY_API_URL \
    NEXT_PUBLIC_BACKOFFICE_URL=$NEXT_PUBLIC_BACKOFFICE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm --prefix website run build && npm --prefix backoffice run build