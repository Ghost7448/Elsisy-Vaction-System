// ============================================================
//  config/embeds.js  –  EMS Leave Management System
//  إسعاف كيان
// ============================================================

import { EmbedBuilder } from 'discord.js';
import { COLORS, STATUS } from './constants.js';

const FOOTER = 'Elsisy Leave Management System';

// ─── Panel embed ──────────────────────────────────────────────
export function buildPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('  نظام إدارة الأجازات  |  Elsisy Leave Management System')
    .setDescription([
      '**مرحباً بكم في نظام إدارة الأجازات الرسمي لسيرفر السيسي**',
      '',
      '**كيفية تقديم طلب أجازة:**',
      '> ١. اضغط على الزر أدناه',
      '> ٢. قم بتعبئة النموذج بمعلوماتك',
      '> ٣. انتظر موافقة المسؤولين',
      '',
      '─────────────────────────────────',
      '',
      '**How to submit a leave request:**',
      '> 1. Click the button below',
      '> 2. Fill in the form with your details',
      '> 3. Wait for an authorized officer to review',
      '',
      '─────────────────────────────────',
      '*جميع الطلبات تخضع للمراجعة الرسمية.*',
      '*All requests are subject to official review.*',
    ].join('\n'))
    .setColor(COLORS.INFO)
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

// ─── Leave request embed ──────────────────────────────────────
export function buildRequestEmbed({ badge, name, startDate, endDate, reason, submittedBy, userId, avatarUrl }) {
  return new EmbedBuilder()
    .setTitle('<:Kick:1529200674783629433>  طلب أجازة جديد  |  New Leave Request')
    .setColor(COLORS.PENDING)
    .setThumbnail(avatarUrl)
    .addFields(
      { name: '<:Elsisy:1538886846262812763> Kick User  ',   value: '```' + badge     + '```', inline: true  },
      { name: '👤  الاسم  |  Name',                    value: '```' + name      + '```', inline: true  },
      { name: '🗓️  تاريخ البداية  |  Start Date',      value: '```' + startDate + '```', inline: true  },
      { name: '🗓️  تاريخ الانتهاء  |  End Date',       value: '```' + endDate   + '```', inline: true  },
      { name: '📝  سبب الأجازة  |  Reason',            value: '```' + reason    + '```', inline: false },
      { name: '📊  الحالة  |  Status',                 value: '**' + STATUS.PENDING + '**', inline: false },
    )
    .setFooter({ text: 'مُقدَّم من  |  Submitted by: ' + submittedBy + '  •  ID: ' + userId })
    .setTimestamp();
}

// ─── Status mutators ──────────────────────────────────────────
function patchStatus(fields, newStatus) {
  return fields.map(f =>
    (f.name.includes('الحالة') || f.name.includes('Status'))
      ? { ...f, value: '**' + newStatus + '**' }
      : { ...f }
  );
}

export function applyApproved(embed, officerTag) {
  const fields = patchStatus(embed.fields ?? [], STATUS.APPROVED);
  if (!fields.some(f => f.name.includes('Approved by') || f.name.includes('وافق'))) {
    fields.push({ name: '🪪  وافق عليه  |  Approved by', value: '**' + officerTag + '**', inline: false });
  }
  return EmbedBuilder.from(embed).setColor(COLORS.APPROVED).setFields(fields);
}

export function applyRejected(embed, officerTag, reason) {
  const fields = patchStatus(embed.fields ?? [], STATUS.REJECTED);
  if (!fields.some(f => f.name.includes('Rejected by') || f.name.includes('رُفض'))) {
    fields.push(
      { name: '🪪  رُفض بواسطة  |  Rejected by',   value: '**' + officerTag + '**', inline: false },
      { name: '📌  سبب الرفض  |  Rejection Reason', value: '```' + reason + '```',   inline: false },
    );
  }
  return EmbedBuilder.from(embed).setColor(COLORS.REJECTED).setFields(fields);
}

