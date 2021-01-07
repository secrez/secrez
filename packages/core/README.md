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
  63 passing (2s)

-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   99.77 |     95.2 |     100 |   99.77 |                   
 src             |     100 |    96.94 |     100 |     100 |                   
  Crypto.js      |     100 |       75 |     100 |     100 | 17-21             
  Entry.js       |     100 |    95.65 |     100 |     100 | 40                
  Secrez.js      |     100 |    98.54 |     100 |     100 | 111,438           
  _Secrez.js     |     100 |    96.43 |     100 |     100 | 124               
 src/config      |   98.48 |    84.85 |     100 |   98.46 |                   
  ConfigUtils.js |   98.44 |    84.85 |     100 |   98.41 | 110               
  index.js       |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
