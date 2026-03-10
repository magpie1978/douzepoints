import { renderVideos } from "./video.js";
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);
  const year = params.get("edition") || 2026;

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("*")
    .eq("Contest", "UMK")
    .eq("Year", year)
    .order("Running Order", { ascending: true });

  if (error) {
    console.error("UMK load error:", error);
    return;
  }

  const transformed = (data || []).map(row => ({
    Artist: row.Artist,
    Song: row.Song,
    Year: row.Year,
    Country: "Finland",
    Country_Code: "fi",
    Video_URL: row["Video URL"],
    Video_Lookup: `UMK-${row.Year}-${row["Running Order"]}`,
    Image: `images/umk/${row.Year}-${row["Running Order"]}.jpg`
  }));

  renderVideos(transformed);

});
