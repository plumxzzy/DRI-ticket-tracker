/**
 * DRI Ticket Tracker - Main Application Script
 * Handles all tracking, calculations, and UI updates
 */

// ===== CONFIGURATION CONSTANTS =====
const TRACKER_CONFIG = {
    BUNDLE_COST: 1999,
    POTION_BUNDLE_COST: 1799,
    ROBUX_ACHIEVEMENT_THRESHOLD: 2000,
    LOCAL_STORAGE_PREFIX: 'dri_state_',
    PROFILE_KEY: 'dri_active_profile_id',
    VIEW_COUNT_KEY: 'dri_view_count',
    MIN_PLAYTIME: 0.1,
    DEFAULT_PLAYTIME: 24,
    TICKET_TO_TIME_MULTIPLIER: 5 // Each ticket = 5 minutes
};

// ===== GAMEPASS DATA =====
const gamepasses = [
    { id: "gp_bundle", name: "Gamepass bundle", cost: 1999, isBundle: true, isPotion: false },
    { id: "potion_bundle", name: "Potion Bundle", cost: 1799, isBundle: false, isPotion: true },
    { id: "mvp", name: "MVP", cost: 399, isBundle: false, isPotion: false },
    { id: "glyph", name: "Glyph Hunter", cost: 399, isBundle: false, isPotion: false },
    { id: "rarity", name: "Rarity Master", cost: 399, isBundle: false, isPotion: false },
    { id: "rune", name: "Rune Master", cost: 399, isBundle: false, isPotion: false },
    { id: "essence", name: "Double Essence", cost: 249, isBundle: false, isPotion: false },
    { id: "xp", name: "Triple XP", cost: 249, isBundle: false, isPotion: false },
    { id: "coins", name: "Double Coins", cost: 199, isBundle: false, isPotion: false },
    { id: "vip", name: "VIP", cost: 149, isBundle: false, isPotion: false },
    { id: "lucky", name: "Lucky", cost: 99, isBundle: false, isPotion: false },
    { id: "quick", name: "Quick Roll", cost: 49, isBundle: false, isPotion: false }
];

let isUpdatingCheckboxes = false;

/**
 * Increments and displays the view counter
 * Stores count in localStorage and updates the UI
 */
function updateViewCounter() {
    try {
        // Get current view count from localStorage
        let viewCount = parseInt(localStorage.getItem(TRACKER_CONFIG.VIEW_COUNT_KEY)) || 0;
        
        // Increment by 1
        viewCount++;
        
        // Save back to localStorage
        localStorage.setItem(TRACKER_CONFIG.VIEW_COUNT_KEY, viewCount.toString());
        
        // Update the UI with formatted number
        const viewCountElement = document.getElementById('view-count');
        if (viewCountElement) {
            viewCountElement.innerText = viewCount.toLocaleString();
        }
    } catch (error) {
        console.error('Error updating view counter:', error);
        // Fallback: show error message
        const viewCountElement = document.getElementById('view-count');
        if (viewCountElement) {
            viewCountElement.innerText = 'Error';
        }
    }
}

/**
 * Builds the tracker table UI dynamically from gamepasses array
 * Creates headers and rows for each gamepass with interactive checkboxes
 */
function buildTrackerTableUI() {
    const headersRow = document.getElementById('row-headers');
    const requiredRow = document.getElementById('row-required');
    const remainingRow = document.getElementById('row-remaining');
    const timeRow = document.getElementById('row-time');
    const ownedRow = document.getElementById('row-owned');

    // Initialize header row
    headersRow.innerHTML = "<th>Metric</th>";
    requiredRow.innerHTML = "<td class='row-label'>Tickets Required</td>";
    remainingRow.innerHTML = "<td class='row-label'>Remaining Tickets</td>";
    timeRow.innerHTML = "<td class='row-label'>Time Left</td>";
    ownedRow.innerHTML = "<td class='row-label'>Owned?</td>";

    // Build columns for each gamepass
    gamepasses.forEach(gp => {
        // Header column
        const th = document.createElement('th');
        th.innerText = gp.name;
        headersRow.appendChild(th);

        // Required tickets column
        const tdReq = document.createElement('td');
        tdReq.className = 'td-highlight';
        tdReq.innerText = gp.cost.toLocaleString();
        requiredRow.appendChild(tdReq);

        // Remaining tickets column
        const tdRem = document.createElement('td');
        tdRem.id = `rem-${gp.id}`;
        tdRem.className = 'td-remaining';
        remainingRow.appendChild(tdRem);

        // Time remaining column
        const tdTime = document.createElement('td');
        tdTime.id = `time-${gp.id}`;
        timeRow.appendChild(tdTime);

        // Owned checkbox column
        const tdOwned = document.createElement('td');
        tdOwned.innerHTML = `<input type="checkbox" id="check-${gp.id}" class="checkbox-cell" data-gp-id="${gp.id}">`;
        ownedRow.appendChild(tdOwned);
    });
}

