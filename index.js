const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// 1. إعداد البوت والصلاحيات
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
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

// 2. تسجيل الأوامر عند التشغيل
client.once('ready', async () => {
  console.log(`✅ البوت شغال بنجاح باسم: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').addUserOption(o => o.setName('target').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالي'),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالي'),
    new SlashCommandBuilder().setName('bal').setDescription('عرض محفظة الروبكس').addUserOption(o => o.setName('target').setDescription('العضو')),
    new SlashCommandBuilder().setName('giveaway').setDescription('بدء مسابقة جيفواي جديدة').addStringOption(o => o.setName('prize').setDescription('الجائزة').setRequired(true)).addIntegerOption(o => o.setName('time').setDescription('الوقت بالدقائق').setRequired(true)),
    new SlashCommandBuilder().setName('rps').setDescription('لعبة حجر ورق مقص ضد البوت').addStringOption(o => o.setName('choice').setDescription('اختر: حجر، ورقة، مقص').setRequired(true).addChoices({ name: 'حجر 🪨', value: 'حجر' }, { name: 'ورقة 📄', value: 'ورقة' }, { name: 'مقص ✂️', value: 'مقص' }))
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ تم تسجيل أوامر السلاش بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
});

// 3. الاستجابة لأوامر السلاش والأزرار التفاعلية
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
      const target = interaction.options.getMember('target');
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      if (!target || !target.bannable) return interaction.reply({ content: '❌ لا يمكنني حظر هذا العضو!', ephemeral: true });
      await target.ban({ reason });
      return interaction.reply({ content: `🔨 تم حظر العضو ${target.user.tag} بنجاح.` });
    }

    if (interaction.commandName === 'lock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      return interaction.reply({ content: '🔒 تم قفل الروم بنجاح.' });
    }

    if (interaction.commandName === 'unlock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
      return interaction.reply({ content: '🔓 تم فتح الروم بنجاح.' });
    }

    if (interaction.commandName === 'bal') {
      const targetUser = interaction.options.getUser('target') || interaction.user;
      const userBal = getBalance(targetUser.id);
      const embed = new EmbedBuilder().setTitle('💳 محفظة الروبكس').setDescription(`**${targetUser.username}**\n🪙 الرصيد: **${userBal} R$**`).setColor(0x00FF88);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'rps') {
      const userChoice = interaction.options.getString('choice');
      const choices = ['حجر', 'ورقة', 'مقص'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      let result = '';
      if (userChoice === botChoice) result = '🤝 تعادل!';
      else if ((userChoice === 'حجر' && botChoice === 'مقص') || (userChoice === 'ورقة' && botChoice === 'حجر') || (userChoice === 'مقص' && botChoice === 'ورقة')) result = '🎉 مبروك، أنت الفائز!';
      else result = '🤖 لقد فزت عليك! هارد لك.';
      
      return interaction.reply(`اخترت: **${userChoice}**\nاختيار البوت: **${botChoice}**\n\n**النتيجة:** ${result}`);
    }

    if (interaction.commandName === 'giveaway') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ للأدميرال فقط!', ephemeral: true });
      const prize = interaction.options.getString('prize');
      const timeMin = interaction.options.getInteger('time');

      const embed = new EmbedBuilder()
        .setTitle('🎉 جيفواي جديد (Giveaway)!')
        .setDescription(`🎁 الجائزة: **${prize}**\n⏱️ ينتهي خلال: **${timeMin} دقائق**\n\nاضغط على الزر أدناه للمشاركة! 👇`)
        .setColor(0xF1C40F)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_gw').setLabel('🎉 اشترك بالمسابقة').setStyle(ButtonStyle.Success)
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const entrants = new Set();

      const collector = msg.createMessageComponentCollector({ time: timeMin * 60 * 1000 });
      collector.on('collect', async i => {
        if (entrants.has(i.user.id)) return i.reply({ content: '⚠️ أنت مشارك بالفعل في المسابقة!', ephemeral: true });
        entrants.add(i.user.id);
        await i.reply({ content: '✅ تمت إضافتك بنجاح إلى قائمة المشاركين!', ephemeral: true });
      });

      collector.on('end', async () => {
        if (entrants.size === 0) return interaction.followUp('❌ انتهت المسابقة ولم يشارك أحد!');
        const entrantsArray = Array.from(entrants);
        const winnerId = entrantsArray[Math.floor(Math.random() * entrantsArray.length)];
        const winner = await interaction.guild.members.fetch(winnerId).catch(() => null);

        const endEmbed = new EmbedBuilder()
          .setTitle('🎊 انتهت المسابقة!')
          .setDescription(`🎁 الجائزة: **${prize}**\n👑 الفائز الحظيظ: ${winner ? winner : '<@' + winnerId + '>'}\n\nمبروك ألف مبروك! 🎉`)
          .setColor(0x2ECC71);
        await interaction.followUp({ embeds: [endEmbed] });
      });
    }
  }
});

// 4. الأوامر النصية السريعة باللغة العربية
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.trim().split(/ +/);
  const command = args[0].toLowerCase();

  // البان السريع (تف)
  if (command === 'تف' || command === '!ban' || command === 'بان') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ ليس لديك صلاحية!');
    const target = message.mentions.members.first() || (args[1] ? message.guild.members.cache.get(args[1].replace(/[<@!>]/g, '')) : null);
    if (!target || !target.bannable) return message.reply('❌ لا يمكنني حظر هذا العضو!');
    const reason = args.slice(2).join(' ') || 'بدون سبب';
    await target.ban({ reason });
    return message.reply(`🔨 تم حظر العضو ${target.user.tag} بنجاح.`);
  }

  // القفل والفتح
  if (command === 'قفل' || command === 'lock') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ ليس لديك صلاحية!');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.reply('🔒 تم قفل الروم بنجاح.');
  }
  if (command === 'فتح' || command === 'unlock') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ ليس لديك صلاحية!');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.reply('🔓 تم فتح الروم بنجاح.');
  }

  // نظام الروبكس (المحفظة)
  if (command === '!bal' || command === 'رصيدي' || command === 'محفظتي') {
    const targetMember = message.mentions.members.first() || message.member;
    const userBal = getBalance(targetMember.id);
    const embed = new EmbedBuilder().setTitle('💳 محفظة الروبكس').setDescription(`**${targetMember.user.username}**\n🪙 الرصيد: **${userBal} R$**`).setColor(0x00FF88);
    return message.reply({ embeds: [embed] });
  }

  // إضافة روبكس (+add @منشن الرقم)
  if (command === '+add' || command === 'اضف') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للأدميرال فقط!');
    const targetMember = message.mentions.members.first();
    const amount = parseInt(args.find(arg => !isNaN(arg) && !arg.includes('<@')));
    if (!targetMember || isNaN(amount) || amount <= 0) return message.reply('❌ الاستخدام الخاطئ! اكتب: `+add @العضو 100`');
    const newBal = addBalance(targetMember.id, amount);
    return message.reply(`✅ تم إضافة \`${amount}\` روبكس لـ ${targetMember}. الرصيد الجديد: **${newBal} R$**`);
  }

  // سحب روبكس ($take @منشن الرقم)
  if (command === '$take' || command === 'سحب') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للأدميرال فقط!');
    const targetMember = message.mentions.members.first();
    const amount = parseInt(args.find(arg => !isNaN(arg) && !arg.includes('<@')));
    if (!targetMember || isNaN(amount) || amount <= 0) return message.reply('❌ الاستخدام الخاطئ! اكتب: `$take @العضو 50`');
    const newBal = takeBalance(targetMember.id, amount);
    return message.reply(`💸 تم سحب \`${amount}\` روبكس من ${targetMember}. الرصيد Mتبقي: **${newBal} R$**`);
  }

  // إعطاء رول (+رول @العضو @اسم_الرول)
  if (command === '+رول' || command === 'عطاء_رول') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ ليس لديك صلاحية إدارة الرولات!');
    const targetMember = message.mentions.members.first();
    const roleArg = args.slice(2).join(' ').replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleArg) || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleArg.toLowerCase()));
    
    if (!targetMember || !role) return message.reply('❌ الاستخدام الخاطئ! اكتب: `+رول @العضو اسم_الرول`');
    try {
      await targetMember.roles.add(role);
      return message.reply(`✅ تم إعطاء رول **${role.name}** للعضو ${targetMember} بنجاح!`);
    } catch (e) {
      return message.reply('❌ حدث خطأ، تأكد أن رتبة البوت أعلى من الرول المراد إعطاؤه.');
    }
  }

  // إزالة رول ($شيل @العضو @اسم_الرول)
  if (command === '$شيل' || command === 'سحب_رول') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ ليس لديك صلاحية إدارة الرولات!');
    const targetMember = message.mentions.members.first();
    const roleArg = args.slice(2).join(' ').replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleArg) || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleArg.toLowerCase()));
    
    (async () => {
      if (!targetMember || !role) return message.reply('❌ الاستخدام الخاطئ! اكتب: `$شيل @العضو اسم_الرول`');
      try {
        await targetMember.roles.remove(role);
        return message.reply(`🗑️ تم إزالة رول **${role.name}** من العضو ${targetMember} بنجاح!`);
      } catch (e) {
        return message.reply('❌ حدث خطأ، تأكد من صلاحيات البوت.');
      }
    })();
  }
});

// 5. تشغيل البوت
client.login(process.env.DISCORD_TOKEN);
