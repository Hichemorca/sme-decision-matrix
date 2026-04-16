// Netlify Function to securely save assessment to Supabase
var SUPABASE_URL = 'https://zbssuchvbrjzbotlodim.supabase.co';
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  try {
    var { email, result, data } = JSON.parse(event.body);
    
    // Generate a secret token for report access
    var secretToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    var response = await fetch(`${SUPABASE_URL}/rest/v1/assessments`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: email,
        decision: result.decision,
        confidence: result.confidence,
        result_data: result,
        input_data: { company: data.A?.name, industry: data.A?.industry, country: data.A?.country },
        secret_token: secretToken
      })
    });
    
    if (!response.ok) throw new Error('Supabase insert failed');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token: secretToken })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
