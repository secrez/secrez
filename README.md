# Secrez
A secrets manager in times of crypto coins.

### This is a work in progress. Any suggestion, advice, critic is very welcome. But use at your own risk.


#### Intro

Secrez is a CLI application that manages a particular encrypted file system, with commands working similarly to Unix commands like `cd`, `cp`, `ls`, `mv`, etc.

The idea is to interact with encrypted virtual files as if they are just files in a standard file system. After running Secrez and logging in the local account, at the prompt, the user can execute commands.


#### Why Secrez?

There are two primary approaches to secrets and password management:

1. Online systems that save the primary data online (like LastPass)
2. Desktop tools who keep data in the computer (like KeyPass)

An Online Password Manager requires that you trust the remote server.
I founded Passpack in 2006, and I know very well how, at any moment, you can add a backdoor, and probably nobody will notice it. A malicious service could also inject a backdoor only for a specific user.

The second case, a desktop tool is intrinsically more secure, but it is hard to use on more than one computer.
The standard solution is to back up the database on Dropbox or Google Drive and -- before using it -- download it locally, which is prone to produce unfixable problems and cause data loss.

Secrez goal is to be as safe as KeyPass but available everywhere, like Lastpass.

To obtain this goal, Secrez assembles a few strategies:

- Any secret is a local file
- Any file — besides if it is a tree version, a directory, a text file, or a binary file — is immutable
- Any change can be pulled/pushed to a remote private repo

You can either create a private repo on GitHub, BitBucket, etc. or — much better — setting your own, self-hosted git server.

For now, this is a manual approach. In a future version, the git repo will be manageable from inside Secrez.

#### Apparently lost secrets

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

Either any unused secret or secret that is rewritten (as a version) is trashed (you can check them in the `.trash` folder).

In any case, all the content are kept.

To avoid to repeat the same process on the other computer (which will generate files with different IDs and more deleted items), Alice should align the repo on A before doing anything there. But, if she does not, nothing will be lost anyway.

#### The name convention

A file name in Secrez looks like
```
1VAnGLojzCDWhfZRK8PCYK203WBzJkAA28FhKHdS7DM5SkJaTgYdGfN1MAjTdfUYSzvtDVsMJvGodoHWzMuK6zr
```
where `1` is the type (DIR, other types are TEXT and BINARY), and the rest is a encrypted message with nonce, in Base58 format.

The encrypted part is the combination of id, timestamp, and actual filename.
This implies that, at bootstrap, Secrez must read all the files' names and build a tree of the entire file system. This is done using particular files: trees. Only after reading all the data, Secrez is able to understand which is the tree and, if something is missed, add the missing secrets. Since everything is encrypted, there is no information deductible from the files on disk, except what you can deduct from the Git repo (mostly about versioning and timestamp). But the idea is to use a private repo, so this is a minor issue.

To mitigate this risk, you can create a new Git repo, save everything as the first commit, and delete the previously used repo. This way, you lose the repo's history, but you also lose info about timestamps and versions in case someone gains access to the repo.

#### The tree

Secrez manages trees as single immutable files. During a session, temporary files are deleted to keep their number low, but at the exit, the last file remains in the repo.

#### Security details

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
If starting your account, you put a large number and you think that it's too slow for your computer, delete the Secrez folder (by default `rm -rf ~/.secrez`) and restart.

Other options are:

- `-l` to set up the initial "external" folder on you computer
- `-c` to set up the folder where the encrypted data are located

Both are your homedir (`~`) by default.
Basically, running Secrez with different containers (`-c` option) you can set up multiple independent encrypted databases.


#### Install

```
npm install -g secrez
```

On same version of MacOS, there can be errors during the install. Search the Internet to find the solution.

At first run, secrez will ask you for the number of iterations (suggested between 500000 and 1000000, but the more the better) and a master password — ideally a phrase hard to guess, but easy to remember and type, something like, for example "heavy march with 2 eggs" or "grace was a glad president".

#### The commands

Here, the output of `help`:

```
(/) Secrez $ help

Available options:
  bash    Execute a bash command in the current disk folder.
  cat     Shows the content of a file.
  cd      Changes the working directory.
  copy    Copy a text file to the clipboard.
  create  Creates interactively a file containing a secret.
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
  rm      Removes a file or a single version of a file.
  tag     Tags a file and shows existent tags.
  touch   Creates a file.
  ver     Shows the version of Secrez.

To get help about single commands, specify the command.

Examples:
  help list
  help set
```

#### Some example

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


#### Importing from other password/secret managers

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


#### Some thoughts

Secrez does not want to compete with password managers. So, don't expect in the future to have "form filling" and staff like that. The idea behind Secrez was born in 2017, when I was participating in many ICO and I had so many files to save and any password manager I used was very bad for that. Still, Secrez, for its nature, is file oriented and I guess will remain this way. However, it is open source, and someone is welcome to built a GUI or a mobile app built on it.

#### TODO

- Documentation
- More commands, included a Git command to manage the repo
- Plugin architecture to allow others to add their own commands

### History

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

#### Copyright

Secrez has been created by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

#### Licence

[MIT](https://github.com/expressjs/express/blob/master/LICENSE)

