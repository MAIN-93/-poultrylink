// ============================================
// POULTRYLINK - COMPLETE script.js
// ============================================

// ---------------- FIREBASE IMPORTS ----------------

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
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyDUBwgGhDHj-v6kBE5Dn3O_FxF8EfPPfy4",
  authDomain: "poultrylink-2459a.firebaseapp.com",
  projectId: "poultrylink-2459a",
  storageBucket: "poultrylink-2459a.firebasestorage.app",
  messagingSenderId: "332920290687",
  appId: "1:332920290687:web:3e71c648817e1c07ba6e4a"
};


// ============================================
// INITIALIZE FIREBASE
// ============================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================
// ADMIN SETTINGS
// ============================================

const ADMIN_EMAIL = "ajmaine93@gmail.com";


// ============================================
// APPLICATION STATE
// ============================================

let currentUser = null;
let allListings = [];
let cart = JSON.parse(localStorage.getItem("poultrylinkCart") || "[]");

let activeCategory = "";
let activeSearch = "";
let activeLocation = "";
let activeSort = "newest";

let isSignUpMode = false;
let currentSellerApplication = null;


// ============================================
// DOM ELEMENTS
// ============================================

const $ = (id) => document.getElementById(id);


// HEADER

const signInButton = $("signInButton");
const logoutButton = $("logoutButton");

const sellHeaderButton = $("sellHeaderButton");
const heroSellButton = $("heroSellButton");
const sellBannerButton = $("sellBannerButton");

const menuButton = $("menuButton");
const desktopNav = $("desktopNav");


// AUTH

const authDialog = $("authDialog");
const authForm = $("authForm");

const authNameWrap = $("authNameWrap");
const authName = $("authName");
const authEmail = $("authEmail");
const authPassword = $("authPassword");

const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const authModeButton = $("authModeButton");
const authSubmitButton = $("authSubmitButton");
const authMessage = $("authMessage");


// LISTINGS

const listingDialog = $("listingDialog");
const listingForm = $("listingForm");

const editingListingId = $("editingListingId");

const listingTitleInput = $("listingTitleInput");
const listingCategory = $("listingCategory");
const listingPrice = $("listingPrice");
const listingQuantity = $("listingQuantity");
const listingUnit = $("listingUnit");
const listingState = $("listingState");
const listingTown = $("listingTown");
const listingSeller = $("listingSeller");
const listingPhone = $("listingPhone");
const listingDescription = $("listingDescription");

const listingTitle = $("listingTitle");
const saveListingButton = $("saveListingButton");
const formMessage = $("formMessage");


// MARKETPLACE

const listingGrid = $("listingGrid");
const resultsCount = $("resultsCount");
const emptyState = $("emptyState");

const searchForm = $("searchForm");
const searchInput = $("searchInput");
const categoryFilter = $("categoryFilter");
const locationFilter = $("locationFilter");

const clearFiltersButton = $("clearFiltersButton");
const emptyClearButton = $("emptyClearButton");

const categoryChips = $("categoryChips");
const sortSelect = $("sortSelect");


// CART

const cartButton = $("cartButton");
const cartCount = $("cartCount");

const cartDialog = $("cartDialog");
const cartItems = $("cartItems");
const cartEmpty = $("cartEmpty");
const cartSummary = $("cartSummary");
const cartTotal = $("cartTotal");
const cartContactButton = $("cartContactButton");


// DASHBOARD

const dashboardDialog = $("dashboardDialog");

const dashboardKicker = $("dashboardKicker");
const dashboardTitle = $("dashboardTitle");
const dashboardSubtitle = $("dashboardSubtitle");

const dashboardAvatar = $("dashboardAvatar");
const dashboardName = $("dashboardName");
const dashboardEmail = $("dashboardEmail");
const dashboardRole = $("dashboardRole");

const dashboardContent = $("dashboardContent");

const dashboardBecomeSellerButton =
  $("dashboardBecomeSellerButton");

const dashboardSignOutButton =
  $("dashboardSignOutButton");


// SELLER VERIFICATION

const sellerVerificationModal =
  $("sellerVerificationModal");

const sellerVerificationForm =
  $("sellerVerificationForm");

const sellerVerificationMessage =
  $("sellerVerificationMessage");

const submitVerificationButton =
  $("submitVerificationButton");

const startIdentityVerification =
  $("startIdentityVerification");

const identityVerificationStatus =
  $("identityVerificationStatus");


// ADMIN

const adminDialog = $("adminDialog");

const pendingSellerCount =
  $("pendingSellerCount");

const totalUserCount =
  $("totalUserCount");

const adminListingCount =
  $("adminListingCount");

const adminApplications =
  $("adminApplications");

const adminApplicationsEmpty =
  $("adminApplicationsEmpty");

const refreshAdminButton =
  $("refreshAdminButton");


// DETAILS

const detailDialog = $("detailDialog");
const detailContent = $("detailContent");


// TOAST

const toast = $("toast");


// FOOTER

const year = $("year");


// ============================================
// HELPER FUNCTIONS
// ============================================

function showToast(message) {

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 3500);

}


function showMessage(element, message, type = "") {

  if (!element) return;

  element.textContent = message;

  element.classList.remove(
    "success",
    "error"
  );

  if (type) {
    element.classList.add(type);
  }

}


function formatPrice(price) {

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }
  ).format(Number(price) || 0);

}


