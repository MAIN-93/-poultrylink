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
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


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


/* =========================================
   INITIALIZE FIREBASE
========================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================
   ADMIN SETTINGS
========================================= */

const ADMIN_EMAIL = "ajmaine93@gmail.com";


function isAdmin(user = state.user) {

  return Boolean(
    user &&
    user.email &&
    user.email.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase()
  );

}


/* =========================================
   HELPERS
========================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];


function escapeHTML(value) {

  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );

}


function formatNaira(value) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Price on request";
  }

  return "₦" + new Intl.NumberFormat(
    "en-NG",
    {
      maximumFractionDigits: 0
    }
  ).format(number);

}


function normalisePhone(phone) {

  let number = String(phone || "")
    .replace(/[^\d]/g, "");


  if (
    number.startsWith("0") &&
    number.length === 11
  ) {

    number = "234" + number.slice(1);

  }


  return number;

}


function initials(name) {

  return String(name || "P")
    .trim()
    .charAt(0)
    .toUpperCase() || "P";

}


function openDialog(id) {

  const dialog =
    document.getElementById(id);

  if (!dialog) return;

  if (!dialog.open) {
    dialog.showModal();
  }

}


function closeDialog(dialog) {

  if (!dialog) return;

  if (dialog.open) {
    dialog.close();
  }

}


/* =========================================
   TOAST
========================================= */

const toast = $("#toast");

let toastTimer;


function showToast(message) {

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {

    toast.classList.remove("show");

  }, 3500);

}


/* =========================================
   CATEGORY SETTINGS
========================================= */

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


function categoryEmoji(category) {

  return (
    categoryInfo[category] ||
    categoryInfo.Equipment
  ).emoji;

}


function categoryClass(category) {

  return (
    categoryInfo[category] ||
    categoryInfo.Equipment
  ).art;

}


/* =========================================
   APPLICATION STATE
========================================= */

const state = {

  query: "",

  category: "",

  location: "",

  sort: "newest",

  listings: [],

  cart: [],

  user: null,

  profile: null,

  authMode: "signin",

  editingId: null

};


const grid = $("#listingGrid");


/* =========================================
   CART STORAGE
========================================= */

function cartStorageKey() {

  if (state.user) {
    return `poultrylink_cart_${state.user.uid}`;
  }

  return "poultrylink_cart_guest";

}


function loadCart() {

  try {

    const saved =
      localStorage.getItem(
        cartStorageKey()
      );

    state.cart =
      saved
        ? JSON.parse(saved)
        : [];

  } catch {

    state.cart = [];

  }

}


function saveCart() {

  localStorage.setItem(
    cartStorageKey(),
    JSON.stringify(state.cart)
  );

}


function updateCartCount() {

  const count =
    state.cart.length;


  $("#cartCount").textContent =
    count;

}


function getCartTotal() {

  return state.cart.reduce(
    (total, item) =>
      total + Number(item.price || 0),
    0
  );

}


/* =========================================
   SEARCH AND FILTERS
========================================= */

