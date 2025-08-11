const Slot = require("../models/Slot");
const jwt = require('jsonwebtoken');
const User = require("../models/User");


// Get all parking slots
exports.getSlots = async (req, res) => {
  const slots = await Slot.find({});
  res.json(slots);
};

// Reserve a slot
exports.reserveSlot = async (req, res) => {
  const { slot_id, reserved_by } = req.body;

  const slot = await Slot.findOneAndUpdate(
    { slot_id },
    {
      is_reserved: true,
      is_available: false,
      gate_status: 'Closed',
      light_status: 'red',
      reserved_by
    },
    { new: true }
  );

  res.json(slot);
};

// Pay for a slot
exports.payForSlot = async (req, res) => {
  const { slot_id } = req.body;

  const slot = await Slot.findOneAndUpdate(
    { slot_id },
    {
      is_paid: true
    },
    { new: true }
  );

  res.json(slot);
};

// Unlock slot (open the gate)
exports.unlockSlot = async (req, res) => {
  const { slot_id } = req.body;

  const slot = await Slot.findOneAndUpdate(
    { slot_id },
    {
      gate_status: 'Open'
    },
    { new: true }
  );

  res.json(slot);
};

// Release a slot (admin)
exports.releaseSlot = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can release slots' });
    }

    const { slot_id } = req.body;
    const slot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_reserved: false,
        is_paid: false,
        is_available: true,
        gate_status: 'Open',
        light_status: 'green',
        reserved_by: null
      },
      { new: true }
    );

    res.json(slot);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
