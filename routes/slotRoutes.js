const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const authMiddleware = require('../middleware/authMiddleware');

// =====================================================================
//      Public Routes (accessible without login)
// =====================================================================

// GET all slots (for the ESP32 and the frontend to display status)
// *** FIX: Corrected to use the right controller function name ***
router.get('/slots', slotController.getAllSlots); 

// POST to update a slot's status from the physical hardware (ESP32)
router.post('/slots/update-from-hardware', slotController.updateSlotFromHardware);


// =====================================================================
//      Protected Routes (require a user to be logged in)
// =====================================================================
// The 'authMiddleware.authenticate' part ensures only logged-in users can access these.

// POST to reserve a slot
router.post('/slots/reserve', authMiddleware.authenticate, slotController.reserveSlot);

// POST to handle a successful payment for a slot
router.post('/slots/payment-success', authMiddleware.authenticate, slotController.handlePaymentSuccess);

// POST to unlock a paid and reserved slot
router.post('/slots/unlock', authMiddleware.authenticate, slotController.unlockSlot);

// GET the current logged-in user's specific reservation status
router.get('/user-slot-status', authMiddleware.authenticate, slotController.getUserSlotStatus);


module.exports = router;
