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
All files       |    10.5 |     2.14 |    8.73 |   10.96 |                      
 src            |   12.23 |        0 |       4 |   14.16 |                      
  index.js      |   12.23 |        0 |       4 |   14.16 | 18-209,222-271       
 src/lib        |   10.03 |     2.52 |   10.25 |   10.21 |                      
  Crypto0.js    |   63.63 |    28.57 |      50 |   63.63 | 23,27,37-46          
  DataCache0.js |    8.23 |     1.85 |    9.09 |    8.33 | 10-149               
  Entry0.js     |   48.27 |    26.08 |      50 |   48.27 | 13-19,27,40-45,60-68 
  Messages0.js  |     100 |      100 |     100 |     100 |                      
  Node0.js      |    2.25 |        0 |       0 |     2.3 | 12-730               
  coreConfig.js |     100 |      100 |     100 |     100 |                      
  utils0.js     |      25 |        0 |    12.5 |      25 | 7-21,32-49           
----------------|---------|----------|---------|---------|----------------------
```

### Notice that most function here are taken from other packages, so they are already tested.

## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