/**
 * Formats minutes into a human-readable time string
 * Examples: "2 hours and 30 minutes" or "1 days, 5 hours and 15 minutes"
 * @param {number} minutes - Time in minutes to format
 * @returns {string} Formatted time string
 */
function formatTime(minutes) {
    if (minutes <= 0) return "0 hours";
    
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);
    
    let str = "";
    if (days > 0) str += `${days} days, `;
    if (hours > 0 || days > 0) str += `${hours} hours and `;
    str += `${mins} minutes`;
    
    return str;
}

/**
 * Handles checkbox state changes with smart bundle logic
 * When bundle is checked, all individual passes are checked
 * When all individual passes are checked, bundle auto-checks
 * @param {string} changedId - ID of the checkbox that changed
 */
function handleCheckboxChange(changedId) {
    if (isUpdatingCheckboxes) return;
    
    isUpdatingCheckboxes = true;
    
    // Get all normal (non-bundle, non-potion) gamepass IDs
    const normalPassIds = gamepasses
        .filter(gp => !gp.isBundle && !gp.isPotion)
        .map(gp => gp.id);

    // If main bundle was toggled, toggle all individual passes
    if (changedId === 'gp_bundle') {
        const bundleStatus = document.getElementById('check-gp_bundle').checked;
        normalPassIds.forEach(id => {
            const el = document.getElementById(`check-${id}`);
            if (el) el.checked = bundleStatus;
        });
    }
    // If an individual pass was toggled, check if all are now checked
    else if (normalPassIds.includes(changedId)) {
        const allNormalsChecked = normalPassIds.every(id => {
            const el = document.getElementById(`check-${id}`);
            return el ? el.checked : false;
        });
        const bundleEl = document.getElementById('check-gp_bundle');
        if (bundleEl) bundleEl.checked = allNormalsChecked;
    }
    
    isUpdatingCheckboxes = false;
    calculateAll();
}

/**
 * Switches the active profile and loads its data
 */
function switchProfile() {
    loadProfileData();
}

/**
 * Main calculation function that updates all tracker metrics
 * Recalculates whenever user changes input or selections
 */
