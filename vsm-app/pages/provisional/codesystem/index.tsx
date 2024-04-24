import { ProvisionalEditForm } from '@/components/Provisional/ProvisionalEditForm'

const CodeSystemPage = () => {
  return (
    <ProvisionalEditForm
      itemType='cs'
      readOnly={false}
      canEdit={true}
    />
  )
}

export default CodeSystemPage