E2E Tests

## Getting Started

Install cypress in this repo

`npm install`

then cypress can be opened within the `e2e` dirctory with this command `npx cypress open`

**All applications must all be running before starting the cypress tests**

**Warning** - The tests will delete all data in the database before running, if you are working on something be sure to back it up first.

Currently all tests are written only in the file `spec.cy.js` file.