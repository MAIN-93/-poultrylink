/* =========================================================
   POULTRYLINK — NIGERIA'S POULTRY MARKETPLACE
   File: app.js
   Part 1: Application setup and marketplace
   ========================================================= */

/*
  DEMO MODE:
  This version works locally with sample products.

  To connect Firebase, configure your Firebase project in
  the Firebase section in a later chunk.

  Sample products are demonstration data, not live offers.
*/

const DEMO_MODE = true;

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

const formatNaira = amount =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);

const getStoredArray = key => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const setStoredArray = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save ${key}:`, error);
    showToast("Your browser could not save this information.", "error");
  }
};

/* ---------------------------------------------------------
   APPLICATION STATE
   --------------------------------------------------------- */

const state = {
  products: [],
  sellers: [],
  category: "all",
  search: "",
  sort: "featured",
  savedIds: getStoredArray("poultrylink_saved"),
  cart: getStoredArray("poultrylink_cart"),
  currentUser: null,
  currentProduct: null,
  dashboardTab: "overview"
};

/* ---------------------------------------------------------
   SAMPLE MARKETPLACE PRODUCTS
   --------------------------------------------------------- */

/*
  These are sample listings for demonstration only.
  They are not verified offers from real Nigerian sellers.
*/

const sampleProducts = [
  {
    id: "demo-eggs-001",
    title: "Fresh Table Eggs",
    category: "Eggs",
    description:
      "Farm-fresh table eggs. Confirm the tray size, quantity, freshness, and collection arrangements with the seller.",
    price: 6500,
    unit: "per crate",
    stock: 80,
    location: "Ibadan, Oyo State",
    sellerId: "demo-seller-001",
    sellerName: "GreenField Poultry",
    image: "",
    status: "active",
    featured: true,
    createdAt: "2026-10-20T09:00:00.000Z"
  },
  {
    id: "demo-broiler-001",
    title: "Day-Old Broiler Chicks",
    category: "Broilers",
    description:
      "Sample listing for day-old broiler chicks. Confirm breed, hatch date, vaccination records, and minimum order before purchasing.",
    price: 1200,
    unit: "per chick",
    stock: 300,
    location: "Abeokuta, Ogun State",
    sellerId: "demo-seller-002",
    sellerName: "Sunrise Poultry Farm",
    image: "",
    status: "active",
    featured: true,
    createdAt: "2026-10-19T09:00:00.000Z"
  },
  {
    id: "demo-feed-001",
    title: "Broiler Starter Feed",
    category: "Poultry Feed",
    description:
      "Sample poultry feed listing. Confirm the manufacturer, bag weight, expiry date, and feed specifications with the seller.",
    price: 24000,
    unit: "per bag",
    stock: 35,
    location: "Port Harcourt, Rivers State",
    sellerId: "demo-seller-003",
    sellerName: "FarmSupply Hub",
    image: "",
    status: "active",
    featured: true,
    createdAt: "2026-10-18T09:00:00.000Z"
  },
  {
    id: "demo-layers-001",
    title: "Point-of-Lay Pullets",
    category: "Layers",
    description:
      "Sample listing for point-of-lay pullets. Ask the seller about age, vaccination, breed, and current laying status.",
    price: 10500,
    unit: "per bird",
    stock: 100,
    location: "Enugu, Enugu State",
    sellerId: "demo-seller-004",
    sellerName: "Golden Nest Farms",
    image: "",
    status: "active",
    featured: true,
    createdAt: "2026-10-17T09:00:00.000Z"
  },
  {
    id: "demo-equipment-001",
    title: "Poultry Feeding Trough",
    category: "Equipment",
    description:
      "Sample listing for poultry feeding equipment. Confirm dimensions, material, capacity, and delivery cost before ordering.",
    price: 8500,
    unit: "per piece",
    stock: 25,
    location: "Lagos, Lagos State",
    sellerId: "demo-seller-005",
    sellerName: "AgroChoice Supplies",
    image: "",
    status: "active",
    featured: false,
    createdAt: "2026-10-16T09:00:00.000Z"
  },
  {
    id: "demo-eggs-002",
    title: "Premium Brown Eggs",
    category: "Eggs",
    description:
      "Sample listing for brown table eggs. Confirm the quantity per crate, freshness, and collection arrangements.",
    price: 7500,
    unit: "per crate",
    stock: 45,
    location: "Benin City, Edo State",
    sellerId: "demo-seller-001",
    sellerName: "GreenField Poultry",
    image: "",
    status: "active",
    featured: false,
    createdAt: "2026-10-15T09:00:00.000Z"
  },
  {
    id: "demo-broiler-002",
    title: "Live Broiler Chickens",
    category: "Broilers",
    description:
      "Sample listing for live broilers. Confirm weight, age, quantity, collection arrangements, and current availability.",
    price: 9500,
    unit: "per bird",
    stock: 60,
    location: "Kaduna, Kaduna State",
    sellerId: "demo-seller-002",
    sellerName: "Sunrise Poultry Farm",
    image: "",
    status: "active",
    featured: false,
    createdAt: "2026-10-14T09:00:00.000Z"
  },
  {
    id: "demo-feed-002",
    title: "Layer Mash Feed",
    category: "Poultry Feed",
    description:
      "Sample listing for layer feed. Verify the bag weight, formulation, manufacturer, and expiry date before ordering.",
    price: 22000,
    unit: "per bag",
    stock: 40,
    location: "Ilorin, Kwara State",
    sellerId: "demo-seller-003",
    sellerName: "FarmSupply Hub",
    image: "",
    status: "active",
    featured: false,
    createdAt: "2026-10-13T09:00:00.000Z"
  }
];

/* ---------------------------------------------------------
   SAMPLE SELLERS
   --------------------------------------------------------- */

/*
  Demo sellers are fictional.
  No sample seller is represented as identity-verified.
*/

const sampleSellers = [
  {
    id: "demo-seller-001",
    name: "GreenField Poultry",
    location: "Ibadan, Oyo State",
    description:
      "Demonstration storefront for poultry and table egg listings.",
    verificationStatus: "unverified"
  },
  {
    id: "demo-seller-002",
    name: "Sunrise Poultry Farm",
    location: "Abeokuta, Ogun State",
    description:
      "Demonstration storefront for broilers and poultry birds.",
    verificationStatus: "unverified"
  },
  {
    id: "demo-seller-003",
    name: "FarmSupply Hub",
    location: "Port Harcourt, Rivers State",
    description:
      "Demonstration storefront for feed and farm supplies.",
    verificationStatus: "unverified"
  },
  {
    id: "demo-seller-004",
    name: "Golden Nest Farms",
    location: "Enugu, Enugu State",
    description:
      "Demonstration storefront for layers and point-of-lay birds.",
    verificationStatus: "unverified"
  },
  {
    id: "demo-seller-005",
    name: "AgroChoice Supplies",
    location: "Lagos, Lagos State",
    description:
      "Demonstration storefront for poultry equipment and accessories.",
    verificationStatus: "unverified"
  }
];

/* ---------------------------------------------------------
   NOTIFICATIONS
   --------------------------------------------------------- */

function showToast(message, type = "success") {
  const region = $("#toastRegion");

  if (!region) {
    console.log(message);
    return;
  }

  const toast = document.createElement("div");

  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;

  region.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

/* ---------------------------------------------------------
   PRODUCT IMAGE AND CATEGORY HELPERS
   --------------------------------------------------------- */

function categoryEmoji(category) {
  const emojis = {
    Eggs: "🥚",
    Layers: "🐔",
    Broilers: "🐓",
    "Poultry Feed": "🌾",
    Equipment: "🧺",
    Other: "📦"
  };

  return emojis[category] || "🐔";
}

function productImageMarkup(product) {
  const imageURL = String(product.image || "").trim();

  /*
    Only render remote image URLs.
    Do not allow javascript: or data: URLs here.
  */

  if (/^https?:\/\//i.test(imageURL)) {
    return `
      <img
        class="product-image"
        src="${escapeHTML(imageURL)}"
        alt="${escapeHTML(product.title)}"
        loading="lazy"
        onerror="
          this.style.display='none';
          this.nextElementSibling.style.display='grid';
        "
      >
      <div class="product-placeholder" style="display:none">
        ${categoryEmoji(product.category)}
      </div>
    `;
  }

  return `
    <div class="product-placeholder">
      ${categoryEmoji(product.category)}
    </div>
  `;
}

/* ---------------------------------------------------------
   MARKETPLACE FILTERING AND SORTING
   --------------------------------------------------------- */

function getVisibleProducts() {
  let products = state.products.filter(product =>
    product.status === "active"
  );

  if (state.category !== "all") {
    products = products.filter(product =>
      String(product.category).toLowerCase() ===
      state.category.toLowerCase()
    );
  }

  const query = state.search.trim().toLowerCase();

  if (query) {
    products = products.filter(product => {
      const searchableText = [
        product.title,
        product.category,
        product.description,
        product.location,
        product.sellerName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }

  switch (state.sort) {
    case "price-asc":
      products.sort((a, b) => Number(a.price) - Number(b.price));
      break;

    case "price-desc":
      products.sort((a, b) => Number(b.price) - Number(a.price));
      break;

    case "newest":
      products.sort((a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
      break;

    default:
      products.sort((a, b) =>
        Number(Boolean(b.featured)) -
        Number(Boolean(a.featured))
      );
  }

  return products;
}

/* ---------------------------------------------------------
   RENDER PRODUCT CARDS
   --------------------------------------------------------- */

function renderProducts() {
  const grid = $("#productGrid");
  const resultCount = $("#resultCount");

  if (!grid) return;

  const products = getVisibleProducts();

  if (resultCount) {
    resultCount.textContent =
      `${products.length} product${products.length === 1 ? "" : "s"}`;
  }

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>No products found</strong>
        <p>Try another search term or select a different category.</p>
        <button
          class="button button-outline"
          type="button"
          data-action="clear-filters">
          Clear filters
        </button>
      </div>
    `;

    return;
  }

  grid.innerHTML = products.map(product => {
    const isSaved = state.savedIds.includes(product.id);

    const stock = Math.max(0, Number(product.stock) || 0);

    return `
      <article class="product-card">

        <div class="product-image-wrap">

          ${productImageMarkup(product)}

          <span class="product-badge">
            ${escapeHTML(product.category)}
          </span>

          <button
            class="save-button ${isSaved ? "saved" : ""}"
            type="button"
            data-action="toggle-saved"
            data-id="${escapeHTML(product.id)}"
            aria-label="${isSaved ? "Remove from" : "Add to"} saved products"
            aria-pressed="${isSaved}">
            ${isSaved ? "♥" : "♡"}
          </button>

        </div>

        <div class="product-info">

          <span class="product-category">
            ${escapeHTML(product.category)}
          </span>

          <h3 class="product-title">
            ${escapeHTML(product.title)}
          </h3>

          <p class="product-desc">
            ${escapeHTML(product.description || "")}
          </p>

          <div class="product-meta">

            <div>
              <div class="product-price">
                ${formatNaira(product.price)}
              </div>

              <div class="product-unit">
                ${escapeHTML(product.unit || "per item")}
              </div>
            </div>

            <div class="product-stock">
              ${stock > 0 ? `${stock} available` : "Out of stock"}
            </div>

          </div>

          <div class="seller-mini">

            <span class="seller-mini-avatar">🏡</span>

            <span>
              ${escapeHTML(product.sellerName || "Marketplace seller")}
              <br>
              ${escapeHTML(product.location || "Location not provided")}
            </span>

          </div>

          <div class="product-actions">

            <button
              class="button button-outline"
              type="button"
              data-action="view-product"
              data-id="${escapeHTML(product.id)}">
              Details
            </button>

            <button
              class="button button-primary"
              type="button"
              data-action="add-to-cart"
              data-id="${escapeHTML(product.id)}"
              ${stock <= 0 ? "disabled" : ""}>
              Add to cart
            </button>

          </div>

        </div>
      </article>
    `;
  }).join("");
}

/* ---------------------------------------------------------
   SEARCH, CATEGORY FILTERS, AND SORTING
   --------------------------------------------------------- */