function calculateAll() {
    try {
        // Get current input values with validation
        const currentProfile = document.getElementById('active-profile').value;
        const currentTickets = Math.max(0, parseInt(document.getElementById('current-tickets').value) || 0);
        const includePotion = document.getElementById('include-potion').value === "True";
        const selectedTargetName = document.getElementById('target-gamepass').value;
        const dailyHours = Math.max(TRACKER_CONFIG.MIN_PLAYTIME, parseFloat(document.getElementById('daily-hours').value) || TRACKER_CONFIG.DEFAULT_PLAYTIME);

        // Initialize tracking variables
        let totalRobuxSaved = 0;
        let ownedCount = 0;
        let maxCompletedPossible = includePotion ? 12 : 11;
        let unownedLoosePasesCostSum = 0;
        let unownedLooseCount = 0;
        let nextBestPass = null;

        // Prepare state to save to localStorage
        const saveState = {
            tickets: currentTickets,
            includePotion: includePotion,
            target: selectedTargetName,
            dailyHours: dailyHours,
            owned: {}
        };

        // Process each gamepass
        gamepasses.forEach(gp => {
            const cb = document.getElementById(`check-${gp.id}`);
            const isOwned = cb ? cb.checked : false;
            saveState.owned[gp.id] = isOwned;

            // Calculate remaining tickets needed
            let remaining = Math.max(0, gp.cost - currentTickets);

            if (isOwned) {
                remaining = 0;
                // Add to Robux saved (exclude bundles, respect potion inclusion)
                if (!gp.isBundle) {
                    if (!gp.isPotion || (gp.isPotion && includePotion)) {
                        totalRobuxSaved += gp.cost;
                    }
                }
                // Count toward completion (exclude bundles if not main bundle)
                if (!gp.isPotion || (gp.isPotion && includePotion)) {
                    ownedCount++;
                }
            } else {
                // For unowned normal passes, track for bundle advisor
                if (!gp.isBundle && !gp.isPotion) {
                    unownedLoosePasesCostSum += gp.cost;
                    unownedLooseCount++;
                    // Find cheapest unowned pass for roadmap
                    if (!nextBestPass || gp.cost < nextBestPass.cost) {
                        nextBestPass = gp;
                    }
                }
            }

            // Update table with remaining tickets and time
            const remEl = document.getElementById(`rem-${gp.id}`);
            const timeEl = document.getElementById(`time-${gp.id}`);
            if (remEl) remEl.innerText = remaining.toLocaleString();
            if (timeEl) {
                // Convert remaining tickets to minutes (each ticket = 5 minutes)
                const timeInMinutes = remaining * TRACKER_CONFIG.TICKET_TO_TIME_MULTIPLIER;
                timeEl.innerText = remaining === 0 ? "0 hours" : formatTime(timeInMinutes);
            }
        });

        // Adjust owned count if main bundle is owned
        const mainBundleCb = document.getElementById('check-gp_bundle');
        if (mainBundleCb && mainBundleCb.checked) {
            const potionCb = document.getElementById('check-potion_bundle');
            ownedCount = (includePotion && potionCb && potionCb.checked) ? 12 : 11;
        }

        // Save state to localStorage
        localStorage.setItem(`${TRACKER_CONFIG.LOCAL_STORAGE_PREFIX}${currentProfile}`, JSON.stringify(saveState));
        localStorage.setItem(TRACKER_CONFIG.PROFILE_KEY, currentProfile);

        // Update stats display
        updateStatsDisplay(ownedCount, maxCompletedPossible, totalRobuxSaved);

        // Update roadmap suggestion
        updateRoadmapSuggestion(mainBundleCb, unownedLooseCount, nextBestPass, currentTickets);

        // Update bundle advisor
        updateBundleAdvisor(mainBundleCb, unownedLooseCount, unownedLoosePasesCostSum);

        // Update target analytics
        updateTargetAnalytics(selectedTargetName, currentTickets, dailyHours);

        // Update achievements
        updateAchievements(ownedCount, maxCompletedPossible, totalRobuxSaved);
    } catch (error) {
        console.error('Error in calculateAll():', error);
    }
}

/**
 * Updates the stats panel with current progress
 */
function updateStatsDisplay(ownedCount, maxCompletedPossible, totalRobuxSaved) {
    document.getElementById('stat-completed').innerText = `${ownedCount} of ${maxCompletedPossible}`;
    document.getElementById('stat-robux').innerText = `${totalRobuxSaved.toLocaleString()} R$`;
    
    const progressPercent = Math.min(Math.round((ownedCount / maxCompletedPossible) * 100), 100);
    document.getElementById('stat-progress').innerText = `${progressPercent}%`;
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;
}

/**
 * Updates the roadmap suggestion based on progress
 */
