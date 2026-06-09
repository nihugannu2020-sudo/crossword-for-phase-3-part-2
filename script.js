// ==========================================================================
// PROJECT REWIND // INTERACTIVE LOGIC
// ==========================================================================

(function() {

// 1. Crossword Configuration
const GRID_COLS = 10;
const GRID_ROWS = 15;
const SECURE_KEY = "PROJECT_REWIND_KEY_2026";

const WORDS = [
  {
    word: "111f0e180c0f1810",
    x: 2,
    y: 3,
    dir: "H",
    number: 1,
    clue: "Years later, among signatures and farewells, one name still survived the fading memories."
  },
  {
    word: "030606040e1a071e1f", 
    x: 1,
    y: 11,
    dir: "H",
    number: 2,
    clue: "A harmless name slowly turned unpleasant after one unforgettable incident followed Sam through the corridors."
  },
  {
    word: "18171d0507111d1117", 
    x: 1,
    y: 13,
    dir: "H",
    number: 3,
    clue: "A mysterious figure kept appearing in Sam’s saved game worlds. Even when Sam played alone, someone else seemed to exist in the world. Who was it?"
  },
  {
    word: "03060e04030c061b", 
    x: 0,
    y: 7,
    dir: "H",
    number: 4,
    clue: "One name appeared repeatedly between application drafts, highlighted notes, and sleepless ambitions."
  },
  {
    word: "03170d0b16171d1e1c13121d1a0113", 
    x: 2,
    y: 0,
    dir: "V",
    number: 5,
    clue: "Speed fascinated Sam, but one champion from 2010 remained unmatched in his memories."
  },
  {
    word: "031d0c090011", 
    x: 9,
    y: 2,
    dir: "V",
    number: 6,
    clue: "Whatever Sam chased every weekend returned home covered in more mud than he did."
  },
  {
    word: "1917031e16", 
    x: 7,
    y: 1,
    dir: "V",
    number: 7,
    clue: "Among practice sheets and distant ambitions, one unfinished goal remained on Sam’s desk."
  },
  {
    word: "131d1d0d0c",
    x: 5,
    y: 1,
    dir: "V",
    number: 8,
    clue: "A breed with a pair of pointed ears and tiny footsteps quietly became part of Sam’s happiest memories."
  }
];

function decryptWord(hexStr) {
  let decrypted = "";
  for (let i = 0; i < hexStr.length; i += 2) {
    const byte = parseInt(hexStr.substr(i, 2), 16);
    const keyChar = SECURE_KEY.charCodeAt((i / 2) % SECURE_KEY.length);
    decrypted += String.fromCharCode(byte ^ keyChar);
  }
  return decrypted.toUpperCase();
}

// Grid cells data state
let cellStateMap = {};
let activeWord = null;
let activeDirection = "H"; // Default direction

// Synthesize soft retro clicks using Web Audio API
let audioCtx = null;
function playSound(freq, type, duration, vol = 0.08) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Fail silently if browser blocks audio
  }
}

function playKeypressSound() {
  playSound(140, "triangle", 0.05, 0.1);
  playSound(80, "sine", 0.03, 0.05);
}

function playFocusSound() {
  playSound(280, "sine", 0.08, 0.05);
}

function playSuccessSound() {
  // Classic low-to-high major sweep for success
  const now = audioCtx ? audioCtx.currentTime : 0;
  playSound(330, "triangle", 0.2, 0.1);
  setTimeout(() => playSound(392, "triangle", 0.2, 0.1), 100);
  setTimeout(() => playSound(523, "triangle", 0.25, 0.1), 200);
  setTimeout(() => playSound(659, "triangle", 0.35, 0.1), 300);
}

function playErrorSound() {
  playSound(110, "sawtooth", 0.3, 0.15);
  playSound(90, "sawtooth", 0.4, 0.1);
}

// 2. Initialize Layout & DOM
document.addEventListener("DOMContentLoaded", () => {
  buildGridData();
  renderGrid();
  renderClues();
  setupEventListeners();
  updateProgress();
});

// Build coordinate-based cell map
function buildGridData() {
  // Decrypt words at runtime
  WORDS.forEach((w) => {
    w.word = decryptWord(w.word);
  });

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cellStateMap[`${r}_${c}`] = {
        isActive: false,
        correctChar: "",
        words: [],
        startNumber: null
      };
    }
  }

  // Map words into cells
  WORDS.forEach((w, wordIdx) => {
    // Set start number label
    const startCellKey = `${w.y}_${w.x}`;
    cellStateMap[startCellKey].startNumber = w.number;

    for (let i = 0; i < w.word.length; i++) {
      const curY = w.y + (w.dir === "V" ? i : 0);
      const curX = w.x + (w.dir === "H" ? i : 0);
      const cellKey = `${curY}_${curX}`;
      
      const cell = cellStateMap[cellKey];
      cell.isActive = true;
      cell.correctChar = w.word[i].toUpperCase();
      cell.words.push(wordIdx);
    }
  });
}

