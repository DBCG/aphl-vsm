import type { NextPage } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const RedirectToAdminTools: NextPage = () => {
  const { push } = useRouter()
  useEffect(() => {
    push('/admin-tools')
  }, [push])
  return <p></p>
}
export default RedirectToAdminTools
