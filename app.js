/**
 * TopTube - Social Directory
 * Native Android Optimized with AdMob + Capacitor Bridge
 */

// --- PLATFORM DETECTION ---
function isCapacitorNative() {
  return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
}

// --- ADMOB LOGIC ---
let admobInitialized = false;
let reelsViewed = 0;

const BANNER_AD_ID = 'ca-app-pub-4159023709825629/7216545964';
const INTERSTITIAL_AD_ID = 'ca-app-pub-4159023709825629/4934419013';

async function initAdMob() {
  if (!isCapacitorNative()) {
    console.log('Not running on native platform, skipping AdMob');
    return;
  }
  
  // Wait a bit for Capacitor plugins to be ready
  await new Promise(r => setTimeout(r, 500));
  
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
    try {
      const { AdMob } = window.Capacitor.Plugins;
      await AdMob.initialize({
        initializeForTesting: false
      });
      admobInitialized = true;
      document.body.classList.add('has-ad-banner');
      console.log('AdMob Initialized successfully');
      showBannerAd();
      prepareInterstitialAd();
    } catch (e) {
      console.error('AdMob init error:', e);
    }
  } else {
    console.warn('AdMob plugin not available');
  }
}

async function showBannerAd() {
  if (!admobInitialized) return;
  const { AdMob } = window.Capacitor.Plugins;
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: 'ADAPTIVE_BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: false
    });
    console.log('Banner ad shown');
    if (typeof isSwipeMode !== 'undefined' && isSwipeMode) {
      await AdMob.hideBanner();
    }
  } catch (e) {
    console.error('Show banner error:', e);
  }
}

async function hideBannerAd() {
  if (!admobInitialized) return;
  try {
    const { AdMob } = window.Capacitor.Plugins;
    await AdMob.hideBanner();
  } catch (e) {
    console.error('Hide banner error:', e);
  }
}

async function prepareInterstitialAd() {
  if (!admobInitialized) return;
  try {
    const { AdMob } = window.Capacitor.Plugins;
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: false
    });
    console.log('Interstitial prepared');
  } catch (e) {
    console.error('Prepare interstitial error:', e);
  }
}

async function showInterstitialAd() {
  if (!admobInitialized) return;
  try {
    const { AdMob } = window.Capacitor.Plugins;
    await AdMob.showInterstitial();
    // Prepare next one
    setTimeout(() => prepareInterstitialAd(), 2000);
  } catch (e) {
    console.error('Show interstitial error:', e);
    // Try to re-prepare
    prepareInterstitialAd();
  }
}

// Show interstitial every N reels viewed
function onReelViewed() {
  reelsViewed++;
  if (reelsViewed > 0 && reelsViewed % 5 === 0) {
    showInterstitialAd();
  }
}

