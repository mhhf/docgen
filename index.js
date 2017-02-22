#! /usr/bin/env node
"use strict";
var fs = require("fs");
var marked = require("marked");
var Viz = require("viz.js");
const { execFileSync } = require('child_process')

let style = fs.readFileSync(__dirname + '/css/github-markdown.css', 'utf8');

let inputFile = process.argv[2];
let outputFile = process.argv[3];

let data = fs.readFileSync(inputFile, "utf8");
let processor = {
  viz (data, options) {
    let ret = Viz(data, Object.assign(options, {format: 'svg'}));
    ret ="<center>\n"+ret.replace(/^[^\n]*\n[^\n]*\n[^\n]*\n/,'')+"\n</center>";
    return ret
  },
  sh (data, options) {
    let line = data.replace(/\n/g, '').split(/\s/);
    let cmd = line[0];
    let params = line.slice(1);
    let out = execFileSync(cmd, params);
    return out.toString();
  }
};

data = data.replace(/```({([^}]*)})?([^`]*)```/gm, (a,b,c,d,e,f) => {
  const args = c.split(",")
  const argO = {};
  args.slice(1)
  .forEach(a => {
    let apair = a.split("=");
    let key = apair[0].replace(/ /, "");
    if(apair.length == 2) {
      argO[key] = apair[1];
    } else if(apair.length == 1) {
      argO[key] = true;
    }
  })
  const ptype = args[0];
  if(typeof processor[ptype] === 'function') {
    return processor[ptype](d, argO);
  } else {
    return a;
  }
});

let customStyle = `
svg {
  max-width: 100%;
}
body {
  width:80%;
  margin: auto;
  padding: 45px 15px;
  box-shadow: 0px 0px 20px 0px #ccc;
}
`

fs.writeFileSync(outputFile, `<html><head><style>${customStyle} ${style}</style></head><body class="markdown-body">`+marked(data)+`</body></html>`, 'utf8');
