"use strict";

/*
 * POULTRYLINK
 * Firebase Authentication + Cloud Firestore
 *
 * Real listings only.
 * No demonstration products.
 * No client-side administrator privileges.
 */

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =========================================
   FIREBASE CONFIGURATION
========================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDUBwgGhDHj-v6kBE5Dn3O_FxF8EfPPfy4",
    authDomain: "poultrylink-2459a.firebaseapp.com",
    projectId: "poultrylink-2459a",
    storageBucket: "poultrylink-2459a.firebasestorage.app",
    messagingSenderId: "332920290687",
    appId: "1:332920290687:web:3e71c648817e1c07ba6e4a"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


/* =========================================
   APPLICATION STATE
========================================= */

const state = {
    search: "",
    category: "All",
    sort: "featured",
    products: [],
    user: null,
    loadingProducts: true,
    productsError: false
};


/* =========================================
   DOM HELPERS
========================================= */

function getElement(id) {
    return document.getElementById(id);
}

function getElements(selector) {
    return document.querySelectorAll(selector);
}

function escapeHTML(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => entities[character]
    );
}

function formatNaira(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}


/* =========================================
   NOTIFICATIONS
========================================= */

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

    window.setTimeout(() => toast.remove(), 4500);
}


/* =========================================
   FIREBASE ERROR MESSAGES
========================================= */

function friendlyAuthError(error) {
    const messages = {
        "auth/invalid-email":
            "Enter a valid email address.",

        "auth/user-not-found":
            "No account was found with those details.",

        "auth/wrong-password":
            "The email or password is incorrect.",

        "auth/invalid-credential":
            "The email or password is incorrect.",

        "auth/email-already-in-use":
            "An account already exists with this email. Try signing in.",

        "auth/weak-password":
            "Choose a stronger password with at least 6 characters.",

        "auth/too-many-requests":
            "Too many attempts. Please wait and try again.",

        "auth/network-request-failed":
            "Network error. Check your internet connection.",

        "auth/operation-not-allowed":
            "Email and password sign-in is not enabled in Firebase Authentication.",

        "auth/unauthorized-domain":
            "This website domain is not authorized in Firebase Authentication."
    };

    return messages[error.code] ||
        "Something went wrong. Please try again.";
}


/* =========================================
   MODALS
========================================= */

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

    getElement("modalClose")?.addEventListener(
        "click",
        closeModal
    );

    backdrop?.addEventListener("click", event => {
        if (event.target === backdrop) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });
}


/* =========================================
   REGISTRATION
========================================= */

function showRegisterModal() {
    openModal("Create your POULTRYLINK account", `
        <p>Create an account to get started.</p>

        <form id="registerForm">
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

            <div class="form-group">
                <label for="registerPassword">Password</label>
                <input
                    id="registerPassword"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    minlength="6"
                    required
                >
            </div>

            <div class="form-group">
                <label for="registerPasswordConfirm">
                    Confirm password
                </label>
                <input
                    id="registerPasswordConfirm"
                    name="confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    minlength="6"
                    required
                >
            </div>

            <button
                class="button button-primary"
                type="submit"
                id="registerSubmit"
            >
                Create account
            </button>
        </form>

        <p class="modal-note">
            You'll need to verify your email address before
            using features that require a verified account.
        </p>

        <button
            class="button button-outline"
            id="switchToLogin"
            type="button"
        >
            Already have an account? Sign in
        </button>
    `);

    getElement("switchToLogin")?.addEventListener(
        "click",
        showLoginModal
    );

    getElement("registerForm")?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const name = getElement("registerName")
                .value.trim();

            const email = getElement("registerEmail")
                .value.trim();

            const password = getElement("registerPassword")
                .value;

            const confirmPassword = getElement(
                "registerPasswordConfirm"
            ).value;

            const submitButton = getElement("registerSubmit");

            if (password !== confirmPassword) {
                showToast("Your passwords do not match.", "error");
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = "Creating account...";

            try {
                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                await sendEmailVerification(credential.user);

                /*
                 * Do not create the Firestore user profile yet.
                 * The published rules require a verified email.
                 * The profile is created after verified sign-in.
                 */

                await signOut(auth);

                closeModal();

                openModal("Verify your email", `
                    <p>
                        Your authentication account was created.
                    </p>

                    <p>
                        Check your email for a verification link,
                        then return here and sign in.
                    </p>

                    <p>
                        If you don't see the email, check your
                        spam or junk folder.
                    </p>

                    <button
                        class="button button-primary"
                        id="verifiedLoginButton"
                        type="button"
                    >
                        Go to sign in
                    </button>
                `);

                getElement("verifiedLoginButton")?.addEventListener(
                    "click",
                    showLoginModal
                );

            } catch (error) {
                console.error("Registration failed:", error);

                showToast(
                    friendlyAuthError(error),
                    "error"
                );

            } finally {
                if (getElement("registerSubmit")) {
                    getElement("registerSubmit").disabled = false;

                    getElement("registerSubmit").textContent =
                        "Create account";
                }
            }
        }
    );
}


