const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');

// GET /api/slots - Get all parking slots
router.get('/', slotController.getSlots);

// POST /api/slots/reserve - Reserve a slot (requires authentication)
router.post('/reserve', slotController.reserveSlot);

// POST /api/slots/pay - Pay for a reserved slot
router.post('/pay', slotController.payForSlot);

// POST /api/slots/unlock - Unlock a paid slot
router.post('/unlock', slotController.unlockSlot);

// POST /api/slots/release - Release a slot (admin only)
router.post('/release', slotController.releaseSlot);

// GET /api/slots/my-reservation - Get current user's reservation
router.get('/my-reservation', slotController.getUserReservation);

// Add this line in routes/slotRoutes.js
router.post('/update-from-hardware', slotController.updateFromHardware);


module.exports = router;

