/* globals Promise */

const shell = require('shell')
const app = new shell({chdir: __dirname})
const psswrd = require('./lib/Psswrd')
const exec = require('child_process').exec

app.configure(function () {
  app.use(shell.completer({shell: app}))
  app.use(shell.router({shell: app}))
  app.use(shell.help({shell: app, introduction: true}))
  app.use(shell.error({shell: app}))
})

app.on('exit', function () {
  // psswrd.onClose()
  if (app.server) {
    app.server.kill()
  }
  if (app.client) {
    app.client.quit()
  }
})
//
//
// var routes = [
//   ['cmd1', 'Run command 1', function (req, res, next) {
//     res.cyan('Running command 1').ln();
//     return Promise.resolve()
//         .then(() => {
//           return Promise.resolve(next())
//         })
//
//   }],
//   ['cmd2', 'Run command 2', function (req, res, next) {
//     res.cyan('Running command 2').ln();
//     next();
//   }],
//   ['cmd3', 'Run command 3', function (req, res, next) {
//     res.cyan('Running command 3').ln();
//     next();
//   }]
// ];
//
// var middlewares = [];
//
// routes.forEach(function (route) {
//   middlewares.push(route[2]);
//   app.cmd.call(null, route[0], route[1], route[2], function (req, res, next) {
//     res.cyan('Command "' + req.command + '" succeed');
//     res.prompt();
//   });
// });
// app.cmd('all', 'Run all command', middlewares, function (req, res, next) {
//   res.cyan('All commands succeed');
//   res.prompt();
// })


// Route middleware
var auth = function (req, res, next) {
  if (req.params.uid == process.getuid()) {
    next()
  } else {
    throw new Error('Not me');
  }
}
// Global parameter substitution
app.param('uid', function (req, res, next) {
  exec('whoami', function (err, stdout, sdterr) {
    req.params.username = stdout;
    next();
  });
});
// Simple command
app.cmd('help', function (req, res) {
  res.cyan('Run this command `./ami user ' + process.getuid() + '`');
  res.prompt()
});
// Command with parameter and two route middlewares
app.cmd('user :uid', auth, function (req, res) {
  res.cyan('Yes, you are ' + req.params.username);
});