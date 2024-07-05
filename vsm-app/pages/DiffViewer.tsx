import { GrouperCodesTable } from '@/components/DiffViewer/GrouperCodesTable'
import GrouperMetadataTable from '@/components/DiffViewer/GrouperMetadataTable'
import { GrouperValueSetsTable } from '@/components/DiffViewer/GrouperValueSetsTable'
import ProgramMetadataTable from '@/components/DiffViewer/ProgramMetadataTable'
import { changelog } from '@/components/DiffViewer/changelog_new'
import { createTableData } from '@/components/DiffViewer/createTables'


// const ProgramMetaData = ()
const DiffPage = ({ changelogData }) => {
  const formattedChangelog = createTableData(changelogData)
  console.log('formatted changelog: ', formattedChangelog)
  console.log('this: ', formattedChangelog.grouperPages[0].metadata)
  console.log('formattedChangelog.grouperpa', formattedChangelog.grouperPages.length)
  const pages = formattedChangelog.grouperPages.map((p) => (
    <>
      <GrouperMetadataTable grouperTableData={p.metadata}/>
      <GrouperValueSetsTable grouperTableData={p}/>
      <div style={{ marginTop: '2rem' }}>
        <GrouperCodesTable grouperTableData={p}/>
      </div>
    </>
  ))
  return (
    <>
      <ProgramMetadataTable rootLibData={formattedChangelog.rootLibrary}/>
      {pages}
    </>
  )
}

export default DiffPage