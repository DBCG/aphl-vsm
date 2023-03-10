import { format } from 'date-fns'

interface FormatVs {
  valueSet: fhir4.ValueSet
  dateType: string
}
const formatDate = (dateStr: string) => format(new Date(dateStr), 'YYY-M-d')

const formatValuesetDate = ({ valueSet, dateType }: FormatVs) => {
  if (dateType === 'lastUpdated') {
    const date = valueSet?.meta?.lastUpdated || valueSet?.date
    if (date) {
      const test = format(new Date(date), 'YYY-M-d')
      return test
    } else {
      return null
    }
  }
}

export { formatValuesetDate }
