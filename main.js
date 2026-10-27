"use strict";

/*
 * POULTRYLINK — Firebase-connected marketplace.
 * Uses real Firestore records; no fake products or activity.
 * Secure checkout, messaging delivery, inventory enforcement,
 * and trusted administrator actions require backend implementation.
 */

import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const CATEGORIES = [
  "Live Birds",
  "Eggs",
  "Feeds",
  "Equipment",
  "Day-Old Chicks",
  "Services"
];

const CART_KEY = "poultrylink_cart_v1";
const SAVED_KEY = "poultrylink_saved_v1";

const state = {
  search: "",
  category: "All",
  sort: "featured",
  products: [],
  user: null,
  profile: null,
  seller: null,
  loadingProducts: true,
  productsError: false,
  saved: readLocalArray(SAVED_KEY),
  cart: readCart(),
  authReady: false
};

function readLocalArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || "{}");

    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

function persistLocal() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved));
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  } catch (error) {
    console.warn("Could not save cart or favorites.", error);
  }
}

function el(id) {
  return document.getElementById(id);
}

function all(selector) {
  return document.querySelectorAll(selector);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatNaira(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function toast(message, type = "success") {
  const box = el("toastContainer");

  if (!box) {
    console.log(message);
    return;
  }

  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.setAttribute("role", type === "error" ? "alert" : "status");
  item.textContent = message;

  box.appendChild(item);

  setTimeout(() => item.remove(), 4500);
}

function authError(error) {
  const messages = {
    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/invalid-api-key":
      "Firebase configuration is invalid. Check firebase-config.js.",

    "auth/app-not-authorized":
      "This website is not authorized for this Firebase project. Check your project and authorized domains.",

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
      "Enable email/password sign-in in Firebase Authentication.",

    "auth/unauthorized-domain":
      "Add this website domain to Firebase Authentication's authorized domains.",

    "auth/email-not-verified":
      "Verify your email address before using account features."
  };

  if (messages[error?.code]) {
    return messages[error.code];
  }

  console.error(
    "POULTRYLINK Firebase error:",
    error?.code || "unknown",
    error
  );

  return "The request could not be completed. Check your connection and Firebase settings, then try again.";
}

function openModal(title, content) {
  const backdrop = el("modalBackdrop");
  const body = el("modalContent");

  if (!backdrop || !body) {
    toast("The dialog could not be opened.", "error");
    return;
  }

  body.innerHTML = `
    <h2 id="modalTitle">${escapeHTML(title)}</h2>
    ${content}
  `;

  backdrop.classList.add("is-open");
  backdrop.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  el("modalClose")?.focus();
}

function closeModal() {
  const backdrop = el("modalBackdrop");

  if (!backdrop) return;

  backdrop.classList.remove("is-open");
  backdrop.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");
}

function bind(id, event, handler) {
  el(id)?.addEventListener(event, handler);
}

function requireSignedIn() {
  if (!state.user) {
    openLogin();
    return false;
  }

  if (!state.user.emailVerified) {
    toast("Verify your email before using this feature.", "error");
    return false;
  }

  return true;
}

function initModal() {
  bind("modalClose", "click", closeModal);

  el("modalBackdrop")?.addEventListener("click", event => {
    if (event.target === el("modalBackdrop")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

function openRegister() {
  openModal(
    "Create your POULTRYLINK account",
    `
      <form id="registerForm">
        <div class="form-group">
          <label for="registerName">Full name</label>
          <input
            id="registerName"
            autocomplete="name"
            maxlength="100"
            required
          >
        </div>

        <div class="form-group">
          <label for="registerEmail">Email address</label>
          <input
            id="registerEmail"
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
            type="password"
            autocomplete="new-password"
            minlength="6"
            required
          >
        </div>

        <button
          class="button button-primary"
          id="registerSubmit"
          type="submit"
        >
          Create account
        </button>
      </form>

      <p class="modal-note">
        Verify your email before using account features.
      </p>

      <button
        class="button button-outline"
        id="switchToLogin"
        type="button"
      >
        Already have an account? Sign in
      </button>
    `
  );

  bind("switchToLogin", "click", openLogin);

  bind("registerForm", "submit", async event => {
    event.preventDefault();

    const name = el("registerName").value.trim();
    const email = el("registerEmail").value.trim();
    const password = el("registerPassword").value;
    const confirm = el("registerPasswordConfirm").value;
    const button = el("registerSubmit");

    if (password !== confirm) {
      toast("Your passwords do not match.", "error");
      return;
    }

    button.disabled = true;
    button.textContent = "Creating account…";

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(credential.user, {
        displayName: name
      });

      await sendEmailVerification(credential.user);
      await signOut(auth);

      closeModal();

      openModal(
        "Verify your email",
        `
          <p>
            Your account has been created. Check your inbox and
            spam folder for the verification link, then sign in.
          </p>

          <button
            class="button button-primary"
            id="verifiedLoginButton"
            type="button"
          >
            Go to sign in
          </button>
        `
      );

      bind("verifiedLoginButton", "click", openLogin);
    } catch (error) {
      console.error(error);
      toast(authError(error), "error");
    } finally {
      if (el("registerSubmit")) {
        el("registerSubmit").disabled = false;
        el("registerSubmit").textContent = "Create account";
      }
    }
  });
}

function openLogin() {
  openModal(
    "Sign in to POULTRYLINK",
    `
      <form id="loginForm">
        <div class="form-group">
          <label for="loginEmail">Email address</label>
          <input
            id="loginEmail"
            type="email"
            autocomplete="email"
            required
          >
        </div>

        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input
            id="loginPassword"
            type="password"
            autocomplete="current-password"
            required
          >
        </div>

        <button
          class="button button-primary"
          id="loginSubmit"
          type="submit"
        >
          Sign in
        </button>
      </form>

      <button
        class="button button-outline"
        id="forgotPasswordButton"
        type="button"
      >
        Forgot password?
      </button>

      <button
        class="button button-outline"
        id="switchToRegister"
        type="button"
      >
        Create an account
      </button>
    `
  );

  bind("switchToRegister", "click", openRegister);
  bind("forgotPasswordButton", "click", openResetPassword);

  bind("loginForm", "submit", async event => {
    event.preventDefault();

    const email = el("loginEmail").value.trim();
    const password = el("loginPassword").value;
    const button = el("loginSubmit");

    button.disabled = true;
    button.textContent = "Signing in…";

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (!result.user.emailVerified) {
        await signOut(auth);

        openModal(
          "Email verification required",
          `
            <p>
              Please verify your email address before continuing.
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
          `
        );

        bind("resendVerificationButton", "click", async () => {
          try {
            const retry = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

            await sendEmailVerification(retry.user);
            await signOut(auth);

            toast("Verification email sent.");
            openLogin();
          } catch (error) {
            toast(authError(error), "error");
          }
        });

        bind("returnToLoginButton", "click", openLogin);
        return;
      }

      await ensureProfile(result.user);

      closeModal();
      toast("You are signed in.");
    } catch (error) {
      console.error(error);
      toast(authError(error), "error");
    } finally {
      if (el("loginSubmit")) {
        el("loginSubmit").disabled = false;
        el("loginSubmit").textContent = "Sign in";
      }
    }
  });
}

function openResetPassword() {
  openModal(
    "Reset your password",
    `
      <p>
        Enter your account email address and we'll send reset
        instructions.
      </p>

      <form id="resetForm">
        <div class="form-group">
          <label for="resetEmail">Email address</label>
          <input
            id="resetEmail"
            type="email"
            autocomplete="email"
            required
          >
        </div>

        <button class="button button-primary" type="submit">
          Send reset email
        </button>
      </form>
    `
  );

  bind("resetForm", "submit", async event => {
    event.preventDefault();

    try {
      await sendPasswordResetEmail(
        auth,
        el("resetEmail").value.trim()
      );

      closeModal();

      toast(
        "If the account can receive a reset email, instructions have been sent."
      );
    } catch (error) {
      toast(authError(error), "error");
    }
  });
}

/* =========================================================
   USER PROFILE AND FIREBASE AUTHENTICATION
========================================================= */

async function ensureProfile(user) {
  if (!user?.emailVerified) return;

  const ref = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: user.displayName || "",
        email: user.email,
        phone: "",
        location: "",
        createdAt: serverTimestamp()
      });

      state.profile = {
        displayName: user.displayName || "",
        email: user.email,
        phone: "",
        location: ""
      };
    } else {
      state.profile = snap.data();
    }
  } catch (error) {
    console.error("Profile setup failed:", error);

    toast(
      "Signed in, but your profile could not be loaded. Check Firestore rules.",
      "error"
    );
  }

  try {
    const sellerSnap = await getDoc(
      doc(db, "sellers", user.uid)
    );

    state.seller = sellerSnap.exists()
      ? sellerSnap.data()
      : null;
  } catch (error) {
    state.seller = null;
    console.warn("Seller record unavailable:", error);
  }
}

