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
        gate_status: 'closed',
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
        gate_status: 'closed',
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
// Add this entire function to controllers/slotController.js

exports.updateFromHardware = async (req, res) => {
  // This is a public endpoint, so we don't check for a user token.
  // For security, you could add an API key check here in the future.
  const { slot_id, is_occupied } = req.body;

  // Basic validation
  if (slot_id === undefined || is_occupied === undefined) {
    return res.status(400).json({ message: 'Missing slot_id or is_occupied status.' });
  }

  try {
    const slot = await Slot.findOne({ slot_id: slot_id });

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found.' });
    }

    // This logic handles a car physically arriving or leaving.
    // It assumes that if a car is detected, the slot is no longer available.
    // If the car leaves, the slot becomes available again.
    if (is_occupied) {
      // A car has been physically detected in the slot.
      slot.is_available = false;
      // We don't change the light here, as the reservation status (red/yellow) takes precedence.
      // The main purpose is to block new reservations if a car is present without one.
    } else {
      // A car has physically left the slot.
      // We can reset the slot completely, making it available for a new user.
      slot.is_available = true;
      slot.is_reserved = false;
      slot.is_paid = false;
      slot.reserved_by = null;
      slot.gate_status = 'closed';
      slot.light_status = 'green';
    }

    await slot.save();
    res.status(200).json({ message: `Slot ${slot_id} updated successfully from hardware.` });

  } catch (error) {
    console.error("Error updating from hardware:", error);
    res.status(500).json({ message: 'Server error while updating from hardware.' });
  }
};


