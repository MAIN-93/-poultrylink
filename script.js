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
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  setDoc
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
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}


/* =========================================
   HELPERS
========================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];


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
const toast = $("#toast");

let toastTimer;


/* =========================================
   CATEGORY INFORMATION
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


/* =========================================
   GENERAL FUNCTIONS
========================================= */

function escapeHTML(value) {

  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]
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

  return String(phone || "")
    .replace(/[^\d]/g, "");

}


function showToast(message) {

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);

}


function openDialog(id) {

  const dialog =
    document.getElementById(id);

  if (!dialog) return;

  if (dialog.open) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }

}


function closeDialog(dialog) {

  if (!dialog) return;

  if (dialog.open && typeof dialog.close === "function") {
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

  return (
    categoryInfo[category] ||
    categoryInfo.Equipment
  ).art;

}


function categoryEmoji(category) {

  return (
    categoryInfo[category] ||
    categoryInfo.Equipment
  ).emoji;

}


/* =========================================
   CART STORAGE
========================================= */

function loadCart() {

  try {

    const saved =
      localStorage.getItem("poultrylink-cart");

    state.cart =
      saved
        ? JSON.parse(saved)
        : [];

  } catch (error) {

    state.cart = [];

  }

}


function saveCart() {

  localStorage.setItem(
    "poultrylink-cart",
    JSON.stringify(state.cart)
  );

}


function updateCartCount() {

  const count =
    $("#cartCount");

  if (!count) return;

  count.textContent =
    state.cart.length;

}


/* =========================================
   ADD TO CART
========================================= */

function addToCart(id) {

  const item =
    state.listings.find(
      listing => listing.id === id
    );

  if (!item) return;


  const alreadyAdded =
    state.cart.some(
      product => product.id === id
    );


  if (alreadyAdded) {

    showToast(
      "This product is already in your cart."
    );

    return;

  }


  state.cart.push(item);

  saveCart();

  updateCartCount();

  showToast(
    "Product added to your cart."
  );

}


/* =========================================
   REMOVE FROM CART
========================================= */

function removeFromCart(id) {

  state.cart =
    state.cart.filter(
      item => item.id !== id
    );

  saveCart();

  updateCartCount();

  renderCart();

}


/* =========================================
   RENDER CART
========================================= */

function renderCart() {

  const cartItems =
    $("#cartItems");

  const cartEmpty =
    $("#cartEmpty");

  const cartSummary =
    $("#cartSummary");

  if (!cartItems) return;


  if (!state.cart.length) {

    cartItems.innerHTML = "";

    cartEmpty?.classList.remove("hidden");

    cartSummary?.classList.add("hidden");

    return;

  }


  cartEmpty?.classList.add("hidden");

  cartSummary?.classList.remove("hidden");


  cartItems.innerHTML =
    state.cart.map(item => `

      <div class="cart-item">

        <div>

          <strong>
            ${escapeHTML(item.title)}
          </strong>

          <p>
            ${formatNaira(item.price)}
            / ${escapeHTML(item.unit || "unit")}
          </p>

          <small>
            ${escapeHTML(
              item.seller || "Poultry seller"
            )}
          </small>

        </div>

        <button
          class="text-button"
          type="button"
          data-remove-cart="${escapeHTML(item.id)}"
        >
          Remove
        </button>

      </div>

    `).join("");


  const total =
    state.cart.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0),
      0
    );


  $("#cartTotal").textContent =
    formatNaira(total);

}


/* =========================================
   OPEN CART
========================================= */

$("#cartButton")?.addEventListener(
  "click",
  () => {

    renderCart();

    openDialog("cartDialog");

  }
);


/* =========================================
   CONTACT SELLERS FROM CART
========================================= */

$("#cartContactButton")?.addEventListener(
  "click",
  () => {

    if (!state.cart.length) {

      showToast(
        "Your cart is empty."
      );

      return;

    }


    const sellers =
      [...new Set(
        state.cart
          .map(item => item.seller)
          .filter(Boolean)
      )];


    showToast(
      `Your cart contains products from ${sellers.length} seller(s). Open each product and contact the seller.`
    );

  }
);


