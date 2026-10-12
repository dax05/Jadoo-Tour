
const navbar = document.getElementById("navibar");
const burgerMenu = document.getElementById("burger-menu");
const navDrawer = document.getElementById("nav-drawer");
const closeDrawer = document.getElementById("close-drawer");
const navBackdrop = document.getElementById("nav-backdrop");
const themeToggleBtn = document.getElementById("theme-toggle");
const logoImages = document.querySelectorAll(".Top-Logo");

// Sticky navbar on scroll
if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY >= 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// Mobile drawer navigation
function openMenu() {
  if (burgerMenu) burgerMenu.classList.add("is-active");
  if (navDrawer) navDrawer.classList.add("is-active");
  if (navBackdrop) navBackdrop.classList.add("is-active");
  document.body.classList.add("overflow-hidden");
}

function closeMenu() {
  if (burgerMenu) burgerMenu.classList.remove("is-active");
  if (navDrawer) navDrawer.classList.remove("is-active");
  if (navBackdrop) navBackdrop.classList.remove("is-active");
  document.body.classList.remove("overflow-hidden");
}

if (burgerMenu) {
  burgerMenu.addEventListener("click", () => {
    if (navDrawer && navDrawer.classList.contains("is-active")) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

if (closeDrawer) closeDrawer.addEventListener("click", closeMenu);
if (navBackdrop) navBackdrop.addEventListener("click", closeMenu);

document.querySelectorAll(".links").forEach((link) => {
  link.addEventListener("click", closeMenu);
});


function updateLogo(isDark) {
  const logoSrc = isDark
    ? "assets/Images/navigation-section/Logo-dark.svg"
    : "assets/Images/navigation-section/Logo.svg";

  logoImages.forEach((img) => {
    img.src = logoSrc;
  });
}

function updateThemeIcon(isDark) {
  if (!themeToggleBtn) return;
  const icon = themeToggleBtn.querySelector("i");
  if (!icon) return;
  icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isInitialDark = savedTheme === "dark" || (!savedTheme && prefersDark);

if (isInitialDark) {
  document.body.classList.add("dark-mode");
  updateThemeIcon(true);
  updateLogo(true);
} else {
  document.body.classList.remove("dark-mode");
  updateThemeIcon(false);
  updateLogo(false);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeIcon(isDark);
    updateLogo(isDark);
  });
}


const testimonialList = [
  {
    quote: "“On the Windows talking painted pasture yet its express parties use. Sure last upon he same as knew next. Of believed or diverted no.”",
    name: "Mike Taylor",
    location: "Lahore, Pakistan",
    avatar: "assets/Images/testimonial-section/author-mike.jpg"
  },
  {
    quote: "“Jadoo made our corporate retreat to Europe completely stress-free. Every detail from booking to flights was seamless!”",
    name: "Chris Thomas",
    location: "CEO of Red Button",
    avatar: "assets/Images/testimonial-section/author-chris.jpg"
  },
  {
    quote: "“After going through a number of sites, I had to settle for Jadoo because honestly it was a no brainer trying anyone else.”",
    name: "Sarah Connor",
    location: "Globetrotter & Travel Blogger",
    avatar: "assets/Images/testimonial-section/author-sarah.jpg"
  }
];

let currentTestimonialIdx = 0;

function updateTestimonial(index) {
  const total = testimonialList.length;
  currentTestimonialIdx = (index + total) % total;
  const nextIdx = (currentTestimonialIdx + 1) % total;

  const current = testimonialList[currentTestimonialIdx];
  const next = testimonialList[nextIdx];

  // Foreground Card Elements
  const mainCard = document.getElementById("test-main-card");
  const mainAvatar = document.getElementById("test-main-avatar");
  const mainQuote = document.getElementById("test-main-quote");
  const mainName = document.getElementById("test-main-name");
  const mainLocation = document.getElementById("test-main-location");

  // Background Card Elements
  const backQuote = document.getElementById("test-back-quote");
  const backName = document.getElementById("test-back-name");
  const backLocation = document.getElementById("test-back-location");

  if (mainCard) {
    mainCard.classList.remove("animating");
    void mainCard.offsetWidth; // Trigger reflow
    mainCard.classList.add("animating");
  }

  if (mainAvatar) {
    mainAvatar.src = current.avatar;
    mainAvatar.alt = current.name;
  }
  if (mainQuote) mainQuote.textContent = current.quote;
  if (mainName) mainName.textContent = current.name;
  if (mainLocation) mainLocation.textContent = current.location;

  // Update background stacked card
  if (backQuote) backQuote.textContent = next.quote;
  if (backName) backName.textContent = next.name;
  if (backLocation) backLocation.textContent = next.location;

  // Update pagination dots
  const dots = document.querySelectorAll(".test-dot");
  dots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx === currentTestimonialIdx);
  });
}

// Navigation button listeners
const prevBtn = document.getElementById("test-prev");
const nextBtn = document.getElementById("test-next");

if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    updateTestimonial(currentTestimonialIdx - 1);
  });
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    updateTestimonial(currentTestimonialIdx + 1);
  });
}

// Pagination dot listeners
document.querySelectorAll(".test-dot").forEach((dot) => {
  dot.addEventListener("click", (e) => {
    const idx = parseInt(e.target.dataset.index, 10);
    if (!isNaN(idx)) updateTestimonial(idx);
  });
});

// ==========================================
// 6. LOCALSTORAGE AUTH SYNC WITH NAVBAR
// ==========================================
function syncNavbarAuth() {
  const savedUserJson = localStorage.getItem("jadoo_user");
  const guestElements = document.querySelectorAll(".auth-guest-item");
  const userElements = document.querySelectorAll(".auth-user-item");
  const userNameEl = document.getElementById("nav-user-name");
  const userAvatarEl = document.getElementById("nav-user-avatar");
  const logoutBtn = document.getElementById("nav-logout-btn");

  if (savedUserJson) {
    try {
      const user = JSON.parse(savedUserJson);
      const displayName = user.name || (user.email ? user.email.split("@")[0] : "Traveler");
      const initials = displayName.charAt(0).toUpperCase();

      if (userNameEl) userNameEl.textContent = `Hi, ${displayName}`;
      if (userAvatarEl) userAvatarEl.textContent = initials;

      // Hide guest links (Login & Sign up)
      guestElements.forEach((el) => {
        el.style.display = "none";
      });

      // Show user profile & logout
      userElements.forEach((el) => {
        el.style.display = el.tagName === "BUTTON" ? "inline-flex" : "block";
      });
    } catch {
      showGuestNavbar();
    }
  } else {
    showGuestNavbar();
  }

  function showGuestNavbar() {
    guestElements.forEach((el) => {
      el.style.display = "";
    });
    userElements.forEach((el) => {
      el.style.display = "none";
    });
  }

  // Bind logout listener once
  if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
    logoutBtn.dataset.listenerAttached = "true";
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("jadoo_user");
      syncNavbarAuth();
    });
  }
}

// Initial sync on page load
syncNavbarAuth();

// Cross-tab synchronization
window.addEventListener("storage", (e) => {
  if (e.key === "jadoo_user") {
    syncNavbarAuth();
  }
});