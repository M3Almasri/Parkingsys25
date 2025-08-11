const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const slotRoutes = require("./routes/slotRoutes");
const path = require("path");

dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());


// Serve frontend files
const staticPath = path.resolve(__dirname, "./public");
app.use(express.static(staticPath));
console.log("Serving static files from: ", staticPath);

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/slots", slotRoutes);

const PORT = process.env.PORT || 5000;

// Connect to DB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
  })
  .catch(err => console.error(err));



