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
   HELPERS AND APPLICATION STATE
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
  user: null,
  profile: null,
  authMode: "signin",
  editingId: null
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


/* =========================================
   GENERAL HELPERS
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

  return "₦" + new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0
  }).format(number);

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

  const dialog = document.getElementById(id);

  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
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
   SEARCH AND LISTINGS
========================================= */

function getVisibleListings() {

  const search =
    state.query.trim().toLowerCase();

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
        Number(a.price) - Number(b.price)
    );

  } else if (state.sort === "price-high") {

    results.sort(
      (a, b) =>
        Number(b.price) - Number(a.price)
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

  const owned = Boolean(
    state.user &&
    item.ownerId === state.user.uid
  );

  const admin = isAdmin();


  const canManage =
    owned || admin;


  const location = [
    item.town,
    item.state
  ].filter(Boolean).join(", ");


  const category =
    item.category || "Equipment";


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

        <span class="art-emoji" aria-hidden="true">
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
            "Contact the seller for more details about this offer."
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
            ${
              owned
                ? "Your offer"
                : "Direct seller"
            }
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
   LOAD LISTINGS FROM FIRESTORE
========================================= */

async function loadListings() {

  $("#resultsCount").textContent =
    "Loading listings…";


  try {

    const listingsQuery = query(
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


    grid.innerHTML = "";


    $("#resultsCount").textContent =
      "Marketplace could not load";


    $("#emptyState").classList.remove(
      "hidden"
    );


    $("#emptyState h3").textContent =
      "Unable to load listings";


    $("#emptyState p").textContent =
      "Check your Firestore database and security rules, then refresh the page.";


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
      "Seller profile could not be read:",
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
   ACCOUNT USER INTERFACE
========================================= */

function setAuthUI(user) {

  const button =
    $("#signInButton");


  if (!button) return;


  if (user) {

    const name =

      state.profile?.displayName ||

      user.displayName ||

      user.email ||

      "Seller";


    const adminText =
      isAdmin(user)
        ? "ADMIN: "
        : "Account: ";


    button.textContent =
      adminText +
      (
        name.length > 18
          ? name.slice(0, 17) + "…"
          : name
      );


    button.title =
      isAdmin(user)

        ? "Signed in as administrator."

        : "Signed in as " +
          name +
          ". Click to sign out.";


  } else {

    button.textContent =
      "Sign in";


    button.title =
      "Sign in to manage seller listings";

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

      ? "Create your seller account"

      : "Welcome to PoultryLink";


  $("#authSubtitle").textContent =
    creating

      ? "Create an account to publish and manage listings."

      : "Sign in to manage your listings.";


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

  const code =
    error?.code || "";


  const messages = {

    "auth/email-already-in-use":
      "An account already exists for this email. Try signing in.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/weak-password":
      "Choose a password with at least 6 characters.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/user-not-found":
      "No account was found for this email.",

    "auth/wrong-password":
      "Email or password is incorrect.",

    "auth/too-many-requests":
      "Too many attempts. Wait a little and try again.",

    "auth/network-request-failed":
      "Network problem. Check your internet connection."

  };


  return (
    messages[code] ||

    "Authentication failed. Please check your details and try again."
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

          createdAt:
            serverTimestamp()

        }
      );


      state.profile = {

        displayName: name,

        email

      };


      showToast(
        "Seller account created successfully."
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

    console.error(
      "Authentication error:",
      error
    );


    $("#authMessage").textContent =
      friendlyAuthError(error);


  } finally {

    $("#authSubmitButton").disabled =
      false;

  }

}


/* =========================================
   CREATE / EDIT LISTING
========================================= */

function openListingForm(item = null) {

  if (!state.user) {

    showToast(
      "Sign in or create a seller account before listing a product."
    );


    openAuth("signin");

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

      ? (
          isAdmin() &&
          item?.ownerId !== state.user.uid

            ? "Admin edit listing"

            : "Edit your listing"
        )

      : "List a product";


  $("#saveListingButton").textContent =
    state.editingId

      ? "Save changes"

      : "Publish listing";


  const profileName =

    state.profile?.displayName ||

    state.user.displayName ||

    "";


  $("#listingSeller").value =
    item?.seller ||
    profileName;


  $("#listingPhone").value =
    item?.phone || "";


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


  openDialog(
    "listingDialog"
  );

}


/* =========================================
   GET FORM DATA
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


  const phone =
    normalisePhone(
      data.get("phone")
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

    phone,

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
    item.title.length < 3 ||
    item.title.length > 100
  ) {
    return "Product title must be between 3 and 100 characters.";
  }


  if (
    !Object.hasOwn(
      categoryInfo,
      item.category
    )
  ) {
    return "Choose a valid product category.";
  }


  if (
    !Number.isFinite(item.price) ||
    item.price < 0 ||
    item.price > 1000000000
  ) {
    return "Enter a valid price.";
  }


  if (
    !item.quantity ||
    item.quantity.length > 80
  ) {
    return "Enter the available quantity.";
  }


  if (
    !item.state ||
    !item.town ||
    item.town.length > 80
  ) {
    return "Enter a valid state and town.";
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
    return "Enter a valid phone number.";
  }


  if (
    item.description.length > 1200
  ) {
    return "Description must be 1,200 characters or fewer.";
  }


  return "";

}


/* =========================================
   SAVE LISTING
========================================= */

async function saveListing(event) {

  event.preventDefault();


  if (!state.user) {

    closeDialog(
      $("#listingDialog")
    );

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

      const current =
        state.listings.find(
          listing =>
            listing.id ===
            state.editingId
        );


      const canEdit =
        current &&
        (
          current.ownerId ===
          state.user.uid ||

          isAdmin()
        );


      if (!canEdit) {

        throw new Error(
          "You do not have permission to edit this listing."
        );

      }


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
        "Listing updated."
      );


    } else {

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
        "Your listing is now published."
      );

    }


    closeDialog(
      $("#listingDialog")
    );


    await loadListings();


  } catch (error) {

    console.error(
      "Could not save listing:",
      error
    );


    $("#formMessage").textContent =
      error?.message ||
      "Could not save listing. Check your Firestore security rules and try again.";


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


  const canDelete =
    item &&
    state.user &&
    (
      item.ownerId ===
      state.user.uid ||

      isAdmin()
    );


  if (!canDelete) {

    showToast(
      "You do not have permission to delete this listing."
    );

    return;

  }


  if (
    !window.confirm(
      `Delete "${item.title}"? This cannot be undone.`
    )
  ) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "products",
        id
      )
    );


    state.listings =
      state.listings.filter(
        listing =>
          listing.id !== id
      );


    renderListings();


    showToast(
      "Listing deleted."
    );


  } catch (error) {

    console.error(
      "Delete failed:",
      error
    );


    showToast(
      "Could not delete listing. Check Firestore security rules."
    );

  }

}


/* =========================================
   WHATSAPP CONTACT
========================================= */

function contactSeller(id) {

  const item =
    state.listings.find(
      listing =>
        listing.id === id
    );


  if (!item) return;


  const phone =
    normalisePhone(
      item.phone
    );


  if (
    !phone ||
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

  ].filter(Boolean).join(", ");


  const owned =
    Boolean(
      state.user &&
      item.ownerId ===
      state.user.uid
    );


  $("#detailContent").innerHTML = `

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

      <div
        class="listing-art ${categoryClass(item.category)}"
      >

        <span class="art-emoji">

          ${escapeHTML(
            item.emoji ||
            categoryEmoji(item.category)
          )}

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

          <small>

            / ${escapeHTML(
              item.unit || "unit"
            )}

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

        <small>
          AVAILABLE QUANTITY
        </small>

        <strong>

          ${escapeHTML(
            item.quantity ||
            "Ask seller"
          )}

        </strong>

      </div>


      <div class="detail-fact">

        <small>
          LOCATION
        </small>

        <strong>

          ${escapeHTML(
            location ||
            "Not specified"
          )}

        </strong>

      </div>


      <div class="detail-fact">

        <small>
          SELLER / FARM
        </small>

        <strong>

          ${escapeHTML(
            item.seller ||
            "Poultry seller"
          )}

        </strong>

      </div>


      <div class="detail-fact">

        <small>
          LISTING STATUS
        </small>

        <strong>

          ${
            owned
              ? "Your listing"
              : "Seller listing"
          }

        </strong>

      </div>

    </div>


    <p class="detail-copy">

      <strong>
        Safety reminder:
      </strong>

      Confirm current stock, quality, final price,
      transport and payment arrangements directly.
      PoultryLink does not process payments or guarantee transactions.

    </p>


    <button
      type="button"
      class="btn btn-primary full-button"
      data-contact="${escapeHTML(item.id)}"
    >
      Contact seller on WhatsApp ↗
    </button>

  `;


  openDialog(
    "detailDialog"
  );

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
      behavior: "smooth",
      block: "start"
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
   BUTTON EVENTS
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


$("#signInButton")?.addEventListener(
  "click",
  async () => {

    if (state.user) {

      if (
        window.confirm(
          "Sign out of PoultryLink?"
        )
      ) {

        try {

          await signOut(auth);

          showToast(
            "You have signed out."
          );

        } catch (error) {

          console.error(error);

          showToast(
            "Could not sign out. Please try again."
          );

        }

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


    const isOpen =
      nav.classList.toggle(
        "open"
      );


    $("#menuButton").setAttribute(
      "aria-expanded",
      String(isOpen)
    );


    $("#menuButton").textContent =
      isOpen
        ? "×"
        : "☰";

  }
);


$$("#desktopNav a")
  .forEach(link => {

    link.addEventListener(
      "click",
      () => {

        $("#desktopNav")?.classList.remove(
          "open"
        );


        $("#menuButton")?.setAttribute(
          "aria-expanded",
          "false"
        );


        if ($("#menuButton")) {

          $("#menuButton").textContent =
            "☰";

        }

      }
    );

  });


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


      if (
        item &&
        (
          item.ownerId ===
          state.user?.uid ||

          isAdmin()
        )
      ) {

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

  }
);


/* =========================================
   CLOSE DIALOG WHEN CLICKING BACKGROUND
========================================= */

$$("dialog")
  .forEach(dialog => {

    dialog.addEventListener(
      "click",
      event => {

        if (
          event.target === dialog
        ) {

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


updateAuthModeUI();


loadListings();