export function applyExtended(embed, officerTag, newEndDate) {
  const fields = (embed.fields ?? []).map(f => {
    if (f.name.includes('تاريخ الانتهاء') || f.name.includes('End Date'))
      return { ...f, value: '```' + newEndDate + '```' };
    if (f.name.includes('الحالة') || f.name.includes('Status'))
      return { ...f, value: '**' + STATUS.EXTENDED + '**' };
    return { ...f };
  });
  if (!fields.some(f => f.name.includes('Extended by') || f.name.includes('مُدَّد'))) {
    fields.push({ name: '🔄  مُدَّد بواسطة  |  Extended by', value: '**' + officerTag + '**', inline: false });
  }
  return EmbedBuilder.from(embed).setColor(COLORS.EXTENDED).setFields(fields);
}

export function applyCancelled(embed, officerTag) {
  const fields = patchStatus(embed.fields ?? [], STATUS.CANCELLED);
  if (!fields.some(f => f.name.includes('Cancelled by') || f.name.includes('ألغي'))) {
    fields.push({ name: '🚫  ألغي بواسطة  |  Cancelled by', value: '**' + officerTag + '**', inline: false });
  }
  return EmbedBuilder.from(embed).setColor(COLORS.CANCELLED).setFields(fields);
}

// ─── User panel in SUBMIT_CHANNEL ────────────────────────────
export function buildUserVacationPanel({ name, badge, startDate, endDate, officerTag }) {
  return new EmbedBuilder()
    .setTitle('✅  تمت الموافقة على أجازتك  |  Your Leave Was Approved')
    .setColor(COLORS.APPROVED)
    .addFields(
      { name: '🪪  Discord ID', value: '`' + badge     + '`', inline: true  },
      { name: '👤  الاسم  |  Name',            value: '`' + name      + '`', inline: true  },
      { name: '🗓️  البداية  |  Start',         value: '`' + startDate + '`', inline: true  },
      { name: '🗓️  الانتهاء  |  End',          value: '`' + endDate   + '`', inline: true  },
      { name: '🪪  وافق عليه  |  Approved by', value: '**' + officerTag + '**', inline: false },
    )
    .setFooter({ text: 'يمكنك طلب التمديد أو الإلغاء  |  Use buttons below to extend or cancel' })
    .setTimestamp();
}

export function buildExtendedUserPanel(embed, newEndDate) {
  const fields = (embed.fields ?? []).map(f =>
    (f.name.includes('الانتهاء') || f.name.includes('End'))
      ? { ...f, value: '`' + newEndDate + '`' }
      : { ...f }
  );
  return EmbedBuilder.from(embed).setColor(COLORS.EXTENDED).setFields(fields)
    .setTitle('🔄  تم تمديد أجازتك  |  Your Leave Was Extended');
}

export function buildCancelledUserPanel(embed) {
  return EmbedBuilder.from(embed).setColor(COLORS.CANCELLED)
    .setTitle('🚫  تم إلغاء أجازتك  |  Your Leave Was Cancelled');
}

// ─── Log embeds ───────────────────────────────────────────────
export function buildApprovedLog({ name, startDate, endDate, reason, decidedBy }) {
  return new EmbedBuilder()
    .setTitle('✅  سجل موافقة  |  Approval Log')
    .setColor(COLORS.APPROVED)
    .addFields(
      { name: '👤  الاسم  |  Name',               value: '`' + name      + '`', inline: true  },
      { name: '🗓️  البداية  |  Start',             value: '`' + startDate + '`', inline: true  },
      { name: '🗓️  الانتهاء  |  End',              value: '`' + endDate   + '`', inline: true  },
      { name: '📝  السبب  |  Reason',              value: '```' + reason + '```', inline: false },
      { name: '🪪  وافق عليه  |  Approved by',    value: '**' + decidedBy + '**', inline: false },
    )
    .setFooter({ text: FOOTER + '  •  سجل القرارات' })
    .setTimestamp();
}

