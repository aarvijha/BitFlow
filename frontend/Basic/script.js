/* script.js — separated file
   Notes:
   - No pathWidget collapsing/toggling code (removed as requested)
   - Ensures file list never goes underneath pathWidget by relying on CSS var --pathbar-height
   - Mobile sidebar only appears on small screens (CSS hides it on desktop)
*/

"use strict";

const HOST = "localhost";
const PORT = 8888;
const BASE_URL = `http://${HOST}:${PORT}`;
const socket = io(BASE_URL);

const fileListDiv = document.getElementById("fileList");
const loadingDiv = document.getElementById("loading");
const backBtn = document.getElementById("backBtn");
const forwardBtn = document.getElementById("forwardBtn");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const themeToggle = document.getElementById("themeToggle");

const burgerBtn = document.getElementById("burgerBtn");
const mobileSidebar = document.getElementById("mobileSidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const sortSelectMobile = document.getElementById("sortSelectMobile");
const themeToggleMobile = document.getElementById("themeToggleMobile");

const pathWidget = document.getElementById("pathWidget");
const pathLabel = document.getElementById("pathLabel");
const openFolderInfo = document.getElementById("openFolderInfo");

let currentPath = "/";
let backStack = [];
let forwardStack = [];
let currentFiles = [];
let currentFolderDetails = null;
let selectedItems = new Set();

const mediaExtensions = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
  audio: [".mp3", ".wav", ".ogg", ".m4a"],
  video: [".mp4", ".webm", ".ogv", ".mov", ".mkv"],
};
const safeText = (v, fallback = "") =>
  typeof v === "string" && v.trim().length > 0 ? v : fallback;

function isStreamable(ext) {
  ext = ext?.toLowerCase() || "";
  return (
    mediaExtensions.image.includes(ext) ||
    mediaExtensions.audio.includes(ext) ||
    mediaExtensions.video.includes(ext)
  );
}
function formatDate(dtStr) {
  if (!dtStr) return "";
  const dt = new Date(dtStr);
  return (
    dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " " +
    dt.toLocaleDateString()
  );
}
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}
function getFileIcon(ext, type) {
  if (type === "directory") return "📁";
  ext = ext?.toLowerCase() || "";
  if (mediaExtensions.video.includes(ext)) return "🎬";
  if (mediaExtensions.audio.includes(ext)) return "🎵";
  if (mediaExtensions.image.includes(ext)) return "🖼️";
  return "📄";
}
function updateNavButtons() {
  if (backBtn) backBtn.disabled = backStack.length <= 0;
  if (forwardBtn) forwardBtn.disabled = forwardStack.length <= 0;
}

function openSidebar() {
  if (!mobileSidebar || !sidebarBackdrop) return;
  mobileSidebar.classList.add("open");
  sidebarBackdrop.classList.add("show");
  document.body.classList.add("sidebar-open");
  try {
    document.documentElement.style.overflow = "hidden";
  } catch (e) {}
  if (burgerBtn) {
    const i = burgerBtn.querySelector("i");
    if (i) {
      i.classList.remove("fa-bars");
      i.classList.add("fa-xmark");
    }
  }
}
function closeSidebar() {
  if (!mobileSidebar || !sidebarBackdrop) return;
  mobileSidebar.classList.remove("open");
  sidebarBackdrop.classList.remove("show");
  document.body.classList.remove("sidebar-open");
  try {
    document.documentElement.style.overflow = "";
  } catch (e) {}
  if (burgerBtn) {
    const i = burgerBtn.querySelector("i");
    if (i) {
      i.classList.remove("fa-xmark");
      i.classList.add("fa-bars");
    }
  }
}
function toggleSidebar() {
  if (!mobileSidebar) return;
  mobileSidebar.classList.contains("open") ? closeSidebar() : openSidebar();
}

if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeSidebar);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSidebar();
    closeModal();
  }
});
if (burgerBtn) burgerBtn.addEventListener("click", toggleSidebar);

function toggleThemeUi() {
  document.body.classList.toggle("dark");
  const t = themeToggle && themeToggle.querySelector("i");
  const t2 = themeToggleMobile && themeToggleMobile.querySelector("i");
  [t, t2].forEach((icon) => {
    if (!icon) return;
    icon.classList.toggle("fa-sun");
    icon.classList.toggle("fa-moon");
  });
}
if (themeToggle) themeToggle.addEventListener("click", toggleThemeUi);
if (themeToggleMobile)
  themeToggleMobile.addEventListener("click", toggleThemeUi);

