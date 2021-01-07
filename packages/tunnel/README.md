# @secrez/tunnel

**_A fork of https://github.com/localtunnel/localtunnel with restricted functions in order to be used by Secrez_**

This is a restricted, modified version of the original localtunnel, with the goal of allowing only encrypted communication between Secrez users.

It is used internally by the @secrez/courier and it is not supposed to be used directly.


## Test coverage
```
  5 passing (866ms)

---------------------------|---------|----------|---------|---------|-------------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s             
---------------------------|---------|----------|---------|---------|-------------------------------
All files                  |    87.8 |    54.55 |   88.89 |    88.2 |                               
 tunnel                    |      75 |       40 |      75 |      80 |                               
  index.js                 |      75 |       40 |      75 |      80 | 8-9                           
 tunnel/src                |   88.82 |    57.14 |   90.63 |   88.74 |                               
  HeaderHostTransformer.js |     100 |       40 |     100 |     100 | 4-11                          
  Tunnel.js                |   82.89 |    42.31 |   88.24 |   82.67 | ...91,118-119,164-165,172,180 
  TunnelCluster.js         |   94.03 |       76 |   91.67 |   94.03 | 55-56,80,119                  
---------------------------|---------|----------|---------|---------|-------------------------------
```

## Copyright

Secrez-hub is based on Localtunnel which is Copyright (c) 2015 Roman Shtylman  

It has been modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence

MIT License

