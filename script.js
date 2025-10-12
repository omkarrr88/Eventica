// Function to fetch event data
async function fetchEventData() {
    try {
        let eventsJsonPath = 'events.json';
        // Check if we're on the past events page
        if (window.location.pathname.includes('pastevents')) {
            eventsJsonPath = '../../events.json';
        }
        const response = await fetch(eventsJsonPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();
        populateEventGrids(events);
    } catch (error) {
        console.error('Error fetching event data:', error);
    }
}

// Function to check if an event is in the past
function isEventPast(eventDate) {
    const [day, month, year] = eventDate.split('-').map(Number);
    const eventDateObj = new Date(Date.UTC(year, month - 1, day)); // Months are 0-based
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())); // Normalize to UTC
    return eventDateObj < todayUTC;
}

// Function to create event cards
function createEventCard(event, isPastEvent = false) {
    const buttonText = isPastEvent ? 'View Details' : 'Register';
    const buttonClass = isPastEvent ? 'gallery-button' : 'register-button';

    let formattedDate = 'Invalid Date';

    try {
        // Parse date in DD-MM-YYYY format
        const [day, month, year] = event.date.split('-').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            throw new Error('Invalid date format');
        }
        const eventDateObj = new Date(Date.UTC(year, month - 1, day));

        // Check if the date is valid
        if (isNaN(eventDateObj.getTime())) {
            throw new Error('Invalid date');
        }

        // Get the components for the desired format
        const weekday = new Intl.DateTimeFormat('en-US', {
            weekday: 'long'
        }).format(eventDateObj);
        const dayNum = eventDateObj.getUTCDate();
        const monthName = new Intl.DateTimeFormat('en-US', {
            month: 'long'
        }).format(eventDateObj);
        const yearNum = eventDateObj.getUTCFullYear();

        // Combine components into the desired format
        formattedDate = `${dayNum} ${monthName} ${yearNum}, ${weekday}`;
    } catch (error) {
        console.error(`Error formatting date for event "${event.title}":`, error);
        formattedDate = 'Date not available';
    }

    // helper: safe base64 for Unicode strings, fallback to small hash
    function safeClientIdSeed(str) {
        try {
            // encode Unicode safely for btoa
            const encoded = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                return String.fromCharCode('0x' + p1);
            });
            return btoa(encoded).replace(/=+$/, '');
        } catch (e) {
            // fallback: small djb2-like hash
            let h = 5381;
            for (let i = 0; i < str.length; i++) {
                h = ((h << 5) + h) + str.charCodeAt(i);
                h = h & h;
            }
            return Math.abs(h).toString(36);
        }
    }

    // ensure we have a stable client id for static events
    const clientId = event._id ? event._id : ('client_' + safeClientIdSeed((event.title || '') + '::' + (event.date || '')));

    return `
        <div class="${isPastEvent ? 'past-event-card' : 'event-card'}" data-client-id="${clientId}">
            <div class="event-background">
                <img src="${event.image}" alt="Background" class="blurred-image">
            </div>
            <a href="${event.website || '#'}" target="_blank" rel="noopener noreferrer" class="${isPastEvent ? 'past-card-link' : 'card-link'}">
                <img src="${event.image}" alt="${event.title}" class="${isPastEvent ? 'past-event-image' : 'event-image'}">
                <div class="${isPastEvent ? 'past-event-details' : 'event-details'}">
                    <h3 class="${isPastEvent ? 'past-event-title' : 'event-title'}">${event.title}</h3>
                    <p class="${isPastEvent ? 'past-event-date' : 'event-date'}">${formattedDate}</p>
                    <p class="${isPastEvent ? 'past-event-time' : 'event-time'}">${event.time || 'Time not specified'}</p>
                    <p class="${isPastEvent ? 'past-event-location' : 'event-location'}">${event.location || 'Location not specified'}</p>
                    <p class="${isPastEvent ? 'past-event-description' : 'event-description'}">${event.description || 'No description available'}</p>
                    <a href="${event.website || '#'}" target="_blank" rel="noopener noreferrer" class="${buttonClass}">${buttonText}</a>
                    ${isPastEvent ? `<div class="event-rating">${renderStars(event.averageRating || 0)} <span class="rating-text">${((event.averageRating||0).toFixed(1))} / 5</span> <button class="review-btn" data-event-id="${event._id || ''}" data-client-id="${clientId}">Review</button></div>` : ''}
                </div>
            </a>
        </div>
    `;
}

