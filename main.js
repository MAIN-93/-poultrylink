/* =========================================
POULTRYLINK — APPLICATION JAVASCRIPT
Frontend demo version
========================================= */

“use strict”;

/* 1. APPLICATION DATA */

const products = [
{
id: “PL001”,
title: “Healthy Broiler Chickens”,
category: “Live Birds”,
price: 8500,
unit: “per bird”,
location: “Ibadan, Oyo State”,
seller: “Green Acres Poultry”,
description: “Healthy broiler chickens raised with proper care.”,
emoji: “🐔”,
featured: true
},
{
id: “PL002”,
title: “Fresh Table Eggs”,
category: “Eggs”,
price: 6500,
unit: “per crate”,
location: “Abeokuta, Ogun State”,
seller: “Sunrise Egg Farm”,
description: “Fresh table eggs suitable for homes and retailers.”,
emoji: “🥚”,
featured: true
},
{
id: “PL003”,
title: “Layer Poultry Feed”,
category: “Feeds”,
price: 24500,
unit: “per bag”,
location: “Lagos, Lagos State”,
seller: “Farm Supply Hub”,
description: “Layer feed for poultry farmers and commercial farms.”,
emoji: “🌾”,
featured: true
},
{
id: “PL004”,
title: “Day-Old Broiler Chicks”,
category: “Day-Old Chicks”,
price: 1800,
unit: “per chick”,
location: “Ilorin, Kwara State”,
seller: “Prime Chick Suppliers”,
description: “Day-old broiler chicks for poultry production.”,
emoji: “🐣”,
featured: false
},
{
id: “PL005”,
title: “Automatic Poultry Drinker”,
category: “Equipment”,
price: 12000,
unit: “per set”,
location: “Abuja, FCT”,
seller: “Agro Equipment Store”,
description: “Poultry drinking equipment for farm use.”,
emoji: “🧰”,
featured: false
},
{
id: “PL006”,
title: “Point-of-Lay Pullets”,
category: “Live Birds”,
price: 14500,
unit: “per bird”,
location: “Enugu, Enugu State”,
seller: “Healthy Flock Farms”,
description: “Point-of-lay pullets for egg production.”,
emoji: “🐓”,
featured: true
},
{
id: “PL007”,
title: “Broiler Starter Feed”,
category: “Feeds”,
price: 22000,
unit: “per bag”,
location: “Benin City, Edo State”,
seller: “Agro Nutrition Centre”,
description: “Starter feed for broiler chicks.”,
emoji: “🌾”,
featured: false
},
{
id: “PL008”,
title: “Poultry Farm Consultation”,
category: “Services”,
price: 15000,
unit: “per consultation”,
location: “Port Harcourt, Rivers State”,
seller: “Poultry Advisory Services”,
description: “General poultry farm planning and management advice.”,
emoji: “🤝”,
featured: false
}
];

/*

* These are demonstration listings, not verified sellers or
* confirmed real-world offers. Replace them with real database
* records before launching the marketplace.
    */

const state = {
search: “”,
category: “All”,
sort: “featured”
};

/* 2. ELEMENT HELPERS */

function getElement(id) {
return document.getElementById(id);
}

function getElements(selector) {
return document.querySelectorAll(selector);
}

/* 3. SAFE TEXT AND FORMATTING HELPERS */

function escapeHTML(value) {
return String(value ?? “”).replace(/[&<>”’]/g, function (character) {
const entities = {
“&”: “&”,
“<”: “<”,
“>”: “>”,
‘”’: “"”,
“’”: “'”
};

    return entities[character];
});

}

function formatNaira(amount) {
return new Intl.NumberFormat(“en-NG”, {
style: “currency”,
currency: “NGN”,
maximumFractionDigits: 0
}).format(amount);
}

/* 4. TOAST NOTIFICATIONS */

function showToast(message, type = “success”) {
const container = getElement(“toastContainer”);

if (!container) {
    console.log(message);
    return;
}
const toast = document.createElement("div");
toast.className = `toast ${type}`;
toast.setAttribute("role", "status");
toast.textContent = message;
container.appendChild(toast);
window.setTimeout(function () {
    toast.remove();
}, 3500);

}

/* 5. PRODUCT FILTERING */

