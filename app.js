// ============================================================
// UNIFORM BILLING SYSTEM - Full Application Logic
// ============================================================

// ===== DATA STORE =====
const Store = {
  getSchools() {
    return JSON.parse(localStorage.getItem('uniform_schools') || '[]');
  },
  saveSchools(schools) {
    localStorage.setItem('uniform_schools', JSON.stringify(schools));
  },
  getOrders() {
    return JSON.parse(localStorage.getItem('uniform_orders') || '[]');
  },
  saveOrders(orders) {
    localStorage.setItem('uniform_orders', JSON.stringify(orders));
  },
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
};

// ===== APP STATE =====
const state = {
  currentPage: 'home',
  currentSchoolId: null,
  cart: [],           // { uniformId, name, type, price, qty }
  currentOrderItems: [] // for billing preview
};

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== NAVIGATION =====
function navigateTo(page, data) {
  // Hide all pages
  $$('.page').forEach(p => p.classList.remove('active'));
  // Show target
  const target = $(`#page-${page}`);
  if (target) target.classList.add('active');

  // Update sidebar active
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = $(`.nav-btn[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  state.currentPage = page;
  if (data) Object.assign(state, data);
}

// Sidebar nav clicks
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (page === 'home') {
      renderHomeSchools();
      navigateTo('home');
    } else if (page === 'schools') {
      renderSchoolList();
      navigateTo('schools');
    } else if (page === 'orders') {
      renderOrders();
      navigateTo('orders');
    }
  });
});

// ===== MODAL SYSTEM =====
function showModal({ title, bodyHTML, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modalConfirmBtn').textContent = confirmText;
  $('#modalCancelBtn').textContent = cancelText;
  $('#modalOverlay').style.display = 'flex';

  const close = () => {
    $('#modalOverlay').style.display = 'none';
    $('#modalConfirmBtn').onclick = null;
    $('#modalCancelBtn').onclick = null;
    $('#modalCloseBtn').onclick = null;
  };

  $('#modalCloseBtn').onclick = close;
  $('#modalCancelBtn').onclick = close;
  $('#modalConfirmBtn').onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };
}

function closeModal() {
  $('#modalOverlay').style.display = 'none';
}

// ===== SCHOOLS CRUD =====
function getSchools() { return Store.getSchools(); }
function saveSchools(s) { Store.saveSchools(s); }

// Add School
$('#addSchoolBtn').addEventListener('click', () => {
  const bodyHTML = `
    <div class="form-group">
      <label for="modalSchoolName">School Name *</label>
      <input type="text" id="modalSchoolName" placeholder="Enter school name" required>
    </div>
    <div class="form-group">
      <label for="modalSchoolAddress">Address</label>
      <input type="text" id="modalSchoolAddress" placeholder="Enter school address">
    </div>
    <div class="form-group">
      <label for="modalSchoolContact">Contact</label>
      <input type="text" id="modalSchoolContact" placeholder="Enter contact number">
    </div>
  `;
  showModal({
    title: 'Add New School',
    bodyHTML,
    confirmText: 'Add School',
    onConfirm: () => {
      const name = $('#modalSchoolName').value.trim();
      if (!name) { alert('School name is required!'); return; }
      const schools = getSchools();
      schools.push({
        id: Store.generateId(),
        name,
        address: $('#modalSchoolAddress').value.trim(),
        contact: $('#modalSchoolContact').value.trim(),
        uniforms: [],
        createdAt: new Date().toISOString()
      });
      saveSchools(schools);
      renderSchoolList();
      renderHomeSchools();
    }
  });
  // Auto-focus after modal renders
  setTimeout(() => {
    const inp = $('#modalSchoolName');
    if (inp) inp.focus();
  }, 100);
});

// Edit School
function editSchool(id) {
  const schools = getSchools();
  const school = schools.find(s => s.id === id);
  if (!school) return;

  const bodyHTML = `
    <div class="form-group">
      <label for="modalSchoolName">School Name *</label>
      <input type="text" id="modalSchoolName" value="${escapeHtml(school.name)}" required>
    </div>
    <div class="form-group">
      <label for="modalSchoolAddress">Address</label>
      <input type="text" id="modalSchoolAddress" value="${escapeHtml(school.address || '')}">
    </div>
    <div class="form-group">
      <label for="modalSchoolContact">Contact</label>
      <input type="text" id="modalSchoolContact" value="${escapeHtml(school.contact || '')}">
    </div>
  `;
  showModal({
    title: 'Edit School',
    bodyHTML,
    confirmText: 'Save',
    onConfirm: () => {
      const name = $('#modalSchoolName').value.trim();
      if (!name) { alert('School name is required!'); return; }
      school.name = name;
      school.address = $('#modalSchoolAddress').value.trim();
      school.contact = $('#modalSchoolContact').value.trim();
      saveSchools(schools);
      renderSchoolList();
      renderHomeSchools();
    }
  });
}

// Delete School
function deleteSchool(id) {
  const schools = getSchools();
  const school = schools.find(s => s.id === id);
  if (!school) return;
  showModal({
    title: 'Delete School',
    bodyHTML: `<p>Are you sure you want to delete <strong>${escapeHtml(school.name)}</strong>?<br><br>All uniforms and cart data for this school will be lost.</p>`,
    confirmText: 'Delete',
    onConfirm: () => {
      const updated = schools.filter(s => s.id !== id);
      saveSchools(updated);
      renderSchoolList();
      renderHomeSchools();
      if (state.currentSchoolId === id) {
        navigateTo('schools');
        renderSchoolList();
      }
    }
  });
}

// ===== RENDER SCHOOLS =====
function renderHomeSchools() {
  const schools = getSchools();
  const grid = $('#homeSchoolGrid');
  const empty = $('#homeEmptyState');

  if (schools.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = schools.map(s => `
    <div class="school-card" data-id="${s.id}">
      <div class="school-card-icon">🏫</div>
      <div class="school-card-name">${escapeHtml(s.name)}</div>
      <div class="school-card-count">${s.uniforms.length} uniform(s)</div>
    </div>
  `).join('');

  grid.querySelectorAll('.school-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      openSchoolDetail(id);
    });
  });
}

function renderSchoolList() {
  const schools = getSchools();
  const list = $('#schoolList');
  const empty = $('#schoolEmptyState');

  if (schools.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = schools.map(s => `
    <div class="school-item" data-id="${s.id}">
      <div class="school-item-left" data-action="open">
        <div class="school-item-icon">🏫</div>
        <div class="school-item-info">
          <h3>${escapeHtml(s.name)}</h3>
          <p>${s.uniforms.length} uniform(s) ${s.address ? '| ' + escapeHtml(s.address) : ''}</p>
        </div>
      </div>
      <div class="school-item-actions">
        <button class="btn btn-secondary btn-small" data-action="uniforms">👕 Uniforms</button>
        <button class="btn btn-primary btn-small" data-action="edit">✏️ Edit</button>
        <button class="btn btn-danger btn-small" data-action="delete">🗑️ Delete</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.school-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('[data-action="open"]').addEventListener('click', () => {
      openSchoolDetail(id);
    });
    item.querySelector('[data-action="uniforms"]').addEventListener('click', () => {
      openSchoolDetail(id);
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', () => {
      editSchool(id);
    });
    item.querySelector('[data-action="delete"]').addEventListener('click', () => {
      deleteSchool(id);
    });
  });
}

