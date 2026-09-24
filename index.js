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
const TARGET_MESSAGES_FOR_SALARY = 500; // الهدف للراتب

const afkUsers = new Map();
const streaks = new Map();
const messageCounts = new Map(); 
const warnings = new Map(); 
let isSystemActive = true; 
let greetChannelId = null; 

client.once('ready', async () => {
  console.log(`🚀 تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

client.on('guildMemberAdd', member => {
  if (!greetChannelId) return;
  const channel = member.guild.channels.cache.get(greetChannelId);
  if (channel) {
    channel.send(`🎉 أهلاً بك يا ${member} في السيرفر منورنا!`).catch(() => {});
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  if (!isSystemActive) {
    if (message.content.trim() === '+تشغيل-السستم') {
      if (message.author.id !== message.guild.ownerId && !OWNER_ROLES.includes(message.author.id)) {
        return message.reply('❌ **هذا الأمر مخصص لصاحب السيرفر فقط!**').catch(() => {});
      }
      isSystemActive = true;
      return message.reply('🟢 **تم تشغيل السستم بنجاح ويعمل البوت الآن بشكل طبيعي!**').catch(() => {});
    }
    return;
  }

  if (message.content.trim() === '+ايقاف-السستم') {
    if (message.author.id !== message.guild.ownerId && !OWNER_ROLES.includes(message.author.id)) {
      return message.reply('❌ **هذا الأمر مخصص لصاحب السيرفر فقط!**').catch(() => {});
    }
    isSystemActive = false;
    return message.channel.send('🛑 **تنبيه: تم إيقاف سستم البوت بالكامل من قبل صاحب السيرفر!**').catch(() => {});
  }

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
  const desiredNickname = `🔥${currentStreak}${originalNickname}`;
  
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
    isOwner = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.some(role => OWNER_ROLES.includes(role.id)) || message.author.id === message.guild.ownerId;
    isStaff = isOwner || message.member.roles.cache.has(STAFF_ROLE_ID);
  } catch (e) {
    isOwner = false;
    isStaff = false;
  }

  if (command === 'roles') {
    try {
      const rolesSorted = message.guild.roles.cache
        .filter(r => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position);

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ رولات سيرفر ${message.guild.name} (من الأقوى للأصغر)`)
        .setDescription(rolesSorted.map(r => `• ${r}`).join('\n') || 'لا توجد رولات')
        .setColor(0x3498DB)
        .setFooter({ text: `إجمالي الرولات: ${rolesSorted.size}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] }).catch(() => {});
    } catch (e) {
      return sendError('حدث خطأ أثناء جلب رولات السيرفر.');
    }
  }

  if (command === 'توب-كتابي' || command === 'top-chat') {
    const sortedUsers = Array.from(messageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    let description = '';
    if (sortedUsers.length === 0) {
      description = '❌ **لا توجد بيانات تفاعل كتابي حتى الآن اليوم!**';
    } else {
      sortedUsers.forEach(([userId, count], index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `🔹 \`${index + 1}\``;
        description += `${medal} <@${userId}> — **${count}** رسالة\n`;
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 توب النشاط الكتابي اليومي (أعلى 10 أعضاء)')
      .setDescription(description)
      .setColor(0xF1C40F)
      .setFooter({ text: `طلب بواسطة ${message.author.tag}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'top' || command === 'رتبتي') {
    const target = message.mentions.members.first() || message.member;
    const count = messageCounts.get(target.id) || 0;
    const xp = Math.floor(count / 20);

    const embed = new EmbedBuilder()
      .setTitle(`📊 نظام النقاط والرسائل للعضو: ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setColor(0x2ECC71)
      .addFields(
        { name: '💬 عدد الرسائل المكتوبة', value: `\`${count}\` رسالة`, inline: true },
        { name: '✨ النقاط المحسوبة (XP)', value: `\`${xp}\` XP`, inline: true },
        { name: '💡 معلومة النظام', value: 'كل **20 رسالة** تخولك الحصول على **1xp** كتابي تلقائياً!', inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'help' || command === 'اوامر') {
    // قائمة الأوامر الكلية المحسوبة تلقائياً
    const totalCommands = 23;

    const page1 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 1/3)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\`\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+العاب`', value: '**لألعاب عشوائية ممتعة**' },
        { name: '`+afk`', value: '**لتفعيل وضع الانشغال والابتعاد**' },
        { name: '`+ستريك`', value: `**عرض عدد أيام الستريك المتتالية (🔥${currentStreak})**` },
        { name: '`+user`', value: '**معرفة عمر الحساب وتاريخ انضمامه للسيرفر**' },
        { name: '`+top` أو `+رتبتي`', value: '**عرض عدد رسائلك ونقاط الـ XP (كل 20 رسالة = 1xp)**' },
        { name: '`+توب-كتابي`', value: '**عرض قائمة أعلى 10 أعضاء تفاعلاً بالكتابة اليوم**' },
        { name: '`+roles`', value: '**عرض جميع رولات السيرفر من الأقوى للأصغر**' }
      );

    const page2 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 2/3)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\`\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+راتبي`', value: '**عرض معلومات الراتب المطور وعدد رسائلك الباقية**' },
        { name: '`+نك`', value: '**تغيير النك نيم، أو كتابة المنشن فقط لإعادة التعيين**' },
        { name: '`+مسح` أو `+مسح [العدد]`', value: '**لمسح وحذف الرسائل**' },
        { name: '`+جيفوايات`', value: '**لإنشاء مسابقة جيفواي عادية**' },
        { name: '`+امبيد`', value: '**لإرسال رسالة بتصميم الامبيد**' },
        { name: '`+say`', value: '**جعل البوت يكرر كلامك**' }
      );

    const page3 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 3/3)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\` (أوامر الإدارة والنظام)\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+قفل`', value: '**قفل الشات الحالي منعاً لإرسال الرسائل**' },
        { name: '`+فتح`', value: '**فتح الشات وإعادة الكتابة فيه**' },
        { name: '`+تحذير`', value: '**إعطاء تحذير لعضو وإرساله بالخاص**' },
        { name: '`+باند`', value: '**لتبنيد العضو من السيرفر**' },
        { name: '`+برا`', value: '**لطرد العضو من السيرفر**' },
        { name: '`+تايم` / `+انتايم`', value: '**إعطاء أو فك الميوت المؤقت**' },
        { name: '`+اخفاء` / `+ظهور`', value: '**لإخفاء أو إظهار الروم**' },
        { name: '`+greet`', value: '**تحديد الروم الحالية لتفعيل الترحيب بالأعضاء الجدد**' },
        { name: '`+ايقاف-السستم` / `+تشغيل-السستم`', value: '**التحكم بتمكين أو إيقاف البوت (للأونر)**' }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('first_page').setLabel('⏮️ البداية').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('prev_page').setLabel('◀️ السابق').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('next_page').setLabel('التالي ▶️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('last_page').setLabel('النهاية ⏭️').setStyle(ButtonStyle.Secondary)
    );

    const sentMsg = await message.reply({ embeds: [page1], components: [row] }).catch(() => {});
    if (!sentMsg) return;

    const collector = sentMsg.createMessageComponentCollector({ time: 60000 });
    let currentPage = 1;
    const pages = [page1, page2, page3];

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: '❌ هذه الأوامر ليست لك!', ephemeral: true }).catch(() => {});

      if (i.customId === 'next_page' && currentPage < 3) currentPage++;
      else if (i.customId === 'prev_page' && currentPage > 1) currentPage--;
      else if (i.customId === 'first_page') currentPage = 1;
      else if (i.customId === 'last_page') currentPage = 3;

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('first_page').setLabel('⏮️ البداية').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('prev_page').setLabel('◀️ السابق').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('next_page').setLabel('التالي ▶️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 3),
        new ButtonBuilder().setCustomId('last_page').setLabel('النهاية ⏭️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 3)
      );

      await i.update({ embeds: [pages[currentPage - 1]], components: [updatedRow] }).catch(() => {});
    });
    return;
  }

  if (command === 'قفل' || command === 'lock') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return sendError('ليس لديك صلاحية لقفل الشات!');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      return message.reply('🔒 **تم قفل الشات بنجاح.**').catch(() => {});
    } catch (e) {
      sendError('فشل قفل الشات.');
    }
  }

  if (command === 'فتح' || command === 'unlock') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return sendError('ليس لديك صلاحية لفتح الشات!');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
      return message.reply('🔓 **تم فتح الشات بنجاح.**').catch(() => {});
    } catch (e) {
      sendError('فشل فتح الشات.');
    }
  }

  if (command === 'greet') {
    if (!isStaff) return sendError('هذا الأمر مخصص للإدارة فقط!');
    greetChannelId = message.channel.id;
    return message.reply(`✅ **تم تعيين هذه الروم بنجاح لروم الترحيب (+greet)! سيتم منشن الأعضاء الجدد هنا.**`).catch(() => {});
  }

  if (command === 'تحذير' || command === 'warn') {
    if (!isStaff) return sendError('هذا الأمر مخصص للإدارة فقط!');
    const target = message.mentions.members.first();
    if (!target) return sendError('اكتب هكذا: `+تحذير @العضو [السبب]`');
    const reason = args.slice(1).join(' ') || 'بدون سبب محدد';

    if (!warnings.has(target.id)) warnings.set(target.id, []);
    const userWarns = warnings.get(target.id);
    userWarns.push({ reason, moderator: message.author.tag, date: new Date().toLocaleString() });

    const dmEmbed = new EmbedBuilder()
      .setTitle('⚠️ تنبيه: لقد تلقيت تحذيراً جديداً')
      .setColor(0xE74C3C)
      .addFields(
        { name: '🏛️ السيرفر', value: message.guild.name, inline: true },
        { name: '🛡️ الإداري المسؤول', value: message.author.tag, inline: true },
        { name: '📝 السبب', value: reason, inline: false },
        { name: '📊 عدد تحذيراتك الحالية', value: `\`${userWarns.length}\` تحذيرات`, inline: false }
      )
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => {});
    return message.reply(`⚠️ **تم إعطاء تحذير للعضو ${target} بنجاح وإرساله بالخاص. (إجمالي التحذيرات: ${userWarns.length})**`);
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
    if (!target) return sendError('اكتب هكذا: `+نك @العضو` لعمل ريست، أو `+نك @العضو الاسم_الجديد` للتغيير.');

    const newNick = args.slice(1).join(' ');

    if (!newNick) {
      try {
        await target.setNickname(null);
        await message.reply(`🔄 **تم إعادة تعيين (ريست) النك نيم للعضو ${target} بنجاح!**`);
      } catch (e) {
        sendError('لا يمكنني إعادة تعيين النك نيم لهذا العضو!');
      }
    } else {
      try {
        await target.setNickname(newNick);
        await message.reply(`✅ **تم تغيير النك نيم للعضو ${target} بنجاح إلى: (${newNick})**`);
      } catch (e) {
        sendError('لا يمكنني تغيير النك نيم لهذا العضو!');
      }
    }
  }

  if (command === 'راتبي') {
    if (!isStaff) return message.reply('❌ **هذا الأمر مخصص للإداريين فقط!**').catch(() => {});
    const count = messageCounts.get(message.author.id) || 0;
    const remaining = TARGET_MESSAGES_FOR_SALARY - count;
    const progress = Math.max(0, Math.min(TARGET_MESSAGES_FOR_SALARY, count));
    const percentage = Math.floor((progress / TARGET_MESSAGES_FOR_SALARY) * 100);

    const embed = new EmbedBuilder()
      .setTitle('💰 تقرير راتبك الإداري')
      .setColor(0x2ECC71)
      .addFields(
        { name: '📊 عدد رسائلك الحالية', value: `\`${count}\` رسالة`, inline: true },
        { name: '🎯 المطلوب للراتب', value: `\`${TARGET_MESSAGES_FOR_SALARY}\` رسالة`, inline: true },
        { name: '⏳ المتبقي للحصول على الراتب', value: remaining > 0 ? `\`${remaining}\` رسالة إضافية` : '✅ **لقد أكملت المطلوب وتستحق راتبك!**', inline: false },
        { name: '📈 نسبة الإنجاز', value: `\`${percentage}%\``, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'user' || command === 'معلومات') {
    const target = message.mentions.members.first() || message.member;
    const user = target.user;

    const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
    const joinedAt = target.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>` : 'غير معروف';

    const embed = new EmbedBuilder()
      .setTitle(`👤 معلومات العضو: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(0x9B59B6)
      .addFields(
        { name: '📅 عمر الحساب (تاريخ الإنشاء)', value: createdAt, inline: false },
        { name: '📥 تاريخ الانضمام للسيرفر', value: joinedAt, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] }).catch(() => {});
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

  if (command === 'مسح') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return sendError('ليس لديك صلاحية مسح الرسائل!');
    const countDel = parseInt(args[0]) || 10;
    if (countDel <= 0 || countDel > 100) return sendError('يرجى كتابة عدد بين 1 و 100.');
    try {
      await message.channel.bulkDelete(countDel + 1, true);
      const tempMsg = await message.channel.send(`🧹 **تم مسح \`${countDel}\` رسالة بنجاح.**`);
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
});

client.login(process.env.DISCORD_TOKEN);
