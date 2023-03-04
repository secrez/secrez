# @secrez/test-helpers

Secrez is the secrets manager for the cryptocurrencies era.

This is a utils library for testing.

## History

**2.0.0**

- Use reduced versions of other Secrez packages to avoid cyclic dependencies. They didn't affect any Secrez package in production because test-helpers is used only for testing purposes, but it is cleaner this way.

## Test coverage

```
  1 passing (3ms)

----------------|---------|----------|---------|---------|----------------------
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s    
----------------|---------|----------|---------|---------|----------------------
All files       |   10.65 |     2.38 |    8.74 |   11.13 |                      
 src            |   12.23 |        0 |       4 |   14.17 |                      
  index.js      |   12.23 |        0 |       4 |   14.17 | 18-209,222-271       
 src/lib        |   10.23 |     2.81 |   10.26 |   10.41 |                      
  Crypto0.js    |   68.18 |    42.86 |      50 |   68.18 | 27,37-46             
  DataCache0.js |    8.24 |     1.85 |    9.09 |    8.33 | 10-149               
  Entry0.js     |   48.28 |    26.09 |      50 |   48.28 | 13-19,27,40-45,60-68 
  Messages0.js  |     100 |      100 |     100 |     100 |                      
  Node0.js      |    2.25 |        0 |       0 |    2.31 | 12-730               
  coreConfig.js |     100 |      100 |     100 |     100 |                      
  utils0.js     |      25 |        0 |    12.5 |      25 | 7-21,32-49           
----------------|---------|----------|---------|---------|----------------------
```

### Notice that most function here are taken from other packages, so they are already tested.

## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