function initAuth() {
  onAuthStateChanged(auth, async user => {
    state.user = user;
    state.authReady = true;

    if (user?.emailVerified) {
      await ensureProfile(user);
    } else {
      state.profile = null;
      state.seller = null;
    }

    const login = el("loginButton");
    const register = el("registerButton");

    if (login) {
      login.textContent = user ? "Sign out" : "Log in";
    }

    if (register) {
      register.hidden = Boolean(user);
    }

    updateAccountControls();
  });

  bind("loginButton", "click", async () => {
    if (!auth.currentUser) {
      openLogin();
      return;
    }

    try {
      await signOut(auth);

      state.profile = null;
      state.seller = null;

      toast("You have signed out.");
    } catch (error) {
      console.error(error);
      toast(authError(error), "error");
    }
  });

  bind("registerButton", "click", openRegister);
}

function updateAccountControls() {
  const nav = el("mainNav");

  if (!nav) return;

  let button = el("accountDashboardButton");

  if (state.user?.emailVerified) {
    if (!button) {
      button = document.createElement("button");
      button.id = "accountDashboardButton";
      button.className = "nav-link";
      button.type = "button";
      button.textContent = "My Dashboard";

      nav.appendChild(button);

      button.addEventListener("click", openDashboard);
    }
  } else {
    button?.remove();
  }
}


