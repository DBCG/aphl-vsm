FROM node:26.5.0-alpine AS builder

# Placeholder for build, will be replaced by actual runtime env vars
ENV FHIR_CDR_URL="http://localhost:8082"
# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# defaults for authoring content from app, may be configurable later
ENV NEXT_PUBLIC_DEFAULT_PUBLISHER="CSTE Steward"
ENV NEXT_PUBLIC_DEFAULT_AUTHOR="CSTE Author"
ENV NEXT_PUBLIC_DEFAULT_PUBLISHING_URL=http://ersd.aimsplatform.org/fhir
ENV NEXT_PUBLIC_VSAC_BASE_URL=https://cts.nlm.nih.gov/fhir
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}

RUN apk update
RUN apk add --no-cache curl
RUN apk add --no-cache bash

RUN mkdir -p /opt/app

WORKDIR /opt/app
COPY ./package.json /opt/app
COPY ./package-lock.json /opt/app

RUN npm install -g npm@12.0.1 && npm install

COPY ./ /opt/app
RUN npm run build
RUN npm prune --omit=dev

FROM node:26.5.0-slim

RUN apt-get update && \
	apt-get dist-upgrade -y && \
	apt-get install -y --no-install-recommends curl && \
	apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@12.0.1

WORKDIR /opt/app

COPY --from=builder /opt/app/node_modules /opt/app/node_modules
COPY --from=builder /opt/app/.next /opt/app/.next
COPY --from=builder /opt/app/public /opt/app/public
COPY --from=builder /opt/app/package.json /opt/app/package.json
COPY --from=builder /opt/app/package-lock.json /opt/app/package-lock.json
COPY --from=builder /opt/app/next.config.js /opt/app/next.config.js

CMD ["npm", "start"]