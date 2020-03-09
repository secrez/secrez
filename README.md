# Secrez
A secrets manager in times of crypto coins.

### Intro

Secrez is a CLI application that manages a particular encrypted file system, with commands working similarly to Unix commands like `cd`, `cp`, `ls`, `mv`, etc.

The idea is to interact with encrypted virtual files like if they are just files in a standard file system. After running Secrez and logging in the local account, at the prompt the user can execute commands.

#### Some example

```
cat myPrivateKey
```

This command will show the content of an encrypted file which is called myPrivateKey. In particular, it will show latest version of the file.

Adding options to the command it is possible to either see a specific version or list all the versions.

The versioning is very important in Secrez because the primary way to backup and distribute the data is using Git. In this case, you want to avoid conflicts that can be not fixable because of the encryption. So, every time there is a change, an entirely new file is created, with metadata about its id and timestamp. 

The timestamp is used, during the generation of the index to assign a version. This makes it dynamic but avoid having the same version for two files, even if they are modified on two different computers and after pushed to the repo. Of course, it is unlikely, but it can happen that two versions are created at the same timestamp. In this case, the two versions will be assigned on the fly, which means that they can change next time you load Secrez. But this is a minor glitch and, anyway, you can delete any version that is not necessary to clean the system.

Another example:

```
mv e:~/Desktop/myWallet.json ~/Ethereum/wallets/. 
```
 
This commands, takes the standard file myWallet.json, contained in the Desktop folder, encrypts it, saves it in the encrypted file sistem and remove it from the original folder. Basically, the `e:` prefix specify which file is on the external file sistem (the computer one), versus the internal file sistem (the encrypted Secrez one).

#### The name convention

A file name in Secrez looks like 
```
VAnGLojzCDWhfZRK8PCYK203WBzJkAA28FhKHdS7DM5SkJaTgYdGfN1MAjTdfUYSzvtDVsMJvGodoHWzMuK6zr
```
where `VAnGLojzCDWhfZRK8PCYK2` is a nonce generated during the encryption.

The rest, after the `0`, is the combination of id, timestamp and filename. This implies that, at bootstrap, Secrez must read all the files' names and build a tree of the entire file sistem. This is done using a special file which is an index of the directory tree. Only after reading all the data, Secrez is able to understand which is the tree and rebuild it correctly. In other words, there are no information deductable from the file on disk, except what you can deduct from the Git repo (mostly about versioning and timestamp). But the idea is to use, obviously, a private repo, so, this is a minor issue. The alternative would be to risk conflicts during pull and push of new changes, which could potentially damage the entire database.

To mitigate this risk, in Secrez you can create a new Git repo, save everything as first commit, and delete the previously used repo.      


