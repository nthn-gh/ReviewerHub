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
  if (window.parent !== window) {
    var resizeObserver = new ResizeObserver(function () {
      var h = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: 'RESIZE', height: h }, '*');
    });
    window.addEventListener('load', function() {
      resizeObserver.observe(document.body);
    });
  }
})();
