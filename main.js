import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc,
    query,
    where,
    onSnapshot,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDUBwgGhDHj-v6kBE5Dn3O_FxF8EfPPfy4",
    authDomain: "poultrylink-2459a.firebaseapp.com",
    projectId: "poultrylink-2459a",
    storageBucket: "poultrylink-2459a.firebasestorage.app",
    messagingSenderId: "332920290687",
    appId: "1:332920290687:web:3e71c648817e1c07ba6e4a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

let user = null;
let listings = [];
let filtered = [];
let authMode = "signin";
let editingId = null;
let unsubscribeListings = null;

const CART_KEY = "poultrylink_cart_v1";

let cart = loadCart();

const categoryArt = {
    Eggs: ["🥚", "eggs"],
    Layers: ["🐔", "layers"],
    Broilers: ["🍗", "broilers"],
    Chicks: ["🐣", "chicks"],
    Feed: ["🌾", "feed"],
    Equipment: ["🧰", "equipment"]
};

function loadCart() {
    try {
        return JSON.parse(
            localStorage.getItem(CART_KEY) || "[]"
        ).filter(
            x =>
                x &&
                typeof x.id === "string" &&
                Number.isFinite(x.price) &&
                Number.isFinite(x.qty) &&
                x.qty > 0
        );
    } catch {
        return [];
    }
}

function saveCart() {
    localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
    );

    renderCartBadge();
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function naira(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

function normalisePhone(value = "") {
    let number = String(value).replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "234" + number.slice(1);
    }

    return number;
}

function toast(message) {
    const element = $("toast");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        element.classList.remove("show");
    }, 3000);
}

function errorText(error) {
    const messages = {
        "auth/email-already-in-use":
            "This email already has an account. Please sign in.",

        "auth/invalid-email":
            "Enter a valid email address.",

        "auth/invalid-credential":
            "Email or password is incorrect.",

        "auth/weak-password":
            "Use a password with at least six characters.",

        "permission-denied":
            "Permission denied by Firebase security rules. Check the rules installed in Firestore.",

        "unavailable":
            "Service temporarily unavailable. Check your internet connection."
    };

    return messages[error?.code] ||
        error?.message ||
        "Something went wrong. Please try again.";
}

function openDialog(id) {
    const dialog = $(id);

    if (dialog && !dialog.open) {
        dialog.showModal();
    }
}

function closeDialog(id) {
    const dialog = $(id);

    if (dialog?.open) {
        dialog.close();
    }
}

function artFor(product) {
    return categoryArt[product.category] ||
        [product.emoji || "🐔", "layers"];
}

function createdMillis(product) {
    return product.createdAt?.toMillis?.() ||
        product.updatedAt?.toMillis?.() ||
        0;
}

function listingArt(product) {
    const [emoji, cssClass] = artFor(product);

    return `
        <div class="listing-art ${escapeHTML(product.art || cssClass)}">
            <span class="listing-tag">
                ${escapeHTML(product.category || "Poultry")}
            </span>

            <span class="art-emoji">
                ${escapeHTML(product.emoji || emoji)}
            </span>
        </div>
    `;
}