if (sortSelect && sortSelectMobile) {
  sortSelectMobile.value = sortSelect.value;
  sortSelect.addEventListener("change", () => {
    sortSelectMobile.value = sortSelect.value;
    if (currentFiles.length > 0) renderFileList(currentFiles);
  });
  sortSelectMobile.addEventListener("change", () => {
    sortSelect.value = sortSelectMobile.value;
    if (currentFiles.length > 0) renderFileList(currentFiles);
  });
}

function requestPath(path, pushHistory = true) {
  currentPath = path || "/";
  if (pathLabel) pathLabel.textContent = safeText(path, "/");
  fileListDiv && (fileListDiv.innerHTML = "");
  loadingDiv && (loadingDiv.textContent = "Loading...");
  socket.emit("list_dir", { path: currentPath });
  if (pushHistory) {
    if (
      backStack.length === 0 ||
      backStack[backStack.length - 1] !== currentPath
    )
      backStack.push(currentPath);
    forwardStack = [];
    updateNavButtons();
  }
  if (mobileSidebar && mobileSidebar.classList.contains("open")) closeSidebar();
  clearSelections();
}

if (backBtn)
  backBtn.onclick = () => {
    if (backStack.length > 1) {
      forwardStack.push(backStack.pop());
      requestPath(backStack[backStack.length - 1], false);
      updateNavButtons();
    }
  };
if (forwardBtn)
  forwardBtn.onclick = () => {
    if (forwardStack.length > 0) {
      const nextPath = forwardStack.pop();
      requestPath(nextPath, false);
      backStack.push(nextPath);
      updateNavButtons();
    }
  };

if (searchInput) {
  searchInput.addEventListener(
    "input",
    () => {
      const search = searchInput.value.toLowerCase();
      document.querySelectorAll(".fileItem, .folderItem").forEach((el) => {
        const name = (el.dataset.name || "").toLowerCase();
        el.style.display = name.includes(search) ? "flex" : "none";
      });
    },
    { passive: true }
  );
}

function sortFiles(files) {
  const criteria =
    (sortSelect && sortSelect.value) ||
    (sortSelectMobile && sortSelectMobile.value) ||
    "name_asc";
  return files.slice().sort((a, b) => {
    switch (criteria) {
      case "name_asc":
        return a.details.name.localeCompare(b.details.name);
      case "name_desc":
        return b.details.name.localeCompare(a.details.name);
      case "modified_asc":
        return new Date(a.details.modified) - new Date(b.details.modified);
      case "modified_desc":
        return new Date(b.details.modified) - new Date(a.details.modified);
      case "size_asc":
        return (a.details.size || 0) - (b.details.size || 0);
      case "size_desc":
        return (b.details.size || 0) - (a.details.size || 0);
      default:
        return 0;
    }
  });
}

function clearSelections() {
  selectedItems.forEach((el) => el.classList.remove("selected"));
  selectedItems.clear();
  updateFolderActionButtons();
}
function selectElement(itemDiv) {
  selectedItems.forEach((el) => el.classList.remove("selected"));
  selectedItems.clear();
  itemDiv.classList.add("selected");
  selectedItems.add(itemDiv);
  updateFolderActionButtons();
}
function toggleSelectElement(itemDiv) {
  if (itemDiv.classList.contains("selected")) {
    itemDiv.classList.remove("selected");
    selectedItems.delete(itemDiv);
  } else {
    selectedItems.forEach((el) => el.classList.remove("selected"));
    selectedItems.clear();
    itemDiv.classList.add("selected");
    selectedItems.add(itemDiv);
  }
  updateFolderActionButtons();
}

function updateFolderActionButtons() {
  document.querySelectorAll(".folderItem").forEach((folderEl) => {
    const actions = folderEl.querySelector(".fileActions");
    if (!actions) return;
    actions.style.display = folderEl.classList.contains("selected")
      ? "flex"
      : "none";
  });
}

document.addEventListener("click", (e) => {
  const isFileCard = !!e.target.closest(".fileItem, .folderItem");
  const isWidget = !!e.target.closest("#pathWidget");
  const isToolbar = !!e.target.closest(".toolbar");
  const isSidebar = !!e.target.closest("#mobileSidebar");
  const isModal =
    !!e.target.closest("#folderModal") || !!e.target.closest(".modal-backdrop");
  if (!isFileCard && !isWidget && !isToolbar && !isSidebar && !isModal)
    clearSelections();
});

