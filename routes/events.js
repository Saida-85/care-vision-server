const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// We will access eventsCollection from req or export/import it. 
// Alternatively, since your routes are in index.js or imported, let's keep it self-contained:
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);

async function getCollection() {
  await client.connect();
  return client.db("carevision").collection("events");
}

// POST /api/events/:id/join
router.post('/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const eventsCollection = await getCollection();
    
    const event = await eventsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Initialize volunteers array if it doesn't exist yet
    const volunteers = event.volunteers || [];

    if (!volunteers.includes(userId)) {
      volunteers.push(userId);
      await eventsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
       
      );
    }

    res.status(200).json({ message: "Successfully joined", volunteers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/events/:id/leave
router.post('/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    const eventsCollection = await getCollection();

    const event = await eventsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const volunteers = (event.volunteers || []).filter(id => id !== userId);
    
    await eventsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { volunteers } }
    );

    res.status(200).json({ message: "Successfully left", volunteers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;