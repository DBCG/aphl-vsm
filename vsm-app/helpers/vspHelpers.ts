import { VSPMetadata } from '@/types/vspTypes'

/**
 * constructVSPUrl: Builds the canonical URL for a VSP Library resource
 *
 * Why needed: The URL must follow a specific pattern defined in requirements:
 *   [ig-canonicalBase]-vsp/[ig-version]/Library/[ig-packageid]-vsp-[version]
 *
 * Example input:
 *   igUrl: "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core"
 *   igVersion: "6.1.0"
 *   igPackageId: "hl7.fhir.us.core"
 *   vspVersion: "2026-01"
 *
 * Example output:
 *   "http://hl7.org/fhir/us/core-vsp/6.1.0/Library/hl7.fhir.us.core-vsp-2026-01"
 *
 * Why this pattern:
 *   - Namespaces VSPs under the IG's canonical base
 *   - Version in path allows multiple VSP versions for same IG
 *   - Follows FHIR canonical URL conventions
 */
export const constructVSPUrl = (igMetadata: VSPMetadata): string => {
  // Strip "/ImplementationGuide/[id]" from IG canonical to get base
  // Example: "http://hl7.org/fhir/us/core/ImplementationGuide/..." → "http://hl7.org/fhir/us/core"
  const igUrlBase = igMetadata.igUrl.replace(/\/ImplementationGuide\/.*$/, '')

  // Construct URL following the pattern
  return `${igUrlBase}-vsp/${igMetadata.igVersion}/Library/${igMetadata.igPackageId}-vsp-${igMetadata.vspVersion}`
}

/**
 * constructVSPId: Builds the FHIR resource ID for a VSP Library
 *
 * Why needed: FHIR resource IDs must be unique and follow a convention.
 * The ID is used to reference the resource in URLs and searches.
 *
 * Example: "hl7.fhir.us.core" + "2026-01" → "hl7.fhir.us.core-vsp-2026-01"
 *
 * Why this pattern: Ensures uniqueness by combining package ID and version
 */
export const constructVSPId = (igPackageId: string, vspVersion: string): string => {
  return `${igPackageId}-vsp-${vspVersion}`
}

/**
 * parseIGCanonical: Splits an IG canonical into URL and version components
 *
 * Why needed: IG canonical is provided in the format "url|version" but we need
 * these components separately for URL construction and metadata.
 *
 * Example: "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|6.1.0"
 *          → { url: "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core", version: "6.1.0" }
 *
 * Why FHIR uses |: Standard FHIR convention for versioned canonical URLs
 */
export const parseIGCanonical = (canonical: string): { url: string, version?: string } => {
  const [url, version] = canonical.split('|')
  return { url, version }
}

/**
 * validateVSPVersion: Ensures version follows YYYY-MM format
 *
 * Why needed: Version format is strictly defined in requirements. Invalid versions
 * would break URL construction and cause FHIR validation errors.
 *
 * Examples:
 *   "2026-01" → true (valid)
 *   "2026-13" → false (invalid month)
 *   "26-01"   → false (invalid year)
 *   "2026-1"  → false (missing leading zero)
 *
 * Why enforce: Consistency in versioning, prevents user input errors, maintains URL pattern
 */
export const validateVSPVersion = (version: string): boolean => {
  // Regex breakdown:
  // ^\d{4}        - Start with exactly 4 digits (year)
  // -             - Literal hyphen
  // (0[1-9]|1[0-2]) - Either 01-09 or 10-12 (valid months with leading zeros)
  // $             - End of string
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/
  return regex.test(version)
}

/**
 * generateVSPName: Creates a computer-friendly name for the VSP Library
 *
 * Why needed: FHIR Library.name is required and must be a valid identifier
 * (no spaces, special chars). Used in code/references, not for display.
 *
 * Example: "US Core" + "6.1.0" → "USCore610ValueSetPackageDefinition"
 *
 * Why this pattern:
 *   - Strips special characters to create valid identifier
 *   - Includes version for uniqueness
 *   - "Definition" suffix indicates this defines a package (not the package itself)
 */
export const generateVSPName = (igName: string, igVersion: string): string => {
  // Remove all non-alphanumeric characters (spaces, dots, hyphens)
  const cleanName = igName.replace(/[^a-zA-Z0-9]/g, '')
  // Remove all non-numeric characters from version (e.g., "6.1.0" → "610")
  const cleanVersion = igVersion.replace(/[^0-9]/g, '')
  return `${cleanName}${cleanVersion}ValueSetPackageDefinition`
}

/**
 * generateVSPTitle: Creates a human-friendly title for the VSP Library
 *
 * Why needed: FHIR Library.title is required for display purposes.
 * Shown in tables, headers, search results.
 *
 * Example: "US Core" + "6.1.0" → "US Core 6.1.0 Value Set Package Definition"
 *
 * Why this pattern:
 *   - Maintains readability with spaces
 *   - Clearly identifies what this resource represents
 *   - Follows convention: "[IG Name] [Version] Value Set Package Definition"
 */
export const generateVSPTitle = (igTitle: string, igVersion: string): string => {
  return `${igTitle} ${igVersion} Value Set Package Definition`
}
