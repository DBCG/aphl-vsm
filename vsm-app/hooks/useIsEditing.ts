import { useState, useEffect } from 'react'

interface EditingStatus {
  editing: boolean,
  programId?: string
}

// gets data necessary to build the program valueset details page
const useIsEditing = (input: EditingStatus) => {
  const [editingStatus, setEditingStatus] = useState({ editing: false })

  useEffect(() => {
    setEditingStatus(input)
  }, [input])

  return [editingStatus, setEditingStatus]
}

export { useIsEditing }