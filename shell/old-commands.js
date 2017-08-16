
module.exports = function (secrez) {

  const handlers = require('./handlers')(secrez)

  return [
    {
      name: 'login',
      help: 'Login in your local account',
      // context: 'setup',
      handler: handlers.login,
      options: {
        password: {
          help: 'Your master password',
          required: true
        }
      },
      isAvailable: handlers.isReady
    },

    {
      name: 'signup',
      help: 'Signup to your local account',
      // context: 'setup',
      handler: handlers.signup,
      options: {
        password: {
          help: 'Your master password',
          required: true
        }
      },
      isAvailable: handlers.isInitiated
    },
    {
      name: 'new',
      help: 'Create a new secret',
      context: 'secret',
      handler: handlers.newSecret,
      options: {
        name: {
          help: 'A name for the new secret',
          required: true
        }
      },
      isAvailable: handlers.isOperative
    }

    // ,
    // {
    //   name: 'use',
    //   help: 'Uses a specific store',
    //   // context: 'setup',
    //   handler: handlers.use,
    //   options: {
    //     name: {
    //       help: 'Name of the store',
    //       required: false,
    //       defaultValue: 'default_store'
    //     }
    //   },
    //   isAvailable: handlers.isUseAvailable
    // }
  ];

};
