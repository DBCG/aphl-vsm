# Setup

Install VS Code Plugin by following instructions in [this video](https://www.youtube.com/watch?v=Xz6lhEzgI5I&t=1s)

## Running Tests Locally

Preconditions: 
1. The vsm app should be running and on production mode with `npm run build && npm run start`

2. You must enter your working VSAC credentials on the Settings page

To run the tests, you may then use:
`npx playwright test --headed`

This will allow you to view the test in a chromium window

## Generating Tests Locally

1. Ensure your VSM app is running and VSAC credentials are added.

2. Open the test generator via the following command, pointing to wherever your test endpoint is:
`npx playwright codegen http://localhost:3000/programs`

