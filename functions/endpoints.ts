import { StatusCodes } from 'http-status-codes'
import { ReturnResponse } from './lib/endpoint-types'
import axios, { AxiosError } from 'axios'

const TELE_BOT_KEY = process.env.TELE_BOT_KEY || ''
const DEV_ID = process.env.DEV_ID || ''

export async function handler(event: any, context: any) {
  var res: ReturnResponse = {
    body: 'API CALL RECEIVED',
    statusCode: StatusCodes.BAD_REQUEST,
  }
  let err = new Error('Unknown error thrown')
  try {
    if (event.httpMethod == 'POST') {
      const body = JSON.parse(event.body)
      res = await processPostReq(body)
    } else if (event.httpMethod == 'GET') {
      const params = event.queryStringParameters
      res = await processGetRequest(params)
    }
  } catch (e) {
    if (e instanceof Error) {
      err = e
    }
    await processError(err)
    console.log(e)
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
  try {
    var extractedData = msg.data.split('<h2>')[1].split('</h2>')[0].split('>')
    var nisab_value = extractedData[extractedData.length - 1]
      .replace('$', '')
      .replace(',', '')
  } catch (e) {
    throw new Error(
      `Error Getting Nisab Value from MUIS. Suspected change in format. Current Parsing: via h2 tag`,
    )
  }
  return nisab_value
}

async function processError(errorMsg: Error) {
  await sendMessage(TELE_BOT_KEY, DEV_ID, `<b>Error encountered</b>:`)
  await sendMessage(TELE_BOT_KEY, DEV_ID, `${errorMsg.message}`)
}

const TELE_API = 'https://api.telegram.org/bot'

/**
 * Sends a message via the bot
 * @param bot_key
 * @param chat_id
 * @param text
 * @param reply_markup
 * @returns
 */
async function sendMessage(
  bot_key: string,
  chat_id: number | string,
  text: string,
  reply_markup: TeleInlineKeyboard = {} as TeleInlineKeyboard,
) {
  return new Promise((resolve, reject) => {
    axios
      .post(TELE_API + bot_key + '/sendMessage', {
        chat_id: chat_id,
        text: text,
        parse_mode: 'HTML',
        reply_markup: reply_markup,
      })
      .then((res) => {
        const msgDetails = res.data.result
        console.log(`Message posted (id: ${msgDetails.message_id})`)
        resolve(res.data)
      })
      .catch((err) => {
        reject(convertError(err))
      })
  })
}

interface TeleInlineKeyboard {
  inline_keyboard: [[TeleInlineKeyboardButton]]
}

interface TeleInlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
  //login_url?: LoginUrl
  switch_inline_query?: string
  switch_inline_query_current_chat?: string
  // callback_game?: CallbackGame
  pay: boolean
}

export const ERROR_CODES = {
  0: 'default',
  1: 'Missing Bot Key',
  2: 'Message (to delete) not found',
  3: 'Message (to edit) not found',
  4: 'Message cannot be edited',
  5: 'Missing chat_id',
  6: 'Message to be updated is exactly the same',
  7: 'User has blocked/deleted the bot or has not activated the bot',
}

// --- Error parsing function
export function convertError(err: AxiosError): TeleError {
  if (err.response && err.response.data.description == 'Not Found') {
    return { errorCode: 1, message: ERROR_CODES[1], name: 'TeleError' }
  } else if (
    err.response &&
    err.response.data.description == 'Bad Request: message to delete not found'
  ) {
    return { errorCode: 2, message: ERROR_CODES[2], name: 'TeleError' }
  } else if (
    err.response &&
    err.response.data.description == 'Bad Request: message to edit not found'
  ) {
    return { errorCode: 3, message: ERROR_CODES[3], name: 'TeleError' }
  } else if (
    err.response &&
    err.response.data.description == "Bad Request: message can't be edited"
  ) {
    return { errorCode: 4, message: ERROR_CODES[4], name: 'TeleError' }
  } else if (
    err.response &&
    err.response.data.description == 'Bad Request: chat_id is empty'
  ) {
    return { errorCode: 5, message: ERROR_CODES[5], name: 'TeleError' }
  } else if (
    err.response &&
    err.response.data.description ==
      'Bad Request: message is not modified: specified new ' +
        'message content and reply markup are exactly the same ' +
        'as a current content and reply markup of the message'
  ) {
    return { errorCode: 6, message: ERROR_CODES[6], name: 'TeleError' }
  } else if (
    err.response &&
    err.response.data.description == 'Forbidden: bot was blocked by the user'
  ) {
    return { errorCode: 7, message: ERROR_CODES[7], name: 'TeleError' }
  } else {
    return {
      errorCode: 0,
      message: err.response ? err.response.data.description : 'No error desc.',
      name: 'TeleError',
    }
  }
}

interface TeleError extends Error {
  errorCode: number
}
