/* =========================================================
   POULTRYLINK — APPLICATION JAVASCRIPT
   Firebase 11.10.0
   Nigeria's Poultry Marketplace
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  setDoc,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =========================================================
   APPLICATION CONFIGURATION
========================================================= */

const CONFIG = {
  monthlyPrice: 1000,
  yearlyPrice: 10000,

  /*
    This endpoint must be implemented on your secure backend.
    The Paystack secret key must NEVER be placed in this file.
  */

  paymentEndpoint: "/api/payments/initialize",

  currency: "NGN",

  maxListingPrice: 1000000000
};


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];


/*
  Safe event listener.
  Prevents the entire application from crashing if an optional
  HTML element is missing.
*/

function on(selector, event, handler) {
  const element = $(selector);

  if (element) {
    element.addEventListener(event, handler);
  }
}


function onAll(selector, event, handler) {
  $$(selector).forEach(element => {
    element.addEventListener(event, handler);
  });
}


const state = {
  query: "",
  category: "",
  location: "",
  sort: "newest",

  listings: [],

  user: null,
  profile: null,
  seller: null,
  subscription: null,

  isAdmin: false,

  authMode: "signin",
  editingId: null,

  dashboardOpen: false
};


const grid = $("#listingGrid");

const toast = $("#toast");

let toastTimer;


const categoryInfo = {
  Eggs: {
    emoji: "🥚",
    art: "eggs"
  },

  Layers: {
    emoji: "🐔",
    art: "layers"
  },

  Broilers: {
    emoji: "🍗",
    art: "broilers"
  },

  Chicks: {
    emoji: "🐣",
    art: "chicks"
  },

  Feed: {
    emoji: "🌾",
    art: "feed"
  },

  Equipment: {
    emoji: "🧰",
    art: "equipment"
  }
};


function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


function formatNaira(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Price on request";
  }

  return "₦" + new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0
  }).format(number);
}


function normalisePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}


function showToast(message) {
  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}


function openDialog(id) {
  const dialog = document.getElementById(id);

  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}


function closeDialog(dialog) {
  if (!dialog) return;

  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}


function initials(name) {
  return String(name || "P")
    .trim()
    .charAt(0)
    .toUpperCase() || "P";
}


function categoryClass(category) {
  return (categoryInfo[category] || categoryInfo.Equipment).art;
}


function categoryEmoji(category) {
  return (categoryInfo[category] || categoryInfo.Equipment).emoji;
}


function setText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = value ?? "";
  }
}


function setHTML(selector, value) {
  const element = $(selector);

  if (element) {
    element.innerHTML = value;
  }
}


function setHidden(selector, hidden) {
  const element = $(selector);

  if (element) {
    element.classList.toggle("hidden", hidden);
  }
}


function timestampToMillis(value) {
  if (value?.toMillis) {
    return value.toMillis();
  }

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}


function isSubscriptionActive(subscription) {
  if (!subscription) return false;

  if (subscription.status !== "active") {
    return false;
  }

  const expiry = timestampToMillis(subscription.expiresAt);

  return expiry > Date.now();
}


