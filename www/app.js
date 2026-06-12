/**
 * TopTube - Social Directory
 * Real Firebase & Embedded Viewer Integration
 */

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
const authBtn = document.getElementById('auth-btn');
const userMenu = document.getElementById('user-menu');
const logoutBtn = document.getElementById('logout-btn');
const userAvatarHeader = document.getElementById('user-avatar-header');
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

function init() {
  populateLinkPlatformSelect();
  listenToAuth();
  fetchProfiles();

  auth.getRedirectResult().catch(err => {
    console.error("Redirect login error:", err);
  });
}

// --- FIREBASE AUTH ---
authBtn.addEventListener('click', () => {
  // Using popup for better reliability instead of redirect
  auth.signInWithPopup(googleProvider).catch(err => {
    console.error("Login failed", err);
    alert("Login error: " + err.message);
  });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

function listenToAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = {
        id: user.uid,
        name: user.displayName,
        avatar: user.photoURL || 'https://i.pravatar.cc/150?u=' + user.uid
      };
      authBtn.classList.add('hidden');
      userMenu.classList.remove('hidden');
      userAvatarHeader.src = currentUser.avatar;
      myProfileBtnHeader.classList.remove('hidden');
    } else {
      currentUser = null;
      authBtn.classList.remove('hidden');
      userMenu.classList.add('hidden');
      myProfileBtnHeader.classList.add('hidden');
    }
    // Re-render profiles to update favorite icons based on current user
    renderProfiles();
  });
}

// --- FIREBASE FIRESTORE ---
function fetchProfiles() {
  db.collection('profiles').onSnapshot(snapshot => {
    profiles = [];
    snapshot.forEach(doc => {
      profiles.push({ id: doc.id, ...doc.data() });
    });
    // Ensure all profiles have favoritedBy and favoritesCount for sorting
    profiles.forEach(p => {
      if (!p.favoritedBy) p.favoritedBy = [];
      if (typeof p.favoritesCount !== 'number') p.favoritesCount = p.favoritedBy.length;
    });
    renderProfiles();
  });
}

// --- HEADER ACTIONS ---
favoritesBtnHeader.addEventListener('click', () => {
  if (!currentUser) {
    alert("Sign in to view your favorites.");
    return;
  }
  isViewingFavorites = !isViewingFavorites;
  if (isViewingFavorites) {
    favoritesBtnHeader.style.color = '#eab308';
    viewTitle.textContent = 'My Favorites';
    viewIcon.innerHTML = '🌟';
  } else {
    favoritesBtnHeader.style.color = '#a1a1aa';
    viewTitle.textContent = 'All Creators';
    viewIcon.innerHTML = '<i class="fa-solid fa-users"></i>';
  }
  renderProfiles();
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
function renderProfiles() {
  profilesGrid.innerHTML = '';
  
  let filtered = [...profiles].sort((a, b) => b.favoritesCount - a.favoritesCount);
  
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
      
      // Filter links to only show youtube links (max 10)
      let platformLinks = (p.links || []).filter(l => l.platformId === 'youtube').slice(0, 10);
      if (platformLinks.length === 0) return; // Skip if no youtube links
      
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
          <img src="${p.avatar}" alt="${p.nickname}" class="row-avatar" />
          <div class="row-name">${p.nickname}</div>
        </div>
        <div class="row-links-container">
          ${linksHTML}
        </div>
      `;
      profilesGrid.appendChild(row);
    });

    // Attach link listeners for Embed view
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
    // If it's not embeddable or it's adult, open externally
    window.open(url, '_blank');
    return;
  }

  let embedUrl = url;
  
  // Transform URL for iframes where applicable
  if (platformId === 'youtube') {
    if (url.includes('watch?v=')) {
      const vidId = url.split('watch?v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${vidId}`;
    } else if (url.includes('youtu.be/')) {
      const vidId = url.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${vidId}`;
    }
  }

  // Set the iframe and show
  embedContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
  embedModal.classList.remove('hidden');
}

embedCloseBtn.addEventListener('click', () => {
  embedContainer.innerHTML = '';
  embedModal.classList.add('hidden');
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

  // Check if they already have 10 links for this platform
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
  nick = nick.substring(0, 20); // Enforce max 20 characters
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
privacyPolicyBtn.addEventListener('click', (e) => {
  e.preventDefault();
  privacyModal.classList.remove('hidden');
});

privacyClose.addEventListener('click', () => {
  privacyModal.classList.add('hidden');
});

init();
