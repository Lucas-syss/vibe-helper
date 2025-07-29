// ------------------------------
// Tab switching
// ------------------------------

let allNotesCache = [];

document.querySelectorAll(".sidebar button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".sidebar button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document
      .querySelectorAll(".tab-content")
      .forEach((section) => section.classList.remove("active"));

    const selected = btn.dataset.tab;
    const activeTab = document.getElementById(selected);
    if (activeTab) {
      activeTab.classList.add("active");
    }
  });
});

// ------------------------------
// Check-ins Hoje
// ------------------------------
function createCheckinRow(houseName, data = {}) {
  const row = document.createElement("tr");

  const checks = data.checks || {};
  const bag = data.bag || false;

  row.innerHTML = `
    <td>${houseName}</td>
    <td><input type="checkbox" ${checks.inspection ? "checked" : ""} /></td>
    <td><input type="checkbox" ${checks.maintenance ? "checked" : ""} /></td>
    <td><input type="checkbox" ${checks.cleaning ? "checked" : ""} /></td>
    <td><input type="checkbox" ${checks.touristTax ? "checked" : ""} /></td>
    <td><input type="checkbox" ${checks.deposit ? "checked" : ""} /></td>
    <td><input type="checkbox" ${checks.checkinForm ? "checked" : ""} /></td>
    <td><i class="fa-solid fa-suitcase bag-icon ${
      bag ? "active" : ""
    }"></i></td>
  `;

  const id = data.id;

  const checkboxes = row.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox, i) => {
    checkbox.addEventListener("change", () => {
      const updatedChecks = {
        inspection: checkboxes[0].checked,
        maintenance: checkboxes[1].checked,
        cleaning: checkboxes[2].checked,
        touristTax: checkboxes[3].checked,
        deposit: checkboxes[4].checked,
        checkinForm: checkboxes[5].checked,
      };
      updateCheckin(id, { checks: updatedChecks });

      checkIfHouseReady(row); // << Add this line
    });
  });

  const bagIcon = row.querySelector(".bag-icon");
  bagIcon.addEventListener("click", () => {
    const newState = !bagIcon.classList.contains("active");
    bagIcon.classList.toggle("active");
    updateCheckin(id, { bag: newState });
  });

  return row;
}

async function updateCheckin(id, updates) {
  await fetch(
    `https://68891653adf0e59551bc6a7d.mockapi.io/checkInsHoje/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );
}

function checkIfHouseReady(row) {
  const checkboxes = row.querySelectorAll('input[type="checkbox"]');
  const bagIcon = row.querySelector(".bag-icon");

  // Pega cada checkbox na ordem correta
  const inspectionChecked = checkboxes[0].checked;
  const maintenanceChecked = checkboxes[1].checked;
  const cleaningChecked = checkboxes[2].checked;
  const touristTaxChecked = checkboxes[3].checked;
  const depositChecked = checkboxes[4].checked;
  const checkinFormChecked = checkboxes[5].checked;

  const bagActive = bagIcon.classList.contains("active");
  const houseName = row.querySelector("td")?.innerText || "Casa";

  const allChecked =
    inspectionChecked &&
    maintenanceChecked &&
    cleaningChecked &&
    touristTaxChecked &&
    depositChecked &&
    checkinFormChecked;

  if (allChecked && !bagActive) {
    Swal.fire({
      icon: "success",
      title: "Casa pronta!",
      text: `A ${houseName} está pronta para receber.`,
      timer: 2500,
      showConfirmButton: false,
    });
  } else if (allChecked && bagActive) {
    Swal.fire({
      icon: "info",
      title: "Mala ainda presente",
      text: `Os clientes da ${houseName} têm que vir buscar a mala.`,
    });
  }
}



async function addHouseToCheckins(name) {
  const newHouse = await fetch(
    "https://68891653adf0e59551bc6a7d.mockapi.io/checkInsHoje",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        bag: false,
        checks: {
          inspection: false,
          maintenance: false,
          cleaning: false,
          touristTax: false,
          deposit: false,
          checkinForm: false,
        },
      }),
    }
  ).then((res) => res.json());

  const tableBody = document.getElementById("checkinTodayBody");
  const row = createCheckinRow(name, newHouse);
  row.dataset.id = newHouse.id;
  tableBody.appendChild(row);
}

function saveCheckins() {
  const tableBody = document.getElementById("checkinTodayBody");
  if (!tableBody) return;

  const data = [];
  tableBody.querySelectorAll("tr").forEach((row) => {
    const houseName = row.querySelector("td").innerText;
    const checkboxes = row.querySelectorAll('input[type="checkbox"]');
    const bagIcon = row.querySelector(".bag-icon");

    data.push({
      name: houseName,
      checks: [...checkboxes].map((cb) => cb.checked),
      bag: bagIcon.classList.contains("active"),
    });
  });

  localStorage.setItem("checkinsToday", JSON.stringify(data));
}

async function loadCheckins() {
  const response = await fetch(
    "https://68891653adf0e59551bc6a7d.mockapi.io/checkInsHoje"
  );
  const data = await response.json();

  const tableBody = document.getElementById("checkinTodayBody");
  tableBody.innerHTML = "";

  data.forEach((entry) => {
    const row = createCheckinRow(entry.name, entry);
    if (!row) {
      console.warn(
        `createCheckinRow returned undefined or null for entry id ${entry.id}`
      );
      return; // Skip this entry to avoid error
    }
    row.dataset.id = entry.id; // Store MockAPI ID for updates
    tableBody.appendChild(row);
  });
}
loadCheckins();

// Poll every 5 seconds
setInterval(() => {
  loadCheckins();
}, 5000);

async function clearCheckinsManually() {
  Swal.fire({
    title: "Tem a certeza?",
    text: "Esta ação vai apagar todos os check-ins de hoje!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Sim, apagar tudo!",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(
          "https://68891653adf0e59551bc6a7d.mockapi.io/checkInsHoje"
        );
        const data = await res.json();

        // Delete each checkin by id
        await Promise.all(
          data.map((item) =>
            fetch(
              `https://68891653adf0e59551bc6a7d.mockapi.io/checkInsHoje/${item.id}`,
              {
                method: "DELETE",
              }
            )
          )
        );

        Swal.fire({
          icon: "success",
          title: "Check-ins apagados",
          timer: 1500,
          showConfirmButton: false,
        });

        loadCheckins(); // Refresh after delete
      } catch (error) {
        console.error("Error clearing check-ins:", error);
        Swal.fire("Erro", "Não foi possível apagar os check-ins.", "error");
      }
    }
  });
}



