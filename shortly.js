var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'choose wisely',
  saveUninitialized: true,
  resave: true
}));

app.get('/',
function(req, res) {
  restrict(req, res, function() {
    res.render('index');
  });
});

app.get('/create',
function(req, res) {
  restrict(req, res, function() {
    res.render('index');
  });
});

app.get('/links',
function(req, res) {
  restrict(req, res, function() {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  // Resets the Links collection and fetches the default set of models
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
function hash(password) {
  bcrypt.hash(password, null, null, function(err, hash) {
    if (err) {
      throw err;
    }

    return hash;
  });
}

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  req.session.user = username;

  new User({ 'username': username }).fetch()
    .then(function(found) {
      if (found) {
        bcrypt.hash(password, null, null, function(err, hash) {
          if (err) {
            throw err;
          }

          bcrypt.compare(password, hash, function(err, result) {
            if (err) {
              throw err;
            }

            res.redirect('/');
          });
        });
      } else {
        res.redirect('/login');
      }
    });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({'username': username }).fetch()
    .then(function(found) {
      if (found) {
        res.send(200, found.attributes);
        res.redirect('login');
      } else {
         bcrypt.hash(password, null, null, function(err, hash) {
          if (err) {
            throw err;
          }

          var user = new User({
            username: username,
            hash: hash
          });

          user.save().then(function() {
            console.log('New user created');
            res.redirect('/');
          });
        });
      }
    });
});

function restrict(req, res, next) {
  req.session.user = req.session.user || '';
  if (req.session.user !== '') {
    next();
  } else {
    req.session.error = 'Access denied!!1! ;)';
    res.redirect('login');
  }
}

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            console.log('link to return: ', link.get('url'));
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
