/* global supabase */

const SUPABASE_URL = "...";
const SUPABASE_ANON_KEY = "...";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_ROUTES = 1000;

const AIRLINE_LOGO_BASE =
  "https://raw.githubusercontent.com/magpie1978/douzepoints/main/tailfins/";

const airlineLogoMap = {
  "Ryanair": "Ryanair.webp",
  "British Airways": "BritishAirways.webp"
};
