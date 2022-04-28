import { StatusCodes } from 'http-status-codes'
import { ReturnResponse } from './lib/endpoint-types'
import axios from 'axios'

export async function handler(event: any, context: any) {
  var res: ReturnResponse = {
    body: 'API CALL RECEIVED',
    statusCode: StatusCodes.BAD_REQUEST,
  }
  if (event.httpMethod == 'POST') {
    const body = JSON.parse(event.body)
    res = await processPostReq(body)
  } else if (event.httpMethod == 'GET') {
    const params = event.queryStringParameters
    res = await processGetRequest(params)
  }
  return res
}

async function processPostReq(body: any): Promise<ReturnResponse> {
  switch (body.function) {
    case 'test':
      return {
        statusCode: StatusCodes.OK,
        body: 'Test POST function executed',
      }
    default:
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        body: 'Default POST Request Response Reached',
      }
  }
}

async function processGetRequest(params: any) {
  switch (params.resource) {
    case 'base_case':
      return {
        statusCode: StatusCodes.OK,
        body: 'Test GET function executed',
      }
    case 'zakat':
      if ((params.region = 'SG')) {
        let nisab_value = await getZakatNisabFromMuis()
        return {
          statusCode:
            nisab_value != undefined
              ? StatusCodes.OK
              : StatusCodes.INTERNAL_SERVER_ERROR,
          body:
            nisab_value != undefined
              ? nisab_value
              : 'Error Getting Nisab Value',
        }
      }
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        body: 'Region not coded yet.',
      }
    default:
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        body: 'Default GET Request Response Reached',
      }
  }
}

async function getZakatNisabFromMuis() {
  let msg = await axios.get('https://www.zakat.sg/current-past-nisab-values/')
  var extractedData = msg.data.split('<h2')[1].split('</h2>')[0].split('>')
  var nisab_value = extractedData[extractedData.length - 1]
    .replace('$', '')
    .replace(',', '')
  return nisab_value
}