function getVisibleProducts() {
let visibleProducts = […products];

if (state.search.trim()) {
    const query = state.search.toLowerCase().trim();
    visibleProducts = visibleProducts.filter(function (product) {
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
    visibleProducts = visibleProducts.filter(function (product) {
        return product.category === state.category;
    });
}
switch (state.sort) {
    case "price-low":
        visibleProducts.sort((a, b) => a.price - b.price);
        break;
    case "price-high":
        visibleProducts.sort((a, b) => b.price - a.price);
        break;
    case "name":
        visibleProducts.sort((a, b) =>
            a.title.localeCompare(b.title)
        );
        break;
    case "featured":
    default:
        visibleProducts.sort(function (a, b) {
            return Number(b.featured) - Number(a.featured);
        });
        break;
}
return visibleProducts;

}

/* 6. PRODUCT CARD RENDERING */

function renderProducts() {
const productGrid = getElement(“productGrid”);
const productCount = getElement(“productCount”);

if (!productGrid) {
    console.error(
        "POULTRYLINK: The element #productGrid is missing from index.html."
    );
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
productGrid.innerHTML = visibleProducts.map(function (product) {
    return `
        <article class="product-card">
            <div class="product-image">
                <span class="product-image-placeholder"
                      aria-hidden="true">
                    ${escapeHTML(product.emoji)}
                </span>
                ${
                    product.featured
                        ? `<span class="product-badge">Featured demo</span>`
                        : ""
                }
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
    `;
}).join("");

}

/* 7. SEARCH */

function initializeSearch() {
const searchForm = getElement(“searchForm”);
const searchInput = getElement(“searchInput”);

if (!searchForm || !searchInput) {
    console.warn("POULTRYLINK: Search elements are missing.");
    return;
}
searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    state.search = searchInput.value;
    renderProducts();
    const marketplace = getElement("marketplace");
    if (marketplace) {
        marketplace.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
});
searchInput.addEventListener("input", function () {
    state.search = searchInput.value;
    renderProducts();
});

}

/* 8. CATEGORY AND SORT FILTERS */

function initializeFilters() {
const categoryFilter = getElement(“categoryFilter”);
const sortFilter = getElement(“sortFilter”);
const clearFiltersButton = getElement(“clearFiltersButton”);

if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
        state.category = categoryFilter.value;
        updateActiveCategories();
        renderProducts();
    });
}
if (sortFilter) {
    sortFilter.addEventListener("change", function () {
        state.sort = sortFilter.value;
        renderProducts();
    });
}
if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", function () {
        state.search = "";
        state.category = "All";
        state.sort = "featured";
        const searchInput = getElement("searchInput");
        if (searchInput) {
            searchInput.value = "";
        }
        if (categoryFilter) {
            categoryFilter.value = "All";
        }
        if (sortFilter) {
            sortFilter.value = "featured";
        }
        updateActiveCategories();
        renderProducts();
        showToast("All product filters have been cleared.");
        const marketplace = getElement("marketplace");
        if (marketplace) {
            marketplace.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
}
getElements(".category-card").forEach(function (button) {
    button.addEventListener("click", function () {
        state.category = button.dataset.category || "All";
        if (categoryFilter) {
            categoryFilter.value = state.category;
        }
        updateActiveCategories();
        renderProducts();
        const marketplace = getElement("marketplace");
        if (marketplace) {
            marketplace.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});

}

function updateActiveCategories() {
getElements(”.category-card”).forEach(function (button) {
const isActive = button.dataset.category === state.category;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
});

}

/* 9. MOBILE NAVIGATION */

function initializeMobileNavigation() {
const menuToggle = getElement(“menuToggle”);
const mainNav = getElement(“mainNav”);

if (!menuToggle || !mainNav) {
    console.warn("POULTRYLINK: Navigation elements are missing.");
    return;
}
menuToggle.addEventListener("click", function () {
    const isOpen = mainNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕" : "☰";
});
mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "☰";
    });
});
document.addEventListener("click", function (event) {
    if (
        !mainNav.contains(event.target) &&
        !menuToggle.contains(event.target)
    ) {
        mainNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "☰";
    }
});

}

/* 10. MODAL HELPERS */

function openModal(title, content) {
const backdrop = getElement(“modalBackdrop”);
const modalContent = getElement(“modalContent”);

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
const closeButton = getElement("modalClose");
if (closeButton) {
    closeButton.focus();
}

}

function closeModal() {
const backdrop = getElement(“modalBackdrop”);

if (!backdrop) {
    return;
}
backdrop.classList.remove("is-open");
backdrop.setAttribute("aria-hidden", "true");
document.body.classList.remove("modal-open");

}

function initializeModalControls() {
const backdrop = getElement(“modalBackdrop”);
const closeButton = getElement(“modalClose”);

if (closeButton) {
    closeButton.addEventListener("click", closeModal);
}
if (backdrop) {
    backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) {
            closeModal();
        }
    });
}
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeModal();
    }
});

}

/* 11. PRODUCT DETAILS */

function showProductDetails(productId) {
const product = products.find(function (item) {
return item.id === productId;
});

if (!product) {
    showToast("This product could not be found.", "error");
    return;
}
openModal(
    product.title,
    `
        <p class="product-category">
            ${escapeHTML(product.category)}
        </p>
        <p>${escapeHTML(product.description)}</p>
        <p style="margin-top: 12px;">
            <strong>Price:</strong>
            ${formatNaira(product.price)}
            ${escapeHTML(product.unit)}
        </p>
        <p style="margin-top: 8px;">
            <strong>Location:</strong>
            ${escapeHTML(product.location)}
        </p>
        <p style="margin-top: 8px;">
            <strong>Seller:</strong>
            ${escapeHTML(product.seller)}
        </p>
        <p class="modal-note">
            This is a demonstration listing. Its availability
            and seller details have not been independently verified.
        </p>
    `
);

}

/* 12. SELLER CONTACT */

