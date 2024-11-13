# @secrez/fs

Secrez is the secrets manager for the cryptocurrencies era.

This is the filesystem component.

@secrez/fs exposes:

- InternalFs
- ExternalFs
- FsUtils
- Tree
- Node
- DataCache
- FileCipher (starting from 1.0.3)

## TODO

API documentation

## History

**1.0.3**

- Move `encryptFile` and `decryptFile` from ExternalFs to FileCipher

**1.0.2**

- Adds `encryptFile` and `decryptFile` to ExternalFs

## Test coverage

```
  98 passing (3s)

---------------|---------|----------|---------|---------|-------------------------------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                         
---------------|---------|----------|---------|---------|-------------------------------------------
All files      |    82.9 |    68.72 |   86.61 |   82.56 |                                           
 DataCache.js  |   89.41 |    74.07 |    90.9 |   89.28 | 17-23,122-123,149                         
 ExternalFs.js |   94.02 |    76.92 |     100 |   93.93 | 9,29,35,54                                
 FileCipher.js |   88.63 |    73.33 |     100 |   88.63 | 8,52,80,85,94                             
 FsUtils.js    |     100 |      100 |     100 |     100 |                                           
 InternalFs.js |   86.99 |    72.63 |   88.46 |   86.88 | ...25,257,274,283,328,339,359,418-423,455 
 Messages.js   |     100 |      100 |     100 |     100 |                                           
 Node.js       |    66.1 |    54.81 |   78.72 |   65.31 | ...67,579-605,644-648,666,669,683-720,729 
 Tree.js       |   89.91 |    74.09 |   86.48 |   89.63 | ...72,417-439,466,476,530,622,630,661-672 
---------------|---------|----------|---------|---------|-------------------------------------------
```

## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