function fetchDirOnce(path, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const handler = (res) => {
      if (!res || !res.data) return;
      if (res.data.path === path) {
        resolved = true;
        socket.off("list_dir_result", handler);
        clearTimeout(to);
        resolve(res);
      }
    };
    socket.on("list_dir_result", handler);
    socket.emit("list_dir", { path });
    const to = setTimeout(() => {
      if (!resolved) {
        socket.off("list_dir_result", handler);
        reject(new Error("Timeout fetching directory listing for " + path));
      }
    }, timeout);
  });
}

async function downloadFilesInDir(path) {
  try {
    if (loadingDiv) loadingDiv.textContent = "Fetching folder contents...";
    const res = await fetchDirOnce(path, 15000);
    if (loadingDiv) loadingDiv.textContent = "";
    if (
      !res ||
      res.status === "error" ||
      !res.data ||
      !Array.isArray(res.data.children)
    ) {
      alert("Could not fetch folder contents.");
      return;
    }
    const children = res.data.children;
    const files = children.filter((c) => c.type === "file");
    if (files.length === 0) {
      alert("No files to download (folders are skipped).");
      return;
    }
    files.forEach((f) => {
      const url = `${BASE_URL}/download/file?path=${encodeURIComponent(
        f.path
      )}`;
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.download = f.details && f.details.name ? f.details.name : "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  } catch (err) {
    if (loadingDiv) loadingDiv.textContent = "";
    console.error(err);
    alert("Failed to download folder files: " + (err.message || err));
  }
}

function attachItemHandlers(itemDiv, item) {
  itemDiv.dataset.path = item.path;
  itemDiv.dataset.type = item.type;
  itemDiv.dataset.name = item.details.name || "";
  let touchTimer = null;
  let clickTimeout = null;
  itemDiv.addEventListener("click", (evt) => {
    if (evt.target.closest(".fileActions")) return;
    if (item.type === "directory") {
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        requestPath(item.path);
      }, 240);
    } else if (item.type === "file") {
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        if (isStreamable(item.details.extension)) streamFile(item);
        else
          window.open(
            `${BASE_URL}/download/file?path=${encodeURIComponent(item.path)}`,
            "_blank"
          );
      }, 240);
    }
  });
  itemDiv.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
    toggleSelectElement(itemDiv);
  });
  itemDiv.addEventListener(
    "touchstart",
    (e) => {
      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => toggleSelectElement(itemDiv), 500);
    },
    { passive: true }
  );
  itemDiv.addEventListener("touchend", (e) => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  });
  itemDiv.setAttribute("tabindex", "0");
  itemDiv.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (item.type === "directory") requestPath(item.path);
      else {
        if (isStreamable(item.details.extension)) streamFile(item);
        else
          window.open(
            `${BASE_URL}/download/file?path=${encodeURIComponent(item.path)}`,
            "_blank"
          );
      }
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggleSelectElement(itemDiv);
    }
  });
}

function renderFileList(files) {
  if (!fileListDiv) return;
  fileListDiv.innerHTML = "";
  const sorted = sortFiles(files);
  sorted.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = item.type === "directory" ? "folderItem" : "fileItem";
    itemDiv.dataset.name = item.details.name || "";
    itemDiv.dataset.modified = item.details.modified || "";
    itemDiv.dataset.size = item.details.size || 0;
    const iconDiv = document.createElement("div");
    iconDiv.className = "fileIcon";
    iconDiv.textContent = getFileIcon(item.details.extension, item.type);
    itemDiv.appendChild(iconDiv);
    const nameDiv = document.createElement("div");
    nameDiv.className = "fileName";
    nameDiv.textContent = item.details.name || "";
    itemDiv.appendChild(nameDiv);
    const typeDiv = document.createElement("div");
    typeDiv.className = "fileType";
    typeDiv.textContent =
      item.type === "directory"
        ? `${item.details.count || 0} items`
        : formatSize(item.details.size || 0);
    itemDiv.appendChild(typeDiv);
    const modifiedDiv = document.createElement("div");
    modifiedDiv.className = "fileModified";
    modifiedDiv.textContent = formatDate(item.details.modified);
    itemDiv.appendChild(modifiedDiv);
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "fileActions";
    actionsDiv.style.display = item.type === "directory" ? "none" : "flex";
    if (item.type === "directory") {
      const downloadBtn = document.createElement("button");
      downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
      downloadBtn.title = "Download files in this folder (skip subfolders)";
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadFilesInDir(item.path);
      });
      actionsDiv.appendChild(downloadBtn);
    } else {
      const downloadBtn = document.createElement("button");
      downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
      downloadBtn.title = "Download this file";
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(
          `${BASE_URL}/download/file?path=${encodeURIComponent(item.path)}`,
          "_blank"
        );
      });
      actionsDiv.appendChild(downloadBtn);
      if (isStreamable(item.details.extension)) {
        const streamBtn = document.createElement("button");
        streamBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        streamBtn.title = "Stream this file";
        streamBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          streamFile(item);
        });
        actionsDiv.appendChild(streamBtn);
      }
    }
    itemDiv.appendChild(actionsDiv);
    attachItemHandlers(itemDiv, item);
    fileListDiv.appendChild(itemDiv);
  });

  updateNavButtons();
  updateFolderActionButtons();
}