/* =========================================
   SIGN IN
========================================= */

function showLoginModal() {
    openModal("Sign in to POULTRYLINK", `
        <form id="loginForm">
            <div class="form-group">
                <label for="loginEmail">Email address</label>
                <input
                    id="loginEmail"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                >
            </div>

            <div class="form-group">
                <label for="loginPassword">Password</label>
                <input
                    id="loginPassword"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                >
            </div>

            <button
                class="button button-primary"
                type="submit"
                id="loginSubmit"
            >
                Sign in
            </button>
        </form>

        <button
            class="button button-outline"
            type="button"
            id="forgotPasswordButton"
        >
            Forgot password?
        </button>

        <button
            class="button button-outline"
            type="button"
            id="switchToRegister"
        >
            Create an account
        </button>
    `);

    getElement("switchToRegister")?.addEventListener(
        "click",
        showRegisterModal
    );

    getElement("forgotPasswordButton")?.addEventListener(
        "click",
        showForgotPasswordModal
    );

    getElement("loginForm")?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const email = getElement("loginEmail")
                .value.trim();

            const password = getElement("loginPassword")
                .value;

            const submitButton = getElement("loginSubmit");

            submitButton.disabled = true;
            submitButton.textContent = "Signing in...";

            try {
                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                if (!credential.user.emailVerified) {
                    await signOut(auth);

                    openModal("Email verification required", `
                        <p>
                            Please verify your email address before
                            continuing.
                        </p>

                        <button
                            class="button button-primary"
                            id="resendVerificationButton"
                            type="button"
                        >
                            Resend verification email
                        </button>

                        <button
                            class="button button-outline"
                            id="returnToLoginButton"
                            type="button"
                        >
                            Back to sign in
                        </button>
                    `);

                    getElement(
                        "resendVerificationButton"
                    )?.addEventListener("click", async () => {
                        try {
                            const result =
                                await signInWithEmailAndPassword(
                                    auth,
                                    email,
                                    password
                                );

                            await sendEmailVerification(result.user);
                            await signOut(auth);

                            showToast(
                                "Verification email sent."
                            );

                            showLoginModal();

                        } catch (error) {
                            showToast(
                                friendlyAuthError(error),
                                "error"
                            );
                        }
                    });

                    getElement(
                        "returnToLoginButton"
                    )?.addEventListener("click", showLoginModal);

                    return;
                }

                await ensureUserProfile(credential.user);

                closeModal();

                showToast("You are signed in successfully.");

            } catch (error) {
                console.error("Sign-in failed:", error);

                showToast(
                    friendlyAuthError(error),
                    "error"
                );

            } finally {
                if (getElement("loginSubmit")) {
                    getElement("loginSubmit").disabled = false;
                    getElement("loginSubmit").textContent = "Sign in";
                }
            }
        }
    );
}


