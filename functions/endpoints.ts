import { StatusCodes } from 'http-status-codes'
import { ReturnResponse } from './lib/endpoint-types'
import axios, { AxiosError } from 'axios'
import chromium  from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const getPuppeteer = async () => {
  return await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.CHROME_PATH || (await chromium.executablePath()),
    headless: true,
  })
}

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
        let nisabValue
        try {
          nisabValue = await getZakatNisabFromMuisFromGoogle()
        } catch (e) {
          // Do nothing
        }
        if (!nisabValue)
          nisabValue = await getZakatNisabFromMuisPuppeteer()
        return {
          statusCode:
            nisabValue != undefined
              ? StatusCodes.OK
              : StatusCodes.INTERNAL_SERVER_ERROR,
          body:
            nisabValue != undefined
              ? nisabValue
              : 'Error Getting Nisab Value',
        }
      }
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        body: 'Region not coded yet.',
      }
    case 'test':
      console.log('testing...')
      var zakat = await getZakatNisabFromMuisFromGoogle()
      if (zakat)
        return {
          statusCode: StatusCodes.OK,
          body: zakat
        }
      return {
        statusCode: StatusCodes.FORBIDDEN,
        body: "Error getting Nisab Value"
      }
    default:
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        body: 'Default GET Request Response Reached',
      }
  }
}

// Request fail because they implemented Cloudflare
async function getZakatNisabFromMuis() {
  const headers = {
    'X-Custom-Header': 'foobar',
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": `"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"`,
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "upgrade-insecure-requests": 1,
    "sec-ch-ua-platform": "macOS",
  
    "host": "www.zakat.sg",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
  }
  let msg;
  try {
    msg = await axios.get('https://www.zakat.sg/current-past-nisab-values/', {
      headers
    })

    var extractedData = msg.data.split('<h2')[1].split('</h2>')[0].split('>')
    var nisabValue = extractedData[extractedData.length - 1]
      .replace('$', '')
      .replace(',', '')
  } catch (e) {
    throw new Error(
      `Error Getting Nisab Value from MUIS. Suspected change in format. Current Parsing: via h2 tag
      
      ${JSON.stringify(e)}`,
    )
  }
  return nisabValue
}

async function getZakatNisabFromMuisFromGoogle() {
  const headers = {
    'X-Custom-Header': 'foobar',
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": `"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"`,
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "upgrade-insecure-requests": 1,
    "sec-ch-ua-platform": "macOS",
  
    "host": "www.google.com",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
  }
  let msg;
  try {
    msg = await axios.get('https://www.google.com/search?q=singapore+muis+nisab+value+this+year', {
      headers
    })

    var nisabValueStr = msg.data.split('<span class="hgKElc"><b>')[1].split('</b>')[0]
    var nisabValue = nisabValueStr.replace('$', '').replace(',', '')
  } catch (e) {
    throw new Error(
      `Error Getting Nisab Value from Google. Suspected change in format. Current Parsing: via <span class="hgKElc"><b>NISAB_VALUE</b> tag 
      
      ${JSON.stringify(e)}`,
    )
  }
  return nisabValue
}

// Doesn't work locally. Need to install a better version of chromium.
async function getZakatNisabFromMuisPuppeteer() {
  const browser = await getPuppeteer();
  let zakat, nisabValue

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0')
  await page.setJavaScriptEnabled(true)
  await page.setViewport({width: 1080, height: 1024});
  try {
    await page.goto('https://www.zakat.sg/current-past-nisab-values/');
    const zakatSelector = 'h2';
    const zakatElement = await page.waitForSelector(zakatSelector);
    if (zakatElement) {
      zakat = await zakatElement.evaluate((el) => el.textContent)
      if (zakat)
        nisabValue = zakat.replace('$', '').replace(',', '')
    }
  } catch (e) {
    console.log("Pupetteer error: ", JSON.stringify(e))
    throw new Error(
      `Error Getting Nisab Value from MUIS (Puppeteer). Suspected change in format. Current Parsing: via h2 tag
      
      ${JSON.stringify(e)}`,
    )
  }
  page.close()
  browser.close()
  return nisabValue
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