function streamFile(item) {
  const url = `${BASE_URL}/download/file?path=${encodeURIComponent(item.path)}`;
  const ext = (item.details.extension || "").toLowerCase();
  if (mediaExtensions.image.includes(ext)) {
    const imgWindow = window.open("", "_blank");
    const img = imgWindow.document.createElement("img");
    img.src = url;
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    imgWindow.document.body.appendChild(img);
  } else if (mediaExtensions.audio.includes(ext)) {
    const audioWindow = window.open("", "_blank");
    const audio = audioWindow.document.createElement("audio");
    audio.controls = true;
    audio.autoplay = true;
    audio.style.width = "100%";
    const source = audioWindow.document.createElement("source");
    source.src = `${BASE_URL}/stream/file?path=${encodeURIComponent(
      item.path
    )}`;
    source.type = item.details.filetype || "audio/mpeg";
    audio.appendChild(source);
    audioWindow.document.body.appendChild(audio);
  } else if (mediaExtensions.video.includes(ext)) {
    const videoWindow = window.open("", "_blank");
    const video = videoWindow.document.createElement("video");
    video.id = "player";
    video.className = "video-js vjs-big-play-centered";
    video.controls = true;
    video.preload = "auto";
    video.width = videoWindow.innerWidth;
    video.height = videoWindow.innerHeight;
    const source = videoWindow.document.createElement("source");
    source.src = `${BASE_URL}/stream/file?path=${encodeURIComponent(
      item.path
    )}`;
    source.type = "video/mp4";
    video.appendChild(source);
    videoWindow.document.body.appendChild(video);
    const link = videoWindow.document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://vjs.zencdn.net/8.13.0/video-js.css";
    videoWindow.document.head.appendChild(link);
    const script = videoWindow.document.createElement("script");
    script.src = "https://vjs.zencdn.net/8.13.0/video.min.js";
    script.onload = () => {
      if (videoWindow.videojs)
        videoWindow
          .videojs("player")
          .ready(() => videoWindow.videojs("player").requestFullscreen());
    };
    videoWindow.document.body.appendChild(script);
  }
}

socket.on("list_dir_status", (data) => {
  if (data && data.status === "loading") {
    if (loadingDiv)
      loadingDiv.textContent = "Loading " + (data.path || "") + "...";
  }
});

if (pathLabel) {
  if (!pathLabel.textContent || !pathLabel.textContent.trim())
    pathLabel.textContent = "/";
  pathLabel.style.display = pathLabel.style.display || "inline-block";
}

socket.on("list_dir_result", (res) => {
  try {
    if (loadingDiv) loadingDiv.textContent = "";
    if (!res) return;
    if (res.status === "error") {
      if (loadingDiv)
        loadingDiv.innerHTML = `<div class="errorMessage">Error ${
          res.code || ""
        }: ${res.message || "Unknown error"}</div>`;
      if (fileListDiv) fileListDiv.innerHTML = "";
      return;
    }
    if (!res.data) return;
    const serverPath =
      typeof res.data.path === "string" && res.data.path.trim().length > 0
        ? res.data.path
        : "/";
    if (pathLabel) pathLabel.textContent = serverPath;
    currentFolderDetails = res.data.details || currentFolderDetails;
    if (res.data.path === currentPath) {
      currentFiles = res.data.children || [];
      if (currentFiles.length === 0) {
        if (fileListDiv)
          fileListDiv.innerHTML =
            '<div class="errorMessage">No files or folders</div>';
        return;
      }
      renderFileList(currentFiles);
    }
  } catch (err) {
    console.error("Error handling list_dir_result", err);
  }
});

