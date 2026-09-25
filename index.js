const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '+';
let systemActive = true; // متغير للتحكم بإيقاف وتشغيل السستم بالكامل

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // أوامر التحكم بإيقاف وتشغيل السستم
    if (message.content.startsWith(PREFIX + 'ايقاف-السستم')) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ هذا الأمر مخصص لصاحب السيرفر (Owner) فقط.');
        }
        systemActive = false;
        return message.reply('🔴 تم إيقاف سستم البوت بالكامل بنجاح.');
    }

    if (message.content.startsWith(PREFIX + 'تشغيل-السستم')) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ هذا الأمر مخصص لصاحب السيرفر (Owner) فقط.');
        }
        systemActive = true;
        return message.reply('🟢 تم تشغيل سستم البوت وإعادة تفعيله بنجاح.');
    }

    if (!systemActive) return; 
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. +user
    if (command === 'user') {
        const target = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(target.id);
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`👤 معلومات المستخدم: ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 الآيدي', value: `\`${target.id}\``, inline: true },
                { name: '📅 تاريخ الانضمام للسيرفر', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🌐 تاريخ إنشاء الحساب', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
            );
        return message.reply({ embeds: [embed] });
    }

    // 2. +avatar
    if (command === 'avatar') {
        const target = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`🖼️ صورة ${target.username}`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }));
        return message.reply({ embeds: [embed] });
    }

    // 3. +فتح & +قفل الشات
    if (command === 'فتح') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية إدارة الرومات.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        return message.reply('🔓 تم فتح الشات بنجاح.');
    }
    if (command === 'قفل') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية إدارة الرومات.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply('🔒 تم قفل الشات بنجاح.');
    }

    // 4. +ظهور & +اخفاء الروم
    if (command === 'ظهور') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
        return message.reply('👁️ أصبحت الروم ظاهرة للجميع.');
    }
    if (command === 'اخفاء') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
        return message.reply('🙈 تم إخفاء الروم عن الجميع.');
    }

    // 5. +تايم (منشن + الوقت بالدقائق)
    if (command === 'تايم') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ لا تمتلك صلاحية إسكات الأعضاء.');
        const target = message.mentions.members.first();
        const duration = parseInt(args[1]);
        if (!target || isNaN(duration)) return message.reply('⚠️ الاستخدام الصحيح: `+تايم @العضو [الدقائق]`');
        try {
            await target.timeout(duration * 60 * 1000, `By: ${message.author.tag}`);
            return message.reply(`🔇 تم إعطاء تايم لـ ${target.user.tag} لمدة **${duration}** دقيقة.`);
        } catch (e) {
            return message.reply('❌ حدث خطأ، تأكد من رتبة العضو.');
        }
    }

    // 6. +انتايم (فك التايم)
    if (command === 'انتايم') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ لا تمتلك صلاحية.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ يرجى منشن العضو لفك التايم عنه.');
        try {
            await target.timeout(null);
            return message.reply(`🔊 تم فك التايم عن ${target.user.tag}.`);
        } catch (e) {
            return message.reply('❌ فشل في فك التايم.');
        }
    }

    // 7. +فك-الباند
    if (command === 'فك-الباند') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ لا تمتلك صلاحية فك الحظر.');
        const userId = args[0]?.replace(/[<@!>]/g, '');
        if (!userId) return message.reply('⚠️ يرجى كتابة آيدي العضو أو منشنه لفك الباند.');
        try {
            await message.guild.members.unban(userId);
            return message.reply(`✅ تم فك الحظر عن العضو بنجاح.`);
        } catch (e) {
            return message.reply('❌ لم يتم العثور على هذا العضو في قائمة المحظورين.');
        }
    }

    // 8. +جيفواي
    if (command === 'جيفواي') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ لا تمتلك صلاحية إدارة السيرفر.');
        const duration = args[0];
        const prize = args.slice(1).join(' ');
        if (!duration || !prize) return message.reply('⚠️ الاستخدام: `+جيفواي 1h نايترو` (مثال)');
        
        const gEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎉 **جيفواي جديد!** 🎉')
            .setDescription(`الجائزة: **${prize}**\nالمدة: **${duration}**\n\nاضغط على التفاعل أدناه للمشاركة!`)
            .setTimestamp();
        
        const msg = await message.channel.send({ embeds: [gEmbed] });
        await msg.react('🎉');
        return message.delete().catch(() => {});
    }

    // 9. +kick
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ لا تمتلك صلاحية الطرد.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ منشن العضو لطرده.');
        await target.kick();
        return message.reply(`👢 تم طرد ${target.user.tag} بنجاح.`);
    }

    // 10. +ban
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ لا تمتلك صلاحية الباند.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ منشن العضو لحظره.');
        await target.ban();
        return message.reply(`🔨 تم حظر ${target.user.tag} من السيرفر.`);
    }

    // 11. +clear
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ لا تمتلك صلاحية مسح الرسائل.');
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0 || amount > 100) return message.reply('⚠️ حدد رقماً بين 1 و 100.');
        await message.channel.bulkDelete(amount, true);
        const reply = await message.channel.send(`🧹 تم مسح **${amount}** رسالة.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
    }

    // 12. +رول (تبديل رتبة)
    if (command === 'رول') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تمتلك صلاحية تعديل الرولات.');
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply('⚠️ الاستخدام: `+رول @العضو @الرتبة`');
        
        if (target.roles.cache.has(role.id)) {
            await target.roles.remove(role);
            return message.reply(`❌ تم سحب رتبة ${role.name} من ${target.user.tag}.`);
        } else {
            await target.roles.add(role);
            return message.reply(`✅ تم إعطاء رتبة ${role.name} إلى ${target.user.tag}.`);
        }
    }

    // 13. +اعطى-رول
    if (command === 'اعطى-رول') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تمتلك صلاحية.');
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply('⚠️ حدد العضو والرتبة.');
        await target.roles.add(role);
        return message.reply(`✅ تم منح رتبة ${role.name} لـ ${target.user.tag}.`);
    }

    // 14. +سحب-رول
    if (command === 'سحب-رول') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تمتلك صلاحية.');
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply('⚠️ حدد العضو والرتبة.');
        await target.roles.remove(role);
        return message.reply(`✅ تم إزالة رتبة ${role.name} من ${target.user.tag}.`);
    }

    // 15. +server
    if (command === 'server' || command === 'سيرفر') {
        const sEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📊 معلومات سيرفر: ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 الأونر', value: `<@${message.guild.ownerId}>`, inline: true },
                { name: '👥 عدد الأعضاء', value: `${message.guild.memberCount}`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true }
            );
        return message.reply({ embeds: [sEmbed] });
    }

    // 16. +ping
    if (command === 'ping') {
        return message.reply(`🏓 سرعة استجابة البوت: **${client.ws.ping}ms**`);
    }

    // ==========================================
    // قائمة المساعدة المفصلة (+help)
    // ==========================================
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 قائمة الأوامر الشاملة والشرح (Bot Help)')
            .setDescription('إليك جميع الأوامر المتاحة مع شرح سريع لكل أمر:')
            .addFields(
                { 
                    name: '👑  أوامر الأونر والتحكم الكامل', 
                    value: '`+ايقاف-السستم` -> لإيقاف بوت السستم بالكامل (لأونر السيرفر فقط)\n`+تشغيل-السستم` -> لإعادة تشغيل السستم من جديد\n`+جيفواي [المدة] [الجائزة]` -> لبدء مسابقة جيفواي جديدة', 
                    inline: false 
                },
                { 
                    name: '🛡️  أوامر الإشراف والعقوبات', 
                    value: '`+ban [@عضو]` -> لتبنيد وحظر العضو نهائياً من السيرفر\n`+kick [@عضو]` -> لطرد العضو من السيرفر\n`+تايم [@عضو] [الدقائق]` -> لإعطاء تايم/إسكات للعضو\n`+انتايم [@عضو]` -> لفك التايم عن العضو\n`+فك-الباند [آيدي العضو]` -> لفك الحظر عن شخص محظور\n`+clear [العدد]` -> لمسح وتنظيف رسائل الشات (1-100)', 
                    inline: false 
                },
                { 
                    name: '💬  أوامر إدارة الرومات والشات', 
                    value: '`+فتح` -> لفتح الشات والسماح للجميع بالكتابة\n`+قفل` -> لقفل الشات ومنع الأعضاء من الكتابة\n`+ظهور` -> لإظهار الروم الحالية للجميع\n`+اخفاء` -> لإخفاء الروم الحالية عن الأعضاء', 
                    inline: false 
                },
                { 
                    name: '⚙️  أوامر الرولات والأعضاء', 
                    value: '`+رول [@عضو] [@رتبة]` -> لإعطاء أو سحب الرتبة من العضو تلقائياً\n`+اعطى-رول [@عضو] [@رتبة]` -> لمنح العضو الرتبة مباشرة\n`+سحب-رول [@عضو] [@رتبة]` -> لإزالة الرتبة من العضو مباشرة\n`+user [@عضو]` -> لعرض معلومات وملف المستخدم\n`+avatar [@عضو]` -> لعرض صورة بروفايل المستخدم\n`+server` -> لعرض معلومات السيرفر الكاملة\n`+ping` -> لفحص سرعة اتصال وبنج البوت', 
                    inline: false 
                }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [helpEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