function escapeHTML(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function formatDate(timestamp) {

  if (!timestamp) {
    return "Recently added";
  }

  let date;

  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleDateString(
    "en-NG",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );

}


function isAdmin() {

  return currentUser &&
    currentUser.email &&
    currentUser.email.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();

}


function closeDialog(dialog) {

  if (
    dialog &&
    dialog.open
  ) {
    dialog.close();
  }

}


function openDialog(dialog) {

  if (!dialog) return;

  if (!dialog.open) {
    dialog.showModal();
  }

}


// ============================================
// CLOSE MODALS
// ============================================

document.addEventListener(
  "click",
  (event) => {

    const closeButton =
      event.target.closest("[data-close]");

    if (closeButton) {

      const dialogId =
        closeButton.dataset.close;

      closeDialog(
        document.getElementById(dialogId)
      );

    }


    const closeModalButton =
      event.target.closest("[data-close-modal]");

    if (closeModalButton) {

      const dialogId =
        closeModalButton.dataset.closeModal;

      closeDialog(
        document.getElementById(dialogId)
      );

    }

  }
);


// CLOSE WHEN CLICKING BACKDROP

document.querySelectorAll("dialog").forEach(
  (dialog) => {

    dialog.addEventListener(
      "click",
      (event) => {

        if (
          event.target === dialog
        ) {
          dialog.close();
        }

      }
    );

  }
);


// ============================================
// AUTHENTICATION
// ============================================

function openAuthDialog(signUp = false) {

  isSignUpMode = signUp;

  showMessage(authMessage, "");

  authForm.reset();

  updateAuthMode();

  openDialog(authDialog);

}


function updateAuthMode() {

  if (isSignUpMode) {

    authTitle.textContent =
      "Create your account";

    authSubtitle.textContent =
      "Join PoultryLink to buy, sell and manage your marketplace activity.";

    authNameWrap.classList.remove("hidden");

    authName.required = true;

    authModeButton.textContent =
      "I already have an account";

    authSubmitButton.textContent =
      "Create account";

    authPassword.autocomplete =
      "new-password";

  } else {

    authTitle.textContent =
      "Welcome to PoultryLink";

    authSubtitle.textContent =
      "Sign in to access your account.";

    authNameWrap.classList.add("hidden");

    authName.required = false;

    authModeButton.textContent =
      "Create account";

    authSubmitButton.textContent =
      "Sign in";

    authPassword.autocomplete =
      "current-password";

  }

}


authModeButton?.addEventListener(
  "click",
  () => {

    isSignUpMode = !isSignUpMode;

    updateAuthMode();

    showMessage(authMessage, "");

  }
);


authForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      authEmail.value.trim();

    const password =
      authPassword.value;

    const name =
      authName.value.trim();

    showMessage(
      authMessage,
      "Please wait..."
    );

    authSubmitButton.disabled = true;

    try {

      if (isSignUpMode) {

        if (name.length < 2) {

          throw new Error(
            "Please enter your name."
          );

        }

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


        // CREATE USER PROFILE

        await setDoc(
          doc(
            db,
            "users",
            credential.user.uid
          ),
          {
            uid:
              credential.user.uid,

            name,

            email,

            role: "buyer",

            createdAt:
              serverTimestamp()
          },
          {
            merge: true
          }
        );


        showMessage(
          authMessage,
          "Account created successfully!",
          "success"
        );

        showToast(
          "Welcome to PoultryLink!"
        );


        setTimeout(
          () => {

            closeDialog(authDialog);

          },
          700
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

        closeDialog(authDialog);

      }

    } catch (error) {

      console.error(error);

      showMessage(
        authMessage,
        getFirebaseErrorMessage(error),
        "error"
      );

    } finally {

      authSubmitButton.disabled = false;

    }

  }
);


function getFirebaseErrorMessage(error) {

  const code = error?.code || "";

  const messages = {

    "auth/email-already-in-use":
      "This email is already registered.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/weak-password":
      "Password should contain at least 6 characters.",

    "auth/invalid-credential":
      "Incorrect email or password.",

    "auth/user-not-found":
      "No account was found with this email.",

    "auth/wrong-password":
      "Incorrect email or password.",

    "auth/too-many-requests":
      "Too many attempts. Please try again later."

  };

  return messages[code] ||
    error?.message ||
    "Something went wrong. Please try again.";

}


// ============================================
// AUTH STATE
// ============================================

onAuthStateChanged(
  auth,
  async (user) => {

    currentUser = user;

    updateHeaderAuthState();

    if (user) {

      // ENSURE USER PROFILE EXISTS

      try {

        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            name:
              user.displayName ||
              "PoultryLink User",
            email:
              user.email || "",
            lastLogin:
              serverTimestamp()
          },
          {
            merge: true
          }
        );

      } catch (error) {

        console.warn(
          "Could not update user profile:",
          error
        );

      }

    }

    renderCart();

  }
);


function updateHeaderAuthState() {

  if (!currentUser) {

    signInButton?.classList.remove("hidden");

    logoutButton?.classList.add("hidden");

    signInButton.textContent =
      "Sign in";

    return;

  }


  signInButton?.classList.remove("hidden");

  logoutButton?.classList.remove("hidden");


  if (isAdmin()) {

    signInButton.textContent =
      "Admin";

  } else {

    signInButton.textContent =
      "My account";

  }

}


// ============================================
// SIGN IN / ACCOUNT BUTTON
// ============================================

signInButton?.addEventListener(
  "click",
  async () => {

    if (!currentUser) {

      openAuthDialog(false);

      return;

    }


    if (isAdmin()) {

      await loadAdminDashboard();

      openDialog(adminDialog);

      return;

    }


    await openDashboard();

  }
);


