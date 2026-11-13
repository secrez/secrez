# Changelog

**2.2.0-beta.1**

- remove deprecated `bash` command (use `shell` instead)
- `edit` accepts dataset-qualified paths (e.g. `main:/file.yml`)
- in-memory editor: `Ctrl-k` deletes the current line and pulls up the next one
- replace `shell` command implementation: run commands with `spawn` and `cwd` instead of interpolating the working directory into a shell string (fixes command injection via malicious paths)
- harden `ssh` command: validate user and host, pass arguments to `ttab`/`ssh` without shell interpolation (fixes command injection via crafted hostnames)
- replace external editor with an in-memory editor for `edit`: secrets are no longer written to temporary files on disk; removed `-e`/`--editor` and `-i`/`--internal` options (the internal editor is now the only editor)
- add `editorProvider` hook for tests and improve `edit` command test reliability
- vault permissions (FS-1): secure legacy containers to `0o700` dirs / `0o600` files at login
- strengthen password-based export encryption (`.secrez` files): new **v2** format uses PBKDF2 with a random salt stored in the file; password and iteration count are required at import (`-i`); legacy **v1** exports remain importable with password only
- require Node.js 22.23.4 or later (`engines.node >=22.23.4`), matching the October 2026 Node.js security release
- clear cryptographic secrets from memory on `signout`, `quit`, and double `^C` (best-effort buffer zeroing)
- replace deprecated dependencies: `homedir` → `os.homedir`, `ethereumjs-util` → `ethers.getAddress`, `qrcode-reader` → `jsqr`, upgrade `jimp` to 1.x
- harden `totp --from-clipboard` on Linux: run `xclip` with `spawn` and write PNG bytes to disk instead of shell redirection
- companion workspace releases: `@secrez/core@1.1.0`, `@secrez/crypto@1.1.0`, `@secrez/fs@1.1.0`, `@secrez/utils@1.1.0`, `@secrez/eth@0.0.6`
- warn at signup when PBKDF2 iterations are below 100,000 and require explicit confirmation to proceed (KDF-3)

**2.1.16**

- remove legacy second-factor handling from the CLI (`Welcome`, `Conf`)
- refactor `git` command tests to use a local bare repository instead of a private GitHub remote (no SSH keys or external setup required)

**2.1.15**

- add `find -R` to look for recent entries only. With `-l` to set a limit (default 10)

**2.1.14**

- reverse changes done in version 2.1.12
- add a push option to Git that checks if there are changes in the repo and, if so, pushes them remotely, updating the system

**2.1.12**

- enforce the usage of pnpm during global install. When that is not possible, for example with yarn, it blocks the execution asking the user to uninstall and install it again properly

**2.1.11**

- fix warning "(node:70960) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities" caused by the Git checker

**2.1.10**

- add external git change detection to block operations when repository state changes outside of Secrez (e.g., `git pull` in another terminal)
- fix critical cache bug in git conflict detection that prevented external changes from being detected within 30 seconds
- improve git conflict detection tests with comprehensive coverage for both git and non-git repositories

**2.1.9**

- add `<` parameter to reuse the last used path in commands (e.g., `totp <` will use the last path from previous command)
- fix deprecation warning in `execSync` by properly escaping command arguments

**2.1.8**

- add `git` command to check repository status and detect remote changes
- add git conflict detection middleware to prevent conflicts during data-changing operations

**2.1.7**

- add option `--no-export` to `export --crypto-env` to display the encrypted content in the console instead of writing it to a file

**2.1.6**

- export and encrypt, with option `--crypto-env`, the entire content of an item

**2.1.5**

- duplicate files using `touch <newfile> --from <file>` to copy the file from the source to the destination

**2.1.4**

- uses clipboard only on macOS
- fixes `copy` return message when clipboard is not available

**2.1.2**

- disable `copy` command when in headless shells

**2.1.1**

