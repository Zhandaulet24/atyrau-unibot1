require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const templates = JSON.parse(fs.readFileSync('templates.json', 'utf-8'));

function findAnswer(msg) {
  const lower = msg.toLowerCase();
  for (const t of templates) {
    if (lower.includes(t.key.toLowerCase())) {
      return t.value;
    }
  }
  return null; // егер табылмаса
}

async function askGPT(question) {
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Сен университет туралы ақпарат беретін көмекші ботсың.' },
        { role: 'user', content: question }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return res.data.choices[0].message.content.trim();
}

bot.start((ctx) => ctx.reply("Сәлем! Мен университет туралы сұрақтарға жауап берем."));
bot.help((ctx) => ctx.reply("Сұрақ қой: Құжаттар қандай? Грант бар ма? т.с.с."));
bot.on('text', async (ctx) => {
  const userText = ctx.message.text;
  const answer = findAnswer(userText);

  if (answer) {
    ctx.reply(answer);
  } else {
    ctx.reply("Жауап іздеп жатырмын..");
    try {
      const aiAnswer = await askGPT(userText);
      ctx.reply(aiAnswer);
    } catch (err) {
      ctx.reply("Я не могу ответить на этот вопрос, так как он не содержит конкретной информации о НАО "Шәкәрім Университет". Пожалуйста, перефразируйте свой вопрос или предоставьте больше деталей.");
      console.error(err);
    }
  }
});

bot.launch();
console.log("✅ Telegram AI-бот іске қосылды");
