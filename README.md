# aphl-vsm
ValueSet Manager Application

## Running the app in development

1. Make sure that Docker desktop is running.

2. Run the HAPI FHIR Server as detatched process
```bin/run-fhir-server.sh```
The `baseURL` for the server in development is: `http://localhost:8080/fhir`

3. Load data to FHIR server
```bin/post-demo-data.sh```

4. If you don't have it already, copy .env.local.example to .env.local within `/vsm-app`
```cp vsm-app/.env.local.example vsm-app/.env.local```

- keep in mind, the VSAC api requires a username and key. You must sign up with them to receive this.

5. Run the Next.js app
```cd vsm-app && npm install && npm run dev```

To see the app UI, navigate to http://localhost:3000/
