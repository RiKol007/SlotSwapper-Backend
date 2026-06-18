const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
