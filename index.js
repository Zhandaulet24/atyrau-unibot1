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
const { Telegraf, Markup } = require('telegraf');
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

// --- Пайдаланушы тілі мен контекстін сақтау ---
const userLanguage = new Map();
const userContext = new Map();

// --- Білім базасын оқу ---
let knowledgeBase = '';
try {
    knowledgeBase = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8');
    console.log(`✅ '${KNOWLEDGE_FILE}' файлынан база знаний сәтті оқылды.`);
} catch (error) {
    console.error(`Қате: '${KNOWLEDGE_FILE}' файлын оқу мүмкін болмады.`);
    process.exit(1);
}

// --- Gemini API ---
async function askGemini(question, lang = 'kk') {
    const systemPrompt = `
Сен — Халел Досмұхамедов атындағы Атырау университетінің студенттеріне көмектесетін AI-ассистентсің.
Сен тек төменде берілген база знаний негізінде жауап бер.
Өзіңнен ештеңе қоспа. Егер жауап базада жоқ болса, "${lang === 'kk' ? 'Кешіріңіз, бұл сұрақ бойынша менде нақты ақпарат жоқ' : lang === 'ru' ? 'Извините, информации по этому вопросу нет' : 'Sorry, I don’t have information on that'}" деп жауап бер.
Пайдаланушының тілінде (${lang}) жауап бер.

--- БАЗА ЗНАНИЙ ---
${knowledgeBase}
--- БАЗА ЗНАНИЙ СОҢЫ ---
`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: question }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    try {
        const response = await axios.post(API_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.data.candidates[0].content.parts[0].text.trim();
        }
        throw new Error("API жауабында мазмұн табылмады.");
    } catch (error) {
        console.error("Gemini API қатесі:", error.response ? error.response.data : error.message);
        throw new Error("Gemini API-мен байланысу кезінде қате пайда болды.");
    }
}

// --- Мәзірді көрсету функциясы ---
function showMainMenu(ctx, lang) {
    const menus = {
        kk: [
            ['📚 Білім беру бағдарламалары'],
            ['📅 Қабылдау мерзімі', '💰 Оқу ақысы'],
            ['📞 Байланыс', '🔄 Сөйлесуді тазалау'],
            ['🌐 Тілді өзгерту']
        ],
        ru: [
            ['📚 Образовательные программы'],
            ['📅 Сроки приёма', '💰 Стоимость обучения'],
            ['📞 Контакты', '🔄 Очистить диалог'],
            ['🌐 Сменить язык']
        ],
        en: [
            ['📚 Study Programs'],
            ['📅 Admission Dates', '💰 Tuition Fee'],
            ['📞 Contacts', '🔄 Reset Dialog'],
            ['🌐 Change Language']
        ]
    };
    ctx.reply(
        lang === 'kk'
            ? "Сәлеметсіз бе! 👋 Мен — Атырау университетінің AI-ассистентімін.\nТөмендегі мәзірден таңдаңыз:"
            : lang === 'ru'
            ? "Здравствуйте! 👋 Я — AI-ассистент Атырауского университета.\nВыберите пункт меню ниже:"
            : "Hello! 👋 I'm AI Assistant of Atyrau University.\nChoose a menu option below:",
        { reply_markup: { keyboard: menus[lang], resize_keyboard: true } }
    );
}

// --- /start командасы ---
bot.start((ctx) => {
    const lang = userLanguage.get(ctx.chat.id) || 'kk';
    showMainMenu(ctx, lang);
});

// --- /help ---
bot.help((ctx) => {
    const lang = userLanguage.get(ctx.chat.id) || 'kk';
    const text =
        lang === 'kk'
            ? "Маған кез келген сұрақ қойыңыз, мысалы:\n- Грантқа түсу үшін не істеу керек?\n- Platonus жүйесіне қалай кірем?"
            : lang === 'ru'
            ? "Задайте вопрос, например:\n- Как поступить на грант?\n- Как войти в систему Platonus?"
            : "Ask me anything, e.g.:\n- How to apply for a grant?\n- How to access Platonus?";
    ctx.reply(text);
});

// --- /reset ---
bot.command('reset', (ctx) => {
    userContext.delete(ctx.chat.id);
    ctx.reply("🔄 Диалог тазаланды.");
});