function getVisibleListings() {

  const search =
    state.query.trim().toLowerCase();


  let results =
    state.listings.filter(item => {

      const searchable = [

        item.title,
        item.category,
        item.description,
        item.seller,
        item.town,
        item.state,
        item.quantity

      ]
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        !search ||
        searchable.includes(search);


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

    results.sort(
      (a, b) =>
        Number(a.price) -
        Number(b.price)
    );

  } else if (state.sort === "price-high") {

    results.sort(
      (a, b) =>
        Number(b.price) -
        Number(a.price)
    );

  } else {

    results.sort(
      (a, b) =>
        Number(b.createdMillis || 0) -
        Number(a.createdMillis || 0)
    );

  }


  return results;

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


/* =========================================
   LISTING CARD
========================================= */

function cardTemplate(item) {

  const owned =
    state.user &&
    item.ownerId === state.user.uid;


  const admin =
    isAdmin();


  const canManage =
    owned || admin;


  const inCart =
    state.cart.some(
      cartItem =>
        cartItem.id === item.id
    );


  const location = [

    item.town,
    item.state

  ]
    .filter(Boolean)
    .join(", ");


  return `

    <article class="listing-card">

      <div class="listing-art ${categoryClass(item.category)}">

        <span class="listing-tag">

          ${
            owned
              ? "YOUR LISTING"
              : "SELLER LISTING"
          }

        </span>

        <span class="art-emoji">

          ${escapeHTML(
            item.emoji ||
            categoryEmoji(item.category)
          )}

        </span>

      </div>


      <div class="listing-body">

        <div class="listing-meta">

          <span class="category-label">

            ${escapeHTML(item.category)}

          </span>

          <span>

            ⌖ ${escapeHTML(
              location ||
              "Location not set"
            )}

          </span>

        </div>


        <h3>

          ${escapeHTML(item.title)}

        </h3>


        <p class="listing-description">

          ${escapeHTML(
            item.description ||
            "Contact the seller for more details."
          )}

        </p>


        <div class="listing-price">

          ${formatNaira(item.price)}

          <small>

            / ${escapeHTML(
              item.unit ||
              "unit"
            )}

          </small>

        </div>


        <div class="listing-details">

          <span>

            Available:

            <strong>

              ${escapeHTML(
                item.quantity ||
                "Ask seller"
              )}

            </strong>

          </span>

        </div>


        <div class="seller-line">

          <span class="seller-avatar">

            ${escapeHTML(
              initials(item.seller)
            )}

          </span>

          <span>

            Listed by

            <strong>

              ${escapeHTML(
                item.seller ||
                "Poultry seller"
              )}

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

        </div>


        <div class="card-actions">

          <button
            class="btn ${
              inCart
                ? "btn-outline"
                : "btn-primary"
            }"
            type="button"
            data-cart="${escapeHTML(item.id)}"
          >

            ${
              inCart
                ? "Remove from cart"
                : "Add to cart"
            }

          </button>

        </div>


        ${
          canManage
            ? `

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

        `
            : ""
        }

      </div>

    </article>

  `;

}


/* =========================================
   RENDER LISTINGS
========================================= */

function renderListings() {

  const results =
    getVisibleListings();


  grid.innerHTML =
    results.map(cardTemplate).join("");


  $("#resultsCount").textContent =
    `${results.length} ${
      results.length === 1
        ? "listing"
        : "listings"
    }`;


  $("#emptyState").classList.toggle(
    "hidden",
    results.length > 0
  );


  grid.classList.toggle(
    "hidden",
    results.length === 0
  );


  $$("#categoryChips .chip")
    .forEach(chip => {

      chip.classList.toggle(
        "active",
        chip.dataset.category ===
        state.category
      );

    });

}


/* =========================================
   LOAD LISTINGS
========================================= */

async function loadListings() {

  $("#resultsCount").textContent =
    "Loading listings…";


  try {

    const listingsQuery =
      query(
        collection(db, "products"),
        where("status", "==", "active")
      );


    const snapshot =
      await getDocs(listingsQuery);


    state.listings =
      snapshot.docs.map(snapshot => {

        const data =
          snapshot.data();


        return {

          ...data,

          id: snapshot.id,

          createdMillis:
            data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : Number(
                  data.createdMillis || 0
                )

        };

      });


    renderListings();


  } catch (error) {

    console.error(error);


    $("#resultsCount").textContent =
      "Marketplace could not load";


    showToast(
      "Could not load marketplace."
    );

  }

}


/* =========================================
   USER PROFILE
========================================= */

async function loadProfile(user) {

  if (!user) {

    state.profile = null;

    return;

  }


  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "sellers",
          user.uid
        )
      );


    if (snapshot.exists()) {

      state.profile =
        snapshot.data();

    } else {

      state.profile = {

        displayName:
          user.displayName || "",

        email:
          user.email || "",

        sellerStatus:
          "none"

      };

    }

  } catch (error) {

    console.error(error);

  }

}


/* =========================================
   AUTH USER INTERFACE
========================================= */

function setAuthUI(user) {

  const button =
    $("#signInButton");


  if (!button) return;


  if (user) {

    const name =

      state.profile?.displayName ||

      user.displayName ||

      user.email;


    button.textContent =
      isAdmin(user)

        ? "Admin"

        : (
            name.length > 18
              ? name.slice(0, 17) + "…"
              : name
          );


  } else {

    button.textContent =
      "Sign in";

  }

}


