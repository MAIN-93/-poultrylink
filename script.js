// ============================================================
// POULTRYLINK — COMPLETE FIREBASE JAVASCRIPT
// ============================================================


// ============================================================
// 1. FIREBASE IMPORTS
// ============================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ============================================================
// 2. FIREBASE CONFIGURATION
// ============================================================

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


// ============================================================
// 3. CONFIGURATION
// ============================================================

const ADMIN_EMAIL = "ajmaine93@gmail.com";

const USERS_COLLECTION = "users";
const SELLERS_COLLECTION = "sellers";
const PRODUCTS_COLLECTION = "products";

let currentUser = null;
let currentUserData = null;

let products = [];
let filteredProducts = [];

let isSignupMode = false;
let currentDetailProduct = null;

let cart = JSON.parse(
    localStorage.getItem("poultrylink-cart") || "[]"
);


// ============================================================
// 4. HTML ELEMENT HELPER
// ============================================================

const $ = (id) => document.getElementById(id);

function showElement(id) {
    const element = $(id);

    if (element) {
        element.classList.remove("hidden");
    }
}

function hideElement(id) {
    const element = $(id);

    if (element) {
        element.classList.add("hidden");
    }
}

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function setMessage(id, message, type = "") {
    const element = $(id);

    if (!element) return;

    element.textContent = message;
    element.className = "form-message";

    if (type) {
        element.classList.add(type);
    }
}

function openModal(id) {
    const modal = $(id);

    if (!modal) return;

    if (typeof modal.showModal === "function") {
        if (!modal.open) modal.showModal();
    } else {
        modal.setAttribute("open", "");
    }
}

function closeModal(id) {
    const modal = $(id);

    if (!modal) return;

    if (typeof modal.close === "function") {
        modal.close();
    } else {
        modal.removeAttribute("open");
    }
}


// ============================================================
// 5. GENERAL HELPERS
// ============================================================

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}


function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
}


function normalizePhone(phone = "") {
    let number = String(phone).replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "234" + number.slice(1);
    }

    if (number.startsWith("234")) {
        return number;
    }

    return number;
}


