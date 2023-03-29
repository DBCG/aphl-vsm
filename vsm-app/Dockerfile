FROM node:18-alpine

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_VSAC_BASE_URL=https://cts.nlm.nih.gov/fhir
ENV NEXT_PUBLIC_ONTOSERVER_R4_BASE_URL=https://r4.ontoserver.csiro.au/fhir
# defaults for authoring content from app, may be configurable later
ENV NEXT_PUBLIC_DEFAULT_PUBLISHER=CSTE Steward
ENV NEXT_PUBLIC_DEFAULT_AUTHOR=CSTE Author
ENV NEXT_PUBLIC_DEFAULT_PUBLISHING_URL=http://ersd.aimsplatform.org/fhir

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

CMD ["npm", "start"]