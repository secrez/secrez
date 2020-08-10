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

Run the hub, setup a proxy, for example with Nginx, and set up SSL certificates, for the domain and any subdomain. The hub, to work, requires that the firewall allows access to port from 32k to 64k, because those ports are randomly used to generate the tunnels.

When I have a moment, I will write a post on how to do it using Let's Encrypt.


## Test coverage
```
  5 passing (132ms)

-------------------|---------|----------|---------|---------|---------------------------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                     
-------------------|---------|----------|---------|---------|---------------------------------------
All files          |   73.48 |    60.61 |   70.69 |   73.42 |                                       
 src               |   78.16 |    68.24 |   90.48 |   78.16 |                                       
  Validator.js     |      80 |       50 |     100 |      80 | 28-30,34                              
  createServer.js  |   76.55 |    69.57 |      90 |   76.55 | ...04,216-228,235-236,241-242,248-249 
  utils.js         |   82.93 |     69.7 |   85.71 |   82.93 | 12,19-23,42,53                        
 src/lib           |   68.42 |    46.81 |   59.46 |   68.25 |                                       
  Client.js        |   60.71 |       40 |   42.86 |      60 | 21,37,44,53-83,91-94,101-102,107-109  
  ClientManager.js |   70.27 |     37.5 |   71.43 |   70.27 | 35,57,70-84                           
  Shortener.js     |     100 |    83.33 |     100 |     100 | 20                                    
  TunnelAgent.js   |   65.82 |    43.48 |   61.54 |   65.82 | ...19,132-136,148-149,160-163,171-172 
-------------------|---------|----------|---------|---------|---------------------------------------
```

## Copyright

Secrez-hub is based on [Localtunnel Server](https://github.com/localtunnel/server), which is Copyright (c) 2015 Roman Shtylman  

It has been modified by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.


## Licence
MIT




     
