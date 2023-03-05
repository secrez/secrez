# @secrez/tunnel

**_A fork of https://github.com/localtunnel/localtunnel with restricted functions in order to be used by Secrez_**

This is a restricted, modified version of the original localtunnel, with the goal of allowing only encrypted communication between Secrez users.

It is used internally by the @secrez/courier and it is not supposed to be used directly.

## Test coverage

```
  4 passing (723ms)
  1 pending

---------------------------|---------|----------|---------|---------|-------------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------------------|---------|----------|---------|---------|-------------------------------
All files                  |   80.49 |    48.48 |   83.33 |   80.75 |
 tunnel                    |      75 |       40 |      75 |      80 |
  index.js                 |      75 |       40 |      75 |      80 | 8-9
 tunnel/src                |   80.92 |       50 |   84.38 |   80.79 |
  HeaderHostTransformer.js |     100 |       40 |     100 |     100 | 4-11
  Tunnel.js                |   81.58 |    38.46 |   88.24 |   81.33 | ...28-129,144,172-173,180,188
  TunnelCluster.js         |   77.61 |       64 |      75 |   77.61 | 48-65,70-72,84,117-127
---------------------------|---------|----------|---------|---------|-------------------------------

```

## Copyright

Secrez-hub is based on Localtunnel which is Copyright (c) 2015 Roman Shtylman

It has been modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence

MIT License
