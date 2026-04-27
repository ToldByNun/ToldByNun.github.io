import { portfolioData } from "./content.js";

const state = {
  activeTag: "Alle",
  theme: localStorage.getItem("theme") || "dark",
};
const videoModal = {
  wrap: null,
  player: null,
  title: null,
  play: null,
  mute: null,
  seek: null,
  time: null,
};

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateVideoModalControls() {
  if (!videoModal.player) return;
  const { player, play, mute, seek, time } = videoModal;
  if (!player.duration || Number.isNaN(player.duration)) {
    seek.value = "0";
    time.textContent = "00:00 / 00:00";
  } else {
    const progress = (player.currentTime / player.duration) * 1000;
    seek.value = Math.max(0, Math.min(1000, Math.round(progress))).toString();
    time.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
  }
  play.textContent = player.paused ? "Play" : "Pause";
  mute.textContent = player.muted ? "Unmute" : "Mute";
}

function closeVideoModal() {
  if (!videoModal.wrap || videoModal.wrap.hidden) return;
  videoModal.player.pause();
  videoModal.player.removeAttribute("src");
  videoModal.player.load();
  videoModal.wrap.hidden = true;
  videoModal.wrap.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openVideoModal(project) {
  if (!videoModal.wrap || !project?.videoUrl) return;
  videoModal.title.textContent = project.title;
  videoModal.player.src = project.videoUrl;
  if (project.videoPoster) videoModal.player.poster = project.videoPoster;
  else videoModal.player.removeAttribute("poster");
  videoModal.player.muted = false;
  videoModal.wrap.hidden = false;
  videoModal.wrap.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  videoModal.player.play().catch(() => {});
  updateVideoModalControls();
}

function setupVideoModal() {
  videoModal.wrap = byId("video-modal");
  videoModal.player = byId("video-modal-player");
  videoModal.title = byId("video-modal-title");
  videoModal.play = byId("video-modal-play");
  videoModal.mute = byId("video-modal-mute");
  videoModal.seek = byId("video-modal-seek");
  videoModal.time = byId("video-modal-time");
  const closeBtn = byId("video-modal-close");
  if (!videoModal.wrap || !videoModal.player) return;

  closeBtn?.addEventListener("click", closeVideoModal);
  videoModal.wrap.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute("data-close-video-modal")) {
      closeVideoModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeVideoModal();
  });
  videoModal.play.addEventListener("click", () => {
    if (videoModal.player.paused) videoModal.player.play().catch(() => {});
    else videoModal.player.pause();
  });
  videoModal.mute.addEventListener("click", () => {
    videoModal.player.muted = !videoModal.player.muted;
    updateVideoModalControls();
  });
  videoModal.seek.addEventListener("input", () => {
    if (!videoModal.player.duration || Number.isNaN(videoModal.player.duration)) return;
    const ratio = Number(videoModal.seek.value) / 1000;
    videoModal.player.currentTime = ratio * videoModal.player.duration;
    updateVideoModalControls();
  });
  ["timeupdate", "play", "pause", "loadedmetadata", "volumechange", "ended"].forEach((eventName) => {
    videoModal.player.addEventListener(eventName, updateVideoModalControls);
  });
}

function createMedia(project) {
  const wrap = document.createElement("div");
  wrap.className = "project-media";

  if (project.videoUrl) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.controls = false;
    if (project.videoPoster) video.poster = project.videoPoster;

    function ensureVideoSource() {
      if (video.dataset.loaded) return;
      const source = document.createElement("source");
      source.src = project.videoUrl;
      source.type = project.videoType || "video/mp4";
      video.appendChild(source);
      video.load();
      video.dataset.loaded = "true";
    }

    video.addEventListener("error", () => {
      video.replaceWith(createFallbackCover(project));
    });

    wrap.addEventListener("mouseenter", () => {
      ensureVideoSource();
      video.play().catch(() => {});
    });
    wrap.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              ensureVideoSource();
              observer.disconnect();
            }
          });
        },
        { rootMargin: "250px" }
      );
      observer.observe(wrap);
    } else {
      ensureVideoSource();
    }

    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = "video-expand-btn";
    expand.textContent = "Open Demo";
    expand.addEventListener("click", (event) => {
      event.stopPropagation();
      openVideoModal(project);
    });

    wrap.addEventListener("click", () => openVideoModal(project));
    wrap.appendChild(video);
    wrap.appendChild(expand);
  } else {
    wrap.appendChild(createFallbackCover(project));
  }

  if (project.wip) {
    const status = document.createElement("span");
    status.className = "project-status-tag";
    status.textContent = "in progress";
    wrap.appendChild(status);
  }

  return wrap;
}

function createFallbackCover(project) {
  const fallback = document.createElement("div");
  fallback.className = "project-media-fallback";
  fallback.style.background =
    project.cover || "linear-gradient(135deg, #1f2937, #111827)";
  fallback.textContent = project.mediaLabel || project.title.toUpperCase();
  return fallback;
}

function createProjectChips(project) {
  const wrap = document.createElement("div");
  wrap.className = "project-tags";

  project.stack?.forEach((s) => {
    const chip = document.createElement("span");
    chip.className = "project-chip is-tech";
    chip.textContent = s;
    wrap.appendChild(chip);
  });

  return wrap;
}

function renderHero() {
  const { person } = portfolioData;
  setText("hero-name", person.name);
  setText("hero-role", person.role);
  setText("hero-value", person.value);

  const highlights = byId("hero-highlights");
  highlights.innerHTML = "";
  person.highlights.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    highlights.appendChild(li);
  });
}