- manage missing clipboard when in headless shells
- fix bug in creating a `totp` when the target Yaml file is empty

**2.0.1**

- fix commands to change password and number of iterations

**2.0.0** (breaking changes)

- remove `@crypto/hub`, `@crypto/courier`, `@crypto/tunnel` and `@crypto/tls` since they are not maintained anymore
- add `show` command to show a card field as a QR code, for example to encode a private key and let a mobile wallet scan it

**1.1.6**

- add support for cryptoEnv format to `export` (look at https://github.com/secrez/cryptoenv for details about CryptoEnv)

**1.1.5**

- fix touch's help showing wrong, temporary options, changed during the development :-(

**1.1.4**

- add clear screen after 180 seconds to avoid that the user forgot its terminal open and accidentally shares it while sharing the screen during meetings — it happened to me :-(
- add option `--timeout, -t` to customize the timeout when launching secrez

**1.1.3**

- add new option `--keystore, -k` to `export`. If a file contains a private key field (i.e., a field with a name containing `private_key`), it can be exported in the keystore format. The file will have the same name with the extension replaced with `.keystore.json`.
- this README has been redacted by ChatGPT to make it more clear and concise.

**1.1.2**

- New options for `touch`:
  - `--wait-for-content` to prompt the user to add the content, instead of expecting it as a parameter. The content will be trimmed at the first newline, if there is any.
  - `--generate-wallet` to generate an Ethereum-compatible wallet in a new card or in an existing one. It generates the fields `private_key` and `address`, with private key and address.
  - `--prefix` in combination with `--generate-wallet` specifies the prefix of the field, calling the fields, for example `my_private_key` and `my_address` if the prefix is `my`.
  - `--amount` in combination with `--generate-wallet` specifies the amount of wallets to generate. The default is 1.

**1.1.1** (unpublished)

- using prettier for consistent formatting

**1.1.0**

- Remove `git`. If used carefully, the command was helpful, but still it is at risk of creating conflicts. After long thoughts, I disapproved my own proposal at: https://github.com/secrez/secrez/pull/163

**1.0.4**

- Fix wrong example in `import`

**1.0.3**

- `git` asks to quit Secrez and merge manually if there are remote changes
- `totp` allows to add a totp code to an existing yaml file using the option `--set` (see the examples)
- Default duration before clipboard reverse for `totp` is now 8 seconds

**1.0.2**

- Export and Import can encrypt/decrypt files using shared keys generated from a specified public key
- Can export ecrypted file for the user itself, files that can be decrypted only from inside the secrez account that exported them

**1.0.1**

- Export and Import can handle encryption. Files can be exported encrypted using a specified password or a key shared with contacts
- Contacts can add a contact also using contact's public key (previously you need a hub url)
- Import specifies the file that have been skipped (because binary, encrypted or both)

**1.0.0**

- Requires `@secrez/utils@1.0.1` which fixes a yaml parsing error with ETH-like addresses

**1.0.0-beta.3**

- Rm allows to delete specific versions of a file

**1.0.0-beta.2**

- Git has new options `--init`, `--remote-url` and `--main-branch` to initiate a repo from inside Secrez

**1.0.0-beta.1**

- use @secrez/core@1.0.0, which changes the encoding from base58 to base64, making the encoding much faster
- remove second factor authentication due to potentially critical issues with Python and the required libraries on macOS (2FA will be restored as soon as either a pure Javascript library is available or using external Python libraries is reliable again)
- `Bash` has been renamed `Shell`

**0.11.0**

- removed support for FIDO2 second factor authentication due to potential critical issues with Python and the required libraries on MacOS (2FA may be restored if a pure Javascript library becomes available)

**0.10.8**

- expose a prompt mock to allow other software to run commands programmatically
- fix bug in totp when the command is called but no totp is set

**0.10.7**

- fix bug in `git -i` showing less changed that expected

**0.10.6**

- use `£` as an alternative to `#` when getting find results (whoops, I made this for myself, because I use both English and Italian keyboards)
- add `leave` to leave a room

**10.0.5**

- fix bug in `git` wrongly returning `already up to date`
- fix `git`'s help

**0.10.4**

- remove spaces in secret when launching `totp`
- add a `--test` option, to test a secret
- remove deprecated `exit`

**0.10.3**

- since it's not possible to clear the entire terminal, the clear screen process creates a false sense of security and has been removed
- fix bug in `ls -l` when there are empty files
- add message to suggest user to clear or close the terminal after quitting

**0.10.2**

- add a `git` command to push changes to the repo and pull changes
- allow to run `bash` without parameters, asking later for the shell command

**0.10.1**

- encrypts binary files as is, without converting them to `base64` strings, like before

**0.10.0**

- use @secrez/hub 0.2.0 and @secrez/courier 0.2.0 (which are incompatible with the previous versions)
- duplicate `whoami` and `contacts` to make them working inside the `chat` environment

**0.9.4**

- fix bug during import, if a `path` contains `:`; now, they are replaced with `_`

**0.9.3**

- fix bug with `ds -l` not working

**0.9.2**

- fix issue in `ls -l` that was working only in the current dataset
- fix dates in `ls -l` in UTC time, instead than in local time

**0.9.1**

- `ls -l` returns details: size, creation date, last update date, number of versions and name

**0.9.0**

- Add `ds` to manage datasets
- `ds` is also able to delete a dataset (moving its content to the `trash` dataset)
- Remove feature `--rename` from `use`, since now `ds` manages the datasets

**0.8.10**

- If the default editor is not defined (env variable EDITOR) try to use nano or vim

**0.8.9**

- Pause clearScreen during editing

**0.8.8**

- Add the option `pathFrom` in `import` to build the `path` field using other fields

**0.8.7**

- Importing from a CSV file generates `.yaml` file instead of `.yml`

**0.8.6**

- Uses new onBeforeRewrite in [inquirer-command-prompt](https://github.com/sullof/inquirer-command-prompt) to remove the `#\d` when autocompleting the result of a search

**0.8.5**

- Fix issue with find results when they include datasets.
- Improve scripts (getting coverage only for modified packages)
- Add a secrez.png as a generic asset

**0.8.4**

- fix issue if a file starts with #\d, like `#2something`

**0.8.3**

- add autocomplete based on `find` results; for example `cat #2` and press `tab` will complete with the second result in the search

**0.8.2**

- fix bug in `show` which listed all the messages

**0.8.1**

- fix bug in `conf` setting a 2FA
- improve encapsulation of the `_Secrez` class

**0.8.0**

- add `contacts` to manage trusted users, i.e, trusted public keys
- add `whoami` to get info about the account
- add @secrez/courier to allow communication between local accounts
- add @secrez/hub for the remote hub
- add @secrez/tunnel to manage the tunneling for the Courier
- add `chat` to enter the chat environemnt, and send/receive messages and data to any trusted user
- add `chat`'s subcommands `join`, `send` and `show`.
- return `find` results as a numbered list, to be used as variable (like `$1`) in following commands
- deprecate `exit` in favor of `quit` to leave rooms, chat and app
- add `ssh` to connect via ssh to a remote server from inside Secrez, to protect private keys without password

**0.7.14**

- fix chained aliases generating prompt duplications

**0.7.13**

- fix autocomplete when single command

**0.7.12**

- adds support for Linux to `totp --from-clipboard`, using `xclip`

**0.7.11**

- returns an alert if `clipboardy` does not find the required libraries

**0.7.10**

- fixes the autocomplete loading the data only when needed

**0.7.9**

- fix bug in MainPrompt.js which caused an exit if command not found

**0.7.8**

- upgrade `@secrez/core` to `0.7.1` which fixes an error if `env.json` does not exists

**0.7.7**

- aliases now accept params (ex. `alias x -c 'copy $1 && ls $2 $1')

**0.7.6**

- `rm` ask confirmation before delete forever from the `trash` dataset
- `edit` does not crash if no path is passed

**0.7.5**

- `totp` can read an image to scan a qrcode and recover its secret
- on MacOs, `totp` can also read the image from the clipboard to recover its secret; it requires `pngpaste`

**0.7.4**

- fix bug in autocomplete showing the error stack
- add script to upgrade the versions of any changed packages

**0.7.3**

- `find` ignores `trash` during global searches if not using `--trash-too`
- update to `@secrez/fs 0.7.2`, which fixes a bug in the `DataCache` class

**0.7.2**

- `totp` allows to generate TOTP codes (like Google Authenticator)
- add option `--wait` to `copy` to force it to wait the end of the execution
- `alias` handles chains of commands, like `copy coinbase.yml -f email password -d 3 2 --wait && totp coinbase.yml`

**0.7.1**

- Calling a command with unknown options will generate an error
- Fix issue moving duplicates
- Adds to `mv` an explicit destination field

**0.7.0**

- Introduce a more secure derivation process, using the iterations number in the salt. During the upgrade existing second factors of authentication will be removed
- Allow to change password and number of iterations in `conf`. BE CAREFUl, any change in `conf` can cause conflicts in a remote repo. Don't do the same changes parallelly

**0.6.5**

- Add `duration` to `export` to delete the exported file after the duration (in seconds)

**0.6.4**

- Add `alias` to generate alias of any command

**0.6.3**

- Minor bug fix

**0.6.2**

- `copy` can put many fields in the clipboard, scheduling them

**0.6.1**

- Add support for U2F keys (Yubikey, Solokeys, etc.)
- `ls` now returns sorted results
- Fixed bug with `mv` and `rm` when using wildcards
- Dynamic format for help, managing large examples

**0.6.0**

- Allow multiple datasets; `main` and `trash` exists by default
- At start, purges old trees after successfully loading a dataset
- `use` allows to use and create new dataset
- `mv` supports `-d, --destination` for the destination
- `mv` allows to move files among datasets with a syntax like `mv somefile archive:/` or `mv archive:somefile main:/some/`
- `mv` adds `--find` and `--content-too` to use the result of a search as input
- `mv`, if no destination set, asks if like to use the active directory in the target dataset
- `ls -o d` and `ls -o f` to limit the listing only to folders or files
- `copy` allows to select the field to copy in yaml files
- Improve autocomplete to handle datasets
- Fix autocomplete in `lcat`, which was wrongly using the internal files
- `tag` is able to list and show tags along all the datasets, anche can use `--find` like `mv`

**0.5.13**

- Find in content excludes binary contents

**0.5.12**

- Optimize find inside contents caching the data
- Fix an error returning wrong cases in the results
- Remove an unnecessary message when nothing is recovered

**0.5.11**

- Use tags to prefix the path during import

**0.5.10**

- Fix the README that was not aligned

**0.5.9**

- Add Paste to paste the clipboard content in either a new or existent file, emptying the clipboard
- Fix bug with Copy that was preventing the command from working

**0.5.8**

- Allow Import, with the options `-t`, to recognize tags during the import from CSV
- Split Export in Export and Copy. The first only exports to the FS, the second copies to the clipboard

**0.5.7**

- Add wildcard support for Import, Mv, Rm and Tag
- Add support for recursion during import

**0.5.6**

- Add Tag command to tag files and folders

**0.5.5**

- Optimize Import avoiding intermediate saves of the tree
- Fix an issue with iterations at launch

**0.5.4**

- Add Import of many entries from CSV and JSON files

**0.5.3**

- Use Yaml files as cards, being able to read and edit single fields

**0.5.2**

- Remove obfuscation of the tree before saving (it was an overkill)

**0.5.1**

- Add Find to search in files and folders

**0.5.0**

- First stable version

Versions < 0.5.0 are deprecated because the format was sligtly different and they are incompatible.
