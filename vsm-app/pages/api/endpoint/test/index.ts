import { NextApiRequest, NextApiResponse } from "next"
import handler from "../../../../helpers/server/handler"
export interface TestRequest extends NextApiRequest {
  body: {
    endpoint: string
  }
}
const testEndpoint = async (req: TestRequest, res: NextApiResponse) => {
  if (req?.body?.endpoint) {
    const result = await fetch(req.body.endpoint, { method: 'HEAD' })
    res.status(result.status).send(result.statusText)
  }
}
export default handler({
  POST: {
    action: testEndpoint,
    access: ['admin']
  }
})