// ============================================
// LOGOUT
// ============================================

async function logoutUser() {

  try {

    await signOut(auth);

    closeDialog(dashboardDialog);

    closeDialog(adminDialog);

    showToast(
      "You have been signed out."
    );

  } catch (error) {

    console.error(error);

    showToast(
      "Could not sign out. Please try again."
    );

  }

}


logoutButton?.addEventListener(
  "click",
  logoutUser
);

dashboardSignOutButton?.addEventListener(
  "click",
  logoutUser
);


// ============================================
// SELLER STATUS
// ============================================

async function getSellerProfile(uid = null) {

  const userId =
    uid || currentUser?.uid;

  if (!userId) return null;

  try {

    const sellerDoc =
      await getDoc(
        doc(db, "sellers", userId)
      );

    if (!sellerDoc.exists()) {
      return null;
    }

    return {
      id: sellerDoc.id,
      ...sellerDoc.data()
    };

  } catch (error) {

    console.error(
      "Error getting seller profile:",
      error
    );

    return null;

  }

}


async function isApprovedSeller() {

  if (!currentUser) {
    return false;
  }

  if (isAdmin()) {
    return true;
  }

  const seller =
    await getSellerProfile();

  return seller?.status === "approved";

}


// ============================================
// SELL BUTTONS
// ============================================

async function handleSellRequest() {

  if (!currentUser) {

    openAuthDialog(true);

    showToast(
      "Create an account or sign in to become a seller."
    );

    return;

  }


  if (isAdmin()) {

    openListingDialog();

    return;

  }


  const seller =
    await getSellerProfile();

  if (
    seller &&
    seller.status === "approved"
  ) {

    openListingDialog();

    return;

  }


  if (
    seller &&
    seller.status === "pending"
  ) {

    showToast(
      "Your seller application is still being reviewed."
    );

    return;

  }


  openSellerVerification();

}


sellHeaderButton?.addEventListener(
  "click",
  handleSellRequest
);

heroSellButton?.addEventListener(
  "click",
  handleSellRequest
);

sellBannerButton?.addEventListener(
  "click",
  handleSellRequest
);


// ============================================
// SELLER VERIFICATION
// ============================================

async function openSellerVerification() {

  if (!currentUser) {

    openAuthDialog(true);

    return;

  }


  sellerVerificationForm?.reset();

  sellerVerificationMessage.textContent = "";

  identityVerificationStatus.textContent =
    "Not started";


  // PREFILL USER INFORMATION

  const nameInput =
    $("verificationFullName");

  const emailInput =
    $("verificationEmail");

  if (nameInput) {

    nameInput.value =
      currentUser.displayName || "";

  }

  if (emailInput) {

    emailInput.value =
      currentUser.email || "";

  }


  const existing =
    await getSellerProfile();

  if (existing) {

    $("verificationFullName").value =
      existing.fullName || "";

    $("verificationPhone").value =
      existing.phone || "";

    $("verificationEmail").value =
      existing.email ||
      currentUser.email ||
      "";

    $("verificationState").value =
      existing.state || "";

    $("verificationCity").value =
      existing.city || "";

    $("verificationBusinessName").value =
      existing.businessName || "";

    $("verificationExperience").value =
      existing.experience || "";

    $("verificationAddress").value =
      existing.address || "";

    $("verificationProducts").value =
      existing.products || "";

    $("verificationDescription").value =
      existing.description || "";

    if (
      existing.identityStatus
    ) {

      identityVerificationStatus.textContent =
        existing.identityStatus;

    }

  }


  openDialog(
    sellerVerificationModal
  );

}


// IDENTITY VERIFICATION PLACEHOLDER

startIdentityVerification?.addEventListener(
  "click",
  () => {

    identityVerificationStatus.textContent =
      "Verification provider not connected yet";

    showToast(
      "Identity verification integration will be connected to a secure provider."
    );

  }
);


// SUBMIT SELLER APPLICATION

sellerVerificationForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!currentUser) {

      showToast(
        "Please sign in first."
      );

      return;

    }


    const consent =
      $("verificationConsent");

    if (!consent.checked) {

      showMessage(
        sellerVerificationMessage,
        "You must confirm that your information is correct.",
        "error"
      );

      return;

    }


    submitVerificationButton.disabled = true;

    showMessage(
      sellerVerificationMessage,
      "Submitting your application..."
    );


    try {

      const data = {

        uid:
          currentUser.uid,

        fullName:
          $("verificationFullName")
            .value
            .trim(),

        phone:
          $("verificationPhone")
            .value
            .trim(),

        email:
          $("verificationEmail")
            .value
            .trim(),

        state:
          $("verificationState")
            .value
            .trim(),

        city:
          $("verificationCity")
            .value
            .trim(),

        businessName:
          $("verificationBusinessName")
            .value
            .trim(),

        experience:
          $("verificationExperience")
            .value,

        address:
          $("verificationAddress")
            .value
            .trim(),

        products:
          $("verificationProducts")
            .value,

        description:
          $("verificationDescription")
            .value
            .trim(),

        identityStatus:
          identityVerificationStatus
            .textContent
            .trim(),

        status:
          "pending",

        updatedAt:
          serverTimestamp(),

        submittedAt:
          serverTimestamp()

      };


      await setDoc(
        doc(
          db,
          "sellers",
          currentUser.uid
        ),
        data,
        {
          merge: true
        }
      );


      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          role:
            "seller-pending"
        },
        {
          merge: true
        }
      );


      showMessage(
        sellerVerificationMessage,
        "Application submitted successfully. Please wait for admin review.",
        "success"
      );

      showToast(
        "Seller application submitted!"
      );


      setTimeout(
        () => {

          closeDialog(
            sellerVerificationModal
          );

        },
        1200
      );

    } catch (error) {

      console.error(error);

      showMessage(
        sellerVerificationMessage,
        "Could not submit your application. Please try again.",
        "error"
      );

    } finally {

      submitVerificationButton.disabled =
        false;

    }

  }
);


