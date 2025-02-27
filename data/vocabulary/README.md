# Vocabulary Documentation
The eRSD Composition & Delivery pipeline will have several terminology dependencies
beyond those that are directly part of the eRSD bundles. This workspace (/data/vocabulary) is the space for maintaining and creating those terminology resources. Each known dependency and the relevant information for creating and maintaining it is documented below.

### RCKMS Condition Codes
The RCKMS Condition Codes value set defines the set of triggering Condition Codes
and the value sets that contains the concepts representing that condition - this
relationship is expressed via the useContext of type "focus" on the leaf value sets
that contains the concepts.

It is defined by the RCKMS Content team and is provided as an input to the eRSD
composition process as a spreadsheet. From this spreadsheet a proper FHIR ValueSet
resource needs to be generated so that it can be loaded into the Reporting
Specification Repository and used there throughout the composition process.

### CQF Tooling ValueSet Generator
CQF Tooling's GenericValueSetGenerator operation can be used to generate the ValueSet.

Currently, only the compose from the generated ValueSet will be useful. The generation does not extract the description from the ReadMe sheet in the workbook and it does not set other values like ID, Name, Title, URL, etc., and so those should be preserved from version to version - i.e., just replace the compose element with the newly-generated compose and then manually update the description, using the value from the readme in the spreadsheet.

Example invocation of the operation:
```
mvn exec: java -Dexec.args="
  -XlsxToValueSet
  -pts=/aphl-vsm/data/vocabulary/RCKMS Condition Codes.20230614.xlsx
  -op=/aphl-vsm/data/vocabulary
  -e=json
  -code=1:1:2
  -display=1:1:3
  -system=1:1:4
  -synonymdesignation=1:1:0
  -codeversion=1:1:5"
```

Or you can run the _generateValueSet.sh script, just change the name of the spreadsheet to which it's referring.