/* =========================================
   AUTHENTICATION
========================================= */

function openAuth(mode = "signin") {

  state.authMode = mode;

  $("#authForm").reset();

  $("#authMessage").textContent = "";

  updateAuthModeUI();

  openDialog("authDialog");

}


function updateAuthModeUI() {

  const creating =
    state.authMode === "signup";


  $("#authTitle").textContent =
    creating
      ? "Create your account"
      : "Welcome to PoultryLink";


  $("#authSubtitle").textContent =
    creating
      ? "Create an account to buy and sell."
      : "Sign in to your account.";


  $("#authNameWrap").classList.toggle(
    "hidden",
    !creating
  );


  $("#authName").required =
    creating;


  $("#authModeButton").textContent =
    creating
      ? "I already have an account"
      : "Create account";


  $("#authSubmitButton").textContent =
    creating
      ? "Create account"
      : "Sign in";


  $("#authPassword").autocomplete =
    creating
      ? "new-password"
      : "current-password";

}


function friendlyAuthError(error) {

  const messages = {

    "auth/email-already-in-use":
      "An account already exists with this email.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/weak-password":
      "Use at least 6 characters for your password.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/network-request-failed":
      "Check your internet connection."

  };


  return (
    messages[error?.code] ||
    "Authentication failed. Please try again."
  );

}


async function handleAuthSubmit(event) {

  event.preventDefault();


  const email =
    $("#authEmail").value.trim();


  const password =
    $("#authPassword").value;


  const name =
    $("#authName").value.trim();


  $("#authSubmitButton").disabled =
    true;


  $("#authMessage").textContent =
    "Please wait…";


  try {

    if (
      state.authMode === "signup"
    ) {

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      await updateProfile(
        credential.user,
        {
          displayName: name
        }
      );


      await setDoc(
        doc(
          db,
          "sellers",
          credential.user.uid
        ),
        {

          displayName: name,

          email:
            credential.user.email,

          sellerStatus: "none",

          createdAt:
            serverTimestamp()

        }
      );


      showToast(
        "Account created successfully."
      );


    } else {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


      showToast(
        "Signed in successfully."
      );

    }


    closeDialog(
      $("#authDialog")
    );


  } catch (error) {

    console.error(error);

    $("#authMessage").textContent =
      friendlyAuthError(error);

  } finally {

    $("#authSubmitButton").disabled =
      false;

  }

}


/* =========================================
   CART
========================================= */

function toggleCart(id) {

  const item =
    state.listings.find(
      listing =>
        listing.id === id
    );


  if (!item) return;


  const index =
    state.cart.findIndex(
      cartItem =>
        cartItem.id === id
    );


  if (index >= 0) {

    state.cart.splice(index, 1);

    showToast(
      "Removed from cart."
    );

  } else {

    state.cart.push(item);

    showToast(
      "Added to cart."
    );

  }


  saveCart();

  updateCartCount();

  renderListings();

}


function renderCart() {

  const container =
    $("#cartItems");


  const empty =
    $("#cartEmpty");


  const summary =
    $("#cartSummary");


  if (!state.cart.length) {

    container.innerHTML = "";

    empty.style.display = "block";

    summary.style.display = "none";

    return;

  }


  empty.style.display = "none";

  summary.style.display = "flex";


  container.innerHTML =
    state.cart.map(item => `

      <div class="cart-item">

        <div>

          <strong>
            ${escapeHTML(item.title)}
          </strong>

          <small>
            ${formatNaira(item.price)}
          </small>

        </div>

        <button
          type="button"
          class="btn btn-outline"
          data-cart="${escapeHTML(item.id)}"
        >
          Remove
        </button>

      </div>

    `).join("");


  $("#cartTotal").textContent =
    formatNaira(
      getCartTotal()
    );

}


function openCart() {

  renderCart();

  openDialog("cartDialog");

}


/* =========================================
   SELLER APPLICATION
========================================= */