function cardHTML(product) {
    const isOwner =
        user && product.ownerId === user.uid;

    const price = naira(product.price);

    return `
        <article class="listing-card">

            ${listingArt(product)}

            <div class="listing-body">

                <div class="listing-meta">
                    <span class="category-label">
                        ${escapeHTML(product.category || "Product")}
                    </span>

                    <span>
                        📍 ${escapeHTML(
                            [product.town, product.state]
                                .filter(Boolean)
                                .join(", ")
                        )}
                    </span>
                </div>

                <h3>${escapeHTML(product.title)}</h3>

                <p class="listing-description">
                    ${escapeHTML(
                        product.description ||
                        "Contact the seller for more details."
                    )}
                </p>

                <div class="listing-price">
                    ${price}
                    <small>${escapeHTML(product.unit || "")}</small>
                </div>

                <div class="listing-details">
                    <span>
                        Available: ${escapeHTML(product.quantity || "Ask seller")}
                    </span>

                    <span>Seller listing</span>
                </div>

                <div class="seller-line">
                    <span class="seller-avatar">
                        ${escapeHTML(
                            (product.seller || "P")
                                .slice(0, 1)
                                .toUpperCase()
                        )}
                    </span>

                    <span>
                        Listed by
                        <strong>
                            ${escapeHTML(product.seller || "Poultry seller")}
                        </strong>
                    </span>
                </div>

                <div class="card-actions">

                    <button
                        class="btn btn-outline"
                        data-action="details"
                        data-id="${product.id}">
                        View details
                    </button>

                    <button
                        class="btn btn-outline"
                        data-action="addcart"
                        data-id="${product.id}">
                        ＋ Cart
                    </button>

                    <a
                        class="btn btn-whatsapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://wa.me/${normalisePhone(product.phone)}?text=${encodeURIComponent(
                            "Hello, I found your listing on PoultryLink: " +
                            product.title
                        )}">
                        WhatsApp
                    </a>

                    ${
                        isOwner
                            ? `
                                <button
                                    class="btn btn-outline"
                                    data-action="edit"
                                    data-id="${product.id}">
                                    Edit
                                </button>

                                <button
                                    class="btn btn-danger"
                                    data-action="delete"
                                    data-id="${product.id}">
                                    Delete
                                </button>
                            `
                            : ""
                    }

                </div>
            </div>
        </article>
    `;
}

function applyFilters() {
    const term = $("searchInput").value.trim().toLowerCase();
    const category = $("categoryFilter").value;
    const location = $("locationFilter").value;
    const sort = $("sortSelect").value;

    filtered = listings.filter(product => {
        const matchesCategory =
            category === "all" ||
            product.category === category;

        const matchesLocation =
            location === "all" ||
            product.state === location;

        const matchesSearch =
            !term ||
            [
                product.title,
                product.category,
                product.description,
                product.seller,
                product.town,
                product.state
            ].some(value =>
                String(value || "")
                    .toLowerCase()
                    .includes(term)
            );

        return matchesCategory &&
            matchesLocation &&
            matchesSearch;
    });

    if (sort === "low") {
        filtered.sort(
            (a, b) =>
                (Number(a.price) || 0) -
                (Number(b.price) || 0)
        );
    } else if (sort === "high") {
        filtered.sort(
            (a, b) =>
                (Number(b.price) || 0) -
                (Number(a.price) || 0)
        );
    } else {
        filtered.sort(
            (a, b) => createdMillis(b) - createdMillis(a)
        );
    }

    renderListings();
}

function renderListings() {
    const grid = $("listingGrid");

    grid.innerHTML = filtered
        .map(cardHTML)
        .join("");

    $("resultsCount").textContent =
        `${filtered.length} ${
            filtered.length === 1 ? "listing" : "listings"
        } found`;

    $("emptyState").classList.toggle(
        "hidden",
        filtered.length !== 0
    );

    grid.classList.toggle(
        "hidden",
        filtered.length === 0
    );
}

function clearFilters() {
    $("searchInput").value = "";
    $("categoryFilter").value = "all";
    $("locationFilter").value = "all";

    document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.toggle(
            "active",
            chip.dataset.category === "all"
        );
    });

    applyFilters();
}

function renderCartBadge() {
    $("cartCount").textContent = cart.reduce(
        (total, item) => total + item.qty,
        0
    );
}

function cartTotal() {
    return cart.reduce(
        (total, item) => total + item.price * item.qty,
        0
    );
}

function renderCart() {
    const box = $("cartContent");

    if (!cart.length) {
        box.innerHTML = `
            <div class="empty-state">
                <span>🛒</span>
                <h3>Your cart is empty</h3>
                <p>
                    Add products from the marketplace
                    to start an order.
                </p>

                <button
                    class="btn btn-outline"
                    data-close="cartDialog">
                    Continue shopping
                </button>
            </div>
        `;

        $("checkoutButton").disabled = true;

    } else {
        box.innerHTML = cart.map(item => `
            <div class="cart-row">

                <div>
                    <h3>${escapeHTML(item.title)}</h3>

                    <p>
                        ${escapeHTML(item.seller)}
                        · ${naira(item.price)} each
                    </p>

                    <p>
                        ${escapeHTML(item.quantityText || "")}
                    </p>
                </div>

                <div class="cart-row-right">
                    <strong>
                        ${naira(item.price * item.qty)}
                    </strong>

                    <div class="qty-controls">

                        <button
                            data-cart-action="minus"
                            data-id="${item.id}"
                            aria-label="Decrease quantity">
                            −
                        </button>

                        <b>${item.qty}</b>

                        <button
                            data-cart-action="plus"
                            data-id="${item.id}"
                            aria-label="Increase quantity">
                            +
                        </button>

                        <button
                            data-cart-action="remove"
                            data-id="${item.id}"
                            aria-label="Remove item">
                            ×
                        </button>

                    </div>
                </div>

            </div>
        `).join("");

        $("checkoutButton").disabled = false;
    }

    $("cartTotal").textContent = naira(cartTotal());

    renderCartBadge();
}

