import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('--- Checking Casters ---');
    const { data, error } = await supabase.from('casters').select('count', { count: 'exact' });
    if (error) {
        console.error('Error fetching casters count:', error);
    } else {
        console.log('Exact count of casters:', data[0]?.count ?? 0);
    }

    const { data: allCasters } = await supabase.from('casters').select('nickname');
    console.log('Casters found:', allCasters);
}

check();
