const express = require('express');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const CONTEXT_URL_BASE = 'https://bissell-sierra-context-transfer.partner-data.workers.dev/context/';

// Endpoint to be called by Five9
app.get('/api/context', async (req, res) => {
  const { phoneNumber, callId, agentId } = req.query;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!callId) {
    return res.status(400).json({ error: 'Call ID is required' });
  }

  if (!agentId) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  console.log(`Received request for phone number: ${phoneNumber}, callId: ${callId}, agentId: ${agentId}`);

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

    // 2. Update Five9 call variable
    await updateFive9CallVariable(agentId, callId, 'SierraContext', context);

    res.status(200).json({ success: true, message: 'Context fetched and updated in Five9.' });
  } catch (error) {
    console.error('Error processing context request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Updates a Five9 call variable using the Agent REST API.
 * @param {string} agentId - The ID of the agent.
 * @param {string} callId - The ID of the call.
 * @param {string} variableName - The name of the call variable to update.
 * @param {string} value - The new value for the call variable.
 */
async function updateFive9CallVariable(agentId, callId, variableName, value) {
  const five9ApiUrl = process.env.FIVE9_API_URL; // e.g., https://app.five9.com
  const five9ApiToken = process.env.FIVE9_API_TOKEN; // The Bearer token

  if (!five9ApiUrl || !five9ApiToken) {
    throw new Error('Five9 API URL or Token is not configured in environment variables.');
  }

  const url = `${five9ApiUrl}/appsvcs/rs/svc/agents/${agentId}/interactions/calls/${callId}/variables_2`;

  const body = {
    [variableName]: value
  };

  console.log(`Making PUT request to Five9 API: ${url}`);
  console.log(`Request body: ${JSON.stringify(body)}`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer-${five9ApiToken}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Five9 API error: ${response.status} - ${errorText}`);
  }

  console.log('Successfully updated Five9 call variable.');
  return response.json();
}


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
