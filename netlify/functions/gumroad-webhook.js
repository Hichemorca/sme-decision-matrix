// netlify/functions/gumroad-webhook.js
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// هام: هذه المفاتيح تُقرأ من متغيرات البيئة في Netlify
// لا تضع المفاتيح الثابتة هنا أبداً!
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// تحقق من وجود المفاتيح
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables!');
}

const sbClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  // فقط POST مسموح
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // قراءة البيانات من Gumroad (تأتي بصيغة x-www-form-urlencoded)
    const params = new URLSearchParams(event.body);
    const webhookData = {};
    for (const [key, value] of params.entries()) {
      webhookData[key] = value;
    }
    
    // محاولة تحويل حقل sale إذا كان موجوداً
    let saleData = webhookData;
    if (webhookData.sale) {
      try {
        saleData = JSON.parse(webhookData.sale);
      } catch(e) {
        saleData = webhookData;
      }
    }
    
    // استخراج البيانات المهمة
    const email = saleData.email || webhookData.email;
    const productId = saleData.product_id || webhookData.product_id;
    const productName = saleData.product_name || webhookData.product_name;
    const saleId = saleData.id || webhookData.id;
    const licenseKey = saleData.license_key || webhookData.license_key;
    const price = saleData.price || webhookData.price;
    const test = saleData.test === 'true' || saleData.test === true || webhookData.test === 'true';
    
    // تسجيل للتصحيح
    console.log('📦 Webhook received:', { email, productId, saleId, licenseKey, test });
    
    // تجاهل عمليات الاختبار
    if (test) {
      console.log('🧪 Test purchase ignored');
      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Test ignored' }) };
    }
    
    // التحقق من وجود البريد الإلكتروني
    if (!email) {
      console.error('❌ No email found in webhook');
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No email provided' }) };
    }
    
    // إنشاء License Key إذا لم يوفره Gumroad
    const finalLicenseKey = licenseKey || generateLicenseKey(email, saleId);
    
    // تخزين في Supabase
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
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'email'
      });
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
    
    console.log(`✅ Payment recorded for: ${email} with license: ${finalLicenseKey}`);
    
    // (اختياري) إرسال بريد تأكيد للمستخدم
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
    console.error('💥 Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

/**
 * توليد License Key فريد إذا لم يوفره Gumroad
 */
function generateLicenseKey(email, saleId) {
  const timestamp = Date.now().toString(36);
  const emailPrefix = email.split('@')[0].substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SME-${emailPrefix}-${random}-${timestamp.slice(-4)}`;
}

/**
 * إرسال بريد تأكيد للمستخدم (اختياري)
 */
async function sendConfirmationEmail(email, licenseKey, productName) {
  console.log(`📧 Confirmation email would be sent to ${email} with license: ${licenseKey}`);
  
  // إذا كنت تريد تفعيل إرسال البريد، قم بإزالة التعليقات أدناه
  /*
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
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
    console.log(`✅ Confirmation email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send confirmation email:`, error);
  }
  */
  }
