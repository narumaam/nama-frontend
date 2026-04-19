/**
 * NAMA OS — Website Lead Capture Widget
 * ──────────────────────────────────────
 * Self-contained embeddable script. Zero dependencies. Zero external CSS.
 *
 * Usage:
 *   <script src="https://getnama.app/widget.js"
 *           data-token="YOUR_CAPTURE_TOKEN"
 *           data-color="#10B981"
 *           data-label="✈ Enquire Now">
 *   </script>
 */
(function () {
  'use strict';

  // ── Read config from the script tag ────────────────────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var TOKEN   = scriptTag.getAttribute('data-token') || '';
  var COLOR   = scriptTag.getAttribute('data-color') || '#10B981';
  var LABEL   = scriptTag.getAttribute('data-label') || '\u2708 Enquire Now';
  var API_BASE = 'https://getnama.app';

  if (!TOKEN) {
    console.warn('[NAMA Widget] No data-token provided. Widget will not load.');
    return;
  }

  // ── Utility: inject <style> once ───────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('nama-widget-styles')) return;
    var css = [
      '#nama-widget-btn{position:fixed;bottom:24px;right:24px;z-index:2147483647;',
      'display:flex;align-items:center;gap:8px;',
      'padding:13px 22px;border-radius:50px;border:none;cursor:pointer;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'font-size:15px;font-weight:700;color:#fff;letter-spacing:0.01em;',
      'box-shadow:0 4px 24px rgba(0,0,0,0.18);transition:transform 0.15s,box-shadow 0.15s;}',

      '#nama-widget-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.22);}',
      '#nama-widget-btn:active{transform:translateY(0);}',

      '#nama-modal-overlay{position:fixed;inset:0;z-index:2147483646;',
      'background:rgba(15,23,42,0.7);backdrop-filter:blur(4px);',
      'display:flex;align-items:center;justify-content:center;padding:16px;',
      'opacity:0;transition:opacity 0.2s;}',
      '#nama-modal-overlay.nama-visible{opacity:1;}',

      '#nama-modal{background:#fff;border-radius:20px;width:100%;max-width:480px;',
      'max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.25);',
      'transform:translateY(16px);transition:transform 0.2s;}',
      '#nama-modal-overlay.nama-visible #nama-modal{transform:translateY(0);}',

      '#nama-modal-header{padding:24px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;}',
      '#nama-modal-title{font-size:20px;font-weight:800;color:#0f172a;margin:0;}',
      '#nama-modal-sub{font-size:13px;color:#64748b;margin:4px 0 0;}',
      '#nama-modal-close{background:none;border:none;cursor:pointer;',
      'color:#94a3b8;font-size:22px;line-height:1;padding:0;margin:-4px -4px 0 0;}',
      '#nama-modal-close:hover{color:#0f172a;}',

      '#nama-modal-body{padding:20px 24px 24px;}',

      '.nama-field{margin-bottom:14px;}',
      '.nama-label{display:block;font-size:12px;font-weight:700;color:#475569;',
      'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;}',
      '.nama-input{width:100%;box-sizing:border-box;padding:10px 14px;',
      'border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;',
      'font-family:inherit;outline:none;transition:border-color 0.15s,box-shadow 0.15s;}',
      '.nama-input:focus{border-color:var(--nama-color,#10b981);',
      'box-shadow:0 0 0 3px rgba(16,185,129,0.12);}',
      '.nama-input::placeholder{color:#94a3b8;}',

      '.nama-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',

      '#nama-submit{width:100%;padding:13px;border:none;border-radius:12px;',
      'font-size:15px;font-weight:800;color:#fff;cursor:pointer;margin-top:6px;',
      'font-family:inherit;letter-spacing:0.01em;',
      'transition:opacity 0.15s,transform 0.15s;}',
      '#nama-submit:hover{opacity:0.92;}',
      '#nama-submit:active{transform:scale(0.98);}',
      '#nama-submit:disabled{opacity:0.55;cursor:not-allowed;}',

      '#nama-success{display:none;text-align:center;padding:32px 24px 36px;}',
      '#nama-success-icon{font-size:48px;margin-bottom:12px;}',
      '#nama-success-title{font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;}',
      '#nama-success-msg{font-size:14px;color:#64748b;line-height:1.5;margin:0;}',

      '#nama-error-msg{display:none;background:#fef2f2;border:1.5px solid #fca5a5;',
      'color:#dc2626;font-size:13px;font-weight:600;padding:10px 14px;',
      'border-radius:10px;margin-bottom:14px;}',

      '.nama-required{color:#ef4444;margin-left:2px;}',

      '@media(max-width:480px){#nama-modal{border-radius:16px;}',
      '#nama-widget-btn{bottom:16px;right:16px;}',
      '.nama-row{grid-template-columns:1fr;}}',
    ].join('');

    var style = document.createElement('style');
    style.id = 'nama-widget-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────
  function buildWidget() {
    injectStyles();

    // Floating button
    var btn = document.createElement('button');
    btn.id = 'nama-widget-btn';
    btn.textContent = LABEL;
    btn.style.background = COLOR;
    btn.setAttribute('aria-label', 'Open travel enquiry form');
    document.body.appendChild(btn);

    // Modal overlay
    var overlay = document.createElement('div');
    overlay.id = 'nama-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'nama-modal-title');
    overlay.innerHTML = [
      '<div id="nama-modal">',
      '  <div id="nama-modal-header">',
      '    <div>',
      '      <p id="nama-modal-title">Plan Your Trip</p>',
      '      <p id="nama-modal-sub">Fill in your details and we\'ll craft the perfect itinerary for you.</p>',
      '    </div>',
      '    <button id="nama-modal-close" aria-label="Close">&times;</button>',
      '  </div>',
      '  <div id="nama-modal-body">',
      '    <div id="nama-error-msg"></div>',
      '    <form id="nama-form" novalidate>',
      '      <div class="nama-field">',
      '        <label class="nama-label" for="nama-full-name">Full Name<span class="nama-required">*</span></label>',
      '        <input class="nama-input" id="nama-full-name" name="full_name" type="text" placeholder="Rahul Sharma" required autocomplete="name" />',
      '      </div>',
      '      <div class="nama-row">',
      '        <div class="nama-field">',
      '          <label class="nama-label" for="nama-email">Email</label>',
      '          <input class="nama-input" id="nama-email" name="email" type="email" placeholder="rahul@example.com" autocomplete="email" />',
      '        </div>',
      '        <div class="nama-field">',
      '          <label class="nama-label" for="nama-phone">Phone</label>',
      '          <input class="nama-input" id="nama-phone" name="phone" type="tel" placeholder="+91 98765 43210" autocomplete="tel" />',
      '        </div>',
      '      </div>',
      '      <div class="nama-field">',
      '        <label class="nama-label" for="nama-destination">Destination</label>',
      '        <input class="nama-input" id="nama-destination" name="destination" type="text" placeholder="Maldives, Bali, Europe…" />',
      '      </div>',
      '      <div class="nama-row">',
      '        <div class="nama-field">',
      '          <label class="nama-label" for="nama-dates">Travel Dates</label>',
      '          <input class="nama-input" id="nama-dates" name="travel_dates" type="text" placeholder="Dec 15–22, 2026" />',
      '        </div>',
      '        <div class="nama-field">',
      '          <label class="nama-label" for="nama-travelers">Travellers</label>',
      '          <input class="nama-input" id="nama-travelers" name="travelers_count" type="number" placeholder="2" min="1" max="50" value="2" />',
      '        </div>',
      '      </div>',
      '      <div class="nama-row">',
      '        <div class="nama-field">',
      '          <label class="nama-label" for="nama-budget">Budget / Person</label>',
      '          <input class="nama-input" id="nama-budget" name="budget_per_person" type="number" placeholder="50000" min="0" />',
      '        </div>',
      '        <div class="nama-field">',
      '          <label class="nama-label" for="nama-currency">Currency</label>',
      '          <select class="nama-input" id="nama-currency" name="currency">',
      '            <option value="INR">INR ₹</option>',
      '            <option value="USD">USD $</option>',
      '            <option value="EUR">EUR &euro;</option>',
      '            <option value="GBP">GBP &pound;</option>',
      '            <option value="AED">AED د.إ</option>',
      '          </select>',
      '        </div>',
      '      </div>',
      '      <div class="nama-field">',
      '        <label class="nama-label" for="nama-notes">Anything else?</label>',
      '        <textarea class="nama-input" id="nama-notes" name="notes" rows="3" placeholder="Special requests, travel style, celebrations…"></textarea>',
      '      </div>',
      '      <button type="submit" id="nama-submit" style="background:' + COLOR + '">Send Enquiry</button>',
      '    </form>',
      '    <div id="nama-success">',
      '      <div id="nama-success-icon">&#x2705;</div>',
      '      <p id="nama-success-title">Enquiry Sent!</p>',
      '      <p id="nama-success-msg">Thank you! We\'ll be in touch within 2 hours.</p>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');

    document.body.appendChild(overlay);

    // CSS variable for focus ring colour
    document.documentElement.style.setProperty('--nama-color', COLOR);

    // ── Event listeners ──────────────────────────────────────────────────────
    btn.addEventListener('click', openModal);
    document.getElementById('nama-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
    document.getElementById('nama-form').addEventListener('submit', handleSubmit);
  }

  // ── Modal open / close ─────────────────────────────────────────────────────
  function openModal() {
    var overlay = document.getElementById('nama-modal-overlay');
    overlay.style.display = 'flex';
    // Force reflow before adding class so CSS transition fires
    overlay.offsetHeight; // eslint-disable-line no-unused-expressions
    overlay.classList.add('nama-visible');
    // Focus first input for accessibility
    var first = document.getElementById('nama-full-name');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function closeModal() {
    var overlay = document.getElementById('nama-modal-overlay');
    overlay.classList.remove('nama-visible');
    setTimeout(function () {
      overlay.style.display = 'none';
      // Reset form after close animation
      resetForm();
    }, 220);
  }

  function resetForm() {
    var form = document.getElementById('nama-form');
    var success = document.getElementById('nama-success');
    var errMsg = document.getElementById('nama-error-msg');
    if (form) { form.style.display = ''; form.reset(); }
    if (success) success.style.display = 'none';
    if (errMsg) { errMsg.style.display = 'none'; errMsg.textContent = ''; }
    var submitBtn = document.getElementById('nama-submit');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Enquiry'; }
  }

  // ── Form submission ────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();

    var errMsg = document.getElementById('nama-error-msg');
    errMsg.style.display = 'none';
    errMsg.textContent = '';

    var fullName = document.getElementById('nama-full-name').value.trim();
    if (!fullName) {
      errMsg.textContent = 'Please enter your full name.';
      errMsg.style.display = 'block';
      document.getElementById('nama-full-name').focus();
      return;
    }

    var email    = document.getElementById('nama-email').value.trim() || null;
    var phone    = document.getElementById('nama-phone').value.trim() || null;

    if (!email && !phone) {
      errMsg.textContent = 'Please provide at least an email or phone number so we can reach you.';
      errMsg.style.display = 'block';
      document.getElementById('nama-email').focus();
      return;
    }

    var destination     = document.getElementById('nama-destination').value.trim() || null;
    var travel_dates    = document.getElementById('nama-dates').value.trim() || null;
    var travelers_count = parseInt(document.getElementById('nama-travelers').value, 10) || 1;
    var budget_raw      = document.getElementById('nama-budget').value.trim();
    var budget_per_person = budget_raw ? parseFloat(budget_raw) : null;
    var currency        = document.getElementById('nama-currency').value || 'INR';
    var notes           = document.getElementById('nama-notes').value.trim() || null;

    var payload = {
      full_name:         fullName,
      email:             email,
      phone:             phone,
      destination:       destination,
      travel_dates:      travel_dates,
      travelers_count:   travelers_count,
      budget_per_person: budget_per_person,
      currency:          currency,
      notes:             notes,
    };

    var submitBtn = document.getElementById('nama-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    var url = API_BASE + '/api/v1/capture/lead?token=' + encodeURIComponent(TOKEN);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (res.status === 429) {
          throw new Error('Too many requests. Please try again in an hour.');
        }
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.detail || 'Submission failed. Please try again.');
          });
        }
        return res.json();
      })
      .then(function (data) {
        if (data.success) {
          // Show success state
          document.getElementById('nama-form').style.display = 'none';
          var success = document.getElementById('nama-success');
          success.style.display = 'block';
          if (data.message) {
            document.getElementById('nama-success-msg').textContent = data.message;
          }
          // Auto-close after 4 seconds
          setTimeout(function () { closeModal(); }, 4000);
        } else {
          throw new Error('Submission failed. Please try again.');
        }
      })
      .catch(function (err) {
        errMsg.textContent = err.message || 'Something went wrong. Please try again.';
        errMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Enquiry';
      });
  }

  // ── Boot: wait for DOM then build ─────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
