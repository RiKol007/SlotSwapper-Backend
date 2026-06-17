const mongoose = require('mongoose');

const SwapRequestSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // requester
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // owner of desired slot
  mySlot: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  theirSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['PENDING','ACCEPTED','REJECTED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('SwapRequest', SwapRequestSchema);
