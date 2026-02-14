// This script simulates what the frontend does to test the assignments API
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://imkish18_db_user:XOST3wpObLXdncMt@cluster0.hxdt4xi.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0";

async function testAssignmentsAPI() {
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!\n');

    const database = client.db('crm_database');
    const callingDataCollection = database.collection('CallingData');

    // Simulate what the API does
    console.log('Testing assignment history query...\n');

    // Get all assignments
    const allAssignments = await callingDataCollection.find({}, {
      projection: {
        assignedById: 1,
        assignedToId: 1,
        createdAt: 1,
      },
      sort: { createdAt: -1 }
    }).toArray();

    console.log(`Found ${allAssignments.length} total calling data records`);

    // Group by assignedById, assignedToId, and date
    const assignmentGroups = new Map();

    allAssignments.forEach((item) => {
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0];
      const key = `${item.assignedById}-${item.assignedToId}-${dateKey}`;

      if (assignmentGroups.has(key)) {
        const group = assignmentGroups.get(key);
        group.count += 1;
      } else {
        assignmentGroups.set(key, {
          assignedById: item.assignedById,
          assignedToId: item.assignedToId,
          createdAt: item.createdAt,
          count: 1,
        });
      }
    });

    console.log(`\nGrouped into ${assignmentGroups.size} unique assignments\n`);

    // Show first 5 assignments
    const assignments = Array.from(assignmentGroups.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    console.log('First 5 assignments:');
    for (const assignment of assignments) {
      // Get user details
      const usersCollection = database.collection('User');
      const { ObjectId } = require('mongodb');
      const assignedBy = await usersCollection.findOne({ _id: new ObjectId(assignment.assignedById) });
      const assignedTo = await usersCollection.findOne({ _id: new ObjectId(assignment.assignedToId) });

      console.log(`\n- ${assignment.count} records`);
      console.log(`  Assigned by: ${assignedBy?.name || assignedBy?.email || 'Unknown'} (ID: ${assignment.assignedById})`);
      console.log(`  Assigned to: ${assignedTo?.name || assignedTo?.email || 'Unknown'} (ID: ${assignment.assignedToId})`);
      console.log(`  Date: ${new Date(assignment.createdAt).toLocaleString()}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await client.close();
    console.log('\n\nConnection closed');
  }
}

testAssignmentsAPI().catch(console.error);
