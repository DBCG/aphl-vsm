# aphl-keycloak
> Keycloak for APHL

Please note this is using [jboss/keycloak from Docker hub](https://hub.docker.com/r/jboss/keycloak/).  Go [there](https://hub.docker.com/r/jboss/keycloak/) for more information if needed.

# Run With MySQL as Database
```bash
docker run -p 8081:8081 -e KEYCLOAK_USER=<KC_MASTER_USERNAME> -e KEYCLOAK_PASSWORD=<KC_MASTER_PASS> -e DB_VENDOR=mysql -e DB_ADDR=<DB_ADDR> -e DB_USER=<DB_USER> -e DB_PASSWORD=<DB_PASS> -t jboss/keycloak
```

# Configuration
Run the configure script provided in this repository. Please note it can be run from anywhere.  It does not need to be run from within the Keycloak container. 
```bash
# Run a Docker image that houses the configure script
# examples from ERSD project:
docker run -it registry.ruvos.com/ersd/ersd-keycloak

# Or clone and execute
git clone git@gitlab.ruvos.com:ersd/ersd-keycloak.git
./ersd-keycloak/configure
```

Either way, provide `configure` with keycloak credentials and the desired setup options, and it should perform the following:
- Authenticates against the keycloak service located at the base URL you provide
- Creates a realm of your choosing, which defaults to `aphl`
- Creates the `admin` realm role on the newly created realm
- Creates a client of your choosing, which defaults to `aphl-app`
- Fetches the authentication certificate for the newly created realm and writes it to standard out

All of these are requirements of the [ERSD Node application](https://gitlab.ruvos.com/ersd/ersd) and should be reflected in the configuration there as well.