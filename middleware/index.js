const mongoose = require('mongoose');
const Book = mongoose.model('Book');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/catalog');
  return next();
}

async function ownsFile(req, res, next) {
  const book = await Book.findById(req.params.bookId)
    .populate('_owner')
    .lean();

  if (String(book._owner._id) !== String(req.session.userId))
    return next(new Error('You do not have permission to perform this action'));

  req.book = book;
  return next();
}

module.exports = { requireAuth, ownsFile };