// Helper to render star icons for average rating (up to 5)
function renderStars(avg) {
    // Render stars rounded to nearest integer for reliable display
    const rounded = Math.round(avg || 0);
    let out = '';
    for (let i = 0; i < 5; i++) {
        if (i < rounded) out += '<span class="star full">â˜…</span>';
        else out += '<span class="star">â˜…</span>';
    }
    return out;
}

// Function to populate event grids
function populateEventGrids(events) {
    // Filter past and upcoming events using isEventPast function
    const upcomingEvents = events.filter(event => !isEventPast(event.date));
    const pastEvents = events.filter(event => isEventPast(event.date));


    // Sort upcoming events by date in ascending order
    upcomingEvents.sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateA - dateB;
    });

    // Sort past events by date in descending order
    pastEvents.sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateB - dateA;
    });

    // Populate upcoming events grid
    const upcomingEventGrid = document.getElementById('upcoming-events');
    if (upcomingEventGrid) {
        upcomingEventGrid.innerHTML = upcomingEvents.map(event => createEventCard(event)).join('');
    }

    // Populate past events grid
    const pastEventGrid = document.getElementById('past-events');
    if (pastEventGrid) {
        // store raw past events for filtering
        window.__pastEventsStore = pastEvents; // exposed for debugging
        pastEventGrid.innerHTML = pastEvents.map(event => createEventCard(event, true)).join('');
        // populate location filter options (unique locations)
        populateLocationFilter(pastEvents);
    }
    // console.log(`Populated ${upcomingEvents.length} upcoming events and ${pastEvents.length} past events.`);
}

// Fetch and display events on DOM load if on the relevant page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.includes('pastevents')) {
        fetchEventData();
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    }
});

// Theme switcher functionality
document.addEventListener('DOMContentLoaded', function () {
    const themeToggle = document.getElementById('theme-toggle');
    const themeOptions = document.querySelector('.theme-options');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const logoImage = document.querySelector('.logo'); // Logo image element
    const savedTheme = localStorage.getItem('theme');

    const themeAssets = {
        blue: {
            logo: '/assets/images/logos/logo1.png',
            favicon: '/assets/images/favicons/favicon1.png'
        },
        red: {
            logo: '/assets/images/logos/logo2.png',
            favicon: '/assets/images/favicons/favicon2.png'
        },
        yellow: {
            logo: '/assets/images/logos/logo3.png',
            favicon: '/assets/images/favicons/favicon3.png'
        },
        green: {
            logo: '/assets/images/logos/logo4.png',
            favicon: '/assets/images/favicons/favicon4.png'
        },
        purple: {
            logo: '/assets/images/logos/logo5.png',
            favicon: '/assets/images/favicons/favicon5.png'
        },
    };

    const updateFavicon = (faviconPath) => {
        let faviconElement = document.querySelector("link[rel='icon']");
        if (!faviconElement) {
            faviconElement = document.createElement('link');
            faviconElement.rel = 'icon';
            faviconElement.type = 'image/x-icon';
            document.head.appendChild(faviconElement);
        }
        faviconElement.href = faviconPath;
    };

    // Set initial theme, logo, and favicon based on localStorage
    if (savedTheme && themeAssets[savedTheme]) {
        const {
            logo,
            favicon
        } = themeAssets[savedTheme];
        document.documentElement.setAttribute('data-theme', savedTheme);
        logoImage.src = logo;
        updateFavicon(favicon);
    }

    themeToggle.addEventListener('click', function () {
        themeOptions.classList.toggle('active');
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
    });

    themeButtons.forEach(button => {
        button.addEventListener('click', function () {
            const color = this.getAttribute('data-color');
            if (themeAssets[color]) {
                const {
                    logo,
                    favicon
                } = themeAssets[color];
                document.documentElement.setAttribute('data-theme', color);
                localStorage.setItem('theme', color);
                logoImage.src = logo;
                updateFavicon(favicon);
                themeOptions.classList.remove('active');
                themeToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Close theme options when clicking outside
    document.addEventListener('click', function (event) {
        if (!themeToggle.contains(event.target) && !themeOptions.contains(event.target)) {
            themeOptions.classList.remove('active');
            themeToggle.setAttribute('aria-expanded', 'false');
        }
    });
});

// Dark mode toggle based on preference
function applyDarkModePreference() {
    const darkModeStatus = localStorage.getItem('darkMode');
    if (darkModeStatus === 'enabled') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Immediately apply the stored dark mode preference
applyDarkModePreference();

// Toggle dark mode and save the preference
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
});

// Mobile menu functionality
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navItems = document.querySelector('.nav-items');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navItems.classList.toggle('active');

    // Toggle body scrolling for small devices
    if (navItems.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }

    // Update accessibility attributes
    const isOpen = navItems.classList.contains('active');
    mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Close mobile menu' : 'Open mobile menu');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navItems.contains(e.target) && !mobileMenuBtn.contains(e.target) && navItems.classList.contains('active')) {
        mobileMenuBtn.classList.remove('active');
        navItems.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.setAttribute('aria-label', 'Open mobile menu');
        document.body.style.overflow = 'auto';
    }
});

// Close mobile menu when window is resized
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && navItems.classList.contains('active')) {
        mobileMenuBtn.classList.remove('active');
        navItems.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.setAttribute('aria-label', 'Open mobile menu');
        document.body.style.overflow = 'auto';
    }
});

