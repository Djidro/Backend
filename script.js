// Data structure
const dataKeys = {
    products: 'pos_products',
    receipts: 'pos_receipts',
    expenses: 'pos_expenses',
    shifts: 'pos_shifts',
    users: 'pos_users',
    currentShift: 'pos_current_shift'
};

// Initialize data if not exists
function initializeData() {
    if (!localStorage.getItem(dataKeys.products)) {
        const sampleProducts = [
            { id: 1, name: 'Coffee', price: 2.50 },
            { id: 2, name: 'Tea', price: 1.80 },
            { id: 3, name: 'Sandwich', price: 4.50 },
            { id: 4, name: 'Cake', price: 3.20 },
            { id: 5, name: 'Water', price: 1.00 }
        ];
        localStorage.setItem(dataKeys.products, JSON.stringify(sampleProducts));
    }

    if (!localStorage.getItem(dataKeys.users)) {
        const sampleUsers = [
            { username: 'admin', password: 'admin123', name: 'Admin' },
            { username: 'cashier', password: 'cashier123', name: 'Cashier' }
        ];
        localStorage.setItem(dataKeys.users, JSON.stringify(sampleUsers));
    }

    // Initialize other data keys with empty arrays if they don't exist
    [dataKeys.receipts, dataKeys.expenses, dataKeys.shifts].forEach(key => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify([]));
        }
    });
}

// DOM elements
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.querySelector('#current-user span');
const tabs = document.querySelectorAll('#tabs button');
const tabContents = document.querySelectorAll('.tab-content');

// Cart state
let cart = [];

// Current user
let currentUser = null;

// Initialize the app
function init() {
    initializeData();
    setupEventListeners();
    checkLoginStatus();
}

// Check if user is logged in
function checkLoginStatus() {
    const user = sessionStorage.getItem('pos_current_user');
    if (user) {
        currentUser = JSON.parse(user);
        showApp();
    } else {
        showLogin();
    }
}

// Show login screen
function showLogin() {
    loginScreen.classList.remove('hidden');
    app.classList.add('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
}

// Show app screen
function showApp() {
    loginScreen.classList.add('hidden');
    app.classList.remove('hidden');
    currentUserSpan.textContent = currentUser.name;
    loadTab('pos');
}

// Setup event listeners
function setupEventListeners() {
    // Login
    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('pos_current_user');
        currentUser = null;
        showLogin();
    });

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            loadTab(tabId);
        });
    });

    // POS tab - Product click handler
    document.getElementById('pos-products').addEventListener('click', (e) => {
        const productItem = e.target.closest('.product-item');
        if (productItem) {
            const productId = parseInt(productItem.getAttribute('data-id'));
            addToCart(productId);
        }
    });

    // Cart item removal handler
    document.getElementById('cart-items').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            const productId = parseInt(e.target.getAttribute('data-id'));
            removeFromCart(productId);
        }
    });

    // Payment buttons
    document.querySelector('.payment-options').addEventListener('click', (e) => {
        if (e.target.classList.contains('pay-btn')) {
            const method = e.target.getAttribute('data-method');
            processPayment(method);
        }
    });

    // Products tab
    document.getElementById('add-product').addEventListener('click', addProduct);
    document.getElementById('products-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const productId = parseInt(e.target.closest('.product-card').getAttribute('data-id'));
            deleteProduct(productId);
        }

        if (e.target.classList.contains('edit-btn')) {
            const productId = parseInt(e.target.closest('.product-card').getAttribute('data-id'));
            editProduct(productId);
        }
    });

    // Receipts tab
    document.getElementById('receipts-list').addEventListener('click', (e) => {
        if (e.target.closest('.receipt-card')) {
            const receiptId = e.target.closest('.receipt-card').getAttribute('data-id');
            showReceiptDetails(receiptId);
        }
    });

    document.getElementById('close-receipt').addEventListener('click', () => {
        document.getElementById('receipts-list').classList.remove('hidden');
        document.getElementById('receipt-details').classList.add('hidden');
    });

    // Expenses tab
    document.getElementById('add-expense').addEventListener('click', addExpense);
    document.getElementById('expenses-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-expense')) {
            const expenseId = e.target.closest('.expense-card').getAttribute('data-id');
            deleteExpense(expenseId);
        }
    });

    // Reports tab
    document.getElementById('generate-report').addEventListener('click', generateReport);
    
    // Set default dates for report
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-start-date').value = today;
    document.getElementById('report-end-date').value = today;
    
    // Shifts tab
    document.getElementById('start-shift').addEventListener('click', startShift);
    document.getElementById('end-shift').addEventListener('click', endShift);
}

