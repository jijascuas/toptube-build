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
let videoViewingTimeMs = 0;

// Accumulate viewing time
setInterval(() => {
  if (!admobInitialized) return;
  
  let isPlaying = false;
  if (typeof isSwipeMode !== 'undefined' && isSwipeMode) {
    isPlaying = true;
  } else if (!learningModal.classList.contains('hidden') && typeof ytPlayer !== 'undefined' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
    if (ytPlayer.getPlayerState() === 1) { // 1 = PLAYING
      isPlaying = true;
    }
  }

  if (isPlaying) {
    videoViewingTimeMs += 1000;
    if (videoViewingTimeMs >= 3 * 60 * 1000) { // 3 minutes
      showInterstitialAd();
    }
  }
}, 1000);

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
      margin: 60,
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
    // Reset counters
    reelsViewed = 0;
    videoViewingTimeMs = 0;
  } catch (e) {
    console.error('Show interstitial error:', e);
    // Try to re-prepare
    prepareInterstitialAd();
  }
}

// Show interstitial every N reels viewed
function onReelViewed() {
  reelsViewed++;
  if (reelsViewed >= 10) {
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
const authButtons = document.getElementById('auth-buttons');
const userMenuTop = document.getElementById('user-menu-top');
const logoutBtnTop = document.getElementById('logout-btn-top');
const userAvatarTop = document.getElementById('user-avatar-top');
const userNameDisplay = document.getElementById('user-name-display');
const myProfileBtnHeader = document.getElementById('my-profile-btn-header');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const favoritesBtnHeader = document.getElementById('favorites-btn-header');
const profilesGrid = document.getElementById('profiles-grid');
const emptyState = document.getElementById('empty-state');
const viewTitle = document.getElementById('view-title');
const viewIcon = document.getElementById('view-icon');

// Auth Modal
const authModal = document.getElementById('auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginEmailBtn = document.getElementById('login-email-btn');
const registerEmailBtn = document.getElementById('register-email-btn');
const modalGoogleBtn = document.getElementById('modal-google-btn');
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


// Learning Modal
const learningModal = document.getElementById('learning-modal');
const learningCloseBtn = document.getElementById('learning-close');
const notesList = document.getElementById('notes-list');
const noteInput = document.getElementById('note-input');
const saveNoteBtn = document.getElementById('save-note-btn');
const currentVideoTimeSpan = document.getElementById('current-video-time');
const exportNotesBtn = document.getElementById('export-notes-btn');
const aiSummaryBtn = document.getElementById('ai-summary-btn');
const aiSummaryContainer = document.getElementById('ai-summary-container');
const summaryContent = document.getElementById('summary-content');

let ytPlayer;
let currentVideoId = null;
let currentVideoOwnerId = null;
let notesInterval;
let currentNotes = [];
let lastAiSummaryMarkdown = null;

// Privacy Modal
const privacyPolicyBtn = document.getElementById('privacy-policy-btn');
const privacyModal = document.getElementById('privacy-modal');
const privacyClose = document.getElementById('privacy-close');

// More menu
const moreMenuOverlay = document.getElementById('more-menu-overlay');
const moreMenuClose = document.getElementById('more-menu-close');
const navMoreBtn = document.getElementById('nav-more-btn');
const setApiKeyBtn = document.getElementById('set-api-key-btn');

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

if (authBtnTop && authModal) {
  authBtnTop.addEventListener('click', () => {
    authModal.style.display = 'flex';
    authModal.classList.remove('hidden');
  });
}
if (closeAuthModal) {
  closeAuthModal.addEventListener('click', () => {
    authModal.style.display = 'none';
    authModal.classList.add('hidden');
  });
}

if (loginEmailBtn) {
  loginEmailBtn.addEventListener('click', () => {
    const email = authEmail.value;
    const pass = authPassword.value;
    if (!email || !pass) return alert('Por favor, ingresa correo y contraseña.');
    auth.signInWithEmailAndPassword(email, pass).then(() => {
      authModal.style.display = 'none';
      authModal.classList.add('hidden');
    }).catch(err => alert(err.message));
  });
}

if (registerEmailBtn) {
  registerEmailBtn.addEventListener('click', () => {
    const email = authEmail.value;
    const pass = authPassword.value;
    if (!email || !pass) return alert('Por favor, ingresa correo y contraseña.');
    auth.createUserWithEmailAndPassword(email, pass).then(() => {
      authModal.style.display = 'none';
      authModal.classList.add('hidden');
    }).catch(err => alert(err.message));
  });
}

if (modalGoogleBtn) {
  modalGoogleBtn.addEventListener('click', () => {
    authModal.style.display = 'none';
    authModal.classList.add('hidden');
    doGoogleSignIn();
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

if (logoutBtnTop) {
  logoutBtnTop.addEventListener('click', () => {
    auth.signOut();
  });
}

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      const user = auth.currentUser;
      if (user) {
        user.delete().then(() => {
          alert("Account deleted successfully.");
        }).catch((error) => {
          if (error.code === 'auth/requires-recent-login') {
            alert("Please log out and log back in to delete your account.");
          } else {
            alert("Error deleting account: " + error.message);
          }
        });
      }
    }
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
          if (deleteAccountBtn) deleteAccountBtn.classList.add('hidden');
        } else {
          myProfileBtnHeader.classList.remove('hidden');
          if (deleteAccountBtn) deleteAccountBtn.classList.remove('hidden');
        }
      }
    } else {
      currentUser = null;
      if (authButtons) authButtons.classList.remove('hidden');
      if (userMenuTop) userMenuTop.classList.add('hidden');
      
      if (myProfileBtnHeader) myProfileBtnHeader.classList.add('hidden');
      if (deleteAccountBtn) deleteAccountBtn.classList.add('hidden');
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
      viewTitle.textContent = "Leaderboard";
      viewIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
      setActiveNav('leaderboard-btn-header');
      const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
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
    isLeaderboardMode = true;
    viewTitle.textContent = 'Leaderboard';
    viewIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    setActiveNav('leaderboard-btn-header');
    const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
    renderProfiles(sorted);
    if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
      window.Capacitor.Plugins.AdMob.resumeBanner().catch(console.error);
    }
    return;
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
      
      let platformLinks = (p.links || []).filter(l => l.platformId === 'youtube' && (!l.isPrivate || (currentUser && currentUser.id === p.id))).slice(0, 10);
      if (platformLinks.length === 0) return;
      
      let linksHTML = platformLinks.map((link, idx) => {
        const ytId = getYouTubeId(link.url);
        const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
        const likedBy = link.likedBy || [];
        const isLiked = currentUser && likedBy.includes(currentUser.id);
        const likeCount = likedBy.length;
        return `
          <div class="video-card">
            <a href="#" data-url="${link.url}" data-pid="youtube" data-profile-id="${p.id}" data-embeddable="true" class="yt-thumbnail-pill" title="Watch video">
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
            <img src="${p.avatar || 'https://ui-avatars.com/api/?name='+encodeURIComponent(p.nickname || p.name || 'User')+'&background=random'}" alt="" class="row-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.name || 'User')}&background=random'" />
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
        const ownerId = btn.getAttribute('data-profile-id');
        openLinkInApp(url, pid, true, ownerId);
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

// --- YOUTUBE API & LEARNING MODE LOGIC ---
function onYouTubeIframeAPIReady() {
  console.log("YouTube API Ready");
}

function openLinkInApp(url, platformId, isEmbeddable, ownerId = null) {
  if (platformId !== 'youtube') {
    window.open(url, '_blank');
    return;
  }

  let vidId = null;
  if (url.includes('watch?v=')) {
    vidId = url.split('watch?v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    vidId = url.split('youtu.be/')[1].split('?')[0];
  }

  if (!vidId) return;
  currentVideoId = vidId;
  currentVideoOwnerId = ownerId;

  learningModal.classList.remove('hidden');
  aiSummaryContainer.classList.add('hidden');
  summaryContent.innerHTML = '';
  noteInput.value = '';

  if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized) {
    window.Capacitor.Plugins.AdMob.hideBanner().catch(console.error);
  }

  if (ytPlayer) {
    ytPlayer.loadVideoById(vidId);
  } else {
    ytPlayer = new YT.Player('yt-player', {
      height: '100%',
      width: '100%',
      videoId: vidId,
      playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0 },
      events: {
        'onStateChange': onPlayerStateChange
      }
    });
  }

  loadNotesForVideo(vidId, ownerId);
  startNotesInterval();
}

learningCloseBtn.addEventListener('click', () => {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    ytPlayer.pauseVideo();
  }
  learningModal.classList.add('hidden');
  stopNotesInterval();
  if (window.Capacitor && window.Capacitor.Plugins.AdMob && admobInitialized && !isSwipeMode) {
    window.Capacitor.Plugins.AdMob.resumeBanner().catch(console.error);
  }
});

function onPlayerStateChange(event) {
  // Can add logic if needed
}

function startNotesInterval() {
  stopNotesInterval();
  notesInterval = setInterval(() => {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const time = ytPlayer.getCurrentTime();
      if (currentVideoTimeSpan) {
        currentVideoTimeSpan.textContent = formatTime(time);
      }
    }
  }, 1000);
}

function stopNotesInterval() {
  if (notesInterval) clearInterval(notesInterval);
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- NOTES FIREBASE LOGIC ---
function loadNotesForVideo(vidId, ownerId) {
  notesList.innerHTML = '<p style="color: #94a3b8; padding: 10px;">Loading notes...</p>';
  currentNotes = [];
  lastAiSummaryMarkdown = null;
  
  if (!ownerId && currentUser) ownerId = currentUser.id;
  
  if (!ownerId) {
    notesList.innerHTML = '<p style="color: #94a3b8; padding: 10px;">Cannot load notes for this video.</p>';
    return;
  }

  const addNoteContainer = document.querySelector('.add-note-container');
  if (currentUser && currentUser.id === ownerId) {
    if (addNoteContainer) addNoteContainer.style.display = 'flex';
  } else {
    if (addNoteContainer) addNoteContainer.style.display = 'none';
  }

  const localNotes = localStorage.getItem(`notes_${ownerId}_${vidId}`);
  if (localNotes) {
    try {
      currentNotes = JSON.parse(localNotes);
      renderNotes();
    } catch(e){}
  }

  db.collection('users').doc(ownerId).collection('notes').doc(vidId).get()
    .then(doc => {
      if (doc.exists) {
        currentNotes = doc.data().notes || [];
        localStorage.setItem(`notes_${ownerId}_${vidId}`, JSON.stringify(currentNotes));
      }
      renderNotes();
    })
    .catch(err => {
      console.error("Error loading notes:", err);
      notesList.innerHTML = '<p style="color: #ef4444; padding: 10px;">Failed to load notes.</p>';
    });
}

function renderNotes() {
  notesList.innerHTML = '';
  if (currentNotes.length === 0) {
    notesList.innerHTML = '<p style="color: #94a3b8; padding: 10px;">No notes yet. Start typing below!</p>';
    return;
  }
  
  // Sort notes by time
  currentNotes.sort((a, b) => a.time - b.time);

  const isOwner = currentUser && currentUser.id === currentVideoOwnerId;

  currentNotes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note-item';
    
    let deleteBtnHtml = '';
    if (isOwner) {
       deleteBtnHtml = `<button class="delete-note-btn" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px;" title="Delete Note"><i class="fa-solid fa-trash"></i></button>`;
    }

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <div class="note-time" data-time="${note.time}"><i class="fa-solid fa-play"></i> ${formatTime(note.time)}</div>
        ${deleteBtnHtml}
      </div>
      <div class="note-text">${note.text}</div>
    `;
    notesList.appendChild(div);
  });

  document.querySelectorAll('.note-time').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const time = parseFloat(e.currentTarget.getAttribute('data-time'));
      if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        ytPlayer.seekTo(time, true);
        ytPlayer.playVideo();
      }
    });
  });

  document.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      currentNotes.splice(idx, 1);
      renderNotes();
      
      if (currentVideoId && currentVideoOwnerId) {
        db.collection('users').doc(currentVideoOwnerId).collection('notes').doc(currentVideoId)
          .set({ notes: currentNotes }, { merge: true })
          .catch(console.error);
        localStorage.setItem(`notes_${currentVideoOwnerId}_${currentVideoId}`, JSON.stringify(currentNotes));
      }
    });
  });
}

saveNoteBtn.addEventListener('click', () => {
  if (!currentUser) {
    alert("Please log in to save notes.");
    return;
  }
  const text = noteInput.value.trim();
  if (!text) return;

  let time = 0;
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    time = ytPlayer.getCurrentTime();
  }

  currentNotes.push({ time, text });
  noteInput.value = '';
  renderNotes();

  // Save to Firebase
  if (currentVideoId && currentVideoOwnerId) {
    db.collection('users').doc(currentVideoOwnerId).collection('notes').doc(currentVideoId)
      .set({ notes: currentNotes }, { merge: true })
      .catch(console.error);
      
    localStorage.setItem(`notes_${currentVideoOwnerId}_${currentVideoId}`, JSON.stringify(currentNotes));
  }
});

// --- EXPORT NOTES LOGIC ---
exportNotesBtn.addEventListener('click', () => {
  showInterstitialAd();
  
  if (currentNotes.length === 0) {
    alert("No notes to export.");
    return;
  }
  
  let markdown = '# Notes for Video\n\n';
  
  if (lastAiSummaryMarkdown && !aiSummaryContainer.classList.contains('hidden')) {
    markdown += `## AI Summary\n\n${lastAiSummaryMarkdown}\n\n---\n\n`;
  }

  currentNotes.sort((a, b) => a.time - b.time).forEach(n => {
    markdown += `**[${formatTime(n.time)}]**\n${n.text}\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `toptube_notes_${currentVideoId}.md`;
  a.click();
  URL.revokeObjectURL(url);
});

// --- REAL AI SUMMARY LOGIC (GEMINI) ---

aiSummaryBtn.addEventListener('click', async () => {
  showInterstitialAd();
  
  if (!currentVideoId) return;
  aiSummaryContainer.classList.remove('hidden');
  summaryContent.innerHTML = '<i><i class="fa-solid fa-spinner fa-spin"></i> Generando resumen con Gemini AI...</i>';
  
  const geminiApiKey = localStorage.getItem('geminiApiKey');
  
  if (!geminiApiKey) {
    summaryContent.innerHTML = '<p style="color: #ef4444;">Error: Falta la API Key de Gemini. Añádela desde el menú "More".</p>';
    return;
  }

  let videoTitle = "el video seleccionado";
  if (ytPlayer && typeof ytPlayer.getVideoData === 'function') {
    const data = ytPlayer.getVideoData();
    if (data && data.title) {
      videoTitle = `el video titulado "${data.title}"`;
    }
  }

  let prompt = `Actúa como un profesor experto y crea un resumen muy estructurado y educativo para ${videoTitle}. `;
  
  if (currentNotes && currentNotes.length > 0) {
    prompt += `\n\nEl estudiante ha tomado estas notas mientras veía el video:\n`;
    currentNotes.sort((a, b) => a.time - b.time).forEach(n => {
      prompt += `- ${n.text}\n`;
    });
    prompt += `\nPor favor, basándote en el título y en estas notas, elabora un resumen final consolidado, destacando los puntos más importantes y proporcionando algo de contexto extra que pueda ser útil. Usa formato Markdown con listas y negritas.`;
  } else {
    prompt += `\nPor favor, escribe un breve resumen general de lo que se suele aprender en un video con este título, ya que el estudiante aún no ha tomado notas. Usa formato Markdown.`;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      summaryContent.innerHTML = `<p style="color: #ef4444;">Error de la API: ${data.error.message}</p>`;
      return;
    }

    const aiText = data.candidates[0].content.parts[0].text;
    lastAiSummaryMarkdown = aiText;
    
    // Parse Markdown if marked.js is available
    if (typeof marked !== 'undefined') {
      summaryContent.innerHTML = marked.parse(aiText);
    } else {
      summaryContent.innerText = aiText; // Fallback
    }

  } catch (error) {
    console.error("AI Error:", error);
    summaryContent.innerHTML = `<p style="color: #ef4444;">Hubo un error al contactar a la IA.</p>`;
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
    
    let thumbHtml = '';
    if (link.platformId === 'youtube') {
      const ytId = getYouTubeId(link.url);
      if (ytId) {
        thumbHtml = `<img src="https://img.youtube.com/vi/${ytId}/default.jpg" style="width: 40px; height: 30px; object-fit: cover; border-radius: 4px;" />`;
      }
    }

    const privacyIcon = link.isPrivate 
      ? '<i class="fa-solid fa-lock" style="color: #ef4444;"></i>' 
      : '<i class="fa-solid fa-lock-open" style="color: #22c55e;"></i>';

    const li = document.createElement('li');
    li.className = 'added-link-item';
    li.innerHTML = `
      <span class="platform-name">${thumbHtml}<i class="${platform.icon}" style="color:${platform.color}"></i> ${platform.name}</span>
      <span style="font-size: 0.8rem; color: #aaa; overflow: hidden; white-space: nowrap; max-width: 200px; text-overflow: ellipsis;">${link.url}</span>
      <div style="display:flex; gap: 5px;">
        <button type="button" class="privacy-toggle-btn" data-index="${index}" title="Toggle Privacy">${privacyIcon}</button>
        <button type="button" class="delete-link-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    addedLinksList.appendChild(li);
  });

  addedLinksList.querySelectorAll('.privacy-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      myProfileLinks[idx].isPrivate = !myProfileLinks[idx].isPrivate;
      renderAddedLinks();
    });
  });

  addedLinksList.querySelectorAll('.delete-link-btn').forEach(btn => {
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

// --- SET API KEY LOGIC ---
if (setApiKeyBtn) {
  setApiKeyBtn.addEventListener('click', () => {
    const currentKey = localStorage.getItem('geminiApiKey') || '';
    const newKey = prompt('Por favor introduce tu Gemini API Key personal:', currentKey);
    if (newKey !== null && newKey.trim() !== '') {
      localStorage.setItem('geminiApiKey', newKey.trim());
      alert('API Key guardada correctamente.');
      // Ocultar menú
      if (moreMenuOverlay) moreMenuOverlay.classList.remove('visible');
    } else if (newKey !== null && newKey.trim() === '') {
      localStorage.removeItem('geminiApiKey');
      alert('API Key eliminada.');
    }
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

let isSwipeMode = false;
let isLeaderboardMode = true;

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
  isLeaderboardMode = true;
  isSwipeMode = false;
  isViewingFavorites = false;
  if(swipeFeed) swipeFeed.classList.add('hidden');
  profilesGrid.classList.remove('hidden');
  
  viewTitle.textContent = "Leaderboard";
  viewIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
  setActiveNav('leaderboard-btn-header');
  const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
  renderProfiles(sorted);

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
    isLeaderboardMode = true;
    viewTitle.textContent = "Leaderboard";
    viewIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    setActiveNav('leaderboard-btn-header');
    const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
    renderProfiles(sorted);
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
        if(l.platformId === 'youtube' && (!l.isPrivate || (currentUser && currentUser.id === p.id))) {
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
    item.dataset.embedUrl = embedUrl;
    item.dataset.index = index;

    item.innerHTML = `
      <div class="iframe-container" id="iframe-container-${index}" style="width:100%;height:100%;"></div>
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
      const item = entry.target;
      const container = item.querySelector('.iframe-container');
      
      if (entry.isIntersecting) {
        if (container && !container.innerHTML) {
          const embedUrl = item.dataset.embedUrl;
          const index = item.dataset.index;
          container.innerHTML = `<iframe 
            id="swipe-iframe-${index}"
            src="${embedUrl}" 
            allowfullscreen 
            allow="autoplay; encrypted-media"
            style="width:100%;height:100%;border:none;pointer-events:all;"
          ></iframe>`;
        }
        
        const iframe = item.querySelector('iframe');
        if (iframe) {
          setTimeout(() => {
            if (!iframe.contentWindow) return;
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            if (!window._swipeMuted) {
              iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
              iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
            }
          }, 800); // Give iframe some time to initialize
        }

        const btn = item.querySelector('[id^="unmute-btn-"]');
        if(btn) {
          btn.querySelector('i').className = window._swipeMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        }
        // Count reel view for interstitial trigger
        onReelViewed();
      } else {
        if (container) {
          container.innerHTML = '';
        }
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

// --- CREATOR SEARCH ---
const creatorSearchInput = document.getElementById('creator-search-input');
const creatorSearchResults = document.getElementById('creator-search-results');

if (creatorSearchInput && creatorSearchResults) {
  creatorSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    creatorSearchResults.innerHTML = '';
    
    if (!val) return;
    
    // Find the first matching profile
    const match = profiles.find(p => {
      const name = p.nickname || p.name || '';
      return name.toLowerCase().includes(val);
    });
    
    if (match) {
      const div = document.createElement('div');
      div.style.padding = '10px';
      div.style.background = 'var(--surface-color)';
      div.style.borderRadius = '8px';
      div.style.cursor = 'pointer';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.gap = '10px';
      
      const img = document.createElement('img');
      img.src = match.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.nickname || match.name || 'User')}&background=random`;
      img.onerror = function() { this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(match.nickname || match.name || 'User')}&background=random`; };
      img.style.width = '30px';
      img.style.height = '30px';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      
      const span = document.createElement('span');
      span.textContent = match.nickname || match.name;
      
      div.appendChild(img);
      div.appendChild(span);
      
      div.addEventListener('click', () => {
        // Reset search
        creatorSearchInput.value = '';
        creatorSearchResults.innerHTML = '';
        
        // Hide More Menu
        moreMenuOverlay.classList.add('hidden');
        
        // Switch to Leaderboard View
        isSwipeMode = false;
        isLeaderboardMode = true;
        isViewingFavorites = false;
        
        if (swipeFeed) swipeFeed.classList.add('hidden');
        if (profilesGrid) profilesGrid.classList.remove('hidden');
        if (emptyState) emptyState.style.display = 'none';
        
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        
        viewTitle.textContent = 'Leaderboard';
        viewIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
        setActiveNav('leaderboard-btn-header');
        
        const sorted = [...profiles].sort((a,b) => (b.totalVideoLikes || 0) - (a.totalVideoLikes || 0));
        renderProfiles(sorted);
        
        setTimeout(() => {
          const btns = document.querySelectorAll('.card-favorite-btn');
          for (let btn of btns) {
            if (btn.getAttribute('data-id') === match.id) {
              const row = btn.closest('.profile-row');
              if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'start' });
                row.style.transition = 'box-shadow 0.5s';
                row.style.boxShadow = '0 0 15px var(--accent-color)';
                setTimeout(() => {
                  row.style.boxShadow = 'none';
                }, 2000);
              }
              break;
            }
          }
        }, 100);
      });
      
      creatorSearchResults.appendChild(div);
    }
  });
}
