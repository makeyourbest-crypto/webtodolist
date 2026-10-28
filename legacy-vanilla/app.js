/**
 * Modern Vanilla JavaScript To-Do List Application
 * Handles CRUD operations, local storage persistence, filtering, and theme switching.
 */

// ==========================================================================
// Constants & State
// ==========================================================================
const STORAGE_KEY_TODOS = 'webtodolist_items_v1';
const STORAGE_KEY_THEME = 'webtodolist_theme_v1';

let todos = [];
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

// ==========================================================================
// DOM Elements
// ==========================================================================
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const inputWrapper = document.querySelector('.input-wrapper');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const emptyTitle = document.getElementById('empty-title');
const emptyDesc = document.getElementById('empty-desc');
const itemsLeftSpan = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const filterTabs = document.querySelectorAll('.filter-tab');
const themeToggleBtn = document.getElementById('theme-toggle');
const currentDateEl = document.getElementById('current-date');
const progressPercentEl = document.getElementById('progress-percent');
const progressFillEl = document.getElementById('progress-fill');
const progressStatusEl = document.getElementById('progress-status');

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderDate();
  loadTodos();
  setupEventListeners();
  render();
});

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  // Add task on form submit
  todoForm.addEventListener('submit', handleAddTodo);

  // Filter tabs click
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      if (currentFilter !== filter) {
        currentFilter = filter;
        filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        render();
      }
    });
  });

  // Clear completed tasks
  clearCompletedBtn.addEventListener('click', handleClearCompleted);

  // Toggle Dark/Light Theme
  themeToggleBtn.addEventListener('click', toggleTheme);
}

// ==========================================================================
// Date Display (Indonesian Locale)
// ==========================================================================
function renderDate() {
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  const today = new Date();
  try {
    currentDateEl.textContent = today.toLocaleDateString('id-ID', options);
  } catch (e) {
    // Fallback if locale is unsupported
    currentDateEl.textContent = today.toDateString();
  }
}

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check OS preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
}

// ==========================================================================
// LocalStorage Operations
// ==========================================================================
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TODOS);
    todos = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(todos)) {
      todos = [];
    }
  } catch (err) {
    console.error('Gagal membaca data dari LocalStorage:', err);
    todos = [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(todos));
  } catch (err) {
    console.error('Gagal menyimpan data ke LocalStorage:', err);
  }
}

// ==========================================================================
// Task Actions (CRUD)
// ==========================================================================

/**
 * Add a new todo item
 */
function handleAddTodo(e) {
  e.preventDefault();
  const text = todoInput.value.trim();

  if (!text) {
    // Trigger shake animation for feedback
    inputWrapper.classList.remove('shake');
    // Force DOM reflow
    void inputWrapper.offsetWidth;
    inputWrapper.classList.add('shake');
    todoInput.focus();
    return;
  }

  const newTodo = {
    id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text: text,
    completed: false,
    createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  };

  // Add new task to beginning of list
  todos.unshift(newTodo);
  saveTodos();

  todoInput.value = '';
  todoInput.focus();

  render();
}

/**
 * Toggle completed state of a task
 */
function toggleTodo(id) {
  todos = todos.map((item) => {
    if (item.id === id) {
      return { ...item, completed: !item.completed };
    }
    return item;
  });
  saveTodos();
  render();
}

/**
 * Delete a task with exit animation
 */
function deleteTodo(id) {
  const itemEl = document.querySelector(`[data-id="${id}"]`);
  if (itemEl) {
    itemEl.classList.add('removing');
    itemEl.addEventListener(
      'animationend',
      () => {
        todos = todos.filter((item) => item.id !== id);
        saveTodos();
        render();
      },
      { once: true }
    );
  } else {
    todos = todos.filter((item) => item.id !== id);
    saveTodos();
    render();
  }
}

/**
 * Enable inline editing for a task
 */
function startEditTodo(id) {
  const itemEl = document.querySelector(`[data-id="${id}"]`);
  if (!itemEl) return;

  const targetTodo = todos.find((t) => t.id === id);
  if (!targetTodo) return;

  const textWrap = itemEl.querySelector('.todo-text-wrap');
  const actionsWrap = itemEl.querySelector('.todo-actions');

  // Create inline input
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = targetTodo.text;
  editInput.maxLength = 120;

  // Replace content
  textWrap.style.display = 'none';
  actionsWrap.style.display = 'none';
  itemEl.insertBefore(editInput, actionsWrap);
  editInput.focus();
  editInput.select();

  const commitEdit = () => {
    const updatedText = editInput.value.trim();
    if (updatedText && updatedText !== targetTodo.text) {
      targetTodo.text = updatedText;
      saveTodos();
    }
    render();
  };

  const cancelEdit = () => {
    render();
  };

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  });

  editInput.addEventListener('blur', commitEdit);
}