let folderModalEl = null;
let modalBackdrop = null;
function createModalElements() {
  if (folderModalEl) return folderModalEl;
  modalBackdrop = document.createElement("div");
  modalBackdrop.className = "modal-backdrop";
  modalBackdrop.style.position = "fixed";
  modalBackdrop.style.inset = "0";
  modalBackdrop.style.background = "rgba(0,0,0,0.35)";
  modalBackdrop.style.zIndex = 9998;
  modalBackdrop.style.display = "none";
  modalBackdrop.addEventListener("click", closeModal);
  document.body.appendChild(modalBackdrop);
  folderModalEl = document.createElement("div");
  folderModalEl.id = "folderModal";
  folderModalEl.style.position = "fixed";
  folderModalEl.style.top = "50%";
  folderModalEl.style.left = "50%";
  folderModalEl.style.transform = "translate(-50%,-50%)";
  folderModalEl.style.backgroundColor = "var(--card-bg, #fff)";
  folderModalEl.style.color = "var(--text-color, #222)";
  folderModalEl.style.padding = "18px";
  folderModalEl.style.borderRadius = "12px";
  folderModalEl.style.boxShadow = "0 12px 36px rgba(0,0,0,0.35)";
  folderModalEl.style.zIndex = 9999;
  folderModalEl.style.maxWidth = "420px";
  folderModalEl.style.minWidth = "260px";
  folderModalEl.style.display = "none";
  const content = document.createElement("div");
  content.className = "folderModalContent";
  folderModalEl.appendChild(content);
  const closeRow = document.createElement("div");
  closeRow.style.display = "flex";
  closeRow.style.justifyContent = "flex-end";
  closeRow.style.marginTop = "12px";
  const closeBtn = document.createElement("button");
  closeBtn.className = "iconBtn";
  closeBtn.textContent = "Close";
  closeBtn.style.padding = "8px 12px";
  closeBtn.addEventListener("click", closeModal);
  closeRow.appendChild(closeBtn);
  folderModalEl.appendChild(closeRow);
  document.body.appendChild(folderModalEl);
  return folderModalEl;
}

function showFolderModal(details) {
  if (!details) return;
  createModalElements();
  const content = folderModalEl.querySelector(".folderModalContent");
  content.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = "Folder Info";
  title.style.margin = "0 0 8px 0";
  content.appendChild(title);
  const fields = [
    ["Name", details.name],
    ["Items", details.count],
    ["Created", details.created ? formatDate(details.created) : ""],
    ["Modified", details.modified ? formatDate(details.modified) : ""],
    [
      "Accessed",
      details.accessed ? formatDate(details.accessed) : "",
    ] /*, ['Permissions', details.permissions || ''] */,
  ];
  fields.forEach(([k, v]) => {
    const p = document.createElement("p");
    p.style.margin = "6px 0";
    p.innerHTML = `<strong>${k}:</strong> ${v ?? ""}`;
    content.appendChild(p);
  });
  const quickRow = document.createElement("div");
  quickRow.style.display = "flex";
  quickRow.style.justifyContent = "flex-end";
  quickRow.style.marginTop = "8px";
  const quickDownloadBtn = document.createElement("button");
  quickDownloadBtn.textContent = "Download files";
  quickDownloadBtn.style.padding = "8px 12px";
  quickDownloadBtn.style.marginLeft = "8px";
  quickDownloadBtn.addEventListener("click", () => {
    downloadFilesInDir(currentPath);
    closeModal();
  });
  quickRow.appendChild(quickDownloadBtn);
  content.appendChild(quickRow);
  modalBackdrop.style.display = "block";
  folderModalEl.style.display = "block";
}
function closeModal() {
  if (folderModalEl) folderModalEl.style.display = "none";
  if (modalBackdrop) modalBackdrop.style.display = "none";
}

if (pathWidget) {
  pathWidget.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentFolderDetails) showFolderModal(currentFolderDetails);
  });
}
if (openFolderInfo) {
  openFolderInfo.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentFolderDetails) showFolderModal(currentFolderDetails);
  });
}

if (pathLabel && (!pathLabel.textContent || !pathLabel.textContent.trim()))
  pathLabel.textContent = "/";
requestPath("/");

window._fileExplorer = {
  requestPath,
  fetchDirOnce,
  downloadFilesInDir,
  currentFiles,
};
