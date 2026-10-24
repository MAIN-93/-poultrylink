// PoultryLink interaction fixes: consistent mobile menu state and predictable refresh position.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("pageshow", event => {
  if (!location.hash && (
    event.persisted ||
    performance.getEntriesByType("navigation")[0]?.type === "reload"
  )) window.scrollTo(0, 0);
});

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
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUBwgGhDHj-v6kBE5Dn3O_FxF8EfPPfy4",
  authDomain: "poultrylink-2459a.firebaseapp.com",
  projectId: "poultrylink-2459a",
  storageBucket: "poultrylink-2459a.firebasestorage.app",
  messagingSenderId: "332920290687",
  appId: "1:332920290687:web:3e71c648817e1c07ba6e4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

let user = null;
let listings = [];
let filtered = [];
let authMode = "signin";
let editingId = null;
let unsubscribeListings = null;
let ordersLoading = false;

const CART_KEY = "poultrylink_cart_v1";
let cart = loadCart();

const categoryArt = {
  Eggs: ["🥚", "eggs"],
  Layers: ["🐔", "layers"],
  Broilers: ["🍗", "broilers"],
  Chicks: ["🐣", "chicks"],
  Feed: ["🌾", "feed"],
  Equipment: ["🧰", "equipment"]
};

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]")
      .filter(x =>
        x &&
        typeof x.id === "string" &&
        Number.isFinite(x.price) &&
        Number.isFinite(x.qty) &&
        x.qty > 0
      );
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartBadge();
}

