# Secrez

<h1 align="center">
  <img align="center" src="https://raw.githubusercontent.com/secrez/secrez/master/assets/secrez_2.png" width="300"/>
</h1>

<p align="center">
  <a href="https://discord.gg/whsgXj">
    <img src="https://img.shields.io/badge/chat-on%20discord-brightgreen.svg">
  </a>

  <a href="https://github.com/secrez/secrez/issues">
    <img src="https://img.shields.io/github/issues/secrez/secrez.svg">
  </a>

  <a href="https://github.com/secrez/secrez/pulls">
    <img src="https://img.shields.io/github/issues-pr/secrez/secrez.svg">
  </a>

  <a href="https://github.com/secrez/secrez/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/secrez/secrez.svg">
  </a>

  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/secrez/secrez.svg">
  </a>
</p>

Secrez is:
* a CLI secret manager working as an encrypted file system;
* a decentralized surveillance-resistant end-to-end encrypted messaging system.

## Intro

At the very basic, Secrez is a CLI application that manages a particular encrypted file system, with commands working similarly to Unix commands like `cd`, `mkdir`, `ls`, `mv`, etc.

The idea is to interact with encrypted virtual files as if they are just files in a standard file system.


## Why Secrez?

There are two primary approaches to secrets and password management:

1. Online systems that save the data online (like LastPass)
2. Desktop tools who keep data in the computer (like KeyPass)

An Online Password Manager requires that you trust the remote server.
I founded Passpack in 2006, and I know very well how, at any moment, you can add a backdoor —— even only for a specific user —— and most likely nobody will notice it.

The second case, a desktop tool is intrinsically more secure, but it is hard to use on more than one computer.
The standard solution is to backup the database on Dropbox or Google Drive and —— before using it —— download it locally, which is prone to produce unfixable problems and cause data loss.

Secrez's goal is to be as safe as KeyPass but available everywhere, like Lastpass.

To obtain this goal, Secrez assembles a few strategies:

- Any secret is a local file
- Any file — besides if it is a tree version, a directory, a text file, or a binary file — is immutable
- Any change can be pulled/pushed to a remote private repo

You can either create a private repo on GitHub, BitBucket, etc. or — much better — setting your own, self-hosted git server.

For now, this is a manual approach. In a future version, the git repo will be manageable from inside Secrez.

## The structure

Secrez simulates an operating system. When you load the environment, you can execute commands like `ls`, `mv`, etc. similarly to what you normally to in a Unix terminal.

Starting from version `0.6.0`, the data are organized in datasets. Think of them like separate disks, something like `/dev/disk1` and `/dev/disk2`.

By default, Secrez generates two datasets: `main` and `trash`. You can create more with, for example, `use -c archive`. The advantage of multiple datasets is mostly for people who have a lot of secrets to manage. If you have 2,000, if they are all in the primary dataset, the system will probably become quite slow. The solution is to move data to separate datasets (`archive`, `backup`, `twitter`, `cryptos`, etc.)


## Secrez never lose secrets

One of the primary goal of a secrets manager is that you will never lose any data.

However, since only the most recent index is read, some secrets could be in the folder and not been loaded.

Let do an example. Alice uses Secrez on computer A and computer B. The two data sets are aligned. Suddenly, GitHub is down and she has to make some change on both computers.

When GitHub is up again, she pushes master on A and everything goes fine.

She pulls on B and pushes.
Now, the data online are not consistent because the most recent tree (from B) does not contains the new changes saved previously on A, i.e., some secrets are in one index, some are in the other one.

No problem. When Alice restart Secrez, the system finds the extra secrets, reads their positions from the previous indexes and puts them back in the tree.

Since files are immutable, the strategy is not obvious. This is what happens in different cases:

1. The recovered secret is in a folder that does not exists in the "official" index. In this case, the entire path is added using the encrypted data of the recovered secret
2. The secret is a file in a folder that actually exists. The file is added as is, but the folders with existent paths are trashed.
3. The secret is a file but a file with the same name exists in the same position. The system checks the content of the file. If it is the same, the secret is ignored, if not it is added as a version.

Either any unused secret or secret that is rewritten (as a version) is trashed (you can check them in the `trash` dataset).

In any case, all the contents are kept.

To avoid to repeat the same process on the other computer (which will generate files with different IDs and more deleted items), Alice should align the repo on A before doing anything there. But, if she does not, nothing will be lost anyway.

## The name convention

