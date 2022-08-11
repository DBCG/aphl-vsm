import { useEffect, useState } from 'react'
import LoadingIndicator from "@/components/LoadingIndicator";
import Router from 'next/router'
import { useRouter } from 'next/router'
import styled from 'styled-components'

const Row = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-evenly;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  height: fit-content;
`

interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string,
  'version:contains'?: string,
}


const Template = () => {
  const [libraryData, setLibraryData] = useState(null)
  const [libraryTemplateData, setLibraryTemplateData] = useState(null)
  const [loading, setLoading] = useState(true)
  const newLibraryData = {data: 'hello from the frontend!'}
  let jsonData: any = '';
  const router = useRouter()
  let href: any = '';
  
  const handleClick = () => {
    router.push(href)
  }

  useEffect(() => {
    setLoading(true)

    async function searchForLibrary() {
      const result = await fetch('../api/programs', {
        method: 'GET',
        //body: JSON.stringify(newLibraryData)
      })
    
      //todo - get json data from result and pass it to getData function to send it to the backend.
      setLibraryData(result)
    }

    const fetchedData = searchForLibrary()
    setLoading(false)
  }, [])

  useEffect(() => {
    if(!libraryData) {
      setLibraryData(null)
      return
    }
    async function getTemplateData() {
      const asyncTemplateData = await fetch('../api/template', {
        method: 'POST',
        body: JSON.stringify(libraryData)
      })

      jsonData = await asyncTemplateData.json()
      console.log('template data: ' + jsonData)
      setLibraryTemplateData(jsonData)
      //router.push('/programs')
      
    }

    getTemplateData()
  }, [libraryData])

  if (loading) {
    return <LoadingIndicator/>
  } else {
    return (
      <a href={'/programs'} onClick={handleClick}>
        Return to programs page
      </a>

    )
  }
}

export default Template