window.clearCheckinsManually = clearCheckinsManually;

// Form para adicionar casa
const houseForm = document.getElementById("newHouseForm");
if (houseForm) {
  houseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("newHouseNameInput");
    if (input && input.value.trim()) {
      addHouseToCheckins(input.value.trim());
      input.value = "";
    }
  });
}

loadCheckins();

// ------------------------------
// Notas
// ------------------------------
const notesSearchEl = document.getElementById("notes-search");
const notesListEl = document.getElementById("notes-list");
const newNoteTextEl = document.getElementById("new-note-text");
const addNoteBtn = document.getElementById("add-note-btn");

function filterNotes(query) {
  return allNotesCache.filter((note) => {
    if (!note || typeof note.text !== "string") return false;
    return note.text.toLowerCase().includes(query.toLowerCase());
  });
}

function renderNotes(notes = []) {
  if (!notesListEl) return;
  notesListEl.innerHTML = "";

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.style.display = "flex";               // Flex container
    li.style.padding = "15px 10px";               // Optional spacing
    const leftDiv = document.createElement("div"); // To hold date and text vertically
    leftDiv.style.flex = "0.995";                // Take remaining space

    // Date element
    const date = new Date(note.date);
    const dateEl = document.createElement("div");
    dateEl.textContent = date.toLocaleString();
    dateEl.style.fontSize = "0.8em";
    dateEl.style.color = "#666";
    dateEl.style.marginBottom = "4px";

    // Text element
    const textEl = document.createElement("div");
    textEl.textContent = note.text;

    leftDiv.appendChild(dateEl);
    leftDiv.appendChild(textEl);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.style.flexShrink = "0"; // Prevent shrinking

    deleteBtn.setAttribute("data-id", note.id);
    deleteBtn.addEventListener("click", () => {
      confirmDeleteNote(note.id);
    });

    li.appendChild(leftDiv);
    li.appendChild(deleteBtn);

    notesListEl.appendChild(li);
  });
}


function confirmDeleteNote(noteId) {
  Swal.fire({
    title: 'Tem a certeza?',
    text: "Quer mesmo apagar esta nota?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, apagar!',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteNote(noteId);
        Swal.fire('Apagado!', 'A nota foi apagada.', 'success');
        await loadNotes(); // Refresh the list after deletion
      } catch (error) {
        Swal.fire('Erro!', 'Não foi possível apagar a nota.', 'error');
      }
    }
  });
}

async function deleteNote(id) {
  await fetch(`https://68891653adf0e59551bc6a7d.mockapi.io/notes/${id}`, {
    method: 'DELETE',
  });
}

async function saveNote(text) {
  const note = {
    text,
    date: new Date().toISOString(),
  };

  try {
    const res = await fetch(
      "https://68891653adf0e59551bc6a7d.mockapi.io/notes",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      }
    );
    const saved = await res.json();

    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    notes.push(saved);
    localStorage.setItem("notes", JSON.stringify(notes));

    loadNotes(); // Refresh list
  } catch (err) {
    console.warn("Offline, saving to localStorage only");

    const notes = JSON.parse(localStorage.getItem("notes") || "[]");
    notes.push(note);
    localStorage.setItem("notes", JSON.stringify(notes));

    renderNotes(notes);
  }
}

