import './style.css'
import api from './api'; 
import { renderHomePage, renderDashboardPage, renderAssistantPage, renderAboutPage, renderLoginPage } from './pages'

// Query Core Layout Elements
const appDiv = document.querySelector<HTMLDivElement>('#app');
const navbarElement = document.querySelector<HTMLElement>('#main-navbar');
const logoLink = document.querySelector<HTMLDivElement>('#logo-click-target');

// Query Navigation Menu Buttons
const homeBtn = document.querySelector<HTMLButtonElement>('#nav-home');
const dashboardBtn = document.querySelector<HTMLButtonElement>('#nav-dashboard');
const assistantBtn = document.querySelector<HTMLButtonElement>('#nav-assistant');
const aboutBtn = document.querySelector<HTMLButtonElement>('#nav-about');
const logoutBtn = document.querySelector<HTMLButtonElement>('#nav-logout');



// --- THE NAVIGATION GUARDRAIL ---
function checkAuthentication() {
  const token = localStorage.getItem('user_token');

  if (token) {
    // 1. User has validation token: Reveal top menu bar
    if (navbarElement) navbarElement.style.display = 'block';
    
    // 2. Drop them onto the secure default landing homepage view
    loadHome();
  } else {
    // 1. Visitor anonymous: Hide layout navigation boundaries
    if (navbarElement) navbarElement.style.display = 'none';
    
    // 2. Force throw login portal challenge interface
    loadLogin();
  }
}

// --- LOGIN SUBMISSION FUNCTION ---
function loadLogin() {
  if (!appDiv) return;
  
  document.body.classList.remove('home-theme');
  appDiv.innerHTML = renderLoginPage();

  const loginForm = document.querySelector<HTMLFormElement>('#login-form');
  const errorDiv = document.querySelector<HTMLDivElement>('#login-error');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      // Using .trim() prevents accidental spaces during paste tasks from throwing validation faults
      const usernameInput = document.querySelector<HTMLInputElement>('#username')!.value.trim();
      const passwordInput = document.querySelector<HTMLInputElement>('#password')!.value.trim();

      try {
        if (errorDiv) errorDiv.style.display = 'none';

        // Post login object payload details to Python validation middleware
        const response = await api.post('/api/login', {
          username: usernameInput,
          password: passwordInput
        });

        // Write verification token signature strings locally 
        localStorage.setItem('user_token', response.data.access_token);

        // Run security routing guard check again to refresh site state
        checkAuthentication(); 
        
      } catch (error: any) {
        console.error("Authentication rejected:", error);
        if (errorDiv) {
          errorDiv.textContent = error.response?.data?.detail || "Invalid credentials.";
          errorDiv.style.display = 'block';
        }
      }
    });
  }
}

// --- STANDARD AUTHENTICATED PAGES ---

async function loadDashboard() {
  if (!appDiv) return;
  
  appDiv.innerHTML = renderDashboardPage();
  document.body.classList.remove('home-theme');

  try {
    const response = await api.get('/api/dashboard');
    const data = response.data;

    document.querySelector('#stat-total')!.textContent = `$${data.metrics.totalSales.toLocaleString()}`;
    document.querySelector('#stat-avg')!.textContent = `$${data.metrics.averageSales.toLocaleString()}`;

    const chartImg = document.querySelector<HTMLImageElement>('#dashboard-chart');
    if (chartImg) {
      chartImg.src = data.chart;
      chartImg.style.display = 'block'; 
    }
  } catch (error) {
    console.error("Dashboard failed to fetch securely:", error);
  }
}

function loadHome() {
  if (appDiv) {
    appDiv.innerHTML = renderHomePage();
    document.body.classList.add('home-theme');
  }
}

function loadAssistant() {
  if (appDiv) {
    appDiv.innerHTML = renderAssistantPage();
    document.body.classList.remove('home-theme');
  }
}

function loadAbout() {
  if (appDiv) {
    appDiv.innerHTML = renderAboutPage();
    document.body.classList.remove('home-theme');
  }
}

// --- RESILIENT APP EVENT HANDLERS ---
// Separating your checks ensures one missing block never kills the rest of your page execution

if (homeBtn) {
  homeBtn.addEventListener('click', loadHome);
} else {
  console.warn("UI Warning: #nav-home target missing from DOM structure.");
}

if (aboutBtn) {
  aboutBtn.addEventListener('click', loadAbout);
}

if (dashboardBtn) {
  dashboardBtn.addEventListener('click', loadDashboard);
}

if (assistantBtn) {
  assistantBtn.addEventListener('click', loadAssistant);
}

if (logoLink) {
  logoLink.addEventListener('click', loadHome);
  
  // Right-click asset download guard
  logoLink.addEventListener('contextmenu', (event) => {
    event.preventDefault(); 
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    // 1. Wipe the validation string clear
    localStorage.removeItem('user_token');
    
    // 2. Clear blue layout theme class tracking array states on active bodies
    document.body.classList.remove('home-theme');
    
    // 3. Re-run the guard to instantly kick them back out to the login wrapper
    checkAuthentication();
  });
}

// --- BOOTSTRAP INITIALIZATION STAGE ---
checkAuthentication();