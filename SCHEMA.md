# Database Schema — Study Tracker

This document describes the IndexedDB schema used by the Study Tracker application.

**Database name:** `StudyTrackerDB`
**Version:** `1`

---

## Overview

The database consists of three object stores: `units`, `subtopics`, and `sessions`. Each unit can have multiple subtopics, and each subtopic can have multiple study sessions logged against it.

```
units (1) ──< subtopics (many) ──< sessions (many)
```

Relationships are maintained manually via foreign-key-style fields (`unitId`, `subtopicId`), since IndexedDB does not enforce referential integrity natively.

---

## Object Store: `units`

Stores each academic unit/course being tracked.

| Field       | Type   | Description                                |
|-------------|--------|--------------------------------------------|
| `id`        | number | Primary key (auto-increment)               |
| `name`      | string | Unit name, e.g. "ICS 4111 - Embedded Systems" |
| `examDate`  | string | ISO date string, e.g. `"2026-08-20"`       |
| `priority`  | string | One of: `"high"`, `"medium"`, `"low"`      |
| `createdAt` | number | Timestamp (`Date.now()`) of creation       |

**Key path:** `id`, `autoIncrement: true`
**Indexes:** none required for v1

---

## Object Store: `subtopics`

Stores individual subtopics belonging to a unit.

| Field        | Type   | Description                                      |
|--------------|--------|---------------------------------------------------|
| `id`         | number | Primary key (auto-increment)                      |
| `unitId`     | number | Foreign key → `units.id`                           |
| `name`       | string | Subtopic name, e.g. "MQTT"                         |
| `status`     | string | One of: `"not-started"`, `"in-progress"`, `"done"` |
| `targetDate` | string | ISO date string (optional)                         |
| `createdAt`  | number | Timestamp (`Date.now()`) of creation               |

**Key path:** `id`, `autoIncrement: true`
**Indexes:**
- `unitId` (non-unique) — enables fetching all subtopics belonging to a given unit without a full table scan

---

## Object Store: `sessions`

Stores individual study session logs against a subtopic.

| Field            | Type          | Description                                          |
|------------------|---------------|-------------------------------------------------------|
| `id`             | number        | Primary key (auto-increment)                          |
| `subtopicId`     | number        | Foreign key → `subtopics.id`                            |
| `date`           | string        | ISO date string of the session                        |
| `duration`       | number        | Duration in minutes                                    |
| `summary`        | string        | Free-text summary of what was studied                  |
| `attachment`     | Blob \| null  | Optional uploaded file (image or PDF)                  |
| `attachmentType` | string \| null| MIME type of attachment, e.g. `"image/png"`, `"application/pdf"` |
| `createdAt`      | number        | Timestamp (`Date.now()`) of creation                   |

**Key path:** `id`, `autoIncrement: true`
**Indexes:**
- `subtopicId` (non-unique) — enables fetching all sessions belonging to a given subtopic without a full table scan

**Note on attachments:** Only `image/*` and `application/pdf` types are accepted. Files are stored directly as `Blob` objects inside the record — no separate storage or manual byte conversion is required, and deleting a session automatically removes its attachment with it.

---

## Cascade Delete Rules

IndexedDB does not enforce foreign keys, so referential integrity is maintained manually in the wrapper layer:

1. **Deleting a unit** cascades to:
   - Delete all sessions belonging to each of the unit's subtopics
   - Delete all subtopics belonging to the unit
   - Delete the unit itself

2. **Deleting a subtopic** cascades to:
   - Delete all sessions belonging to the subtopic
   - Delete the subtopic itself

All cascade operations run within a **single transaction** spanning the relevant object stores (`db.transaction(['units', 'subtopics', 'sessions'], 'readwrite')`), so that a failure partway through does not leave orphaned or partially-deleted data.

---

## Version History

| Version | Change                          |
|---------|----------------------------------|
| 1       | Initial schema: `units`, `subtopics`, `sessions` with cascade delete support |
