# @secrez/tunnel

**_A fork of https://github.com/localtunnel/localtunnel with restricted functions in order to be used by Secrez_**

This is a restricted, modified version of the original localtunnel, with the goal of allowing only encrypted communication between Secrez users.

It is used internally by the @secrez/courier and it is not supposed to be used directly.


## Test coverage
```
  5 passing (1s)

---------------------------|---------|----------|---------|---------|-------------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s             
---------------------------|---------|----------|---------|---------|-------------------------------
All files                  |   84.76 |    53.03 |   86.11 |   85.09 |                               
 tunnel                    |      75 |       40 |      75 |      80 |                               
  index.js                 |      75 |       40 |      75 |      80 | 8-9                           
 tunnel/src                |   85.53 |    55.36 |    87.5 |   85.43 |                               
  HeaderHostTransformer.js |     100 |       40 |     100 |     100 | 4-11                          
  Tunnel.js                |   82.89 |    42.31 |   88.24 |   82.67 | ...91,118-119,164-165,172,180 
  TunnelCluster.js         |   86.57 |       72 |   83.33 |   86.57 | 55-56,80,109-119              
---------------------------|---------|----------|---------|---------|-------------------------------
```

## Copyright

Secrez-hub is based on Localtunnel which is Copyright (c) 2015 Roman Shtylman  

It has been modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence

MIT License