function updateRoadmapSuggestion(mainBundleCb, unownedLooseCount, nextBestPass, currentTickets) {
    const roadmapText = document.getElementById('roadmap-suggestion');
    
    if ((mainBundleCb && mainBundleCb.checked) || unownedLooseCount === 0) {
        // All passes owned
        roadmapText.innerHTML = "🎉 <span class='text-success'>All base gamepasses unlocked! You master the grind.</span>";
    } else if (nextBestPass) {
        if (currentTickets >= nextBestPass.cost) {
            // Ready to buy next pass
            roadmapText.innerHTML = `🔥 Ready to unlock: Buy <span class='text-primary font-bold'>${nextBestPass.name}</span> right now!`;
        } else {
            // Show progress toward next pass
            const ticketsNeeded = nextBestPass.cost - currentTickets;
            roadmapText.innerHTML = `⛏️ Next easiest goal: <span class='text-primary font-bold'>${nextBestPass.name}</span>. Need <span class='text-amber'>${ticketsNeeded.toLocaleString()} more</span>`;
        }
    }
}

/**
 * Updates the bundle advisor with buy/skip recommendation
 */
function updateBundleAdvisor(mainBundleCb, unownedLooseCount, unownedLoosePasesCostSum) {
    const advisorText = document.getElementById('bundle-advisor-text');
    const advisorBox = document.getElementById('bundle-advisor-box');
    
    if ((mainBundleCb && mainBundleCb.checked) || unownedLooseCount === 0) {
        // Bundle complete
        advisorText.innerHTML = "Bundle completed.";
        advisorBox.style.borderLeftColor = "var(--border-color)";
    } else {
        // Recommend bundle or individual purchase
        if (unownedLoosePasesCostSum > TRACKER_CONFIG.BUNDLE_COST) {
            // Bundle is cheaper
            const savings = unownedLoosePasesCostSum - TRACKER_CONFIG.BUNDLE_COST;
            advisorText.innerHTML = `✅ <span class='text-success font-bold'>BUY THE BUNDLE!</span> Saves ${savings.toLocaleString()} tkts.`;
            advisorBox.style.borderLeftColor = "var(--green-glow)";
        } else {
            // Individual purchases are better
            const waste = TRACKER_CONFIG.BUNDLE_COST - unownedLoosePasesCostSum;
            advisorText.innerHTML = `❌ <span class='text-danger font-bold'>BUY SEPARATELY!</span> Bundle wastes ${waste.toLocaleString()} tkts.`;
            advisorBox.style.borderLeftColor = "var(--red-glow)";
        }
    }
}

/**
 * Updates target analytics panel with finish date prediction
 */
function updateTargetAnalytics(selectedTargetName, currentTickets, dailyHours) {
    const targetObj = gamepasses.find(gp => gp.name === selectedTargetName);
    
    if (!targetObj) return;
    
    const targetCheck = document.getElementById(`check-${targetObj.id}`);
    const isTargetOwned = targetCheck ? targetCheck.checked : false;
    let targetRem = Math.max(0, targetObj.cost - currentTickets);
    
    document.getElementById('target-rem').innerText = isTargetOwned ? "0" : targetRem.toLocaleString();

    if (isTargetOwned) {
        document.getElementById('target-date').innerText = "Already Owned! 🎉";
    } else if (targetRem === 0) {
        document.getElementById('target-date').innerText = "COMPLETED! 🎉";
    } else {
        // Calculate finish date
        const timeInMinutes = (targetRem * TRACKER_CONFIG.TICKET_TO_TIME_MULTIPLIER) / 60 / dailyHours * 24 * 60;
        let finishDate = new Date();
        finishDate.setMinutes(finishDate.getMinutes() + timeInMinutes);
        
        if (!isNaN(finishDate.getTime())) {
            const dateStr = `${finishDate.getFullYear()}-${String(finishDate.getMonth() + 1).padStart(2, '0')}-${String(finishDate.getDate()).padStart(2, '0')}`;
            document.getElementById('target-date').innerText = dateStr;
        } else {
            document.getElementById('target-date').innerText = "-";
        }
    }
}

/**
 * Updates achievement unlock status based on progress
 */
function updateAchievements(ownedCount, maxCompletedPossible, totalRobuxSaved) {
    // First Step: Own at least 1 gamepass
    document.getElementById('ach-first').classList.toggle('unlocked', ownedCount >= 1);
    
    // Heavy Grinder: Own 5 or more gamepasses
    document.getElementById('ach-half').classList.toggle('unlocked', ownedCount >= 5);
    
    // Robux King: Save more than 2,000 Robux
    document.getElementById('ach-rich').classList.toggle('unlocked', totalRobuxSaved > TRACKER_CONFIG.ROBUX_ACHIEVEMENT_THRESHOLD);
    
    // Maxed Out: Complete all available goals
    document.getElementById('ach-max').classList.toggle('unlocked', ownedCount === maxCompletedPossible);
}