// Scroll to top button
document.addEventListener('DOMContentLoaded', () => {
    // Select the scroll-to-top button
    const toTop = document.querySelector(".to-top");

    if (!toTop) {
        console.error('Scroll-to-top element not found.');
        return;
    }

    // Show or hide the button on scroll
    function checkHeight() {
        if (window.scrollY > 100) {
            toTop.classList.add("active");
        } else {
            toTop.classList.remove("active");
        }
    }

    // Debounce the scroll event for performance
    let scrollTimeout;
    window.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(checkHeight, 100);
    });

    // Smooth scroll to top on button click
    toTop.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});

// Add to your main script.js or create auth-check.js
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('eventica_token');
    const user = JSON.parse(localStorage.getItem('eventica_user') || '{}');
    
    // Update navigation based on auth state
    const navbar = document.querySelector('.nav-links');
    if (navbar) {
        if (token) {
            // User is logged in - show dashboard link and logout
            const authHTML = `
                <li><a href="/dashboard.html">Dashboard</a></li>
                <li><a href="#" onclick="logout()">Logout (${user.username})</a></li>
            `;
            navbar.innerHTML += authHTML;
        } else {
            // User not logged in - show login link
            const authHTML = `
                <li><a href="/assets/register/register.html">Login</a></li>
            `;
            navbar.innerHTML += authHTML;
        }
    }
});


// Search bar
const searchButton = document.querySelector('.search-button');
const searchInput = document.querySelector('.search-input');

if (searchButton && searchInput) {
    const handleSearch = () => {
        // On past events page, use the unified filter pipeline which also respects date/location filters
        if (window.location.pathname.includes('pastevents') && typeof applyPastFilters === 'function') {
            applyPastFilters();
            return;
        }

        const query = searchInput.value.toLowerCase();
        let events = document.querySelectorAll('.event-card');

        events.forEach(event => {
            const title = event.querySelector('.event-title').textContent.toLowerCase();
            const description = event.querySelector('.event-description').textContent.toLowerCase();
            if (query === '' || title.includes(query) || description.includes(query)) {
                event.style.display = 'block'; // Show matching event or all events if query is empty
            } else {
                event.style.display = 'none'; // Hide non-matching event
            }
        });
    };

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('input', handleSearch);
}

