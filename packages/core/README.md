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
All files        |   99.75 |    94.81 |     100 |   99.75 |                   
 src             |     100 |    96.69 |     100 |     100 |                   
  Entry.js       |     100 |    95.65 |     100 |     100 | 40                
  Secrez.js      |     100 |    97.01 |     100 |     100 | 136,292,410       
  _Secrez.js     |     100 |    95.83 |     100 |     100 | 218               
 src/config      |   98.53 |    83.87 |     100 |   98.51 |                   
  ConfigUtils.js |   98.44 |    83.87 |     100 |   98.41 | 115               
  booleans.js    |     100 |      100 |     100 |     100 |                   
  index.js       |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
