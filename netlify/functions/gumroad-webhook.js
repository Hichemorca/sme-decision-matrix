// netlify/functions/gumroad-webhook.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with your service_role key
const SUPABASE_URL = 'https://zbssuchvbrjzbotlodim.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sbClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Gumroad sends data as form-urlencoded
    let params;
    if (event.headers['content-type'] === 'application/x-www-form-urlencoded') {
      params = new URLSearchParams(event.body);
    } else {
      params = new URLSearchParams(event.body);
    }
    
    // Extract webhook data
    const webhookData = {};
    for (const [key, value] of params.entries()) {
      webhookData[key] = value;
    }
    
    // Parse the JSON string inside 'sale' field if present
    let saleData = webhookData;
    if (webhookData.sale) {
      try {
        saleData = JSON.parse(webhookData.sale);
      } catch(e) {
        saleData = webhookData;
      }
    }
    
    // Extract relevant information
    const email = saleData.email || webhookData.email;
    const productId = saleData.product_id || webhookData.product_id;
    const productName = saleData.product_name || webhookData.product_name;
    const saleId = saleData.id || webhookData.id;
    const licenseKey = saleData.license_key || webhookData.license_key;
    const price = saleData.price || webhookData.price;
    const test = saleData.test === 'true' || saleData.test === true || webhookData.test === 'true';
    
    // Log for debugging
    console.log('Webhook received:', { email, productId, saleId, licenseKey, test });
    
    // Ignore test transactions
    if (test) {
      console.log('Test purchase ignored');
      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Test ignored' }) };
    }
    
    if (!email) {
      console.error('No email found in webhook');
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No email provided' }) };
    }
    
    // Generate a unique license key if not provided by Gumroad
    const finalLicenseKey = licenseKey || generateLicenseKey(email, saleId);
    
    // Store in Supabase
    const { data, error } = await sbClient
      .from('paid_users')
      .upsert({
        email: email,
        product_id: productId,
        product_name: productName,
        sale_id: saleId,
        license_key: finalLicenseKey,
        verified: true,
        price_paid: price,
        purchased_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year validity
      }, {
        onConflict: 'email'
      });
    
    if (error) {
      console.error('Supabase insert error:', error);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
    
    console.log(`✅ Payment recorded for: ${email} with license: ${finalLicenseKey}`);
    
    // Optional: Send confirmation email to customer
    await sendConfirmationEmail(email, finalLicenseKey, productName);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Payment recorded successfully',
        license_key: finalLicenseKey
      })
    };
    
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

function generateLicenseKey(email, saleId) {
  // Generate a simple unique license key
  const timestamp = Date.now().toString(36);
  const emailPrefix = email.split('@')[0].substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SME-${emailPrefix}-${random}-${timestamp.slice(-4)}`;
}

async function sendConfirmationEmail(email, licenseKey, productName) {
  // Optional: Send confirmation email to customer
  // You can implement this using Resend or another email service
  console.log(`Confirmation email would be sent to ${email} with license: ${licenseKey}`);
  
  // Example using Resend (uncomment and add API key to use)
  /*
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'SME Matrix <onboarding@resend.dev>',
    to: email,
    subject: 'Your SME Decision Report - Purchase Confirmation',
    html: `
      <h1>Thank you for your purchase!</h1>
      <p>Your license key: <strong>${licenseKey}</strong></p>
      <p>Visit <a href="https://decision-matrix-sme.netlify.app/report?license=${licenseKey}">your report</a> to access your full decision report.</p>
    `
  });
  */
}