function openSellerApplication() {

  if (!state.user) {

    showToast(
      "Please sign in first."
    );

    openAuth("signin");

    return;

  }


  if (
    state.profile?.sellerStatus ===
    "approved"
  ) {

    showToast(
      "You are already an approved seller."
    );

    return;

  }


  $("#sellerApplicationForm").reset();

  $("#sellerApplicationMessage").textContent =
    "";

  openDialog(
    "sellerApplicationDialog"
  );

}


async function submitSellerApplication(event) {

  event.preventDefault();


  if (!state.user) return;


  const application = {

    userId:
      state.user.uid,

    email:
      state.user.email || "",

    displayName:
      state.profile?.displayName ||
      state.user.displayName ||
      "",

    businessName:
      $("#sellerBusinessName").value.trim(),

    state:
      $("#sellerState").value,

    town:
      $("#sellerTown").value.trim(),

    phone:
      normalisePhone(
        $("#sellerPhone").value
      ),

    description:
      $("#sellerDescription").value.trim(),

    status:
      "pending",

    createdAt:
      serverTimestamp(),

    createdMillis:
      Date.now()

  };


  $("#submitSellerApplicationButton").disabled =
    true;


  $("#sellerApplicationMessage").textContent =
    "Submitting application…";


  try {

    await setDoc(
      doc(
        db,
        "sellerApplications",
        state.user.uid
      ),
      application
    );


    await updateDoc(
      doc(
        db,
        "sellers",
        state.user.uid
      ),
      {
        sellerStatus: "pending"
      }
    );


    await loadProfile(
      state.user
    );


    $("#sellerApplicationMessage").textContent =
      "Application submitted successfully.";


    showToast(
      "Seller application submitted."
    );


    setTimeout(() => {

      closeDialog(
        $("#sellerApplicationDialog")
      );

    }, 1000);


  } catch (error) {

    console.error(error);

    $("#sellerApplicationMessage").textContent =
      "Could not submit application.";

  } finally {

    $("#submitSellerApplicationButton").disabled =
      false;

  }

}


/* =========================================
   DASHBOARD
========================================= */

async function openDashboard() {

  if (!state.user) {

    openAuth("signin");

    return;

  }


  if (isAdmin()) {

    openAdminDashboard();

    return;

  }


  $("#dashboardName").textContent =

    state.profile?.displayName ||

    state.user.displayName ||

    "PoultryLink User";


  $("#dashboardEmail").textContent =
    state.user.email || "";


  $("#dashboardAvatar").textContent =
    initials(
      state.profile?.displayName ||
      state.user.displayName
    );


  const sellerStatus =
    state.profile?.sellerStatus ||
    "none";


  $("#dashboardRole").textContent =

    sellerStatus === "approved"
      ? "Verified Seller"

      : sellerStatus === "pending"
        ? "Seller Application Pending"
        : "Buyer";


  const myListings =
    state.listings.filter(
      item =>
        item.ownerId ===
        state.user.uid
    );


  $("#dashboardContent").innerHTML = `

    <div class="dashboard-stat-grid">

      <div class="dashboard-stat">
        <small>MY LISTINGS</small>
        <strong>${myListings.length}</strong>
      </div>

      <div class="dashboard-stat">
        <small>SELLER STATUS</small>
        <strong>
          ${escapeHTML(sellerStatus)}
        </strong>
      </div>

    </div>

    <div class="dashboard-listings">

      <h3>My listings</h3>

      ${
        myListings.length
          ? myListings.map(item => `

            <div class="dashboard-listing">

              <div>

                <strong>
                  ${escapeHTML(item.title)}
                </strong>

                <small>
                  ${formatNaira(item.price)}
                </small>

              </div>

              <button
                class="btn btn-outline"
                type="button"
                data-edit="${escapeHTML(item.id)}"
              >
                Edit
              </button>

            </div>

          `).join("")

          : "<p>You have not created any listings yet.</p>"
      }

    </div>

  `;


  const sellerButton =
    $("#dashboardBecomeSellerButton");


  sellerButton.style.display =
    sellerStatus === "approved"
      ? "none"
      : "inline-flex";


  sellerButton.textContent =

    sellerStatus === "pending"
      ? "Application pending"
      : "Become a seller";


  sellerButton.disabled =
    sellerStatus === "pending";


  openDialog(
    "dashboardDialog"
  );

}