function escapeHTML(v = "") {
  return String(v).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function naira(n) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

function normalisePhone(v = "") {
  let n = String(v).replace(/\D/g, "");
  if (n.startsWith("0")) n = "234" + n.slice(1);
  return n;
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(
    () => el.classList.remove("show"),
    3000
  );
}

function errorText(e) {
  const map = {
    "auth/email-already-in-use":
      "This email already has an account. Please sign in.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/invalid-credential":
      "Email or password is incorrect.",

    "auth/weak-password":
      "Use a password with at least six characters.",

    "permission-denied":
      "Permission denied by Firebase security rules. Check the rules installed in Firestore.",

    "unavailable":
      "Service temporarily unavailable. Check your internet connection."
  };

  return map[e?.code] || e?.message || "Something went wrong. Please try again.";
}

function openDialog(id) {
  const d = $(id);
  if (d && !d.open) d.showModal();
}

function closeDialog(id) {
  const d = $(id);
  if (d?.open) d.close();
}

function artFor(p) {
  return categoryArt[p.category] || [p.emoji || "🐔", "layers"];
}

function createdMillis(p) {
  return p.createdAt?.toMillis?.() ||
    p.updatedAt?.toMillis?.() ||
    0;
}

function listingArt(p) {
  const [emoji, cls] = artFor(p);

  return `
    <div class="listing-art ${escapeHTML(p.art || cls)}">
      <span class="listing-tag">
        ${escapeHTML(p.category || "Poultry")}
      </span>
      <span class="art-emoji">
        ${escapeHTML(p.emoji || emoji)}
      </span>
    </div>
  `;
}

function cardHTML(p) {
  const owner = user && p.ownerId === user.uid;
  const price = naira(p.price);

  return `
    <article class="listing-card">

      ${listingArt(p)}

      <div class="listing-body">

        <div class="listing-meta">
          <span class="category-label">
            ${escapeHTML(p.category || "Product")}
          </span>

          <span>
            📍 ${escapeHTML([p.town, p.state].filter(Boolean).join(", "))}
          </span>
        </div>

        <h3>${escapeHTML(p.title)}</h3>

        <p class="listing-description">
          ${escapeHTML(p.description || "Contact the seller for more details.")}
        </p>

        <div class="listing-price">
          ${price}
          <small>${escapeHTML(p.unit || "")}</small>
        </div>

        <div class="listing-details">
          <span>
            Available: ${escapeHTML(p.quantity || "Ask seller")}
          </span>
          <span>Seller listing</span>
        </div>

        <div class="seller-line">
          <span class="seller-avatar">
            ${escapeHTML((p.seller || "P").slice(0, 1).toUpperCase())}
          </span>

          <span>
            Listed by
            <strong>${escapeHTML(p.seller || "Poultry seller")}</strong>
          </span>
        </div>

        <div class="card-actions">

          <button
            class="btn btn-outline"
            data-action="details"
            data-id="${p.id}">
            View details
          </button>

          <button
            class="btn btn-outline"
            data-action="addcart"
            data-id="${p.id}">
            ＋ Cart
          </button>

          <a
            class="btn btn-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            href="https://wa.me/${normalisePhone(p.phone)}?text=${encodeURIComponent(
              "Hello, I found your listing on PoultryLink: " + p.title
            )}">
            WhatsApp
          </a>

          ${
            owner
              ? `
                <button
                  class="btn btn-outline"
                  data-action="edit"
                  data-id="${p.id}">
                  Edit
                </button>

                <button
                  class="btn btn-danger"
                  data-action="delete"
                  data-id="${p.id}">
                  Delete
                </button>
              `
              : ""
          }

        </div>
      </div>
    </article>
  `;
}

function applyFilters() {
  const term = $("searchInput").value.trim().toLowerCase();
  const cat = $("categoryFilter").value;
  const loc = $("locationFilter").value;
  const sort = $("sortSelect").value;

  filtered = listings.filter(p =>
    (cat === "all" || p.category === cat) &&
    (loc === "all" || p.state === loc) &&
    (
      !term ||
      [
        p.title,
        p.category,
        p.description,
        p.seller,
        p.town,
        p.state
      ].some(x => String(x || "").toLowerCase().includes(term))
    )
  );

  if (sort === "low") {
    filtered.sort((a, b) =>
      (Number(a.price) || 0) - (Number(b.price) || 0)
    );
  } else if (sort === "high") {
    filtered.sort((a, b) =>
      (Number(b.price) || 0) - (Number(a.price) || 0)
    );
  } else {
    filtered.sort((a, b) => createdMillis(b) - createdMillis(a));
  }

  renderListings();
}

function renderListings() {
  const grid = $("listingGrid");

  grid.innerHTML = filtered.map(cardHTML).join("");

  $("resultsCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "listing" : "listings"} found`;

  $("emptyState").classList.toggle("hidden", filtered.length !== 0);
  $("listingGrid").classList.toggle("hidden", filtered.length === 0);
}

function clearFilters() {
  $("searchInput").value = "";
  $("categoryFilter").value = "all";
  $("locationFilter").value = "all";

  document.querySelectorAll(".chip").forEach(c =>
    c.classList.toggle("active", c.dataset.category === "all")
  );

  applyFilters();
}

function renderCartBadge() {
  $("cartCount").textContent = cart.reduce(
    (n, x) => n + x.qty,
    0
  );
}

function cartTotal() {
  return cart.reduce(
    (n, x) => n + x.price * x.qty,
    0
  );
}

function renderCart() {
  const box = $("cartContent");

  if (!cart.length) {
    box.innerHTML = `
      <div class="empty-state">
        <span>🛒</span>
        <h3>Your cart is empty</h3>
        <p>Add products from the marketplace to start an order.</p>
        <button class="btn btn-outline" data-close="cartDialog">
          Continue shopping
        </button>
      </div>
    `;

    $("checkoutButton").disabled = true;
  } else {
    box.innerHTML = cart.map(x => `
      <div class="cart-row">

        <div>
          <h3>${escapeHTML(x.title)}</h3>
          <p>${escapeHTML(x.seller)} · ${naira(x.price)} each</p>
          <p>${escapeHTML(x.quantityText || "")}</p>
        </div>

        <div class="cart-row-right">
          <strong>${naira(x.price * x.qty)}</strong>

          <div class="qty-controls">

            <button
              data-cart-action="minus"
              data-id="${x.id}"
              aria-label="Decrease quantity">
              −
            </button>

            <b>${x.qty}</b>

            <button
              data-cart-action="plus"
              data-id="${x.id}"
              aria-label="Increase quantity">
              +
            </button>

            <button
              data-cart-action="remove"
              data-id="${x.id}"
              aria-label="Remove item">
              ×
            </button>

          </div>
        </div>
      </div>
    `).join("");

    $("checkoutButton").disabled = false;
  }

  $("cartTotal").textContent = naira(cartTotal());

  renderCartBadge();
}

function addToCart(p) {
  if (!user) {
    openAuth();
    toast("Sign in to add products to your cart.");
    return;
  }

  if (p.ownerId === user.uid) {
    toast("You cannot order your own listing.");
    return;
  }

  const item = cart.find(x => x.id === p.id);

  if (item) {
    item.qty = Math.min(item.qty + 1, 99);
  } else {
    cart.push({
      id: p.id,
      title: p.title,
      price: Number(p.price) || 0,
      seller: p.seller || "Seller",
      ownerId: p.ownerId || "",
      phone: p.phone || "",
      quantityText: p.quantity || "",
      unit: p.unit || "",
      qty: 1
    });
  }

  saveCart();
  toast("Added to your cart.");
}

function openAuth() {
  updateAuthInterface();
  openDialog("authDialog");
}

function setAuthMode(mode) {
  authMode = mode;

  const signup = mode === "signup";

  $("authTitle").textContent =
    signup ? "Create your account" : "Welcome back";

  $("authSubtitle").textContent =
    signup
      ? "Create an account to buy and sell on PoultryLink."
      : "Sign in to manage listings and orders.";

  $("authNameField").classList.toggle("hidden", !signup);
  $("authName").required = signup;

  $("authPassword").autocomplete =
    signup ? "new-password" : "current-password";

  $("authSubmitButton").textContent =
    signup ? "Create account" : "Sign in";

  $("authSwitchButton").textContent =
    signup
      ? "Already have an account? Sign in"
      : "Need an account? Create one";

  $("authMessage").textContent = "";
}

function updateAuthInterface() {
  const signed = !!user;

  $("signInButton").textContent =
    signed ? "My account" : "Sign in";

  $("accountContent").classList.toggle("hidden", signed);
  $("signedInControls").classList.toggle("hidden", !signed);
  $("authForm").classList.toggle("hidden", signed);
  $("authSwitchButton").classList.toggle("hidden", signed);

  if (signed) {
    $("accountName").textContent =
      user.displayName || "PoultryLink member";

    $("accountEmail").textContent = user.email || "";
  } else {
    setAuthMode(authMode);
  }
}

async function saveSellerProfile(name) {
  if (!user) return;

  const ref = doc(db, "sellers", user.uid);
  const snap = await getDoc(ref);

  const payload = {
    uid: user.uid,
    email: user.email || "",
    displayName: name || user.displayName || "PoultryLink seller",
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });
}

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();

  $("authMessage").textContent = "Working…";
  $("authSubmitButton").disabled = true;

  try {
    if (authMode === "signup") {
      const name = $("authName").value.trim();

      const cred = await createUserWithEmailAndPassword(
        auth,
        $("authEmail").value.trim(),
        $("authPassword").value
      );

      if (name) {
        await updateProfile(cred.user, {
          displayName: name
        });
      }

      user = auth.currentUser;

      await saveSellerProfile(name);

      toast("Account created successfully.");
    } else {
      await signInWithEmailAndPassword(
        auth,
        $("authEmail").value.trim(),
        $("authPassword").value
      );

      toast("Signed in successfully.");
    }

    closeDialog("authDialog");
    updateAuthInterface();
    renderListings();
    loadOrders();
  } catch (err) {
    $("authMessage").textContent = errorText(err);
  } finally {
    $("authSubmitButton").disabled = false;
  }
});

