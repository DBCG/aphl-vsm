import { GrouperCodesTable } from '@/components/DiffViewer/GrouperCodesTable'
import GrouperMetadataTable from '@/components/DiffViewer/GrouperMetadataTable'
import { GrouperValueSetsTable } from '@/components/DiffViewer/GrouperValueSetsTable'
import ProgramMetadataTable from '@/components/DiffViewer/ProgramMetadataTable'
import { AccordionDetails, AccordionSummary } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import Accordion from '@mui/material/Accordion'
import styled from 'styled-components'

const RelativeContainer = styled.div`
  position: relative;
`

const PageContainer = styled.div`
  background-color: rgba(255,255,255,0.8);
  // padding-bottom: 2rem;
  margin-bottom: 2rem;
`

const CodesTableContainer = styled.div`
  margin: 2rem 0;
`

const DiffViewerComponent = ({ changelogData }) => {
  console.log('changelogData: ', changelogData)
  const pages = changelogData.grouperPages.map((p, idx) => (
    <PageContainer>
      <Accordion defaultExpanded={p.hasChanges}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <GrouperMetadataTable id={changelogData.anchorLinkData[idx + 1].grouperId} grouperTableData={p.metadata}/>
          </AccordionSummary>
        <AccordionDetails>
        <GrouperValueSetsTable id={changelogData.anchorLinkData[idx + 1].vsTableId} grouperTableData={p}/>
        <CodesTableContainer>
          <GrouperCodesTable id={changelogData.anchorLinkData[idx + 1].codesTableId} grouperTableData={p}/>
        </CodesTableContainer>
        </AccordionDetails>
      </Accordion>
    </PageContainer>
  ))
  return (
    <RelativeContainer>
      <ProgramMetadataTable id='program-metadata' rootLibData={changelogData.rootLibrary}/>
      {pages}
    </RelativeContainer>
  )
}

export default DiffViewerComponent