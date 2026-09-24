const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// 1. إعداد البوت مع الصلاحيات المطلوبة
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. قائمة جوائز صندوق الحظ
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

// 3. تسجيل أوامر السلاش (/box و /ban) عند التشغيل
client.once('ready', async () => {console.log(`✅ البوت شغال بنجاح باسم: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('box')
      .setDescription('افتح صندوق الحظ العشوائي واحصل على جائزتك!'),
    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('حظر عضو من السيرفر')
      .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('سبب الحظر'))
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ تم تسجيل الأوامر بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
});

// 4. الاستجابة لأوامر السلاش (/box و /ban)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'box') {
    const embed = createBoxEmbed(interaction.user);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء!', ephemeral: true });
    }

    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';

    if (!target) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر!', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ لا يمكنني حظر هذا العضو (رتبته أعلى مني أو لا أملك صلاحيات كافية)!', ephemeral: true });

    try {
      await target.ban({ reason });
      const embed = new EmbedBuilder()
        .setTitle('🔨 تم حظر العضو بنجاح!')
        .setDescription(`• **العضو المحظور:** ${target.user.tag}\n• **بواسطة:** ${interaction.user}\n• **السبب:** ${reason}`)
        .setColor(0xFF0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الحظر!', ephemeral: true });
    }
  }
});

// 5. الاستجابة للأوامر الكتابية (box أو !box) و أمر البان الاختصاري (تف)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // أمر الصندوق
  if (command === 'box' || command === '!box' || command === 'بوكس') {
    const embed = createBoxEmbed(message.author);
    return message.reply({ embeds: [embed] });
  }

  // أمر البان بالاختصار (تف) أو (!ban أو بان)
  if (command === 'تف' || command === '!ban' || command === 'بان') {
    // التأكد من صلاحية الشخص
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ ليس لديك صلاحية حظر الأعضاء (`BAN_MEMBERS`)!');
    }

    // تحديد العضو المراد حظره (عبر المنشن أو الـ ID)
    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

    if (!target) {
      return message.reply('❌ يرجى تحديد العضو المطلوب حظره! مثال:\n`تف @user السبب`');
    }

    if (target.id === message.author.id) return message.reply('❌ لا يمكنك حظر نفسك!');
    if (target.id === client.user.id) return message.reply('❌ لا يمكنك حظري!');
    if (!target.bannable) return message.reply('❌ لا أستطيع حظر هذا العضو! قد تكون رتبته أعلى مني.');

    const reason = args.slice(1).join(' ') || 'لم يتم تحديد سبب';

    try {
      await target.ban({ reason });
      const banEmbed = new EmbedBuilder()
        .setTitle('🔨 تم حظر العضو بنجاح!')
        .setDescription(`• **العضو المحظور:** ${target.user.tag}\n• **بواسطة:** ${message.author}\n• **السبب:** ${reason}`).setColor(0xFF0000)
        .setTimestamp();

      await message.reply({ embeds: [banEmbed] });
    } catch (error) {
      console.error(error);
      message.reply('❌ حدث خطأ أثناء محاولة حظر العضو!');
    }
  }
});

// 6. تشغيل البوت
client.login(process.env.DIوSCORD_TOKEN);
