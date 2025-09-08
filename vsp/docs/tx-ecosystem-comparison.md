This document compares the requirements of the [FHIR Terminology Ecosystem IG](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html) version 1.8.0 to the [CRMI Artifact Terminology Service](https://hl7.org/fhir/uv/crmi/2025Sep/artifact-terminology-service.html) requirements

> TX: I tried to deep-link here, but I get access denied when I try to access the permanent links from the directory of published versions

## Metadata

TX: [Metadata](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#metadata)

CRMI: [Requirement 12.2.5.1](https://hl7.org/fhir/uv/crmi/2025Sep/artifact-terminology-service.html#server-operations) covers the terminology capabilities requirement, however the following specific items in Metadata should be addressed:

> CRMI: Consider defining a CRMIArtifactTerminologyServiceCapabilityStatement profile of CapabilityStatement that specifies:

* CapabilityStatement.fhirVersion 1..1
* CapabilityStatement.rest[mode = server].security.service 1..1
* CapabilityStatement.instantiates slice pattern http://hl7.org/fhir/CapabilityStatement/terminology-server

Then indicate that the TerminologyService CapabilityStatement SHALL conform to CRMIArtifactTerminologyServiceCapabilityStatement

[FHIR-52752](https://jira.hl7.org/browse/FHIR-52752)

> TX: Consider defining a TxArtifactTerminologyServiceCapabilityStatement profile?

## Code Systems

TX: [Supporting Code Systems](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#supporting-codesystems)

CRMI: [Requirements 12.2.2.x](https://hl7.org/fhir/uv/crmi/2025Sep/artifact-terminology-service.html#code-systems) cover code system functionality that is consistent with the Tx FHIR Ecosystem IG.

CRMI should adopt and consistently make use of the term _supported_ for code systems as defined in the Tx IG:

* A _supported_ code system is any code system that the server supports correctly for calls to `$expand`, `$validate-code`, and `$lookup`

> TX: I assume that for $validate-code, this means both the ValueSet and CodeSystem operations?

> CRMI: Add and consistently make use of the term _supported_ for CodeSystem resources ([FHIR-52755](https://jira.hl7.org/browse/FHIR-52755))

CRMI should adopt and consistently make use of the term _pre-defined_ for code systems as defined in the Tx IG:

* A _pre-defined_ code system is any code system that the server makes available through the `/CodeSystem` endpoint

> CRMI: Add and consistently make use of the term _pre-defined_ for CodeSystem resources ([FHIR-52755](https://jira.hl7.org/browse/FHIR-52755))

> TX: In [Supporting Code Systems](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#supporting-codesystems) there is this bullet: "The TerminologyCapabilities SHALL list all the predefined code systems that the server supports in TerminologyCapabilities.codeSystem.uri, and all the versions in TerminologyCapabilities.codeSystem.version.code. Code systems SHALL be listed here whether or not they are available through code system search" but shouldn't this say "supported" code systems, not "predefined" code systems?

> TX: Is it the case that a pre-defined code system is also a supported code system? Regardless of the answer, should this be documented for clarity?

> TX: Consider defining Capability statements for TxEcosystemServer, TxGeneralPurposeEcosystemServer, and TxCodeSystemEcosystemServer?

### Passing Code System Resources

TX: [Support tx-resource](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#passing-codesystem-resources-in-requests)

> CRMI: Add support for the new tx-resource parameter in $validate-code, $expand, and $lookup

### Code System Functionality:

TX: [Code System Functionality](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#code-system-functionality)

> TX: This bullet: "CodeSystem.content. Servers SHALL not process $expand or $validate-code requests on CodeSystems that have content = not-present or example. Servers SHALL reflect content = fragment in an error message if the code is not valid against a fragment." seems inconsistent with the definition of supported code systems? Can't I make a CodeSystem resource available with content=not-present for a supported code system?

## Value Sets

TX: [Supporting Value Sets](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#supporting-value-sets)

CRMI: [Requirements 12.2.3.x](https://hl7.org/fhir/uv/crmi/2025Sep/artifact-terminology-service.html#value-sets) cover value set functionality that is consistent with the Tx FHIR Ecosystem IG.

* A _supported_ value set is any value set that can be used in $expand or $validate-code operations, including value sets imported into other value sets, and including implicit value sets.

> CRMI: Add and consistently make use of the term _supported_ for ValueSet resources ([FHIR-52755](https://jira.hl7.org/browse/FHIR-52755))

* A _pre-defined_ value set is any value set that the server makes available through the `/ValueSet` endpoint

> CRMI: Add and consistently make use of the term _pre-defined_ for ValueSet resources ([FHIR-52755](https://jira.hl7.org/browse/FHIR-52755))

### Passing Value Set Resources

TX: [Passing ValueSet resources](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#passing-valueset-resources-in-requests)

> CRMI: Add support for tx-resource (see above)

### Value Set Functionality

TX: [Value Set Functionality](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#valueset-functionality)

> CRMI: Support the _summary parameter

### Human Representation

TX: [Human Representation](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#human-representation)

> TX: Where is the web-source extension documented?

## Parameter Support

### Common Parameters

TX: [Common Parameters $expand and $validate-code](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#common-parameters-expand-and-validate-code)

> CRMI: Consider supporting the `cache-id` parameter

> CRMI: Supplement support for designations in different languages

### $expand Parameters

TX: [$expand parameters](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#expand-parameters)

> CRMI: SHALL echo parameters (including assumed/defaulted) in expansion parameters

> CRMI: SHALL report all versions of code systems used (in used-*)

> TX: Where is the used-* parameter documented?

> CRMI: SHALL support Accept-Language header

> CRMI: SHALL support includeDefinition, property, excludeNested

[FHIR-52756](https://jira.hl7.org/browse/FHIR-52756)

### $validate-code Parameters

TX: [$validate-code parameters](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#validate-code-parameters)

> CRMI: SHALL support lenient-display-validation

> CRMI: SHALL support Accept-Language header

> CRMI: SHALL support inferSystem

[FHIR-52756](https://jira.hl7.org/browse/FHIR-52756)

### Extension Support

TX: [Extensions](https://hl7.org/fhir/uv/tx-ecosystem/requirements.html#extensions)

* codesystem-alternate
* codesystem-conceptOrder
* codesystem-label
* itemWeight
* rendering-style
* rendering-xhmtl
* valueset-concept-definition
* valueset-deprecated
* valueset-supplement
* valueset-label
* valueset-conceptOrder
* structuredefinition-standards-status

Although none of these extensions are required by CRMI, nothing here is inconsistent with CRMI requirements.

## Summary

> CRMI: Consider a general statement that a CRMI server SHOULD also be a fully compliant Tx Ecosystem server ([FHIR-52746](https://jira.hl7.org/browse/FHIR-52746))

### Profile Indications and Requirements

CRMI requires that servers support the CRMIShareable and CRMIPublishable profiles, and that resources returned by the server carry their profile designations.

Tx Ecosystem indicates servers should support CRMIShareable profiles, though this is not a requirement

### Search Requirements

CRMI does not require _summary support (though it should)

CRMI imposes the following additional search requirements:

* SHALL support identifier, name, title, status, description, code, and keyword
* SHOULD support context(-type,-type-quantity,-type-value), valueset, library, codesystem, artifact, _text, _content

### Language Support

CRMI is silent about language support generally, but nothing in the [Languages](https://hl7.org/fhir/uv/tx-ecosystem/languages.html) support description is inconsistent with CRMI requirements.

> CRMI: Consider a general statement that artifact terminology services SHALL provide language support in accordance with the FHIR Tx Ecosystem IG ([FHIR-52750](https://jira.hl7.org/browse/FHIR-52750))

### Operation Parameters

Tx Ecosystem required parameters that are not required by CRMI:

* includeDefinition
* property
* excludeNested
* lenient-display-validation
* inferSystem

Although these are not explicitly required by CRMI, they are not inconsistent with CRMI requirements.

> CRMI: Add support for required parameters from the Tx FHIR Ecosystem IG ([FHIR-52756](https://jira.hl7.org/browse/FHIR-52756))