/* =========================================
   SEARCH AND LISTINGS
========================================= */

function getVisibleListings() {

  const search =
    state.query
      .trim()
      .toLowerCase();


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

  } else if (
    state.sort === "price-high"
  ) {

    results.sort(
      (a, b) =>
        Number(b.price) -
        Number(a.price)
    );

  } else {

    results.sort(
      (a, b) =>
        (b.createdMillis || 0) -
        (a.createdMillis || 0)
    );

  }


  return results;

}


/* =========================================
   LISTING CARD
========================================= */

function cardTemplate(item) {

  const owned =
    Boolean(
      state.user &&
      item.ownerId === state.user.uid
    );


  const admin =
    isAdmin();


  const canManage =
    owned || admin;


  const location = [
    item.town,
    item.state
  ]
    .filter(Boolean)
    .join(", ");


  const category =
    item.category || "Equipment";


  const inCart =
    state.cart.some(
      product => product.id === item.id
    );


  return `

    <article class="listing-card">

      <div class="listing-art ${categoryClass(category)}">

        <span class="listing-tag">

          ${
            owned
              ? "YOUR LISTING"
              : admin
                ? "ADMIN VIEW"
                : "SELLER LISTING"
          }

        </span>

        <span
          class="art-emoji"
          aria-hidden="true"
        >
          ${escapeHTML(
            item.emoji ||
            categoryEmoji(category)
          )}
        </span>

      </div>


      <div class="listing-body">

        <div class="listing-meta">

          <span class="category-label">
            ${escapeHTML(category)}
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
              item.unit || "unit"
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

          <span>
            ${owned ? "Your offer" : "Direct seller"}
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
            class="btn btn-outline"
            type="button"
            data-cart="${escapeHTML(item.id)}"
            ${inCart ? "disabled" : ""}
          >
            ${
              inCart
                ? "Added to cart"
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
                  ${
                    owned
                      ? "Edit listing"
                      : "Admin edit"
                  }
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

  if (!grid) return;


  const results =
    getVisibleListings();


  grid.innerHTML =
    results.map(cardTemplate).join("");


  const count =
    $("#resultsCount");

  if (count) {

    count.textContent =
      `${results.length} ${
        results.length === 1
          ? "listing"
          : "listings"
      }`;

  }


  $("#emptyState")?.classList.toggle(
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
   RESET FILTERS
========================================= */

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
   LOAD LISTINGS
========================================= */

async function loadListings() {

  const count =
    $("#resultsCount");

  if (count) {

    count.textContent =
      "Loading listings…";

  }


  try {

    const listingsQuery =
      query(
        collection(db, "products"),
        where("status", "==", "active")
      );


    const snapshot =
      await getDocs(listingsQuery);


    state.listings =
      snapshot.docs.map(snap => {

        const data =
          snap.data();


        const createdMillis =
          data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : Number(
                data.createdMillis || 0
              );


        return {
          ...data,
          id: snap.id,
          createdMillis
        };

      });


    renderListings();


  } catch (error) {

    console.error(
      "Could not load listings:",
      error
    );


    if (count) {

      count.textContent =
        "Marketplace could not load";

    }


    $("#emptyState")?.classList.remove(
      "hidden"
    );


    showToast(
      "Could not load marketplace listings."
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
        doc(db, "sellers", user.uid)
      );


    state.profile =
      snapshot.exists()

        ? snapshot.data()

        : {

            displayName:
              user.displayName || "",

            email:
              user.email || ""

          };


  } catch (error) {

    console.warn(
      "Profile could not be read:",
      error
    );


    state.profile = {

      displayName:
        user.displayName || "",

      email:
        user.email || ""

    };

  }

}


/* =========================================
   AUTH USER INTERFACE
========================================= */

function setAuthUI(user) {

  const button =
    $("#signInButton");

  const logoutButton =
    $("#logoutButton");


  if (!button) return;


  if (user) {

    button.textContent =
      isAdmin(user)
        ? "Admin"
        : "My Account";


    button.title =
      "Open your PoultryLink account";


    logoutButton?.classList.remove(
      "hidden"
    );


  } else {

    button.textContent =
      "Sign in";


    button.title =
      "Sign in to your account";


    logoutButton?.classList.add(
      "hidden"
    );

  }

}


/* =========================================
   AUTHENTICATION
========================================= */

function openAuth(mode = "signin") {

  state.authMode = mode;


  $("#authForm")?.reset();


  $("#authMessage").textContent =
    "";


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
      ? "Create an account to manage your marketplace activity."
      : "Sign in to access your account.";


  $("#authNameWrap")?.classList.toggle(
    "hidden",
    !creating
  );


  if ($("#authName")) {

    $("#authName").required =
      creating;

  }


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

  const code =
    error?.code || "";


  const messages = {

    "auth/email-already-in-use":
      "An account already exists with this email.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/weak-password":
      "Password must have at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account was found for this email.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/network-request-failed":
      "Check your internet connection."

  };


  return (
    messages[code] ||
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


  $("#authMessage").textContent =
    "Please wait…";


  $("#authSubmitButton").disabled =
    true;


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
            credential.user.email ||
            email,

          role: "buyer",

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
   ACCOUNT BUTTON
========================================= */

$("#signInButton")?.addEventListener(
  "click",
  () => {

    if (!state.user) {

      openAuth("signin");

      return;

    }


    if (isAdmin()) {

      openAdminDashboard();

    } else {

      openDashboard();

    }

  }
);


/* =========================================
   LOGOUT BUTTON
========================================= */

$("#logoutButton")?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      showToast(
        "You have logged out successfully."
      );

    } catch (error) {

      console.error(error);

      showToast(
        "Could not log out. Please try again."
      );

    }

  }
);


/* =========================================
   USER DASHBOARD
========================================= */

function openDashboard() {

  if (!state.user) {

    openAuth("signin");

    return;

  }


  const name =
    state.profile?.displayName ||
    state.user.displayName ||
    "PoultryLink User";


  $("#dashboardAvatar").textContent =
    initials(name);


  $("#dashboardName").textContent =
    name;


  $("#dashboardEmail").textContent =
    state.user.email || "";


  const role =
    state.profile?.role ||
    "buyer";


  $("#dashboardRole").textContent =
    role === "approved"
      ? "Verified Seller"
      : "Buyer";


  renderDashboardContent();


  $("#dashboardBecomeSellerButton").classList.toggle(
    "hidden",
    role === "approved"
  );


  openDialog("dashboardDialog");

}


function renderDashboardContent() {

  const content =
    $("#dashboardContent");

  if (!content) return;


  const myListings =
    state.listings.filter(
      item =>
        item.ownerId === state.user?.uid
    );


  content.innerHTML = `

    <div class="dashboard-summary">

      <div class="dashboard-stat">

        <small>
          MY LISTINGS
        </small>

        <strong>
          ${myListings.length}
        </strong>

      </div>


      <div class="dashboard-stat">

        <small>
          CART ITEMS
        </small>

        <strong>
          ${state.cart.length}
        </strong>

      </div>

    </div>


    <div class="dashboard-listings">

      <h3>
        My listings
      </h3>

      ${
        myListings.length

          ? myListings.map(item => `

              <div class="dashboard-listing">

                <div>

                  <strong>
                    ${escapeHTML(item.title)}
                  </strong>

                  <p>
                    ${formatNaira(item.price)}
                  </p>

                </div>

                <button
                  class="text-button"
                  type="button"
                  data-edit="${escapeHTML(item.id)}"
                >
                  Edit
                </button>

              </div>

            `).join("")

          : `

              <p>
                You have not created any listings yet.
              </p>

            `
      }

    </div>

  `;

}


$("#dashboardSignOutButton")?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      closeDialog(
        $("#dashboardDialog")
      );

      showToast(
        "You have logged out."
      );

    } catch (error) {

      showToast(
        "Could not log out."
      );

    }

  }
);


/* =========================================
   BECOME SELLER
========================================= */

$("#dashboardBecomeSellerButton")?.addEventListener(
  "click",
  () => {

    closeDialog(
      $("#dashboardDialog")
    );

    openSellerApplication();

  }
);


function openSellerApplication() {

  if (!state.user) {

    openAuth("signin");

    return;

  }


  $("#sellerApplicationForm")?.reset();


  $("#sellerApplicationMessage").textContent =
    "";


  openDialog(
    "sellerApplicationDialog"
  );

}


async function submitSellerApplication(event) {

  event.preventDefault();


  if (!state.user) {

    openAuth("signin");

    return;

  }


  const businessName =
    $("#sellerBusinessName").value.trim();


  const stateName =
    $("#sellerState").value;


  const town =
    $("#sellerTown").value.trim();


  const phone =
    normalisePhone(
      $("#sellerPhone").value
    );


  const description =
    $("#sellerDescription").value.trim();


  if (
    !businessName ||
    !stateName ||
    !town ||
    phone.length < 10 ||
    !description
  ) {

    $("#sellerApplicationMessage").textContent =
      "Please complete all fields correctly.";

    return;

  }


  const button =
    $("#submitSellerApplicationButton");

  button.disabled = true;


  $("#sellerApplicationMessage").textContent =
    "Submitting application…";


  try {

    await setDoc(
      doc(
        db,
        "sellerApplications",
        state.user.uid
      ),
      {

        userId:
          state.user.uid,

        email:
          state.user.email || "",

        businessName,

        state:
          stateName,

        town,

        phone,

        description,

        status:
          "pending",

        createdAt:
          serverTimestamp(),

        createdMillis:
          Date.now()

      },
      {
        merge: true
      }
    );


    $("#sellerApplicationMessage").textContent =
      "Application submitted successfully.";


    showToast(
      "Your seller application is awaiting review."
    );


  } catch (error) {

    console.error(error);


    $("#sellerApplicationMessage").textContent =
      "Could not submit your application.";

  } finally {

    button.disabled = false;

  }

}


$("#sellerApplicationForm")?.addEventListener(
  "submit",
  submitSellerApplication
);


/* =========================================
   OPEN LISTING FORM
========================================= */

function openListingForm(item = null) {

  if (!state.user) {

    showToast(
      "Please sign in first."
    );

    openAuth("signin");

    return;

  }


  const approvedSeller =
    state.profile?.role === "approved";


  if (
    !isAdmin() &&
    !approvedSeller
  ) {

    showToast(
      "Apply and wait for seller approval before publishing products."
    );

    openSellerApplication();

    return;

  }


  const canEdit =
    !item ||
    item.ownerId === state.user.uid ||
    isAdmin();


  if (!canEdit) {

    showToast(
      "You do not have permission to edit this listing."
    );

    return;

  }


  state.editingId =
    item?.id || null;


  $("#listingForm").reset();


  $("#formMessage").textContent =
    "";


  $("#editingListingId").value =
    state.editingId || "";


  $("#listingTitle").textContent =
    state.editingId
      ? "Edit listing"
      : "List a product";


  $("#saveListingButton").textContent =
    state.editingId
      ? "Save changes"
      : "Publish listing";


  $("#listingSeller").value =
    item?.seller ||
    state.profile?.businessName ||
    state.profile?.displayName ||
    state.user.displayName ||
    "";


  $("#listingPhone").value =
    item?.phone ||
    state.profile?.phone ||
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

    $("#listingDescription").value =
      item.description || "";

  }


  openDialog("listingDialog");

}


/* =========================================
   GET LISTING FORM DATA
========================================= */

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


/* =========================================
   VALIDATE LISTING
========================================= */

function validateListing(item) {

  if (
    item.title.length < 3
  ) {
    return "Enter a valid product title.";
  }


  if (
    !Object.hasOwn(
      categoryInfo,
      item.category
    )
  ) {
    return "Choose a product category.";
  }


  if (
    !Number.isFinite(item.price) ||
    item.price < 0
  ) {
    return "Enter a valid price.";
  }


  if (!item.quantity) {
    return "Enter the quantity available.";
  }


  if (
    !item.state ||
    !item.town
  ) {
    return "Enter your state and town.";
  }


  if (
    item.seller.length < 2
  ) {
    return "Enter your farm or business name.";
  }


  if (
    item.phone.length < 10
  ) {
    return "Enter a valid phone number.";
  }


  return "";

}


/* =========================================
   SAVE LISTING
========================================= */

async function saveListing(event) {

  event.preventDefault();


  if (!state.user) {

    openAuth("signin");

    return;

  }


  const item =
    getFormListing();


  const validation =
    validateListing(item);


  if (validation) {

    $("#formMessage").textContent =
      validation;

    return;

  }


  $("#formMessage").textContent =
    "Saving listing…";


  $("#saveListingButton").disabled =
    true;


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
            serverTimestamp(),

          updatedBy:
            state.user.uid
        }
      );


      showToast(
        "Listing updated successfully."
      );


    } else {

      await addDoc(
        collection(db, "products"),
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
        "Listing published successfully."
      );

    }


    closeDialog(
      $("#listingDialog")
    );


    await loadListings();


  } catch (error) {

    console.error(error);


    $("#formMessage").textContent =
      "Could not save listing. Check your Firestore rules.";

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
      listing => listing.id === id
    );


  if (!item) return;


  if (
    !state.user ||
    (
      item.ownerId !== state.user.uid &&
      !isAdmin()
    )
  ) {

    showToast(
      "You do not have permission to delete this listing."
    );

    return;

  }


  if (
    !window.confirm(
      `Delete "${item.title}"?`
    )
  ) {
    return;
  }


  try {

    await deleteDoc(
      doc(db, "products", id)
    );


    state.listings =
      state.listings.filter(
        listing => listing.id !== id
      );


    renderListings();


    showToast(
      "Listing deleted."
    );


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
      listing => listing.id === id
    );


  if (!item) return;


  const phone =
    normalisePhone(
      item.phone
    );


  if (
    phone.length < 10
  ) {

    showToast(
      "This seller has no valid WhatsApp number."
    );

    return;

  }


  const message =
    `Hello ${item.seller || "seller"}, ` +
    `I found your "${item.title}" listing on PoultryLink. ` +
    `Is it still available?`;


  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );

}


/* =========================================
   LISTING DETAILS
========================================= */

function showDetails(id) {

  const item =
    state.listings.find(
      listing => listing.id === id
    );


  if (!item) return;


  const location =
    [
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
        type="button"
        class="modal-close"
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

    </div>


    <span class="category-label">
      ${escapeHTML(item.category)}
    </span>


    <div class="listing-price">

      ${formatNaira(item.price)}

      <small>
        / ${escapeHTML(item.unit || "unit")}
      </small>

    </div>


    <p class="detail-copy">

      ${escapeHTML(
        item.description ||
        "Contact the seller for more information."
      )}

    </p>


    <div class="detail-facts">

      <div class="detail-fact">

        <small>
          QUANTITY
        </small>

        <strong>
          ${escapeHTML(item.quantity)}
        </strong>

      </div>


      <div class="detail-fact">

        <small>
          LOCATION
        </small>

        <strong>
          ${escapeHTML(location)}
        </strong>

      </div>


      <div class="detail-fact">

        <small>
          SELLER
        </small>

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


  await loadAdminApplications();

}


async function loadAdminApplications() {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "sellerApplications"
        )
      );


    const applications =
      snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));


    const pending =
      applications.filter(
        item => item.status === "pending"
      );


    $("#pendingSellerCount").textContent =
      pending.length;


    $("#totalUserCount").textContent =
      applications.length;


    $("#adminListingCount").textContent =
      state.listings.length;


    const container =
      $("#adminApplications");


    const empty =
      $("#adminApplicationsEmpty");


    if (!pending.length) {

      container.innerHTML = "";

      empty?.classList.remove("hidden");

      return;

    }


    empty?.classList.add("hidden");


    container.innerHTML =
      pending.map(item => `

        <div class="admin-application">

          <div>

            <h4>
              ${escapeHTML(item.businessName)}
            </h4>

            <p>
              ${escapeHTML(item.town)},
              ${escapeHTML(item.state)}
            </p>

            <p>
              ${escapeHTML(item.email)}
            </p>

            <p>
              ${escapeHTML(item.description)}
            </p>

          </div>


          <div class="admin-actions">

            <button
              class="btn btn-primary"
              type="button"
              data-approve-seller="${escapeHTML(item.id)}"
            >
              Approve
            </button>


            <button
              class="btn btn-outline"
              type="button"
              data-reject-seller="${escapeHTML(item.id)}"
            >
              Reject
            </button>

          </div>

        </div>

      `).join("");


  } catch (error) {

    console.error(
      "Could not load applications:",
      error
    );

  }

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

        approvedAt:
          serverTimestamp(),

        approvedBy:
          state.user.uid

      }
    );


    await setDoc(
      doc(
        db,
        "sellers",
        userId
      ),
      {

        displayName:
          data.businessName || "",

        businessName:
          data.businessName || "",

        email:
          data.email || "",

        state:
          data.state || "",

        town:
          data.town || "",

        phone:
          data.phone || "",

        description:
          data.description || "",

        role:
          "approved",

        approvedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    showToast(
      "Seller approved successfully."
    );


    await loadAdminApplications();


  } catch (error) {

    console.error(error);

    showToast(
      "Could not approve seller."
    );

  }

}


async function rejectSeller(userId) {

  if (!isAdmin()) return;


  try {

    await updateDoc(
      doc(
        db,
        "sellerApplications",
        userId
      ),
      {

        status: "rejected",

        rejectedAt:
          serverTimestamp(),

        rejectedBy:
          state.user.uid

      }
    );


    showToast(
      "Seller application rejected."
    );


    await loadAdminApplications();


  } catch (error) {

    console.error(error);

    showToast(
      "Could not reject application."
    );

  }

}


$("#refreshAdminButton")?.addEventListener(
  "click",
  loadAdminApplications
);


/* =========================================
   SELL BUTTONS
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


/* =========================================
   SEARCH
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
   AUTH EVENTS
========================================= */

$("#authModeButton")?.addEventListener(
  "click",
  () => {

    state.authMode =
      state.authMode === "signin"
        ? "signup"
        : "signin";


    $("#authMessage").textContent =
      "";


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


/* =========================================
   MOBILE MENU
========================================= */

$("#menuButton")?.addEventListener(
  "click",
  () => {

    const nav =
      $("#desktopNav");

    if (!nav) return;


    const open =
      nav.classList.toggle("open");


    $("#menuButton").setAttribute(
      "aria-expanded",
      String(open)
    );


    $("#menuButton").textContent =
      open ? "×" : "☰";

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

      return;

    }


    const detailButton =
      event.target.closest(
        "[data-detail]"
      );


    if (detailButton) {

      showDetails(
        detailButton.dataset.detail
      );

      return;

    }


    const contactButton =
      event.target.closest(
        "[data-contact]"
      );


    if (contactButton) {

      contactSeller(
        contactButton.dataset.contact
      );

      return;

    }


    const cartButton =
      event.target.closest(
        "[data-cart]"
      );


    if (cartButton) {

      addToCart(
        cartButton.dataset.cart
      );

      renderListings();

      return;

    }


    const removeCartButton =
      event.target.closest(
        "[data-remove-cart]"
      );


    if (removeCartButton) {

      removeFromCart(
        removeCartButton.dataset.removeCart
      );

      renderListings();

      return;

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

        closeDialog(
          $("#dashboardDialog")
        );


        openListingForm(item);

      }

      return;

    }


    const deleteButton =
      event.target.closest(
        "[data-delete]"
      );


    if (deleteButton) {

      deleteListing(
        deleteButton.dataset.delete
      );

      return;

    }


    const approveButton =
      event.target.closest(
        "[data-approve-seller]"
      );


    if (approveButton) {

      approveSeller(
        approveButton.dataset.approveSeller
      );

      return;

    }


    const rejectButton =
      event.target.closest(
        "[data-reject-seller]"
      );


    if (rejectButton) {

      rejectSeller(
        rejectButton.dataset.rejectSeller
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


    await loadProfile(user);


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


loadCart();

updateCartCount();

updateAuthModeUI();

loadListings();