function friendlyDate(value) {
  const millis = timestampToMillis(value);

  if (!millis) return "Not available";

  return new Date(millis).toLocaleDateString(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}


function showError(error, fallback = "Something went wrong.") {
  console.error(error);

  return fallback;
}


/* =========================================================
   FIRESTORE REFERENCES
========================================================= */

function userRef(uid = state.user?.uid) {
  return doc(db, "users", uid);
}


function sellerRef(uid = state.user?.uid) {
  return doc(db, "sellers", uid);
}


function subscriptionRef(uid = state.user?.uid) {
  return doc(db, "subscriptions", uid);
}


/* =========================================================
   MARKETPLACE SEARCH
========================================================= */

function getVisibleListings() {
  const search = state.query.trim().toLowerCase();

  let results = state.listings.filter(item => {

    const searchable = [
      item.title,
      item.category,
      item.description,
      item.seller,
      item.town,
      item.state,
      item.quantity
    ].join(" ").toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesCategory =
      !state.category ||
      item.category === state.category;

    const matchesLocation =
      !state.location ||
      item.state === state.location;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesLocation
    );
  });


  if (state.sort === "price-low") {

    results.sort((a, b) =>
      Number(a.price) - Number(b.price)
    );

  } else if (state.sort === "price-high") {

    results.sort((a, b) =>
      Number(b.price) - Number(a.price)
    );

  } else {

    results.sort((a, b) =>
      (b.createdMillis || 0) -
      (a.createdMillis || 0)
    );

  }

  return results;
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function cardTemplate(item) {

  const owned = Boolean(
    state.user &&
    item.ownerId === state.user.uid
  );

  const location = [
    item.town,
    item.state
  ].filter(Boolean).join(", ");

  const category = item.category || "Equipment";

  return `

    <article class="listing-card">

      <div class="listing-art ${categoryClass(category)}">

        <span class="listing-tag">
          ${owned ? "YOUR LISTING" : "SELLER LISTING"}
        </span>

        <span class="art-emoji" aria-hidden="true">
          ${escapeHTML(item.emoji || categoryEmoji(category))}
        </span>

      </div>

      <div class="listing-body">

        <div class="listing-meta">

          <span class="category-label">
            ${escapeHTML(category)}
          </span>

          <span>
            ⌖ ${escapeHTML(location || "Location not set")}
          </span>

        </div>

        <h3>${escapeHTML(item.title)}</h3>

        <p class="listing-description">
          ${escapeHTML(
            item.description ||
            "Contact the seller for more details."
          )}
        </p>

        <div class="listing-price">
          ${formatNaira(item.price)}
          <small>/ ${escapeHTML(item.unit || "unit")}</small>
        </div>

        <div class="listing-details">

          <span>
            Available:
            <strong>
              ${escapeHTML(item.quantity || "Ask seller")}
            </strong>
          </span>

          <span>Seller listing</span>

        </div>

        <div class="seller-line">

          <span class="seller-avatar">
            ${escapeHTML(initials(item.seller))}
          </span>

          <span>
            Listed by
            <strong>
              ${escapeHTML(item.seller || "Poultry seller")}
            </strong>
          </span>

        </div>

        <div class="card-actions">

          <button
            class="btn btn-outline"
            type="button"
            data-detail="${escapeHTML(item.id)}"
          >
            View details
          </button>

          <button
            class="btn btn-whatsapp"
            type="button"
            data-contact="${escapeHTML(item.id)}"
          >
            WhatsApp ↗
          </button>

          <button
            class="btn btn-outline"
            type="button"
            data-save="${escapeHTML(item.id)}"
          >
            Save
          </button>

        </div>

        ${owned ? `

          <div class="card-actions">

            <button
              class="btn btn-outline"
              type="button"
              data-edit="${escapeHTML(item.id)}"
            >
              Edit listing
            </button>

            <button
              class="btn btn-outline"
              type="button"
              data-delete="${escapeHTML(item.id)}"
            >
              Delete
            </button>

          </div>

        ` : ""}

      </div>

    </article>

  `;
}


/* =========================================================
   RENDER MARKETPLACE
========================================================= */

function renderListings() {

  if (!grid) return;

  const results = getVisibleListings();

  grid.innerHTML = results.map(cardTemplate).join("");

  setText(
    "#resultsCount",
    `${results.length} ${
      results.length === 1 ? "listing" : "listings"
    }`
  );

  setHidden(
    "#emptyState",
    results.length > 0
  );

  grid.classList.toggle(
    "hidden",
    results.length === 0
  );

  $$("#categoryChips .chip").forEach(chip => {

    chip.classList.toggle(
      "active",
      chip.dataset.category === state.category
    );

  });

}


function resetFilters() {

  state.query = "";
  state.category = "";
  state.location = "";
  state.sort = "newest";

  if ($("#searchInput")) $("#searchInput").value = "";
  if ($("#categoryFilter")) $("#categoryFilter").value = "";
  if ($("#locationFilter")) $("#locationFilter").value = "";
  if ($("#sortSelect")) $("#sortSelect").value = "newest";

  renderListings();
}


/* =========================================================
   LOAD LISTINGS FROM FIRESTORE
========================================================= */

async function loadListings() {

  setText("#resultsCount", "Loading listings…");

  try {

    const listingsQuery = query(
      collection(db, "products"),
      where("status", "==", "active")
    );

    const snapshot = await getDocs(listingsQuery);

    state.listings = snapshot.docs.map(snap => {

      const data = snap.data();

      return {
        ...data,
        id: snap.id,
        createdMillis: timestampToMillis(
          data.createdAt
        ) || Number(data.createdMillis || 0)
      };

    });

    renderListings();

  } catch (error) {

    showError(
      error,
      "Could not load marketplace listings."
    );

    if (grid) {
      grid.innerHTML = "";
    }

    setText(
      "#resultsCount",
      "Marketplace could not load"
    );

    setHidden("#emptyState", false);

    setText(
      "#emptyState h3",
      "Unable to load listings"
    );

    setText(
      "#emptyState p",
      "Check Firebase configuration and Firestore security rules."
    );

  }

}


/* =========================================================
   ACCOUNT PROFILE LOADING
========================================================= */

async function loadProfile(user) {

  if (!user) {

    state.profile = null;
    state.seller = null;
    state.subscription = null;
    state.isAdmin = false;

    return;
  }

  try {

    const [
      userSnapshot,
      sellerSnapshot,
      subscriptionSnapshot,
      tokenResult
    ] = await Promise.all([

      getDoc(userRef(user.uid)),

      getDoc(sellerRef(user.uid)),

      getDoc(subscriptionRef(user.uid)),

      user.getIdTokenResult(true)

    ]);

    state.profile = userSnapshot.exists()
      ? userSnapshot.data()
      : {
          displayName: user.displayName || "",
          email: user.email || ""
        };

    state.seller = sellerSnapshot.exists()
      ? sellerSnapshot.data()
      : null;

    state.subscription = subscriptionSnapshot.exists()
      ? subscriptionSnapshot.data()
      : null;

    /*
      Admin access comes from a trusted Firebase custom claim.
      Never use a user-editable Firestore role field.
    */

    state.isAdmin =
      tokenResult.claims.admin === true;

  } catch (error) {

    showError(
      error,
      "Could not load account information."
    );

    state.profile = {
      displayName: user.displayName || "",
      email: user.email || ""
    };

    state.seller = null;
    state.subscription = null;
    state.isAdmin = false;

  }

}


/* =========================================================
   AUTHENTICATION UI
========================================================= */

function setAuthUI(user) {

  const button = $("#signInButton");

  if (!button) return;

  if (user) {

    const name =
      state.profile?.displayName ||
      user.displayName ||
      user.email ||
      "Account";

    button.textContent =
      "Account: " +
      (name.length > 18
        ? name.slice(0, 17) + "…"
        : name);

    button.title =
      "Open your account dashboard";

  } else {

    button.textContent = "Sign in";

    button.title =
      "Sign in to your PoultryLink account";

  }

}


/* =========================================================
   AUTHENTICATION DIALOG
========================================================= */

function openAuth(mode = "signin") {

  state.authMode = mode;

  $("#authForm")?.reset();

  setText("#authMessage", "");

  updateAuthModeUI();

  openDialog("authDialog");

}


function updateAuthModeUI() {

  const creating =
    state.authMode === "signup";

  setText(
    "#authTitle",
    creating
      ? "Create your PoultryLink account"
      : "Welcome to PoultryLink"
  );

  setText(
    "#authSubtitle",
    creating
      ? "Register to join Nigeria's poultry marketplace."
      : "Sign in to continue."
  );

  setHidden(
    "#authNameWrap",
    !creating
  );

  if ($("#authName")) {
    $("#authName").required = creating;
  }

  setText(
    "#authModeButton",
    creating
      ? "I already have an account"
      : "Create account"
  );

  setText(
    "#authSubmitButton",
    creating
      ? "Create account"
      : "Sign in"
  );

  if ($("#authPassword")) {

    $("#authPassword").autocomplete =
      creating
        ? "new-password"
        : "current-password";

  }

}


function friendlyAuthError(error) {

  const code = error?.code || "";

  const messages = {

    "auth/email-already-in-use":
      "An account already exists for this email.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/weak-password":
      "Choose a stronger password with at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account was found for this email.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/too-many-requests":
      "Too many attempts. Try again later.",

    "auth/network-request-failed":
      "Network problem. Check your internet connection."

  };

  return messages[code] ||
    "Authentication failed. Check your details and try again.";

}


/* =========================================================
   CREATE ACCOUNT / SIGN IN
========================================================= */

async function handleAuthSubmit(event) {

  event.preventDefault();

  const email = $("#authEmail")?.value.trim() || "";

  const password = $("#authPassword")?.value || "";

  const name = $("#authName")?.value.trim() || "";

  setText("#authMessage", "Please wait…");

  const submitButton = $("#authSubmitButton");

  if (submitButton) submitButton.disabled = true;

  try {

    if (state.authMode === "signup") {

      if (name.length < 2) {
        throw new Error("Enter your full name.");
      }

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await updateProfile(credential.user, {
        displayName: name
      });

      /*
        Every new account starts as a buyer.
        Seller permissions are granted separately.
      */

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          uid: credential.user.uid,
          displayName: name,
          email: credential.user.email || email,
          accountType: "buyer",
          createdAt: serverTimestamp()
        }
      );

      state.profile = {
        displayName: name,
        email,
        accountType: "buyer"
      };

      showToast(
        "Your PoultryLink account has been created."
      );

    } else {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      showToast("Signed in successfully.");

    }

    closeDialog($("#authDialog"));

  } catch (error) {

    showError(error, "Authentication failed.");

    setText(
      "#authMessage",
      error.message || friendlyAuthError(error)
    );

  } finally {

    if (submitButton) submitButton.disabled = false;

  }

}


