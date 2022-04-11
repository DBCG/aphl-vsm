import { useState, useEffect } from 'react'

const useGetProgramById = (id: string): [] | fhir4.Library[] => {
  const [program, setProgram] = useState([])

  useEffect(() => {
    async function getProgramWithValueSets(): Promise<void> {
      let endpoint = `/api/programs?id=${id}`

      try {
        const response: Response = await fetch(endpoint)
        const programJson = await response.json()
        
        const valueSetList = programJson?.[0]?.relatedArtifact?.filter(a => a?.type === 'composed-of')
        console.log('vs lisst: ', valueSetList)
        const vSets = await Promise.all(
          valueSetList.map(async({ resource }) => {
            const res = await fetch(`/api/valueset/${encodeURIComponent(resource)}`)
            const valueSetJson = await res.json()
            return valueSetJson
          })

          )
          console.log('vsets', vSets)

        if (!programJson) {
          setProgram([])
        } else {
          setProgram(programJson)
        }
      } catch(e) {
        setProgram([])
        console.log('Error in useGetPrograms: ', e)
      }
    }
    void getProgramWithValueSets()
    // disabled b/c including 'fields' obj results in infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return program
}

export { useGetProgramById }