function showToast(message) {
    const toast = $("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


function getFriendlyError(error) {
    const messages = {
        "auth/email-already-in-use":
            "This email already has an account.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/weak-password":
            "Your password must contain at least 6 characters.",

        "auth/invalid-credential":
            "Incorrect email or password.",

        "auth/user-not-found":
            "No account was found with this email.",

        "auth/wrong-password":
            "Incorrect password.",

        "permission-denied":
            "You do not have permission to perform this action."
    };

    return messages[error.code] ||
        error.message ||
        "Something went wrong. Please try again.";
}


function saveCart() {
    localStorage.setItem(
        "poultrylink-cart",
        JSON.stringify(cart)
    );

    updateCartDisplay();
}


// ============================================================
// 6. MODAL CLOSE BUTTONS
// ============================================================

document.addEventListener("click", event => {

    const closeButton = event.target.closest(
        "[data-close], [data-close-modal]"
    );

    if (!closeButton) return;

    const modalId =
        closeButton.dataset.close ||
        closeButton.dataset.closeModal;

    if (modalId) {
        closeModal(modalId);
    }

});


// ============================================================
// 7. MOBILE NAVIGATION
// ============================================================

$("menuButton")?.addEventListener("click", () => {

    $("desktopNav")?.classList.toggle("active");

});


// ============================================================
// 8. AUTHENTICATION MODE
// ============================================================

function updateAuthMode() {

    setText(
        "authTitle",
        isSignupMode ? "Create Account" : "Sign In"
    );

    setText(
        "authDescription",
        isSignupMode
            ? "Create your PoultryLink account."
            : "Welcome back to PoultryLink."
    );

    setText(
        "authSubmitButton",
        isSignupMode ? "Create Account" : "Sign In"
    );

    setText(
        "authSwitchText",
        isSignupMode
            ? "Already have an account?"
            : "Don't have an account?"
    );

    setText(
        "authModeButton",
        isSignupMode ? "Sign in" : "Create account"
    );

    if (isSignupMode) {
        showElement("authNameWrap");
        $("authName").required = true;
    } else {
        hideElement("authNameWrap");
        $("authName").required = false;
    }

    setMessage("authMessage", "");
}


$("authModeButton")?.addEventListener("click", () => {

    isSignupMode = !isSignupMode;

    updateAuthMode();

});


// ============================================================
// 9. OPEN AUTHENTICATION
// ============================================================

$("signInButton")?.addEventListener("click", () => {

    if (currentUser) {
        openDashboard();
        return;
    }

    isSignupMode = false;

    updateAuthMode();

    openModal("authDialog");

});


// ============================================================
// 10. REGISTER AND LOGIN
// ============================================================

$("authForm")?.addEventListener("submit", async event => {

    event.preventDefault();

    const email = $("authEmail").value.trim();

    const password = $("authPassword").value;

    const name = $("authName").value.trim();

    const button = $("authSubmitButton");

    button.disabled = true;

    button.textContent = "Please wait...";

    setMessage("authMessage", "");


    try {

        if (isSignupMode) {

            if (!name) {
                throw new Error("Please enter your full name.");
            }

            const result = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            await updateProfile(result.user, {
                displayName: name
            });

            await setDoc(
                doc(db, USERS_COLLECTION, result.user.uid),
                {
                    uid: result.user.uid,
                    name,
                    email,
                    role: "buyer",
                    createdAt: serverTimestamp()
                }
            );

            showToast("Account created successfully.");

        } else {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            showToast("Welcome back!");

        }

        closeModal("authDialog");

        $("authForm").reset();

    } catch (error) {

        setMessage(
            "authMessage",
            getFriendlyError(error),
            "error"
        );

    } finally {

        button.disabled = false;

        button.textContent =
            isSignupMode ? "Create Account" : "Sign In";

    }

});


// ============================================================
// 11. USER PROFILE
// ============================================================

async function loadUserData(user) {

    const userRef = doc(
        db,
        USERS_COLLECTION,
        user.uid
    );

    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {

        currentUserData = userSnapshot.data();

    } else {

        currentUserData = {
            uid: user.uid,
            name: user.displayName || "User",
            email: user.email,
            role: "buyer"
        };

        await setDoc(userRef, {
            ...currentUserData,
            createdAt: serverTimestamp()
        });

    }

    return currentUserData;

}


// ============================================================
// 12. AUTH STATE
// ============================================================

onAuthStateChanged(auth, async user => {

    currentUser = user;

    if (user) {

        try {

            await loadUserData(user);

            hideElement("signInButton");
            showElement("logoutButton");

            const name = currentUserData.name ||
                user.displayName ||
                "User";

            setText("dashboardName", name);

            setText("dashboardEmail", user.email);

            setText(
                "dashboardAvatar",
                name.charAt(0).toUpperCase()
            );

        } catch (error) {

            console.error("User profile error:", error);

            showToast(
                "Your account loaded, but your profile could not be retrieved."
            );

        }

    } else {

        currentUserData = null;

        showElement("signInButton");
        hideElement("logoutButton");

    }

    updateAccountButtons();

    renderProducts();

});


// ============================================================
// 13. ACCOUNT BUTTONS
// ============================================================

function updateAccountButtons() {

    if (!currentUser) return;

    const role = currentUserData?.role || "buyer";

    const sellerStatus =
        currentUserData?.sellerStatus || "";

    const becomeSellerButton =
        $("dashboardBecomeSellerButton");

    if (becomeSellerButton) {

        if (
            role === "seller" ||
            sellerStatus === "pending"
        ) {
            hideElement("dashboardBecomeSellerButton");
        } else {
            showElement("dashboardBecomeSellerButton");
        }

    }

}


// ============================================================
// 14. LOGOUT
// ============================================================

async function logoutUser() {

    try {

        await signOut(auth);

        closeModal("dashboardDialog");

        closeModal("adminDialog");

        showToast("You have signed out.");

    } catch (error) {

        showToast(getFriendlyError(error));

    }

}


$("logoutButton")?.addEventListener(
    "click",
    logoutUser
);

$("dashboardSignOutButton")?.addEventListener(
    "click",
    logoutUser
);


// ============================================================
// 15. SELLER APPLICATION ENTRY
// ============================================================

function openSellerApplication() {

    if (!currentUser) {

        isSignupMode = false;

        updateAuthMode();

        openModal("authDialog");

        showToast("Sign in before applying to become a seller.");

        return;

    }

    const role = currentUserData?.role;

    const status = currentUserData?.sellerStatus;

    if (role === "seller") {

        showToast("Your seller account is already approved.");

        return;

    }

    if (status === "pending") {

        showToast("Your seller application is awaiting review.");

        return;

    }

    if (status === "rejected") {

        showToast(
            "Your previous application was rejected. Contact the admin for guidance."
        );

        return;

    }

    $("verificationFullName").value =
        currentUser.displayName ||
        currentUserData?.name ||
        "";

    $("verificationEmail").value =
        currentUser.email || "";

    openModal("sellerVerificationModal");

}


$("sellHeaderButton")?.addEventListener(
    "click",
    openSellerApplication
);

$("heroSellButton")?.addEventListener(
    "click",
    openSellerApplication
);

$("sellBannerButton")?.addEventListener(
    "click",
    openSellerApplication
);

$("dashboardBecomeSellerButton")?.addEventListener(
    "click",
    () => {
        closeModal("dashboardDialog");
        openSellerApplication();
    }
);


// ============================================================
// 16. IDENTITY VERIFICATION PLACEHOLDER
// ============================================================

$("startIdentityVerification")?.addEventListener("click", () => {

    setMessage(
        "identityVerificationStatus",
        "Identity verification is not connected yet. You can still submit your seller application for admin review.",
        "info"
    );

});


// ============================================================
// 17. SELLER APPLICATION SUBMISSION
// ============================================================

$("sellerVerificationForm")?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (!currentUser) {

            setMessage(
                "sellerVerificationMessage",
                "Please sign in before applying.",
                "error"
            );

            return;

        }

        const submitButton = $("submitVerificationButton");

        submitButton.disabled = true;

        submitButton.textContent = "Submitting...";


        try {

            const sellerRef = doc(
                db,
                SELLERS_COLLECTION,
                currentUser.uid
            );

            const existingApplication = await getDoc(sellerRef);

            if (existingApplication.exists()) {

                const existingStatus =
                    existingApplication.data().status;

                if (existingStatus === "approved") {

                    throw new Error(
                        "Your seller application has already been approved."
                    );

                }

                if (existingStatus === "pending") {

                    throw new Error(
                        "You already have an application awaiting review."
                    );

                }

            }


            const application = {

                uid: currentUser.uid,

                fullName:
                    $("verificationFullName").value.trim(),

                phone:
                    $("verificationPhone").value.trim(),

                email:
                    $("verificationEmail").value.trim(),

                businessName:
                    $("verificationBusinessName").value.trim(),

                state:
                    $("verificationState").value,

                city:
                    $("verificationCity").value.trim(),

                address:
                    $("verificationAddress").value.trim(),

                experience:
                    $("verificationExperience").value,

                products:
                    $("verificationProducts").value.trim(),

                description:
                    $("verificationDescription").value.trim(),

                status: "pending",

                identityVerification: "not_connected",

                photoUploadStatus: "not_uploaded",

                submittedAt: serverTimestamp()

            };


            // The application is saved independently
            // of identity verification and photo uploads.

            await setDoc(sellerRef, application);


            await setDoc(
                doc(db, USERS_COLLECTION, currentUser.uid),
                {
                    sellerStatus: "pending",
                    sellerApplicationSubmittedAt: serverTimestamp()
                },
                { merge: true }
            );


            currentUserData = {
                ...currentUserData,
                sellerStatus: "pending"
            };


            $("sellerVerificationForm").reset();

            closeModal("sellerVerificationModal");

            updateAccountButtons();

            showToast(
                "Seller application submitted. Await admin review."
            );


        } catch (error) {

            console.error("Seller application error:", error);

            setMessage(
                "sellerVerificationMessage",
                getFriendlyError(error),
                "error"
            );

        } finally {

            submitButton.disabled = false;

            submitButton.textContent =
                "Submit Seller Application";

        }

    }
);