// --- DATA STRUCTURES ---
const rawPlatforms = [
  { id: 'youtube', name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#ff0000', domain: 'youtube.com', embeddable: true }
];

const PLATFORMS = rawPlatforms;

// Firebase Setup
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

let profiles = [];
let currentUser = null;
let currentPlatformFilter = null;
let isViewingFavorites = false;
let myProfileLinks = [];

// --- DOM ELEMENTS ---
const authBtnTop = document.getElementById('auth-btn-top');
const authAnonBtnTop = document.getElementById('auth-anon-btn-top');
const authButtons = document.getElementById('auth-buttons');
const userMenuTop = document.getElementById('user-menu-top');
const logoutBtnTop = document.getElementById('logout-btn-top');
const userAvatarTop = document.getElementById('user-avatar-top');
const userNameDisplay = document.getElementById('user-name-display');
const myProfileBtnHeader = document.getElementById('my-profile-btn-header');
const favoritesBtnHeader = document.getElementById('favorites-btn-header');
const profilesGrid = document.getElementById('profiles-grid');
const emptyState = document.getElementById('empty-state');
const viewTitle = document.getElementById('view-title');
const viewIcon = document.getElementById('view-icon');

// Profile Modal
const profileModal = document.getElementById('profile-setup-modal');
const profileCloseBtn = document.getElementById('profile-close');
const profileForm = document.getElementById('profile-form');
const profileNickname = document.getElementById('profile-nickname');
const linkPlatformSelect = document.getElementById('link-platform-select');
const linkUrlInput = document.getElementById('link-url-input');
const addLinkBtn = document.getElementById('add-link-btn');
const addedLinksList = document.getElementById('added-links-list');
const linkErrorMsg = document.getElementById('link-error-msg');

// Age Modal
const ageModal = document.getElementById('age-modal');
const ageConfirmBtn = document.getElementById('age-confirm-btn');
const ageCancelBtn = document.getElementById('age-cancel-btn');

// Embed Modal
const embedModal = document.getElementById('embed-modal');
const embedCloseBtn = document.getElementById('embed-close');
const embedContainer = document.getElementById('embed-container');
let pendingAdultUrl = null;
let pendingEmbedType = null;
let pendingIsEmbeddable = false;

// Privacy Modal
const privacyPolicyBtn = document.getElementById('privacy-policy-btn');
const privacyModal = document.getElementById('privacy-modal');
const privacyClose = document.getElementById('privacy-close');

// More menu
const moreMenuOverlay = document.getElementById('more-menu-overlay');
const moreMenuClose = document.getElementById('more-menu-close');
const navMoreBtn = document.getElementById('nav-more-btn');

// Bottom nav
const bottomNav = document.getElementById('bottom-nav');

function init() {
  populateLinkPlatformSelect();
  listenToAuth();
  fetchProfiles();
  initAdMob();
  setupBottomNav();
  setupMoreMenu();
  setupBackButton();

  auth.getRedirectResult().then(result => {
    if (result && result.user) {
      console.log('Redirect login successful:', result.user.displayName);
      if (window.location.pathname.includes('/__/auth/handler')) {
        window.location.replace('/');
      }
    } else {
      if (window.location.pathname.includes('/__/auth/handler')) {
        window.location.replace('/');
      }
    }
  }).catch(err => {
    console.error("Redirect login error:", err);
    if (window.location.pathname.includes('/__/auth/handler')) {
      window.location.replace('/');
    }
  });
}

// --- BOTTOM NAVIGATION ---
function setupBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      // Remove active from all
      navItems.forEach(n => n.classList.remove('active'));
    });
  });
}

function setActiveNav(id) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(n => n.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

// --- MORE MENU ---
function setupMoreMenu() {
  if (navMoreBtn) {
    navMoreBtn.addEventListener('click', () => {
      moreMenuOverlay.classList.remove('hidden');
    });
  }
  if (moreMenuClose) {
    moreMenuClose.addEventListener('click', () => {
      moreMenuOverlay.classList.add('hidden');
    });
  }
  // Close on background tap
  if (moreMenuOverlay) {
    moreMenuOverlay.addEventListener('click', (e) => {
      if (e.target === moreMenuOverlay) {
        moreMenuOverlay.classList.add('hidden');
      }
    });
  }
}

// --- ANDROID BACK BUTTON ---
function setupBackButton() {
  if (isCapacitorNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
      // Close modals if open
      const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
      if (modals.length > 0) {
        modals.forEach(m => m.classList.add('hidden'));
        return;
      }
      // Close more menu if open
      if (moreMenuOverlay && !moreMenuOverlay.classList.contains('hidden')) {
        moreMenuOverlay.classList.add('hidden');
        return;
      }
      // If viewing something other than swipe, go back to swipe
      if (!isSwipeMode) {
        isSwipeMode = true;
        isLeaderboardMode = false;
        isViewingFavorites = false;
        profilesGrid.classList.add('hidden');
        if (swipeFeed) swipeFeed.classList.remove('hidden');
        viewTitle.textContent = "Swipe Feed";
        viewIcon.innerHTML = '<i class="fa-solid fa-mobile-screen"></i>';
        setActiveNav('tiktok-mode-btn-header');
        renderSwipeFeed();
        return;
      }
      // Otherwise minimize app
      if (window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.minimizeApp();
      }
    });
  }
}

