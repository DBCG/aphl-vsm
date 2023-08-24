import { format } from 'date-fns'

interface FormatVs {
  valueSet: fhir4.ValueSet
  dateType: string
}

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

const formatDateForTable = (date: string | any, format: string): string => {
  if (typeof date !== 'string' || !date?.trim()?.length) {
    return ''
  }

  try {
    if (format?.toLowerCase() === 'm/d/yyyy') {
      const dateItem = new Date(date)
      const formattedDate = new Intl.DateTimeFormat('en-US').format(dateItem)
      return formattedDate
    }
    return date
  } catch (e) {
    return ''
  }
}

export { formatValuesetDate, formatDateForTable }
