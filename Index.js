const {
 Client,
 GatewayIntentBits,
 SlashCommandBuilder,
 REST,
 Routes,
 ContainerBuilder,
 TextDisplayBuilder,
 SeparatorBuilder,
 SeparatorSpacingSize,
 MediaGalleryBuilder,
 MediaGalleryItemBuilder,
 MessageFlags,
} = require('discord.js');
const crypto = require('crypto');


// ================= CONFIG =================
const CONFIG = {
 token: 'MTU3MDU2OTg1NTQ5OTkwMzE2Ng.G9xl8_.P3qgd4Vb8DtCDKleB9cLVwfvBNPPw6Gm1yb1CE',
 clientId: '1570569855499903166',
 guildId: '1567748582742949968',
 infractionChannelId: '1567885498901602304',
 // Roles allowed to issue infractions (leave empty [] to allow anyone with Administrator)
 allowedRoleIds: ['1567748582742949968'],
 bannerImage: 'https://media.discordapp.net/attachments/1567730506995343500/1569879915245867108/IMG_0363.png?ex=6af70a5a&is=6af5b8da&hm=f61e4a32ec228c7aa9cffe663ec06c010bad23733868f3351546c3e39eb1a734&=&format=webp&quality=lossless', // the big "Infraction" image
 accentColor: 0x2b2d31,
};
// ==========================================


const client = new Client({ intents: [GatewayIntentBits.Guilds] });


const command = new SlashCommandBuilder()
 .setName('infraction')
 .setDescription('Issue a staff infraction')
 .addUserOption((o) =>
   o.setName('user')
 .setDescription('Staff member receiving the infraction')
 .setRequired(true)
 )
 .addStringOption((o) =>
   o
     .setName('action')
     .setDescription('Action taken')
     .setRequired(true)
     .addChoices(
       { name: 'Notice', value: 'Notice' },
       { name: 'Warning', value: 'Warning' },
       { name: 'Strike', value: 'Strike' },
       { name: 'Demotion', value: 'Demotion' },
       { name: 'Suspension', value: 'Suspension' },
       { name: 'Termination', value: 'Termination' }
     )
 )
 .addStringOption((o) =>
   o.setName('reason')
 .setDescription('Reason for the infraction')
 .setRequired(true)
 )
 .addBooleanOption((o) =>
   o.setName('appealable')
 .setDescription('Can this infraction be appealed?')
 .setRequired(true)
 );


client.once('clientReady', async () => {
 const rest = new REST({ version: '10' }).setToken(CONFIG.token);
 await rest.put(Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId), {
   body: [command.toJSON()],
 });
 console.log(`Logged in as ${client.user.tag} — /infraction registered.`);
});


function generateId() {
 return '#' + crypto.randomBytes(5).toString('hex').toUpperCase(); // e.g. #62D972371C
}


function buildInfraction({ issuerId, targetId, action, appealable, reason, id }) {
 const container = new ContainerBuilder().setAccentColor(CONFIG.accentColor);


 // Banner
 container.addMediaGalleryComponents(
   new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(CONFIG.bannerImage))
 );


 // Title + ID
 container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## Staff Infraction'));
 container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`${id}\``));
 container.addSeparatorComponents(
   new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
 );


 // Who issued to who
 container.addTextDisplayComponents(
   new TextDisplayBuilder().setContent(`<@${issuerId}> has issued an infraction to <@${targetId}>.`)
 );
 container.addSeparatorComponents(
   new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
 );


 // Infraction information
 container.addTextDisplayComponents(
   new TextDisplayBuilder().setContent(
     `### Infraction Information:\n- *Action:* ${action}\n- *Appealable:* ${appealable ? 'Yes' : 'No'}`
   )
 );
 container.addSeparatorComponents(
   new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
 );


 // Reason
 container.addTextDisplayComponents(
   new TextDisplayBuilder().setContent(`### Reason:\n${reason}`)
 );
 container.addSeparatorComponents(
   new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
 );
 return container;
}


client.on('interactionCreate', async (interaction) => {
 if (!interaction.isChatInputCommand() || interaction.commandName !== 'infraction') return;


 // Permission check
 const member = interaction.member;
 const hasRole =
   CONFIG.allowedRoleIds.length === 0
     ? member.permissions.has('Administrator')
     : CONFIG.allowedRoleIds.some((r) => member.roles.cache.has(r));


 if (!hasRole) {
   return interaction.reply({
     content: 'You do not have permission to issue infractions.',
     flags: MessageFlags.Ephemeral,
   });
 }


 const target = interaction.options.getUser('user');
 const action = interaction.options.getString('action');
 const reason = interaction.options.getString('reason');
 const appealable = interaction.options.getBoolean('appealable');


 if (target.bot) {
   return interaction.reply({
     content: 'You cannot issue an infraction to a bot.',
     flags: MessageFlags.Ephemeral,
   });
 }


 const id = generateId();
 const container = buildInfraction({
   issuerId: interaction.user.id,
   targetId: target.id,
   action,
   appealable,
   reason,
   id,
 });


 try {
   const channel = await client.channels.fetch(CONFIG.infractionChannelId);
   await channel.send({
     components: [container],
     flags: MessageFlags.IsComponentsV2,
     allowedMentions: { users: [target.id] },
   });


   await interaction.reply({
     content: `Infraction ${id} issued to ${target}.`,
     flags: MessageFlags.Ephemeral,
   });
 } catch (err) {
   console.error(err);
   await interaction.reply({
     content: 'Something went wrong sending the infraction. Check the channel ID and bot permissions.',
     flags: MessageFlags.Ephemeral,
   });
 }
});


client.login(CONFIG.token);



