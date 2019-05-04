const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const multer = require('multer');
const User = mongoose.model('User');
const Book = mongoose.model('Book');
const { requireAuth, ownsFile } = require('../middleware');

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
  destination: (req, file, cb) => {
    let store = path.resolve(__dirname, '..', 'store');

    if (!fs.existsSync(store)) {
      fs.mkdirSync(store);
    }

    cb(null, store);
  }
});

const upload = multer({
  storage
});

module.exports = app => {
  app.get('/', (req, res, next) => {
    return res.redirect('/catalog');
  });

  app.get('/login', (req, res, next) => {
    return res.render('login');
  });

  app.get('/register', (req, res, next) => {
    return res.render('register');
  });

  app.get('/add-book', requireAuth, function(req, res, next) {
    return res.render('add-book');
  });

  app.post(
    '/add-book',
    requireAuth,
    upload.single('book'),
    async (req, res, next) => {
      const { title, author, genre } = req.body;

      if (!req.file || !title.trim())
        return next(new Error('Please upload a book and add its title'));

      await Book.create({
        _owner: req.session.userId,
        title,
        author,
        genre,
        path: req.file.filename,
        originalname: req.file.originalname
      });

      return res.redirect('/catalog');
    }
  );

  app.get('/catalog', async (req, res, next) => {
    const books = await Book.find({}, null, { lean: true })
      .limit(15)
      .populate({
        path: '_owner',
        select: 'username'
      });

    return res.render('home', { books });
  });

  app.get('/book/:bookId', async function(req, res, next) {
    const book = await Book.findById(req.params.bookId);

    return res.sendFile(path.resolve(__dirname, '..', 'store', book.path));
  });

  app.get('/remove/:bookId', async function(req, res, next) {
    await Book.deleteOne({
      _id: req.params.bookId,
      _owner: req.session.userId
    });

    return res.redirect('/catalog');
  });

  app.get('/search', async function(req, res, next) {
    const books = await Book.find({ $text: { $search: req.query.q } }).lean();
    return res.render('search', { books, query: req.query.q });
  });

  app.get('/edit/:bookId', async function(req, res, next) {
    const book = await Book.findById(req.params.bookId);
    return res.render('edit-book', { book });
  });

  app.post('/edit/:bookId', async function(req, res, next) {
    const { title, author, genre } = req.body;

    if (!title.trim()) return next(new Error('Title is required'));

    await Book.updateOne(
      { _id: req.params.bookId, _owner: req.session.userId },
      { title, author, genre }
    );

    return res.redirect('/catalog');
  });

  app.post('/register', async function(req, res, next) {
    let { username, password, confirmPassword } = req.body;
    if (!username.trim() || !password.trim() || !confirmPassword.trim())
      return next(new Error('all fields required'));

    const found_user = await User.findOne({ username });
    if (found_user) return next(new Error('username already exists'));

    if (password !== confirmPassword)
      return next(new Error('please make sure passwords match'));

    password = bcrypt.hashSync(password, 10);
    const user = await User.create({ username, password });
    req.session.userId = user._id;
    return res.redirect('/catalog');
  });

  app.post('/login', async (req, res, next) => {
    const { username, password } = req.body;

    if (!username.trim() || !password.trim())
      return next(new Error('please enter username and password'));

    const user = await User.findOne({ username });
    if (!user) return next(new Error('invalid username'));

    let isMatching = bcrypt.compareSync(password, user.password);
    if (!isMatching) return next(new Error('invalid password'));

    req.session.userId = user._id;

    return res.redirect('/catalog');
  });

  app.get('/logout', function(req, res, next) {
    req.session.destroy(function(err) {
      if (err) return next(err);
      return res.redirect('/');
    });
  });
};
