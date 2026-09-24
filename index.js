const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// 1. إعداد البوت مع الصلاحيات المطلوبة
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// قاعدة بيانات مصغرة في الذاكرة لتخزين أرصدة الروبكس
const balances = new Map();

function getBalance(userId) {
  return balances.get(userId) || 0;
}

function addBalance(userId, amount) {
  const current = getBalance(userId);
  balances.set(userId, current + amount);
  return balances.get(userId);
}

function takeBalance(userId, amount) {
  const current = getBalance(userId);
  const newBal = Math.max(0, current - amount);
  balances.set(userId, newBal);
  return newBal;
}

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

// 3. تسجيل أوامر السلاش عند التشغيل
client.once('ready', async () => {
  console.log(`✅ البوت شغال بنجاح باسم: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('box')
      .setDescription('افتح صندوق الحظ العشوائي واحصل على جائزتك!'),
    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('حظر عضو من السيرفر')
      .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('سبب الحظر')),
    new SlashCommandBuilder()
      .setName('lock')
      .setDescription('قفل الروم الحالي عن الكتابة'),
    new SlashCommandBuilder()
      .setName('unlock')
      .setDescription('فتح الروم الحالي للكتابة'),
    new SlashCommandBuilder()
      .setName('bal')
      .setDescription('عرض محفظتك وكم لديك من الروبكس')
      .addUserOption(option => option.setName('target').setDescription('عرض محفظة شخص معين'))
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ تم تسجيل جميع أوامر السلاش بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
});

// 4. الاستجابة لأوامر السلاش
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
    if (!target) return interaction.reply({ content: '❌ العضو غير موجود!', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ لا يمكنني حظر هذا العضو!', ephemeral: true });

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

  if (interaction.commandName === 'lock') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية إدارة القنوات!', ephemeral: true });
    }
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      const lockEmbed = new EmbedBuilder()
        .setTitle('🔒 تم قفل الروم بنجاح!')
        .setDescription(`تم قفل الروم **${interaction.channel.name}**.\n• **بواسطة:** ${interaction.user}`)
        .setColor(0xE74C3C)
        .setTimestamp();
      await interaction.reply({ embeds: [lockEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ حدث خطأ أثناء قفل الروم!', ephemeral: true });
    }
  }

  if (interaction.commandName === 'unlock') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية إدارة القنوات!', ephemeral: true });
    }
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
      const unlockEmbed = new EmbedBuilder()
        .setTitle('🔓 تم فتح الروم بنجاح!')
        .setDescription(`تم فتح الروم **${interaction.channel.name}**.\n• **بواسطة:** ${interaction.user}`)
        .setColor(0x2ECC71)
        .setTimestamp();
      await interaction.reply({ embeds: [unlockEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ حدث خطأ أثناء فتح الروم!', ephemeral: true });
    }
  }

  if (interaction.commandName === 'bal') {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const userBal = getBalance(targetUser.id);
    const balEmbed = new EmbedBuilder()
      .setTitle('💳 محفظة الروبكس (Robux)')
      .setDescription(`صاحب المحفظة: **${targetUser.username}**\n\n### 🪙 الرصيد الحالي:\n> **${userBal.toLocaleString()} R$** روبكس`)
      .setColor(0x00FF88)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
    await interaction.reply({ embeds: [balEmbed] });
  }
});

