/* globals Promise */

module.exports = function (psswrd) {

  class Handlers {
    login(cmd, options, ctx) {
      const password = options.password;
      psswrd.login(password)
          .then(() => {
            return Promise.resolve(console.log('Your data are available.'))
          })
    }

    signup(cmd, options, ctx) {
      const password = options.password;
      psswrd.signup(password)
          .then(() => {
            return Promise.resolve(console.log('Your data are available.'))
          })
    }

    newSecret(cmd, options, ctx) {
      const name = options.name
      psswrd.newSecret(name)
          .then(() => {
            return Promise.resolve(console.log(''))
          })
    }


    // control methods

    isInitiated() {
      return psswrd.isInitiated()
    }


    isReady() {
      return psswrd.isAccountEmpty()
    }

    isOperative(ctx) {
      return psswrd.isOperative()
    }

  }

  return new Handlers()

}