// ===== OPEN SCHOOL DETAIL (Uniforms + Cart) =====
function openSchoolDetail(schoolId) {
  const schools = getSchools();
  const school = schools.find(s => s.id === schoolId);
  if (!school) return;

  state.currentSchoolId = schoolId;
  state.cart = [];

  $('#schoolDetailTitle').textContent = school.name;
  navigateTo('school-detail', { currentSchoolId: schoolId });

  renderUniforms(schoolId);
  renderCart();
}

// Back from detail
$('#backFromDetail').addEventListener('click', () => {
  navigateTo('home');
  renderHomeSchools();
});

// ===== UNIFORMS CRUD =====
$('#addUniformBtn').addEventListener('click', () => {
  const schools = getSchools();
  const school = schools.find(s => s.id === state.currentSchoolId);
  if (!school) return;

  const bodyHTML = `
    <div class="form-group">
      <label for="modalUniformName">Uniform Name *</label>
      <input type="text" id="modalUniformName" placeholder="e.g. White Shirt, Blue Jersey" required>
    </div>
    <div class="form-group">
      <label for="modalUniformType">Type / Size</label>
      <input type="text" id="modalUniformType" placeholder="e.g. Full Sleeve, Size M">
    </div>
    <div class="form-group">
      <label for="modalUniformPrice">Price (₹) *</label>
      <input type="number" id="modalUniformPrice" placeholder="e.g. 450" min="0" step="0.01" required>
    </div>
  `;
  showModal({
    title: `Add Uniform to ${school.name}`,
    bodyHTML,
    confirmText: 'Add Uniform',
    onConfirm: () => {
      const name = $('#modalUniformName').value.trim();
      const price = parseFloat($('#modalUniformPrice').value);
      if (!name || isNaN(price) || price <= 0) {
        alert('Uniform name and valid price are required!');
        return;
      }
      school.uniforms.push({
        id: Store.generateId(),
        name,
        type: $('#modalUniformType').value.trim(),
        price
      });
      saveSchools(schools);
      renderUniforms(state.currentSchoolId);
      renderHomeSchools();
    }
  });
  setTimeout(() => {
    const inp = $('#modalUniformName');
    if (inp) inp.focus();
  }, 100);
});

