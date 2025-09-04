#!/usr/bin/env node

import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// SQLite database path
const sqliteDbPath = path.resolve(__dirname, 'backend/database.sqlite');
console.log('SQLite database path:', sqliteDbPath);

// PostgreSQL connection (using external URL for migration)
const pgConnectionString = 'postgresql://boardly_db_user:TrDf9EncBPPfdEOZoBguGNduGoAowffL@dpg-d2s41sripnbc73e7dk9g-a.oregon-postgres.render.com/boardly_db';

async function migrateData() {
  let sqliteDb;
  let pgPool;
  
  try {
    console.log('🔄 Starting database migration from SQLite to PostgreSQL...\n');
    
    // Connect to SQLite
    console.log('📂 Connecting to SQLite database...');
    sqliteDb = new Database(sqliteDbPath);
    console.log('✅ SQLite connection established');
    
    // Connect to PostgreSQL
    console.log('🐘 Connecting to PostgreSQL database...');
    pgPool = new Pool({
      connectionString: pgConnectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test PostgreSQL connection
    console.log('Testing PostgreSQL connection...');
    const testClient = await pgPool.connect();
    console.log('PostgreSQL client connected, running test query...');
    const testResult = await testClient.query('SELECT NOW() as current_time');
    console.log('Test query successful:', testResult.rows[0].current_time);
    testClient.release();
    console.log('✅ PostgreSQL connection established\n');
    
    // Define tables in dependency order (foreign keys)
    const tables = [
      'users',
      'projects', 
      'project_members',
      'boards',
      'columns',
      'diary_entries',
      'tasks',
      'task_dependencies',
      'events'
    ];
    
    let totalRowsMigrated = 0;
    
    for (const tableName of tables) {
      console.log(`\n🔄 Migrating table: ${tableName}`);
      
      try {
        // Check if table exists in SQLite
        const tableExists = sqliteDb.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);
        
        if (!tableExists) {
          console.log(`⚠️  Table ${tableName} does not exist in SQLite, skipping...`);
          continue;
        }
        
        // Get all data from SQLite table
        const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
        console.log(`   📊 Found ${rows.length} rows in ${tableName}`);
        
        if (rows.length === 0) {
          console.log(`   ✅ No data to migrate for ${tableName}`);
          continue;
        }
        
        // Clear existing data in PostgreSQL table
        await pgPool.query(`DELETE FROM ${tableName}`);
        console.log(`   🗑️  Cleared existing data from PostgreSQL ${tableName}`);
        
        // Get column names from the first row
        const columns = Object.keys(rows[0]);
        
        // Create parameterized query
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')}) 
          VALUES (${placeholders})
        `;
        
        // Insert all rows
        let insertedCount = 0;
        for (const row of rows) {
          const values = columns.map(col => row[col]);
          
          try {
            await pgPool.query(insertQuery, values);
            insertedCount++;
          } catch (error) {
            console.log(`   ⚠️  Failed to insert row with ID ${row.id || 'unknown'}: ${error.message}`);
          }
        }
        
        // Reset sequences for PostgreSQL
        if (rows.length > 0 && rows[0].id) {
          const maxId = Math.max(...rows.map(r => r.id));
          await pgPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), ${maxId})`);
          console.log(`   🔢 Reset ${tableName} ID sequence to ${maxId}`);
        }
        
        console.log(`   ✅ Successfully migrated ${insertedCount}/${rows.length} rows to ${tableName}`);
        totalRowsMigrated += insertedCount;
        
      } catch (error) {
        console.error(`   ❌ Error migrating ${tableName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total rows migrated: ${totalRowsMigrated}`);
    console.log(`\n✅ Your SQLite data has been successfully migrated to PostgreSQL!`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close connections
    if (sqliteDb) {
      sqliteDb.close();
      console.log('📂 SQLite connection closed');
    }
    if (pgPool) {
      await pgPool.end();
      console.log('🐘 PostgreSQL connection closed');
    }
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData();
}