function addToCart(product) {
    if (!user) {
        openAuth();
        toast("Sign in to add products to your cart.");
        return;
    }

    if (product.ownerId === user.uid) {
        toast("You cannot order your own listing.");
        return;
    }

    const existingItem = cart.find(
        item => item.id === product.id
    );

    if (existingItem) {
        existingItem.qty = Math.min(
            existingItem.qty + 1,
            99
        );
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: Number(product.price) || 0,
            seller: product.seller || "Seller",
            ownerId: product.ownerId || "",
            phone: product.phone || "",
            quantityText: product.quantity || "",
            unit: product.unit || "",
            qty: 1
        });
    }

    saveCart();

    toast("Added to your cart.");
}

function openAuth() {
    updateAuthInterface();
    openDialog("authDialog");
}

function setAuthMode(mode) {
    authMode = mode;

    const signingUp = mode === "signup";

    $("authTitle").textContent = signingUp
        ? "Create your account"
        : "Welcome back";

    $("authSubtitle").textContent = signingUp
        ? "Create an account to buy and sell on PoultryLink."
        : "Sign in to manage listings and orders.";

    $("authNameField").classList.toggle(
        "hidden",
        !signingUp
    );

    $("authName").required = signingUp;

    $("authPassword").autocomplete = signingUp
        ? "new-password"
        : "current-password";

    $("authSubmitButton").textContent = signingUp
        ? "Create account"
        : "Sign in";

    $("authSwitchButton").textContent = signingUp
        ? "Already have an account? Sign in"
        : "Need an account? Create one";

    $("authMessage").textContent = "";
}

function updateAuthInterface() {
    const signedIn = Boolean(user);

    $("signInButton").textContent = signedIn
        ? "My account"
        : "Sign in";

    $("accountContent").classList.toggle(
        "hidden",
        !signedIn
    );

    $("signedInControls").classList.toggle(
        "hidden",
        !signedIn
    );

    $("authForm").classList.toggle(
        "hidden",
        signedIn
    );

    $("authSwitchButton").classList.toggle(
        "hidden",
        signedIn
    );

    if (signedIn) {
        $("accountName").textContent =
            user.displayName || "PoultryLink member";

        $("accountEmail").textContent =
            user.email || "";
    } else {
        setAuthMode(authMode);
    }
}

async function saveSellerProfile(name) {
    if (!user) return;

    const reference = doc(db, "sellers", user.uid);
    const snapshot = await getDoc(reference);

    const payload = {
        uid: user.uid,
        email: user.email || "",
        displayName:
            name ||
            user.displayName ||
            "PoultryLink seller",
        updatedAt: serverTimestamp()
    };

    if (!snapshot.exists()) {
        payload.createdAt = serverTimestamp();
    }

    await setDoc(
        reference,
        payload,
        { merge: true }
    );
}

$("authForm").addEventListener("submit", async event => {
    event.preventDefault();

    $("authMessage").textContent = "Working…";
    $("authSubmitButton").disabled = true;

    try {
        if (authMode === "signup") {
            const name = $("authName").value.trim();

            const credential =
                await createUserWithEmailAndPassword(
                    auth,
                    $("authEmail").value.trim(),
                    $("authPassword").value
                );

            if (name) {
                await updateProfile(credential.user, {
                    displayName: name
                });
            }

            user = auth.currentUser;

            await saveSellerProfile(name);

            toast("Account created successfully.");

        } else {
            await signInWithEmailAndPassword(
                auth,
                $("authEmail").value.trim(),
                $("authPassword").value
            );

            toast("Signed in successfully.");
        }

        closeDialog("authDialog");

        updateAuthInterface();
        renderListings();
        loadOrders();

    } catch (error) {
        $("authMessage").textContent =
            errorText(error);

    } finally {
        $("authSubmitButton").disabled = false;
    }
});

