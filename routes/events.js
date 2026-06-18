const express = require('express');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

const router = express.Router();

function validationMessage(err) {
  if (err.name === 'ValidationError') {
    return Object.values(err.errors)[0]?.message || 'Invalid event data';
  }
  if (err.name === 'CastError') {
    return 'Invalid event data';
  }
  return null;
}

// Create event
router.post('/', auth, async (req, res) => {
  try {
    const { title, startTime, endTime, status } = req.body;
    const e = new Event({
      title: typeof title === 'string' ? title.trim() : title,
      startTime,
      endTime,
      status: status || 'BUSY',
      owner: req.user._id
    });
    await e.save();
    res.json(e);
  } catch (err) {
    console.error(err);
    const message = validationMessage(err);
    res.status(message ? 400 : 500).json({ message: message || 'Server error' });
  }
});

// Get current user's events
router.get('/', auth, async (req, res) => {
  try {
    const events = await Event.find({ owner: req.user._id }).sort({ startTime: 1 });
    res.json(events);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// Update event (title, times, status)
router.put('/:id', auth, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Not found' });
    if (ev.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    const { title, startTime, endTime, status } = req.body;
    if (title !== undefined) ev.title = typeof title === 'string' ? title.trim() : title;
    if (startTime !== undefined) ev.startTime = startTime;
    if (endTime !== undefined) ev.endTime = endTime;
    if (status !== undefined) ev.status = status;
    await ev.save();
    res.json(ev);
  } catch (err) {
    console.error(err);
    const message = validationMessage(err);
    res.status(message ? 400 : 500).json({ message: message || 'Server error' });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Not found' });
    if (ev.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    await ev.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
