/* ============================================================
   POULTRYLINK NIGERIA
   Main application JavaScript
   Version: 1.0.0

   Frontend demonstration using localStorage.

   Production requirements:
   - Secure backend authentication
   - Shared database
   - Server-side product validation
   - Payment provider integration
   - Server-side order processing
   - Real notification service
============================================================ */

"use strict";

/* ============================================================
   1. CONFIGURATION
============================================================ */

const PoultryLink = {
    name: "PoultryLink",
    version: "1.0.0",
    currency: "NGN",
    locale: "en-NG",

    storage: {
        products: "poultrylink_products_v1",
        users: "poultrylink_users_v1",
        session: "poultrylink_session_v1",
        cart: "poultrylink_cart_v1",
        orders: "poultrylink_orders_v1",
        saved: "poultrylink_saved_v1",
        activity: "poultrylink_activity_v1",
        notifications: "poultrylink_notifications_v1",
        profiles: "poultrylink_profiles_v1",
        storefronts: "poultrylink_storefronts_v1"
    }
};

const $ = (selector, root = document) =>
    root.querySelector(selector);

const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

const getElement = id => document.getElementById(id);

const safeText = value =>
    String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );

const makeId = prefix =>
    `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`;

const now = () => new Date().toISOString();

const money = amount =>
    new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        console.warn("PoultryLink storage read failed:", error);
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("PoultryLink storage write failed:", error);
        showToast("Unable to save data on this device.");
        return false;
    }
}

function escapeAttribute(value) {
    return safeText(value);
}

/* ============================================================
   2. APPLICATION STATE
============================================================ */

const state = {
    products: [],
    users: [],
    session: null,
    cart: [],
    orders: [],
    saved: [],
    activity: [],
    notifications: [],
    profiles: {},
    storefronts: {},

    authMode: "login",
    currentProduct: null,
    search: "",
    category: "all",
    location: "all",
    sort: "newest",
    dashboardTab: "overview"
};

function loadState() {
    state.products = readStorage(
        PoultryLink.storage.products,
        []
    );

    state.users = readStorage(
        PoultryLink.storage.users,
        []
    );

    state.session = readStorage(
        PoultryLink.storage.session,
        null
    );

    state.cart = readStorage(
        PoultryLink.storage.cart,
        []
    );

    state.orders = readStorage(
        PoultryLink.storage.orders,
        []
    );

    state.saved = readStorage(
        PoultryLink.storage.saved,
        []
    );

    state.activity = readStorage(
        PoultryLink.storage.activity,
        []
    );

    state.notifications = readStorage(
        PoultryLink.storage.notifications,
        []
    );

    state.profiles = readStorage(
        PoultryLink.storage.profiles,
        {}
    );

    state.storefronts = readStorage(
        PoultryLink.storage.storefronts,
        {}
    );

    if (!Array.isArray(state.products)) state.products = [];
    if (!Array.isArray(state.users)) state.users = [];
    if (!Array.isArray(state.cart)) state.cart = [];
    if (!Array.isArray(state.orders)) state.orders = [];
    if (!Array.isArray(state.saved)) state.saved = [];
    if (!Array.isArray(state.activity)) state.activity = [];
    if (!Array.isArray(state.notifications)) {
        state.notifications = [];
    }

    if (
        state.session &&
        typeof state.session !== "object"
    ) {
        state.session = null;
    }

    if (state.session && !state.session.id) {
        state.session = null;
    }
}

function saveProducts() {
    return writeStorage(
        PoultryLink.storage.products,
        state.products
    );
}

function saveUsers() {
    return writeStorage(
        PoultryLink.storage.users,
        state.users
    );
}

function saveCart() {
    return writeStorage(
        PoultryLink.storage.cart,
        state.cart
    );
}

function saveOrders() {
    return writeStorage(
        PoultryLink.storage.orders,
        state.orders
    );
}

function saveSaved() {
    return writeStorage(
        PoultryLink.storage.saved,
        state.saved
    );
}

function saveActivity() {
    return writeStorage(
        PoultryLink.storage.activity,
        state.activity
    );
}

function saveNotifications() {
    return writeStorage(
        PoultryLink.storage.notifications,
        state.notifications
    );
}

/* ============================================================
   3. DEMONSTRATION PRODUCTS
============================================================ */

const demoProducts = [
    {
        id: "demo_eggs_001",
        title: "Fresh Farm Eggs",
        category: "eggs",
        price: 5500,
        quantity: 20,
        unit: "crate",
        state: "Lagos",
        town: "Ikeja",
        condition: "Fresh",
        status: "active",
        emoji: "🥚",
        description:
            "Fresh eggs collected from a poultry farm. Suitable for homes, shops, restaurants, and retailers.",
        sellerId: "demo_seller_001",
        sellerName: "Greenfield Poultry Farm",
        sellerPhone: "",
        createdAt: "2026-10-01T09:00:00.000Z"
    },
    {
        id: "demo_layers_001",
        title: "Point-of-Lay Pullets",
        category: "layers",
        price: 12500,
        quantity: 100,
        unit: "bird",
        state: "Ogun",
        town: "Abeokuta",
        condition: "Healthy",
        status: "active",
        emoji: "🐔",
        description:
            "Point-of-lay pullets for farmers preparing to start or expand egg production.",
        sellerId: "demo_seller_002",
        sellerName: "Sunrise Poultry",
        sellerPhone: "",
        createdAt: "2026-10-02T09:00:00.000Z"
    },
    {
        id: "demo_broilers_001",
        title: "Broiler Chickens",
        category: "broilers",
        price: 6500,
        quantity: 50,
        unit: "bird",
        state: "Oyo",
        town: "Ibadan",
        condition: "Healthy",
        status: "active",
        emoji: "🐓",
        description:
            "Broiler chickens available for poultry farmers and meat producers.",
        sellerId: "demo_seller_003",
        sellerName: "Royal Feathers Farm",
        sellerPhone: "",
        createdAt: "2026-10-03T09:00:00.000Z"
    },
    {
        id: "demo_feed_001",
        title: "Quality Poultry Feed",
        category: "feed",
        price: 24500,
        quantity: 30,
        unit: "bag",
        state: "Lagos",
        town: "Ikorodu",
        condition: "New",
        status: "active",
        emoji: "🌾",
        description:
            "Poultry feed for farm use. Contact the seller to confirm the feed type and bag weight.",
        sellerId: "demo_seller_004",
        sellerName: "Farmers Choice Supplies",
        sellerPhone: "",
        createdAt: "2026-10-04T09:00:00.000Z"
    },
    {
        id: "demo_chicks_001",
        title: "Day-Old Chicks",
        category: "chicks",
        price: 1800,
        quantity: 200,
        unit: "chick",
        state: "Oyo",
        town: "Ogbomoso",
        condition: "Healthy",
        status: "active",
        emoji: "🐣",
        description:
            "Day-old chicks for poultry farmers. Confirm breed, vaccination, and availability with the seller.",
        sellerId: "demo_seller_005",
        sellerName: "New Dawn Hatchery",
        sellerPhone: "",
        createdAt: "2026-10-05T09:00:00.000Z"
    },
    {
        id: "demo_equipment_001",
        title: "Poultry Feeding Equipment",
        category: "equipment",
        price: 8500,
        quantity: 15,
        unit: "piece",
        state: "Lagos",
        town: "Agege",
        condition: "New",
        status: "active",
        emoji: "🧰",
        description:
            "Poultry feeding equipment for small and medium-sized farms.",
        sellerId: "demo_seller_006",
        sellerName: "Farm Equipment Hub",
        sellerPhone: "",
        createdAt: "2026-10-06T09:00:00.000Z"
    }
];

function initializeProducts() {
    if (state.products.length === 0) {
        state.products = demoProducts.map(product => ({
            ...product
        }));

        saveProducts();
    }
}

/* ============================================================
   4. TOASTS AND MESSAGES
============================================================ */

