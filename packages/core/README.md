# @secrez/core

Secrez is the secrets manager for the cryptocurrencies era.

@secrez/core is the basic library.

It exposes 
* Secrez
* Crypto
* Entry
* config
* ConfigUtils

Those classes are used by other Secrez packages to interact with the encrypted database.


## TODO

API documentation

## History

__0.8.5__
* improve _Secrez and Secrez encapsulation of private data
* when changing the password, compares the existent password with the derivated one to avoid brute force attacks from inside Secrez (for example, in a future plugin)  


## Test coverage

```
  60 passing (2s)

-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   99.75 |    94.31 |     100 |   99.75 |                   
 src             |     100 |    96.07 |     100 |     100 |                   
  Entry.js       |     100 |    95.65 |     100 |     100 | 40                
  Secrez.js      |     100 |    96.95 |     100 |     100 | 132,287,405       
  _Secrez.js     |     100 |    91.67 |     100 |     100 | 18,218            
 src/config      |   98.57 |    84.85 |     100 |   98.55 |                   
  ConfigUtils.js |   98.48 |    84.85 |     100 |   98.46 | 116               
  booleans.js    |     100 |      100 |     100 |     100 |                   
  index.js       |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
