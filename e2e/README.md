E2E Tests

## Getting Started

**All applications must all be running before starting the cypress tests**
**Run steps below to setup app**

- In app root directory, run:
```docker-compose up```
**wait a few minutes before running next command**

- In a separate window run the following command to configure keycloak
```./keycloak/configure```

- Finally, start the application in also in a separate window
```cd vsm-app && npm install && npm run dev```

### Running cypress
Install cypress in this repo

`npm install`

then cypress can be opened within the `e2e` dirctory with this command `npx cypress open`


**Warning** - The tests will delete all data in the database before running, if you are working on something be sure to back it up first.

Currently all tests are written only in the file `spec.cy.js` file.