// ============================================================
// 18. ADMIN CHECK
// ============================================================

function isAdmin() {

    return (
        currentUser &&
        currentUser.email?.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    );

}


// ============================================================
// 19. ADMIN DASHBOARD ENTRY
// ============================================================

async function openAdminDashboard() {

    if (!currentUser) {

        showToast("Please sign in first.");

        return;

    }

    if (!isAdmin()) {

        showToast("You are not authorised to access the admin dashboard.");

        return;

    }

    openModal("adminDialog");

    await loadAdminDashboard();

}


// ============================================================
// 20. LOAD ADMIN DASHBOARD
// ============================================================

async function loadAdminDashboard() {

    if (!isAdmin()) return;

    try {

        const sellerSnapshot = await getDocs(
            query(
                collection(db, SELLERS_COLLECTION),
                where("status", "==", "pending")
            )
        );


        const usersSnapshot = await getDocs(
            collection(db, USERS_COLLECTION)
        );


        const productsSnapshot = await getDocs(
            collection(db, PRODUCTS_COLLECTION)
        );


        setText(
            "pendingSellerCount",
            sellerSnapshot.size
        );

        setText(
            "totalUserCount",
            usersSnapshot.size
        );

        setText(
            "adminListingCount",
            productsSnapshot.size
        );


        renderAdminApplications(
            sellerSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }))
        );


    } catch (error) {

        console.error("Admin dashboard error:", error);

        showToast(getFriendlyError(error));

    }

}


$("refreshAdminButton")?.addEventListener(
    "click",
    loadAdminDashboard
);


// ============================================================
// 21. RENDER ADMIN APPLICATIONS
// ============================================================

