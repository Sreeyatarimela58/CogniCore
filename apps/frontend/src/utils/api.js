export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { message: text || 'Invalid JSON response' };
  }
  
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `API request failed with status ${response.status}`);
  }
  
  return data;
}