// Handle login
function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    const users = JSON.parse(localStorage.getItem(dataKeys.users));
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        sessionStorage.setItem('pos_current_user', JSON.stringify(user));
        showApp();
    } else {
        alert('Invalid username or password');
    }
}

// Load tab content
function loadTab(tabId) {
    // Update active tab
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Show active tab content
    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
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
        case 'shifts':
            loadShifts();
            checkCurrentShift();
            break;
    }
}

// Product Management
function loadProductsForPOS() {
    const products = JSON.parse(localStorage.getItem(dataKeys.products));
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
}

function loadProducts() {
    const products = JSON.parse(localStorage.getItem(dataKeys.products));
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
}

function addProduct() {
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);

    if (!name || isNaN(price)) {
        alert('Please enter valid product name and price');
        return;
    }

    const products = JSON.parse(localStorage.getItem(dataKeys.products));
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    products.push({
        id: newId,
        name,
        price
    });

    localStorage.setItem(dataKeys.products, JSON.stringify(products));
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    loadProducts();
    loadProductsForPOS();
}

function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const products = JSON.parse(localStorage.getItem(dataKeys.products));
    const updatedProducts = products.filter(product => product.id !== id);
    localStorage.setItem(dataKeys.products, JSON.stringify(updatedProducts));
    loadProducts();
    loadProductsForPOS();
}

function editProduct(id) {
    const products = JSON.parse(localStorage.getItem(dataKeys.products));
    const product = products.find(p => p.id === id);
    
    const newName = prompt('Enter new product name:', product.name);
    if (newName === null) return;
    
    const newPrice = parseFloat(prompt('Enter new product price:', product.price));
    if (isNaN(newPrice)) {
        alert('Invalid price');
        return;
    }

    product.name = newName.trim();
    product.price = newPrice;
    
    localStorage.setItem(dataKeys.products, JSON.stringify(products));
    loadProducts();
    loadProductsForPOS();
}

// POS Functions
function addToCart(productId) {
    const products = JSON.parse(localStorage.getItem(dataKeys.products));
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
        id: Date.now(),
        date: now.toISOString(),
        items: [...cart],
        total,
        paymentMethod: method,
        employee: currentUser.name
    };

    // Save receipt
    const receipts = JSON.parse(localStorage.getItem(dataKeys.receipts));
    receipts.push(receipt);
    localStorage.setItem(dataKeys.receipts, JSON.stringify(receipts));

    // Clear cart
    cart = [];
    updateCartDisplay();

    alert(`Payment of $${total.toFixed(2)} with ${method === 'cash' ? 'Cash' : 'MoMo'} processed successfully!`);
    loadReceipts();
}

// Receipts Functions
function loadReceipts() {
    const receipts = JSON.parse(localStorage.getItem(dataKeys.receipts));
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
            <div class="employee">${receipt.employee}</div>
        `;
        container.appendChild(receiptElement);
    });
}

function showReceiptDetails(receiptId) {
    const receipts = JSON.parse(localStorage.getItem(dataKeys.receipts));
    const receipt = receipts.find(r => r.id === parseInt(receiptId));
    
    if (!receipt) return;

    const date = new Date(receipt.date);
    const container = document.getElementById('receipt-content');
    container.innerHTML = `
        <div class="receipt-header">
            <h4>Receipt #${receipt.id}</h4>
            <div>${date.toLocaleString()}</div>
            <div>Employee: ${receipt.employee}</div>
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
}

