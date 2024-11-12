import handler from '@/helpers/server/handler'
import ersd from '@/helpers/server/templates/ersd-1.2.2.0.json'
import { generateImportBundle } from '@/helpers/server/generateImportBundle'

// this should create a smaller eRSD bundle for QA purposes
// it will output the data in a format that can be used for $ersd-v2-import in postman
const createParamsBundleForQA = async (req, res) => {
  // this endpoint should only be available on QA deployment

  try {
    const payload = req.body

    // option to truncate data to make it a bit smaller
    const { maxLeafsPerGrouper } = payload
    const { bundleData } = payload
    // need to check the format for the input payload to make sure it's correct
    // if no payload passed in, just use the eRSD 1.2.2.0 bundle

    // all owned data elements should be updated in these fields:
    // ID
    // URL
    // POST urls
    // any references to them in other resources... what about plandef? :/

    const result = generateImportBundle({
      ersdBundle: bundleData || ersd,
      maxLeafsPerGrouper
    })

    if (result?.error) {
      return res.status(400).json({ error: result.error })
    } else {
      return res.status(200).json(result)
    }

  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Creating smaller bundle failed' })
  }
}

export default handler({
  POST: { action: createParamsBundleForQA, access: ['admin'] },
})