/* =========================================================
   FIRESTORE MARKETPLACE
========================================================= */

async function loadProducts() {
  state.loadingProducts = true;
  state.productsError = false;

  renderProducts();

  try {
    const productsQuery = query(
      collection(db, "products"),
      where("status", "==", "active")
    );

    const snapshot = await getDocs(productsQuery);

    state.products = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));
  } catch (error) {
    console.error("Product query failed:", error);

    state.products = [];
    state.productsError = true;
  } finally {
    state.loadingProducts = false;
    renderProducts();
  }
}

function visibleProducts() {
  let products = [...state.products];

  if (state.search.trim()) {
    const term = state.search.trim().toLowerCase();

    products = products.filter(product => {
      const searchable = [
        product.title,
        product.category,
        product.location,
        product.description
      ].join(" ").toLowerCase();

      return searchable.includes(term);
    });
  }

  if (state.category !== "All") {
    products = products.filter(
      product => product.category === state.category
    );
  }

  if (state.sort === "price-low") {
    products.sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
  } else if (state.sort === "price-high") {
    products.sort(
      (a, b) => Number(b.price) - Number(a.price)
    );
  } else if (state.sort === "name") {
    products.sort(
      (a, b) =>
        String(a.title || "").localeCompare(
          String(b.title || "")
        )
    );
  } else {
    products.sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) -
        (a.createdAt?.toMillis?.() || 0)
    );
  }

  return products;
}

