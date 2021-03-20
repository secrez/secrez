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


## TODO

API documentation

## History

__1.0.2__
* Adds `encryptFile` and `decryptFile` to ExternalFs

## Test coverage

```
  95 passing (3s)

---------------|---------|----------|---------|---------|-------------------------------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                         
---------------|---------|----------|---------|---------|-------------------------------------------
All files      |   91.06 |    80.03 |   91.97 |   90.94 |                                           
 DataCache.js  |   89.41 |    74.07 |   90.91 |   89.29 | 18-24,123-124,150                         
 ExternalFs.js |   94.03 |    76.92 |     100 |   93.94 | 10,28,34,50                               
 FsUtils.js    |     100 |      100 |     100 |     100 |                                           
 InternalFs.js |   86.99 |    72.63 |   88.46 |   86.89 | ...19,248,265,274,312,322,348,404-409,441 
 Messages.js   |     100 |      100 |     100 |     100 |                                           
 Node.js       |    93.7 |    87.45 |   95.74 |   93.55 | ...77,495-501,561,567,582-586,645,691,699 
 Tree.js       |   89.92 |     74.1 |   86.49 |   89.86 | ...53,399-422,453,463,512,604,610,638-647 
 index.js      |     100 |      100 |     100 |     100 |                                           
---------------|---------|----------|---------|---------|-------------------------------------------
```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT

