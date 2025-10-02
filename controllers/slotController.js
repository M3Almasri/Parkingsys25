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

// Reserve a slot (requires authentication)
exports.reserveSlot = async (req, res) => {
  try {
    // Extract token and verify user
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

    // Check if user already has a reservation (one slot per user)
    const existingReservation = await Slot.findOne({ 
      reserved_by: user.username,
      $or: [
        { is_reserved: true },
        { is_paid: true }
      ]
    });

    if (existingReservation) {
      return res.status(400).json({ 
        message: 'You already have a reservation. Each user can only reserve one slot at a time.' 
      });
    }

    // Find the requested slot
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Check if slot is available
    if (!slot.is_available || slot.is_reserved || slot.is_paid) {
      return res.status(400).json({ message: "Slot not available" });
    }

    // Reserve the slot (but don't set is_reserved until payment)
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_available: false,  // Mark as not available
        is_reserved: false,   // Don't set reserved until payment
        is_paid: false,
        gate_status: 'open',
        light_status: 'yellow', // Yellow indicates pending payment
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

    // Find the slot
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Check if slot has a pending reservation
    if (slot.is_available || slot.is_paid) {
      return res.status(400).json({ message: "No pending reservation for this slot" });
    }

    if (!slot.reserved_by) {
      return res.status(400).json({ message: "Slot not reserved by any user" });
    }

    // Process payment and confirm reservation
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_available: false,
        is_reserved: true,    // Now set reserved to true after payment
        is_paid: true,
        gate_status: 'closed',
        light_status: 'red',  // Red indicates occupied/paid
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

// Unlock slot (open the gate for paid slots)
exports.unlockSlot = async (req, res) => {
  try {
    const { slot_id } = req.body;

    // Find the slot
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Check if slot is paid (can only unlock paid slots)
    if (!slot.is_paid) {
      return res.status(400).json({ message: "Slot must be paid before unlocking" });
    }

    // Unlock the slot (open gate and reset to available)
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_available: true,   // Reset to available
        is_reserved: false,   // Clear reservation
        is_paid: false,       // Clear payment
        gate_status: 'open',  // Open the gate
        light_status: 'green', // Green indicates available
        reserved_by: null,    // Clear user
        payment_method: null  // Clear payment method
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
    
    // Find the slot
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Release the slot (reset to default state)
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      {
        is_reserved: false,
        is_paid: false,
        is_available: true,
        gate_status: 'open',
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

// Get user's current reservation (helper function)
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

    // Find user's current reservation
    const reservation = await Slot.findOne({ 
      reserved_by: user.username,
      $or: [
        { is_reserved: true },
        { is_paid: true }
      ]
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
// IMPROVED updateSlotFromHardware function
exports.updateSlotFromHardware = async (req, res) => {
  try {
    const { slot_id, is_occupied } = req.body;

    // Validate input
    if (!slot_id || typeof is_occupied !== 'boolean') {
      return res.status(400).json({ 
        message: 'Invalid input. slot_id and is_occupied (boolean) are required.' 
      });
    }

    // Find the slot
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    // Update slot based on hardware sensor
    let updateData = {};

    if (is_occupied) {
      // Car detected - slot is now occupied
      // Only update if the slot was previously available
      if (slot.is_available && !slot.is_reserved && !slot.is_paid) {
        updateData = {
          is_available: false,
          gate_status: 'open',
          light_status: 'red'  // Red indicates occupied
        };
      }
      // If slot is already reserved/paid, don't change the status
    } else {
      // No car detected - slot is now empty
      // Reset slot to available state (clear any reservations)
      updateData = {
        is_available: true,
        is_reserved: false,
        is_paid: false,
        gate_status: 'open',
        light_status: 'green',  // Green indicates available
        reserved_by: null,
        payment_method: null
      };
    }

    // Update the slot
    const updatedSlot = await Slot.findOneAndUpdate(
      { slot_id },
      updateData,
      { new: true }
    );

    res.json({ 
      message: `Slot ${slot_id} updated from hardware. Status: ${is_occupied ? 'OCCUPIED' : 'EMPTY'}`, 
      slot: updatedSlot 
    });

  } catch (err) {
    console.error('Hardware update error:', err);
    res.status(500).json({ message: "Server error" });
  }
};




