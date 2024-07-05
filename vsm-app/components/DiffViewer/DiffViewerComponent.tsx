import { GrouperCodesTable } from '@/components/DiffViewer/GrouperCodesTable'
import GrouperMetadataTable from '@/components/DiffViewer/GrouperMetadataTable'
import { GrouperValueSetsTable } from '@/components/DiffViewer/GrouperValueSetsTable'
import ProgramMetadataTable from '@/components/DiffViewer/ProgramMetadataTable'
import { changelog } from '@/components/DiffViewer/changelog_new'
import { createTableData } from '@/components/DiffViewer/createTables'
import { useState } from 'react'
import styled from 'styled-components'

const RelativeContainer = styled.div`
  position: relative;
`

const DiffViewerComponent = ({ changelogData }) => {
  const [currentPage, setCurrentPage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  console.log('changelog: ', changelogData)
  console.log('formatted changelog: ', changelogData)
  console.log('this: ', changelogData.grouperPages[0].metadata)
  console.log('formattedChangelog.grouperpa', changelogData.grouperPages.length)
  console.log('menu: ', changelogData.anchorLinkData)
  const pages = changelogData.grouperPages.map((p, idx) => (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', paddingBottom: '2rem', marginBottom: '2rem'}}>
      <GrouperMetadataTable id={changelogData.anchorLinkData[idx + 1].grouperId} grouperTableData={p.metadata}/>
      <GrouperValueSetsTable id={changelogData.anchorLinkData[idx + 1].vsTableId} grouperTableData={p}/>
      <div style={{ margin: '2rem 0' }}>
        <GrouperCodesTable id={changelogData.anchorLinkData[idx + 1].codesTableId} grouperTableData={p}/>
      </div>
    </div>
  ))
  return (
    <RelativeContainer>
      {/* <DiffViewerMenu/> */}
      <ProgramMetadataTable id='program-metadata' rootLibData={changelogData.rootLibrary}/>
      {pages}
    </RelativeContainer>
  )
}

export default DiffViewerComponent