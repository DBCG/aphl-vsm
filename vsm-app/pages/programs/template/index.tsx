import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import DT from 'react-data-table-component';
import { useGetProgramValueSetDetails } from '@/hooks/useGetProgramValueSetDetails';
import { useGetPrograms } from '@/hooks/useGetPrograms';
import { Button } from '@/components/buttons/Button';

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
  const programDetails = useGetProgramValueSetDetails(programId)
  const program = useGetPrograms({ id: programId })
  let [data, setData] = useState('');

  useEffect(() => {
    console.log('program: ', program[0])
  }, [program])

  let href: any = '';
  
  const fetchData = async () => {
    let libraryData: any = '';
    libraryData = program[0];
    const json = JSON.stringify(libraryData)
    const req = await fetch('/api/template', {
      method: 'POST',
      body: json
    });
    const newData = await req.json();
    setData(newData)
    router.push('/programs');
  }

  const onClickClone = (event) => {
    event.preventDefault();

    fetchData();
  };

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
  ], [data])

  {
    return (
      <Col>
        <Row>
          <a href={'/programs'} onClick={handleClick}>
            Return to programs page
          </a>
        </Row>
        <Row>
          <Button
            style={{ marginLeft: '800px', marginBottom: '12px', width: '240px', lineHeight: '130%' }}
            text='Clone Program as Template'
            onClick={onClickClone}
          />
        </Row>
        <p>Edit Program Value Sets</p>
        <DT
          data={programDetails?.data}
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