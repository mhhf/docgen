#! /usr/bin/env node
"use strict";

var {render} = require("./render.js");

render();

var fs = require("fs");
var express = require('express')
var http = require('http')
var path = require('path')
var reload = require('reload')
var bodyParser = require('body-parser')
const opn = require('opn');

var app = express()

app.set('port', process.env.PORT || 3000)
app.use(bodyParser.json()) //parses json, multi-part (file), url-encoded

app.get('/', function(req, res) {
  res.sendFile(path.join(path.resolve(), './doc/doc.html'))
})

var server = http.createServer(app);
let outputFile = process.argv[3];

let reloadServer = reload(server, app);

var toReload = false;

var doReload = () => {
  toReload = false;
  render();
  reloadServer.reload();
  console.log("RELOAD");
}

fs.watch(path.join(path.resolve(), "src"), {
  recursive: true
}, function (a, b) {
  if(b === "asddsa.sol") return null;
  if(!toReload) toReload = true;
  setTimeout(() => {
    if(toReload) doReload();
  }, 400)
})


server.listen(app.get('port'), function(){
  console.log("Web server listening on port " + app.get('port'));
});
// opn('http://localhost:3000');
