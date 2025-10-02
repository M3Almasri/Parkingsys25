const Slot = require("../models/Slot");
const jwt = require('jsonwebtoken');
const User = require("../models/User");

// Get all parking slots
exports.getSlots = async (req, res) => {
  try {
    const slots = await Slot.find({});
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Reserve a slot (user indicates intent to park)
exports.reserveSlot = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    const { slot_id } = req.body;

    const existingReservation = await Slot.findOne({ 
      reserved_by: user.username,
      $or: [ { is_reserved: true }, { is_paid: true } ]
    });

    if (existingReservation) {
      return res.status(400).json({ 
        message: 'You already have a reservation. Each user can only reserve one slot at a time.' 
      });
    }

    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (!slot.is_available || slot.is_reserved || slot.is_paid) {
      return res.status(400).json({ message: "Slot not available" });
    }

    // Set slot to pending and close the gate
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_available: false,
        is_reserved: false,
        is_paid: false,
        gate_status: 'closed', // Correct: Gate closes to hold the spot
        light_status: 'yellow',
        reserved_by: user.username
      },
      { new: true }
    );

    res.json({ 
      message: "Slot reserved successfully. Please proceed to payment to confirm your reservation.", 
      slot: updatedSlot 
    });

  } catch (err) {
    console.error('Reserve slot error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Pay for a slot (confirms the reservation)
exports.payForSlot = async (req, res) => {
  try {
    const { slot_id, payment_method } = req.body;
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (slot.is_available || slot.is_paid) {
      return res.status(400).json({ message: "No pending reservation for this slot" });
    }

    if (!slot.reserved_by) {
      return res.status(400).json({ message: "Slot not reserved by any user" });
    }

    // Confirm payment, keep gate closed
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_available: false,
        is_reserved: true,
        is_paid: true,
        gate_status: 'closed', // Correct: Gate remains closed after payment
        light_status: 'red',
        payment_method: payment_method || 'unknown'
      },
      { new: true }
    );

    res.json({ 
      message: `Payment successful! Slot ${slot_id} is now reserved and paid.`, 
      slot: updatedSlot 
    });

  } catch (err) {
    console.error('Pay for slot error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// Unlock slot (open the gate for paid slots to let the car out)
exports.unlockSlot = async (req, res) => {
  try {
    const { slot_id } = req.body;
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (!slot.is_paid) {
      return res.status(400).json({ message: "Slot must be paid before unlocking" });
    }

    // Open the gate and reset the slot to fully available
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_available: true,
        is_reserved: false,
        is_paid: false,
        gate_status: 'open',  // Correct: Gate opens to let the car out
        light_status: 'green',
        reserved_by: null,
        payment_method: null
      },
      { new: true }
    );

    res.json({ 
      message: `Slot ${slot_id} unlocked successfully! Gate is now open.`, 
      slot: updatedSlot 
    });

  } catch (err) {
    console.error('Unlock slot error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// Release a slot (admin only)
exports.releaseSlot = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can release slots' });
    }

    const { slot_id } = req.body;
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Reset the slot to its default available state
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_reserved: false,
        is_paid: false,
        is_available: true,
        gate_status: 'open', // *** MODIFICATION: Gate should be open for an available slot ***
        light_status: 'green',
        reserved_by: null,
        payment_method: null
      },
      { new: true }
    );

    res.json({ 
      message: `Slot ${slot_id} released successfully by admin.`, 
      slot: updatedSlot 
    });

  } catch (err) {
    console.error('Release slot error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's current reservation
exports.getUserReservation = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    const reservation = await Slot.findOne({ 
      reserved_by: user.username,
      $or: [ { is_reserved: true }, { is_paid: true } ]
    });

    if (!reservation) {
      return res.json({ message: 'No active reservation found', reservation: null });
    }

    res.json({ 
      message: 'Active reservation found', 
      reservation: reservation 
    });

  } catch (err) {
    console.error('Get user reservation error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update slot status from hardware (IR sensor)
exports.updateSlotFromHardware = async (req, res) => {
  try {
    const { slot_id, is_occupied } = req.body;

    if (slot_id === undefined || typeof is_occupied !== 'boolean') {
      return res.status(400).json({ 
        message: 'Invalid input. slot_id and is_occupied (boolean) are required.' 
      });
    }

    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    let updateData = {};
    let message = `Slot ${slot_id} status checked.`;

    if (is_occupied) {
      // A car has been detected.
      // If the slot was available, it means a random car (not a reservation) has parked.
      // We should close the gate and mark it as occupied.
      if (slot.is_available && !slot.is_reserved && !slot.is_paid) {
        updateData = {
          is_available: false,
          light_status: 'red' // Red indicates occupied
        };
        message = `Slot ${slot_id} is now occupied by an unknown vehicle.`;
      }
      // If the slot was already reserved/paid, the car is expected, so no change is needed.
      
    } else {
      // No car is detected. The slot is now empty.
      // We reset it to the default "available" state.
      updateData = {
        is_available: true,
        is_reserved: false,
        is_paid: false,
        gate_status: 'open',  // *** MODIFICATION: Gate must be open for the next car ***
        light_status: 'green',
        reserved_by: null,
        payment_method: null
      };
      message = `Slot ${slot_id} is now empty and available.`;
    }

    // Only update if there are changes to be made
    if (Object.keys(updateData).length > 0) {
        const updatedSlot = await Slot.findOneAndUpdate({ slot_id }, { $set: updateData }, { new: true });
        return res.json({ message, slot: updatedSlot });
    }

    res.json({ message: "No change in slot status.", slot });

  } catch (err) {
    console.error('Hardware update error:', err);
    res.status(500).json({ message: "Server error" });
  }
};