/* =========================================
   PASSWORD RESET
========================================= */

function showForgotPasswordModal() {
    openModal("Reset your password", `
        <p>
            Enter your account email address and we'll send
            password-reset instructions.
        </p>

        <form id="passwordResetForm">
            <div class="form-group">
                <label for="resetEmail">Email address</label>
                <input
                    id="resetEmail"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                >
            </div>

            <button
                class="button button-primary"
                type="submit"
            >
                Send reset email
            </button>
        </form>
    `);

    getElement("passwordResetForm")?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const email = getElement("resetEmail")
                .value.trim();

            try {
                await sendPasswordResetEmail(auth, email);

                closeModal();

                showToast(
                    "If the account can receive a reset email, instructions have been sent."
                );

            } catch (error) {
                console.error("Password reset failed:", error);

                showToast(
                    friendlyAuthError(error),
                    "error"
                );
            }
        }
    );
}


/* =========================================
   USER PROFILE
========================================= */

async function ensureUserProfile(user) {
    if (!user || !user.emailVerified) return;

    const profileRef = doc(db, "users", user.uid);

    try {
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
            /*
             * The Firestore rules allow a verified user to
             * create this exact profile structure.
             */
            await setDoc(profileRef, {
                displayName: user.displayName || "",
                email: user.email,
                phone: "",
                location: "",
                createdAt: serverTimestamp()
            });
        }

    } catch (error) {
        /*
         * Do not pretend profile creation succeeded.
         * Authentication may still have succeeded.
         */
        console.error("Profile setup failed:", error);

        showToast(
            "You signed in, but your profile could not be loaded. Check Firestore rules.",
            "error"
        );
    }
}


/* =========================================
   AUTHENTICATION STATE
========================================= */

function initializeAuthentication() {
    onAuthStateChanged(auth, async user => {
        state.user = user;

        const loginButton = getElement("loginButton");
        const registerButton = getElement("registerButton");

        if (loginButton) {
            loginButton.textContent = user
                ? "Sign out"
                : "Sign in";
        }

        if (registerButton) {
            registerButton.hidden = Boolean(user);
        }

        if (user && user.emailVerified) {
            await ensureUserProfile(user);
        }

        /*
         * No administrator status is inferred from email.
         * Only a trusted custom claim can authorize admin access.
         */
    });

    getElement("loginButton")?.addEventListener(
        "click",
        async () => {
            if (auth.currentUser) {
                try {
                    await signOut(auth);
                    showToast("You have signed out.");
                } catch (error) {
                    showToast(
                        "Unable to sign out. Please try again.",
                        "error"
                    );
                }
            } else {
                showLoginModal();
            }
        }
    );

    getElement("registerButton")?.addEventListener(
        "click",
        showRegisterModal
    );
}


/* =========================================
   FIRESTORE PRODUCTS
========================================= */

async function loadProducts() {
    state.loadingProducts = true;
    state.productsError = false;

    renderProducts();

    try {
        /*
         * Firestore rules require a query for active products.
         * No products are invented or inserted by this code.
         */
        const productsQuery = query(
            collection(db, "products"),
            where("status", "==", "active")
        );

        const snapshot = await getDocs(productsQuery);

        state.products = snapshot.docs.map(documentSnapshot => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
        }));

        state.productsError = false;

    } catch (error) {
        console.error("Could not load Firestore products:", error);

        state.products = [];
        state.productsError = true;

    } finally {
        state.loadingProducts = false;
        renderProducts();
    }
}


/* =========================================
   SEARCH AND FILTERS
========================================= */

