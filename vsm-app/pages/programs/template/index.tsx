import { useMemo, useEffect, useState } from 'react';
import LoadingIndicator from "@/components/LoadingIndicator";
import Router from 'next/router';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { resourceLimits } from 'worker_threads';
import DT from 'react-data-table-component';
import { IconButton } from '@/components/buttons/IconButton';
import { fetchData } from 'next-auth/client/_utils';

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
const ButtonWrapper = styled.div`
  margin-left: 6px;
`

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Template = () => {
  const [libraryData, setLibraryData] = useState(null)
  const [libraryTemplateData, setLibraryTemplateData] = useState(null)
  const [loading, setLoading] = useState(true)
  //const newLibraryData = {data: 'hello from the frontend!'}
  let jsonData: any = '';
  const router = useRouter()
  let href: any = '';
  
  const handleClick = () => {
    router.push(href)
  }

  const columns = useMemo(() => [
    {
      name: 'Updated',
      selector: (row: fhir4.Library) => row.date,
      sortable: true,
      maxWidth: '150px',
      wrap: true
    },
    {
      name: 'ID',
      selector: (row: fhir4.Library) => row.id,
      sortable: true,
      maxWidth: '250px',
      wrap: true,
      
    },
    {
      name: 'Name',
      selector: (row: fhir4.Library) => row.name,
      sortable: true,
      maxWidth: '300px',
      wrap: true
    },
    {
      name: 'Title',
      selector: (row: fhir4.Library) => row.title,
      sortable: true,
      maxWidth: '200px',
      wrap: true
    },
    {
      name: 'Description',
      selector: (row: fhir4.Library) => row.description,
      sortable: false,
      maxWidth: '300px',
      minWidth: '300px',
      wrap: true
    },
    {
      name: 'Version',
      selector: (row: fhir4.Library) => row.version,
      sortable: true,
      wrap: true
    },
    {
      name: 'Details',
      selector: (row: fhir4.Library) => row.name,
      sortable: false,
      wrap: true,
      cell: (row: fhir4.Library) => (
        <ButtonWrapper>
          <IconButton
            onClick={() => router.push(`/programs/${row.id}`)}
            buttonContext='edit'
          />
        </ButtonWrapper>
      )
    }
  ], [])

  useEffect(() => {
    setLoading(true)

    async function searchForLibrary() {
      const result = await fetch('../api/programs', {
        method: 'GET',
        //body: JSON.stringify(newLibraryData)
      })
    
      //todo - get json data from result and pass it to getData function to send it to the backend.
      setLibraryData(result)
      console.log('in programs template: ' + result.body)
    }

    jsonData = searchForLibrary()
    console.log('jsonData: ' + JSON.stringify(jsonData))
    setLoading(false)
  }, [])

  useEffect(() => {

    async function getTemplateData() {
      const asyncTemplateData = await fetch('../api/template', {
        method: 'POST',
        //body: JSON.stringify(libraryData)
      })

      jsonData = await asyncTemplateData.json()
      console.log('template data: ' + jsonData)
      setLibraryTemplateData(jsonData)
      
    }

    getTemplateData()
    setLoading(false)
  }, [])  //[libraryData])

  if (loading) {
    return <LoadingIndicator/>
  } else {
    return (
      <Col>
        <Row>
          <a href={'/programs'} onClick={handleClick}>
            Return to programs page
          </a>
        </Row>
       <Row>

       </Row>
       <DT
        data={jsonData}
         // @ts-expect-error
         columns={columns}
         theme='aphl'
         pagination
         fixedHeader
         customStyles={customStyles}
       />
       </Col>
    )
  }
}

export default Template