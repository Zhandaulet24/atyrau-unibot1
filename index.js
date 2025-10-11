// require('dotenv').config();
// const { Telegraf } = require('telegraf');
// const fs = require('fs');
// const axios = require('axios');

// const bot = new Telegraf(process.env.BOT_TOKEN);
// const templates = JSON.parse(fs.readFileSync('templates.json', 'utf-8'));

// function findAnswer(msg) {
//   const lower = msg.toLowerCase();
//   for (const t of templates) {
//     if (lower.includes(t.key.toLowerCase())) {
//       return t.value;
//     }
//   }
//   return null; // егер табылмаса
// }

// async function askGPT(question) {
//   const res = await axios.post(
//     'https://api.openai.com/v1/chat/completions',
//     {
//       model: 'gpt-3.5-turbo',
//       messages: [
//         { role: 'system', content: 'Сен университет туралы ақпарат беретін көмекші ботсың.' },
//         { role: 'user', content: question }
//       ]
//     },
//     {
//       headers: {
//         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//         'Content-Type': 'application/json'
//       }
//     }
//   );
//   return res.data.choices[0].message.content.trim();
// }

// bot.start((ctx) => ctx.reply("Сәлем! Мен университет туралы сұрақтарға жауап берем."));
// bot.help((ctx) => ctx.reply("Сұрақ қой: Құжаттар қандай? Грант бар ма? т.с.с."));
// bot.on('text', async (ctx) => {
//   const userText = ctx.message.text;
//   const answer = findAnswer(userText);

//   if (answer) {
//     ctx.reply(answer);
//   } else {
//     ctx.reply("*** Мен бұл сұраққа жауап бере алмаймын, өйткені онда 'Халел Досмұхамедов атындағы Атырау университеті' КЕАҚ туралы нақты ақпарат жоқ *** Я не могу ответить на этот вопрос, так как он не содержит конкретной информации о НАО 'Атырауский университет имени Халела Досмухамедова' ***");
//     try {
//       const aiAnswer = await askGPT(userText);
//       ctx.reply(aiAnswer);
//     } catch (err) {
//       ctx.reply("*** Сұрағыңызды қайталаңыз немесе қосымша мәліметтер беріңіз ***  Пожалуйста, перефразируйте свой вопрос или предоставьте больше деталей ***");
//       console.error(err);
//     }
//   }
// });

// bot.launch();
// console.log("✅ Telegram AI-бот іске қосылды");


require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');
const axios = require('axios');

// --- Конфигурация ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const KNOWLEDGE_FILE = 'system.txt';

if (!BOT_TOKEN || !GEMINI_API_KEY) {
    console.error("Қате: BOT_TOKEN немесе GEMINI_API_KEY .env файлында көрсетілмеген.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

let knowledgeBase = '';
try {
    knowledgeBase = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8');
    console.log(`✅ '${KNOWLEDGE_FILE}' файлынан база знаний сәтті оқылды.`);
} catch (error) {
    console.error(`Қате: '${KNOWLEDGE_FILE}' файлын оқу мүмкін болмады. Файлдың бар екеніне көз жеткізіңіз.`);
    process.exit(1);
}


async function askGemini(question) {
    const systemPrompt = `
Сен — Халел Досмұхамедов атындағы Атырау университетінің студенттеріне көмектесетін AI-ассистентсің.
Сенің міндетің — тек қана төменде берілген база знаний негізінде жауап беру.
Өзіңнен ешқандай ақпарат қоспа. Егер жауап базада жоқ болса, "Кешіріңіз, бұл сұрақ бойынша менде нақты ақпарат жоқ" деп жауап бер.
Пайдаланушының тілінде (қазақша немесе орысша) жауап бер.

--- БАЗА ЗНАНИЙ ---
${knowledgeBase}
--- БАЗА ЗНАНИЙ СОҢЫ ---
`;

    // const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:GenerateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{
            parts: [{ text: question }]
        }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    try {
        const response = await axios.post(API_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
            const content = response.data.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
                return content.parts[0].text.trim();
            }
        }
        throw new Error("API жауабында мазмұн табылмады.");

    } catch (error) {
        console.error("Gemini API қатесі:", error.response ? error.response.data : error.message);
        throw new Error("Gemini API-мен байланысу кезінде қате пайда болды.");
    }
}

bot.start((ctx) => ctx.reply("Сәлем! Мен Халел Досмұхамедов атындағы Атырау университеті туралы сұрақтарыңызға жауап беруге дайынмын."));
bot.help((ctx) => ctx.reply("Маған кез келген сұрақты қойыңыз, мысалы: 'Грантқа түсу үшін не істеу керек?' немесе 'Platonus-тан парольді қалай аламын?'."));

bot.on('text', async (ctx) => {
    const userText = ctx.message.text;
    console.log(`[${new Date().toLocaleTimeString()}] Жаңа сұрақ: "${userText}"`);

    const thinkingMessage = await ctx.reply("Ойланудамын, сәл күте тұрыңыз... 🧠");

    try {
        const aiAnswer = await askGemini(userText);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            thinkingMessage.message_id,
            null,
            aiAnswer
        );
    } catch (err) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            thinkingMessage.message_id,
            null,
            "Кешіріңіз, қате пайда болды. Сәлден соң қайталап көріңіз."
        );
    }
});

bot.launch();
console.log("✅ Telegram AI-бот (Axios) жаңа база знаниймен іске қосылды!");