function renderAdminApplications(applications) {

    const container = $("adminApplications");

    if (!container) return;

    container.innerHTML = "";

    if (!applications.length) {

        showElement("adminApplicationsEmpty");

        return;

    }

    hideElement("adminApplicationsEmpty");


    applications.forEach(application => {

        const card = document.createElement("article");

        card.className = "admin-application-card";


        card.innerHTML = `

            <div class="application-information">

                <h3>${escapeHTML(application.fullName)}</h3>

                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(application.email)}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${escapeHTML(application.phone)}
                </p>

                <p>
                    <strong>Business:</strong>
                    ${escapeHTML(application.businessName || "Not provided")}
                </p>

                <p>
                    <strong>Location:</strong>
                    ${escapeHTML(application.city)},
                    ${escapeHTML(application.state)}
                </p>

                <p>
                    <strong>Experience:</strong>
                    ${escapeHTML(application.experience)}
                </p>

                <p>
                    <strong>Products:</strong>
                    ${escapeHTML(application.products)}
                </p>

                <p>
                    <strong>Description:</strong>
                    ${escapeHTML(application.description)}
                </p>

                <span class="status-badge pending">
                    Pending review
                </span>

            </div>


            <div class="application-actions">

                <button
                    class="primary-button"
                    data-admin-action="approve"
                    data-user-id="${escapeHTML(application.uid)}"
                >
                    Approve
                </button>


                <button
                    class="secondary-button"
                    data-admin-action="reject"
                    data-user-id="${escapeHTML(application.uid)}"
                >
                    Reject
                </button>

            </div>

        `;


        container.appendChild(card);

    });

}


// ============================================================
// 22. ADMIN APPROVAL AND REJECTION
// ============================================================

$("adminApplications")?.addEventListener(
    "click",
    async event => {

        const button = event.target.closest(
            "[data-admin-action]"
        );

        if (!button) return;

        if (!isAdmin()) {

            showToast("Admin access required.");

            return;

        }

        const uid = button.dataset.userId;

        const action = button.dataset.adminAction;

        if (!uid) return;

        button.disabled = true;


        try {

            const sellerRef = doc(
                db,
                SELLERS_COLLECTION,
                uid
            );

            const userRef = doc(
                db,
                USERS_COLLECTION,
                uid
            );


            const sellerSnapshot = await getDoc(sellerRef);

            if (!sellerSnapshot.exists()) {

                throw new Error("Seller application not found.");

            }


            const status =
                action === "approve" ? "approved" : "rejected";


            await updateDoc(sellerRef, {

                status,

                reviewedAt: serverTimestamp(),

                reviewedBy: currentUser.uid

            });


            await setDoc(
                userRef,
                {
                    role: status === "approved"
                        ? "seller"
                        : "buyer",

                    sellerStatus: status,

                    sellerReviewedAt: serverTimestamp()

                },
                { merge: true }
            );


            showToast(
                status === "approved"
                    ? "Seller approved successfully."
                    : "Seller application rejected."
            );


            await loadAdminDashboard();


        } catch (error) {

            console.error("Admin action error:", error);

            showToast(getFriendlyError(error));

            button.disabled = false;

        }

    }
);


// ============================================================
// 23. SELLER PERMISSION CHECK
// ============================================================

async function canManageListings() {

    if (!currentUser) {

        showToast("Please sign in first.");

        return false;

    }


    try {

        const sellerSnapshot = await getDoc(
            doc(db, SELLERS_COLLECTION, currentUser.uid)
        );


        if (
            !sellerSnapshot.exists() ||
            sellerSnapshot.data().status !== "approved"
        ) {

            showToast(
                "Only approved sellers can publish products."
            );

            return false;

        }


        return true;


    } catch (error) {

        showToast(getFriendlyError(error));

        return false;

    }

}


// ============================================================
// 24. OPEN PRODUCT LISTING
// ============================================================

async function openListingForm(product = null) {

    const allowed = await canManageListings();

    if (!allowed) return;


    $("listingForm").reset();

    $("editingListingId").value = "";


    if (product) {

        $("editingListingId").value = product.id;

        $("listingTitleInput").value = product.title || "";

        $("listingCategory").value = product.category || "";

        $("listingPrice").value = product.price || "";

        $("listingQuantity").value = product.quantity || "";

        $("listingUnit").value = product.unit || "";

        $("listingState").value = product.state || "";

        $("listingTown").value = product.town || "";

        $("listingSeller").value = product.seller || "";

        $("listingPhone").value = product.phone || "";

        $("listingDescription").value =
            product.description || "";

        setText("listingFormTitle", "Edit Product");

        setText("saveListingButton", "Update Listing");

    } else {

        setText("listingFormTitle", "Create a Listing");

        setText("saveListingButton", "Publish Listing");

        $("listingSeller").value =
            currentUserData?.name ||
            currentUser.displayName ||
            "";

        $("listingPhone").value =
            currentUserData?.phone || "";

    }


    setMessage("formMessage", "");

    openModal("listingDialog");

}


// ============================================================
// 25. SELLER DASHBOARD PRODUCT BUTTON
// ============================================================

