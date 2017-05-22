var fs = require("fs");
var marked = require("marked");
var Viz = require("viz.js");
var SHA3 = require('sha3');
const _ = require("lodash");

const sol_module = require("./sol.js");
var modules = [];

modules.push(sol_module);

let style = fs.readFileSync(__dirname + '/css/github-markdown.css', 'utf8');

let inputFile = process.argv[2];
let outputFile = process.argv[3];

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
  },
  dotMath (data, options) {
    var d = new SHA3.SHA3Hash(224);
    d.update(data);
    let id = d.digest('hex');
    fs.writeFileSync(`out/${id}.dot`, data, "utf8");
    let cmd = `dot -Txdot out/${id}.dot | dot2tex -t math | pdflatex -output-directory=out -jobname=${id} && convert -density 300 out/${id}.pdf -quality 90 doc/${id}.png`;
    let out = execSync(cmd);
    return `![](${id}.png)`;
  },
};
modules.forEach(m => Object.assign(processor, m.cmds));


function render() {
  let data = fs.readFileSync(inputFile, "utf8");
  data = data.replace(/\\n/g,'\n');


  data = data.replace(/```({([^}]*)})?\s*([^`]*)```/gm, (a,b,c,d,e,f) => {
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

  modules.forEach(m => {
    if("post" in m) (data = m.post(data))
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

  let katex = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.css" integrity="sha384-wITovz90syo1dJWVh32uuETPVEtGigN07tkttEqPv+uR2SE/mbQcG7ATL28aI9H0" crossorigin="anonymous">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.js" integrity="sha384-/y1Nn9+QQAipbNQWU65krzJralCnuOasHncUFXGkdwntGeSvQicrYkiUBwsgUqc1" crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/contrib/auto-render.min.js" integrity="sha384-dq1/gEHSxPZQ7DdrM82ID4YVol9BYyU7GbWlIwnwyPzotpoc57wDw/guX8EaYGPx" crossorigin="anonymous"></script>
  `

  let katex_autorender = `<script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body);
    });
  </script>
  <script src="/reload/reload.js"></script>
  `

  fs.writeFileSync(outputFile, `<!DOCTYPE html><html><head> <meta charset="utf-8">${katex}<style>${customStyle} ${style}</style></head><body class="markdown-body">`+marked(data)+` ${katex_autorender}</body></html>`, 'utf8');
}

module.exports = {
  render
};