function editUniform(schoolId, uniformId) {
  const schools = getSchools();
  const school = schools.find(s => s.id === schoolId);
  if (!school) return;
  const uniform = school.uniforms.find(u => u.id === uniformId);
  if (!uniform) return;

  const bodyHTML = `
    <div class="form-group">
      <label for="modalUniformName">Uniform Name *</label>
      <input type="text" id="modalUniformName" value="${escapeHtml(uniform.name)}" required>
    </div>
    <div class="form-group">
      <label for="modalUniformType">Type / Size</label>
      <input type="text" id="modalUniformType" value="${escapeHtml(uniform.type || '')}">
    </div>
    <div class="form-group">
      <label for="modalUniformPrice">Price (₹) *</label>
      <input type="number" id="modalUniformPrice" value="${uniform.price}" min="0" step="0.01" required>
    </div>
  `;
  showModal({
    title: 'Edit Uniform',
    bodyHTML,
    confirmText: 'Save',
    onConfirm: () => {
      const name = $('#modalUniformName').value.trim();
      const price = parseFloat($('#modalUniformPrice').value);
      if (!name || isNaN(price) || price <= 0) {
        alert('Uniform name and valid price are required!');
        return;
      }
      uniform.name = name;
      uniform.type = $('#modalUniformType').value.trim();
      uniform.price = price;
      saveSchools(schools);
      renderUniforms(schoolId);
      renderHomeSchools();
    }
  });
}

function deleteUniform(schoolId, uniformId) {
  const schools = getSchools();
  const school = schools.find(s => s.id === schoolId);
  if (!school) return;
  const uniform = school.uniforms.find(u => u.id === uniformId);
  if (!uniform) return;

  showModal({
    title: 'Delete Uniform',
    bodyHTML: `<p>Are you sure you want to delete <strong>${escapeHtml(uniform.name)}</strong>?</p>`,
    confirmText: 'Delete',
    onConfirm: () => {
      school.uniforms = school.uniforms.filter(u => u.id !== uniformId);
      saveSchools(schools);
      renderUniforms(schoolId);
      // Remove from cart if present
      state.cart = state.cart.filter(c => c.uniformId !== uniformId);
      renderCart();
      renderHomeSchools();
    }
  });
}

// ===== RENDER UNIFORMS =====
function renderUniforms(schoolId) {
  const schools = getSchools();
  const school = schools.find(s => s.id === schoolId);
  if (!school) return;

  const list = $('#uniformsList');
  const empty = $('#uniformEmptyState');

  if (school.uniforms.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Check what's in cart
  const cartIds = state.cart.map(c => c.uniformId);

  list.innerHTML = school.uniforms.map(u => {
    const inCart = cartIds.includes(u.id);
    return `
      <div class="uniform-card" data-id="${u.id}">
        <div class="uniform-card-info">
          <h4>${escapeHtml(u.name)}</h4>
          <p>${u.type ? escapeHtml(u.type) + ' | ' : ''}₹${Number(u.price).toFixed(2)}</p>
        </div>
        <div class="uniform-card-actions">
          <button class="btn btn-secondary btn-small" data-action="edit">✏️</button>
          <button class="btn btn-danger btn-small" data-action="delete">🗑️</button>
          ${inCart
            ? `<button class="btn btn-success btn-small" data-action="in-cart" disabled>✓ In Cart</button>`
            : `<button class="uniform-card-add" data-action="add">+</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.uniform-card').forEach(card => {
    const uniformId = card.dataset.id;
    const uniform = school.uniforms.find(u => u.id === uniformId);
    if (!uniform) return;

    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      editUniform(schoolId, uniformId);
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      deleteUniform(schoolId, uniformId);
    });

    const addBtn = card.querySelector('[data-action="add"]');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addToCart(uniform, school);
      });
    }
  });
}