function setCategory(category) {
  state.category = category || "all";

  $$(".chip").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === state.category
    );
  });

  const categorySelect = $("#categorySearch");

  if (categorySelect) {
    categorySelect.value = state.category;
  }

  renderProducts();

  $("#marketplace")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function initializeMarketplaceControls() {
  $("#searchForm")?.addEventListener("submit", event => {
    event.preventDefault();

    state.search = $("#searchInput")?.value.trim() || "";

    const categoryValue = $("#categorySearch")?.value || "all";

    state.category = categoryValue;

    $$(".chip").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === state.category
      );
    });

    renderProducts();

    $("#marketplace")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  $("#categorySearch")?.addEventListener("change", event => {
    setCategory(event.target.value);
  });

  $("#sortSelect")?.addEventListener("change", event => {
    state.sort = event.target.value;
    renderProducts();
  });

  $$(".chip").forEach(button => {
    button.addEventListener("click", () => {
      setCategory(button.dataset.category);
    });
  });

  $$(".category-card").forEach(button => {
    button.addEventListener("click", () => {
      setCategory(button.dataset.category);
    });
  });

  $("#showAllBtn")?.addEventListener("click", () => {
    state.search = "";
    state.category = "all";
    state.sort = "featured";

    if ($("#searchInput")) $("#searchInput").value = "";
    if ($("#categorySearch")) $("#categorySearch").value = "all";
    if ($("#sortSelect")) $("#sortSelect").value = "featured";

    $$(".chip").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === "all"
      );
    });

    renderProducts();

    showToast("Marketplace refreshed.");
  });

  $("#filterChips")?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    setCategory(button.dataset.category);
  });

  $("#productGrid")?.addEventListener("click", event => {
    const clearButton = event.target.closest(
      '[data-action="clear-filters"]'
    );

    if (!clearButton) return;

    state.search = "";
    state.category = "all";

    if ($("#searchInput")) $("#searchInput").value = "";
    if ($("#categorySearch")) $("#categorySearch").value = "all";

    renderProducts();
  });
}

/* ---------------------------------------------------------
   INITIALIZE DEMONSTRATION DATA
   --------------------------------------------------------- */

function initializeDemoData() {
  state.products = sampleProducts.map(product => ({ ...product }));
  state.sellers = sampleSellers.map(seller => ({ ...seller }));

  renderProducts();
}

/* ---------------------------------------------------------
   START PART 1
   --------------------------------------------------------- */

initializeMarketplaceControls();
initializeDemoData();


/* =========================================================
   POULTRYLINK — APP.JS
   CHUNK 2 OF 5
   PRODUCT DETAILS, SAVED PRODUCTS, CART & DEMO CHECKOUT
   ========================================================= */


/* ---------------------------------------------------------
   1. MODAL MANAGEMENT
   --------------------------------------------------------- */

