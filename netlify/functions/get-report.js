var SUPABASE_URL = 'https://zbssuchvbrjzbotlodim.supabase.co';
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  try {
    var { email, token } = JSON.parse(event.body);
    
    var response = await fetch(
      `${SUPABASE_URL}/rest/v1/assessments?email=eq.${encodeURIComponent(email)}&secret_token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
      {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }
    );
    
    var data = await response.json();
    
    if (!data || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Report not found' }) };
    }
    
    return { statusCode: 200, body: JSON.stringify(data[0]) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
