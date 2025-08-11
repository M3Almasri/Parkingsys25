const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slot_id: Number,
  is_available: Boolean,
  is_reserved: Boolean,
  is_paid: Boolean,
  gate_status: String,     // "Open" or "Closed"
  light_status: String,    // "green" or "red"
  reserved_by: String      // username or user ID
});

module.exports = mongoose.model('Slot', slotSchema);