$("dashboardContent")?.addEventListener(
    "click",
    async event => {

        const button = event.target.closest(
            "[data-seller-action]"
        );

        if (!button) return;

        const action = button.dataset.sellerAction;

        const productId = button.dataset.productId;

        const product = products.find(
            item => item.id === productId
        );


        if (action === "add") {

            openListingForm();

        }

        if (action === "edit" && product) {

            openListingForm(product);

        }

        if (action === "delete" && product) {

            await deleteSellerProduct(product);

        }

    }
);


// ============================================================
// 26. SAVE OR UPDATE LISTING
// ============================================================

$("listingForm")?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const allowed = await canManageListings();

        if (!allowed) return;


        const button = $("saveListingButton");

        button.disabled = true;

        button.textContent = "Saving...";


        try {

            const title =
                $("listingTitleInput").value.trim();

            const category =
                $("listingCategory").value;

            const price =
                Number($("listingPrice").value);

            const quantity =
                Number($("listingQuantity").value);

            const unit =
                $("listingUnit").value;

            const state =
                $("listingState").value;

            const town =
                $("listingTown").value.trim();

            const seller =
                $("listingSeller").value.trim();

            const phone =
                $("listingPhone").value.trim();

            const description =
                $("listingDescription").value.trim();


            if (
                !title ||
                !category ||
                !price ||
                !quantity ||
                !unit ||
                !state ||
                !town ||
                !seller ||
                !phone ||
                !description
            ) {

                throw new Error("Please complete all required fields.");

            }


            if (price <= 0 || quantity <= 0) {

                throw new Error(
                    "Price and quantity must be greater than zero."
                );

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

                sellerId: currentUser.uid,

                sellerEmail: currentUser.email,

                status: "active",

                updatedAt: serverTimestamp()

            };


            const editingId =
                $("editingListingId").value;


            if (editingId) {

                const existingProduct = products.find(
                    item => item.id === editingId
                );

                if (
                    !existingProduct ||
                    existingProduct.sellerId !== currentUser.uid
                ) {

                    throw new Error(
                        "You cannot edit this listing."
                    );

                }


                await updateDoc(
                    doc(db, PRODUCTS_COLLECTION, editingId),
                    productData
                );


                showToast("Product updated successfully.");

            } else {

                await addDoc(
                    collection(db, PRODUCTS_COLLECTION),
                    {
                        ...productData,
                        createdAt: serverTimestamp()
                    }
                );


                showToast("Product published successfully.");

            }


            closeModal("listingDialog");

            $("listingForm").reset();

            await loadProducts();

            await renderDashboardContent();


        } catch (error) {

            console.error("Listing save error:", error);

            setMessage(
                "formMessage",
                getFriendlyError(error),
                "error"
            );

        } finally {

            button.disabled = false;

            button.textContent =
                $("editingListingId").value
                    ? "Update Listing"
                    : "Publish Listing";

        }

    }
);


// ============================================================
// 27. DELETE PRODUCT
// ============================================================

async function deleteSellerProduct(product) {

    if (!confirm(
        `Are you sure you want to delete "${product.title}"?`
    )) {

        return;

    }


    try {

        if (product.sellerId !== currentUser.uid) {

            throw new Error(
                "You cannot delete another seller's product."
            );

        }


        await deleteDoc(
            doc(db, PRODUCTS_COLLECTION, product.id)
        );


        showToast("Product deleted successfully.");

        await loadProducts();

        await renderDashboardContent();


    } catch (error) {

        showToast(getFriendlyError(error));

    }

}


// ============================================================
// 28. LOAD PRODUCTS
// ============================================================

async function loadProducts() {

    try {

        const productQuery = query(
            collection(db, PRODUCTS_COLLECTION),
            where("status", "==", "active")
        );


        const snapshot = await getDocs(productQuery);


        products = snapshot.docs.map(item => ({

            id: item.id,

            ...item.data()

        }));


        renderProducts();


    } catch (error) {

        console.error("Product loading error:", error);

        setText(
            "resultsCount",
            "Unable to load products. Please refresh."
        );

        showToast(getFriendlyError(error));

    }

}


// ============================================================
// 29. PRODUCT FILTERING
// ============================================================

function applyFilters() {

    const search =
        $("searchInput")?.value.toLowerCase().trim() || "";

    const category =
        $("categoryFilter")?.value || "";

    const location =
        $("locationFilter")?.value || "";

    const sort =
        $("sortSelect")?.value || "newest";


    filteredProducts = products.filter(product => {

        const searchableText = [

            product.title,
            product.category,
            product.seller,
            product.description,
            product.town,
            product.state

        ].join(" ").toLowerCase();


        const matchesSearch =
            !search || searchableText.includes(search);

        const matchesCategory =
            !category || product.category === category;

        const matchesLocation =
            !location || product.state === location;


        return (
            matchesSearch &&
            matchesCategory &&
            matchesLocation
        );

    });


    if (sort === "price-low") {

        filteredProducts.sort(
            (a, b) => Number(a.price) - Number(b.price)
        );

    } else if (sort === "price-high") {

        filteredProducts.sort(
            (a, b) => Number(b.price) - Number(a.price)
        );

    } else {

        filteredProducts.sort(
            (a, b) => getTime(b.createdAt) - getTime(a.createdAt)
        );

    }

}