function getVisibleProducts() {
    let result = [...state.products];

    if (state.search.trim()) {
        const searchTerm = state.search.trim().toLowerCase();

        result = result.filter(product => {
            const searchableText = [
                product.title,
                product.category,
                product.location,
                product.description
            ].join(" ").toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    if (state.category !== "All") {
        result = result.filter(
            product => product.category === state.category
        );
    }

    switch (state.sort) {
        case "price-low":
            result.sort((a, b) => a.price - b.price);
            break;

        case "price-high":
            result.sort((a, b) => b.price - a.price);
            break;

        case "name":
            result.sort((a, b) =>
                String(a.title || "").localeCompare(
                    String(b.title || "")
                )
            );
            break;

        default:
            result.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;

                return dateB - dateA;
            });
    }

    return result;
}


/* =========================================
   PRODUCT DISPLAY
========================================= */

function renderProducts() {
    const grid = getElement("productGrid");
    const count = getElement("productCount");

    if (!grid) return;

    if (state.loadingProducts) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Loading marketplace</h3>
                <p>Fetching real listings from POULTRYLINK.</p>
            </div>
        `;

        if (count) count.textContent = "Loading listings...";

        return;
    }

    if (state.productsError) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Listings could not be loaded</h3>
                <p>
                    Check your internet connection, Firebase
                    configuration, and Firestore security rules.
                </p>
                <button
                    class="button button-primary"
                    id="retryProductsButton"
                    type="button"
                >
                    Try again
                </button>
            </div>
        `;

        if (count) count.textContent = "Unable to load listings";

        getElement("retryProductsButton")?.addEventListener(
            "click",
            loadProducts
        );

        return;
    }

    const visibleProducts = getVisibleProducts();

    if (count) {
        count.textContent =
            `${visibleProducts.length} real listing` +
            `${visibleProducts.length === 1 ? "" : "s"} found`;
    }

    if (visibleProducts.length === 0) {
        const hasFilters =
            Boolean(state.search.trim()) ||
            state.category !== "All";

        grid.innerHTML = `
            <div class="empty-state">
                <h3>${
                    hasFilters
                        ? "No matching listings"
                        : "No listings available yet"
                }</h3>
                <p>${
                    hasFilters
                        ? "Try another search term or category."
                        : "There are currently no active products in the marketplace. Check back later."
                }</p>
            </div>
        `;

        return;
    }

    grid.innerHTML = visibleProducts.map(product => {
        const imageUrls = Array.isArray(product.imageUrls)
            ? product.imageUrls
            : [];

        const safeImageUrl = imageUrls.find(url =>
            typeof url === "string" &&
            /^https:\/\//i.test(url)
        );

        const imageMarkup = safeImageUrl
            ? `
                <img
                    src="${escapeHTML(safeImageUrl)}"
                    alt="${escapeHTML(product.title)}"
                    loading="lazy"
                >
            `
            : `
                <div
                    class="product-image-placeholder"
                    aria-label="No product image"
                >
                    🐔
                </div>
            `;

        return `
            <article class="product-card">
                <div class="product-image">
                    ${imageMarkup}
                </div>

                <div class="product-details">
                    <span class="product-category">
                        ${escapeHTML(product.category)}
                    </span>

                    <h3 class="product-title">
                        ${escapeHTML(product.title)}
                    </h3>

                    <p class="product-description">
                        ${escapeHTML(product.description || "")}
                    </p>

                    <p class="product-location">
                        📍 ${escapeHTML(product.location || "Location not provided")}
                    </p>

                    <p class="product-price">
                        ${formatNaira(product.price)}
                        <small>${escapeHTML(product.unit || "")}</small>
                    </p>

                    <p class="product-seller">
                        Verified seller listing
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


/* =========================================
   PRODUCT DETAILS
========================================= */

function showProductDetails(productId) {
    const product = state.products.find(
        item => item.id === productId
    );

    if (!product) {
        showToast("This listing is no longer available.", "error");
        return;
    }

    openModal(product.title || "Product details", `
        <p class="product-category">
            ${escapeHTML(product.category)}
        </p>

        <p>${escapeHTML(product.description || "")}</p>

        <p>
            <strong>Price:</strong>
            ${formatNaira(product.price)}
            ${escapeHTML(product.unit || "")}
        </p>

        <p>
            <strong>Location:</strong>
            ${escapeHTML(product.location || "Not provided")}
        </p>

        <p class="modal-note">
            Product information is supplied by the seller.
            Confirm availability and terms before purchasing.
        </p>
    `);
}


/* =========================================
   CONTACT SELLER
========================================= */

function contactSeller(productId) {
    const product = state.products.find(
        item => item.id === productId
    );

    if (!product) {
        showToast("This listing is no longer available.", "error");
        return;
    }

    openModal("Contact Seller", `
        <p>
            You selected
            <strong>${escapeHTML(product.title)}</strong>.
        </p>

        <p>
            <strong>Location:</strong>
            ${escapeHTML(product.location || "Not provided")}
        </p>

        <p class="modal-note">
            In-platform messaging has not been implemented yet.
            No message has been sent.
        </p>

        <button
            class="button button-primary"
            id="closeContactModal"
            type="button"
        >
            Close
        </button>
    `);

    getElement("closeContactModal")?.addEventListener(
        "click",
        closeModal
    );
}


/* =========================================
   FILTER INITIALIZATION
========================================= */

function updateActiveCategories() {
    getElements(".category-card").forEach(button => {
        const active =
            button.dataset.category === state.category;

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


/* =========================================
   SEARCH
========================================= */

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


/* =========================================
   PRODUCT BUTTONS
========================================= */

function initializeProductActions() {
    const grid = getElement("productGrid");

    if (!grid) return;

    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");

        if (!button || !grid.contains(button)) return;

        const productId = button.dataset.productId;

        if (button.dataset.action === "view-product") {
            showProductDetails(productId);
        }

        if (button.dataset.action === "contact-seller") {
            contactSeller(productId);
        }
    });
}


/* =========================================
   SELLER APPLICATION ENTRY POINT
========================================= */

function showSellerInformation() {
    if (!auth.currentUser) {
        openModal("Sign in to apply as a seller", `
            <p>
                You need an account before applying to sell
                on POULTRYLINK.
            </p>

            <button
                class="button button-primary"
                id="sellerSignInButton"
                type="button"
            >
                Sign in
            </button>

            <button
                class="button button-outline"
                id="sellerRegisterButton"
                type="button"
            >
                Create an account
            </button>
        `);

        getElement("sellerSignInButton")?.addEventListener(
            "click",
            showLoginModal
        );

        getElement("sellerRegisterButton")?.addEventListener(
            "click",
            showRegisterModal
        );

        return;
    }

    openModal("Seller applications", `
        <p>
            Seller applications require verified email,
            supporting information, and manual administrator
            review.
        </p>

        <p class="modal-note">
            The seller application form and trusted approval
            process have not been implemented yet.
        </p>
    `);
}


/* =========================================
   MOBILE NAVIGATION
========================================= */

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
        const isOpen = nav.classList.toggle("is-open");

        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.textContent = isOpen ? "✕" : "☰";
    });

    nav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", event => {
        if (
            !nav.contains(event.target) &&
            !toggle.contains(event.target)
        ) {
            closeMenu();
        }
    });
}


/* =========================================
   FOOTER
========================================= */

function initializeFooter() {
    const year = getElement("currentYear");

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }
}


/* =========================================
   START APPLICATION
========================================= */

function initializePoultryLink() {
    console.info("POULTRYLINK: Initializing Firebase application.");

    initializeModalControls();
    initializeAuthentication();
    initializeSearch();
    initializeFilters();
    initializeProductActions();
    initializeMobileNavigation();
    initializeFooter();

    getElement("becomeSellerButton")?.addEventListener(
        "click",
        showSellerInformation
    );

    getElement("footerSellerButton")?.addEventListener(
        "click",
        showSellerInformation
    );

    updateActiveCategories();

    /*
     * Load actual Firestore data.
     * No sample products are inserted.
     */
    loadProducts();

    console.info("POULTRYLINK: Initialization complete.");
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializePoultryLink,
        { once: true }
    );
} else {
    initializePoultryLink();
}