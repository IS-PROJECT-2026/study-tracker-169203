const subtopicUnitSelect = document.getElementById("subtopic-unit-select");
const subtopicStatusFilter = document.getElementById("subtopic-status-filter");
const subtopicForm = document.getElementById("subtopic-form");
const subtopicIdField = document.getElementById("subtopic-id");
const subtopicUnitIdField = document.getElementById("subtopic-unit-id");
const subtopicNameField = document.getElementById("subtopic-name");
const subtopicStatusField = document.getElementById("subtopic-status");
const subtopicTargetDateField = document.getElementById("subtopic-target-date");
const subtopicSubmitBtn = document.getElementById("subtopic-submit-btn");
const subtopicCancelBtn = document.getElementById("subtopic-cancel-btn");
const subtopicListEl = document.getElementById("subtopic-list");

document.addEventListener("DOMContentLoaded", populateUnitDropdown);

subtopicUnitSelect.addEventListener("change", async () => {
  const unitId = subtopicUnitSelect.value;

  if (!unitId) {
    subtopicForm.style.display = "none";
    subtopicListEl.innerHTML = "";
    return;
  }

  subtopicForm.style.display = "block";
  subtopicUnitIdField.value = unitId;
  resetSubtopicForm(unitId);
  await renderSubtopics(unitId);
});

subtopicStatusFilter.addEventListener("change", async () => {
  const unitId = subtopicUnitSelect.value;
  if (unitId) await renderSubtopics(unitId);
});

subtopicForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editingId = subtopicIdField.value;
  const unitId = Number(subtopicUnitIdField.value);

  const subtopicData = {
    unitId: unitId,
    name: subtopicNameField.value.trim(),
    status: subtopicStatusField.value,
    targetDate: subtopicTargetDateField.value || null,
    createdAt: Date.now()
  };

  if (editingId) {
    const existing = await getRecord("subtopics", Number(editingId));
    subtopicData.id = existing.id;
    subtopicData.createdAt = existing.createdAt;
    await updateRecord("subtopics", subtopicData);
  } else {
    await addRecord("subtopics", subtopicData);
  }

  resetSubtopicForm(unitId);
  await renderSubtopics(unitId);
  if (window.refreshDashboard) await window.refreshDashboard();
});

subtopicCancelBtn.addEventListener("click", () => {
  resetSubtopicForm(subtopicUnitIdField.value);
});

function resetSubtopicForm(unitId) {
  subtopicForm.reset();
  subtopicIdField.value = "";
  subtopicUnitIdField.value = unitId;
  subtopicSubmitBtn.textContent = "Add Subtopic";
  subtopicCancelBtn.style.display = "none";
}

async function populateUnitDropdown() {
  const db = await openDB();
  const transaction = db.transaction("units", "readonly");
  const store = transaction.objectStore("units");
  const request = store.getAll();

  request.onsuccess = () => {
    const units = request.result;
    units.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit.id;
      option.textContent = unit.name;
      subtopicUnitSelect.appendChild(option);
    });
  };
}

async function renderSubtopics(unitId) {
  let subtopics = await getAllByIndex("subtopics", "unitId", Number(unitId));

  const filterValue = subtopicStatusFilter.value;
  if (filterValue && filterValue !== "all") {
    subtopics = subtopics.filter((s) => s.status === filterValue);
  }

  subtopicListEl.innerHTML = "";

  if (subtopics.length === 0) {
    subtopicListEl.innerHTML = `<p class="empty-state">No subtopics match this view.</p>`;
    return;
  }

  subtopics.forEach((subtopic) => {
    subtopicListEl.appendChild(createSubtopicCard(subtopic));
  });
}

function createSubtopicCard(subtopic) {
  const card = document.createElement("div");
  card.className = `subtopic-card status-${subtopic.status}`;

  card.innerHTML = `
    <div class="subtopic-card-header">
      <h4>${subtopic.name}</h4>
      <span class="status-badge">${subtopic.status}</span>
    </div>
    <p class="subtopic-target-date">Target: ${subtopic.targetDate || "Not set"}</p>
    <div class="subtopic-card-actions">
      <button class="edit-btn" data-id="${subtopic.id}">Edit</button>
      <button class="delete-btn" data-id="${subtopic.id}">Delete</button>
    </div>
  `;

  card.querySelector(".edit-btn").addEventListener("click", () => startEditSubtopic(subtopic));
  card.querySelector(".delete-btn").addEventListener("click", () => confirmDeleteSubtopic(subtopic));

  return card;
}

function startEditSubtopic(subtopic) {
  subtopicIdField.value = subtopic.id;
  subtopicUnitIdField.value = subtopic.unitId;
  subtopicNameField.value = subtopic.name;
  subtopicStatusField.value = subtopic.status;
  subtopicTargetDateField.value = subtopic.targetDate || "";

  subtopicSubmitBtn.textContent = "Save Changes";
  subtopicCancelBtn.style.display = "inline-block";

  subtopicForm.scrollIntoView({ behavior: "smooth" });
}

async function confirmDeleteSubtopic(subtopic) {
  const confirmed = confirm(
    "Delete this subtopic? This will also delete all of its study sessions."
  );
  if (!confirmed) return;

  await deleteSubtopicCascade(subtopic.id);
  await renderSubtopics(subtopic.unitId);
  if (window.refreshDashboard) await window.refreshDashboard();
}