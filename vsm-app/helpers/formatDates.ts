import { format } from 'date-fns'

interface FormatResourceDate {
  resource: fhir4.ValueSet | fhir4.CodeSystem
  dateType: string
}

const formatResourceDate = ({ resource, dateType }: FormatResourceDate) => {
  if (dateType === 'lastUpdated') {
    const date = resource?.meta?.lastUpdated || resource?.date
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

export { formatResourceDate, formatDateForTable }