function openModal(title, content, eyebrow = "POULTRYLINK") {
    const backdrop = document.getElementById("modalBackdrop");
    const modalTitle = document.getElementById("modalTitle");
    const modalEyebrow = document.getElementById("modalEyebrow");
    const modalBody = document.getElementById("modalBody");

    if (!backdrop || !modalTitle || !modalBody) {
        console.error("POULTRYLINK: Required modal elements are missing.");
        return;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    if (modalEyebrow) {
        modalEyebrow.textContent = eyebrow;
    }

    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const closeButton = document.getElementById("modalClose");

    if (closeButton) {
        closeButton.focus();
    }
}


function closeModal() {
    const backdrop = document.getElementById("modalBackdrop");

    if (!backdrop) return;

    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");
}


function initializeModalControls() {
    const backdrop = document.getElementById("modalBackdrop");
    const closeButton = document.getElementById("modalClose");

    if (closeButton) {
        closeButton.addEventListener("click", closeModal);
    }

    if (backdrop) {
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) {
                closeModal();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}


/* ---------------------------------------------------------
   2. PRODUCT LOOKUP
   --------------------------------------------------------- */

function getProductById(productId) {
    if (!productId) return null;

    return state.products.find(
        (product) => String(product.id) === String(productId)
    ) || null;
}


function getSellerById(sellerId) {
    if (!sellerId) return null;

    return state.sellers.find(
        (seller) => String(seller.id) === String(sellerId)
    ) || null;
}


function getProductSeller(product) {
    if (!product) return null;

    return (
        getSellerById(product.sellerId) ||
        state.sellers.find(
            (seller) => seller.name === product.seller
        ) ||
        null
    );
}


function getProductImage(product) {
    if (!product) return "";

    return product.image || "";
}


function getProductStock(product) {
    if (!product) return 0;

    const stock = Number(product.stock);

    return Number.isFinite(stock) && stock > 0
        ? Math.floor(stock)
        : 0;
}


function isProductAvailable(product) {
    return Boolean(product) && getProductStock(product) > 0;
}


/* ---------------------------------------------------------
   3. SAVED PRODUCTS
   --------------------------------------------------------- */

function getSavedProductIds() {
    if (!Array.isArray(state.savedIds)) {
        state.savedIds = [];
    }

    return state.savedIds.map(String);
}


function isProductSaved(productId) {
    return getSavedProductIds().includes(String(productId));
}


function persistSavedProducts() {
    try {
        localStorage.setItem(
            "poultrylink_saved",
            JSON.stringify(getSavedProductIds())
        );
    } catch (error) {
        console.error("Unable to save favourites:", error);
    }
}


function toggleSavedProduct(productId) {
    const product = getProductById(productId);

    if (!product) {
        showToast("This product could not be found.", "error");
        return;
    }

    const savedIds = getSavedProductIds();
    const id = String(product.id);
    const alreadySaved = savedIds.includes(id);

    if (alreadySaved) {
        state.savedIds = savedIds.filter(
            (savedId) => savedId !== id
        );

        showToast("Product removed from your saved list.");
    } else {
        state.savedIds = [...savedIds, id];

        showToast("Product saved successfully.");
    }

    persistSavedProducts();
    renderProducts();
    updateSavedCount();

    const modalBody = document.getElementById("modalBody");

    if (
        modalBody &&
        !document.getElementById("modalBackdrop")?.hidden &&
        modalBody.querySelector("[data-saved-products-list]")
    ) {
        openSavedProducts();
    }
}


function updateSavedCount() {
    const savedCount = document.getElementById("savedCount");

    if (savedCount) {
        savedCount.textContent = String(
            getSavedProductIds().length
        );
    }

    const savedButtons = document.querySelectorAll(
        "[data-open-saved]"
    );

    savedButtons.forEach((button) => {
        button.setAttribute(
            "aria-label",
            `Open saved products (${getSavedProductIds().length})`
        );
    });
}


function createSavedProductCard(product) {
    const saved = isProductSaved(product.id);

    return `
        <article class="saved-product-row">
            <div class="saved-product-image">
                ${productImageMarkup(product)}
            </div>

            <div class="saved-product-info">
                <h4>${escapeHTML(product.name)}</h4>

                <p class="saved-product-price">
                    ${formatNaira(Number(product.price) || 0)}
                </p>

                <p class="muted-text">
                    ${escapeHTML(product.location || "Nigeria")}
                </p>

                <div class="saved-product-actions">
                    <button
                        type="button"
                        class="btn btn-primary btn-small"
                        data-action="view-product"
                        data-product-id="${escapeHTML(String(product.id))}"
                    >
                        View product
                    </button>

                    <button
                        type="button"
                        class="btn btn-outline btn-small"
                        data-action="remove-saved"
                        data-product-id="${escapeHTML(String(product.id))}"
                        aria-pressed="${saved ? "true" : "false"}"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </article>
    `;
}


function openSavedProducts() {
    const savedIds = getSavedProductIds();

    const products = savedIds
        .map((id) => getProductById(id))
        .filter(Boolean);

    if (products.length === 0) {
        openModal(
            "Saved products",
            `
                <div class="empty-state">
                    <div class="empty-state-icon" aria-hidden="true">
                        ♡
                    </div>

                    <h3>No saved products yet</h3>

                    <p>
                        Save poultry products you want to revisit.
                        They will appear here on this browser.
                    </p>

                    <button
                        type="button"
                        class="btn btn-primary"
                        data-action="close-and-browse"
                    >
                        Browse products
                    </button>
                </div>
            `,
            "YOUR FAVOURITES"
        );

        return;
    }

    openModal(
        "Saved products",
        `
            <div data-saved-products-list>
                <p class="muted-text">
                    ${products.length}
                    saved product${products.length === 1 ? "" : "s"}
                </p>

                <div class="saved-products-list">
                    ${products.map(createSavedProductCard).join("")}
                </div>
            </div>
        `,
        "YOUR FAVOURITES"
    );
}


/* ---------------------------------------------------------
   4. PRODUCT DETAILS MODAL
   --------------------------------------------------------- */

function renderProductDetails(product) {
    const seller = getProductSeller(product);
    const stock = getProductStock(product);
    const available = isProductAvailable(product);
    const saved = isProductSaved(product.id);

    const sellerName = seller?.name || product.seller || "Poultry seller";
    const sellerLocation =
        seller?.location || product.location || "Nigeria";

    const image = getProductImage(product);

    return `
        <div class="product-details">
            <div class="product-details-image">
                ${
                    image
                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(product.name)}"
                                loading="lazy"
                            >
                        `
                        : `
                            <div class="product-image-placeholder">
                                ${categoryEmoji(product.category)}
                            </div>
                        `
                }
            </div>

            <div class="product-details-content">
                <span class="product-category-label">
                    ${escapeHTML(product.category || "Poultry")}
                </span>

                <h3>${escapeHTML(product.name)}</h3>

                <p class="product-details-price">
                    ${formatNaira(Number(product.price) || 0)}
                    <span>
                        ${escapeHTML(product.unit || "per unit")}
                    </span>
                </p>

                <p class="product-details-description">
                    ${escapeHTML(
                        product.description ||
                        "Contact the seller for more information about this product."
                    )}
                </p>

                <div class="product-details-meta">
                    <div>
                        <span class="meta-label">Seller</span>
                        <strong>${escapeHTML(sellerName)}</strong>
                    </div>

                    <div>
                        <span class="meta-label">Location</span>
                        <strong>${escapeHTML(sellerLocation)}</strong>
                    </div>

                    <div>
                        <span class="meta-label">Availability</span>
                        <strong>
                            ${
                                available
                                    ? `${stock} available`
                                    : "Currently unavailable"
                            }
                        </strong>
                    </div>
                </div>

                <div class="product-details-actions">
                    <button
                        type="button"
                        class="btn btn-primary"
                        data-action="add-to-cart"
                        data-product-id="${escapeHTML(String(product.id))}"
                        ${available ? "" : "disabled"}
                    >
                        ${available ? "Add to cart" : "Out of stock"}
                    </button>

                    <button
                        type="button"
                        class="btn btn-outline"
                        data-action="toggle-saved"
                        data-product-id="${escapeHTML(String(product.id))}"
                        aria-pressed="${saved ? "true" : "false"}"
                    >
                        ${saved ? "♥ Saved" : "♡ Save product"}
                    </button>
                </div>

                <p class="safety-note">
                    Confirm product availability, delivery arrangements,
                    and seller details before making payment.
                </p>
            </div>
        </div>
    `;
}


function openProductDetails(productId) {
    const product = getProductById(productId);

    if (!product) {
        showToast("Product not found.", "error");
        return;
    }

    state.currentProduct = product.id;

    openModal(
        "Product details",
        renderProductDetails(product),
        "MARKETPLACE"
    );
}


/* ---------------------------------------------------------
   5. CART STORAGE AND QUANTITY MANAGEMENT
   --------------------------------------------------------- */

function getCartItems() {
    if (!Array.isArray(state.cart)) {
        state.cart = [];
    }

    return state.cart;
}


function persistCart() {
    try {
        localStorage.setItem(
            "poultrylink_cart",
            JSON.stringify(getCartItems())
        );
    } catch (error) {
        console.error("Unable to save cart:", error);
    }
}


function getCartQuantity(productId) {
    const item = getCartItems().find(
        (cartItem) =>
            String(cartItem.productId) === String(productId)
    );

    return item ? Number(item.quantity) || 0 : 0;
}


function getCartCount() {
    return getCartItems().reduce(
        (total, item) => total + Math.max(0, Number(item.quantity) || 0),
        0
    );
}


function updateCartCount() {
    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.textContent = String(getCartCount());
    }

    document.querySelectorAll("[data-cart-count]").forEach((element) => {
        element.textContent = String(getCartCount());
    });
}


function addToCart(productId, quantity = 1) {
    const product = getProductById(productId);
    const amount = Math.floor(Number(quantity));

    if (!product) {
        showToast("This product could not be found.", "error");
        return false;
    }

    if (!Number.isFinite(amount) || amount < 1) {
        showToast("Enter a valid quantity.", "error");
        return false;
    }

    if (!isProductAvailable(product)) {
        showToast("This product is currently unavailable.", "error");
        return false;
    }

    const existingQuantity = getCartQuantity(product.id);
    const requestedQuantity = existingQuantity + amount;
    const stock = getProductStock(product);

    if (requestedQuantity > stock) {
        showToast(
            `Only ${stock} unit(s) are currently available.`,
            "error"
        );

        return false;
    }

    const cart = getCartItems();
    const existingItem = cart.find(
        (item) => String(item.productId) === String(product.id)
    );

    if (existingItem) {
        existingItem.quantity = requestedQuantity;
    } else {
        cart.push({
            productId: product.id,
            quantity: amount
        });
    }

    state.cart = cart;

    persistCart();
    updateCartCount();

    showToast(`${product.name} added to your cart.`);

    return true;
}


function updateCartItemQuantity(productId, quantity) {
    const product = getProductById(productId);
    const requestedQuantity = Math.floor(Number(quantity));

    if (!product) {
        removeCartItem(productId);
        return;
    }

    if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
        removeCartItem(productId);
        return;
    }

    const stock = getProductStock(product);

    if (requestedQuantity > stock) {
        showToast(
            `Only ${stock} unit(s) are available.`,
            "error"
        );

        return;
    }

    const cartItem = getCartItems().find(
        (item) => String(item.productId) === String(productId)
    );

    if (!cartItem) return;

    cartItem.quantity = requestedQuantity;

    persistCart();
    updateCartCount();
    openCart();
}


function removeCartItem(productId) {
    state.cart = getCartItems().filter(
        (item) => String(item.productId) !== String(productId)
    );

    persistCart();
    updateCartCount();

    const backdrop = document.getElementById("modalBackdrop");

    if (backdrop && !backdrop.hidden) {
        openCart();
    }

    showToast("Item removed from cart.");
}


function clearCart() {
    state.cart = [];

    persistCart();
    updateCartCount();
}


/* ---------------------------------------------------------
   6. CART TOTALS
   --------------------------------------------------------- */

function getCartDetails() {
    return getCartItems()
        .map((item) => {
            const product = getProductById(item.productId);

            if (!product) return null;

            const quantity = Math.max(
                1,
                Math.floor(Number(item.quantity) || 1)
            );

            const price = Math.max(
                0,
                Number(product.price) || 0
            );

            return {
                product,
                productId: product.id,
                quantity,
                price,
                subtotal: price * quantity
            };
        })
        .filter(Boolean);
}


function getCartSubtotal() {
    return getCartDetails().reduce(
        (total, item) => total + item.subtotal,
        0
    );
}


/* ---------------------------------------------------------
   7. CART MODAL
   --------------------------------------------------------- */

function renderCartItem(item) {
    const product = item.product;

    return `
        <article class="cart-item">
            <div class="cart-item-image">
                ${productImageMarkup(product)}
            </div>

            <div class="cart-item-info">
                <h4>${escapeHTML(product.name)}</h4>

                <p>
                    ${formatNaira(item.price)}
                    × ${item.quantity}
                </p>

                <strong>
                    ${formatNaira(item.subtotal)}
                </strong>

                <div class="cart-item-controls">
                    <button
                        type="button"
                        class="quantity-button"
                        data-action="cart-decrease"
                        data-product-id="${escapeHTML(String(product.id))}"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>

                    <span class="quantity-value">
                        ${item.quantity}
                    </span>

                    <button
                        type="button"
                        class="quantity-button"
                        data-action="cart-increase"
                        data-product-id="${escapeHTML(String(product.id))}"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>

                    <button
                        type="button"
                        class="btn-text-danger"
                        data-action="remove-cart-item"
                        data-product-id="${escapeHTML(String(product.id))}"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </article>
    `;
}


function openCart() {
    const items = getCartDetails();

    if (items.length === 0) {
        openModal(
            "Your shopping cart",
            `
                <div class="empty-state">
                    <div class="empty-state-icon" aria-hidden="true">
                        🛒
                    </div>

                    <h3>Your cart is empty</h3>

                    <p>
                        Browse the marketplace and add poultry products
                        you would like to order.
                    </p>

                    <button
                        type="button"
                        class="btn btn-primary"
                        data-action="close-and-browse"
                    >
                        Browse marketplace
                    </button>
                </div>
            `,
            "YOUR CART"
        );

        return;
    }

    const subtotal = getCartSubtotal();

    openModal(
        "Your shopping cart",
        `
            <div class="cart-items-list">
                ${items.map(renderCartItem).join("")}
            </div>

            <div class="cart-summary">
                <div class="cart-summary-row">
                    <span>Items</span>
                    <strong>${getCartCount()}</strong>
                </div>

                <div class="cart-summary-row">
                    <span>Subtotal</span>
                    <strong>${formatNaira(subtotal)}</strong>
                </div>

                <p class="muted-text">
                    Delivery charges, if applicable, are not included.
                    Confirm the final amount with the seller.
                </p>

                <div class="cart-summary-actions">
                    <button
                        type="button"
                        class="btn btn-outline"
                        data-action="clear-cart"
                    >
                        Clear cart
                    </button>

                    <button
                        type="button"
                        class="btn btn-primary"
                        data-action="start-checkout"
                    >
                        Continue to checkout
                    </button>
                </div>
            </div>
        `,
        "YOUR CART"
    );
}


/* ---------------------------------------------------------
   8. DEMO CHECKOUT FORM
   --------------------------------------------------------- */

function openCheckout() {
    const items = getCartDetails();

    if (items.length === 0) {
        showToast("Your cart is empty.", "error");
        openCart();
        return;
    }

    const subtotal = getCartSubtotal();

    openModal(
        "Checkout",
        `
            <div class="checkout-summary">
                <h3>Order summary</h3>

                ${items.map((item) => `
                    <div class="checkout-summary-row">
                        <span>
                            ${escapeHTML(item.product.name)}
                            × ${item.quantity}
                        </span>

                        <strong>
                            ${formatNaira(item.subtotal)}
                        </strong>
                    </div>
                `).join("")}

                <div class="checkout-total">
                    <span>Subtotal</span>
                    <strong>${formatNaira(subtotal)}</strong>
                </div>
            </div>

            <form id="checkoutForm" class="form-stack">
                <div class="form-group">
                    <label for="checkoutName">
                        Full name
                    </label>

                    <input
                        id="checkoutName"
                        name="customerName"
                        type="text"
                        autocomplete="name"
                        maxlength="100"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="checkoutPhone">
                        Phone number
                    </label>

                    <input
                        id="checkoutPhone"
                        name="phone"
                        type="tel"
                        autocomplete="tel"
                        maxlength="25"
                        placeholder="e.g. 08012345678"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="checkoutEmail">
                        Email address (optional)
                    </label>

                    <input
                        id="checkoutEmail"
                        name="email"
                        type="email"
                        autocomplete="email"
                        maxlength="150"
                    >
                </div>

                <div class="form-group">
                    <label for="checkoutAddress">
                        Delivery address
                    </label>

                    <textarea
                        id="checkoutAddress"
                        name="deliveryAddress"
                        rows="3"
                        maxlength="500"
                        autocomplete="street-address"
                        required
                    ></textarea>
                </div>

                <div class="form-group">
                    <label for="checkoutNotes">
                        Additional instructions (optional)
                    </label>

                    <textarea
                        id="checkoutNotes"
                        name="notes"
                        rows="2"
                        maxlength="500"
                        placeholder="Preferred delivery time or other details"
                    ></textarea>
                </div>

                <div class="notice notice-warning">
                    <strong>Demo checkout:</strong>
                    This form records a demonstration order in this
                    browser only. It does not send your details to a
                    seller, charge a payment method, or arrange delivery.
                    Do not enter sensitive financial information.
                </div>

                <button
                    type="submit"
                    class="btn btn-primary btn-full"
                >
                    Save demo order
                </button>
            </form>
        `,
        "ORDER DETAILS"
    );
}


function saveDemoOrder(formData) {
    const items = getCartDetails();

    if (items.length === 0) {
        showToast("Your cart is empty.", "error");
        return;
    }

    const customerName = String(
        formData.get("customerName") || ""
    ).trim();

    const phone = String(
        formData.get("phone") || ""
    ).trim();

    const email = String(
        formData.get("email") || ""
    ).trim();

    const deliveryAddress = String(
        formData.get("deliveryAddress") || ""
    ).trim();

    const notes = String(
        formData.get("notes") || ""
    ).trim();

    if (
        !customerName ||
        !phone ||
        !deliveryAddress
    ) {
        showToast(
            "Please complete all required fields.",
            "error"
        );

        return;
    }

    const order = {
        id: `DEMO-${Date.now()}`,
        customerName,
        phone,
        email,
        deliveryAddress,
        notes,
        items: items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.subtotal,
            sellerId: item.product.sellerId || null
        })),
        subtotal: getCartSubtotal(),
        status: "Demo order — not submitted",
        createdAt: new Date().toISOString()
    };

    try {
        const existingOrders = JSON.parse(
            localStorage.getItem("poultrylink_demo_orders") || "[]"
        );

        if (!Array.isArray(existingOrders)) {
            throw new Error("Invalid demo order storage.");
        }

        existingOrders.push(order);

        localStorage.setItem(
            "poultrylink_demo_orders",
            JSON.stringify(existingOrders)
        );

        clearCart();

        openModal(
            "Demo order saved",
            `
                <div class="success-state">
                    <div class="success-state-icon" aria-hidden="true">
                        ✓
                    </div>

                    <h3>Your demo order has been saved</h3>

                    <p>
                        Reference:
                        <strong>${escapeHTML(order.id)}</strong>
                    </p>

                    <p>
                        Total:
                        <strong>${formatNaira(order.subtotal)}</strong>
                    </p>

                    <p>
                        This order exists only in this browser.
                        No seller has received it and no payment has
                        been processed.
                    </p>

                    <button
                        type="button"
                        class="btn btn-primary"
                        data-action="close-and-browse"
                    >
                        Return to marketplace
                    </button>
                </div>
            `,
            "DEMO CHECKOUT"
        );

        showToast("Demo order saved locally.");

    } catch (error) {
        console.error("Unable to save demo order:", error);

        showToast(
            "Unable to save the demo order in this browser.",
            "error"
        );
    }
}


/* ---------------------------------------------------------
   9. PRODUCT AND CART CLICK HANDLERS
   --------------------------------------------------------- */

function initializeProductActionHandlers() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const productId = button.dataset.productId;

        switch (action) {
            case "view-product":
                if (productId) {
                    openProductDetails(productId);
                }
                break;

            case "toggle-saved":
                if (productId) {
                    toggleSavedProduct(productId);

                    const product = getProductById(productId);

                    if (product) {
                        openProductDetails(product.id);
                    }
                }
                break;

            case "remove-saved":
                if (productId) {
                    state.savedIds = getSavedProductIds().filter(
                        (id) => id !== String(productId)
                    );

                    persistSavedProducts();
                    renderProducts();
                    updateSavedCount();
                    openSavedProducts();

                    showToast("Product removed from saved products.");
                }
                break;

            case "add-to-cart":
                if (productId) {
                    const added = addToCart(productId, 1);

                    if (added) {
                        openProductDetails(productId);
                    }
                }
                break;

            case "open-cart":
                openCart();
                break;

            case "open-saved":
                openSavedProducts();
                break;

            case "cart-increase": {
                if (!productId) break;

                const currentQuantity = getCartQuantity(productId);

                updateCartItemQuantity(
                    productId,
                    currentQuantity + 1
                );

                break;
            }

            case "cart-decrease": {
                if (!productId) break;

                const currentQuantity = getCartQuantity(productId);

                updateCartItemQuantity(
                    productId,
                    currentQuantity - 1
                );

                break;
            }

            case "remove-cart-item":
                if (productId) {
                    removeCartItem(productId);
                }
                break;

            case "clear-cart":
                clearCart();
                openCart();
                showToast("Your cart has been cleared.");
                break;

            case "start-checkout":
                openCheckout();
                break;

            case "close-and-browse":
                closeModal();

                document.getElementById("marketplace")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                break;

            default:
                break;
        }
    });
}


/* ---------------------------------------------------------
   10. CHECKOUT FORM SUBMISSION
   --------------------------------------------------------- */

function initializeCheckoutHandler() {
    document.addEventListener("submit", (event) => {
        if (event.target.id !== "checkoutForm") {
            return;
        }

        event.preventDefault();

        const form = event.target;

        if (!form.reportValidity()) {
            return;
        }

        const formData = new FormData(form);

        saveDemoOrder(formData);
    });
}


/* ---------------------------------------------------------
   11. LOAD SAVED CART AND FAVOURITES
   --------------------------------------------------------- */

function initializeShoppingStorage() {
    try {
        const savedProducts = JSON.parse(
            localStorage.getItem("poultrylink_saved") || "[]"
        );

        state.savedIds = Array.isArray(savedProducts)
            ? savedProducts.map(String)
            : [];
    } catch (error) {
        state.savedIds = [];

        console.error(
            "Unable to load saved products:",
            error
        );
    }

    try {
        const savedCart = JSON.parse(
            localStorage.getItem("poultrylink_cart") || "[]"
        );

        if (Array.isArray(savedCart)) {
            state.cart = savedCart
                .filter((item) => {
                    const product = getProductById(item.productId);
                    const quantity = Number(item.quantity);

                    return (
                        product &&
                        Number.isFinite(quantity) &&
                        quantity >= 1 &&
                        isProductAvailable(product)
                    );
                })
                .map((item) => {
                    const product = getProductById(item.productId);

                    return {
                        productId: product.id,
                        quantity: Math.min(
                            Math.floor(Number(item.quantity)),
                            getProductStock(product)
                        )
                    };
                })
                .filter((item) => item.quantity >= 1);
        } else {
            state.cart = [];
        }
    } catch (error) {
        state.cart = [];

        console.error(
            "Unable to load shopping cart:",
            error
        );
    }

    persistSavedProducts();
    persistCart();

    updateSavedCount();
    updateCartCount();
}


/* ---------------------------------------------------------
   12. START CHUNK 2 FEATURES
   --------------------------------------------------------- */

initializeModalControls();
initializeShoppingStorage();
initializeProductActionHandlers();
initializeCheckoutHandler();

/* END OF CHUNK 2 */

/* =========================================================
   POULTRYLINK — APP.JS
   CHUNK 3 OF 5
   DEMO ACCOUNTS, USER PROFILES & DASHBOARD NAVIGATION
   ========================================================= */


/* ---------------------------------------------------------
   1. ACCOUNT STORAGE
   --------------------------------------------------------- */

function getDemoUsers() {
    try {
        const users = JSON.parse(
            localStorage.getItem("poultrylink_demo_users") || "[]"
        );

        return Array.isArray(users) ? users : [];
    } catch (error) {
        console.error("Unable to read demo users:", error);
        return [];
    }
}


function saveDemoUsers(users) {
    try {
        localStorage.setItem(
            "poultrylink_demo_users",
            JSON.stringify(users)
        );

        return true;
    } catch (error) {
        console.error("Unable to save demo users:", error);
        return false;
    }
}


function getCurrentUser() {
    return state.currentUser || null;
}


function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}


function getUserById(userId) {
    if (!userId) return null;

    return getDemoUsers().find(
        (user) => String(user.id) === String(userId)
    ) || null;
}


function updateCurrentUser(user) {
    state.currentUser = user || null;

    try {
        if (user) {
            localStorage.setItem(
                "poultrylink_demo_session",
                JSON.stringify({
                    userId: user.id
                })
            );
        } else {
            localStorage.removeItem("poultrylink_demo_session");
        }
    } catch (error) {
        console.error("Unable to update demo session:", error);
    }

    updateAccountInterface();
}


/* ---------------------------------------------------------
   2. DEMO REGISTRATION
   --------------------------------------------------------- */

function openRegistrationModal() {
    openModal(
        "Create your account",
        `
            <form id="registrationForm" class="form-stack">
                <div class="notice notice-warning">
                    <strong>Demo mode:</strong>
                    Do not reuse a real password. This demonstration
                    stores account information in your browser and
                    does not provide secure authentication.
                </div>

                <div class="form-group">
                    <label for="registerName">Full name</label>

                    <input
                        id="registerName"
                        name="name"
                        type="text"
                        maxlength="100"
                        autocomplete="name"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="registerEmail">Email address</label>

                    <input
                        id="registerEmail"
                        name="email"
                        type="email"
                        maxlength="150"
                        autocomplete="email"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="registerPhone">Phone number</label>

                    <input
                        id="registerPhone"
                        name="phone"
                        type="tel"
                        maxlength="25"
                        autocomplete="tel"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="registerRole">Account type</label>

                    <select id="registerRole" name="role" required>
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="registerLocation">Location</label>

                    <input
                        id="registerLocation"
                        name="location"
                        type="text"
                        maxlength="120"
                        placeholder="e.g. Port Harcourt, Rivers State"
                        autocomplete="address-level2"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="registerPassword">Demo password</label>

                    <input
                        id="registerPassword"
                        name="password"
                        type="password"
                        minlength="8"
                        maxlength="128"
                        autocomplete="new-password"
                        required
                    >
                </div>

                <button
                    type="submit"
                    class="btn btn-primary btn-full"
                >
                    Create demo account
                </button>

                <p class="form-helper">
                    Already registered?
                    <button
                        type="button"
                        class="btn-link"
                        data-action="open-login"
                    >
                        Log in
                    </button>
                </p>
            </form>
        `,
        "JOIN POULTRYLINK"
    );
}


function registerDemoUser(formData) {
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(formData.get("email"));
    const phone = String(formData.get("phone") || "").trim();
    const role = String(formData.get("role") || "buyer");
    const location = String(formData.get("location") || "").trim();
    const password = String(formData.get("password") || "");

    if (!name || !email || !phone || !location) {
        showToast("Please complete all required fields.", "error");
        return;
    }

    if (!["buyer", "seller"].includes(role)) {
        showToast("Please select a valid account type.", "error");
        return;
    }

    if (password.length < 8) {
        showToast("The demo password must have at least 8 characters.", "error");
        return;
    }

    const users = getDemoUsers();

    if (users.some((user) => normalizeEmail(user.email) === email)) {
        showToast("An account with this email already exists.", "error");
        return;
    }

    /*
     * DEMO ONLY:
     * This intentionally does not save the password.
     * Registration creates a local demonstration profile.
     * Production authentication must be handled by a trusted
     * authentication provider.
     */

    const user = {
        id: `demo-user-${Date.now()}`,
        name,
        email,
        phone,
        role,
        location,
        bio: "",
        businessName: role === "seller" ? "" : null,
        businessDescription: role === "seller" ? "" : null,
        createdAt: new Date().toISOString(),
        accountType: "demo",
        verificationStatus: "not_verified"
    };

    users.push(user);

    if (!saveDemoUsers(users)) {
        showToast("Unable to create the demo account.", "error");
        return;
    }

    updateCurrentUser(user);

    closeModal();

    showToast("Demo account created successfully.");

    openDashboard("overview");
}


/* ---------------------------------------------------------
   3. DEMO LOGIN
   --------------------------------------------------------- */

function openLoginModal() {
    openModal(
        "Log in to POULTRYLINK",
        `
            <form id="loginForm" class="form-stack">
                <div class="notice notice-warning">
                    This is a browser-based demonstration.
                    It does not authenticate users securely.
                </div>

                <div class="form-group">
                    <label for="loginEmail">Email address</label>

                    <input
                        id="loginEmail"
                        name="email"
                        type="email"
                        maxlength="150"
                        autocomplete="email"
                        required
                    >
                </div>

                <p class="form-helper">
                    Enter the email address used to create your
                    demo account. No password is checked in this
                    demonstration.
                </p>

                <button
                    type="submit"
                    class="btn btn-primary btn-full"
                >
                    Continue to demo account
                </button>

                <p class="form-helper">
                    New to POULTRYLINK?

                    <button
                        type="button"
                        class="btn-link"
                        data-action="open-register"
                    >
                        Create an account
                    </button>
                </p>
            </form>
        `,
        "WELCOME BACK"
    );
}


function loginDemoUser(formData) {
    const email = normalizeEmail(formData.get("email"));

    if (!email) {
        showToast("Enter your email address.", "error");
        return;
    }

    const user = getDemoUsers().find(
        (item) => normalizeEmail(item.email) === email
    );

    if (!user) {
        showToast(
            "No demo account was found with that email. Create an account first.",
            "error"
        );

        return;
    }

    updateCurrentUser(user);

    closeModal();

    showToast(`Welcome back, ${user.name}.`);

    openDashboard("overview");
}


function logoutDemoUser() {
    updateCurrentUser(null);

    closeDashboard();

    showToast("You have logged out of the demo account.");

    updateAccountInterface();
}


/* ---------------------------------------------------------
   4. RESTORE DEMO SESSION
   --------------------------------------------------------- */

function restoreDemoSession() {
    try {
        const rawSession = localStorage.getItem(
            "poultrylink_demo_session"
        );

        if (!rawSession) {
            state.currentUser = null;
            updateAccountInterface();
            return;
        }

        const session = JSON.parse(rawSession);

        if (!session || !session.userId) {
            state.currentUser = null;
            updateAccountInterface();
            return;
        }

        const user = getUserById(session.userId);

        state.currentUser = user;

    } catch (error) {
        console.error("Unable to restore demo session:", error);
        state.currentUser = null;
    }

    updateAccountInterface();
}


/* ---------------------------------------------------------
   5. ACCOUNT INTERFACE
   --------------------------------------------------------- */

function updateAccountInterface() {
    const user = getCurrentUser();

    const loginButtons = document.querySelectorAll(
        "[data-open-login]"
    );

    const registerButtons = document.querySelectorAll(
        "[data-open-register]"
    );

    loginButtons.forEach((button) => {
        button.hidden = Boolean(user);
    });

    registerButtons.forEach((button) => {
        button.hidden = Boolean(user);
    });

    document.querySelectorAll("[data-user-name]").forEach((element) => {
        element.textContent = user ? user.name : "Guest";
    });

    document.querySelectorAll("[data-user-email]").forEach((element) => {
        element.textContent = user ? user.email : "";
    });

    document.querySelectorAll("[data-user-role]").forEach((element) => {
        element.textContent = user ? user.role : "";
    });

    document.querySelectorAll("[data-open-dashboard]").forEach((button) => {
        button.hidden = !user;
    });
}


/* ---------------------------------------------------------
   6. DASHBOARD DRAWER
   --------------------------------------------------------- */

function openDashboard(tab = "overview") {
    const user = getCurrentUser();

    if (!user) {
        openLoginModal();
        return;
    }

    const drawer = document.getElementById("dashboardDrawer");

    if (!drawer) {
        showToast("The dashboard element is missing.", "error");
        return;
    }

    state.dashboardTab = tab;

    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");

    document.body.classList.add("dashboard-open");

    renderDashboard();

    const closeButton = document.getElementById("dashboardClose");

    if (closeButton) {
        closeButton.focus();
    }
}


function closeDashboard() {
    const drawer = document.getElementById("dashboardDrawer");

    if (!drawer) return;

    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");

    document.body.classList.remove("dashboard-open");
}


function initializeDashboardControls() {
    const drawer = document.getElementById("dashboardDrawer");

    const closeButton = document.getElementById("dashboardClose");

    if (closeButton) {
        closeButton.addEventListener("click", closeDashboard);
    }

    if (drawer) {
        drawer.addEventListener("click", (event) => {
            if (event.target === drawer) {
                closeDashboard();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDashboard();
        }
    });
}


/* ---------------------------------------------------------
   7. DASHBOARD NAVIGATION
   --------------------------------------------------------- */

const dashboardTabs = [
    {
        id: "overview",
        label: "Overview",
        icon: "▦",
        roles: ["buyer", "seller"]
    },
    {
        id: "profile",
        label: "My profile",
        icon: "◉",
        roles: ["buyer", "seller"]
    },
    {
        id: "activity",
        label: "Recent activity",
        icon: "◷",
        roles: ["buyer", "seller"]
    },
    {
        id: "notifications",
        label: "Notifications",
        icon: "♧",
        roles: ["buyer", "seller"]
    },
    {
        id: "buyer-orders",
        label: "My orders",
        icon: "▤",
        roles: ["buyer"]
    },
    {
        id: "saved",
        label: "Saved products",
        icon: "♡",
        roles: ["buyer", "seller"]
    },
    {
        id: "storefront",
        label: "My storefront",
        icon: "⌂",
        roles: ["seller"]
    },
    {
        id: "listings",
        label: "My listings",
        icon: "▣",
        roles: ["seller"]
    },
    {
        id: "inventory",
        label: "Inventory",
        icon: "▥",
        roles: ["seller"]
    },
    {
        id: "seller-orders",
        label: "Customer orders",
        icon: "▧",
        roles: ["seller"]
    },
    {
        id: "messages",
        label: "Messages",
        icon: "✉",
        roles: ["buyer", "seller"]
    },
    {
        id: "settings",
        label: "Settings",
        icon: "⚙",
        roles: ["buyer", "seller"]
    }
];


function getDashboardTabsForUser(user) {
    return dashboardTabs.filter((tab) => {
        return tab.roles.includes(user.role);
    });
}


function renderDashboardNavigation() {
    const user = getCurrentUser();

    const navigation = document.getElementById("dashboardNav");

    if (!navigation || !user) return;

    const tabs = getDashboardTabsForUser(user);

    navigation.innerHTML = tabs.map((tab) => `
        <button
            type="button"
            class="dashboard-nav-item ${
                state.dashboardTab === tab.id ? "active" : ""
            }"
            data-dashboard-tab="${escapeHTML(tab.id)}"
            aria-current="${
                state.dashboardTab === tab.id ? "page" : "false"
            }"
        >
            <span class="dashboard-nav-icon" aria-hidden="true">
                ${tab.icon}
            </span>

            <span>${escapeHTML(tab.label)}</span>
        </button>
    `).join("");
}


/* ---------------------------------------------------------
   8. DASHBOARD OVERVIEW
   --------------------------------------------------------- */

function renderDashboardOverview() {
    const user = getCurrentUser();

    if (!user) return "";

    const isSeller = user.role === "seller";

    const savedCount = getSavedProductIds().length;
    const cartCount = getCartCount();

    return `
        <section class="dashboard-panel">
            <div class="dashboard-welcome">
                <p class="eyebrow">YOUR POULTRYLINK ACCOUNT</p>

                <h2>
                    Welcome, ${escapeHTML(user.name)}
                </h2>

                <p>
                    ${
                        isSeller
                            ? "Manage your seller profile and prepare your marketplace listings."
                            : "Explore poultry products and keep track of your saved items."
                    }
                </p>
            </div>

            <div class="dashboard-stat-grid">
                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Account type
                    </span>

                    <strong>
                        ${isSeller ? "Seller" : "Buyer"}
                    </strong>
                </article>

                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Saved products
                    </span>

                    <strong>${savedCount}</strong>
                </article>

                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Cart items
                    </span>

                    <strong>${cartCount}</strong>
                </article>
            </div>

            <div class="dashboard-content-card">
                <h3>Quick actions</h3>

                <div class="dashboard-quick-actions">
                    <button
                        type="button"
                        class="btn btn-primary"
                        data-dashboard-tab="profile"
                    >
                        Edit profile
                    </button>

                    <button
                        type="button"
                        class="btn btn-outline"
                        data-dashboard-tab="saved"
                    >
                        Saved products
                    </button>

                    ${
                        isSeller
                            ? `
                                <button
                                    type="button"
                                    class="btn btn-outline"
                                    data-dashboard-tab="storefront"
                                >
                                    Manage storefront
                                </button>
                            `
                            : `
                                <button
                                    type="button"
                                    class="btn btn-outline"
                                    data-action="open-cart"
                                >
                                    View cart
                                </button>
                            `
                    }
                </div>
            </div>

            <div class="notice notice-warning">
                <strong>Demo account:</strong>
                Profile information is stored in this browser.
                It is not yet connected to a secure online account.
            </div>
        </section>
    `;
}


/* ---------------------------------------------------------
   9. PROFILE FORM
   --------------------------------------------------------- */

function renderProfilePanel() {
    const user = getCurrentUser();

    if (!user) return "";

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>My profile</h2>

                <p>
                    Update your contact details and account information.
                </p>
            </div>

            <form id="profileForm" class="form-stack">
                <div class="form-group">
                    <label for="profileName">Full name</label>

                    <input
                        id="profileName"
                        name="name"
                        type="text"
                        maxlength="100"
                        value="${escapeHTML(user.name || "")}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="profileEmail">Email address</label>

                    <input
                        id="profileEmail"
                        type="email"
                        value="${escapeHTML(user.email || "")}"
                        disabled
                    >

                    <p class="form-helper">
                        Email changes are disabled in this demo.
                    </p>
                </div>

                <div class="form-group">
                    <label for="profilePhone">Phone number</label>

                    <input
                        id="profilePhone"
                        name="phone"
                        type="tel"
                        maxlength="25"
                        value="${escapeHTML(user.phone || "")}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="profileLocation">Location</label>

                    <input
                        id="profileLocation"
                        name="location"
                        type="text"
                        maxlength="120"
                        value="${escapeHTML(user.location || "")}"
                        required
                    >
                </div>

                ${
                    user.role === "seller"
                        ? `
                            <div class="form-group">
                                <label for="profileBusinessName">
                                    Business name
                                </label>

                                <input
                                    id="profileBusinessName"
                                    name="businessName"
                                    type="text"
                                    maxlength="150"
                                    value="${escapeHTML(user.businessName || "")}"
                                >
                            </div>

                            <div class="form-group">
                                <label for="profileBusinessDescription">
                                    Business description
                                </label>

                                <textarea
                                    id="profileBusinessDescription"
                                    name="businessDescription"
                                    rows="4"
                                    maxlength="1000"
                                >${escapeHTML(user.businessDescription || "")}</textarea>
                            </div>
                        `
                        : ""
                }

                <div class="form-group">
                    <label for="profileBio">About me (optional)</label>

                    <textarea
                        id="profileBio"
                        name="bio"
                        rows="3"
                        maxlength="500"
                    >${escapeHTML(user.bio || "")}</textarea>
                </div>

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Save profile
                </button>
            </form>
        </section>
    `;
}


