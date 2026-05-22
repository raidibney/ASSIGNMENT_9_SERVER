const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// --- FIXED: CORS Configuration ---
const allowedOrigins = [
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Creating client 
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Mongo function 
async function run() {
  try {
    await client.connect();
    const db = client.db("petDB");
    const petsCollection = db.collection("pets");
    const requestsCollection = db.collection("requests");

    // 1. GET API - Fetch all pets
    app.get('/add-pets', async (req, res) => {
      const result = await petsCollection.find().toArray();
      res.json(result);
    });

    // 2. POST API - Create/Add a pet
    app.post('/add-pets', async (req, res) => {
      const petdata = req.body;
      try {
        const result = await petsCollection.insertOne(petdata);
        res.status(201).json(result);
      } catch (error) {
        console.error("Database insert error:", error);
        res.status(500).json({ message: "Failed to save to database" });
      }
    });

    // 3. GET API - Details page data
    app.get('/add-pets/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const result = await petsCollection.findOne(query);
        if (!result) return res.status(404).json({ message: "Pet not found" });
        res.json(result);
      } catch (error) {
        res.status(400).json({ message: "Invalid ID format" });
      }
    });

    // 4. PUT API - Edit/Update pet details
    app.put('/add-pets/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        delete updatedData._id;

        const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const result = await petsCollection.updateOne(filter, { $set: updatedData });

        if (result.matchedCount === 0) return res.status(404).json({ message: "Pet not found" });
        res.json(await petsCollection.findOne(filter));
      } catch (error) {
        res.status(500).json({ message: "Server error updating pet" });
      }
    });

    // 5. DELETE API - Remove pet
    app.delete('/add-pets/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const result = await petsCollection.deleteOne(query);
        if (result.deletedCount === 0) return res.status(404).json({ message: "Pet not found" });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: "Server error deleting pet" });
      }
    });

    // 6. POST API - Submit adoption request (UPDATED WITH OWNER VALIDATION)
    app.post('/adoption-requests', async (req, res) => {
      try {
        const requestData = req.body;
        if (!requestData.userEmail) {
            return res.status(401).json({ message: "Unauthorized: No user session" });
        }

        // SECURITY CHECK: Ensure user is not the owner of the pet
        const pet = await petsCollection.findOne({ _id: new ObjectId(requestData.petId) });
        if (pet && pet.ownerEmail === requestData.userEmail) {
          return res.status(403).json({ message: "You cannot request your own pet!" });
        }

        const existingRequest = await requestsCollection.findOne({
          petId: requestData.petId,
          userEmail: requestData.userEmail
        });
        if (existingRequest) {
          return res.status(400).json({ message: "You have already requested this pet!" });
        }

        const result = await requestsCollection.insertOne({
          ...requestData,
          status: "Pending",
          createdAt: new Date()
        });
        res.status(201).json({ success: true, result });
      } catch (error) {
        res.status(500).json({ message: "Server error processing request" });
      }
    });

    // 7. GET API - Retrieve adoption applications
    app.get('/adoption-requests', async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: "Email required" });
        const result = await requestsCollection.find({ userEmail: email }).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    // 8. GET API - Fetch pets by owner email
    app.get('/my-pets/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const result = await petsCollection.find({ ownerEmail: email }).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Server error fetching your listings" });
      }
    });

    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send("Server is running!"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});