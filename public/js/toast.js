// Toast notification logic
function showToast(message, type = 'success') {
  let toast = document.createElement('div');
  toast.className = `toast-popup toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

// Optionally, expose globally
window.showToast = showToast;
