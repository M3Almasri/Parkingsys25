const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slot_id: {
    type: Number,
    required: true,
    unique: true
  },
  is_available: {
    type: Boolean,
    default: true
  },
  is_reserved: {
    type: Boolean,
    default: false
  },
  is_paid: {
    type: Boolean,
    default: false
  },
  gate_status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  light_status: {
    type: String,
    enum: ['green', 'yellow', 'red'],
    default: 'green'
  },
  reserved_by: {
    type: String,
    default: null
  },
  payment_method: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field before saving
slotSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Update the updated_at field before updating
slotSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: Date.now() });
  next();
});

module.exports = mongoose.model('Slot', slotSchema);