/* =========================================================
   SELLER ELIGIBILITY
========================================================= */

function sellerEligibility() {

  if (!state.user) {

    return {
      allowed: false,
      reason: "Sign in before publishing products."
    };

  }

  if (!state.seller) {

    return {
      allowed: false,
      reason: "Submit your seller verification application first."
    };

  }

  if (state.seller.verificationStatus !== "approved") {

    return {
      allowed: false,
      reason: "Your seller account has not been approved."
    };

  }

  if (!isSubscriptionActive(state.subscription)) {

    return {
      allowed: false,
      reason: "You need an active seller subscription."
    };

  }

  return {
    allowed: true,
    reason: ""
  };

}


/* =========================================================
   LISTING FORM
========================================================= */

function openListingForm(item = null) {

  if (!state.user) {

    showToast(
      "Sign in before listing a product."
    );

    openAuth("signin");

    return;

  }

  const eligibility = sellerEligibility();

  if (!eligibility.allowed) {

    showToast(eligibility.reason);

    if (!state.seller) {

      openDialog("verificationDialog");

    } else if (
      state.seller.verificationStatus !== "approved"
    ) {

      showToast(
        "Your seller application is awaiting approval."
      );

    } else {

      openDialog("subscriptionDialog");

    }

    return;

  }

  state.editingId = item?.id || null;

  $("#listingForm")?.reset();

  setText("#formMessage", "");

  if ($("#editingListingId")) {
    $("#editingListingId").value =
      state.editingId || "";
  }

  setText(
    "#listingTitle",
    state.editingId
      ? "Edit your listing"
      : "List a product"
  );

  setText(
    "#saveListingButton",
    state.editingId
      ? "Save changes"
      : "Publish listing"
  );

  if ($("#listingSeller")) {
    $("#listingSeller").value =
      item?.seller ||
      state.seller?.businessName ||
      state.profile?.displayName ||
      "";
  }

  if ($("#listingPhone")) {
    $("#listingPhone").value =
      item?.phone ||
      state.seller?.phone ||
      state.profile?.phone ||
      "";
  }

  if (item) {

    $("#listingTitleInput").value =
      item.title || "";

    $("#listingCategory").value =
      item.category || "";

    $("#listingPrice").value =
      item.price ?? "";

    $("#listingQuantity").value =
      item.quantity || "";

    $("#listingUnit").value =
      item.unit || "per unit";

    $("#listingState").value =
      item.state || "";

    $("#listingTown").value =
      item.town || "";

    $("#listingDescription").value =
      item.description || "";

  }

  openDialog("listingDialog");

}


/* =========================================================
   GET LISTING FORM DATA
========================================================= */

function getFormListing() {

  const form = $("#listingForm");

  const data = new FormData(form);

  const category = String(
    data.get("category") || ""
  );

  return {

    title: String(
      data.get("title") || ""
    ).trim(),

    category,

    price: Number(
      data.get("price")
    ),

    quantity: String(
      data.get("quantity") || ""
    ).trim(),

    unit: String(
      data.get("unit") || "per unit"
    ),

    state: String(
      data.get("state") || ""
    ),

    town: String(
      data.get("town") || ""
    ).trim(),

    seller: String(
      data.get("seller") || ""
    ).trim(),

    phone: normalisePhone(
      data.get("phone")
    ),

    description: String(
      data.get("description") || ""
    ).trim(),

    emoji: categoryEmoji(category),

    art: categoryClass(category),

    status: "active"

  };

}


/* =========================================================
   VALIDATE LISTING
========================================================= */

function validateListing(item) {

  if (
    item.title.length < 3 ||
    item.title.length > 100
  ) {

    return "Product title must be between 3 and 100 characters.";

  }

  if (!Object.hasOwn(categoryInfo, item.category)) {

    return "Choose a valid product category.";

  }

  if (
    !Number.isFinite(item.price) ||
    item.price <= 0 ||
    item.price > CONFIG.maxListingPrice
  ) {

    return "Enter a valid product price.";

  }

  if (
    !item.quantity ||
    item.quantity.length > 80
  ) {

    return "Enter the available quantity.";

  }

  if (!item.state || !item.town) {

    return "Enter your state and town.";

  }

  if (
    item.seller.length < 2 ||
    item.seller.length > 80
  ) {

    return "Enter a valid seller or farm name.";

  }

  if (
    item.phone.length < 10 ||
    item.phone.length > 15
  ) {

    return "Enter a valid WhatsApp number.";

  }

  if (item.description.length > 1200) {

    return "Description must not exceed 1,200 characters.";

  }

  return "";

}


/* =========================================================
   SAVE LISTING
========================================================= */