// ===== CART =====
function addToCart(uniform, school) {
  // Check if already in cart
  if (state.cart.find(c => c.uniformId === uniform.id)) return;

  state.cart.push({
    uniformId: uniform.id,
    schoolId: school.id,
    schoolName: school.name,
    name: uniform.name,
    type: uniform.type,
    price: uniform.price,
    qty: 1
  });
  renderCart();
  renderUniforms(state.currentSchoolId);
}

function updateCartQty(uniformId, delta) {
  const item = state.cart.find(c => c.uniformId === uniformId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCart();
}

function removeFromCart(uniformId) {
  state.cart = state.cart.filter(c => c.uniformId !== uniformId);
  renderCart();
  renderUniforms(state.currentSchoolId);
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function renderCart() {
  const list = $('#cartList');
  const empty = $('#cartEmptyState');
  const summary = $('#cartSummary');
  const count = $('#cartCount');
  const total = $('#cartTotalAmount');

  count.textContent = state.cart.length;

  if (state.cart.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    summary.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  summary.style.display = 'block';

  list.innerHTML = state.cart.map(item => `
    <div class="cart-item" data-id="${item.uniformId}">
      <div class="cart-item-info">
        <h4>${escapeHtml(item.name)}</h4>
        <p>₹${Number(item.price).toFixed(2)} each</p>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-action="decrease">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" data-action="increase">+</button>
      </div>
      <div class="cart-item-total">₹${(item.price * item.qty).toFixed(2)}</div>
      <button class="cart-remove-btn" data-action="remove">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.cart-item').forEach(item => {
    const id = item.dataset.id;
    item.querySelector('[data-action="decrease"]').addEventListener('click', () => updateCartQty(id, -1));
    item.querySelector('[data-action="increase"]').addEventListener('click', () => updateCartQty(id, 1));
    item.querySelector('[data-action="remove"]').addEventListener('click', () => removeFromCart(id));
  });

  total.textContent = `₹${getCartTotal().toFixed(2)}`;
}

// ===== PROCEED TO BILLING =====
$('#proceedToBillBtn').addEventListener('click', () => {
  if (state.cart.length === 0) {
    alert('Cart is empty! Add some uniforms first.');
    return;
  }
  // Set default date
  const dateInput = $('#billingDate');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  renderBilling();
  navigateTo('billing');
});

$('#backFromBilling').addEventListener('click', () => {
  navigateTo('school-detail');
  renderUniforms(state.currentSchoolId);
  renderCart();
});

// ===== RENDER BILLING =====
function renderBilling() {
  const summary = $('#billingOrderSummary');
  const total = $('#billingGrandTotal');

  if (state.cart.length === 0) {
    summary.innerHTML = '<p style="color:var(--text-secondary);">No items in cart.</p>';
    total.textContent = '₹0.00';
    return;
  }

  summary.innerHTML = state.cart.map(item => `
    <div class="billing-summary-item">
      <span>${escapeHtml(item.name)} × ${item.qty}</span>
      <span>₹${(item.price * item.qty).toFixed(2)}</span>
    </div>
  `).join('');

  total.textContent = `₹${getCartTotal().toFixed(2)}`;
}

// ===== SAVE ORDER =====
$('#saveOrderBtn').addEventListener('click', () => {
  const name = $('#studentName').value.trim();
  const cls = $('#studentClass').value.trim();
  const contact = $('#parentContact').value.trim();

  if (!name || !cls || !contact) {
    alert('Please fill in all required fields: Student Name, Class, and Contact.');
    return;
  }

  if (state.cart.length === 0) {
    alert('Cart is empty! Add some uniforms first.');
    return;
  }

  const date = $('#billingDate').value || new Date().toISOString().split('T')[0];
  const note = $('#additionalNote').value.trim();

  const order = {
    id: Store.generateId(),
    schoolName: state.cart[0]?.schoolName || 'Unknown',
    schoolId: state.currentSchoolId,
    studentName: name,
    studentClass: cls,
    parentContact: contact,
    date,
    note,
    items: state.cart.map(item => ({
      name: item.name,
      type: item.type,
      price: item.price,
      qty: item.qty,
      total: item.price * item.qty
    })),
    total: getCartTotal(),
    createdAt: new Date().toISOString()
  };

  const orders = Store.getOrders();
  orders.unshift(order); // newest first
  Store.saveOrders(orders);

  // Clear cart and form
  state.cart = [];
  $('#billingForm').reset();
  $('#additionalNote').value = '';

  // Navigate to orders
  renderOrders();
  navigateTo('orders');

  alert('✅ Order saved successfully!');
});

// ===== GENERATE PDF =====
$('#generatePdfBtn').addEventListener('click', () => {
  const name = $('#studentName').value.trim();
  const cls = $('#studentClass').value.trim();
  const contact = $('#parentContact').value.trim();

  if (!name || !cls || !contact) {
    alert('Please fill in all required fields: Student Name, Class, and Contact.');
    return;
  }

  if (state.cart.length === 0) {
    alert('Cart is empty! Add some uniforms first.');
    return;
  }

  const school = getSchools().find(s => s.id === state.currentSchoolId);
  const date = $('#billingDate').value || new Date().toLocaleDateString();
  const note = $('#additionalNote').value.trim();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('UNIFORM BILL', 105, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('Uniform Tailor & Distributor', 105, 28, { align: 'center' });

  // Separator line
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // --- School & Student Info ---
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`School: ${school ? school.name : state.cart[0]?.schoolName || 'N/A'}`, 14, 42);
  doc.text(`Student: ${name}`, 14, 50);
  doc.text(`Class: ${cls}`, 14, 58);
  doc.text(`Contact: ${contact}`, 14, 66);
  doc.text(`Date: ${date}`, 140, 42);

  if (school?.address) {
    doc.text(`Address: ${school.address}`, 140, 50);
  }

  // --- Items Table ---
  const tableData = state.cart.map((item, i) => [
    (i + 1).toString(),
    item.name + (item.type ? ` (${item.type})` : ''),
    item.qty.toString(),
    `₹${Number(item.price).toFixed(2)}`,
    `₹${(item.price * item.qty).toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 74,
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    foot: [['', '', '', 'Grand Total', `₹${getCartTotal().toFixed(2)}`]],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  // --- Note ---
  if (note) {
    const finalY = doc.lastAutoTable.finalY || 140;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Note: ${note}`, 14, finalY + 12);
  }

  // --- Footer ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
    // Signature line
    doc.line(140, 270, 190, 270);
    doc.text('Authorized Signature', 165, 275, { align: 'center' });
  }

  // Open in new window / print
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
});

// ===== ORDERS =====
function renderOrders(searchTerm = '') {
  let orders = Store.getOrders();
  const list = $('#ordersList');
  const empty = $('#ordersEmptyState');

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    orders = orders.filter(o =>
      o.studentName.toLowerCase().includes(term) ||
      o.schoolName.toLowerCase().includes(term) ||
      o.parentContact.includes(term) ||
      o.studentClass.toLowerCase().includes(term)
    );
  }

  if (orders.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = orders.map(order => `
    <div class="order-card" data-id="${order.id}">
      <div class="order-card-header">
        <h3>${escapeHtml(order.studentName)} - ${escapeHtml(order.schoolName)}</h3>
        <span class="order-date">${formatDate(order.date || order.createdAt)}</span>
      </div>
      <div class="order-card-details">
        <div class="order-detail-item"><strong>Class:</strong> ${escapeHtml(order.studentClass)}</div>
        <div class="order-detail-item"><strong>Contact:</strong> ${escapeHtml(order.parentContact)}</div>
        ${order.note ? `<div class="order-detail-item"><strong>Note:</strong> ${escapeHtml(order.note)}</div>` : ''}
      </div>
      <div class="order-card-items">
        <details>
          <summary>Items (${order.items.length})</summary>
          <ul>
            ${order.items.map(item => `
              <li>${escapeHtml(item.name)} × ${item.qty} = ₹${Number(item.total).toFixed(2)}</li>
            `).join('')}
          </ul>
        </details>
      </div>
      <div class="order-card-total">₹${Number(order.total).toFixed(2)}</div>
      <div class="order-card-actions">
        <button class="btn btn-success btn-small" data-action="print-pdf">📄 PDF</button>
        <button class="btn btn-danger btn-small" data-action="delete-order">🗑️ Delete</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.order-card').forEach(card => {
    const orderId = card.dataset.id;
    card.querySelector('[data-action="print-pdf"]').addEventListener('click', () => {
      regeneratePDF(orderId);
    });
    card.querySelector('[data-action="delete-order"]').addEventListener('click', () => {
      deleteOrder(orderId);
    });
  });
}

function deleteOrder(orderId) {
  showModal({
    title: 'Delete Order',
    bodyHTML: '<p>Are you sure you want to delete this order?</p>',
    confirmText: 'Delete',
    onConfirm: () => {
      let orders = Store.getOrders();
      orders = orders.filter(o => o.id !== orderId);
      Store.saveOrders(orders);
      renderOrders($('#orderSearch').value);
    }
  });
}

function regeneratePDF(orderId) {
  const orders = Store.getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    alert('Order not found!');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('UNIFORM BILL', 105, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('Uniform Tailor & Distributor', 105, 28, { align: 'center' });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // --- Info ---
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`School: ${order.schoolName}`, 14, 42);
  doc.text(`Student: ${order.studentName}`, 14, 50);
  doc.text(`Class: ${order.studentClass}`, 14, 58);
  doc.text(`Contact: ${order.parentContact}`, 14, 66);
  doc.text(`Date: ${formatDate(order.date || order.createdAt)}`, 140, 42);

  // --- Table ---
  const tableData = order.items.map((item, i) => [
    (i + 1).toString(),
    item.name + (item.type ? ` (${item.type})` : ''),
    item.qty.toString(),
    `₹${Number(item.price).toFixed(2)}`,
    `₹${Number(item.total).toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 74,
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    foot: [['', '', '', 'Grand Total', `₹${Number(order.total).toFixed(2)}`]],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: 'bold'
    },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  if (order.note) {
    const finalY = doc.lastAutoTable.finalY || 140;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Note: ${order.note}`, 14, finalY + 12);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      105, 285, { align: 'center' }
    );
    doc.line(140, 270, 190, 270);
    doc.text('Authorized Signature', 165, 275, { align: 'center' });
  }

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

// ===== CLEAR ALL ORDERS =====
$('#clearAllOrdersBtn').addEventListener('click', () => {
  const orders = Store.getOrders();
  if (orders.length === 0) {
    alert('No orders to clear.');
    return;
  }
  showModal({
    title: 'Clear All Orders',
    bodyHTML: `<p>Are you sure you want to delete all <strong>${orders.length}</strong> orders? This cannot be undone.</p>`,
    confirmText: 'Clear All',
    onConfirm: () => {
      Store.saveOrders([]);
      renderOrders();
    }
  });
});

// ===== ORDER SEARCH =====
$('#orderSearch').addEventListener('input', (e) => {
  renderOrders(e.target.value);
});

// ===== UTILITY FUNCTIONS =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ===== INIT =====
function init() {
  renderHomeSchools();
  renderSchoolList();
  // Set default date
  const dateInput = $('#billingDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// Make sure modal overlay click closes it
$('#modalOverlay').addEventListener('click', (e) => {
  if (e.target === $('#modalOverlay')) {
    closeModal();
  }
});

// ===== MOBILE SIDEBAR TOGGLE =====
const sidebar = $('#sidebar');
const overlay = $('#sidebarOverlay');
const hamburger = $('#hamburgerBtn');

function toggleSidebar() {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

if (hamburger) {
  hamburger.addEventListener('click', toggleSidebar);
}

if (overlay) {
  overlay.addEventListener('click', closeSidebar);
}

// Close sidebar on nav click (mobile)
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', closeSidebar);
});

// Run on page load
document.addEventListener('DOMContentLoaded', init);
