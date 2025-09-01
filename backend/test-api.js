import fetch from 'node-fetch';

async function testLogin() {
  try {
    const response = await fetch('http://localhost:5003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'chris@chris.com',
        password: 'Chris123'
      })
    });
    
    const data = await response.json();
    console.log('Login response:', JSON.stringify(data, null, 2));
    
    if (data.token) {
      // Test /me endpoint
      const meResponse = await fetch('http://localhost:5003/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      const meData = await meResponse.json();
      console.log('\n/me response:', JSON.stringify(meData, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();