/* globals Promise */

module.exports = function (secrez) {

  class Handlers {
    login(cmd, options, ctx) {
      const password = options.password;
      secrez.login(password)
          .then(() => {
            return Promise.resolve(console.log('Your data are available.'))
          })
    }

    signup(cmd, options, ctx) {
      const password = options.password;
      secrez.signup(password)
          .then(() => {
            return Promise.resolve(console.log('Your data are available.'))
          })
    }

    newSecret(cmd, options, ctx) {
      const name = options.name
      secrez.newSecret(name)
          .then(() => {
            return Promise.resolve(console.log(''))
          })
    }


    // control methods

    isInitiated() {
      return secrez.isInitiated()
    }


    isReady() {
      return secrez.isAccountEmpty()
    }

    isOperative(ctx) {
      return secrez.isOperative()
    }

  }

  return new Handlers()

}
