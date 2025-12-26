// =====================================================================
// STATE
// =====================================================================
let currentRoutes = [];          // Holds the currently loaded + filtered routes from Supabase.
let isolatedUid = null;          // Stores the UID of the currently “isolated” route (clicked in map or sidebar).
let mapMode = "routes";          // defaults map to routes 
let lastNonIsolatedView = null;  // Used to restore map position after: Route isolation or Mode switching
let lastRoutesBounds = null;     // for “revert to prior view” after isolate

// Holds active filter selections  -  Using Set avoids duplicates and makes add/remove trivial
const selected = {
  years: new Set(),
  airlines: new Set(),
  types: new Set(),
};
