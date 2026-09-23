// Eye-catchy HTML email templates for USA clinics - Orvexify - NO ADDRESS
// All inline CSS for maximum deliverability, table-based layout

export const EYE_CATCHY_TEMPLATES = [
  {
    id: 'html_eye_catchy',
    name: '',
    subject: '',
    body: `<div style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#8b5cf6 100%);padding:32px 32px 24px;text-align:center;">
<div style="background:rgba(255,255,255,0.2);display:inline-block;padding:8px 16px;border-radius:20px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:16px;">✨ YOUR BADGE HERE</div>
<h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;">Hi {{first_name}}, quick idea for {{company_name}}</h1>
<p style="margin:12px 0 0;color:#e0e7ff;font-size:15px;">Your opening line here 👇</p>
</td></tr>

<!-- BODY -->
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.6;">Hi {{first_name}}, your intro paragraph here. Mention {{company_name}} and {{country}}.</p>

<!-- HIGHLIGHT BOX -->
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:20px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:40px;vertical-align:top;"><div style="background:#dcfce7;width:40px;height:40px;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">💰</div></td>
<td style="padding-left:12px;"><div style="color:#065f46;font-weight:800;font-size:14px;">Your highlight title</div><div style="color:#047857;font-size:12px;">Your highlight subtitle / stat</div></td>
</tr></table>
</div>

<!-- BULLET POINTS -->
<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;"><b>Your sub-heading:</b></p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
<tr><td style="padding:8px 0;color:#1f2937;font-size:14px;">✓ Bullet point 1</td></tr>
<tr><td style="padding:8px 0;color:#1f2937;font-size:14px;">✓ Bullet point 2</td></tr>
<tr><td style="padding:8px 0;color:#1f2937;font-size:14px;">✓ Bullet point 3</td></tr>
</table>

<!-- CASE STUDY / QUOTE BOX -->
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
<div style="color:#92400e;font-size:13px;font-weight:600;">📈 Your case study title</div>
<div style="color:#78350f;font-size:12px;margin-top:4px;">Your case study detail here</div>
</div>

<!-- CTA BUTTON -->
<div style="text-align:center;margin:28px 0;">
<a href="https://orvexify.com/demo?utm_source=email&utm_campaign={{company_name}}" style="background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;">👉 Your CTA button text</a>
<div style="margin-top:10px;color:#9ca3af;font-size:11px;">Your CTA subtitle here</div>
</div>

<!-- SIGN OFF -->
<p style="margin:20px 0 0;color:#374151;font-size:14px;">Your closing line here, {{first_name}}?</p>
<p style="margin:12px 0 0;color:#374151;font-size:14px;">Best,<br/><b>{{from_name}}</b><br/>Your company tagline</p>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
<div style="color:#6b7280;font-size:11px;line-height:1.5;">
<a href="{{unsubscribe_link}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> • <a href="{{resubscribe_link}}" style="color:#6b7280;text-decoration:underline;">Resubscribe</a><br/>
<span style="color:#9ca3af;">{{Country}} • {{timezone}}</span>
</div>
</td></tr>

</table>
</td></tr>
</table>
</div>`,
    followup1_subject: '',
    followup1_body: '',
  },
  {
    id: 'plain_text_1',
    name: '',
    subject: '',
    body: `Hi {{first_name}},

Your opening line here. Mention {{company_name}} and {{country}}.

{Noticed|Saw|Found} {{company_name}} — your sentence here.

Your value proposition here:
→ Point 1
→ Point 2
→ Point 3

Your case study or social proof here.

Worth a quick chat this week for {{company_name}}?

Best,
{{from_name}}

P.S. Your PS line here`,
    followup1_subject: '',
    followup1_body: '',
  },
  {
    id: 'plain_text_2',
    name: '',
    subject: '',
    body: `Hi {{first_name}},

Your follow-up opening here.

Your follow-up value here.

Quick question: your question here?

Best,
{{from_name}}`,
    followup1_subject: '',
    followup1_body: '',
  },
  {
    id: 'plain_text_3',
    name: '',
    subject: '',
    body: `Hi {{first_name}},

Your break-up email here. Keep it short.

If no interest, just reply NO and I'll close the file for {{company_name}}.

Thanks {{first_name}},

{{from_name}}`,
    followup1_subject: '',
    followup1_body: '',
  }
];