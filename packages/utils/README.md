# @secrez/utils

Secrez is the secrets manager for the cryptocurrencies era.

This is a utils library used by other packages in the @secrez suite.

## History

**1.1.0**

- implement `secureCompare` with `crypto.timingSafeEqual` for constant-time comparison (PWD-3)
- require Node.js 22.23.4 or later (`engines.node >=22.23.4`)

**1.0.1**

- adds a workaound to avoid converting ETH addresses to floats

**1.0.0**

- uses @secrez/core 1.0.0

## Test coverage

```
  39 passing (157ms)

-------------|---------|----------|---------|---------|------------------------
File         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------|---------|----------|---------|---------|------------------------
All files    |   92.24 |    84.34 |   82.97 |   92.79 |
 UglyDate.js |     100 |    96.66 |     100 |     100 | 60
 index.js    |    90.1 |       80 |   81.81 |   90.69 | 79,195-197,295,327-350
-------------|---------|----------|---------|---------|------------------------
```

## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
