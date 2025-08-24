const Slot = require('../models/Slot');
const User = require('../models/User');

// GET /api/slots - Get all parking slots
exports.getAllSlots = async (req, res) => {
    try {
        const slots = await Slot.find().sort({ slot_id: 1 });
        res.status(200).json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/slots/reserve - Reserve a slot
exports.reserveSlot = async (req, res) => {
    try {
        const { slot_id } = req.body;
        const userId = req.user.id;

        const existingReservation = await Slot.findOne({ reserved_by: userId });
        if (existingReservation) {
            return res.status(400).json({ message: 'You already have a reservation.' });
        }

        const slot = await Slot.findOne({ slot_id: slot_id });
        if (!slot || !slot.is_available) {
            return res.status(404).json({ message: 'Slot not available.' });
        }

        slot.is_available = false;
        slot.is_reserved = true;
        slot.light_status = 'yellow'; // Pending payment
        slot.gate_status = 'closed';
        slot.reserved_by = userId;
        
        await slot.save();
        res.status(200).json(slot);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/slots/payment-success - Handle successful payment
exports.handlePaymentSuccess = async (req, res) => {
    try {
        const { slot_id, payment_method } = req.body;
        const userId = req.user.id;

        const slot = await Slot.findOne({ slot_id: slot_id, reserved_by: userId });
        if (!slot) {
            return res.status(404).json({ message: 'Reservation not found.' });
        }

        slot.is_paid = true;
        slot.light_status = 'red'; // Paid and reserved
        slot.gate_status = 'open'; // Open the gate upon payment
        slot.payment_method = payment_method;

        await slot.save();
        res.status(200).json(slot);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/slots/unlock - Unlock a paid slot (e.g., when user leaves)
exports.unlockSlot = async (req, res) => {
    try {
        const { slot_id } = req.body;
        const userId = req.user.id;

        const slot = await Slot.findOne({ slot_id: slot_id, reserved_by: userId, is_paid: true });
        if (!slot) {
            return res.status(404).json({ message: 'Paid reservation not found.' });
        }

        // Reset the slot to be fully available
        slot.is_available = true;
        slot.is_reserved = false;
        slot.is_paid = false;
        slot.light_status = 'green';
        slot.gate_status = 'closed';
        slot.reserved_by = null;
        slot.payment_method = null;

        await slot.save();
        res.status(200).json({ message: 'Slot unlocked and now available.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/user-slot-status - Get current user's reservation status
exports.getUserSlotStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const slot = await Slot.findOne({ reserved_by: userId });
        if (slot) {
            res.status(200).json(slot);
        } else {
            res.status(200).json({ message: 'No active reservation.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/slots/update-from-hardware - Update status from ESP32 sensor
exports.updateSlotFromHardware = async (req, res) => {
    try {
        const { slot_id, is_occupied } = req.body;
        const slot = await Slot.findOne({ slot_id: slot_id });

        if (!slot) {
            return res.status(404).json({ message: "Slot not found" });
        }

        // If a car leaves, the slot becomes fully available again.
        if (!is_occupied) {
            slot.is_available = true;
            slot.is_reserved = false;
            slot.is_paid = false;
            slot.light_status = 'green';
            slot.gate_status = 'closed';
            slot.reserved_by = null;
            slot.payment_method = null;
        }
        // Note: We are intentionally NOT handling the is_occupied=true case here.
        // The 'red' status is set by payment, not by the physical sensor.
        // This prevents a random car from making a paid slot appear occupied.

        const updatedSlot = await slot.save();
        res.status(200).json(updatedSlot); // Respond with the new data
    } catch (error) {
        console.error("Error in updateSlotFromHardware:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
