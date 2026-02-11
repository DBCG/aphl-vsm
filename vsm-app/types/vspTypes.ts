import { SelectedManifestDataVersion } from './manifestTypes'

// VSPMetadata: Used during VSP creation and editing
// Contains all metadata needed to construct a VSP Library resource
export interface VSPMetadata {
  igCanonical: string          // Full canonical with version (e.g., "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0")
                               // Why: Required to construct relatedArtifact and derive other fields
  igUrl: string                // Base URL without version (e.g., "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core")
                               // Why: Used to construct VSP URL pattern
  igVersion: string            // IG version only (e.g., "6.1.0")
                               // Why: Used in VSP URL and title generation
  igPackageId: string          // NPM package ID (e.g., "hl7.fhir.us.core")
                               // Why: Used to construct VSP ID and URL
  igName: string               // IG name (e.g., "USCore")
                               // Why: Used to generate VSP name (e.g., "USCore610ValueSetPackageDefinition")
  igTitle: string              // IG title (e.g., "US Core")
                               // Why: Used to generate VSP title (e.g., "US Core 6.1.0 Value Set Package Definition")
  vspVersion: string           // YYYY-MM format (e.g., "2026-01")
                               // Why: Unique version identifier for this VSP, used in URL and ID
  status: 'draft' | 'active' | 'retired'  // VSP lifecycle state
                               // Why: Controls which operations are allowed (e.g., only draft can be edited)
}

// IGManifestDependency: Represents a single CodeSystem or ValueSet dependency from an IG
// Used when auto-populating manifest from IG package dependencies
export interface IGManifestDependency {
  resourceType: 'CodeSystem' | 'ValueSet'  // Type of dependency
                                            // Why: Determines whether to add to codeSystems or valueSets manifest section
  canonical: string                         // Full canonical URL (e.g., "http://hl7.org/fhir/ValueSet/administrative-gender")
                                            // Why: Key for manifest map (system URL for CodeSystem, canonical for ValueSet)
  version: string                           // Version string (e.g., "4.0.1")
                                            // Why: Value for manifest map (which version to pin)
}

// ExtendedManifestData: VSP manifest structure supporting BOTH CodeSystems AND ValueSets
// Extends the existing SelectedManifestDataVersion pattern used for Programs
export interface ExtendedManifestData {
  codeSystems: SelectedManifestDataVersion  // Map of CodeSystem URL → version(s)
                                             // Why: Existing pattern for CodeSystem version pinning
                                             // Example: { "http://snomed.info/sct": ["http://snomed.info/sct/731000124108"] }
  valueSets: SelectedManifestDataVersion    // Map of ValueSet canonical → version(s)
                                             // Why: NEW for VSPs - allows pinning ValueSet versions
                                             // Example: { "http://hl7.org/fhir/ValueSet/administrative-gender": ["4.0.1"] }
  relatedArtifact?: fhir4.RelatedArtifact[] // RelatedArtifacts from $infer-manifest-parameters
                                             // Why: Required for $package operation to know which resources to include
                                             // These are the ValueSet/CodeSystem references that get merged with the IG reference
}

// VSPApiResponse: API response shape for list endpoint
// Matches existing ProgramApiResponse pattern for consistency
export interface VSPApiResponse {
  vsps: fhir4.Library[]  // Array of VSP Library resources
                         // Why: Frontend tables expect array of resources
  total: number          // Total count (for pagination)
                         // Why: Data table needs total for server-side pagination
}

// CreateVSPRequest: API request body for VSP creation
export interface CreateVSPRequest {
  igCanonical: string
  igPackageId: string
  igName: string
  igTitle: string
  vspVersion: string
  manifestData?: ExtendedManifestData  // Optional: pre-populated manifest from IG
}
