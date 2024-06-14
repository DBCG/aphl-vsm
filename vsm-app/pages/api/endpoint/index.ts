import { fhirCdrClient } from "@/fhirClients"
import { NextApiRequest, NextApiResponse } from "next"
import handler from "../../../helpers/server/handler"
import { FhirResource } from "fhir-kit-client"
interface EndpointRequest extends NextApiRequest {
  body: {
    endpoint: fhir4.Endpoint
  }
}
const updateEndpoint = async (req: EndpointRequest, res: NextApiResponse<fhir4.Endpoint | FhirResource>) => {
  // add/edit endpoint
  let updatedEndpoint: FhirResource | fhir4.Endpoint
  if (req.body?.endpoint?.id) {
    updatedEndpoint = await fhirCdrClient.update<fhir4.Endpoint>({
      resourceType: 'Endpoint',
      id: req.body?.endpoint?.id,
      body: req.body?.endpoint
    })
  } else {
    updatedEndpoint = await fhirCdrClient.create<fhir4.Endpoint>({
      resourceType: 'Endpoint',
      body: req.body?.endpoint
    })
  }
  res.status(200).send(updatedEndpoint)
}
export default handler({
  POST: {
    action: updateEndpoint,
    access: ['admin']
  }
})