/* =========================================
   LISTING FORM
========================================= */

function canPublish() {

  return Boolean(

    state.user &&

    (
      isAdmin() ||

      state.profile?.sellerStatus ===
      "approved"
    )

  );

}


function openListingForm(item = null) {

  if (!state.user) {

    showToast(
      "Please sign in first."
    );

    openAuth("signin");

    return;

  }


  if (!item && !canPublish()) {

    showToast(
      "You must be an approved seller before publishing products."
    );

    openSellerApplication();

    return;

  }


  const canEdit =
    !item ||

    item.ownerId ===
    state.user.uid ||

    isAdmin();


  if (!canEdit) return;


  state.editingId =
    item?.id || null;


  $("#listingForm").reset();


  $("#editingListingId").value =
    state.editingId || "";


  $("#listingTitle").textContent =
    item
      ? "Edit listing"
      : "List a product";


  $("#saveListingButton").textContent =
    item
      ? "Save changes"
      : "Publish listing";


  $("#listingSeller").value =

    item?.seller ||

    state.profile?.businessName ||

    state.profile?.displayName ||

    "";


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

    $("#listingSeller").value =
      item.seller || "";

    $("#listingPhone").value =
      item.phone || "";

    $("#listingDescription").value =
      item.description || "";

  }


  openDialog("listingDialog");

}


function getFormListing() {

  const data =
    new FormData(
      $("#listingForm")
    );


  const category =
    String(
      data.get("category") || ""
    );


  return {

    title:
      String(
        data.get("title") || ""
      ).trim(),

    category,

    price:
      Number(
        data.get("price")
      ),

    quantity:
      String(
        data.get("quantity") || ""
      ).trim(),

    unit:
      String(
        data.get("unit") ||
        "per unit"
      ),

    state:
      String(
        data.get("state") || ""
      ),

    town:
      String(
        data.get("town") || ""
      ).trim(),

    seller:
      String(
        data.get("seller") || ""
      ).trim(),

    phone:
      normalisePhone(
        data.get("phone")
      ),

    description:
      String(
        data.get("description") || ""
      ).trim(),

    emoji:
      categoryEmoji(category),

    art:
      categoryClass(category),

    status:
      "active"

  };

}


function validateListing(item) {

  if (item.title.length < 3) {
    return "Enter a valid product title.";
  }

  if (!categoryInfo[item.category]) {
    return "Choose a category.";
  }

  if (
    !Number.isFinite(item.price) ||
    item.price < 0
  ) {
    return "Enter a valid price.";
  }

  if (!item.quantity) {
    return "Enter the available quantity.";
  }

  if (!item.state || !item.town) {
    return "Enter your location.";
  }

  if (!item.seller) {
    return "Enter your farm or business name.";
  }

  if (
    item.phone.length < 10 ||
    item.phone.length > 15
  ) {
    return "Enter a valid WhatsApp number.";
  }

  return "";

}


/* =========================================
   SAVE LISTING
========================================= */

async function saveListing(event) {

  event.preventDefault();


  const item =
    getFormListing();


  const validation =
    validateListing(item);


  if (validation) {

    $("#formMessage").textContent =
      validation;

    return;

  }


  $("#saveListingButton").disabled =
    true;


  $("#formMessage").textContent =
    "Saving…";


  try {

    if (state.editingId) {

      await updateDoc(
        doc(
          db,
          "products",
          state.editingId
        ),
        {

          ...item,

          updatedAt:
            serverTimestamp()

        }
      );


      showToast(
        "Listing updated."
      );


    } else {

      if (!canPublish()) {
        throw new Error(
          "Seller approval is required."
        );
      }


      await addDoc(
        collection(
          db,
          "products"
        ),
        {

          ...item,

          ownerId:
            state.user.uid,

          createdAt:
            serverTimestamp(),

          createdMillis:
            Date.now()

        }
      );


      showToast(
        "Listing published."
      );

    }


    closeDialog(
      $("#listingDialog")
    );


    await loadListings();


  } catch (error) {

    console.error(error);

    $("#formMessage").textContent =
      error.message ||
      "Could not save listing.";

  } finally {

    $("#saveListingButton").disabled =
      false;

  }

}


