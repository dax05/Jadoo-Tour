"use strict";
// Jadoo Travel - Main Landing Page Script
// DOM Elements
const navbar = document.getElementById("navibar");
const burgerMenu = document.getElementById("burger-menu");
const navDrawer = document.getElementById("nav-drawer");
const closeDrawer = document.getElementById("close-drawer");
const navBackdrop = document.getElementById("nav-backdrop");
const themeToggle = document.getElementById("theme-toggle");
const logoImages = document.querySelectorAll(".Top-Logo");
// Sticky navbar on scroll
if (navbar) {
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY >= 50);
    });
}
// Mobile drawer navigation
function openDrawer() {
    burgerMenu?.classList.add("is-active");
    navDrawer?.classList.add("is-active");
    navBackdrop?.classList.add("is-active");
    document.body.classList.add("overflow-hidden");
}
function closeDrawerMenu() {
    burgerMenu?.classList.remove("is-active");
    navDrawer?.classList.remove("is-active");
    navBackdrop?.classList.remove("is-active");
    document.body.classList.remove("overflow-hidden");
}
burgerMenu?.addEventListener("click", () => {
    if (navDrawer?.classList.contains("is-active")) {
        closeDrawerMenu();
    }
    else {
        openDrawer();
    }
});
closeDrawer?.addEventListener("click", closeDrawerMenu);
navBackdrop?.addEventListener("click", closeDrawerMenu);
document.querySelectorAll(".links").forEach((link) => {
    link.addEventListener("click", closeDrawerMenu);
});
// Theme switcher (dark / light mode)
function setTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
    const icon = themeToggle?.querySelector("i");
    if (icon) {
        icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
    const logoSrc = isDark
        ? "assets/Images/navigation-section/Logo-dark.svg"
        : "assets/Images/navigation-section/Logo.svg";
    logoImages.forEach((img) => {
        img.src = logoSrc;
    });
}
// Init theme from storage or system preference
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme ? savedTheme === "dark" : prefersDark;
setTheme(isDark);
themeToggle?.addEventListener("click", () => {
    const currentlyDark = document.body.classList.contains("dark-mode");
    const nextTheme = !currentlyDark;
    localStorage.setItem("theme", nextTheme ? "dark" : "light");
    setTheme(nextTheme);
});
// Testimonials slider
const testimonials = [
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
let currentIndex = 0;
function showTestimonial(index) {
    const total = testimonials.length;
    currentIndex = (index + total) % total;
    const nextIndex = (currentIndex + 1) % total;
    const current = testimonials[currentIndex];
    const next = testimonials[nextIndex];
    const mainCard = document.getElementById("test-main-card");
    const mainAvatar = document.getElementById("test-main-avatar");
    const mainQuote = document.getElementById("test-main-quote");
    const mainName = document.getElementById("test-main-name");
    const mainLocation = document.getElementById("test-main-location");
    const backQuote = document.getElementById("test-back-quote");
    const backName = document.getElementById("test-back-name");
    const backLocation = document.getElementById("test-back-location");
    if (mainCard) {
        mainCard.classList.remove("animating");
        void mainCard.offsetWidth; // Force reflow
        mainCard.classList.add("animating");
    }
    if (mainAvatar) {
        mainAvatar.src = current.avatar;
        mainAvatar.alt = current.name;
    }
    if (mainQuote)
        mainQuote.textContent = current.quote;
    if (mainName)
        mainName.textContent = current.name;
    if (mainLocation)
        mainLocation.textContent = current.location;
    if (backQuote)
        backQuote.textContent = next.quote;
    if (backName)
        backName.textContent = next.name;
    if (backLocation)
        backLocation.textContent = next.location;
    document.querySelectorAll(".test-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === currentIndex);
    });
}
document.getElementById("test-prev")?.addEventListener("click", () => {
    showTestimonial(currentIndex - 1);
});
document.getElementById("test-next")?.addEventListener("click", () => {
    showTestimonial(currentIndex + 1);
});
document.querySelectorAll(".test-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
        const idx = Number(dot.dataset.index);
        if (!isNaN(idx))
            showTestimonial(idx);
    });
});
// Sync navbar auth state with localStorage
function syncNavbarAuth() {
    const sessionData = localStorage.getItem("jadoo_user");
    const guestLinks = document.querySelectorAll(".auth-guest-item");
    const userItems = document.querySelectorAll(".auth-user-item");
    const nameEl = document.getElementById("nav-user-name");
    const avatarEl = document.getElementById("nav-user-avatar");
    const logoutBtn = document.getElementById("nav-logout-btn");
    if (sessionData) {
        try {
            const user = JSON.parse(sessionData);
            const name = user.name || user.email.split("@")[0] || "Traveler";
            const initial = name.charAt(0).toUpperCase();
            if (nameEl)
                nameEl.textContent = `Hi, ${name}`;
            if (avatarEl)
                avatarEl.textContent = initial;
            guestLinks.forEach((el) => (el.style.display = "none"));
            userItems.forEach((el) => {
                el.style.display = el.tagName === "BUTTON" ? "inline-flex" : "block";
            });
        }
        catch {
            showGuestNav();
        }
    }
    else {
        showGuestNav();
    }
    function showGuestNav() {
        guestLinks.forEach((el) => (el.style.display = ""));
        userItems.forEach((el) => (el.style.display = "none"));
    }
    if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.dataset.bound = "true";
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("jadoo_user");
            syncNavbarAuth();
        });
    }
}
syncNavbarAuth();
window.addEventListener("storage", (e) => {
    if (e.key === "jadoo_user") {
        syncNavbarAuth();
    }
});