/**
 * Clear all completed tasks
 */
function handleClearCompleted() {
  const completedCount = todos.filter((t) => t.completed).length;
  if (completedCount === 0) return;

  // Animate completed items removal
  const completedElements = document.querySelectorAll('.todo-item.completed');
  if (completedElements.length > 0) {
    completedElements.forEach((el) => el.classList.add('removing'));
    setTimeout(() => {
      todos = todos.filter((t) => !t.completed);
      saveTodos();
      render();
    }, 200);
  } else {
    todos = todos.filter((t) => !t.completed);
    saveTodos();
    render();
  }
}

// ==========================================================================
// Rendering & UI Updates
// ==========================================================================

function getFilteredTodos() {
  if (currentFilter === 'active') {
    return todos.filter((t) => !t.completed);
  }
  if (currentFilter === 'completed') {
    return todos.filter((t) => t.completed);
  }
  return todos;
}

function updateProgress() {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressPercentEl.textContent = `${percent}%`;
  progressFillEl.style.width = `${percent}%`;
  progressStatusEl.textContent = `${completed} dari ${total} tugas selesai`;
}

function updateStats() {
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  itemsLeftSpan.textContent = `${activeCount} tugas tersisa`;

  // Toggle clear completed button visibility
  if (completedCount > 0) {
    clearCompletedBtn.classList.remove('hidden');
  } else {
    clearCompletedBtn.classList.add('hidden');
  }
}

function updateEmptyState(filteredCount) {
  if (filteredCount === 0) {
    emptyState.classList.add('visible');
    if (currentFilter === 'active') {
      emptyTitle.textContent = 'Semua tugas aktif sudah selesai!';
      emptyDesc.textContent = 'Bagus sekali! Tidak ada tugas yang tertunda.';
    } else if (currentFilter === 'completed') {
      emptyTitle.textContent = 'Belum ada tugas selesai';
      emptyDesc.textContent = 'Selesaikan tugas untuk melihat riwayat di sini.';
    } else {
      emptyTitle.textContent = 'Belum ada tugas';
      emptyDesc.textContent = 'Tambahkan tugas baru untuk mulai mengorganisir harimu!';
    }
  } else {
    emptyState.classList.remove('visible');
  }
}

/**
 * Primary render function
 */
function render() {
  const filteredTodos = getFilteredTodos();

  // Clear current list items
  todoList.innerHTML = '';

  // Render items
  filteredTodos.forEach((item) => {
    const li = document.createElement('li');
    li.className = `todo-item ${item.completed ? 'completed' : ''}`;
    li.setAttribute('data-id', item.id);

    li.innerHTML = `
      <div class="todo-left">
        <button type="button" class="custom-checkbox" aria-label="Tandai status tugas">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <div class="todo-text-wrap">
          <span class="todo-text">${escapeHTML(item.text)}</span>
          <span class="todo-time">${item.createdAt || ''}</span>
        </div>
      </div>
      <div class="todo-actions">
        <button type="button" class="action-btn edit-btn" title="Edit tugas" aria-label="Edit tugas">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button type="button" class="action-btn delete-btn" title="Hapus tugas" aria-label="Hapus tugas">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Event binding for checkbox
    const checkbox = li.querySelector('.custom-checkbox');
    checkbox.addEventListener('click', () => toggleTodo(item.id));

    // Event binding for text click to toggle
    const textEl = li.querySelector('.todo-text');
    textEl.addEventListener('click', () => toggleTodo(item.id));

    // Double click to edit
    textEl.addEventListener('dblclick', () => startEditTodo(item.id));

    // Event binding for edit button
    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => startEditTodo(item.id));

    // Event binding for delete button
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTodo(item.id));

    todoList.appendChild(li);
  });

  updateProgress();
  updateStats();
  updateEmptyState(filteredTodos.length);
}

// ==========================================================================
// Helper Utilities
// ==========================================================================

/**
 * Prevent XSS injections by sanitizing user strings
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
