/* script.js */

// Backend API base URL
const backendURL = 'http://localhost:3000';

const form = document.getElementById('fabricForm');
const fabricGrid = document.getElementById('fabricGrid');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const fabricModal = document.getElementById('fabricModal');
const closeModal = document.getElementById('closeModal');

// Modal elements
const modalImage = document.getElementById('modalImage');
const modalName = document.getElementById('modalName');
const modalType = document.getElementById('modalType');
const modalColor = document.getElementById('modalColor');
const modalDimensions = document.getElementById('modalDimensions');
const modalTags = document.getElementById('modalTags');
const modalNotes = document.getElementById('modalNotes');

let fabrics = [];
let isEditing = false;
let currentEditIndex = null;

async function loadFabrics(filter = '') {
  try {
    const response = await fetch(`${backendURL}/fabrics?search=${encodeURIComponent(filter)}`);
    if (!response.ok) throw 'Could not load fabrics';

    fabrics = await response.json();

    fabricGrid.innerHTML = '';

    if (fabrics.length === 0) {
      fabricGrid.innerHTML = '<p class="text-center text-gray-500">No fabrics found.</p>';
      return;
    }

    fabrics.forEach((fabric, idx) => {
      const item = document.createElement('div');
      item.className = 'fabric-item cursor-pointer relative';

      const img = document.createElement('img');
      img.className = 'fabric-image';
      img.src = fabric.image ? backendURL + fabric.image : 'https://via.placeholder.com/150?text=No+Image';
      img.alt = fabric.name;
      item.appendChild(img);

      // Name overlay
      const nameOverlay = document.createElement('div');
      nameOverlay.className = 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-sm p-1 text-center truncate';
      nameOverlay.textContent = fabric.name;
      item.appendChild(nameOverlay);

      item.addEventListener('click', () => openModal(idx));

      fabricGrid.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    fabricGrid.innerHTML = '<p class="text-center text-red-500">Error loading fabrics.</p>';
  }
}

function makeInput(value, id) {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = value || '';
  input.className = 'border rounded px-2 py-1 w-full';
  return input;
}

function makeTextarea(value, id) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.value = value || '';
  textarea.className = 'border rounded px-2 py-1 w-full';
  textarea.rows = 3;
  return textarea;
}

function resetModal() {
  modalName.textContent = '';
  modalType.textContent = '';
  modalColor.textContent = '';
  modalDimensions.textContent = '';
  modalTags.textContent = '';
  modalNotes.textContent = '';
}

function openModal(idx) {
  isEditing = false;
  currentEditIndex = idx;
  const fabric = fabrics[idx];

  resetModal();

  modalImage.src = fabric.image ? backendURL + fabric.image : '/no-image.png';

  modalName.textContent = fabric.name;
  modalType.textContent = fabric.type || '-';
  modalColor.textContent = fabric.color || '-';
  modalDimensions.textContent = (fabric.length && fabric.width) ? `${fabric.length}m x ${fabric.width}m` : '-';
  modalTags.textContent = (fabric.tags && fabric.tags.length) ? fabric.tags.join(', ') : '-';
  modalNotes.textContent = fabric.notes || '-';

  const controls = fabricModal.querySelector('.modal-controls');
  controls.innerHTML = '';

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.className = 'mr-2 px-3 py-1 bg-blue-600 text-white rounded';
  editBtn.onclick = toggleEdit;
  controls.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.className = 'px-3 py-1 bg-red-600 text-white rounded';
  delBtn.onclick = () => {
    if (confirm('Are you sure you want to delete this?')) {
      deleteFabric(fabric.id);
      fabricModal.classList.add('hidden');
      fabricModal.classList.remove('flex');
    }
  };
  controls.appendChild(delBtn);

  fabricModal.classList.remove('hidden');
  fabricModal.classList.add('flex');
}

function toggleEdit() {
  if (currentEditIndex === null) return;

  isEditing = !isEditing;
  const fabric = fabrics[currentEditIndex];

  if (isEditing) {
    modalName.innerHTML = '';
    modalType.innerHTML = '';
    modalColor.innerHTML = '';
    modalDimensions.innerHTML = '';
    modalTags.innerHTML = '';
    modalNotes.innerHTML = '';

    const nameInput = makeInput(fabric.name, 'editName');
    const typeInput = makeInput(fabric.type, 'editType');
    const colorInput = makeInput(fabric.color, 'editColor');

    const lengthInput = makeInput(fabric.length || '', 'editLength');
    lengthInput.placeholder = 'Length (m)';
    const widthInput = makeInput(fabric.width || '', 'editWidth');
    widthInput.placeholder = 'Width (m)';

    const dimWrapper = document.createElement('div');
    dimWrapper.className = 'flex gap-2';
    dimWrapper.appendChild(lengthInput);
    dimWrapper.appendChild(widthInput);

    const tagsInput = makeInput(fabric.tags ? fabric.tags.join(', ') : '', 'editTags');
    const notesInput = makeTextarea(fabric.notes, 'editNotes');

    modalName.appendChild(nameInput);
    modalType.appendChild(typeInput);
    modalColor.appendChild(colorInput);
    modalDimensions.appendChild(dimWrapper);
    modalTags.appendChild(tagsInput);
    modalNotes.appendChild(notesInput);

    const controls = fabricModal.querySelector('.modal-controls');
    controls.innerHTML = '';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'mr-2 px-3 py-1 bg-green-600 text-white rounded';
    saveBtn.onclick = saveChanges;
    controls.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'px-3 py-1 bg-gray-600 text-white rounded';
    cancelBtn.onclick = () => openModal(currentEditIndex);
    controls.appendChild(cancelBtn);
  } else {
    openModal(currentEditIndex);
  }
}

async function saveChanges() {
  if (currentEditIndex === null) return;
  const id = fabrics[currentEditIndex].id;
  const updated = {
    name: document.getElementById('editName').value.trim(),
    type: document.getElementById('editType').value.trim(),
    color: document.getElementById('editColor').value.trim(),
    length: document.getElementById('editLength').value.trim(),
    width: document.getElementById('editWidth').value.trim(),
    tags: document.getElementById('editTags').value.trim(),
    notes: document.getElementById('editNotes').value.trim(),
  };

  try {
    const res = await fetch(`${backendURL}/fabrics/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw 'Failed to update';

    const updatedFabric = await res.json();
    fabrics[currentEditIndex] = updatedFabric;

    isEditing = false;
    openModal(currentEditIndex);
    loadFabrics();
  } catch (err) {
    alert(err);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch(`${backendURL}/fabrics`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw 'Add fabric failed';

    await loadFabrics();
    form.reset();
    form.classList.add('hidden');
  } catch (err) {
    alert(err);
  }
});

async function deleteFabric(id) {
  try {
    const res = await fetch(`${backendURL}/fabrics/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw 'Delete failed';

    await loadFabrics();
  } catch (err) {
    alert(err);
  }
}

searchBtn.addEventListener('click', () => {
  loadFabrics(searchInput.value.trim());
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loadFabrics(searchInput.value.trim());
  }
});

toggleFormBtn.addEventListener('click', () => {
  form.classList.toggle('hidden');
});

closeModal.addEventListener('click', () => {
  fabricModal.classList.add('hidden');
  fabricModal.classList.remove('flex');
});

fabricModal.addEventListener('click', e => {
  if (e.target === fabricModal) {
    fabricModal.classList.add('hidden');
    fabricModal.classList.remove('flex');
  }
});

loadFabrics();