// ============================================
// DASHBOARD
// ============================================

async function openDashboard() {

  if (!currentUser) {

    openAuthDialog(false);

    return;

  }


  const seller =
    await getSellerProfile();


  const name =
    currentUser.displayName ||
    "PoultryLink User";


  dashboardName.textContent =
    name;

  dashboardEmail.textContent =
    currentUser.email || "";


  dashboardAvatar.textContent =
    name.charAt(0).toUpperCase();


  dashboardKicker.textContent =
    "MY ACCOUNT";

  dashboardTitle.textContent =
    "My PoultryLink account";


  if (
    seller?.status === "approved"
  ) {

    dashboardRole.textContent =
      "Verified Seller";

    dashboardSubtitle.textContent =
      "Manage your seller activity and listings.";

    dashboardBecomeSellerButton.textContent =
      "List a product";

  } else if (
    seller?.status === "pending"
  ) {

    dashboardRole.textContent =
      "Seller application pending";

    dashboardSubtitle.textContent =
      "Your seller verification is being reviewed.";

    dashboardBecomeSellerButton.textContent =
      "Application pending";

  } else {

    dashboardRole.textContent =
      "Buyer";

    dashboardSubtitle.textContent =
      "Manage your account and marketplace activity.";

    dashboardBecomeSellerButton.textContent =
      "Become a seller";

  }


  await renderDashboardContent(
    seller
  );


  openDialog(
    dashboardDialog
  );

}


async function renderDashboardContent(
  seller
) {

  if (!dashboardContent) return;


  if (
    seller?.status === "approved"
  ) {

    const myListings =
      allListings.filter(
        listing =>
          listing.ownerId ===
          currentUser.uid
      );


    dashboardContent.innerHTML = `

      <div class="dashboard-section">

        <div class="dashboard-section-heading">

          <div>
            <span class="section-kicker">
              MY LISTINGS
            </span>

            <h3>
              Your products
            </h3>
          </div>

          <button
            class="btn btn-primary"
            id="dashboardNewListingButton"
            type="button"
          >
            ＋ New listing
          </button>

        </div>

        <div class="dashboard-listings">

          ${
            myListings.length
              ? myListings.map(
                  dashboardListingHTML
                ).join("")
              : `
                <div class="admin-empty">
                  You have not published any listings yet.
                </div>
              `
          }

        </div>

      </div>

    `;


    $("dashboardNewListingButton")
      ?.addEventListener(
        "click",
        () => {

          closeDialog(
            dashboardDialog
          );

          openListingDialog();

        }
      );


    dashboardContent
      .querySelectorAll(
        "[data-edit-listing]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const id =
                button.dataset.editListing;

              const listing =
                allListings.find(
                  item =>
                    item.id === id
                );

              if (listing) {

                closeDialog(
                  dashboardDialog
                );

                openListingDialog(
                  listing
                );

              }

            }
          );

        }
      );


    dashboardContent
      .querySelectorAll(
        "[data-delete-listing]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async () => {

              const id =
                button.dataset.deleteListing;

              await deleteListing(id);

              await openDashboard();

            }
          );

        }
      );

  } else if (
    seller?.status === "pending"
  ) {

    dashboardContent.innerHTML = `

      <div class="dashboard-section">

        <div class="status-card">

          <h3>
            Seller application submitted
          </h3>

          <p>
            Your seller verification is currently pending review.
            You will be able to publish products after approval.
          </p>

        </div>

      </div>

    `;

  } else {

    dashboardContent.innerHTML = `

      <div class="dashboard-section">

        <div class="status-card">

          <h3>
            Want to sell on PoultryLink?
          </h3>

          <p>
            Apply for seller verification and publish your poultry
            products after your application is approved.
          </p>

        </div>

      </div>

    `;

  }

}


function dashboardListingHTML(
  listing
) {

  return `

    <article
      class="dashboard-listing"
    >

      <div>

        <strong>
          ${escapeHTML(listing.title)}
        </strong>

        <p>
          ${formatPrice(listing.price)}
          ·
          ${escapeHTML(listing.unit || "")}
        </p>

      </div>

      <div
        class="dashboard-listing-actions"
      >

        <button
          class="text-button"
          type="button"
          data-edit-listing="${listing.id}"
        >
          Edit
        </button>

        <button
          class="text-button"
          type="button"
          data-delete-listing="${listing.id}"
        >
          Delete
        </button>

      </div>

    </article>

  `;

}


dashboardBecomeSellerButton?.addEventListener(
  async () => {

    if (!currentUser) {

      openAuthDialog(true);

      return;

    }


    const seller =
      await getSellerProfile();


    if (
      seller?.status === "approved"
    ) {

      closeDialog(
        dashboardDialog
      );

      openListingDialog();

    } else if (
      seller?.status === "pending"
    ) {

      showToast(
        "Your application is still pending review."
      );

    } else {

      closeDialog(
        dashboardDialog
      );

      openSellerVerification();

    }

  }
);


// ============================================
// LISTING DIALOG
// ============================================

