# APHL-keycloak

> Keycloak for APHL

- For information on how to connect Keycloak to the VSM application, please see the [top-level README](../README.md)

## Run With Postgres as Database

```sh
docker-compose up
```

## Configure Keycloak with realms, initial users, etc

```sh
./configure
```

Provide `configure` with Keycloak credentials and desired setup options. It performs the following:

- Authenticates against the Keycloak service at the base URL you provide
- Creates a realm (default: `aphl`)
- Creates a client (default: `aphl_app`)
- Creates 5 client roles: `admin`, `editor`, `reviewer`, `implementer`, `publisher`
- Creates one test user per role (all with password `password`):
  - `johndoe` → `admin`
  - `gary` → `editor`
  - `joybennet` → `reviewer`
  - `ann` → `implementer`
  - `rachel` → `publisher`
- Adds a protocol mapper so client roles appear in the JWT token
- Fetches the realm's RS256 authentication certificate and writes it to stdout
