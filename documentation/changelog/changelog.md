# Changelog Data

## Goal
The goal of this data is to be enable table format view of nested data.

## What we need to show:

For each FHIR Resource Type, establish a set of general fields that we care to track
The Table Creator component could be able to render this data in its native nested format, or the ability to break out into a top-level table

Library - this will apply to both the top-level library as well as the grouper library
1. Metadata:
- Title
- ID/OID
- Purpose
- Version
- Effective Start Date
- Release Date

2. Children:
- A structure that nests the before/after of composed-of relatedArtifacts

PlanDefinition
1. Metadata -- not quite sure what we care to track in this, but maybe fields including: 
- Title
- ID
- Publisher
- Effective Start Date
- (Do we need to show actions/workflow for changelog? Seems like maybe not, can just refer to the resources?)

ValueSet - this will apply to the Grouper ValueSet as well as the leaf ValueSets?
1. Metadata
- Title
- ID
- Status
- Steward
- Author
- Purpose
- priority (emergent or routine) (this data comes from specification lib, not on the valueset itself)
- associated conditions (this data comes from specification lib, not on the valueset itself)
<!-- Priority & Conditions N/A for groupers -->

2. Children:
- If ValueSet is a grouper, recursively run above ValueSet









