# @secrez/fs

Secrez is the secrets manager for the cryptocurrencies era.

This is the filesystem component.

@secrez/fs exposes:

* InternalFs
* ExternalFs
* FsUtils
* Tree
* Node
* DataCache
* FileCipher    (starting from 1.0.3)

## TODO

API documentation

## History

__1.0.3__
* Move `encryptFile` and `decryptFile` from ExternalFs to FileCipher

__1.0.2__
* Adds `encryptFile` and `decryptFile` to ExternalFs

## Test coverage

```
  3 passing (82ms)

---------------|---------|----------|---------|---------|----------------------------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                      
---------------|---------|----------|---------|---------|----------------------------------------
All files      |    6.92 |     3.88 |    4.26 |    7.07 |                                        
 DataCache.js  |    8.24 |     1.85 |    9.09 |    8.33 | 11-150                                 
 ExternalFs.js |   40.68 |    36.59 |   33.33 |   41.03 | 11-117,136,154,161,164,181,193,198,204 
 FsUtils.js    |   10.64 |        0 |       0 |   11.11 | 10-71                                  
 InternalFs.js |    3.25 |        0 |       0 |    3.28 | 12-445                                 
 Messages.js   |     100 |      100 |     100 |     100 |                                        
 Node.js       |    2.01 |        0 |       0 |    2.05 | 12-731                                 
 Tree.js       |    1.91 |        0 |       0 |    1.97 | 11-647                                 
 index.js      |     100 |      100 |     100 |     100 |                                        
---------------|---------|----------|---------|---------|----------------------------------------
```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT

