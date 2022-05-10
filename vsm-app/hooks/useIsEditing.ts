import { useState, useCallback } from 'react'

interface EditingStatus {
  editing: boolean,
  programId?: string
}

// gets data necessary to build the program valueset details page
const useIsEditing = (initialState: boolean = false): [boolean, any] => {
  const [editingStatus, setEditingStatus] = useState(initialState)

  const toggle = useCallback((): void => setEditingStatus(state => !state), []);

  return [editingStatus, toggle]
}

export { useIsEditing }