A file name in Secrez looks like
```
1VAnGLojzCDWhfZRK8PCYK203WBzJkAA28FhKHdS7DM5SkJaTgYdGfN1MAjTdfUYSzvtDVsMJvGodoHWzMuK6zr
```
where `1` is the type (DIR, other types are TEXT and BINARY), and the rest is a encrypted message with nonce, in Base58 format.

The encrypted part is the combination of id, timestamp, and actual filename.
This implies that, at bootstrap, Secrez must read all the files' names and build a tree of the entire file system. This is done using particular files: trees. Only after reading all the data, Secrez is able to understand which is the tree and, if something is missed, add the missing secrets. Since everything is encrypted, there is no information deductible from the files on disk, except what you can deduct from the Git repo (mostly about versioning and timestamp). But the idea is to use a private repo, so this is a minor issue.

To mitigate this risk, you can create a new Git repo, save everything as the first commit, and delete the previously used repo. This way, you lose the repo's history, but you also lose info about timestamps and versions in case someone gains access to the repo.

## The tree

Secrez manages trees as single immutable files. During a session, temporary files are deleted to keep their number low, but at the exit, the last file remains in the repo.

## The cryptographic foundation

After comparing many possibilities, Secrez uses [NaCl](https://github.com/dchest/tweetnacl-js) as a crypto library. The advantage is that the library includes many algorithms for synchronous and asynchronous encryption.


## How to install it

First, Secrez require at least Node 10. If you have installed a previous version it will generates unclear errors and refuse to install or work. I suggest you install Node using `nvm`, if you can. For more info look at [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm).

To install Secrez globally you can use Npm

```
npm install -g secrez
```

but, since this monorepo uses pnpm, it is even better if you use pnpm because the lock file will be used avoiding unespected conflicts among modules.  
To install pnpm run

```
npm i -g pnpm
```
and later
```
pnpm i -g secrez
```

## How to use it

In the simplest case, you can just run
```
secrez
```

At first run, Secrez will ask you for the number of iterations (suggested between 500000 and 1000000, but the more the better) and a master password — ideally a phrase hard to guess, but easy to remember and type, something like, for example "heavy march with 2 eggs" or "grace was a glad president".

Since Secrez derives a master key from your password using `crypto.pbkdf2`, the number of iterations is a significant addition to the general security because the number of iterations is part of the salt used for the derivation. Even if you use a not-very-hard-to-guess password, if the attacker does not know the number of iterations, he has to try all the possible ones. Considering that 2,000,000 iterations require a second or so, customizable iterations increases enormously the overall security.

At first launch, you can also explicitly set up the number of iterations:
```
secrez -i 1023896
```
or
```
secrez -si 876352
```
where the `-s` option saves the number locally in a git-ignored `env.json` file. This way you don't have to retype it all the time to launch Secrez (typing a wrong number of iterations, of course, will produce an error).

You can save locally the number of iterations adding the options `-s`, like:
```
secrez -s
```

It is possible that the number of iterations you chose makes the initial decryption too slow. You can change it inside the Secrez CLI with the command `conf`.

Other options at launch are:

- `-l` to set up the initial "external" folder on you computer
- `-c` to set up the container (i.e, the folder) where the encrypted data are located

By default, both folders are your homedir (`~`).

Running Secrez in different containers (with the `-c` option), you can set up multiple independent encrypted databases. For example:
```
secrez -c ~/data/secrez
```

## How to set up a Git repo for the data

The best way to go is to set up a repo on your own server. If you can't do that, using a private repo on a service like GitHub is not a bad option. Let's see how you can configure it in this second case.

First, you go to GitHub and create a new private repo. Don't add anything like README, Licence, etc. In the next page, GitHub will show you the command you must run to set up it locally. Here is an example, imagining that your data are in the default folder

```
git --init --main-branch main
git --remote-url git@github.com:sullof/jarrabish.git
```

To push any change run
```
git -p
```
and, if you pushed changes to the repo on some other computer, to pull and merge, run
```
git -P
```
Notice that the lowercase `p` is an alias for `push` and the uppercase `P` for `pull`.

### What if I have a private remote repo?

You should use Git anyway, to have a safe backup of your data. In this case, just run
```
git --init
```
to set the repo up. After, use `git -p` to commit your changes. It will allow you to reverse the data in case some critical error occurs. When you have a private repo, you can just add the remote url (see example above).

If you need more, you can run commands using Shell, like
```
shell "cd ~/.secrez && git log"
```
However, if you like to do some reset, you should quit and run the commands directly in the shell.

**Be careful when you do anything inside your container, you can irreversibly damage your data.**

### What about Mercurial or Subversion?

You can use a different version control system.  
If you do so, though, be careful to correctly set up in the directory the equivalent of `.gitignore` to avoid pushing to the repo also data that must exist only locally.

## The commands

```
  alias     Create aliases of other commands.
  cat       Shows the content of a file.
  cd        Changes the working directory.
  chat      Enters the Secrez chat
      contacts  Manages your contacts
      help      This help.
      join      Joins conversation.
      leave     Leaves a room
      quit      Quit the chat environment
      send      Sends either a room or the chat
      show      Show chat history in a room
      whoami    Show data that other users need to chat with you
  conf      Configure security data (2FA, password, number of iterations).
  contacts  Manages your contacts
  copy      Copy a text file to the clipboard.
  courier   Configure the connection to a local courier
  ds        Manages datasets
  edit      Edits a file containing a secret.
  exit      << deprecated - use "quit" instead
  export    Export encrypted data to the OS in the current local folder
  find      Find a secret.
  git       Pushes to a repo and pulls from a repo.
  help      This help.
  import    Import files from the OS into the current folder
  lcat      Similar to a standard cat in the external fs.
  lcd       Changes the external working directory.
  lls       Browses the external directories.
  lpwd      Shows the path of the external working directory.
  ls        Browses the directories.
  mkdir     Creates a directory.
  mv        Moves and renames files or folders.
  paste     Paste whatever is in the clipboard in an encrypted entries.
  pwd       Shows the path of the working directory.
  quit      Quits Secrez.
  rm        Removes one or more files and folders.
  shell     Execute a bash command in the current disk folder.
  ssh       Opens a new tab and run ssh to connect to a remote server via SSH
  tag       Tags a file and shows existent tags.
  totp      Generate a TOTP code if a totp field exists in the card.
  touch     Creates a file.
  use       Uses a specific dataset.
  ver       Shows the version of Secrez.
  whoami    Show data that other users need to chat with you
  
```

## Some example

```
cat myPrivateKey
```

This command will show the content of an encrypted file, which is called `myPrivateKey`. In particular, it will show the latest version of the file.

Adding options to the command, it is possible to either see a specific version or list all the versions.

The versioning is very important in Secrez because the primary way to backup and distribute the data is using Git. In this case, you want to avoid conflicts that can be not fixable because of the encryption. So, every time there is a change, an entirely new file is created, with metadata about its id and timestamp.

The timestamp is used to assign a version to the file. A version is a 4-letters hash of the timestamp.

Another example:

```
import ~/Desktop/myWallet.json -m
```

This command takes the standard file myWallet.json, contained in the Desktop folder, encrypts it, saves it in the encrypted file system, and removes (-m) it from the original folder.

This is one of my favorite commands. In fact, let's say that you have just downloaded the private key to access your crypto wallet, you want to encrypt it as soon as possible. With Secrez, you can import the file and delete the cleartext version in one command.

## Aliases — where the fun comes :-)

Suppose that you have a card for your bank and want to log into it. You could copy email and password to the clipboard to paste them in the browser. Suppose that you expect to be able in 4 seconds to move from the terminal to the browser, you could run the command:
```
copy bank.yml -f email password -d 4 2
```
This will copy the email field and give you 4 seconds to paste it in the browser. Then, it will emit a beep and you have 2 seconds to paste the password. It sounds quite useful, but it can be better.

If you use that login often, you could like to create an alias for it with:
```
alias b -c "copy bank.yml -f email password -d 4 2
```
Next time, you can just type
```
b
```
It looks great, right? Well, it can be even better.

Let’s say that you are using a 2FA app (like Google Authenticator) to connect to a website, for example, GitHub. Suppose that you have a file github.yml with a field totp which is the secret that GitHub gave you when you activated the 2FA. You could execute
```
totp github.yml
```
to generate a TOTP token for GitHub. The token will be shown and copied in the clipboard. Now, you can create an alias like this
```
alias G -c "copy github.yml -f username password -d 4 2 --wait && totp github.yml"
```
Can you guess what this will do?

* It copies the username in the clipboard;
* it waits 5 seconds, emits a beep and copies the password;
* it waits 3 seconds, emits a beep and copies the TOTP token and keep it in the clipboard.

You can also use parameters in aliases and create a macro like
```
alias M -c "copy $1 -f username password -d 4 2 --wait && totp $1"
```
and call it with
```
M github.yml
```
It is fantastic, isn’t it?

_Btw, using a TOTP factor in Secrez is a bit of a contradiction, because you are converting a second factor (something that you have) in a first factor (something that you know). So, use this feature only when it makes sense._

## Importing from other password/secret managers

From version 0.5.2, Secrez supports import of backups from other softwares.

Suppose you have exported your password in a CSV file name export.csv like this:
```
Path,Username,Password,Web Site,Notes
twitter/nick1,nick1@example.com,938eyehddu373,"http://cssasasa.com"
facebook/account,fb@example.com,926734YYY,,personal
somePath,,s83832jedjdj,"http://262626626.com","Multi
line
notes"
```
It is necessary a field named `path` because if not Secrez does not know where to put the new data. The path is supposed to be relative, allowing you to import it in your favorite folder.

For example, to import it in the `1PasswordData` you could call
```
import export.csv -e 1PasswordData -t
```
The parameter `-e, --expand` is necessary. If missed, Secrez will import the file as a single file.

Internally, Secrez converts the CSV in a JSON file like this:
```
 [
    {
      path: 'twitter/nick1',
      username: 'nick1@example.com',
      password: '938eyehddu373',
      web_site: 'http://cssasasa.com'
    },
    {
      path: 'facebook/account',
      username: 'fb@example.com',
      password: '926734YYY'
    },
    {
      path: 'somePath',
      password: 's83832jedjdj',
      web_site: 'http://262626626.com',
      notes: 'Multi\nline\nnotes'
    }
  ]
```
which means that you can also format your data as a JSON like that and import that directly with
```
import export.json -e 1PasswordData
```

Any item will generate a single Yaml file, like, for example, the last element in the JSON, will generate the file `/1PasswordDate/somePath.yml` with the following content:
```
password: s83832jedjdj
web_site: http://262626626.com
notes: |-
  Multi
  line
  notes
```

When you edit the new file, Secrez recognize it as a card and asks you which field you want to edit (if you don't explicit it with, for example, `-f password`) and edit just that field.

At the end of the process, you can remove the original backup, adding the option `-m`.
You can also simulate the process to see which files will be created with the option `-s`.

If in the CSV file there is also the field `tags`, you can tag automatically any entries with the options `-t, --tags`. If you don't use the option, instead, they will be saved in the yaml file like any other field.

### What if there is no path field?

Let's say that you want to import a CSV file exported by LastPass. There is not `path` field but you probably want to use the fields `grouping` and `name` to build the path. From version `0.8.8`, you can do it, launching, for example:
```
import ~/Downloads/lastpass_export.csv -e lastpass -P grouping name
```
or, if you like to put everything in the folder `lastpass` without generating any subfolder, you can just run
```
import ~/Downloads/lastpass_export.csv -e lastpass -P name -m
```
using only the `name` field. Still, if in the name there is any slash, a subfolder will be created. The `-m` option will remove the csv file from the OS.

In these two examples, be sure that any of your entries in LastPass has a name. If not, the import will fail because it does't know how to call the file.

### Best practices

For security reason, if would be better if you do the export from you password manager and the import into Secrez as fast as possible, removing the exported file from your OS using `-m`.

Still, it is convenient to edit the exported file to fix paths and names. Doing it after than the data is imported can require a lot more time. Think about it.

## Second factor authentication?

**It has been removed in version 0.11.0 due to potentially critical issues with Python and the required libraries on MacOS (2FA will be restored as soon as a pure Javascript library is available)**


## (experimental) End-to-end encrypted communication with other accounts

Starting from version 0.8.0, Secrez allows to exchange encrypted messages with other users. To do it, you must set up a local Courier ([look here for more info](https://github.com/secrez/secrez/tree/master/packages/courier)).

## Blog posts

[Secrez — a secrets manager in time of cryptocurrencies](https://sullof.medium.com/secrez-a-secrets-manager-in-time-of-cryptocurrencies-b15120c5aa14) - an intro to Secrez

[Send encrypted messages via Secrez](https://sullof.medium.com/send-encrypted-messages-via-secrez-a8321b561af3) - an intro to the experimental messaging

## Some thoughts

Secrez does not want to compete with password managers. So, don't expect in the future to have "form filling" and staff like that. The idea behind Secrez was born in 2017, when I was participating in many ICO and I had so many files to save and any password manager I used was very bad for that. Still, Secrez, for its nature, is file oriented and I guess will remain this way. However, it is open source, and someone is welcome to built a GUI or a mobile app built on it.

## TODO

- Good documentation
- Plugin architecture to allow others to add their own commands

## History

__1.0.2__
* Export and Import can encrypt/decrypt files using shared keys generated from a specified public key
* Can export ecrypted file for the user itself, files that can be decrypted only from inside the secrez account that exported them 
  
__1.0.1__
* Export and Import can handle encryption. Files can be exported encrypted using a specified password or a key shared with contacts
* Contacts can add a contact also using contact's public key (previously you need a hub url)
* Import specifies the file that have been skipped (because binary, encrypted or both)

__1.0.0__
* Requires `@secrez/utils@1.0.1` which fixes a yaml parsing error with ETH-like addresses

__1.0.0-beta.3__
* Rm allows to delete specific versions of a file

__1.0.0-beta.2__
* Git has new options `--init`, `--remote-url` and `--main-branch` to initiate a repo from inside Secrez

__1.0.0-beta.1__
* use @secrez/core@1.0.0, which changes the encoding from base58 to base64, making the encoding much faster
* remove second factor authentication due to potentially critical issues with Python and the required libraries on macOS (2FA will be restored as soon as either a pure Javascript library is available or using external Python libraries is reliable again)
* `Bash` has been renamed `Shell`

__0.10.8__
* expose a prompt mock to allow other software to run commands programmatically
* fix bug in totp when the command is called but no totp is set

__0.10.7__
* fix bug in `git -i` showing less changed that expected

__0.10.6__
* use `£` as an alternative to `#` when getting find results (whoops, I made this for myself, because I use both English and Italian keyboards)
* add `leave` to leave a room

__10.0.5__
* fix bug in `git` wrongly returning `already up to date`
* fix `git`'s help

__0.10.4__
* remove spaces in secret when launching `totp`
* add a `--test` option, to test a secret
* remove deprecated `exit`
  
__0.10.3__
* since it's not possible to clear the entire terminal, the clear screen process creates a false sense of security and has been removed
* fix bug in `ls -l` when there are empty files
* add message to suggest user to clear or close the terminal after quitting

__0.10.2__
* add a `git` command to push changes to the repo and pull changes
* allow to run `bash` without parameters, asking later for the shell command

__0.10.1__
* encrypts binary files as is, without converting them to `base64` strings, like before

__0.10.0__
* use @secrez/hub 0.2.0 and @secrez/courier 0.2.0 (which are incompatible with the previous versions)
* duplicate `whoami` and `contacts` to make them working inside the `chat` environment

__0.9.4__
* fix bug during import, if a `path` contains `:`; now, they are replaced with `_`

__0.9.3__
* fix bug with `ds -l` not working

__0.9.2__
* fix issue in `ls -l` that was working only in the current dataset
* fix dates in `ls -l` in UTC time, instead than in local time

__0.9.1__
* `ls -l` returns details: size, creation date, last update date,  number of versions and name

__0.9.0__
* Add `ds` to manage datasets
* `ds` is also able to delete a dataset (moving its content to the `trash` dataset)
* Remove feature `--rename` from `use`, since now `ds` manages the datasets

__0.8.10__
* If the default editor is not defined (env variable EDITOR) try to use nano or vim

__0.8.9__
* Pause clearScreen during editing

__0.8.8__
* Add the option `pathFrom` in `import` to build the `path` field using other fields

__0.8.7__
* Importing from a CSV file generates `.yaml` file instead of `.yml`

__0.8.6__
* Uses new onBeforeRewrite in [inquirer-command-prompt](https://github.com/sullof/inquirer-command-prompt) to remove the `#\d` when autocompleting the result of a search

__0.8.5__
* Fix issue with find results when they include datasets.
* Improve scripts (getting coverage only for modified packages)
* Add a secrez.png as a generic asset

__0.8.4__
* fix issue if a file starts with #\d, like `#2something`

__0.8.3__
* add autocomplete based on `find` results; for example `cat #2` and press `tab` will complete with the second result in the search

__0.8.2__
* fix bug in `show` which listed all the messages

__0.8.1__
* fix bug in `conf` setting a 2FA
* improve encapsulation of the `_Secrez` class

__0.8.0__
* add `contacts` to manage trusted users, i.e, trusted public keys
* add `whoami` to get info about the account
* add @secrez/courier to allow communication between local accounts
* add @secrez/hub for the remote hub
* add @secrez/tunnel to manage the tunneling for the Courier
* add `chat` to enter the chat environemnt, and send/receive messages and data to any trusted user
* add `chat`'s subcommands `join`, `send` and `show`.
* return `find` results as a numbered list, to be used as variable (like `$1`) in following commands
* deprecate `exit` in favor of `quit` to leave rooms, chat and app
* add `ssh` to connect via ssh to a remote server from inside Secrez, to protect private keys without password

__0.7.14__
* fix chained aliases generating prompt duplications

__0.7.13__
* fix autocomplete when single command

__0.7.12__
* adds support for Linux to `totp --from-clipboard`, using `xclip`

__0.7.11__
* returns an alert if `clipboardy` does not find the required libraries

__0.7.10__
* fixes the autocomplete loading the data only when needed

__0.7.9__
* fix bug in MainPrompt.js which caused an exit if command not found

__0.7.8__
* upgrade `@secrez/core` to `0.7.1` which fixes an error if `env.json` does not exists

__0.7.7__
* aliases now accept params (ex. `alias x -c 'copy $1 && ls $2 $1')

__0.7.6__
* `rm` ask confirmation before delete forever from the `trash` dataset
* `edit` does not crash if no path is passed

__0.7.5__
* `totp` can read an image to scan a qrcode and recover its secret
* on MacOs, `totp` can also read the image from the clipboard to recover its secret; it requires `pngpaste`

__0.7.4__
* fix bug in autocomplete showing the error stack
* add script to upgrade the versions of any changed packages

__0.7.3__
* `find` ignores `trash` during global searches if not using `--trash-too`
* update to `@secrez/fs 0.7.2`, which fixes a bug in the `DataCache` class

__0.7.2__
* `totp` allows to generate TOTP codes (like Google Authenticator)
* add option `--wait` to `copy` to force it to wait the end of the execution
* `alias` handles chains of commands, like `copy coinbase.yml -f email password -d 3 2 --wait && totp coinbase.yml`

__0.7.1__
* Calling a command with unknown options will generate an error
* Fix issue moving duplicates
* Adds to `mv` an explicit destination field

__0.7.0__
* Introduce a more secure derivation process, using the iterations number in the salt. During the upgrade existing second factors of authentication will be removed
* Allow to change password and number of iterations in `conf`. BE CAREFUl, any change in `conf` can cause conflicts in a remote repo. Don't do the same changes parallelly

__0.6.5__
* Add `duration` to `export` to delete the exported file after the duration (in seconds)

__0.6.4__
* Add `alias` to generate alias of any command

__0.6.3__
* Minor bug fix

__0.6.2__
* `copy` can put many fields in the clipboard, scheduling them

__0.6.1__
* Add support for U2F keys (Yubikey, Solokeys, etc.)
* `ls` now returns sorted results
* Fixed bug with `mv` and `rm` when using wildcards
* Dynamic format for help, managing large examples

__0.6.0__
* Allow multiple datasets; `main` and `trash` exists by default
* At start, purges old trees after successfully loading a dataset
* `use` allows to use and create new dataset
* `mv` supports `-d, --destination` for the destination
* `mv` allows to move files among datasets with a syntax like `mv somefile archive:/` or `mv archive:somefile main:/some/`
* `mv` adds `--find` and `--content-too` to use the result of a search as input
* `mv`, if no destination set, asks if like to use the active directory in the target dataset
* `ls -o d` and `ls -o f` to limit the listing only to folders or files
* `copy` allows to select the field to copy in yaml files
* Improve autocomplete to handle datasets
* Fix autocomplete in `lcat`, which was wrongly using the internal files
* `tag` is able to list and show tags along all the datasets, anche can use `--find` like `mv`

__0.5.13__
* Find in content excludes binary contents

__0.5.12__
* Optimize find inside contents caching the data
* Fix an error returning wrong cases in the results
* Remove an unnecessary message when nothing is recovered

__0.5.11__
* Use tags to prefix the path during import

__0.5.10__
* Fix the README that was not aligned

__0.5.9__
* Add Paste to paste the clipboard content in either a new or existent file, emptying the clipboard
* Fix bug with Copy that was preventing the command from working

__0.5.8__
* Allow Import, with the options `-t`, to recognize tags during the import from CSV
* Split Export in Export and Copy. The first only exports to the FS, the second copies to the clipboard

__0.5.7__
* Add wildcard support for Import, Mv, Rm and Tag
* Add support for recursion during import

__0.5.6__
* Add Tag command to tag files and folders

__0.5.5__
* Optimize Import avoiding intermediate saves of the tree
* Fix an issue with iterations at launch

__0.5.4__
* Add Import of many entries from CSV and JSON files

__0.5.3__
* Use Yaml files as cards, being able to read and edit single fields

__0.5.2__
* Remove obfuscation of the tree before saving (it was an overkill)

__0.5.1__
* Add Find to search in files and folders

__0.5.0__
* First stable version

Versions < 0.5.0 are deprecated because the format was sligtly different and they are incompatible.

## Contribute

Firs off, take a look at Secrez's [Code of conduct](https://github.com/secrez/secrez/blob/master/CODE_OF_CONDUCT.md)

Second, join the brand-new [Secrez's Discord group](https://discord.gg/whsgXj)

#### Fork this repo

#### Clone it

In my case, it would be:

```
git clone git@github.com:sullof/secrez.git
```

#### Install the requirements

```
npm i -g pnpm
```

#### Bootstrap the monorepo
```
npm run reset
```
#### Install OS requirements
To complete the tests, you must install some tool, depending on you operating system.

The `copy` command does not work on Linux is `xsel` is not installed. So, if you, for example, are working on Ubuntu, install it with
```
sudo apt install xsel
```
The `totp` command requires, on MacOS, `pngpaste`. You can install it with
```
brew install pngpaste
```
The `conf` command, requires `Python-fido2`. If you don't have Python, install it. After you can install `fido2` running:
```
pip install fido2
```
Notice that during the execution of Secrez, an error is generated if those tools have not been found. But, nothing happens, during testing. So, please, install them.

#### Testing
Run
```
npm run test
```
This depends where you run it. If you run from the root it executes all the tests, if you run from inside a package, it runs only its specific tests.
You can also run
```
npm run test-only
```
to skip the coverage. This is very helpful during the development.

#### Debugging

To see if it works, you can execute your version of Secrez running, from inside `packages/secrez`
```
npm run dev
```
and create a dev account for you playing.

#### Pull Requests

To prepare the code for a PR, you should realign the versions. You can do this, from the root, calling
```
npm run patch-versions
```
Then, you can prepare the README inserting the coverage. To do it, run
```
npm run pre-push
```
Finally, you can push to GitHub.

Thanks a lot for any contribution 😉


## Test coverage

```
  162 passing (24s)
  1 pending

-----------------------|---------|----------|---------|---------|-----------------------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                 
-----------------------|---------|----------|---------|---------|-----------------------------------
All files              |    69.9 |    56.05 |   71.76 |   69.84 |                                   
 src                   |   59.63 |    54.79 |      55 |   61.32 |                                   
  Command.js           |   79.66 |    78.72 |   76.92 |   83.93 | 35,54-59,68,71,95                 
  PreCommand.js        |   21.95 |    11.54 |   14.29 |   21.95 | 9-95,108                          
  cliConfig.js         |     100 |      100 |     100 |     100 |                                   
 src/commands          |   79.17 |    63.61 |   89.24 |   78.97 |                                   
  Alias.js             |   90.54 |    77.36 |     100 |   90.41 | 85,96,118,145,149,154,164         
  Bash.js              |      75 |        0 |   66.67 |      75 | 20-21                             
  Cat.js               |    98.9 |    88.89 |     100 |    98.9 | 144                               
  Cd.js                |   96.43 |    86.67 |     100 |   96.43 | 45                                
  Chat.js              |   19.51 |        0 |   16.67 |   19.51 | 24-130                            
  Conf.js              |   10.45 |        0 |      25 |   10.45 | 132-473                           
  Contacts.js          |   74.67 |    65.98 |   92.86 |    74.5 | ...75-197,221,226,238,294,307,317 
  Copy.js              |   94.87 |    74.51 |     100 |   94.81 | 96,141,158,183                    
  Courier.js           |   63.54 |    41.86 |   85.71 |   63.83 | ...24,139-156,168,180-183,195-201 
  Ds.js                |   92.54 |    82.05 |     100 |   92.42 | 94,103-108,120                    
  Edit.js              |   13.58 |        0 |      40 |   13.58 | 78-193                            
  Export.js            |   90.91 |       68 |     100 |   90.91 | 109,114-115,120,130,137,140       
  Find.js              |   93.59 |    86.67 |     100 |   93.42 | 90,153,192-196,202                
  Git.js               |   15.07 |        0 |      50 |   15.07 | 74-178                            
  Help.js              |     100 |       80 |     100 |     100 | 30                                
  Import.js            |    93.2 |    85.48 |     100 |    93.1 | ...06,308,321,327,369,384-390,417 
  Lcat.js              |     100 |    85.71 |     100 |     100 | 55                                
  Lcd.js               |   95.65 |    81.82 |     100 |   95.65 | 49                                
  Lls.js               |   95.45 |    72.73 |     100 |   95.45 | 91                                
  Lpwd.js              |   92.31 |      100 |     100 |   92.31 | 38                                
  Ls.js                |    91.3 |       75 |     100 |   90.77 | 99,110-112,126,169                
  Mkdir.js             |     100 |    66.67 |     100 |     100 | 39-45                             
  Mv.js                |   91.01 |    77.36 |     100 |    90.8 | 114,137,148-154                   
  Paste.js             |   87.23 |       75 |     100 |   87.23 | 66,72,75,83,107,124               
  Pwd.js               |   92.31 |      100 |     100 |   92.31 | 36                                
  Quit.js              |      90 |       50 |     100 |      90 | 29                                
  Rm.js                |      94 |    80.95 |     100 |   93.88 | 61,116,124                        
  Shell.js             |   88.24 |       60 |     100 |   88.24 | 39,54                             
  Ssh.js               |      25 |        0 |      40 |      25 | 64-104                            
  Tag.js               |   98.04 |    92.31 |     100 |   97.94 | 123,164                           
  Totp.js              |   97.53 |    76.74 |     100 |   97.53 | 150-151                           
  Touch.js             |     100 |    71.43 |     100 |     100 | 57,68                             
  Use.js               |   96.77 |    89.47 |     100 |   96.77 | 65                                
  Ver.js               |      90 |    66.67 |     100 |      90 | 27                                
  Whoami.js            |    93.1 |    63.64 |      80 |    93.1 | 32,65                             
  chat.js              |   85.37 |    53.85 |     100 |   85.37 | 94,103-116,122,128                
  index.js             |   91.67 |       60 |     100 |    91.3 | 23,32                             
 src/commands/chat     |   79.44 |    63.29 |   92.31 |   79.33 |                                   
  Contacts.js          |      80 |    42.86 |      80 |      80 | 56,65,69,82                       
  Help.js              |   86.67 |       60 |     100 |   86.67 | 38-39                             
  Join.js              |   95.65 |    82.61 |     100 |   95.56 | 41,104                            
  Leave.js             |     100 |       60 |     100 |     100 | 28,32                             
  Quit.js              |     100 |       75 |     100 |     100 | 27                                
  Send.js              |   67.65 |    46.67 |     100 |   67.65 | 40,44,47,74,83-92                 
  Show.js              |   68.75 |    70.59 |     100 |   68.75 | 63-67,76,91-97                    
  Whoami.js            |   42.86 |        0 |      60 |   42.86 | 24,32-41                          
 src/prompts           |   15.14 |        0 |   14.29 |   15.36 |                                   
  ChatPrompt.js        |    6.17 |        0 |       0 |    6.17 | 9-155                             
  ChatPromptMock.js    |     100 |      100 |   66.67 |     100 |                                   
  CommandPrompt.js     |   10.42 |        0 |       0 |   10.56 | 25-286                            
  Completion.js        |    4.41 |        0 |       0 |    4.62 | 7-107                             
  MainPromptMock.js    |     100 |      100 |   66.67 |     100 |                                   
  MultiEditorPrompt.js |      25 |        0 |       0 |      25 | 8-35                              
  SigintManager.js     |      25 |        0 |      20 |      25 | 11-37                             
 src/utils             |   69.92 |     62.1 |   56.25 |   69.55 |                                   
  AliasManager.js      |     100 |    91.67 |     100 |     100 | 48                                
  ContactManager.js    |   71.43 |       60 |   85.71 |   71.43 | 13,36-38                          
  Fido2Client.js       |   15.38 |        0 |   11.11 |   15.38 | 15-101                            
  HelpProto.js         |    91.6 |    83.08 |     100 |   91.45 | 44,137-138,155-160,179            
  Logger.js            |   63.64 |    56.25 |   36.84 |   62.79 | ...38-50,58,66-70,75,85,89,94,107 
-----------------------|---------|----------|---------|---------|-----------------------------------

> secrez@1.0.3 posttest /Users/sullof/Projects/Personal/secrez/packages/secrez
> nyc check-coverage --statements 65 --branches 50 --functions 65 --lines 65


```


## Copyright

Secrez has been created by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence
```
MIT License

Copyright (c) 2017-present, Francesco Sullo <francesco@sullo.co>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

