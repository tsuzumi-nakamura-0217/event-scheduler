/**
 * Main Router — Hash-based SPA routing
 */
(function () {
    const app = document.getElementById('app');

    function parseRoute() {
        const hash = window.location.hash.slice(1) || '/';

        // Route: /event/:id/results
        const resultsMatch = hash.match(/^\/event\/([^/]+)\/results$/);
        if (resultsMatch) {
            return { page: 'results', eventId: resultsMatch[1] };
        }

        // Route: /event/:id
        const eventMatch = hash.match(/^\/event\/([^/]+)$/);
        if (eventMatch) {
            return { page: 'respond', eventId: eventMatch[1] };
        }

        // Route: / (home)
        return { page: 'home' };
    }

    function navigate() {
        const route = parseRoute();

        // Scroll to top
        window.scrollTo(0, 0);

        switch (route.page) {
            case 'home':
                HomePage.render(app);
                break;
            case 'respond':
                RespondPage.render(app, route.eventId);
                break;
            case 'results':
                // Redirect old results URL to unified page
                window.location.hash = `/event/${route.eventId}`;
                return;
        }
    }

    // Listen for hash changes
    window.addEventListener('hashchange', navigate);

    // Logo click goes to home
    document.getElementById('logo-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '/';
    });

    // Initial route
    navigate();
})();
