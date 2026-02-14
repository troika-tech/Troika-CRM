const { MongoClient } = require('mongodb');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

// MongoDB connection URI
const uri = "mongodb+srv://imkish18_db_user:XOST3wpObLXdncMt@cluster0.hxdt4xi.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0";

async function exportLeads() {
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');

    const database = client.db('crm_database');
    const leadsCollection = database.collection('Lead');
    const usersCollection = database.collection('User');

    // Fetch all users first to create a lookup map
    console.log('Fetching users...');
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);

    // Create user lookup map by ID (try multiple formats)
    const userMap = {};
    users.forEach(user => {
      const userId = user._id.toString();
      const userInfo = {
        userName: user.name || '',
        userEmail: user.email || '',
        userRole: user.role || ''
      };
      userMap[userId] = userInfo;
      // Also store with ObjectId string representation
      userMap[JSON.stringify(user._id)] = userInfo;
    });

    console.log('Sample user IDs:', users.slice(0, 3).map(u => u._id.toString()));

    // Fetch all leads
    console.log('Fetching leads...');
    const leads = await leadsCollection.find({}).toArray();
    console.log(`Found ${leads.length} leads`);

    if (leads.length === 0) {
      console.log('No leads to export');
      return;
    }

    // Get all unique keys from all leads
    const allKeys = new Set();
    leads.forEach(lead => {
      Object.keys(lead).forEach(key => allKeys.add(key));
    });

    // Add user-related fields
    allKeys.add('assignedUserName');
    allKeys.add('assignedUserEmail');
    allKeys.add('assignedUserRole');

    // Convert to array and create custom order
    const priorityHeaders = ['_id', 'customerName', 'mobile', 'email', 'assignedUserName', 'assignedUserEmail', 'assignedUserRole'];
    const remainingHeaders = Array.from(allKeys).filter(key => !priorityHeaders.includes(key)).sort();
    const headers = [...priorityHeaders.filter(h => allKeys.has(h)), ...remainingHeaders];

    // Create CSV writer with custom headers
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, 'leads_export.csv'),
      header: headers.map(header => ({ id: header, title: header }))
    });

    // Log sample lead to understand structure
    if (leads.length > 0) {
      console.log('Sample lead createdbyId:', leads[0].createdbyId);
      console.log('Sample lead createdById:', leads[0].createdById);
    }

    // Prepare records - handle nested objects and arrays
    const records = leads.map(lead => {
      const record = {};

      // Get user info if createdbyId or createdById exists
      let userInfo = { userName: '', userEmail: '', userRole: '' };

      // Try different field names and formats
      const possibleUserIds = [
        lead.createdbyId,
        lead.createdById,
        lead.assignedTo,
        lead.userId
      ];

      for (const id of possibleUserIds) {
        if (id) {
          const idStr = typeof id === 'object' ? id.toString() : String(id);
          const idJson = typeof id === 'object' ? JSON.stringify(id) : null;

          if (userMap[idStr]) {
            userInfo = userMap[idStr];
            break;
          } else if (idJson && userMap[idJson]) {
            userInfo = userMap[idJson];
            break;
          }
        }
      }

      headers.forEach(header => {
        if (header === 'assignedUserName') {
          record[header] = userInfo.userName;
        } else if (header === 'assignedUserEmail') {
          record[header] = userInfo.userEmail;
        } else if (header === 'assignedUserRole') {
          record[header] = userInfo.userRole;
        } else {
          const value = lead[header];
          if (value === undefined || value === null) {
            record[header] = '';
          } else if (typeof value === 'object') {
            // Convert objects and arrays to JSON strings
            record[header] = JSON.stringify(value);
          } else {
            record[header] = value;
          }
        }
      });
      return record;
    });

    // Write to CSV
    console.log('Writing to CSV...');
    await csvWriter.writeRecords(records);
    console.log(`Successfully exported ${leads.length} leads with user information to leads_export.csv`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

// Run the export
exportLeads().catch(console.error);
