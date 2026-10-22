import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =====================================================
   1. FIREBASE CONFIGURATION
   ===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDUBwgGHDhJ-v6kBE5Dn3O_FxF8EfPPfy4",
  authDomain: "poultrylink-2459a.firebaseapp.com",
  projectId: "poultrylink-2459a",
  storageBucket: "poultrylink-2459a.firebasestorage.app",
  messagingSenderId: "332920290687",
  appId: "1:332920290687:web:3e71c648817e1c07ba6e4a"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =====================================================
   2. APPLICATION STATE
   ===================================================== */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const state = {
  user: null,
  listings: [],
  query: "",
  category: "",
  location: "",
  sort: "newest",
  authMode: "signin",
  editingId: null,
  unsubscribeListings: null,
  loading: true,
  firebaseError: false
};

const CATEGORY_ART = {
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

let toastTimer;


/* =====================================================
   3. GENERAL HELPERS
   ===================================================== */

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
    return "Price unavailable";
  }

  return "₦" + new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0
  }).format(number);
}


function normalisePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}


function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}


function getErrorMessage(error) {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use":
      "This email already has an account. Please sign in.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account was found with these details.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/weak-password":
      "Choose a stronger password with at least 6 characters.",

    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",

    "auth/network-request-failed":
      "Network problem. Check your internet connection.",

    "auth/operation-not-allowed":
      "Email and password sign-in is not enabled in Firebase.",

    "permission-denied":
      "Firebase denied this action. Please check your Firestore security rules.",

    "unavailable":
      "The database is temporarily unavailable. Please try again.",

    "failed-precondition":
      "Firebase requires an additional configuration step. Please check the console."
  };

  return messages[code] ||
    error?.message ||
    "Something went wrong. Please try again.";
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


function closeDialog(id) {
  const dialog = typeof id === "string"
    ? document.getElementById(id)
    : id;

  if (!dialog) return;

  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}


function getListingTimestamp(item) {
  if (item.createdAt?.toMillis) {
    return item.createdAt.toMillis();
  }

  if (item.createdAt instanceof Date) {
    return item.createdAt.getTime();
  }

  return 0;
}


function getLocation(item) {
  return [item.town, item.state]
    .filter(Boolean)
    .join(", ");
}


function getCategoryStyle(category) {
  return CATEGORY_ART[category] || {
    emoji: "🐔",
    art: "equipment"
  };
}


/* =====================================================
   4. AUTHENTICATION INTERFACE
   ===================================================== */

function setAuthMode(mode) {
  state.authMode = mode;

  const registering = mode === "register";

  $("#authTitle").textContent = registering
    ? "Create your seller account"
    : "Welcome to PoultryLink";

  $("#authSubtitle").textContent = registering
    ? "Register to publish and manage your products."
    : "Sign in to manage your poultry listings.";

  $("#authNameField").classList.toggle(
    "hidden",
    !registering
  );

  $("#authName").required = registering;

  $("#authPassword").autocomplete = registering
    ? "new-password"
    : "current-password";

  $("#authSubmitButton").textContent = registering
    ? "Create account"
    : "Sign in";

  $("#authSwitchText").textContent = registering
    ? "Already have an account?"
    : "New to PoultryLink?";

  $("#authSwitchButton").textContent = registering
    ? "Sign in"
    : "Create account";

  $("#authMessage").textContent = "";
}


function openAuth(mode = "signin") {
  setAuthMode(mode);

  updateAuthInterface();

  openDialog("authDialog");
}


function updateAuthInterface() {
  const user = state.user;

  $("#authContent").classList.toggle("hidden", Boolean(user));

  $("#accountContent").classList.toggle("hidden", !user);

  if (user) {
    $("#accountName").textContent =
      user.displayName || "PoultryLink seller";

    $("#accountEmail").textContent = user.email || "";

    $("#signInButton").textContent = "My account";
  } else {
    $("#signInButton").textContent = "Sign in";
  }

  $("#sellHeaderButton").textContent = user
    ? "＋ List a product"
    : "＋ List a product";
}


async function saveSellerProfile(user, farmName = "") {
  const sellerRef = doc(db, "sellers", user.uid);

  const sellerSnapshot = await getDoc(sellerRef);

  const sellerData = {
    uid: user.uid,
    email: user.email || "",
    displayName: farmName ||
      user.displayName ||
      "PoultryLink seller",
    updatedAt: serverTimestamp()
  };

  if (!sellerSnapshot.exists()) {
    sellerData.createdAt = serverTimestamp();
  }

  await setDoc(sellerRef, sellerData, {
    merge: true
  });
}


