var fs = require("fs");
const { execFileSync, execSync } = require('child_process')
const _ = require("lodash");
const Viz = require("viz.js");


var header = `
contract LiterateProgrammingNotebook is DSTest, DSDraw {
`;

const solTemplate = (fs, header) => `pragma solidity ^0.4.8;

import "ds-test/test.sol";
import "ds-draw/lib.sol";

${header}

  ${fs.map((f, i) => `function test_no_${i}() {\n${f}}`).join("\n")}

}`;

// tests which should be executed
const tests = [];
// they are collected in this function
var test =  function (data, options) {
  tests.push(data);
  return `\`\`\`javascript\n${data}\n\`\`\`\n<%= test_no_${tests.length-1} %>`;
}

var head = function (data, options) {
  header = data;
  return `\`\`\`javascript\n${data}\n\`\`\`\n`;
}

const bufferToString = v => v.data.map(d => "00".substring(0, 2-d.toString(16).length )+d.toString(16)).join("")

const format = function (ls) {
  let draw = ls.find(l => l.name === "draw");
  if(draw) {
    let el = ls.find(l => {
      return l.params._id.value == draw.params._id.value
      && l.name != "draw";
    });
    let formatted = formatNode(ls, el);
    return formatted;
  } else {
    return "";
  }
}

function isPrintable (x) {
  return x.match(/.{1,2}/g)
          .map(c => parseInt(c, 16))
          .reduce((a, n) => a && 32 < n && n <= 126, true);
}

function toString (x) {
  return x.match(/.{1,2}/g)
          .map(c => parseInt(c, 16))
          .reduce((str, c) => str + String.fromCharCode(c), "")
}


const formatNode = function (ls, el) {
  const handleNested = (tag, tagattrs = "") => {
    let children = [];
    if(el.direct) {
      let cs = el.params.children.value;
      cs = Array.isArray(cs) ? cs : [cs];

      children = cs
      .map(c => formatNode(ls, ls.find(l => {
        return l.params._id.value === c;
      })))
    } else {
      children = ["[TODO]"];
    }
    return `<${tag} ${tagattrs}>${ children.join("\n") }</${tag}>`;
  }
  if(!el) {
    console.log(`DA FUCK ARE YOU DOING?`);
    return "[ERROR]";
  } else {
    switch(el.name) {
      case "graph":
        let children = ls
        .filter(l => {
          if(!("graphId" in l.params)) return false;
          return l.params.graphId.value === el.params._id.value;
        });
        let formatted = children.map(c => formatNode(ls, c));
        let data = `digraph A {\n${formatted.join("\n")}\n}`;
        console.log(data);
        let ret = Viz(data, {format: 'svg'});
        ret ="<center>\n"+ret.replace(/^[^\n]*\n[^\n]*\n[^\n]*\n/,'')+"\n</center>";
        return ret;
        break;
      case "td":
      case "tr":
        return handleNested(el.name);
      case "table":
        return handleNested(el.name, `CELLSPACING="0" border="0" CELLBORDER="1"`);
      case "textStr":
        let str = el.params.str.value.replace(/\0*$/g,"");
        return `${str}`;
      case "text":
        let v = el.params.str.value.slice(2);
        return isPrintable(v) ? toString(v) : "0x" + v;
      case "edge":
        return `  "${el.params.a.value}" -> "${el.params.b.value}";`;
      case "tnode":
        let table = ls.find(l => l.params._id.value === el.params.table.value);
        return `  "${el.params.id.value}" [shape=none, label=<${formatNode(ls, table)}>];`;
      case "node":

      default:
        return `[${el.name}]`;
    }
  }
}


const _format = function (o) {
  const next = () => o.children.map(format).join("\n");
  switch(o.type) {
    case "text":
      const v = o.args.value;
      return typeof v === "object" && v.type === "Buffer" ? bufferToString(v) : v;
    case "ul":
      return next();
    case "li":
      return " * " + next();
    case "h4":
      return "#### " + next();
    case "h3":
      return "### " + next();
    case "h2":
      return "## " + next();
    case "h1":
      return "# " + next();
    case "b":
      return "**" + next() + "**";
    case "div":
      return next();
    case "table":
      let table = next();
      return "<table>" + table + "</table>";
    case "tr":
      return "<tr>" + next() + "</tr>";
    case "td":
      return "<td>" + next() + "</td>";
    case "graph":
      let data = `digraph G {\n${next()}\n}`;
      let ret = Viz(data, {format: 'svg'});
      ret ="<center>\n"+ret.replace(/^[^\n]*\n[^\n]*\n[^\n]*\n/,'')+"\n</center>";
      return ret
    case "node":
      let label = bufferToString(o.args.label);
      return `  "${o.args.id}" [label="${label}"];`;
    case "tnode":
      // let label = bufferToString(o.args.label);
      return `  "${o.args.id}" [label=<${next()}>];`;
    case "edge":
      return `  "${o.args.idA}" -> "${o.args.idB}" ${o.args.params? "["+o.args.params+"]" : ""};`;
    default:
      console.log("unhandeled "+ o.type);
  }
}


var posthook = function (data) {
  if(tests.length > 0) {
    let file = solTemplate(tests, header);
    fs.writeFileSync(`src/asddsa.sol`, file, "utf8");
    try {
    execSync(`dapp eval`, {encoding: "utf8"});
    } catch(e) {
      console.log("ERROR");
      return `\n\`\`\`\n${e}\n\`\`\`\n`;
    }
    let out = fs.readFileSync(`out/eval.json`);
    let template = _.template(data, {
      interpolate:  /<%=([\s\S]+?)%>/g
    });
    let obj = {};
    JSON.parse(out).forEach(test => {
      obj[test.name] = test.drawlogs && format(test.drawlogs) || "";
    })
    data = template(obj);
  }
  return data;
}


module.exports = {
  cmds: {
    test,
    head
  },
  post: posthook
};
