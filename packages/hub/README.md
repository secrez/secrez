# @secrez/hub

**This is a fork of [Localtunnel Server](https://github.com/localtunnel/server) with applied restriction in order to use it for [Secrez](https://github.com/secrez/secrez).**

## Introduction

Secrez, starting from version 0.8.0, allows local accounts to have a full encrypted communication, tunneling their conversation. To send and receive messages, a user must activate a Secrez courier (@secrez/courier). The courier must talk with a remote hub to be accessible remotely.

The hub is a dumb proxy which only allows a restricted number of operations.

Any request that it receive requires a payload and a signature. The hub will verify them and only if they are correct will perform the requested action.

The first step, for the courier, is to publish itself on the hub. This is done calling the api

```
/api/v1/new
```
If everything is fine, the hub will assign an id and a url to the courier. The id is a mix of the base32 version of the signature public key plus a random 8-chars string. The hub will also generate a short url that can be used by the Secrez account to quickly set up a trusted contact.

## Using a hub from Secrez

First, you must activate a local courier (look at the [@secrez/courier README](https://github.com/secrez/secrez/tree/master/packages/courier) for more info).

When you have connected your Secrez account to the courier, you can run `whoami` and see you remote id on the hub and your short url. You can pass the short url to your contacts, to allow them to talk with you.

For privacy reason, and also because id and short url can change, don't add them to, for example, your email signature. But you can add your Secrez public key, if you like.

## Installing your own hub

You can just install it with npm, like
```
npm i -g @secrez/hub
```
and run 
```
secrez-hub
```
This will listen, by default, on port 8433, on http.

To run it on https, use `-s, --secure`.

If your domain is a third level, like `something.example.com`, you must specify the domain when you run the hub, if not it will produce an error accessing the couriers. You can do it with the option `-d, --domain`.

If someone connect to the hub, it will respond with a json like this:
```
{
    welcome_to: 'This is a Secrez hub',
    version: 0.1.0,
    more_info_at: 'https://secrez.github.io/secrez'
}
```
If you prefer to redirect it to a landing page, just use the option `-l, --landing`.

If you need to bind a specific IP address to the hub, use `-a, --address`.

Finally, you can set up the maximum number of sockets allowed by ID. By default it is set to 4, but you can change it with `-m, --max-sockets`.

## In production

To make an hub accessible to, for example, your company, you should:

Run the hub, setup a proxy, for example with Nginx, and set up SSL certificates, for the domain and any subdomain.

When I have a moment, I will write a post on how to do it using Let's Encrypt.

## History

__0.2.0__
* reduce the subdomain to a short one (like 'ch-rt2-9p')
* persist the ID until the user explicitly reset it
* remove short urls, no more necessary


## Test coverage
```
  24 passing (6s)

-------------------|---------|----------|---------|---------|---------------------------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                     
-------------------|---------|----------|---------|---------|---------------------------------------
All files          |    84.5 |    71.52 |    87.3 |   84.47 |                                       
 src               |   80.09 |    70.83 |    87.5 |   80.09 |                                       
  Validator.js     |      80 |       50 |     100 |      80 | 28-30,34                              
  createServer.js  |   75.52 |     62.5 |      90 |   75.52 | ...06,218-230,237-238,243-244,250-251 
  utils.js         |   91.38 |    83.33 |      80 |   91.38 | 18,35,49,66,81                        
 src/lib           |   89.58 |    72.73 |   87.18 |   89.53 |                                       
  Client.js        |   83.93 |       40 |   78.57 |   83.64 | 44,91-94,101-102,107-109              
  ClientManager.js |   94.59 |     87.5 |     100 |   94.59 | 70-72                                 
  Db.js            |   95.24 |    85.71 |     100 |   95.24 | 63                                    
  TunnelAgent.js   |   89.74 |    73.91 |   84.62 |   89.74 | 51,59-62,83,118,147-148               
-------------------|---------|----------|---------|---------|---------------------------------------
```

## Copyright

Secrez-hub is based on [Localtunnel Server](https://github.com/localtunnel/server), which is Copyright (c) 2015 Roman Shtylman  

It has been heavily modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.


## Licence
MIT




     
