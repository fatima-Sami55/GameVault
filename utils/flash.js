/**
 * Redirect to a page while carrying a one-time "flash" message that the client
 * (public/js/nav.js) turns into a toast. Avoids plain-text white-screen errors.
 *
 * @param {import('express').Response} res
 * @param {string} path           Destination path (may already contain a query string)
 * @param {string} message        Message to show in the toast
 * @param {'success'|'error'|'info'} [type='error']
 */
function redirectWithFlash(res, path, message, type = 'error') {
  const sep = path.includes('?') ? '&' : '?';
  const query = `flash=${encodeURIComponent(message)}&flashType=${encodeURIComponent(type)}`;
  res.redirect(`${path}${sep}${query}`);
}

module.exports = { redirectWithFlash };