// ------------------------
// Past events filtering
// ------------------------
// Holds the last built list of past events (objects)
window.__pastEventsStore = window.__pastEventsStore || [];

function parseEventDateToISO(event) {
    // event.date is DD-MM-YYYY
    try {
        const [d, m, y] = event.date.split('-').map(Number);
        if (!d || !m || !y) return null;
        const dt = new Date(Date.UTC(y, m - 1, d));
        return dt; // UTC date object
    } catch (e) {
        return null;
    }
}

function populateLocationFilter(events) {
    const select = document.getElementById('filter-location');
    if (!select) return;
    const locations = Array.from(new Set(events.map(e => (e.location || '').trim()).filter(Boolean)));
    // Clear existing but keep first 'All locations'
    select.innerHTML = '<option value="">All locations</option>' + locations.map(loc => `<option value="${escapeHtml(loc)}">${loc}</option>`).join('');
}

function escapeHtml(unsafe) {
    return unsafe.replace(/[&<"'>]/g, function (m) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m];
    });
}

function applyPastFilters() {
    const fromInput = document.getElementById('filter-date-from');
    const toInput = document.getElementById('filter-date-to');
    const locSelect = document.getElementById('filter-location');
    const query = (searchInput && searchInput.value || '').toLowerCase();

    const fromDate = fromInput && fromInput.value ? new Date(fromInput.value) : null; // local date
    const toDate = toInput && toInput.value ? new Date(toInput.value) : null;
    const location = locSelect && locSelect.value ? locSelect.value.toLowerCase() : '';

    const store = window.__pastEventsStore || [];
    const filtered = store.filter(e => {
        const dt = parseEventDateToISO(e);
        // date range check (convert UTC date to local-date-only for comparison)
        if (fromDate && (!dt || dt < Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()))) return false;
        if (toDate && (!dt || dt > Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()))) return false;
        // location check
        if (location && !(e.location || '').toLowerCase().includes(location)) return false;
        // search query check against title and description
        if (query) {
            const title = (e.title || '').toLowerCase();
            const desc = (e.description || '').toLowerCase();
            if (!title.includes(query) && !desc.includes(query)) return false;
        }
        return true;
    });

    const pastEventGrid = document.getElementById('past-events');
    if (pastEventGrid) {
        pastEventGrid.innerHTML = filtered.map(ev => createEventCard(ev, true)).join('');
    }
}

// Wire filter inputs (if present)
document.addEventListener('DOMContentLoaded', () => {
    const fromInput = document.getElementById('filter-date-from');
    const toInput = document.getElementById('filter-date-to');
    const locSelect = document.getElementById('filter-location');
    const resetBtn = document.getElementById('filter-reset');

    if (fromInput) fromInput.addEventListener('change', applyPastFilters);
    if (toInput) toInput.addEventListener('change', applyPastFilters);
    if (locSelect) locSelect.addEventListener('change', applyPastFilters);
    if (resetBtn) resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (fromInput) fromInput.value = '';
        if (toInput) toInput.value = '';
        if (locSelect) locSelect.value = '';
        if (searchInput) searchInput.value = '';
        // repopulate full past events
        const store = window.__pastEventsStore || [];
        const pastEventGrid = document.getElementById('past-events');
        if (pastEventGrid) pastEventGrid.innerHTML = store.map(ev => createEventCard(ev, true)).join('');
    });

    // Initialize flatpickr if available for consistent calendar UI
    try {
        if (typeof flatpickr === 'function') {
            const fpOptions = {
                altInput: true,
                altFormat: 'd-m-Y',
                dateFormat: 'Y-m-d', // ISO so JS Date can parse easily
                allowInput: true,
                wrap: false,
                onChange: function(selectedDates, dateStr, instance) {
                    // trigger filter when user picks a date
                    applyPastFilters();
                }
            };
            if (fromInput) flatpickr(fromInput, fpOptions);
            if (toInput) flatpickr(toInput, fpOptions);
        }
    } catch (err) {
        // flatpickr not available; native date inputs will still work
        console.warn('flatpickr init failed or not loaded', err);
    }
});