/* =========================================
   DELETE LISTING
========================================= */

async function deleteListing(id) {

  const item =
    state.listings.find(
      listing =>
        listing.id === id
    );


  if (!item || !state.user) return;


  const allowed =

    item.ownerId === state.user.uid ||

    isAdmin();


  if (!allowed) {

    showToast(
      "You cannot delete this listing."
    );

    return;

  }


  if (
    !confirm(
      `Delete "${item.title}"?`
    )
  ) return;


  try {

    await deleteDoc(
      doc(
        db,
        "products",
        id
      )
    );


    showToast(
      "Listing deleted."
    );


    await loadListings();


  } catch (error) {

    console.error(error);

    showToast(
      "Could not delete listing."
    );

  }

}


/* =========================================
   WHATSAPP
========================================= */

function contactSeller(id) {

  const item =
    state.listings.find(
      listing =>
        listing.id === id
    );


  if (!item) return;


  const phone =
    normalisePhone(item.phone);


  if (!phone) {

    showToast(
      "No valid WhatsApp number."
    );

    return;

  }


  const message =

    `Hello ${item.seller || "seller"}, ` +

    `I found your "${item.title}" listing on PoultryLink. ` +

    `Is it still available?`;


  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );

}


/* =========================================
   LISTING DETAILS
========================================= */

function showDetails(id) {

  const item =
    state.listings.find(
      listing =>
        listing.id === id
    );


  if (!item) return;


  const location = [

    item.town,
    item.state

  ]
    .filter(Boolean)
    .join(", ");


  $("#detailContent").innerHTML = `

    <div class="modal-header">

      <div>

        <span class="section-kicker">
          LISTING DETAILS
        </span>

        <h2 id="detailHeading">
          ${escapeHTML(item.title)}
        </h2>

      </div>

      <button
        class="modal-close"
        type="button"
        data-close="detailDialog"
      >
        ×
      </button>

    </div>


    <div class="detail-hero">

      <div class="listing-art ${categoryClass(item.category)}">

        <span class="art-emoji">
          ${categoryEmoji(item.category)}
        </span>

      </div>


      <div>

        <span class="category-label">
          ${escapeHTML(item.category)}
        </span>

        <div class="listing-price">
          ${formatNaira(item.price)}
        </div>

      </div>

    </div>


    <p class="detail-copy">

      ${escapeHTML(
        item.description ||
        "Contact the seller for more information."
      )}

    </p>


    <div class="detail-facts">

      <div class="detail-fact">
        <small>QUANTITY</small>
        <strong>
          ${escapeHTML(item.quantity)}
        </strong>
      </div>

      <div class="detail-fact">
        <small>LOCATION</small>
        <strong>
          ${escapeHTML(location)}
        </strong>
      </div>

      <div class="detail-fact">
        <small>SELLER</small>
        <strong>
          ${escapeHTML(item.seller)}
        </strong>
      </div>

    </div>


    <button
      class="btn btn-primary full-button"
      type="button"
      data-contact="${escapeHTML(item.id)}"
    >
      Contact seller on WhatsApp ↗
    </button>

  `;


  openDialog("detailDialog");

}


/* =========================================
   ADMIN DASHBOARD
========================================= */

async function openAdminDashboard() {

  if (!isAdmin()) return;


  openDialog("adminDialog");

  await loadAdminData();

}


async function loadAdminData() {

  if (!isAdmin()) return;


  try {

    const applicationsSnapshot =
      await getDocs(
        collection(
          db,
          "sellerApplications"
        )
      );


    const usersSnapshot =
      await getDocs(
        collection(
          db,
          "sellers"
        )
      );


    const productsSnapshot =
      await getDocs(
        collection(
          db,
          "products"
        )
      );


    const applications =
      applicationsSnapshot.docs
        .map(snapshot => ({
          ...snapshot.data(),
          id: snapshot.id
        }))
        .filter(
          application =>
            application.status ===
            "pending"
        );


    $("#pendingSellerCount").textContent =
      applications.length;


    $("#totalUserCount").textContent =
      usersSnapshot.size;


    $("#adminListingCount").textContent =
      productsSnapshot.docs.filter(
        product =>
          product.data().status ===
          "active"
      ).length;


    renderAdminApplications(
      applications
    );


  } catch (error) {

    console.error(error);

    showToast(
      "Could not load admin data."
    );

  }

}


