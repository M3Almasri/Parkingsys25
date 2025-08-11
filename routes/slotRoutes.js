const express = require('express');
const router = express.Router();
const Slot = require("../models/Slot");

router.get('/', async (req, res) => {
  try {
    const slots = await Slot.find();
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



// POST /api/slots/reserve
router.post("/reserve", async (req, res) => {
  const { slot_id, reserved_by } = req.body;
  try {
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }
    if (!slot.is_available) {
      return res.status(400).json({ message: "Slot not available" });
    }
    slot.is_available = false;
    slot.is_reserved = true;
    slot.reserved_by = reserved_by;
    slot.light_status = "red";
    await slot.save();
    res.json({ message: "Slot reserved", slot });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/slots/pay
router.post("/pay", async (req, res) => {
  const { slot_id } = req.body;
  try {
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }
    if (!slot.is_reserved) {
      return res.status(400).json({ message: "Slot not reserved" });
    }
    slot.is_paid = true;
    await slot.save();
    res.json({ message: "Slot paid", slot });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/slots/unlock
router.post("/unlock", async (req, res) => {
  const { slot_id } = req.body;
  try {
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }
    if (!slot.is_paid) {
      return res.status(400).json({ message: "Slot not paid" });
    }
    slot.gate_status = "open";
    await slot.save();
    res.json({ message: "Slot unlocked", slot });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/slots/release
router.post("/release", async (req, res) => {
  const { slot_id } = req.body;
  try {
    const slot = await Slot.findOne({ slot_id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }
    slot.is_available = true;
    slot.is_reserved = false;
    slot.is_paid = false;
    slot.reserved_by = null;
    slot.light_status = "green";
    slot.gate_status = "closed";
    await slot.save();
    res.json({ message: "Slot released", slot });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


