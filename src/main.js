import { portfolioData } from "./content.js";

const portfolioUiState = {
  activeProjectFilter: "Alle",
  preferredTheme: localStorage.getItem("theme") || "dark",
};
const demoLightboxState = {
  wrap: null,
  player: null,
  title: null,
  play: null,
  mute: null,
  seek: null,
  time: null,
};
const playbackIssueCache = new Set();

function getUiNode(id) {
  return document.getElementById(id);
}

function setUiText(id, value) {
  const node = getUiNode(id);
  if (node) node.textContent = value;
}

function reportPlaybackIssue(projectTitle, stage, error) {
  const cacheKey = `${projectTitle}:${stage}`;
  if (playbackIssueCache.has(cacheKey)) return;
  playbackIssueCache.add(cacheKey);
  console.info(`[portfolio-playback] ${projectTitle} (${stage})`, error || "no error payload");
}

function parseGermanDateTime(value) {
  if (!value || typeof value !== "string") return Number.NEGATIVE_INFINITY;
  const [datePart, timePart = "00:00"] = value.trim().split(" ");
  const [day, month, year] = datePart.split(".").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return Number.NEGATIVE_INFINITY;
  }
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function formatPlaybackTimestamp(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function syncLightboxControls() {
  if (!demoLightboxState.player) return;
  const { player, play, mute, seek, time } = demoLightboxState;
  if (!player.duration || Number.isNaN(player.duration)) {
    seek.value = "0";
    time.textContent = "00:00 / 00:00";
  } else {
    const progress = (player.currentTime / player.duration) * 1000;
    seek.value = Math.max(0, Math.min(1000, Math.round(progress))).toString();
    time.textContent = `${formatPlaybackTimestamp(player.currentTime)} / ${formatPlaybackTimestamp(player.duration)}`;
  }
  play.textContent = player.paused ? "Play" : "Pause";
  mute.textContent = player.muted ? "Unmute" : "Mute";
}

function closeVideoModal() {
  if (!demoLightboxState.wrap || demoLightboxState.wrap.hidden) return;
  demoLightboxState.player.pause();
  demoLightboxState.player.removeAttribute("src");
  demoLightboxState.player.load();
  demoLightboxState.wrap.hidden = true;
  demoLightboxState.wrap.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openVideoModal(project) {
  if (!demoLightboxState.wrap || !project?.videoUrl) return;
  demoLightboxState.title.textContent = project.title;
  demoLightboxState.player.src = project.videoUrl;
  if (project.videoPoster) demoLightboxState.player.poster = project.videoPoster;
  else demoLightboxState.player.removeAttribute("poster");
  demoLightboxState.player.muted = false;
  demoLightboxState.wrap.hidden = false;
  demoLightboxState.wrap.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  demoLightboxState.player.play().catch((error) => {
    reportPlaybackIssue(project.title, "lightbox-open", error);
  });
  syncLightboxControls();
}

function initDemoLightbox() {
  demoLightboxState.wrap = getUiNode("video-modal");
  demoLightboxState.player = getUiNode("video-modal-player");
  demoLightboxState.title = getUiNode("video-modal-title");
  demoLightboxState.play = getUiNode("video-modal-play");
  demoLightboxState.mute = getUiNode("video-modal-mute");
  demoLightboxState.seek = getUiNode("video-modal-seek");
  demoLightboxState.time = getUiNode("video-modal-time");
  const closeBtn = getUiNode("video-modal-close");
  if (!demoLightboxState.wrap || !demoLightboxState.player) return;

  closeBtn?.addEventListener("click", closeVideoModal);
  demoLightboxState.wrap.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute("data-close-video-modal")) {
      closeVideoModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeVideoModal();
  });
  demoLightboxState.play.addEventListener("click", () => {
    if (demoLightboxState.player.paused) {
      demoLightboxState.player.play().catch((error) => {
        reportPlaybackIssue(demoLightboxState.title.textContent || "unknown", "lightbox-play", error);
      });
    } else demoLightboxState.player.pause();
  });
  demoLightboxState.mute.addEventListener("click", () => {
    demoLightboxState.player.muted = !demoLightboxState.player.muted;
    syncLightboxControls();
  });
  demoLightboxState.seek.addEventListener("input", () => {
    if (!demoLightboxState.player.duration || Number.isNaN(demoLightboxState.player.duration)) return;
    const ratio = Number(demoLightboxState.seek.value) / 1000;
    demoLightboxState.player.currentTime = ratio * demoLightboxState.player.duration;
    syncLightboxControls();
  });
  ["timeupdate", "play", "pause", "loadedmetadata", "volumechange", "ended"].forEach((eventName) => {
    demoLightboxState.player.addEventListener(eventName, syncLightboxControls);
  });
}