// 5. الاستجابة للأوامر النصية
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const args = content.split(/ +/);
  const command = args[0].toLowerCase();

  // أمر الصندوق
  if (command === 'box' || command === '!box' || command === 'بوكس') {
    const embed = createBoxEmbed(message.author);
    return message.reply({ embeds: [embed] });
  }

  // أمر البان السريع (تف)
  if (command === 'تف' || command === '!ban' || command === 'بان') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ ليس لديك صلاحية حظر الأعضاء (`BAN_MEMBERS`)!');
    }

    // جلب المنشن مباشرة من الـ cache أو المعرف لتفادي التأخير والبطء
    const target = message.mentions.members.first() || (args[1] ? message.guild.members.cache.get(args[1].replace(/[<@!>]/g, '')) : null);

    if (!target) return message.reply('❌ يرجى منشن العضو المطلوب حظره! مثال: `تف @العضو`');
    if (target.id === message.author.id) return message.reply('❌ لا يمكنك حظر نفسك!');
    if (target.id === client.user.id) return message.reply('❌ لا يمكنك حظري!');
    if (!target.bannable) return message.reply('❌ لا أستطيع حظر هذا العضو (رتبته أعلى مني أو هو أدمن)!');

    const reason = args.slice(2).join(' ') || 'لم يتم تحديد سبب';
    try {
      await target.ban({ reason });
      const banEmbed = new EmbedBuilder()
        .setTitle('🔨 تم حظر العضو بنجاح!')
        .setDescription(`• **العضو المحظور:** ${target.user.tag}\n• **بواسطة:** ${message.author}\n• **السبب:** ${reason}`)
        .setColor(0xFF0000)
        .setTimestamp();
      await message.reply({ embeds: [banEmbed] });
    } catch (error) {
      console.error(error);
      message.reply('❌ حدث خطأ أثناء محاولة حظر العضو!');
    }
  }

  // أمر قفل الشات
  if (command === 'قفل' || command === 'lock' || command === '!lock') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ليس لديك صلاحية إدارة القنوات!');
    }
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      const lockEmbed = new EmbedBuilder()
        .setTitle('🔒 تم قفل الروم بنجاح!')
        .setDescription(`تم قفل الروم **${message.channel.name}**.\n• **بواسطة:** ${message.author}`)
        .setColor(0xE74C3C)
        .setTimestamp();
      await message.reply({ embeds: [lockEmbed] });
    } catch (error) {
      console.error(error);
      message.reply('❌ حدث خطأ أثناء قفل الروم!');
    }
  }

  // أمر فتح الشات
  if (command === '+فتح' || command === 'فتح' || command === 'unlock' || command === '!unlock') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ ليس لديك صلاحية إدارة القنوات!');
    }
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
      const unlockEmbed = new EmbedBuilder()
        .setTitle('🔓 تم فتح الروم بنجاح!')
        .setDescription(`تم فتح الروم **${message.channel.name}**.\n• **بواسطة:** ${message.author}`)
        .setColor(0x2ECC71)
        .setTimestamp();
      await message.reply({ embeds: [unlockEmbed] });
    } catch (error) {
      console.error(error);
      message.reply('❌ حدث خطأ أثناء فتح الروم!');
    }
  }

  // --- 💳 نظام المحفظة والأرصدة (Robux) ---

  // أمر الرصيد !bal أو رصيدي
  if (command === '!bal' || command === 'رصيدي' || command === 'محفظتي') {
    const targetMember = message.mentions.members.first() || message.member;
    const userBal = getBalance(targetMember.id);

    const balEmbed = new EmbedBuilder()
      .setTitle('💳 محفظة الروبكس (Robux)')
      .setDescription(`صاحب المحفظة: ${targetMember}\n\n### 🪙 الرصيد الحالي:\n> **${userBal.toLocaleString()} R$** روبكس`)
      .setColor(0x00FF88)
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'نظام إدارة الأرصدة والمحفظة' })
      .setTimestamp();

    return message.reply({ embeds: [balEmbed] });
  }

  // أمر إضافة الروبكس (+add @منشن الرقم أو اضف @منشن الرقم)
  if (command === '+add' || command === 'اضف') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ ليس لديك صلاحية إضافة روبكس للإداريين!');
    }

    const targetMember = message.mentions.members.first();
    const amount = parseInt(args.find(arg => !isNaN(arg) && !arg.includes('<@')));

    if (!targetMember || isNaN(amount) || amount <= 0) {
      return message.reply('❌ طريقة الاستخدام الخاطئة! الطريقة الصحيحة:\n`+add @العضو 100`');
    }

    const newBalance = addBalance(targetMember.id, amount);

    const addEmbed = new EmbedBuilder()
      .setTitle('✅ تم إضافة الروبكس بنجاح!')
      .setDescription(`• **العضو المستلم:** ${targetMember}\n• **المبلغ المضاف:** \`+${amount.toLocaleString()} R$\` روبكس\n• **بواسطة الإداري:** ${message.author}\n\n### 💳 الرصيد الجديد بالمحفظة:\n> **${newBalance.toLocaleString()} R$** روبكس`)
      .setColor(0x2ECC71)
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return message.reply({ embeds: [addEmbed] });
  }

  // أمر سحب الروبكس ($take @منشن الرقم أو سحب @منشن الرقم)
  if (command === '$take' || command === 'سحب') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ ليس لديك صلاحية سحب الروبكس!');
    }

    const targetMember = message.mentions.members.first();
    const amount = parseInt(args.find(arg => !isNaN(arg) && !arg.includes('<@')));

    if (!targetMember || isNaN(amount) || amount <= 0) {
      return message.reply('❌ طريقة الاستخدام الخاطئة! الطريقة الصحيحة:\n`$take @العضو 50`');
    }

    const newBalance = takeBalance(targetMember.id, amount);

    const takeEmbed = new EmbedBuilder()
      .setTitle('💸 تم سحب الروبكس بنجاح!')
      .setDescription(`• **العضو:** ${targetMember}\n• **المبلغ المسحوب:** \`-${amount.toLocaleString()} R$\` روبكس\n• **بواسطة الإداري:** ${message.author}\n\n### 💳 الرصيد المتبقي بالمحفظة:\n> **${newBalance.toLocaleString()} R$** روبكس`)
      .setColor(0xE74C3C)
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return message.reply({ embeds: [takeEmbed] });
  }
});

// 6. تشغيل البوت
client.login(process.env.DISCORD_TOKEN);
