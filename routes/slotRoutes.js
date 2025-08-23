const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Public Routes (for ESP32 and Frontend) ---

// GET all slots (used by ESP32 and frontend)
router.get('/slots', slotController.getAllSlots);

// POST to update a slot's physical occupied status from the hardware
// *** THIS IS THE CORRECTED LINE ***
router.post('/slots/update-from-hardware', slotController.updateSlotFromHardware);


// --- Authenticated Routes (for Frontend User Actions) ---

// POST to reserve a slot
router.post('/slots/reserve', authMiddleware.authenticate, slotController.reserveSlot);

// POST to handle successful payment
router.post('/slots/payment-success', authMiddleware.authenticate, slotController.handlePaymentSuccess);

// POST to unlock a slot
router.post('/slots/unlock', authMiddleware.authenticate, slotController.unlockSlot);

// GET user's specific slot status
router.get('/user-slot-status', authMiddleware.authenticate, slotController.getUserSlotStatus);


module.exports = router;
