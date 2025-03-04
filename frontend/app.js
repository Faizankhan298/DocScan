// DOM Elements
const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const userDashboard = document.getElementById("user-dashboard");
const adminDashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const userCredits = document.getElementById("user-credits");
const scanForm = document.getElementById("scan-form");
const scanResults = document.getElementById("scan-results");
const resultsContainer = document.getElementById("results-container");
const scanHistoryList = document.getElementById("scan-history-list");
const creditRequestsList = document.getElementById("credit-requests-list");
const requestCreditsBtn = document.getElementById("request-credits-btn");
const requestCreditsModal = document.getElementById("request-credits-modal");
const creditRequestForm = document.getElementById("credit-request-form");
const closeModalBtn = document.querySelector(".close-modal");
const exportHistoryBtn = document.getElementById("export-history-btn");
const userInfo = document.querySelector(".user-info");
const navLinks = document.querySelector(".nav-links");

// Global state
let currentUser = null;

// Check if user is already logged in (session)
async function checkAuthStatus() {
  try {
    const response = await fetch("/user/profile");

    if (response.ok) {
      const userData = await response.json();
      currentUser = userData;
      showDashboard();
      updateUserInfo();
    } else {
      showAuthSection();
    }
  } catch (error) {
    console.error("Auth check error:", error);
    showAuthSection();
  }
}

// Tab functionality
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;

    // Deactivate all tabs
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    // Activate clicked tab
    btn.classList.add("active");
    document.getElementById(tabId).classList.add("active");
  });
});

// Login form submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      showDashboard();
      updateUserInfo();
    } else {
      alert(data.error || "Login failed. Please try again.");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred during login. Please try again.");
  }
});

// Register form submission
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById(
    "register-confirm-password"
  ).value;

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      showDashboard();
      updateUserInfo();
    } else {
      alert(data.error || "Registration failed. Please try again.");
    }
  } catch (error) {
    console.error("Register error:", error);
    alert("An error occurred during registration. Please try again.");
  }
});

// Logout functionality
function setupLogout() {
  const logoutLink = document.createElement("a");
  logoutLink.href = "#";
  logoutLink.textContent = "Logout";
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/auth/logout", { method: "POST" });

      if (response.ok) {
        currentUser = null;
        showAuthSection();
      } else {
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  // Add logout link to nav
  navLinks.appendChild(logoutLink);
}

// Update user info in header
function updateUserInfo() {
  userInfo.innerHTML = "";

  if (currentUser) {
    const roleSpan = document.createElement("span");
    roleSpan.textContent = `Role: ${currentUser.role}`;
    roleSpan.className = "user-role";

    const creditsSpan = document.createElement("span");
    creditsSpan.textContent = `Credits: ${currentUser.credits}`;
    creditsSpan.className = "user-credits-display";

    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = `${currentUser.username}`;
    usernameSpan.className = "user-name";

    userInfo.append(usernameSpan, roleSpan, creditsSpan);

    // Setup navigation
    navLinks.innerHTML = "";

    const dashboardLink = document.createElement("a");
    dashboardLink.href = "#";
    dashboardLink.textContent = "Dashboard";
    dashboardLink.addEventListener("click", (e) => {
      e.preventDefault();
      showDashboard();
    });

    navLinks.appendChild(dashboardLink);

    // Add logout link
    setupLogout();
  }
}

// Show dashboard based on user role
function showDashboard() {
  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");

  if (currentUser.role === "admin") {
    userDashboard.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    loadAdminDashboard();
  } else {
    userDashboard.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
    loadUserDashboard();
  }
}

// Show auth section
function showAuthSection() {
  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  navLinks.innerHTML = "";
  userInfo.innerHTML = "";
}

// User dashboard functionality
async function loadUserDashboard() {
  try {
    // Refresh user data
    const response = await fetch("/user/profile");
    const userData = await response.json();

    // Update current user data
    currentUser = userData;

    // Update credits display
    userCredits.textContent = userData.credits;

    // Update scan history
    loadScanHistory(userData.scans);

    // Update credit requests
    loadCreditRequests(userData.creditRequests);

    // Setup scan form
    setupScanForm();

    // Setup credit request modal
    setupCreditRequestModal();

    // Setup export history button
    setupExportHistory();
  } catch (error) {
    console.error("Error loading user dashboard:", error);
  }
}

// Load scan history
function loadScanHistory(scans) {
  scanHistoryList.innerHTML = "";

  if (scans.length === 0) {
    scanHistoryList.innerHTML =
      '<div class="empty-message">No scan history yet.</div>';
    return;
  }

  // Sort by timestamp (newest first)
  scans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  scans.forEach((scan) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";

    const scanDate = new Date(scan.timestamp).toLocaleString();

    historyItem.innerHTML = `
      <div class="scan-name">${scan.documentName}</div>
      <div class="scan-date">${scanDate}</div>
      <div class="scan-matches">Matches: ${scan.matchCount}</div>
      <button class="btn btn-small view-scan-btn" data-scan-id="${scan.id}">View Details</button>
    `;

    // Add event listener to view details button
    historyItem
      .querySelector(".view-scan-btn")
      .addEventListener("click", () => {
        viewScanDetails(scan.id);
      });

    scanHistoryList.appendChild(historyItem);
  });
}