// Render Grid elements
function renderGrid() {
  const gridContainer = document.getElementById("crossword-grid");
  gridContainer.innerHTML = "";

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cellData = cellStateMap[`${r}_${c}`];
      const cellEl = document.createElement("div");
      cellEl.classList.add("grid-cell");
      cellEl.setAttribute("data-row", r);
      cellEl.setAttribute("data-col", c);

      if (cellData.isActive) {
        cellEl.classList.add("cell-active");

        // Add Number label if start of a word
        if (cellData.startNumber) {
          const numEl = document.createElement("span");
          numEl.classList.add("cell-number");
          numEl.innerText = cellData.startNumber;
          cellEl.appendChild(numEl);
        }

        // Add Input Field
        const inputEl = document.createElement("input");
        inputEl.type = "text";
        inputEl.maxLength = 1;
        inputEl.classList.add("cell-input");
        inputEl.setAttribute("id", `cell-${r}-${c}`);
        inputEl.setAttribute("data-row", r);
        inputEl.setAttribute("data-col", c);
        inputEl.setAttribute("aria-label", `Cell at Row ${r + 1}, Column ${c + 1}`);

        // Prevent inputs from accepting symbols, numbers, spaces
        inputEl.addEventListener("beforeinput", (e) => {
          if (e.data && !/^[a-zA-Z]$/.test(e.data)) {
            e.preventDefault();
          }
        });

        cellEl.appendChild(inputEl);
      }

      gridContainer.appendChild(cellEl);
    }
  }
}

// Render Clue list panels
function renderClues() {
  const acrossList = document.getElementById("across-clues-list");
  const downList = document.getElementById("down-clues-list");

  acrossList.innerHTML = "";
  downList.innerHTML = "";

  [...WORDS].sort((a, b) => a.number - b.number).forEach((w) => {
    const li = document.createElement("li");
    li.classList.add("clue-item");
    li.setAttribute("id", `clue-${w.number}`);
    li.setAttribute("data-word-num", w.number);
    li.innerHTML = `
      <span class="clue-number">${w.number}</span>
      <span class="clue-text">${w.clue}</span>
    `;

    // Click on clue focuses the starting cell of that word
    li.addEventListener("click", () => {
      focusCell(w.y, w.x, w.dir);
    });

    if (w.dir === "H") {
      acrossList.appendChild(li);
    } else {
      downList.appendChild(li);
    }
  });
}

// Setup Event Listeners
function setupEventListeners() {
  const inputs = document.querySelectorAll(".cell-input");

  inputs.forEach((input) => {
    // Focus highlight handler
    input.addEventListener("focus", (e) => {
      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);
      
      // Select appropriate direction
      const cellData = cellStateMap[`${row}_${col}`];
      let dirToUse = activeDirection;

      // If cell only belongs to one word, auto-select that word's direction
      if (cellData.words.length === 1) {
        const w = WORDS[cellData.words[0]];
        dirToUse = w.dir;
      }

      highlightWord(row, col, dirToUse);
      playFocusSound();

      // Auto-select text on focus to allow easy typing overwrite
      setTimeout(() => e.target.select(), 10);
    });

    // Keydown handler (for arrows, backspace, and navigation)
    input.addEventListener("keydown", handleKeydown);

    // Input change handler (for character validation and autoadvance)
    input.addEventListener("input", handleInput);

    // Double-click or clicking focused cell toggles direction at intersections
    input.addEventListener("click", (e) => {
      const row = parseInt(e.target.dataset.row);
      const col = parseInt(e.target.dataset.col);
      const cellData = cellStateMap[`${row}_${col}`];

      if (cellData.words.length > 1) {
        // Toggle direction
        activeDirection = activeDirection === "H" ? "V" : "H";
        highlightWord(row, col, activeDirection);
        playFocusSound();
      }
    });
  });

  // Clue decryption submit button click handler
  document.getElementById("submit-reconstruction-btn").addEventListener("click", validateReconstruction);

  // Success Modal close handler
  document.getElementById("close-modal-btn").addEventListener("click", () => {
    const modal = document.getElementById("success-overlay");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    playSound(400, "sine", 0.05, 0.05);
  });
}

