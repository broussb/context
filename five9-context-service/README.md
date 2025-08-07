# Five9 Context Service

This web service acts as an intermediary to fetch context from an external source and attach it to a call in Five9 as a call variable. It is designed to replace the previous Chrome Extension-based solution with a more robust, server-side integration.

## How it Works

1.  A call arrives in your Five9 environment.
2.  An IVR script is configured to make a `GET` request to this web service's `/api/context` endpoint, passing the caller's phone number (`phoneNumber`), the Five9 call ID (`callId`), and the agent's ID (`agentId`).
3.  This service receives the request and fetches the relevant context from the Bissell-Sierra context provider.
4.  The service then uses the Five9 Agent REST API to update a custom call variable (e.g., `SierraContext`) with the fetched context.
5.  When the call is routed to an agent, the context is displayed directly in their agent desktop interface.

## Setup and Installation

### 1. Run the Service

First, you need to deploy and run this Node.js application. You can host it on any platform of your choice (e.g., Heroku, AWS, a private server).

To run the service locally:

```bash
# Navigate to the service directory
cd five9-context-service

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 3000 by default.

### 2. Configure Environment Variables

This service requires a `.env` file for configuration for the Five9 API integration. Create a file named `.env` in the `five9-context-service` directory.

```
# .env file

# The base URL for your Five9 instance (e.g., https://app.five9.com)
FIVE9_API_URL=https://app.five9.com

# Your Five9 API Bearer Token. This is obtained from a successful login request.
# See the Five9 Agent and Supervisor REST APIs Developer's Guide for details.
FIVE9_API_TOKEN=your_api_bearer_token
```

## Five9 Configuration Steps

A Five9 administrator needs to perform the following steps to enable this integration.

### Step 1: Create a Call Variable

1.  Log in to the Five9 VCC Administrator application.
2.  Navigate to **Call Variables** in the navigation pane.
3.  Create a new call variable.
    *   **Name:** `SierraContext` (You can choose another name, but you must update it in `server.js`)
    *   **Data Type:** `String`
    *   **Description:** "Stores the context transferred from the Bissell-Sierra service."
4.  Save the new call variable.

### Step 2: Configure the IVR Script

You need to modify your inbound IVR script to call this web service.

1.  Open the relevant IVR script in the Five9 IVR Script Editor.
2.  At the beginning of the script (or wherever is appropriate), add a **WebService** block.
3.  Configure the block to make a `GET` request to this service:
    *   **URL:** `http://<your_service_host>:3000/api/context`
    *   **Parameters:**
        *   `phoneNumber` = `Call.DNIS` (or the appropriate variable for the caller's number)
        *   `callId` = `Call.id`
    *   **Timeout:** Set an appropriate timeout (e.g., 2000 ms).
4.  This is a "fire-and-forget" call. The script doesn't need to wait for a response, as the service updates the call variable asynchronously.

### Step 3: Display the Call Variable to Agents

1.  In the VCC Administrator application, navigate to **Campaign Profiles**.
2.  Open the campaign profile used for your inbound calls.
3.  Go to the **Layout** tab.
4.  Select **Custom Campaign Settings**.
5.  Click **Add** and choose **Call Attached Variable**.
6.  From the dropdown, select the `SierraContext` variable you created.
7.  Configure the display properties:
    *   **Title:** `Sierra Context`
    *   **Read-Only:** Checked (True)
8.  Click **OK** and save the campaign profile.

Once these steps are completed, incoming calls that pass through the modified IVR script should have their context automatically fetched and displayed to the agent.
