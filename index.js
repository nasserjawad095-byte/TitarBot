const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 1. إعداد البوت مع الصلاحيات
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. قائمة الجوائز والنتائج مع الألوان
const boxItems = [
  {
    name: "🪙 صرة عملات ذهبية",
    description: "مبروك! حصلت على **100 عملة ذهبية** أضيفت لرصيدك!",
    color: 0xF1C40F,
    rarity: "شائع"
  },
  {
    name: "⚔️ سيف الأسطورة النادر",
    description: "عاش! حصلت على **سيف ناري نادِر** للقتال!",
    color: 0x3498DB,
    rarity: "نادر"
  },
  {
    name: "🛡️ درع الفولاذ الصلب",
    description: "حماية ممتازة! حصلت على **درع حماية قوي**!",
    color: 0x95A5A6,
    rarity: "غير شائع"
  },
  {
    name: "👑 تاج الإمبراطور الأسطوري",
    description: "يا لك من محظوظ! حصلت على **التاج الأسطوري الأغلى**!",
    color: 0x9B59B6,
    rarity: "خرافي"
  },
  {
    name: "💥 صندوق ملغوم!",
    description: "للأسف.. انفجر الصندوق وطلع **فاضي**! حظاً أوفّر المره القادمة.",
    color: 0xE74C3C,
    rarity: "حظ سيء"
  }
];

// دالة إنشاء الامبيد
function createBoxEmbed(user) {
  const reward = boxItems[Math.floor(Math.random() * boxItems.length)];
  return new EmbedBuilder()
    .setTitle('🎁 فتحت صندوق الحظ!')
    .setDescription(`أهلاً بك **${user.username}**، إليك ما حصلت عليه:\n\n### ${reward.name}\n>${reward.description}`)
    .addFields({ name: '✨ درجة الندرة:', value: `\`${reward.rarity}\``, inline: true })
    .setColor(reward.color)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'صندوق الحظ • نظام البوت الخاص' })
    .setTimestamp();
}

// 3. تسجيل أمر السلاش تلقائياً عند التشغيل
client.once('ready', async () => {
  console.log(`✅ البوت شغال بنجاح باسم: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('box')
      .setDescription('افتح صندوق الحظ العشوائي واحصل على جائزتك!')
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ تم تسجيل أمر /box بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
});

// 4. الاستجابة لأمر السلاش /box
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'box') {
    const embed = createBoxEmbed(interaction.user);
    await interaction.reply({ embeds: [embed] });
  }
});

// 5. الاستجابة للأمر المكتوب (box أو !box أو بوكس)
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase().trim();
  if (content === 'box' || content === '!box' || content === 'بوكس') {
    const embed = createBoxEmbed(message.author);
    await message.reply({ embeds: [embed] });
  }
});

// 6. تشغيل البوت عبر التوكن
client.login(process.env.DISCORD_TOKEN);
