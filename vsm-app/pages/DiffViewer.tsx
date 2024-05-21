import GrouperMetadataTable from '@/components/DiffViewer/GrouperMetadataTable'
import { GrouperValueSetsTable } from '@/components/DiffViewer/GrouperValueSetsTable'
import { changelog } from '@/components/DiffViewer/changelog'
import { createTableData } from '@/components/DiffViewer/createTables'

const DiffPage = () => {
  const formattedChangelog = createTableData(changelog)
  console.log('this: ', formattedChangelog.grouperPages[0].metadata)
  return (
    <>
    <GrouperMetadataTable grouperTableData={formattedChangelog.grouperPages[0].metadata}/>
    <GrouperValueSetsTable grouperTableData={formattedChangelog.grouperPages[0]}/>
    </>
  )
}

export default DiffPage