function renderAdminApplications(applications) {

  const container =
    $("#adminApplications");


  const empty =
    $("#adminApplicationsEmpty");


  if (!applications.length) {

    container.innerHTML = "";

    empty.style.display = "block";

    return;

  }


  empty.style.display = "none";


  container.innerHTML =
    applications.map(application => `

      <article class="admin-application">

        <div>

          <strong>
            ${escapeHTML(application.businessName)}
          </strong>

          <p>
            ${escapeHTML(application.displayName)}
          </p>

          <p>
            ${escapeHTML(application.town)},
            ${escapeHTML(application.state)}
          </p>

          <p>
            ${escapeHTML(application.phone)}
          </p>

          <p>
            ${escapeHTML(application.description)}
          </p>

        </div>


        <div class="card-actions">

          <button
            class="btn btn-primary"
            type="button"
            data-approve="${escapeHTML(application.id)}"
          >
            Approve
          </button>


          <button
            class="btn btn-outline"
            type="button"
            data-reject="${escapeHTML(application.id)}"
          >
            Reject
          </button>

        </div>

      </article>

    `).join("");

}


async function approveSeller(userId) {

  if (!isAdmin()) return;


  try {

    const applicationRef =
      doc(
        db,
        "sellerApplications",
        userId
      );


    const application =
      await getDoc(applicationRef);


    if (!application.exists()) return;


    const data =
      application.data();


    await updateDoc(
      applicationRef,
      {
        status: "approved",
        reviewedAt:
          serverTimestamp(),
        reviewedBy:
          state.user.uid
      }
    );


    await updateDoc(
      doc(
        db,
        "sellers",
        userId
      ),
      {
        sellerStatus: "approved",
        businessName:
          data.businessName,
        businessState:
          data.state,
        businessTown:
          data.town,
        phone:
          data.phone
      }
    );


    showToast(
      "Seller approved successfully."
    );


    await loadAdminData();


  } catch (error) {

    console.error(error);

    showToast(
      "Could not approve seller."
    );

  }

}


async function rejectSeller(userId) {

  if (!isAdmin()) return;


  if (
    !confirm(
      "Reject this seller application?"
    )
  ) return;


  try {

    await updateDoc(
      doc(
        db,
        "sellerApplications",
        userId
      ),
      {
        status: "rejected",
        reviewedAt:
          serverTimestamp(),
        reviewedBy:
          state.user.uid
      }
    );


    await updateDoc(
      doc(
        db,
        "sellers",
        userId
      ),
      {
        sellerStatus: "rejected"
      }
    );


    showToast(
      "Seller application rejected."
    );


    await loadAdminData();


  } catch (error) {

    console.error(error);

  }

}


/* =========================================
   SEARCH EVENTS
========================================= */

$("#searchForm")?.addEventListener(
  "submit",
  event => {

    event.preventDefault();


    state.query =
      $("#searchInput").value;


    state.category =
      $("#categoryFilter").value;


    state.location =
      $("#locationFilter").value;


    renderListings();


    $("#marketplace")?.scrollIntoView({
      behavior: "smooth"
    });

  }
);


$("#categoryChips")?.addEventListener(
  "click",
  event => {

    const chip =
      event.target.closest(
        "[data-category]"
      );


    if (!chip) return;


    state.category =
      chip.dataset.category;


    $("#categoryFilter").value =
      state.category;


    renderListings();

  }
);


$("#sortSelect")?.addEventListener(
  "change",
  event => {

    state.sort =
      event.target.value;

    renderListings();

  }
);


$("#clearFiltersButton")?.addEventListener(
  "click",
  resetFilters
);


$("#emptyClearButton")?.addEventListener(
  "click",
  resetFilters
);


/* =========================================
   MAIN BUTTON EVENTS
========================================= */

[
  "sellHeaderButton",
  "heroSellButton",
  "sellBannerButton"
].forEach(id => {

  document
    .getElementById(id)
    ?.addEventListener(
      "click",
      () => openListingForm()
    );

});


