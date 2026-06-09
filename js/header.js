import { supabase } from './supabaseClient.js';
 
document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

async function loadHeader() {

  const path = window.location.pathname;
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) return;

  /* Load shared header HTML */

  const res = await fetch("header.html", { cache: "no-store" });

  if (!res.ok) {
    console.error("[header] Failed to load header.html:", res.status);
    return;
  }

  headerContainer.innerHTML = await res.text();

  await new Promise(requestAnimationFrame);

  if (window.lucide) window.lucide.createIcons();

  /*  new code for mobile */
 const menuToggle = document.getElementById("mobile-menu-toggle");
 const mobileNav = document.getElementById("mobile-nav");

 if (menuToggle && mobileNav) {
   menuToggle.addEventListener("click", () => {
     mobileNav.classList.toggle("mobile-open");
 
     const isOpen = mobileNav.classList.contains("mobile-open");
     menuToggle.textContent = isOpen ? "× Close" : "☰ Menu";
   });
 }
 
  /* Load National Finals dropdown */

  await loadNationalFinalsMenu();

  /* Session-aware controls */

  const { data: { session } } = await supabase.auth.getSession();

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {

    logoutBtn.style.display = session ? "flex" : "none";

    logoutBtn.addEventListener("click", async (e) => {

      e.preventDefault();

      try {
        await supabase.auth.signOut();
      } finally {
        window.location.href = "index.html";
      }

    });

  }

  /* Banner Logic */

  const banner = document.getElementById("country-banner");
  if (!banner) return;

  banner.style.display = "none";

  const params = new URLSearchParams(window.location.search);

  const country = params.get("country");
  const contest = params.get("contest");

  const isIndexPage =
    path === "/" ||
    path.endsWith("/index.html") ||
    path.endsWith("/");

  const isCountryPage      = path.includes("country.html");
  const isEditionPage      = path.includes("edition.html");
  const isWinnersPage      = path.includes("winners.html");
  const isShowPage         = path.includes("shows.html");
  const isFavoritesPage    = path.includes("my-favorites.html");
  const isFanFavesPage     = path.includes("fan-favorites.html");
  const isScoreboardPage   = path.includes("scoreboard.html");
  const isWatchHistoryPage = path.includes("my-stats.html");
  const isNationalPage     = path.includes("national-finals.html");

  let bannerSrc = null;

  if (isIndexPage) {

    bannerSrc = "banners/douzepoints.png";

  } else if (isWinnersPage) {

    bannerSrc = "banners/winners.png";

  } else if (isFanFavesPage) {

    bannerSrc = "banners/fanfavorites.png";

  } else if (isShowPage) {

    bannerSrc = "banners/shows.png";

  } else if (isFavoritesPage) {

    bannerSrc = "banners/my-faves.png";

  } else if (isEditionPage) {

    const editionYear = params.get("edition");
    if (editionYear) bannerSrc = `banners/${editionYear}.png`;

  } else if (isCountryPage && country) {

    const { data } = await supabase
      .from("douzepoints")
      .select("Country_Code")
      .ilike("Country", country)
      .limit(1);

    const code = data?.[0]?.Country_Code?.toLowerCase();

    if (code) bannerSrc = `banners/${code}.png`;

  } else if (isWatchHistoryPage) {

    bannerSrc = "banners/watchstats.png";

  } else if (isScoreboardPage) {

    bannerSrc = "banners/scoreboard.png";

  } else if (isNationalPage && country) {

    const countryToFlagCode = {
     Albania: "al", 
     Andorra: "ad",
     Armenia: "am",
     Australia: "au",
     Austria: "at",
     Azerbaijan: "az",
     Belarus: "by",
     Belgium: "be",
     "Bosnia & Hercegovina": "ba",
     Bulgaria: "bg",
     Croatia: "hr",
     Cyprus: "cy",
     Czechia: "cz",
     Denmark: "dk",
     Estonia: "ee",
     Finland: "fi",
     France: "fr",
     Georgia: "ge",
     Germany: "de",
     Greece: "gr",
     Hungary: "hu",
     Iceland: "is",
     Ireland: "ie",
     Israel: "il",
     Italy: "it",
     Latvia: "lv",
     Lithuania: "lt",
     Luxembourg: "lu",
     Malta: "mt",
     Moldova: "md",
     Monaco: "mc",
     Montenegro: "me",
     Morocco: "mo",
     Netherlands: "nl",
     "North Macedonia": "mk",
     Norway: "no",
     Poland: "pl",
     Portugal: "pt",
     Romania: "ro",
     Russia: "ru",
     "San Marino": "sm",
     Serbia: "rs",
     "Serbia & Montenegro": "cs",
     Slovakia: "sk",
     Slovenia: "si",
     Spain: "es",
     Sweden: "se",
     Switzerland: "ch",
     Turkey: "tk",
     Ukraine: "ua",
     "United Kingdom": "gb",
     Yugoslavia: "yu"
    };

    const code = countryToFlagCode[country];
    if (code) bannerSrc = `/banners_nf/${code}.png`;

  }
  if (bannerSrc) {

    banner.onload = () => {
      banner.style.display = "block";
    };

    banner.src = bannerSrc;

  }

}

/* National Finals dropdown */

//async function loadNationalFinalsMenu() {

//  const menu = document.getElementById("national-finals-dropdown");
//  if (!menu) return;

//  const { data, error } = await supabase
//    .from("douzepoints_finland")
//    .select("Contest, country");

//  if (error) {
//    console.error("[header] National Finals menu error:", error);
//    return;
//  }

//  const contests = [
//    ...new Map(data.map(r => [r.country, r])).values()
//  ].sort((a,b)=>a.Contest.localeCompare(b.Contest));
  
//  contests.forEach(row => {
  