function getTime(timestamp) {

    if (!timestamp) return 0;

    if (timestamp.seconds) {
        return timestamp.seconds * 1000;
    }

    return new Date(timestamp).getTime() || 0;

}


// ============================================================
// 30. RENDER MARKETPLACE
// ============================================================

function renderProducts() {

    applyFilters();

    const container = $("listingGrid");

    if (!container) return;


    container.innerHTML = "";


    setText(
        "resultsCount",
        `${filteredProducts.length} product(s) found`
    );


    if (!filteredProducts.length) {

        showElement("emptyState");

        return;

    }


    hideElement("emptyState");


    filteredProducts.forEach(product => {

        const card = document.createElement("article");

        card.className = "product-card";


        card.innerHTML = `

            <div class="product-image-placeholder">
                🐔
            </div>


            <div class="product-card-content">

                <span class="product-category">
                    ${escapeHTML(product.category)}
                </span>


                <h3>
                    ${escapeHTML(product.title)}
                </h3>


                <p class="product-price">
                    ${formatMoney(product.price)}
                </p>


                <p>
                    ${escapeHTML(product.quantity)}
                    ${escapeHTML(product.unit)} available
                </p>


                <p class="product-location">
                    📍 ${escapeHTML(product.town)},
                    ${escapeHTML(product.state)}
                </p>


                <p class="product-seller">
                    Seller: ${escapeHTML(product.seller)}
                </p>


                <div class="product-card-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        data-product-action="details"
                        data-product-id="${escapeHTML(product.id)}"
                    >
                        View details
                    </button>


                    <button
                        type="button"
                        class="primary-button"
                        data-product-action="cart"
                        data-product-id="${escapeHTML(product.id)}"
                    >
                        Add to cart
                    </button>

                </div>

            </div>

        `;


        container.appendChild(card);

    });

}


// ============================================================
// 31. SEARCH AND FILTER EVENTS
// ============================================================

$("searchForm")?.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        renderProducts();

    }
);


$("searchInput")?.addEventListener(
    "input",
    renderProducts
);


$("categoryFilter")?.addEventListener(
    "change",
    renderProducts
);


$("locationFilter")?.addEventListener(
    "change",
    renderProducts
);


$("sortSelect")?.addEventListener(
    "change",
    renderProducts
);


$("clearFiltersButton")?.addEventListener(
    "click",
    clearFilters
);


$("emptyClearButton")?.addEventListener(
    "click",
    clearFilters
);


function clearFilters() {

    $("searchInput").value = "";

    $("categoryFilter").value = "";

    $("locationFilter").value = "";

    $("sortSelect").value = "newest";

    renderProducts();

}


// ============================================================
// 32. CATEGORY CHIPS
// ============================================================

$("categoryChips")?.addEventListener(
    "click",
    event => {

        const button = event.target.closest(
            "[data-category]"
        );

        if (!button) return;

        $("categoryFilter").value =
            button.dataset.category;

        renderProducts();

    }
);


// ============================================================
// 33. PRODUCT CARD ACTIONS
// ============================================================

$("listingGrid")?.addEventListener(
    "click",
    event => {

        const button = event.target.closest(
            "[data-product-action]"
        );

        if (!button) return;


        const productId = button.dataset.productId;

        const product = products.find(
            item => item.id === productId
        );

        if (!product) return;


        if (button.dataset.productAction === "details") {

            openProductDetails(product);

        }


        if (button.dataset.productAction === "cart") {

            addToCart(product);

        }

    }
);


// ============================================================
// 34. PRODUCT DETAILS
// ============================================================

function openProductDetails(product) {

    currentDetailProduct = product;

    const container = $("detailContent");

    if (!container) return;


    const phone = normalizePhone(product.phone);


    container.innerHTML = `

        <div class="product-detail">

            <div class="product-image-placeholder">
                🐔
            </div>


            <span class="product-category">
                ${escapeHTML(product.category)}
            </span>


            <h2>${escapeHTML(product.title)}</h2>


            <h3 class="product-price">
                ${formatMoney(product.price)}
            </h3>


            <p>
                <strong>Quantity:</strong>
                ${escapeHTML(product.quantity)}
                ${escapeHTML(product.unit)}
            </p>


            <p>
                <strong>Seller:</strong>
                ${escapeHTML(product.seller)}
            </p>


            <p>
                <strong>Location:</strong>
                ${escapeHTML(product.town)},
                ${escapeHTML(product.state)}
            </p>


            <p>
                <strong>Description:</strong>
                ${escapeHTML(product.description)}
            </p>


            <button
                type="button"
                class="primary-button full-width"
                id="detailWhatsAppButton"
            >
                Contact seller on WhatsApp
            </button>


            <button
                type="button"
                class="secondary-button full-width"
                id="detailAddCartButton"
            >
                Add to cart
            </button>

        </div>

    `;


    openModal("detailDialog");


    $("detailWhatsAppButton")?.addEventListener(
        "click",
        () => contactSeller(product)
    );


    $("detailAddCartButton")?.addEventListener(
        "click",
        () => addToCart(product)
    );

}


