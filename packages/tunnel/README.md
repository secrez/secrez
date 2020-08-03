# @secrez/tunnel

**_A fork of https://github.com/localtunnel/localtunnel with restricted functions in order to be used by Secrez_**

This is a restricted, modified version of the original localtunnel, with the goal of allowing only encrypted communication between Secrez users.

It is used internally by the @secrez/courier and it is not supposed to be used directly.


## Test coverage
```
  5 passing (998ms)

---------------------------|---------|----------|---------|---------|-------------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s             
---------------------------|---------|----------|---------|---------|-------------------------------
All files                  |   87.74 |    51.61 |   85.71 |   88.16 |                               
 tunnel                    |      75 |       40 |      75 |      80 |                               
  index.js                 |      75 |       40 |      75 |      80 | 8-9                           
 tunnel/src                |   88.81 |    53.85 |    87.1 |   88.73 |                               
  HeaderHostTransformer.js |     100 |       60 |     100 |     100 | 4-6                           
  Tunnel.js                |   87.14 |       50 |   88.24 |   86.96 | 65-68,73-74,94-95,126,142,150 
  TunnelCluster.js         |   89.23 |       56 |   81.82 |   89.23 | 45-58,72,76,111               
---------------------------|---------|----------|---------|---------|-------------------------------

```

## Copyright

Secrez-hub is based on Localtunnel which is Copyright (c) 2015 Roman Shtylman  

It has been modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence

MIT License

