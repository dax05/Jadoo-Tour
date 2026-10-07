
const navbar = document.getElementById("navibar");
const burgerMenu = document.getElementById("burger-menu");
const navDrawer = document.getElementById("nav-drawer");
const closeDrawer = document.getElementById("close-drawer");
const navBackdrop = document.getElementById("nav-backdrop");
const themeToggleBtn = document.getElementById("theme-toggle");
const logoImages = document.querySelectorAll(".Top-Logo");

// 
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
