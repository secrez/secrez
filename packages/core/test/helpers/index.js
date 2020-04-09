
const helpers = {

  sleep: millis => {
    return new Promise(resolve => setTimeout(resolve, millis))
  }

}


module.exports = helpers