// Testimonials expansion functionality
document.addEventListener("DOMContentLoaded", () => {
    const seeMoreBtn = document.getElementById("see-more-btn");
    const extraTestimonials = document.querySelector(".extra-testimonials");

    if (seeMoreBtn && extraTestimonials) {
        seeMoreBtn.addEventListener("click", () => {
            // Toggle the "hidden" class
            extraTestimonials.classList.toggle("hidden");

            // Update button text and icon
            if (extraTestimonials.classList.contains("hidden")) {
                seeMoreBtn.innerHTML = 'See More <i class="fas fa-chevron-down"></i>';
            } else {
                seeMoreBtn.innerHTML = 'See Less <i class="fas fa-chevron-up"></i>';
            }
        });
    }
});

// ------------------------
// Reviews modal & network
// ------------------------
(function() {
    // Local reviews helpers for events without server _id
    function getLocalReviews(clientId) {
        try {
            const raw = localStorage.getItem('local_reviews') || '{}';
            const store = JSON.parse(raw);
            return (store[clientId] || []);
        } catch (e) { return []; }
    }

    function setLocalReviews(clientId, reviews) {
        try {
            const raw = localStorage.getItem('local_reviews') || '{}';
            const store = JSON.parse(raw);
            store[clientId] = reviews;
            localStorage.setItem('local_reviews', JSON.stringify(store));
        } catch (e) { console.error('Failed to save local reviews', e); }
    }

    function computeAverage(reviews) {
        if (!reviews || reviews.length === 0) return 0;
        const s = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        return s / reviews.length;
    }
    // Open modal when clicking any review button (delegated)
    document.addEventListener('click', async function (e) {
        const btn = e.target.closest && e.target.closest('.review-btn');
        if (!btn) return;
    const eventId = btn.getAttribute('data-event-id');
    const clientId = btn.getAttribute('data-client-id') || btn.closest('.past-event-card')?.getAttribute('data-client-id');
    if (!eventId && !clientId) return;

        // set the target id on modal form
        const modal = document.getElementById('review-modal');
        const title = document.getElementById('review-target-title');
        const existing = document.getElementById('existing-reviews');
        if (!modal || !title) return;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('show');

        // find event title from the DOM or store
        let eventTitle = '';
        const card = btn.closest('.past-event-card');
        if (card) {
            const t = card.querySelector('.past-event-title');
            if (t) eventTitle = t.textContent;
        }
        title.textContent = eventTitle ? `Review: ${eventTitle}` : 'Leave a review';

        // require login for submitting reviews to server-backed events
        const token = localStorage.getItem('eventica_token');

        // fetch existing reviews (server-backed or local)
        existing.innerHTML = '<p>Loading reviewsâ€¦</p>';
        try {
            if (eventId) {
                // If attempting to open a server-backed event's reviews and user is not logged in,
                // still allow viewing reviews but block submission until login.
                const resp = await fetch(`/api/events/${eventId}/reviews`);
                if (!resp.ok) throw new Error('Failed to fetch reviews');
                const data = await resp.json();
                const reviews = data.reviews || [];
                if (reviews.length === 0) existing.innerHTML = '<p>No reviews yet. Be the first!</p>';
                else existing.innerHTML = reviews.map(r => `<div class="existing-review"><strong>${escapeHtml(r.userName||'Anonymous')}</strong> â€” ${renderStars(r.rating)}<div class="review-comment">${escapeHtml(r.comment||'')}</div></div>`).join('');
                // If not logged in, show a small note at the top of modal
                if (!token) {
                    existing.innerHTML = `<div class="login-needed">Please <a href="/assets/register/register.html">log in</a> to submit a review.</div>` + existing.innerHTML;
                }
            } else if (clientId) {
                const reviews = getLocalReviews(clientId);
                if (reviews.length === 0) existing.innerHTML = '<p>No reviews yet. Be the first!</p>';
                else existing.innerHTML = reviews.map(r => `<div class="existing-review"><strong>${escapeHtml(r.userName||'You')}</strong> â€” ${renderStars(r.rating)}<div class="review-comment">${escapeHtml(r.comment||'')}</div></div>`).join('');
                if (!token) {
                    existing.innerHTML = `<div class="login-needed">Please <a href="/assets/register/register.html">log in</a> to submit a review.</div>` + existing.innerHTML;
                }
            } else {
                existing.innerHTML = '<p>No reviews available.</p>';
            }
        } catch (err) {
            existing.innerHTML = '<p>Unable to load reviews.</p>';
            console.error(err);
        }

        // attach eventId to form dataset for submit
        const form = document.getElementById('review-form');
        if (form) { form.dataset.eventId = eventId || ''; form.dataset.clientId = clientId || ''; }
    });

    // Close modal
    document.getElementById('review-modal-close')?.addEventListener('click', () => {
        const modal = document.getElementById('review-modal');
        if (!modal) return;
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('show');
    });

    // Submit review
    document.getElementById('review-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const form = e.currentTarget;
    const eventId = form.dataset.eventId;
    const clientId = form.dataset.clientId;
    const rating = parseInt(document.getElementById('review-rating').value || 0, 10);
    const comment = document.getElementById('review-comment').value || '';
        if (!eventId && !clientId) return alert('Missing event identifier');

        // enforce login for submitting reviews
        const token2 = localStorage.getItem('eventica_token');
        if (!token2) {
            alert('You must be logged in to submit a review. Please log in first.');
            return;
        }

        // Read token from localStorage (if user is logged in)
        const token = localStorage.getItem('eventica_token');

        try {
            if (eventId) {
                const resp = await fetch(`/api/events/${eventId}/reviews`, {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'Authorization': 'Bearer ' + token } : {}),
                    body: JSON.stringify({ rating, comment })
                });
                if (resp.status === 401) {
                    alert('You must be logged in to submit a review.');
                    return;
                }
                if (!resp.ok) {
                    const errText = await resp.text();
                    throw new Error(errText || 'Failed to submit review');
                }
                const data = await resp.json();
                // close modal
                const modal = document.getElementById('review-modal');
                if (modal) { modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('show'); }
                // update the card's rating display (if present)
                const cardBtn = document.querySelector(`.review-btn[data-event-id="${eventId}"]`);
                if (cardBtn) {
                    const card = cardBtn.closest('.past-event-card');
                    if (card) {
                        const ratingEl = card.querySelector('.event-rating');
                        if (ratingEl) {
                            const avg = (data.averageRating || 0);
                            ratingEl.innerHTML = `${renderStars(avg)} <span class="rating-text">${avg.toFixed(1)} / 5</span> <button class="review-btn" data-event-id="${eventId}">Review</button>`;
                        }
                    }
                }
                alert('Review submitted â€” thank you!');
            } else if (clientId) {
                // local store path
                const reviews = getLocalReviews(clientId);
                reviews.push({ userName: 'You', rating, comment, createdAt: new Date().toISOString() });
                setLocalReviews(clientId, reviews);
                const avg = computeAverage(reviews);
                // update card
                const cardBtn = document.querySelector(`.review-btn[data-client-id="${clientId}"]`);
                if (cardBtn) {
                    const card = cardBtn.closest('.past-event-card');
                    if (card) {
                        const ratingEl = card.querySelector('.event-rating');
                        if (ratingEl) {
                            ratingEl.innerHTML = `${renderStars(avg)} <span class="rating-text">${avg.toFixed(1)} / 5</span> <button class="review-btn" data-client-id="${clientId}">Review</button>`;
                        }
                    }
                }
                const modal = document.getElementById('review-modal');
                if (modal) { modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('show'); }
                alert('Review saved locally â€” thank you!');
            }
        } catch (err) {
            console.error(err);
            alert('Unable to submit review.');
        }
    });

    // Close modal when clicking outside the content
    document.getElementById('review-modal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            this.setAttribute('aria-hidden', 'true');
            this.classList.remove('show');
        }
    });
})();