// This imports the createClient function from Supabase’s official JavaScript library (version 2).
// It uses the +esm variant, which is optimized for use in modern browsers that support ES Modules.
// This enables you to write modular JS using import/export.

//import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

//const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
//const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

//export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//window.supabaseClient = supabase; // make globally available
//window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);




// Import *all* exports from the Supabase v2 ESM CDN bundle.
// jsDelivr does not expose named or default exports for this package.

import * as supabase from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://eukgodthgusongsbhdwg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1a2dvZHRoZ3Vzb25nc2JoZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjI1NjAsImV4cCI6MjA2NzEzODU2MH0.e8Gm9utDCQWDjSOJgh-VBioCQFX_aAWXz8rzigFgh4s';

export const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Make available to non-module scripts
window.supabaseClient = supabaseClient;