function buildProjectMediaPreview(project) {
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
      // Load sources only when needed to keep first paint fast.
      const source = document.createElement("source");
      source.src = project.videoUrl;
      source.type = project.videoType || "video/mp4";
      video.appendChild(source);
      video.load();
      video.dataset.loaded = "true";
    }

    video.addEventListener("error", () => {
      video.replaceWith(buildProjectFallbackCover(project));
    });

    wrap.addEventListener("mouseenter", () => {
      ensureVideoSource();
      video.play().catch((error) => {
        reportPlaybackIssue(project.title, "card-hover", error);
      });
    });
    wrap.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
    });

    if ("IntersectionObserver" in window) {
      // Prime videos shortly before they enter viewport for smoother hover playback.
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
    wrap.appendChild(buildProjectFallbackCover(project));
  }

  if (project.wip) {
    const status = document.createElement("span");
    status.className = "project-status-tag";
    status.textContent = "in progress";
    wrap.appendChild(status);
  }

  return wrap;
}

function buildProjectFallbackCover(project) {
  const fallback = document.createElement("div");
  fallback.className = "project-media-fallback";
  fallback.style.background =
    project.cover || "linear-gradient(135deg, #1f2937, #111827)";
  fallback.textContent = project.mediaLabel || project.title.toUpperCase();
  return fallback;
}

function buildProjectTechChips(project) {
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

function pickFeaturedProject(projects) {
  const manualFeatured = projects.find((project) => project.featured);
  if (manualFeatured) return manualFeatured;
  const bootloaderFallback = projects.find((project) =>
    /uefi|bootloader|kernel/i.test(project.title || "")
  );
  return bootloaderFallback || projects[0] || null;
}

function renderHero() {
  const { person } = portfolioData;
  setUiText("hero-name", person.name);
  setUiText("hero-role", person.role);
  setUiText("hero-value", person.value);

  const highlights = getUiNode("hero-highlights");
  highlights.innerHTML = "";
  person.highlights.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    highlights.appendChild(li);
  });
}

function renderFeaturedShowcase() {
  const wrap = getUiNode("featured-project");
  if (!wrap) return;

  const featured = pickFeaturedProject(portfolioData.projects);
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
      video.replaceWith(buildProjectFallbackCover(featured));
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
    media.appendChild(buildProjectFallbackCover(featured));
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
  const wrap = getUiNode("project-tags");
  wrap.innerHTML = "";

  const tags = getAllProjectTags();
  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag ${portfolioUiState.activeProjectFilter === tag ? "is-active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      portfolioUiState.activeProjectFilter = tag;
      renderProjectFilters();
      renderProjectShowcase();
    });
    wrap.appendChild(button);
  });
}

function renderProjectShowcase() {
  const grid = getUiNode("project-grid");
  grid.innerHTML = "";

  const projects = portfolioData.projects
    .filter((p) => !p.featured)
    .filter((project) => {
      if (portfolioUiState.activeProjectFilter === "Alle") return true;
      return project.category.includes(portfolioUiState.activeProjectFilter);
    });

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";

    card.appendChild(buildProjectMediaPreview(project));

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

    body.appendChild(buildProjectTechChips(project));
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function renderSkillMatrix() {
  const grid = getUiNode("skills-grid");
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

function renderProjectTimeline() {
  const wrap = getUiNode("work-history");
  if (!wrap) return;
  wrap.innerHTML = "";

  // Recruiters usually scan newest work first, so this stays date-driven.
  const timelineEntries = [...(portfolioData.workHistory || [])]
    .filter((entry) => entry?.title && entry?.finishedAt && entry?.summary)
    .sort((a, b) => parseGermanDateTime(b.finishedAt) - parseGermanDateTime(a.finishedAt));

  timelineEntries.forEach((entry, index) => {
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

function initScrollReveal() {
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
  setUiText("contact-intro", contact.intro);

  const email = getUiNode("contact-email");
  email.href = `mailto:${contact.email}`;
  setUiText("contact-email-text", contact.email);

  const phone = getUiNode("contact-phone");
  phone.href = `tel:${contact.phone.replace(/\s+/g, "")}`;
  setUiText("contact-phone-text", contact.phone);
}

function renderFooter() {
  const year = new Date().getFullYear();
  setUiText("footer-text", `${portfolioData.person.name} · ${year}`);
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", portfolioUiState.preferredTheme);
  setUiText("theme-toggle-label", portfolioUiState.preferredTheme === "dark" ? "light" : "dark");
}

function setupThemeToggle() {
  applyTheme();
  const toggle = getUiNode("theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    portfolioUiState.preferredTheme =
      portfolioUiState.preferredTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", portfolioUiState.preferredTheme);
    applyTheme();
  });
}

function init() {
  initDemoLightbox();
  setupThemeToggle();
  renderHero();
  renderFeaturedShowcase();
  renderProjectFilters();
  renderProjectShowcase();
  renderSkillMatrix();
  renderProjectTimeline();
  initScrollReveal();
  renderContact();
  renderFooter();
}

init();
