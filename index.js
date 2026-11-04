import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8000;

// Mandatory Middleware with dynamic CLIENT_URL support
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "https://care-vision-three.vercel.app",
      "http://localhost:3000"
    ],
    credentials: true,
  })
);
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

let db;
let eventsCollection;

async function connectToMongoDB() {
  if (db) return; // Re-use connection if already established
  try {
    await client.connect();
    db = client.db("carevision");
    eventsCollection = db.collection("events");
    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// JWT Token Verification Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized access: Missing JWT Token" });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET || 'carevision_secure_jwt_secret_key_2026', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden access: Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};

// Ensure database connects before handling incoming API routes on serverless
app.use(async (req, res, next) => {
  await connectToMongoDB();
  next();
});

// POST endpoint to issue JWT Token for client
app.post('/jwt', (req, res) => {
  const user = req.body;
  if (!user?.email) {
    return res.status(400).json({ message: "Email is required to issue token" });
  }

  const token = jwt.sign(user, process.env.JWT_SECRET || 'carevision_secure_jwt_secret_key_2026', {
    expiresIn: '7d',
  });

  res.send({ token });
});

// Protected POST endpoint to save events to MongoDB
app.post('/api/events/manage', verifyToken, async (req, res) => {
  try {
    const { title, eventType, eventDate, location, imageUrl, description, userEmail } = req.body;

    if (!title || !eventType || !eventDate || !location || !imageUrl || !description) {
      return res.status(400).json({ message: "Please fill out all required fields." });
    }

    const newEvent = {
      title,
      eventType,
      eventDate,
      location,
      imageUrl,
      description,
      userEmail: req.user.email || userEmail || "anonymous@carevision.com",
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

// Protected DELETE endpoint to remove events
app.delete('/api/events/manage', verifyToken, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Valid event ID is required." });
    }

    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.status(200).json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Server error while deleting event." });
  }
});

// Public GET endpoint to list events (Fixed with /api/ prefix)
app.get('/api/events', async (req, res) => {
  try {
    const result = await eventsCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
});

// Public GET endpoint for single event details (Fixed with /api/ prefix)
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }
    const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!result) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.send(result);
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({ message: "Error fetching event details" });
  }
});

app.get('/', (req, res) => {
  res.send({ message: 'Server is running fine!' });
});

// Only listen locally if not running as a serverless function on Vercel
if (process.env.NODE_ENV !== 'production') {
  connectToMongoDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  });
}

// Export app for Vercel serverless deployment
export default app;