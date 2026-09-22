# Elsisy Vacation System v2

## What's fixed

- Slash commands are automatically registered/synced every time the bot starts. No manual deploy is required.
- Logs can be sent to a completely different Discord server using `LOG_GUILD_ID` + `LOGS_CHANNEL_ID`.
- Repeated vacation extensions work correctly. The new end date is compared against the actual current end date after every extension.
- When a vacation expires, the leave request embed is changed to `Expired` and the **Extend** + **Cancel** buttons are removed.
- Expiration only edits the message when both management buttons are still present, preventing unrelated/finalized embeds from being overwritten.
- Active vacations are persisted in `data/vacations.json`, so restart/crash no longer loses active vacation data.
- Expiration/reminders are recovered automatically after restart.
- Approval/cancellation/extension/rejection records now mention the actual Discord user who performed the action (`<@USER_ID>`), not only their username/tag.
- Vacation role is removed automatically when the vacation expires.

## Environment

Copy `.env.example` to `.env` and fill in the IDs.

`LOG_GUILD_ID` is the ID of the separate server where logs should be sent. The bot must be a member of that server and have permission to send embeds/messages in `LOGS_CHANNEL_ID`.

## Start

```bash
npm install
npm start
```

You do not need to run `npm run deploy` anymore.
