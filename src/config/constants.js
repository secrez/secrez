const constants = {

  errors: {
    DbNotFound: 'Db not found.',
    KeysNotFound: 'Private and public keys not found',
    BadKeys: 'Either bad format or wrong password',
    RepoExists: 'Repo already exists.',
    NotInitialized: 'The database has not been initialized.',
    NotReady: 'Not ready.',
    SecretNotFound: 'Secret not found.',
    WrongId: 'The id is wrong.',
    InvalidID: 'Invalid id.',
    NotOperative: 'Not operative'
  },

  status: {
    CONSTRUCTED: 10,
    INITIATED: 20,
    READY: 30,
    OPERATIVE: 40
  },

  keys: {
    MANIFEST: '.MANIFEST',
    MASTERKEY: '.MASTERKEY',
    CONFIG: '.CONFIG'
  },

  DEFSALT: '0xPSSWRD'
}

module.exports = constants