// Focus a cell with a specified direction
function focusCell(row, col, dir) {
  const cellInput = document.getElementById(`cell-${row}-${col}`);
  if (cellInput) {
    activeDirection = dir;
    cellInput.focus();
    highlightWord(row, col, dir);
  }
}

// Highlight the currently active word
function highlightWord(row, col, dir) {
  activeDirection = dir;
  
  // Clear previous highlights
  document.querySelectorAll(".grid-cell").forEach((c) => {
    c.classList.remove("cell-focused", "word-highlighted");
  });
  document.querySelectorAll(".clue-item").forEach((c) => {
    c.classList.remove("clue-active");
  });

  const cellKey = `${row}_${col}`;
  const cellData = cellStateMap[cellKey];
  if (!cellData.isActive) return;

  // Highlight current cell container
  const activeCellContainer = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
  if (activeCellContainer) {
    activeCellContainer.classList.add("cell-focused");
  }

  // Find which word this cell is associated with for the active direction
  let wordIdx = cellData.words.find(idx => WORDS[idx].dir === dir);
  
  // Fallback if cell doesn't belong to a word in the current direction
  if (wordIdx === undefined && cellData.words.length > 0) {
    wordIdx = cellData.words[0];
    activeDirection = WORDS[wordIdx].dir; // update active direction
  }

  if (wordIdx !== undefined) {
    const w = WORDS[wordIdx];
    activeWord = w;

    // Highlight all cells belonging to this word
    for (let i = 0; i < w.word.length; i++) {
      const curY = w.y + (w.dir === "V" ? i : 0);
      const curX = w.x + (w.dir === "H" ? i : 0);
      const highlightCell = document.querySelector(`.grid-cell[data-row="${curY}"][data-col="${curX}"]`);
      if (highlightCell) {
        highlightCell.classList.add("word-highlighted");
      }
    }

    // Highlight corresponding clue item
    const clueEl = document.getElementById(`clue-${w.number}`);
    if (clueEl) {
      clueEl.classList.add("clue-active");
      clueEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

// Handle typing inputs
function handleInput(e) {
  const row = parseInt(e.target.dataset.row);
  const col = parseInt(e.target.dataset.col);
  
  e.target.value = e.target.value.toUpperCase();
  playKeypressSound();
  
  updateProgress();

  if (e.target.value !== "" && activeWord) {
    // Shift focus to next cell in current word
    moveFocusNext(row, col);
  }
}

// Handle specialized keys (Backspace, Arrows)
function handleKeydown(e) {
  const row = parseInt(e.target.dataset.row);
  const col = parseInt(e.target.dataset.col);

  switch (e.key) {
    case "Backspace":
      e.preventDefault();
      playKeypressSound();
      if (e.target.value !== "") {
        // If current has text, delete it
        e.target.value = "";
        updateProgress();
      } else {
        // Move backward and delete
        moveFocusPrevious(row, col);
      }
      break;

    case "ArrowRight":
      e.preventDefault();
      navigateGrid(row, col + 1);
      break;
    case "ArrowLeft":
      e.preventDefault();
      navigateGrid(row, col - 1);
      break;
    case "ArrowDown":
      e.preventDefault();
      navigateGrid(row + 1, col);
      break;
    case "ArrowUp":
      e.preventDefault();
      navigateGrid(row - 1, col);
      break;
    default:
      break;
  }
}

// Navigate focus to nearest cell coordinates (arrows)
function navigateGrid(row, col) {
  if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
    const nextInput = document.getElementById(`cell-${row}-${col}`);
    if (nextInput) {
      nextInput.focus();
    }
  }
}

// Move cursor to next letter cell within active word
function moveFocusNext(row, col) {
  if (!activeWord) return;
  const isVert = activeWord.dir === "V";
  const nextY = row + (isVert ? 1 : 0);
  const nextX = col + (isVert ? 0 : 1);
  
  // Verify next coordinates are still part of the active word
  const indexInWord = isVert ? (nextY - activeWord.y) : (nextX - activeWord.x);
  if (indexInWord >= 0 && indexInWord < activeWord.word.length) {
    const nextInput = document.getElementById(`cell-${nextY}-${nextX}`);
    if (nextInput) {
      nextInput.focus();
    }
  }
}

// Move cursor to previous letter cell within active word and clear value
function moveFocusPrevious(row, col) {
  if (!activeWord) return;
  const isVert = activeWord.dir === "V";
  const prevY = row - (isVert ? 1 : 0);
  const prevX = col - (isVert ? 0 : 1);
  
  const indexInWord = isVert ? (prevY - activeWord.y) : (prevX - activeWord.x);
  if (indexInWord >= 0 && indexInWord < activeWord.word.length) {
    const prevInput = document.getElementById(`cell-${prevY}-${prevX}`);
    if (prevInput) {
      prevInput.value = "";
      prevInput.focus();
      updateProgress();
    }
  }
}

// Compute and update Memory Integrity progress bar
function updateProgress() {
  let totalActiveCells = 0;
  let correctFilledCells = 0;

  for (let key in cellStateMap) {
    const cell = cellStateMap[key];
    if (cell.isActive) {
      totalActiveCells++;
      const [r, c] = key.split("_");
      const input = document.getElementById(`cell-${r}-${c}`);
      if (input && input.value.toUpperCase() === cell.correctChar) {
        correctFilledCells++;
      }
    }
  }

  const percentage = totalActiveCells > 0 ? Math.round((correctFilledCells / totalActiveCells) * 100) : 0;
  
  document.getElementById("progress-percentage").innerText = `${percentage}%`;
  document.getElementById("progress-bar-fill").style.width = `${percentage}%`;

  // Update solved class for each clue in the list
  WORDS.forEach((w) => {
    let isWordSolved = true;
    for (let i = 0; i < w.word.length; i++) {
      const curY = w.y + (w.dir === "V" ? i : 0);
      const curX = w.x + (w.dir === "H" ? i : 0);
      const input = document.getElementById(`cell-${curY}-${curX}`);
      if (!input || input.value.toUpperCase() !== w.word[i].toUpperCase()) {
        isWordSolved = false;
        break;
      }
    }
    
    const clueEl = document.getElementById(`clue-${w.number}`);
    if (clueEl) {
      if (isWordSolved) {
        clueEl.classList.add("clue-solved");
      } else {
        clueEl.classList.remove("clue-solved");
      }
    }
  });
}

// Final check and popup sequence
function validateReconstruction() {
  let isAllCorrect = true;
  const failedCells = [];

  // Clear any existing special highlights
  document.querySelectorAll(".grid-cell").forEach(cell => {
    cell.classList.remove("cell-special-highlight");
  });

  for (let key in cellStateMap) {
    const cell = cellStateMap[key];
    if (cell.isActive) {
      const [r, c] = key.split("_");
      const input = document.getElementById(`cell-${r}-${c}`);
      
      if (!input || input.value.toUpperCase() !== cell.correctChar) {
        isAllCorrect = false;
        if (input) failedCells.push(input);
      }
    }
  }

  if (isAllCorrect) {
    // Trigger Success Sequence
    playSuccessSound();
    
    // Add success flash effect to all active cells
    document.querySelectorAll(".grid-cell.cell-active").forEach(cell => {
      cell.classList.add("cell-validated-correct");
    });
    
    // Highlight the special cells!
    highlightSpecialSecretCells();
    
    // Open success dossier popup
    setTimeout(() => {
      const modal = document.getElementById("success-overlay");
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    }, 600);
    
  } else {
    // Trigger Failure Shake & Glitch Feedback
    playErrorSound();
    const newspaper = document.getElementById("newspaper");
    
    // Apply temporary shake animation
    newspaper.classList.add("shake-animation");
    setTimeout(() => {
      newspaper.classList.remove("shake-animation");
    }, 500);

    // Briefly highlight blank or incorrect cells
    failedCells.forEach(input => {
      const cellContainer = input.parentElement;
      cellContainer.style.boxShadow = "inset 0 0 6px rgba(231, 76, 60, 0.4)";
      setTimeout(() => {
        cellContainer.style.boxShadow = "";
      }, 1500);
    });
  }
}

// Highlight the special letters spelling the secret code
function highlightSpecialSecretCells() {
  const specialCells = [
    { r: 1, c: 2 },  
    { r: 5, c: 2 }, 
    { r: 9, c: 2 }, 
    { r: 7, c: 3 },  
    { r: 11, c: 8 }, 
    { r: 13, c: 5 }, 
    { r: 6, c: 9 },  
    { r: 1, c: 7 },  
    { r: 3, c: 7 }, 
    { r: 5, c: 5 }   
  ];

  specialCells.forEach(cell => {
    const cellEl = document.querySelector(`.grid-cell[data-row="${cell.r}"][data-col="${cell.c}"]`);
    if (cellEl) {
      cellEl.classList.add("cell-special-highlight");
    }
  });
}

})();
