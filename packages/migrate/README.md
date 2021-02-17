# Secrez-migrate

A tool to migrate Secrez-s database, when it is required

## How to install it

First, install pnpm
```
npm i -g pnpm
```
and later
```
pnpm i -g @secrez/migrate
```

## How to use it

You should run it with the same parameters you use to run Secrez. If for example you run just
```
secrez
```

you can run
```
secrez-migrate
```
If not, specify the container the same way you do when you run Secrez.

## How it works

It backs up your Secrez folder and migrate all its components.
At the end of the process you can run an updated version of Secrez (right now secrez@1.0.0) and check if everything works as expected. If not, run again secrez-migrate with the same parameters, adding the option `--reverse`. That will restore the original database.

Then you can load a previous, compatible version of Secres, with

```
pnpm i -g secrez@0.10.8
```
and manage your data as you always did. But, if that happens, please, contact me at `secrez@sullo.co` and let me know.

If after the migration, everything works well, you can remove the backup running again secrez-migrate, but this time adding the option `--done`.

## TODO

- Completing tests. Actually they don't work because during testing, and only then, fs-extra is exiting the process without producing any error.

## History

__0.0.2__
* first working version migrating the db from version 2 to version 3, usingi `secrez@1.0.0-beta.0`

## Copyright

Secrez has been created by [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>). Any opinion, help, suggestion, critic is very welcome.

## Licence
```
MIT License

Copyright (c) 2017-present, Francesco Sullo <francesco@sullo.co>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

