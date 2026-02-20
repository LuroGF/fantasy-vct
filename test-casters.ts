
import { getCasters } from './lib/actions/casters';

async function test() {
    console.log("Testing getCasters...");
    const casters = await getCasters();
    console.log("Casters found:", casters.length);
    console.log(JSON.stringify(casters, null, 2));
}

test();