function saveDemoProfile(formData) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        showToast("Please log in first.", "error");
        return;
    }

    const users = getDemoUsers();

    const index = users.findIndex(
        (user) => String(user.id) === String(currentUser.id)
    );

    if (index === -1) {
        showToast("Unable to locate your demo profile.", "error");
        return;
    }

    users[index] = {
        ...users[index],
        name: String(formData.get("name") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        location: String(formData.get("location") || "").trim(),
        bio: String(formData.get("bio") || "").trim()
    };

    if (users[index].role === "seller") {
        users[index].businessName = String(
            formData.get("businessName") || ""
        ).trim();

        users[index].businessDescription = String(
            formData.get("businessDescription") || ""
        ).trim();
    }

    if (
        !users[index].name ||
        !users[index].phone ||
        !users[index].location
    ) {
        showToast("Please complete all required fields.", "error");
        return;
    }

    if (!saveDemoUsers(users)) {
        showToast("Unable to save your profile.", "error");
        return;
    }

    updateCurrentUser(users[index]);

    showToast("Profile updated successfully.");

    renderDashboard();
}


/* ---------------------------------------------------------
   10. ACTIVITY AND NOTIFICATIONS
   --------------------------------------------------------- */

function renderActivityPanel() {
    const user = getCurrentUser();

    if (!user) return "";

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>Recent activity</h2>

                <p>
                    A summary of available activity in this demo.
                </p>
            </div>

            <div class="dashboard-content-card">
                <h3>Account created</h3>

                <p>
                    ${
                        user.createdAt
                            ? escapeHTML(
                                new Date(user.createdAt).toLocaleString()
                            )
                            : "Date unavailable"
                    }
                </p>
            </div>

            <div class="dashboard-content-card">
                <h3>Saved products</h3>

                <p>
                    You currently have
                    ${getSavedProductIds().length}
                    saved product(s).
                </p>
            </div>

            <div class="dashboard-content-card">
                <h3>Shopping cart</h3>

                <p>
                    Your cart currently contains
                    ${getCartCount()}
                    item(s).
                </p>
            </div>
        </section>
    `;
}


function renderNotificationsPanel() {
    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>Notifications</h2>

                <p>
                    Notifications from a live server are not available
                    in this demonstration.
                </p>
            </div>

            <div class="empty-state">
                <div class="empty-state-icon" aria-hidden="true">
                    ♧
                </div>

                <h3>No new notifications</h3>

                <p>
                    When server-side notifications are configured,
                    order updates and account alerts can appear here.
                </p>
            </div>
        </section>
    `;
}


