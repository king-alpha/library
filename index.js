const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const app = express();
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }, err => {
  if (err) return console.error('Database connection error', err);
  console.log('Database connection successful');
});
mongoose.set('useCreateIndex', true);
require('./models');
const User = mongoose.model('User');

// configuration settings on the app
app.set('view engine', 'ejs');
app.set('x-powered-by', false);
app.use(express.static('./public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    resave: true,
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
); // end of configuration settings

app.use(async function(req, res, next) {
  if (req.session.userId) {
    req.user = await User.findById(req.session.userId, {
      password: false
    }).lean();
  }
  app.locals.user = req.user ? req.user : undefined;

  return next();
});

require('./routes')(app);

app.use((req, res, next) => {
  let error = new Error('Page not found');
  error.status = 404;
  return next(error);
});

app.use((error, req, res, next) => {
  return res.render('error', { error });
});

const PORT = process.env.PORT || 4040;
http
  .createServer(app)
  .listen(PORT)
  .on('listening', () => {
    console.clear();
    console.log('server running on PORT', PORT);
  });
