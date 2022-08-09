import { useEffect, useState } from 'react'
import LoadingIndicator from "@/components/LoadingIndicator";

interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string,
  'version:contains'?: string,
}

const Template = () => {
  const [libraryTemplateData, setLibraryTemplateData] = useState({ hi: 'hello' })
  const [loading, setLoading] = useState(true)
  const newLibraryData = {data: 'hello from the frontend!'}
  
  useEffect(() => {
    setLoading(true)

    async function getData() {
      const asyncTemplateData = await fetch('/api/template', {
        method: 'POST',
        body: JSON.stringify(newLibraryData)
      })
      const json = await asyncTemplateData.json()
      setLibraryTemplateData(json)
    }

    async function searchForLibrary() {
      const result = await fetch('/api/programs', {
        method: 'GET',
        //body: JSON.stringify(newLibraryData)
      })
      console.log('response status: ' + result.status)
      //todo - get json data from result and pass it to getData function to send it to the backend.
    }

    searchForLibrary()
    getData()
    setLoading(false)
  }, [])

  if (loading) {
    return <LoadingIndicator/>
  } else {
    return (
      <div>
        <p>Data Found</p>
      </div>
    )
  }
}

export default Template