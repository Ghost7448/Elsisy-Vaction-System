// ============================================================
//  config/components.js  –  EMS Leave Management System
// ============================================================

import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { CUSTOM_IDS } from './constants.js';

export function buildSubmitButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.LEAVE_BUTTON)
      .setLabel(' تقديم طلب أجازة  |  Submit Leave Request')
      .setStyle(ButtonStyle.Secondary)
  );
}

export function buildActionButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.APPROVE_LEAVE)
      .setLabel('✔️ موافقة  |  Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.REJECT_LEAVE)
      .setLabel('❌ رفض  |  Reject')
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildApprovedActionButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.EXTEND_LEAVE)
      .setLabel('🔄 تمديد الأجازة  |  Extend Leave')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.CANCEL_LEAVE)
      .setLabel('🚫 إلغاء الأجازة  |  Cancel Leave')
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildDisabledButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.APPROVE_LEAVE)
      .setLabel('✔️ موافقة  |  Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.REJECT_LEAVE)
      .setLabel('❌ رفض  |  Reject')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );
}

export function buildLeaveModal() {
  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.LEAVE_MODAL)
    .setTitle('🩺 نموذج طلب الأجازة  |  Leave Request Form')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('badge_number')
          .setLabel('Kick User')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('KYN_Kareem')
          .setRequired(true)
          .setMaxLength(15)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('الاسم الكامل  |  Full Name')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Example: Kareem Tarek')
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(80)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('start_date')
          .setLabel('تاريخ البداية  |  Start Date')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 01/05/2026  or  01052026')
          .setRequired(true)
          .setMaxLength(20)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('end_date')
          .setLabel('تاريخ الانتهاء  |  End Date')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 10/05/2026  or  10052026')
          .setRequired(true)
          .setMaxLength(20)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('سبب الأجازة  |  Reason for Leave')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('اكتب سبب طلب الأجازة  /  Describe the reason for your leave')
          .setRequired(true)
          .setMaxLength(600)
      ),
    );
}

export function buildRejectionModal(messageId) {
  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.REJECT_MODAL + '_' + messageId)
    .setTitle('❌ سبب الرفض  |  Rejection Reason')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rejection_reason')
          .setLabel('سبب الرفض  |  Reason for Rejection')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('اكتب سبب الرفض  /  Explain the reason for rejection')
          .setRequired(true)
          .setMaxLength(400)
      )
    );
}

export function buildExtendModal(messageId) {
  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.EXTEND_MODAL + '_' + messageId)
    .setTitle('🔄 تمديد الأجازة  |  Extend Leave')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('new_end_date')
          .setLabel('تاريخ الانتهاء الجديد  |  New End Date')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 20/05/2026  or  20052026')
          .setRequired(true)
          .setMaxLength(20)
      )
    );
}
