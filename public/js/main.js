// DevHunt - Main Frontend JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Auto-hide alert messages after 4 seconds
  const alerts = document.querySelectorAll('.alert-error, .alert-success');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 4000);
  });

  // Confirmation for destructive actions
  const dangerForms = document.querySelectorAll('form[onsubmit]');
  dangerForms.forEach(form => {
    const originalOnsubmit = form.onsubmit;
    form.onsubmit = function(e) {
      if (!originalOnsubmit.call(this, e)) {
        e.preventDefault();
      }
    };
  });
});