// ============================================================
// 35. WHATSAPP CONTACT
// ============================================================

function contactSeller(product) {

    const phone = normalizePhone(product.phone);

    if (!phone) {

        showToast("Seller has not provided a valid phone number.");

        return;

    }


    const message = encodeURIComponent(

        `Hello ${product.seller}, I found your product "${product.title}" on PoultryLink. I am interested in buying it. Is it still available?`

    );


    const whatsappURL =
        `https://wa.me/${phone}?text=${message}`;


    window.open(
        whatsappURL,
        "_blank",
        "noopener,noreferrer"
    );

}


// ============================================================
// 36. ADD TO CART
// ============================================================

function addToCart(product) {

    const existingItem = cart.find(
        item => item.id === product.id
    );


    if (existingItem) {

        existingItem.cartQuantity += 1;

    } else {

        cart.push({

            id: product.id,

            title: product.title,

            price: Number(product.price),

            seller: product.seller,

            phone: product.phone,

            unit: product.unit,

            cartQuantity: 1

        });

    }


    saveCart();

    showToast("Product added to cart.");

}


// ============================================================
// 37. CART DISPLAY
// ============================================================

function updateCartDisplay() {

    const totalItems = cart.reduce(
        (total, item) => total + item.cartQuantity,
        0
    );


    setText("cartCount", totalItems);


    const container = $("cartItems");

    if (!container) return;


    container.innerHTML = "";


    if (!cart.length) {

        showElement("cartEmpty");

        hideElement("cartSummary");

        return;

    }


    hideElement("cartEmpty");

    showElement("cartSummary");


    cart.forEach(item => {

        const row = document.createElement("div");

        row.className = "cart-item";


        row.innerHTML = `

            <div>

                <h4>${escapeHTML(item.title)}</h4>

                <p>
                    ${formatMoney(item.price)}
                    × ${item.cartQuantity}
                </p>

            </div>


            <div class="cart-item-actions">

                <button
                    type="button"
                    data-cart-action="decrease"
                    data-product-id="${escapeHTML(item.id)}"
                >
                    −
                </button>


                <span>${item.cartQuantity}</span>


                <button
                    type="button"
                    data-cart-action="increase"
                    data-product-id="${escapeHTML(item.id)}"
                >
                    +
                </button>


                <button
                    type="button"
                    data-cart-action="remove"
                    data-product-id="${escapeHTML(item.id)}"
                >
                    Remove
                </button>

            </div>

        `;


        container.appendChild(row);

    });


    const total = cart.reduce(
        (sum, item) =>
            sum + item.price * item.cartQuantity,
        0
    );


    setText("cartTotal", formatMoney(total));

}


// ============================================================
// 38. CART ACTIONS
// ============================================================

$("cartItems")?.addEventListener(
    "click",
    event => {

        const button = event.target.closest(
            "[data-cart-action]"
        );

        if (!button) return;


        const id = button.dataset.productId;

        const action = button.dataset.cartAction;

        const item = cart.find(
            product => product.id === id
        );

        if (!item) return;


        if (action === "increase") {

            item.cartQuantity++;

        }


        if (action === "decrease") {

            item.cartQuantity--;

            if (item.cartQuantity <= 0) {

                cart = cart.filter(
                    product => product.id !== id
                );

            }

        }


        if (action === "remove") {

            cart = cart.filter(
                product => product.id !== id
            );

        }


        saveCart();

    }
);


// ============================================================
// 39. OPEN CART
// ============================================================

$("cartButton")?.addEventListener("click", () => {

    updateCartDisplay();

    openModal("cartDialog");

});


// ============================================================
// 40. CART CONTACT SELLERS
// ============================================================

