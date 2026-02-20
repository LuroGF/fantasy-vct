import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use ANON key to test what the UI sees
    );

    console.log('--- Checking Casters with ANON Key ---');
    const { data, error } = await supabase.from('casters').select('*');
    if (error) {
        console.error('Error with ANON key:', error);
    } else {
        console.log('Casters found with ANON key:', data?.length || 0);
        console.log(data);
    }
}

check();