$("#authSwitchButton").addEventListener("click", () => {
  setAuthMode(
    state.authMode === "signin"
      ? "register"
      : "signin"
  );
});


$("#authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) return;

  const email = $("#authEmail").value.trim();

  const password = $("#authPassword").value;

  const name = $("#authName").value.trim();

  const submitButton = $("#authSubmitButton");

  const message = $("#authMessage");

  submitButton.disabled = true;

  message.textContent = "Please wait…";

  try {
    if (state.authMode === "register") {
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

      await saveSellerProfile(
        credential.user,
        name
      );

      message.textContent = "";

      showToast("Your seller account has been created.");

      updateAuthInterface();

      closeDialog("authDialog");

    } else {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      message.textContent = "";

      showToast("You are signed in.");

      updateAuthInterface();

      closeDialog("authDialog");
    }

  } catch (error) {
    console.error("Authentication error:", error);

    message.textContent = getErrorMessage(error);

  } finally {
    submitButton.disabled = false;
  }
});


$("#signOutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);

    closeDialog("authDialog");

    showToast("You have signed out.");

  } catch (error) {
    console.error("Sign-out error:", error);

    $("#accountMessage").textContent = getErrorMessage(error);
  }
});


$("#signInButton").addEventListener("click", () => {
  if (state.user) {
    openAuth("signin");
  } else {
    openAuth("signin");
  }
});


/* =====================================================
   5. LISTING CARDS
   ===================================================== */

function cardTemplate(item) {
  const style = getCategoryStyle(item.category);

  const location = getLocation(item);

  const isOwner = Boolean(
    state.user &&
    item.ownerId === state.user.uid
  );

  return `
    <article class="listing-card">

      <div class="listing-art ${escapeHTML(style.art)}">

        <span class="listing-tag">
          ${isOwner ? "YOUR LISTING" : "LIVE LISTING"}
        </span>

        <span class="art-emoji" aria-hidden="true">
          ${escapeHTML(item.emoji || style.emoji)}
        </span>

      </div>

      <div class="listing-body">

        <div class="listing-meta">

          <span class="category-label">
            ${escapeHTML(item.category)}
          </span>

          <span>
            ⌖ ${escapeHTML(location || "Location not set")}
          </span>

        </div>

        <h3>${escapeHTML(item.title)}</h3>

        <p class="listing-description">
          ${escapeHTML(
            item.description ||
            "Contact the seller for more product details."
          )}
        </p>

        <div class="listing-price">
          ${formatNaira(item.price)}

          <small>
            / ${escapeHTML(item.unit || "unit")}
          </small>
        </div>

        <div class="listing-details">

          <span>
            Available:
            <strong>${escapeHTML(item.quantity || "Ask seller")}</strong>
          </span>

          <span>Published offer</span>

        </div>

        <div class="seller-line">

          <span class="seller-avatar">
            ${escapeHTML(
              (item.seller || "F").trim().charAt(0).toUpperCase()
            )}
          </span>

          <span>
            Listed by
            <strong>${escapeHTML(item.seller || "Poultry seller")}</strong>
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

        </div>

        ${
          isOwner
            ? `
              <div class="card-actions owner-actions">

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
            `
            : ""
        }

      </div>

    </article>
  `;
}


/* =====================================================
   6. SEARCH, FILTERING AND SORTING
   ===================================================== */

function filteredListings() {
  const search = state.query.trim().toLowerCase();

  const results = state.listings.filter(item => {
    const searchable = [
      item.title,
      item.category,
      item.description,
      item.seller,
      item.town,
      item.state,
      item.quantity,
      item.unit
    ]
      .join(" ")
      .toLowerCase();

    const queryMatch =
      !search || searchable.includes(search);

    const categoryMatch =
      !state.category ||
      item.category === state.category;

    const locationMatch =
      !state.location ||
      item.state === state.location;

    return queryMatch && categoryMatch && locationMatch;
  });

  if (state.sort === "price-low") {
    results.sort((a, b) => Number(a.price) - Number(b.price));

  } else if (state.sort === "price-high") {
    results.sort((a, b) => Number(b.price) - Number(a.price));

  } else {
    results.sort(
      (a, b) =>
        getListingTimestamp(b) - getListingTimestamp(a)
    );
  }

  return results;
}


