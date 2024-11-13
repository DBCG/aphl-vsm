import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import { Box, TextField, Typography } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { toast } from 'react-toastify'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

const QAPage: NextPage = () => {
  const [leafsPerGrouper, setLeafsPerGrouper] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { data: session } = useSession()

  // useEffect(() => {
  //   const currentPath = router.asPath
  //   console.log('currentPath: ', currentPath)
  //   // @ts-ignore
  //   if (!session?.user?.roles.includes('admin')) {
  //     router.push('/programs')
  //   }
  // }, [router.asPath])

  useEffect(() => {
    const currentPath = router
    console.log('currentPath: ', currentPath)
    // @ts-ignore
    // if (!session?.user?.roles.includes('admin')) {
    //   router.push('/programs')
    // }
  }, [router.asPath]) 

  const fetchParameters = async () => fetch('/api/qa/generateImportParams', {
    method: 'POST',
    body: JSON.stringify({
      maxLeafsPerGrouper: leafsPerGrouper
    })
  })

  const downloadFile = (dataAsObj: any) => {
    // create file in browser
    const fileName = ''
    const json = JSON.stringify(dataAsObj, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const href = URL.createObjectURL(blob)

    // create 'a' HTLM element with href to file
    const link = document.createElement('a')
    link.href = href
    link.download = fileName + '.json'
    document.body.appendChild(link)
    link.click()

    // clean up 'a' element & remove ObjectURL
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
  }

  const generateBundleAndParameters = async () => {
    setIsLoading(true)
    const result = await fetchParameters()

    if (result.ok) {
      const data = await result.json()
      downloadFile(data)
    } else {
      const errorResult = await result.json()
      toast.error(errorResult.error)
    }
    setIsLoading(false)
  }

  return (
    <Box>
      <ul>
        <li>
          This page will generate a smaller eRSD Parameters bundle for QA purposes.
        </li>
        <li>
          It will output the data in a format that can be used for $ersd-v2-import in Postman.
        </li>
        <li>
          It will use eRSD 1.2.2.0 as the base. If that version already exists in VSM, it will generate a new 3-part version instead and apply to the contents.
        </li>
      </ul>
      <ul>
        <li>Reduce the size of the eRSD to limiting the max of how many leafs exist per grouper</li>
      </ul>
      <TextField
        style={{ backgroundColor: 'white', minWidth: '400px' }}
        id='outlined-number'
        label='Max leafs per grouper:'
        type='number'
        disabled={isLoading}
        onChange={(e) => setLeafsPerGrouper(e?.target?.value || null)}
      />
      <div style={{ marginTop: '1rem' }}>
        <LoadingButton variant='contained' loading={isLoading} onClick={generateBundleAndParameters}>
          Generate new bundle for testing
        </LoadingButton>
      </div>
    </Box>
  )
}

export default QAPage
