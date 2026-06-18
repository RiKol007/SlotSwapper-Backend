const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['BUSY', 'SWAPPABLE', 'SWAP_PENDING'], default: 'BUSY' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

EventSchema.pre('validate', function validateEventTimes(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

module.exports = mongoose.model('Event', EventSchema);
