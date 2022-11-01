const fs = require('fs')

const name = 'ersdv2bundle1-1-bundle.json';
const fileToEdit = JSON.parse(fs.readFileSync(name).toString());

// mutate bundle type to transaction
fileToEdit.type = 'transaction'

// mutate each entry in the collection bundle to have a request k/v
// which is required for a transaction bundle
// I'm not sure if resource.id is always the right URL
fileToEdit.entry.forEach(function (fhirResource) {

  fhirResource.request = {
    method: 'PUT',
    url: `${fhirResource.resource.resourceType}/${fhirResource.resource.id}`
  }
});

fs.writeFileSync(name, JSON.stringify(fileToEdit));