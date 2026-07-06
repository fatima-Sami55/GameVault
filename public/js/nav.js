// Shared cart-count badge sync. Exposed globally so pages that mutate the
// cart (games.js, cart.js) can refresh the badge after add/update/remove.
async function updateCartCount() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  try {
    const response = await fetch('/cart/cart');
    if (!response.ok) {
      badge.textContent = '0';
      badge.style.removeProperty('display');
      return;
    }
    const items = await response.json();
    const count = Array.isArray(items)
      ? items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
      : 0;
    badge.textContent = String(count);
    badge.style.removeProperty('display');
  } catch (error) {
    console.error('Error updating cart count:', error);
    badge.textContent = '0';
    badge.style.removeProperty('display');
  }
}
window.updateCartCount = updateCartCount;

function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  var icons = { success: '\u2713', error: '\u2717', info: 'i' };
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
    '<span class="toast-message"></span>' +
    '<button type="button" class="toast-close" aria-label="Dismiss">&times;</button>';
  toast.querySelector('.toast-message').textContent = message;

  function dismiss() {
    toast.classList.add('toast-exit');
    setTimeout(function () { toast.remove(); }, 300);
  }

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  container.appendChild(toast);
  setTimeout(dismiss, 4500);
}
window.showToast = showToast;

// Turn a server-provided ?flash=...&flashType=... into a toast, then strip it
// from the URL so it doesn't re-fire on refresh/back.
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('flash');
    if (!message) return;
    const type = params.get('flashType') || 'info';
    setTimeout(function () { showToast(message, type); }, 60);

    params.delete('flash');
    params.delete('flashType');
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);
  } catch (err) {
    /* no-op */
  }
})();

(function () {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  const authButtons = document.querySelector('.auth-buttons');

  updateCartCount();

  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  function handleMobileAuthReposition() {
    const isMobile = window.matchMedia('(max-width: 992px)').matches;
    if (isMobile) {
      if (authButtons && navLinks && !document.querySelector('.mobile-auth-item')) {
        const li = document.createElement('li');
        li.className = 'mobile-auth-item';
        li.appendChild(authButtons);
        navLinks.appendChild(li);
      }
    } else {
      const mobileLi = document.querySelector('.mobile-auth-item');
      const navActions = document.querySelector('.nav-actions');
      if (mobileLi && authButtons && navActions) {
        navActions.appendChild(authButtons);
        mobileLi.remove();
      }
    }
  }

  handleMobileAuthReposition();
  window.addEventListener('resize', handleMobileAuthReposition);

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function () {
    navLinks.classList.toggle('nav-active');
    document.body.style.overflow = navLinks.classList.contains('nav-active') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('nav-active');
      document.body.style.overflow = '';
    });
  });
})();
