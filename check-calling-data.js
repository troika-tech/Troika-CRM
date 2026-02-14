const { MongoClient } = require('mongodb');

// MongoDB connection URI from .env.production
const uri = "mongodb+srv://imkish18_db_user:XOST3wpObLXdncMt@cluster0.hxdt4xi.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0";

async function checkCallingData() {
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');

    const database = client.db('crm_database');

    // List all collections
    const collections = await database.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(col => console.log(`- ${col.name}`));

    // Check if CallingData collection exists
    const hasCallingData = collections.some(col => col.name === 'CallingData');
    console.log(`\nCallingData collection exists: ${hasCallingData}`);

    if (hasCallingData) {
      // Count documents in CallingData
      const callingDataCollection = database.collection('CallingData');
      const count = await callingDataCollection.countDocuments();
      console.log(`Total calling data records: ${count}`);

      if (count > 0) {
        // Show a sample record
        const sample = await callingDataCollection.findOne();
        console.log('\nSample CallingData record:');
        console.log(JSON.stringify(sample, null, 2));
      }
    } else {
      console.log('\n⚠️  CallingData collection does not exist!');
      console.log('This will be created automatically when the first calling data is assigned.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkCallingData().catch(console.error);