// --- /language ---
bot.command('language', (ctx) => {
    ctx.reply(
        "Тілді таңдаңыз / Выберите язык / Choose language:",
        Markup.inlineKeyboard([
            [Markup.button.callback("🇰🇿 Қазақша", 'lang_kk')],
            [Markup.button.callback("🇷🇺 Русский", 'lang_ru')],
            [Markup.button.callback("🇬🇧 English", 'lang_en')]
        ])
    );
});

// --- Inline тіл таңдау батырмалары ---
bot.action('lang_kk', (ctx) => {
    userLanguage.set(ctx.chat.id, 'kk');
    ctx.editMessageText("✅ Тіл: Қазақша");
    showMainMenu(ctx, 'kk');
});
bot.action('lang_ru', (ctx) => {
    userLanguage.set(ctx.chat.id, 'ru');
    ctx.editMessageText("✅ Язык: Русский");
    showMainMenu(ctx, 'ru');
});
bot.action('lang_en', (ctx) => {
    userLanguage.set(ctx.chat.id, 'en');
    ctx.editMessageText("✅ Language: English");
    showMainMenu(ctx, 'en');
});

// --- Негізгі мәзір батырмалары ---
bot.hears(['🌐 Тілді өзгерту', '🌐 Сменить язык', '🌐 Change Language'], (ctx) => {
    ctx.reply(
        "Тілді таңдаңыз / Выберите язык / Choose language:",
        Markup.inlineKeyboard([
            [Markup.button.callback("🇰🇿 Қазақша", 'lang_kk')],
            [Markup.button.callback("🇷🇺 Русский", 'lang_ru')],
            [Markup.button.callback("🇬🇧 English", 'lang_en')]
        ])
    );
});

bot.hears(['🔄 Сөйлесуді тазалау', '🔄 Очистить диалог', '🔄 Reset Dialog'], (ctx) => {
    userContext.delete(ctx.chat.id);
    ctx.reply("🔄 Диалог тазаланды.");
});

bot.hears(['📚 Білім беру бағдарламалары', '📚 Образовательные программы', '📚 Study Programs'], (ctx) => {
    ctx.reply("Сұраңыз, мысалы: 'Информатика мамандығына қалай түсем?'");
});

bot.hears(['📅 Қабылдау мерзімі', '📅 Сроки приёма', '📅 Admission Dates'], (ctx) => {
    ctx.reply("Құжат қабылдау мерзімі: 10 маусымнан 25 тамызға дейін.");
});

bot.hears(['💰 Оқу ақысы', '💰 Стоимость обучения', '💰 Tuition Fee'], (ctx) => {
    ctx.reply("Оқу ақысы бағдарламаға байланысты. Орташа: 500 000 – 700 000 теңге/жыл.");
});

bot.hears(['📞 Байланыс', '📞 Контакты', '📞 Contacts'], (ctx) => {
    ctx.reply("Қабылдау комиссиясы:\n📍 Атырау қ., Студенттер даңғылы, 1\n📞 +7 (7122) 27-63-23\n✉️ kense@asu.edu.kz");
});

// --- Барлық мәтіндерге AI жауап ---
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const lang = userLanguage.get(ctx.chat.id) || 'kk';

    // Мәзір сөздері болмаса — AI жауап береді
    if (!text.startsWith('📚') && !text.startsWith('📅') && !text.startsWith('💰') && !text.startsWith('📞') && !text.startsWith('🔄') && !text.startsWith('🌐')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${ctx.from.username || 'user'}: ${text}`);

        const waitMsg = await ctx.reply(lang === 'kk' ? "Ойланудамын... 🧠" : lang === 'ru' ? "Думаю... 🧠" : "Thinking... 🧠");

        try {
            const answer = await askGemini(text, lang);
            await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, answer);
        } catch {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waitMsg.message_id,
                null,
                lang === 'kk'
                    ? "Кешіріңіз, қате пайда болды. Кейінірек қайталап көріңіз 🙏"
                    : lang === 'ru'
                    ? "Извините, произошла ошибка. Попробуйте позже 🙏"
                    : "Sorry, an error occurred. Please try again later 🙏"
            );
        }
    }
});

bot.launch();
console.log("✅ Telegram AI-бот мәзірмен, тіл таңдаумен және барлық командалармен іске қосылды!");