//    const li = document.createElement("li");
  
//    const a = document.createElement("a");
//    a.className = "dropdown-item";
  
//    a.href = `national-finals.html?contest=${row.country}`;
//    a.textContent = row.Contest;
  
//    li.appendChild(a);
//    menu.appendChild(li);
  
//  });

//}






//async function loadNationalFinalsMenu() {
//  const menu = document.getElementById("national-finals-dropdown");
//  if (!menu) return;

//  const { data, error } = await supabase
//    .from("douzepoints_finland")
//    .select("Contest, country");

//  if (error) {
//    console.error("[header] National Finals menu error:", error);
//    return;
//  }

//  const contests = [
//    ...new Map(data.map(r => [r.country, r])).values()
//  ].sort((a, b) => a.Contest.localeCompare(b.Contest));

//  menu.innerHTML = "";

//  const flagMap = {
//    au: "au",
//    dk: "dk",
//    de: "de",
//    am: "am",
//    hr: "hr",
//    ee: "ee",
//    ie: "ie",
//    lt: "lt",
//    pt: "pt",
//    al: "al",
//    pl: "pl",
//    lu: "lu",
//    se: "se",
//    no: "no",
//    ua: "ua",
//    fi: "fi",
//    be: "be",
//    mt: "mt",
//    me: "me",
//    bg: "bg",
//    rs: "rs",
//    sm: "sm",
//    it: "it",
//    md: "md",
//    ro: "ro",
//    gr: "gr",
//    lv: "lv",
//    at: "at"
//  };

//  const halfway = Math.ceil(contests.length / 2);
//  const leftItems = contests.slice(0, halfway);
//  const rightItems = contests.slice(halfway);

//  const makeColumn = (items) => {
//    const col = document.createElement("div");
//    col.className = "nf-dropdown-col";

//    items.forEach(row => {
//      const a = document.createElement("a");
//      a.className = "dropdown-item nf-dropdown-item";
//      a.href = `national-finals.html?contest=${row.country}`;
//      a.title = row.Contest;

//      const flagCode = flagMap[row.country];

//      if (flagCode) {
//        const img = document.createElement("img");
//        img.className = "nf-dropdown-flag";
//        img.src = `/flags/${flagCode}.png`;
//        img.alt = "";
//        a.appendChild(img);
//      }

//      const text = document.createElement("span");
//      text.className = "nf-dropdown-text";
//      text.textContent = row.Contest;
//      a.appendChild(text);

//      col.appendChild(a);
//    });

//    return col;
//  };

//  menu.appendChild(makeColumn(leftItems));
//  menu.appendChild(makeColumn(rightItems));
//}


async function loadNationalFinalsMenu() {
  const menu = document.getElementById("national-finals-dropdown");
  if (!menu) return;

  const { data, error } = await supabase
    .from("douzepoints_finland")
    .select("Contest, country");

  if (error) {
    console.error("[header] National Finals menu error:", error);
    return;
  }

  if (!data || !data.length) return;

const countryToFlagCode = {
     Albania: "al", 
     Andorra: "ad",
     Armenia: "am",
     Australia: "au",
     Austria: "at",
     Azerbaijan: "az",
     Belarus: "by",
     Belgium: "be",
     "Bosnia & Hercegovina": "ba",
     Bulgaria: "bg",
     Croatia: "hr",
     Cyprus: "cy",
     Czechia: "cz",
     Denmark: "dk",
     Estonia: "ee",
     Finland: "fi",
     Georgia: "ge",
     Germany: "de",
     Greece: "gr",
     Hungary: "hu",
     Iceland: "is",
     Ireland: "ie",
     Israel: "il",
     Italy: "it",
     Latvia: "lv",
     Lithuania: "lt",
     Malta: "mt",
     Moldova: "md",
     Monaco: "mc",
     Montenegro: "me",
     Morocco: "mo",
     Netherlands: "nl",
     "North Macedonia": "mk",
     Norway: "no",
     Poland: "pl",
     Portugal: "pt",
     Romania: "ro",
     Russia: "ru",
     "San Marino": "sm",
     Serbia: "rs",
     "Serbia & Montenegro": "cs",
     Slovakia: "sk",
     Slovenia: "si",
     Spain: "es",
     Sweden: "se",
     Switzerland: "ch",
     Turkey: "tk",
     Ukraine: "ua",
     "United Kingdom": "gb",
     Yugoslavia: "yu"
    };
 
  const contests = [
    ...new Map(
      data
        .filter(row => row && row.country)
        .map(row => [row.country, row])
    ).values()
  ].sort((a, b) => String(a.country).localeCompare(String(b.country)));

  menu.innerHTML = "";

  const halfway = Math.ceil(contests.length / 2);
  const leftItems = contests.slice(0, halfway);
  const rightItems = contests.slice(halfway);

  const makeColumn = (items) => {
    const col = document.createElement("div");
    col.className = "nf-dropdown-col";

    items.forEach(row => {
      const flagCode = countryToFlagCode[row.country];
      if (!flagCode) {
        console.warn("[header] No flag code mapping for country:", row.country);
        return;
      }

      const a = document.createElement("a");
      a.className = "dropdown-item nf-dropdown-item";
      a.href = `national-finals.html?country=${encodeURIComponent(row.country)}`;
      a.title = row.Contest || row.country;

      const img = document.createElement("img");
      img.className = "nf-dropdown-flag";
      img.src = `/flags/${flagCode}.png`;
      img.alt = row.country;
      a.appendChild(img);

      const text = document.createElement("span");
      text.className = "nf-dropdown-text";
      text.textContent = row.country;
      a.appendChild(text);

      col.appendChild(a);
    });

    return col;
  };

  menu.appendChild(makeColumn(leftItems));
  menu.appendChild(makeColumn(rightItems));
}
