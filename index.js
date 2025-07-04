require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const templates = JSON.parse(fs.readFileSync('templates.json', 'utf-8'));

function findAnswer(msg) {
  const lower = msg.toLowerCase();
  for (const t of templates) {
    if (lower.includes(t.key.toLowerCase())) {
      return t.value;
    }
  }
  return "Кешіріңіз, бұл сұраққа дайын жауап табылмады.";
}

bot.start((ctx) => ctx.reply("Сәлем! Университет туралы сұрағыңызды жазыңыз."));
bot.help((ctx) => ctx.reply("Қандай құжаттар, гранттар, шекті балл туралы сұраңыз."));
bot.on('text', (ctx) => {
  const answer = findAnswer(ctx.message.text);
  ctx.reply(answer);
});

bot.launch();
console.log("✅ Telegram бот іске қосылды");