# Secrez

<h1 align="center">
  <img align="center" src="https://raw.githubusercontent.com/secrez/secrez/master/assets/secrez_2.png" width="300"/>
</h1>

<p align="center">
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

  <a href="https://discord.gg/whsgXj">
    <img src="https://img.shields.io/badge/chat-on%20discord-brightgreen.svg">
  </a>

  <a href="https://gitter.im/secrez/secrez?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge" alt="Join the chat at https://gitter.im/secrez/secrez">
    <img src="https://badges.gitter.im/secrez/secrez.svg">
  </a>

</p>

Secrez is a CLI secret manager that functions as an encrypted file system, as well as a decentralized, surveillance-resistant, end-to-end encrypted messaging system.

## Intro

At its core, Secrez is a command-line interface that manages an encrypted file system, with commands that work similarly to Unix commands like `cd`, `mkdir`, `ls`, `mv`, etc. The idea is to interact with encrypted virtual files as if they are just files in a standard file system.

## Why Secrez?

Secrez aims to provide a secure password management solution that is available everywhere. While online password managers like LastPass require you to trust a remote server, desktop tools like KeyPass are more secure but difficult to use on multiple computers. To address this, Secrez combines the security of KeyPass with the accessibility of LastPass.

To achieve its goal, Secrez uses several strategies. First, any secret is a local file. Second, any file, whether it's a tree version, a directory, a text file, or a binary file, is immutable. Finally, any change can be pulled/pushed to a remote private repository. You can either create a private repository on GitHub, BitBucket, etc. or set up your own self-hosted Git server.

Overall, Secrez offers a powerful and secure solution for managing your passwords and secrets, all from the command line.

## The structure

Secrez simulates an operating system, allowing you to execute commands like ls and mv when you load the environment, similar to what you would normally do in a Unix terminal.

Starting from version 0.6.0, Secrez organizes data into datasets, which act like separate disks, such as /dev/disk1 and /dev/disk2. By default, Secrez generates two datasets: main and trash. You can create more using the use -c command, such as use -c archive.
One of the primary goals of a secrets manager is to ensure that no data is ever lost. However, in some cases, secrets may exist in a folder but not be loaded if only the most recent index is read.

Here's an example: Alice uses Secrez on both computer A and B, and the two data sets are aligned. Suddenly, GitHub goes down, and she makes some changes on both computers. When GitHub comes back online, she pushes the master branch on computer A, and everything goes fine. However, when she pulls on computer B and pushes, the data online become inconsistent because the most recent tree (from B) does not contain the new changes that were previously saved on A. This means that some secrets are in one index, while others are in the other.

No problem. When Alice restarts Secrez, the system finds the extra secrets, reads their positions from the previous indexes, and puts them back in the tree. Since files are immutable, the recovery strategy is not always obvious. Here's what happens in different cases:

If the recovered secret is in a folder that does not exist in the "official" index, the entire path is added using the encrypted data of the recovered secret.
If the secret is a file in a folder that already exists, the file is added as is, but the folders with existing paths are trashed.
If the secret is a file and a file with the same name already exists in the same position, the system checks the content of the file. If it is the same, the secret is ignored. If it's different, it is added as a version.
Any unused or rewritten secrets (as versions) are trashed (you can check them in the trash dataset). In any case, all the contents are kept.

To avoid repeating the same process on the other computer (which will generate files with different IDs and more deleted items), Alice should align the repo on computer A before doing anything there. But if she doesn't, nothing will be lost anyway.

Thus said, **it is a good practice to align the repo before doing anything. You never know.**

## The name convention

In Secrez, file names follow a specific convention:

```
1VAnGLojzCDWhfZRK8PCYK203WBzJkAA28FhKHdS7DM5SkJaTgYdGfN1MAjTdfUYSzvtDVsMJvGodoHWzMuK6zr
```

The first character, 1, indicates the type of file. The remaining characters represent an encrypted message with a nonce, in Base58 format. The encrypted part consists of an ID, timestamp, and the actual filename.

