// App Configuration
const CONFIG = {
  githubBaseUrl: 'https://raw.githubusercontent.com/Cocodrulo/drive-utilities/main/',
  localFallbackUrl: '../', // Go up one level to workspace root
  routes: {
    overview: {
      file: 'README.md',
      containerId: 'readme-content',
      sectionId: 'view-overview'
    },
    features: {
      file: null, // Custom pre-designed section
      containerId: null,
      sectionId: 'view-features'
    },
    privacy: {
      file: 'PRIVACY_POLICY.md',
      containerId: 'privacy-content',
      sectionId: 'view-privacy'
    },
    terms: {
      file: 'TERMS_OF_SERVICE.md',
      containerId: 'terms-content',
      sectionId: 'view-terms'
    }
  }
};

// Memory cache to avoid redundant fetching
const contentCache = {};

// DOM Elements
const elements = {
  loader: document.getElementById('loader'),
  errorScreen: document.getElementById('error-screen'),
  errorMsg: document.querySelector('.error-msg'),
  retryBtn: document.getElementById('retry-btn'),
  navLinks: document.querySelectorAll('.nav-link'),
  sections: document.querySelectorAll('.view-section'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  appNav: document.getElementById('app-nav')
};

// Mobile Navigation Toggle
elements.mobileMenuBtn.addEventListener('click', () => {
  elements.appNav.classList.toggle('open');
  // Simple CSS class toggle for mobile button animation
  elements.mobileMenuBtn.classList.toggle('active');
});

// Close mobile navigation menu on clicking a nav item
elements.navLinks.forEach(link => {
  link.addEventListener('click', () => {
    elements.appNav.classList.remove('open');
    elements.mobileMenuBtn.classList.remove('active');
  });
});

// Main router function
async function router() {
  // Get hash routing or default to 'overview'
  const hash = window.location.hash.substring(1) || 'overview';
  const route = CONFIG.routes[hash];

  if (!route) {
    // Redirect to default if invalid hash
    window.location.hash = '#overview';
    return;
  }

  // Highlight active link in the navigation
  elements.navLinks.forEach(link => {
    if (link.getAttribute('data-view') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Hide all view sections, loader, and errors first
  elements.sections.forEach(sec => sec.classList.remove('active'));
  elements.errorScreen.classList.add('hidden');

  // If this view requires fetching markdown
  if (route.file) {
    if (contentCache[hash]) {
      // Load from cache instantly
      renderContent(route.containerId, contentCache[hash]);
      showSection(route.sectionId);
    } else {
      // Fetch and then load
      showLoader(true);
      try {
        const markdown = await fetchContent(route.file);
        contentCache[hash] = markdown;
        renderContent(route.containerId, markdown);
        showLoader(false);
        showSection(route.sectionId);
      } catch (err) {
        showLoader(false);
        showError(err.message, hash);
      }
    }
  } else {
    // Show static sections (like Features Grid) instantly
    showLoader(false);
    showSection(route.sectionId);
  }
}

// Fetch content with fallback
async function fetchContent(fileName) {
  const primaryUrl = `${CONFIG.githubBaseUrl}${fileName}`;
  const secondaryUrl = `${CONFIG.localFallbackUrl}${fileName}`;

  try {
    // Try primary GitHub public URL
    const response = await fetch(primaryUrl);
    if (!response.ok) {
      throw new Error(`GitHub fetch returned status: ${response.status}`);
    }
    return await response.text();
  } catch (primaryError) {
    console.warn(`Failed to fetch from GitHub raw URL: ${primaryUrl}. Trying local fallback...`, primaryError);
    
    // Fallback to local files (works in local dev server environments)
    try {
      const fallbackResponse = await fetch(secondaryUrl);
      if (!fallbackResponse.ok) {
        throw new Error(`Local fallback returned status: ${fallbackResponse.status}`);
      }
      return await fallbackResponse.text();
    } catch (fallbackError) {
      console.error(`Both fetch sources failed for ${fileName}.`, fallbackError);
      throw new Error(`Failed to retrieve ${fileName} from remote repository or local path.`);
    }
  }
}

// Render markdown content using marked.js
function renderContent(containerId, markdown) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof marked !== 'undefined') {
    // Convert markdown links to hashes if they link to other files in the repo
    let processedMarkdown = markdown
      .replace(/PRIVACY_POLICY\.md/g, '#privacy')
      .replace(/TERMS_OF_SERVICE\.md/g, '#terms')
      .replace(/README\.md/g, '#overview');

    // Parse Markdown safely
    container.innerHTML = marked.parse(processedMarkdown);
  } else {
    // Fallback in case marked library failed to load
    container.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace;">${escapeHTML(markdown)}</pre>`;
  }
}

// Helper: Show view section
function showSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');
  }
}

// Helper: Show/Hide Loader
function showLoader(show) {
  if (show) {
    elements.loader.classList.remove('hidden');
  } else {
    elements.loader.classList.add('hidden');
  }
}

// Helper: Show Error Screen
function showError(message, currentView) {
  elements.errorScreen.classList.remove('hidden');
  elements.errorMsg.textContent = message;
  
  // Update retry button click handler for current view
  elements.retryBtn.onclick = () => {
    window.location.reload();
  };
}

// Helper: escape HTML tags
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Event Listeners
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