function renderListings() {
  const grid = $("#listingGrid");

  const emptyState = $("#emptyState");

  const results = filteredListings();

  if (state.loading) {
    $("#resultsCount").textContent = "Loading listings…";

    $("#emptyStateTitle").textContent = "Loading marketplace";

    $("#emptyStateMessage").textContent =
      "Connecting to the shared marketplace.";

    emptyState.classList.remove("hidden");

    grid.classList.add("hidden");

    return;
  }

  if (state.firebaseError) {
    $("#resultsCount").textContent = "Marketplace unavailable";

    $("#emptyStateTitle").textContent =
      "Unable to load listings";

    $("#emptyStateMessage").textContent =
      "Please check the internet connection and Firebase configuration, then refresh the page.";

    emptyState.classList.remove("hidden");

    grid.classList.add("hidden");

    return;
  }

  grid.innerHTML = results.map(cardTemplate).join("");

  $("#resultsCount").textContent =
    `${results.length} ${
      results.length === 1 ? "listing" : "listings"
    }`;

  if (results.length === 0) {
    $("#emptyStateTitle").textContent =
      state.listings.length === 0
        ? "No published listings yet"
        : "No matching listings";

    $("#emptyStateMessage").textContent =
      state.listings.length === 0
        ? "When a seller publishes a product, it will appear here for buyers to discover."
        : "Try another search or clear your filters.";

    emptyState.classList.remove("hidden");

    grid.classList.add("hidden");

  } else {
    emptyState.classList.add("hidden");

    grid.classList.remove("hidden");
  }

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

  $("#searchInput").value = "";

  $("#categoryFilter").value = "";

  $("#locationFilter").value = "";

  $("#sortSelect").value = "newest";

  renderListings();
}


