const firebaseConfig = {
  apiKey: "AIzaSyAOSlv6VF3__etlu0XxBWc3_2GYNOcj820",
  authDomain: "royal-e07f0.firebaseapp.com",
  databaseURL: "https://royal-e07f0-default-rtdb.firebaseio.com", // ← MUST HAVE
  projectId: "royal-e07f0",
  storageBucket: "royal-e07f0.appspot.com",
  messagingSenderId: "161611565973",
  appId: "1:161611565973:web:08d655e683e6409317049c",
  measurementId: "G-FT1QYN6GK9"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.querySelector('#current-user span');
const loginError = document.getElementById('login-error');

// App state
let cart = [];
let currentUser = null;

// Initialize the app
function init() {
    setupEventListeners();
    checkAuthState();
}

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            showApp();
            loadInitialData();
        } else {
            showLogin();
        }
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
    
    // Close receipt details
    document.getElementById('close-receipt').addEventListener('click', () => {
        document.getElementById('receipts-list').classList.remove('hidden');
        document.getElementById('receipt-details').classList.add('hidden');
    });
}

// Authentication handlers
function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            showError(error.message);
        });
}

function handleSignup() {
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

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Initialize user data
            return initializeUserData(userCredential.user.uid);
        })
        .catch(error => {
            showError(error.message);
        });
}

function handleLogout() {
    auth.signOut();
}

function showError(message) {
    loginError.textContent = message;
    setTimeout(() => {
        loginError.textContent = '';
    }, 5000);
}

// Initialize user data structure
function initializeUserData(userId) {
    const defaultProducts = [
        { id: generateId(), name: 'Coffee', price: 2.50 },
        { id: generateId(), name: 'Tea', price: 1.80 },
        { id: generateId(), name: 'Sandwich', price: 4.50 }
    ];

    return database.ref('users/' + userId).set({
        products: defaultProducts,
        receipts: [],
        expenses: []
    });
}

// Load initial data
function loadInitialData() {
    loadProducts();
    loadReceipts();
    loadExpenses();
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

// Product Management
function loadProductsForPOS() {
    database.ref('users/' + currentUser.uid + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const container = document.getElementById('pos-products');
            container.innerHTML = '';

            products.forEach(product => {
                const productElement = document.createElement('div');
                productElement.className = 'product-item';
                productElement.setAttribute('data-id', product.id);
                productElement.innerHTML = `
                    <div class="name">${product.name}</div>
                    <div class="price">$${product.price.toFixed(2)}</div>
                `;
                container.appendChild(productElement);
            });
        });
}

function loadProducts() {
    database.ref('users/' + currentUser.uid + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const container = document.getElementById('products-list');
            container.innerHTML = '';

            products.forEach(product => {
                const productElement = document.createElement('div');
                productElement.className = 'product-card';
                productElement.setAttribute('data-id', product.id);
                productElement.innerHTML = `
                    <h3>${product.name}</h3>
                    <div class="price">$${product.price.toFixed(2)}</div>
                    <div class="actions">
                        <button class="edit-btn">Edit</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                `;
                container.appendChild(productElement);
            });
        });
}

function addProduct() {
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);

    if (!name || isNaN(price)) {
        alert('Please enter valid product name and price');
        return;
    }

    const newProduct = {
        id: generateId(),
        name,
        price
    };

    database.ref('users/' + currentUser.uid + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            products.push(newProduct);
            return database.ref('users/' + currentUser.uid + '/products').set(products);
        })
        .then(() => {
            document.getElementById('product-name').value = '';
            document.getElementById('product-price').value = '';
            loadProducts();
            loadProductsForPOS();
        });
}

function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    database.ref('users/' + currentUser.uid + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const updatedProducts = products.filter(product => product.id !== productId);
            return database.ref('users/' + currentUser.uid + '/products').set(updatedProducts);
        })
        .then(() => {
            loadProducts();
            loadProductsForPOS();
        });
}

function editProduct(productId) {
    const newName = prompt('Enter new product name:');
    if (newName === null) return;
    
    const newPrice = parseFloat(prompt('Enter new product price:'));
    if (isNaN(newPrice)) {
        alert('Invalid price');
        return;
    }

    database.ref('users/' + currentUser.uid + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const updatedProducts = products.map(product => {
                if (product.id === productId) {
                    return { ...product, name: newName, price: newPrice };
                }
                return product;
            });
            return database.ref('users/' + currentUser.uid + '/products').set(updatedProducts);
        })
        .then(() => {
            loadProducts();
            loadProductsForPOS();
        });
}

// POS Functions
function addToCart(productId) {
    database.ref('users/' + currentUser.uid + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const product = products.find(p => p.id === productId);

            if (!product) return;

            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    id: productId,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                });
            }

            updateCartDisplay();
        });
}

function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    if (item.quantity > 1) {
        item.quantity--;
    } else {
        cart.splice(itemIndex, 1);
    }

    updateCartDisplay();
}

