import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkCasters() {
    const supabase = createClient(
        //process.env.NEXT_PUBLIC_SUPABASE_URL!,
        //process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: casters, error } = await supabase.from('casters').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Casters in DB:', casters?.length);
        console.log(casters);
    }
}

checkCasters();
