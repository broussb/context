// /Users/t/Desktop/bissell-context-viewer-extension/background.js

const CONTEXT_WORKER_URL_BASE = 'https://bissell-sierra-context-transfer.partner-data.workers.dev/context/';

console.log('[BISSELL Context BG] Background script loaded.');

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BISSELL Context BG] Received message:', message);

  // Handle FETCH_CONTEXT message from content script
  if (message.action === 'FETCH_CONTEXT' && message.phoneNumber && sender.tab?.id) {
    console.log(`[BISSELL Context BG] Action is FETCH_CONTEXT for ${message.phoneNumber}. Calling fetchContextFromWorker.`);
    const phoneNumber = message.phoneNumber;
    const tabId = sender.tab.id;

    console.log(`[BISSELL Context BG] Received message: `, message);
    // Acknowledge the message immediately to prevent 'message port closed' errors
    // The actual context will be sent later via chrome.tabs.sendMessage
    sendResponse({ success: true, received: true }); 

    // Call fetchContextFromWorker asynchronously
    fetchContextFromWorker(phoneNumber, tabId) // Pass the correct phone number
      .then(context => {
          // Check if the tab still exists before sending
          chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError || !tab) {
                  console.warn(`[BISSELL Context BG] Tab ${tabId} not found or closed before sending context for ${phoneNumber}.`);
                  return;
              }
              // Send the result back
              console.log(`[BISSELL Context BG] Attempting to send DISPLAY_CONTEXT to tab ${tabId} for ${phoneNumber} with context:`, context); // Log number too
              chrome.tabs.sendMessage(
                  tabId,
                  // Ensure phoneNumber from closure is used
                  { action: 'DISPLAY_CONTEXT', context: context, phoneNumber: phoneNumber },
                  (response) => {
                      if (chrome.runtime.lastError) {
                          console.error(`[BISSELL Context BG] Error sending DISPLAY_CONTEXT message to tab ${tabId} for ${phoneNumber}:`, chrome.runtime.lastError.message);
                      } else {
                          console.log(`[BISSELL Context BG] DISPLAY_CONTEXT message for ${phoneNumber} acknowledged by tab ${tabId}. Response:`, response);
                      }
                  }
              );
          });
      })
      .catch(error => {
          console.error(`[BISSELL Context BG] Error object caught processing FETCH_CONTEXT for ${phoneNumber} in tab ${tabId}:`, error); // Log full error object
          const errorMessage = error instanceof Error ? error.message : String(error); // Safe message extraction

          // Check if the tab still exists before sending error
           chrome.tabs.get(tabId, (tab) => {
               if (chrome.runtime.lastError || !tab) {
                  console.warn(`[BISSELL Context BG] Tab ${tabId} not found or closed before sending ERROR for ${phoneNumber}.`);
                  return;
               }
              console.log(`[BISSELL Context BG] Attempting to send ERROR context to tab ${tabId} for ${phoneNumber}`);
              chrome.tabs.sendMessage(
                  tabId,
                  // Ensure phoneNumber from closure is used
                  { action: 'DISPLAY_CONTEXT', context: `Error: ${errorMessage}`, phoneNumber: phoneNumber, error: true },
                  (response) => {
                       if (chrome.runtime.lastError) {
                           console.error(`[BISSELL Context BG] Error sending ERROR context message to tab ${tabId} for ${phoneNumber}:`, chrome.runtime.lastError.message);
                       } else {
                          console.log(`[BISSELL Context BG] ERROR context message for ${phoneNumber} acknowledged by tab ${tabId}. Response:`, response);
                       }
                  }
              );
           });
      });
    // Indicate that the response will be sent asynchronously
    return true;
  }

  // Default response if message type is not handled
  sendResponse({ success: false, error: 'Unhandled message action' });
  return false; // No async response planned for other actions
});

/**
 * Fetches context summary from the Cloudflare worker for a given phone number.
 * @param {string} phoneNumber The phone number to look up.
 * @param {number} tabId The ID of the tab requesting the context.
 * @returns {Promise<string|null>} Resolves with the context string or null if not found.
 */
async function fetchContextFromWorker(phoneNumber, tabId) {
  console.log(`[BISSELL Context BG] Starting fetchContextFromWorker for phone: ${phoneNumber}, Tab ID: ${tabId}`); 
  const workerUrl = CONTEXT_WORKER_URL_BASE + phoneNumber; 
  console.log(`[BISSELL Context BG] Fetching context from Worker URL: ${workerUrl}`);

  try {
    const response = await fetch(workerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json' 
      }
    });
    console.log(`[BISSELL Context BG] Fetch response status: ${response.status} for ${phoneNumber}`); 

    if (!response.ok) {
      // Check specifically for 404
      if (response.status === 404) {
        console.log(`[BISSELL Context BG] No context found (404) for ${phoneNumber}. Returning null.`);
        return null; // Signal no context found
      }
      // Handle other errors
      const errorText = await response.text();
      console.error(`[BISSELL Context BG] Worker fetch error ${response.status}: ${errorText}`);
      throw new Error(`Worker error: ${response.status} - ${errorText}`);
    }

    // Read the response body as plain text
    const context = await response.text(); 
    console.log(`[BISSELL Context BG] Context successfully retrieved as text for ${phoneNumber}.`);

    console.log(`[BISSELL Context BG] Attempting to send DISPLAY_CONTEXT to tab ${tabId}`); 
    chrome.tabs.sendMessage(
      tabId,
      { action: 'DISPLAY_CONTEXT', context: context, phoneNumber: phoneNumber },
      (response) => {
         if (chrome.runtime.lastError) {
             console.error(`[BISSELL Context BG] Error sending DISPLAY_CONTEXT to tab ${tabId}:`, chrome.runtime.lastError.message); 
         } else {
             console.log(`[BISSELL Context BG] DISPLAY_CONTEXT message acknowledged by tab ${tabId}. Response:`, response); 
         }
      }
    );
    return context; 

  } catch (error) {
    console.error(`[BISSELL Context BG] Error during fetch or processing for ${phoneNumber}:`, error);
    console.log(`[BISSELL Context BG] Attempting to send ERROR_CONTEXT to tab ${tabId}`); 
    chrome.tabs.sendMessage(
      tabId,
      { action: 'DISPLAY_CONTEXT', context: `Error fetching context: ${error.message}`, phoneNumber: phoneNumber, error: true },
       (response) => {
         if (chrome.runtime.lastError) {
             console.error(`[BISSELL Context BG] Error sending ERROR_CONTEXT message to tab ${tabId}:`, chrome.runtime.lastError.message); 
         } else {
             console.log(`[BISSELL Context BG] ERROR_CONTEXT message acknowledged by tab ${tabId}.`); 
         }
       }
    );
    throw error; 
  }
}

// --- Optional: Basic Popup Logic ---
// If you want the popup to do something, you might add listeners here
// or handle messages from popup.js. For now, it just opens popup.html.

console.log('[BISSELL Context BG] Background script initialized.');
