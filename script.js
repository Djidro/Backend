// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0zNa92mKuwfNc5HL6H8Yz8CZK1Gs_USo",
  authDomain: "newpos-52ac3.firebaseapp.com",
  projectId: "newpos-52ac3",
  storageBucket: "newpos-52ac3.appspot.com",
  messagingSenderId: "48049714039",
  appId: "1:48049714039:web:b0f4858f30b21e97da2772",
  measurementId: "G-8YNTR8P16D"
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

// Cart state
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
    // Login
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Tabs
    document.querySelectorAll('#tabs button').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            loadTab(tabId);
        });
    });

    // POS tab
    document.getElementById('pos-products').addEventListener('click', (e) => {
        const productItem = e.target.closest('.product-item');
        if (productItem) {
            const productId = productItem.getAttribute('data-id');
            addToCart(productId);
        }
    });

    // Cart
    document.getElementById('cart-items').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            const productId = e.target.getAttribute('data-id');
            removeFromCart(productId);
        }
    });

    // Payment
    document.querySelector('.payment-options').addEventListener('click', (e) => {
        if (e.target.classList.contains('pay-btn')) {
            const method = e.target.getAttribute('data-method');
            processPayment(method);
        }
    });

    // Products
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

    // Expenses
    document.getElementById('add-expense').addEventListener('click', addExpense);
    
    // Reports
    document.getElementById('generate-report').addEventListener('click', generateReport);
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
        .then(() => {
            // Success handled by auth state listener
        })
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
        .then(() => {
            // Create user data in database
            const userId = auth.currentUser.uid;
            return database.ref('users/' + userId).set({
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .then(() => {
            // Initialize user's data
            return initializeUserData();
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

// Initialize user data
function initializeUserData() {
    const userId = auth.currentUser.uid;
    const defaultProducts = [
        { id: '1', name: 'Coffee', price: 2.50 },
        { id: '2', name: 'Tea', price: 1.80 },
        { id: '3', name: 'Sandwich', price: 4.50 }
    ];

    return database.ref('users/' + userId + '/products').set(defaultProducts)
        .then(() => {
            return database.ref('users/' + userId + '/receipts').set([]);
        })
        .then(() => {
            return database.ref('users/' + userId + '/expenses').set([]);
        });
}

// Load initial data
function loadInitialData() {
    loadProducts();
    loadReceipts();
    loadExpenses();
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

// Load tab content
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
    const userId = currentUser.uid;
    database.ref('users/' + userId + '/products').once('value')
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
    const userId = currentUser.uid;
    database.ref('users/' + userId + '/products').once('value')
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

    const userId = currentUser.uid;
    const newProductRef = database.ref('users/' + userId + '/products').push();
    
    newProductRef.set({
        id: newProductRef.key,
        name,
        price
    }).then(() => {
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        loadProducts();
        loadProductsForPOS();
    });
}

function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const userId = currentUser.uid;
    database.ref('users/' + userId + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const updatedProducts = products.filter(product => product.id !== id);
            return database.ref('users/' + userId + '/products').set(updatedProducts);
        })
        .then(() => {
            loadProducts();
            loadProductsForPOS();
        });
}

function editProduct(id) {
    const newName = prompt('Enter new product name:');
    if (newName === null) return;
    
    const newPrice = parseFloat(prompt('Enter new product price:'));
    if (isNaN(newPrice)) {
        alert('Invalid price');
        return;
    }

    const userId = currentUser.uid;
    database.ref('users/' + userId + '/products').once('value')
        .then(snapshot => {
            const products = snapshot.val() || [];
            const productIndex = products.findIndex(p => p.id === id);
            
            if (productIndex !== -1) {
                products[productIndex].name = newName.trim();
                products[productIndex].price = newPrice;
                return database.ref('users/' + userId + '/products').set(products);
            }
        })
        .then(() => {
            loadProducts();
            loadProductsForPOS();
        });
}

// POS Functions
function addToCart(productId) {
    const userId = currentUser.uid;
    database.ref('users/' + userId + '/products').once('value')
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
        id: Date.now().toString(),
        date: now.toISOString(),
        items: [...cart],
        total,
        paymentMethod: method,
        employee: currentUser.email
    };

    const userId = currentUser.uid;
    database.ref('users/' + userId + '/receipts').once('value')
        .then(snapshot => {
            const receipts = snapshot.val() || [];
            receipts.push(receipt);
            return database.ref('users/' + userId + '/receipts').set(receipts);
        })
        .then(() => {
            cart = [];
            updateCartDisplay();
            alert(`Payment of $${total.toFixed(2)} with ${method === 'cash' ? 'Cash' : 'MoMo'} processed successfully!`);
            loadReceipts();
        });
}

// Receipts Functions
function loadReceipts() {
    const userId = currentUser.uid;
    database.ref('users/' + userId + '/receipts').once('value')
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

            // Add click handler for receipt details
            container.addEventListener('click', (e) => {
                const receiptCard = e.target.closest('.receipt-card');
                if (receiptCard) {
                    const receiptId = receiptCard.getAttribute('data-id');
                    showReceiptDetails(receiptId);
                }
            });
        });
}

function showReceiptDetails(receiptId) {
    const userId = currentUser.uid;
    database.ref('users/' + userId + '/receipts').once('value')
        .then(snapshot => {
            const receipts = snapshot.val() || [];
            const receipt = receipts.find(r => r.id === receiptId);
            
            if (!receipt) return;

            const date = new Date(receipt.date);
            const container = document.getElementById('receipt-content');
            container.innerHTML = `
                <div class="receipt-header">
                    <h4>Receipt #${receipt.id}</h4>
                    <div>${date.toLocaleString()}</div>
                    <div>Payment: <span class="payment-method ${receipt.paymentMethod}">${receipt.paymentMethod === 'cash' ? 'Cash' : 'MoMo'}</span></div>
                </div>
                <div class="receipt-items">
                    ${receipt.items.map(item => `
                        <div class="receipt-item">
                            <span>${item.name} x${item.quantity}</span>
                            <span>$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="receipt-total">
                    <span>Total:</span>
                    <span>$${receipt.total.toFixed(2)}</span>
                </div>
            `;

            document.getElementById('receipts-list').classList.add('hidden');
            document.getElementById('receipt-details').classList.remove('hidden');
        });
}

// Expenses Functions
function loadExpenses() {
    const userId = currentUser.uid;
    database.ref('users/' + userId + '/expenses').once('value')
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

            // Add click handler for deleting expenses
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-expense')) {
                    const expenseId = e.target.closest('.expense-card').getAttribute('data-id');
                    deleteExpense(expenseId);
                }
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

    const userId = currentUser.uid;
    const newExpenseRef = database.ref('users/' + userId + '/expenses').push();
    
    newExpenseRef.set({
        id: newExpenseRef.key,
        name,
        amount,
        note,
        date: new Date().toISOString()
    }).then(() => {
        document.getElementById('expense-name').value = '';
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-note').value = '';
        loadExpenses();
    });
}

function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const userId = currentUser.uid;
    database.ref('users/' + userId + '/expenses').once('value')
        .then(snapshot => {
            const expenses = snapshot.val() || [];
            const updatedExpenses = expenses.filter(expense => expense.id !== id);
            return database.ref('users/' + userId + '/expenses').set(updatedExpenses);
        })
        .then(() => {
            loadExpenses();
        });
}

// Reports Functions
function generateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end day
    
    if (start > end) {
        alert('Start date must be before end date');
        return;
    }

    const userId = currentUser.uid;
    
    Promise.all([
        database.ref('users/' + userId + '/receipts').once('value'),
        database.ref('users/' + userId + '/expenses').once('value')
    ]).then(([receiptsSnapshot, expensesSnapshot]) => {
        const receipts = receiptsSnapshot.val() || [];
        const expenses = expensesSnapshot.val() || [];
        
        // Filter receipts
        const filteredReceipts = receipts.filter(receipt => {
            const receiptDate = new Date(receipt.date);
            return receiptDate >= start && receiptDate <= end;
        });
        
        // Filter expenses
        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
        });
        
        // Calculate totals
        const totalSales = filteredReceipts.reduce((sum, receipt) => sum + receipt.total, 0);
        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const profit = totalSales - totalExpenses;
        
        // Update UI
        document.getElementById('total-sales').textContent = totalSales.toFixed(2);
        document.getElementById('total-expenses').textContent = totalExpenses.toFixed(2);
        document.getElementById('profit').textContent = profit.toFixed(2);
    });
}

// Initialize the app
init();

// Close receipt details handler
document.getElementById('close-receipt').addEventListener('click', () => {
    document.getElementById('receipts-list').classList.remove('hidden');
    document.getElementById('receipt-details').classList.add('hidden');
});