async function openListingDialog(
  listing = null
) {

  if (!currentUser) {

    openAuthDialog(false);

    return;

  }


  const approved =
    await isApprovedSeller();


  if (!approved) {

    showToast(
      "You must be an approved seller before publishing products."
    );

    openSellerVerification();

    return;

  }


  listingForm.reset();

  showMessage(
    formMessage,
    ""
  );


  if (listing) {

    listingTitle.textContent =
      "Edit listing";

    saveListingButton.textContent =
      "Save changes";

    editingListingId.value =
      listing.id;

    listingTitleInput.value =
      listing.title || "";

    listingCategory.value =
      listing.category || "";

    listingPrice.value =
      listing.price || "";

    listingQuantity.value =
      listing.quantity || "";

    listingUnit.value =
      listing.unit || "per unit";

    listingState.value =
      listing.state || "";

    listingTown.value =
      listing.town || "";

    listingSeller.value =
      listing.seller || "";

    listingPhone.value =
      listing.phone || "";

    listingDescription.value =
      listing.description || "";

  } else {

    listingTitle.textContent =
      "List a product";

    saveListingButton.textContent =
      "Publish listing";

    editingListingId.value = "";


    const seller =
      await getSellerProfile();


    if (seller) {

      listingSeller.value =
        seller.businessName ||
        seller.fullName ||
        "";

      listingState.value =
        seller.state || "";

      listingTown.value =
        seller.city || "";

      listingPhone.value =
        seller.phone || "";

    }

  }


  openDialog(
    listingDialog
  );

}


// ============================================
// SAVE LISTING
// ============================================

listingForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!currentUser) {

      showToast(
        "Please sign in first."
      );

      return;

    }


    const approved =
      await isApprovedSeller();


    if (!approved) {

      showMessage(
        formMessage,
        "Your seller account must be approved before publishing.",
        "error"
      );

      return;

    }


    saveListingButton.disabled = true;

    showMessage(
      formMessage,
      "Saving your listing..."
    );


    try {

      const listingData = {

        title:
          listingTitleInput
            .value
            .trim(),

        category:
          listingCategory.value,

        price:
          Number(
            listingPrice.value
          ),

        quantity:
          listingQuantity
            .value
            .trim(),

        unit:
          listingUnit.value,

        state:
          listingState.value,

        town:
          listingTown
            .value
            .trim(),

        seller:
          listingSeller
            .value
            .trim(),

        phone:
          listingPhone
            .value
            .replace(/\s+/g, ""),

        description:
          listingDescription
            .value
            .trim(),

        ownerId:
          currentUser.uid,

        ownerEmail:
          currentUser.email || "",

        active: true,

        updatedAt:
          serverTimestamp()

      };


      const editingId =
        editingListingId.value;


      if (editingId) {

        await updateDoc(
          doc(
            db,
            "products",
            editingId
          ),
          listingData
        );


        showToast(
          "Listing updated successfully."
        );

      } else {

        listingData.createdAt =
          serverTimestamp();


        await addDoc(
          collection(
            db,
            "products"
          ),
          listingData
        );


        showToast(
          "Listing published successfully!"
        );

      }


      await loadListings();


      closeDialog(
        listingDialog
      );

    } catch (error) {

      console.error(error);

      showMessage(
        formMessage,
        "Could not save your listing. Please try again.",
        "error"
      );

    } finally {

      saveListingButton.disabled =
        false;

    }

  }
);


// ============================================
// DELETE LISTING
// ============================================

async function deleteListing(id) {

  if (!currentUser) return;


  const listing =
    allListings.find(
      item =>
        item.id === id
    );


  if (!listing) return;


  const allowed =
    listing.ownerId === currentUser.uid ||
    isAdmin();


  if (!allowed) {

    showToast(
      "You do not have permission to delete this listing."
    );

    return;

  }


  const confirmed =
    window.confirm(
      "Are you sure you want to delete this listing?"
    );


  if (!confirmed) return;


  try {

    await deleteDoc(
      doc(
        db,
        "products",
        id
      )
    );


    await loadListings();

    showToast(
      "Listing deleted."
    );

  } catch (error) {

    console.error(error);

    showToast(
      "Could not delete the listing."
    );

  }

}


// ============================================
// LOAD LISTINGS
// ============================================

async function loadListings() {

  try {

    resultsCount.textContent =
      "Loading listings…";


    const snapshot =
      await getDocs(
        collection(
          db,
          "products"
        )
      );


    allListings =
      snapshot.docs
        .map(
          document => ({
            id: document.id,
            ...document.data()
          })
        )
        .filter(
          listing =>
            listing.active !== false
        );


    renderListings();

  } catch (error) {

    console.error(
      "Error loading listings:",
      error
    );


    resultsCount.textContent =
      "Could not load listings.";

    listingGrid.innerHTML = "";

  }

}


// ============================================
// FILTER & RENDER LISTINGS
// ============================================

function getFilteredListings() {

  let listings =
    [...allListings];


  // SEARCH

  if (activeSearch) {

    const search =
      activeSearch.toLowerCase();


    listings =
      listings.filter(
        listing => {

          const text = [

            listing.title,
            listing.category,
            listing.description,
            listing.seller,
            listing.state,
            listing.town

          ]
            .join(" ")
            .toLowerCase();


          return text.includes(
            search
          );

        }
      );

  }


  // CATEGORY

  if (activeCategory) {

    listings =
      listings.filter(
        listing =>
          listing.category ===
          activeCategory
      );

  }


  // LOCATION

  if (activeLocation) {

    listings =
      listings.filter(
        listing =>
          listing.state ===
          activeLocation
      );

  }


  // SORT

  if (activeSort === "price-low") {

    listings.sort(
      (a, b) =>
        Number(a.price || 0) -
        Number(b.price || 0)
    );

  } else if (
    activeSort === "price-high"
  ) {

    listings.sort(
      (a, b) =>
        Number(b.price || 0) -
        Number(a.price || 0)
    );

  } else {

    listings.sort(
      (a, b) => {

        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;

      }
    );

  }


  return listings;

}


function renderListings() {

  const listings =
    getFilteredListings();


  resultsCount.textContent =
    `${listings.length} ${
      listings.length === 1
        ? "listing"
        : "listings"
    } found`;


  listingGrid.innerHTML = "";


  if (!listings.length) {

    emptyState.classList.remove(
      "hidden"
    );

    return;

  }


  emptyState.classList.add(
    "hidden"
  );


  listingGrid.innerHTML =
    listings
      .map(
        listingCardHTML
      )
      .join("");


  attachListingCardEvents();

}


function getCategoryEmoji(category) {

  const emojis = {

    Eggs: "🥚",

    Layers: "🐔",

    Broilers: "🍗",

    Chicks: "🐣",

    Feed: "🌾",

    Equipment: "🧰"

  };

  return emojis[category] || "🐔";

}


function listingCardHTML(listing) {

  const inCart =
    cart.some(
      item =>
        item.id === listing.id
    );


  return `

    <article
      class="listing-card"
    >

      <button
        class="listing-card-main"
        type="button"
        data-view-listing="${listing.id}"
      >

        <div
          class="listing-image"
        >

          <span>
            ${getCategoryEmoji(listing.category)}
          </span>

        </div>


        <div
          class="listing-card-body"
        >

          <span
            class="listing-category"
          >
            ${escapeHTML(listing.category || "Product")}
          </span>


          <h3>
            ${escapeHTML(listing.title)}
          </h3>


          <p
            class="listing-location"
          >
            📍
            ${escapeHTML(listing.town || "")},
            ${escapeHTML(listing.state || "")}
          </p>


          <div
            class="listing-price"
          >

            <strong>
              ${formatPrice(listing.price)}
            </strong>

            <small>
              ${escapeHTML(listing.unit || "")}
            </small>

          </div>

        </div>

      </button>


      <div
        class="listing-card-actions"
      >

        <button
          class="btn btn-outline"
          type="button"
          data-add-cart="${listing.id}"
        >
          ${
            inCart
              ? "In cart ✓"
              : "Add to cart"
          }
        </button>


        <button
          class="btn btn-primary"
          type="button"
          data-contact-seller="${listing.id}"
        >
          Contact
        </button>

      </div>

    </article>

  `;

}


function attachListingCardEvents() {

  document
    .querySelectorAll(
      "[data-view-listing]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const listing =
              allListings.find(
                item =>
                  item.id ===
                  button.dataset.viewListing
              );

            if (listing) {

              openListingDetails(
                listing
              );

            }

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-add-cart]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.addCart;

            addToCart(id);

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-contact-seller]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const listing =
              allListings.find(
                item =>
                  item.id ===
                  button.dataset.contactSeller
              );

            if (listing) {

              contactSeller(
                listing
              );

            }

          }
        );

      }
    );

}


// ============================================
// LISTING DETAILS
// ============================================

function openListingDetails(
  listing
) {

  const canEdit =
    currentUser &&
    (
      listing.ownerId === currentUser.uid ||
      isAdmin()
    );


  detailContent.innerHTML = `

    <div
      class="modal-header"
    >

      <div>

        <span
          class="section-kicker"
        >
          ${escapeHTML(listing.category || "PRODUCT")}
        </span>


        <h2
          id="detailHeading"
        >
          ${escapeHTML(listing.title)}
        </h2>

      </div>


      <button
        class="modal-close"
        type="button"
        id="closeDetailDialog"
        aria-label="Close"
      >
        ×
      </button>

    </div>


    <div
      class="detail-product"
    >

      <div
        class="detail-image"
      >

        ${getCategoryEmoji(listing.category)}

      </div>


      <div
        class="detail-info"
      >

        <h3>
          ${formatPrice(listing.price)}
        </h3>


        <p>
          ${escapeHTML(listing.unit || "")}
        </p>


        <p>
          <strong>
            Quantity:
          </strong>

          ${escapeHTML(listing.quantity || "Not specified")}
        </p>


        <p>
          📍
          ${escapeHTML(listing.town || "")},
          ${escapeHTML(listing.state || "")}
        </p>


        <p>
          <strong>
            Seller:
          </strong>

          ${escapeHTML(listing.seller || "")}
        </p>


        <p>
          ${escapeHTML(
            listing.description ||
            "No additional description provided."
          )}
        </p>


        <div
          class="modal-actions"
        >

          <button
            class="btn btn-outline"
            type="button"
            id="detailAddCart"
          >
            Add to cart
          </button>


          <button
            class="btn btn-primary"
            type="button"
            id="detailContactSeller"
          >
            Contact seller ↗
          </button>


          ${
            canEdit
              ? `
                <button
                  class="btn btn-outline"
                  type="button"
                  id="detailEditListing"
                >
                  Edit
                </button>
              `
              : ""
          }

        </div>

      </div>

    </div>

  `;


  openDialog(
    detailDialog
  );


  $("closeDetailDialog")
    ?.addEventListener(
      "click",
      () => closeDialog(detailDialog)
    );


  $("detailAddCart")
    ?.addEventListener(
      "click",
      () => addToCart(listing.id)
    );


  $("detailContactSeller")
    ?.addEventListener(
      "click",
      () => contactSeller(listing)
    );


  $("detailEditListing")
    ?.addEventListener(
      "click",
      () => {

        closeDialog(
          detailDialog
        );

        openListingDialog(
          listing
        );

      }
    );

}


// ============================================
// WHATSAPP CONTACT
// ============================================

function contactSeller(
  listing
) {

  let phone =
    String(
      listing.phone || ""
    ).replace(/\D/g, "");


  if (!phone) {

    showToast(
      "This seller has not provided a contact number."
    );

    return;

  }


  // CONVERT NIGERIAN LOCAL FORMAT

  if (
    phone.startsWith("0")
  ) {

    phone =
      "234" +
      phone.substring(1);

  }


  const message =
    `Hello ${listing.seller || ""}, I found your listing "${listing.title}" on PoultryLink. Is it still available?`;


  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;


  window.open(
    url,
    "_blank",
    "noopener"
  );

}


// ============================================
// CART
// ============================================

function saveCart() {

  localStorage.setItem(
    "poultrylinkCart",
    JSON.stringify(cart)
  );

}


function addToCart(id) {

  const listing =
    allListings.find(
      item =>
        item.id === id
    );


  if (!listing) {

    showToast(
      "This listing is no longer available."
    );

    return;

  }


  const exists =
    cart.some(
      item =>
        item.id === id
    );


  if (exists) {

    showToast(
      "This item is already in your cart."
    );

    return;

  }


  cart.push({
    ...listing,
    cartQuantity: 1
  });


  saveCart();

  renderCart();

  renderListings();

  showToast(
    "Added to your cart."
  );

}


function removeFromCart(id) {

  cart =
    cart.filter(
      item =>
        item.id !== id
    );


  saveCart();

  renderCart();

  renderListings();

}


function renderCart() {

  if (!cartCount) return;


  cartCount.textContent =
    cart.length;


  if (!cartItems) return;


  if (!cart.length) {

    cartItems.innerHTML = "";

    cartEmpty.style.display =
      "block";

    cartSummary.style.display =
      "none";

    return;

  }


  cartEmpty.style.display =
    "none";

  cartSummary.style.display =
    "flex";


  cartItems.innerHTML =
    cart
      .map(
        item => `

          <article
            class="cart-item"
          >

            <div
              class="cart-item-icon"
            >
              ${getCategoryEmoji(item.category)}
            </div>


            <div
              class="cart-item-info"
            >

              <strong>
                ${escapeHTML(item.title)}
              </strong>


              <span>
                ${formatPrice(item.price)}
              </span>


              <small>
                ${escapeHTML(item.seller || "")}
              </small>

            </div>


            <button
              type="button"
              class="text-button"
              data-remove-cart="${item.id}"
            >
              Remove
            </button>

          </article>

        `
      )
      .join("");


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0),
      0
    );


  cartTotal.textContent =
    formatPrice(total);


  document
    .querySelectorAll(
      "[data-remove-cart]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            removeFromCart(
              button.dataset.removeCart
            );

          }
        );

      }
    );

}


// OPEN CART

cartButton?.addEventListener(
  "click",
  () => {

    renderCart();

    openDialog(
      cartDialog
    );

  }
);


// CONTACT SELLERS FROM CART

cartContactButton?.addEventListener(
  "click",
  () => {

    if (!cart.length) {

      showToast(
        "Your cart is empty."
      );

      return;

    }


    closeDialog(
      cartDialog
    );


    const sellers =
      [...new Set(
        cart
          .map(
            item => item.seller
          )
          .filter(Boolean)
      )];


    showToast(
      `Your cart contains products from ${sellers.length} seller(s). Open each listing to contact the seller.`
    );

  }
);


// ============================================
// SEARCH
// ============================================

searchForm?.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    activeSearch =
      searchInput.value.trim();

    activeCategory =
      categoryFilter.value;

    activeLocation =
      locationFilter.value;


    updateCategoryChips();

    renderListings();


    document
      .getElementById("marketplace")
      ?.scrollIntoView({
        behavior: "smooth"
      });

  }
);


// CATEGORY CHIPS

categoryChips
  ?.querySelectorAll(
    "[data-category]"
  )
  .forEach(
    chip => {

      chip.addEventListener(
        "click",
        () => {

          activeCategory =
            chip.dataset.category || "";

          categoryFilter.value =
            activeCategory;

          updateCategoryChips();

          renderListings();

        }
      );

    }
  );


function updateCategoryChips() {

  categoryChips
    ?.querySelectorAll(
      "[data-category]"
    )
    .forEach(
      chip => {

        chip.classList.toggle(
          "active",
          chip.dataset.category ===
          activeCategory
        );

      }
    );

}


// LOCATION FILTER

locationFilter?.addEventListener(
  "change",
  () => {

    activeLocation =
      locationFilter.value;

    renderListings();

  }
);


// CATEGORY SELECT

categoryFilter?.addEventListener(
  "change",
  () => {

    activeCategory =
      categoryFilter.value;

    updateCategoryChips();

    renderListings();

  }
);


// SORT

sortSelect?.addEventListener(
  "change",
  () => {

    activeSort =
      sortSelect.value;

    renderListings();

  }
);


// CLEAR FILTERS

