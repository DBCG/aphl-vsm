import { is } from './is'
import Logger from './server/logger'
import { Parser } from '@json2csv/plainjs'

const oidRegex = /oid:([.\d]*)/;

function getOID(identifiers: fhir4.Identifier[] | undefined) {
  if (!identifiers || identifiers.length === 0 || !identifiers[0].value)
    return ''

  let match = oidRegex.exec(identifiers[0].value)
  return match ? match[1] : ''
}

function convertBundleToCSVHelper(sourceBundle: fhir4.Bundle | string) {
  if (is.bundle(sourceBundle)) {
    const valueSetData: any[] = []
    const bundle = structuredClone(sourceBundle)
    bundle.entry?.filter((entry) => entry?.resource?.resourceType == 'ValueSet' && entry.resource.expansion?.contains)
      .forEach((entry) => {
        const valueSet = entry.resource as fhir4.ValueSet
        valueSet.expansion?.contains?.forEach((vsExpansionContains) => {
          valueSetData.push({
          'Value Set Name': valueSet.name ?? '',
          'Value Set OID': getOID(valueSet.identifier),
          'Definition Version': valueSet.version ?? '',
          'Status': valueSet.status ?? '',
          'Purpose': valueSet.purpose ?? '',
          'Code': vsExpansionContains.code ?? '',
          'Display': vsExpansionContains.display ?? '',
          'Code System': vsExpansionContains.system ?? '',
          'Code System Version': vsExpansionContains.version ?? '',
          })
        })
    })
    const parser = new Parser();
    const valuesetAsCSV = parser.parse(valueSetData)
    return valuesetAsCSV
  } else {
    Logger.getLogger().warn('Invalid source bundle')
    return sourceBundle
  }
}

export {
  getOID,
  convertBundleToCSVHelper
}
