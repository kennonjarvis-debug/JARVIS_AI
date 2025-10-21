import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  // Try to select all columns from User table
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error);
  } else {
    console.log('User table columns:', data ? Object.keys(data[0] || {}) : 'No data');
  }
}

checkSchema().then(() => process.exit(0));
