/* PoultryLink — Firebase marketplace frontend
   Payments are intentionally NOT integrated.
   Never place a Paystack secret key in this file.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
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
const all = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

let currentUser = null;
let products = [];
let profile = {};
let storefront = {};
let savedIds = new Set();
let cart = readCart();
let activeAuthMode = "login";
let unsubscribeProducts = null;
let dashboardTab = "overview";

const CART_KEY = "poultrylink_cart_v2";

const CATEGORIES = [
  "Eggs",
  "Layers",
  "Broilers",
  "Chicks",
  "Feed",
  "Equipment",
  "Manure",
  "Services"
];

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra",
  "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun",
  "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara"
];

const artMap = {
  Eggs: "🥚",
  Layers: "🐔",
  Broilers: "🍗",
  Chicks: "🐣",
  Feed: "🌾",
  Equipment: "🧰",
  Manure: "🌱",
  Services: "🛠️"
};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function money(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function showToast(message) {
  const region = $("toastRegion");

  if (region) {
    region.textContent = message;
    region.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(
      () => region.classList.remove("show"),
      3200
    );
  } else {
    console.info("PoultryLink:", message);
  }

  const live = $("appLiveStatus");

  if (live) {
    live.textContent = message;
  }
}

function showError(targetId, message) {
  const el = $(targetId);

  if (el) {
    el.textContent = message;
  } else {
    showToast(message);
  }
}

function friendlyError(error) {
  const map = {
    "auth/email-already-in-use":
      "That email already has an account. Please sign in.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account was found for that email.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/weak-password":
      "Choose a password with at least six characters.",

    "auth/too-many-requests":
      "Too many attempts. Wait a little and try again.",

    "auth/network-request-failed":
      "Network problem. Check your connection and try again.",

    "permission-denied":
      "Firebase denied this action under the current Firestore rules.",

    "unavailable":
      "Firebase is temporarily unavailable. Check your internet connection."
  };

  return map[error?.code] ||
    error?.message ||
    "Something went wrong. Please try again.";
}

function openDialog(id) {
  const el = $(id);

  if (el?.showModal && !el.open) {
    el.showModal();
  }
}

function closeDialog(id) {
  const el = $(id);

  if (el?.open) {
    el.close();
  }
}

function openAuth(mode = "login") {
  setAuthMode(mode);
  openDialog("authDialog");
}

function setAuthMode(mode) {
  activeAuthMode =
    mode === "register" || mode === "signup"
      ? "register"
      : "login";

  const registering = activeAuthMode === "register";

  const title =
    $("authDialogTitle") || $("authTitle");

  if (title) {
    title.textContent = registering
      ? "Create your PoultryLink account"
      : "Welcome back";
  }

  const description =
    $("authDialogDescription") || $("authSubtitle");

  if (description) {
    description.textContent = registering
      ? "Create one account to buy and sell poultry products."
      : "Sign in to manage your marketplace activity.";
  }

  const nameField = $("authNameField");

  if (nameField) {
    nameField.classList.toggle("hidden", !registering);
  }

  const nameInput =
    $("authDisplayName") || $("authName");

  if (nameInput) {
    nameInput.required = registering;
  }

  const confirmField = $("authConfirmPasswordField");

  if (confirmField) {
    confirmField.classList.toggle("hidden", !registering);
  }

  const termsField = $("authTermsField");

  if (termsField) {
    termsField.classList.toggle("hidden", !registering);
  }

  const submit = $("authSubmitButton");

  if (submit) {
    submit.textContent = registering
      ? "Create account"
      : "Sign in";
  }

  const oldSwitch = $("authSwitchButton");

  if (oldSwitch) {
    oldSwitch.textContent = registering
      ? "Already have an account? Sign in"
      : "Need an account? Create one";
  }

  const error = $("authError") || $("authMessage");

  if (error) {
    error.textContent = "";
  }

  all("[data-auth-mode]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.authMode === activeAuthMode
    );
  });
}

function updateAuthUI() {
  const signed = !!currentUser;

  [
    "signInButton",
    "headerCreateAccountButton",
    "footerSignInButton",
    "footerCreateAccountButton"
  ].forEach(id => {
    const el = $(id);

    if (el) {
      el.classList.toggle(
        "hidden",
        signed &&
          (id.includes("SignIn") || id.includes("CreateAccount"))
      );
    }
  });

  const userArea = $("headerUserArea");

  if (userArea) {
    userArea.classList.toggle("hidden", !signed);
  }

  const display =
    currentUser?.displayName ||
    profile.displayName ||
    "PoultryLink member";

  [
    "headerUserName",
    "dashboardSidebarName",
    "profileDisplayName"
  ].forEach(id => {
    if ($(id)) {
      $(id).textContent = display;
    }
  });

  [
    "headerUserAvatar",
    "dashboardSidebarAvatar",
    "profileAvatar"
  ].forEach(id => {
    if ($(id)) {
      $(id).textContent =
        (display.trim()[0] || "P").toUpperCase();
    }
  });

  if ($("profileEmail")) {
    $("profileEmail").value = currentUser?.email || "";
  }

  if ($("authSignedInEmail")) {
    $("authSignedInEmail").textContent =
      currentUser?.email || "";
  }

  if ($("authSignedInState")) {
    $("authSignedInState").classList.toggle(
      "hidden",
      !signed
    );
  }

  if ($("authForm")) {
    $("authForm").classList.toggle("hidden", signed);
  }

  if ($("accountContent")) {
    $("accountContent").classList.toggle("hidden", signed);
  }

  if ($("signedInControls")) {
    $("signedInControls").classList.toggle(
      "hidden",
      !signed
    );
  }

  if ($("dashboardPage")) {
    $("dashboardPage").classList.toggle("hidden", !signed);
  }

  if ($("dashboardWelcomeTitle")) {
    $("dashboardWelcomeTitle").textContent =
      `Welcome, ${display}`;
  }

  if ($("dashboardWelcomeSubtitle")) {
    $("dashboardWelcomeSubtitle").textContent =
      "Your poultry marketplace activity, all in one place.";
  }
}

async function ensureUserDocuments(user) {
  const profileRef = doc(db, "profiles", user.uid);
  const snap = await getDoc(profileRef);

  if (!snap.exists()) {
    profile = {
      displayName: user.displayName || "",
      email: user.email || "",
      phone: "",
      accountType: "both",
      state: "",
      town: "",
      bio: "",
      photoURL: "",
      publicProfile: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(profileRef, profile);
  } else {
    profile = snap.data() || {};
  }

  const sellerRef = doc(db, "sellers", user.uid);
  const sellerSnap = await getDoc(sellerRef);

  if (!sellerSnap.exists()) {
    await setDoc(sellerRef, {
      uid: user.uid,
      email: user.email || "",
      displayName:
        user.displayName ||
        profile.displayName ||
        "PoultryLink member",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(
      sellerRef,
      {
        uid: user.uid,
        email: user.email || "",
        displayName:
          user.displayName ||
          profile.displayName ||
          sellerSnap.data().displayName ||
          "PoultryLink member",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  fillProfileForm();
}

function fillProfileForm() {
  const map = {
    profileDisplayName:
      profile.displayName || currentUser?.displayName || "",
    profilePhone: profile.phone || "",
    profileState: profile.state || "",
    profileTown: profile.town || "",
    profileBio: profile.bio || ""
  };

  Object.entries(map).forEach(([id, val]) => {
    if ($(id)) {
      $(id).value = val;
    }
  });

  if ($("profileAccountType")) {
    $("profileAccountType").value =
      profile.accountType || "both";
  }

  if ($("profileEmail")) {
    $("profileEmail").value =
      currentUser?.email || profile.email || "";
  }

  if ($("profileBioCount")) {
    $("profileBioCount").textContent =
      String((profile.bio || "").length);
  }

  if ($("profileState")) {
    $("profileState").value = profile.state || "";
  }

  if ($("profileTown")) {
    $("profileTown").value = profile.town || "";
  }

  fillStorefrontForm();
  updateAuthUI();
}

function fillStorefrontForm() {
  const m = {
    storeName:
      storefront.name ||
      profile.businessName ||
      profile.displayName ||
      currentUser?.displayName ||
      "",

    storeBusinessType:
      storefront.businessType || "Poultry farm",

    storePhone:
      storefront.phone || profile.phone || "",

    storeState:
      storefront.state || profile.state || "",

    storeTown:
      storefront.town || profile.town || "",

    storeDescription:
      storefront.description || profile.bio || "",

    storeContactMethod:
      storefront.contactMethod || "phone"
  };

  Object.entries(m).forEach(([id, val]) => {
    if ($(id)) {
      $(id).value = val;
    }
  });

  const status = storefront.publicStatus || "private";

  if ($("storePublicStatus")) {
    $("storePublicStatus").value = status;
  }

  if ($("storefrontStatusPill")) {
    $("storefrontStatusPill").textContent =
      status === "public"
        ? "Public storefront"
        : "Private storefront";
  }

  if ($("storefrontSummary")) {
    $("storefrontSummary").textContent =
      storefront.name
        ? `${storefront.name} · ${
            [storefront.town, storefront.state]
              .filter(Boolean)
              .join(", ")
          }`
        : "Complete your storefront details.";
  }
}

function productTimestamp(p) {
  return p.createdAt?.toMillis?.() ||
    p.updatedAt?.toMillis?.() ||
    0;
}

function productArt(p) {
  return p.emoji || artMap[p.category] || "🐔";
}

function productCard(p) {
  const saved = savedIds.has(p.id);

  return `
    <article class="product-card">
      <button
        class="save-product-button ${saved ? "active" : ""}"
        type="button"
        data-action="save"
        data-id="${esc(p.id)}"
        aria-label="${saved ? "Remove saved product" : "Save product"}"
      >${saved ? "♥" : "♡"}</button>

      <button
        class="product-card-main"
        type="button"
        data-action="details"
        data-id="${esc(p.id)}"
      >
        <div class="product-art">${esc(productArt(p))}</div>
        <span class="category-label">${esc(p.category || "Poultry")}</span>
        <h3>${esc(p.title || "Poultry product")}</h3>
        <p class="product-location">
          ${esc([p.town, p.state].filter(Boolean).join(", ") || "Nigeria")}
        </p>
        <p class="listing-price">${money(p.price)}
          <small>/ ${esc(p.unit || "unit")}</small>
        </p>
        <p class="product-stock">
          ${Number(p.quantity) > 0
            ? `${Number(p.quantity)} ${esc(p.unit || "units")} available`
            : "Out of stock"}
        </p>
      </button>

      <div class="product-card-footer">
        <span>${esc(p.seller || "Poultry seller")}</span>
        <button
          class="btn btn-primary"
          type="button"
          data-action="addcart"
          data-id="${esc(p.id)}"
          ${Number(p.quantity) <= 0 ? "disabled" : ""}
        >Add to cart</button>
      </div>

      ${currentUser && p.ownerId === currentUser.uid ? `
        <div class="product-owner-actions">
          <button type="button" data-action="edit" data-id="${esc(p.id)}">Edit</button>
          <button type="button" data-action="delete" data-id="${esc(p.id)}">Delete</button>
        </div>
      ` : ""}
    </article>
  `;
}

function getFilteredProducts() {
  const search = ($("searchInput")?.value || "")
    .trim()
    .toLowerCase();

  const category = $("categoryFilter")?.value || "all";
  const location = $("locationFilter")?.value || "all";
  const sort = $("sortSelect")?.value || "newest";

  let result = products.filter(p => {
    if (p.status !== "active") return false;

    const searchable = [
      p.title,
      p.category,
      p.description,
      p.seller,
      p.state,
      p.town
    ].join(" ").toLowerCase();

    const matchesSearch = !search || searchable.includes(search);

    const matchesCategory =
      category === "all" ||
      category === "" ||
      p.category === category;

    const matchesLocation =
      location === "all" ||
      location === "" ||
      p.state === location;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  if (sort === "price-low") {
    result.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === "price-high") {
    result.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === "oldest") {
    result.sort((a, b) => productTimestamp(a) - productTimestamp(b));
  } else {
    result.sort((a, b) => productTimestamp(b) - productTimestamp(a));
  }

  return result;
}

function renderMarketplace() {
  const grid = $("listingGrid") ||
    $("marketplaceGrid") ||
    $("productGrid");

  const results = getFilteredProducts();

  if ($("listingLoading")) {
    $("listingLoading").classList.add("hidden");
  }

  if ($("resultsCount")) {
    $("resultsCount").textContent =
      `${results.length} ${results.length === 1 ? "product" : "products"} found`;
  }

  if ($("marketplaceCount")) {
    $("marketplaceCount").textContent = String(results.length);
  }

  if (grid) {
    grid.innerHTML = results.length
      ? results.map(productCard).join("")
      : `
        <div class="empty-state">
          <h3>No products found</h3>
          <p>Try another search or clear your filters.</p>
          <button class="btn btn-primary" id="emptyStateClearButton" type="button">
            Clear filters
          </button>
        </div>
      `;
  }

  const empty = $("marketplaceEmptyState");

  if (empty) {
    empty.classList.toggle("hidden", results.length > 0);
  }

  renderMyListings();
  renderInventory();
  renderCartBadge();
}

function clearFilters() {
  if ($("searchInput")) $("searchInput").value = "";
  if ($("categoryFilter")) $("categoryFilter").value = "all";
  if ($("locationFilter")) $("locationFilter").value = "all";

  all("[data-category]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === "all"
    );
  });

  renderMarketplace();
}

function startProductsListener() {
  if (unsubscribeProducts) {
    unsubscribeProducts();
  }

  const activeProductsQuery = query(
    collection(db, "products"),
    where("status", "==", "active")
  );

  unsubscribeProducts = onSnapshot(
    activeProductsQuery,
    snapshot => {
      products = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      renderMarketplace();
      renderSellerDirectory();
      renderSavedProducts();
    },
    error => {
      console.error("Marketplace loading error:", error);

      if ($("listingLoading")) {
        $("listingLoading").classList.add("hidden");
      }

      if ($("resultsCount")) {
        $("resultsCount").textContent = "Marketplace could not load";
      }

      showToast(friendlyError(error));
    }
  );
}

function readCart() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(CART_KEY) || "[]"
    );

    return stored.filter(item =>
      item &&
      typeof item.id === "string" &&
      Number.isFinite(Number(item.price)) &&
      Number.isFinite(Number(item.qty)) &&
      Number(item.qty) > 0
    );
  } catch {
    return [];
  }
}

function persistCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartBadge();
}

function renderCartBadge() {
  const count = cart.reduce(
    (total, item) => total + (Number(item.qty) || 0),
    0
  );

  if ($("cartCount")) {
    $("cartCount").textContent = String(count);
  }

  if ($("cartBadge")) {
    $("cartBadge").textContent = String(count);
    $("cartBadge").classList.toggle("hidden", count === 0);
  }
}

function totalCart() {
  return cart.reduce(
    (total, item) =>
      total +
      (Number(item.price) || 0) *
      (Number(item.qty) || 0),
    0
  );
}

function addToCart(product) {
  if (!currentUser) {
    openAuth("login");
    showToast("Sign in before adding products to your cart.");
    return;
  }

  if (product.ownerId === currentUser.uid) {
    showToast("You cannot order your own listing.");
    return;
  }

  if (Number(product.quantity) <= 0) {
    showToast("This listing is currently out of stock.");
    return;
  }

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.qty = Math.min(
      Number(existing.qty) + 1,
      Number(product.quantity)
    );
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: Number(product.price) || 0,
      seller: product.seller || "Seller",
      ownerId: product.ownerId || "",
      phone: product.phone || "",
      quantity: Number(product.quantity) || 0,
      unit: product.unit || "unit",
      qty: 1
    });
  }

  persistCart();
  renderCart();
  showToast("Added to your cart.");
}

function renderCart() {
  renderCartBadge();

  const container = $("cartItems") ||
    $("cartContent");

  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Browse the marketplace to find poultry products.</p>
      </div>
    `;

    if ($("cartSubtotal")) {
      $("cartSubtotal").textContent = money(0);
    }

    if ($("cartTotal")) {
      $("cartTotal").textContent = money(0);
    }

    if ($("checkoutButton")) $("checkoutButton").disabled = true;

    if ($("proceedToCheckoutButton")) {
      $("proceedToCheckoutButton").disabled = true;
    }

    return;
  }

  container.innerHTML = cart.map(item => `
    <article class="cart-item">
      <div class="cart-item-info">
        <h3>${esc(item.title)}</h3>
        <p>${money(item.price)} / ${esc(item.unit || "unit")}</p>
        <strong>${money(item.price * item.qty)}</strong>
      </div>

      <div class="cart-item-controls">
        <button type="button" data-cart-action="minus" data-id="${esc(item.id)}">−</button>
        <span>${Number(item.qty)}</span>
        <button type="button" data-cart-action="plus" data-id="${esc(item.id)}">+</button>
        <button type="button" data-cart-action="remove" data-id="${esc(item.id)}">Remove</button>
      </div>
    </article>
  `).join("");

  if ($("cartSubtotal")) {
    $("cartSubtotal").textContent = money(totalCart());
  }

  if ($("cartTotal")) {
    $("cartTotal").textContent = money(totalCart());
  }

  if ($("checkoutButton")) $("checkoutButton").disabled = false;

  if ($("proceedToCheckoutButton")) {
    $("proceedToCheckoutButton").disabled = false;
  }
}

async function registerAccount() {
  const name = (
    $("authDisplayName") ||
    $("authName")
  )?.value.trim();

  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;
  const confirmPassword = $("authConfirmPassword")?.value;
  const error = $("authError") || $("authMessage");

  if (error) error.textContent = "";

  if (!email || !password) {
    showToast("Enter your email and password.");
    return;
  }

  if (password.length < 6) {
    showToast("Your password must contain at least six characters.");
    return;
  }

  if (activeAuthMode === "register" && !name) {
    showToast("Enter your name.");
    return;
  }

  if (
    activeAuthMode === "register" &&
    confirmPassword !== undefined &&
    password !== confirmPassword
  ) {
    showToast("Your passwords do not match.");
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (name) {
      await updateProfile(credential.user, {
        displayName: name
      });
    }

    currentUser = auth.currentUser;

    await ensureUserDocuments(currentUser);

    closeDialog("authDialog");

    updateAuthUI();

    showToast("Your PoultryLink account has been created.");
  } catch (errorObject) {
    if (error) {
      error.textContent = friendlyError(errorObject);
    } else {
      showToast(friendlyError(errorObject));
    }
  }
}

async function loginAccount() {
  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;

  const error = $("authError") || $("authMessage");

  if (error) error.textContent = "";

  if (!email || !password) {
    showToast("Enter your email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    closeDialog("authDialog");

    showToast("You are signed in.");
  } catch (errorObject) {
    if (error) {
      error.textContent = friendlyError(errorObject);
    } else {
      showToast(friendlyError(errorObject));
    }
  }
}

async function resetPassword() {
  const email = $("authEmail")?.value.trim();

  if (!email) {
    showToast("Enter your email address first.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    showToast("Password reset instructions have been sent.");
  } catch (errorObject) {
    showToast(friendlyError(errorObject));
  }
}

async function logoutAccount() {
  try {
    await signOut(auth);

    currentUser = null;
    profile = {};
    storefront = {};
    savedIds.clear();

    closeDialog("authDialog");

    updateAuthUI();

    showToast("You have signed out.");
  } catch (errorObject) {
    showToast(friendlyError(errorObject));
  }
}

async function saveProfile(event) {
  event?.preventDefault();

  if (!currentUser) {
    openAuth("login");
    return;
  }

  const displayName = $("profileDisplayName")?.value.trim() ||
    $("authDisplayName")?.value.trim() ||
    currentUser.displayName ||
    "";

  const phone = $("profilePhone")?.value.trim() || "";
  const state = $("profileState")?.value || "";
  const town = $("profileTown")?.value.trim() || "";
  const bioText = $("profileBio")?.value.trim() || "";
  const accountType = $("profileAccountType")?.value || "both";

  if (!displayName) {
    showToast("Please enter your name.");
    return;
  }

  try {
    await updateProfile(currentUser, {
      displayName
    });

    const profileData = {
      displayName,
      email: currentUser.email || "",
      phone,
      state,
      town,
      bio: bioText,
      accountType,
      updatedAt: serverTimestamp()
    };

    await setDoc(
      doc(db, "profiles", currentUser.uid),
      profileData,
      { merge: true }
    );

    await setDoc(
      doc(db, "sellers", currentUser.uid),
      {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    profile = {
      ...profile,
      ...profileData
    };

    updateAuthUI();

    showToast("Your profile has been saved.");
  } catch (errorObject) {
    showToast(friendlyError(errorObject));
  }
}

function openListing(productId = null) {
  if (!currentUser) {
    openAuth("login");
    showToast("Sign in before publishing a listing.");
    return;
  }

  const form = $("listingForm");

  if (!form) {
    showToast("The listing form is not available in this page.");
    return;
  }

  form.reset();

  if ($("listingId")) {
    $("listingId").value = productId || "";
  }

  const product = productId
    ? products.find(item => item.id === productId)
    : null;

  if (productId && (!product || product.ownerId !== currentUser.uid)) {
    showToast("You can only edit your own listings.");
    return;
  }

  const values = {
    listingTitle: product?.title || "",
    listingCategory: product?.category || "Eggs",
    listingPrice: product?.price ?? "",
    listingQuantity: product?.quantity ?? "",
    listingUnit: product?.unit || "",
    listingState: product?.state || profile.state || "",
    listingTown: product?.town || profile.town || "",
    listingSeller:
      product?.seller ||
      currentUser.displayName ||
      profile.displayName ||
      "",
    listingPhone: product?.phone || profile.phone || "",
    listingDescription: product?.description || ""
  };

  Object.entries(values).forEach(([id, value]) => {
    if ($(id)) {
      $(id).value = value;
    }
  });

  if ($("listingStatus")) {
    $("listingStatus").value = product?.status || "active";
  }

  if ($("listingModalTitle")) {
    $("listingModalTitle").textContent =
      product ? "Edit your listing" : "Create a listing";
  }

  if ($("saveListingButton")) {
    $("saveListingButton").textContent =
      product ? "Save changes" : "Publish listing";
  }

  showError("formMessage", "");

  openDialog("listingDialog");
}

async function saveListing(event) {
  event?.preventDefault();

  if (!currentUser) {
    openAuth("login");
    return;
  }

  const title = $("listingTitle")?.value.trim() || "";
  const category = $("listingCategory")?.value || "";
  const price = Number($("listingPrice")?.value);
  const quantity = Number($("listingQuantity")?.value);
  const unit = $("listingUnit")?.value.trim() || "";
  const state = $("listingState")?.value || "";
  const town = $("listingTown")?.value.trim() || "";
  const seller = $("listingSeller")?.value.trim() || "";
  const phone = $("listingPhone")?.value.trim() || "";
  const description =
    $("listingDescription")?.value.trim() || "";

  const status = $("listingStatus")?.value || "active";

  const productId = $("listingId")?.value || "";

  if (!title || !category || !unit || !state || !seller || !phone) {
    showToast("Complete all required listing fields.");
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    showToast("Enter a valid price.");
    return;
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    showToast("Enter a valid quantity.");
    return;
  }

  if (!["active", "inactive"].includes(status)) {
    showToast("Choose a valid listing status.");
    return;
  }

  const productData = {
    title,
    category,
    price,
    quantity,
    unit,
    state,
    town,
    seller,
    phone,
    description,
    ownerId: currentUser.uid,
    status,
    updatedAt: serverTimestamp()
  };

  const button = $("saveListingButton");

  if (button) button.disabled = true;

  try {
    if (productId) {
      const existing = products.find(p => p.id === productId);

      if (!existing || existing.ownerId !== currentUser.uid) {
        throw new Error("You can only edit your own listings.");
      }

      await updateDoc(
        doc(db, "products", productId),
        productData
      );
    } else {
      await addDoc(
        collection(db, "products"),
        {
          ...productData,
          createdAt: serverTimestamp()
        }
      );
    }

    closeDialog("listingDialog");

    showToast(
      productId
        ? "Your listing has been updated."
        : "Your listing has been published."
    );
  } catch (errorObject) {
    showError("formMessage", friendlyError(errorObject));
  } finally {
    if (button) button.disabled = false;
  }
}

async function deleteListing(productId) {
  if (!currentUser) return;

  const product = products.find(p => p.id === productId);

  if (!product || product.ownerId !== currentUser.uid) {
    showToast("You can only delete your own listings.");
    return;
  }

  const confirmed = confirm(
    `Delete "${product.title}"? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "products", productId));

    cart = cart.filter(item => item.id !== productId);

    persistCart();

    renderCart();

    showToast("Listing deleted.");
  } catch (errorObject) {
    showToast(friendlyError(errorObject));
  }
}

function renderMyListings() {
  const container =
    $("myListings") ||
    $("dashboardListings") ||
    $("sellerListings");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Sign in to manage your listings</h3>
      </div>
    `;
    return;
  }

  const ownProducts = products.filter(
    item => item.ownerId === currentUser.uid
  );

  if (!ownProducts.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No active listings yet</h3>
        <p>Publish your first product to start selling.</p>
        <button class="btn btn-primary" data-action="new-listing">
          Create listing
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = ownProducts.map(productCard).join("");
}

function renderInventory() {
  const container = $("inventoryList");

  if (!container || !currentUser) return;

  const ownProducts = products.filter(
    item => item.ownerId === currentUser.uid
  );

  container.innerHTML = ownProducts.length
    ? ownProducts.map(item => `
      <article class="inventory-row">
        <div>
          <strong>${esc(item.title)}</strong>
          <p>${Number(item.quantity) || 0} ${esc(item.unit || "units")}</p>
        </div>
        <span class="status-pill">
          ${esc(item.status || "active")}
        </span>
        <button
          type="button"
          data-action="edit"
          data-id="${esc(item.id)}"
        >Edit</button>
      </article>
    `).join("")
    : `<p class="small-muted">No active listings available for inventory.</p>`;
}

async function loadSavedProducts() {
  if (!currentUser) {
    savedIds.clear();
    renderSavedProducts();
    return;
  }

  try {
    const snapshot = await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "savedProducts"
      )
    );

    savedIds = new Set(
      snapshot.docs.map(item => item.id)
    );

    renderMarketplace();
    renderSavedProducts();
  } catch (errorObject) {
    console.warn("Saved products could not be loaded:", errorObject);
  }
}

async function toggleSavedProduct(productId) {
  if (!currentUser) {
    openAuth("login");
    showToast("Sign in to save products.");
    return;
  }

  const ref = doc(
    db,
    "users",
    currentUser.uid,
    "savedProducts",
    productId
  );

  try {
    if (savedIds.has(productId)) {
      await deleteDoc(ref);
      savedIds.delete(productId);
      showToast("Product removed from saved items.");
    } else {
      await setDoc(ref, {
        productId,
        savedAt: serverTimestamp()
      });

      savedIds.add(productId);

      showToast("Product saved.");
    }

    renderMarketplace();
    renderSavedProducts();
  } catch (errorObject) {
    showToast(friendlyError(errorObject));
  }
}

function renderSavedProducts() {
  const container = $("savedProducts");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Sign in to view saved products</h3>
      </div>
    `;
    return;
  }

  const saved = products.filter(
    item => savedIds.has(item.id)
  );

  container.innerHTML = saved.length
    ? saved.map(productCard).join("")
    : `
      <div class="empty-state">
        <h3>No saved products yet</h3>
        <p>Save products you may want to revisit.</p>
      </div>
    `;
}

function showDetails(product) {
  const container = $("detailContent");

  if (!container) return;

  container.innerHTML = `
    <div class="detail-hero">
      <div class="product-art">${esc(productArt(product))}</div>
      <div>
        <h2>${esc(product.title)}</h2>
        <p class="listing-price">${money(product.price)}</p>
        <span class="category-label">${esc(product.category)}</span>
      </div>
    </div>

    <p>${esc(product.description || "No description provided.")}</p>

    <div class="detail-facts">
      <p><strong>Available:</strong>
        ${Number(product.quantity) || 0} ${esc(product.unit || "units")}
      </p>
      <p><strong>Location:</strong>
        ${esc([product.town, product.state].filter(Boolean).join(", "))}
      </p>
      <p><strong>Seller:</strong> ${esc(product.seller || "Seller")}</p>
      <p><strong>Contact:</strong> ${esc(product.phone || "Not provided")}</p>
    </div>

    <div class="card-actions">
      <button
        type="button"
        class="btn btn-primary"
        data-action="addcart"
        data-id="${esc(product.id)}"
      >Add to cart</button>

      <a
        class="btn btn-outline"
        target="_blank"
        rel="noopener noreferrer"
        href="https://wa.me/${esc(product.phone || "")}"
      >Contact seller</a>
    </div>
  `;

  openDialog("detailDialog");
}

function openCheckout() {
  if (!currentUser) {
    openAuth("login");
    showToast("Sign in before placing an order.");
    return;
  }

  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  renderCart();

  if ($("buyerName")) {
    $("buyerName").value =
      profile.displayName || currentUser.displayName || "";
  }

  if ($("buyerEmail")) {
    $("buyerEmail").value = currentUser.email || "";
  }

  if ($("buyerPhone")) {
    $("buyerPhone").value = profile.phone || "";
  }

  if ($("checkoutMessage")) {
    $("checkoutMessage").textContent = "";
  }

  closeDialog("cartDialog");

  openDialog("checkoutDialog");
}

async function submitOrder(event) {
  event?.preventDefault();

  if (!currentUser) {
    openAuth("login");
    return;
  }

  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  const buyerName = $("buyerName")?.value.trim() || "";
  const buyerEmail = currentUser.email || "";
  const buyerPhone = $("buyerPhone")?.value.trim() || "";
  const buyerAddress = $("buyerAddress")?.value.trim() || "";
  const buyerNote = $("buyerNote")?.value.trim() || "";

  if (!buyerName || !buyerPhone || !buyerAddress) {
    showError(
      "checkoutMessage",
      "Enter your name, phone number, and delivery address."
    );
    return;
  }

  const button = $("placeOrderButton");

  if (button) button.disabled = true;

  try {
    const items = cart.map(item => ({
      productId: item.id,
      title: item.title,
      quantity: Number(item.qty),
      unitPrice: Number(item.price),
      sellerId: item.ownerId || "",
      unit: item.unit || ""
    }));

    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    await addDoc(collection(db, "orders"), {
      buyerId: currentUser.uid,
      buyerEmail,
      buyerName,
      buyerPhone,
      buyerAddress,
      buyerNote,
      items,
      total,
      currency: "NGN",
      orderStatus: "pending",
      paymentStatus: "unpaid",
      createdAt: serverTimestamp()
    });

    cart = [];

    persistCart();
    renderCart();

    closeDialog("checkoutDialog");

    showToast(
      "Order request submitted. Payment has not been collected."
    );

    await loadOrders();
  } catch (errorObject) {
    showError("checkoutMessage", friendlyError(errorObject));
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadOrders() {
  const container = $("ordersContent");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Sign in to view your orders</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = "<p>Loading your orders...</p>";

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "orders"),
        where("buyerId", "==", currentUser.uid)
      )
    );

    const orders = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .sort((a, b) => {
        const first = a.createdAt?.toMillis?.() || 0;
        const second = b.createdAt?.toMillis?.() || 0;
        return second - first;
      });

    if (!orders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No orders yet</h3>
          <p>Your submitted orders will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => `
      <article class="order-card">
        <h3>Order ${esc(order.id.slice(0, 8).toUpperCase())}</h3>
        <p>Status: ${esc(order.orderStatus || "pending")}</p>
        <p>Payment: ${esc(order.paymentStatus || "unpaid")}</p>
        <p>Total: ${money(order.total)}</p>
        <p>
          ${Array.isArray(order.items)
            ? order.items.map(item =>
                `${esc(item.title)} × ${Number(item.quantity) || 1}`
              ).join("<br>")
            : ""}
        </p>
        <p class="small-muted">
          This is an order request, not confirmation of payment or delivery.
        </p>
      </article>
    `).join("");
  } catch (errorObject) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Could not load orders</h3>
        <p>${esc(friendlyError(errorObject))}</p>
        <button type="button" id="retryOrdersButton">Try again</button>
      </div>
    `;
  }
}

async function saveStorefront(event) {
  event?.preventDefault();

  if (!currentUser) {
    openAuth("login");
    return;
  }

  const storefrontData = {
    name: $("storeName")?.value.trim() || "",
    businessType: $("storeBusinessType")?.value || "",
    phone: $("storePhone")?.value.trim() || "",
    state: $("storeState")?.value || "",
    town: $("storeTown")?.value.trim() || "",
    description: $("storeDescription")?.value.trim() || "",
    contactMethod: $("storeContactMethod")?.value || "phone",
    publicStatus: $("storePublicStatus")?.value || "private",
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(
      doc(db, "profiles", currentUser.uid),
      {
        storefront: storefrontData,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    storefront = storefrontData;

    showToast(
      "Storefront details saved to your private profile."
    );

    showToast(
      "Public storefront publishing requires additional Firestore rules."
    );
  } catch (errorObject) {
    showToast(friendlyError(errorObject));
  }
}

function renderSellerDirectory() {
  const container = $("sellerDirectory");

  if (!container) return;

  const uniqueSellers = new Map();

  products.forEach(product => {
    if (product.ownerId) {
      if (!uniqueSellers.has(product.ownerId)) {
        uniqueSellers.set(product.ownerId, {
          name: product.seller || "Poultry seller",
          state: product.state || "",
          town: product.town || "",
          count: 0
        });
      }

      uniqueSellers.get(product.ownerId).count++;
    }
  });

  const sellers = [...uniqueSellers.values()];

  container.innerHTML = sellers.length
    ? sellers.map(seller => `
      <article class="seller-card">
        <div class="seller-avatar">
          ${esc((seller.name[0] || "P").toUpperCase())}
        </div>
        <h3>${esc(seller.name)}</h3>
        <p>${esc([seller.town, seller.state].filter(Boolean).join(", "))}</p>
        <p>${seller.count} active listings</p>
      </article>
    `).join("")
    : `<p class="small-muted">No sellers with active listings yet.</p>`;
}

function setDashboardTab(tab) {
  dashboardTab = tab;

  all("[data-dashboard-tab]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.dashboardTab === tab
    );
  });

  all("[data-dashboard-panel]").forEach(panel => {
    panel.classList.toggle(
      "hidden",
      panel.dataset.dashboardPanel !== tab
    );
  });

  if (tab === "orders") loadOrders();
  if (tab === "saved") renderSavedProducts();
  if (tab === "storefront") fillStorefrontForm();
  if (tab === "listings") renderMyListings();
  if (tab === "inventory") renderInventory();
}

document.addEventListener("click", async event => {
  const target = event.target;

  const closeButton = target.closest("[data-close]");

  if (closeButton) {
    closeDialog(closeButton.dataset.close);
    return;
  }

  const authModeButton = target.closest("[data-auth-mode]");

  if (authModeButton) {
    setAuthMode(authModeButton.dataset.authMode);
    return;
  }

  const tabButton = target.closest("[data-dashboard-tab]");

  if (tabButton) {
    setDashboardTab(tabButton.dataset.dashboardTab);
    return;
  }

  const cartAction = target.closest("[data-cart-action]");

  if (cartAction) {
    const item = cart.find(
      product => product.id === cartAction.dataset.id
    );

    if (!item) return;

    if (cartAction.dataset.cartAction === "plus") {
      item.qty = Math.min(item.qty + 1, 99);
    }

    if (cartAction.dataset.cartAction === "minus") {
      item.qty = Math.max(1, item.qty - 1);
    }

    if (cartAction.dataset.cartAction === "remove") {
      cart = cart.filter(product => product.id !== item.id);
    }

    persistCart();
    renderCart();

    return;
  }

  const actionButton = target.closest("[data-action]");

  if (actionButton) {
    const action = actionButton.dataset.action;
    const productId = actionButton.dataset.id;

    const product = products.find(
      item => item.id === productId
    );

    if (action === "new-listing") {
      openListing();
      return;
    }

    if (action === "details" && product) {
      showDetails(product);
      return;
    }

    if (action === "addcart" && product) {
      addToCart(product);
      return;
    }

    if (action === "edit" && product) {
      openListing(productId);
      return;
    }

    if (action === "delete" && product) {
      await deleteListing(productId);
      return;
    }

    if (action === "save" && productId) {
      await toggleSavedProduct(productId);
      return;
    }
  }

  if (target.closest("#emptyStateClearButton")) {
    clearFilters();
    return;
  }

  if (target.closest("#retryOrdersButton")) {
    loadOrders();
    return;
  }

  if (target.closest("#ordersSignInButton")) {
    openAuth("login");
  }
});

$("authForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (activeAuthMode === "register") {
    await registerAccount();
  } else {
    await loginAccount();
  }
});

$("authSwitchButton")?.addEventListener("click", () => {
  setAuthMode(
    activeAuthMode === "register"
      ? "login"
      : "register"
  );
});

$("forgotPasswordButton")?.addEventListener(
  "click",
  resetPassword
);

$("signOutButton")?.addEventListener(
  "click",
  logoutAccount
);

$("logoutButton")?.addEventListener(
  "click",
  logoutAccount
);

$("saveProfileButton")?.addEventListener(
  "click",
  saveProfile
);

$("profileForm")?.addEventListener(
  "submit",
  saveProfile
);

$("listingForm")?.addEventListener(
  "submit",
  saveListing
);

$("cartButton")?.addEventListener("click", () => {
  renderCart();
  openDialog("cartDialog");
});

$("checkoutButton")?.addEventListener(
  "click",
  openCheckout
);

$("proceedToCheckoutButton")?.addEventListener(
  "click",
  openCheckout
);

$("checkoutForm")?.addEventListener(
  "submit",
  submitOrder
);

$("storefrontForm")?.addEventListener(
  "submit",
  saveStorefront
);

$("searchInput")?.addEventListener(
  "input",
  renderMarketplace
);

$("categoryFilter")?.addEventListener(
  "change",
  renderMarketplace
);

$("locationFilter")?.addEventListener(
  "change",
  renderMarketplace
);

$("sortSelect")?.addEventListener(
  "change",
  renderMarketplace
);

$("clearFiltersButton")?.addEventListener(
  "click",
  clearFilters
);

$("createListingButton")?.addEventListener(
  "click",
  () => openListing()
);

$("addListingButton")?.addEventListener(
  "click",
  () => openListing()
);

$("profileBio")?.addEventListener("input", event => {
  if ($("profileBioCount")) {
    $("profileBioCount").textContent =
      String(event.target.value.length);
  }
});

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    const category = button.dataset.category;

    if ($("categoryFilter")) {
      $("categoryFilter").value = category || "all";
    }

    document.querySelectorAll("[data-category]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderMarketplace();
  });
});

document.querySelectorAll("[data-open-auth]").forEach(button => {
  button.addEventListener("click", () => {
    openAuth(button.dataset.openAuth || "login");
  });
});

onAuthStateChanged(auth, async user => {
  currentUser = user;

  updateAuthUI();

  if (!user) {
    profile = {};
    storefront = {};
    savedIds.clear();

    renderSavedProducts();
    renderMyListings();

    return;
  }

  try {
    await ensureUserDocuments(user);

    storefront = profile.storefront || {};

    await loadSavedProducts();

    updateAuthUI();
    fillProfileForm();

    renderMarketplace();
    renderCart();
    renderMyListings();
    renderInventory();
    renderSavedProducts();

    await loadOrders();
  } catch (errorObject) {
    console.error("Account initialization failed:", errorObject);

    showToast(
      "Your account could not finish loading. " +
      friendlyError(errorObject)
    );
  }
});

startProductsListener();

renderCart();

if ($("year")) {
  $("year").textContent = String(new Date().getFullYear());
}