function updateCartDisplay() {
    const container = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">Cart is empty</div>';
        totalElement.textContent = '0.00';
        return;
    }

    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div>
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">x${item.quantity}</span>
            </div>
            <div>
                <span class="item-price">$${itemTotal.toFixed(2)}</span>
                <span class="remove-item" data-id="${item.id}">✕</span>
            </div>
        `;
        container.appendChild(itemElement);
    });

    totalElement.textContent = total.toFixed(2);
}

function processPayment(method) {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const now = new Date();
    
    const receipt = {
        id: generateId(),
        date: now.toISOString(),
        items: [...cart],
        total,
        paymentMethod: method
    };

    database.ref('users/' + currentUser.uid + '/receipts').once('value')
        .then(snapshot => {
            const receipts = snapshot.val() || [];
            receipts.push(receipt);
            return database.ref('users/' + currentUser.uid + '/receipts').set(receipts);
        })
        .then(() => {
            cart = [];
            updateCartDisplay();
            alert(`Payment of $${total.toFixed(2)} with ${method === 'cash' ? 'Cash' : 'MoMo'} processed successfully!`);
            loadReceipts();
        });
}

// Receipts Management
function loadReceipts() {
    database.ref('users/' + currentUser.uid + '/receipts').once('value')
        .then(snapshot => {
            const receipts = snapshot.val() || [];
            const container = document.getElementById('receipts-list');
            container.innerHTML = '';

            if (receipts.length === 0) {
                container.innerHTML = '<div class="empty-message">No receipts found</div>';
                return;
            }

            receipts.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(receipt => {
                const date = new Date(receipt.date);
                const receiptElement = document.createElement('div');
                receiptElement.className = 'receipt-card';
                receiptElement.setAttribute('data-id', receipt.id);
                receiptElement.innerHTML = `
                    <div class="date">${date.toLocaleString()}</div>
                    <div class="total">$${receipt.total.toFixed(2)}</div>
                    <div class="payment-method ${receipt.paymentMethod}">${receipt.paymentMethod === 'cash' ? 'Cash' : 'MoMo'}</div>
                `;
                container.appendChild(receiptElement);
            });
        });
}

// Expenses Management
function loadExpenses() {
    database.ref('users/' + currentUser.uid + '/expenses').once('value')
        .then(snapshot => {
            const expenses = snapshot.val() || [];
            const container = document.getElementById('expenses-list');
            container.innerHTML = '';

            if (expenses.length === 0) {
                container.innerHTML = '<div class="empty-message">No expenses found</div>';
                return;
            }

            expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(expense => {
                const date = new Date(expense.date);
                const expenseElement = document.createElement('div');
                expenseElement.className = 'expense-card';
                expenseElement.setAttribute('data-id', expense.id);
                expenseElement.innerHTML = `
                    <h3>${expense.name}</h3>
                    <div class="amount">$${expense.amount.toFixed(2)}</div>
                    <div class="note">${expense.note || 'No notes'}</div>
                    <div class="date">${date.toLocaleString()}</div>
                    <button class="delete-expense">Delete</button>
                `;
                container.appendChild(expenseElement);
            });
        });
}

function addExpense() {
    const name = document.getElementById('expense-name').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const note = document.getElementById('expense-note').value.trim();

    if (!name || isNaN(amount)) {
        alert('Please enter valid expense name and amount');
        return;
    }

    const newExpense = {
        id: generateId(),
        name,
        amount,
        note,
        date: new Date().toISOString()
    };

    database.ref('users/' + currentUser.uid + '/expenses').once('value')
        .then(snapshot => {
            const expenses = snapshot.val() || [];
            expenses.push(newExpense);
            return database.ref('users/' + currentUser.uid + '/expenses').set(expenses);
        })
        .then(() => {
            document.getElementById('expense-name').value = '';
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-note').value = '';
            loadExpenses();
        });
}

// Reports
function generateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (start > end) {
        alert('Start date must be before end date');
        return;
    }

    Promise.all([
        database.ref('users/' + currentUser.uid + '/receipts').once('value'),
        database.ref('users/' + currentUser.uid + '/expenses').once('value')
    ]).then(([receiptsSnapshot, expensesSnapshot]) => {
        const receipts = receiptsSnapshot.val() || [];
        const expenses = expensesSnapshot.val() || [];
        
        const filteredReceipts = receipts.filter(receipt => {
            const receiptDate = new Date(receipt.date);
            return receiptDate >= start && receiptDate <= end;
        });
        
        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
        });
        
        const totalSales = filteredReceipts.reduce((sum, receipt) => sum + receipt.total, 0);
        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const profit = totalSales - totalExpenses;
        
        document.getElementById('total-sales').textContent = totalSales.toFixed(2);
        document.getElementById('total-expenses').textContent = totalExpenses.toFixed(2);
        document.getElementById('profit').textContent = profit.toFixed(2);
    });
}

// Initialize the app
init();