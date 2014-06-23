var http = require('http');
var browserify = require('browserify');
var fs = require('fs');
var brfs = require('brfs');
var multilevel = require('multilevel');
var Engine = require('engine.io-stream');
var levelup = require('levelup');
var leveldown = require('leveldown');
var glob = require('glob');

var db = levelup('db', {valueEncoding: 'json', db: leveldown});
multilevel.writeManifest(db, __dirname + '/assets/manifest.json');

glob.sync('./slides/*.html', function(er, files) {
  var content = [];
  files.forEach(function(file) {
    content.push(fs.readFileSync(file, 'utf-8').toString());
  });
  db.put('slides', content, startServer);
});

function startServer(err) {
  if (err) return console.log(err);

  var server = http.createServer();

  var engine = Engine(function (stream) {
    stream.pipe(multilevel.server(db)).pipe(stream);
  });

  engine.attach(server, '/db');

  var port = process.env.PORT || 1337;

  server.on('request', function(q, r) {
    if (q.url === '/') {
      r.setHeader('Content-Type', 'text/html');
      fs.createReadStream('./assets/index.html').pipe(r);
    }
    if (q.url === '/app.js') {
      r.setHeader('Content-Type', 'application/javascript');
      browserify({debug: true})
        .add('./assets/app.js')
        .transform(brfs)
        .bundle()
        .pipe(r)
      ;
    }
  });

  server.listen(port, function running() {
    console.log('listening on http://localhost:%s', port);
  });
}

