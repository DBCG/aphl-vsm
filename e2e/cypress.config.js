const { defineConfig } = require("cypress");

module.exports = defineConfig({
  defaultCommandTimeout: 30000,
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        deleteFolder (folderName) {
          console.log('deleting folder %s', folderName)
    
          return new Promise((resolve, reject) => {
            rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
              if (err) {
                console.error(err)
    
                return reject(err)
              }
    
              resolve(null)
            })
          })
        },
      })
    },
  },
});
