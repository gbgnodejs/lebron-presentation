var fs = require('fs');
var insertCss = require('insert-css');
var multilevel = require('multilevel');
var Engine = require('engine.io-stream');
var manifest = require('./manifest');
var levelup = require('levelup');
var leveljs = require('level-js');
var db = multilevel.client(manifest);
var localDb = levelup('db', {db: leveljs, valueEncoding: 'json'});

window.db = db;
window.localDb = localDb;
var domify = require('domify');

var stream = Engine('/db');
stream.pipe(db.createRpcStream()).pipe(stream);
stream.on('error', start);
insertCss(fs.readFileSync(__dirname + '/style.css'));

var storageKey = 'dotnetmentor.slide';
var styleKey = storageKey + '.style';

db.get('slides', start);

function start(err, slides) {
  if (err) {
    localDb.get('slides', load);
  } else {
    db.createReadStream().pipe(localDb.createWriteStream());
    load(null, slides);
  }
}

function load(err, slides) {
  if (err) return alert(err);
  var slideNumber = parseInt(localStorage.getItem(storageKey), 10);
  if (isNaN(slideNumber)) slideNumber = -1;
  localStorage.removeItem(storageKey);
  var style = JSON.parse(localStorage.getItem(styleKey));
  if (style) {
    window.document.body.style.backgroundColor = style.backgroundColor;
    window.document.body.style.color = style.color;
  }
  onkeypress({keyCode: "l".charCodeAt(0)});
  document.onkeypress = onkeypress;
  function onkeypress(e) {
    var match = function(x) { return String.fromCharCode(e.keyCode).match(x); };

    var saveStyle = function() {
      localStorage.setItem(styleKey, JSON.stringify({color: document.body.style.color, backgroundColor: document.body.style.backgroundColor}));
    };

    if (match(/b/i)) { document.body.style.color = 'white'; document.body.style.backgroundColor = 'black'; saveStyle(); return; }
    if (match(/k/i)) { document.querySelector('img.logo').style.display = 'none'; return; }
    if (match(/u/i)) { document.querySelector('img.logo').style.display = 'block'; return; }
    if (match(/c/i)) { document.body.style.color = '#17b22a'; document.body.style.backgroundColor = '#202020'; saveStyle(); return; }
    if (match(/r/i)) { localStorage.setItem(storageKey, slideNumber-1); location.reload(); }
    if (match(/g/i)) { localStorage.setItem(storageKey, (parseInt(prompt('Goto slide'), 10))-2); location.reload(); }

    if (match('\\?')) {
      document.querySelector('#slide').innerHTML = '<pre style="font-size:20px">' + onkeypress.toString() + '</pre>';
      return;
    }
    slideNumber = slideNumber + (match(/h/i) ? -1 : match(/l/i) ? 1 : 0);
    if (slideNumber < 0) slideNumber = 0;
    var slide;
    while(undefined === (slide = domify(slides[slideNumber]))) --slideNumber;
    document.querySelector('#slide').innerHTML = '<h1>' + (slide.getAttribute('data-title') || '') + '</h1>' + slide.innerHTML;
    document.querySelector('footer').innerHTML = parseInt(slideNumber, 10)+1 + "/" + slides.length;
  }
}
