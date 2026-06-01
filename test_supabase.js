require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('oxyvision_patients').insert([
    {
      patient_id_label: 'Test Patient',
      age: 45,
      sex: 'M',
      bmi: 24.5,
      status: 'Low COPD Risk',
      copd_probability: 2.5
    }
  ]);
  
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Successfully inserted test record!');
  }
}

test();