/* ---------------------------------------------------------
   11. SAVED PRODUCTS DASHBOARD PANEL
   --------------------------------------------------------- */

function renderSavedDashboardPanel() {
    const products = getSavedProductIds()
        .map((id) => getProductById(id))
        .filter(Boolean);

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>Saved products</h2>

                <p>
                    Products you have saved for later.
                </p>
            </div>

            ${
                products.length
                    ? `
                        <div class="saved-products-list">
                            ${products.map(createSavedProductCard).join("")}
                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <h3>No saved products</h3>

                            <p>
                                Browse the marketplace and save products
                                you may want to buy later.
                            </p>

                            <button
                                type="button"
                                class="btn btn-primary"
                                data-action="close-and-browse"
                            >
                                Browse marketplace
                            </button>
                        </div>
                    `
            }
        </section>
    `;
}


/* ---------------------------------------------------------
   12. SETTINGS PANEL
   --------------------------------------------------------- */

function renderSettingsPanel() {
    const user = getCurrentUser();

    if (!user) return "";

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>Account settings</h2>

                <p>
                    Manage your demonstration account.
                </p>
            </div>

            <div class="dashboard-content-card">
                <h3>Account information</h3>

                <p>
                    <strong>Account type:</strong>
                    ${escapeHTML(user.role)}
                </p>

                <p>
                    <strong>Account mode:</strong>
                    Demo
                </p>

                <p>
                    <strong>Verification:</strong>
                    ${
                        user.verificationStatus === "verified"
                            ? "Verified"
                            : "Not verified"
                    }
                </p>
            </div>

            <div class="notice notice-warning">
                This demonstration does not provide password management,
                two-factor authentication, or secure account deletion.
            </div>

            <button
                type="button"
                class="btn btn-danger"
                data-action="logout"
            >
                Log out
            </button>
        </section>
    `;
}


/* ---------------------------------------------------------
   13. PLACEHOLDER DASHBOARD PANELS
   --------------------------------------------------------- */

