const unitForm = document.getElementById("unit-form");
const unitIdField = document.getElementById("unit-id");
const unitNameField = document.getElementById("unit-name");
const unitExamDateField = document.getElementById("unit-exam-date");
const unitPriorityField = document.getElementById("unit-priority");
const unitSubmitBtn = document.getElementById("unit-submit-btn");
const unitCancelBtn = document.getElementById("unit-cancel-btn");
const unitListEl = document.getElementById("unit-list");
const emptyStateEl = document.getElementById("empty-state");

document.addEventListener("DOMContentLoaded", renderUnits);


unitForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editingId = unitIdField.value;

  const unitData = {
    name: unitNameField.value.trim(),
    examDate: unitExamDateField.value,
    priority: unitPriorityField.value,
    createdAt: Date.now()
  };

  if (editingId) {
    const existingUnit = await getRecord("units", Number(editingId));
    unitData.id = existingUnit.id;
    unitData.createdAt = existingUnit.createdAt;
    await updateRecord("units", unitData);
  } else {
    await addRecord("units", unitData);
  }

  resetForm();
  await renderUnits();
});


unitCancelBtn.addEventListener("click", resetForm);

function resetForm() {
  unitForm.reset();
  unitIdField.value = "";
  unitSubmitBtn.textContent = "Add Unit";
  unitCancelBtn.style.display = "none";
}


async function renderUnits() {
  const db = await openDB();
  const transaction = db.transaction("units", "readonly");
  const store = transaction.objectStore("units");
  const request = store.getAll();

  request.onsuccess = () => {
    const units = request.result;
    unitListEl.innerHTML = "";

    if (units.length === 0) {
      unitListEl.appendChild(emptyStateEl);
      return;
    }

    units.forEach((unit) => {
      unitListEl.appendChild(createUnitCard(unit));
    });
  };
}


function createUnitCard(unit) {
  const card = document.createElement("div");
  card.className = `unit-card priority-${unit.priority}`;

  card.innerHTML = `
    <div class="unit-card-header">
      <h3>${unit.name}</h3>
      <span class="priority-badge">${unit.priority}</span>
    </div>
    <p class="unit-exam-date">Exam: ${unit.examDate || "Not set"}</p>
    <div class="unit-card-actions">
      <button class="edit-btn" data-id="${unit.id}">Edit</button>
      <button class="delete-btn" data-id="${unit.id}">Delete</button>
    </div>
  `;

  card.querySelector(".edit-btn").addEventListener("click", () => startEditUnit(unit));
  card.querySelector(".delete-btn").addEventListener("click", () => confirmDeleteUnit(unit.id));

  return card;
}


function startEditUnit(unit) {
  unitIdField.value = unit.id;
  unitNameField.value = unit.name;
  unitExamDateField.value = unit.examDate;
  unitPriorityField.value = unit.priority;

  unitSubmitBtn.textContent = "Save Changes";
  unitCancelBtn.style.display = "inline-block";

  unitForm.scrollIntoView({ behavior: "smooth" });
}


async function confirmDeleteUnit(unitId) {
  const confirmed = confirm(
    "Delete this unit? This will also delete all of its subtopics and study sessions."
  );
  if (!confirmed) return;

  await deleteUnitCascade(unitId);
  await renderUnits();
}