$("authSwitchButton").addEventListener("click", () => {
  setAuthMode(authMode === "signin" ? "signup" : "signin");
});

$("signInButton").addEventListener("click", () => {
  openAuth();
});

$("signOutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
    closeDialog("authDialog");
    toast("Signed out.");
  } catch (e) {
    toast(errorText(e));
  }
});

function openListing(id = null) {
  if (!user) {
    openAuth();
    toast("Sign in before publishing a listing.");
    return;
  }

  editingId = id;

  $("listingForm").reset();
  $("formMessage").textContent = "";

  $("listingModalTitle").textContent =
    id ? "Edit your listing" : "Create a listing";

  $("saveListingButton").textContent =
    id ? "Save changes" : "Publish listing";

  if (id) {
    const p = listings.find(x => x.id === id);

    if (!p || p.ownerId !== user.uid) {
      toast("You can only edit your own listings.");
      return;
    }

    $("listingTitle").value = p.title || "";
    $("listingCategory").value = p.category || "Eggs";
    $("listingPrice").value = p.price ?? "";
    $("listingQuantity").value = p.quantity || "";
    $("listingUnit").value = p.unit || "";
    $("listingState").value = p.state || "";
    $("listingTown").value = p.town || "";
    $("listingSeller").value = p.seller || "";
    $("listingPhone").value = p.phone || "";
    $("listingDescription").value = p.description || "";
  } else {
    $("listingSeller").value = user.displayName || "";
  }

  openDialog("listingDialog");
}

["sellHeaderButton", "heroSellButton", "sellBannerButton"].forEach(id => {
  $(id).addEventListener("click", () => openListing());
});

