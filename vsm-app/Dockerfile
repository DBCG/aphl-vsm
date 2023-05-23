FROM node:18-alpine as Builder

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# defaults for authoring content from app, may be configurable later
ENV NEXT_PUBLIC_DEFAULT_PUBLISHER="CSTE Steward"
ENV NEXT_PUBLIC_DEFAULT_AUTHOR="CSTE Author"
ENV NEXT_PUBLIC_DEFAULT_PUBLISHING_URL=http://ersd.aimsplatform.org/fhir
ENV NEXT_PUBLIC_VSAC_BASE_URL=https://cts.nlm.nih.gov/fhir
ENV NEXT_PUBLIC_ONTOSERVER_R4_BASE_URL=https://r4.ontoserver.csiro.au/fhir

RUN apk update
RUN apk add --no-cache curl
RUN apk add --no-cache bash

RUN mkdir -p /opt/app

WORKDIR /opt/app
COPY ./package.json /opt/app
COPY ./package-lock.json /opt/app

RUN npm ci

COPY ./ /opt/app
RUN npm run build

FROM node:18-alpine
WORKDIR /opt/app


COPY --from=Builder /opt/app/node_modules /opt/app/node_modules
COPY --from=Builder /opt/app/.next /opt/app/.next
COPY --from=Builder /opt/app/public /opt/app/public
COPY --from=Builder /opt/app/package.json /opt/app/package.json
COPY --from=Builder /opt/app/package-lock.json /opt/app/package-lock.json

CMD ["npm", "start"]