// --- FIREBASE AUTH ---
if (authAnonBtnTop) {
  authAnonBtnTop.addEventListener('click', () => {
    auth.signInAnonymously().catch(err => {
      console.error("Anonymous login failed", err);
      alert("Error de inicio de sesión anónimo: " + err.message);
    });
  });
}

function doGoogleSignIn() {
  if (isCapacitorNative()) {
    auth.signInWithRedirect(googleProvider).catch(err => {
      console.error("Redirect login failed", err);
      alert("Error de redirección: " + err.message);
    });
  } else {
    auth.signInWithPopup(googleProvider).then(result => {
      console.log("Login successful:", result.user.displayName);
      if (moreMenuOverlay) moreMenuOverlay.classList.add('hidden');
    }).catch(err => {
      console.error("Popup sign in error:", err);
      alert("Error de inicio de sesión: " + err.message);
    });
  }
}

if (authBtnTop) {
  authBtnTop.addEventListener('click', () => {
    doGoogleSignIn();
  });
}

if (logoutBtnTop) {
  logoutBtnTop.addEventListener('click', () => {
    auth.signOut();
  });
}

function listenToAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = {
        id: user.uid,
        name: user.displayName || 'Guest',
        avatar: user.photoURL || 'https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff&rounded=true',
        isAnonymous: user.isAnonymous || false
      };
      
      if (userAvatarTop) userAvatarTop.src = currentUser.avatar;
      
      if (authButtons) authButtons.classList.add('hidden');
      if (userMenuTop) userMenuTop.classList.remove('hidden');
      
      if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
      
      if (myProfileBtnHeader) {
        if (currentUser.isAnonymous) {
          myProfileBtnHeader.classList.add('hidden');
        } else {
          myProfileBtnHeader.classList.remove('hidden');
        }
      }
    } else {
      currentUser = null;
      if (authButtons) authButtons.classList.remove('hidden');
      if (userMenuTop) userMenuTop.classList.add('hidden');
      
      if (myProfileBtnHeader) myProfileBtnHeader.classList.add('hidden');
    }
    if (isSwipeMode) {
      renderSwipeFeed();
    } else if (isLeaderboardMode) {
      const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
      renderProfiles(sorted);
    } else {
      renderProfiles();
    }
  });
}

// --- FIREBASE FIRESTORE ---
function fetchProfiles() {
  db.collection('profiles').onSnapshot(snapshot => {
    profiles = [];
    snapshot.forEach(doc => {
      profiles.push({ id: doc.id, ...doc.data() });
    });
    profiles.forEach(p => {
      if (!p.favoritedBy) p.favoritedBy = [];
      if (typeof p.favoritesCount !== 'number') p.favoritesCount = p.favoritedBy.length;
      
      let sumLikes = 0;
      if (p.links && Array.isArray(p.links)) {
        p.links.forEach(link => {
          if (link.likedBy && Array.isArray(link.likedBy)) {
            sumLikes += link.likedBy.length;
          }
        });
      }
      p.totalVideoLikes = sumLikes;
    });
    if (isSwipeMode) {
      profilesGrid.classList.add('hidden');
      if (swipeFeed) swipeFeed.classList.remove('hidden');
      viewTitle.textContent = "Swipe Feed";
      viewIcon.innerHTML = '<i class="fa-solid fa-mobile-screen"></i>';
      renderSwipeFeed();
    } else if (isLeaderboardMode) {
      const sorted = [...profiles].sort((a,b) => (b.votes || 0) - (a.votes || 0));
      renderProfiles(sorted);
    } else {
      renderProfiles();
    }
  });
}

