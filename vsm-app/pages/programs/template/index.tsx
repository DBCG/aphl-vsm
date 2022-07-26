import { useEffect, useState } from 'react'
import LoadingIndicator from "@/components/LoadingIndicator";

const Template = () => {
  const [libraryTemplateData, setLibraryTemplateData] = useState({ hi: 'hello' })
  const [loading, setLoading] = useState(false)
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

    getData()
    setLoading(false)
  }, [])

  if (loading) {
    return <LoadingIndicator/>
  } else {
    return (
      <div>
        <p>{libraryTemplateData.data}</p>
      </div>
    )
  }
}

export default Template