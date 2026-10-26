
"use strict";

const NOTES_KEY = "digitalNotes";
const THEME_KEY = "digitalNotesTheme";

let notes = [];
let currentFilter = "all";
let editingNoteId = null;
let selectedColor = "yellow";

const colors = ["yellow", "blue", "pink", "green", "purple"];

const grid = document.getElementById("notesGrid");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("noteModal");
const noteForm = document.getElementById("noteForm");
const titleInput = document.getElementById("noteTitle");
const contentInput = document.getElementById("noteContent");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

// Load saved notes without clearing browser storage.
function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
    notes = Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Could not read saved notes:", error);
    notes = [];
  }

  renderNotes();
  updateStats();
}

function saveNotes() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    renderNotes();
    updateStats();
  } catch (error) {
    alert("Notes save nahi ho sake. Browser storage check karein.");
    console.error(error);
  }
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getVisibleNotes() {
  const query = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  return notes
    .filter(note => {
      if (currentFilter === "pinned" && !note.pinned) return false;

      if (currentFilter === "recent") {
        const date = new Date(note.updatedAt || note.createdAt).getTime();
        if (!Number.isNaN(date) &&
            Date.now() - date > 7 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      const title = String(note.title || "").toLowerCase();
      const content = String(note.content || "").toLowerCase();

      return title.includes(query) || content.includes(query);
    })
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return Number(b.pinned) - Number(a.pinned);
      }

      return new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime();
    });
}

function renderNotes() {
  if (!grid) return;

  const visibleNotes = getVisibleNotes();

  if (visibleNotes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No notes found</h3>
        <p>Create a new note or change your search.</p>
        <button type="button" data-action="new">+ Create Note</button>
      </div>`;
    return;
  }

  grid.innerHTML = visibleNotes.map(note => {
    const color = colors.includes(note.color) ? note.color : "yellow";
    const id = escapeHTML(note.id);

    return `
      <article class="note-card ${color}">
        <div class="note-card-header">
          <h3>${escapeHTML(note.title || "Untitled Note")}</h3>
          ${note.pinned ? '<span class="pin-label">📌 Pinned</span>' : ""}
        </div>

        <div class="note-content">
          ${escapeHTML(note.content || "").replace(/\n/g, "<br>")}
        </div>

        <div class="note-date">
          Updated: ${escapeHTML(formatDate(note.updatedAt || note.createdAt))}
        </div>

        <div class="note-menu">
          <button type="button" class="note-action"
            data-action="edit" data-id="${id}">✏️ Edit</button>

          <button type="button" class="note-action"
            data-action="pin" data-id="${id}">
            ${note.pinned ? "Unpin" : "📌 Pin"}
          </button>

          <button type="button" class="note-action"
            data-action="export" data-id="${id}">⬇ Export</button>

          <button type="button" class="note-action"
            data-action="delete" data-id="${id}">🗑 Delete</button>
        </div>
      </article>`;
  }).join("");
}

function updateStats() {
  const total = document.getElementById("totalNotes");
  const pinned = document.getElementById("pinnedNotes");

  if (total) total.textContent = notes.length;
  if (pinned) pinned.textContent = notes.filter(note => note.pinned).length;
}

function openNewNote() {
  editingNoteId = null;
  selectedColor = "yellow";

  noteForm.reset();
  titleInput.value = "";
  contentInput.value = "";

  document.getElementById("modalTitle").textContent = "Create New Note";
  document.getElementById("saveNoteBtn").textContent = "Save Note";

  updateColorSelection();

  modal.classList.add("active");
  titleInput.focus();
}

// IMPORTANT: Opens the existing note in EDIT mode.
function openModal(note) {
  if (!note) return;

  editingNoteId = note.id;
  selectedColor = colors.includes(note.color) ? note.color : "yellow";

  titleInput.value = note.title || "";
  contentInput.value = note.content || "";

  document.getElementById("modalTitle").textContent = "Edit Note";
  document.getElementById("saveNoteBtn").textContent = "Save Changes";

  updateColorSelection();
  modal.classList.add("active");
  titleInput.focus();
}

function closeModal() {
  modal.classList.remove("active");
  editingNoteId = null;
}

function updateColorSelection() {
  document.querySelectorAll("[data-color]").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.color === selectedColor
    );
  });
}

// Saves a new note OR updates the selected existing note.
function saveNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title && !content) {
    alert("Please enter a title or note content.");
    return;
  }

  const now = new Date().toISOString();

  if (editingNoteId !== null) {
    const existing = notes.find(
      note => String(note.id) === String(editingNoteId)
    );

    if (existing) {
      existing.title = title || "Untitled Note";
      existing.content = content;
      existing.color = selectedColor;
      existing.updatedAt = now;

      saveNotes();
      closeModal();
      return;
    }
  }

  notes.unshift({
    id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
    title: title || "Untitled Note",
    content,
    color: selectedColor,
    pinned: false,
    createdAt: now,
    updatedAt: now
  });

  saveNotes();
  closeModal();
}

function deleteNote(id) {
  const note = notes.find(item => String(item.id) === String(id));
  if (!note) return;

  if (!confirm(`Delete "${note.title}"?`)) return;

  notes = notes.filter(item => String(item.id) !== String(id));
  saveNotes();
}

function pinNote(id) {
  const note = notes.find(item => String(item.id) === String(id));
  if (!note) return;

  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  saveNotes();
}

function downloadText(text, filename) {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportNote(note) {
  if (!note) return;

  downloadText(
    `${note.title}\n\n${note.content}`,
    `${String(note.title || "note").replace(/[\\/:*?"<>|]/g, "-")}.txt`
  );
}

function exportAllNotes() {
  if (notes.length === 0) {
    alert("There are no notes to export.");
    return;
  }

  const text = notes.map(note =>
    `${note.title}\n${"=".repeat(30)}\n${note.content}`
  ).join("\n\n");

  downloadText(text, "digital-notes.txt");
}

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  renderNotes();
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  localStorage.setItem(
    THEME_KEY,
    document.body.classList.contains("dark-mode") ? "dark" : "light"
  );
}

function bindEvents() {
  document.getElementById("newNoteBtn")
    .addEventListener("click", openNewNote);

  noteForm.addEventListener("submit", saveNote);

  document.getElementById("closeModal")
    .addEventListener("click", closeModal);

  document.getElementById("cancelNoteBtn")
    .addEventListener("click", closeModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  searchInput.addEventListener("input", renderNotes);

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  document.getElementById("themeToggle")
    .addEventListener("click", toggleTheme);

  document.getElementById("exportAllBtn")
    .addEventListener("click", exportAllNotes);

  document.querySelectorAll("[data-color]").forEach(button => {
    button.addEventListener("click", () => {
      if (!colors.includes(button.dataset.color)) return;

      selectedColor = button.dataset.color;
      updateColorSelection();
    });
  });

  // Event delegation makes Edit work for every rendered note.
  grid.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;

    if (action === "new") {
      openNewNote();
      return;
    }

    const note = notes.find(
      item => String(item.id) === String(button.dataset.id)
    );

    if (!note) return;

    if (action === "edit") openModal(note);
    if (action === "pin") pinNote(note.id);
    if (action === "delete") deleteNote(note.id);
    if (action === "export") exportNote(note);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const theme = localStorage.getItem(THEME_KEY);

  if (theme === "dark") {
    document.body.classList.add("dark-mode");
  }

  bindEvents();
  loadNotes();
});