// View scan details
async function viewScanDetails(scanId) {
  try {
    const response = await fetch(`/scan/matches/${scanId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch scan details");
    }

    const scanData = await response.json();

    // Display results
    showScanResults(scanData);
  } catch (error) {
    console.error("Error fetching scan details:", error);
    alert("Failed to load scan details. Please try again.");
  }
}

// Show scan results
function showScanResults(scanData) {
  scanResults.classList.remove("hidden");
  resultsContainer.innerHTML = "";

  const header = document.createElement("div");
  header.className = "scan-header";
  header.innerHTML = `
    <h4>${scanData.documentName}</h4>
    <div class="scan-date">Scanned on: ${new Date(
      scanData.timestamp
    ).toLocaleString()}</div>
  `;
  resultsContainer.appendChild(header);

  if (!scanData.matches || scanData.matches.length === 0) {
    const noMatches = document.createElement("div");
    noMatches.className = "no-matches";
    noMatches.textContent = "No similar documents found.";
    resultsContainer.appendChild(noMatches);
    return;
  }

  // Display matches
  scanData.matches.forEach((match) => {
    const matchItem = document.createElement("div");
    matchItem.className = "result-item";
    matchItem.innerHTML = `
      <div class="match-file">${match.filename}</div>
      <div class="match-similarity">Similarity: ${(
        match.similarity * 100
      ).toFixed(1)}%</div>
    `;
    resultsContainer.appendChild(matchItem);
  });

  // Scroll to results
  scanResults.scrollIntoView({ behavior: "smooth" });
}

// Setup scan form
function setupScanForm() {
  scanForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("document-upload");
    const file = fileInput.files[0];
    const submitButton = scanForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = "Processing...";

    if (!file) {
      alert("Please select a file to scan");
      submitButton.disabled = false;
      submitButton.textContent = "Scan Document";
      return;
    }

    // Check file type
    const validTypes = [".txt", ".pdf", "text/plain", "application/pdf"];
    const fileType = file.type;
    const fileExt = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!validTypes.includes(fileType) && !validTypes.includes(fileExt)) {
      alert("Only TXT and PDF files are supported");
      submitButton.disabled = false;
      submitButton.textContent = "Scan Document";
      return;
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append("document", file);

      // Submit for scanning
      const response = await fetch("/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to scan document");
      }

      const result = await response.json();

      // Update credits
      currentUser.credits = result.creditsRemaining;
      updateUserInfo();
      userCredits.textContent = result.creditsRemaining;

      // Show results
      showScanResults({
        documentName: file.name,
        timestamp: new Date().toISOString(),
        matches: result.matches,
      });

      // Reset form
      fileInput.value = "";

      // Re-enable button after successful scan
      submitButton.disabled = false;
      submitButton.textContent = "Scan Document";

      // Refresh user dashboard to show updated history
      loadUserDashboard();
    } catch (error) {
      console.error("Error scanning document:", error);
      alert(error.message || "Failed to scan document. Please try again.");

      // Re-enable button after error
      submitButton.disabled = false;
      submitButton.textContent = "Scan Document";
    }
  });
}

// Load credit requests
function loadCreditRequests(requests) {
  creditRequestsList.innerHTML = "";

  if (requests.length === 0) {
    creditRequestsList.innerHTML =
      '<div class="empty-message">No credit requests yet.</div>';
    return;
  }

  // Sort by request date (newest first)
  requests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

  requests.forEach((request) => {
    const requestItem = document.createElement("div");
    requestItem.className = "request-item";

    const requestDate = new Date(request.requestDate).toLocaleString();
    const responseDate = request.responseDate
      ? new Date(request.responseDate).toLocaleString()
      : "N/A";

    requestItem.innerHTML = `  
      <div class="request-amount">Credits: ${request.amount}</div>
      <div class="request-date">Requested: ${requestDate}</div>
      <div class="request-status status-${request.status}">Status: ${request.status}</div>
      <div class="request-response-date">Response: ${responseDate}</div>
    `;

    creditRequestsList.appendChild(requestItem);
  });
}

// Setup credit request modal
function setupCreditRequestModal() {
  // Open modal
  requestCreditsBtn.addEventListener("click", () => {
    requestCreditsModal.style.display = "block";
    creditRequestForm.reset(); // Reset form when opening
  });

  // Close modal
  closeModalBtn.addEventListener("click", () => {
    requestCreditsModal.style.display = "none";
    creditRequestForm.reset();
  });

  // Close modal on outside click
  window.addEventListener("click", (e) => {
    if (e.target === requestCreditsModal) {
      requestCreditsModal.style.display = "none";
      creditRequestForm.reset();
    }
  });

  // Submit credit request - Fixed version to prevent duplicates
  creditRequestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Check if already submitting to prevent double-clicks
    const submitButton = creditRequestForm.querySelector(
      'button[type="submit"]'
    );
    if (submitButton.disabled) return;

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    const amount = document.getElementById("credits-amount").value;
    const reason = document.getElementById("credits-reason").value;

    try {
      const response = await fetch("/credits/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit request");
      }

      // Hide modal first
      requestCreditsModal.style.display = "none";

      // Show non-blocking notification instead of alert
      showNotification("Credit request submitted successfully", "success");

      // Reset form
      creditRequestForm.reset();

      // Refresh user dashboard after a short delay
      setTimeout(() => {
        loadUserDashboard();
      }, 300);
    } catch (error) {
      console.error("Error submitting credit request:", error);
      showNotification("Failed to submit request. Please try again.", "error");
    } finally {
      // Re-enable button regardless of outcome
      submitButton.disabled = false;
      submitButton.textContent = "Submit Request";
    }
  });
}

// Add this helper function for showing notifications
function showNotification(message, type) {
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => {
    document.body.removeChild(notification);
  });

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${
    type === "success" ? "approve" : "deny"
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show and hide with animation
  setTimeout(() => {
    notification.classList.add("show");
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode === document.body) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }, 10);
}

// Setup export history button
function setupExportHistory() {
  exportHistoryBtn.addEventListener("click", () => {
    window.location.href = "/user/export-history";
  });
}

// Admin dashboard functionality
async function loadAdminDashboard() {
  try {
    // Load analytics data
    const analyticsResponse = await fetch("/admin/analytics");
    const analyticsData = await analyticsResponse.json();

    // Display analytics
    displayAnalytics(analyticsData);

    // Load credit requests
    const requestsResponse = await fetch("/admin/credit-requests");
    const creditRequests = await requestsResponse.json();

    // Display credit requests
    displayCreditRequests(creditRequests);

    // Load users
    const usersResponse = await fetch("/admin/users");
    const users = await usersResponse.json();

    // Display users
    displayUsers(users);
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    alert("Failed to load admin dashboard data.");
  }
}

// Display analytics
function displayAnalytics(data) {
  const analyticsGrid = document.getElementById("analytics-grid");
  analyticsGrid.innerHTML = "";

  // Create analytics cards
  const cards = [
    { label: "Total Scans", value: data.totalScans },
    { label: "Scans (30 Days)", value: data.scansLast30Days },
    { label: "Total Users", value: data.totalUsers },
    { label: "Pending Requests", value: data.pendingCreditRequests },
  ];

  cards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.className = "analytics-card";
    cardElement.innerHTML = `
      <h4>${card.label}</h4>
      <div class="value">${card.value}</div>
    `;

    analyticsGrid.appendChild(cardElement);
  });

  // Add top users card
  if (data.topUsers && data.topUsers.length > 0) {
    const topUsersCard = document.createElement("div");
    topUsersCard.className = "analytics-card top-users";

    let topUsersHtml = `<h4>Top Users</h4><ul class="top-users-list">`;
    data.topUsers.slice(0, 5).forEach((user) => {
      topUsersHtml += `<li>${user.username}: ${user.scanCount} scans</li>`;
    });
    topUsersHtml += `</ul>`;

    topUsersCard.innerHTML = topUsersHtml;
    analyticsGrid.appendChild(topUsersCard);
  }
}

// Display credit requests
function displayCreditRequests(requests) {
  const requestsTable = document.getElementById("admin-credit-requests");
  requestsTable.innerHTML = "";

  if (requests.length === 0) {
    requestsTable.innerHTML =
      '<div class="empty-message">No credit requests.</div>';
    return;
  }

  // Now display ALL requests, not just pending ones
  // But sort them with pending first, then recently processed ones
  const sortedRequests = [...requests].sort((a, b) => {
    // Sort by status (pending first)
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;

    // Then by date (newest first)
    return new Date(b.requestDate) - new Date(a.requestDate);
  });

  // Only show the last 20 requests to keep the UI manageable
  const recentRequests = sortedRequests.slice(0, 20);

  // Show section headers
  const pendingCount = recentRequests.filter(
    (r) => r.status === "pending"
  ).length;

  if (pendingCount === 0) {
    requestsTable.innerHTML =
      '<div class="section-header">No pending requests</div>';

    // Show recently processed requests
    if (recentRequests.length > 0) {
      requestsTable.innerHTML +=
        '<div class="section-header recent-header">Recently Processed Requests</div>';
    } else {
      return; // No requests at all
    }
  }

  // Create table
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Username</th>
        <th>Amount</th>
        <th>Reason</th>
        <th>Date</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;

  const tbody = table.querySelector("tbody");

  // Add rows for all requests
  recentRequests.forEach((request) => {
    const tr = document.createElement("tr");
    const requestDate = new Date(request.requestDate).toLocaleString();

    // Apply different styles based on status
    tr.className = `request-row request-${request.status}`;

    let actionButtons = "";
    if (request.status === "pending") {
      actionButtons = `
        <button class="btn btn-approve" data-request-id="${request.id}">Approve</button>
        <button class="btn btn-deny" data-request-id="${request.id}">Deny</button>
      `;
    } else {
      // For completed requests, show when they were processed
      const responseDate = new Date(request.responseDate).toLocaleString();
      actionButtons = `<span class="processed-date">Processed: ${responseDate}</span>`;
    }

    tr.innerHTML = `
      <td>${request.username}</td>
      <td>${request.amount}</td>
      <td>${request.reason || "N/A"}</td>
      <td>${requestDate}</td>
      <td class="status-${request.status}">${request.status}</td>
      <td>${actionButtons}</td>
    `;

    tbody.appendChild(tr);
  });

  requestsTable.appendChild(table);

  // Add event listeners for approve/deny buttons - only for pending requests
  table.querySelectorAll(".btn-approve").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleCreditRequestAction(btn.dataset.requestId, "approve");
    });
  });

  table.querySelectorAll(".btn-deny").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleCreditRequestAction(btn.dataset.requestId, "deny");
    });
  });
}

// Handle credit request action (approve/deny)
async function handleCreditRequestAction(requestId, action) {
  // Disable the button that was clicked to prevent multiple clicks
  const buttons = document.querySelectorAll(
    `button[data-request-id="${requestId}"]`
  );
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.textContent = action === "approve" ? "Approving..." : "Denying...";
  });

  try {
    const response = await fetch(`/admin/credit-requests/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        adminResponse:
          action === "approve" ? "Request approved" : "Request denied",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} request`);
    }

    const result = await response.json();

    // Update UI without reload - find the row and update it
    const row = document.querySelector(
      `tr:has(button[data-request-id="${requestId}"])`
    );
    if (row) {
      row.classList.remove("request-pending");
      row.classList.add(
        `request-${action === "approve" ? "approved" : "denied"}`
      );

      // Update status cell
      const statusCell = row.querySelector("td:nth-child(5)");
      if (statusCell) {
        statusCell.className = `status-${
          action === "approve" ? "approved" : "denied"
        }`;
        statusCell.textContent = action === "approve" ? "approved" : "denied";
      }

      // Replace action buttons with processed date
      const actionCell = row.querySelector("td:nth-child(6)");
      if (actionCell) {
        const now = new Date().toLocaleString();
        actionCell.innerHTML = `<span class="processed-date">Processed: ${now}</span>`;
      }
    }

    // Show brief notification instead of alert
    const notification = document.createElement("div");
    notification.className = `notification notification-${action}`;
    notification.textContent = `Request ${action}d successfully`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
      setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 2000);
    }, 10);

    // Refresh analytics data silently without full page reload
    const analyticsResponse = await fetch("/admin/analytics");
    const analyticsData = await analyticsResponse.json();
    displayAnalytics(analyticsData);
  } catch (error) {
    console.error(`Error ${action}ing request:`, error);
    alert(`Failed to ${action} request. Please try again.`);

    // Re-enable buttons in case of error
    buttons.forEach((btn) => {
      btn.disabled = false;
      btn.textContent = action === "approve" ? "Approve" : "Deny";
    });
  }
}

// Display users
function displayUsers(users) {
  const usersTable = document.getElementById("users-table");
  usersTable.innerHTML = "";

  if (users.length === 0) {
    usersTable.innerHTML = '<div class="empty-message">No users found.</div>';
    return;
  }

  // Create table
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Username</th>
        <th>Role</th>
        <th>Credits</th>
        <th>Created</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;

  const tbody = table.querySelector("tbody");

  // Add rows for users
  users.forEach((user) => {
    const tr = document.createElement("tr");
    const createdDate = new Date(user.createdAt).toLocaleDateString();

    tr.innerHTML = `
      <td>${user.username}</td>
      <td>${user.role}</td>
      <td>${user.credits}</td>
      <td>${createdDate}</td>
    `;

    tbody.appendChild(tr);
  });

  usersTable.appendChild(table);
}

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus();
});
