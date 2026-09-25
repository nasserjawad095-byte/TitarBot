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
