class ContactManager {
  constructor(cache) {
    this.cache = cache;
  }

  get(contact) {
    return this.cache.get("contact", contact);
  }

  validateName(name) {
    if (!/^(\w|-)+$/g.test(name)) {
      return `The name "${name}" is invalid. Aliases' names can be any combination of upper and lower letters, numerals, underscores and hiphens`;
    }
  }

  async create(options) {
    /* istanbul ignore if  */
    if (this.get(options.name)) {
      throw new Error(`A contact named "${options.name}" already exists`);
    }
    return await this.cache.puts("contact", {
      value: options.name,
      content: JSON.stringify({
        publicKey: options.publicKey
      }),
    });
  }

  async remove(contact) {
    return await this.cache.remove("contact", contact);
  }

  async empty() {
    let allContacts = Object.keys(this.get());
    for (let contact of allContacts) {
      await this.cache.remove("contact", contact);
    }
  }

  async rename(existentName, name) {
    let old = this.get(existentName);
    let {publicKey} = JSON.parse(old.content);
    if (await this.remove(existentName)) {
      return await this.create({
        name,
        publicKey
      });
    }
  }
}

module.exports = ContactManager;