$("authSwitchButton").addEventListener("click", () => {
    setAuthMode(
        authMode === "signin"
            ? "signup"
            : "signin"
    );
});

$("signInButton").addEventListener("click", () => {
    openAuth();
});

$("signOutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);

        closeDialog("authDialog");

        toast("Signed out.");

    } catch (error) {
        toast(errorText(error));
    }
});

function openListing(id = null) {
    if (!user) {
        openAuth();
        toast("Sign in before publishing a listing.");
        return;
    }

    editingId = id;

    $("listingForm").reset();
    $("formMessage").textContent = "";

    $("listingModalTitle").textContent = id
        ? "Edit your listing"
        : "Create a listing";

    $("saveListingButton").textContent = id
        ? "Save changes"
        : "Publish listing";

    if (id) {
        const product = listings.find(
            item => item.id === id
        );

        if (!product || product.ownerId !== user.uid) {
            toast("You can only edit your own listings.");
            return;
        }

        $("listingTitle").value = product.title || "";
        $("listingCategory").value = product.category || "Eggs";
        $("listingPrice").value = product.price ?? "";
        $("listingQuantity").value = product.quantity || "";
        $("listingUnit").value = product.unit || "";
        $("listingState").value = product.state || "";
        $("listingTown").value = product.town || "";
        $("listingSeller").value = product.seller || "";
        $("listingPhone").value = product.phone || "";
        $("listingDescription").value =
            product.description || "";

    } else {
        $("listingSeller").value =
            user.displayName || "";
    }

    openDialog("listingDialog");
}

[
    "sellHeaderButton",
    "heroSellButton",
    "sellBannerButton"
].forEach(id => {
    $(id).addEventListener("click", () => {
        openListing();
    });
});

$("listingForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!user) {
        toast("Please sign in first.");
        return;
    }

    const category = $("listingCategory").value;

    const art = categoryArt[category] ||
        ["🐔", "layers"];

    const data = {
        title: $("listingTitle").value.trim(),
        category,
        price: Number($("listingPrice").value),
        quantity: $("listingQuantity").value.trim(),
        unit: $("listingUnit").value.trim(),
        state: $("listingState").value,
        town: $("listingTown").value.trim(),
        seller: $("listingSeller").value.trim(),
        phone: $("listingPhone").value.trim(),
        description: $("listingDescription").value.trim(),
        emoji: art[0],
        art: art[1],
        status: "active",
        ownerId: user.uid,
        updatedAt: serverTimestamp()
    };

    if (
        !Number.isFinite(data.price) ||
        data.price < 0 ||
        data.price > 100000000
    ) {
        $("formMessage").textContent =
            "Enter a valid price.";
        return;
    }

    $("saveListingButton").disabled = true;
    $("formMessage").textContent = "Saving listing…";

    try {
        if (editingId) {
            await updateDoc(
                doc(db, "products", editingId),
                data
            );
        } else {
            data.createdAt = serverTimestamp();

            await addDoc(
                collection(db, "products"),
                data
            );
        }

        closeDialog("listingDialog");

        toast(
            editingId
                ? "Listing updated."
                : "Listing published."
        );

    } catch (error) {
        $("formMessage").textContent =
            errorText(error);

    } finally {
        $("saveListingButton").disabled = false;
    }
});

async function removeListing(id) {
    const product = listings.find(
        item => item.id === id
    );

    if (
        !user ||
        !product ||
        product.ownerId !== user.uid
    ) {
        toast("You can only delete your own listings.");
        return;
    }

    if (!confirm(
        `Delete "${product.title}"? This cannot be undone.`
    )) {
        return;
    }

    try {
        await deleteDoc(
            doc(db, "products", id)
        );

        cart = cart.filter(
            item => item.id !== id
        );

        saveCart();

        toast("Listing deleted.");

    } catch (error) {
        toast(errorText(error));
    }
}

