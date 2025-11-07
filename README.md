# aphl-vsm
ValueSet Manager Application

## Running the app in development
- *Make sure that Docker desktop is running.*

### Start up services in Docker (HAPI FHIR JPA Server, Redis, Keycloak, Postgres)
- In root directory, run:
```docker-compose up```

### Seed sample data

- Load data to FHIR server (wait 30 sec/1min after you've run your `docker-compose up` before doing this for the server to be ready)
```bin/load-data.sh```

> IMPORTANT- notes about data:
> 
> The load-data program includes several conveniences that you will need to do manually if using Postman or cURL.
> It:
> - Loads many different static resources aside from demodata (SearchParameters, RCKMS Conditions, Endpoint resources, etc.)
> - Loads a special, manually-curated Parameters resource to the server, and inserts your ```FHIR_SERVER``` constant into the ```appAuthoritativeUrl``` before loading. This is necessary because:
> 1. The current eRSD has a known bug where it structures the ```compose.include``` items in the groupers incorrectly (fixed in that parameters resource).
> 2. The data *cannot currently be loaded via a plain POST to the server*. It needs to be ```POST``` to ```<FHIR server endpoint>/$eRSD-v2-import```, which adds necessary VSM-related metadata, such as profiles, usage contexts, etc. The ```load-data``` program does this
> 3. The ```appAuthoritativeUrl``` is your public fhir server URL on that environment. This is used in order to be able to generate the proper authoritativeSource extensions on resources that should be managed by VSM. Not having this will break the data.
>
> Remember that for Dev and QA deployments, you will need to load data with an authorization header. To do this via the ```load-data``` program, you can just set your AUTH_TOKEN const near the top of the file

### Run Keycloak to sign in to the app
- After you start up the dockerized services and load the data, wait a few minutes before running next steps
```./keycloak/configure```

- The configure file initializes some of the settings in Keycloak, adding a realm, admin role, etc.

- At this point, you should be able to run the app using the username johndoe and password password (if you didn't change the default values)

### Run the frontend application

##### Setup
> Keep in mind, to run the app, you will need a VSAC api username and key. You must sign up with them to receive this.

- If you don't have it already, copy .env.local.example to .env.local within `/vsm-app`
```cp vsm-app/.env.local.example vsm-app/.env.local```

- You must also run the following script to generate keys for the app BEFORE starting the application
```node generateKeyPair.js```

- Next run the following command to install the necessary dependencies for the Next.js app
```cd vsm-app && npm install```

- Finally to launch the the Next.js app run the following command:
```npm run dev```

To see the app UI, navigate to http://localhost:3000/

You will need to use the ```non_admin_username``` and ```non_admin_password``` that you defined in the ```./keycloak/configure``` file to log in.

### Clean up Docker Files in Development
- The Docker setup includes a Postgres volume that will persist even if you stop + kill containers.
- To clear *everything* out, run:
```bin/docker-cleanup```
- Note that this command will also delete anything related to your local CQF (HAPI) server for this project (and anything you have for other projects)

### Clear out HAPI FHIR JPA Server data only

- If you want to clear out the HAPI data only, run:
```./bin/clear-data.sh```

By default this will point to the local instance of the HAPI FHIR JPA server running at `http://localhost:8082/fhir`, but you can override this by passing in a different URL as the first argument.


## Using a Development Build of clinical-reasoning

### `clinical-reasoning` Steps

Use `./mvnw clean install` to generate and cache a local version of your `clinical-reasoning` build

### `hapi-fhir-jpa-server-starter` Steps

- Ensure that the pom.xml file has the right `clinical-reasoning` version variable:
```
		<clinical-reasoning.version>3.12.0-SNAPSHOT</clinical-reasoning.version>
```
or similar matching the version in your `clinical-reasoning` pom.xml file.
-  Use `./mvnw clean install` to generate and cache a local version of your `hapi-fhir-jpa-server-starter` build containing the `clinical-reasoning` dependency
-  Use `docker build -t hapi-fhir-docker-image-tag-whatever .` to generate a docker image of `hapi-fhir-jpa-server-starter` which you can use in the next part

### `aphl-vsm` Steps

- Update your `docker-compose` file as follows:
```
hapi-fhir-jpa-server-starter:
    image: hapi-fhir-docker-image-tag-whatever
```
- Run `docker compose up` to start up your dev instance which will use the development build of `clinical-reasoning`
