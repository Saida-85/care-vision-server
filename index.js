import express from 'express';
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8000;

// Mandatory Middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

let db;
let eventsCollection;

async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db("carevision");
    eventsCollection = db.collection("events");
    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// POST endpoint to save events to MongoDB
app.post('/api/events', async (req, res) => {
  try {
    console.log("Event API called with body:", req.body);
    
    const { title, eventType, eventDate, location, thumbnail, description, userEmail } = req.body;

    if (!title || !eventType || !eventDate || !location || !description) {
      return res.status(400).json({ message: "Please fill out all required fields." });
    }

    const newEvent = {
      title,
      eventType,
      eventDate,
      location,
      thumbnail,
      description,
      userEmail: userEmail || "anonymous@carevision.com",
      createdAt: new Date(),
    };

    const result = await eventsCollection.insertOne(newEvent);

    res.status(201).json({ 
      message: "Event added successfully!", 
      eventId: result.insertedId 
    });
  } catch (error) {
    console.error("Error saving event:", error);
    res.status(500).json({ message: "Server error while saving event." });
  }
});

app.get('/events', async(req, res) => {
  const result = await eventsCollection.find().toArray()
  res.send(result)
})

app.get('/', (req, res) => {
    res.send({ message: 'Server is running fine!' });
});

connectToMongoDB().then(() => {
  app.listen(PORT, () => {
     console.log(`Server is running at http://localhost:${PORT}`);
  });
});