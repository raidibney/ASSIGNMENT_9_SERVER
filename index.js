const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
dotenv.config()
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI

const PORT = process.env.PORT 
app.use(cors())
app.use(express.json())

//creating client 
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//mongo function 
async function run() {
  try {
  
    await client.connect();
  // here creating the database and connect it to the add pets 

   const db = client.db("petDB");
   const petsCollection = db.collection("pets");

// here is the get api 
app.get('/add-pet', async (req, res) => {

  const result = await petsCollection.find().toArray();
  res.json(result);
})



   //creation api for add pet getttttt
  app.post('/add-pet', async (req, res) => {
const petdata = req.body;
console.log(petdata)
   petsCollection.insertOne(petdata)
   const result = await petsCollection.insertOne(petdata);
    res.send(result)

  })




 
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("Server is running fine!")
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})