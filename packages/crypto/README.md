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
  33 passing (682ms)
  2 pending

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |   99.42 |     86.9 |   98.21 |   99.39 |                   
 index.js |   99.42 |     86.9 |   98.21 |   99.39 | 141               
----------|---------|----------|---------|---------|-------------------

> @secrez/crypto@1.0.1 posttest /Users/sullof/Projects/Personal/secrez/packages/crypto
> nyc check-coverage --statements 99 --branches 85 --functions 99 --lines 99

 ERROR  Command failed with exit code 1.

```


## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