function contactSeller(productId) {
const product = products.find(function (item) {
return item.id === productId;
});

if (!product) {
    showToast("This product could not be found.", "error");
    return;
}
openModal(
    "Contact Seller",
    `
        <p>
            You selected <strong>${escapeHTML(product.title)}</strong>.
        </p>
        <p style="margin-top: 12px;">
            Seller: ${escapeHTML(product.seller)}
        </p>
        <p style="margin-top: 12px;">
            Location: ${escapeHTML(product.location)}
        </p>
        <p class="modal-note">
            Seller messaging has not been connected yet.
            No message has been sent.
        </p>
        <button
            class="button button-primary"
            id="contactNoticeButton"
            type="button"
            style="margin-top: 20px;"
        >
            Understood
        </button>
    `
);
const noticeButton = getElement("contactNoticeButton");
if (noticeButton) {
    noticeButton.addEventListener("click", closeModal);
}

}

/* 13. DEMO LOGIN AND REGISTRATION */

function showLoginModal() {
openModal(
“Welcome back”,
`
Sign-in functionality will be connected to Firebase
in the next integration stage.
        <p class="modal-note">
            This demo form does not authenticate users or protect
            an account.
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
            <button class="button button-primary" type="submit">
                Continue
            </button>
        </form>
    `
);
const form = getElement("demoLoginForm");
if (form) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        showToast(
            "Demo only: Firebase sign-in has not been connected.",
            "error"
        );
    });
}

}

function showRegisterModal() {
openModal(
“Join POULTRYLINK”,
`
Create an account to prepare for buying or selling
poultry products.
        <p class="modal-note">
            Registration is not active yet. This form does not
            create an account or store your password.
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
            <button class="button button-primary" type="submit">
                Continue
            </button>
        </form>
    `
);
const form = getElement("demoRegisterForm");
if (form) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        showToast(
            "Demo only: Firebase registration has not been connected.",
            "error"
        );
    });
}

}

/* 14. SELLER PROMOTION BUTTONS */

function showSellerInformation() {
openModal(
“Start selling on POULTRYLINK”,
`
The seller dashboard is not connected yet.
The production version will allow sellers to manage
their storefronts and product listings.
        <p class="modal-note">
            No seller account has been created.
        </p>
        <button
            class="button button-primary"
            id="sellerRegisterButton"
            type="button"
            style="margin-top: 20px;"
        >
            Explore Registration
        </button>
    `
);
const button = getElement("sellerRegisterButton");
if (button) {
    button.addEventListener("click", showRegisterModal);
}

}

function initializeAccountButtons() {
const loginButton = getElement(“loginButton”);
const registerButton = getElement(“registerButton”);
const becomeSellerButton = getElement(“becomeSellerButton”);
const footerSellerButton = getElement(“footerSellerButton”);

if (loginButton) {
    loginButton.addEventListener("click", showLoginModal);
}
if (registerButton) {
    registerButton.addEventListener("click", showRegisterModal);
}
if (becomeSellerButton) {
    becomeSellerButton.addEventListener("click", showSellerInformation);
}
if (footerSellerButton) {
    footerSellerButton.addEventListener("click", showSellerInformation);
}

}

/* 15. PRODUCT ACTIONS */

function initializeProductActions() {
const productGrid = getElement(“productGrid”);

if (!productGrid) {
    return;
}
productGrid.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");
    if (!button || !productGrid.contains(button)) {
        return;
    }
    const action = button.dataset.action;
    const productId = button.dataset.productId;
    if (action === "view-product") {
        showProductDetails(productId);
    }
    if (action === "contact-seller") {
        contactSeller(productId);
    }
});

}

/* 16. FOOTER YEAR */

function initializeFooter() {
const yearElement = getElement(“currentYear”);

if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
}

}

/* 17. CHECK REQUIRED HTML ELEMENTS */

function checkRequiredElements() {
const requiredIds = [
“menuToggle”,
“mainNav”,
“searchForm”,
“searchInput”,
“categoryFilter”,
“sortFilter”,
“productGrid”,
“productCount”,
“modalBackdrop”,
“modalContent”,
“modalClose”,
“toastContainer”
];

const missingIds = requiredIds.filter(function (id) {
    return !getElement(id);
});
if (missingIds.length > 0) {
    console.error(
        "POULTRYLINK: Missing HTML elements:",
        missingIds.join(", ")
    );
    return false;
}
console.info("POULTRYLINK: Required HTML elements are present.");
return true;

}

/* 18. APPLICATION STARTUP */

function initializePoultryLink() {
console.info(“POULTRYLINK: Starting application.”);

checkRequiredElements();
initializeSearch();
initializeFilters();
initializeMobileNavigation();
initializeModalControls();
initializeAccountButtons();
initializeProductActions();
initializeFooter();
updateActiveCategories();
renderProducts();
console.info("POULTRYLINK: Frontend demo is ready.");

}

if (document.readyState === “loading”) {
document.addEventListener(
“DOMContentLoaded”,
initializePoultryLink,
{ once: true }
);
} else {
initializePoultryLink();
}