function showToast(message, type = "success") {
    const region = getElement("toastRegion");

    if (!region) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `pl-toast pl-toast-${type}`;
    toast.textContent = message;
    toast.setAttribute("role", "status");

    region.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("is-visible");
    });

    setTimeout(() => {
        toast.classList.remove("is-visible");

        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showMessage(title, message) {
    const dialog = getElement("messageDialog");

    if (
        !dialog ||
        !getElement("messageDialogTitle") ||
        !getElement("messageDialogText")
    ) {
        showToast(`${title}: ${message}`, "info");
        return;
    }

    getElement("messageDialogTitle").textContent = title;
    getElement("messageDialogText").textContent = message;

    const icon = getElement("messageDialogIcon");

    if (icon) icon.textContent = "ℹ️";

    openDialog(dialog);
}

/* ============================================================
   5. DIALOG HELPERS
============================================================ */

function openDialog(dialog) {
    if (!dialog) return;

    try {
        if (typeof dialog.showModal === "function") {
            if (!dialog.open) dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
            dialog.hidden = false;
        }
    } catch (error) {
        dialog.setAttribute("open", "");
        dialog.hidden = false;
    }
}

function closeDialog(dialog) {
    if (!dialog) return;

    try {
        if (
            typeof dialog.close === "function" &&
            dialog.open
        ) {
            dialog.close();
        } else {
            dialog.removeAttribute("open");
            dialog.hidden = true;
        }
    } catch (error) {
        dialog.removeAttribute("open");
        dialog.hidden = true;
    }
}

function closeAllDialogs() {
    $$("dialog[open]").forEach(closeDialog);
}

document.addEventListener("click", event => {
    const closeButton = event.target.closest(
        "[data-close-dialog]"
    );

    if (closeButton) {
        const dialog = closeButton.closest("dialog");

        if (dialog) closeDialog(dialog);
    }
});

$$("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
        if (event.target === dialog) {
            closeDialog(dialog);
        }
    });
});

/* ============================================================
   6. ACTIVITY AND NOTIFICATIONS
============================================================ */

function addActivity(message, type = "general") {
    state.activity.unshift({
        id: makeId("activity"),
        message,
        type,
        createdAt: now(),
        userId: state.session?.id || null
    });

    state.activity = state.activity.slice(0, 100);

    saveActivity();

    renderActivity();
    renderDashboardStats();
}

function addNotification(title, message) {
    state.notifications.unshift({
        id: makeId("notification"),
        title,
        message,
        read: false,
        createdAt: now(),
        userId: state.session?.id || null
    });

    state.notifications = state.notifications.slice(0, 100);

    saveNotifications();

    renderNotifications();
    updateNotificationCount();
}

/* ============================================================
   7. AUTHENTICATION DEMO
============================================================ */

/*
   IMPORTANT:
   This is a browser-only demonstration, not secure
   authentication. Never use browser storage as the authority
   for production account authentication or authorization.

   No passwords are persisted by this implementation.
*/

function getCurrentUser() {
    if (!state.session) return null;

    return state.session;
}

function openAuth(mode = "login") {
    state.authMode = mode;

    updateAuthMode();

    const dialog = getElement("authDialog");

    if (!dialog) {
        showToast("The account dialog is unavailable.", "error");
        return;
    }

    renderAuthState();
    openDialog(dialog);
}

function updateAuthMode() {
    const login = getElement("loginModeButton");
    const register = getElement("registerModeButton");

    if (login) {
        login.classList.toggle(
            "active",
            state.authMode === "login"
        );
    }

    if (register) {
        register.classList.toggle(
            "active",
            state.authMode === "register"
        );
    }

    const registerMode = state.authMode === "register";

    const title = $("#authDialog h2");

    if (title) {
        title.textContent = registerMode
            ? "Create your PoultryLink account"
            : "Welcome back";
    }

    const nameField = getElement("authNameField");
    const confirmField = getElement(
        "authConfirmPasswordField"
    );
    const accountField = getElement("authAccountTypeField");
    const termsField = getElement("authTermsField");
    const loginExtra = getElement("authLoginExtra");
    const submit = getElement("authSubmitButton");

    if (nameField) nameField.hidden = !registerMode;

    if (confirmField) {
        confirmField.hidden = !registerMode;
    }

    if (accountField) {
        accountField.hidden = !registerMode;
    }

    if (termsField) termsField.hidden = !registerMode;

    if (loginExtra) loginExtra.hidden = registerMode;

    if (submit) {
        submit.textContent = registerMode
            ? "Create account"
            : "Sign in";
    }

    const error = getElement("authError");

    if (error) error.textContent = "";
}

function renderAuthState() {
    const user = getCurrentUser();

    const form = getElement("authForm");
    const signedIn = getElement("authSignedInState");

    if (user) {
        if (form) form.hidden = true;
        if (signedIn) signedIn.hidden = false;

        const email = getElement("authSignedInEmail");

        if (email) email.textContent = user.email || "";

        return;
    }

    if (form) form.hidden = false;
    if (signedIn) signedIn.hidden = true;
}

function findDemoUser(email) {
    return state.users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase()
    );
}

function handleAuthSubmit(event) {
    event.preventDefault();

    const error = getElement("authError");

    const showError = message => {
        if (error) error.textContent = message;
        else showToast(message, "error");
    };

    const email = (
        getElement("authEmail")?.value || ""
    ).trim().toLowerCase();

    const password = getElement("authPassword")?.value || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("Enter a valid email address.");
        return;
    }

    if (password.length < 6) {
        showError("Enter a password with at least 6 characters.");
        return;
    }

    if (state.authMode === "register") {
        const name = (
            getElement("authDisplayName")?.value || ""
        ).trim();

        const confirmPassword =
            getElement("authConfirmPassword")?.value || "";

        const accountType =
            getElement("authAccountType")?.value || "buyer";

        const acceptedTerms =
            getElement("acceptTermsCheckbox")?.checked;

        if (!name) {
            showError("Enter your name.");
            return;
        }

        if (password !== confirmPassword) {
            showError("Your passwords do not match.");
            return;
        }

        if (!acceptedTerms) {
            showError("Please accept the terms to continue.");
            return;
        }

        if (findDemoUser(email)) {
            showError(
                "An account with this email already exists in this browser."
            );
            return;
        }

        /*
           Demo accounts do not persist passwords.
           Registering creates a local demo session only.
           Real registration must be handled by a backend.
        */

        const user = {
            id: makeId("user"),
            name,
            email,
            accountType,
            createdAt: now()
        };

        state.users.push({
            ...user,
            demoAccount: true
        });

        saveUsers();

        signInDemo(user);

        closeDialog(getElement("authDialog"));

        showToast("Demo account created successfully.");

        return;
    }

    const existing = findDemoUser(email);

    if (!existing) {
        showError(
            "No demo account was found for this email. Create a demo account first."
        );
        return;
    }

    /*
       Because passwords are not stored, this demo cannot
       verify an existing password after the page reloads.
       A production login endpoint is required for that.
    */

    showError(
        "This frontend demo cannot verify passwords. Connect a secure authentication backend to enable real sign-in."
    );
}

function signInDemo(user) {
    state.session = {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.accountType || "buyer",
        signedInAt: now()
    };

    writeStorage(
        PoultryLink.storage.session,
        state.session
    );

    addActivity("Signed in to the demo account.", "account");

    updateHeaderUser();
    renderAuthState();
    renderDashboard();
}

function signOut() {
    state.session = null;

    localStorage.removeItem(PoultryLink.storage.session);

    closeAllDialogs();

    updateHeaderUser();
    renderAuthState();
    renderDashboard();

    showToast("You have signed out.");
}

function updateHeaderUser() {
    const user = getCurrentUser();

    const name = getElement("headerUserName");
    const avatar = getElement("headerUserAvatar");

    if (name) {
        name.textContent = user
            ? user.name
            : "Guest";
    }

    if (avatar) {
        avatar.textContent = user
            ? user.name.charAt(0).toUpperCase()
            : "G";
    }

    const signIn = getElement("signInButton");

    if (signIn) {
        signIn.textContent = user ? "My account" : "Sign in";
    }
}

/* ============================================================
   8. MARKETPLACE SEARCH AND FILTERS
============================================================ */

function getCategories() {
    return [
        "eggs",
        "layers",
        "broilers",
        "chicks",
        "feed",
        "equipment",
        "manure",
        "services"
    ];
}

function getFilteredProducts() {
    const query = state.search.toLowerCase().trim();

    let products = state.products.filter(product => {
        if (product.status !== "active") return false;

        const matchesQuery =
            !query ||
            [
                product.title,
                product.description,
                product.category,
                product.state,
                product.town,
                product.sellerName
            ]
                .join(" ")
                .toLowerCase()
                .includes(query);

        const matchesCategory =
            state.category === "all" ||
            product.category === state.category;

        const matchesLocation =
            state.location === "all" ||
            product.state === state.location;

        return (
            matchesQuery &&
            matchesCategory &&
            matchesLocation
        );
    });

    switch (state.sort) {
        case "price-low":
            products.sort((a, b) => a.price - b.price);
            break;

        case "price-high":
            products.sort((a, b) => b.price - a.price);
            break;

        case "name":
            products.sort((a, b) =>
                a.title.localeCompare(b.title)
            );
            break;

        case "newest":
        default:
            products.sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );
    }

    return products;
}