$("listingForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!user) {
    toast("Please sign in first.");
    return;
  }

  const category = $("listingCategory").value;
  const art = categoryArt[category] || ["🐔", "layers"];

  const data = {
    title: $("listingTitle").value.trim(),
    category,
    price: Number($("listingPrice").value),
    quantity: $("listingQuantity").value.trim(),
    unit: $("listingUnit").value.trim(),
    state: $("listingState").value,
    town: $("listingTown").value.trim(),
    seller: $("listingSeller").value.trim(),
    phone: $("listingPhone").value.trim(),
    description: $("listingDescription").value.trim(),
    emoji: art[0],
    art: art[1],
    status: "active",
    ownerId: user.uid,
    updatedAt: serverTimestamp()
  };

  if (
    !Number.isFinite(data.price) ||
    data.price < 0 ||
    data.price > 100000000
  ) {
    $("formMessage").textContent = "Enter a valid price.";
    return;
  }

  $("saveListingButton").disabled = true;
  $("formMessage").textContent = "Saving listing…";

  try {
    if (editingId) {
      await updateDoc(
        doc(db, "products", editingId),
        data
      );
    } else {
      data.createdAt = serverTimestamp();

      await addDoc(
        collection(db, "products"),
        data
      );
    }

    closeDialog("listingDialog");

    toast(
      editingId
        ? "Listing updated."
        : "Listing published."
    );
  } catch (err) {
    $("formMessage").textContent = errorText(err);
  } finally {
    $("saveListingButton").disabled = false;
  }
});