$("#searchForm").addEventListener("submit", event => {
  event.preventDefault();

  state.query = $("#searchInput").value;

  state.category = $("#categoryFilter").value;

  state.location = $("#locationFilter").value;

  renderListings();

  $("#marketplace").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
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


/* =====================================================
   7. LISTING CREATION AND EDITING
   ===================================================== */

function openListingForm(item = null) {
  if (!state.user) {
    openAuth("signin");

    $("#authMessage").textContent =
      "Sign in or create an account before publishing a product.";

    return;
  }

  const form = $("#listingForm");

  form.reset();

  $("#formMessage").textContent = "";

  state.editingId = item ? item.id : null;

  $("#listingDialogTitle").textContent = item
    ? "Edit your listing"
    : "Create a product listing";

  $("#saveListingButton").textContent = item
    ? "Save changes"
    : "Publish listing";

  if (item) {
    form.elements.title.value = item.title || "";

    form.elements.category.value = item.category || "";

    form.elements.price.value = item.price ?? "";

    form.elements.quantity.value = item.quantity || "";

    form.elements.unit.value = item.unit || "";

    form.elements.state.value = item.state || "";

    form.elements.town.value = item.town || "";

    form.elements.seller.value = item.seller || "";

    form.elements.phone.value = item.phone || "";

    form.elements.description.value = item.description || "";
  } else {
    form.elements.seller.value =
      state.user.displayName || "";
  }

  openDialog("listingDialog");
}


async function saveListing(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) return;

  if (!state.user) {
    closeDialog("listingDialog");

    openAuth("signin");

    return;
  }

  const data = new FormData(form);

  const title = String(data.get("title") || "").trim();

  const category = String(data.get("category") || "").trim();

  const price = Number(data.get("price"));

  const quantity = String(data.get("quantity") || "").trim();

  const unit = String(data.get("unit") || "").trim();

  const stateName = String(data.get("state") || "").trim();

  const town = String(data.get("town") || "").trim();

  const seller = String(data.get("seller") || "").trim();

  const phone = normalisePhone(data.get("phone"));

  const description = String(data.get("description") || "").trim();

  if (title.length < 3 || title.length > 100) {
    $("#formMessage").textContent =
      "The product title must contain between 3 and 100 characters.";

    return;
  }

  if (!Object.prototype.hasOwnProperty.call(CATEGORY_ART, category)) {
    $("#formMessage").textContent =
      "Choose a valid product category.";

    return;
  }

  if (!Number.isFinite(price) || price <= 0 || price > 100000000) {
    $("#formMessage").textContent =
      "Enter a valid price greater than zero.";

    return;
  }

  if (phone.length < 10 || phone.length > 15) {
    $("#formMessage").textContent =
      "Enter a valid WhatsApp number using digits and the country code, if possible. For Nigeria, use 234 followed by your number.";

    return;
  }

  if (
    quantity.length > 80 ||
    unit.length > 40 ||
    stateName.length > 50 ||
    town.length > 80 ||
    seller.length < 2 ||
    seller.length > 100 ||
    description.length > 1000
  ) {
    $("#formMessage").textContent =
      "One or more fields are too long or incomplete.";

    return;
  }

  const categoryStyle = getCategoryStyle(category);

  const listingData = {
    ownerId: state.user.uid,

    title,

    category,

    price,

    quantity,

    unit,

    state: stateName,

    town,

    seller,

    phone,

    description,

    emoji: categoryStyle.emoji,

    art: categoryStyle.art,

    status: "active",

    updatedAt: serverTimestamp()
  };

  const button = $("#saveListingButton");

  button.disabled = true;

  button.textContent = state.editingId
    ? "Saving changes…"
    : "Publishing…";

  $("#formMessage").textContent = "";

  try {
    if (state.editingId) {
      const existing = state.listings.find(
        item => item.id === state.editingId
      );

      if (!existing || existing.ownerId !== state.user.uid) {
        throw new Error(
          "You can only edit your own published listings."
        );
      }

      await updateDoc(
        doc(db, "products", state.editingId),
        listingData
      );

      showToast("Your listing has been updated.");

    } else {
      listingData.createdAt = serverTimestamp();

      await addDoc(
        collection(db, "products"),
        listingData
      );

      showToast("Your product has been published.");
    }

    closeDialog("listingDialog");

    state.query = "";

    state.category = "";

    state.location = "";

    $("#searchInput").value = "";

    $("#categoryFilter").value = "";

    $("#locationFilter").value = "";

    renderListings();

    $("#marketplace").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("Listing save error:", error);

    $("#formMessage").textContent = getErrorMessage(error);

  } finally {
    button.disabled = false;

    button.textContent = state.editingId
      ? "Save changes"
      : "Publish listing";
  }
}


$("#listingForm").addEventListener("submit", saveListing);


$("#sellHeaderButton").addEventListener("click", () => {
  openListingForm();
});


$("#heroSellButton").addEventListener("click", () => {
  openListingForm();
});


$("#sellBannerButton").addEventListener("click", () => {
  openListingForm();
});


$("#accountListButton").addEventListener("click", () => {
  closeDialog("authDialog");

  openListingForm();
});


/* =====================================================
   8. DELETE LISTINGS
   ===================================================== */

async function deleteListing(id) {
  if (!state.user) {
    openAuth("signin");

    return;
  }

  const item = state.listings.find(listing => listing.id === id);

  if (!item || item.ownerId !== state.user.uid) {
    showToast("You can only delete your own listings.");

    return;
  }

  const confirmed = window.confirm(
    `Delete "${item.title}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "products", id));

    showToast("Your listing has been deleted.");

  } catch (error) {
    console.error("Listing deletion error:", error);

    showToast(getErrorMessage(error));
  }
}


/* =====================================================
   9. WHATSAPP CONTACT
   ===================================================== */

function contactSeller(id) {
  const item = state.listings.find(listing => listing.id === id);

  if (!item) {
    showToast("This listing is no longer available.");

    return;
  }

  const phone = normalisePhone(item.phone);

  if (phone.length < 10 || phone.length > 15) {
    showToast("This listing does not have a valid contact number.");

    return;
  }

  const message =
    `Hello ${item.seller || "seller"}, ` +
    `I found your "${item.title}" listing on PoultryLink. ` +
    `Is it still available? Please confirm the price, quantity, ` +
    `and delivery or pickup details.`;

  const whatsappURL =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(
    whatsappURL,
    "_blank",
    "noopener,noreferrer"
  );
}


/* =====================================================
   10. LISTING DETAILS
   ===================================================== */

function showDetails(id) {
  const item = state.listings.find(listing => listing.id === id);

  if (!item) return;

  const style = getCategoryStyle(item.category);

  const location = getLocation(item);

  const isOwner = Boolean(
    state.user &&
    item.ownerId === state.user.uid
  );

  $("#detailContent").innerHTML = `
    <div class="modal-header">

      <div>
        <span class="section-kicker">LISTING DETAILS</span>

        <p>Review the offer before contacting the seller.</p>
      </div>

      <button
        type="button"
        class="modal-close"
        data-close="detailDialog"
        aria-label="Close"
      >×</button>

    </div>

    <div class="detail-hero">

      <div class="listing-art ${escapeHTML(style.art)}">

        <span class="art-emoji">
          ${escapeHTML(item.emoji || style.emoji)}
        </span>

      </div>

      <div>

        <h2>${escapeHTML(item.title)}</h2>

        <span class="category-label">
          ${escapeHTML(item.category)}
        </span>

        <div class="listing-price">
          ${formatNaira(item.price)}

          <small>
            / ${escapeHTML(item.unit || "unit")}
          </small>
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
        <strong>Published</strong>
      </div>

    </div>

    <p class="detail-copy">
      <strong>Safety reminder:</strong>
      Confirm current stock, quality, final price, transport and payment
      arrangements directly with the seller.
    </p>

    <button
      type="button"
      class="btn btn-primary full-button"
      data-contact="${escapeHTML(item.id)}"
    >
      Contact seller on WhatsApp ↗
    </button>

    ${
      isOwner
        ? `
          <button
            type="button"
            class="btn btn-outline full-button"
            data-edit="${escapeHTML(item.id)}"
            style="margin-top:10px"
          >
            Edit your listing
          </button>
        `
        : ""
    }
  `;

  openDialog("detailDialog");
}


/* =====================================================
   11. LIVE FIRESTORE LISTINGS
   ===================================================== */

function startListingsListener() {
  if (state.unsubscribeListings) {
    state.unsubscribeListings();

    state.unsubscribeListings = null;
  }

  state.loading = true;

  state.firebaseError = false;

  renderListings();

  const activeListingsQuery = query(
    collection(db, "products"),
    where("status", "==", "active")
  );

  state.unsubscribeListings = onSnapshot(
    activeListingsQuery,

    snapshot => {
      state.listings = snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }));

      state.loading = false;

      state.firebaseError = false;

      renderListings();
    },

    error => {
      console.error("Firestore listings error:", error);

      state.loading = false;

      state.firebaseError = true;

      state.listings = [];

      renderListings();

      showToast(
        "Could not load listings. Check Firestore security rules."
      );
    }
  );
}


/* =====================================================
   12. AUTHENTICATION STATE
   ===================================================== */

onAuthStateChanged(
  auth,

  async user => {
    state.user = user;

    updateAuthInterface();

    renderListings();

    if (user) {
      try {
        await saveSellerProfile(user);
      } catch (error) {
        /*
          The marketplace does not depend on the profile write
          to allow public browsing. Seller profile permissions
          can be checked separately if this operation fails.
        */
        console.warn(
          "Seller profile could not be refreshed:",
          error
        );
      }
    }
  },

  error => {
    console.error("Authentication state error:", error);

    showToast(getErrorMessage(error));
  }
);


/* =====================================================
   13. BUTTON AND DIALOG EVENTS
   ===================================================== */

$("#menuButton").addEventListener("click", () => {
  const nav = $("#desktopNav");

  const open = nav.classList.toggle("open");

  $("#menuButton").setAttribute(
    "aria-expanded",
    String(open)
  );

  $("#menuButton").textContent = open ? "×" : "☰";
});


$$("#desktopNav a").forEach(link => {
  link.addEventListener("click", () => {
    $("#desktopNav").classList.remove("open");

    $("#menuButton").setAttribute(
      "aria-expanded",
      "false"
    );

    $("#menuButton").textContent = "☰";
  });
});


document.addEventListener("click", event => {
  const closeButton = event.target.closest("[data-close]");

  if (closeButton) {
    closeDialog(closeButton.dataset.close);

    return;
  }

  const detailButton = event.target.closest("[data-detail]");

  if (detailButton) {
    showDetails(detailButton.dataset.detail);

    return;
  }

  const contactButton = event.target.closest("[data-contact]");

  if (contactButton) {
    contactSeller(contactButton.dataset.contact);

    return;
  }

  const editButton = event.target.closest("[data-edit]");

  if (editButton) {
    const item = state.listings.find(
      listing => listing.id === editButton.dataset.edit
    );

    if (!item) {
      showToast("This listing is no longer available.");

      return;
    }

    if (!state.user || item.ownerId !== state.user.uid) {
      showToast("You can only edit your own listings.");

      return;
    }

    closeDialog("detailDialog");

    openListingForm(item);

    return;
  }

  const deleteButton = event.target.closest("[data-delete]");

  if (deleteButton) {
    deleteListing(deleteButton.dataset.delete);
  }
});


$$("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });
});


/* =====================================================
   14. START APPLICATION
   ===================================================== */

$("#year").textContent = new Date().getFullYear();

updateAuthInterface();

startListingsListener();

renderListings();