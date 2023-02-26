const Crypto = require("@secrez/crypto");

class FileCipher {
  constructor(secrez) {
    if (secrez.constructor.name === "Secrez") {
      this.secrez = secrez;
    } else {
      throw new Error(
        "FileCipher requires a Secrez instance during construction"
      );
    }
  }

  shortPublicKey(pk) {
    return pk.split("$")[0].substring(0, 16);
  }

  getUint8ArrayPassword(password) {
    return Crypto.bufferToUint8Array(Crypto.SHA3(password));
  }

  encryptFile(content, options) {
    let key = Crypto.generateKey();
    let result = [
      "1", //version
      Crypto.encrypt(content, key),
    ];
    if (options.password) {
      result[2] = Crypto.encrypt(
        key,
        this.getUint8ArrayPassword(options.password)
      );
    } else {
      const myShort = this.shortPublicKey(this.secrez.getPublicKey());
      result[2] = myShort;
      if (options.publicKeys) {
        for (let publicKey of options.publicKeys) {
          let short = this.shortPublicKey(publicKey);
          let encKey =
            short === myShort
              ? this.secrez.encryptData(key) // encrypted for themself
              : this.secrez.encryptSharedData(key, publicKey);
          result.push(short + encKey);
        }
      }
    }
    return result;
  }

  decryptFile(encryptedContent, options) {
    if (typeof encryptedContent === "string") {
      encryptedContent = encryptedContent.split(",");
    }
    const [version, content, passwordOrShortPublicKey, ...keys] =
      encryptedContent;
    if (version === "1") {
      if (keys && keys.length) {
        let myShort = this.shortPublicKey(this.secrez.getPublicKey());
        let contactPublicKey = options.contactPublicKey;
        if (!contactPublicKey) {
          for (let pk of options.contactsPublicKeys || []) {
            if (this.shortPublicKey(pk) === passwordOrShortPublicKey) {
              contactPublicKey = pk;
              break;
            }
          }
        }
        let key;
        for (let item of keys) {
          let short = item.substring(0, 16);
          item = item.substring(16);
          if (myShort === short) {
            key =
              myShort === passwordOrShortPublicKey
                ? this.secrez.decryptData(item)
                : this.secrez.decryptSharedData(item, contactPublicKey, true);
          }
        }
        if (!key) {
          throw new Error("The sender didn't encrypt the data for you");
        }
        return Crypto.decrypt(content, key);
      } else {
        if (!options.password) {
          throw new Error("A password is required");
        }
        let key = Crypto.decrypt(
          passwordOrShortPublicKey,
          this.getUint8ArrayPassword(options.password)
        );
        return Crypto.decrypt(content, key, options.returnUint8Array);
      }
    } else {
      throw new Error("Unsupported version");
    }
  }
}

module.exports = FileCipher;