async function removeListing(id) {
  const p = listings.find(x => x.id === id);

  if (!user || !p || p.ownerId !== user.uid) {
    toast("You can only delete your own listings.");
    return;
  }

  if (!confirm(`Delete “${p.title}”? This cannot be undone.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, "products", id));

    cart = cart.filter(x => x.id !== id);
    saveCart();

    toast("Listing deleted.");
  } catch (e) {
    toast(errorText(e));
  }
}

function showDetails(p) {
  $( "detailContent" ).innerHTML = `
    <div class="detail-hero">
      ${listingArt(p)}

      <div>
        <h2>${escapeHTML(p.title)}</h2>

        <div class="listing-price">
          ${naira(p.price)}
          <small>${escapeHTML(p.unit || "")}</small>
        </div>

        <span class="category-label">
          ${escapeHTML(p.category)}
        </span>
      </div>
    </div>

    <p class="detail-copy">
      ${escapeHTML(p.description || "No description supplied.")}
    </p>

    <div class="detail-facts">

      <div class="detail-fact">
        <small>Available quantity</small>
        <strong>${escapeHTML(p.quantity || "Ask seller")}</strong>
      </div>

      <div class="detail-fact">
        <small>Location</small>
        <strong>
          ${escapeHTML([p.town, p.state].filter(Boolean).join(", "))}
        </strong>
      </div>

      <div class="detail-fact">
        <small>Seller</small>
        <strong>${escapeHTML(p.seller || "Seller")}</strong>
      </div>

      <div class="detail-fact">
        <small>Phone</small>
        <strong>${escapeHTML(p.phone || "Not provided")}</strong>
      </div>

    </div>

    <div class="card-actions">

      <button
        class="btn btn-primary"
        data-action="addcart"
        data-id="${p.id}">
        ＋ Add to cart
      </button>

      <a
        class="btn btn-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        href="https://wa.me/${normalisePhone(p.phone)}?text=${encodeURIComponent(
          "Hello, I found your listing on PoultryLink: " + p.title
        )}">
        Contact seller on WhatsApp
      </a>

    </div>
  `;

  openDialog("detailDialog");
}

document.addEventListener("click", async e => {
  const close = e.target.closest("[data-close]");

  if (close) {
    closeDialog(close.dataset.close);
    return;
  }

  const act = e.target.closest("[data-action]");

  if (act) {
    const p = listings.find(x => x.id === act.dataset.id);

    if (act.dataset.action === "addcart" && p) {
      addToCart(p);

      if ($("detailDialog").open) {
        closeDialog("detailDialog");
      }
    }

    if (act.dataset.action === "details" && p) {
      showDetails(p);
    }

    if (act.dataset.action === "edit") {
      openListing(act.dataset.id);
    }

    if (act.dataset.action === "delete") {
      removeListing(act.dataset.id);
    }
  }

  const ca = e.target.closest("[data-cart-action]");

  if (ca) {
    const item = cart.find(x => x.id === ca.dataset.id);

    if (!item) return;

    if (ca.dataset.cartAction === "plus") {
      item.qty = Math.min(item.qty + 1, 99);
    }

    if (ca.dataset.cartAction === "minus") {
      item.qty = Math.max(1, item.qty - 1);
    }

    if (ca.dataset.cartAction === "remove") {
      cart = cart.filter(x => x.id !== item.id);
    }

    saveCart();
    renderCart();
  }
});

$("searchForm").addEventListener("submit", e => {
  e.preventDefault();

  applyFilters();

  $("marketplace").scrollIntoView({
    behavior: "smooth"
  });
});

$("categoryFilter").addEventListener("change", () => {
  document.querySelectorAll(".chip").forEach(c =>
    c.classList.toggle(
      "active",
      c.dataset.category === $("categoryFilter").value
    )
  );

  applyFilters();
});

$("locationFilter").addEventListener("change", applyFilters);
$("searchInput").addEventListener("input", applyFilters);
$("sortSelect").addEventListener("change", applyFilters);
$("clearFiltersButton").addEventListener("click", clearFilters);
$("emptyClearButton").addEventListener("click", clearFilters);

$("categoryChips").addEventListener("click", e => {
  const b = e.target.closest("[data-category]");

  if (!b) return;

  $("categoryFilter").value = b.dataset.category;

  document.querySelectorAll(".chip").forEach(c =>
    c.classList.toggle("active", c === b)
  );

  applyFilters();
});

$("cartOpenButton").addEventListener("click", () => {
  renderCart();
  openDialog("cartDialog");
});

$("checkoutButton").addEventListener("click", () => {
  if (!user) {
    closeDialog("cartDialog");
    openAuth();
    toast("Sign in to submit an order.");
    return;
  }

  if (!cart.length) return;

  $("buyerName").value = user.displayName || "";
  $("buyerPhone").value = "";
  $("buyerAddress").value = "";
  $("buyerNote").value = "";
  $("checkoutMessage").textContent = "";

  closeDialog("cartDialog");
  openDialog("checkoutDialog");
});

$("checkoutForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!user) {
    toast("Please sign in again to submit an order.");
    return;
  }

  if (!cart.length) {
    toast("Your cart is empty.");
    return;
  }

  const btn = $("placeOrderButton");

  btn.disabled = true;
  $("checkoutMessage").textContent =
    "Submitting your order request…";

  try {
    const currentItems = [];

    for (const item of cart) {
      const snap = await getDoc(
        doc(db, "products", item.id)
      );

      if (!snap.exists() || snap.data().status !== "active") {
        throw new Error(
          `The listing “${item.title}” is no longer available. Remove it from your cart and try again.`
        );
      }

      const p = snap.data();

      if (p.ownerId === user.uid) {
        throw new Error(
          "Your cart contains your own listing. Remove it before checkout."
        );
      }

      currentItems.push({
        productId: item.id,
        title: String(p.title || item.title).slice(0, 100),
        category: String(p.category || "").slice(0, 30),
        unitPrice: Number(p.price) || 0,
        quantity: item.qty,
        sellerName: String(p.seller || "").slice(0, 80),
        sellerId: String(p.ownerId || "").slice(0, 128),
        unit: String(p.unit || "").slice(0, 40),
        listingQuantity: String(p.quantity || "").slice(0, 80)
      });
    }

    const order = {
      buyerId: user.uid,
      buyerEmail: String(user.email || "").slice(0, 160),
      buyerName: $("buyerName").value.trim(),
      buyerPhone: $("buyerPhone").value.trim(),
      deliveryAddress: $("buyerAddress").value.trim(),
      buyerNote: $("buyerNote").value.trim(),
      items: currentItems,

      total: currentItems.reduce(
        (n, x) => n + x.unitPrice * x.quantity,
        0
      ),

      currency: "NGN",
      orderStatus: "awaiting_seller_confirmation",
      paymentStatus: "not_integrated",
      paymentNote:
        "No payment has been collected or verified by PoultryLink.",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(collection(db, "orders"), order);

    cart = [];
    saveCart();

    closeDialog("checkoutDialog");

    toast("Order request submitted. No payment was collected.");

    await loadOrders();

    $("ordersSection").scrollIntoView({
      behavior: "smooth"
    });
  } catch (err) {
    $("checkoutMessage").textContent = errorText(err);
  } finally {
    btn.disabled = false;
  }
});

async function loadOrders() {
  const box = $("ordersContent");

  if (!user) {
    box.innerHTML = `
      <div class="empty-state">
        <span>📦</span>
        <h3>Sign in to view your orders</h3>
        <p>
          Order requests are private to the account that submitted them.
        </p>
        <button class="btn btn-primary" id="ordersSignInButton">
          Sign in
        </button>
      </div>
    `;

    return;
  }

  box.innerHTML =
    '<p class="small-muted">Loading your orders…</p>';

  try {
    const snap = await getDocs(
      query(
        collection(db, "orders"),
        where("buyerId", "==", user.uid)
      )
    );

    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) -
          (a.createdAt?.toMillis?.() || 0)
      );

    if (!docs.length) {
      box.innerHTML = `
        <div class="empty-state">
          <span>📦</span>
          <h3>No orders yet</h3>
          <p>
            When you submit an order request, it will appear here.
          </p>
        </div>
      `;

      return;
    }

    box.innerHTML = docs.map(o => `
      <article class="order-card">

        <div class="order-top">
          <div>
            <h3>
              Order ${escapeHTML(o.id.slice(0, 9).toUpperCase())}
            </h3>

            <span class="order-id">
              ${
                o.createdAt?.toDate
                  ? escapeHTML(o.createdAt.toDate().toLocaleString())
                  : "Just submitted"
              }
            </span>
          </div>

          <span class="status-pill">
            ${escapeHTML(
              String(
                o.orderStatus || "awaiting_seller_confirmation"
              ).replaceAll("_", " ")
            )}
          </span>
        </div>

        <div class="order-items">
          ${
            (Array.isArray(o.items) ? o.items : [])
              .map(i =>
                `${escapeHTML(i.title)} × ${Number(i.quantity) || 1} — ${
                  naira(
                    (Number(i.unitPrice) || 0) *
                    (Number(i.quantity) || 1)
                  )
                }`
              )
              .join("<br>")
          }

          <br>

          <strong>
            Payment: Not integrated — no payment collected.
          </strong>
        </div>

        <div class="total-line">
          <span>Estimated items total</span>
          <strong class="order-total">${naira(o.total)}</strong>
        </div>

        <p class="small-muted">
          Confirm stock, delivery and payment directly with the seller.
          This order record does not confirm payment or reserve stock.
        </p>

      </article>
    `).join("");

  } catch (e) {
    box.innerHTML = `
      <div class="empty-state">
        <h3>Could not load orders</h3>
        <p>${escapeHTML(errorText(e))}</p>
        <button class="btn btn-outline" id="retryOrdersButton">
          Try again
        </button>
      </div>
    `;
  }
}

$("refreshOrdersButton").addEventListener("click", loadOrders);

document.addEventListener("click", e => {
  if (e.target.id === "ordersSignInButton") {
    openAuth();
  }

  if (e.target.id === "retryOrdersButton") {
    loadOrders();
  }
});

$("menuButton").addEventListener("click", () => {
  const nav = $("desktopNav");
  const isOpen = nav.classList.toggle("open");

  nav.classList.toggle("mobile-open", isOpen);

  $("menuButton").setAttribute(
    "aria-expanded",
    String(isOpen)
  );
});

document.querySelectorAll(".desktop-nav a").forEach(a => {
  a.addEventListener("click", () => {
    $("desktopNav").classList.remove("open", "mobile-open");

    $("menuButton").setAttribute(
      "aria-expanded",
      "false"
    );
  });
});

document.querySelectorAll(".modal").forEach(d => {
  d.addEventListener("click", e => {
    if (e.target === d) d.close();
  });
});

function startListingsListener() {
  if (unsubscribeListings) unsubscribeListings();

  const q = query(
    collection(db, "products"),
    where("status", "==", "active")
  );

  unsubscribeListings = onSnapshot(
    q,

    snap => {
      listings = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      applyFilters();
    },

    err => {
      $("resultsCount").textContent = "Unable to load listings";

      $("listingGrid").innerHTML = `
        <div class="empty-state">
          <h3>Marketplace connection issue</h3>
          <p>${escapeHTML(errorText(err))}</p>
        </div>
      `;
    }
  );
}

onAuthStateChanged(auth, async current => {
  user = current;

  updateAuthInterface();
  applyFilters();

  if (user) {
    try {
      await saveSellerProfile(user.displayName || "");
    } catch (e) {
      console.warn("Seller profile update:", e);
    }

    await loadOrders();
  } else {
    loadOrders();
  }
});

$("year").textContent = new Date().getFullYear();

setAuthMode("signin");
renderCartBadge();
renderCart();
startListingsListener();