const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '+';
let systemActive = true;

const afkUsers = new Map();
const dailyMessages = new Map();

// تصفير توب الرسائل تلقائياً كل 24 ساعة
setInterval(() => {
    dailyMessages.clear();
    console.log('[System] Daily messages leaderboard has been reset.');
}, 24 * 60 * 60 * 1000);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // نظام الـ AFK
    if (afkUsers.has(message.author.id)) {
        afkUsers.delete(message.author.id);
        message.reply('أهلاً بك مجدداً! تم إزالة حالة الـ AFK عنك.').then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
    }
    
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afkUsers.has(user.id)) {
                message.reply(`⚠️ **${user.username}** غائب حالياً (AFK): **${afkUsers.get(user.id)}**`);
            }
        });
    }

    // تتبع الرسائل اليومية
    const currentCount = dailyMessages.get(message.author.id) || 0;
    dailyMessages.set(message.author.id, currentCount + 1);

    // أزرار تحكم الأونر بالنظام
    if (message.content.startsWith(PREFIX + 'system-off')) {
        if (message.author.id !== message.guild.ownerId) return message.reply('❌ هذا الأمر مخصص لأونر السيرفر فقط.');
        systemActive = false;
        return message.reply('🔴 تم إيقاف نظام البوت بشكل كامل.');
    }

    if (message.content.startsWith(PREFIX + 'system-on')) {
        if (message.author.id !== message.guild.ownerId) return message.reply('❌ هذا الأمر مخصص لأونر السيرفر فقط.');
        systemActive = true;
        return message.reply('🟢 تم تفعيل نظام البوت وعمله بنجاح.');
    }

    if (!systemActive) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // +afk
    if (command === 'afk') {
        const reason = args.join(' ') || 'بدون سبب';
        afkUsers.set(message.author.id, reason);
        return message.reply(`💤 تم ضبط حالتك إلى **غائب (AFK)**. السبب: **${reason}**`);
    }

    // +roles (عرض رتب السيرفر من الأقوى للأصغر)
    if (command === 'roles') {
        const rolesList = message.guild.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `${r}`)
            .join(' | ');

        const rEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📜 رتب السيرفر (من الأقوى إلى الأصغر)`)
            .setDescription(rolesList || 'لا توجد رتب.');
        return message.reply({ embeds: [rEmbed] });
    }

    // +top-messages (توب الرسائل اليومي النشط)
    if (command === 'top-messages') {
        const sorted = [...dailyMessages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        let description = sorted.length === 0 ? 'لم يتم تسجيل رسائل اليوم بعد.' : '';
        
        sorted.forEach((item, index) => {
            description += `**${index + 1}.** <@${item[0]}> - **${item[1]}** رسالة\n`;
        });

        const topEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🏆 أكثر 10 أعضاء نشاطاً بالرسائل اليوم')
            .setDescription(description)
            .setFooter({ text: 'يتم تصفير القائمة تلقائياً كل 24 ساعة.' });
        return message.reply({ embeds: [topEmbed] });
    }

    // +server (معلومات السيرفر الشاملة)
    if (command === 'server') {
        const owner = await message.guild.fetchOwner();
        const sEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📊 معلومات السيرفر: ${message.guild.name}`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 الأونر', value: `${owner.user.tag}`, inline: true },
                { name: '👥 عدد الأعضاء', value: `${message.guild.memberCount}`, inline: true },
                { name: '🚀 مستوى البوستات', value: `Level ${message.guild.premiumTier} (${message.guild.premiumSubscriptionCount} Boosts)`, inline: true },
                { name: '📅 عمر السيرفر', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🆔 آي دي السيرفر', value: `\`${message.guild.id}\``, inline: true },
                { name: '💬 عدد الرومات', value: `${message.guild.channels.cache.size}`, inline: true }
            );
        return message.reply({ embeds: [sEmbed] });
    }

    // +user
    if (command === 'user') {
        const target = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(target.id);
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`👤 معلومات العضو: ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 الآي دي', value: `\`${target.id}\``, inline: true },
                { name: '📅 تاريخ الانضمام للسيرفر', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🌐 تاريخ إنشاء الحساب', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
            );
        return message.reply({ embeds: [embed] });
    }

    // +avatar
    if (command === 'avatar') {
        const target = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`🖼️ صورة بروفايل ${target.username}`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }));
        return message.reply({ embeds: [embed] });
    }

    // قفل وفتح الرومات
    if (command === 'lock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية `ManageChannels`.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply('🔒 تم قفل الروم بنجاح.');
    }
    if (command === 'unlock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية `ManageChannels`.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        return message.reply('🔓 تم فتح الروم.');
    }

    // إخفاء وإظهار الرومات
    if (command === 'hide') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحيات كافية.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
        return message.reply('🙈 تم إخفاء الروم.');
    }
    if (command === 'unhide') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحيات كافية.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
        return message.reply('👁️ الروم مرئي الآن للجميع.');
    }

    // الميوت (Timeout)
    if (command === 'timeout') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ لا تمتلك صلاحية الميوت.');
        const target = message.mentions.members.first();
        const duration = parseInt(args[1]);
        if (!target || isNaN(duration)) return message.reply('⚠️ طريقة الاستخدام: `+timeout @user [الدقائق]`');
        try {
            await target.timeout(duration * 60 * 1000, `بواسطة: ${message.author.tag}`);
            return message.reply(`🔇 تم إعطاء ميوت لـ ${target.user.tag} لمدة **${duration}** دقيقة.`);
        } catch (e) {
            return message.reply('❌ خطأ: تحقق من رتبة العضو.');
        }
    }
    if (command === 'untimeout') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ لا تمتلك صلاحية إزالة الميوت.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ يرجى منشن العضو.');
        try {
            await target.timeout(null);
            return message.reply(`🔊 تم إزالة الميوت عن ${target.user.tag}.`);
        } catch (e) {
            return message.reply('❌ فشل في إزالة الميوت.');
        }
    }

    // فك البان
    if (command === 'unban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ لا تمتلك صلاحية فك البان.');
        const userId = args[0]?.replace(/[<@!>]/g, '');
        if (!userId) return message.reply('⚠️ يرجى كتابة آي دي صحيح.');
        try {
            await message.guild.members.unban(userId);
            return message.reply(`✅ تم فك البان عن العضو بنجاح.`);
        } catch (e) {
            return message.reply('❌ العضو غير موجود في قائمة المحظورين.');
        }
    }

    // قفف (Giveaway)
    if (command === 'giveaway') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ لا تمتلك صلاحية إدارة السيرفر.');
        const duration = args[0];
        const prize = args.slice(1).join(' ');
        if (!duration || !prize) return message.reply('⚠️ مثال للاستخدام: `+giveaway 1h Nitro`');
        
        const gEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎉 **مسابقة جديدة (GIVEAWAY)** 🎉')
            .setDescription(`الجائزة: **${prize}**\nالمدة: **${duration}**\n\nاضغط على تفاعل 🎉 للمشاركة!`)
            .setTimestamp();
        
        const msg = await message.channel.send({ embeds: [gEmbed] });
        await msg.react('🎉');
        return message.delete().catch(() => {});
    }

    // كيك وبان ومسح الرسائل
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ لا تمتلك صلاحية الطرد.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ يرجى منشن العضو.');
        await target.kick();
        return message.reply(`👢 تم طرد ${target.user.tag} بنجاح.`);
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ لا تمتلك صلاحية البان.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ يرجى منشن العضو.');
        await target.ban();
        return message.reply(`🔨 تم تبنيد ${target.user.tag} بنجاح.`);
    }

    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ لا تمتلك صلاحية مسح الرسائل.');
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0 || amount > 100) return message.reply('⚠️ حدد رقماً بين 1 و 100.');
        await message.channel.bulkDelete(amount, true);
        const reply = await message.channel.send(`🧹 تم مسح **${amount}** رسالة.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
    }

    // إدارة الرتب
    if (command === 'role') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تمتلك صلاحية إدارة الرتب.');
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply('⚠️ الاستخدام: `+role @user @role`');
        if (target.roles.cache.has(role.id)) {
            await target.roles.remove(role);
            return message.reply(`❌ تم إزالة رتبة **${role.name}** من **${target.user.tag}**.`);
        } else {
            await target.roles.add(role);
            return message.reply(`✅ تم إعطاء رتبة **${role.name}** لـ **${target.user.tag}**.`);
        }
    }

    if (command === 'giverole') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تمتلك صلاحية.');
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply('⚠️ حدد العضو والرتبة.');
        await target.roles.add(role);
        return message.reply(`✅ تم منح رتبة **${role.name}** لـ **${target.user.tag}**.`);
    }

    if (command === 'removerole') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ لا تمتلك صلاحية.');
        const target = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!target || !role) return message.reply('⚠️ حدد العضو والرتبة.');
        await target.roles.remove(role);
        return message.reply(`❌ تم إزالة رتبة **${role.name}** من **${target.user.tag}**.`);
    }

    if (command === 'ping') {
        return message.reply(`🏓 سرعة استجابة البوت: **${client.ws.ping}ms**`);
    }

    // الأوامر الخمسة الإضافية المقترحة
    if (command === 'say') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ لا تمتلك صلاحية.');
        const text = args.join(' ');
        if (!text) return message.reply('⚠️ اكتب النص الذي تريد أن يكرره البوت.');
        await message.delete().catch(() => {});
        return message.channel.send(text);
    }

    if (command === 'lockdown') {
        if (message.author.id !== message.guild.ownerId) return message.reply('❌ للأونر فقط.');
        message.guild.channels.cache.forEach(channel => {
            if (channel.isTextBased()) {
                channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => {});
            }
        });
        return message.reply('🚨 **تم تفعيل الطوارئ!** تم قفل جميع رومات السيرفر.');
    }

    if (command === 'unlockdown') {
        if (message.author.id !== message.guild.ownerId) return message.reply('❌ للأونر فقط.');
        message.guild.channels.cache.forEach(channel => {
            if (channel.isTextBased()) {
                channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => {});
            }
        });
        return message.reply('🟢 **تم إلغاء الطوارئ!** تم فتح جميع رومات السيرفر.');
    }

    if (command === 'slowmode') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ لا تمتلك صلاحية.');
        const time = parseInt(args[0]);
        if (isNaN(time)) return message.reply('⚠️ حدد عدد الثواني (اكتب 0 للإلغاء).');
        await message.channel.setRateLimitPerUser(time);
        return message.reply(`⏱️ تم ضبط الشات البطيء على **${time}** ثانية.`);
    }

    if (command === 'embed') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ لا تمتلك صلاحية.');
        const text = args.join(' ');
        if (!text) return message.reply('⚠️ اكتب النص الذي تريده داخل الإيمبد.');
        const customEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setDescription(text)
            .setTimestamp();
        await message.delete().catch(() => {});
        return message.channel.send({ embeds: [customEmbed] });
    }

    // ==========================================
    // أمر +help الموحد (يحتوي على أزرار وقوائم متعددة وعدد الأوامر)
    // ==========================================
    if (command === 'help') {
        const totalCommandsCount = 23; // إجمالي عدد الأوامر

        const getEmbed = (page) => {
            if (page === 1) {
                return new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('📜 قائمة المساعدة - الصفحة 1/3 (النظام، الإحصائيات والأونر)')
                    .setDescription(`إجمالي الأوامر في البوت: **${totalCommandsCount}**\nاستخدم الأزرار أدناه للتنقل بين القوائم بسلاسة.`)
                    .addFields(
                        { name: '**`+system-off`**', value: '**إيقاف تشغيل نظام البوت بالكامل (للأونر فقط).**', inline: false },
                        { name: '**`+system-on`**', value: '**إعادة تفعيل وتشغيل نظام البوت (للأونر فقط).**', inline: false },
                        { name: '**`+afk [السبب]`**', value: '**تحديد حالتك كغائب وتنبيه من يقوم بمنشنك.**', inline: false },
                        { name: '**`+roles`**', value: '**عرض جميع رتب السيرفر مرتبة من الأقوى للأصغر.**', inline: false },
                        { name: '**`+top-messages`**', value: '**عرض أكثر 10 أعضاء تفاعلاً اليوم (يتم تصفيرها تلقائياً).**', inline: false },
                        { name: '**`+server`**', value: '**عرض معلومات السيرفر المفصلة، الأونر، البوستات والعمر.**', inline: false }
                    )
                    .setFooter({ text: 'الصفحة 1 من 3 | بواسطة ' + message.author.tag });
            } else if (page === 2) {
                return new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('📜 قائمة المساعدة - الصفحة 2/3 (الإشراف وإدارة الرومات)')
                    .setDescription(`إجمالي الأوامر في البوت: **${totalCommandsCount}**\nاستخدم الأزرار أدناه للتنقل بين القوائم بسلاسة.`)
                    .addFields(
                        { name: '**`+ban [@user]`**', value: '**حظر عضو من السيرفر نهائياً.**', inline: false },
                        { name: '**`+kick [@user]`**', value: '**طرد عضو من السيرفر.**', inline: false },
                        { name: '**`+timeout [@user] [الدقائق]`**', value: '**إعطاء ميوت لعضو لمدة محددة بالدقائق.**', inline: false },
                        { name: '**`+untimeout [@user]`**', value: '**إزالة الميوت عن العضو.**', inline: false },
                        { name: '**`+unban [الايدي]`**', value: '**فك البان عن العضو باستخدام الآي دي.**', inline: false },
                        { name: '**`+clear [العدد]`**', value: '**مسح رسائل الشات (من 1 إلى 100).**', inline: false },
                        { name: '**`+lock` / `+unlock`**', value: '**قفل أو فتح روم الدردشة الحالي.**', inline: false },
                        { name: '**`+hide` / `+unhide`**', value: '**إخفاء أو إظهار روم الدردشة للجميع.**', inline: false }
                    )
                    .setFooter({ text: 'الصفحة 2 من 3 | بواسطة ' + message.author.tag });
            } else if (page === 3) {
                return new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('📜 قائمة المساعدة - الصفحة 3/3 (الرتب والأدوات الإضافية)')
                    .setDescription(`إجمالي الأوامر في البوت: **${totalCommandsCount}**\nاستخدم الأزرار أدناه للتنقل بين القوائم بسلاسة.`)
                    .addFields(
                        { name: '**`+role [@user] [@role]`**', value: '**تبديل الرتبة (إضافتها إذا لم تكن موجودة أو إزالتها).**', inline: false },
                        { name: '**`+giverole` / `+removerole`**', value: '**منح أو إزالة رتبة معينة مباشرة.**', inline: false },
                        { name: '**`+giveaway [الوقت] [الجائزة]`**', value: '**بدء مسابقة تفاعلية مع تفاعل 🎉.**', inline: false },
                        { name: '**`+say [النص]`**', value: '**جعل البوت يكرر رسالتك.**', inline: false },
                        { name: '**`+lockdown` / `+unlockdown`**', value: '**قفل أو فتح جميع رومات السيرفر دفعة واحدة (للأونر).**', inline: false },
                        { name: '**`+slowmode [الثواني]`**', value: '**تحديد سرعة الشات البطيء للروم.**', inline: false },
                        { name: '**`+embed [النص]`**', value: '**إرسال نصك داخل رسالة إيمبد رسمية.**', inline: false },
                        { name: '**`+user` / `+avatar` / `+ping`**', value: '**أدوات عامة لمعلومات الأعضاء والبروفايلات والبنغ.**', inline: false }
                    )
                    .setFooter({ text: 'الصفحة 3 من 3 | بواسطة ' + message.author.tag });
            }
        };

        const getRow = (disabled = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('help_1').setLabel('القائمة 1').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('help_2').setLabel('القائمة 2').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('help_3').setLabel('القائمة 3').setStyle(ButtonStyle.Primary).setDisabled(disabled)
            );
        };

        const initialMsg = await message.reply({ embeds: [getEmbed(1)], components: [getRow()] });

        const collector = initialMsg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '❌ لا يمكنك استخدام قائمة المساعدة هذه.', ephemeral: true });
            }

            if (i.customId === 'help_1') {
                await i.update({ embeds: [getEmbed(1)], components: [getRow()] });
            } else if (i.customId === 'help_2') {
                await i.update({ embeds: [getEmbed(2)], components: [getRow()] });
            } else if (i.customId === 'help_3') {
                await i.update({ embeds: [getEmbed(3)], components: [getRow()] });
            }
        });

        collector.on('end', () => {
            initialMsg.edit({ components: [getRow(true)] }).catch(() => {});
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
