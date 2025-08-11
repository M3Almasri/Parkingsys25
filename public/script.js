// Global variables
const API_BASE = 
'/api';
let parkingSlots = [];

// DOM elements
const slotsContainer = document.getElementById('slots-container');
const reservationSlotSelect = document.getElementById('reservation-slot-select');
const paymentSlotSelect = document.getElementById('payment-slot-select');
const unlockSlotSelect = document.getElementById('unlock-slot-select');
const releaseSlotSelect = document.getElementById('release-slot-select');

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    loadParkingSlots();
    setInterval(loadParkingSlots, 10000); // Auto-refresh every 10 seconds
});

document.getElementById('refresh-status').addEventListener('click', loadParkingSlots);
document.getElementById('reserve-slot').addEventListener('click', reserveSlot);
document.getElementById('pay-stripe').addEventListener('click', () => payForSlot('stripe'));
document.getElementById('pay-paypal').addEventListener('click', () => payForSlot('paypal'));
document.getElementById('unlock-slot').addEventListener('click', unlockSlot);
document.getElementById('release-slot').addEventListener('click', releaseSlot);
document.getElementById('generate-qr').addEventListener('click', generateQRCode);

async function loadParkingSlots() {
  try {
    const response = await fetch('/api/slots');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    parkingSlots = await response.json();
    renderParkingSlots();
    updateSelectOptions();
  } catch (error) {
    console.error('Failed to load parking slots:', error);
  }
}




function renderParkingSlots() {
    slotsContainer.innerHTML = '';
    parkingSlots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.classList.add('slot');
        slotElement.classList.add(getSlotStatusClass(slot));

        const lightStatus = slot.light_status === 'green' ? 'green' : 'red';

        slotElement.innerHTML = `
            <div class="light ${lightStatus}"></div>
            <h3>Slot ${slot.slot_id}</h3>
            <p>Status: ${getSlotStatusText(slot)}</p>
            <p>Gate: ${slot.gate_status}</p>
        `;
        slotsContainer.appendChild(slotElement);
    });
}

function getSlotStatusClass(slot) {
    if (slot.is_available) return 'available';
    if (slot.is_reserved && !slot.is_paid) return 'reserved';
    if (slot.is_paid) return 'occupied';
    return '';
}

function getSlotStatusText(slot) {
    if (slot.is_available) return 'Available';
    if (slot.is_reserved && !slot.is_paid) return 'Reserved';
    if (slot.is_paid) return 'Paid';
    return 'Unavailable';
}

function updateSelectOptions() {
  const currentUser = localStorage.getItem('username');

  // 1. Reservation dropdown
  const reservationSelect = document.getElementById('reservation-slot-select');
  reservationSelect.innerHTML = '<option value="">Select a slot</option>';
  parkingSlots
    .filter(slot => slot.is_available && !slot.is_reserved)
    .forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.slot_id;
      option.textContent = `Slot ${slot.slot_id}`;
      reservationSelect.appendChild(option);
    });

  // 2. Payment dropdown
  const paymentSelect = document.getElementById('payment-slot-select');
  paymentSelect.innerHTML = '<option value="">Select slot to pay for</option>';
  parkingSlots
    .filter(slot => slot.reserved_by === currentUser && !slot.is_paid)
    .forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.slot_id;
      option.textContent = `Slot ${slot.slot_id}`;
      paymentSelect.appendChild(option);
    });

  // 3. Unlock dropdown
  const unlockSelect = document.getElementById("unlock-slot-select");
  unlockSelect.innerHTML = "<option value=\"\">Select your reserved slot</option>";
  parkingSlots
    .filter((slot) => slot.reserved_by === currentUser && slot.is_paid)
    .forEach((slot) => {
      const option = document.createElement("option");
      option.value = slot.slot_id;
      option.textContent = `Slot ${slot.slot_id}`;
      unlockSelect.appendChild(option);
    });

  // 4. Release dropdown (Admin only)
  const releaseSelect = document.getElementById("release-slot-select");
  if (releaseSelect) {
    releaseSelect.innerHTML = 
      "<option value=\"\">Select a slot to release</option>";
    parkingSlots
      .filter((slot) => slot.is_reserved || slot.is_paid)
      .forEach((slot) => {
        const option = document.createElement("option");
        option.value = slot.slot_id;
        option.textContent = `Slot ${slot.slot_id} - ${getSlotStatusText(slot)}`;
        releaseSelect.appendChild(option);
      });
  }
}


async function reserveSlot() {
  const slotId = reservationSlotSelect.value;
  const reserved_by = localStorage.getItem('username') || 'anonymous';

  if (!slotId) return alert('Select a slot to reserve');

  await fetch('/api/slots/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, reserved_by })
  });

  loadParkingSlots();
}



async function payForSlot(method) {
  const slotId = paymentSlotSelect.value;
  if (!slotId) return alert('Select a slot to pay for');

  await fetch('/api/slots/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId })
  });

  alert(`Paid with ${method} (mocked)`);
  loadParkingSlots();
}


async function unlockSlot() {
  const slotId = unlockSlotSelect.value;
  if (!slotId) return alert('Select a slot to unlock');

  await fetch('/api/slots/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId })
  });

  alert(`Slot ${slotId} unlocked.`);
  loadParkingSlots();
}


async function releaseSlot() {
  const slotId = releaseSlotSelect.value;
  if (!slotId) return alert('Select a slot to release');

  await fetch('/api/slots/release', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({ slot_id: slotId })
});


  alert(`Slot ${slotId} released.`);
  loadParkingSlots();
}


function generateQRCode() {
    const qrCodeContainer = document.getElementById('qr-code-container');
    qrCodeContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}" alt="QR Code">`;
}

// Show logged in username + logout
document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const welcomeEl = document.getElementById('welcome-user');
  const logoutBtn = document.getElementById('logout-btn');

  if (username) {
    welcomeEl.textContent = `Welcome, ${username}`;
    logoutBtn.style.display = 'inline-block';
  } else {
    welcomeEl.textContent = '';
    logoutBtn.style.display = 'none';
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
});