function showDetails(product) {
    $("detailContent").innerHTML = `
        <div class="detail-hero">

            ${listingArt(product)}

            <div>
                <h2>${escapeHTML(product.title)}</h2>

                <div class="listing-price">
                    ${naira(product.price)}
                    <small>${escapeHTML(product.unit || "")}</small>
                </div>

                <span class="category-label">
                    ${escapeHTML(product.category)}
                </span>
            </div>

        </div>

        <p class="detail-copy">
            ${escapeHTML(
                product.description ||
                "No description supplied."
            )}
        </p>

        <div class="detail-facts">

            <div class="detail-fact">
                <small>Available quantity</small>
                <strong>
                    ${escapeHTML(product.quantity || "Ask seller")}
                </strong>
            </div>

            <div class="detail-fact">
                <small>Location</small>
                <strong>
                    ${escapeHTML(
                        [product.town, product.state]
                            .filter(Boolean)
                            .join(", ")
                    )}
                </strong>
            </div>

            <div class="detail-fact">
                <small>Seller</small>
                <strong>
                    ${escapeHTML(product.seller || "Seller")}
                </strong>
            </div>

            <div class="detail-fact">
                <small>Phone</small>
                <strong>
                    ${escapeHTML(product.phone || "Not provided")}
                </strong>
            </div>

        </div>

        <div class="card-actions">

            <button
                class="btn btn-primary"
                data-action="addcart"
                data-id="${product.id}">
                ＋ Add to cart
            </button>

            <a
                class="btn btn-whatsapp"
                target="_blank"
                rel="noopener noreferrer"
                href="https://wa.me/${normalisePhone(product.phone)}?text=${encodeURIComponent(
                    "Hello, I found your listing on PoultryLink: " +
                    product.title
                )}">
                Contact seller on WhatsApp
            </a>

        </div>
    `;

    openDialog("detailDialog");
}

document.addEventListener("click", async event => {
    const closeButton = event.target.closest("[data-close]");

    if (closeButton) {
        closeDialog(closeButton.dataset.close);
        return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (actionButton) {
        const product = listings.find(
            item => item.id === actionButton.dataset.id
        );

        if (
            actionButton.dataset.action === "addcart" &&
            product
        ) {
            addToCart(product);

            if ($("detailDialog").open) {
                closeDialog("detailDialog");
            }
        }

        if (
            actionButton.dataset.action === "details" &&
            product
        ) {
            showDetails(product);
        }

        if (actionButton.dataset.action === "edit") {
            openListing(actionButton.dataset.id);
        }

        if (actionButton.dataset.action === "delete") {
            removeListing(actionButton.dataset.id);
        }
    }

    const cartAction = event.target.closest("[data-cart-action]");

    if (cartAction) {
        const item = cart.find(
            entry => entry.id === cartAction.dataset.id
        );

        if (!item) return;

        if (cartAction.dataset.cartAction === "plus") {
            item.qty = Math.min(item.qty + 1, 99);
        }

        if (cartAction.dataset.cartAction === "minus") {
            item.qty = Math.max(1, item.qty - 1);
        }

        if (cartAction.dataset.cartAction === "remove") {
            cart = cart.filter(
                entry => entry.id !== item.id
            );
        }

        saveCart();
        renderCart();
    }
});

$("searchForm").addEventListener("submit", event => {
    event.preventDefault();

    applyFilters();

    $("marketplace").scrollIntoView({
        behavior: "smooth"
    });
});

$("categoryFilter").addEventListener("change", () => {
    document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.toggle(
            "active",
            chip.dataset.category === $("categoryFilter").value
        );
    });

    applyFilters();
});

$("locationFilter").addEventListener("change", applyFilters);
$("searchInput").addEventListener("input", applyFilters);
$("sortSelect").addEventListener("change", applyFilters);

$("clearFiltersButton").addEventListener(
    "click",
    clearFilters
);

$("emptyClearButton").addEventListener(
    "click",
    clearFilters
);

$("categoryChips").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    $("categoryFilter").value = button.dataset.category;

    document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.toggle(
            "active",
            chip === button
        );
    });

    applyFilters();
});

$("cartOpenButton").addEventListener("click", () => {
    renderCart();
    openDialog("cartDialog");
});

