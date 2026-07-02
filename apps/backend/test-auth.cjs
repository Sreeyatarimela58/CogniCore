const http = require('http');

async function makeRequest(path, method, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('--- Testing POST /api/auth/register ---');
  const rand = Math.floor(Math.random() * 100000);
  const registerRes = await makeRequest('/api/auth/register', 'POST', {
    name: 'Test User',
    email: `test${rand}@cognicore.io`,
    password: 'password123',
  });
  console.log('Register Status:', registerRes.status);
  console.log('Register Response:', JSON.stringify(registerRes.data, null, 2));

  console.log('\n--- Testing POST /api/auth/register (Duplicate) ---');
  const duplicateRes = await makeRequest('/api/auth/register', 'POST', {
    name: 'Test User',
    email: `test${rand}@cognicore.io`,
    password: 'password123',
  });
  console.log('Duplicate Register Status:', duplicateRes.status);
  console.log('Duplicate Register Response:', JSON.stringify(duplicateRes.data, null, 2));

  console.log('\n--- Testing POST /api/auth/login ---');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: `test${rand}@cognicore.io`,
    password: 'password123',
  });
  console.log('Login Status:', loginRes.status);
  console.log('Login Response:', JSON.stringify(loginRes.data, null, 2));
  console.log('Set-Cookie Header:', loginRes.headers['set-cookie']);

  const accessToken = loginRes.data?.data?.accessToken;
  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';

  console.log('\n--- Testing GET /api/auth/me ---');
  const meRes = await makeRequest('/api/auth/me', 'GET', null, {
    'Authorization': `Bearer ${accessToken}`
  });
  console.log('Me Status:', meRes.status);
  console.log('Me Response:', JSON.stringify(meRes.data, null, 2));

  console.log('\n--- Testing POST /api/auth/logout ---');
  const logoutRes = await makeRequest('/api/auth/logout', 'POST', null, {
    'Cookie': cookie
  });
  console.log('Logout Status:', logoutRes.status);
  console.log('Logout Response:', JSON.stringify(logoutRes.data, null, 2));
  console.log('Set-Cookie Header on Logout:', logoutRes.headers['set-cookie']);
}

test().catch(console.error);
