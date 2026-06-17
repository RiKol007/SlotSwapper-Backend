const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const SwapRequest = require('../models/SwapRequest');

const router = express.Router();

/**
 * GET /api/swappable-slots
 * Returns all SWAPPABLE slots that are NOT owned by the current user
 */
router.get('/swappable-slots', auth, async (req, res) => {
  try {
    const slots = await Event.find({ status: 'SWAPPABLE', owner: { $ne: req.user._id } }).populate('owner','name email');
    res.json(slots);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

/**
 * POST /api/swap-request
 * body: { mySlotId, theirSlotId }
 * Creates a SwapRequest, validates both slots are SWAPPABLE, sets them to SWAP_PENDING
 */
router.post('/swap-request', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { mySlotId, theirSlotId } = req.body;
    if (!mySlotId || !theirSlotId) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'Missing slot ids' });
    }

    const mySlot = await Event.findById(mySlotId).session(session);
    const theirSlot = await Event.findById(theirSlotId).session(session);
    if (!mySlot || !theirSlot) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'One or both slots not found' });
    }
    if (mySlot.owner.toString() !== req.user._id.toString()) {
      await session.abortTransaction(); session.endSession();
      return res.status(403).json({ message: 'mySlot must belong to you' });
    }
    if (String(mySlot._id) === String(theirSlot._id)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'Cannot swap same slot' });
    }

    if (mySlot.status !== 'SWAPPABLE' || theirSlot.status !== 'SWAPPABLE') {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'Both slots must be SWAPPABLE' });
    }

    // create swap request
    const swapReq = new SwapRequest({
      fromUser: req.user._id,
      toUser: theirSlot.owner,
      mySlot: mySlot._id,
      theirSlot: theirSlot._id,
      status: 'PENDING'
    });

    // mark both slots SWAP_PENDING
    mySlot.status = 'SWAP_PENDING';
    theirSlot.status = 'SWAP_PENDING';

    await mySlot.save({ session });
    await theirSlot.save({ session });
    await swapReq.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await SwapRequest.findById(swapReq._id).populate('fromUser toUser mySlot theirSlot');
    res.json(populated);
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/swap-response/:requestId
 * body: { accept: true/false }
 * Allows the "toUser" (owner of desired slot) to accept/reject.
 * If accepted: swap owners of two events; statuses -> BUSY; SwapRequest -> ACCEPTED
 * If rejected: statuses -> SWAPPABLE; SwapRequest -> REJECTED
 */
router.post('/swap-response/:requestId', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { requestId } = req.params;
    const { accept } = req.body;
    const swapReq = await SwapRequest.findById(requestId).session(session);
    if (!swapReq) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'Request not found' });
    }
    if (swapReq.toUser.toString() !== req.user._id.toString()) {
      await session.abortTransaction(); session.endSession();
      return res.status(403).json({ message: 'Only the owner of the requested slot can respond' });
    }
    if (swapReq.status !== 'PENDING') {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'Request already handled' });
    }

    const mySlot = await Event.findById(swapReq.mySlot).session(session);
    const theirSlot = await Event.findById(swapReq.theirSlot).session(session);
    if (!mySlot || !theirSlot) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'Slots involved not found' });
    }

    if (!accept) {
      // rejected: set both to SWAPPABLE again
      mySlot.status = 'SWAPPABLE';
      theirSlot.status = 'SWAPPABLE';
      swapReq.status = 'REJECTED';
      await mySlot.save({ session });
      await theirSlot.save({ session });
      await swapReq.save({ session });
      await session.commitTransaction();
      session.endSession();
      const populated = await SwapRequest.findById(swapReq._id).populate('fromUser toUser mySlot theirSlot');
      return res.json(populated);
    }

    // ACCEPT path: swap owners
    // Exchange owners of the two events
    const tempOwner = mySlot.owner;
    mySlot.owner = theirSlot.owner;
    theirSlot.owner = tempOwner;

    // both become BUSY
    mySlot.status = 'BUSY';
    theirSlot.status = 'BUSY';

    swapReq.status = 'ACCEPTED';

    await mySlot.save({ session });
    await theirSlot.save({ session });
    await swapReq.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await SwapRequest.findById(swapReq._id).populate('fromUser toUser mySlot theirSlot');
    res.json(populated);
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/requests/me
 * Returns incoming and outgoing requests for the user
 */
router.get('/requests/me', auth, async (req, res) => {
  try {
    const incoming = await SwapRequest.find({ toUser: req.user._id }).populate('fromUser toUser mySlot theirSlot').sort({ createdAt: -1 });
    const outgoing = await SwapRequest.find({ fromUser: req.user._id }).populate('fromUser toUser mySlot theirSlot').sort({ createdAt: -1 });
    res.json({ incoming, outgoing });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
