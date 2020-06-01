const express = require('express');
const session = require('express-session');
const httpProxy = require('http-proxy');

// global catch alls for errors
process.on('uncaughtException', (e) => {
  console.error(e)
  process.exit(-1);
});
process.on('unhandledRejection', (e) => console.error(e));

// create express instance
const app = express();
const proxy = httpProxy.createProxyServer({
  ignorePath : true
});

app.use(session({
  name              : 'cas-service-id',
  secret            : 'foobar',
  resave            : false,
  saveUninitialized : true
}));

// setup simple http logging
app.use((req, res, next) => {
  res.on('finish',() => {
    console.log(`${res.statusCode} ${req.protocol}/${req.httpVersion} ${req.originalUrl || req.url} ${req.get('User-Agent') || 'no-user-agent'}`);
  });
  next();
});

app.use('/vivo/loginExternalAuthReturn', require('./cas')(app, proxy));
app.use('/vivo/logout', (req, res) => {
  console.log('CAS Service: destorying session');
  req.session.destroy();
  proxy.web(req, res, { target: `http://vivo:8080/vivo/logout` });
});
// app.use(/.*/, (req, res) => {
//   proxy.web(req, res, { target: `http://discovery-api:9000${req.originalUrl}` });
// });

// route all /api requests to discovery api
app.use(/^\/api(\/.*|$)/, (req, res) => {
  proxy.web(req, res, { target: `http://discovery-api:9000${req.originalUrl}` });
});
app.use(/^\/.*/, (req, res) => {
  proxy.web(req, res, { target: `http://client:3000${req.originalUrl}` });
});

app.listen(8080, () => {
  console.log('server ready on port 8080');
});


