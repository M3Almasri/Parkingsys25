const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Slot = require('./models/Slot');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_parking')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Reset & insert slots
    await Slot.deleteMany({});
    await Slot.insertMany([
      { slot_id: 1, is_available: true, is_reserved: false, is_paid: false, gate_status: 'Open', light_status: 'green', reserved_by: null },
      { slot_id: 2, is_available: true, is_reserved: false, is_paid: false, gate_status: 'Open', light_status: 'green', reserved_by: null },
      { slot_id: 3, is_available: true, is_reserved: false, is_paid: false, gate_status: 'Open', light_status: 'green', reserved_by: null },
      { slot_id: 4, is_available: true, is_reserved: false, is_paid: false, gate_status: 'Open', light_status: 'green', reserved_by: null }
    ]);
    console.log('✅ Slots inserted');

    // Insert admin if not exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        password: 'admin123', // will be hashed if your model uses bcrypt
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin user inserted');
    } else {
      console.log('⚠️ Admin user already exists');
    }

    process.exit();
  })
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });
