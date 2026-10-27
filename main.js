import { app, auth, db, storage } from "./firebase-config.js";

"use strict";

/*
 * POULTRYLINK
 * Nigeria's Poultry Marketplace
 *
 * Firebase Authentication + Cloud Firestore.
 *
 * No fabricated products, sellers, reviews, orders or messages.
 *
 * Security requirements:
 * - Never trust client-side prices or cart totals for order processing.
 * - Seller approval must be enforced by Firestore/backend rules.
 * - Order creation and stock reservation require trusted backend logic.
 * - Administrator privileges must never be inferred from an email address.
 */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  reload
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =========================================================
   1. FIREBASE CONFIGURATION
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDUBwgGHdhJ-v6kBE5Dn3O_FxF8EfPPfy4",
  authDomain: "poultrylink-2459a.firebaseapp.com",
  projectId: "poultrylink-2459a",
  storageBucket: "poultrylink-2459a.firebasestorage.app",
  messagingSenderId: "332920290687",
  appId: "1:332920290687:web:3e71c648817e1c07ba6e4"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


/* =========================================================
   2. APPLICATION CONSTANTS
========================================================= */

const CATEGORIES = [
  "Live Birds",
  "Eggs",
  "Feeds",
  "Equipment",
  "Day-Old Chicks",
  "Services"
];

const CART_STORAGE_KEY = "poultrylink_cart_v2";
const SAVED_STORAGE_KEY = "poultrylink_saved_v2";

const PRODUCT_QUERY_LIMIT = 150;

const DASHBOARD_TABS = {
  overview: {
    title: "Overview",
    description: "An overview of your POULTRYLINK account."
  },

  profile: {
    title: "Profile",
    description: "View and manage your personal information."
  },

  activity: {
    title: "Activity",
    description: "Review activity available for your account."
  },

  notifications: {
    title: "Notifications",
    description: "View notifications actually available to your account."
  },

  "buyer-orders": {
    title: "Buyer orders",
    description: "Review orders associated with your buyer account."
  },

  saved: {
    title: "Saved products",
    description: "Products you have saved for later."
  },

  cart: {
    title: "Shopping cart",
    description: "Review products you intend to purchase."
  },

  messages: {
    title: "Messages",
    description: "Marketplace conversations."
  },

  storefront: {
    title: "Storefront",
    description: "Manage your seller storefront."
  },

  listings: {
    title: "My listings",
    description: "Manage listings belonging to your seller account."
  },

  inventory: {
    title: "Inventory",
    description: "Manage product quantities and availability."
  },

  "seller-orders": {
    title: "Seller orders",
    description: "Orders associated with your seller account."
  },

  "seller-application": {
    title: "Seller application",
    description: "Apply to sell on POULTRYLINK or review your application status."
  },

  settings: {
    title: "Settings",
    description: "Manage available account settings."
  }
};


/* =========================================================
   3. APPLICATION STATE
========================================================= */

const state = {
  user: null,
  profile: null,
  seller: null,
  sellerApplication: null,

  products: [],
  productsLoading: true,
  productsError: false,

  search: "",
  category: "All",
  sort: "newest",

  saved: readSaved(),
  cart: readCart(),

  activePage: "home",
  activeDashboardTab: "overview",

  authReady: false,
  profileLoading: false,

  activeProductId: null,
  activeConversationId: null,
  activeStorefrontId: null
};


/* =========================================================
   4. GENERAL HELPERS
========================================================= */

function byId(id) {
  return document.getElementById(id);
}

function all(selector) {
  return document.querySelectorAll(selector);
}

function bind(id, eventName, callback) {
  const element = byId(id);

  if (element) {
    element.addEventListener(eventName, callback);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  let date;

  if (typeof value.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium"
  }).format(date);
}

function initials(name) {
  const parts = String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
}

function setText(id, value) {
  const element = byId(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function setValue(id, value) {
  const element = byId(id);

  if (element) {
    element.value = value ?? "";
  }
}

function showElement(id) {
  const element = byId(id);

  if (element) {
    element.hidden = false;
  }
}

function hideElement(id) {
  const element = byId(id);

  if (element) {
    element.hidden = true;
  }
}

function setMessage(id, message, type = "info") {
  const element = byId(id);

  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText || button.textContent;

    button.disabled = false;
  }
}


/* =========================================================
   5. LOCAL CART AND SAVED PRODUCTS
========================================================= */

function readSaved() {
  try {
    const value = JSON.parse(
      localStorage.getItem(SAVED_STORAGE_KEY) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readCart() {
  try {
    const value = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY) || "{}"
    );

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value;
  } catch {
    return {};
  }
}

function persistLocalState() {
  try {
    localStorage.setItem(
      SAVED_STORAGE_KEY,
      JSON.stringify(state.saved)
    );

    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(state.cart)
    );
  } catch (error) {
    console.error("Could not persist local shopping state.", error);

    toast(
      "Your browser could not save this change locally.",
      "error"
    );
  }
}

function cartQuantityTotal() {
  return Object.values(state.cart).reduce((total, item) => {
    return total + Math.max(0, Number(item.quantity) || 0);
  }, 0);
}

function cartSubtotal() {
  return Object.values(state.cart).reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Math.max(0, Number(item.quantity) || 0);

    return total + price * quantity;
  }, 0);
}

function updateCartBadge() {
  setText("cartCount", String(cartQuantityTotal()));
}

function updateSavedButton(productId) {
  const saved = state.saved.includes(productId);

  all(`[data-action="save"][data-id="${CSS.escape(productId)}"]`)
    .forEach(button => {
      button.textContent = saved ? "Saved" : "Save";
      button.setAttribute("aria-pressed", String(saved));
    });
}

function toggleSaved(productId) {
  const product = state.products.find(item => item.id === productId);

  if (!product) {
    toast(
      "This listing is no longer available. Refresh the marketplace.",
      "error"
    );

    return;
  }

  if (state.saved.includes(productId)) {
    state.saved = state.saved.filter(id => id !== productId);

    toast("Product removed from saved products.");
  } else {
    state.saved.push(productId);

    toast("Product saved.");
  }

  persistLocalState();
  updateSavedButton(productId);

  if (state.activeDashboardTab === "saved") {
    renderDashboardTab("saved");
  }
}

function addToCart(productId) {
  const product = state.products.find(item => item.id === productId);

  if (!product) {
    toast(
      "This listing is unavailable. Refresh the marketplace.",
      "error"
    );

    return;
  }

  if (product.status !== "active") {
    toast("This product is not currently available.", "error");
    return;
  }

  const currentQuantity = Number(state.cart[productId]?.quantity) || 0;

  state.cart[productId] = {
    productId,
    title: product.title,
    price: Number(product.price) || 0,
    unit: product.unit || "",
    imageUrl: Array.isArray(product.imageUrls)
      ? product.imageUrls[0] || ""
      : "",
    sellerId: product.sellerId,
    quantity: currentQuantity + 1
  };

  persistLocalState();
  updateCartBadge();

  toast("Product added to your cart.");

  if (byId("cartDialog")?.open) {
    renderCart();
  }
}

function changeCartQuantity(productId, change) {
  const item = state.cart[productId];

  if (!item) {
    return;
  }

  const newQuantity = Number(item.quantity) + change;

  if (newQuantity <= 0) {
    delete state.cart[productId];
  } else {
    item.quantity = newQuantity;
  }

  persistLocalState();
  updateCartBadge();
  renderCart();
}

function removeCartItem(productId) {
  delete state.cart[productId];

  persistLocalState();
  updateCartBadge();
  renderCart();

  toast("Product removed from cart.");
}


/* =========================================================
   6. TOAST FEEDBACK
========================================================= */

function toast(message, type = "success") {
  const container = byId("toastContainer");

  if (!container) {
    console.log(message);
    return;
  }

  const item = document.createElement("div");

  item.className = `toast ${type}`;
  item.setAttribute(
    "role",
    type === "error" ? "alert" : "status"
  );

  item.textContent = message;

  container.appendChild(item);

  window.setTimeout(() => {
    item.remove();
  }, 4500);
}


/* =========================================================
   7. AUTHENTICATION ERROR MESSAGES
========================================================= */

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
      "Choose a stronger password.",

    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",

    "auth/network-request-failed":
      "Network error. Check your internet connection.",

    "auth/operation-not-allowed":
      "Email/password sign-in is not enabled in Firebase Authentication.",

    "auth/unauthorized-domain":
      "This website domain is not authorised in Firebase Authentication.",

    "auth/invalid-api-key":
      "Firebase rejected the configured API key.",

    "permission-denied":
      "Your account does not have permission to perform this action."
  };

  return messages[error?.code] ||
    "The request could not be completed. Please try again.";
}


/* =========================================================
   8. MODAL MANAGEMENT
========================================================= */

function openModal(title, content) {
  const backdrop = byId("modalBackdrop");
  const titleElement = byId("modalTitle");
  const messageElement = byId("modalMessage");
  const contentElement = byId("modalContent");

  if (!backdrop || !contentElement) {
    toast("The dialog could not be opened.", "error");
    return;
  }

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (messageElement) {
    messageElement.textContent = "";
  }

  contentElement.innerHTML = content;

  backdrop.classList.add("is-open");
  backdrop.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  byId("mainModal")?.focus();
}

function closeModal() {
  const backdrop = byId("modalBackdrop");

  if (!backdrop) {
    return;
  }

  backdrop.classList.remove("is-open");
  backdrop.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");
}

function initModal() {
  bind("modalClose", "click", closeModal);

  byId("modalBackdrop")?.addEventListener("click", event => {
    if (event.target === byId("modalBackdrop")) {
      closeModal();
    }
  });
}

function openNativeDialog(id) {
  const dialog = byId(id);

  if (!dialog) {
    toast("This dialog is unavailable.", "error");
    return;
  }

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    toast(
      "Your browser does not support this dialog. Please update your browser.",
      "error"
    );
  }
}

function closeNativeDialog(id) {
  const dialog = byId(id);

  if (dialog?.open) {
    dialog.close();
  }
}

function initNativeDialogs() {
  all("[data-close-dialog]").forEach(button => {
    button.addEventListener("click", () => {
      closeNativeDialog(button.dataset.closeDialog);
    });
  });

  bind("productDetailsDialog", "click", event => {
    if (event.target === byId("productDetailsDialog")) {
      closeNativeDialog("productDetailsDialog");
    }
  });
}


/* =========================================================
   9. AUTHENTICATION DIALOGS
========================================================= */

function openRegister() {
  openModal(
    "Create your POULTRYLINK account",
    `
      <form id="registerForm">

        <div class="form-group">
          <label for="registerName">Full name</label>
          <input
            id="registerName"
            name="displayName"
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
            minlength="8"
            required
          >
        </div>

        <div class="form-group">
          <label for="registerPasswordConfirm">Confirm password</label>
          <input
            id="registerPasswordConfirm"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          >
        </div>

        <p
          id="registerMessage"
          class="form-message"
          role="status"
        ></p>

        <button
          class="button button-primary button-full"
          id="registerSubmit"
          type="submit"
        >
          Create account
        </button>

      </form>

      <p class="modal-note">
        Email verification is required before protected
        marketplace features can be used.
      </p>

      <button
        class="button button-outline button-full"
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

    const name = byId("registerName").value.trim();
    const email = byId("registerEmail").value.trim();
    const password = byId("registerPassword").value;
    const confirm = byId("registerPasswordConfirm").value;

    const button = byId("registerSubmit");

    if (name.length < 2) {
      setMessage(
        "registerMessage",
        "Enter your full name.",
        "error"
      );

      return;
    }

    if (password !== confirm) {
      setMessage(
        "registerMessage",
        "Your passwords do not match.",
        "error"
      );

      return;
    }

    setButtonLoading(button, true, "Creating account...");

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(credential.user, {
        displayName: name
      });

      /*
       * The profile document must comply with the published
       * Firestore rules. The user's email must be verified
       * before profile creation if your rules require it.
       */

      await sendEmailVerification(credential.user);

      await signOut(auth);

      closeModal();

      openModal(
        "Verify your email",
        `
          <p>
            Your authentication account has been created.
            Check your email for the verification link.
          </p>

          <p>
            After verifying your email, return here and sign in.
          </p>

          <button
            class="button button-primary button-full"
            id="verifiedLoginButton"
            type="button"
          >
            Go to sign in
          </button>
        `
      );

      bind("verifiedLoginButton", "click", openLogin);

    } catch (error) {
      console.error("Registration failed.", error);

      setMessage(
        "registerMessage",
        friendlyAuthError(error),
        "error"
      );

    } finally {
      setButtonLoading(
        byId("registerSubmit"),
        false
      );
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
            autocomplete="username"
            maxlength="254"
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

        <p
          id="loginMessage"
          class="form-message"
          role="alert"
        ></p>

        <button
          class="button button-primary button-full"
          id="loginSubmit"
          type="submit"
        >
          Sign in
        </button>

      </form>

      <button
        class="button button-outline button-full"
        id="forgotPasswordButton"
        type="button"
      >
        Forgot password?
      </button>

      <button
        class="button button-outline button-full"
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

    const email = byId("loginEmail").value.trim();
    const password = byId("loginPassword").value;

    const button = byId("loginSubmit");

    setButtonLoading(button, true, "Signing in...");

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      await reload(result.user);

      if (!result.user.emailVerified) {
        await signOut(auth);

        setMessage(
          "loginMessage",
          "Verify your email before signing in. Use the verification email sent when you registered.",
          "error"
        );

        return;
      }

      closeModal();

      toast("You are signed in.");

      /*
       * onAuthStateChanged handles the navigation, profile,
       * dashboard and account state.
       */

    } catch (error) {
      console.error("Sign-in failed.", error);

      setMessage(
        "loginMessage",
        friendlyAuthError(error),
        "error"
      );

    } finally {
      setButtonLoading(
        byId("loginSubmit"),
        false
      );
    }
  });
}

function openResetPassword() {
  openModal(
    "Reset your password",
    `
      <form id="resetPasswordForm">

        <div class="form-group">
          <label for="resetPasswordEmail">Email address</label>
          <input
            id="resetPasswordEmail"
            type="email"
            autocomplete="email"
            required
          >
        </div>

        <p
          id="resetPasswordMessage"
          class="form-message"
          role="status"
        ></p>

        <button
          type="submit"
          class="button button-primary button-full"
          id="resetPasswordSubmit"
        >
          Send password reset email
        </button>

      </form>
    `
  );

  bind("resetPasswordForm", "submit", async event => {
    event.preventDefault();

    const email = byId("resetPasswordEmail").value.trim();
    const button = byId("resetPasswordSubmit");

    setButtonLoading(button, true, "Sending...");

    try {
      await sendPasswordResetEmail(auth, email);

      setMessage(
        "resetPasswordMessage",
        "If an account exists for this address, a password reset email will be sent.",
        "success"
      );

    } catch (error) {
      console.error("Password reset failed.", error);

      setMessage(
        "resetPasswordMessage",
        friendlyAuthError(error),
        "error"
      );

    } finally {
      setButtonLoading(
        byId("resetPasswordSubmit"),
        false
      );
    }
  });
}


/* =========================================================
   10. USER PROFILE
========================================================= */

async function ensureProfile(user) {
  if (!user) {
    return null;
  }

  const profileReference = doc(db, "users", user.uid);
  const profileSnapshot = await getDoc(profileReference);

  if (profileSnapshot.exists()) {
    return {
      uid: user.uid,
      ...profileSnapshot.data()
    };
  }

  /*
   * Do not create the document until the email has been
   * verified, because the provided rules require verification.
   */

  if (!user.emailVerified) {
    return null;
  }

  const profile = {
    displayName: user.displayName || "",
    email: user.email || "",
    phone: "",
    location: "",
    createdAt: serverTimestamp()
  };

  await setDoc(profileReference, profile);

  return {
    uid: user.uid,
    displayName: profile.displayName,
    email: profile.email,
    phone: "",
    location: ""
  };
}

async function loadUserAccount(user) {
  if (!user) {
    state.profile = null;
    state.seller = null;
    state.sellerApplication = null;

    return;
  }

  state.profile = null;
  state.seller = null;
  state.sellerApplication = null;

  if (!user.emailVerified) {
    return;
  }

  try {
    const profileReference = doc(db, "users", user.uid);
    const profileSnapshot = await getDoc(profileReference);

    if (profileSnapshot.exists()) {
      state.profile = {
        uid: user.uid,
        ...profileSnapshot.data()
      };
    } else {
      state.profile = await ensureProfile(user);
    }
  } catch (error) {
    console.error("Could not load user profile.", error);

    toast(
      "Your authentication succeeded, but your profile could not be loaded. Check your Firestore rules.",
      "error"
    );
  }

  /*
   * Your current rules allow users to read their own seller
   * document. Seller creation and approval must be performed
   * by trusted administrator/backend operations.
   */

  try {
    const sellerSnapshot = await getDoc(
      doc(db, "sellers", user.uid)
    );

    if (sellerSnapshot.exists()) {
      state.seller = sellerSnapshot.data();
    }
  } catch (error) {
    console.warn("Seller record unavailable.", error);
  }

  try {
    const applicationSnapshot = await getDoc(
      doc(db, "sellerApplications", user.uid)
    );

    if (applicationSnapshot.exists()) {
      state.sellerApplication = applicationSnapshot.data();
    }
  } catch (error) {
    console.warn("Seller application unavailable.", error);
  }
}

function getDisplayName() {
  return (
    state.profile?.displayName ||
    state.user?.displayName ||
    state.user?.email?.split("@")[0] ||
    "User"
  );
}

function renderAuthenticationState() {
  const user = state.user;
  const signedIn = Boolean(user && user.emailVerified);

  const signedOutActions = byId("signedOutActions");
  const signedInActions = byId("signedInActions");

  if (signedOutActions) {
    signedOutActions.hidden = signedIn;
  }

  if (signedInActions) {
    signedInActions.hidden = !signedIn;
  }

  if (!signedIn) {
    setText("authenticationStatus", "You are signed out.");

    return;
  }

  const name = getDisplayName();
  const avatar = initials(name);

  setText("headerUserName", name);
  setText("dropdownUserName", name);
  setText("dropdownUserEmail", user.email || "");
  setText("headerAvatar", avatar);

  setText(
    "emailVerificationStatus",
    user.emailVerified ? "Email verified" : "Email not verified"
  );

  setText("authenticationStatus", `Signed in as ${name}.`);

  setText("profileDisplayName", name);
  setText("profileEmail", user.email || "");
  setText("profileAvatar", avatar);
  setText("profileEmailField", user.email || "");

  setText("dashboardWelcomeName", name);
  setText("dashboardUserName", name);
  setText("dashboardUserEmail", user.email || "");
  setText("dashboardAvatar", avatar);

  setText(
    "dashboardSignedInStatus",
    "Signed in"
  );

  setText(
    "dashboardUserType",
    state.seller?.verificationStatus === "approved"
      ? "Approved seller"
      : "Buyer account"
  );

  setText(
    "profileAccountStatus",
    "Email verified"
  );

  setText(
    "profileSellerStatus",
    state.seller
      ? `Seller: ${state.seller.verificationStatus || "pending"}`
      : "Not registered as a seller"
  );

  if (byId("profileSellerStatus")) {
    byId("profileSellerStatus").hidden = false;
  }

  setValue("profileName", state.profile?.displayName || name);
  setValue("profilePhone", state.profile?.phone || "");
  setValue("profileLocation", state.profile?.location || "");

  setValue(
    "profileAccountType",
    state.seller?.verificationStatus === "approved"
      ? "Approved seller"
      : "Buyer account"
  );
}

function openProfilePage() {
  if (!requireSignedIn()) {
    return;
  }

  navigateTo("profile");
}

async function saveProfile(event) {
  event.preventDefault();

  if (!requireSignedIn()) {
    return;
  }

  const name = byId("profileName").value.trim();
  const phone = byId("profilePhone").value.trim();
  const location = byId("profileLocation").value.trim();

  if (name.length < 2 || name.length > 100) {
    setMessage(
      "profileFormMessage",
      "Enter a name between 2 and 100 characters.",
      "error"
    );

    return;
  }

  const button = byId("saveProfileButton");

  setButtonLoading(button, true, "Saving profile...");

  try {
    const reference = doc(db, "users", state.user.uid);

    await updateDoc(reference, {
      displayName: name,
      phone,
      location
    });

    await updateProfile(state.user, {
      displayName: name
    });

    state.profile = {
      ...(state.profile || {}),
      displayName: name,
      phone,
      location,
      email: state.user.email
    };

    renderAuthenticationState();

    setMessage(
      "profileFormMessage",
      "Your profile has been updated.",
      "success"
    );

    toast("Profile updated.");

  } catch (error) {
    console.error("Profile update failed.", error);

    setMessage(
      "profileFormMessage",
      friendlyAuthError(error),
      "error"
    );

  } finally {
    setButtonLoading(
      byId("saveProfileButton"),
      false
    );
  }
}

async function resendVerification() {
  if (!state.user) {
    openLogin();
    return;
  }

  try {
    await sendEmailVerification(state.user);

    toast("Verification email sent.");

  } catch (error) {
    console.error(error);

    toast(friendlyAuthError(error), "error");
  }
}

async function resetCurrentUserPassword() {
  if (!state.user?.email) {
    toast("No email address is available for this account.", "error");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, state.user.email);

    toast("If the account exists, a password reset email will arrive shortly.");

  } catch (error) {
    console.error(error);

    toast(friendlyAuthError(error), "error");
  }
}


/* =========================================================
   11. SIGN OUT
========================================================= */

async function performSignOut() {
  try {
    await signOut(auth);

    closeModal();

    toast("You have signed out.");

    navigateTo("home");

  } catch (error) {
    console.error("Sign-out failed.", error);

    toast(
      "Sign-out failed. Please try again.",
      "error"
    );
  }
}


/* =========================================================
   12. PAGE NAVIGATION
========================================================= */

function hideAllPages() {
  [
    "profile",
    "dashboard",
    "storefrontPage"
  ].forEach(id => {
    const element = byId(id);

    if (element) {
      element.hidden = true;
    }
  });

  [
    "home",
    "categories",
    "marketplace",
    "sellers",
    "how-it-works",
    "sell-on-poultrylink",
    "safety"
  ].forEach(id => {
    const element = byId(id);

    if (element) {
      element.hidden = false;
    }
  });
}

function navigateTo(page, options = {}) {
  const requiresAuth = [
    "profile",
    "dashboard"
  ].includes(page);

  if (requiresAuth && !requireSignedIn()) {
    return;
  }

  hideAllPages();

  state.activePage = page;

  if (page === "profile") {
    hideHomeSections();
    showElement("profile");

    renderAuthenticationState();

    window.location.hash = "profile";
  } else if (page === "dashboard") {
    hideHomeSections();
    showElement("dashboard");

    renderAuthenticationState();

    renderDashboardTab(
      options.tab || state.activeDashboardTab || "overview"
    );

    window.location.hash = "dashboard";
  } else if (page === "storefront") {
    hideHomeSections();
    showElement("storefrontPage");

    window.location.hash = "storefront";
  } else {
    showHomeSections();

    window.location.hash = "home";

    if (page === "marketplace") {
      byId("marketplace")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  closeAccountDropdown();
}

function hideHomeSections() {
  [
    "home",
    "categories",
    "marketplace",
    "sellers",
    "how-it-works",
    "sell-on-poultrylink",
    "safety"
  ].forEach(id => {
    const element = byId(id);

    if (element) {
      element.hidden = true;
    }
  });
}

function showHomeSections() {
  [
    "home",
    "categories",
    "marketplace",
    "sellers",
    "how-it-works",
    "sell-on-poultrylink",
    "safety"
  ].forEach(id => {
    const element = byId(id);

    if (element) {
      element.hidden = false;
    }
  });

  hideElement("profile");
  hideElement("dashboard");
  hideElement("storefrontPage");
}

function initPageNavigation() {
  all("[data-page]").forEach(element => {
    element.addEventListener("click", () => {
      const page = element.dataset.page;

      if (page === "marketplace") {
        navigateTo("marketplace");
      } else if (page === "home") {
        navigateTo("home");
      } else if (page === "profile") {
        navigateTo("profile");
      } else if (page === "dashboard") {
        navigateTo("dashboard");
      } else if (page === "storefront") {
        navigateTo("storefront");
      }
    });
  });

  all("[data-dashboard-tab]").forEach(element => {
    element.addEventListener("click", () => {
      navigateTo("dashboard", {
        tab: element.dataset.dashboardTab
      });
    });
  });
}


/* =========================================================
   13. ACCOUNT DROPDOWN
========================================================= */

function closeAccountDropdown() {
  const dropdown = byId("accountDropdown");
  const button = byId("accountMenuButton");

  if (dropdown) {
    dropdown.hidden = true;
  }

  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
}

function initAccountDropdown() {
  bind("accountMenuButton", "click", () => {
    const dropdown = byId("accountDropdown");
    const button = byId("accountMenuButton");

    if (!dropdown || !button) {
      return;
    }

    const open = dropdown.hidden;

    dropdown.hidden = !open;

    button.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", event => {
    const actions = byId("signedInActions");

    if (actions && !actions.contains(event.target)) {
      closeAccountDropdown();
    }
  });
}


/* =========================================================
   14. FIRESTORE MARKETPLACE
========================================================= */

async function loadProducts() {
  state.productsLoading = true;
  state.productsError = false;

  const grid = byId("productGrid");

  if (grid) {
    grid.setAttribute("aria-busy", "true");

    grid.innerHTML = `
      <div class="loading-state">
        Loading marketplace listings...
      </div>
    `;
  }

  try {
    /*
     * Firestore rules do not automatically filter query results.
     * Query only active listings, as required by the existing
     * marketplace rules.
     */

    const productQuery = query(
      collection(db, "products"),
      where("status", "==", "active"),
      limit(PRODUCT_QUERY_LIMIT)
    );

    const snapshot = await getDocs(productQuery);

    state.products = snapshot.docs.map(documentSnapshot => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));

    state.productsLoading = false;

    renderProducts();

  } catch (error) {
    console.error("Marketplace loading failed.", error);

    state.productsLoading = false;
    state.productsError = true;

    if (grid) {
      grid.setAttribute("aria-busy", "false");

      grid.innerHTML = `
        <div class="empty-state">
          <h3>Marketplace could not be loaded</h3>
          <p>
            Check your internet connection, Firebase configuration,
            Firestore database and published security rules.
          </p>
          <button
            type="button"
            class="button button-outline"
            id="retryProductsButton"
          >
            Try again
          </button>
        </div>
      `;

      bind("retryProductsButton", "click", loadProducts);
    }

    setText("productCount", "Listings could not be loaded.");
  }
}

function filteredProducts() {
  let products = [...state.products];

  const search = state.search.trim().toLowerCase();

  if (search) {
    products = products.filter(product => {
      const searchable = [
        product.title,
        product.description,
        product.category,
        product.location,
        product.unit
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  }

  if (state.category !== "All") {
    products = products.filter(product => {
      return product.category === state.category;
    });
  }

  if (state.sort === "price-low") {
    products.sort((a, b) => {
      return Number(a.price || 0) - Number(b.price || 0);
    });
  } else if (state.sort === "price-high") {
    products.sort((a, b) => {
      return Number(b.price || 0) - Number(a.price || 0);
    });
  } else if (state.sort === "name") {
    products.sort((a, b) => {
      return String(a.title || "").localeCompare(
        String(b.title || "")
      );
    });
  } else {
    products.sort((a, b) => {
      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });
  }

  return products;
}

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function renderProducts() {
  const grid = byId("productGrid");

  if (!grid) {
    return;
  }

  grid.setAttribute("aria-busy", "false");

  if (state.productsLoading) {
    grid.innerHTML = `
      <div class="loading-state">
        Loading marketplace listings...
      </div>
    `;

    return;
  }

  if (state.productsError) {
    return;
  }

  const products = filteredProducts();

  setText(
    "productCount",
    `${products.length} product${products.length === 1 ? "" : "s"} found`
  );

  const empty = byId("marketplaceEmptyState");

  if (empty) {
    empty.hidden = products.length !== 0;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No matching products</h3>
        <p>
          No real listings match your current search and filters.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML = products.map(productCardHTML).join("");

  products.forEach(product => {
    updateSavedButton(product.id);
  });
}

function productCardHTML(product) {
  const id = escapeHTML(product.id);
  const title = escapeHTML(product.title || "Untitled listing");
  const description = escapeHTML(product.description || "");
  const category = escapeHTML(product.category || "");
  const location = escapeHTML(product.location || "Location not provided");
  const unit = escapeHTML(product.unit || "");
  const price = formatNaira(product.price);

  const imageUrl = safeImageUrl(
    Array.isArray(product.imageUrls)
      ? product.imageUrls[0]
      : ""
  );

  const imageHTML = imageUrl
    ? `
      <img
        src="${escapeHTML(imageUrl)}"
        alt="${title}"
        loading="lazy"
        referrerpolicy="no-referrer"
      >
    `
    : `
      <div class="product-image-placeholder">
        <span aria-hidden="true">🐔</span>
        <span>No product image</span>
      </div>
    `;

  const saved = state.saved.includes(product.id);

  return `
    <article class="product-card" data-product-card="${id}">

      <div class="product-card-image">

        ${imageHTML}

        <span class="product-category-badge">
          ${category}
        </span>

      </div>

      <div class="product-card-content">

        <h3>${title}</h3>

        <p class="product-description">
          ${description.slice(0, 150)}
          ${description.length > 150 ? "…" : ""}
        </p>

        <p class="product-location">
          <span aria-hidden="true">📍</span>
          ${location}
        </p>

        <div class="product-price-row">

          <strong class="product-price">
            ${price}
          </strong>

          <span class="product-unit">
            ${unit ? `per ${unit}` : ""}
          </span>

        </div>

        <div class="product-card-actions">

          <button
            type="button"
            class="button button-primary"
            data-action="details"
            data-id="${id}"
          >
            View details
          </button>

          <button
            type="button"
            class="button button-outline"
            data-action="cart"
            data-id="${id}"
            aria-label="Add ${title} to cart"
          >
            Add to cart
          </button>

        </div>

        <button
          type="button"
          class="product-save-button"
          data-action="save"
          data-id="${id}"
          aria-pressed="${saved}"
        >
          ${saved ? "Saved" : "Save for later"}
        </button>

      </div>

    </article>
  `;
}

function safeImageUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}


/* =========================================================
   15. PRODUCT DETAILS
========================================================= */

function showProductDetails(productId) {
  const product = state.products.find(item => item.id === productId);

  if (!product) {
    toast("This product is no longer available.", "error");
    return;
  }

  state.activeProductId = productId;

  const content = byId("productDetailsContent");

  if (!content) {
    return;
  }

  const imageUrl = safeImageUrl(
    Array.isArray(product.imageUrls)
      ? product.imageUrls[0]
      : ""
  );

  const imageHTML = imageUrl
    ? `
      <img
        class="product-detail-image"
        src="${escapeHTML(imageUrl)}"
        alt="${escapeHTML(product.title || "Product")}"
      >
    `
    : `
      <div class="product-image-placeholder">
        No product image available
      </div>
    `;

  content.innerHTML = `
    <div class="product-detail-layout">

      ${imageHTML}

      <div class="product-detail-information">

        <span class="product-category-badge">
          ${escapeHTML(product.category || "")}
        </span>

        <h3>${escapeHTML(product.title || "Untitled listing")}</h3>

        <p class="product-detail-price">
          ${formatNaira(product.price)}
          ${product.unit ? `per ${escapeHTML(product.unit)}` : ""}
        </p>

        <p>
          ${escapeHTML(product.description || "No description provided.")}
        </p>

        <p>
          <strong>Location:</strong>
          ${escapeHTML(product.location || "Not provided")}
        </p>

        <p>
          <strong>Availability:</strong>
          ${escapeHTML(product.status || "Unknown")}
        </p>

        <div class="dialog-actions">

          <button
            type="button"
            class="button button-primary"
            id="detailAddToCartButton"
          >
            Add to cart
          </button>

          <button
            type="button"
            class="button button-outline"
            id="detailSaveButton"
          >
            ${state.saved.includes(productId) ? "Remove saved item" : "Save product"}
          </button>

          <button
            type="button"
            class="button button-outline"
            id="detailContactButton"
          >
            Contact seller
          </button>

        </div>

        <p class="form-help">
          Product information is supplied by the listing.
          Confirm availability, quantity, seller details and
          transaction terms before proceeding.
        </p>

      </div>

    </div>
  `;

  setText("productDetailsTitle", product.title || "Product details");

  bind("detailAddToCartButton", "click", () => {
    addToCart(productId);
  });

  bind("detailSaveButton", "click", () => {
    toggleSaved(productId);
    showProductDetails(productId);
  });

  bind("detailContactButton", "click", () => {
    openContactSeller(productId);
  });

  openNativeDialog("productDetailsDialog");
}

function openContactSeller(productId) {
  const product = state.products.find(item => item.id === productId);

  if (!product) {
    toast("Product unavailable.", "error");
    return;
  }

  if (!requireSignedIn()) {
    return;
  }

  /*
   * Do not claim a message was delivered. The supplied schema
   * does not contain a secured conversation/message backend.
   */

  openModal(
    "Contact seller",
    `
      <p>
        You selected
        <strong>${escapeHTML(product.title)}</strong>.
      </p>

      <p>
        <strong>Location:</strong>
        ${escapeHTML(product.location || "Not provided")}
      </p>

      <p>
        In-platform message delivery is not connected yet.
        No message has been sent.
      </p>

      <p>
        A real messaging feature requires secured conversation
        and message collections with appropriate access rules.
      </p>

      <button
        class="button button-primary button-full"
        id="closeContactModal"
        type="button"
      >
        Close
      </button>
    `
  );

  bind("closeContactModal", "click", closeModal);
}


/* =========================================================
   16. PRODUCT EVENT HANDLERS AND SEARCH
========================================================= */

function initMarketplaceActions() {
  byId("productGrid")?.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const productId = button.dataset.id;

    if (!productId) {
      return;
    }

    switch (button.dataset.action) {
      case "details":
        showProductDetails(productId);
        break;

      case "save":
        toggleSaved(productId);
        break;

      case "cart":
        addToCart(productId);
        break;

      default:
        break;
    }
  });

  bind("searchForm", "submit", event => {
    event.preventDefault();

    state.search = byId("searchInput")?.value || "";

    renderProducts();

    byId("marketplace")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  bind("searchInput", "input", event => {
    state.search = event.target.value || "";
    renderProducts();
  });

  bind("categoryFilter", "change", event => {
    state.category = event.target.value || "All";

    updateCategoryButtons();
    renderProducts();
  });

  bind("sortFilter", "change", event => {
    state.sort = event.target.value || "newest";
    renderProducts();
  });

  bind("clearFiltersButton", "click", clearFilters);
  bind("emptyStateClearButton", "click", clearFilters);

  all(".category-card").forEach(button => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category || "All";

      setValue("categoryFilter", state.category);

      updateCategoryButtons();
      renderProducts();

      byId("marketplace")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

function updateCategoryButtons() {
  all(".category-card").forEach(button => {
    const active = button.dataset.category === state.category;

    button.classList.toggle("active", active);

    button.setAttribute(
      "aria-pressed",
      String(active)
    );
  });
}

function clearFilters() {
  state.search = "";
  state.category = "All";
  state.sort = "newest";

  setValue("searchInput", "");
  setValue("categoryFilter", "All");
  setValue("sortFilter", "newest");

  updateCategoryButtons();
  renderProducts();
}


/* =========================================================
   17. SHOPPING CART DIALOG
========================================================= */

function openCart() {
  renderCart();
  openNativeDialog("cartDialog");
}

function renderCart() {
  const container = byId("cartItems");

  if (!container) {
    return;
  }

  const entries = Object.values(state.cart);

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state">

        <h3>Your cart is empty</h3>

        <p>
          Browse the marketplace and add products to your cart.
        </p>

        <button
          type="button"
          class="button button-primary"
          id="cartBrowseButton"
        >
          Browse products
        </button>

      </div>
    `;

    bind("cartBrowseButton", "click", () => {
      closeNativeDialog("cartDialog");

      navigateTo("marketplace");
    });

  } else {
    container.innerHTML = entries.map(item => {
      const product = state.products.find(
        productItem => productItem.id === item.productId
      );

      const title = product?.title || item.title || "Product";
      const price = Number(product?.price ?? item.price) || 0;
      const quantity = Number(item.quantity) || 0;

      const imageUrl = safeImageUrl(
        product?.imageUrls?.[0] || item.imageUrl || ""
      );

      const imageHTML = imageUrl
        ? `
          <img
            src="${escapeHTML(imageUrl)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
          >
        `
        : `
          <div class="cart-item-placeholder">
            🐔
          </div>
        `;

      return `
        <article class="cart-item">

          ${imageHTML}

          <div class="cart-item-information">

            <h3>${escapeHTML(title)}</h3>

            <p>${formatNaira(price)} per ${escapeHTML(item.unit || "unit")}</p>

            <p>
              Subtotal:
              <strong>${formatNaira(price * quantity)}</strong>
            </p>

            <div class="cart-quantity-controls">

              <button
                type="button"
                data-cart-action="decrease"
                data-id="${escapeHTML(item.productId)}"
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span>${quantity}</span>

              <button
                type="button"
                data-cart-action="increase"
                data-id="${escapeHTML(item.productId)}"
                aria-label="Increase quantity"
              >
                +
              </button>

              <button
                type="button"
                data-cart-action="remove"
                data-id="${escapeHTML(item.productId)}"
              >
                Remove
              </button>

            </div>

          </div>

        </article>
      `;
    }).join("");
  }

  setText("cartSubtotal", formatNaira(cartSubtotal()));
  setText("cartTotal", formatNaira(cartSubtotal()));
  setText("cartDelivery", "To be agreed");

  updateCartBadge();

  container.querySelectorAll("[data-cart-action]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.cartAction;

      if (action === "increase") {
        changeCartQuantity(id, 1);
      } else if (action === "decrease") {
        changeCartQuantity(id, -1);
      } else if (action === "remove") {
        removeCartItem(id);
      }
    });
  });
}


/* =========================================================
   18. CHECKOUT SAFETY
========================================================= */

function startCheckout() {
  if (!requireSignedIn()) {
    return;
  }

  if (Object.keys(state.cart).length === 0) {
    toast("Your cart is empty.", "error");
    return;
  }

  /*
   * Checkout is deliberately blocked until a trusted backend
   * validates prices, seller ownership, product availability,
   * inventory and order totals.
   *
   * A browser form must never create a trusted order simply
   * because the customer submits it.
   */

  openModal(
    "Checkout is not yet connected",
    `
      <p>
        Your cart is available for review, but this website
        is not yet connected to the secure order-processing
        backend required to submit real orders.
      </p>

      <p>
        To activate checkout, the backend must validate current
        product prices, stock, seller status, buyer details and
        order totals before creating order records.
      </p>

      <p>
        No order has been placed, and no payment has been taken.
      </p>

      <button
        type="button"
        class="button button-primary button-full"
        id="checkoutBackToCart"
      >
        Return to cart
      </button>
    `
  );

  bind("checkoutBackToCart", "click", () => {
    closeModal();
    renderCart();
    openNativeDialog("cartDialog");
  });
}


/* =========================================================
   19. DASHBOARD NAVIGATION
========================================================= */

function renderDashboardTab(tabName) {
  if (!DASHBOARD_TABS[tabName]) {
    tabName = "overview";
  }

  state.activeDashboardTab = tabName;

  const details = DASHBOARD_TABS[tabName];

  setText("dashboardSectionTitle", details.title);
  setText("dashboardSectionDescription", details.description);

  all(".dashboard-nav-item[data-tab]").forEach(button => {
    const active = button.dataset.tab === tabName;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  renderDashboardContent(tabName);
}

function renderDashboardContent(tabName) {
  const container = byId("dashboardContent");

  if (!container) {
    return;
  }

  switch (tabName) {
    case "overview":
      renderDashboardOverview(container);
      break;

    case "profile":
      renderDashboardProfile(container);
      break;

    case "activity":
      renderActivity(container);
      break;

    case "notifications":
      renderNotifications(container);
      break;

    case "buyer-orders":
      renderBuyerOrders(container);
      break;

    case "saved":
      renderSavedProducts(container);
      break;

    case "cart":
      renderDashboardCart(container);
      break;

    case "messages":
      renderMessages(container);
      break;

    case "storefront":
      renderStorefrontManagement(container);
      break;

    case "listings":
      renderSellerListings(container);
      break;

    case "inventory":
      renderInventory(container);
      break;

    case "seller-orders":
      renderSellerOrders(container);
      break;

    case "seller-application":
      renderSellerApplication(container);
      break;

    case "settings":
      renderSettings(container);
      break;

    default:
      container.innerHTML = `
        <div class="empty-state">
          <h3>Section unavailable</h3>
          <p>This dashboard section could not be opened.</p>
        </div>
      `;
  }
}

function renderDashboardOverview(container) {
  const name = escapeHTML(getDisplayName());

  const approvedSeller =
    state.seller?.verificationStatus === "approved" &&
    state.seller?.accountStatus === "active";

  container.innerHTML = `
    <div class="dashboard-welcome-card">

      <span class="eyebrow">YOUR ACCOUNT</span>

      <h3>Welcome, ${name}</h3>

      <p>
        Your POULTRYLINK account is signed in.
        Choose a dashboard section to continue.
      </p>

      <p>
        <strong>Email:</strong>
        ${escapeHTML(state.user.email || "")}
      </p>

      <p>
        <strong>Seller status:</strong>
        ${approvedSeller ? "Approved and active" : "Not approved as an active seller"}
      </p>

      <button
        type="button"
        class="button button-primary"
        data-dashboard-action="profile"
      >
        View my profile
      </button>

    </div>

    <div class="dashboard-summary-grid">

      <article class="dashboard-summary-card">
        <span>Saved products</span>
        <strong>${state.saved.length}</strong>
      </article>

      <article class="dashboard-summary-card">
        <span>Cart items</span>
        <strong>${cartQuantityTotal()}</strong>
      </article>

      <article class="dashboard-summary-card">
        <span>Cart subtotal</span>
        <strong>${formatNaira(cartSubtotal())}</strong>
      </article>

    </div>

    <div class="dashboard-information-card">

      <h3>Marketplace activity</h3>

      <p>
        Order history, notifications, and messaging will show
        actual records when their secured backend features
        are implemented.
      </p>

      <p>
        This dashboard does not invent activity or display
        sample transactions.
      </p>

    </div>
  `;

  container.querySelectorAll("[data-dashboard-action]").forEach(button => {
    button.addEventListener("click", () => {
      renderDashboardTab(button.dataset.dashboardAction);
    });
  });
}

function renderDashboardProfile(container) {
  const name = escapeHTML(state.profile?.displayName || getDisplayName());

  container.innerHTML = `
    <div class="dashboard-information-card">

      <h3>Personal information</h3>

      <p>
        Your editable profile is available on the dedicated
        profile page.
      </p>

      <p>
        <strong>Name:</strong> ${name}
      </p>

      <p>
        <strong>Email:</strong>
        ${escapeHTML(state.user.email || "")}
      </p>

      <p>
        <strong>Phone:</strong>
        ${escapeHTML(state.profile?.phone || "Not provided")}
      </p>

      <p>
        <strong>Location:</strong>
        ${escapeHTML(state.profile?.location || "Not provided")}
      </p>

      <button
        type="button"
        class="button button-primary"
        data-dashboard-action="open-profile"
      >
        Edit profile
      </button>

    </div>
  `;

  container.querySelector("[data-dashboard-action]")?.addEventListener(
    "click",
    () => navigateTo("profile")
  );
}

function renderActivity(container) {
  container.innerHTML = `
    <div class="empty-state">

      <h3>No activity records available</h3>

      <p>
        There is no activity history connected to this dashboard
        yet. This page will need a persistent activity collection
        and secure event recording to display real activity.
      </p>

    </div>
  `;
}

function renderNotifications(container) {
  container.innerHTML = `
    <div class="empty-state">

      <h3>Notifications are not connected</h3>

      <p>
        Notifications will appear here once a secured
        notification collection and notification-generation
        backend are implemented.
      </p>

      <p>
        No sample or fabricated notifications are displayed.
      </p>

    </div>
  `;
}

function renderBuyerOrders(container) {
  container.innerHTML = `
    <div class="empty-state">

      <h3>Order history is not connected</h3>

      <p>
        Buyer orders require a secured order collection and
        trusted order-creation backend. No orders have been
        fabricated for this account.
      </p>

    </div>
  `;
}

function renderSavedProducts(container) {
  const products = state.saved
    .map(id => state.products.find(product => product.id === id))
    .filter(Boolean);

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">

        <h3>No saved products</h3>

        <p>
          Save a product from the marketplace to find it here.
        </p>

        <button
          type="button"
          class="button button-primary"
          data-dashboard-action="browse"
        >
          Browse marketplace
        </button>

      </div>
    `;

    container.querySelector("[data-dashboard-action]")?.addEventListener(
      "click",
      () => navigateTo("marketplace")
    );

    return;
  }

  container.innerHTML = `
    <div class="dashboard-saved-list">

      ${products.map(product => `
        <article class="dashboard-saved-item">

          <div>
            <h3>${escapeHTML(product.title || "Product")}</h3>

            <p>${formatNaira(product.price)}</p>

            <p>${escapeHTML(product.location || "Location not provided")}</p>
          </div>

          <div class="dashboard-item-actions">

            <button
              type="button"
              class="button button-primary"
              data-saved-view="${escapeHTML(product.id)}"
            >
              View
            </button>

            <button
              type="button"
              class="button button-outline"
              data-saved-remove="${escapeHTML(product.id)}"
            >
              Remove
            </button>

          </div>

        </article>
      `).join("")}

    </div>
  `;

  container.querySelectorAll("[data-saved-view]").forEach(button => {
    button.addEventListener("click", () => {
      showProductDetails(button.dataset.savedView);
    });
  });

  container.querySelectorAll("[data-saved-remove]").forEach(button => {
    button.addEventListener("click", () => {
      toggleSaved(button.dataset.savedRemove);
      renderDashboardTab("saved");
    });
  });
}

function renderDashboardCart(container) {
  container.innerHTML = `
    <div class="dashboard-information-card">

      <h3>Your cart</h3>

      <p>
        Items: ${cartQuantityTotal()}
      </p>

      <p>
        Current subtotal: ${formatNaira(cartSubtotal())}
      </p>

      <p>
        The subtotal is an estimate calculated in your browser.
        It is not a verified order total.
      </p>

      <button
        type="button"
        class="button button-primary"
        data-dashboard-action="open-cart"
      >
        Open shopping cart
      </button>

    </div>
  `;

  container.querySelector("[data-dashboard-action]")?.addEventListener(
    "click",
    openCart
  );
}

function renderMessages(container) {
  container.innerHTML = `
    <div class="empty-state">

      <h3>Messaging backend not connected</h3>

      <p>
        Real messaging requires secured conversation and
        message records, participant-based access rules,
        and a message-delivery implementation.
      </p>

      <p>
        No messages have been invented or sent.
      </p>

    </div>
  `;
}

function renderStorefrontManagement(container) {
  const approved =
    state.seller?.verificationStatus === "approved" &&
    state.seller?.accountStatus === "active";

  if (!approved) {
    container.innerHTML = `
      <div class="dashboard-information-card">

        <h3>Seller approval required</h3>

        <p>
          You do not currently have an approved, active seller
          record. Complete a seller application to begin the
          manual verification process.
        </p>

        <button
          type="button"
          class="button button-primary"
          data-dashboard-action="seller-application"
        >
          Apply to become a seller
        </button>

      </div>
    `;

    container.querySelector("[data-dashboard-action]")?.addEventListener(
      "click",
      () => renderDashboardTab("seller-application")
    );

    return;
  }

  container.innerHTML = `
    <div class="dashboard-information-card">

      <h3>Your seller account</h3>

      <p>
        Seller verification:
        ${escapeHTML(state.seller.verificationStatus || "unknown")}
      </p>

      <p>
        Account status:
        ${escapeHTML(state.seller.accountStatus || "unknown")}
      </p>

      <p>
        Public storefront editing requires a storefront schema
        and rules that permit safe public access to approved
        seller information.
      </p>

    </div>
  `;
}

async function renderSellerListings(container) {
  if (!requireSignedIn()) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      Loading your listings...
    </div>
  `;

  try {
    const sellerQuery = query(
      collection(db, "products"),
      where("sellerId", "==", state.user.uid),
      limit(PRODUCT_QUERY_LIMIT)
    );

    const snapshot = await getDocs(sellerQuery);

    const products = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">

          <h3>You have no listings</h3>

          <p>
            Your seller account does not currently have any
            saved product listings.
          </p>

          <button
            type="button"
            class="button button-primary"
            data-dashboard-action="seller-application"
          >
            Review seller application
          </button>

        </div>
      `;

      container.querySelector("[data-dashboard-action]")?.addEventListener(
        "click",
        () => renderDashboardTab("seller-application")
      );

      return;
    }

    container.innerHTML = `
      <div class="dashboard-listing-list">

        ${products.map(product => `
          <article class="dashboard-listing-item">

            <div>
              <h3>${escapeHTML(product.title || "Untitled listing")}</h3>

              <p>${formatNaira(product.price)}</p>

              <p>
                Status:
                ${escapeHTML(product.status || "unknown")}
              </p>

              <p>
                ${escapeHTML(product.category || "")}
              </p>
            </div>

          </article>
        `).join("")}

      </div>
    `;

  } catch (error) {
    console.error("Seller listing retrieval failed.", error);

    container.innerHTML = `
      <div class="empty-state">

        <h3>Could not load your listings</h3>

        <p>
          Check your authentication, seller permissions,
          Firestore indexes and published security rules.
        </p>

      </div>
    `;
  }
}

function renderInventory(container) {
  container.innerHTML = `
    <div class="empty-state">

      <h3>Inventory management requires a schema update</h3>

      <p>
        The existing product rules do not permit a quantity
        field. Inventory cannot be securely managed until the
        Firestore schema and rules are updated together.
      </p>

      <p>
        Stock reservation and order processing must also be
        enforced by trusted backend operations.
      </p>

    </div>
  `;
}

function renderSellerOrders(container) {
  container.innerHTML = `
    <div class="empty-state">

      <h3>Seller orders are not connected</h3>

      <p>
        Seller order history and status management require
        secured order documents, seller access rules and
        trusted backend order processing.
      </p>

      <p>
        No sample orders are displayed.
      </p>

    </div>
  `;
}

function renderSellerApplication(container) {
  if (state.sellerApplication) {
    container.innerHTML = `
      <div class="dashboard-information-card">

        <h3>Your seller application</h3>

        <p>
          Status:
          <strong>
            ${escapeHTML(state.sellerApplication.status || "unknown")}
          </strong>
        </p>

        <p>
          Submitted:
          ${formatDate(state.sellerApplication.submittedAt)}
        </p>

        <p>
          Seller approval is handled through the manual
          verification process.
        </p>

        <button
          type="button"
          class="button button-primary"
          data-dashboard-action="open-seller-application"
        >
          View application
        </button>

      </div>
    `;

    container.querySelector("[data-dashboard-action]")?.addEventListener(
      "click",
      openSellerApplication
    );

    return;
  }

  container.innerHTML = `
    <div class="dashboard-information-card">

      <h3>Become a POULTRYLINK seller</h3>

      <p>
        Submit your information for manual review.
        Approval is not automatic.
      </p>

      <button
        type="button"
        class="button button-primary"
        data-dashboard-action="open-seller-application"
      >
        Start seller application
      </button>

    </div>
  `;

  container.querySelector("[data-dashboard-action]")?.addEventListener(
    "click",
    openSellerApplication
  );
}

function renderSettings(container) {
  container.innerHTML = `
    <div class="dashboard-information-card">

      <h3>Account settings</h3>

      <p>
        Signed in as:
        ${escapeHTML(state.user.email || "")}
      </p>

      <p>
        Email verification:
        ${state.user.emailVerified ? "Verified" : "Not verified"}
      </p>

      <div class="dashboard-settings-actions">

        <button
          type="button"
          class="button button-outline"
          data-settings-action="profile"
        >
          Edit profile
        </button>

        <button
          type="button"
          class="button button-outline"
          data-settings-action="password"
        >
          Reset password
        </button>

        <button
          type="button"
          class="button button-outline"
          data-settings-action="verification"
        >
          Send verification email
        </button>

        <button
          type="button"
          class="button button-outline"
          data-settings-action="signout"
        >
          Sign out
        </button>

      </div>

    </div>
  `;

  container.querySelectorAll("[data-settings-action]").forEach(button => {
    button.addEventListener("click", () => {
      switch (button.dataset.settingsAction) {
        case "profile":
          navigateTo("profile");
          break;

        case "password":
          resetCurrentUserPassword();
          break;

        case "verification":
          resendVerification();
          break;

        case "signout":
          performSignOut();
          break;

        default:
          break;
      }
    });
  });
}


/* =========================================================
   20. DASHBOARD EVENT HANDLERS
========================================================= */

function initDashboard() {
  byId("dashboardNav")?.addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");

    if (!button) {
      return;
    }

    renderDashboardTab(button.dataset.tab);
  });

  bind("dashboardBrowseButton", "click", () => {
    navigateTo("marketplace");
  });

  bind("dashboardSignOutButton", "click", performSignOut);
}


/* =========================================================
   21. SELLER APPLICATION
========================================================= */

function openSellerApplication() {
  if (!requireSignedIn()) {
    return;
  }

  if (state.sellerApplication) {
    openModal(
      "Seller application status",
      `
        <p>
          Your application status is:
          <strong>
            ${escapeHTML(state.sellerApplication.status || "unknown")}
          </strong>
        </p>

        <p>
          Seller applications require manual review.
        </p>

        <button
          type="button"
          class="button button-primary button-full"
          id="sellerApplicationCloseButton"
        >
          Close
        </button>
      `
    );

    bind(
      "sellerApplicationCloseButton",
      "click",
      closeModal
    );

    return;
  }

  openNativeDialog("sellerApplicationDialog");
}

async function submitSellerApplication(event) {
  event.preventDefault();

  if (!requireSignedIn()) {
    return;
  }

  if (state.sellerApplication) {
    setMessage(
      "sellerApplicationMessage",
      "An application already exists for this account.",
      "error"
    );

    return;
  }

  const form = byId("sellerApplicationForm");

  const formData = new FormData(form);

  const intendedProducts = formData.getAll("intendedProducts");

  if (!intendedProducts.length) {
    setMessage(
      "sellerApplicationMessage",
      "Select at least one product category.",
      "error"
    );

    return;
  }

  const legalName = String(formData.get("legalName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const sellerState = String(formData.get("state") || "").trim();
  const lga = String(formData.get("lga") || "").trim();
  const farmLocation = String(formData.get("farmLocation") || "").trim();

  const evidenceText = String(formData.get("evidence") || "");

  const evidencePaths = evidenceText
    .split(/\n/)
    .map(value => value.trim())
    .filter(Boolean);

  const button = byId("submitSellerApplicationButton");

  setButtonLoading(button, true, "Submitting application...");

  try {
    /*
     * This payload follows the sellerApplications schema
     * provided in your existing Firestore rules.
     */

    await setDoc(
      doc(db, "sellerApplications", state.user.uid),
      {
        applicantUid: state.user.uid,
        legalName,
        phone,
        state: sellerState,
        lga,
        farmLocation,
        intendedProducts,
        evidencePaths,
        status: "pending",
        submittedAt: serverTimestamp()
      }
    );

    state.sellerApplication = {
      applicantUid: state.user.uid,
      legalName,
      phone,
      state: sellerState,
      lga,
      farmLocation,
      intendedProducts,
      evidencePaths,
      status: "pending"
    };

    closeNativeDialog("sellerApplicationDialog");

    toast("Seller application submitted for review.");

    if (state.activePage === "dashboard") {
      renderDashboardTab("seller-application");
    }

  } catch (error) {
    console.error("Seller application failed.", error);

    setMessage(
      "sellerApplicationMessage",
      friendlyAuthError(error),
      "error"
    );

  } finally {
    setButtonLoading(
      byId("submitSellerApplicationButton"),
      false
    );
  }
}


/* =========================================================
   22. LISTING FORM
========================================================= */

function openListingForm() {
  if (!requireSignedIn()) {
    return;
  }

  const approved =
    state.seller?.verificationStatus === "approved" &&
    state.seller?.accountStatus === "active";

  if (!approved) {
    toast(
      "Only approved, active sellers can create listings.",
      "error"
    );

    return;
  }

  setValue("listingId", "");
  setValue("listingTitle", "");
  setValue("listingDescription", "");
  setValue("listingCategory", "");
  setValue("listingPrice", "");
  setValue("listingQuantity", "");
  setValue("listingUnit", "");
  setValue("listingState", "");
  setValue("listingTown", "");
  setValue("listingImage", "");
  setValue("listingStatus", "pending_review");

  setText("listingDialogTitle", "Create a listing");

  openNativeDialog("listingDialog");
}

async function submitListing(event) {
  event.preventDefault();

  if (!requireSignedIn()) {
    return;
  }

  const approved =
    state.seller?.verificationStatus === "approved" &&
    state.seller?.accountStatus === "active";

  if (!approved) {
    setMessage(
      "listingFormMessage",
      "An approved, active seller account is required.",
      "error"
    );

    return;
  }

  const title = byId("listingTitle").value.trim();
  const description = byId("listingDescription").value.trim();
  const category = byId("listingCategory").value;
  const price = Number(byId("listingPrice").value);
  const unit = byId("listingUnit").value;
  const quantity = Number(byId("listingQuantity").value);
  const sellerState = byId("listingState").value.trim();
  const town = byId("listingTown").value.trim();
  const imageUrl = byId("listingImage").value.trim();
  const status = byId("listingStatus").value;

  if (!CATEGORIES.includes(category)) {
    setMessage(
      "listingFormMessage",
      "Choose a valid category.",
      "error"
    );

    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    setMessage(
      "listingFormMessage",
      "Enter a valid price greater than zero.",
      "error"
    );

    return;
  }

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    setMessage(
      "listingFormMessage",
      "Enter a valid whole-number quantity.",
      "error"
    );

    return;
  }

  if (imageUrl && !safeImageUrl(imageUrl)) {
    setMessage(
      "listingFormMessage",
      "Enter a valid HTTPS image URL.",
      "error"
    );

    return;
  }

const location = [town, sellerState]
  .filter(Boolean)
  .join(", ");

const imageUrls = imageUrl ? [imageUrl] : [];

const listingData = {
  sellerId: state.user.uid,
  title,
  description,
  category,
  price,
  unit,
  location,
  imageUrls,
  status: "pending_review",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

const button = byId("submitListingButton");

setButtonLoading(button, true, "Saving listing...");

try {
  await addDoc(collection(db, "products"), listingData);

  closeNativeDialog("listingDialog");

  toast("Listing submitted successfully for review.");

  await loadProducts();

  if (state.activePage === "dashboard") {
    renderDashboardTab("listings");
  }
} catch (error) {
  console.error("Listing submission failed.", error);

  setMessage(
    "listingFormMessage",
    friendlyAuthError(error),
    "error"
  );
} finally {
  setButtonLoading(
    byId("submitListingButton"),
    false
  );
 }
}


/* =========================================================
   23. SELLER DIRECTORY
========================================================= */

async function loadSellerDirectory() {
  const grid = byId("sellerDirectoryGrid");

  if (!grid) {
    return;
  }

  /*
   * Your current rules make seller records readable only by
   * their owner or an administrator. Public seller discovery
   * cannot be implemented securely by querying private seller
   * documents from the browser.
   *
   * A separate public storefront collection or safe public
   * seller fields and corresponding rules are required.
   */

  grid.innerHTML = "";

  const empty = byId("sellerDirectoryEmpty");

  if (empty) {
    empty.hidden = false;
  }
}


/* =========================================================
   24. STOREFRONT PAGE
========================================================= */

async function loadStorefront(sellerId) {
  if (!sellerId) {
    toast("No seller was selected.", "error");
    return;
  }

  /*
   * Public storefront lookup needs a public storefront
   * document and matching Firestore read rules.
   */

  toast(
    "Public storefront viewing requires the public storefront collection and security rules.",
    "error"
  );
}


/* =========================================================
   25. FOOTER AND MOBILE NAVIGATION
========================================================= */

function initMobileNavigation() {
  const toggle = byId("menuToggle");
  const nav = byId("mainNav");

  if (!toggle || !nav) {
    return;
  }

  function closeNavigation() {
    nav.classList.remove("is-open");

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  }

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");

    toggle.setAttribute("aria-expanded", String(open));

    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu"
    );
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeNavigation);
  });

  document.addEventListener("click", event => {
    if (
      !nav.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeNavigation();
    }
  });
}

function initHeaderAndFooter() {
  bind("loginButton", "click", openLogin);
  bind("registerButton", "click", openRegister);

  bind("footerLoginButton", "click", openLogin);
  bind("footerRegisterButton", "click", openRegister);

  bind("signOutButton", "click", performSignOut);
  bind("dashboardSignOutButton", "click", performSignOut);

  bind("cartButton", "click", openCart);
  bind("checkoutButton", "click", startCheckout);

  bind("becomeSellerButton", "click", openSellerApplication);
  bind("footerSellerButton", "click", openSellerApplication);
  bind("marketplaceSellerButton", "click", openSellerApplication);

  bind("profileForm", "submit", saveProfile);

  bind("profileResetPasswordButton", "click", resetCurrentUserPassword);
  bind("profileVerifyEmailButton", "click", resendVerification);

  bind("sellerApplicationForm", "submit", submitSellerApplication);

  bind("listingForm", "submit", submitListing);

  const year = byId("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  bind("footerSellerButton", "click", openSellerApplication);
}


/* =========================================================
   26. LEGAL INFORMATION
========================================================= */

function openLegalDialog(type) {
  const legalContent = {
    about: {
      title: "About POULTRYLINK",
      body: `
        <p>
          POULTRYLINK is designed to connect Nigerian poultry
          farmers, sellers, buyers and other poultry-industry
          participants.
        </p>
        <p>
          Marketplace availability depends on actual listings
          published by registered sellers.
        </p>
      `
    },

    safety: {
      title: "Marketplace safety",
      body: `
        <p>
          Confirm product availability, seller details, prices,
          delivery arrangements and transaction terms before
          making a purchase.
        </p>
        <p>
          Never share your password or verification codes.
          Do not treat an order request as proof of payment.
        </p>
      `
    },

    privacy: {
      title: "Privacy information",
      body: `
        <p>
          Account information must be protected by appropriate
          authentication and database security rules.
        </p>
        <p>
          The final privacy policy must describe the actual
          information collected, its purposes, retention,
          sharing and deletion procedures.
        </p>
      `
    },

    terms: {
      title: "Terms of use",
      body: `
        <p>
          Users must provide accurate information and comply
          with applicable laws and marketplace policies.
        </p>
        <p>
          The final terms must be reviewed and published before
          production launch. This summary is not a substitute
          for complete legal terms.
        </p>
      `
    }
  };

  const item = legalContent[type];

  if (!item) {
    return;
  }

  openModal(item.title, item.body);
}

function initLegalLinks() {
  all("[data-legal]").forEach(button => {
    button.addEventListener("click", () => {
      openLegalDialog(button.dataset.legal);
    });
  });
}


/* =========================================================
   27. FIREBASE AUTHENTICATION STATE
========================================================= */

function initAuthenticationListener() {
  onAuthStateChanged(auth, async user => {
    state.user = user;
    state.authReady = true;

    if (!user) {
      state.profile = null;
      state.seller = null;
      state.sellerApplication = null;

      renderAuthenticationState();

      if (
        state.activePage === "profile" ||
        state.activePage === "dashboard"
      ) {
        navigateTo("home");
      }

      return;
    }

    /*
     * If email verification is required, show a clear
     * signed-out experience until verification is complete.
     */

    if (!user.emailVerified) {
      state.profile = null;
      state.seller = null;
      state.sellerApplication = null;

      renderAuthenticationState();

      toast(
        "Please verify your email to access protected account features.",
        "error"
      );

      return;
    }

    state.profileLoading = true;

    try {
      await loadUserAccount(user);

      renderAuthenticationState();

      /*
       * A returning signed-in user remains signed in after
       * page refresh while Firebase maintains the session.
       * The navigation is updated from this auth listener.
       */

    } catch (error) {
      console.error("Account initialisation failed.", error);

      toast(
        "You are authenticated, but your account details could not be loaded.",
        "error"
      );

    } finally {
      state.profileLoading = false;
    }
  });
}


/* =========================================================
   28. KEYBOARD AND GLOBAL INTERACTIONS
========================================================= */

function initGlobalInteractions() {
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
      closeAccountDropdown();
    }
  });

  all("[data-legal]").forEach(button => {
    button.setAttribute("aria-haspopup", "dialog");
  });
}


/* =========================================================
   29. INITIALISE APPLICATION
========================================================= */

function initApplication() {
  console.info("POULTRYLINK application initialising.");

  initModal();
  initNativeDialogs();

  initHeaderAndFooter();
  initAccountDropdown();
  initPageNavigation();

  initMarketplaceActions();
  initDashboard();

  initMobileNavigation();
  initLegalLinks();
  initGlobalInteractions();

  updateCategoryButtons();
  updateCartBadge();

  /*
   * These are real backend reads. If Firebase or the rules
   * are not configured correctly, the interface will show
   * an error rather than fabricate marketplace records.
   */

  loadProducts();
  loadSellerDirectory();

  /*
   * Authentication state is the source of truth for whether
   * the account navigation displays "Sign in" or the user's
   * actual profile details.
   */

  initAuthenticationListener();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initApplication,
    { once: true }
  );
} else {
  initApplication();
}
