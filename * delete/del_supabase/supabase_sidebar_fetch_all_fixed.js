
console.log("sidebar.js loaded. Path:", window.location.pathname);

const supabase = window.supabase;

document.addEventListener("DOMContentLoaded", async () => {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  const { data, error } = await supabase
    .from("douzepoints")
    .select("Year")
    .order("Year", { ascending: false });

  if (error || !data?.length) {
    sidebarContainer.innerHTML = "<p style='padding: 10px;'>Error loading years.</p>";
    console.error("Sidebar load error:", error);
    return;
  }

  const years = [...new Set(data.map(row => row.Year))].sort((a, b) => b - a);
  const list = document.createElement("ul");

  years.forEach(year => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `edition.html?edition=${year}`;
    a.textContent = year;
    li.appendChild(a);
    list.appendChild(li);
  });

  sidebarContainer.appendChild(list);
});
