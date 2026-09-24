const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const OWNER_ROLES = ['1536796640399200447', '1539678217311617195'];
const STAFF_ROLE_ID = '1530435760183054337';

const afkUsers = new Map();
const streaks = new Map();
const messageCounts = new Map();

client.once('ready', async () => {
  console.log(`🚀 تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const userMsgCount = messageCounts.get(message.author.id) || 0;
  messageCounts.set(message.author.id, userMsgCount + 1);

  if (message.content.trim() === 'السلام عليكم') {
    return message.reply('وعليكم السلام منور').catch(() => {});
  }

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(user => {
      if (afkUsers.has(user.id)) {
        const data = afkUsers.get(user.id);
        message.reply(`💤 العضو **${user.username}** في وضع الـ AFK حالياً.\n📝 السبب: **${data.reason}**`).catch(() => {});
      }
    });
  }

  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply('👋 عوداً حميداً! تم إزالة حالة الـ AFK الخاصة بك.').then(msg => {
      setTimeout(() => msg.delete().catch(() => {}), 4000);
    }).catch(() => {});
  }

  const todayStr = new Date().toDateString();
  let userStreak = streaks.get(message.author.id) || { count: 0, lastDate: '' };
  
  if (userStreak.lastDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (userStreak.lastDate === yesterday.toDateString()) {
      userStreak.count += 1;
    } else {
      userStreak.count = 1;
    }
    userStreak.lastDate = todayStr;
    streaks.set(message.author.id, userStreak);
  }

  const currentStreak = userStreak.count;
  const originalNickname = message.member.displayName.replace(/🔥\d+\s*/g, '').trim();
  const desiredNickname = `🔥${currentStreak} ${originalNickname}`;
  
  if (message.member.manageable && message.member.nickname !== desiredNickname) {
    message.member.setNickname(desiredNickname).catch(() => {});
  }

  if (!message.content.startsWith('+')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const sendError = (text) => message.reply(`❌ **خطأ:** ${text}`).catch(() => {});
  
  let isOwner = false;
  let isStaff = false;
  try {
    isOwner = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.some(role => OWNER_ROLES.includes(role.id));
    isStaff = isOwner || message.member.roles.cache.has(STAFF_ROLE_ID);
  } catch (e) {
    isOwner = false;
    isStaff = false;
  }

  if (command === 'help' || command === 'اوامر') {
    const page1 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 1/2)')
      .setDescription('جميع الأوامر تبدأ بعلامة `+`')
      .setColor(0x3498DB)
      .addFields(
        { name: '`+باند`', value: '**لتبنيد العضو من السيرفر**' },
        { name: '`+برا`', value: '**لطرد العضو من السيرفر**' },
        { name: '`+اخفاء`', value: '**لإخفاء الروم عن الأعضاء**' },
        { name: '`+ظهور`', value: '**لإظهار الروم للأعضاء**' },
        { name: '`+رول`', value: '**إعطاء رتبة لعضو محدد**' },
        { name: '`+شيل`', value: '**إزالة رتبة من عضو محدد**' },
        { name: '`+العاب`', value: '**لألعاب عشوائية ممتعة**' },
        { name: '`+afk`', value: '**لتفعيل وضع الانشغال والابتعاد**' },
        { name: '`+ستريك`', value: `**عرض عدد أيام الستريك المتتالية (🔥${currentStreak})**` },
        { name: '`+نك`', value: '**تغيير النك نيم لأي عضو مع المنشن**' }
      );

    const page2 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 2/2)')
      .setDescription('جميع الأوامر تبدأ بعلامة `+`')
      .setColor(0x3498DB)
      .addFields(
        { name: '`+مسح` أو `+مسح [العدد]`', value: '**لمسح وحذف الرسائل**' },
        { name: '`+جيفوايات`', value: '**لإنشاء مسابقة جيفواي عادية**' },
        { name: '`+امبيد`', value: '**لإرسال رسالة بتصميم الامبيد**' },
        { name: '`+say`', value: '**جعل البوت يكرر كلامك**' },
        { name: '`+تايم`', value: '**إعطاء ميوت مؤقت (تايم آوت)**' },
        { name: '`+انتايم`', value: '**فك التايم آوت عن العضو**' },
        { name: '`+راتبي`', value: '**عرض الراتب اليومي وعدد الرسائل**' }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_page').setLabel('السابق').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('next_page').setLabel('التالي').setStyle(ButtonStyle.Secondary)
    );

    const sentMsg = await message.reply({ embeds: [page1], components: [row] }).catch(() => {});
    if (!sentMsg) return;

    const collector = sentMsg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: '❌ هذه الأوامر ليست لك!', ephemeral: true }).catch(() => {});

      if (i.customId === 'next_page') {
        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev_page').setLabel('السابق').setStyle(ButtonStyle.Secondary).setDisabled(false),
          new ButtonBuilder().setCustomId('next_page').setLabel('التالي').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await i.update({ embeds: [page2], components: [newRow] }).catch(() => {});
      } else if (i.customId === 'prev_page') {
        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev_page').setLabel('السابق').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('next_page').setLabel('التالي').setStyle(ButtonStyle.Secondary).setDisabled(false)
        );
        await i.update({ embeds: [page1], components: [newRow] }).catch(() => {});
      }
    });
    return;
  }

  if (command === 'باند') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.BanMembers)) return sendError('ليس لديك صلاحية لاستخدام هذا الأمر!');
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return sendError('اكتب: `+باند @العضو [السبب]`');
    const reason = args.slice(1).join(' ') || 'بدون سبب';
    try {
      await target.ban({ reason });
      await message.reply(`🔨 **تم تبنيد العضو ${target.user.tag} بنجاح. السبب: ${reason}**`);
    } catch (e) {
      sendError('لا يمكنني تبنيد هذا العضو!');
    }
  }

  if (command === 'برا' || command === 'kick') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.KickMembers)) return sendError('ليس لديك صلاحية لاستخدام هذا الأمر!');
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return sendError('اكتب: `+برا @العضو [السبب]`');
    const reason = args.slice(1).join(' ') || 'بدون سبب';
    try {
      await target.kick(reason);
      await message.reply(`👢 **تم طرد العضو ${target.user.tag} بنجاح. السبب: ${reason}**`);
    } catch (e) {
      sendError('لا يمكنني طرد هذا العضو!');
    }
  }

  if (command === 'نك' || command === 'نيكنيم') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return sendError('ليس لديك صلاحية لتغيير النك نيم!');
    const target = message.mentions.members.first();
    const newNick = args.slice(1).join(' ');
    if (!target || !newNick) return sendError('اكتب هكذا: `+نك @العضو الاسم_الجديد`');
    try {
      await target.setNickname(newNick);
      await message.reply(`✅ **تم تغيير النك نيم للعضو ${target} بنجاح إلى: (${newNick})**`);
    } catch (e) {
      sendError('لا يمكنني تغيير النك نيم لهذا العضو (رتبته أعلى من البوت أو رتبتك)!');
    }
  }

  if (command === 'راتبي') {
    if (!isStaff) return message.reply('❌ **هذا الأمر مخصص للإداريين فقط!**').catch(() => {});
    const count = messageCounts.get(message.author.id) || 0;
    return message.reply(`راتبك ( ليس محدداً بعد ) عدد الرسايل (${count})`).catch(() => {});
  }

  if (command === 'اخفاء') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة فقط!');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
      await message.reply('🙈 **تم إخفاء الروم بنجاح.**');
    } catch (e) {
      sendError('فشل إخفاء الروم.');
    }
  }

  if (command === 'ظهور' || command === 'اظهار') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة فقط!');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });
      await message.reply('🐵 **تم إظهار الروم بنجاح.**');
    } catch (e) {
      sendError('فشل إظهار الروم.');
    }
  }

  if (command === 'رول') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة فقط!');
    const targetMember = message.mentions.members.first();
    const roleArg = args.slice(1).join(' ').replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleArg) || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleArg.toLowerCase()));
    if (!targetMember || !role) return sendError('اكتب بشكل صحيح: `+رول @العضو اسم_الرول`');

    try {
      await targetMember.roles.add(role);
      await message.reply(`✅ **تم إعطاء رول (${role.name}) للعضو ${targetMember}.**`);
    } catch (e) {
      sendError('رتبة البوت أدنى من الرتبة المراد إعطاؤها!');
    }
  }

  if (command === 'شيل') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة فقط!');
    const targetMember = message.mentions.members.first();
    const roleArg = args.slice(1).join(' ').replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleArg) || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleArg.toLowerCase()));
    if (!targetMember || !role) return sendError('اكتب بشكل صحيح: `+شيل @العضو اسم_الرول`');

    try {
      await targetMember.roles.remove(role);
      await message.reply(`🗑️ **تم إزالة رول (${role.name}) من العضو ${targetMember}.**`);
    } catch (e) {
      sendError('رتبة البوت أدنى من الرتبة المراد إزالتها!');
    }
  }

  if (command === 'العاب' || command === 'لعبة') {
    const games = [
      '🎮 لعبة صراحة: لو خيروك بين العيش بدون إنترنت أو بدون أصدقاء، ماذا تختار؟',
      '🎮 لعبة تحدي: قم بتقليد صوت قطة بأعلى صوت لديك الآن!',
      '🎮 لعبة فكاهية: ما هو أغبى موقف حصل معك وأنت صغير؟',
      '🎮 لعبة ذكاء: ما هو الشيء الذي كلما أخذت منه كبر؟ (الحفرة)',
      '🎮 لعبة عشوائية: من هو الشخص الأكثر نشاطاً في سيرفرنا اليوم برأيك؟'
    ];
    const randomGame = games[Math.floor(Math.random() * games.length)];
    return message.reply(randomGame).catch(() => {});
  }

  if (command === 'afk') {
    const reason = args.join(' ') || 'بدون سبب مشخص';
    afkUsers.set(message.author.id, { reason });
    return message.reply(`💤 **تم تفعيل وضع الـ AFK بنجاح!**\n📝 السبب: **${reason}**`).then(msg => {
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    }).catch(() => {});
  }

  if (command === 'ستريك') {
    return message.reply(`🔥 **لديك ستريك متواصل بعدد:** \`${currentStreak}\` **يوم! حافظ على استمرارك.**`).catch(() => {});
  }

  if (command === 'استدعاء') {
    const target = message.mentions.members.first();
    if (!target) return sendError('اكتب: `+استدعاء @العضو [السبب]`');
    const reason = args.slice(1).join(' ') || 'لا يوجد سبب محدد';
    try {
      await target.send(`🚨 **تم استدعاؤك في سيرفر (${message.guild.name}) بواسطة ${message.author}**\n📌 **السبب:** ${reason}\n📍 **الروم:** ${message.channel}`).catch(() => {});
      await message.reply(`✅ **تم إرسال تنبيه الاستدعاء إلى العضو ${target} بنجاح.**`);
    } catch (e) {
      sendError('تعذر إرسال رسالة خاصة للعضو.');
    }
  }

  if (command === 'مسح') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return sendError('ليس لديك صلاحية مسح الرسائل!');
    const count = parseInt(args[0]) || 10;
    if (count <= 0 || count > 100) return sendError('يرجى كتابة عدد بين 1 و 100.');
    try {
      await message.channel.bulkDelete(count + 1, true);
      const tempMsg = await message.channel.send(`🧹 **تم مسح \`${count}\` رسالة بنجاح.**`);
      setTimeout(() => tempMsg.delete().catch(() => {}), 3000);
    } catch (e) {
      sendError('لا يمكنني مسح الرسائل الأقدم من 14 يوماً.');
    }
  }

  if (command === 'جيفوايات' || command === 'جيفواي') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة والأونرية فقط!');
    
    const timeMinutes = parseInt(args[0]);
    const prize = args.slice(1).join(' ');
    
    await message.delete().catch(() => {});
    
    if (isNaN(timeMinutes) || timeMinutes <= 0 || !prize) {
      return message.channel.send('❌ **خطأ في الصيغة!** اكتب هكذا: `+جيفوايات 5 1000 روبكس`').then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 مسابقة جيفواي جديدة')
      .setDescription(`🎁 الجائزة: **${prize}**\n⏱️ الوقت المحدد: **${timeMinutes} دقائق**\n\nاضغط على الزر بالأسفل للمشاركة!`)
      .setColor(0xF1C40F)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('join_gw').setLabel('🎉 اشترك بالسحب').setStyle(ButtonStyle.Success)
    );

    const giveawayMsg = await message.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    if (!giveawayMsg) return;

    const entrants = new Set();
    const collector = giveawayMsg.createMessageComponentCollector({ time: timeMinutes * 60 * 1000 });

    collector.on('collect', async i => {
      if (entrants.has(i.user.id)) return i.reply({ content: '⚠️ أنت مشارك مسبقاً في هذه المسابقة!', ephemeral: true }).catch(() => {});
      entrants.add(i.user.id);
      await i.reply({ content: '✅ **تم تسجيل اسمك بنجاح في السحب!**', ephemeral: true }).catch(() => {});
    });

    collector.on('end', async () => {
      if (entrants.size === 0) {
        return giveawayMsg.edit({ embeds: [embed.setDescription(`🎁 الجائزة: **${prize}**\n❌ **انتهت المسابقة ولم يشارك أي أحد!**`).setColor(0xE74C3C)], components: [] }).catch(() => {});
      }
      const entrantsArray = Array.from(entrants);
      const winnerId = entrantsArray[Math.floor(Math.random() * entrantsArray.length)];
      
      const endEmbed = new EmbedBuilder()
        .setTitle('🎊 انتهت المسابقة وتحدد الفائز!')
        .setDescription(`🎁 الجائزة: **${prize}**\n👑 الفائز المحظوظ: <@${winnerId}>`)
        .setColor(0x2ECC71);

      await giveawayMsg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
      await message.channel.send(`🎉 **مبروك لـ <@${winnerId}> فزت بـ (${prize})!**`).catch(() => {});
    });
  }

  if (command === 'امبيد') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة فقط!');
    const contentText = args.join(' ');
    if (!contentText) return sendError('اكتب النص الذي تريده بعد الأمر: `+امبيد [الكلام]`');
    
    await message.delete().catch(() => {});
    const customEmbed = new EmbedBuilder()
      .setDescription(contentText)
      .setColor(0x3498DB)
      .setTimestamp();

    return message.channel.send({ embeds: [customEmbed] }).catch(() => {});
  }

  if (command === 'say') {
    if (!isOwner) return sendError('هذا الأمر مخصص للإدارة فقط!');
    const sayText = args.join(' ');
    if (!sayText) return sendError('اكتب النص الذي تريد من البوت قوله.');
    
    await message.delete().catch(() => {});
    return message.channel.send(sayText).catch(() => {});
  }

  if (command === 'تايم' || command === 'timeout') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return sendError('ليس لديك صلاحية لإعطاء تايم آوت!');
    const target = message.mentions.members.first();
    const timeArg = args[1];
    if (!target || !timeArg) return sendError('اكتب هكذا: `+تايم @العضو 1h [السبب]`');

    let duration = 0;
    const value = parseInt(timeArg);
    const unit = timeArg.slice(-1).toLowerCase();

    if (unit === 'd') duration = value * 24 * 60 * 60 * 1000;
    else if (unit === 'h') duration = value * 60 * 60 * 1000;
    else if (unit === 'm') duration = value * 60 * 1000;
    else return sendError('وحدة الوقت خطأ! استخدم: `d` أو `h` أو `m`.');

    const reason = args.slice(2).join(' ') || 'بدون سبب';
    try {
      await target.timeout(duration, reason);
      await message.reply(`⏳ **تم إعطاء تايم آوت للعضو ${target} لمدة (${timeArg}). السبب: ${reason}**`);
    } catch (e) {
      sendError('لا يمكنني إعطاء تايم آوت لهذا العضو!');
    }
  }

  if (command === 'انتايم' || command === 'untimeout') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return sendError('ليس لديك صلاحية لفك التايم!');
    const target = message.mentions.members.first();
    if (!target) return sendError('اكتب: `+انتايم @العضو`');
    try {
      await target.timeout(null);
      await message.reply(`🔓 **تم فك التايم آوت عن العضو ${target} بنجاح.**`);
    } catch (e) {
      sendError('فشل فك التايم عن هذا العضو.');
    }
  }

  if (command === 'رول-جماعي' || command === 'اعطاء-رول-للكل') {
    if (!isOwner) return sendError('هذا الأمر مخصص لأونر السيرفر فقط!');
    const roleArg = args.join(' ').replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleArg) || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleArg.toLowerCase()));
    if (!role) return sendError('اكتب اسم الرول أو الآيدي بشكل صحيح: `+رول-جماعي اسم_الرول`');

    await message.reply('⏳ **جاري إعطاء الرول لجميع أعضاء السيرفر...**').catch(() => {});
    
    try {
      const members = await message.guild.members.fetch();
      let count = 0;
      members.forEach(async member => {
        if (!member.user.bot && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(() => {});
          count++;
        }
      });
      await message.channel.send(`✅ **تم الانتهاء! تمت إضافة الرول (${role.name}) لـ (${count}) عضو بنجاح.**`).catch(() => {});
    } catch (e) {
      sendError('حدث خطأ أثناء إعطاء الرولات للكل.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
