console.log('hello world')
const axios = require('axios')
axios.get('https://www.zakat.sg/current-past-nisab-values/').then((msg) => {
  var extractedData = msg.data
    .split("Today's Nisab Value")[1]
    .split('</h2>')[0]
    .split('>')
  var nisab_value = extractedData[extractedData.length - 1]
    .replace('$', '')
    .replace(',', '')

  console.log(nisab_value)
})