// Expenses Functions
function loadExpenses() {
    const expenses = JSON.parse(localStorage.getItem(dataKeys.expenses));
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
}

function addExpense() {
    const name = document.getElementById('expense-name').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const note = document.getElementById('expense-note').value.trim();

    if (!name || isNaN(amount)) {
        alert('Please enter valid expense name and amount');
        return;
    }

    const expenses = JSON.parse(localStorage.getItem(dataKeys.expenses));
    const newId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
    
    expenses.push({
        id: newId,
        name,
        amount,
        note,
        date: new Date().toISOString(),
        employee: currentUser.name
    });

    localStorage.setItem(dataKeys.expenses, JSON.stringify(expenses));
    document.getElementById('expense-name').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    loadExpenses();
}

function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const expenses = JSON.parse(localStorage.getItem(dataKeys.expenses));
    const updatedExpenses = expenses.filter(expense => expense.id !== parseInt(id));
    localStorage.setItem(dataKeys.expenses, JSON.stringify(updatedExpenses));
    loadExpenses();
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
    
    // Filter receipts
    const receipts = JSON.parse(localStorage.getItem(dataKeys.receipts));
    const filteredReceipts = receipts.filter(receipt => {
        const receiptDate = new Date(receipt.date);
        return receiptDate >= start && receiptDate <= end;
    });
    
    // Filter expenses
    const expenses = JSON.parse(localStorage.getItem(dataKeys.expenses));
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
}

// Shifts Functions
function loadShifts() {
    const shifts = JSON.parse(localStorage.getItem(dataKeys.shifts));
    const container = document.getElementById('shifts-list');
    container.innerHTML = '';

    if (shifts.length === 0) {
        container.innerHTML = '<div class="empty-message">No shifts recorded</div>';
        return;
    }

    shifts.sort((a, b) => new Date(b.start) - new Date(a.start)).forEach(shift => {
        const startDate = new Date(shift.start);
        const endDate = shift.end ? new Date(shift.end) : null;
        
        let duration = 'In progress';
        if (endDate) {
            const diffMs = endDate - startDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${diffHours}h ${diffMinutes}m`;
        }
        
        const shiftElement = document.createElement('div');
        shiftElement.className = 'shift-card';
        shiftElement.innerHTML = `
            <div class="employee">${shift.employee}</div>
            <div class="duration">${duration}</div>
            <div class="times">
                <span>Start: ${startDate.toLocaleString()}</span>
                ${endDate ? `<span>End: ${endDate.toLocaleString()}</span>` : ''}
            </div>
        `;
        container.appendChild(shiftElement);
    });
}

function checkCurrentShift() {
    const currentShift = JSON.parse(localStorage.getItem(dataKeys.currentShift));
    
    if (currentShift && currentShift.employee === currentUser.name) {
        document.getElementById('start-shift').classList.add('hidden');
        document.getElementById('end-shift').classList.remove('hidden');
    } else {
        document.getElementById('start-shift').classList.remove('hidden');
        document.getElementById('end-shift').classList.add('hidden');
    }
}

function startShift() {
    const shifts = JSON.parse(localStorage.getItem(dataKeys.shifts));
    const newId = shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1;
    
    const newShift = {
        id: newId,
        employee: currentUser.name,
        start: new Date().toISOString(),
        end: null
    };
    
    localStorage.setItem(dataKeys.currentShift, JSON.stringify(newShift));
    checkCurrentShift();
}

function endShift() {
    const currentShift = JSON.parse(localStorage.getItem(dataKeys.currentShift));
    if (!currentShift || currentShift.employee !== currentUser.name) return;
    
    currentShift.end = new Date().toISOString();
    
    const shifts = JSON.parse(localStorage.getItem(dataKeys.shifts));
    shifts.push(currentShift);
    
    localStorage.setItem(dataKeys.shifts, JSON.stringify(shifts));
    localStorage.removeItem(dataKeys.currentShift);
    
    checkCurrentShift();
    loadShifts();
}

// Initialize the app
init();