function renderProducts() {
  const grid = el("productGrid");
  const count = el("productCount");

  if (!grid) return;

  if (state.loadingProducts) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Loading marketplace</h3>
        <p>Fetching real listings from POULTRYLINK.</p>
      </div>
    `;

    if (count) {
      count.textContent = "Loading listings…";
    }

    return;
  }

  if (state.productsError) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Listings could not be loaded</h3>
        <p>
          Check your internet connection, Firebase configuration,
          and Firestore rules.
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

    if (count) {
      count.textContent = "Unable to load listings";
    }

    bind("retryProductsButton", "click", loadProducts);

    return;
  }

  const products = visibleProducts();

  if (count) {
    count.textContent =
      `${products.length} real listing` +
      `${products.length === 1 ? "" : "s"} found`;
  }

  if (!products.length) {
    const filtered =
      state.search || state.category !== "All";

    grid.innerHTML = `
      <div class="empty-state">
        <h3>
          ${filtered
            ? "No matching listings"
            : "No listings available yet"}
        </h3>

        <p>
          ${filtered
            ? "Try another search term or category."
            : "There are currently no active products in the marketplace."}
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML = products.map(product => {
    const urls = Array.isArray(product.imageUrls)
      ? product.imageUrls
      : [];

    const image = urls.find(
      url =>
        typeof url === "string" &&
        /^https:\/\//i.test(url)
    );

    const photo = image
      ? `
        <img
          src="${escapeHTML(image)}"
          alt="${escapeHTML(product.title)}"
          loading="lazy"
          referrerpolicy="no-referrer"
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

    const saved = state.saved.includes(product.id);

    return `
      <article class="product-card">

        <div class="product-image">
          ${photo}
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
            📍 ${escapeHTML(
              product.location || "Location not provided"
            )}
          </p>

          <p class="product-price">
            ${formatNaira(product.price)}
            <small>${escapeHTML(product.unit || "")}</small>
          </p>

          <p class="product-seller">
            POULTRYLINK marketplace listing
          </p>

          <div class="product-actions">

            <button
              class="button button-primary"
              type="button"
              data-action="details"
              data-id="${escapeHTML(product.id)}"
            >
              Details
            </button>

            <button
              class="button button-outline"
              type="button"
              data-action="save"
              data-id="${escapeHTML(product.id)}"
              aria-pressed="${saved}"
            >
              ${saved ? "♥ Saved" : "♡ Save"}
            </button>

            <button
              class="button button-outline"
              type="button"
              data-action="cart"
              data-id="${escapeHTML(product.id)}"
            >
              Add to cart
            </button>

            <button
              class="button button-outline"
              type="button"
              data-action="contact"
              data-id="${escapeHTML(product.id)}"
            >
              Contact seller
            </button>

          </div>
        </div>
      </article>
    `;
  }).join("");
}


/* =========================================================
   PRODUCT DETAILS, SAVED PRODUCTS AND CART
========================================================= */

function details(productId) {
  const product = state.products.find(
    item => item.id === productId
  );

  if (!product) {
    toast("This listing is no longer available.", "error");
    return;
  }

  const image = Array.isArray(product.imageUrls)
    ? product.imageUrls.find(
        url =>
          typeof url === "string" &&
          /^https:\/\//i.test(url)
      )
    : "";

  openModal(
    product.title || "Product details",
    `
      ${image
        ? `
          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(product.title)}"
            style="width:100%;max-height:260px;object-fit:contain"
          >
        `
        : ""}

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
        Confirm stock, delivery terms, and seller details directly
        before agreeing to purchase. Online payment is not enabled.
      </p>

      <button
        class="button button-primary"
        id="detailAddCart"
        type="button"
      >
        Add to cart
      </button>
    `
  );

  bind("detailAddCart", "click", () => {
    addToCart(productId);
    closeModal();
  });
}

function toggleSaved(id) {
  state.saved = state.saved.includes(id)
    ? state.saved.filter(item => item !== id)
    : [...state.saved, id];

  persistLocal();
  renderProducts();

  toast(
    state.saved.includes(id)
      ? "Saved on this device."
      : "Removed from saved products."
  );
}

function addToCart(id) {
  const product = state.products.find(
    item => item.id === id
  );

  if (!product) {
    toast("Listing unavailable.", "error");
    return;
  }

  state.cart[id] = Math.max(
    1,
    Number(state.cart[id] || 0) + 1
  );

  persistLocal();

  toast("Added to your cart on this device.");
}

function removeCart(id) {
  delete state.cart[id];

  persistLocal();
  openCart();
}

function openCart() {
  const rows = Object.entries(state.cart)
    .map(([id, quantity]) => ({
      product: state.products.find(
        item => item.id === id
      ),
      id,
      quantity: Number(quantity)
    }))
    .filter(item => item.product);

  const total = rows.reduce(
    (sum, item) =>
      sum +
      Number(item.product.price || 0) *
      item.quantity,
    0
  );

  openModal(
    "Your cart",
    rows.length
      ? `
        ${rows.map(item => `
          <div
            class="cart-row"
            style="padding:12px 0;border-bottom:1px solid #ddd"
          >
            <strong>
              ${escapeHTML(item.product.title)}
            </strong>

            <p>
              ${formatNaira(item.product.price)}
              × ${item.quantity}
            </p>

            <div>
              <button
                class="button button-outline"
                data-cart-action="minus"
                data-id="${escapeHTML(item.id)}"
                type="button"
              >
                −
              </button>

              <button
                class="button button-outline"
                data-cart-action="plus"
                data-id="${escapeHTML(item.id)}"
                type="button"
              >
                +
              </button>

              <button
                class="button button-outline"
                data-cart-action="remove"
                data-id="${escapeHTML(item.id)}"
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        `).join("")}

        <h3>Subtotal: ${formatNaira(total)}</h3>

        <p class="modal-note">
          This cart is stored on this device. Secure order creation,
          stock reservation, delivery fees, and payment are not
          connected yet, so checkout is disabled.
        </p>

        <button
          class="button button-primary"
          type="button"
          disabled
        >
          Checkout unavailable
        </button>
      `
      : `
        <div class="empty-state">
          <h3>Your cart is empty</h3>
          <p>Add real marketplace listings to begin.</p>
        </div>
      `
  );

  all("[data-cart-action]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.cartAction;

      if (action === "remove") {
        delete state.cart[id];
      } else {
        const current = Number(state.cart[id] || 1);

        state.cart[id] = Math.max(
          1,
          current + (action === "plus" ? 1 : -1)
        );
      }

      persistLocal();
      openCart();
    });
  });
}

/* =========================================================
   PART 3: PROFILE, SELLER APPLICATIONS & LISTINGS
========================================================= */

/* =========================================================
   1. USER PROFILE
========================================================= */

function openProfile() {
    if (!requireSignedIn()) return;

    const profile = state.profile || {};

    openModal(
        "My Profile",
        `
        <form id="profileForm">

            <div class="form-group">
                <label for="profileName">Full name</label>
                <input
                    id="profileName"
                    type="text"
                    maxlength="100"
                    required
                    value="${escapeHTML(
                        profile.displayName ||
                        state.user.displayName ||
                        ""
                    )}"
                >
            </div>

            <div class="form-group">
                <label for="profilePhone">Phone number</label>
                <input
                    id="profilePhone"
                    type="tel"
                    maxlength="30"
                    value="${escapeHTML(profile.phone || "")}"
                    placeholder="Your contact number"
                >
            </div>

            <div class="form-group">
                <label for="profileLocation">Location</label>
                <input
                    id="profileLocation"
                    type="text"
                    maxlength="150"
                    value="${escapeHTML(profile.location || "")}"
                    placeholder="Town, LGA, State"
                >
            </div>

            <p class="modal-note">
                Email address:
                ${escapeHTML(state.user.email || "")}
            </p>

            <button
                class="button button-primary"
                id="profileSave"
                type="submit"
            >
                Save Profile
            </button>

        </form>
        `
    );

    bind("profileForm", "submit", async (event) => {
        event.preventDefault();

        if (!requireSignedIn()) return;

        const displayName = el("profileName").value.trim();
        const phone = el("profilePhone").value.trim();
        const location = el("profileLocation").value.trim();

        if (!displayName) {
            toast("Please enter your full name.", "error");
            return;
        }

        const button = el("profileSave");
        button.disabled = true;

        try {
            await updateDoc(
                doc(db, "users", state.user.uid),
                {
                    displayName,
                    phone,
                    location
                }
            );

            await updateProfile(state.user, {
                displayName
            });

            state.profile = {
                ...state.profile,
                displayName,
                phone,
                location
            };

            closeModal();

            toast("Your profile has been updated.");

        } catch (error) {
            console.error("Profile update failed:", error);

            toast(
                "Profile could not be saved. Check your Firestore rules.",
                "error"
            );

        } finally {
            const saveButton = el("profileSave");

            if (saveButton) {
                saveButton.disabled = false;
            }
        }
    });
}


/* =========================================================
   2. SELLER APPLICATION
========================================================= */

function openSellerApplication() {
    if (!requireSignedIn()) return;

    if (
        state.seller?.verificationStatus === "approved" &&
        state.seller?.accountStatus === "active"
    ) {
        openSellerDashboard();
        return;
    }

    openModal(
        "Apply to Become a Seller",
        `
        <p>
            Apply to sell poultry products on POULTRYLINK.
            Applications are reviewed before seller access is granted.
        </p>

        <form id="sellerApplicationForm">

            <div class="form-group">
                <label for="sellerLegalName">
                    Full or legal name
                </label>

                <input
                    id="sellerLegalName"
                    type="text"
                    maxlength="150"
                    required
                    value="${escapeHTML(
                        state.profile?.displayName ||
                        state.user.displayName ||
                        ""
                    )}"
                >
            </div>

            <div class="form-group">
                <label for="sellerPhone">Phone number</label>

                <input
                    id="sellerPhone"
                    type="tel"
                    maxlength="30"
                    required
                    value="${escapeHTML(
                        state.profile?.phone || ""
                    )}"
                >
            </div>

            <div class="form-group">
                <label for="sellerState">State</label>

                <input
                    id="sellerState"
                    type="text"
                    maxlength="80"
                    required
                >
            </div>

            <div class="form-group">
                <label for="sellerLga">
                    Local Government Area
                </label>

                <input
                    id="sellerLga"
                    type="text"
                    maxlength="100"
                    required
                >
            </div>

            <div class="form-group">
                <label for="sellerFarmLocation">
                    Farm or business location
                </label>

                <input
                    id="sellerFarmLocation"
                    type="text"
                    maxlength="250"
                    required
                >
            </div>

            <fieldset class="form-group">
                <legend>
                    Products or services you intend to sell
                </legend>

                ${CATEGORIES.map(category => `
                    <label style="display:block; margin:8px 0;">
                        <input
                            type="checkbox"
                            name="sellerCategory"
                            value="${escapeHTML(category)}"
                        >
                        ${escapeHTML(category)}
                    </label>
                `).join("")}

            </fieldset>

            <p class="modal-note">
                Submit accurate information.
                Never include your password or payment details.
            </p>

            <button
                class="button button-primary"
                id="sellerApplySubmit"
                type="submit"
            >
                Submit Application
            </button>

        </form>
        `
    );

    bind(
        "sellerApplicationForm",
        "submit",
        async (event) => {
            event.preventDefault();

            if (!requireSignedIn()) return;

            const selectedCategories = [
                ...document.querySelectorAll(
                    'input[name="sellerCategory"]:checked'
                )
            ].map(input => input.value);

            if (selectedCategories.length === 0) {
                toast(
                    "Choose at least one product or service category.",
                    "error"
                );

                return;
            }

            const button = el("sellerApplySubmit");
            button.disabled = true;

            try {
                const applicationRef = doc(
                    db,
                    "sellerApplications",
                    state.user.uid
                );

                const existingApplication = await getDoc(
                    applicationRef
                );

                if (existingApplication.exists()) {
                    toast(
                        "An application already exists. Contact support to check its status.",
                        "error"
                    );

                    return;
                }

                const applicationData = {
                    applicantUid: state.user.uid,

                    legalName:
                        el("sellerLegalName").value.trim(),

                    phone:
                        el("sellerPhone").value.trim(),

                    state:
                        el("sellerState").value.trim(),

                    lga:
                        el("sellerLga").value.trim(),

                    farmLocation:
                        el("sellerFarmLocation").value.trim(),

                    intendedProducts: selectedCategories,

                    evidencePaths: [],

                    status: "pending",

                    submittedAt: serverTimestamp()
                };

                await setDoc(
                    applicationRef,
                    applicationData
                );

                closeModal();

                toast(
                    "Your seller application has been submitted for review."
                );

            } catch (error) {
                console.error(
                    "Seller application failed:",
                    error
                );

                toast(
                    "Application failed. Check your email verification and Firestore rules.",
                    "error"
                );

            } finally {
                const submitButton = el("sellerApplySubmit");

                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        }
    );
}


/* =========================================================
   3. CREATE PRODUCT LISTING
========================================================= */

function openListingForm() {
    if (!requireSignedIn()) return;

    const sellerIsApproved =
        state.seller?.verificationStatus === "approved" &&
        state.seller?.accountStatus === "active";

    if (!sellerIsApproved) {
        toast(
            "Only approved and active sellers can create listings.",
            "error"
        );

        return;
    }

    openModal(
        "Create a Product Listing",
        `
        <form id="listingForm">

            <div class="form-group">
                <label for="listingTitle">Product title</label>

                <input
                    id="listingTitle"
                    type="text"
                    maxlength="150"
                    required
                    placeholder="Example: Fresh broiler chickens"
                >
            </div>

            <div class="form-group">
                <label for="listingCategory">Category</label>

                <select id="listingCategory" required>
                    ${CATEGORIES.map(category => `
                        <option value="${escapeHTML(category)}">
                            ${escapeHTML(category)}
                        </option>
                    `).join("")}
                </select>
            </div>

            <div class="form-group">
                <label for="listingDescription">
                    Product description
                </label>

                <textarea
                    id="listingDescription"
                    maxlength="5000"
                    rows="4"
                    required
                    placeholder="Describe your product..."
                ></textarea>
            </div>

            <div class="form-group">
                <label for="listingPrice">
                    Price in Nigerian naira (₦)
                </label>

                <input
                    id="listingPrice"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="Example: 15000"
                >
            </div>

            <div class="form-group">
                <label for="listingUnit">Selling unit</label>

                <input
                    id="listingUnit"
                    type="text"
                    maxlength="60"
                    required
                    placeholder="Per bird, crate, bag, etc."
                >
            </div>

            <div class="form-group">
                <label for="listingLocation">Product location</label>

                <input
                    id="listingLocation"
                    type="text"
                    maxlength="150"
                    required
                    placeholder="Town, LGA, State"
                >
            </div>

            <div class="form-group">
                <label for="listingImageUrls">
                    Product image URLs
                </label>

                <textarea
                    id="listingImageUrls"
                    rows="3"
                    placeholder="Enter HTTPS image URLs, one per line"
                ></textarea>
            </div>

            <p class="modal-note">
                New listings are submitted for review.
                Only HTTPS image URLs are accepted by this form.
                Direct image uploads are not implemented here.
            </p>

            <button
                class="button button-primary"
                id="listingSubmit"
                type="submit"
            >
                Submit Listing
            </button>

        </form>
        `
    );

    bind("listingForm", "submit", async (event) => {
        event.preventDefault();

        if (!requireSignedIn()) return;

        const sellerIsStillApproved =
            state.seller?.verificationStatus === "approved" &&
            state.seller?.accountStatus === "active";

        if (!sellerIsStillApproved) {
            toast(
                "Your seller account is not currently approved and active.",
                "error"
            );

            return;
        }

        const title = el("listingTitle").value.trim();
        const description =
            el("listingDescription").value.trim();

        const price = Number(
            el("listingPrice").value
        );

        const unit = el("listingUnit").value.trim();
        const location = el("listingLocation").value.trim();

        const imageUrls = el("listingImageUrls")
            .value
            .split(/\r?\n/)
            .map(url => url.trim())
            .filter(Boolean);

        if (!title || !description || !unit || !location) {
            toast(
                "Complete all required listing fields.",
                "error"
            );

            return;
        }

        if (!Number.isFinite(price) || price <= 0) {
            toast(
                "Enter a valid price greater than zero.",
                "error"
            );

            return;
        }

        const invalidImageUrl = imageUrls.some(url => {
            try {
                const parsedUrl = new URL(url);

                return parsedUrl.protocol !== "https:";

            } catch {
                return true;
            }
        });

        if (invalidImageUrl) {
            toast(
                "Every image URL must be a valid HTTPS URL.",
                "error"
            );

            return;
        }

        const button = el("listingSubmit");
        button.disabled = true;

        try {
            const listingData = {
                sellerId: state.user.uid,

                title,

                description,

                category: el("listingCategory").value,

                price,

                unit,

                location,

                imageUrls,

                status: "pending_review",

                createdAt: serverTimestamp(),

                updatedAt: serverTimestamp()
            };

            await addDoc(
                collection(db, "products"),
                listingData
            );

            closeModal();

            toast(
                "Your listing has been submitted for review."
            );

            await loadProducts();

        } catch (error) {
            console.error(
                "Product listing failed:",
                error
            );

            toast(
                "Listing could not be saved. Check seller approval and Firestore rules.",
                "error"
            );

        } finally {
            const submitButton = el("listingSubmit");

            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}


/* =========================================================
   4. SELLER DASHBOARD
========================================================= */

async function openSellerDashboard() {
    if (!requireSignedIn()) return;

    try {
        const productsQuery = query(
            collection(db, "products"),
            where("sellerId", "==", state.user.uid)
        );

        const snapshot = await getDocs(productsQuery);

        const listings = snapshot.docs.map(documentSnapshot => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
        }));

        const listingMarkup = listings.length
            ? listings.map(product => `
                <div
                    style="
                        padding:12px 0;
                        border-bottom:1px solid #ddd;
                    "
                >
                    <strong>
                        ${escapeHTML(product.title || "Untitled product")}
                    </strong>

                    <p>
                        ${formatNaira(product.price)}
                        ${escapeHTML(product.unit || "")}
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(product.status || "Unknown")}
                    </p>
                </div>
            `).join("")
            : `
                <p>
                    You have not created any product listings yet.
                </p>
            `;

        openModal(
            "Seller Dashboard",
            `
            <div class="seller-status">

                <p>
                    <strong>Verification:</strong>
                    ${escapeHTML(
                        state.seller?.verificationStatus ||
                        "No seller record"
                    )}
                </p>

                <p>
                    <strong>Account status:</strong>
                    ${escapeHTML(
                        state.seller?.accountStatus ||
                        "Not active"
                    )}
                </p>

            </div>

            <button
                class="button button-primary"
                id="newListingButton"
                type="button"
            >
                Create Product Listing
            </button>

            <h3>
                My Listings (${listings.length})
            </h3>

            <div class="seller-listings">
                ${listingMarkup}
            </div>

            <p class="modal-note">
                Order management, inventory management, and
                listing editing require additional backend
                functionality.
            </p>
            `
        );

        bind(
            "newListingButton",
            "click",
            openListingForm
        );

    } catch (error) {
        console.error(
            "Seller dashboard failed:",
            error
        );

        toast(
            "Seller listings could not be loaded. Check your Firestore permissions.",
            "error"
        );
    }
}

/* =========================================================
   PART 4: DASHBOARD, SAVED PRODUCTS & INITIALIZATION
========================================================= */


/* =========================================================
   1. MAIN USER DASHBOARD
========================================================= */

function openDashboard() {
    if (!requireSignedIn()) return;

    const displayName =
        state.profile?.displayName ||
        state.user.displayName ||
        state.user.email ||
        "User";

    openModal(
        "My Dashboard",
        `
        <p>
            Signed in as
            <strong>${escapeHTML(displayName)}</strong>
        </p>

        <div style="display:grid;gap:10px;">

            <button
                class="button button-primary"
                id="dashboardProfile"
                type="button"
            >
                Profile & Settings
            </button>

            <button
                class="button button-outline"
                id="dashboardSaved"
                type="button"
            >
                Saved Products (${state.saved.length})
            </button>

            <button
                class="button button-outline"
                id="dashboardCart"
                type="button"
            >
                Shopping Cart (${Object.keys(state.cart).length})
            </button>

            <button
                class="button button-outline"
                id="dashboardSellerApply"
                type="button"
            >
                Apply to Sell / Seller Status
            </button>

            <button
                class="button button-outline"
                id="dashboardSeller"
                type="button"
            >
                Seller Dashboard
            </button>

        </div>

        <h3>Orders & Activity</h3>

        <p class="modal-note">
            Order history, notifications, and in-platform
            messaging are not yet connected to a backend.
        </p>
        `
    );

    bind(
        "dashboardProfile",
        "click",
        openProfile
    );

    bind(
        "dashboardSaved",
        "click",
        openSaved
    );

    bind(
        "dashboardCart",
        "click",
        openCart
    );

    bind(
        "dashboardSellerApply",
        "click",
        openSellerApplication
    );

    bind(
        "dashboardSeller",
        "click",
        openSellerDashboard
    );
}


/* =========================================================
   2. SAVED PRODUCTS
========================================================= */

function openSaved() {
    const savedProducts = state.saved
        .map(id => state.products.find(product => product.id === id))
        .filter(Boolean);

    const content = savedProducts.length
        ? savedProducts.map(product => `
            <div
                style="
                    padding:12px 0;
                    border-bottom:1px solid #ddd;
                "
            >

                <strong>
                    ${escapeHTML(product.title)}
                </strong>

                <p>
                    ${formatNaira(product.price)}
                    ${escapeHTML(product.unit || "")}
                </p>

                <button
                    class="button button-outline"
                    data-saved-remove="${escapeHTML(product.id)}"
                    type="button"
                >
                    Remove
                </button>

                <button
                    class="button button-primary"
                    data-saved-details="${escapeHTML(product.id)}"
                    type="button"
                >
                    View Details
                </button>

            </div>
        `).join("")
        : `
            <div class="empty-state">
                <h3>No Saved Products</h3>

                <p>
                    Save products from the marketplace to
                    find them more easily later.
                </p>
            </div>
        `;

    openModal(
        "Saved Products",
        content
    );

    all("[data-saved-remove]").forEach(button => {
        button.addEventListener("click", () => {
            toggleSaved(button.dataset.savedRemove);
            openSaved();
        });
    });

    all("[data-saved-details]").forEach(button => {
        button.addEventListener("click", () => {
            details(button.dataset.savedDetails);
        });
    });
}


/* =========================================================
   3. CONTACT SELLER
========================================================= */

function openContact(productId) {
    const product = state.products.find(
        item => item.id === productId
    );

    if (!product) {
        toast(
            "This product is no longer available.",
            "error"
        );

        return;
    }

    openModal(
        "Contact Seller",
        `
        <p>
            You selected
            <strong>${escapeHTML(product.title)}</strong>.
        </p>

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
            Direct messaging is not yet connected.
            No message has been sent and no order has been created.
            Confirm seller details and payment terms before
            completing a transaction.
        </p>

        <button
            class="button button-primary"
            id="closeContact"
            type="button"
        >
            Close
        </button>
        `
    );

    bind(
        "closeContact",
        "click",
        closeModal
    );
}


/* =========================================================
   4. SEARCH, FILTERS & SORTING
========================================================= */

function initSearchAndFilters() {
    const searchForm = el("searchForm");
    const searchInput = el("searchInput");
    const categoryFilter = el("categoryFilter");
    const sortFilter = el("sortFilter");

    searchForm?.addEventListener("submit", event => {
        event.preventDefault();

        state.search = searchInput?.value || "";

        renderProducts();

        el("marketplace")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    searchInput?.addEventListener("input", () => {
        state.search = searchInput.value;

        renderProducts();
    });

    categoryFilter?.addEventListener("change", () => {
        state.category = categoryFilter.value;

        updateCategories();
        renderProducts();
    });

    sortFilter?.addEventListener("change", () => {
        state.sort = sortFilter.value;

        renderProducts();
    });

    bind(
        "clearFiltersButton",
        "click",
        () => {
            state.search = "";
            state.category = "All";
            state.sort = "featured";

            if (searchInput) {
                searchInput.value = "";
            }

            if (categoryFilter) {
                categoryFilter.value = "All";
            }

            if (sortFilter) {
                sortFilter.value = "featured";
            }

            updateCategories();
            renderProducts();
        }
    );

    all(".category-card").forEach(button => {
        button.addEventListener("click", () => {
            state.category = button.dataset.category || "All";

            if (categoryFilter) {
                categoryFilter.value = state.category;
            }

            updateCategories();
            renderProducts();

            el("marketplace")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });
}


/* =========================================================
   5. CATEGORY BUTTON STATES
========================================================= */

function updateCategories() {
    all(".category-card").forEach(button => {
        const isActive =
            button.dataset.category === state.category;

        button.classList.toggle(
            "active",
            isActive
        );

        button.setAttribute(
            "aria-pressed",
            String(isActive)
        );
    });
}


/* =========================================================
   6. PRODUCT BUTTON HANDLERS
========================================================= */

function initProductActions() {
    const productGrid = el("productGrid");

    if (!productGrid) return;

    productGrid.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");

        if (!button || !productGrid.contains(button)) {
            return;
        }

        const productId = button.dataset.id;
        const action = button.dataset.action;

        if (!productId) return;

        switch (action) {
            case "details":
                details(productId);
                break;

            case "save":
                toggleSaved(productId);
                break;

            case "cart":
                addToCart(productId);
                break;

            case "contact":
                openContact(productId);
                break;

            default:
                console.warn(
                    "Unknown product action:",
                    action
                );
        }
    });
}


/* =========================================================
   7. MOBILE NAVIGATION
========================================================= */

function initMobileNav() {
    const menuToggle = el("menuToggle");
    const mainNav = el("mainNav");

    if (!menuToggle || !mainNav) return;

    function closeMenu() {
        mainNav.classList.remove("is-open");

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        menuToggle.textContent = "☰";
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("is-open");

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    mainNav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", event => {
        if (
            !mainNav.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            closeMenu();
        }
    });
}


/* =========================================================
   8. HEADER & FOOTER BUTTONS
========================================================= */

function initHeaderAndFooter() {
    bind(
        "becomeSellerButton",
        "click",
        openSellerApplication
    );

    bind(
        "footerSellerButton",
        "click",
        openSellerApplication
    );

    const currentYear = el("currentYear");

    if (currentYear) {
        currentYear.textContent = String(
            new Date().getFullYear()
        );
    }

    let cartButton = el("cartButton");

    if (!cartButton) {
        const mainNav = el("mainNav");

        if (mainNav) {
            cartButton = document.createElement("button");

            cartButton.id = "cartButton";
            cartButton.type = "button";
            cartButton.className = "nav-link";
            cartButton.textContent = "Cart";

            mainNav.appendChild(cartButton);
        }
    }

    bind(
        "cartButton",
        "click",
        openCart
    );
}


/* =========================================================
   9. APPLICATION INITIALIZATION
========================================================= */

function init() {
    console.info(
        "POULTRYLINK: initializing marketplace"
    );

    initModal();

    initAuth();

    initSearchAndFilters();

    initProductActions();

    initMobileNav();

    initHeaderAndFooter();

    updateCategories();

    loadProducts();
}


/* =========================================================
   10. START APPLICATION
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        init,
        { once: true }
    );
} else {
    init();
}