function clearFilters() {

  activeSearch = "";
  activeCategory = "";
  activeLocation = "";
  activeSort = "newest";


  if (searchInput) {
    searchInput.value = "";
  }

  if (categoryFilter) {
    categoryFilter.value = "";
  }

  if (locationFilter) {
    locationFilter.value = "";
  }

  if (sortSelect) {
    sortSelect.value = "newest";
  }


  updateCategoryChips();

  renderListings();

}


clearFiltersButton?.addEventListener(
  "click",
  clearFilters
);

emptyClearButton?.addEventListener(
  "click",
  clearFilters
);


// ============================================
// ADMIN DASHBOARD
// ============================================

async function loadAdminDashboard() {

  if (!isAdmin()) {

    showToast(
      "Admin access only."
    );

    return;

  }


  try {

    adminApplications.innerHTML =
      "<p>Loading applications...</p>";


    const sellersSnapshot =
      await getDocs(
        collection(
          db,
          "sellers"
        )
      );


    const usersSnapshot =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    const productsSnapshot =
      await getDocs(
        collection(
          db,
          "products"
        )
      );


    const sellers =
      sellersSnapshot.docs.map(
        item => ({
          id: item.id,
          ...item.data()
        })
      );


    const pending =
      sellers.filter(
        seller =>
          seller.status ===
          "pending"
      );


    const activeProducts =
      productsSnapshot.docs.filter(
        item =>
          item.data().active !== false
      );


    pendingSellerCount.textContent =
      pending.length;

    totalUserCount.textContent =
      usersSnapshot.size;

    adminListingCount.textContent =
      activeProducts.length;


    renderAdminApplications(
      pending
    );

  } catch (error) {

    console.error(error);

    adminApplications.innerHTML =
      `
        <p>
          Could not load admin information.
        </p>
      `;

  }

}


function renderAdminApplications(
  applications
) {

  adminApplications.innerHTML = "";


  if (!applications.length) {

    adminApplicationsEmpty.style.display =
      "block";

    return;

  }


  adminApplicationsEmpty.style.display =
    "none";


  adminApplications.innerHTML =
    applications
      .map(
        application => `

          <article
            class="admin-application"
          >

            <div
              class="admin-application-info"
            >

              <h4>
                ${escapeHTML(
                  application.businessName ||
                  application.fullName ||
                  "Seller"
                )}
              </h4>


              <p>
                <strong>
                  ${escapeHTML(
                    application.fullName || ""
                  )}
                </strong>
              </p>


              <p>
                📍
                ${escapeHTML(
                  application.city || ""
                )},
                ${escapeHTML(
                  application.state || ""
                )}
              </p>


              <p>
                📞
                ${escapeHTML(
                  application.phone || ""
                )}
              </p>


              <p>
                ${escapeHTML(
                  application.products || ""
                )}
              </p>


              <p>
                ${escapeHTML(
                  application.description || ""
                )}
              </p>

            </div>


            <div
              class="admin-application-actions"
            >

              <button
                class="btn btn-primary"
                type="button"
                data-approve-seller="${application.id}"
              >
                Approve
              </button>


              <button
                class="btn btn-outline"
                type="button"
                data-reject-seller="${application.id}"
              >
                Reject
              </button>

            </div>

          </article>

        `
      )
      .join("");


  adminApplications
    .querySelectorAll(
      "[data-approve-seller]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            await approveSeller(
              button.dataset.approveSeller
            );

          }
        );

      }
    );


  adminApplications
    .querySelectorAll(
      "[data-reject-seller]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            await rejectSeller(
              button.dataset.rejectSeller
            );

          }
        );

      }
    );

}


// APPROVE SELLER

async function approveSeller(uid) {

  if (!isAdmin()) return;


  try {

    await updateDoc(
      doc(
        db,
        "sellers",
        uid
      ),
      {
        status:
          "approved",

        reviewedAt:
          serverTimestamp(),

        reviewedBy:
          currentUser.uid
      }
    );


    await setDoc(
      doc(
        db,
        "users",
        uid
      ),
      {
        role:
          "seller"
      },
      {
        merge: true
      }
    );


    showToast(
      "Seller approved successfully."
    );


    await loadAdminDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      "Could not approve seller."
    );

  }

}


// REJECT SELLER

async function rejectSeller(uid) {

  if (!isAdmin()) return;


  const confirmed =
    window.confirm(
      "Are you sure you want to reject this seller application?"
    );


  if (!confirmed) return;


  try {

    await updateDoc(
      doc(
        db,
        "sellers",
        uid
      ),
      {
        status:
          "rejected",

        reviewedAt:
          serverTimestamp(),

        reviewedBy:
          currentUser.uid
      }
    );


    await setDoc(
      doc(
        db,
        "users",
        uid
      ),
      {
        role:
          "buyer"
      },
      {
        merge: true
      }
    );


    showToast(
      "Seller application rejected."
    );


    await loadAdminDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      "Could not reject seller."
    );

  }

}


refreshAdminButton?.addEventListener(
  "click",
  loadAdminDashboard
);


// ============================================
// MOBILE MENU
// ============================================

menuButton?.addEventListener(
  "click",
  () => {

    const expanded =
      menuButton.getAttribute(
        "aria-expanded"
      ) === "true";


    menuButton.setAttribute(
      "aria-expanded",
      String(!expanded)
    );


    desktopNav?.classList.toggle(
      "mobile-open"
    );

  }
);


// ============================================
// FOOTER YEAR
// ============================================

if (year) {

  year.textContent =
    new Date().getFullYear();

}


// ============================================
// START APPLICATION
// ============================================

renderCart();

loadListings();