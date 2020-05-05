module.exports = {
  Secrez: {
    password: 'SomeCRAZY851',
    hash100Iterations: ''
  },
  password: 'unaSTRANA342',
  b58Hash: 'J5JDehfYiYFyRcySdHQNiCJdVrsrUyVtpCEXU7fBQ6q3',
  passwordSHA3Hex: 'fdb07834d77b30a750f3b14ab06b000730ee2f2bb52a842fc78d72d88c82038e',
  passwordB64: 'dW5hU1RSQU5BMzQy',
  salt: 'someSalt',
  iterations: 23456,
  iterationsB58: '7Yq',
  hash23456iterations: 'GCF7ytpi9DyMPbuDhLj6vW1oSe99nBTLzABcb1qvTeLY',
  hash23456iterationsNoSalt: 'ErQE64oXPPs7QqbirznqzCap3KNyMKDZZZBexRfhS7Pb',
  someYaml: `password: 93939393848484
public_key: |
  asdejwwjfajsfgajfgewjfgjgdajdgasjdgasdjagdsja
  jfgewjfgjgdajdgasjdgasdjagdsjaasdejwwjfajsfga
private_key: asdjahejkhkasdhaskjdhsakjdhewkhfwekfhfhasdjas
command: ["redis-server", "--appendonly", "no"]
expose:
  - 6378
ports:
  - 6380:6379
`,
  someModifiedYaml: `password: 8763yetyss
public_key: asdejwwjfajsfgajfgewjfgjgdajdgasjdgasdjagdsja
command: ["redis-server", "--appendonly", "no"]
ports:
  - 6380:6379
`,
  someMoreModifiedYaml: `password: 93939393848484
public_key: asdejwwjfajsfgajfgewjfgjgdajdgasjdgasdjagdsja
private_key: asdjahejkhkasdhaskjdhsakjdhewkhfwekfhfhasdjas
command: ["redis-server", "--appendonly", "no"]
expose:
  - 6379
ports:
  - 6380:6379
urls:
  - http://sacasa.co
  - http://sasferre.in  
`
}