export function buildRejectedLog({ name, startDate, endDate, reason, decidedBy, rejectionReason }) {
  return new EmbedBuilder()
    .setTitle('❌  سجل رفض  |  Rejection Log')
    .setColor(COLORS.REJECTED)
    .addFields(
      { name: '👤  الاسم  |  Name',                value: '`' + name      + '`', inline: true  },
      { name: '🗓️  البداية  |  Start',              value: '`' + startDate + '`', inline: true  },
      { name: '🗓️  الانتهاء  |  End',               value: '`' + endDate   + '`', inline: true  },
      { name: '📝  السبب  |  Reason',               value: '```' + reason + '```',          inline: false },
      { name: '🪪  رُفض بواسطة  |  Rejected by',   value: '**' + decidedBy + '**',         inline: false },
      { name: '📌  سبب الرفض  |  Rejection',        value: '```' + rejectionReason + '```', inline: false },
    )
    .setFooter({ text: FOOTER + '  •  سجل القرارات' })
    .setTimestamp();
}

export function buildExtendedLog({ name, oldEndDate, newEndDate, decidedBy }) {
  return new EmbedBuilder()
    .setTitle('🔄  سجل تمديد  |  Extension Log')
    .setColor(COLORS.EXTENDED)
    .addFields(
      { name: '👤  الاسم  |  Name',                  value: '`' + name       + '`', inline: true  },
      { name: '🗓️  الانتهاء القديم  |  Old End',     value: '`' + oldEndDate + '`', inline: true  },
      { name: '🗓️  الانتهاء الجديد  |  New End',     value: '`' + newEndDate + '`', inline: true  },
      { name: '🔄  مُدَّد بواسطة  |  Extended by',   value: '**' + decidedBy + '**', inline: false },
    )
    .setFooter({ text: FOOTER + '  •  سجل القرارات' })
    .setTimestamp();
}

export function buildCancelledLog({ name, decidedBy }) {
  return new EmbedBuilder()
    .setTitle('🚫  سجل إلغاء  |  Cancellation Log')
    .setColor(COLORS.CANCELLED)
    .addFields(
      { name: '👤  الاسم  |  Name',                 value: '`' + name      + '`', inline: true  },
      { name: '🚫  ألغي بواسطة  |  Cancelled by',  value: '**' + decidedBy + '**', inline: false },
    )
    .setFooter({ text: FOOTER + '  •  سجل القرارات' })
    .setTimestamp();
}

// ─── Vacation list embed ──────────────────────────────────────
export function buildVacationListEmbed(vacations) {
  const embed = new EmbedBuilder()
    .setTitle('🚑  المنتسبون في أجازة حالياً  |  Currently on Leave')
    .setColor(COLORS.APPROVED)
    .setTimestamp();

  if (vacations.length === 0) {
    embed.setDescription('✅ لا يوجد منتسبون في أجازة حالياً.\n✅ No staff currently on leave.');
  } else {
    const lines = vacations.map((v, i) =>
      (i + 1) + '. 🪪 **' + v.badge + '**  ' + v.name + '\n' +
      '   📅 حتى  |  Until: `' + v.endDate + '`'
    );
    embed.setDescription(lines.join('\n\n'));
    embed.setFooter({ text: 'إجمالي  |  Total: ' + vacations.length + ' منتسب  |  staff member(s)' });
  }
  return embed;
}

// ─── Stats embed ──────────────────────────────────────────────
export function buildStatsEmbed({ submitted, approved, rejected, active }) {
  return new EmbedBuilder()
    .setTitle('📊  إحصائيات النظام  |  System Statistics')
    .setColor(COLORS.STATS)
    .setDescription('إسعاف كيان  |  Elsisy Leave Management')
    .addFields(
      { name: '📨  الطلبات المقدمة  |  Submitted',   value: '`' + submitted + '`', inline: true },
      { name: '✅  تمت الموافقة  |  Approved',        value: '`' + approved  + '`', inline: true },
      { name: '❌  تم الرفض  |  Rejected',            value: '`' + rejected  + '`', inline: true },
      { name: '🚑  في أجازة حالياً  |  On Leave',    value: '`' + active    + '`', inline: true },
    )
    .setFooter({ text: 'الإحصائيات منذ آخر إعادة تشغيل  |  Stats since last restart' })
    .setTimestamp();
}
