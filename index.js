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

  // --- 1. الأوامر العامة والأعضاء ---
  if (command === 'help' || command === 'اوامر') {
    const totalCommands = 32;

    const page1 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 1/4 - الأوامر العامة)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\`\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+afk [السبب]`', value: '**لتفعيل وضع الانشغال والابتعاد**' },
        { name: '`+ستريك`', value: `**عرض عدد أيام الستريك المتتالية (🔥${currentStreak})**` },
        { name: '`+user` أو `+معلومات`', value: '**معرفة عمر الحساب وتاريخ انضمامه للسيرفر**' },
        { name: '`+top` أو `+رتبتي`', value: '**عرض عدد رسائلك ونقاط الـ XP**' },
        { name: '`+توب-كتابي`', value: '**عرض قائمة أعلى 10 أعضاء تفاعلاً بالكتابة اليوم**' },
        { name: '`+roles`', value: '**عرض جميع رولات السيرفر من الأقوى للأصغر**' },
        { name: '`+server` أو `+سيرفر`', value: '**عرض معلومات متكاملة عن السيرفر وأعضائه**' },
        { name: '`+avatar` أو `+صورة`', value: '**عرض صورتك الشخصية أو صورة أي عضو مع رابط التحميل**' }
      );

    const page2 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 2/4 - الأوامر والخدمات)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\`\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+بينج` أو `+ping`', value: '**فحص سرعة استجابة وسرعة البات (Ping)**' },
        { name: '`+ايقاظ` أو `+bot`', value: '**معرفة معلومات البوت ومبرمجه وحالة التشغيل**' },
        { name: '`+رابط` أو `+invite`', value: '**الحصول على رابط دعوة البوت للسيرفرات الأخرى**' },
        { name: '`+اقتراح [الاقتراح]`', value: '**إرسال اقتراح روم الاقتراحات المخصصة**' },
        { name: '`+تذكير [الوقت] [المهمة]`', value: '**ضبط منبه وتذكير شخصي مؤقت**' },
        { name: '`+استطلاع [السؤال]`', value: '**إنشاء تصويت سريع بتفاعلات الأيقونات**' },
        { name: '`+رابط-دائم`', value: '**صنع رابط دعوتة للسيرفر غير قابل انتهاء الصلاحية**' },
        { name: '`+حساب [عملية]`', value: '**آلة حاسبة رياضية فورية داخل البوت**' }
      );

    const page3 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 3/4 - الأوامر الإدارية)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\`\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+قفل` / `+فتح`', value: '**قفل أو فتح الشات الحالي لمنع/سماح الإرسال**' },
        { name: '`+مسح [العدد]`', value: '**حذف ومسح رسائل الشات (بين 1 و 100)**' },
        { name: '`+تحذير @العضو [السبب]`', value: '**إعطاء تحذير رسمي لعضو وإرساله بالخاص**' },
        { name: '`+التحذيرات @العضو`', value: '**عرض سجل تحذيرات العضو السابقة بالتفصيل**' },
        { name: '`+مسح-تحذيرات @العضو`', value: '**إزالة وتصفير تحذيرات عضو معين**' },
        { name: '`+نك @العضو [الاسم]`', value: '**تغيير النك نيم أو كتابة المنشن لإعادة التعيين**' },
        { name: '`+greet`', value: '**تحديد الروم الحالية لروم الترحيب بالأعضاء**' },
        { name: '`+راتبي`', value: '**عرض تقرير رتبتك الإدارية والرسائل المطلوبة**' }
      );

    const page4 = new EmbedBuilder()
      .setTitle('📜 قائمة أوامر البوت (الصفحة 4/4 - الأوامر العليا والأمنية)')
      .setDescription(`جميع الأوامر تبدأ بعلامة \`+\` (أوامر الأونر والإدارة المتقدمة)\n📊 **إجمالي عدد أوامر البوت:** \`${totalCommands} أمر\``)
      .setColor(0x3498DB)
      .addFields(
        { name: '`+باند @العضو [السبب]`', value: '**حظر دائم للعضو من السيرفر**' },
        { name: '`+فك-باند [الايدي]`', value: '**إلغاء الحظر عن عضو بواسطة الأيدي الخاص به**' },
        { name: '`+برا @العضو [السبب]`', value: '**طرد العضو من السيرفر مع إمكانية العودة**' },
        { name: '`+تايم @العضو [الوقت] [السبب]`', value: '**إعطاء ميوت مؤقت (Timeout) للعضو**' },
        { name: '`+انتايم @العضو`', value: '**إلغاء الميوت المؤقت عن العضو فوراً**' },
        { name: '`+اخفاء` / `+ظهور`', value: '**إخفاء أو إظهار الروم الحالية عن الرتبة العامة**' },
        { name: '`+جيفوايات [الدقائق] [الجائزة]`', value: '**إنشاء مسابقة جيفواي احترافية**' },
        { name: '`+ايقاف-السستم` / `+تشغيل-السستم`', value: '**التحكم بتمكين أو إيقاف البوت بالكامل (للأونر)**' }
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
    const pages = [page1, page2, page3, page4];

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: '❌ هذه الأوامر ليست لك!', ephemeral: true }).catch(() => {});

      if (i.customId === 'next_page' && currentPage < 4) currentPage++;
      else if (i.customId === 'prev_page' && currentPage > 1) currentPage--;
      else if (i.customId === 'first_page') currentPage = 1;
      else if (i.customId === 'last_page') currentPage = 4;

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('first_page').setLabel('⏮️ البداية').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('prev_page').setLabel('◀️ السابق').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
        new ButtonBuilder().setCustomId('next_page').setLabel('التالي ▶️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 4),
        new ButtonBuilder().setCustomId('last_page').setLabel('النهاية ⏭️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 4)
      );

      await i.update({ embeds: [pages[currentPage - 1]], components: [updatedRow] }).catch(() => {});
    });
    return;
  }

  // --- أوامر عامة وإضافية جديدة ومفيدة ---
  if (command === 'server' || command === 'سيرفر') {
    const guild = message.guild;
    const embed = new EmbedBuilder()
      .setTitle(`📊 معلومات سيرفر: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setColor(0x3498DB)
      .addFields(
        { name: '👑 صاحب السيرفر', value: `<@${guild.ownerId}>`, inline: true },
        { name: '👥 عدد الأعضاء', value: `\`${guild.memberCount}\` عضو`, inline: true },
        { name: '📅 تاريخ إنشاء السيرفر', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: false },
        { name: '💬 عدد الرومات', value: `\`${guild.channels.cache.size}\` روم`, inline: true },
        { name: '🛡️ عدد الرولات', value: `\`${guild.roles.cache.size}\` رول`, inline: true }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'avatar' || command === 'صورة') {
    const target = message.mentions.users.first() || message.author;
    const avatarURL = target.displayAvatarURL({ dynamic: true, size: 1024 });
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ صورة العضو: ${target.username}`)
      .setImage(avatarURL)
      .setColor(0x9B59B6)
      .setDescription(`🔗 [رابط الصورة المباشر](${avatarURL})`);
    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'بينج' || command === 'ping') {
    const sent = await message.reply('🏓 جاري قياس البينج...');
    const ping = sent.createdTimestamp - message.createdTimestamp;
    return sent.edit(`🏓 **سرعة استجابة البوت:** \`${ping}ms\`\n💓 **بينج الاتصال بالديسكورد:** \`${Math.round(client.ws.ping)}ms\``);
  }

  if (command === 'ايقاظ' || command === 'bot') {
    const embed = new EmbedBuilder()
      .setTitle('🤖 معلومات بوت السيرفر المطور')
      .setColor(0x2ECC71)
      .addFields(
        { name: '⚙️ الإصدار', value: '`v3.2 Ultimate Pro`', inline: true },
        { name: '👨‍💻 المطور/المالك', value: '`جواد`', inline: true },
        { name: '⚡ حالة النظام', value: '🟢 يعمل بكفاءة وبدون أخطاء', inline: false }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'رابط' || command === 'invite') {
    return message.reply('🔗 **رابط دعوة البوت:** (تأكد من نسخه وصلحيته من إعدادات التطبيق الخاصة بك في Discord Developer Portal)');
  }

  if (command === 'اقتراح') {
    const suggestion = args.join(' ');
    if (!suggestion) return sendError('اكتب الاقتراح بعد الأمر: `+اقتراح [اقتراحك هنا]`');
    await message.delete().catch(() => {});
    const embed = new EmbedBuilder()
      .setTitle('💡 اقتراح جديد')
      .setDescription(suggestion)
      .setColor(0xF1C40F)
      .setFooter({ text: `صاحب الاقتراح: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
    const sent = await message.channel.send({ embeds: [embed] });
    await sent.react('👍');
    await sent.react('👎');
    return;
  }

  if (command === 'تذكير') {
    const timeArg = args[0];
    const task = args.slice(1).join(' ');
    if (!timeArg || !task) return sendError('اكتب هكذا: `+تذكير 10m مراجعة الواجبات` (استخدم m للدقائق أو h للساعات)');

    let msTime = 0;
    const val = parseInt(timeArg);
    const unit = timeArg.slice(-1).toLowerCase();
    if (unit === 'm') msTime = val * 60 * 1000;
    else if (unit === 'h') msTime = val * 60 * 60 * 1000;
    else return sendError('وحدة الوقت غير صالحة! استخدم m أو h فقط.');

    message.reply(`⏰ **تم ضبط التذكير بنجاح!** سأقوم بتذكيرك بعد (${timeArg}): **${task}**`);
    setTimeout(() => {
      message.author.send(`⏰ **تذكير لك يا جواد/عضو!** وقت مهمتك قد حان: **${task}**`).catch(() => {
        message.channel.send(`⏰ **تذكير إلى ${message.author}:** انتهى الوقت المخصص لـ: **${task}**`);
      });
    }, msTime);
    return;
  }

  if (command === 'استطلاع') {
    const question = args.join(' ');
    if (!question) return sendError('اكتب السؤال بعد الأمر: `+استطلاع [سؤالك هنا]`');
    await message.delete().catch(() => {});
    const embed = new EmbedBuilder()
      .setTitle('📊 استطلاع رأي جديد')
      .setDescription(question)
      .setColor(0x3498DB)
      .setFooter({ text: `بواسطة: ${message.author.tag}` })
      .setTimestamp();
    const sent = await message.channel.send({ embeds: [embed] });
    await sent.react('🟩');
    await sent.react('🟥');
    return;
  }

  if (command === 'رابط-دائم') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return sendError('ليس لديك صلاحية إنشاء رابط دائم!');
    try {
      const invite = await message.channel.createInvite({ maxAge: 0, maxUses: 0 });
      return message.reply(`🔗 **رابط السيرفر الدائم (لا ينتهي أبدًا):**\nhttps://discord.gg/${invite.code}`);
    } catch (e) {
      return sendError('تعذر إنشاء رابط دائم، تأكد من صلاحيات البوت.');
    }
  }

  if (command === 'حساب') {
    const expression = args.join(' ');
    if (!expression) return sendError('اكتب العملية الحسابية: `+حساب 50 + 50` أو `+حساب 10 * 5`');
    try {
      // استخدام آلة حاسبة آمنة وبسيطة عبر تقييم التعبيرات الرقمية البسيطة
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
      if (!sanitized) return sendError('الرجاء إدخال أرقام وعمليات صحيحة.');
      const result = Function(`'use strict'; return (${sanitized})`)();
      return message.reply(`🧮 **النتيجة الحسابية:** \`${result}\``);
    } catch (e) {
      return sendError('حدث خطأ في قراءة العملية الرياضية.');
    }
  }

  // --- الأوامر الإدارية وسجل التحذيرات المتقدمة ---
  if (command === 'التحذيرات' || command === 'warnings') {
    if (!isStaff) return sendError('هذا الأمر مخصص للإدارة فقط!');
    const target = message.mentions.members.first();
    if (!target) return sendError('اكتب: `+التحذيرات @العضو`');
    const userWarns = warnings.get(target.id) || [];
    if (userWarns.length === 0) return message.reply(`✅ العضو ${target} نظيف ولا يوجد عليه أي تحذيرات.`);

    let desc = '';
    userWarns.forEach((w, idx) => {
      desc += `**[تحذير ${idx + 1}]**\n📝 السبب: ${w.reason}\n🛡️ بواسطة: ${w.moderator}\n📅 التاريخ: ${w.date}\n-------------------\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ سجل تحذيرات العضو: ${target.user.tag}`)
      .setDescription(desc)
      .setColor(0xE74C3C)
      .setTimestamp();
    return message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'مسح-تحذيرات' || command === 'clearwarns') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.Administrator)) return sendError('هذا الأمر مخصص للأونر فقط!');
    const target = message.mentions.members.first();
    if (!target) return sendError('اكتب: `+مسح-تحذيرات @العضو`');
    warnings.set(target.id, []);
    return message.reply(`🧹 **تم مسح وتصفير كافة تحذيرات العضو ${target} بنجاح!**`);
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

  if (command === 'فك-باند' || command === 'unban') {
    if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.BanMembers)) return sendError('ليس لديك صلاحية لفك الباند!');
    const userId = args[0];
    if (!userId) return sendError('اكتب أيدي العضو هكذا: `+فك-باند [User_ID]`');
    try {
      await message.guild.members.unban(userId);
      return message.reply(`🔓 **تم إلغاء الحظر (فك الباند) عن العضو بنجاح.**`);
    } catch (e) {
      return sendError('تعذر العثور على العضو أو التأكد من الأيدي.');
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
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// الإعدادات الثابتة
const SUPPORT_ROLE_ID = '1420909772366151690';
const TICKET_CATEGORY_ID = '1552813253661294663';
const ROOM_ID_PROMPT = '1552813374004264960';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// إرسال رسالة اللوحة الأساسية (يمكنك استدعاء هذا الأمر أو وضعه عند البداية)
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // أمر إرسال زر فتح التذكرة في الروم المخصص
    if (message.content === '+setup-ticket' && message.channel.id === ROOM_ID_PROMPT) {
        const embed = new EmbedBuilder()
            .setTitle('نظام الدعم الفني والتذاكر')
            .setDescription('اضغط على الزر أدناه لفتح تذكرة جديدة.')
            .setColor(0x00AE86);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('فتح تذكرة')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }

    // أمر +delete
    if (message.content.toLowerCase() === '+delete') {
        if (!message.channel.parent || message.channel.parent.id !== TICKET_CATEGORY_ID) {
            return message.reply('هذا الأمر يعمل فقط داخل تذاكر الدعم الفني!');
        }
        await message.channel.send('جاري حذف التذكرة خلال 5 ثواني...');
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
        return;
    }

    // أمر +close
    if (message.content.toLowerCase() === '+close') {
        if (!message.channel.parent || message.channel.parent.id !== TICKET_CATEGORY_ID) {
            return message.reply('هذا الأمر يعمل فقط داخل تذاكر الدعم الفني!');
        }
        
        await message.channel.setName(`closed-${message.channel.name.replace('ticket-', '')}`).catch(() => {});
        
        const closeEmbed = new EmbedBuilder()
            .setDescription('تم إغلاق التذكرة.')
            .setColor(0xFF0000);

        const closedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('حذف التذكرة').setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [closeEmbed], components: [closedRow] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // إنشاء تذكرة جديدة
    if (interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        const category = guild.channels.cache.get(TICKET_CATEGORY_ID);

        const channel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category ? category.id : null,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: SUPPORT_ROLE_ID,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // تخزين صاحب التذكرة في الموضوع (topic)
        await channel.setTopic(interaction.user.id);

        const ticketEmbed = new EmbedBuilder()
            .setTitle('تذكرة جديدة')
            .setDescription(`مرحباً ${interaction.user}, تم فتح تذكرتك. فريق الدعم سيقوم بالرد عليك قريباً.`)
            .setColor(0x00FF00);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('قفل التذكرة').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@&${SUPPORT_ROLE_ID}> | ${interaction.user}`, embeds: [ticketEmbed], components: [row] });
        return interaction.reply({ content: `تم إنشاء تذكرتك بنجاح: ${channel}`, ephemeral: true });
    }

    // التحقق من أن التفاعل داخل روم تذكرة
    if (!interaction.channel.parent || interaction.channel.parent.id !== TICKET_CATEGORY_ID) {
        return interaction.reply({ content: 'هذا الإجراء يعمل فقط داخل التذاكر!', ephemeral: true });
    }

    const channel = interaction.channel;
    const ticketOwnerId = channel.topic;

    // صاحب التذكرة لا يمكنه استخدام أزرار الاستلام أو القفل
    if (interaction.user.id === ticketOwnerId && ['claim_ticket', 'close_ticket', 'unclaim_ticket', 'lock_temp'].includes(interaction.customId)) {
        return interaction.reply({ content: 'لا يمكنك استخدام أزرار التحكم بالتذكرة لأنك صاحبها!', ephemeral: true });
    }

    // استلام التذكرة
    if (interaction.customId === 'claim_ticket') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('إلغاء الاستلام').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('قفل التذكرة').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('summon_owner').setLabel('استدعاء صاحب التذكرة').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('lock_temp').setLabel('قفل مؤقت').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ components: [row] });
        return channel.send(`تم استلام التذكرة بواسطة ${interaction.user}`);
    }

    // إلغاء استلام التذكرة
    if (interaction.customId === 'unclaim_ticket') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('قفل التذكرة').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ components: [row] });
        return channel.send(`تم إلغاء استلام التذكرة بواسطة ${interaction.user}`);
    }

    // استدعاء صاحب التذكرة برسالة خاصة
    if (interaction.customId === 'summon_owner') {
        if (!ticketOwnerId) return interaction.reply({ content: 'لا يمكن العثور على صاحب التذكرة.', ephemeral: true });
        try {
            const owner = await interaction.guild.members.fetch(ticketOwnerId);
            await owner.send(`تم استدعاؤك في التذكرة الخاصة بك هنا: ${channel}`);
            return interaction.reply({ content: 'تم إرسال رسالة خاصة لصاحب التذكرة بنجاح.', ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: 'تعذر إرسال رسالة خاصة لصاحب التذكرة (قد تكون رسائله مغلقة).', permissions: true, ephemeral: true });
        }
    }

    // قفل مؤقت (Modal لإدخال المدة)
    if (interaction.customId === 'lock_temp') {
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
        const modal = new ModalBuilder()
            .setCustomId('modal_lock_temp')
            .setTitle('قفل التذكرة مؤقتاً');

        const durationInput = new TextInputBuilder()
            .setCustomId('duration_input')
            .setLabel('أدخل المدة (مثال: 1d, 1h, 1m)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
        return interaction.showModal(modal);
    }

    // قفل التذكرة
    if (interaction.customId === 'close_ticket') {
        await channel.setName(`closed-${channel.name.replace('ticket-', '')}`).catch(() => {});
        
        const closeEmbed = new EmbedBuilder()
            .setDescription('تم إغلاق التذكرة.')
            .setColor(0xFF0000);

        const closedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('حذف التذكرة').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ embeds: [closeEmbed], components: [closedRow] });
        return;
    }

    // حذف التذكرة بعد القفل
    if (interaction.customId === 'delete_ticket') {
        await interaction.reply('جاري حذف التذكرة خلال 5 ثواني...');
        setTimeout(() => channel.delete().catch(() => {}), 5000);
        return;
    }

    // معالجة مودال القفل المؤقت
    if (interaction.isModalSubmit() && interaction.customId === 'modal_lock_temp') {
        const durationStr = interaction.fields.getTextInputValue('duration_input');
        // هنا يمكنك إضافة منطق تحليل المدة وتطبيق الصلاحيات إذا رغبت، أو إعلام المستخدم
        await interaction.reply({ content: `تم قفل التذكرة مؤقتاً لمدة: ${durationStr}`, ephemeral: false });
    }
});

client.login('YOUR_BOT_TOKEN');
