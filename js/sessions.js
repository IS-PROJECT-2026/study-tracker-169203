const sessionSubtopicSelect = document.getElementById("session-subtopic-select");
const sessionForm = document.getElementById("session-form");
const sessionIdField = document.getElementById("session-id");
const sessionSubtopicIdField = document.getElementById("session-subtopic-id");
const sessionDateField = document.getElementById("session-date");
const sessionDurationField = document.getElementById("session-duration");
const sessionSummaryField = document.getElementById("session-summary");
const sessionAttachmentField = document.getElementById("session-attachment");
const sessionAttachmentError = document.getElementById("session-attachment-error");
const sessionExistingAttachment = document.getElementById("session-existing-attachment");
const sessionSubmitBtn = document.getElementById("session-submit-btn");
const sessionCancelBtn = document.getElementById("session-cancel-btn");
const sessionListEl = document.getElementById("session-list");

let editingAttachmentBlob = null;
let editingAttachmentType = null;

document.addEventListener("DOMContentLoaded", populateSubtopicDropdown);

async function populateSubtopicDropdown() {
  const db = await openDB();
  const transaction = db.transaction("subtopics", "readonly");
  const subtopicStore = transaction.objectStore("subtopics");
  const subtopicsRequest = subtopicStore.getAll();

  subtopicsRequest.onsuccess = async () => {
    const subtopics = subtopicsRequest.result;
    sessionSubtopicSelect.innerHTML = `<option value="">-- Choose a subtopic --</option>`;

    for (const subtopic of subtopics) {
      const unit = await getRecord("units", subtopic.unitId);
      const option = document.createElement("option");
      option.value = subtopic.id;
      option.textContent = unit ? `${unit.name} — ${subtopic.name}` : subtopic.name;
      sessionSubtopicSelect.appendChild(option);
    }
  };
}

sessionSubtopicSelect.addEventListener("change", async () => {
  const subtopicId = sessionSubtopicSelect.value;

  if (!subtopicId) {
    sessionForm.style.display = "none";
    sessionListEl.innerHTML = "";
    return;
  }

  sessionForm.style.display = "block";
  sessionSubtopicIdField.value = subtopicId;
  resetSessionForm(subtopicId);
  await renderSessions(subtopicId);
});

sessionAttachmentField.addEventListener("change", () => {
  const file = sessionAttachmentField.files[0];
  sessionAttachmentError.style.display = "none";

  if (!file) return;

  const isValid = file.type === "application/pdf" || file.type.startsWith("image/");
  if (!isValid) {
    sessionAttachmentError.textContent = "Only image files or PDFs are allowed.";
    sessionAttachmentError.style.display = "block";
    sessionAttachmentField.value = "";
  }
});

sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editingId = sessionIdField.value;
  const subtopicId = Number(sessionSubtopicIdField.value);
  const file = sessionAttachmentField.files[0];

  let attachment = editingAttachmentBlob;
  let attachmentType = editingAttachmentType;

  if (file) {
    const isValid = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isValid) {
      sessionAttachmentError.textContent = "Only image files or PDFs are allowed.";
      sessionAttachmentError.style.display = "block";
      return;
    }
    attachment = file;
    attachmentType = file.type;
  }

  const sessionData = {
    subtopicId: subtopicId,
    date: sessionDateField.value,
    duration: Number(sessionDurationField.value),
    summary: sessionSummaryField.value.trim(),
    attachment: attachment || null,
    attachmentType: attachmentType || null,
    createdAt: Date.now()
  };

  if (editingId) {
    const existing = await getRecord("sessions", Number(editingId));
    sessionData.id = existing.id;
    sessionData.createdAt = existing.createdAt;
    await updateRecord("sessions", sessionData);
  } else {
    await addRecord("sessions", sessionData);
  }

  resetSessionForm(subtopicId);
  await renderSessions(subtopicId);
  if (window.refreshDashboard) await window.refreshDashboard();
});

sessionCancelBtn.addEventListener("click", () => {
  resetSessionForm(sessionSubtopicIdField.value);
});

function resetSessionForm(subtopicId) {
  sessionForm.reset();
  sessionIdField.value = "";
  sessionSubtopicIdField.value = subtopicId;
  sessionAttachmentError.style.display = "none";
  sessionExistingAttachment.innerHTML = "";
  editingAttachmentBlob = null;
  editingAttachmentType = null;
  sessionSubmitBtn.textContent = "Add Session";
  sessionCancelBtn.style.display = "none";
}

async function renderSessions(subtopicId) {
  const sessions = await getAllByIndex("sessions", "subtopicId", Number(subtopicId));
  sessionListEl.innerHTML = "";

  if (sessions.length === 0) {
    sessionListEl.innerHTML = `<p class="empty-state">No sessions logged yet.</p>`;
    return;
  }

  sessions.sort((a, b) => b.createdAt - a.createdAt);

  sessions.forEach((session) => {
    sessionListEl.appendChild(createSessionCard(session));
  });
}

function createSessionCard(session) {
  const card = document.createElement("div");
  card.className = "session-card";

  card.innerHTML = `
    <div class="session-card-header">
      <strong>${session.date}</strong>
      <span>${session.duration} min</span>
    </div>
    <p class="session-summary">${session.summary || "<em>No summary</em>"}</p>
    <div class="session-attachment-preview"></div>
    <div class="session-card-actions">
      <button class="edit-btn" data-id="${session.id}">Edit</button>
      <button class="delete-btn" data-id="${session.id}">Delete</button>
    </div>
  `;

  const previewEl = card.querySelector(".session-attachment-preview");
  renderAttachmentPreview(previewEl, session.attachment, session.attachmentType);

  card.querySelector(".edit-btn").addEventListener("click", () => startEditSession(session));
  card.querySelector(".delete-btn").addEventListener("click", () => confirmDeleteSession(session));

  return card;
}

function renderAttachmentPreview(container, attachment, attachmentType) {
  if (!attachment) return;

  const url = URL.createObjectURL(attachment);

  if (attachmentType && attachmentType.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Session attachment";
    img.className = "session-thumbnail";
    container.appendChild(img);
  } else if (attachmentType === "application/pdf") {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.textContent = "View attached PDF";
    container.appendChild(link);
  }
}

function startEditSession(session) {
  sessionIdField.value = session.id;
  sessionSubtopicIdField.value = session.subtopicId;
  sessionDateField.value = session.date;
  sessionDurationField.value = session.duration;
  sessionSummaryField.value = session.summary || "";

  editingAttachmentBlob = session.attachment || null;
  editingAttachmentType = session.attachmentType || null;

  sessionExistingAttachment.innerHTML = "";
  if (session.attachment) {
    const note = document.createElement("span");
    note.textContent = "A file is already attached. Choose a new one to replace it.";
    sessionExistingAttachment.appendChild(note);
  }

  sessionSubmitBtn.textContent = "Save Changes";
  sessionCancelBtn.style.display = "inline-block";

  sessionForm.scrollIntoView({ behavior: "smooth" });
}

async function confirmDeleteSession(session) {
  const confirmed = confirm("Delete this study session?");
  if (!confirmed) return;

  await deleteRecord("sessions", session.id);
  await renderSessions(session.subtopicId);
  if (window.refreshDashboard) await window.refreshDashboard();
}