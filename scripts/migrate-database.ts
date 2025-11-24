import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env file manually
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env')
    const envContent = readFileSync(envPath, 'utf-8')
    const envVars: Record<string, string> = {}
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          envVars[key] = value
        }
      }
    })
    
    return envVars
  } catch (error) {
    console.warn('Could not read .env file, using process.env')
    return {}
  }
}

const env = loadEnv()
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL || env.OLD_DATABASE_URL || 'mongodb+srv://imkish18_db_user:XOST3wpObLXdncMt@cluster0.hxdt4xi.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0'
const NEW_DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL || 'mongodb+srv://imkish18_db_user:a3nVggt6RTTDTjgx@cluster0.8mptzx0.mongodb.net/?appName=Cluster0'

async function migrateDatabase() {
  console.log('🔄 Starting database migration...\n')
  
  const oldClient = new MongoClient(OLD_DATABASE_URL)
  const newClient = new MongoClient(NEW_DATABASE_URL)
  
  try {
    // Connect to both databases
    console.log('📡 Connecting to old database...')
    await oldClient.connect()
    console.log('✅ Connected to old database')
    
    console.log('📡 Connecting to new database...')
    await newClient.connect()
    console.log('✅ Connected to new database\n')
    
    // Extract database names from URLs
    const oldDbName = new URL(OLD_DATABASE_URL).pathname.split('/')[1] || 'crm_database'
    const newDbName = new URL(NEW_DATABASE_URL).pathname.split('/')[1] || 'crm_database'
    
    const oldDb = oldClient.db(oldDbName)
    const newDb = newClient.db(newDbName || 'crm_database')
    
    // Migrate Users collection
    console.log('👥 Migrating Users collection...')
    const users = await oldDb.collection('User').find({}).toArray()
    if (users.length > 0) {
      // Remove existing users in new DB (optional - comment out if you want to merge)
      await newDb.collection('User').deleteMany({})
      
      // Insert users into new database
      await newDb.collection('User').insertMany(users)
      console.log(`✅ Migrated ${users.length} users`)
    } else {
      console.log('ℹ️  No users found to migrate')
    }
    
    // Migrate Leads collection
    console.log('📋 Migrating Leads collection...')
    const leads = await oldDb.collection('Lead').find({}).toArray()
    if (leads.length > 0) {
      // Remove existing leads in new DB (optional - comment out if you want to merge)
      await newDb.collection('Lead').deleteMany({})
      
      // Insert leads into new database
      await newDb.collection('Lead').insertMany(leads)
      console.log(`✅ Migrated ${leads.length} leads`)
    } else {
      console.log('ℹ️  No leads found to migrate')
    }
    
    // Verify migration
    console.log('\n🔍 Verifying migration...')
    const newUsersCount = await newDb.collection('User').countDocuments()
    const newLeadsCount = await newDb.collection('Lead').countDocuments()
    const oldUsersCount = await oldDb.collection('User').countDocuments()
    const oldLeadsCount = await oldDb.collection('Lead').countDocuments()
    
    console.log(`\n📊 Migration Summary:`)
    console.log(`   Old DB - Users: ${oldUsersCount}, Leads: ${oldLeadsCount}`)
    console.log(`   New DB - Users: ${newUsersCount}, Leads: ${newLeadsCount}`)
    
    if (newUsersCount === oldUsersCount && newLeadsCount === oldLeadsCount) {
      console.log('\n✅ Migration completed successfully!')
    } else {
      console.log('\n⚠️  Warning: Record counts do not match. Please verify manually.')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await oldClient.close()
    await newClient.close()
    console.log('\n🔌 Disconnected from databases')
  }
}

migrateDatabase()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

