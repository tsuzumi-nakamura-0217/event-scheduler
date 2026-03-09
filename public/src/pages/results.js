/**
 * Results Page — Redirect to unified event page
 */
window.ResultsPage = {
  render(container, eventId) {
    // Redirect to the unified event page
    window.location.hash = `/event/${eventId}`;
  }
};
