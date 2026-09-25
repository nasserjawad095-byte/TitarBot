const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '+';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. أمر الـ Help المنظم بمسافات واضحة
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜  قائمة الأوامر المتاحة  (Help Menu)')
            .setDescription('إليك جميع الأوامر المتوفرة في البت حالياً:')
            .addFields(
                { 
                    name: '🛠️  الأوامر الإدارية  (Admin)', 
                    value: '`+kick`   <- طرد عضو من السيرفر\n`+ban`    <- حظر عضو من السيرفر\n`+clear`  <- مسح رسائل الشات', 
                    inline: false 
                },
                { 
                    name: '🎮  الأوامر العامة  (General)', 
                    value: '`+ping`   <- فحص سرعة استجابة البوت\n`+help`   <- إظهار قائمة الأوامر هذه', 
                    inline: false 
                }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [helpEmbed] });
    }

    // 2. أمر الـ Ping
    if (command === 'ping') {
        const pingTime = client.ws.ping;
        return message.reply(`🏓 Pong! سرعة الاستجابة هي: **${pingTime}ms**`);
    }

    // 3. أمر مسح الرسائل (Clear)
    if (command === 'clear') {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ عذراً، لا تمتلك صلاحية `ManageMessages` لاستخدام هذا الأمر.');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            return message.reply('⚠️ يرجى تحديد عدد رسائل صحيح بين **1** و **100**.');
        }

        try {
            await message.channel.bulkDelete(amount, true);
            const reply = await message.channel.send(`✅ تم مسح **${amount}** رسالة بنجاح.`);
            setTimeout(() => reply.delete().catch(() => {}), 4000);
        } catch (error) {
            console.error(error);
            message.reply('❌ حدث خطأ أثناء محاولة مسح الرسائل (ربما تكون أقدم من 14 يوماً).');
        }
    }
});

// ضع التوكن الخاص بك هنا أو عبر متغيرات البيئة
client.login(process.env.DISCORD_TOKEN);