async function loadNotes() {
  const response = await fetch(
    "https://68891653adf0e59551bc6a7d.mockapi.io/notes"
  );
  let notes = await response.json();

  notes.sort((a, b) => new Date(b.date) - new Date(a.date));

  const notesContainer = document.getElementById("notes-list");
  notesContainer.innerHTML = "";

  renderNotes(notes);
}

// Run this once on page load
loadNotes();

// Adicionar nova nota
if (addNoteBtn && newNoteTextEl) {
  addNoteBtn.addEventListener("click", async () => {
    const text = newNoteTextEl.value.trim();
    if (!text) return;

    await saveNote(text); // Calls your async save function (with MockAPI + fallback)
    await loadNotes(); // Reload notes from API/localStorage and render
    newNoteTextEl.value = ""; // Clear input
  });
}

// Pesquisa nas notas
if (notesSearchEl) {
  notesSearchEl.addEventListener("input", (e) => {
    const query = e.target.value;
    const filtered = filterNotes(query);
    renderNotes(filtered);
  });
}

// ------------------------------
// Calculadora Taxa Turística
// ------------------------------
function calcularTaxa() {
  const adultos = parseInt(document.getElementById("adults")?.value || 0);
  const noites = parseInt(document.getElementById("nights")?.value || 0);
  const local = document.getElementById("location")?.value;

  let maxNights = local === "albufeira" ? 7 : 5;
  const noitesConsideradas = Math.min(noites, maxNights);
  const taxa = adultos * noitesConsideradas * 2;

  const resultado = document.getElementById("resultado-taxa");
  if (resultado) {
    resultado.textContent = `Total: €${taxa.toFixed(2)}`;
  }
}

window.calcularTaxa = calcularTaxa;

// ------------------------------
// Preparar Dia Seguinte
// ------------------------------
const prepCheckins = document.getElementById("prep-checkins");
const prepCheckouts = document.getElementById("prep-checkouts");
const prepToalhas = document.getElementById("prep-toalhas");

// Carregar estado salvo
const savedPrep = JSON.parse(localStorage.getItem("prepNextDay")) || {};
if (prepCheckins) prepCheckins.checked = savedPrep.checkins || false;
if (prepCheckouts) prepCheckouts.checked = savedPrep.checkouts || false;
if (prepToalhas) prepToalhas.checked = savedPrep.toalhas || false;

// Guardar estado ao mudar
[prepCheckins, prepCheckouts, prepToalhas].forEach((input) => {
  if (input) {
    input.addEventListener("change", () => {
      const state = {
        checkins: prepCheckins.checked,
        checkouts: prepCheckouts.checked,
        toalhas: prepToalhas.checked,
      };
      localStorage.setItem("prepNextDay", JSON.stringify(state));
    });
  }
});
function clearCheckinsWithConfirm() {
  Swal.fire({
    title: "Tem a certeza?",
    text: "Isto vai apagar todos os check-ins de hoje!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, apagar!",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      clearCheckinsManually();
      Swal.fire("Apagado!", "Os check-ins foram limpos.", "success");
    }
  });
}

// Função para limpar notas com confirmação SweetAlert
function clearNotesWithConfirm() {
  Swal.fire({
    title: "Tem a certeza?",
    text: "Isto vai apagar todas as notas!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, apagar!",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("taskNotes");
      renderNotes([]);
      Swal.fire("Apagado!", "As notas foram limpas.", "success");
    }
  });
}

// Ligar os botões (se existirem)
const clearCheckinsBtn = document.getElementById("clearCheckinsBtn");
if (clearCheckinsBtn)
  clearCheckinsBtn.addEventListener("click", clearCheckinsWithConfirm);

const clearNotesBtn = document.getElementById("clearNotesBtn");
if (clearNotesBtn)
  clearNotesBtn.addEventListener("click", clearNotesWithConfirm);

const PASSWORD = "vilamoura21"; // yes u can see it, it's for demo purposes only

function checkLogin() {
  if (localStorage.getItem("loggedIn") !== "true") {
    Swal.fire({
      title: "Login",
      input: "password",
      inputLabel: "Enter password to continue",
      inputPlaceholder: "Password",
      inputAttributes: {
        autocapitalize: "off",
        autocorrect: "off",
      },
      confirmButtonText: "Login",
      showCancelButton: false,
      allowOutsideClick: false,
      preConfirm: (password) => {
        if (password !== PASSWORD) {
          Swal.showValidationMessage("Incorrect password");
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.setItem("loggedIn", "true");
        location.reload();
      }
    });
  }
}

checkLogin();
