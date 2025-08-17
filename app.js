const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// --------------------- DB Connection ---------------------
mongoose.connect("mongodb://127.0.0.1:27017/parking_system");

// --------------------- Schema ---------------------
const slotSchema = new mongoose.Schema({
  slotNumber: Number,
  isOccupied: { type: Boolean, default: false },
  car: {
    registrationNumber: String,
    color: String,
    ticketId: String,
  },
});

const ParkingLot = mongoose.model("ParkingLot", slotSchema);

// --------------------- APIs ---------------------

// 1. Initialise Parking Lot
app.post("/parking_lot", async (req, res) => {
    try {
      console.log("📩 Request received:", req.body);   // 👈 Add this
      const { no_of_slot } = req.body;
  
      let slots = [];
      for (let i = 1; i <= no_of_slot; i++) {
        slots.push({ slotNumber: i });
      }
  
      await ParkingLot.deleteMany({});
      await ParkingLot.insertMany(slots);
  
      res.json({ total_slot: no_of_slot, message: "Parking lot created!" });
    } catch (err) {
      console.error("❌ Error:", err.message);   // 👈 Add this
      res.status(500).json({ error: err.message });
    }
  });
  

// 2. Expand Parking Lot
app.patch("/parking_lot", async (req, res) => {
  try {
    const { increment_slot } = req.body;
    const currentCount = await ParkingLot.countDocuments();
    let newSlots = [];

    for (let i = 1; i <= increment_slot; i++) {
      newSlots.push({ slotNumber: currentCount + i });
    }

    await ParkingLot.insertMany(newSlots);
    res.json({ added: increment_slot, total_slot: currentCount + increment_slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Allocate Parking Slot
app.post("/park", async (req, res) => {
  try {
    const { registrationNumber, color } = req.body;
    const freeSlot = await ParkingLot.findOne({ isOccupied: false }).sort("slotNumber");

    if (!freeSlot) {
      return res.status(400).json({ message: "Parking lot is full" });
    }

    freeSlot.isOccupied = true;
    freeSlot.car = {
      registrationNumber,
      color,
      ticketId: uuidv4(),
    };

    await freeSlot.save();

    res.json({
      message: "Car parked successfully",
      slotNumber: freeSlot.slotNumber,
      ticketId: freeSlot.car.ticketId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Free Parking Slot
app.post("/leave", async (req, res) => {
  try {
    const { slotNumber } = req.body;
    const slot = await ParkingLot.findOne({ slotNumber });

    if (!slot || !slot.isOccupied) {
      return res.status(400).json({ message: "Slot already empty or not found" });
    }

    slot.isOccupied = false;
    slot.car = undefined;
    await slot.save();

    res.json({ message: `Slot ${slotNumber} is now free` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Fetch all occupied slots
app.get("/occupied", async (req, res) => {
  try {
    const occupiedSlots = await ParkingLot.find({ isOccupied: true });
    res.json(occupiedSlots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Fetch registration numbers by color
app.get("/cars/color/:color", async (req, res) => {
  try {
    const { color } = req.params;
    const cars = await ParkingLot.find({ "car.color": color });
    const regNumbers = cars.map((slot) => slot.car.registrationNumber);
    res.json(regNumbers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Fetch slot by registration number
app.get("/slot/registration/:regNumber", async (req, res) => {
  try {
    const { regNumber } = req.params;
    const slot = await ParkingLot.findOne({ "car.registrationNumber": regNumber });
    if (!slot) return res.status(404).json({ message: "Car not found" });
    res.json({ slotNumber: slot.slotNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Fetch slots by car color
app.get("/slots/color/:color", async (req, res) => {
  try {
    const { color } = req.params;
    const slots = await ParkingLot.find({ "car.color": color });
    const slotNumbers = slots.map((slot) => slot.slotNumber);
    res.json(slotNumbers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- Server ---------------------
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