$("cartContactButton")?.addEventListener(
    "click",
    () => {

        if (!cart.length) {

            showToast("Your cart is empty.");

            return;

        }


        const sellerNumbers = [
            ...new Set(
                cart.map(item => normalizePhone(item.phone))
                    .filter(Boolean)
            )
        ];


        if (!sellerNumbers.length) {

            showToast("No valid seller phone numbers found.");

            return;

        }


        // Each seller receives a message about the products
        // from their own listing.

        const firstItem = cart[0];

        const message = encodeURIComponent(

            `Hello ${firstItem.seller}, I am interested in the products I selected on PoultryLink. Please let me know how to proceed.`

        );


        window.open(
            `https://wa.me/${sellerNumbers[0]}?text=${message}`,
            "_blank",
            "noopener,noreferrer"
        );


        showToast(
            "Contact opened. Contact other sellers separately if your cart contains multiple sellers."
        );

    }
);


// ============================================================
// 41. USER DASHBOARD
// ============================================================

async function openDashboard() {

    if (!currentUser) {

        openModal("authDialog");

        return;

    }


    openModal("dashboardDialog");


    try {

        await loadUserData(currentUser);

        const role = currentUserData.role || "buyer";

        const sellerStatus =
            currentUserData.sellerStatus || "";


        setText(
            "dashboardRole",
            role === "seller"
                ? "Verified Seller"
                : sellerStatus === "pending"
                    ? "Seller Application Pending"
                    : "Buyer"
        );


        setText(
            "dashboardTitle",
            isAdmin() ? "Admin Account" : "My Dashboard"
        );


        setText(
            "dashboardKicker",
            isAdmin() ? "ADMIN ACCOUNT" : "MY ACCOUNT"
        );


        updateAccountButtons();

        await renderDashboardContent();


        if (isAdmin()) {

            const adminButton = document.createElement("button");

            adminButton.type = "button";

            adminButton.className = "primary-button full-width";

            adminButton.textContent = "Open Admin Dashboard";

            adminButton.addEventListener(
                "click",
                () => {
                    closeModal("dashboardDialog");
                    openAdminDashboard();
                }
            );


            $("dashboardContent")?.appendChild(adminButton);

        }


    } catch (error) {

        console.error("Dashboard error:", error);

        showToast(getFriendlyError(error));

    }

}


// ============================================================
// 42. DASHBOARD CONTENT
// ============================================================

async function renderDashboardContent() {

    const container = $("dashboardContent");

    if (!container || !currentUser) return;


    const role = currentUserData?.role || "buyer";

    const status = currentUserData?.sellerStatus || "";


    if (role !== "seller") {

        container.innerHTML = `

            <div class="dashboard-information">

                <h3>Account Overview</h3>

                <p>
                    You are currently registered as a buyer.
                </p>

                <p>
                    Apply to become a verified seller to publish
                    your poultry products.
                </p>

                ${
                    status === "pending"
                        ? `
                            <p class="status-badge pending">
                                Your seller application is awaiting review.
                            </p>
                        `
                        : ""
                }

                ${
                    status === "rejected"
                        ? `
                            <p class="status-badge rejected">
                                Your previous application was rejected.
                            </p>
                        `
                        : ""
                }

            </div>

        `;

        return;

    }


    const sellerProducts = products.filter(
        product => product.sellerId === currentUser.uid
    );


    container.innerHTML = `

        <div class="seller-dashboard">

            <h3>Seller Dashboard</h3>

            <p>
                Manage your PoultryLink product listings.
            </p>


            <div class="seller-dashboard-stats">

                <div>
                    <strong>${sellerProducts.length}</strong>
                    <span>Your listings</span>
                </div>

            </div>


            <button
                type="button"
                class="primary-button full-width"
                data-seller-action="add"
            >
                + Add New Product
            </button>


            <h3>Your Products</h3>


            <div class="seller-products">

                ${
                    sellerProducts.length
                        ? sellerProducts.map(product => `

                            <div class="seller-product-item">

                                <h4>${escapeHTML(product.title)}</h4>

                                <p>${formatMoney(product.price)}</p>

                                <div class="seller-product-actions">

                                    <button
                                        type="button"
                                        class="secondary-button"
                                        data-seller-action="edit"
                                        data-product-id="${escapeHTML(product.id)}"
                                    >
                                        Edit
                                    </button>


                                    <button
                                        type="button"
                                        class="secondary-button"
                                        data-seller-action="delete"
                                        data-product-id="${escapeHTML(product.id)}"
                                    >
                                        Delete
                                    </button>

                                </div>

                            </div>

                        `).join("")
                        : "<p>You have not published any products yet.</p>"
                }

            </div>

        </div>

    `;

}


// ============================================================
// 43. DASHBOARD OPEN BUTTON
// ============================================================

$("dashboardName")?.addEventListener(
    "click",
    openDashboard
);


// ============================================================
// 44. INITIAL PAGE SETUP
// ============================================================

function initializePage() {

    setText(
        "year",
        new Date().getFullYear()
    );


    updateCartDisplay();

    updateAuthMode();

    loadProducts();

}


initializePage();


// ============================================================
// END OF POULTRYLINK SCRIPT
// ============================================================