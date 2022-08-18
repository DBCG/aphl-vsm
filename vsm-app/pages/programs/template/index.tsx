import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import DT from 'react-data-table-component';
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails';

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

const customStyles = {
  cells: {
    style: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  }
}

const Template = () => {

  const router = useRouter()
  
  let programId = router?.query?.id || ''
  const program = useGetProgramValueSetDetails(programId)

  useEffect(() => {
    console.log('program: ', program)
  }, [program])

  let href: any = '';
  
  const handleClick = () => {
    router.push(href)
  }

  const columns = useMemo(() => [
    {
      name: 'Value Set Name',
      selector: (row) => row.valueSet.name,
      sortable: true,
      maxWidth: '350px',
      wrap: true
    },
    {
      name: 'Template Value Set Version',
      selector: (row) => row.valueSet.version,
      sortable: true,
      maxWidth: '250px',
      wrap: true,
      
    },
    {
      name: 'Edit Value Set Version',
      selector: (row) => 'include a select here to get available versions?',
      sortable: true,
      maxWidth: '250px',
      wrap: true,
      
    }
  ], [])

  {
    return (
      <Col>
        <Row>
          <a href={'/programs'} onClick={handleClick}>
            Return to programs page
          </a>
        </Row>
        <p>Edit Program Value Sets</p>
        <DT
          data={program?.data}
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