function renderDashboardPlaceholder(title, description) {
    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>${escapeHTML(title)}</h2>

                <p>${escapeHTML(description)}</p>
            </div>

            <div class="empty-state">
                <h3>Feature setup pending</h3>

                <p>
                    This section requires additional marketplace
                    functionality before it can display live information.
                </p>
            </div>
        </section>
    `;
}


/* ---------------------------------------------------------
   14. DASHBOARD CONTENT RENDERER
   --------------------------------------------------------- */

function getDashboardContent(tabId) {
    switch (tabId) {
        case "overview":
            return renderDashboardOverview();

        case "profile":
            return renderProfilePanel();

        case "activity":
            return renderActivityPanel();

        case "notifications":
            return renderNotificationsPanel();

        case "saved":
            return renderSavedDashboardPanel();

        case "settings":
            return renderSettingsPanel();

        case "buyer-orders":
            return renderDashboardPlaceholder(
                "My orders",
                "View orders associated with your buyer account."
            );

        case "storefront":
            return renderDashboardPlaceholder(
                "My storefront",
                "Manage your public seller storefront."
            );

        case "listings":
            return renderDashboardPlaceholder(
                "My listings",
                "Create and manage products offered for sale."
            );

        case "inventory":
            return renderDashboardPlaceholder(
                "Inventory",
                "Review stock quantities and product availability."
            );

        case "seller-orders":
            return renderDashboardPlaceholder(
                "Customer orders",
                "Review orders placed with your store."
            );

        case "messages":
            return renderDashboardPlaceholder(
                "Messages",
                "Communicate with buyers and sellers."
            );

        default:
            return renderDashboardOverview();
    }
}


/* ---------------------------------------------------------
   15. RENDER DASHBOARD
   --------------------------------------------------------- */

function renderDashboard() {
    const user = getCurrentUser();

    if (!user) return;

    const titleElement = document.getElementById("dashboardUserName");
    const roleElement = document.getElementById("dashboardUserRole");
    const contentElement = document.getElementById("dashboardContent");

    if (titleElement) {
        titleElement.textContent = user.name;
    }

    if (roleElement) {
        roleElement.textContent =
            user.role === "seller" ? "Seller account" : "Buyer account";
    }

    renderDashboardNavigation();

    if (contentElement) {
        contentElement.innerHTML = getDashboardContent(
            state.dashboardTab
        );
    }
}


/* ---------------------------------------------------------
   16. DASHBOARD NAVIGATION EVENTS
   --------------------------------------------------------- */

function initializeDashboardNavigation() {
    document.addEventListener("click", (event) => {
        const tabButton = event.target.closest("[data-dashboard-tab]");

        if (!tabButton) return;

        const tabId = tabButton.dataset.dashboardTab;

        if (!tabId) return;

        const user = getCurrentUser();

        if (!user) {
            openLoginModal();
            return;
        }

        const allowedTabs = getDashboardTabsForUser(user);

        if (!allowedTabs.some((tab) => tab.id === tabId)) {
            showToast("That section is not available for this account.", "error");
            return;
        }

        state.dashboardTab = tabId;

        renderDashboard();
    });
}


/* ---------------------------------------------------------
   17. ACCOUNT BUTTON EVENTS
   --------------------------------------------------------- */

function initializeAccountActions() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("button, a");

        if (!button) return;

        if (button.matches("[data-open-login]")) {
            event.preventDefault();
            openLoginModal();
            return;
        }

        if (button.matches("[data-open-register]")) {
            event.preventDefault();
            openRegistrationModal();
            return;
        }

        if (button.matches("[data-open-dashboard]")) {
            event.preventDefault();
            openDashboard("overview");
            return;
        }

        if (button.matches("[data-action='open-login']")) {
            openLoginModal();
            return;
        }

        if (button.matches("[data-action='open-register']")) {
            openRegistrationModal();
            return;
        }

        if (button.matches("[data-action='logout']")) {
            logoutDemoUser();
        }
    });
}


/* ---------------------------------------------------------
   18. ACCOUNT FORM SUBMISSION
   --------------------------------------------------------- */

function initializeAccountForms() {
    document.addEventListener("submit", (event) => {
        const form = event.target;

        if (form.id === "registrationForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            registerDemoUser(new FormData(form));
            return;
        }

        if (form.id === "loginForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            loginDemoUser(new FormData(form));
            return;
        }

        if (form.id === "profileForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            saveDemoProfile(new FormData(form));
        }
    });
}


/* ---------------------------------------------------------
   19. START CHUNK 3 FEATURES
   --------------------------------------------------------- */

initializeDashboardControls();
initializeDashboardNavigation();
initializeAccountActions();
initializeAccountForms();
restoreDemoSession();

/* END OF CHUNK 3 */


/* =========================================================
   POULTRYLINK — APP.JS
   CHUNK 4 OF 5
   SELLER STOREFRONTS, LISTINGS, INVENTORY & VERIFICATION
   ========================================================= */


/* ---------------------------------------------------------
   1. SELLER ACCESS AND STORAGE HELPERS
   --------------------------------------------------------- */

function requireSellerAccount() {
    const user = getCurrentUser();

    if (!user) {
        showToast("Please log in to continue.", "error");
        openLoginModal();
        return null;
    }

    if (user.role !== "seller") {
        showToast("This feature is available to seller accounts.", "error");
        return null;
    }

    return user;
}


function getSellerListingsStorageKey(userId) {
    return `poultrylink_demo_listings_${String(userId)}`;
}


function getSellerListings(userId) {
    if (!userId) return [];

    try {
        const raw = localStorage.getItem(
            getSellerListingsStorageKey(userId)
        );

        const listings = JSON.parse(raw || "[]");

        return Array.isArray(listings) ? listings : [];
    } catch (error) {
        console.error("Unable to load seller listings:", error);
        return [];
    }
}


function saveSellerListings(userId, listings) {
    if (!userId || !Array.isArray(listings)) {
        return false;
    }

    try {
        localStorage.setItem(
            getSellerListingsStorageKey(userId),
            JSON.stringify(listings)
        );

        return true;
    } catch (error) {
        console.error("Unable to save seller listings:", error);
        return false;
    }
}


function getSellerListingById(userId, productId) {
    return getSellerListings(userId).find(
        (item) => String(item.id) === String(productId)
    ) || null;
}


function generateDemoId(prefix = "demo") {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}


/* ---------------------------------------------------------
   2. COMBINE DEMO MARKETPLACE AND SELLER LISTINGS
   --------------------------------------------------------- */

function getAllMarketplaceProducts() {
    const user = getCurrentUser();

    if (!user || user.role !== "seller") {
        return Array.isArray(state.products) ? state.products : [];
    }

    const ownListings = getSellerListings(user.id);

    const existingIds = new Set(
        (Array.isArray(state.products) ? state.products : [])
            .map((product) => String(product.id))
    );

    const additionalListings = ownListings.filter(
        (product) => !existingIds.has(String(product.id))
    );

    return [
        ...(Array.isArray(state.products) ? state.products : []),
        ...additionalListings
    ];
}


function getOwnListingCount() {
    const user = getCurrentUser();

    if (!user || user.role !== "seller") {
        return 0;
    }

    return getSellerListings(user.id).length;
}


function refreshMarketplaceProducts() {
    const user = getCurrentUser();

    if (!user || user.role !== "seller") {
        return;
    }

    const ownListings = getSellerListings(user.id);

    const otherProducts = state.products.filter(
        (product) => String(product.sellerId) !== String(user.id)
    );

    state.products = [...otherProducts, ...ownListings];

    renderProducts();
}


/* ---------------------------------------------------------
   3. STOREFRONT PANEL
   --------------------------------------------------------- */

function renderStorefrontPanel() {
    const user = getCurrentUser();

    if (!user || user.role !== "seller") {
        return renderDashboardPlaceholder(
            "My storefront",
            "Log in with a seller account to manage your storefront."
        );
    }

    const listings = getSellerListings(user.id);

    const businessName = user.businessName || user.name;

    const verificationStatus =
        user.verificationStatus || "not_verified";

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>My storefront</h2>

                <p>
                    Set up the information buyers see about your business.
                </p>
            </div>

            <div class="storefront-preview">
                <div class="storefront-avatar" aria-hidden="true">
                    ${escapeHTML(
                        businessName.charAt(0).toUpperCase() || "P"
                    )}
                </div>

                <div>
                    <h3>${escapeHTML(businessName)}</h3>

                    <p>
                        ${escapeHTML(user.location || "Location not provided")}
                    </p>

                    <span class="verification-status">
                        ${
                            verificationStatus === "verified"
                                ? "Verified"
                                : verificationStatus === "pending"
                                    ? "Verification pending"
                                    : "Not verified"
                        }
                    </span>
                </div>
            </div>

            <div class="dashboard-stat-grid">
                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Your listings
                    </span>

                    <strong>${listings.length}</strong>
                </article>

                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Account type
                    </span>

                    <strong>Seller</strong>
                </article>
            </div>

            <form id="storefrontForm" class="form-stack">
                <div class="form-group">
                    <label for="storeBusinessName">
                        Business name
                    </label>

                    <input
                        id="storeBusinessName"
                        name="businessName"
                        type="text"
                        maxlength="150"
                        value="${escapeHTML(user.businessName || "")}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="storeDescription">
                        About your business
                    </label>

                    <textarea
                        id="storeDescription"
                        name="businessDescription"
                        rows="5"
                        maxlength="1000"
                        placeholder="Describe your poultry business, products, and services."
                    >${escapeHTML(user.businessDescription || "")}</textarea>
                </div>

                <div class="form-group">
                    <label for="storeLocation">
                        Business location
                    </label>

                    <input
                        id="storeLocation"
                        name="location"
                        type="text"
                        maxlength="120"
                        value="${escapeHTML(user.location || "")}"
                        required
                    >
                </div>

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Save storefront
                </button>
            </form>

            <div class="notice notice-warning">
                Your storefront is stored in this browser.
                It is not yet publicly published to other users.
            </div>
        </section>
    `;
}


function saveStorefront(formData) {
    const user = requireSellerAccount();

    if (!user) return;

    const businessName = String(
        formData.get("businessName") || ""
    ).trim();

    const businessDescription = String(
        formData.get("businessDescription") || ""
    ).trim();

    const location = String(
        formData.get("location") || ""
    ).trim();

    if (!businessName || !location) {
        showToast(
            "Business name and location are required.",
            "error"
        );

        return;
    }

    const users = getDemoUsers();

    const userIndex = users.findIndex(
        (item) => String(item.id) === String(user.id)
    );

    if (userIndex === -1) {
        showToast("Unable to find your demo account.", "error");
        return;
    }

    users[userIndex] = {
        ...users[userIndex],
        businessName,
        businessDescription,
        location
    };

    if (!saveDemoUsers(users)) {
        showToast("Unable to save storefront details.", "error");
        return;
    }

    updateCurrentUser(users[userIndex]);

    showToast("Storefront details saved.");

    renderDashboard();
}


/* ---------------------------------------------------------
   4. LISTING FORM
   --------------------------------------------------------- */