function renderCategoryChips() {
    $$("#categoryChips [data-category]").forEach(button => {
        const category = button.dataset.category || "all";

        button.classList.toggle(
            "active",
            category === state.category
        );

        button.setAttribute(
            "aria-pressed",
            String(category === state.category)
        );
    });
}

function renderMarketplace() {
    const grid = getElement("listingGrid");

    if (!grid) return;

    const products = getFilteredProducts();

    const count = getElement("resultsCount");
    const emptyState = getElement("emptyState");

    if (count) {
        count.textContent =
            `${products.length} product${products.length === 1 ? "" : "s"} found`;
    }

    if (emptyState) {
        emptyState.hidden = products.length !== 0;
    }

    grid.innerHTML = products.map(renderProductCard).join("");

    renderCategoryChips();
}

function renderProductCard(product) {
    const saved = state.saved.includes(product.id);

    const isOwner =
        state.session &&
        product.sellerId === state.session.id;

    return `
        <article class="product-card"
            data-product-id="${escapeAttribute(product.id)}">

            <div class="product-card-image">
                <span class="product-emoji">
                    ${safeText(product.emoji || "🐔")}
                </span>

                <button
                    type="button"
                    class="save-product-button ${saved ? "is-saved" : ""}"
                    data-save-product="${escapeAttribute(product.id)}"
                    aria-label="${saved ? "Remove saved product" : "Save product"}"
                    aria-pressed="${saved}">
                    ${saved ? "♥" : "♡"}
                </button>
            </div>

            <div class="product-card-content">
                <span class="product-category">
                    ${safeText(product.category)}
                </span>

                <h3>${safeText(product.title)}</h3>

                <p class="product-location">
                    📍 ${safeText(product.town || "")}
                    ${product.town ? ", " : ""}
                    ${safeText(product.state || "")}
                </p>

                <p class="product-price">
                    ${money(product.price)}
                    <small>/ ${safeText(product.unit || "unit")}</small>
                </p>

                <p class="product-quantity">
                    ${Number(product.quantity) || 0}
                    ${safeText(product.unit || "units")} available
                </p>

                <p class="product-seller">
                    ${safeText(product.sellerName || "PoultryLink seller")}
                </p>

                <div class="product-card-actions">
                    <button
                        type="button"
                        class="button button-secondary"
                        data-view-product="${escapeAttribute(product.id)}">
                        View details
                    </button>

                    ${
                        isOwner
                            ? `<button type="button" class="button button-secondary" disabled>Your listing</button>`
                            : `<button type="button" class="button button-primary" data-add-cart="${escapeAttribute(product.id)}">Add to cart</button>`
                    }
                </div>
            </div>
        </article>
    `;
}

/* ============================================================
   9. PRODUCT DETAILS
============================================================ */

function showProductDetails(productId) {
    const product = state.products.find(
        item => item.id === productId
    );

    if (!product) {
        showToast("Product not found.", "error");
        return;
    }

    state.currentProduct = product;

    const title = getElement("productDetailsDialogTitle");
    const content = getElement("productDetailsContent");

    if (!title || !content) {
        showToast(product.title);
        return;
    }

    title.textContent = product.title;

    content.innerHTML = `
        <div class="product-detail">
            <div class="product-detail-emoji">
                ${safeText(product.emoji || "🐔")}
            </div>

            <h2>${safeText(product.title)}</h2>

            <p class="product-price">${money(product.price)}
                <small>/ ${safeText(product.unit || "unit")}</small>
            </p>

            <p><strong>Category:</strong>
                ${safeText(product.category)}</p>

            <p><strong>Available quantity:</strong>
                ${Number(product.quantity) || 0}
                ${safeText(product.unit || "units")}</p>

            <p><strong>Location:</strong>
                ${safeText(product.town || "")}
                ${product.town ? ", " : ""}
                ${safeText(product.state || "")}</p>

            <p><strong>Condition:</strong>
                ${safeText(product.condition || "Not specified")}</p>

            <p><strong>Seller:</strong>
                ${safeText(product.sellerName || "Seller")}</p>

            <p>${safeText(product.description || "")}</p>

            <div class="product-detail-actions">
                <button type="button"
                    class="button button-primary"
                    data-add-cart="${escapeAttribute(product.id)}">
                    Add to cart
                </button>

                <button type="button"
                    class="button button-secondary"
                    data-view-seller="${escapeAttribute(product.sellerId || "")}">
                    View seller
                </button>
            </div>
        </div>
    `;

    openDialog(getElement("productDetailsDialog"));
}

/* ============================================================
   10. SAVED PRODUCTS
============================================================ */

function toggleSavedProduct(productId) {
    const index = state.saved.indexOf(productId);

    if (index >= 0) {
        state.saved.splice(index, 1);
        showToast("Product removed from saved items.");
    } else {
        state.saved.push(productId);
        showToast("Product saved.");
    }

    saveSaved();

    renderMarketplace();
    renderSavedProducts();
}

function renderSavedProducts() {
    const grid = getElement("savedProductsGrid");

    if (!grid) return;

    const products = state.saved
        .map(id => state.products.find(product => product.id === id))
        .filter(Boolean);

    if (!products.length) {
        grid.innerHTML = `
            <p class="empty-message">
                You haven't saved any products yet.
            </p>
        `;
        return;
    }

    grid.innerHTML = products
        .map(renderProductCard)
        .join("");
}

/* ============================================================
   11. SHOPPING CART
============================================================ */

function getCartProduct(productId) {
    return state.products.find(
        product => product.id === productId
    );
}

function addToCart(productId) {
    const product = getCartProduct(productId);

    if (!product || product.status !== "active") {
        showToast("This product is unavailable.", "error");
        return;
    }

    if (
        state.session &&
        product.sellerId === state.session.id
    ) {
        showToast(
            "You cannot purchase your own listing.",
            "error"
        );
        return;
    }

    const existing = state.cart.find(
        item => item.productId === productId
    );

    const quantityInCart = existing
        ? existing.quantity
        : 0;

    if (quantityInCart >= Number(product.quantity)) {
        showToast("No more stock is available.", "error");
        return;
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({
            productId,
            quantity: 1
        });
    }

    saveCart();

    renderCart();
    updateCartCount();

    showToast("Added to cart.");
}

function updateCartQuantity(productId, change) {
    const item = state.cart.find(
        cartItem => cartItem.productId === productId
    );

    const product = getCartProduct(productId);

    if (!item || !product) return;

    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
        state.cart = state.cart.filter(
            cartItem => cartItem.productId !== productId
        );
    } else if (newQuantity > Number(product.quantity)) {
        showToast("That quantity exceeds available stock.", "error");
        return;
    } else {
        item.quantity = newQuantity;
    }

    saveCart();

    renderCart();
    updateCartCount();
}

function removeCartItem(productId) {
    state.cart = state.cart.filter(
        item => item.productId !== productId
    );

    saveCart();

    renderCart();
    updateCartCount();
}

function clearCart() {
    state.cart = [];

    saveCart();

    renderCart();
    updateCartCount();

    showToast("Cart cleared.");
}

function getCartTotals() {
    let subtotal = 0;

    for (const item of state.cart) {
        const product = getCartProduct(item.productId);

        if (!product) continue;

        subtotal += product.price * item.quantity;
    }

    return {
        subtotal,
        total: subtotal
    };
}

