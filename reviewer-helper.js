/**
 * =====================================================
 *  ReviewerHub — Reviewer Helper Script
 * =====================================================
 *  HOW TO USE:
 *  1. Add this ONE line inside your reviewer HTML <head>:
 *       <script src="../reviewer-helper.js"></script>
 *
 *  2. When your quiz ends and you want to submit the score,
 *     call this ONE function anywhere in your JS:
 *       ReviewerDone(score, total);
 *
 *  Example:
 *       ReviewerDone(8, 10);   // student got 8 out of 10
 *
 *  That's it! The site handles XP, badges, and leaderboard.
 * =====================================================
 */
(function () {
  var _startTime = Date.now();

  window.ReviewerDone = function (score, total) {
    var timeSeconds = Math.round((Date.now() - _startTime) / 1000);
    window.parent.postMessage(
      {
        type: 'QUIZ_COMPLETE',
        score: parseInt(score, 10),
        total: parseInt(total, 10),
        timeSeconds: timeSeconds,
      },
      '*'
    );
  };

  // Auto-resize iframe (eliminates inner scrollbar)
  // Uses getBoundingClientRect to measure real content height,
  // NOT scrollHeight — which is inflated by min-height:100vh and causes
  // an infinite resize loop (each resize grows 100vh → grows scrollHeight → repeat).
  if (window.parent !== window) {
    var _lastSentHeight = 0;
    var _debounceTimer = null;

    function _getContentHeight() {
      // Walk all direct children of body and find the lowest rendered pixel.
      // This is unaffected by min-height / 100vh on body or html.
      var children = document.body.children;
      var maxBottom = 0;
      for (var i = 0; i < children.length; i++) {
        var rect = children[i].getBoundingClientRect();
        // getBoundingClientRect is relative to viewport; add scroll offset for full-page position
        var bottom = rect.bottom + (window.pageYOffset || document.documentElement.scrollTop);
        if (bottom > maxBottom) maxBottom = bottom;
      }
      // Add body padding-bottom so content isn't clipped
      var bodyStyle = window.getComputedStyle(document.body);
      var paddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
      return Math.max(maxBottom + paddingBottom, 100);
    }

    function _sendHeight() {
      var h = _getContentHeight();
      // Only send if height changed meaningfully (> 5px) to prevent duplicate messages
      if (Math.abs(h - _lastSentHeight) > 5) {
        _lastSentHeight = h;
        window.parent.postMessage({ type: 'RESIZE', height: h }, '*');
      }
    }

    var resizeObserver = new ResizeObserver(function () {
      // Debounce: wait 60ms for layout to settle before measuring
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(_sendHeight, 60);
    });

    window.addEventListener('load', function () {
      resizeObserver.observe(document.body);
      // Initial measurement after load
      setTimeout(_sendHeight, 100);
    });
  }
})();
