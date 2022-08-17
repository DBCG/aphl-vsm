// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fhirCdrClientDraft } from 'fhirClients'

interface Query {
  '_id:contains'?: string,
  'name:contains'?: string,
  'description:contains'?: string,
  'title:contains'?: string,
  'version:contains'?: string,
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  
  // create library template
  if (req.method === 'POST') {
    try {
      let queries: Query = {}
      let fieldCnt = 0;
      // partial match doesn't work on ID, maybe because isn't a string
      req.query['id'] = 'ersd20211229';
      let libraryId: any = '';
      let libraryName: any = '';
      let libraryTitle: any = '';
      let libraryVersion: any = '';
      if (req.query['id']) {
        libraryId = req.query['id']
        queries['_id:contains'] = req.query['id'] as string
        fieldCnt =fieldCnt +1;
      } if (req.query['name']) {
        libraryName = req.query['name'];
        queries['name:contains'] = req.query['name'] as string
        fieldCnt =fieldCnt +1;
      } //if (req.query['description']) {
        //queries['description:contains'] = req.query['description'] as string
        //fieldCnt =fieldCnt +1;
      //} 
      if (req.query['title']) {
        libraryTitle = req.query['title'];
        queries['title:contains'] = req.query['title'] as string
        fieldCnt =fieldCnt +1;
      } if (req.query['version']) {
        libraryVersion = req.query['version'];
        queries['version:contains'] = req.query['version'] as string
        fieldCnt =fieldCnt +1;
      }
      if(fieldCnt > 0) {
        const data1 = '{'
          const data2 = '"resourceType":"Bundle",';
          const data3 = '"id":"ersdv2bundle1-1",';
          const data4 = '"type":"transaction",';
          const data5 = '"entry": ['
            const data6 = '{'
              const data7 = '"request": {'
              const data8 = '"method": "POST"'
              const data10 = '},'
              const data11 = '"resource": {';
                const data12 = '"resourceType":"Library",';
                const data13 = '"id":"' + libraryId + '",';
                const data14 = '"meta": {'
                  const data15 = '"versionId":"2021-12-29",';
                  const data16 = '"profile": ['
                    const data17 = '"http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-specification-library"'
                  const data18 = ']';
                const data19 = '},'
                const data20 = '"url": "http://hl7.org/fhir/us/ecr/Library/ElectronicReportingAndSurveillanceDistribution",'
                const data21 = '"version": "2021-12-29",'
                const data22 = '"name": "ElectronicReportingAndSurveillanceDistribution",'
                const data23 = '"title": "Electronic Reporting & Surveillance Distribution (eRSD)",'
                const data24 = '"status": "active",'
                const data25 = '"experimental": true,'
                const data26 = '"type": {'
                  const data27 = '"coding": ['
                    const data28 = '{'
                      const data29 = '"system": "http://terminology.hl7.org/CodeSystem/library-type",'
                      const data30 = '"code": "asset-collection"'
                    const data31 = '}'
                  const data32 = ']'
                const data33 = '},'
                const data34 = '"date": "2021-12-29",'
                const data35 = '"publisher": "eCR",'
                const data36 = '"description": "Defines the asset-collection library containing the US Public Health specification assets.",'
                const data37 = '"useContext": ['
                  const data38 = '{'
                    const data39 = '"code": {'
                      const data40 = '"system": "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context-type",'
                      const data41 = '"code": "specification-type"'
                    const data42 = '},'
                    const data43 = '"valueCodeableConcept": {'
                      const data44 = '"coding": ['
                        const data45 = '{'
                          const data46 = '"system": "http://hl7.org/fhir/us/ecr/CodeSystem/us-ph-usage-context",'
                          const data47 = '"code": "program"'
                        const data48 = '}'
                      const data49 = ']'
                    const data50 = '}'
                  const data51 = '}'
                const data52= ']'
              const data53 = '}'
            const data54 = '}'
          const data55 = ']'
        const data56 = '}';

        let data = data1 + data2 + data3 + data4 + data5 + data6 + data7 + data8 + data10;
        data = data + data11 + data12 + data13 + data14 + data15 + data16 + data17 + data18 + data19 + data20;
        data = data + data21 + data22 + data23 + data24 + data25 + data26 + data27 + data28 + data29 + data30;
        data = data + data31 + data32 + data33 + data34 + data35 + data36 + data37 + data38 + data39 + data40;
        data = data + data41 + data42 + data43 + data44 + data45 + data46 + data47 + data48 + data49 + data50;
        data = data + data51 + data52 + data53 + data54 + data55 + data56;
        console.log('in create new version: ' + data)
        const dataRes = await fetch(fhirCdrClientDraft.baseUrl, {   //http://localhost:8080/fhir/$createNewVersion', {
          body: data,
          headers: { 
            'Content-Type': 'application/json',
          },
          method: 'POST'
        });
        const json = await dataRes.json();
        res.status(200).send(json)
      } else {
        res.status(400).json({ error: 'Search data is missing to get library. ID, name, title, and version need to be filled out.' })
      }

    } catch (e: any) {
      console.error('error creating new library:  ', e?.response?.data?.text)
      res.status(400).json({ error: 'Creation of new library failed.' })
    }
  }
}