function renderFeatured() {
  const wrap = byId("featured-project");
  if (!wrap) return;

  const featured = portfolioData.projects.find((p) => p.featured);
  if (!featured) {
    wrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = "";
  const card = document.createElement("article");
  card.className = "featured-card";

  const content = document.createElement("div");
  content.className = "featured-content";

  const badge = document.createElement("span");
  badge.className = "featured-badge";
  badge.textContent = "★ Featured Project";
  content.appendChild(badge);

  const title = document.createElement("h3");
  title.className = "featured-title";
  title.textContent = featured.title;
  content.appendChild(title);

  const tagline = document.createElement("p");
  tagline.className = "featured-tagline";
  tagline.textContent = featured.tagline;
  content.appendChild(tagline);

  const stack = document.createElement("div");
  stack.className = "featured-stack project-tags";
  featured.stack?.forEach((s) => {
    const chip = document.createElement("span");
    chip.className = "project-chip is-tech";
    chip.textContent = s;
    stack.appendChild(chip);
  });
  content.appendChild(stack);

  card.appendChild(content);

  const media = document.createElement("div");
  media.className = "featured-media";

  if (featured.videoUrl) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "metadata";
    if (featured.videoPoster) video.poster = featured.videoPoster;

    const source = document.createElement("source");
    source.src = featured.videoUrl;
    source.type = featured.videoType || "video/mp4";
    video.appendChild(source);

    video.addEventListener("error", () => {
      video.replaceWith(createFallbackCover(featured));
    });

    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = "video-expand-btn is-featured";
    expand.textContent = "Open Demo";
    expand.addEventListener("click", (event) => {
      event.stopPropagation();
      openVideoModal(featured);
    });

    media.addEventListener("click", () => openVideoModal(featured));
    media.appendChild(video);
    media.appendChild(expand);
  } else {
    media.appendChild(createFallbackCover(featured));
  }

  card.appendChild(media);
  wrap.appendChild(card);
}

function getAllProjectTags() {
  const tags = new Set(["Alle"]);
  portfolioData.projects
    .filter((p) => !p.featured)
    .forEach((project) => {
      project.category.forEach((cat) => tags.add(cat));
    });
  return [...tags];
}

function renderProjectFilters() {
  const wrap = byId("project-tags");
  wrap.innerHTML = "";

  const tags = getAllProjectTags();
  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag ${state.activeTag === tag ? "is-active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderProjectFilters();
      renderProjects();
    });
    wrap.appendChild(button);
  });
}

function renderProjects() {
  const grid = byId("project-grid");
  grid.innerHTML = "";

  const projects = portfolioData.projects
    .filter((p) => !p.featured)
    .filter((project) => {
      if (state.activeTag === "Alle") return true;
      return project.category.includes(state.activeTag);
    });

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";

    card.appendChild(createMedia(project));

    const body = document.createElement("div");
    body.className = "project-body";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = project.title;
    body.appendChild(title);

    if (project.tagline) {
      const tagline = document.createElement("p");
      tagline.className = "project-tagline";
      tagline.textContent = project.tagline;
      body.appendChild(tagline);
    }

    body.appendChild(createProjectChips(project));
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderSkills() {
  const grid = byId("skills-grid");
  grid.innerHTML = "";

  Object.entries(portfolioData.skills).forEach(([category, values], index) => {
    const card = document.createElement("article");
    card.className = "skill-card";
    card.classList.add("reveal-up");
    card.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;

    const heading = document.createElement("h3");
    heading.textContent = category;
    card.appendChild(heading);

    const ul = document.createElement("ul");
    ul.className = "skill-list";
    values.forEach((value) => {
      const li = document.createElement("li");
      li.textContent = value;
      ul.appendChild(li);
    });
    card.appendChild(ul);
    grid.appendChild(card);
  });
}

function renderWorkHistory() {
  const wrap = byId("work-history");
  if (!wrap) return;
  wrap.innerHTML = "";

  portfolioData.workHistory?.forEach((entry, index) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.classList.add("reveal-up");
    item.style.transitionDelay = `${Math.min(index * 55, 360)}ms`;

    const dot = document.createElement("span");
    dot.className = "history-dot";
    item.appendChild(dot);

    const content = document.createElement("div");
    content.className = "history-content";

    const title = document.createElement("h3");
    title.className = "history-title";
    title.textContent = entry.title;
    content.appendChild(title);

    const date = document.createElement("p");
    date.className = "history-date";
    date.textContent = entry.finishedAt;
    content.appendChild(date);

    const summary = document.createElement("p");
    summary.className = "history-summary";
    summary.textContent = entry.summary;
    content.appendChild(summary);

    item.appendChild(content);
    wrap.appendChild(item);
  });
}

function setupRevealAnimations() {
  const nodes = document.querySelectorAll(".reveal-up");
  if (!nodes.length) return;
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );

  nodes.forEach((node) => observer.observe(node));
}

function renderContact() {
  const { contact } = portfolioData;
  setText("contact-intro", contact.intro);

  const email = byId("contact-email");
  email.href = `mailto:${contact.email}`;
  setText("contact-email-text", contact.email);

  const phone = byId("contact-phone");
  phone.href = `tel:${contact.phone.replace(/\s+/g, "")}`;
  setText("contact-phone-text", contact.phone);
}

function renderFooter() {
  const year = new Date().getFullYear();
  setText("footer-text", `${portfolioData.person.name} · ${year}`);
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  setText("theme-toggle-label", state.theme === "dark" ? "light" : "dark");
}

function setupThemeToggle() {
  applyTheme();
  const toggle = byId("theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    applyTheme();
  });
}

function init() {
  setupVideoModal();
  setupThemeToggle();
  renderHero();
  renderFeatured();
  renderProjectFilters();
  renderProjects();
  renderSkills();
  renderWorkHistory();
  setupRevealAnimations();
  renderContact();
  renderFooter();
}

init();
