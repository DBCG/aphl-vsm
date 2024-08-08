import { fhirCdrClient } from "@/fhirClients"
import handler from "@/helpers/server/handler"
import { NextApiRequest, NextApiResponse } from "next"

const getEndpoint = async (req: NextApiRequest, res: NextApiResponse<fhir4.Endpoint | { error: string }>) => {
  if (req.query.id !== null && typeof req.query.id === "string") {
    const endpoint = await fhirCdrClient.read({
      resourceType: 'Endpoint',
      id: req.query.id
    }) as fhir4.Endpoint
    res.status(200).send(endpoint)
  } else {
    res.status(422).send({ error: "invalid ID" })
  }
}
const deleteEndpoint = async (req: NextApiRequest, res: NextApiResponse<fhir4.OperationOutcome | { error: string }>) => {
  if (req.query.id !== null && typeof req.query.id === "string") {
    const outcome = await fhirCdrClient.delete({
      resourceType: 'Endpoint',
      id: req.query.id
    }) as fhir4.OperationOutcome
    res.status(200).send(outcome)
  } else {
    res.status(422).send({ error: "invalid ID" })
  }
}
export default handler({
  GET: {
    action: getEndpoint
  },
  DELETE: {
    action: deleteEndpoint,
    access: ['admin']
  },
})