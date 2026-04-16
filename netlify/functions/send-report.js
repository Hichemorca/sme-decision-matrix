// netlify/functions/send-report.js
const { Resend } = require('resend');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, token, reportData, resultData } = JSON.parse(event.body);
    
    const siteUrl = process.env.URL || 'https://decision-matrix-sme.netlify.app';
    const reportUrl = `${siteUrl}/report?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h1 style="color: #e8c44a; margin: 0 0 8px 0;">SME Survival Decision Matrix™</h1>
          <p style="color: #666; margin-bottom: 24px;">Decision Intelligence for Founders</p>
          
          <h2 style="margin: 0 0 16px 0;">Your Decision Report is Ready</h2>
          
          <div style="background: #f0f0f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0;"><strong>Recommended Decision:</strong> <span style="color: ${resultData.decision === 'CONTINUE' ? '#22c55e' : (resultData.decision === 'PIVOT' ? '#eab308' : '#ef4444')}; font-size: 24px; font-weight: bold;">${resultData.decision}</span></p>
            <p style="margin: 0;"><strong>Signal Strength:</strong> ${resultData.confidence}%</p>
          </div>
          
          <a href="${reportUrl}" style="background: #e8c44a; color: #07080c; padding: 14px 28px; text-decoration: none; border-radius: 40px; display: inline-block; margin: 8px 0 16px 0; font-weight: bold;">
            View Your Full Report →
          </a>
          
          <div style="background: #fff3e0; border-left: 4px solid #e8c44a; padding: 12px 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #333;"><strong>⚠️ Important:</strong> If you don't see the link above, copy and paste this URL into your browser:</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">${reportUrl}</p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 24px;">This link expires in 7 days. Keep it secure.</p>
          <p style="color: #999; font-size: 11px; margin-top: 16px;">You're receiving this email because you requested a report from SME Survival Decision Matrix.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #aaa; font-size: 10px; text-align: center;">© 2025 SME Survival Decision Matrix — Decision Intelligence for Founders</p>
        </div>
      </body>
      </html>
    `;
    
    const emailResult = await resend.emails.send({
      from: 'SME Matrix <onboarding@resend.dev>',
      to: email,
      subject: `Your SME Decision Report - ${resultData.decision}`,
      html: emailHtml
    });
    
    console.log('Email sent successfully:', emailResult);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Report sent to your email' })
    };
    
  } catch (error) {
    console.error('Send report error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
