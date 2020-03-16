const assert = require('chai').assert

module.exports = async function (func, expectedError, expectedErrorContains) {
  let errMsg
  try {
    await func
  } catch (e) {
    if(e.message)
      errMsg = e.message
    else
      errMsg = e
    if(expectedError)
      assert.equal(errMsg, expectedError)
    else if(expectedErrorContains)
      assert.notEqual(errMsg.indexOf(expectedErrorContains), -1)
    else assert.isTrue(true)
  }
  if(!errMsg)
    assert.isTrue(false)
}