/**
 * Loads profile data from localStorage
 * @param {string} [profile] - Optional specific profile to load
 */
function loadProfileData(profile) {
    try {
        const currentProfile = profile || document.getElementById('active-profile').value;
        const rawData = localStorage.getItem(`${TRACKER_CONFIG.LOCAL_STORAGE_PREFIX}${currentProfile}`);
        
        // Reset all checkboxes
        isUpdatingCheckboxes = true;
        gamepasses.forEach(gp => {
            const cb = document.getElementById(`check-${gp.id}`);
            if (cb) cb.checked = false;
        });
        isUpdatingCheckboxes = false;

        if (rawData) {
            const data = JSON.parse(rawData);
            
            // Validate data structure
            if (typeof data.tickets !== 'number' || !data.owned) {
                throw new Error('Invalid profile data structure');
            }
            
            // Load input values
            document.getElementById('current-tickets').value = data.tickets || 0;
            document.getElementById('include-potion').value = data.includePotion ? "True" : "False";
            document.getElementById('target-gamepass').value = data.target || "Gamepass bundle";
            document.getElementById('daily-hours').value = data.dailyHours || TRACKER_CONFIG.DEFAULT_PLAYTIME;

            // Load checkbox states
            if (data.owned) {
                isUpdatingCheckboxes = true;
                Object.keys(data.owned).forEach(id => {
                    const cb = document.getElementById(`check-${id}`);
                    if (cb) cb.checked = data.owned[id];
                });
                isUpdatingCheckboxes = false;
            }
        } else {
            // Set defaults for new profile
            document.getElementById('current-tickets').value = 0;
            document.getElementById('include-potion').value = "False";
            document.getElementById('target-gamepass').value = "Gamepass bundle";
            document.getElementById('daily-hours').value = TRACKER_CONFIG.DEFAULT_PLAYTIME;
        }
        
        calculateAll();
    } catch (error) {
        console.error('Error loading profile data:', error);
        // Fall back to defaults on error
        resetToDefaults();
    }
}

/**
 * Resets tracker to default values
 */
function resetToDefaults() {
    document.getElementById('current-tickets').value = 0;
    document.getElementById('include-potion').value = "False";
    document.getElementById('target-gamepass').value = "Gamepass bundle";
    document.getElementById('daily-hours').value = TRACKER_CONFIG.DEFAULT_PLAYTIME;
    
    isUpdatingCheckboxes = true;
    gamepasses.forEach(gp => {
        const cb = document.getElementById(`check-${gp.id}`);
        if (cb) cb.checked = false;
    });
    isUpdatingCheckboxes = false;
    
    calculateAll();
}

/**
 * Initialize the application on DOM load
 */
document.addEventListener("DOMContentLoaded", function() {
    // Update view counter on page load
    updateViewCounter();
    
    // Build the table UI
    buildTrackerTableUI();
    
    // Set up event delegation for checkbox changes
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('checkbox-cell')) {
            const gpId = e.target.getAttribute('data-gp-id');
            if (gpId) handleCheckboxChange(gpId);
        }
    });
    
    // Set up event listeners for form inputs
    document.getElementById('active-profile').addEventListener('change', switchProfile);
    document.getElementById('current-tickets').addEventListener('input', calculateAll);
    document.getElementById('include-potion').addEventListener('change', calculateAll);
    document.getElementById('daily-hours').addEventListener('change', calculateAll);
    document.getElementById('target-gamepass').addEventListener('change', calculateAll);
    
    // Load the last active profile
    const lastActiveProfile = localStorage.getItem(TRACKER_CONFIG.PROFILE_KEY);
    if (lastActiveProfile) {
        document.getElementById('active-profile').value = lastActiveProfile;
    }
    
    // Initialize with profile data
    loadProfileData();
});