require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3001; 
const windowSize = 10;
const apiEndpoints = {
  p: 'http://20.244.56.144/test/primes',
  f: 'http://20.244.56.144/test/fibo',
  e: 'http://20.244.56.144/test/even',
  r: 'http://20.244.56.144/test/rand'
};

let storedNumbers = [];
let accessToken = ''; 

app.use(cors());

app.get('/', (req, res) => {
  res.send('Welcome to the Average Calculator Microservice');
});


async function getNewAccessToken() {
  try {
    const response = await axios.post('http://20.244.56.144/test/auth', {
      companyName: 'goMart',
      clientID: 'f409e5a4-4e09-4b9a-a38d-9baa0c0d76d6',
      clientSecret: 'NCsmqAUdhrXbCrKM',
      ownerName: 'Athish A S',
      ownerEmail: 'athish.al22@bitsathy.ac.in',
      rollNo: '7376222AL115'
    });
    accessToken = response.data.access_token;
  } catch (error) {
    console.error('Error getting new access token:', error.response ? error.response.data : error.message);
  }
}

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;
  const apiUrl = apiEndpoints[numberid];

  if (!apiUrl) {
    return res.status(400).json({ error: 'Invalid number ID' });
  }

  // Get a new access token if not already available
  if (!accessToken) {
    await getNewAccessToken();
  }

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 5000 // Increased timeout duration to 5000ms (5 seconds)
    });
    const newNumbers = response.data.numbers.filter(num => !storedNumbers.includes(num));

    storedNumbers = [...storedNumbers, ...newNumbers].slice(-windowSize);

    const avg = storedNumbers.reduce((sum, num) => sum + num, 0) / storedNumbers.length;

    res.json({
      windowPrevState: storedNumbers.slice(0, -newNumbers.length),
      windowCurrState: storedNumbers,
      numbers: newNumbers,
      avg: avg.toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching numbers:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 401) {
      // If the token is invalid, get a new token and retry the request
      await getNewAccessToken();
      try {
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 5000 // Increased timeout duration to 5000ms (5 seconds)
        });
        const newNumbers = response.data.numbers.filter(num => !storedNumbers.includes(num));

        storedNumbers = [...storedNumbers, ...newNumbers].slice(-windowSize);

        const avg = storedNumbers.reduce((sum, num) => sum + num, 0) / storedNumbers.length;

        return res.json({
          windowPrevState: storedNumbers.slice(0, -newNumbers.length),
          windowCurrState: storedNumbers,
          numbers: newNumbers,
          avg: avg.toFixed(2)
        });
      } catch (retryError) {
        console.error('Error fetching numbers after retry:', retryError.response ? retryError.response.data : retryError.message);
        return res.status(500).json({ error: 'Failed to fetch numbers after retry' });
      }
    } else {
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        console.error('Data:', error.response.data);
      }
      return res.status(500).json({ error: 'Failed to fetch numbers' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});