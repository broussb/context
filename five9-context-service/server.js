const express = require('express');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const CONTEXT_URL_BASE = 'https://bissell-sierra-context-transfer.partner-data.workers.dev/context/';

// Endpoint to be called by Five9
app.get('/api/context', async (req, res) => {
  const { phoneNumber, callId } = req.query;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!callId) {
    return res.status(400).json({ error: 'Call ID is required' });
  }

  console.log(`Received request for phone number: ${phoneNumber} and callId: ${callId}`);

  try {
    // 1. Fetch context from the Bissell-Sierra worker
    const contextResponse = await fetch(`${CONTEXT_URL_BASE}${phoneNumber}`);
    let context = '';
    if (contextResponse.ok) {
        context = await contextResponse.text();
        console.log(`Successfully fetched context: ${context}`);
    } else if (contextResponse.status === 404) {
        console.log('No context found for this number.');
        context = 'No context found.';
    } else {
        const errorText = await contextResponse.text();
        throw new Error(`Bissell-Sierra service error: ${contextResponse.status} - ${errorText}`);
    }

    // 2. Update Five9 call variable (placeholder)
    await updateFive9CallVariable(callId, 'SierraContext', context);

    res.status(200).json({ success: true, message: 'Context fetched and updated in Five9.' });
  } catch (error) {
    console.error('Error processing context request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Placeholder function for updating a Five9 call variable.
 * The user needs to replace this with their actual Five9 CTI API implementation.
 */
async function updateFive9CallVariable(callId, variableName, value) {
  // This is a placeholder. The actual implementation will depend on the Five9 CTI API.
  // It will likely be a SOAP or REST API call.

  console.log(`--- FIVE9 API PLACEHOLDER ---`);
  console.log(`Updating call variable for callId: ${callId}`);
  console.log(`Variable: ${variableName}`);
  console.log(`Value: ${value}`);
  console.log(`-----------------------------`);

  // --- Example of what the real implementation might look like (for demonstration) ---
  /*
  const five9ApiEndpoint = process.env.FIVE9_API_ENDPOINT;
  const five9ApiCredentials = {
    user: process.env.FIVE9_API_USER,
    password: process.env.FIVE9_API_PASSWORD
  };

  // This could be a SOAP request using a library like 'soap'
  // or a REST request using 'node-fetch'.

  const requestBody = {
      callId: callId,
      variable: {
          name: variableName,
          value: value
      }
  };

  const response = await fetch(five9ApiEndpoint, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${five9ApiCredentials.user}:${five9ApiCredentials.password}`).toString('base64')}`
      },
      body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
      throw new Error(`Five9 API error: ${response.statusText}`);
  }

  console.log('Successfully updated Five9 call variable.');
  */

  // For this placeholder, we'll just simulate a successful operation.
  return Promise.resolve();
}


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
