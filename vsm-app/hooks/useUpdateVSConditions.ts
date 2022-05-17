import { useState, useEffect } from 'react'

interface ConditionInfo {
  system: string,
  code: string,
  text?: string
}

const useUpdateVSConditions = (canonical: string, version: string, conditionInfo: ConditionInfo[]) => {
  const [valueSet, setValueSet] = useState({})
  useEffect(() => {

    if (canonical === '' || version === '') {
      return
    }

    console.log('this is called: ')

    async function updateVSCondition(): Promise<void> {
      const id = canonical?.split('/ValueSet/')[1]
      let endpoint = `/api/valueset/${id}`

      try {
        const body = await JSON.stringify({ canonical, version, conditionInfo })
        const fetchOptions = {
          method: 'PUT',
          body
        }

        const response: Response = await fetch(endpoint, fetchOptions)

        const json = await response.json()

        if (json.error) {
          console.error(json.error)
          setValueSet({})
        } else {
          setValueSet(json)
        }
      } catch (e) {
        console.log('Error in useUpdateVSConditions: ', e)
        setValueSet({})
      }
    }
    void updateVSCondition()
  }, [canonical, version, conditionInfo])

  return valueSet
}

export { useUpdateVSConditions }