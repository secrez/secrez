# Secrez
A secrets manager as an encrypted file system.

# This is a work in progress. Any suggestion, advice, critic is very welcome. But use at your own risk.


## Intro

Secrez is a CLI application that manages a particular encrypted file system, with commands working similarly to Unix commands like `cd`, `mkdir`, `ls`, `mv`, etc.

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

## Security details

When you initially create a secrez database (stored, by default, in `~/.secrez`) you should indicate the number of iterations.

Since Secrez derives a master key from your password using `crypto.pbkdf2`, the number of iterations is a significant addition to the general security. Even if you use a not-very-hard-to-guess password, if the attacker does not know the number of iterations, he has to try all the possible ones. Considering that 2,000,000 iterations require a second or so, customizable iterations increases enormously the overall security.

You can set up the number of iterations calling
```
secrez -i 1023896
```
or
```
secrez -si 876352
```
where the `-s` option saves the number locally in a git-ignored `env.json` file. This way you don't have to retype it all the time to launch Secrez (typing a wrong number of iterations, of course, will produce an error).

If you don't explicitly set up the number of iterations, a value for that is asked during the set up, before your password, and, if you passed the options `-s`, is saved in `env.json`.

Starting from version 0.7.0, you can change the number of iterations using, as well as the password, using `conf`.

Other options are:

- `-l` to set up the initial "external" folder on you computer
- `-c` to set up the folder where the encrypted data are located

Both are your homedir (`~`) by default.
Basically, running Secrez with different containers (`-c` option) you can set up multiple independent encrypted databases.


## Install

```
npm install -g secrez
```

At first run, secrez will ask you for the number of iterations (suggested between 500000 and 1000000, but the more the better) and a master password — ideally a phrase hard to guess, but easy to remember and type, something like, for example "heavy march with 2 eggs" or "grace was a glad president".

## The commands

From the output of `help`:

```

Secrez main:/ $ help

Available commands:
  alias   Create aliases of other commands.
  bash    Execute a bash command in the current disk folder.
  cat     Shows the content of a file.
  cd      Changes the working directory.
  conf    Configure security data (2FA, password, number of iterations).
  copy    Copy a text file to the clipboard.
  edit    Edits a file containing a secret.
  exit    Exits Secrez.
  export  Export encrypted data to the OS in the current local folder
  find    Find a secret.
  help    This help.
  import  Import files from the OS into the current folder
  lcat    Similar to a standard cat in the external fs.
  lcd     Changes the external working directory.
  lls     Browses the external directories.
  lpwd    Shows the path of the external working directory.
  ls      Browses the directories.
  mkdir   Creates a directory.
  mv      Moves and renames files or folders.
  paste   Paste whatever is in the clipboard in an encrypted entries.
  pwd     Shows the path of the working directory.
  rm      Removes one or more files and folders.
  tag     Tags a file and shows existent tags.
  totp    Generate a TOTP code if a totp field exists in the card.
  touch   Creates a file.
  use     Uses a specific dataset.
  ver     Shows the version of Secrez.
  
To get help about single commands, specify the command, or use the -h option.

Examples:
  help touch  ()
  import -h   ()
  
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

Suppose that you have a card for your bank and like to login to your bank. You could copy email and password to the clipboard to paste them in the browser. Suppose that you expect to be able in 4 seconds to move from the terminal to the browser, you could run the command:    

```
copy bank.yml -f email password -d 4 3
```
This will copy the email field and give you 4 seconds to paste it in the browser. After it will emit a beep and you have 3 seconds to paste the password. It sounds quite useful, but **it can be better.**

If you use that login often, you could like to create an alias for it with:
```
alias b -c "copy bank.yml -f email password -d 4 3"
```
Next time, you can just type
```
b
```
and press enter to execute that command. It's fantastic, isn't it?

Notice that the command above works in you are using the `main` dataset, if you moved to another one, it would fail. When you create an alias, it is better to use absolute paths so that it works everywhere, like:
```
copy main:/bank.yml -f email password -d 4 3
```

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


## Second factor authentication

Since version 0.6.1, Secrez supports 2FA. It uses external scripts in Python, based on  Python-Fido2 by Yubiko, and it's compatible with any Fido2 authenticator device implementing the hmac-secret extension.

To register a new fido2 key with the name `solo`, you can call

```
conf -r solo --fido2
```

When you activate the first fido2 key, Secrez asks if you also want to generate an emergency recovery code. It allows you to recover the account if all the registered keys are lost.

You can set more keys and more recovery codes. For the latter, with a command like:

```
conf -r memo --recovery-code
```
If you already have a mnemonic you use to recover something else, you can use it, like:
```
conf -r memo --recovery-code --use-this "laugh elevator chimney account 
  tone kiwi aware fall flee couple hurry domain"
