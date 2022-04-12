import { StatusCodes } from 'http-status-codes'

export interface ReturnResponse {
  body: String | undefined
  statusCode: StatusCodes
}

export interface GetQueryParams {
  region: String | undefined
  resource: String
}
