# @secrez/tunnel

**_A fork of https://github.com/localtunnel/localtunnel with restricted functions in order to be used by Secrez_**

This is a restricted, modified version of the original localtunnel, with the goal of allowing only encrypted communication between Secrez users.

It is used internally by the @secrez/courier and it is not supposed to be used directly.


## Test coverage
```
  5 passing (658ms)

---------------------------|---------|----------|---------|---------|-------------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s             
---------------------------|---------|----------|---------|---------|-------------------------------
All files                  |   83.54 |       50 |   86.11 |   83.85 |                               
 tunnel                    |      75 |       40 |      75 |      80 |                               
  index.js                 |      75 |       40 |      75 |      80 | 8-9                           
 tunnel/src                |   84.21 |    51.79 |    87.5 |   84.11 |                               
  HeaderHostTransformer.js |     100 |       40 |     100 |     100 | 4-11                          
  Tunnel.js                |   81.58 |    38.46 |   88.24 |   81.33 | ...08-109,124,154-155,162,170 
  TunnelCluster.js         |   85.07 |       68 |   83.33 |   85.07 | 50-65,71-73,80,119            
---------------------------|---------|----------|---------|---------|-------------------------------
```

## Copyright

Secrez-hub is based on Localtunnel which is Copyright (c) 2015 Roman Shtylman  

It has been modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence

MIT License

