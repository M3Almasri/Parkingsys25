document.addEventListener("DOMContentLoaded", async () => {
  const slotStatusContainer = document.getElementById("slot-status-container");
  const releaseSlotSelect = document.getElementById("release-slot-select");
  const releaseSlotButton = document.getElementById("release-slot-button");
  const logoutButton = document.getElementById("logout-button");

  async function loadAdminParkingSlots() {
    try {
      const res = await fetch("/api/slots");
      const slots = await res.json();

      slotStatusContainer.innerHTML = ""; // Clear previous slots
      releaseSlotSelect.innerHTML = 
        `<option value="">Select a slot</option>`; // Clear previous options

      slots.forEach((slot) => {
        const slotCard = document.createElement("div");
        slotCard.className = `slot-card ${slot.is_available ? "available" : "reserved"}`;
        slotCard.innerHTML = `
          <div class="slot-indicator ${slot.light_status}"></div>
          <h3>Slot ${slot.slot_id}</h3>
          <p>Status: ${slot.is_available ? "Available" : slot.is_reserved ? "Reserved" : ""}</p>
          <p>Gate: ${slot.gate_status}</p>
        `;
        slotStatusContainer.appendChild(slotCard);

        // Add to release dropdown if not available
        if (!slot.is_available) {
          const option = document.createElement("option");
          option.value = slot.slot_id;
          option.textContent = `Slot ${slot.slot_id}`;
          releaseSlotSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Failed to load parking slots for admin:", error);
      slotStatusContainer.innerHTML = "<p>Error loading slot data.</p>";
    }
  }

  if (releaseSlotButton) {
    releaseSlotButton.addEventListener("click", async () => {
      const slotId = releaseSlotSelect.value;
      if (!slotId) {
        alert("Please select a slot to release.");
        return;
      }

      try {
        const res = await fetch(`/api/slots/release/${slotId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          loadAdminParkingSlots(); // Refresh slots after release
        } else {
          alert(data.message || "Failed to release slot.");
        }
      } catch (error) {
        console.error("Error releasing slot:", error);
        alert("An error occurred while releasing the slot.");
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "admin-login.html";
    });
  }

  loadAdminParkingSlots(); // Initial load
});


