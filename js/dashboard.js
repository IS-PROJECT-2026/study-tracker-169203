document.addEventListener("DOMContentLoaded", renderDashboard);

async function renderDashboard() {
  const db = await openDB();

  const units = await getAllRecords(db, "units");
  const subtopics = await getAllRecords(db, "subtopics");
  const sessions = await getAllRecords(db, "sessions");

  const totalDoneSubtopics = subtopics.filter((s) => s.status === "done").length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  document.getElementById("stat-total-units").textContent = units.length;
  document.getElementById("stat-total-subtopics-done").textContent =
    `${totalDoneSubtopics}/${subtopics.length}`;
  document.getElementById("stat-total-sessions").textContent = sessions.length;
  document.getElementById("stat-total-time").textContent = totalMinutes;

  const perUnitEl = document.getElementById("dashboard-per-unit");
  perUnitEl.innerHTML = "";

  units.forEach((unit) => {
    const unitSubtopics = subtopics.filter((s) => s.unitId === unit.id);
    const doneCount = unitSubtopics.filter((s) => s.status === "done").length;
    const percent = unitSubtopics.length === 0
      ? 0
      : Math.round((doneCount / unitSubtopics.length) * 100);

    const row = document.createElement("div");
    row.className = "unit-progress-row";
    row.innerHTML = `
      <div class="unit-progress-label">
        <span>${unit.name}</span>
        <span>${doneCount}/${unitSubtopics.length}</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
    `;
    perUnitEl.appendChild(row);
  });
}

function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

window.refreshDashboard = renderDashboard;