During initialization, Secrez reads all file names and builds a tree of the entire file system. This is done using special files called trees. Once all data has been read, Secrez can determine the tree and add any missing secrets. Since everything is encrypted, it is not possible to deduce information from the files on disk, except for versioning and timestamps, which can be obtained from the Git repo.

To mitigate this risk, you can create a new Git repo, save everything as the first commit, and delete the previously used repo. This will result in losing the repo's history, but it will also prevent someone from accessing information about timestamps and versions.

## The tree

Secrez manages trees as single immutable files. During a session, temporary files are deleted to keep their number low, but at the exit, the last file remains in the repo.

## The cryptographic foundation

Secrez uses [NaCl](https://github.com/dchest/tweetnacl-js) as its primary cryptographic library. NaCl is a widely respected library that provides many algorithms for both synchronous and asynchronous encryption, and its design has been rigorously reviewed by experts in the field. By using NaCl, Secrez is able to provide strong security guarantees for its users.

## How to install it

Secrez requires Node.js 22.23.4 or later (security-patched LTS). If you have installed an older version, it may generate unclear errors and refuse to install or work properly. We recommend installing Node using nvm if possible. For more information, refer to [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm).

Since this monorepo uses [Pnpm](https://pnpm.io/), it is better to install secrez using pnpm because the lock file will be used to avoid unexpected conflicts among modules. To install pnpm, run:

```
npm i -g pnpm
```

and then run:

```
pnpm i -g secrez
```

## How to use it

To get started with Secrez, simply run the command:

```
secrez
```

Upon first launch, Secrez will prompt you to enter a master password and the number of iterations. The number of iterations is used to derive a master key from your password, so the higher the number, the more secure your data will be. It's recommended to use between 500,000 and 1,000,000 iterations, but you can customize this based on your needs. At signup, if you choose fewer than 100,000 iterations, Secrez shows a warning and asks for confirmation before proceeding (the threshold is lower than the recommended range because Secrez mixes the iteration count into the KDF salt, not just the password). For example, you can set the number of iterations explicitly by running:

```
secrez -i 1023896
```

You can also save the number of iterations locally by adding the -s option:

```
secrez -s
```

This will save the number of iterations in a git-ignored env.json file, so you don't have to enter it every time you launch Secrez. If you mistype the number of iterations, Secrez will produce an error.

In addition to the master password and number of iterations, you can also specify other options at launch, such as the initial "external" folder on your computer (-l option) and the container (i.e., the folder) where the encrypted data is located (-c option). By default, both folders are set to your home directory (~). For example, if you want to set up a separate encrypted database in a different folder, you can run:

```
secrez -c ~/data/secrez
```

If the number of iterations you chose makes the initial decryption too slow, you can change it inside the Secrez CLI with the conf command.

## The commands

Launching `help` you can list all available commands.

```
Available commands:
  alias     Create aliases of other commands.
  cat       Shows the content of a file.
  cd        Changes the working directory.
  conf      Shows current configuration and allow to change password and number of iterations).
  contacts  Manages your contacts
  copy      Copy a text file to the clipboard.
  ds        Manages datasets
  edit      Edits a file containing a secret.
  export    Export encrypted data to the OS in the current local folder
  find      Find a secret.
  git       Checks if there is a repo and if there are conflict risks.
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
  shell     Execute a shell command in the current disk folder.
  show      Show a card field as a QR code.
  ssh       Opens a new tab and run ssh to connect to a remote server via SSH
  tag       Tags a file and shows existent tags.
  totp      Generate a TOTP code if a totp field exists in the card.
  touch     Creates a file.
  use       Uses a specific dataset.
  ver       Shows the version of Secrez.
  whoami    Show your Secrez public key
```

## Some example

To display the content of an encrypted file called myPrivateKey, run the following command:

```
cat myPrivateKey
```

By default, the latest version of the file will be displayed. However, you can use additional options to view a specific version or list all versions.

Secrez uses versioning to ensure data integrity and avoid conflicts when backing up and distributing data through Git. Each time a file is modified, a new encrypted file is created with metadata about its ID and timestamp. The timestamp is used to assign a version to the file, which is a 4-letter hash of the timestamp.

Another useful command is the import command. For example:

```
import ~/Desktop/myWallet.json -m
```

This command will encrypt the file myWallet.json located on your Desktop, save it in the encrypted file system, and then delete the original file using the -m option.

This is particularly useful if you have just downloaded a private key to access your crypto wallet and want to encrypt it as soon as possible. With Secrez, you can import the file and delete the cleartext version in one command.

### Exporting and importing encrypted files

You can export a file encrypted for use outside Secrez with:

```
export mySecret.yml -e
```

Secrez asks for a password and the number of PBKDF2 iterations. The exported file gets a `.secrez` extension (or `.secrezb` for binary files). Starting from version 2.2.0, password-based exports use format **v2**: a random salt is stored in the file, while the password and iteration count stay out of band (you must remember both to decrypt later).

To import a v2 file:

```
import mySecret.yml.secrez --password "your export password" -i 500000
```

Use the same iteration count you chose at export time (`-i` on the command line, or Secrez will prompt you).

Files exported with older versions used format **v1** (weaker key derivation). You can still import them with the password only:

```
import old-backup.secrez --password "your export password"
```

Exports encrypted for contacts or for yourself inside Secrez (shared keys) are unchanged and do not require a password or iterations at import time.

## Aliases — where the fun begins :-)

Suppose you have a bank card and want to log in to your online account. You could copy the email and password to the clipboard to paste them in the browser. If you expect to be able to move from the terminal to the browser in 4 seconds, you could run the command:

```
copy bank.yml -f email password -d 4 2
```

This will copy the email field and give you 4 seconds to paste it in the browser. Then, it will emit a beep, and you have 2 seconds to paste the password. It sounds quite useful, but it can be even better.

If you use that login often, you could create an alias for it with:

```
alias b -c "copy bank.yml -f email password -d 4 2"
```

Next time, you can just type:

```
b
```

It looks great, right? Well, it can be even better.

Let’s say you're using a 2FA app like Google Authenticator to connect to a website, for example, GitHub. Suppose you have a file called github.yml with a field called totp, which is the secret that GitHub gave you when you activated 2FA. You could execute:

```
totp github.yml
```

to generate a TOTP token for GitHub. The token will be shown and copied to the clipboard. Now, you can create an alias like this:

```
alias G -c "copy github.yml -f username password -d 4 2 --wait && totp github.yml"
```

Can you guess what this will do?

It copies the username to the clipboard;
It waits 5 seconds, emits a beep, and copies the password;
It waits 3 seconds, emits a beep, and copies the TOTP token, keeping it in the clipboard.
You can also use parameters in aliases and create a macro like this:

```
alias M -c "copy $1 -f username password -d 4 2 --wait && totp $1"
```

and call it with:

```
M github.yml
```

It's fantastic, isn't it?

_Btw, using a TOTP factor in Secrez is a bit of a contradiction because you are converting a second factor (something that you have) into a first factor (something that you know). So, use this feature only when it makes sense._

## Importing from other password/secret managers

Secrez supports importing backups from other software. Suppose you have exported your passwords in a CSV file named export.csv like this:

```
Path,Username,Password,Web Site,Notes
twitter/nick1,nick1@example.com,938eyehddu373,"http://cssasasa.com"
facebook/account,fb@example.com,926734YYY,,personal
somePath,,s83832jedjdj,"http://262626626.com","Multi
line
notes"
```

A field named path is necessary because Secrez needs to know where to place the new data. The path should be relative, allowing you to import it into your favorite folder.

To import the CSV file into the 1PasswordData folder, for example, you can run:

```
import export.csv -e 1PasswordData -t
```

The parameter -e or --expand is necessary. If it's not provided, Secrez will import the file as a single file.

Internally, Secrez converts the CSV file to a JSON file like this:

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

This means that you can also format your data as a JSON and import it directly using:

```
import export.json -e 1PasswordData
```

Each item in the JSON will generate a single YAML file. For example, the last element in the JSON will generate the file /1PasswordDate/somePath.yml with the following content:

```
password: s83832jedjdj
web_site: http://262626626.com
notes: |-
  Multi
  line
  notes
```

When you edit the new file, Secrez recognizes it as a card and asks you which field you want to edit (unless you explicitly specify it with, for example, -f password) and edits just that field.

At the end of the process, you can remove the original backup using the -m option. You can also simulate the process to see which files will be created using the -s option.

If the CSV file also contains a tags field, you can automatically tag any entries using the -t or --tags option. If you don't use this option, the tags will be saved in the YAML file like any other field.

### What if there is no path field?

Let's say you want to import a CSV file exported by LastPass, which doesn't have a path field. In this case, you can use other fields, such as grouping and name, to build the path instead. Starting from version 0.8.8, you can do this by running:

```
import ~/Downloads/lastpass_export.csv -e lastpass -P grouping name
```

Or, if you want to put everything in the folder `lastpass` without generating any subfolders, you can run:

```
import ~/Downloads/lastpass_export.csv -e lastpass -P name -m
```

By using only the name field, any entries with a slash in the name will create a subfolder. The -m option will remove the CSV file from the operating system after importing.

In both examples, make sure that all entries in the LastPass CSV file have a name. If not, the import will fail because Secrez won't know how to name the file.

### Best practices

For security reasons, it is better to export from your password manager and import into Secrez as quickly as possible, removing the exported file from your OS using -m.

However, if you need to edit the exported file to fix paths and names, it is more convenient to do it before importing the data, as it can take a lot more time to do so after the data is imported.

## FIDO2 second factor authentication?

It has been removed in version 0.11.0 due to potential critical issues with Python and the required libraries on MacOS (2FA may be restored if a pure Javascript library becomes available).

## (experimental) End-to-end encrypted communication with other accounts

Starting from version 0.8.0, Secrez allowed you to exchange encrypted messages with other users. To do so, it was using the packages `@secrez/courier`, `@secrez/hub`, `@secrez/tls` and `@secrez/tunnel`. Those four packages have been removed in version 2.0.0 since the feature was hard to maintain and not very used.

## Blog posts

[Secrez — a secrets manager in time of cryptocurrencies](https://sullof.medium.com/secrez-a-secrets-manager-in-time-of-cryptocurrencies-b15120c5aa14) - an intro to Secrez

[Send encrypted messages via Secrez](https://sullof.medium.com/send-encrypted-messages-via-secrez-a8321b561af3) - an intro to the experimental messaging

## Some thoughts

Secrez is not intended to compete with password managers, so do not expect it to have features like "form filling." The idea behind Secrez originated in 2017 when I was participating in many ICOs, and I had so many files to save, but any password manager I used was not very effective. Secrez is file-oriented and will likely remain so. However, it is open source, and someone is welcome to build a GUI or mobile app built on it.

## History

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

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

To complete the tests, you must install some tools depending on your operating system.

The `copy` command does not work on Linux if `xsel` is not installed. So, if you are working on Ubuntu, install it with:

```
sudo apt install xsel
```

The `totp` command requires `pngpaste` on macOS. You can install it with:

```
brew install pngpaste
```

Please note that during the execution of Secrez, an error is generated if those tools have not been found. Please make sure to install them.

#### Testing

To run all the tests, navigate to the root directory of the project and run:

```
npm run test
```

If you are inside a package directory, running this command will only execute the package-specific tests. You can also skip coverage by running:

```
npm run test-only
```

This is useful during development.

#### Debugging

To see if Secrez works properly, you can execute your version of Secrez by running the following command from inside the `packages/secrez` directory:

```
npm run dev
```

You will create a dev account to play with it.

#### Pull Requests

Before submitting a pull request, you should realign the versions. You can do this by running the following command from the root directory:

```
npm run patch-versions
```

Then, you can prepare the README file by inserting the coverage. To do this, run:

```
npm run pre-push
```

Finally, you can push to GitHub.

Thank you for any contributions! 😉

## Test coverage

```

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
