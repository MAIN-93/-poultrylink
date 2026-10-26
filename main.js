"use strict";
/*
 * POULTRYLINK frontend demonstration.
 * These sample products are not verified real listings.
 * Authentication and database functionality are not connected.
 */
const products = [
    {
        id: "PL001",
        title: "Healthy Broiler Chickens",
        category: "Live Birds",
        price: 8500,
        unit: "per bird",
        location: "Ibadan, Oyo State",
        seller: "Green Acres Poultry",
        description: "Healthy broiler chickens raised with proper care.",
        emoji: "🐔",
        featured: true
    },
    {
        id: "PL002",
        title: "Fresh Table Eggs",
        category: "Eggs",
        price: 6500,
        unit: "per crate",
        location: "Abeokuta, Ogun State",
        seller: "Sunrise Egg Farm",
        description: "Fresh table eggs for homes and retailers.",
        emoji: "🥚",
        featured: true
    },
    {
        id: "PL003",
        title: "Layer Poultry Feed",
        category: "Feeds",
        price: 24500,
        unit: "per bag",
        location: "Lagos, Lagos State",
        seller: "Farm Supply Hub",
        description: "Layer feed for poultry farmers and commercial farms.",
        emoji: "🌾",
        featured: true
    },
    {
        id: "PL004",
        title: "Day-Old Broiler Chicks",
        category: "Day-Old Chicks",
        price: 1800,
        unit: "per chick",
        location: "Ilorin, Kwara State",
        seller: "Prime Chick Suppliers",
        description: "Day-old broiler chicks for poultry production.",
        emoji: "🐣",
        featured: false
    },
    {
        id: "PL005",
        title: "Automatic Poultry Drinker",
        category: "Equipment",
        price: 12000,
        unit: "per set",
        location: "Abuja, FCT",
        seller: "Agro Equipment Store",
        description: "Poultry drinking equipment for farm use.",
        emoji: "🧰",
        featured: false
    },
    {
        id: "PL006",
        title: "Point-of-Lay Pullets",
        category: "Live Birds",
        price: 14500,
        unit: "per bird",
        location: "Enugu, Enugu State",
        seller: "Healthy Flock Farms",
        description: "Point-of-lay pullets for egg production.",
        emoji: "🐓",
        featured: true
    },
    {
        id: "PL007",
        title: "Broiler Starter Feed",
        category: "Feeds",
        price: 22000,
        unit: "per bag",
        location: "Benin City, Edo State",
        seller: "Agro Nutrition Centre",
        description: "Starter feed for broiler chicks.",
        emoji: "🌾",
        featured: false
    },
    {
        id: "PL008",
        title: "Poultry Farm Consultation",
        category: "Services",
        price: 15000,
        unit: "per consultation",
        location: "Port Harcourt, Rivers State",
        seller: "Poultry Advisory Services",
        description: "General poultry farm planning and management advice.",
        emoji: "🤝",
        featured: false
    }
];
const state = {
    search: "",
    category: "All",
    sort: "featured"
};
function getElement(id) {
    return document.getElementById(id);
}
function getElements(selector) {
    return document.querySelectorAll(selector);
}
/* Safely escape text before inserting it into HTML. */
function escapeHTML(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };
    return String(value ?? "").replace(/[&<>"']/g, character => {
        return entities[character];
    });
}
function formatNaira(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(amount);
}
/* Notifications */
function showToast(message, type = "success") {
    const container = getElement("toastContainer");
    if (!container) {
        console.log(message);
        return;
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(() => {
        toast.remove();
    }, 3500);
}
/* Product filtering and sorting */
function getVisibleProducts() {
    let result = [...products];
    if (state.search.trim()) {
        const query = state.search.trim().toLowerCase();
        result = result.filter(product => {
            const searchableText = [
                product.title,
                product.category,
                product.location,
                product.seller,
                product.description
            ].join(" ").toLowerCase();
            return searchableText.includes(query);
        });
    }
    if (state.category !== "All") {
        result = result.filter(product => {
            return product.category === state.category;
        });
    }
    switch (state.sort) {
        case "price-low":
            result.sort((a, b) => a.price - b.price);
            break;
        case "price-high":
            result.sort((a, b) => b.price - a.price);
            break;
        case "name":
            result.sort((a, b) => a.title.localeCompare(b.title));
            break;
        default:
            result.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return result;
}
/* Render marketplace cards */
function renderProducts() {
    const productGrid = getElement("productGrid");
    const productCount = getElement("productCount");
    if (!productGrid) {
        console.error("POULTRYLINK: #productGrid is missing.");
        return;
    }
    const visibleProducts = getVisibleProducts();
    if (productCount) {
        productCount.textContent =
            `${visibleProducts.length} demonstration product` +
            `${visibleProducts.length === 1 ? "" : "s"} found`;
    }
    if (visibleProducts.length === 0) {
        productGrid.innerHTML = `
            <div class="empty-state">
                <h3>No matching products</h3>
                <p>Try another search term or category.</p>
            </div>
        `;
        return;
    }
    productGrid.innerHTML = visibleProducts.map(product => `
        <article class="product-card">
            <div class="product-image">
                <span class="product-image-placeholder" aria-hidden="true">
                    ${escapeHTML(product.emoji)}
                </span>
                ${product.featured
                    ? '<span class="product-badge">Featured demo</span>'
                    : ""}
            </div>
            <div class="product-details">
                <span class="product-category">
                    ${escapeHTML(product.category)}
                </span>
                <h3 class="product-title">
                    ${escapeHTML(product.title)}
                </h3>
                <p class="product-description">
                    ${escapeHTML(product.description)}
                </p>
                <p class="product-location">
                    📍 ${escapeHTML(product.location)}
                </p>
                <p class="product-price">
                    ${formatNaira(product.price)}
                    <small>${escapeHTML(product.unit)}</small>
                </p>
                <p class="product-seller">
                    Seller: ${escapeHTML(product.seller)}
                </p>
                <div class="product-actions">
                    <button
                        class="button button-primary"
                        type="button"
                        data-action="contact-seller"
                        data-product-id="${escapeHTML(product.id)}"
                    >
                        Contact Seller
                    </button>
                    <button
                        class="button button-outline"
                        type="button"
                        data-action="view-product"
                        data-product-id="${escapeHTML(product.id)}"
                    >
                        Details
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}
/* Search */
function initializeSearch() {
    const form = getElement("searchForm");
    const input = getElement("searchInput");
    if (!form || !input) return;
    form.addEventListener("submit", event => {
        event.preventDefault();
        state.search = input.value;
        renderProducts();
        getElement("marketplace")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
    input.addEventListener("input", () => {
        state.search = input.value;
        renderProducts();
    });
}
/* Categories and sorting */
function updateActiveCategories() {
    getElements(".category-card").forEach(button => {
        const active = button.dataset.category === state.category;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}
function initializeFilters() {
    const categoryFilter = getElement("categoryFilter");
    const sortFilter = getElement("sortFilter");
    const clearButton = getElement("clearFiltersButton");
    categoryFilter?.addEventListener("change", () => {
        state.category = categoryFilter.value;
        updateActiveCategories();
        renderProducts();
    });
    sortFilter?.addEventListener("change", () => {
        state.sort = sortFilter.value;
        renderProducts();
    });
    clearButton?.addEventListener("click", () => {
        state.search = "";
        state.category = "All";
        state.sort = "featured";
        const searchInput = getElement("searchInput");
        if (searchInput) searchInput.value = "";
        if (categoryFilter) categoryFilter.value = "All";
        if (sortFilter) sortFilter.value = "featured";
        updateActiveCategories();
        renderProducts();
        showToast("All product filters have been cleared.");
        getElement("marketplace")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
    getElements(".category-card").forEach(button => {
        button.addEventListener("click", () => {
            state.category = button.dataset.category || "All";
            if (categoryFilter) {
                categoryFilter.value = state.category;
            }
            updateActiveCategories();
            renderProducts();
            getElement("marketplace")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });
}
/* Mobile navigation */
function initializeMobileNavigation() {
    const toggle = getElement("menuToggle");
    const nav = getElement("mainNav");
    if (!toggle || !nav) return;
    function closeMenu() {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
    }
    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "✕" : "☰";
    });
    nav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });
    document.addEventListener("click", event => {
        if (!nav.contains(event.target) && !toggle.contains(event.target)) {
            closeMenu();
        }
    });
}
/* Modal helpers */
function openModal(title, content) {
    const backdrop = getElement("modalBackdrop");
    const modalContent = getElement("modalContent");
    if (!backdrop || !modalContent) {
        showToast("The dialog could not be opened.", "error");
        return;
    }
    modalContent.innerHTML = `
        <h2 id="modalTitle">${escapeHTML(title)}</h2>
        ${content}
    `;
    backdrop.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    getElement("modalClose")?.focus();
}
function closeModal() {
    const backdrop = getElement("modalBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}
function initializeModalControls() {
    const backdrop = getElement("modalBackdrop");
    getElement("modalClose")?.addEventListener("click", closeModal);
    backdrop?.addEventListener("click", event => {
        if (event.target === backdrop) closeModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });
}
/* Product details */
function showProductDetails(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) {
        showToast("This product could not be found.", "error");
        return;
    }
    openModal(product.title, `
        <p class="product-category">${escapeHTML(product.category)}</p>
        <p>${escapeHTML(product.description)}</p>
        <p><strong>Price:</strong> ${formatNaira(product.price)} ${escapeHTML(product.unit)}</p>
        <p><strong>Location:</strong> ${escapeHTML(product.location)}</p>
        <p><strong>Seller:</strong> ${escapeHTML(product.seller)}</p>
        <p class="modal-note">
            Demonstration listing only. Availability and seller details
            have not been independently verified.
        </p>
    `);
}
/* Seller contact */
function contactSeller(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) {
        showToast("This product could not be found.", "error");
        return;
    }
    openModal("Contact Seller", `
        <p>You selected <strong>${escapeHTML(product.title)}</strong>.</p>
        <p>Seller: ${escapeHTML(product.seller)}</p>
        <p>Location: ${escapeHTML(product.location)}</p>
        <p class="modal-note">
            Seller messaging is not connected yet. No message has been sent.
        </p>
        <button class="button button-primary" id="contactNoticeButton" type="button">
            Understood
        </button>
    `);
    getElement("contactNoticeButton")?.addEventListener("click", closeModal);
}
/* Demo login and registration */
function showLoginModal() {
    openModal("Welcome back", `
        <p>Firebase sign-in has not been connected yet.</p>
        <p class="modal-note">
            This demonstration does not authenticate users.
        </p>
        <form id="demoLoginForm">
            <div class="form-group">
                <label for="loginEmail">Email address</label>
                <input
                    id="loginEmail"
                    name="email"
                    type="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    required
                >
            </div>
            <button class="button button-primary" type="submit">Continue</button>
        </form>
    `);
    getElement("demoLoginForm")?.addEventListener("submit", event => {
        event.preventDefault();
        showToast("Demo only: Firebase sign-in is not connected.", "error");
    });
}
function showRegisterModal() {
    openModal("Join POULTRYLINK", `
        <p>Create an account to prepare for buying or selling poultry products.</p>
        <p class="modal-note">
            Registration is not active. This form does not create an account.
        </p>
        <form id="demoRegisterForm">
            <div class="form-group">
                <label for="registerName">Full name</label>
                <input
                    id="registerName"
                    name="name"
                    type="text"
                    autocomplete="name"
                    maxlength="100"
                    required
                >
            </div>
            <div class="form-group">
                <label for="registerEmail">Email address</label>
                <input
                    id="registerEmail"
                    name="email"
                    type="email"
                    autocomplete="email"
                    maxlength="254"
                    required
                >
            </div>
            <button class="button button-primary" type="submit">Continue</button>
        </form>
    `);
    getElement("demoRegisterForm")?.addEventListener("submit", event => {
        event.preventDefault();
        showToast("Demo only: Firebase registration is not connected.", "error");
    });
}
function showSellerInformation() {
    openModal("Start selling on POULTRYLINK", `
        <p>
            The seller dashboard is not connected yet. The production
            version will allow sellers to manage storefronts and listings.
        </p>
        <p class="modal-note">No seller account has been created.</p>
        <button
            class="button button-primary"
            id="sellerRegisterButton"
            type="button"
        >
            Explore Registration
        </button>
    `);
    getElement("sellerRegisterButton")?.addEventListener(
        "click",
        showRegisterModal
    );
}
function initializeAccountButtons() {
    getElement("loginButton")?.addEventListener("click", showLoginModal);
    getElement("registerButton")?.addEventListener("click", showRegisterModal);
    getElement("becomeSellerButton")?.addEventListener("click", showSellerInformation);
    getElement("footerSellerButton")?.addEventListener("click", showSellerInformation);
}
/* Product buttons */
function initializeProductActions() {
    const grid = getElement("productGrid");
    if (!grid) return;
    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button || !grid.contains(button)) return;
        const productId = button.dataset.productId;
        if (button.dataset.action === "view-product") {
            showProductDetails(productId);
        } else if (button.dataset.action === "contact-seller") {
            contactSeller(productId);
        }
    });
}
/* Footer */
function initializeFooter() {
    const year = getElement("currentYear");
    if (year) year.textContent = String(new Date().getFullYear());
}
/* Startup */
function initializePoultryLink() {
    console.info("POULTRYLINK: Starting application.");
    initializeSearch();
    initializeFilters();
    initializeMobileNavigation();
    initializeModalControls();
    initializeAccountButtons();
    initializeProductActions();
    initializeFooter();
    updateActiveCategories();
    renderProducts();
    console.info("POULTRYLINK: Frontend demonstration is ready.");
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePoultryLink, {
        once: true
    });
} else {
    initializePoultryLink();
}
