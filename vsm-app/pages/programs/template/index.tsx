import handler from "pages/api/template";

async function getNextVersion() {
  console.log('Making next version call');
  let request: any;
  let response: any;
  const result = await handler(request, response);
  console.log('Done making next version call: ' + result.body);
}
  
getNextVersion();