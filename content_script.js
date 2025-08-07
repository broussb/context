// /Users/t/Desktop/bissell-context-viewer-extension/content_script.js

console.log('[BISSELL Context CS] Content script injected into:', window.location.href);

const CONTEXT_DISPLAY_ID = 'sierra-context-display-area';
// --- IMPORTANT: These selectors are placeholders! ---
// You MUST inspect the Five9 interface during an active call
// and replace these with the actual selectors for the elements
// containing the phone number and where you want to inject the context.
const PHONE_NUMBER_SELECTOR = '#sfli-header-call-info h1.main-heading'; // Updated based on user HTML
const INJECTION_POINT_SELECTOR = '#\\33rdPartyComp-li-call-bottom';        // Updated based on user HTML, escaped leading digit

let currentPhoneNumber = null;
let contextDisplayDiv = null;
let observer = null;
let lastContext = ''; // Store last received context locally

/**
 * Finds the injection point element.
 * @returns {HTMLElement|null} The injection point element or null if not found.
 */
function findInjectionPoint() {
    try {
        // Use the potentially escaped selector
        return document.querySelector(INJECTION_POINT_SELECTOR);
    } catch (e) {
        console.error('[BISSELL Context CS] Error finding injection point with selector:', INJECTION_POINT_SELECTOR, e);
        // Try the unescaped version as a fallback, just in case the escaping wasn't needed in some contexts
        try {
            const unescapedSelector = INJECTION_POINT_SELECTOR.replace('\\33', '3');
            return document.querySelector(unescapedSelector);
        } catch (e2) {
            console.error('[BISSELL Context CS] Error finding injection point with unescaped selector either:', e2);
            return null;
        }
    }
}

/**
 * Creates the context display div if it doesn't exist.
 */
function ensureContextDivCreated() {
    if (!contextDisplayDiv) {
        contextDisplayDiv = document.createElement('div');
        contextDisplayDiv.id = CONTEXT_DISPLAY_ID;
        // Basic styling (can be customized)
        contextDisplayDiv.style.border = '1px solid #ccc';
        contextDisplayDiv.style.padding = '10px';
        contextDisplayDiv.style.marginTop = '10px'; // Add some space
        contextDisplayDiv.style.marginBottom = '10px'; // Add some space
        contextDisplayDiv.style.backgroundColor = '#f9f9f9';
        contextDisplayDiv.style.color = '#333';
        contextDisplayDiv.style.fontSize = '12px';
        contextDisplayDiv.style.wordWrap = 'break-word';
        contextDisplayDiv.textContent = 'Loading context...';
        console.log('[BISSELL Context CS] Created context display div element.');
    }
}

/**
 * Ensures the context display div is appended to the injection point.
 * Creates the div if necessary.
 * @returns {boolean} True if appended successfully, false otherwise.
 */
function ensureContextDivAppended() {
    ensureContextDivCreated(); // Make sure the div element exists

    const injectionPointElement = findInjectionPoint();
    if (!injectionPointElement) {
        console.warn(`[BISSELL Context CS] Injection point not found: ${INJECTION_POINT_SELECTOR} Cannot append context display.`);
        return false;
    }

    // Check if it's already appended correctly
    if (contextDisplayDiv.parentNode === injectionPointElement) {
        console.log('[BISSELL Context CS] Context display div is already appended to the injection point.');
        return true; // Already in the right place
    }

    // Append/re-append if not in the right place or detached
    try {
        injectionPointElement.appendChild(contextDisplayDiv);
        console.log('[BISSELL Context CS] Appended/Re-appended context display to:', INJECTION_POINT_SELECTOR);
        return true;
    } catch (e) {
        console.error('[BISSELL Context CS] Error appending context display:', e);
        return false;
    }
}

/**
 * Displays the fetched context in the designated area.
 * Ensures the display area exists and is attached.
 * @param {string} context The context string to display.
 * @param {boolean} isError Whether the context is an error message.
 */
function displayContext(context, isError = false) { // Accept error flag
    console.log(`[BISSELL Context CS] Received context to display: ${context}, IsError: ${isError}`);
    lastContext = context; // Store context locally (can be null or error string)

    // If context is null (404) OR if it's an error message, clear the display
    if (context === null || isError) {
        console.log('[BISSELL Context CS] Received null context or error flag. Clearing display.');
        clearContextDisplay();
        return;
    }

    // If context exists, ensure div is appended and display it
    if (ensureContextDivAppended()) { // This handles creation and appending/re-appending
        let formattedHtml = '<h4>Sierra Context:</h4>';

        if (context) {
            // Sanitize function
            const sanitize = (text) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            // Split entries, sanitize each, and join with <hr>
            const entries = context.split('\n\n');
            const sanitizedEntries = entries.map(entry => sanitize(entry).replace(/\n/g, '<br>')); // Also handle single newlines within an entry
            formattedHtml += `<p>${sanitizedEntries.join('<br><hr style="border-top: 1px dashed #ccc; margin: 5px 0;"><br>')}</p>`;
        } else {
            formattedHtml += '<p>No context found for this number.</p>';
        }

        contextDisplayDiv.innerHTML = formattedHtml; // Use innerHTML to render formatting
        console.log('[BISSELL Context CS] Context displayed with HTML formatting.');
    } else {
        console.error('[BISSELL Context CS] Failed to ensure context display was appended.');
    }
}

/**
 * Removes the context display div from the DOM and resets state.
 */
