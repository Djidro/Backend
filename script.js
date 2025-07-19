// Firebase Modular SDK v9+ Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  push,
  remove
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

// Firebase Configuration (Replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyDT-jkaGrTxUBQj7w21AbYxcqoSFcoAfHM",
  authDomain: "backend-69bdf.firebaseapp.com",
  databaseURL: "https://backend-69bdf-default-rtdb.firebaseio.com",
  projectId: "backend-69bdf",
  storageBucket: "backend-69bdf.appspot.com",
  messagingSenderId: "1001319379375",
  appId: "1:1001319379375:web:a07c3d4a0351bbdea8bf5a",
  measurementId: "G-LST61LER3R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Enable session persistence
setPersistence(auth, browserSessionPersistence)
  .catch((error) => {
    console.error("Persistence error:", error);
  });

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.querySelector('#current-user span');
const loginError = document.getElementById('login-error');

// App State
let cart = [];
let currentUser = null;

// Initialize the app
function init() {
  setupEventListeners();
  checkAuthState();
}

// Check authentication state
function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      showApp();
      loadInitialData();
      updateUserLastLogin(user.uid);
    } else {
      showLogin();
    }
  });
}

// Update user's last login time
function updateUserLastLogin(userId) {
  const userRef = ref(database, `users/${userId}`);
  update(userRef, {
    lastLogin: new Date().toISOString()
  }).catch((error) => {
    console.error("Last login update failed:", error);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Authentication
  loginBtn.addEventListener('click', handleLogin);
  signupBtn.addEventListener('click', handleSignup);
  logoutBtn.addEventListener('click', handleLogout);
  
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Tabs navigation
  document.querySelectorAll('#tabs button').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      loadTab(tabId);
    });
  });

  // POS functionality
  document.getElementById('pos-products').addEventListener('click', (e) => {
    const productItem = e.target.closest('.product-item');
    if (productItem) {
      const productId = productItem.getAttribute('data-id');
      addToCart(productId);
    }
  });

  document.getElementById('cart-items').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item')) {
      const productId = e.target.getAttribute('data-id');
      removeFromCart(productId);
    }
  });

  document.querySelector('.payment-options').addEventListener('click', (e) => {
    if (e.target.classList.contains('pay-btn')) {
      const method = e.target.getAttribute('data-method');
      processPayment(method);
    }
  });

  // Products management
  document.getElementById('add-product').addEventListener('click', addProduct);
  document.getElementById('products-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const productId = e.target.closest('.product-card').getAttribute('data-id');
      deleteProduct(productId);
    }
    if (e.target.classList.contains('edit-btn')) {
      const productId = e.target.closest('.product-card').getAttribute('data-id');
      editProduct(productId);
    }
  });

  // Expenses management
  document.getElementById('add-expense').addEventListener('click', addExpense);
  
  // Reports
  document.getElementById('generate-report').addEventListener('click', generateReport);
}

// Authentication handlers
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    handleAuthError(error);
  }
}

async function handleSignup() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  if (password.length < 6) {
    showError('Password should be at least 6 characters');
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await initializeUserData(userCredential.user.uid, email);
  } catch (error) {
    handleAuthError(error);
  }
}

function handleLogout() {
  signOut(auth).catch((error) => {
    console.error("Logout error:", error);
  });
}

function handleAuthError(error) {
  let message = "Authentication failed. Please try again.";
  
  switch (error.code) {
    case 'auth/invalid-email':
      message = "Invalid email format";
      break;
    case 'auth/user-disabled':
      message = "Account disabled";
      break;
    case 'auth/user-not-found':
      message = "No account found with this email";
      break;
    case 'auth/wrong-password':
      message = "Incorrect password";
      break;
    case 'auth/email-already-in-use':
      message = "Email already in use";
      break;
    case 'auth/weak-password':
      message = "Password should be at least 6 characters";
      break;
  }
  
  showError(message);
}

function showError(message) {
  loginError.textContent = message;
  setTimeout(() => {
    loginError.textContent = '';
  }, 5000);
}

// Initialize user data structure
async function initializeUserData(userId, email) {
  const isAdmin = email === 'admin@yourdomain.com'; // Set your admin email
  
  const defaultProducts = [
    { id: generateId(), name: 'Coffee', price: 2.50 },
    { id: generateId(), name: 'Tea', price: 1.80 },
    { id: generateId(), name: 'Sandwich', price: 4.50 }
  ];

  const userData = {
    products: defaultProducts,
    receipts: [],
    expenses: [],
    role: isAdmin ? 'admin' : 'cashier',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  try {
    await set(ref(database, `users/${userId}`), userData);
  } catch (error) {
    console.error("User initialization failed:", error);
    throw error;
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Show/hide screens
function showLogin() {
  loginScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  emailInput.value = '';
  passwordInput.value = '';
  cart = []; // Clear cart on logout
}

function showApp() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  currentUserSpan.textContent = currentUser.email;
  loadTab('pos');
}

// Tab management
function loadTab(tabId) {
  // Update active tab
  document.querySelectorAll('#tabs button').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });

  // Show active tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('hidden', content.id !== tabId);
  });

  // Load specific tab data
  switch (tabId) {
    case 'pos':
      loadProductsForPOS();
      updateCartDisplay();
      break;
    case 'products':
      loadProducts();
      break;
    case 'receipts':
      loadReceipts();
      break;
    case 'expenses':
      loadExpenses();
      break;
    case 'reports':
      generateReport();
      break;
  }
}

// [Rest of your functions (loadProductsForPOS, loadProducts, addProduct, etc.) 
// remain exactly the same as in your original code, just replace:
// - `database.ref()` with `ref(database, path)`
// - `.once('value')` with `get()`
// - `.set()` with `set()`
// - `.push()` with `push()`
// - `.remove()` with `remove()`
// Add proper error handling for all Firebase operations]

// Initialize the app
init();