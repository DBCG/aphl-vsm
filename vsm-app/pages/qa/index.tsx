import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import { Box, TextField } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { toast } from 'react-toastify'

const QAPage: NextPage = () => {
  const [bundleJSON, setBundleJSON] = useState({})
  const [result, setResult] = useState<string | null>(null)
  const [leafsPerGrouper, setLeafsPerGrouper] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchParameters = async (bundleJson) => fetch('/api/qa/generateImportParams', {
    method: 'POST',
    body: JSON.stringify({
      ersdBundle: bundleJson,
      maxLeafsPerGrouper: leafsPerGrouper
  })
  })

  const downloadFile = (dataAsObj) => {
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
    const result = await fetchParameters(bundleJSON)

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
      <TextField
        id='ersd-json'
        label='Enter eRSD bundle'
        style={{ width: '100%' }}
        multiline
        disabled={isLoading}
        onChange={(e) => setBundleJSON(e?.target?.value || {})}
        placeholder='Enter JSON here. If blank, will default to eRSD 1.2.2.0'
      />
        <TextField
          id='outlined-number'
          label='Limit leafs per grouper to:'
          type='number'
          disabled={isLoading}
          onChange={(e) => setLeafsPerGrouper(e?.target?.value || null)}
        />
        <LoadingButton loading={isLoading} onClick={generateBundleAndParameters}>Generate new bundle</LoadingButton>
    </Box>
  )
}

export default QAPage