function clearContextDisplay() {
    if (contextDisplayDiv && contextDisplayDiv.parentNode) {
        contextDisplayDiv.parentNode.removeChild(contextDisplayDiv);
        console.log('[BISSELL Context CS] Context display removed.');
    }
    // Don't reset contextDisplayDiv itself, as ensureContextDivAppended might need it
    // contextDisplayDiv = null; // Keep the element reference
    currentPhoneNumber = null; // Reset phone number
    lastContext = ''; // Clear stored context
}

/**
 * Checks the DOM for the phone number element.
 * @returns {string|null} The phone number found, or null.
 */
function checkForPhoneNumber() {
    const phoneNumberElement = document.querySelector(PHONE_NUMBER_SELECTOR);
    // Additional check: Ensure the element is visible, as Five9 might hide/show elements
    if (phoneNumberElement && phoneNumberElement.offsetParent !== null) {
        return phoneNumberElement.textContent.trim();
    }
    return null;
}

/**
 * Handles DOM mutations to detect phone number changes and ensure UI persistence.
 */
function handleMutations(mutationsList, observer) {
    // Rate limiting/debouncing could be added here if performance becomes an issue

    const newPhoneNumber = checkForPhoneNumber();

    // Scenario 1: Call ended or phone number element disappeared/hidden
    if (!newPhoneNumber && currentPhoneNumber) {
        console.log('[BISSELL Context CS] Phone number element not found or hidden. Assuming call ended.');
        clearContextDisplay();
    }
    // Scenario 2: New call detected or phone number changed
    else if (newPhoneNumber && newPhoneNumber !== currentPhoneNumber) {
        console.log(`[BISSELL Context CS] Phone number detected/changed: ${newPhoneNumber}`);
        currentPhoneNumber = newPhoneNumber;
        lastContext = null; // Reset last context to null for the new number

        // **Explicitly remove old display if it exists**
        if (contextDisplayDiv) {
            console.log('[BISSELL Context CS] Removing existing context display div for new number.');
            contextDisplayDiv.remove();
            contextDisplayDiv = null;
        }

        // Send message to background script to fetch context
        chrome.runtime.sendMessage({ action: 'FETCH_CONTEXT', phoneNumber: currentPhoneNumber }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`[BISSELL Context CS] Error sending FETCH_CONTEXT: ${chrome.runtime.lastError.message}`);
                // Maybe clear display here too? Or rely on a potential error message back?
                clearContextDisplay(); // Clear display on send error
                return;
            }
            console.log('[BISSELL Context CS] FETCH_CONTEXT message sent, acknowledged:', response);
        });
    }
    // Scenario 3: Call active, phone number unchanged, but our UI element might have been removed by DOM manipulation
    else if (currentPhoneNumber && contextDisplayDiv && !document.body.contains(contextDisplayDiv)) {
        console.warn('[BISSELL Context CS] Context display div detached from DOM. Re-attaching.');
        // Attempt to re-append the existing div
        if (ensureContextDivAppended()) {
            // Re-apply HTML formatting using the stored lastContext
            if (lastContext) {
                let formattedHtml = '<h4>Sierra Context:</h4>';
                const sanitize = (text) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const entries = lastContext.split('\n\n');
                const sanitizedEntries = entries.map(entry => sanitize(entry).replace(/\n/g, '<br>'));
                formattedHtml += `<p>${sanitizedEntries.join('<br><hr style="border-top: 1px dashed #ccc; margin: 5px 0;"><br>')}</p>`;
                contextDisplayDiv.innerHTML = formattedHtml; // Use innerHTML here too
            }
        } else {
            console.warn('[BISSELL Context CS] Could not re-append context display.');
        }
    }
    // Scenario 4: Call active, phone number unchanged, UI element exists - do nothing
}

// --- Initialization --- //

function initializeObserver() {
    if (observer) {
        observer.disconnect(); // Disconnect previous observer if exists
    }
    console.log('[BISSELL Context CS] Initializing MutationObserver on document body.');
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
        childList: true, // Observe direct children additions/removals
        subtree: true,   // Observe all descendants
        characterData: true, // Observe text changes (useful if number changes within the same element)
        attributes: true, // Observe attribute changes (like 'style' or 'class' that might hide elements)
        attributeFilter: ['style', 'class', 'hidden'] // Be more specific if needed
    });

    // Initial check in case the call is already active when the script loads
    handleMutations([], observer); // Trigger initial check
}

// --- Message Listener --- //

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[BISSELL Context CS] Received message from background:', message);

    if (message.action === 'DISPLAY_CONTEXT') {
        // **CRITICAL CHECK:** Only process if the message is for the currently tracked number
        if (message.phoneNumber !== currentPhoneNumber) {
            console.warn(`[BISSELL Context CS] Received context for ${message.phoneNumber}, but current number is ${currentPhoneNumber}. Ignoring.`);
            sendResponse({ status: `Ignored, current number is ${currentPhoneNumber}`});
            return;
        }

        console.log(`[BISSELL Context CS] Processing DISPLAY_CONTEXT for ${message.phoneNumber}`);
        displayContext(message.context, message.error || false); // Pass context and error flag
        sendResponse({ status: `Context display triggered for ${message.phoneNumber}` });
    } else {
        console.log('[BISSELL Context CS] Received unknown message action:', message.action);
        sendResponse({ status: 'Unknown action' });
    }
    // Keep the message channel open for asynchronous response (though we send sync here)
    return true;
});

// Start observing the DOM
// We might need a slight delay or wait for document ready state?
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeObserver);
} else {
    initializeObserver();
}

console.log('[BISSELL Context CS] Content script loaded and observer initialized.');