async function saveListing(event) {

  event.preventDefault();

  if (!state.user) {

    closeDialog($("#listingDialog"));

    openAuth("signin");

    return;

  }

  const eligibility = sellerEligibility();

  if (!eligibility.allowed) {

    setText(
      "#formMessage",
      eligibility.reason
    );

    return;

  }

  const item = getFormListing();

  const validation = validateListing(item);

  if (validation) {

    setText("#formMessage", validation);

    return;

  }

  setText(
    "#formMessage",
    "Saving listing…"
  );

  const saveButton = $("#saveListingButton");

  if (saveButton) saveButton.disabled = true;

  try {

    if (state.editingId) {

      const current = state.listings.find(
        listing => listing.id === state.editingId
      );

      if (
        !current ||
        current.ownerId !== state.user.uid
      ) {

        throw new Error(
          "You can only edit your own listings."
        );

      }

      await updateDoc(
        doc(db, "products", state.editingId),
        {
          ...item,
          updatedAt: serverTimestamp()
        }
      );

      showToast("Listing updated successfully.");

    } else {

      await addDoc(
        collection(db, "products"),
        {

          ...item,

          ownerId: state.user.uid,

          createdAt: serverTimestamp(),

          createdMillis: Date.now()

        }
      );

      showToast("Your product has been published.");

    }

    closeDialog($("#listingDialog"));

    resetFilters();

    await loadListings();

    await loadDashboardData();

    $("#marketplace")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {

    showError(error, "Could not save listing.");

    setText(
      "#formMessage",
      error.message?.includes("only edit")
        ? error.message
        : "Could not save listing. Check your connection and Firestore Rules."
    );

  } finally {

    if (saveButton) saveButton.disabled = false;

  }

}


/* =========================================================
   DELETE LISTING
========================================================= */

async function deleteListing(id) {

  const item = state.listings.find(
    listing => listing.id === id
  );

  if (
    !item ||
    !state.user ||
    item.ownerId !== state.user.uid
  ) {

    showToast(
      "You can only delete your own listings."
    );

    return;

  }

  if (!window.confirm(
    `Delete "${item.title}"? This cannot be undone.`
  )) {

    return;

  }

  try {

    await deleteDoc(
      doc(db, "products", id)
    );

    state.listings = state.listings.filter(
      listing => listing.id !== id
    );

    renderListings();

    showToast("Listing deleted.");

    await loadDashboardData();

  } catch (error) {

    showError(error, "Delete failed.");

    showToast(
      "Could not delete listing. Check Firestore Rules."
    );

  }

}


/* =========================================================
   WHATSAPP CONTACT
========================================================= */

function contactSeller(id) {

  const item = state.listings.find(
    listing => listing.id === id
  );

  if (!item) return;

  const phone = normalisePhone(item.phone);

  if (
    phone.length < 10 ||
    phone.length > 15
  ) {

    showToast(
      "This listing has no valid WhatsApp number."
    );

    return;

  }

  const message =
    `Hello ${item.seller || "seller"}, ` +
    `I found your "${item.title}" listing on PoultryLink. ` +
    `Is it still available? Please confirm the price, quantity ` +
    `and delivery or pickup details.`;

  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


/* =========================================================
   PRODUCT DETAILS
========================================================= */

function showDetails(id) {

  const item = state.listings.find(
    listing => listing.id === id
  );

  if (!item) return;

  const location = [
    item.town,
    item.state
  ].filter(Boolean).join(", ");

  const owned = Boolean(
    state.user &&
    item.ownerId === state.user.uid
  );

  setHTML(
    "#detailContent",

    `

      <div class="modal-header">

        <div>

          <span class="section-kicker">
            LISTING DETAILS
          </span>

          <p>
            Review the offer before contacting the seller.
          </p>

        </div>

        <button
          type="button"
          class="modal-close"
          data-close="detailDialog"
          aria-label="Close"
        >
          ×
        </button>

      </div>

      <div class="detail-hero">

        <div class="listing-art ${categoryClass(item.category)}">

          <span class="art-emoji">
            ${escapeHTML(item.emoji || categoryEmoji(item.category))}
          </span>

        </div>

        <div>

          <h2 id="detailHeading">
            ${escapeHTML(item.title)}
          </h2>

          <span class="category-label">
            ${escapeHTML(item.category)}
          </span>

          <div class="listing-price">
            ${formatNaira(item.price)}
            <small>/ ${escapeHTML(item.unit || "unit")}</small>
          </div>

        </div>

      </div>

      <p class="detail-copy">
        ${escapeHTML(
          item.description ||
          "Contact the seller to confirm product details."
        )}
      </p>

      <div class="detail-facts">

        <div class="detail-fact">
          <small>AVAILABLE QUANTITY</small>
          <strong>${escapeHTML(item.quantity || "Ask seller")}</strong>
        </div>

        <div class="detail-fact">
          <small>LOCATION</small>
          <strong>${escapeHTML(location || "Not specified")}</strong>
        </div>

        <div class="detail-fact">
          <small>SELLER / FARM</small>
          <strong>${escapeHTML(item.seller || "Poultry seller")}</strong>
        </div>

        <div class="detail-fact">
          <small>LISTING STATUS</small>
          <strong>${owned ? "Your listing" : "Seller listing"}</strong>
        </div>

      </div>

      <p class="detail-copy">

        <strong>Safety reminder:</strong>

        Confirm stock, quality, final price, transport and
        payment arrangements directly with the seller.

      </p>

      <button
        type="button"
        class="btn btn-primary full-button"
        data-contact="${escapeHTML(item.id)}"
      >
        Contact seller on WhatsApp ↗
      </button>

    `
  );

  openDialog("detailDialog");

}


/* =========================================================
   SELLER VERIFICATION
========================================================= */

function openVerificationForm() {

  if (!state.user) {

    openAuth("signin");

    return;

  }

  if (state.seller?.verificationStatus === "approved") {

    showToast(
      "Your seller account has already been approved."
    );

    return;

  }

  $("#verificationForm")?.reset();

  setText("#verificationMessage", "");

  if (state.seller) {

    $("#verificationBusinessName").value =
      state.seller.businessName || "";

    $("#verificationFullName").value =
      state.seller.fullName ||
      state.profile?.displayName ||
      "";

    $("#verificationPhone").value =
      state.seller.phone ||
      state.profile?.phone ||
      "";

    $("#verificationState").value =
      state.seller.state || "";

    $("#verificationTown").value =
      state.seller.town || "";

    $("#verificationAddress").value =
      state.seller.address || "";

    $("#verificationDescription").value =
      state.seller.description || "";

  } else {

    $("#verificationFullName").value =
      state.profile?.displayName ||
      state.user.displayName ||
      "";

    $("#verificationPhone").value =
      state.profile?.phone || "";

  }

  openDialog("verificationDialog");

}


async function submitVerification(event) {

  event.preventDefault();

  if (!state.user) {

    openAuth("signin");

    return;

  }

  const data = new FormData(
    $("#verificationForm")
  );

  const application = {

    uid: state.user.uid,

    email: state.user.email || "",

    businessName: String(
      data.get("businessName") || ""
    ).trim(),

    fullName: String(
      data.get("fullName") || ""
    ).trim(),

    phone: normalisePhone(
      data.get("phone")
    ),

    state: String(
      data.get("state") || ""
    ),

    town: String(
      data.get("town") || ""
    ).trim(),

    address: String(
      data.get("address") || ""
    ).trim(),

    description: String(
      data.get("description") || ""
    ).trim(),

    documentReference: String(
      data.get("documentReference") || ""
    ).trim()

  };

  if (
    application.businessName.length < 2 ||
    application.fullName.length < 2 ||
    application.phone.length < 10 ||
    !application.state ||
    !application.town ||
    !application.address ||
    application.description.length < 10
  ) {

    setText(
      "#verificationMessage",
      "Complete all required fields with valid information."
    );

    return;

  }

  const submitButton = $("#submitVerificationButton");

  if (submitButton) submitButton.disabled = true;

  setText(
    "#verificationMessage",
    "Submitting application…"
  );

  try {

    const applicationRef = doc(
      db,
      "sellerApplications",
      state.user.uid
    );

    const existingApplication = await getDoc(
      applicationRef
    );

    if (
      existingApplication.exists() &&
      existingApplication.data().status === "approved"
    ) {

      throw new Error(
        "Your seller application has already been approved."
      );

    }

    /*
      The applicant can submit an application.
      They cannot approve themselves.

      Firestore Rules must restrict this document to its owner
      and prevent the owner from setting status to approved.
    */

    await setDoc(
      applicationRef,
      {

        ...application,

        status: "pending",

        submittedAt: serverTimestamp(),

        updatedAt: serverTimestamp()

      },
      {
        merge: true
      }
    );

    /*
      The seller profile is created as pending.
      Firestore Rules must prevent the applicant from changing
      verificationStatus to approved.
    */

    await setDoc(
      sellerRef(),
      {

        uid: state.user.uid,

        email: state.user.email || "",

        displayName: application.fullName,

        businessName: application.businessName,

        fullName: application.fullName,

        phone: application.phone,

        state: application.state,

        town: application.town,

        address: application.address,

        description: application.description,

        verificationStatus: "pending",

        updatedAt: serverTimestamp()

      },
      {
        merge: true
      }
    );

    await loadProfile(state.user);

    await loadDashboardData();

    closeDialog($("#verificationDialog"));

    showToast(
      "Your seller verification application has been submitted."
    );

  } catch (error) {

    showError(
      error,
      "Could not submit verification application."
    );

    setText(
      "#verificationMessage",
      error.message ||
      "Could not submit your application. Try again."
    );

  } finally {

    if (submitButton) submitButton.disabled = false;

  }

}


/* =========================================================
   SUBSCRIPTION STATUS
========================================================= */

function renderSubscriptionStatus() {

  const container = $("#subscriptionStatus");

  if (!container) return;

  if (!state.seller) {

    container.textContent =
      "Complete seller verification first.";

    return;

  }

  if (state.seller.verificationStatus !== "approved") {

    container.textContent =
      "Seller verification approval is required.";

    return;

  }

  if (isSubscriptionActive(state.subscription)) {

    container.innerHTML = `

      <p>
        <strong>Active subscription</strong>
      </p>

      <p>
        Plan:
        ${escapeHTML(state.subscription.plan || "Seller plan")}
      </p>

      <p>
        Expires:
        ${friendlyDate(state.subscription.expiresAt)}
      </p>

    `;

  } else {

    container.textContent =
      "No active seller subscription.";

  }

}


/* =========================================================
   SUBSCRIPTION PAYMENT INITIALIZATION
========================================================= */

async function startSubscription(plan) {

  if (!state.user) {

    openAuth("signin");

    return;

  }

  if (!state.seller) {

    showToast(
      "Submit your seller verification application first."
    );

    openVerificationForm();

    return;

  }

  if (state.seller.verificationStatus !== "approved") {

    showToast(
      "Your seller verification must be approved before subscribing."
    );

    return;

  }

  if (!["monthly", "yearly"].includes(plan)) {

    showToast("Invalid subscription plan.");

    return;

  }

  setText(
    "#subscriptionMessage",
    "Connecting to secure payment service…"
  );

  const buttons = $$("[data-subscription-plan]");

  buttons.forEach(button => {
    button.disabled = true;
  });

  try {

    const token = await state.user.getIdToken();

    const response = await fetch(
      CONFIG.paymentEndpoint,
      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Authorization": `Bearer ${token}`

        },

        /*
          The backend must determine the amount from the plan.
          Never accept a payment amount supplied by the browser.
        */

        body: JSON.stringify({
          plan
        })

      }
    );

    if (!response.ok) {

      throw new Error(
        "Secure payment service is not available. Please try again later."
      );

    }

    const result = await response.json();

    if (!result.authorization_url) {

      throw new Error(
        "Payment service did not return a checkout link."
      );

    }

    /*
      Subscription activation must happen on the backend
      only after Paystack payment verification.
    */

    window.location.assign(
      result.authorization_url
    );

  } catch (error) {

    showError(
      error,
      "Could not initialize payment."
    );

    setText(
      "#subscriptionMessage",
      error.message ||
      "Payment could not be started. Please try again."
    );

  } finally {

    buttons.forEach(button => {
      button.disabled = false;
    });

  }

}