function openListingForm(productId = null) {
    const user = requireSellerAccount();

    if (!user) return;

    const existing = productId
        ? getSellerListingById(user.id, productId)
        : null;

    if (productId && !existing) {
        showToast("Listing not found in your seller account.", "error");
        return;
    }

    const isEditing = Boolean(existing);

    const product = existing || {
        name: "",
        category: "Live Birds",
        price: "",
        unit: "per bird",
        stock: "",
        location: user.location || "",
        description: "",
        image: "",
        status: "active"
    };

    openModal(
        isEditing ? "Edit product listing" : "Create product listing",
        `
            <form id="sellerListingForm" class="form-stack">
                <input
                    type="hidden"
                    name="productId"
                    value="${escapeHTML(String(product.id || ""))}"
                >

                <div class="form-group">
                    <label for="listingName">
                        Product name
                    </label>

                    <input
                        id="listingName"
                        name="name"
                        type="text"
                        maxlength="150"
                        value="${escapeHTML(product.name || "")}"
                        placeholder="e.g. Broiler chickens"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="listingCategory">
                        Category
                    </label>

                    <select
                        id="listingCategory"
                        name="category"
                        required
                    >
                        ${[
                            "Live Birds",
                            "Eggs",
                            "Day-Old Chicks",
                            "Poultry Feed",
                            "Poultry Equipment",
                            "Processed Chicken",
                            "Other"
                        ].map((category) => `
                            <option
                                value="${escapeHTML(category)}"
                                ${
                                    product.category === category
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${escapeHTML(category)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="form-group">
                    <label for="listingPrice">
                        Price in Nigerian naira (₦)
                    </label>

                    <input
                        id="listingPrice"
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value="${escapeHTML(String(product.price ?? ""))}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="listingUnit">
                        Unit
                    </label>

                    <select id="listingUnit" name="unit" required>
                        ${[
                            "per bird",
                            "per crate",
                            "per tray",
                            "per bag",
                            "per kilogram",
                            "per item",
                            "per batch"
                        ].map((unit) => `
                            <option
                                value="${escapeHTML(unit)}"
                                ${
                                    product.unit === unit
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${escapeHTML(unit)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="form-group">
                    <label for="listingStock">
                        Available quantity
                    </label>

                    <input
                        id="listingStock"
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value="${escapeHTML(String(product.stock ?? ""))}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="listingLocation">
                        Product location
                    </label>

                    <input
                        id="listingLocation"
                        name="location"
                        type="text"
                        maxlength="120"
                        value="${escapeHTML(product.location || user.location || "")}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="listingImage">
                        Image URL (optional)
                    </label>

                    <input
                        id="listingImage"
                        name="image"
                        type="url"
                        maxlength="1000"
                        value="${escapeHTML(product.image || "")}"
                        placeholder="https://example.com/product.jpg"
                    >

                    <p class="form-helper">
                        Use an image URL that you are authorised to use.
                        This demo does not upload image files.
                    </p>
                </div>

                <div class="form-group">
                    <label for="listingDescription">
                        Product description
                    </label>

                    <textarea
                        id="listingDescription"
                        name="description"
                        rows="4"
                        maxlength="1500"
                        required
                    >${escapeHTML(product.description || "")}</textarea>
                </div>

                <button
                    type="submit"
                    class="btn btn-primary btn-full"
                >
                    ${isEditing ? "Save changes" : "Create demo listing"}
                </button>
            </form>
        `,
        "SELLER MARKETPLACE"
    );
}


/* ---------------------------------------------------------
   5. CREATE OR UPDATE LISTING
   --------------------------------------------------------- */

function saveSellerListing(formData) {
    const user = requireSellerAccount();

    if (!user) return;

    const productId = String(
        formData.get("productId") || ""
    ).trim();

    const name = String(
        formData.get("name") || ""
    ).trim();

    const category = String(
        formData.get("category") || ""
    ).trim();

    const price = Number(formData.get("price"));
    const stock = Number(formData.get("stock"));

    const unit = String(
        formData.get("unit") || ""
    ).trim();

    const location = String(
        formData.get("location") || ""
    ).trim();

    const image = String(
        formData.get("image") || ""
    ).trim();

    const description = String(
        formData.get("description") || ""
    ).trim();

    if (
        !name ||
        !category ||
        !unit ||
        !location ||
        !description
    ) {
        showToast("Complete all required listing fields.", "error");
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        showToast("Enter a valid product price.", "error");
        return;
    }

    if (
        !Number.isFinite(stock) ||
        stock < 0 ||
        !Number.isInteger(stock)
    ) {
        showToast(
            "Stock must be a whole number of zero or greater.",
            "error"
        );

        return;
    }

    if (image) {
        try {
            const imageUrl = new URL(image);

            if (!["http:", "https:"].includes(imageUrl.protocol)) {
                showToast(
                    "The image URL must use HTTP or HTTPS.",
                    "error"
                );

                return;
            }
        } catch {
            showToast("Enter a valid image URL.", "error");
            return;
        }
    }

    const listings = getSellerListings(user.id);

    let updatedListing;

    if (productId) {
        const index = listings.findIndex(
            (item) => String(item.id) === productId
        );

        if (index === -1) {
            showToast("Listing not found.", "error");
            return;
        }

        updatedListing = {
            ...listings[index],
            name,
            category,
            price,
            unit,
            stock,
            location,
            image,
            description,
            updatedAt: new Date().toISOString()
        };

        listings[index] = updatedListing;

    } else {
        updatedListing = {
            id: generateDemoId("listing"),
            sellerId: user.id,
            seller: user.businessName || user.name,
            name,
            category,
            price,
            unit,
            stock,
            location,
            image,
            description,
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        listings.push(updatedListing);
    }

    if (!saveSellerListings(user.id, listings)) {
        showToast("Unable to save this listing.", "error");
        return;
    }

    /*
     * Add or update this listing in the current browser's marketplace
     * data. This does not publish the listing to other users.
     */

    const productIndex = state.products.findIndex(
        (item) => String(item.id) === String(updatedListing.id)
    );

    if (productIndex >= 0) {
        state.products[productIndex] = updatedListing;
    } else {
        state.products.push(updatedListing);
    }

    closeModal();

    renderProducts();
    renderDashboard();

    showToast(
        productId
            ? "Listing updated successfully."
            : "Demo listing created successfully."
    );
}


/* ---------------------------------------------------------
   6. SELLER LISTINGS PANEL
   --------------------------------------------------------- */

function renderSellerListingsPanel() {
    const user = getCurrentUser();

    if (!user || user.role !== "seller") {
        return renderDashboardPlaceholder(
            "My listings",
            "Log in with a seller account to manage listings."
        );
    }

    const listings = getSellerListings(user.id);

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>My listings</h2>

                <p>
                    Create and manage the poultry products you offer.
                </p>
            </div>

            <div class="dashboard-toolbar">
                <span>
                    ${listings.length}
                    listing${listings.length === 1 ? "" : "s"}
                </span>

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="create-listing"
                >
                    + Add product
                </button>
            </div>

            ${
                listings.length
                    ? `
                        <div class="seller-listings-list">
                            ${listings.map((product) => `
                                <article class="seller-listing-card">
                                    <div class="seller-listing-image">
                                        ${productImageMarkup(product)}
                                    </div>

                                    <div class="seller-listing-details">
                                        <h3>
                                            ${escapeHTML(product.name)}
                                        </h3>

                                        <p>
                                            ${escapeHTML(product.category)}
                                        </p>

                                        <strong>
                                            ${formatNaira(Number(product.price) || 0)}
                                            ${escapeHTML(product.unit || "")}
                                        </strong>

                                        <p>
                                            Stock:
                                            ${getProductStock(product)}
                                        </p>

                                        <div class="seller-listing-actions">
                                            <button
                                                type="button"
                                                class="btn btn-outline btn-small"
                                                data-action="edit-listing"
                                                data-product-id="${escapeHTML(String(product.id))}"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-outline btn-small"
                                                data-action="edit-inventory"
                                                data-product-id="${escapeHTML(String(product.id))}"
                                            >
                                                Update stock
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-danger btn-small"
                                                data-action="delete-listing"
                                                data-product-id="${escapeHTML(String(product.id))}"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            `).join("")}
                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <h3>No products listed</h3>

                            <p>
                                Add your first product to get started.
                            </p>

                            <button
                                type="button"
                                class="btn btn-primary"
                                data-action="create-listing"
                            >
                                Create your first listing
                            </button>
                        </div>
                    `
            }

            <div class="notice notice-warning">
                Listings are currently stored in this browser only.
                They are not visible to other customers or sellers.
            </div>
        </section>
    `;
}


/* ---------------------------------------------------------
   7. DELETE LISTING
   --------------------------------------------------------- */

function deleteSellerListing(productId) {
    const user = requireSellerAccount();

    if (!user) return;

    const listings = getSellerListings(user.id);

    const listing = listings.find(
        (item) => String(item.id) === String(productId)
    );

    if (!listing) {
        showToast("Listing not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Delete "${listing.name}" from your demo listings?`
    );

    if (!confirmed) return;

    const updatedListings = listings.filter(
        (item) => String(item.id) !== String(productId)
    );

    if (!saveSellerListings(user.id, updatedListings)) {
        showToast("Unable to delete this listing.", "error");
        return;
    }

    state.products = state.products.filter(
        (item) => String(item.id) !== String(productId)
    );

    state.cart = getCartItems().filter(
        (item) => String(item.productId) !== String(productId)
    );

    state.savedIds = getSavedProductIds().filter(
        (id) => id !== String(productId)
    );

    persistCart();
    persistSavedProducts();

    updateCartCount();
    updateSavedCount();

    renderProducts();
    renderDashboard();

    showToast("Demo listing deleted.");
}


/* ---------------------------------------------------------
   8. INVENTORY MANAGEMENT
   --------------------------------------------------------- */

function openInventoryForm(productId) {
    const user = requireSellerAccount();

    if (!user) return;

    const product = getSellerListingById(user.id, productId);

    if (!product) {
        showToast("Listing not found.", "error");
        return;
    }

    openModal(
        "Update inventory",
        `
            <form id="inventoryForm" class="form-stack">
                <input
                    type="hidden"
                    name="productId"
                    value="${escapeHTML(String(product.id))}"
                >

                <div class="form-group">
                    <label>Product</label>

                    <input
                        type="text"
                        value="${escapeHTML(product.name)}"
                        disabled
                    >
                </div>

                <div class="form-group">
                    <label for="inventoryStock">
                        Available quantity
                    </label>

                    <input
                        id="inventoryStock"
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value="${getProductStock(product)}"
                        required
                    >
                </div>

                <button
                    type="submit"
                    class="btn btn-primary btn-full"
                >
                    Save inventory
                </button>
            </form>
        `,
        "INVENTORY"
    );
}


function saveInventory(formData) {
    const user = requireSellerAccount();

    if (!user) return;

    const productId = String(
        formData.get("productId") || ""
    );

    const stock = Number(formData.get("stock"));

    if (
        !Number.isInteger(stock) ||
        !Number.isFinite(stock) ||
        stock < 0
    ) {
        showToast(
            "Enter a valid whole-number stock quantity.",
            "error"
        );

        return;
    }

    const listings = getSellerListings(user.id);

    const index = listings.findIndex(
        (item) => String(item.id) === productId
    );

    if (index === -1) {
        showToast("Listing not found.", "error");
        return;
    }

    listings[index] = {
        ...listings[index],
        stock,
        updatedAt: new Date().toISOString()
    };

    if (!saveSellerListings(user.id, listings)) {
        showToast("Unable to update inventory.", "error");
        return;
    }

    const marketplaceIndex = state.products.findIndex(
        (item) => String(item.id) === productId
    );

    if (marketplaceIndex >= 0) {
        state.products[marketplaceIndex] = listings[index];
    } else {
        state.products.push(listings[index]);
    }

    /*
     * Remove cart quantities that exceed the updated stock.
     */

    state.cart = getCartItems()
        .map((item) => {
            if (String(item.productId) !== productId) {
                return item;
            }

            return {
                ...item,
                quantity: Math.min(
                    Number(item.quantity) || 0,
                    stock
                )
            };
        })
        .filter((item) => Number(item.quantity) > 0);

    persistCart();
    updateCartCount();

    closeModal();

    renderProducts();
    renderDashboard();

    showToast("Inventory updated.");
}


/* ---------------------------------------------------------
   9. INVENTORY DASHBOARD PANEL
   --------------------------------------------------------- */

function renderInventoryPanel() {
    const user = getCurrentUser();

    if (!user || user.role !== "seller") {
        return renderDashboardPlaceholder(
            "Inventory",
            "Log in with a seller account to manage stock."
        );
    }

    const listings = getSellerListings(user.id);

    const totalUnits = listings.reduce(
        (sum, product) => sum + getProductStock(product),
        0
    );

    return `
        <section class="dashboard-panel">
            <div class="dashboard-section-heading">
                <h2>Inventory</h2>

                <p>
                    Review stock quantities for your products.
                </p>
            </div>

            <div class="dashboard-stat-grid">
                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Products
                    </span>

                    <strong>${listings.length}</strong>
                </article>

                <article class="dashboard-stat-card">
                    <span class="dashboard-stat-label">
                        Total listed units
                    </span>

                    <strong>${totalUnits}</strong>
                </article>
            </div>

            ${
                listings.length
                    ? `
                        <div class="inventory-list">
                            ${listings.map((product) => `
                                <article class="inventory-row">
                                    <div>
                                        <h3>
                                            ${escapeHTML(product.name)}
                                        </h3>

                                        <p>
                                            ${escapeHTML(product.category)}
                                        </p>
                                    </div>

                                    <div class="inventory-stock">
                                        <strong>
                                            ${getProductStock(product)}
                                        </strong>

                                        <span>in stock</span>
                                    </div>

                                    <button
                                        type="button"
                                        class="btn btn-outline btn-small"
                                        data-action="edit-inventory"
                                        data-product-id="${escapeHTML(String(product.id))}"
                                    >
                                        Update
                                    </button>
                                </article>
                            `).join("")}
                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <h3>No inventory yet</h3>

                            <p>
                                Create a product listing to begin tracking stock.
                            </p>

                            <button
                                type="button"
                                class="btn btn-primary"
                                data-action="create-listing"
                            >
                                Add product
                            </button>
                        </div>
                    `
            }
        </section>
    `;
}


/* ---------------------------------------------------------
   10. SELLER VERIFICATION APPLICATION
   --------------------------------------------------------- */

function openVerificationForm() {
    const user = requireSellerAccount();

    if (!user) return;

    const currentStatus =
        user.verificationStatus || "not_verified";

    if (currentStatus === "pending") {
        openModal(
            "Verification application",
            `
                <div class="notice notice-warning">
                    Your demo application is marked as pending.
                    This status does not mean that your identity
                    has been reviewed by POULTRYLINK.
                </div>

                <p>
                    A production verification workflow would require
                    secure document submission and review by an
                    authorised administrator.
                </p>
            `,
            "SELLER VERIFICATION"
        );

        return;
    }

    openModal(
        "Apply for seller verification",
        `
            <div class="notice notice-warning">
                <strong>Demonstration only:</strong>
                This form records a local application status.
                It does not verify your identity or award a genuine
                verification badge.
            </div>

            <form id="verificationForm" class="form-stack">
                <div class="form-group">
                    <label for="verificationBusinessName">
                        Business name
                    </label>

                    <input
                        id="verificationBusinessName"
                        name="businessName"
                        type="text"
                        maxlength="150"
                        value="${escapeHTML(user.businessName || user.name)}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="verificationLocation">
                        Business location
                    </label>

                    <input
                        id="verificationLocation"
                        name="location"
                        type="text"
                        maxlength="120"
                        value="${escapeHTML(user.location || "")}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="verificationDescription">
                        Tell us about your business
                    </label>

                    <textarea
                        id="verificationDescription"
                        name="description"
                        rows="4"
                        maxlength="1000"
                        required
                    >${escapeHTML(user.businessDescription || "")}</textarea>
                </div>

                <p class="form-helper">
                    Do not enter identity document numbers, banking
                    details, passwords, or other sensitive information
                    into this demonstration form.
                </p>

                <button
                    type="submit"
                    class="btn btn-primary btn-full"
                >
                    Save demo application
                </button>
            </form>
        `,
        "SELLER VERIFICATION"
    );
}


function saveVerificationApplication(formData) {
    const user = requireSellerAccount();

    if (!user) return;

    const businessName = String(
        formData.get("businessName") || ""
    ).trim();

    const location = String(
        formData.get("location") || ""
    ).trim();

    const description = String(
        formData.get("description") || ""
    ).trim();

    if (!businessName || !location || !description) {
        showToast("Complete all required fields.", "error");
        return;
    }

    const users = getDemoUsers();

    const index = users.findIndex(
        (item) => String(item.id) === String(user.id)
    );

    if (index === -1) {
        showToast("Unable to find your demo account.", "error");
        return;
    }

    users[index] = {
        ...users[index],
        businessName,
        location,
        businessDescription: description,
        verificationStatus: "pending",
        verificationApplicationAt: new Date().toISOString()
    };

    if (!saveDemoUsers(users)) {
        showToast(
            "Unable to save your demo verification application.",
            "error"
        );

        return;
    }

    updateCurrentUser(users[index]);

    closeModal();

    renderDashboard();

    showToast(
        "Demo application saved. No real verification has occurred."
    );
}


/* ---------------------------------------------------------
   11. SELLER DIRECTORY
   --------------------------------------------------------- */

function getAllDirectorySellers() {
    const directory = new Map();

    (Array.isArray(state.sellers) ? state.sellers : [])
        .forEach((seller) => {
            directory.set(String(seller.id), seller);
        });

    getDemoUsers()
        .filter((user) => user.role === "seller")
        .forEach((user) => {
            directory.set(String(user.id), {
                id: user.id,
                name: user.businessName || user.name,
                location: user.location || "Location not provided",
                description: user.businessDescription || "",
                verificationStatus: user.verificationStatus || "not_verified",
                isDemoAccount: true
            });
        });

    return [...directory.values()];
}


function renderSellerDirectory() {
    const container = document.getElementById("sellerGrid");

    if (!container) return;

    const sellers = getAllDirectorySellers();

    if (!sellers.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No sellers to display</h3>

                <p>
                    Seller profiles will appear here when available.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = sellers.map((seller) => {
        const isVerified =
            seller.verificationStatus === "verified";

        return `
            <article class="seller-card">
                <div class="seller-card-avatar" aria-hidden="true">
                    ${escapeHTML(
                        String(seller.name || "P")
                            .charAt(0)
                            .toUpperCase()
                    )}
                </div>

                <div class="seller-card-content">
                    <h3>${escapeHTML(seller.name || "Poultry seller")}</h3>

                    <p>
                        ${escapeHTML(seller.location || "Nigeria")}
                    </p>

                    ${
                        seller.description
                            ? `
                                <p class="seller-card-description">
                                    ${escapeHTML(seller.description)}
                                </p>
                            `
                            : ""
                    }

                    ${
                        isVerified
                            ? `
                                <span class="verification-badge">
                                    Verified
                                </span>
                            `
                            : `
                                <span class="verification-status">
                                    Not verified
                                </span>
                            `
                    }

                    ${
                        seller.isDemoAccount
                            ? `
                                <p class="form-helper">
                                    Demo seller profile
                                </p>
                            `
                            : ""
                    }
                </div>
            </article>
        `;
    }).join("");
}


/* ---------------------------------------------------------
   12. DASHBOARD RENDERER INTEGRATION
   --------------------------------------------------------- */

const previousGetDashboardContent = getDashboardContent;

getDashboardContent = function (tabId) {
    switch (tabId) {
        case "storefront":
            return renderStorefrontPanel();

        case "listings":
            return renderSellerListingsPanel();

        case "inventory":
            return renderInventoryPanel();

        default:
            return previousGetDashboardContent(tabId);
    }
};


/* ---------------------------------------------------------
   13. LISTING, INVENTORY AND STOREFRONT EVENTS
   --------------------------------------------------------- */

function initializeSellerManagementActions() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const productId = button.dataset.productId;

        switch (action) {
            case "create-listing":
                openListingForm();
                break;

            case "edit-listing":
                if (productId) {
                    openListingForm(productId);
                }
                break;

            case "delete-listing":
                if (productId) {
                    deleteSellerListing(productId);
                }
                break;

            case "edit-inventory":
                if (productId) {
                    openInventoryForm(productId);
                }
                break;

            case "open-verification":
                openVerificationForm();
                break;

            default:
                break;
        }
    });

    document.addEventListener("submit", (event) => {
        const form = event.target;

        if (form.id === "sellerListingForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            saveSellerListing(new FormData(form));
        }

        if (form.id === "inventoryForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            saveInventory(new FormData(form));
        }

        if (form.id === "storefrontForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            saveStorefront(new FormData(form));
        }

        if (form.id === "verificationForm") {
            event.preventDefault();

            if (!form.reportValidity()) return;

            saveVerificationApplication(new FormData(form));
        }
    });
}


/* ---------------------------------------------------------
   14. INITIALISE CHUNK 4
   --------------------------------------------------------- */

initializeSellerManagementActions();
renderSellerDirectory();

/* END OF CHUNK 4 */


/* =========================================================
   POULTRYLINK — APP.JS
   CHUNK 5 OF 5
   FINAL INTEGRATION, NAVIGATION & APPLICATION INITIALISATION
   ========================================================= */


/* ---------------------------------------------------------
   1. SAFE ELEMENT HELPERS
   --------------------------------------------------------- */

function getElement(id) {
    return document.getElementById(id);
}


function scrollToSection(sectionId) {
    const section = getElement(sectionId);

    if (!section) {
        showToast("That section is not available.", "error");
        return;
    }

    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* ---------------------------------------------------------
   2. MAIN NAVIGATION
   --------------------------------------------------------- */

function initializeMainNavigation() {
    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href^='#']");

        if (!link) return;

        const href = link.getAttribute("href");

        if (!href || href === "#") {
            event.preventDefault();
            return;
        }

        const targetId = href.slice(1);

        if (!targetId) return;

        const target = getElement(targetId);

        if (target) {
            event.preventDefault();

            closeDashboard();
            closeModal();

            scrollToSection(targetId);

            const navLinks = document.querySelectorAll(
                ".nav-link, .mobile-nav-link"
            );

            navLinks.forEach((navLink) => {
                navLink.classList.toggle(
                    "active",
                    navLink === link
                );
            });
        }
    });
}


