// Fetch cart items
async function fetchCart() {
    try {
        const response = await fetch('/cart/cart');
        const items = await response.json();
        displayCart(items);
        updateSummary(items);
    } catch (error) {
        console.error('Error fetching cart:', error);
        showError('Failed to load cart items');
    }
}

// Display cart items
function displayCart(items) {
    const container = document.getElementById('cart-items');
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Looks like you haven't added any games to your cart yet.</p>
                <a href="/games" class="continue-shopping">Continue Shopping</a>
            </div>
        `;
        document.getElementById('cart-summary').style.display = 'none';
        return;
    }

    document.getElementById('cart-summary').style.display = 'block';
    const itemsHTML = items.map(item => `
        <div class="cart-item" data-pid="${item.pid}">
            <img src="${item.img}" alt="${item.name}" class="item-image">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">$${item.price.toFixed(2)}</p>
                <div class="item-quantity">
                    <button class="quantity-btn minus-btn" data-pid="${item.pid}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                        data-pid="${item.pid}">
                    <button class="quantity-btn plus-btn" data-pid="${item.pid}">+</button>
                </div>
            </div>
            <button class="remove-btn" data-pid="${item.pid}">&times;</button>
        </div>
    `).join('');

    container.innerHTML = itemsHTML;

    // Add event listeners for quantity buttons
    container.querySelectorAll('.minus-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pid = btn.dataset.pid;
            const input = container.querySelector(`.quantity-input[data-pid="${pid}"]`);
            const newQuantity = parseInt(input.value) - 1;
            if (newQuantity >= 1) {
                updateQuantity(pid, newQuantity);
            }
        });
    });

    container.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pid = btn.dataset.pid;
            const input = container.querySelector(`.quantity-input[data-pid="${pid}"]`);
            const newQuantity = parseInt(input.value) + 1;
            updateQuantity(pid, newQuantity);
        });
    });

    container.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', () => {
            const pid = input.dataset.pid;
            const newQuantity = parseInt(input.value);
            if (newQuantity >= 1) {
                updateQuantity(pid, newQuantity);
            } else {
                input.value = 1;
            }
        });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pid = btn.dataset.pid;
            removeItem(pid);
        });
    });
}

// Update cart summary
function updateSummary(items) {
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// Update item quantity
async function updateQuantity(pid, quantity) {
    if (quantity < 1) return;

    try {
        const response = await fetch('/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pid, quantity })
        });

        if (response.ok) {
            fetchCart();
            if (typeof updateCartCount === 'function') updateCartCount();
        } else {
            showError('Failed to update quantity');
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showError('Failed to update quantity');
    }
}

// Remove item from cart
async function removeItem(pid) {
    try {
        const response = await fetch(`/cart/remove/${pid}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchCart();
            if (typeof updateCartCount === 'function') updateCartCount();
            showSuccess('Item removed from cart');
        } else {
            showError('Failed to remove item');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        showError('Failed to remove item');
    }
}

async function clearCart() {
        try {
            const response = await fetch('/cart/clear', {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchCart();
                if (typeof updateCartCount === 'function') updateCartCount();
                showSuccess('Cart cleared successfully!');
            } else {
                showError('Failed to clear cart');
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
            showError('Failed to clear cart');
        }
    }

// Checkout
function checkout() {
    window.location.href = "/order";  // Redirect to order page
}


// Show success message
function showSuccess(message) {
    if (typeof showToast === 'function') {
        showToast(message, 'success');
        return;
    }
    const alert = document.createElement('div');
    alert.className = 'success-message';
    alert.textContent = message;
    document.querySelector('.container').insertBefore(alert, document.querySelector('.cart-container'));
    setTimeout(() => alert.remove(), 3000);
}

// Show error message
function showError(message) {
    if (typeof showToast === 'function') {
        showToast(message, 'error');
        return;
    }
    const alert = document.createElement('div');
    alert.className = 'error-message';
    alert.textContent = message;
    document.querySelector('.container').insertBefore(alert, document.querySelector('.cart-container'));
    setTimeout(() => alert.remove(), 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchCart();
    if (typeof updateCartCount === 'function') updateCartCount();

    // Add event listener for checkout button
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
}); 