/* =========================================================
   DASHBOARD
========================================================= */

async function openDashboard() {

  if (!state.user) {

    openAuth("signin");

    return;

  }

  state.dashboardOpen = true;

  setHidden("#dashboardSection", false);

  setHidden("#adminSection", !state.isAdmin);

  await loadDashboardData();

  $("#dashboardSection")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


function closeDashboard() {

  state.dashboardOpen = false;

  setHidden("#dashboardSection", true);

  setHidden("#adminSection", true);

}


async function loadDashboardData() {

  if (!state.user) return;

  setText(
    "#dashboardUserName",
    state.profile?.displayName ||
    state.user.displayName ||
    "PoultryLink user"
  );

  setText(
    "#dashboardUserEmail",
    state.user.email || ""
  );

  setText(
    "#dashboardRoleBadge",
    state.isAdmin
      ? "Administrator"
      : state.seller
        ? "Seller account"
        : "Buyer account"
  );

  renderProfileInformation();

  renderVerificationStatus();

  renderSubscriptionStatus();

  await Promise.all([

    loadMyListings(),

    loadSavedProducts(),

    loadMyOrders(),

    loadRecentActivities()

  ]);

  if (state.isAdmin) {

    await loadAdminDashboard();

  }

}


/* =========================================================
   DASHBOARD PROFILE
========================================================= */

function renderProfileInformation() {

  const profile = state.profile || {};

  setHTML(
    "#profileInformation",

    `

      <p>
        <strong>Name:</strong>
        ${escapeHTML(profile.displayName || "Not provided")}
      </p>

      <p>
        <strong>Email:</strong>
        ${escapeHTML(state.user?.email || "Not available")}
      </p>

      <p>
        <strong>Phone:</strong>
        ${escapeHTML(profile.phone || "Not provided")}
      </p>

      <p>
        <strong>Location:</strong>
        ${escapeHTML(profile.location || "Not provided")}
      </p>

    `
  );

}


/* =========================================================
   EDIT PROFILE
========================================================= */

function openProfileEditor() {

  if (!state.user) return;

  $("#profileName").value =
    state.profile?.displayName ||
    state.user.displayName ||
    "";

  $("#profilePhone").value =
    state.profile?.phone || "";

  $("#profileLocation").value =
    state.profile?.location || "";

  setText("#profileMessage", "");

  openDialog("profileDialog");

}


async function saveProfile(event) {

  event.preventDefault();

  if (!state.user) return;

  const displayName =
    $("#profileName").value.trim();

  const phone =
    normalisePhone($("#profilePhone").value);

  const location =
    $("#profileLocation").value.trim();

  if (displayName.length < 2) {

    setText(
      "#profileMessage",
      "Enter a valid name."
    );

    return;

  }

  const saveButton = $("#saveProfileButton");

  if (saveButton) saveButton.disabled = true;

  setText(
    "#profileMessage",
    "Saving profile…"
  );

  try {

    await updateProfile(
      state.user,
      {
        displayName
      }
    );

    await setDoc(
      userRef(),
      {

        displayName,

        phone,

        location,

        updatedAt: serverTimestamp()

      },
      {
        merge: true
      }
    );

    /*
      Update only ordinary seller contact/profile fields.
      Never allow this operation to change verification status.
    */

    if (state.seller) {

      await updateDoc(
        sellerRef(),
        {

          displayName,

          phone,

          updatedAt: serverTimestamp()

        }
      );

    }

    await loadProfile(state.user);

    setAuthUI(state.user);

    await loadDashboardData();

    closeDialog($("#profileDialog"));

    showToast("Profile updated successfully.");

  } catch (error) {

    showError(error, "Could not update profile.");

    setText(
      "#profileMessage",
      "Could not save your profile. Try again."
    );

  } finally {

    if (saveButton) saveButton.disabled = false;

  }

}


/* =========================================================
   SELLER VERIFICATION STATUS
========================================================= */

function renderVerificationStatus() {

  const container = $("#sellerVerificationStatus");

  if (!container) return;

  if (!state.seller) {

    container.innerHTML = `
      <p>No seller verification application found.</p>
    `;

    return;

  }

  const status =
    state.seller.verificationStatus || "not submitted";

  const messages = {

    pending:
      "Your application is waiting for administrator review.",

    approved:
      "Your seller account has been verified.",

    rejected:
      "Your application was not approved. Review the administrator's feedback."

  };

  container.innerHTML = `

    <p>
      <strong>Status:</strong>
      ${escapeHTML(status.toUpperCase())}
    </p>

    <p>
      ${escapeHTML(
        messages[status] || "Complete seller verification."
      )}
    </p>

    ${
      state.seller.rejectionReason
        ? `<p>${escapeHTML(state.seller.rejectionReason)}</p>`
        : ""
    }

  `;

  setText(
    "#verificationButton",
    status === "approved"
      ? "Verified seller"
      : status === "pending"
        ? "View application status"
        : "Complete verification"
  );

}


/* =========================================================
   MY LISTINGS
========================================================= */

async function loadMyListings() {

  if (!state.user) return;

  try {

    const listingsQuery = query(
      collection(db, "products"),
      where("ownerId", "==", state.user.uid)
    );

    const snapshot = await getDocs(listingsQuery);

    const listings = snapshot.docs.map(snap => ({
      ...snap.data(),
      id: snap.id
    }));

    setHTML(
      "#myListingsContent",

      listings.length

        ? listings.map(item => `

            <div class="dashboard-item">

              <strong>
                ${escapeHTML(item.title)}
              </strong>

              <span>
                ${formatNaira(item.price)}
              </span>

              <small>
                Status: ${escapeHTML(item.status || "Unknown")}
              </small>

            </div>

          `).join("")

        : "<p>You have not published any listings.</p>"

    );

  } catch (error) {

    showError(error, "Could not load your listings.");

    setText(
      "#myListingsContent",
      "Unable to load listings."
    );

  }

}


/* =========================================================
   SAVED PRODUCTS
========================================================= */

async function loadSavedProducts() {

  if (!state.user) return;

  try {

    const savedQuery = query(
      collection(db, "users", state.user.uid, "savedProducts"),
      limit(20)
    );

    const snapshot = await getDocs(savedQuery);

    const saved = snapshot.docs.map(snap => ({
      ...snap.data(),
      id: snap.id
    }));

    setHTML(
      "#savedProductsContent",

      saved.length

        ? saved.map(item => `

            <div class="dashboard-item">

              <strong>
                ${escapeHTML(item.title || "Saved product")}
              </strong>

              <small>
                ${escapeHTML(item.category || "")}
              </small>

              <button
                type="button"
                class="text-button"
                data-remove-saved="${escapeHTML(item.id)}"
              >
                Remove
              </button>

            </div>

          `).join("")

        : "<p>No saved products yet.</p>"

    );

  } catch (error) {

    showError(error, "Could not load saved products.");

    setText(
      "#savedProductsContent",
      "Saved products are currently unavailable."
    );

  }

}


/* =========================================================
   SAVE PRODUCT
========================================================= */

async function saveProduct(id) {

  if (!state.user) {

    openAuth("signin");

    return;

  }

  const item = state.listings.find(
    listing => listing.id === id
  );

  if (!item) return;

  try {

    await setDoc(
      doc(
        db,
        "users",
        state.user.uid,
        "savedProducts",
        id
      ),

      {

        productId: id,

        title: item.title,

        category: item.category,

        price: item.price,

        seller: item.seller,

        savedAt: serverTimestamp()

      }

    );

    showToast("Product saved.");

    await loadSavedProducts();

  } catch (error) {

    showError(error, "Could not save product.");

    showToast(
      "Could not save product. Check your account permissions."
    );

  }

}


/* =========================================================
   REMOVE SAVED PRODUCT
========================================================= */

async function removeSavedProduct(id) {

  if (!state.user) return;

  try {

    await deleteDoc(
      doc(
        db,
        "users",
        state.user.uid,
        "savedProducts",
        id
      )
    );

    await loadSavedProducts();

    showToast("Saved product removed.");

  } catch (error) {

    showError(error, "Could not remove saved product.");

  }

}


/* =========================================================
   MY ORDERS
========================================================= */

async function loadMyOrders() {

  if (!state.user) return;

  try {

    const ordersQuery = query(
      collection(db, "orders"),
      where("buyerId", "==", state.user.uid),
      limit(20)
    );

    const snapshot = await getDocs(ordersQuery);

    const orders = snapshot.docs.map(snap => ({
      ...snap.data(),
      id: snap.id
    }));

    setHTML(
      "#myOrdersContent",

      orders.length

        ? orders.map(order => `

            <div class="dashboard-item">

              <strong>
                Order #${escapeHTML(order.id.slice(0, 8))}
              </strong>

              <span>
                ${formatNaira(order.total)}
              </span>

              <small>
                Status: ${escapeHTML(order.status || "Pending")}
              </small>

            </div>

          `).join("")

        : "<p>You have no orders yet.</p>"

    );

  } catch (error) {

    showError(error, "Could not load orders.");

    setText(
      "#myOrdersContent",
      "Order information is currently unavailable."
    );

  }

}


/* =========================================================
   RECENT ACTIVITIES
========================================================= */

async function loadRecentActivities() {

  if (!state.user) return;

  try {

    const activityQuery = query(
      collection(db, "users", state.user.uid, "activities"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const snapshot = await getDocs(activityQuery);

    const activities = snapshot.docs.map(snap => ({
      ...snap.data(),
      id: snap.id
    }));

    setHTML(
      "#recentActivitiesContent",

      activities.length

        ? activities.map(activity => `

            <div class="dashboard-item">

              <strong>
                ${escapeHTML(activity.title || "Account activity")}
              </strong>

              <small>
                ${escapeHTML(activity.description || "")}
              </small>

            </div>

          `).join("")

        : "<p>No recent activities.</p>"

    );

  } catch (error) {

    showError(error, "Could not load recent activities.");

    setText(
      "#recentActivitiesContent",
      "Activity history is currently unavailable."
    );

  }

}


/* =========================================================
   ACCOUNT SETTINGS
========================================================= */

function openAccountSettings() {

  if (!state.user) return;

  setHTML(
    "#accountSettingsContent",

    `

      <p>
        <strong>Email:</strong>
        ${escapeHTML(state.user.email || "")}
      </p>

      <p>
        <strong>Account created:</strong>
        ${friendlyDate(state.user.metadata.creationTime
          ? new Date(state.user.metadata.creationTime)
          : null)}
      </p>

      <p>
        <strong>Email verified:</strong>
        ${state.user.emailVerified ? "Yes" : "No"}
      </p>

    `
  );

  openDialog("settingsDialog");

}


/* =========================================================
   ADMINISTRATOR DASHBOARD
========================================================= */

async function loadAdminDashboard() {

  if (!state.user || !state.isAdmin) return;

  try {

    const [
      usersSnapshot,
      applicationsSnapshot,
      subscriptionsSnapshot,
      listingsSnapshot
    ] = await Promise.all([

      getDocs(collection(db, "users")),

      getDocs(
        query(
          collection(db, "sellerApplications"),
          where("status", "==", "pending")
        )
      ),

      getDocs(
        query(
          collection(db, "subscriptions"),
          where("status", "==", "active")
        )
      ),

      getDocs(
        query(
          collection(db, "products"),
          where("status", "==", "active")
        )
      )

    ]);

    setText(
      "#adminTotalUsers",
      usersSnapshot.size
    );

    setText(
      "#adminPendingVerifications",
      applicationsSnapshot.size
    );

    setText(
      "#adminActiveSubscriptions",
      subscriptionsSnapshot.size
    );

    setText(
      "#adminActiveListings",
      listingsSnapshot.size
    );

    renderAdminApplications(applicationsSnapshot);

    renderAdminUsers(usersSnapshot);

    renderAdminSubscriptions(subscriptionsSnapshot);

    renderAdminListings(listingsSnapshot);

  } catch (error) {

    showError(
      error,
      "Could not load administrator information."
    );

    showToast(
      "Administrator data could not be loaded. Check permissions."
    );

  }

}


/* =========================================================
   ADMIN: SELLER APPLICATIONS
========================================================= */

function renderAdminApplications(snapshot) {

  const container = $("#adminVerificationList");

  if (!container) return;

  if (snapshot.empty) {

    container.innerHTML =
      "<p>No pending seller applications.</p>";

    return;

  }

  container.innerHTML = snapshot.docs.map(snap => {

    const item = snap.data();

    return `

      <div class="dashboard-item">

        <strong>
          ${escapeHTML(item.businessName)}
        </strong>

        <small>
          ${escapeHTML(item.fullName)}
        </small>

        <small>
          ${escapeHTML(item.town)}, ${escapeHTML(item.state)}
        </small>

        <small>
          ${escapeHTML(item.email)}
        </small>

        <div class="card-actions">

          <button
            class="btn btn-primary"
            type="button"
            data-approve-seller="${escapeHTML(snap.id)}"
          >
            Approve
          </button>

          <button
            class="btn btn-outline"
            type="button"
            data-reject-seller="${escapeHTML(snap.id)}"
          >
            Reject
          </button>

        </div>

      </div>

    `;

  }).join("");

}


/* =========================================================
   ADMIN: APPROVE SELLER
========================================================= */

async function approveSeller(uid) {

  if (!state.isAdmin) {

    showToast("Administrator access required.");

    return;

  }

  if (!window.confirm(
    "Approve this seller verification application?"
  )) {

    return;

  }

  try {

    const applicationSnapshot = await getDoc(
      doc(db, "sellerApplications", uid)
    );

    if (!applicationSnapshot.exists()) {

      throw new Error(
        "Seller application was not found."
      );

    }

    const application = applicationSnapshot.data();

    if (application.status !== "pending") {

      throw new Error(
        "This application is no longer pending."
      );

    }

    /*
      These writes are permitted only if Firestore Rules
      require the trusted admin custom claim.
    */

    await updateDoc(
      doc(db, "sellerApplications", uid),
      {

        status: "approved",

        reviewedAt: serverTimestamp(),

        reviewedBy: state.user.uid

      }
    );

    await setDoc(
      doc(db, "sellers", uid),
      {

        verificationStatus: "approved",

        verifiedAt: serverTimestamp(),

        updatedAt: serverTimestamp()

      },
      {
        merge: true
      }
    );

    showToast("Seller approved.");

    await loadAdminDashboard();

  } catch (error) {

    showError(error, "Could not approve seller.");

    showToast(
      "Approval failed. Confirm administrator permissions."
    );

  }

}


/* =========================================================
   ADMIN: REJECT SELLER
========================================================= */

async function rejectSeller(uid) {

  if (!state.isAdmin) {

    showToast("Administrator access required.");

    return;

  }

  const reason = window.prompt(
    "Enter the reason for rejecting this application:"
  );

  if (!reason || !reason.trim()) return;

  try {

    await updateDoc(
      doc(db, "sellerApplications", uid),
      {

        status: "rejected",

        rejectionReason: reason.trim(),

        reviewedAt: serverTimestamp(),

        reviewedBy: state.user.uid

      }
    );

    await setDoc(
      doc(db, "sellers", uid),
      {

        verificationStatus: "rejected",

        rejectionReason: reason.trim(),

        updatedAt: serverTimestamp()

      },
      {
        merge: true
      }
    );

    showToast("Seller application rejected.");

    await loadAdminDashboard();

  } catch (error) {

    showError(error, "Could not reject seller.");

    showToast(
      "Rejection failed. Check administrator permissions."
    );

  }

}


/* =========================================================
   ADMIN: USERS
========================================================= */

function renderAdminUsers(snapshot) {

  const container = $("#adminUsersList");

  if (!container) return;

  if (snapshot.empty) {

    container.innerHTML =
      "<p>No registered users found.</p>";

    return;

  }

  container.innerHTML = snapshot.docs.map(snap => {

    const user = snap.data();

    return `

      <div class="dashboard-item">

        <strong>
          ${escapeHTML(user.displayName || "User")}
        </strong>

        <small>
          ${escapeHTML(user.email || "")}
        </small>

        <small>
          Account type:
          ${escapeHTML(user.accountType || "buyer")}
        </small>

      </div>

    `;

  }).join("");

}


/* =========================================================
   ADMIN: SUBSCRIPTIONS
========================================================= */

function renderAdminSubscriptions(snapshot) {

  const container = $("#adminSubscriptionsList");

  if (!container) return;

  if (snapshot.empty) {

    container.innerHTML =
      "<p>No active subscriptions.</p>";

    return;

  }

  container.innerHTML = snapshot.docs.map(snap => {

    const item = snap.data();

    return `

      <div class="dashboard-item">

        <strong>
          ${escapeHTML(item.plan || "Seller subscription")}
        </strong>

        <small>
          Seller ID: ${escapeHTML(snap.id)}
        </small>

        <small>
          Expires: ${friendlyDate(item.expiresAt)}
        </small>

      </div>

    `;

  }).join("");

}


/* =========================================================
   ADMIN: MARKETPLACE LISTINGS
========================================================= */

function renderAdminListings(snapshot) {

  const container = $("#adminListingsList");

  if (!container) return;

  if (snapshot.empty) {

    container.innerHTML =
      "<p>No active listings.</p>";

    return;

  }

  container.innerHTML = snapshot.docs.map(snap => {

    const item = snap.data();

    return `

      <div class="dashboard-item">

        <strong>
          ${escapeHTML(item.title || "Product")}
        </strong>

        <small>
          ${formatNaira(item.price)}
        </small>

        <small>
          Seller: ${escapeHTML(item.seller || "Unknown")}
        </small>

        <button
          type="button"
          class="btn btn-outline"
          data-moderate-listing="${escapeHTML(snap.id)}"
        >
          Suspend listing
        </button>

      </div>

    `;

  }).join("");

}


/* =========================================================
   ADMIN: SUSPEND LISTING
========================================================= */

async function suspendListing(id) {

  if (!state.isAdmin) {

    showToast("Administrator access required.");

    return;

  }

  if (!window.confirm(
    "Suspend this marketplace listing?"
  )) return;

  try {

    await updateDoc(
      doc(db, "products", id),
      {

        status: "suspended",

        suspendedAt: serverTimestamp(),

        suspendedBy: state.user.uid

      }
    );

    showToast("Listing suspended.");

    await loadListings();

    await loadAdminDashboard();

  } catch (error) {

    showError(error, "Could not suspend listing.");

    showToast(
      "Suspension failed. Check administrator permissions."
    );

  }

}


/* =========================================================
   SEARCH EVENTS
========================================================= */

on("#searchForm", "submit", event => {

  event.preventDefault();

  state.query = $("#searchInput")?.value || "";

  state.category = $("#categoryFilter")?.value || "";

  state.location = $("#locationFilter")?.value || "";

  renderListings();

  $("#marketplace")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

});


on("#categoryChips", "click", event => {

  const chip = event.target.closest("[data-category]");

  if (!chip) return;

  state.category = chip.dataset.category;

  if ($("#categoryFilter")) {
    $("#categoryFilter").value = state.category;
  }

  renderListings();

});


on("#sortSelect", "change", event => {

  state.sort = event.target.value;

  renderListings();

});


on("#clearFiltersButton", "click", resetFilters);

on("#emptyClearButton", "click", resetFilters);


/* =========================================================
   SELLER BUTTONS
========================================================= */

[
  "sellHeaderButton",
  "heroSellButton",
  "sellBannerButton"
].forEach(id => {

  const button = document.getElementById(id);

  if (!button) return;

  button.addEventListener(
    "click",
    () => openListingForm()
  );

});


/* =========================================================
   SIGN IN / ACCOUNT BUTTON
========================================================= */

on("#signInButton", "click", async () => {

  if (state.user) {

    await openDashboard();

  } else {

    openAuth("signin");

  }

});


/* =========================================================
   AUTH EVENTS
========================================================= */

on("#authModeButton", "click", () => {

  state.authMode =
    state.authMode === "signin"
      ? "signup"
      : "signin";

  setText("#authMessage", "");

  updateAuthModeUI();

});


on("#authForm", "submit", handleAuthSubmit);


/* =========================================================
   FORM EVENTS
========================================================= */

on("#listingForm", "submit", saveListing);

on("#verificationForm", "submit", submitVerification);

on("#profileForm", "submit", saveProfile);


/* =========================================================
   DASHBOARD EVENTS
========================================================= */

on("#dashboardCloseButton", "click", closeDashboard);

on("#editProfileButton", "click", openProfileEditor);

on("#verificationButton", "click", openVerificationForm);


on("#subscriptionButton", "click", () => {

  if (!state.user) {

    openAuth("signin");

    return;

  }

  openDialog("subscriptionDialog");

});


on("#manageListingsButton", "click", () => {

  $("#marketplace")?.scrollIntoView({
    behavior: "smooth"
  });

});


on("#accountSettingsButton", "click", openAccountSettings);


/* =========================================================
   SUBSCRIPTION BUTTONS
========================================================= */

onAll("[data-subscription-plan]", "click", event => {

  startSubscription(
    event.currentTarget.dataset.subscriptionPlan
  );

});


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

on("#menuButton", "click", () => {

  const nav = $("#desktopNav");

  if (!nav) return;

  const isOpen =
    nav.classList.toggle("open");

  $("#menuButton")?.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

  if ($("#menuButton")) {
    $("#menuButton").textContent =
      isOpen ? "×" : "☰";
  }

});


onAll("#desktopNav a", "click", () => {

  $("#desktopNav")?.classList.remove("open");

  $("#menuButton")?.setAttribute(
    "aria-expanded",
    "false"
  );

  if ($("#menuButton")) {
    $("#menuButton").textContent = "☰";
  }

});


/* =========================================================
   GLOBAL BUTTON EVENTS
========================================================= */

document.addEventListener(
  "click",
  async event => {

    const closeButton =
      event.target.closest("[data-close]");

    if (closeButton) {

      closeDialog(
        document.getElementById(
          closeButton.dataset.close
        )
      );

    }

    const detailButton =
      event.target.closest("[data-detail]");

    if (detailButton) {

      showDetails(
        detailButton.dataset.detail
      );

    }

    const contactButton =
      event.target.closest("[data-contact]");

    if (contactButton) {

      contactSeller(
        contactButton.dataset.contact
      );

    }

    const editButton =
      event.target.closest("[data-edit]");

    if (editButton) {

      const item = state.listings.find(
        listing =>
          listing.id === editButton.dataset.edit
      );

      if (
        item &&
        item.ownerId === state.user?.uid
      ) {

        openListingForm(item);

      }

    }

    const deleteButton =
      event.target.closest("[data-delete]");

    if (deleteButton) {

      await deleteListing(
        deleteButton.dataset.delete
      );

    }

    const saveButton =
      event.target.closest("[data-save]");

    if (saveButton) {

      await saveProduct(
        saveButton.dataset.save
      );

    }

    const removeSavedButton =
      event.target.closest("[data-remove-saved]");

    if (removeSavedButton) {

      await removeSavedProduct(
        removeSavedButton.dataset.removeSaved
      );

    }

    const approveButton =
      event.target.closest("[data-approve-seller]");

    if (approveButton) {

      await approveSeller(
        approveButton.dataset.approveSeller
      );

    }

    const rejectButton =
      event.target.closest("[data-reject-seller]");

    if (rejectButton) {

      await rejectSeller(
        rejectButton.dataset.rejectSeller
      );

    }

    const moderateButton =
      event.target.closest("[data-moderate-listing]");

    if (moderateButton) {

      await suspendListing(
        moderateButton.dataset.moderateListing
      );

    }

  }
);


/* =========================================================
   DIALOG BACKDROP
========================================================= */

$$("dialog").forEach(dialog => {

  dialog.addEventListener(
    "click",
    event => {

      if (event.target === dialog) {

        closeDialog(dialog);

      }

    }
  );

});


/* =========================================================
   AUTHENTICATION STATE
========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    state.user = user;

    if (!user) {

      state.profile = null;
      state.seller = null;
      state.subscription = null;
      state.isAdmin = false;

      setAuthUI(null);

      closeDashboard();

      renderListings();

      return;

    }

    await loadProfile(user);

    setAuthUI(user);

    renderListings();

    if (state.dashboardOpen) {

      await loadDashboardData();

    }

  }
);


/* =========================================================
   APPLICATION STARTUP
========================================================= */

setText(
  "#year",
  new Date().getFullYear()
);

updateAuthModeUI();

renderListings();

loadListings();