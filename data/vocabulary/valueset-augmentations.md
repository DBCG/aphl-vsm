## Changes Made to VSM Leafs

### Overview
When it comes to medical terminology, definitions for exact concepts are versioned and published by working groups, and go through significant vetting processes. This means that the "Leaf" ValueSets that the VSM adds to programs are really just references to official ValueSets that are maintained by these terminology experts. The app's users cannot change those resources.

However, for the purpose of VSM users, it is necessary to allow associations between ValueSets and other concepts.
For example, it may be useful for VSM authors to "tag" ValueSets with extra information to help them categorize, connect, and filter concepts while building a Program.
Due to this need, the VSM App grabs a copy of each ValueSet when it is added to a program. The app will add some additional data to this copy in the form of:
- An extension to identify the "Authoritative Source" of a ValueSet (the terminology server it "lives" within. This happens automatically when a ValueSet is added in the VSM.)
- If a user wants to tag the Leaf ValueSet as being connected to a particular RCKMS Condition, this information is added as a usage context (in a ValueSet, useContext) item. Conditions may also be removed in the app.
- Add an extension to designate the "priority" of ValueSets (Emergent, Priority, or Routine)

### Why Authoritative Source?
Knowing the Authoritative Source allows us to update ValueSets when necessary and allow users to "pin" specific versions. If we did not know which server they came from, this would not be possible.

### Why Add Conditions?
Tagging ValueSets with condition codes acts as an extra piece of metadata that authors can use to sort and filter, reducing cognitive load and adding meaning.

### Why Priority?
Some health conditions are well-known and endemic. Others appear suddenly and require a rapid, flexible response. Adding a "priority" tag helps differentiate between these situations.
Priority is currently added at the Program Library level, and trickles down through a batch update to all of the associated Leaf ValueSets.

## Data Example

### Authoritative Source, Condition, and Priority in a ValueSet
```
{
  id: 'test1',
  resourceType: 'ValueSet',
  status: 'active',
  extension: [
    {
      url: 'https://hl7.org/fhir/extension-valueset-authoritativesource.html',
      valueUri: 'https://cts.nlm.nih.gov/fhir'
    }
  ],
  useContext: [
    {
      code: {
        system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
        code: "focus"
      },
      valueCodeableConcept: {
        coding: [{
          system: "http://snomed.info/sct", code: "240523007"
        }],
        text: "Viral hemorrhagic fever (disorder)"
      }
    },
    {
      code: {
        system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type',
        code: 'priority'
      },
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context',
            code: 'routine'
          }
        ]
      }
    }
  ]
}
```