$("checkoutButton").addEventListener("click", () => {
    if (!user) {
        closeDialog("cartDialog");
        openAuth();

        toast("Sign in to submit an order.");
        return;
    }

    if (!cart.length) return;

    $("buyerName").value = user.displayName || "";
    $("buyerPhone").value = "";
    $("buyerAddress").value = "";
    $("buyerNote").value = "";
    $("checkoutMessage").textContent = "";

    closeDialog("cartDialog");
    openDialog("checkoutDialog");
});

$("checkoutForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!user) {
        toast("Please sign in again to submit an order.");
        return;
    }

    if (!cart.length) {
        toast("Your cart is empty.");
        return;
    }

    const button = $("placeOrderButton");

    button.disabled = true;

    $("checkoutMessage").textContent =
        "Submitting your order request…";

    try {
        const currentItems = [];

        for (const item of cart) {
            const snapshot = await getDoc(
                doc(db, "products", item.id)
            );

            if (
                !snapshot.exists() ||
                snapshot.data().status !== "active"
            ) {
                throw new Error(
                    `The listing "${item.title}" is no longer available. Remove it from your cart and try again.`
                );
            }

            const product = snapshot.data();

            if (product.ownerId === user.uid) {
                throw new Error(
                    "Your cart contains your own listing. Remove it before checkout."
                );
            }

            currentItems.push({
                productId: item.id,
                title: String(
                    product.title || item.title
                ).slice(0, 100),

                category: String(
                    product.category || ""
                ).slice(0, 30),

                unitPrice: Number(product.price) || 0,
                quantity: item.qty,

                sellerName: String(
                    product.seller || ""
                ).slice(0, 80),

                sellerId: String(
                    product.ownerId || ""
                ).slice(0, 128),

                unit: String(
                    product.unit || ""
                ).slice(0, 40),

                listingQuantity: String(
                    product.quantity || ""
                ).slice(0, 80)
            });
        }

        const order = {
            buyerId: user.uid,

            buyerEmail: String(
                user.email || ""
            ).slice(0, 160),

            buyerName: $("buyerName").value.trim(),
            buyerPhone: $("buyerPhone").value.trim(),

            deliveryAddress:
                $("buyerAddress").value.trim(),

            buyerNote:
                $("buyerNote").value.trim(),

            items: currentItems,

            total: currentItems.reduce(
                (total, item) =>
                    total + item.unitPrice * item.quantity,
                0
            ),

            currency: "NGN",
            orderStatus: "awaiting_seller_confirmation",
            paymentStatus: "not_integrated",

            paymentNote:
                "No payment has been collected or verified by PoultryLink.",

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await addDoc(
            collection(db, "orders"),
            order
        );

        cart = [];

        saveCart();

        closeDialog("checkoutDialog");

        toast(
            "Order request submitted. No payment was collected."
        );

        await loadOrders();

        $("ordersSection").scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        $("checkoutMessage").textContent =
            errorText(error);

    } finally {
        button.disabled = false;
    }
});