```

To list all the factors, run:

```
conf -l
```
or, to see only the usb keys:

```
conf -l --fido2
```
To unregister a key or a mnemonic, run:

```
conf -u solo
```
If solo is the only USB device you set, Secrez removes all the recovery codes and reverses the account for a normal login.

**Risks**

Adding or removing a second factor changes the keys.json file. So, if you are using a git repository, be sure you don't create conflicts, i.e., don't change the second factor configuration in more computer parallelly because you risk to damage your data.

As a rule of thumb, if you use a git repo, always pull before running Secrez, and always commit and push after exiting.

## A quick demo

If you like to watch a quick demo, [you can take a look at this video on Youtube](https://www.youtube.com/watch?v=qGoBTpG0Fj0).

## Some thoughts

Secrez does not want to compete with password managers. So, don't expect in the future to have "form filling" and staff like that. The idea behind Secrez was born in 2017, when I was participating in many ICO and I had so many files to save and any password manager I used was very bad for that. Still, Secrez, for its nature, is file oriented and I guess will remain this way. However, it is open source, and someone is welcome to built a GUI or a mobile app built on it.

## TODO

- Documentation
- More commands, included a Git command to manage the repo
- Plugin architecture to allow others to add their own commands

# History

__7.0.11__
* returns an alert if `clipboardy` does not find the required libraries

__7.0.10__
* fixes the autocomplete loading the data only when needed

__7.0.9__
* fix bug in Prompt.js which caused an exit if command not found

__7.0.8__
* upgrade `@secrez/core` to `0.7.1` which fixes an error if `env.json` does not exists

__7.0.7__
* aliases now accept params (ex. `alias x -c 'copy $1 && ls $2 $1')

__7.0.6__
* `rm` ask confirmation before delete forever from the `trash` dataset
* `edit` does not crash if no path is passed

__7.0.5__
* `totp` can read an image to scan a qrcode and recover its secret
* on MacOs, `totp` can also read the image from the clipboard to recover its secret; it requires `pngpaste`

__7.0.4__
* fix bug in autocomplete showing the error stack
* add script to upgrade the versions of any changed packages

__7.0.3__
* `find` ignores `trash` during global searches if not using `--trash-too`
* update to `@secrez/fs 0.7.2`, which fixes a bug in the `DataCache` class

__7.0.2__
* `totp` allows to generate TOTP codes (like Google Authenticator)
* add option `--wait` to `copy` to force it to wait the end of the execution
* `alias` handles chains of commands, like `copy coinbase.yml -f email password -d 3 2 --wait && totp coinbase.yml`

__7.0.1__
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

After taking a look at the [Code of Conduct]('https://github.com/secrez/secrez/blob/master/CODE_OF_CONDUCT.md'), do this:

#### Fork this repo

#### Clone it

In my case, it would be:

```
git clone git@github.com:sullof/secrez.git
```

#### Install the requirements

```
npm i -g lerna
```

#### Bootstrap the monorepo
```
lerna bootstrap
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
  129 passing (8s)

------------------|---------|----------|---------|---------|---------------------------------
File              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s               
------------------|---------|----------|---------|---------|---------------------------------
All files         |   95.33 |    82.38 |   98.89 |   95.25 |                                 
 src              |     100 |    92.11 |     100 |     100 |                                 
  AliasManager.js |     100 |    85.71 |     100 |     100 | 8,58                            
  Command.js      |     100 |    95.83 |     100 |     100 | 55                              
  cliConfig.js    |     100 |      100 |     100 |     100 |                                 
 src/commands     |   94.88 |    82.11 |   98.63 |   94.78 |                                 
  Alias.js        |   91.89 |    79.25 |     100 |   91.78 | 89,100,122,150,155,165          
  Bash.js         |   93.33 |    66.67 |     100 |   93.33 | 48                              
  Cat.js          |   98.89 |    88.89 |     100 |   98.89 | 142                             
  Cd.js           |   96.43 |    86.67 |     100 |   96.43 | 44                              
  Copy.js         |   94.94 |    74.51 |     100 |   94.87 | 96,141,158,183                  
  Exit.js         |      90 |       50 |     100 |      90 | 30                              
  Export.js       |     100 |    64.29 |     100 |     100 | 55,75,87-92,99                  
  Find.js         |   92.54 |    86.67 |     100 |   92.31 | 90,141,172-176,182              
  Help.js         |   92.13 |    83.58 |     100 |      92 | 49,142-143,160-165,184          
  Import.js       |   94.84 |    85.11 |     100 |   94.77 | 171,229,231,244,250,292,319-323 
  Lcat.js         |     100 |    85.71 |     100 |     100 | 54                              
  Lcd.js          |   95.65 |    81.82 |     100 |   95.65 | 48                              
  Lls.js          |   95.45 |    72.73 |     100 |   95.45 | 89                              
  Lpwd.js         |   92.31 |      100 |     100 |   92.31 | 38                              
  Ls.js           |   88.89 |    68.75 |     100 |    87.5 | 65,69,90                        
  Mkdir.js        |     100 |    66.67 |     100 |     100 | 38-44                           
  Mv.js           |   91.01 |    77.36 |     100 |    90.8 | 113,136,147-153                 
  Paste.js        |   87.23 |       75 |     100 |   87.23 | 65,71,74,82,106,123             
  Pwd.js          |   92.31 |      100 |     100 |   92.31 | 36                              
  Rm.js           |   96.67 |       90 |     100 |   96.55 | 75                              
  Tag.js          |      99 |    93.75 |     100 |   98.95 | 160                             
  Totp.js         |   97.33 |    79.49 |      80 |   97.33 | 67-86                           
  Touch.js        |     100 |    71.43 |     100 |     100 | 56,67                           
  Use.js          |   98.04 |     93.1 |     100 |   97.92 | 103                             
  Ver.js          |      90 |    66.67 |     100 |      90 | 27                              
  index.js        |   94.44 |    57.14 |     100 |   94.12 | 18                              
 src/utils        |     100 |    66.67 |     100 |     100 |                                 
  index.js        |     100 |    66.67 |     100 |     100 | 53,77                           
------------------|---------|----------|---------|---------|---------------------------------
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