$("#cartButton")?.addEventListener(
  "click",
  openCart
);


$("#signInButton")?.addEventListener(
  "click",
  () => {

    if (state.user) {

      if (isAdmin()) {
        openAdminDashboard();
      } else {
        openDashboard();
      }

    } else {

      openAuth("signin");

    }

  }
);


$("#authModeButton")?.addEventListener(
  "click",
  () => {

    state.authMode =
      state.authMode === "signin"
        ? "signup"
        : "signin";


    updateAuthModeUI();

  }
);


$("#authForm")?.addEventListener(
  "submit",
  handleAuthSubmit
);


$("#listingForm")?.addEventListener(
  "submit",
  saveListing
);


$("#sellerApplicationForm")?.addEventListener(
  "submit",
  submitSellerApplication
);


$("#dashboardBecomeSellerButton")?.addEventListener(
  "click",
  openSellerApplication
);


$("#dashboardSignOutButton")?.addEventListener(
  "click",
  async () => {

    await signOut(auth);

    closeDialog(
      $("#dashboardDialog")
    );

    showToast(
      "Signed out."
    );

  }
);


$("#refreshAdminButton")?.addEventListener(
  "click",
  loadAdminData
);


/* =========================================
   CART CONTACT SELLERS
========================================= */

$("#cartContactButton")?.addEventListener(
  "click",
  () => {

    if (!state.cart.length) return;


    const firstItem =
      state.cart[0];


    contactSeller(
      firstItem.id
    );

  }
);


/* =========================================
   MOBILE MENU
========================================= */

$("#menuButton")?.addEventListener(
  "click",
  () => {

    const nav =
      $("#desktopNav");


    const open =
      nav.classList.toggle("open");


    $("#menuButton").setAttribute(
      "aria-expanded",
      String(open)
    );


    $("#menuButton").textContent =
      open
        ? "×"
        : "☰";

  }
);


/* =========================================
   DYNAMIC BUTTON EVENTS
========================================= */

document.addEventListener(
  "click",
  event => {

    const closeButton =
      event.target.closest(
        "[data-close]"
      );


    if (closeButton) {

      closeDialog(
        document.getElementById(
          closeButton.dataset.close
        )
      );

    }


    const detailButton =
      event.target.closest(
        "[data-detail]"
      );


    if (detailButton) {

      showDetails(
        detailButton.dataset.detail
      );

    }


    const contactButton =
      event.target.closest(
        "[data-contact]"
      );


    if (contactButton) {

      contactSeller(
        contactButton.dataset.contact
      );

    }


    const cartButton =
      event.target.closest(
        "[data-cart]"
      );


    if (cartButton) {

      toggleCart(
        cartButton.dataset.cart
      );

      renderCart();

    }


    const editButton =
      event.target.closest(
        "[data-edit]"
      );


    if (editButton) {

      const item =
        state.listings.find(
          listing =>
            listing.id ===
            editButton.dataset.edit
        );


      if (item) {

        openListingForm(item);

      }

    }


    const deleteButton =
      event.target.closest(
        "[data-delete]"
      );


    if (deleteButton) {

      deleteListing(
        deleteButton.dataset.delete
      );

    }


    const approveButton =
      event.target.closest(
        "[data-approve]"
      );


    if (approveButton) {

      approveSeller(
        approveButton.dataset.approve
      );

    }


    const rejectButton =
      event.target.closest(
        "[data-reject]"
      );


    if (rejectButton) {

      rejectSeller(
        rejectButton.dataset.reject
      );

    }

  }
);


/* =========================================
   CLOSE DIALOG BACKGROUND
========================================= */

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


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(
  auth,
  async user => {

    state.user = user;


    if (user) {

      await loadProfile(user);

    } else {

      state.profile = null;

    }


    loadCart();

    updateCartCount();

    setAuthUI(user);

    renderListings();

  }
);


/* =========================================
   START APPLICATION
========================================= */

const yearElement =
  $("#year");


if (yearElement) {

  yearElement.textContent =
    new Date().getFullYear();

}


updateAuthModeUI();

loadCart();

updateCartCount();

loadListings();