function renderCart() {
    const container = getElement("cartItems");

    if (!container) return;

    const validItems = state.cart.filter(item =>
        getCartProduct(item.productId)
    );

    if (!validItems.length) {
        container.innerHTML = `
            <p class="empty-message">
                Your cart is empty. Browse the marketplace to find products.
            </p>
        `;
    } else {
        container.innerHTML = validItems.map(item => {
            const product = getCartProduct(item.productId);

            return `
                <div class="cart-item">
                    <div class="cart-item-emoji">
                        ${safeText(product.emoji || "🐔")}
                    </div>

                    <div class="cart-item-details">
                        <h3>${safeText(product.title)}</h3>

                        <p>${money(product.price)} per
                            ${safeText(product.unit || "unit")}</p>

                        <div class="cart-quantity-controls">
                            <button type="button"
                                data-cart-decrease="${escapeAttribute(product.id)}"
                                aria-label="Decrease quantity">−</button>

                            <span>${item.quantity}</span>

                            <button type="button"
                                data-cart-increase="${escapeAttribute(product.id)}"
                                aria-label="Increase quantity">+</button>
                        </div>
                    </div>

                    <div class="cart-item-total">
                        ${money(product.price * item.quantity)}

                        <button type="button"
                            data-cart-remove="${escapeAttribute(product.id)}">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    const totals = getCartTotals();

    const subtotal = getElement("cartSubtotal");
    const total = getElement("cartTotal");

    if (subtotal) subtotal.textContent = money(totals.subtotal);
    if (total) total.textContent = money(totals.total);
}

function updateCartCount() {
    const count = state.cart.reduce(
        (total, item) => total + item.quantity,
        0
    );

    ["cartCount"].forEach(id => {
        const element = getElement(id);

        if (element) element.textContent = String(count);
    });

    const mobileCart = getElement("mobileCartButton");

    if (mobileCart) {
        mobileCart.setAttribute(
            "aria-label",
            `Shopping cart, ${count} items`
        );
    }
}

/* ============================================================
   12. CHECKOUT DEMONSTRATION
============================================================ */

function renderCheckoutSummary() {
    const container = getElement("checkoutOrderSummary");

    if (!container) return;

    const totals = getCartTotals();

    const rows = state.cart.map(item => {
        const product = getCartProduct(item.productId);

        if (!product) return "";

        return `
            <div class="checkout-summary-row">
                <span>
                    ${safeText(product.title)}
                    × ${item.quantity}
                </span>

                <strong>
                    ${money(product.price * item.quantity)}
                </strong>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        ${rows}

        <div class="checkout-summary-total">
            <span>Total</span>
            <strong>${money(totals.total)}</strong>
        </div>

        <p>
            This demonstration does not collect payment.
            Payment processing is not connected.
        </p>
    `;
}

function placeDemoOrder(event) {
    event.preventDefault();

    const error = getElement("checkoutError");

    const showError = message => {
        if (error) error.textContent = message;
        else showToast(message, "error");
    };

    if (!state.cart.length) {
        showError("Your cart is empty.");
        return;
    }

    const buyerName = (
        getElement("checkoutBuyerName")?.value || ""
    ).trim();

    const buyerPhone = (
        getElement("checkoutBuyerPhone")?.value || ""
    ).trim();

    const address = (
        getElement("checkoutDeliveryAddress")?.value || ""
    ).trim();

    const note = (
        getElement("checkoutBuyerNote")?.value || ""
    ).trim();

    if (!buyerName || !buyerPhone || !address) {
        showError(
            "Enter your name, phone number, and delivery address."
        );
        return;
    }

    const items = [];

    for (const cartItem of state.cart) {
        const product = getCartProduct(cartItem.productId);

        if (!product || product.status !== "active") {
            showError(
                "A product in your cart is no longer available."
            );
            return;
        }

        if (cartItem.quantity > Number(product.quantity)) {
            showError(
                `The available quantity for ${product.title} has changed.`
            );
            return;
        }

        items.push({
            productId: product.id,
            title: product.title,
            sellerId: product.sellerId,
            sellerName: product.sellerName,
            price: product.price,
            quantity: cartItem.quantity,
            unit: product.unit
        });
    }

    const totals = getCartTotals();

    const order = {
        id: makeId("order"),
        reference: `PL-${Date.now().toString().slice(-8)}`,
        buyerId: state.session?.id || null,
        buyerName,
        buyerPhone,
        deliveryAddress: address,
        note,
        items,
        subtotal: totals.subtotal,
        total: totals.total,
        status: "pending",
        createdAt: now(),
        paymentStatus: "not_processed"
    };

    state.orders.unshift(order);

    saveOrders();

    /*
       No stock is deducted here because this is a local
       demonstration. Real stock updates must be atomic and
       performed on the server.
    */

    state.cart = [];

    saveCart();

    addActivity(
        `Demo order ${order.reference} was created.`,
        "order"
    );

    addNotification(
        "Demo order created",
        `Order ${order.reference} has been saved on this device.`
    );

    renderCart();
    updateCartCount();
    renderDashboard();

    closeDialog(getElement("checkoutDialog"));
    closeDialog(getElement("cartDialog"));

    showMessage(
        "Demo order created",
        `Your reference is ${order.reference}. This is not a confirmed paid order. No payment was processed.`
    );

    getElement("checkoutForm")?.reset();
}

/* ============================================================
   13. PRODUCT LISTING FORM
============================================================ */

function openListingForm(productId = null) {
    if (!getCurrentUser()) {
        showMessage(
            "Sign in required",
            "Create a demo account or connect authentication before managing listings."
        );
        openAuth("register");
        return;
    }

    const form = getElement("listingForm");

    if (!form) {
        showToast("The listing form is unavailable.", "error");
        return;
    }

    form.reset();

    const product = productId
        ? state.products.find(item => item.id === productId)
        : null;

    const error = getElement("listingFormError");

    if (error) error.textContent = "";

    if (product) {
        if (product.sellerId !== state.session.id) {
            showToast(
                "You can only edit your own listings.",
                "error"
            );
            return;
        }

        setFieldValue("listingId", product.id);
        setFieldValue("listingTitle", product.title);
        setFieldValue("listingCategory", product.category);
        setFieldValue("listingPrice", product.price);
        setFieldValue("listingQuantity", product.quantity);
        setFieldValue("listingUnit", product.unit);
        setFieldValue("listingState", product.state);
        setFieldValue("listingTown", product.town);
        setFieldValue("listingCondition", product.condition);
        setFieldValue("listingStatus", product.status);
        setFieldValue("listingEmoji", product.emoji);
        setFieldValue(
            "listingDescription",
            product.description
        );
    } else {
        setFieldValue("listingId", "");
        setFieldValue("listingStatus", "active");
        setFieldValue("listingEmoji", "🐔");
    }

    updateDescriptionCount(
        "listingDescription",
        "listingDescriptionCount",
        1000
    );

    openDialog(getElement("productFormDialog"));
}

function setFieldValue(id, value) {
    const element = getElement(id);

    if (element) element.value = value ?? "";
}

function saveListing(event) {
    event.preventDefault();

    const error = getElement("listingFormError");

    const showError = message => {
        if (error) error.textContent = message;
        else showToast(message, "error");
    };

    const user = getCurrentUser();

    if (!user) {
        showError("Sign in before creating a listing.");
        return;
    }

    const id = (
        getElement("listingId")?.value || ""
    ).trim();

    const title = (
        getElement("listingTitle")?.value || ""
    ).trim();

    const category =
        getElement("listingCategory")?.value || "";

    const price = Number(
        getElement("listingPrice")?.value
    );

    const quantity = Number(
        getElement("listingQuantity")?.value
    );

    const unit =
        getElement("listingUnit")?.value || "unit";

    const productState =
        getElement("listingState")?.value || "";

    const town = (
        getElement("listingTown")?.value || ""
    ).trim();

    const condition =
        getElement("listingCondition")?.value || "";

    const status =
        getElement("listingStatus")?.value || "active";

    const emoji =
        getElement("listingEmoji")?.value || "🐔";

    const description = (
        getElement("listingDescription")?.value || ""
    ).trim();

    if (!title) {
        showError("Enter a product title.");
        return;
    }

    if (!getCategories().includes(category)) {
        showError("Select a valid product category.");
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        showError("Enter a valid price greater than zero.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showError("Enter a whole-number quantity greater than zero.");
        return;
    }

    if (!productState) {
        showError("Select a state.");
        return;
    }

    if (description.length > 1000) {
        showError("Description must be 1,000 characters or fewer.");
        return;
    }

    const existing = id
        ? state.products.find(product => product.id === id)
        : null;

    if (existing && existing.sellerId !== user.id) {
        showError("You cannot edit another seller's listing.");
        return;
    }

    const product = {
        id: existing ? existing.id : makeId("product"),
        title,
        category,
        price,
        quantity,
        unit,
        state: productState,
        town,
        condition,
        status: ["active", "inactive", "sold"].includes(status)
            ? status
            : "active",
        emoji,
        description,
        sellerId: user.id,
        sellerName: user.name,
        sellerPhone:
            state.profiles[user.id]?.phone || "",
        createdAt: existing ? existing.createdAt : now(),
        updatedAt: now()
    };

    if (existing) {
        state.products = state.products.map(item =>
            item.id === existing.id ? product : item
        );
    } else {
        state.products.unshift(product);
    }

    if (!saveProducts()) return;

    addActivity(
        existing
            ? `Updated listing: ${title}`
            : `Created listing: ${title}`,
        "listing"
    );

    addNotification(
        existing ? "Listing updated" : "Listing created",
        title
    );

    closeDialog(getElement("productFormDialog"));

    renderMarketplace();
    renderDashboard();

    showToast(
        existing
            ? "Listing updated."
            : "Listing created."
    );
}

/* ============================================================
   14. SELLER DIRECTORY AND SELLER PROFILES
============================================================ */

function getSellers() {
    const sellers = new Map();

    state.products.forEach(product => {
        if (!product.sellerId) return;

        if (!sellers.has(product.sellerId)) {
            sellers.set(product.sellerId, {
                id: product.sellerId,
                name: product.sellerName || "Poultry Seller",
                state: product.state || "",
                town: product.town || "",
                productCount: 0
            });
        }

        sellers.get(product.sellerId).productCount++;
    });

    Object.entries(state.profiles).forEach(([id, profile]) => {
        if (!sellers.has(id)) {
            sellers.set(id, {
                id,
                name: profile.displayName || "Poultry Seller",
                state: profile.state || "",
                town: profile.town || "",
                productCount: 0
            });
        }
    });

    return Array.from(sellers.values());
}

function renderSellerDirectory() {
    const grid = getElement("sellerGrid");

    if (!grid) return;

    const sellers = getSellers();

    const empty = getElement("sellerEmptyState");

    if (empty) empty.hidden = sellers.length > 0;

    grid.innerHTML = sellers.map(seller => `
        <article class="seller-card">
            <div class="seller-avatar">
                ${safeText(
                    (seller.name || "S").charAt(0).toUpperCase()
                )}
            </div>

            <h3>${safeText(seller.name)}</h3>

            <p>
                ${safeText(seller.town)}
                ${seller.town ? ", " : ""}
                ${safeText(seller.state)}
            </p>

            <p>${seller.productCount} listed product(s)</p>

            <button type="button"
                class="button button-secondary"
                data-view-seller="${escapeAttribute(seller.id)}">
                View seller
            </button>
        </article>
    `).join("");
}

function showSellerProfile(sellerId) {
    const seller = getSellers().find(
        item => item.id === sellerId
    );

    if (!seller) {
        showToast("Seller profile not found.", "error");
        return;
    }

    const title = getElement("sellerProfileDialogTitle");
    const content = getElement("sellerProfileContent");

    if (!title || !content) {
        showToast(seller.name);
        return;
    }

    title.textContent = seller.name;

    const products = state.products.filter(
        product =>
            product.sellerId === sellerId &&
            product.status === "active"
    );

    const profile = state.profiles[sellerId] || {};

    content.innerHTML = `
        <div class="seller-profile">
            <div class="seller-avatar">
                ${safeText(seller.name.charAt(0).toUpperCase())}
            </div>

            <h2>${safeText(seller.name)}</h2>

            <p>${safeText(seller.town)}
                ${seller.town ? ", " : ""}
                ${safeText(seller.state)}</p>

            <p>${safeText(profile.bio || "")}</p>

            <h3>Available products</h3>

            ${
                products.length
                    ? products.map(product => `
                        <div class="seller-product-row">
                            <span>${safeText(product.title)}</span>
                            <strong>${money(product.price)}</strong>

                            <button type="button"
                                data-view-product="${escapeAttribute(product.id)}">
                                View
                            </button>
                        </div>
                    `).join("")
                    : `<p>No active products listed.</p>`
            }

            ${
                profile.phone
                    ? `<p>Phone: ${safeText(profile.phone)}</p>`
                    : ""
            }
        </div>
    `;

    openDialog(getElement("sellerProfileDialog"));
}

/* ============================================================
   15. DASHBOARD NAVIGATION
============================================================ */

function openDashboard(tab = "overview") {
    if (!getCurrentUser()) {
        openAuth("login");
        return;
    }

    const dashboard = getElement("dashboardPage");

    if (dashboard) {
        dashboard.hidden = false;
    }

    const marketplaceSections = [
        $(".site-header"),
        $("#hero"),
        $("#marketplace"),
        $("#sellerDirectory"),
        $(".seller-cta"),
        $("footer")
    ];

    marketplaceSections.forEach(element => {
        if (element) element.dataset.plHiddenForDashboard = "true";
    });

    /*
       The dashboard's own HTML controls its presentation.
       The helper below restores the marketplace when the
       dashboard back button is pressed.
    */

    state.dashboardTab = tab;

    activateDashboardTab(tab);

    renderDashboard();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function closeDashboard() {
    const dashboard = getElement("dashboardPage");

    if (dashboard) dashboard.hidden = true;

    $$("[data-pl-hidden-for-dashboard]").forEach(element => {
        delete element.dataset.plHiddenForDashboard;
    });

    const marked = $$("[data-pl-hidden-for-dashboard]");

    marked.forEach(element => {
        element.hidden = false;
    });

    /*
       Also restore elements recorded before hiding the
       dashboard, using their original hidden state.
    */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function activateDashboardTab(tab) {
    state.dashboardTab = tab;

    $$(".dashboard-tab").forEach(button => {
        const active =
            button.dataset.dashboardTab === tab;

        button.classList.toggle("active", active);

        button.setAttribute(
            "aria-selected",
            String(active)
        );
    });

    $$(".dashboard-tab-content").forEach(panel => {
        panel.hidden = panel.dataset.panel !== tab;
    });
}

/* ============================================================
   16. DASHBOARD STATISTICS AND ACTIVITY
============================================================ */

function renderDashboardStats() {
    const user = getCurrentUser();

    if (!user) return;

    const myProducts = state.products.filter(
        product => product.sellerId === user.id
    );

    const buyerOrders = state.orders.filter(
        order => order.buyerId === user.id
    );

    const sellerOrders = state.orders.filter(
        order => order.items.some(
            item => item.sellerId === user.id
        )
    );

    setText("dashboardListingsCount", myProducts.length);
    setText("dashboardBuyerOrdersCount", buyerOrders.length);
    setText("dashboardSellerOrdersCount", sellerOrders.length);

    const inventoryCount = myProducts.reduce(
        (total, product) => total + Number(product.quantity || 0),
        0
    );

    setText("dashboardInventoryCount", inventoryCount);
}

function renderActivity() {
    const recent = getElement("dashboardRecentActivity");
    const list = getElement("activityList");

    const user = getCurrentUser();

    let activity = state.activity.filter(
        item => !item.userId || item.userId === user?.id
    );

    const filter = getElement("activityTypeFilter")?.value;

    if (filter && filter !== "all") {
        activity = activity.filter(
            item => item.type === filter
        );
    }

    if (recent) {
        const recentItems = activity.slice(0, 5);

        recent.innerHTML = recentItems.length
            ? recentItems.map(renderActivityItem).join("")
            : `<p>No recent activity yet.</p>`;
    }

    if (list) {
        list.innerHTML = activity.length
            ? activity.map(renderActivityItem).join("")
            : `<p>No activity to show.</p>`;
    }
}

function renderActivityItem(item) {
    return `
        <div class="activity-item">
            <span class="activity-dot"></span>

            <div>
                <p>${safeText(item.message)}</p>

                <small>
                    ${safeText(
                        new Date(item.createdAt).toLocaleString()
                    )}
                </small>
            </div>
        </div>
    `;
}

/* ============================================================
   17. DASHBOARD NOTIFICATIONS
============================================================ */

function renderNotifications() {
    const container = getElement("notificationsList");

    if (!container) return;

    const user = getCurrentUser();

    const notifications = state.notifications.filter(
        item => !item.userId || item.userId === user?.id
    );

    if (!notifications.length) {
        container.innerHTML = `
            <p class="empty-message">
                You're all caught up.
            </p>
        `;
        return;
    }

    container.innerHTML = notifications.map(item => `
        <article class="notification-item ${item.read ? "is-read" : "is-unread"}">
            <div>
                <h3>${safeText(item.title)}</h3>

                <p>${safeText(item.message)}</p>

                <small>
                    ${safeText(
                        new Date(item.createdAt).toLocaleString()
                    )}
                </small>
            </div>

            ${
                item.read
                    ? ""
                    : `<button type="button" data-read-notification="${escapeAttribute(item.id)}">Mark read</button>`
            }
        </article>
    `).join("");
}

function updateNotificationCount() {
    const user = getCurrentUser();

    const count = state.notifications.filter(
        item =>
            !item.read &&
            (!item.userId || item.userId === user?.id)
    ).length;

    setText("notificationCount", count);
}

function markAllNotificationsRead() {
    const user = getCurrentUser();

    state.notifications = state.notifications.map(item => {
        if (!item.userId || item.userId === user?.id) {
            return {
                ...item,
                read: true
            };
        }

        return item;
    });

    saveNotifications();

    renderNotifications();
    updateNotificationCount();

    showToast("Notifications marked as read.");
}

function markNotificationRead(id) {
    state.notifications = state.notifications.map(item =>
        item.id === id
            ? { ...item, read: true }
            : item
    );

    saveNotifications();

    renderNotifications();
    updateNotificationCount();
}

/* ============================================================
   18. BUYER ORDERS AND SELLER ORDERS
============================================================ */

function renderOrders() {
    const user = getCurrentUser();

    if (!user) return;

    renderBuyerOrders(user);
    renderSellerOrders(user);
}

function renderBuyerOrders(user) {
    const container = getElement("buyerOrdersContent");

    if (!container) return;

    let orders = state.orders.filter(
        order => order.buyerId === user.id
    );

    const filter =
        getElement("buyerOrderStatusFilter")?.value || "all";

    if (filter !== "all") {
        orders = orders.filter(
            order => order.status === filter
        );
    }

    if (!orders.length) {
        container.innerHTML = `
            <div class="empty-message">
                <p>You have no demo orders yet.</p>

                <button type="button"
                    class="button button-primary"
                    data-browse-marketplace>
                    Browse products
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <article class="order-card">
            <div class="order-card-header">
                <h3>${safeText(order.reference)}</h3>
                <span class="order-status">
                    ${safeText(order.status)}
                </span>
            </div>

            <p>${safeText(
                new Date(order.createdAt).toLocaleString()
            )}</p>

            <div>
                ${order.items.map(item => `
                    <p>
                        ${safeText(item.title)}
                        × ${item.quantity}
                        — ${money(item.price * item.quantity)}
                    </p>
                `).join("")}
            </div>

            <strong>Total: ${money(order.total)}</strong>

            <p>Payment: Not processed</p>
        </article>
    `).join("");
}

function renderSellerOrders(user) {
    const container = getElement("sellerOrdersContent");

    if (!container) return;

    let orders = state.orders.filter(order =>
        order.items.some(item => item.sellerId === user.id)
    );

    const filter =
        getElement("sellerOrderStatusFilter")?.value || "all";

    if (filter !== "all") {
        orders = orders.filter(
            order => order.status === filter
        );
    }

    if (!orders.length) {
        container.innerHTML = `
            <p class="empty-message">
                No demo orders have been placed for your products.
            </p>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const sellerItems = order.items.filter(
            item => item.sellerId === user.id
        );

        return `
            <article class="order-card">
                <div class="order-card-header">
                    <h3>${safeText(order.reference)}</h3>
                    <span>${safeText(order.status)}</span>
                </div>

                <p>Buyer: ${safeText(order.buyerName)}</p>
                <p>Phone: ${safeText(order.buyerPhone)}</p>
                <p>Delivery: ${safeText(order.deliveryAddress)}</p>

                ${sellerItems.map(item => `
                    <p>
                        ${safeText(item.title)}
                        × ${item.quantity}
                    </p>
                `).join("")}

                <p>
                    Seller item total:
                    <strong>
                        ${money(
                            sellerItems.reduce(
                                (sum, item) =>
                                    sum + item.price * item.quantity,
                                0
                            )
                        )}
                    </strong>
                </p>

                <p>Payment: Not processed</p>
            </article>
        `;
    }).join("");
}

/* ============================================================
   19. MY LISTINGS AND INVENTORY
============================================================ */

function renderMyListings() {
    const user = getCurrentUser();

    if (!user) return;

    const tableBody = getElement("myListingsTableBody");
    const mobile = getElement("myListingsMobileCards");

    let products = state.products.filter(
        product => product.sellerId === user.id
    );

    const query = (
        getElement("myListingsSearch")?.value || ""
    ).trim().toLowerCase();

    const statusFilter =
        getElement("myListingsStatusFilter")?.value || "all";

    if (query) {
        products = products.filter(product =>
            product.title.toLowerCase().includes(query)
        );
    }

    if (statusFilter !== "all") {
        products = products.filter(
            product => product.status === statusFilter
        );
    }

    const tableRows = products.map(product => `
        <tr>
            <td>${safeText(product.title)}</td>
            <td>${safeText(product.category)}</td>
            <td>${money(product.price)}</td>
            <td>${Number(product.quantity)}</td>
            <td>${safeText(product.status)}</td>
            <td>
                <button type="button"
                    data-edit-listing="${escapeAttribute(product.id)}">
                    Edit
                </button>

                <button type="button"
                    data-delete-listing="${escapeAttribute(product.id)}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

    if (tableBody) {
        tableBody.innerHTML = tableRows ||
            `<tr><td colspan="6">No listings found.</td></tr>`;
    }

    if (mobile) {
        mobile.innerHTML = products.length
            ? products.map(product => `
                <article class="listing-mobile-card">
                    <h3>${safeText(product.title)}</h3>

                    <p>${safeText(product.category)}</p>

                    <p>${money(product.price)}</p>

                    <p>
                        Stock: ${Number(product.quantity)}
                        ${safeText(product.unit)}
                    </p>

                    <p>Status: ${safeText(product.status)}</p>

                    <button type="button"
                        data-edit-listing="${escapeAttribute(product.id)}">
                        Edit
                    </button>

                    <button type="button"
                        data-delete-listing="${escapeAttribute(product.id)}">
                        Delete
                    </button>
                </article>
            `).join("")
            : `<p>No listings found.</p>`;
    }
}

function renderInventory() {
    const user = getCurrentUser();

    if (!user) return;

    const table = getElement("inventoryTableBody");
    const mobile = getElement("inventoryMobileList");

    const products = state.products.filter(
        product => product.sellerId === user.id
    );

    if (table) {
        table.innerHTML = products.length
            ? products.map(product => `
                <tr>
                    <td>${safeText(product.title)}</td>
                    <td>${Number(product.quantity)}</td>
                    <td>${safeText(product.unit)}</td>
                    <td>${safeText(product.status)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No inventory.</td></tr>`;
    }

    if (mobile) {
        mobile.innerHTML = products.length
            ? products.map(product => `
                <div class="inventory-mobile-item">
                    <strong>${safeText(product.title)}</strong>

                    <p>
                        ${Number(product.quantity)}
                        ${safeText(product.unit)}
                    </p>

                    <p>Status: ${safeText(product.status)}</p>
                </div>
            `).join("")
            : `<p>No inventory.</p>`;
    }
}

function deleteListing(id) {
    const product = state.products.find(
        item => item.id === id
    );

    if (!product) return;

    if (
        !state.session ||
        product.sellerId !== state.session.id
    ) {
        showToast("You cannot delete this listing.", "error");
        return;
    }

    if (!window.confirm(`Delete "${product.title}"?`)) {
        return;
    }

    state.products = state.products.filter(
        item => item.id !== id
    );

    state.cart = state.cart.filter(
        item => item.productId !== id
    );

    state.saved = state.saved.filter(
        productId => productId !== id
    );

    saveProducts();
    saveCart();
    saveSaved();

    addActivity(`Deleted listing: ${product.title}`, "listing");

    renderMarketplace();
    renderCart();
    renderDashboard();

    updateCartCount();

    showToast("Listing deleted.");
}

/* ============================================================
   20. PROFILE SETTINGS
============================================================ */

function loadProfileForm() {
    const user = getCurrentUser();

    if (!user) return;

    const profile = state.profiles[user.id] || {};

    setFieldValue(
        "profileDisplayName",
        profile.displayName || user.name
    );

    setFieldValue("profileEmail", user.email);

    setFieldValue("profilePhone", profile.phone || "");

    setFieldValue(
        "profileAccountType",
        user.accountType || "buyer"
    );

    setFieldValue("profileState", profile.state || "");

    setFieldValue("profileTown", profile.town || "");

    setFieldValue("profileBio", profile.bio || "");

    setText(
        "profileAvatar",
        (profile.displayName || user.name)
            .charAt(0)
            .toUpperCase()
    );

    updateDescriptionCount(
        "profileBio",
        "profileBioCount",
        500
    );
}

function saveProfile(event) {
    event.preventDefault();

    const user = getCurrentUser();

    if (!user) {
        showToast("Sign in first.", "error");
        return;
    }

    const displayName = (
        getElement("profileDisplayName")?.value || ""
    ).trim();

    const phone = (
        getElement("profilePhone")?.value || ""
    ).trim();

    const productState =
        getElement("profileState")?.value || "";

    const town = (
        getElement("profileTown")?.value || ""
    ).trim();

    const bio = (
        getElement("profileBio")?.value || ""
    ).trim();

    if (!displayName) {
        showToast("Enter your display name.", "error");
        return;
    }

    if (bio.length > 500) {
        showToast("Bio must be 500 characters or fewer.", "error");
        return;
    }

    state.profiles[user.id] = {
        displayName,
        phone,
        state: productState,
        town,
        bio,
        updatedAt: now()
    };

    state.session.name = displayName;

    writeStorage(
        PoultryLink.storage.profiles,
        state.profiles
    );

    writeStorage(
        PoultryLink.storage.session,
        state.session
    );

    state.products = state.products.map(product =>
        product.sellerId === user.id
            ? {
                ...product,
                sellerName: displayName,
                sellerPhone: phone
            }
            : product
    );

    saveProducts();

    setText("profileSaveStatus", "Profile saved on this device.");

    updateHeaderUser();
    renderMarketplace();
    renderSellerDirectory();

    showToast("Profile updated.");
}

/* ============================================================
   21. STOREFRONT SETTINGS
============================================================ */

function loadStorefrontForm() {
    const user = getCurrentUser();

    if (!user) return;

    const store = state.storefronts[user.id] || {};

    setFieldValue("storeName", store.name || "");
    setFieldValue(
        "storeBusinessType",
        store.businessType || "poultry"
    );
    setFieldValue(
        "storePhone",
        store.phone || state.profiles[user.id]?.phone || ""
    );
    setFieldValue(
        "storeContactMethod",
        store.contactMethod || "phone"
    );
    setFieldValue("storeState", store.state || "");
    setFieldValue("storeTown", store.town || "");
    setFieldValue("storeDescription", store.description || "");

    const status = getElement("storePublicStatus");

    if (status) {
        status.value = store.publicStatus || "private";
    }

    renderStorefrontSummary();
}

function saveStorefront(event) {
    event.preventDefault();

    const user = getCurrentUser();

    if (!user) return;

    const name = (
        getElement("storeName")?.value || ""
    ).trim();

    if (!name) {
        showToast("Enter your store name.", "error");
        return;
    }

    state.storefronts[user.id] = {
        name,
        businessType:
            getElement("storeBusinessType")?.value || "poultry",
        phone: (
            getElement("storePhone")?.value || ""
        ).trim(),
        contactMethod:
            getElement("storeContactMethod")?.value || "phone",
        state: getElement("storeState")?.value || "",
        town: (
            getElement("storeTown")?.value || ""
        ).trim(),
        description: (
            getElement("storeDescription")?.value || ""
        ).trim(),
        publicStatus:
            getElement("storePublicStatus")?.value || "private",
        updatedAt: now()
    };

    writeStorage(
        PoultryLink.storage.storefronts,
        state.storefronts
    );

    setText("storefrontSaveStatus", "Storefront saved on this device.");

    renderStorefrontSummary();

    showToast("Storefront settings saved.");
}

function renderStorefrontSummary() {
    const container = getElement("storefrontSummary");

    if (!container) return;

    const user = getCurrentUser();

    if (!user) return;

    const store = state.storefronts[user.id];

    if (!store) {
        container.textContent = "Your storefront has not been configured.";
        return;
    }

    container.innerHTML = `
        <div class="storefront-summary-card">
            <h3>${safeText(store.name)}</h3>

            <p>
                ${safeText(store.town)}
                ${store.town ? ", " : ""}
                ${safeText(store.state)}
            </p>

            <p>${safeText(store.description || "")}</p>

            <p>
                Visibility:
                ${safeText(store.publicStatus)}
            </p>

            <p>
                This storefront is stored locally and is not publicly
                accessible to other users.
            </p>
        </div>
    `;
}

/* ============================================================
   22. DASHBOARD RENDERING
============================================================ */

function renderDashboard() {
    const user = getCurrentUser();

    if (!user) {
        renderAuthState();
        return;
    }

    updateHeaderUser();

    renderDashboardStats();
    renderActivity();
    renderNotifications();
    updateNotificationCount();
    renderOrders();
    renderMyListings();
    renderInventory();
    renderSavedProducts();
    loadProfileForm();
    loadStorefrontForm();
    renderSellerDirectory();
}

function setText(id, value) {
    const element = getElement(id);

    if (element) element.textContent = String(value ?? "");
}

/* ============================================================
   23. LEGAL DIALOGS
============================================================ */

function showLegal(type) {
    const dialog = getElement("legalDialog");

    const title = getElement("legalDialogTitle");
    const content = getElement("legalDialogContent");

    if (!dialog || !title || !content) {
        showMessage(
            type === "privacy" ? "Privacy" : "Terms",
            "Please refer to the published PoultryLink legal documents."
        );
        return;
    }

    if (type === "privacy") {
        title.textContent = "Privacy notice";

        content.textContent =
            "This frontend demonstration stores some information in your browser using localStorage. Data may remain on this device until cleared. Do not enter sensitive information. This demonstration does not provide secure account authentication, shared database storage, or payment processing. A production version must publish a complete privacy notice explaining its actual data collection, retention, sharing, security, and user rights.";
    } else {
        title.textContent = "Terms of use";

        content.textContent =
            "PoultryLink is presented here as a frontend demonstration of a poultry marketplace. Demo listings, demo accounts, and demo orders are not verified commercial transactions. No payment is processed. Before launching a production marketplace, publish appropriate terms covering sellers, buyers, product quality, animal welfare, delivery, disputes, refunds, privacy, prohibited listings, and applicable Nigerian laws.";
    }

    openDialog(dialog);
}

/* ============================================================
   24. DESCRIPTION COUNTERS
============================================================ */

function updateDescriptionCount(inputId, countId, limit) {
    const input = getElement(inputId);
    const counter = getElement(countId);

    if (!input || !counter) return;

    const update = () => {
        counter.textContent =
            `${input.value.length}/${limit}`;

        if (input.value.length > limit) {
            counter.classList.add("is-over-limit");
        } else {
            counter.classList.remove("is-over-limit");
        }
    };

    input.removeEventListener("input", input._plCounterHandler);

    input._plCounterHandler = update;

    input.addEventListener("input", update);

    update();
}

/* ============================================================
   25. MOBILE MENU
============================================================ */

function toggleMobileMenu() {
    const nav = getElement("desktopNav");

    if (!nav) return;

    const open = nav.classList.toggle("is-open");

    const button = getElement("menuButton");

    if (button) {
        button.setAttribute("aria-expanded", String(open));
    }
}

/* ============================================================
   26. MARKETPLACE NAVIGATION
============================================================ */

function scrollToMarketplace() {
    const dashboard = getElement("dashboardPage");

    if (dashboard && !dashboard.hidden) {
        closeDashboard();
    }

    const marketplace =
        getElement("marketplace") || $(".hero");

    if (marketplace) {
        marketplace.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function resetFilters() {
    state.search = "";
    state.category = "all";
    state.location = "all";
    state.sort = "newest";

    setFieldValue("searchInput", "");
    setFieldValue("categoryFilter", "all");
    setFieldValue("locationFilter", "all");
    setFieldValue("sortSelect", "newest");

    renderMarketplace();
}

/* ============================================================
   27. EVENT HANDLERS
============================================================ */

function bindEvents() {
    getElement("signInButton")?.addEventListener("click", () => {
        openAuth(state.session ? "login" : "login");
    });

    getElement("footerSignInButton")?.addEventListener(
        "click",
        () => openAuth("login")
    );

    getElement("footerCreateAccountButton")?.addEventListener(
        "click",
        () => openAuth("register")
    );

    getElement("loginModeButton")?.addEventListener(
        "click",
        () => {
            state.authMode = "login";
            updateAuthMode();
        }
    );

    getElement("registerModeButton")?.addEventListener(
        "click",
        () => {
            state.authMode = "register";
            updateAuthMode();
        }
    );

    getElement("authForm")?.addEventListener(
        "submit",
        handleAuthSubmit
    );

    getElement("authSignOutButton")?.addEventListener(
        "click",
        signOut
    );

    getElement("signOutButton")?.addEventListener(
        "click",
        signOut
    );

    getElement("settingsSignOutButton")?.addEventListener(
        "click",
        signOut
    );

    getElement("authOpenDashboardButton")?.addEventListener(
        "click",
        () => {
            closeDialog(getElement("authDialog"));
            openDashboard();
        }
    );

    getElement("forgotPasswordButton")?.addEventListener(
        "click",
        () => showMessage(
            "Password recovery",
            "Password recovery requires a secure authentication backend. It is not available in this frontend demonstration."
        )
    );

    getElement("heroSellButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("sellHeaderButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("sellerCtaButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("dashboardQuickAddProductButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("quickAddProductButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("mobileSellButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("saveListingButton")?.addEventListener(
        "click",
        () => getElement("listingForm")?.requestSubmit()
    );

    getElement("listingForm")?.addEventListener(
        "submit",
        saveListing
    );

    getElement("listingDescription")?.addEventListener(
        "input",
        () => updateDescriptionCount(
            "listingDescription",
            "listingDescriptionCount",
            1000
        )
    );

    getElement("searchForm")?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            state.search =
                getElement("searchInput")?.value || "";

            state.category =
                getElement("categoryFilter")?.value || "all";

            state.location =
                getElement("locationFilter")?.value || "all";

            renderMarketplace();
        }
    );

    getElement("searchInput")?.addEventListener(
        "input",
        event => {
            state.search = event.target.value;
            renderMarketplace();
        }
    );

    getElement("categoryFilter")?.addEventListener(
        "change",
        event => {
            state.category = event.target.value || "all";
            renderMarketplace();
        }
    );

    getElement("locationFilter")?.addEventListener(
        "change",
        event => {
            state.location = event.target.value || "all";
            renderMarketplace();
        }
    );

    getElement("sortSelect")?.addEventListener(
        "change",
        event => {
            state.sort = event.target.value || "newest";
            renderMarketplace();
        }
    );

    getElement("categoryChips")?.addEventListener(
        "click",
        event => {
            const button = event.target.closest("[data-category]");

            if (!button) return;

            state.category = button.dataset.category || "all";

            setFieldValue("categoryFilter", state.category);

            renderMarketplace();
        }
    );

    getElement("clearFiltersButton")?.addEventListener(
        "click",
        resetFilters
    );

    getElement("emptyClearButton")?.addEventListener(
        "click",
        resetFilters
    );

    getElement("cartOpenButton")?.addEventListener(
        "click",
        () => {
            renderCart();
            openDialog(getElement("cartDialog"));
        }
    );

    getElement("mobileCartButton")?.addEventListener(
        "click",
        () => {
            renderCart();
            openDialog(getElement("cartDialog"));
        }
    );

    getElement("clearCartButton")?.addEventListener(
        "click",
        clearCart
    );

    getElement("continueShoppingButton")?.addEventListener(
        "click",
        () => {
            closeDialog(getElement("cartDialog"));
            scrollToMarketplace();
        }
    );

    getElement("proceedToCheckoutButton")?.addEventListener(
        "click",
        () => {
            if (!state.cart.length) {
                showToast("Your cart is empty.", "error");
                return;
            }

            renderCheckoutSummary();

            closeDialog(getElement("cartDialog"));

            openDialog(getElement("checkoutDialog"));
        }
    );

    getElement("checkoutForm")?.addEventListener(
        "submit",
        placeDemoOrder
    );

    getElement("viewAllSellersButton")?.addEventListener(
        "click",
        () => {
            getElement("sellerDirectory")?.scrollIntoView({
                behavior: "smooth"
            });
        }
    );

    getElement("openDashboardButton")?.addEventListener(
        "click",
        () => openDashboard()
    );

    getElement("footerDashboardButton")?.addEventListener(
        "click",
        () => openDashboard()
    );

    getElement("mobileDashboardButton")?.addEventListener(
        "click",
        () => openDashboard()
    );

    getElement("dashboardBackToMarketButton")?.addEventListener(
        "click",
        closeDashboard
    );

    getElement("footerSellButton")?.addEventListener(
        "click",
        () => openListingForm()
    );

    getElement("footerPrivacyButton")?.addEventListener(
        "click",
        () => showLegal("privacy")
    );

    getElement("footerTermsButton")?.addEventListener(
        "click",
        () => showLegal("terms")
    );

    getElement("messageDialogOkButton")?.addEventListener(
        "click",
        () => closeDialog(getElement("messageDialog"))
    );

    getElement("markAllNotificationsReadButton")?.addEventListener(
        "click",
        markAllNotificationsRead
    );

    getElement("activityTypeFilter")?.addEventListener(
        "change",
        renderActivity
    );

    getElement("buyerOrderStatusFilter")?.addEventListener(
        "change",
        renderOrders
    );

    getElement("sellerOrderStatusFilter")?.addEventListener(
        "change",
        renderOrders
    );

    getElement("myListingsSearch")?.addEventListener(
        "input",
        renderMyListings
    );

    getElement("myListingsStatusFilter")?.addEventListener(
        "change",
        renderMyListings
    );

    getElement("refreshActivityButton")?.addEventListener(
        "click",
        renderActivity
    );

    getElement("refreshActivityButtonSecondary")?.addEventListener(
        "click",
        renderActivity
    );

    getElement("refreshInventoryButton")?.addEventListener(
        "click",
        renderInventory
    );

    getElement("profileForm")?.addEventListener(
        "submit",
        saveProfile
    );

    getElement("profileBio")?.addEventListener(
        "input",
        () => updateDescriptionCount(
            "profileBio",
            "profileBioCount",
            500
        )
    );

    getElement("storefrontForm")?.addEventListener(
        "submit",
        saveStorefront
    );

    getElement("previewStorefrontButton")?.addEventListener(
        "click",
        () => {
            renderStorefrontSummary();

            showMessage(
                "Storefront preview",
                "This is a local preview. Your storefront is not publicly accessible until a backend and public storefront page are connected."
            );
        }
    );

    getElement("changePasswordButton")?.addEventListener(
        "click",
        () => showMessage(
            "Change password",
            "Password changes require a secure authentication backend."
        )
    );

    getElement("menuButton")?.addEventListener(
        "click",
        toggleMobileMenu
    );

    /*
       Event delegation for dynamic cards, cart rows,
       product detail buttons, and dashboard controls.
    */

    document.addEventListener("click", event => {
        const target = event.target;

        const saveButton = target.closest("[data-save-product]");

        if (saveButton) {
            toggleSavedProduct(saveButton.dataset.saveProduct);
            return;
        }

        const detailButton = target.closest("[data-view-product]");

        if (detailButton) {
            showProductDetails(detailButton.dataset.viewProduct);
            return;
        }

        const sellerButton = target.closest("[data-view-seller]");

        if (sellerButton) {
            if (sellerButton.dataset.viewSeller) {
                showSellerProfile(
                    sellerButton.dataset.viewSeller
                );
            }

            return;
        }

        const addButton = target.closest("[data-add-cart]");

        if (addButton) {
            addToCart(addButton.dataset.addCart);
            return;
        }

        const increase = target.closest("[data-cart-increase]");

        if (increase) {
            updateCartQuantity(
                increase.dataset.cartIncrease,
                1
            );
            return;
        }

        const decrease = target.closest("[data-cart-decrease]");

        if (decrease) {
            updateCartQuantity(
                decrease.dataset.cartDecrease,
                -1
            );
            return;
        }

        const remove = target.closest("[data-cart-remove]");

        if (remove) {
            removeCartItem(remove.dataset.cartRemove);
            return;
        }

        const edit = target.closest("[data-edit-listing]");

        if (edit) {
            openListingForm(edit.dataset.editListing);
            return;
        }

        const removeListing = target.closest(
            "[data-delete-listing]"
        );

        if (removeListing) {
            deleteListing(removeListing.dataset.deleteListing);
            return;
        }

        const readButton = target.closest(
            "[data-read-notification]"
        );

        if (readButton) {
            markNotificationRead(
                readButton.dataset.readNotification
            );
            return;
        }

        const browse = target.closest("[data-browse-marketplace]");

        if (browse) {
            scrollToMarketplace();
            return;
        }

        const tab = target.closest("[data-dashboard-tab]");

        if (tab) {
            activateDashboardTab(tab.dataset.dashboardTab);
            renderDashboard();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            $$(".is-open").forEach(element => {
                element.classList.remove("is-open");
            });
        }
    });
}

/* ============================================================
   28. PAGE INITIALIZATION
============================================================ */

function initializePage() {
    loadState();

    initializeProducts();

    const year = getElement("currentYear");

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }

    bindEvents();

    updateHeaderUser();

    renderMarketplace();
    renderSellerDirectory();
    renderCart();
    updateCartCount();
    renderNotifications();
    updateNotificationCount();
    renderAuthState();

    if (getCurrentUser()) {
        renderDashboard();
    }

    /*
       If the HTML includes a live-status element, provide
       a short application initialization status.
    */

    const liveStatus = getElement("appLiveStatus");

    if (liveStatus) {
        liveStatus.textContent =
            "PoultryLink interface initialized.";
    }

    console.log(
        `PoultryLink ${PoultryLink.version} initialized.`
    );
}

/* ============================================================
   29. START APPLICATION
============================================================ */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializePage,
        { once: true }
    );
} else {
    initializePage();
}