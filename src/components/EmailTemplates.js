// Eye-catchy HTML email templates for USA clinics - Orvexify - NO ADDRESS
// All inline CSS for maximum deliverability, table-based layout

export const EYE_CATCHY_TEMPLATES = [
  {
    id: 'modern_clinic',
    name: '🏥 Modern Clinic - No-Show Reducer (Best CTR)',
    subject: '{{first_name}}, {{company_name}} losing $4,500/mo to no-shows?',
    body: `<div style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
<tr><td style="background:#4f46e5;padding:32px 32px 24px;text-align:center;">
<div style="background:rgba(255,255,255,0.2);display:inline-block;padding:8px 16px;border-radius:20px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:16px;">✨ TRUSTED BY 300+ US CLINICS</div>
<h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;">Cut No-Shows by 70% at {{company_name}}?</h1>
<p style="margin:12px 0 0;color:#e0e7ff;font-size:15px;">Hi {{first_name}}, quick idea for {{company_name}} 👇</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.6;">Noticed {{company_name}} - {{Title}} — impressive work in {{Country}}!</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:20px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:40px;vertical-align:top;"><div style="background:#dcfce7;width:40px;height:40px;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">💰</div></td>
<td style="padding-left:12px;"><div style="color:#065f46;font-weight:800;font-size:14px;">Avg US Clinic Loses $4,500/month</div><div style="color:#047857;font-size:12px;">30 no-shows x $150 avg = $4,500 wasted</div></td>
</tr></table>
</div>
<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;"><b>Orvexify</b> helps clinics like {{company_name}}:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
<tr><td style="padding:8px 0;color:#1f2937;font-size:14px;">✓ <b>Automated SMS + Email reminders</b> — patients confirm in 1 tap</td></tr>
<tr><td style="padding:8px 0;color:#1f2937;font-size:14px;">✓ <b>Self-reschedule link</b> — reduces no-shows by 60-70%</td></tr>
<tr><td style="padding:8px 0;color:#1f2937;font-size:14px;">✓ <b>2-way texting</b> — staff saves 10+ hours/week</td></tr>
</table>
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
<div style="color:#92400e;font-size:13px;font-weight:600;">📈 Case Study: Miami Family Clinic</div>
<div style="color:#78350f;font-size:12px;margin-top:4px;">28% to 7% no-show in 45 days. Saved $3,800/mo. ROI 12x.</div>
</div>
<div style="text-align:center;margin:28px 0;">
<a href="https://orvexify.com/demo?utm_source=email&utm_campaign={{company_name}}" style="background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;">👉 See 2-Min Demo for {{company_name}}</a>
<div style="margin-top:10px;color:#9ca3af;font-size:11px;">No credit card • 10-min setup • Cancel anytime</div>
</div>
<p style="margin:20px 0 0;color:#374151;font-size:14px;">Worth a quick 10-min chat this week, {{first_name}}?</p>
<p style="margin:12px 0 0;color:#374151;font-size:14px;">Best,<br/><b>{{from_name}}</b><br/>Orvexify — Patient Reminders</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
<div style="color:#6b7280;font-size:11px;line-height:1.5;">
<a href="{{unsubscribe_link}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> • <a href="{{resubscribe_link}}" style="color:#6b7280;text-decoration:underline;">Resubscribe</a><br/>
<span style="color:#9ca3af;">You received this because {{company_name}} is in our clinic network. {{Country}} {{timezone}}</span>
</div>
</td></tr>
</table>
</td></tr>
</table>
</div>`,
    followup1_subject: 'Re: {{company_name}} - bump',
    followup1_body: `Hi {{first_name}},

Just bumping this — should I close file for {{company_name}}?

Quick win: Dallas clinic saved $4,200/mo after 30 days with Orvexify.

2-min demo? Reply YES or NO.

{{from_name}}`,
  },
  {
    id: 'stats_driven',
    name: '📊 Stats Driven - Eye Catchy with Numbers',
    subject: '{{company_name}}: 3 numbers that matter',
    body: `<div style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 32px;">
<div style="border-left:4px solid #4f46e5;padding-left:16px;margin-bottom:20px;">
<h2 style="margin:0;color:#111827;font-size:20px;">Hi {{first_name}}, 3 numbers for {{company_name}}:</h2>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr>
<td style="text-align:center;padding:12px;background:#f0fdf4;border-radius:12px;width:32%;">
<div style="font-size:28px;font-weight:800;color:#065f46;">70%</div>
<div style="font-size:11px;color:#047857;font-weight:600;">FEWER NO-SHOWS</div>
</td>
<td style="width:2%;"></td>
<td style="text-align:center;padding:12px;background:#eef2ff;border-radius:12px;width:32%;">
<div style="font-size:28px;font-weight:800;color:#4338ca;">$4.2k</div>
<div style="font-size:11px;color:#4f46e5;font-weight:600;">SAVED / MONTH</div>
</td>
<td style="width:2%;"></td>
<td style="text-align:center;padding:12px;background:#fef3c7;border-radius:12px;width:32%;">
<div style="font-size:28px;font-weight:800;color:#92400e;">10h</div>
<div style="font-size:11px;color:#b45309;font-weight:600;">STAFF TIME SAVED</div>
</td>
</tr>
</table>
<p style="color:#374151;font-size:14px;line-height:1.6;">{{company_name}} in {{Country}} could see same with Orvexify automated reminders.</p>
<p style="color:#1f2937;font-size:14px;font-weight:700;margin:20px 0 8px;">How it works:</p>
<p style="color:#4b5563;font-size:13px;line-height:1.6;margin:0;">
1. Patient gets SMS + Email 48h + 24h before<br/>
2. 1-tap Confirm / Reschedule link<br/>
3. No-show → auto waitlist fills slot<br/>
4. Dashboard: see who confirmed
</p>
<div style="text-align:center;margin:24px 0;">
<a href="https://orvexify.com/case-study?utm_campaign={{company_name}}" style="background:#111827;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block;">See Miami Clinic Case Study</a>
</div>
<p style="color:#374151;font-size:14px;">Open to 10-min walkthrough, {{first_name}}?</p>
<p style="color:#6b7280;font-size:13px;">— {{from_name}} @ Orvexify<br/><span style="font-size:11px;">Helping {{company_name}} reduce no-shows</span></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
<div style="text-align:center;">
<a href="{{unsubscribe_link}}" style="color:#9ca3af;font-size:11px;">Unsubscribe</a> <span style="color:#d1d5db;">|</span> <a href="{{resubscribe_link}}" style="color:#9ca3af;font-size:11px;">Resubscribe</a>
<div style="color:#d1d5db;font-size:10px;margin-top:8px;">{{Country}} • {{timezone}} • {{email}}</div>
</div>
</td></tr>
</table>
</div>`,
    followup1_subject: 'Re: {{company_name}} numbers',
    followup1_body: `Bump {{first_name}} - those 3 numbers relevant for {{company_name}}?`,
  },
  {
    id: 'minimal_text',
    name: '✉️ Minimal Text - Best Deliverability',
    subject: 'Quick question about {{company_name}}',
    body: `Hi {{first_name}},

{Noticed|Saw|Found} {{company_name}} in {{Country}} — {impressive|great} work as {{Title}}!

We help US clinics cut no-shows by 60-70% with automated SMS + Email reminders.

Avg clinic: 30 no-shows/mo x $150 = $4,500 lost.

Orvexify:
→ 1-tap confirm / reschedule link
→ Auto reminders (SMS + Email)
→ Staff saves 10h/week

Miami clinic: 28% → 7% no-show in 45 days.

Worth a 10-min chat this week for {{company_name}}?

Best,
{{from_name}}
Orvexify

P.S. Reply NO if not relevant for {{company_name}}`,
    followup1_subject: 'Re: {{company_name}}',
    followup1_body: `{{first_name}} - bump. Close file for {{company_name}}?

If no-shows matter, 2-min demo: https://orvexify.com/demo`,
  },
  {
    id: 'personal_ceo',
    name: '👋 Personal CEO Note - High Reply Rate',
    subject: '{{first_name}} - idea for {{company_name}}',
    body: `Hi {{first_name}},

I was looking at {{company_name}} ({{Country}}) and noticed you're {{Title}} — quick thought.

Most clinics I talk to lose $3k-5k/mo to no-shows. Not because patients don't care, but because reminders are manual.

We built Orvexify to fix that:
→ Automated SMS + Email (patient's local timezone {{timezone}})
→ 1-tap confirm/reschedule
→ Staff dashboard

One clinic in Austin (similar size to {{company_name}}) went from 22% to 6% no-shows in 60 days.

Would it be crazy to show you 2-min demo this week? No pitch, just value.

If not relevant, reply NO and I'll close file for {{company_name}}.

Thanks {{first_name}},

{{from_name}}
Orvexify | orvexify.com

{{Country}} • {{timezone}}`,
    followup1_subject: 'Re: {{company_name}}',
    followup1_body: `{{first_name}}, should I close file for {{company_name}}?

If no-shows matter, happy to share Austin clinic playbook.`,
  }
];