// --- HEADER ACTIONS ---
favoritesBtnHeader.addEventListener('click', () => {
  if (!currentUser) {
    alert("Sign in to view your favorites.");
    return;
  }
  isViewingFavorites = !isViewingFavorites;
  isSwipeMode = false;
  isLeaderboardMode = false;
  if (swipeFeed) swipeFeed.classList.add('hidden');
  profilesGrid.classList.remove('hidden');
  
  if (isViewingFavorites) {
    favoritesBtnHeader.style.color = '#eab308';
    viewTitle.textContent = 'Favorites';
    viewIcon.innerHTML = '<i class="fa-solid fa-star"></i>';
    setActiveNav('favorites-btn-header');
  } else {
    favoritesBtnHeader.style.color = '';
    viewTitle.textContent = 'Creators';
    viewIcon.innerHTML = '<i class="fa-solid fa-users"></i>';
  }
  renderProfiles();
  if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
    window.Capacitor.Plugins.AdMob.resumeBanner().catch(console.error);
  }
});

function getYouTubeId(url) {
  if (url.includes('watch?v=')) {
    return url.split('watch?v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1].split('?')[0];
  }
  return null;
}

// --- PROFILE RENDERING ---
function renderProfiles(profilesList = profiles) {
  profilesGrid.innerHTML = '';
  
  let filtered = [...profilesList];
  if (!isLeaderboardMode) {
    filtered.sort((a, b) => b.favoritesCount - a.favoritesCount);
  }
  
  if (isViewingFavorites && currentUser) {
    filtered = filtered.filter(p => p.favoritedBy && p.favoritedBy.includes(currentUser.id));
  }

  if (filtered.length === 0) {
    profilesGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    profilesGrid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    profilesGrid.className = 'profiles-rows-layout';

    filtered.forEach(p => {
      const isFav = currentUser && p.favoritedBy && p.favoritedBy.includes(currentUser.id);
      
      const row = document.createElement('div');
      row.className = 'profile-row';
      
      let platformLinks = (p.links || []).filter(l => l.platformId === 'youtube').slice(0, 10);
      if (platformLinks.length === 0) return;
      
      let linksHTML = platformLinks.map((link, idx) => {
        const ytId = getYouTubeId(link.url);
        const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
        const likedBy = link.likedBy || [];
        const isLiked = currentUser && likedBy.includes(currentUser.id);
        const likeCount = likedBy.length;
        return `
          <div class="video-card">
            <a href="#" data-url="${link.url}" data-pid="youtube" data-embeddable="true" class="yt-thumbnail-pill" title="Watch video">
              <img src="${thumbUrl}" alt="YouTube Thumbnail" />
            </a>
            <div class="video-actions">
              <button class="video-like-btn ${isLiked ? 'liked' : ''}" data-profile-id="${p.id}" data-url="${link.url}" title="Like this video">
                <i class="fa-solid fa-heart"></i> <span class="like-count">${likeCount}</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

      row.innerHTML = `
        <div class="row-user-info">
          <button class="card-favorite-btn ${isFav ? 'favorited' : ''}" data-id="${p.id}" title="Add to favorites">
            <i class="fa-solid fa-star"></i>
          </button>
          <div class="avatar-container ${p.referrals > 3 ? 'badge-golden' : ''}">
            <img src="${p.avatar}" alt="${p.nickname}" class="row-avatar" />
            ${p.referrals > 3 ? '<div class="badge-icon"><i class="fa-solid fa-check"></i></div>' : ''}
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 5px;">
            <div class="row-name">${p.nickname}</div>

          </div>
        </div>
        <div class="row-links-container">
          ${linksHTML}
        </div>
      `;
      profilesGrid.appendChild(row);
    });

    // Attach link listeners
    document.querySelectorAll('.yt-thumbnail-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = btn.getAttribute('data-url');
        const pid = btn.getAttribute('data-pid');
        openLinkInApp(url, pid, true);
      });
    });

    // Attach video like listeners
    document.querySelectorAll('.video-like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const profileId = btn.getAttribute('data-profile-id');
        const url = btn.getAttribute('data-url');
        toggleVideoLike(profileId, url);
      });
    });

    // Attach favorite listeners
    document.querySelectorAll('.card-favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        toggleFavorite(id);
      });
    });
  }
}

function toggleFavorite(profileId) {
  if (!currentUser) {
    alert("Sign in with Google to add to favorites.");
    return;
  }
  const profileRef = db.collection('profiles').doc(profileId);
  db.runTransaction(transaction => {
    return transaction.get(profileRef).then(doc => {
      if (!doc.exists) return;
      let favoritedBy = doc.data().favoritedBy || [];
      if (favoritedBy.includes(currentUser.id)) {
        favoritedBy = favoritedBy.filter(id => id !== currentUser.id);
      } else {
        favoritedBy.push(currentUser.id);
      }
      transaction.update(profileRef, {
        favoritedBy: favoritedBy,
        favoritesCount: favoritedBy.length
      });
    });
  }).catch(err => {
    console.error("Error updating favorite", err);
  });
}

function toggleVideoLike(profileId, url) {
  if (!currentUser) {
    alert("Sign in with Google to like videos.");
    return;
  }
  const profileRef = db.collection('profiles').doc(profileId);
  db.runTransaction(transaction => {
    return transaction.get(profileRef).then(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      const links = data.links || [];
      const linkIndex = links.findIndex(l => l.url === url);
      if (linkIndex === -1) return;
      
      let likedBy = links[linkIndex].likedBy || [];
      if (likedBy.includes(currentUser.id)) {
        likedBy = likedBy.filter(id => id !== currentUser.id);
      } else {
        likedBy.push(currentUser.id);
      }
      links[linkIndex].likedBy = likedBy;
      
      transaction.update(profileRef, { links: links });
    });
  }).catch(err => {
    console.error("Error updating video like", err);
  });
}

// --- EMBED VIEWER LOGIC ---
function openLinkInApp(url, platformId, isEmbeddable) {
  if (!isEmbeddable) {
    window.open(url, '_blank');
    return;
  }

  let embedUrl = url;
  
  if (platformId === 'youtube') {
    if (url.includes('watch?v=')) {
      const vidId = url.split('watch?v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${vidId}`;
    } else if (url.includes('youtu.be/')) {
      const vidId = url.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${vidId}`;
    }
  }

  embedContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
  embedModal.classList.remove('hidden');
  if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
    window.Capacitor.Plugins.AdMob.hideBanner().catch(console.error);
  }
}

embedCloseBtn.addEventListener('click', () => {
  embedContainer.innerHTML = '';
  embedModal.classList.add('hidden');
  if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized && !isSwipeMode) {
    window.Capacitor.Plugins.AdMob.resumeBanner().catch(console.error);
  }
});

// --- MY PROFILE LOGIC ---
myProfileBtnHeader.addEventListener('click', () => {
  if (!currentUser) return;
  const existing = profiles.find(p => p.id === currentUser.id);
  if (existing) {
    profileNickname.value = existing.nickname || currentUser.name;
    myProfileLinks = [...(existing.links || [])];
  } else {
    profileNickname.value = currentUser.name;
    myProfileLinks = [];
  }
  renderAddedLinks();
  linkErrorMsg.classList.add('hidden');
  profileModal.classList.remove('hidden');
});

profileCloseBtn.addEventListener('click', () => {
  profileModal.classList.add('hidden');
});

function populateLinkPlatformSelect() {
  linkPlatformSelect.innerHTML = PLATFORMS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function simulateAiLinkVerification(url, platformId) {
  const platform = PLATFORMS.find(p => p.id === platformId);
  if (!platform) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes(platform.domain)) return true;
  if (platform.altDomain && lowerUrl.includes(platform.altDomain)) return true;
  return false;
}

addLinkBtn.addEventListener('click', () => {
  const url = linkUrlInput.value.trim();
  const pid = linkPlatformSelect.value;
  if (!url) return;

  const isValid = simulateAiLinkVerification(url, pid);
  if (!isValid) {
    linkErrorMsg.textContent = `Error: Invalid link. Make sure the link belongs to YouTube.`;
    linkErrorMsg.classList.remove('hidden');
    return;
  }

  const countForPlatform = myProfileLinks.filter(l => l.platformId === pid).length;
  if (countForPlatform >= 10) {
    linkErrorMsg.textContent = `Error: Limit reached. You can only add up to 10 links.`;
    linkErrorMsg.classList.remove('hidden');
    return;
  }

  linkErrorMsg.classList.add('hidden');
  myProfileLinks.push({ platformId: pid, url: url });
  linkUrlInput.value = '';
  renderAddedLinks();
});

function renderAddedLinks() {
  addedLinksList.innerHTML = '';
  myProfileLinks.forEach((link, index) => {
    const platform = PLATFORMS.find(p => p.id === link.platformId) || { name: 'Unknown', icon: 'fa-solid fa-link', color: '#ccc' };
    const li = document.createElement('li');
    li.className = 'added-link-item';
    li.innerHTML = `
      <span class="platform-name"><i class="${platform.icon}" style="color:${platform.color}"></i> ${platform.name}</span>
      <span style="font-size: 0.8rem; color: #aaa; overflow: hidden; white-space: nowrap; max-width: 200px; text-overflow: ellipsis;">${link.url}</span>
      <button type="button" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
    `;
    addedLinksList.appendChild(li);
  });
  addedLinksList.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      myProfileLinks.splice(idx, 1);
      renderAddedLinks();
    });
  });
}

profileForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUser) return;
  let nick = profileNickname.value.trim();
  nick = nick.substring(0, 20);
  if (!nick || myProfileLinks.length === 0) {
    linkErrorMsg.textContent = 'Nickname and at least 1 link are required.';
    linkErrorMsg.classList.remove('hidden');
    return;
  }
  
  const existing = profiles.find(p => p.id === currentUser.id);
  const favoritedBy = existing ? (existing.favoritedBy || []) : [];
  
  db.collection('profiles').doc(currentUser.id).set({
    nickname: nick,
    avatar: currentUser.avatar,
    links: myProfileLinks,
    favoritedBy: favoritedBy,
    favoritesCount: favoritedBy.length
  }, { merge: true }).then(() => {
    profileModal.classList.add('hidden');
  }).catch(err => {
    console.error("Error saving profile", err);
    linkErrorMsg.textContent = 'Error saving to the database.';
    linkErrorMsg.classList.remove('hidden');
  });
});

// --- AGE MODAL LOGIC ---
ageCancelBtn.addEventListener('click', () => {
  pendingAdultUrl = null;
  pendingEmbedType = null;
  pendingIsEmbeddable = false;
  ageModal.classList.add('hidden');
});

ageConfirmBtn.addEventListener('click', () => {
  if (pendingAdultUrl) {
    openLinkInApp(pendingAdultUrl, pendingEmbedType, pendingIsEmbeddable);
  }
  pendingAdultUrl = null;
  pendingEmbedType = null;
  pendingIsEmbeddable = false;
  ageModal.classList.add('hidden');
});

// --- PRIVACY MODAL LOGIC ---
if (privacyPolicyBtn) {
  privacyPolicyBtn.addEventListener('click', (e) => {
    // On native: open privacy.html, on web: show modal fallback
    if (isCapacitorNative()) {
      // Let the link navigate naturally (target="_blank" handles it)
      return;
    }
    e.preventDefault();
    if (privacyModal) privacyModal.classList.remove('hidden');
  });
}

if (privacyClose) {
  privacyClose.addEventListener('click', () => {
    privacyModal.classList.add('hidden');
  });
}

init();

// --- VIRAL FEATURES: TIKTOK SWIPE, GAMIFICATION, REFERRALS & SHARING ---

// DOM Elements
const swipeFeed = document.getElementById('swipe-feed');
const tiktokModeBtnHeader = document.getElementById('tiktok-mode-btn-header');
const leaderboardBtnHeader = document.getElementById('leaderboard-btn-header');


let isSwipeMode = true;
let isLeaderboardMode = false;

// 1. Referral & Widget Routing (Run on load)
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  const refId = urlParams.get('ref');
  if (refId) {
    sessionStorage.setItem('pendingReferral', refId);
  }
  
  const userId = urlParams.get('user');
  if (userId) {
    document.body.classList.add('widget-mode');
    setTimeout(() => loadSpecificUserProfile(userId), 1000);
  }
});

function loadSpecificUserProfile(userId) {
  const profile = profiles.find(p => p.id === userId);
  if (profile) {
    renderProfiles([profile]);
  } else {
    db.collection('profiles').doc(userId).get().then(doc => {
      if(doc.exists) {
        renderProfiles([{id: doc.id, ...doc.data()}]);
      }
    });
  }
}

// Intercept Auth to process referrals
auth.onAuthStateChanged(user => {
  if (user) {
    const refId = sessionStorage.getItem('pendingReferral');
    if (refId && refId !== user.uid) {
      db.collection('profiles').doc(refId).update({
        referrals: firebase.firestore.FieldValue.increment(1)
      }).catch(console.error);
      sessionStorage.removeItem('pendingReferral');
    }
  }
});

// 3. Voting & Gamification
window.voteCreator = function(creatorId, e) {
  if (e) e.stopPropagation();
  if (!currentUser) {
    alert("Please sign in to vote!");
    return;
  }
  db.collection('profiles').doc(creatorId).update({
    votes: firebase.firestore.FieldValue.increment(1)
  }).then(() => {
    fetchProfiles();
  }).catch(err => {
    console.error("Error voting", err);
  });
};

if(leaderboardBtnHeader) leaderboardBtnHeader.addEventListener('click', () => {
  isLeaderboardMode = !isLeaderboardMode;
  isSwipeMode = false;
  isViewingFavorites = false;
  if(swipeFeed) swipeFeed.classList.add('hidden');
  profilesGrid.classList.remove('hidden');
  
  if (isLeaderboardMode) {
    viewTitle.textContent = "Leaderboard";
    viewIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    setActiveNav('leaderboard-btn-header');
    const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
    renderProfiles(sorted);
  } else {
    viewTitle.textContent = "Creators";
    viewIcon.innerHTML = '<i class="fa-solid fa-users"></i>';
    renderProfiles(profiles);
  }
  if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
    window.Capacitor.Plugins.AdMob.resumeBanner().catch(console.error);
  }
});

// 4. TikTok Swipe Feed
if(tiktokModeBtnHeader) tiktokModeBtnHeader.addEventListener('click', () => {
  isSwipeMode = !isSwipeMode;
  isLeaderboardMode = false;
  isViewingFavorites = false;
  
  if (isSwipeMode) {
    profilesGrid.classList.add('hidden');
    swipeFeed.classList.remove('hidden');
    viewTitle.textContent = "Swipe Feed";
    viewIcon.innerHTML = '<i class="fa-solid fa-mobile-screen"></i>';
    setActiveNav('tiktok-mode-btn-header');
    renderSwipeFeed();
    if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
      window.Capacitor.Plugins.AdMob.hideBanner().catch(console.error);
    }
  } else {
    swipeFeed.classList.add('hidden');
    profilesGrid.classList.remove('hidden');
    viewTitle.textContent = "All Creators";
    viewIcon.innerHTML = '<i class="fa-solid fa-users"></i>';
    renderProfiles(profiles);
    if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
      window.Capacitor.Plugins.AdMob.resumeBanner().catch(console.error);
    }
  }
});

window.likeVideoInSwipe = function(profileId, url, btnElement) {
  if (!currentUser) {
    alert("Sign in with Google to like videos.");
    return;
  }
  
  let span = btnElement.querySelector('span');
  let i = btnElement.querySelector('i');
  let count = parseInt(span.textContent) || 0;
  if(i.style.color === 'rgb(239, 68, 68)' || i.style.color === '#ef4444') { 
    i.style.color = 'white';
    span.textContent = count - 1;
  } else {
    i.style.color = '#ef4444';
    span.textContent = count + 1;
  }

  toggleVideoLike(profileId, url);
};

function renderSwipeFeed() {
  if(!swipeFeed) return;
  swipeFeed.innerHTML = '';
  let allVideos = [];
  profiles.forEach(p => {
    if(p.links) {
      p.links.forEach(l => {
        if(l.platformId === 'youtube') {
           allVideos.push({ profile: p, url: l.url, link: l });
        }
      });
    }
  });
  
  // Shuffle randomly
  allVideos.sort(() => Math.random() - 0.5);

  if (allVideos.length === 0) {
    swipeFeed.innerHTML = '<div style="color:white; margin-top:20px; text-align:center;">No videos found.</div>';
    return;
  }

  // Track global mute state
  window._swipeMuted = true;

  allVideos.forEach((v, index) => {
    let videoId = '';
    if (v.url.includes('watch?v=')) {
      videoId = v.url.split('watch?v=')[1].split('&')[0];
    } else if (v.url.includes('youtu.be/')) {
      videoId = v.url.split('youtu.be/')[1].split('?')[0];
    }
    if (!videoId) return;

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1`;

    const likedBy = v.link.likedBy || [];
    const isLiked = currentUser && likedBy.includes(currentUser.id);
    const likeCount = likedBy.length;

    const item = document.createElement('div');
    item.className = 'swipe-item';
    item.dataset.videoid = videoId;

    item.innerHTML = `
      <iframe 
        id="swipe-iframe-${index}"
        src="${embedUrl}" 
        allowfullscreen 
        allow="autoplay; encrypted-media"
        style="width:100%;height:100%;border:none;pointer-events:all;"
      ></iframe>
      <div class="swipe-overlay-info">
        <h3 style="margin:0 0 4px 0; font-size:1.1rem; text-shadow:0 1px 4px rgba(0,0,0,0.8);">@${v.profile.nickname || 'Unknown'}</h3>
      </div>
      <div class="swipe-actions">
        <div class="action-btn" id="unmute-btn-${index}" onclick="toggleSwipeMute(${index})" title="Tap to unmute">
          <i class="fa-solid fa-volume-xmark" style="color:#facc15;"></i>
          <span style="font-size:0.7rem;">Sonido</span>
        </div>
        <div class="action-btn" onclick="likeVideoInSwipe('${v.profile.id}', '${v.url}', this)">
          <i class="fa-solid fa-heart" style="color:${isLiked ? '#ef4444' : 'white'};"></i>
          <span>${likeCount}</span>
        </div>

      </div>
    `;
    swipeFeed.appendChild(item);
  });

  setupSwipeAutoplay();
  // Track reel views for interstitial
  onReelViewed();
}

// Toggle mute/unmute
window.toggleSwipeMute = function(index) {
  window._swipeMuted = !window._swipeMuted;
  const iframe = document.getElementById(`swipe-iframe-${index}`);
  const btn = document.getElementById(`unmute-btn-${index}`);
  
  if (iframe) {
    if (window._swipeMuted) {
      iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
      if(btn) btn.querySelector('i').className = 'fa-solid fa-volume-xmark';
    } else {
      iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
      iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
      if(btn) btn.querySelector('i').className = 'fa-solid fa-volume-high';
      if(btn) btn.querySelector('i').style.color = 'white';
    }
  }

  // Apply same mute state to all other visible iframes
  document.querySelectorAll('.swipe-item iframe').forEach(f => {
    if(f.id !== `swipe-iframe-${index}`) {
      if (window._swipeMuted) {
        f.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
      } else {
        f.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        f.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
      }
    }
  });

  // Update all unmute button icons
  document.querySelectorAll('[id^="unmute-btn-"]').forEach(b => {
    const i = b.querySelector('i');
    if(i) {
      i.className = window._swipeMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
      i.style.color = window._swipeMuted ? '#facc15' : 'white';
    }
  });
};

function setupSwipeAutoplay() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const iframe = entry.target.querySelector('iframe');
      if (!iframe) return;
      if (entry.isIntersecting) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        if (!window._swipeMuted) {
          setTimeout(() => {
            iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
          }, 500);
        }
        const btn = entry.target.querySelector('[id^="unmute-btn-"]');
        if(btn) {
          btn.querySelector('i').className = window._swipeMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        }
        // Count reel view for interstitial trigger
        onReelViewed();
      } else {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    });
  }, {
    root: swipeFeed,
    rootMargin: '0px',
    threshold: 0.65
  });

  document.querySelectorAll('.swipe-item').forEach(item => {
    observer.observe(item);
  });
}
