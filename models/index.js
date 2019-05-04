const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, unique: true, trim: true, required: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const BookSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    author: { type: String, trim: true },
    genre: { type: String, trim: true },
    originalname: { type: String, trim: true, required: true },
    path: { type: String, required: true },
    _owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

BookSchema.index(
  { title: 'text', genre: 'text' },
  {
    weights: {
      title: 3,
      genre: 1
    }
  }
);

mongoose.model('User', UserSchema);
mongoose.model('Book', BookSchema);
