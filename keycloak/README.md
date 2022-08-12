# APHL-keycloak
> Keycloak for APHL

- For information on how to connect Keycloak to the VSM application, please see the top-level README

Please note this is using [jboss/keycloak from Docker hub](https://hub.docker.com/r/jboss/keycloak/).  Go [there](https://hub.docker.com/r/jboss/keycloak/) for more information if needed.

# Run With Postgres as Database
```
docker-compose up
```

# Configure Keycloak with realms, initial users, etc
```
./configure
```

Either way, provide `configure` with keycloak credentials and the desired setup options, and it should perform the following:
- Authenticates against the keycloak service located at the base URL you provide
- Creates a realm of your choosing, which defaults to `aphl`
- Creates the `admin` realm role on the newly created realm
- Creates a sample non-admin user for dev
- Creates a client of your choosing, which defaults to `aphl-app`
- Fetches the authentication certificate for the newly created realm and writes it to standard out
