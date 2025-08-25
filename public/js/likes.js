// public/js/likes.js
(function () {
  // channel name for cross-tab sync
  const bc = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('post-likes') : null;

  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.like-btn');
    if (!btn || btn.classList.contains('disabled')) return;

    const slug = btn.dataset.slug;
    if (!slug) return;

    // prevent double clicks while request in flight
    if (btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';

    const icon = btn.querySelector('i');
    const countElem = btn.querySelector('.like-count');

    try {
      const res = await fetch(`/post/${slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await res.json();

      if (data && data.success) {
        // update the clicked button
        if (countElem) countElem.textContent = data.likes;

        if (data.liked) {
          if (icon) {
            icon.classList.remove('far');
            icon.classList.add('fas');
          }
          btn.classList.add('liked');
        } else {
          if (icon) {
            icon.classList.remove('fas');
            icon.classList.add('far');
          }
          btn.classList.remove('liked');
        }

        // small pop animation
        btn.classList.add('pop');
        setTimeout(() => btn.classList.remove('pop'), 200);

        // broadcast to other tabs/pages
        if (bc) {
          bc.postMessage({ slug, likes: data.likes, liked: data.liked });
        } else {
          // fallback: localStorage trigger (for older browsers)
          try {
            localStorage.setItem('post-like-event', JSON.stringify({ slug, likes: data.likes, liked: data.liked, t: Date.now() }));
          } catch (err) { /* ignore */ }
        }
      } else {
        // show message optionally - not essential
        console.warn('Like request failed', data);
      }
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      delete btn.dataset.loading;
    }
  });

  // Listen for BroadcastChannel messages to update any matching buttons on this page
  if (bc) {
    bc.addEventListener('message', (ev) => {
      const { slug, likes, liked } = ev.data || {};
      if (!slug) return;

      // update all .like-btn elements matching this slug
      document.querySelectorAll(`.like-btn[data-slug="${slug}"]`).forEach(btn => {
        const icon = btn.querySelector('i');
        const countElem = btn.querySelector('.like-count');
        if (countElem) countElem.textContent = likes;
        if (liked) {
          if (icon) { icon.classList.remove('far'); icon.classList.add('fas'); }
          btn.classList.add('liked');
        } else {
          if (icon) { icon.classList.remove('fas'); icon.classList.add('far'); }
          btn.classList.remove('liked');
        }
      });
    });
  } else {
    // fallback: listen for localStorage changes
    window.addEventListener('storage', (ev) => {
      if (ev.key !== 'post-like-event' || !ev.newValue) return;
      try {
        const { slug, likes, liked } = JSON.parse(ev.newValue);
        document.querySelectorAll(`.like-btn[data-slug="${slug}"]`).forEach(btn => {
          const icon = btn.querySelector('i');
          const countElem = btn.querySelector('.like-count');
          if (countElem) countElem.textContent = likes;
          if (liked) {
            if (icon) { icon.classList.remove('far'); icon.classList.add('fas'); }
            btn.classList.add('liked');
          } else {
            if (icon) { icon.classList.remove('fas'); icon.classList.add('far'); }
            btn.classList.remove('liked');
          }
        });
      } catch (e) { /* ignore parse errors */ }
    });
  }
})();
