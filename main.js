(() => {
  "use strict";

  const STORAGE_KEY = "poultryLinkPreviewListingsV1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const sampleListings = [
    {id:"sample-1",title:"Fresh table eggs — 50 crates",category:"Eggs",price:5200,quantity:"50 crates",unit:"per crate",state:"Ogun",town:"Sango Ota",seller:"GreenNest Poultry",phone:"2348000000001",description:"Illustrative sample offer. Confirm egg size, freshness, quantity and collection arrangements directly with the seller.",emoji:"🥚",art:"eggs",tag:"POPULAR",created:6},
    {id:"sample-2",title:"Point-of-lay pullets",category:"Layers",price:12500,quantity:"120 birds",unit:"per bird",state:"Oyo",town:"Ibadan",seller:"Sunrise Layer Farm",phone:"2348000000002",description:"Illustrative sample offer for point-of-lay birds. Ask about age, vaccination records, breed and current availability.",emoji:"🐔",art:"layers",tag:"BIRDS",created:5},
    {id:"sample-3",title:"Broilers ready for market",category:"Broilers",price:8500,quantity:"75 birds",unit:"per bird",state:"Lagos",town:"Ikorodu",seller:"Harvest Poultry Hub",phone:"2348000000003",description:"Illustrative sample offer. Confirm live weight, health status, collection time and transport before agreeing a deal.",emoji:"🍗",art:"broilers",tag:"READY STOCK",created:4},
    {id:"sample-4",title:"Day-old broiler chicks",category:"Chicks",price:1600,quantity:"500 chicks",unit:"per chick",state:"Ogun",town:"Abeokuta",seller:"FeatherStart Farms",phone:"2348000000004",description:"Illustrative sample offer. Confirm hatch date, strain, vaccination, minimum order and delivery arrangements.",emoji:"🐣",art:"chicks",tag:"CHICKS",created:3},
    {id:"sample-5",title:"Layer mash — 25kg bags",category:"Feed",price:14500,quantity:"40 bags",unit:"per bag",state:"Rivers",town:"Port Harcourt",seller:"FarmSupply Direct",phone:"2348000000005",description:"Illustrative sample offer. Check manufacturer, batch, expiry date, bag weight and whether transport is included.",emoji:"🌾",art:"feed",tag:"FEED",created:2},
    {id:"sample-6",title:"Poultry drinkers and feeders",category:"Equipment",price:3500,quantity:"60 sets",unit:"per set",state:"Kaduna",town:"Kaduna North",seller:"FarmKit Traders",phone:"2348000000006",description:"Illustrative sample offer for basic poultry equipment. Confirm dimensions, material, quantity and pickup or delivery.",emoji:"🧰",art:"equipment",tag:"SUPPLIES",created:1}
  ];

  const state = {query:"",category:"",location:"",sort:"newest",userListings:[]};
  const grid = $("#listingGrid");
  const toast = $("#toast");
  let toastTimer;

  function safeReadListings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.title === "string" && item.id) : [];
    } catch (error) {
      return [];
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
  }

  function formatNaira(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Price on request";
    return "₦" + new Intl.NumberFormat("en-NG", {maximumFractionDigits:0}).format(number);
  }

  function allListings() {
    return [...state.userListings, ...sampleListings];
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function cardTemplate(item) {
    const userCreated = String(item.id).startsWith("user-");
    const location = [item.town, item.state].filter(Boolean).join(", ");
    const desc = item.description || "Contact the seller for more details about this offer.";
    const categoryClass = ({Eggs:"eggs",Layers:"layers",Broilers:"broilers",Chicks:"chicks",Feed:"feed",Equipment:"equipment"})[item.category] || "equipment";
    return `<article class="listing-card">
      <div class="listing-art ${categoryClass}"><span class="listing-tag">${escapeHTML(item.tag || (userCreated ? "YOUR LISTING" : item.category.toUpperCase()))}</span><span class="art-emoji" aria-hidden="true">${escapeHTML(item.emoji || "🐔")}</span></div>
      <div class="listing-body">
        <div class="listing-meta"><span class="category-label">${escapeHTML(item.category)}</span><span>⌖ ${escapeHTML(location || "Location not set")}</span></div>
        <h3>${escapeHTML(item.title)}</h3>
        <p class="listing-description">${escapeHTML(desc)}</p>
        <div class="listing-price">${formatNaira(item.price)} <small>/ ${escapeHTML(item.unit || "unit")}</small></div>
        <div class="listing-details"><span>Available: <strong>${escapeHTML(item.quantity || "Ask seller")}</strong></span><span>${userCreated ? "Browser preview" : "Sample offer"}</span></div>
        <div class="seller-line"><span class="seller-avatar">${escapeHTML((item.seller || "F").trim().charAt(0).toUpperCase())}</span><span>Listed by <strong>${escapeHTML(item.seller || "Poultry seller")}</strong></span></div>
        <div class="card-actions"><button class="btn btn-outline" type="button" data-detail="${escapeHTML(item.id)}">View details</button><button class="btn btn-whatsapp" type="button" data-contact="${escapeHTML(item.id)}">WhatsApp ↗</button></div>
      </div>
    </article>`;
  }

  function filteredListings() {
    const q = state.query.trim().toLowerCase();
    let results = allListings().filter(item => {
      const searchable = [item.title,item.category,item.description,item.seller,item.town,item.state,item.quantity].join(" ").toLowerCase();
      const queryMatch = !q || searchable.includes(q);
      const categoryMatch = !state.category || item.category === state.category;
      const locationMatch = !state.location || item.state === state.location;
      return queryMatch && categoryMatch && locationMatch;
    });
    if (state.sort === "price-low") results.sort((a,b) => Number(a.price) - Number(b.price));
    else if (state.sort === "price-high") results.sort((a,b) => Number(b.price) - Number(a.price));
    else results.sort((a,b) => Number(b.created || 0) - Number(a.created || 0));
    return results;
  }

  function renderListings() {
    const results = filteredListings();
    grid.innerHTML = results.map(cardTemplate).join("");
    $("#resultsCount").textContent = `${results.length} ${results.length === 1 ? "listing" : "listings"}${results.every(item => !String(item.id).startsWith("user-")) ? " (sample)" : ""}`;
    $("#emptyState").classList.toggle("hidden", results.length > 0);
    grid.classList.toggle("hidden", results.length === 0);
    $$("#categoryChips .chip").forEach(chip => chip.classList.toggle("active", chip.dataset.category === state.category));
  }

  function resetFilters() {
    state.query = "";
    state.category = "";
    state.location = "";
    state.sort = "newest";
    $("#searchInput").value = "";
    $("#categoryFilter").value = "";
    $("#locationFilter").value = "";
    $("#sortSelect").value = "newest";
    renderListings();
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    else if (dialog) dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (dialog && typeof dialog.close === "function") dialog.close();
    else if (dialog) dialog.removeAttribute("open");
  }

  function openListingForm() {
    $("#listingForm").reset();
    $("#formMessage").textContent = "";
    openDialog("listingDialog");
  }

  function normalisePhone(phone) {
    return String(phone || "").replace(/[^\d]/g, "");
  }

  function contactSeller(id) {
    const item = allListings().find(listing => listing.id === id);
    if (!item) return;
    if (String(item.id).startsWith("sample-")) {
      showToast("This is a sample listing. Real seller contact details will appear after launch.");
      return;
    }
    const phone = normalisePhone(item.phone);
    if (!phone || phone.length < 10) {
      showToast("This listing has no valid WhatsApp number.");
      return;
    }
    const message = `Hello ${item.seller || "seller"}, I found your "${item.title}" listing on PoultryLink. Is it still available? Please confirm the price, quantity and delivery or pickup details.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function showDetails(id) {
    const item = allListings().find(listing => listing.id === id);
    if (!item) return;
    const categoryClass = ({Eggs:"eggs",Layers:"layers",Broilers:"broilers",Chicks:"chicks",Feed:"feed",Equipment:"equipment"})[item.category] || "equipment";
    const location = [item.town,item.state].filter(Boolean).join(", ");
    $("#detailContent").innerHTML = `
      <div class="modal-header"><div><span class="section-kicker">LISTING DETAILS</span><p>Review the offer before contacting the seller.</p></div><button type="button" class="modal-close" data-close="detailDialog" aria-label="Close">×</button></div>
      <div class="detail-hero"><div class="listing-art ${categoryClass}"><span class="art-emoji">${escapeHTML(item.emoji || "🐔")}</span></div><div><h2>${escapeHTML(item.title)}</h2><span class="category-label">${escapeHTML(item.category)}</span><div class="listing-price">${formatNaira(item.price)} <small>/ ${escapeHTML(item.unit || "unit")}</small></div></div></div>
      <p class="detail-copy">${escapeHTML(item.description || "Contact the seller to confirm product details.")}</p>
      <div class="detail-facts"><div class="detail-fact"><small>AVAILABLE QUANTITY</small><strong>${escapeHTML(item.quantity || "Ask seller")}</strong></div><div class="detail-fact"><small>LOCATION</small><strong>${escapeHTML(location || "Not specified")}</strong></div><div class="detail-fact"><small>SELLER / FARM</small><strong>${escapeHTML(item.seller || "Poultry seller")}</strong></div><div class="detail-fact"><small>LISTING STATUS</small><strong>${String(item.id).startsWith("user-") ? "Browser preview" : "Illustrative sample"}</strong></div></div>
      <p class="detail-copy"><strong>Safety reminder:</strong> confirm current stock, quality, final price, transport and payment arrangements directly. Do not rely on this sample listing as a real offer.</p>
      <button type="button" class="btn btn-primary full-button" data-contact="${escapeHTML(item.id)}">Contact seller on WhatsApp ↗</button>`;
    openDialog("detailDialog");
  }

  $("#searchForm").addEventListener("submit", event => {
    event.preventDefault();
    state.query = $("#searchInput").value;
    state.category = $("#categoryFilter").value;
    state.location = $("#locationFilter").value;
    renderListings();
    $("#marketplace").scrollIntoView({behavior:"smooth",block:"start"});
  });

  $("#categoryChips").addEventListener("click", event => {
    const chip = event.target.closest("[data-category]");
    if (!chip) return;
    state.category = chip.dataset.category;
    $("#categoryFilter").value = state.category;
    renderListings();
  });

  $("#sortSelect").addEventListener("change", event => {
    state.sort = event.target.value;
    renderListings();
  });

  $("#clearFiltersButton").addEventListener("click", resetFilters);
  $("#emptyClearButton").addEventListener("click", resetFilters);
  ["sellHeaderButton","heroSellButton","sellBannerButton"].forEach(id => document.getElementById(id).addEventListener("click", openListingForm));
  $("#signInButton").addEventListener("click", () => openDialog("authDialog"));
  $("#menuButton").addEventListener("click", () => {
    const nav = $("#desktopNav");
    const open = nav.classList.toggle("open");
    $("#menuButton").setAttribute("aria-expanded", String(open));
    $("#menuButton").textContent = open ? "×" : "☰";
  });
  $$("#desktopNav a").forEach(link => link.addEventListener("click", () => {
    $("#desktopNav").classList.remove("open");
    $("#menuButton").setAttribute("aria-expanded","false");
    $("#menuButton").textContent = "☰";
  }));

  document.addEventListener("click", event => {
    const closeButton = event.target.closest("[data-close]");
    if (closeButton) closeDialog(document.getElementById(closeButton.dataset.close));
    const detailButton = event.target.closest("[data-detail]");
    if (detailButton) showDetails(detailButton.dataset.detail);
    const contactButton = event.target.closest("[data-contact]");
    if (contactButton) contactSeller(contactButton.dataset.contact);
  });

  $$("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  $("#listingForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const phone = normalisePhone(data.get("phone"));
    if (phone.length < 10 || phone.length > 15) {
      $("#formMessage").textContent = "Enter a valid phone number with country code if possible.";
      return;
    }
    const category = String(data.get("category"));
    const emojis = {Eggs:"🥚",Layers:"🐔",Broilers:"🍗",Chicks:"🐣",Feed:"🌾",Equipment:"🧰"};
    const art = {Eggs:"eggs",Layers:"layers",Broilers:"broilers",Chicks:"chicks",Feed:"feed",Equipment:"equipment"};
    const listing = {
      id:"user-" + Date.now() + "-" + Math.random().toString(36).slice(2,7),
      title:String(data.get("title")).trim(),category,price:Number(data.get("price")),
      quantity:String(data.get("quantity")).trim(),unit:String(data.get("unit")).trim(),
      state:String(data.get("state")),town:String(data.get("town")).trim(),
      seller:String(data.get("seller")).trim(),phone,
      description:String(data.get("description") || "").trim(),
      emoji:emojis[category] || "🐔",art:art[category] || "equipment",tag:"YOUR LISTING",created:Date.now()
    };
    state.userListings.unshift(listing);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.userListings));
    } catch (error) {
      state.userListings.shift();
      $("#formMessage").textContent = "This browser could not save the listing. Check available storage and try again.";
      return;
    }
    state.query = "";
    state.category = "";
    state.location = "";
    $("#searchInput").value = "";
    $("#categoryFilter").value = "";
    $("#locationFilter").value = "";
    renderListings();
    closeDialog($("#listingDialog"));
    showToast("Preview listing saved on this device only.");
    $("#marketplace").scrollIntoView({behavior:"smooth",block:"start"});
  });

  state.userListings = safeReadListings();
  $("#year").textContent = new Date().getFullYear();
  renderListings();
})();