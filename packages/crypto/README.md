# @secrez/crypto

Secrez is the secrets manager for the cryptocurrencies era.

@secrez/crypto is the basic crypto library. It includes only functions that can be called also in a browser. 

In @secrez/core it is integrated with methods who works only server side, in order to be used in Secrez.

## TODO

API documentation

## History

__0.1.5__
* adds `bufferToUnti8Array`

__0.1.4__
* adds more methods to encrypt and decrypt buffers too

__0.1.2__
* moving all methods that don't work in a browser back to @secrez/core

__0.1.0__
* moved from @secrez/core to this separate library 


## Test coverage

```
  34 passing (664ms)
  2 pending

----------|---------|----------|---------|---------|--------------------------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                    
----------|---------|----------|---------|---------|--------------------------------------
All files |     100 |     86.9 |     100 |     100 |                                      
 index.js |     100 |     86.9 |     100 |     100 | 42-53,82,108-134,188-189,208,358-362 
----------|---------|----------|---------|---------|--------------------------------------

```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
