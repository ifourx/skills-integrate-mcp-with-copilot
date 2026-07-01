document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");

  // Auth elements
  const userIconBtn = document.getElementById("user-icon-btn");
  const userDropdown = document.getElementById("user-dropdown");
  const dropdownLoggedOut = document.getElementById("dropdown-logged-out");
  const dropdownLoggedIn = document.getElementById("dropdown-logged-in");
  const loggedInUser = document.getElementById("logged-in-user");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const modalClose = document.querySelector(".modal-close");

  // State
  let authToken = localStorage.getItem("authToken") || null;
  let currentUser = localStorage.getItem("currentUser") || null;

  // Update UI based on auth state
  function updateAuthUI() {
    if (authToken && currentUser) {
      dropdownLoggedOut.classList.add("hidden");
      dropdownLoggedIn.classList.remove("hidden");
      loggedInUser.textContent = currentUser;
      signupContainer.classList.remove("hidden");
      userIconBtn.classList.add("user-logged-in");
    } else {
      dropdownLoggedOut.classList.remove("hidden");
      dropdownLoggedIn.classList.add("hidden");
      loggedInUser.textContent = "";
      signupContainer.classList.add("hidden");
      userIconBtn.classList.remove("user-logged-in");
    }
    // Refresh activities to show/hide delete buttons
    fetchActivities();
  }

  // Toggle user dropdown
  userIconBtn.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!userIconBtn.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.add("hidden");
    }
  });

  // Open login modal
  loginBtn.addEventListener("click", () => {
    userDropdown.classList.add("hidden");
    loginModal.classList.remove("hidden");
    loginMessage.classList.add("hidden");
  });

  // Close login modal
  modalClose.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    userDropdown.classList.add("hidden");
    updateAuthUI();
  });

  // Handle login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        currentUser = username;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("currentUser", currentUser);
        loginModal.classList.add("hidden");
        loginForm.reset();
        updateAuthUI();
      } else {
        loginMessage.textContent = result.detail || "Invalid credentials";
        loginMessage.className = "message error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "message error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML - only show delete buttons when logged in
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
              <ul class="participants-list">
                ${details.participants
              .map(
                (email) =>
                  `<li>
                        <span class="participant-email">${email}</span>
                        ${authToken ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}
                      </li>`
              )
              .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only shown when logged in)
      if (authToken) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else if (response.status === 401) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentUser");
        updateAuthUI();
        messageDiv.textContent = "Session expired. Please login again.";
        messageDiv.className = "error";
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else if (response.status === 401) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentUser");
        updateAuthUI();
        messageDiv.textContent = "Session expired. Please login again.";
        messageDiv.className = "error";
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