/* ---------------------------------------------------------
   3. MOBILE NAVIGATION
   --------------------------------------------------------- */

function initializeMobileNavigation() {
    const menuButton =
        getElement("mobileMenuButton") ||
        getElement("menuToggle");

    const navigation =
        getElement("mobileNavigation") ||
        getElement("mobileNav");

    if (!menuButton || !navigation) {
        return;
    }

    menuButton.setAttribute("aria-expanded", "false");

    menuButton.addEventListener("click", () => {
        const isOpen =
            menuButton.getAttribute("aria-expanded") === "true";

        menuButton.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );

        navigation.hidden = isOpen;

        navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
        const link = event.target.closest("a");

        if (!link) return;

        navigation.hidden = true;
        navigation.classList.remove("is-open");

        menuButton.setAttribute("aria-expanded", "false");
    });
}


/* ---------------------------------------------------------
   4. HEADER CART AND SAVED-PRODUCT BUTTONS
   --------------------------------------------------------- */

function initializeHeaderShoppingButtons() {
    document.addEventListener("click", (event) => {
        const cartButton = event.target.closest(
            "[data-open-cart], #cartButton, #cartIconButton"
        );

        if (cartButton) {
            event.preventDefault();
            openCart();
            return;
        }

        const savedButton = event.target.closest(
            "[data-open-saved], #savedButton, #wishlistButton"
        );

        if (savedButton) {
            event.preventDefault();
            openSavedProducts();
        }
    });
}


/* ---------------------------------------------------------
   5. HERO AND MARKETPLACE SEARCH
   --------------------------------------------------------- */

function initializeHeroSearch() {
    const searchForm =
        getElement("heroSearchForm") ||
        getElement("searchForm");

    const searchInput =
        getElement("heroSearchInput") ||
        getElement("searchInput") ||
        getElement("productSearch");

    if (!searchForm || !searchInput) {
        return;
    }

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const searchValue = String(
            searchInput.value || ""
        ).trim();

        /*
         * The marketplace controls from Chunk 1 use the shared
         * state.search value. Update it and refresh the product grid.
         */

        if (typeof state !== "undefined") {
            state.search = searchValue;
        }

        if (typeof renderProducts === "function") {
            renderProducts();
        }

        scrollToSection("marketplace");
    });
}


/* ---------------------------------------------------------
   6. CATEGORY SHORTCUTS
   --------------------------------------------------------- */

function initializeCategoryShortcuts() {
    document.addEventListener("click", (event) => {
        const categoryButton = event.target.closest(
            "[data-category-shortcut]"
        );

        if (!categoryButton) return;

        const category = categoryButton.dataset.categoryShortcut;

        if (!category) return;

        if (typeof state !== "undefined") {
            state.category = category;
        }

        const categorySelect =
            getElement("categoryFilter") ||
            getElement("categorySelect");

        if (categorySelect) {
            categorySelect.value = category;
        }

        if (typeof renderProducts === "function") {
            renderProducts();
        }

        scrollToSection("marketplace");
    });
}


/* ---------------------------------------------------------
   7. SELLER DIRECTORY REFRESH
   --------------------------------------------------------- */

function refreshSellerDirectory() {
    if (typeof renderSellerDirectory === "function") {
        renderSellerDirectory();
    }
}


/* ---------------------------------------------------------
   8. DASHBOARD HEADER INFORMATION
   --------------------------------------------------------- */

function refreshDashboardHeader() {
    const user = getCurrentUser();

    const nameElement = getElement("dashboardUserName");
    const roleElement = getElement("dashboardUserRole");

    if (nameElement) {
        nameElement.textContent = user ? user.name : "Guest";
    }

    if (roleElement) {
        roleElement.textContent = user
            ? (
                user.role === "seller"
                    ? "Seller account"
                    : "Buyer account"
            )
            : "";
    }
}


/* ---------------------------------------------------------
   9. MARKETPLACE EMPTY-STATE FALLBACK
   --------------------------------------------------------- */

function ensureMarketplaceEmptyState() {
    const grid = getElement("productGrid");

    if (!grid) {
        console.warn(
            "POULTRYLINK: Product grid element #productGrid was not found."
        );

        return;
    }

    /*
     * Product rendering is handled by renderProducts() from Chunk 1.
     * This function deliberately does not overwrite the grid.
     */

    if (
        Array.isArray(state.products) &&
        state.products.length === 0 &&
        grid.children.length === 0
    ) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No products available yet</h3>

                <p>
                    Products will appear here when they are added
                    to the marketplace.
                </p>
            </div>
        `;
    }
}


/* ---------------------------------------------------------
   10. LOCAL DEMO DATA STATUS
   --------------------------------------------------------- */

function showDemoModeNotice() {
    const notice = getElement("demoModeNotice");

    if (notice) {
        notice.hidden = false;
    }
}


/* ---------------------------------------------------------
   11. GLOBAL BUTTON FALLBACKS
   --------------------------------------------------------- */

function initializeGlobalActions() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-scroll-to]");

        if (!button) return;

        const sectionId = button.dataset.scrollTo;

        if (sectionId) {
            scrollToSection(sectionId);
        }
    });
}


/* ---------------------------------------------------------
   12. REFRESH UI AFTER LOGIN OR LOGOUT
   --------------------------------------------------------- */

function refreshApplicationInterface() {
    updateAccountInterface();
    updateCartCount();
    updateSavedCount();
    refreshDashboardHeader();
    refreshSellerDirectory();

    if (typeof renderProducts === "function") {
        renderProducts();
    }
}


/* ---------------------------------------------------------
   13. APPLICATION HEALTH CHECK
   --------------------------------------------------------- */

function checkRequiredElements() {
    const requiredElements = [
        "productGrid",
        "modalBackdrop",
        "modalTitle",
        "modalBody",
        "modalClose",
        "dashboardDrawer",
        "dashboardNav",
        "dashboardContent"
    ];

    const missingElements = requiredElements.filter(
        (id) => !getElement(id)
    );

    if (missingElements.length > 0) {
        console.warn(
            "POULTRYLINK: Some expected HTML elements are missing:",
            missingElements.join(", ")
        );

        return false;
    }

    return true;
}


/* ---------------------------------------------------------
   14. FINAL APPLICATION INITIALISATION
   --------------------------------------------------------- */

function initializePoultryLinkApp() {
    console.info("POULTRYLINK: Initialising application...");

    /*
     * The first four chunks already initialise:
     * - Marketplace controls
     * - Demo marketplace data
     * - Product modals and cart
     * - Demo accounts
     * - Seller management
     *
     * This section connects the remaining interface elements.
     */

    initializeMainNavigation();
    initializeMobileNavigation();
    initializeHeaderShoppingButtons();
    initializeHeroSearch();
    initializeCategoryShortcuts();
    initializeGlobalActions();

    restoreDemoSession();

    initializeShoppingStorage();

    refreshApplicationInterface();

    ensureMarketplaceEmptyState();

    showDemoModeNotice();

    const healthy = checkRequiredElements();

    if (healthy) {
        console.info(
            "POULTRYLINK: Expected HTML elements were found."
        );
    } else {
        console.warn(
            "POULTRYLINK: Review the HTML IDs listed above."
        );
    }

    console.info(
        "POULTRYLINK: Demo frontend initialisation complete."
    );
}


/* ---------------------------------------------------------
   15. START APPLICATION
   --------------------------------------------------------- */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializePoultryLinkApp,
        { once: true }
    );
} else {
    initializePoultryLinkApp();
}

/* =========================================================
   END OF CHUNK 5
   END OF POULTRYLINK APP.JS
   ========================================================= */
