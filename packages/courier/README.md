# @secrez/courier

A courier component for Secrez.

Secrez-courier activates a local server which publish itself on a remote hub and allows communications between local secrez accounts. 

## Install

To install
```
npm i -g @secrez/courier
```

## Usage

You can just run
```
secrez-courier
```
By default it will use https://secrez.cc as a remote hub. If you install your own hub you can pass it like
```
secrez-courier -H https://my-secrez-hub.com
```
When you launch the courier for the first time you can define the owner of the courier. You can do it explicity, like
```
secrez-courier -o BJwJ57ZEyE7DSJDj9BMb785TqbSXTCUu1zEGmaPQgbr2076BhxWxf8j3sMDDK311GTQVGBrfMqUepiWV7HL56FbeL
```
specifying your public key. Alternatively, if you don't set it, the first secrez account that will try to use the courier will become its owner.

If you want to activate two courier on your localhost, you must specify the data root. By default, the courier saves its data in `~/.secrez-courier`. You can set a different root with, for example:
```
secrez-courier -r ~/.some-other-root
```

In any case, the courier will produce a message showing the port where it is listening to.

## How to use it is Secrez

After entering in Secrez, to see your public key, you can run `whoami`.

To activate the connection to the courier, run `courier`. It will ask for the port where the courier is listening to. Type it and it will take ownership of the courier and will publish it to the hub.
 
## Notes

The courier just work as a post office. It is able to send and receive messages but it has no idea what a message contains. It just verifies that any message has a payload and a signature. If they are correct and the public key of the signer is in your trusted circle, the courier accepts the message, if not it produces an error. The data are saved in an SQLite3 database.

The connected Secrez account will then be able to receive message in real time or to get the history specifying the interval.


## History

__0.2.0__
* Align to @secrez/hub 0.2.0

## Test coverage

```
  12 passing (7s)

------------|---------|----------|---------|---------|----------------------------------------------
File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                            
------------|---------|----------|---------|---------|----------------------------------------------
All files   |    79.2 |    63.87 |   79.55 |   79.12 |                                              
 App.js     |   78.49 |    60.98 |   69.23 |   78.49 | ...5,150,175,180-182,186-187,196-198,210,220 
 Config.js  |     100 |      100 |     100 |     100 |                                              
 Courier.js |   83.33 |        0 |      50 |   83.33 | 12                                           
 Db.js      |   91.49 |    74.19 |     100 |   91.49 | 84-87                                        
 Server.js  |   69.66 |     56.1 |   71.43 |   69.32 | 16,55-62,91,94,111,135-151,156-160,165-176   
------------|---------|----------|---------|---------|----------------------------------------------
```
## Copyright

(c) 2020-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT

