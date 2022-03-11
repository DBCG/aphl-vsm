# aphl-vsm
ValueSet Manager Application

## Running the app in development

1. Run the HAPI FHIR Server as detatched process
```fhir-server/bin/run-fhir-server.sh```
The `baseURL` for the server in development is: `http://localhost:8080/fhir`

2. Load data to FHIR server
```fhir-server/bin/post-demo-data.sh```

3. If you don't have it already, copy .env.local.example to .env.local within `/vsm-app`
```cp .env.local.example .env.local```

4. Run the Next.js app
In ./vsm-app, run:
```npm install```
```npm run dev```

To see the app, navigate to http://localhost:3000/
