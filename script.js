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
  remove,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

// Firebase Configuration (Replace with your config)
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
  .catch((error) => console.error("Persistence error:", error));

// DOM Elements
const elements = {
  loginScreen: document.getElementById('login-screen'),
  appScreen: document.getElementById('app'),
  emailInput: document.getElementById('email'),
  passwordInput: document.getElementById('password'),
  loginBtn: document.getElementById('login-btn'),
  signupBtn: document.getElementById('signup-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  currentUserSpan: document.querySelector('#current-user span'),
  loginError: document.getElementById('login-error'),
  posProducts: document.getElementById('pos-products'),
  cartItems: document.getElementById('cart-items'),
  cartTotal: document.getElementById('cart-total')
};

// App State
const state = {
  cart: [],
  currentUser: null,
  products: []
};

// Utility Functions
const utils = {
  generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
  
  showError: (message, element = elements.loginError) => {
    element.textContent = message;
    setTimeout(() => element.textContent = '', 5000);
  },

  formatCurrency: (amount) => `$${parseFloat(amount).toFixed(2)}`
};

// Auth Functions
const authHandlers = {
  handleLogin: async () => {
    const { emailInput, passwordInput } = elements;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      utils.showError('Please enter both email and password');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      authHandlers.handleAuthError(error);
    }
  },

  handleSignup: async () => {
    const { emailInput, passwordInput } = elements;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      utils.showError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      utils.showError('Password should be at least 6 characters');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await databaseHandlers.initializeUserData(userCredential.user.uid, email);
    } catch (error) {
      authHandlers.handleAuthError(error);
    }
  },

  handleAuthError: (error) => {
    const messages = {
      'auth/invalid-email': 'Invalid email format',
      'auth/user-disabled': 'Account disabled',
      'auth/user-not-found': 'No account found',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email already in use',
      'auth/weak-password': 'Password too weak'
    };
    
    utils.showError(messages[error.code] || 'Authentication failed');
  }
};

// Database Functions
const databaseHandlers = {
  initializeUserData: async (userId, email) => {
    const isAdmin = email === 'admin@yourdomain.com';
    const defaultProducts = [
      { id: utils.generateId(), name: 'Coffee', price: 2.50 },
      { id: utils.generateId(), name: 'Tea', price: 1.80 },
      { id: utils.generateId(), name: 'Sandwich', price: 4.50 }
    ];

    const userData = {
      products: defaultProducts,
      receipts: [],
      expenses: [],
      role: isAdmin ? 'admin' : 'cashier',
      createdAt: new Date().toISOString()
    };

    try {
      await set(ref(database, `users/${userId}`), userData);
    } catch (error) {
      console.error("User init error:", error);
      throw error;
    }
  },

  loadProducts: async () => {
    try {
      const snapshot = await get(ref(database, `users/${state.currentUser.uid}/products`));
      state.products = snapshot.val() || [];
      return state.products;
    } catch (error) {
      console.error("Load products error:", error);
      return [];
    }
  },

  processPayment: async (method) => {
    if (state.cart.length === 0) {
      utils.showError('Cart is empty', elements.cartItems);
      return;
    }

    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const receipt = {
      id: utils.generateId(),
      date: new Date().toISOString(),
      items: [...state.cart],
      total,
      paymentMethod: method,
      cashier: state.currentUser.email
    };

    try {
      const receiptsRef = ref(database, `users/${state.currentUser.uid}/receipts`);
      const snapshot = await get(receiptsRef);
      const receipts = snapshot.val() || [];
      receipts.push(receipt);
      
      await set(receiptsRef, receipts);
      state.cart = [];
      uiHandlers.updateCartDisplay();
      
      alert(`Payment processed: ${utils.formatCurrency(total)} via ${method}`);
    } catch (error) {
      console.error("Payment error:", error);
      utils.showError('Payment failed', elements.cartItems);
    }
  }
};

// UI Functions
const uiHandlers = {
  showLogin: () => {
    elements.loginScreen.classList.remove('hidden');
    elements.appScreen.classList.add('hidden');
    elements.emailInput.value = '';
    elements.passwordInput.value = '';
    state.cart = [];
  },

  showApp: () => {
    elements.loginScreen.classList.add('hidden');
    elements.appScreen.classList.remove('hidden');
    elements.currentUserSpan.textContent = state.currentUser.email;
    uiHandlers.loadTab('pos');
  },

  loadTab: async (tabId) => {
    // Update active tab UI
    document.querySelectorAll('#tabs button').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });

    // Show active content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== tabId);
    });

    // Load data
    switch (tabId) {
      case 'pos':
        await uiHandlers.loadProductsForPOS();
        uiHandlers.updateCartDisplay();
        break;
      case 'products':
        await uiHandlers.loadProductsList();
        break;
      case 'receipts':
        await uiHandlers.loadReceipts();
        break;
    }
  },

  loadProductsForPOS: async () => {
    try {
      await databaseHandlers.loadProducts();
      elements.posProducts.innerHTML = state.products.map(product => `
        <div class="product-item" data-id="${product.id}">
          <div class="name">${product.name}</div>
          <div class="price">${utils.formatCurrency(product.price)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error("POS products error:", error);
    }
  },

  updateCartDisplay: () => {
    if (state.cart.length === 0) {
      elements.cartItems.innerHTML = '<div class="empty-cart">Cart is empty</div>';
      elements.cartTotal.textContent = '0.00';
      return;
    }

    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    elements.cartTotal.textContent = utils.formatCurrency(total);
    
    elements.cartItems.innerHTML = state.cart.map(item => `
      <div class="cart-item">
        <div>
          <span class="item-name">${item.name}</span>
          <span class="item-quantity">x${item.quantity}</span>
        </div>
        <div>
          <span class="item-price">${utils.formatCurrency(item.price * item.quantity)}</span>
          <span class="remove-item" data-id="${item.id}">✕</span>
        </div>
      </div>
    `).join('');
  }
};

// Event Listeners
const setupEventListeners = () => {
  // Auth
  elements.loginBtn.addEventListener('click', authHandlers.handleLogin);
  elements.signupBtn.addEventListener('click', authHandlers.handleSignup);
  elements.logoutBtn.addEventListener('click', () => signOut(auth));

  elements.passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') authHandlers.handleLogin();
  });

  // POS
  elements.posProducts.addEventListener('click', (e) => {
    const productItem = e.target.closest('.product-item');
    if (productItem) {
      const productId = productItem.dataset.id;
      const product = state.products.find(p => p.id === productId);
      if (product) {
        const existing = state.cart.find(item => item.id === productId);
        existing ? existing.quantity++ : state.cart.push({...product, quantity: 1});
        uiHandlers.updateCartDisplay();
      }
    }
  });

  elements.cartItems.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item')) {
      const productId = e.target.dataset.id;
      const index = state.cart.findIndex(item => item.id === productId);
      if (index !== -1) {
        state.cart[index].quantity > 1 ? 
          state.cart[index].quantity-- : 
          state.cart.splice(index, 1);
        uiHandlers.updateCartDisplay();
      }
    }
  });

  document.querySelector('.payment-options').addEventListener('click', (e) => {
    if (e.target.classList.contains('pay-btn')) {
      databaseHandlers.processPayment(e.target.dataset.method);
    }
  });
};

// Initialize App
const init = () => {
  setupEventListeners();
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      state.currentUser = user;
      uiHandlers.showApp();
    } else {
      uiHandlers.showLogin();
    }
  });
};

// Start the application
init();