async function loadOrders() {
    const box = $("ordersContent");

    if (!user) {
        box.innerHTML = `
            <div class="empty-state">
                <span>📦</span>
                <h3>Sign in to view your orders</h3>
                <p>
                    Order requests are private to the
                    account that submitted them.
                </p>

                <button
                    class="btn btn-primary"
                    id="ordersSignInButton">
                    Sign in
                </button>
            </div>
        `;

        return;
    }

    box.innerHTML =
        '<p class="small-muted">Loading your orders…</p>';

    try {
        const snapshot = await getDocs(
            query(
                collection(db, "orders"),
                where("buyerId", "==", user.uid)
            )
        );

        const orders = snapshot.docs
            .map(document => ({
                id: document.id,
                ...document.data()
            }))
            .sort(
                (a, b) =>
                    (b.createdAt?.toMillis?.() || 0) -
                    (a.createdAt?.toMillis?.() || 0)
            );

        if (!orders.length) {
            box.innerHTML = `
                <div class="empty-state">
                    <span>📦</span>
                    <h3>No orders yet</h3>
                    <p>
                        When you submit an order request,
                        it will appear here.
                    </p>
                </div>
            `;

            return;
        }

        box.innerHTML = orders.map(order => `
            <article class="order-card">

                <div class="order-top">

                    <div>
                        <h3>
                            Order ${escapeHTML(
                                order.id.slice(0, 9).toUpperCase()
                            )}
                        </h3>

                        <span class="order-id">
                            ${
                                order.createdAt?.toDate
                                    ? escapeHTML(
                                        order.createdAt
                                            .toDate()
                                            .toLocaleString()
                                    )
                                    : "Just submitted"
                            }
                        </span>
                    </div>

                    <span class="status-pill">
                        ${escapeHTML(
                            String(
                                order.orderStatus ||
                                "awaiting_seller_confirmation"
                            ).replaceAll("_", " ")
                        )}
                    </span>

                </div>

                <div class="order-items">

                    ${
                        (
                            Array.isArray(order.items)
                                ? order.items
                                : []
                        ).map(item => `
                            ${escapeHTML(item.title)}
                            × ${Number(item.quantity) || 1}
                            — ${naira(
                                (Number(item.unitPrice) || 0) *
                                (Number(item.quantity) || 1)
                            )}
                        `).join("<br>")
                    }

                    <br>

                    <strong>
                        Payment: Not integrated — no payment collected.
                    </strong>

                </div>

                <div class="total-line">
                    <span>Estimated items total</span>

                    <strong class="order-total">
                        ${naira(order.total)}
                    </strong>
                </div>

                <p class="small-muted">
                    Confirm stock, delivery and payment directly
                    with the seller. This order record does not
                    confirm payment or reserve stock.
                </p>

            </article>
        `).join("");

    } catch (error) {
        box.innerHTML = `
            <div class="empty-state">
                <h3>Could not load orders</h3>

                <p>${escapeHTML(errorText(error))}</p>

                <button
                    class="btn btn-outline"
                    id="retryOrdersButton">
                    Try again
                </button>
            </div>
        `;
    }
}

$("refreshOrdersButton").addEventListener(
    "click",
    loadOrders
);

document.addEventListener("click", event => {
    if (event.target.id === "ordersSignInButton") {
        openAuth();
    }

    if (event.target.id === "retryOrdersButton") {
        loadOrders();
    }
});

/* MOBILE MENU */

$("menuButton").addEventListener("click", () => {
    const navigation = $("desktopNav");

    navigation.classList.toggle("open");
    navigation.classList.toggle("mobile-open");

    const isOpen = navigation.classList.contains("open");

    $("menuButton").setAttribute(
        "aria-expanded",
        String(isOpen)
    );
});

document.querySelectorAll(".desktop-nav a").forEach(link => {
    link.addEventListener("click", () => {
        $("desktopNav").classList.remove("open", "mobile-open");

        $("menuButton").setAttribute(
            "aria-expanded",
            "false"
        );
    });
});

/* MODAL BACKDROP */

document.querySelectorAll(".modal").forEach(dialog => {
    dialog.addEventListener("click", event => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
});

/* FIRESTORE LISTINGS */

function startListingsListener() {
    if (unsubscribeListings) {
        unsubscribeListings();
    }

    const listingsQuery = query(
        collection(db, "products"),
        where("status", "==", "active")
    );

    unsubscribeListings = onSnapshot(
        listingsQuery,

        snapshot => {
            listings = snapshot.docs.map(document => ({
                id: document.id,
                ...document.data()
            }));

            applyFilters();
        },

        error => {
            $("resultsCount").textContent =
                "Unable to load listings";

            $("listingGrid").innerHTML = `
                <div class="empty-state">
                    <h3>Marketplace connection issue</h3>

                    <p>
                        ${escapeHTML(errorText(error))}
                    </p>
                </div>
            `;
        }
    );
}

/* ACCOUNT STATE */

onAuthStateChanged(auth, async currentUser => {
    user = currentUser;

    updateAuthInterface();
    applyFilters();

    if (user) {
        try {
            await saveSellerProfile(
                user.displayName || ""
            );
        } catch (error) {
            console.warn(
                "Seller profile update:",
                error
            );
        }

        await loadOrders();

    } else {
        loadOrders();
    }
});

/* PAGE INITIALIZATION */

$("year").textContent = new Date().getFullYear();

setAuthMode("signin");

renderCartBadge();
renderCart();

startListingsListener();

/* RESTORE PAGE AT TOP AFTER REFRESH */

if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

window.addEventListener("pageshow", event => {
    if (!window.location.hash) {
        window.scrollTo(0, 0);
    }
});