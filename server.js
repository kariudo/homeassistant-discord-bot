//SETUP
const Discord = require('discord.js');
const d_client = new Discord.Client();

const args = process.argv.slice(2)

const mqtt = require('mqtt');
const options = {
    port: args[2],
    host: args[1],
    clientId: 'Node.js_' + Math.random().toString(16).substr(2, 8),
    username: args[3],
    password: args[4]
};
const m_client = mqtt.connect(args[1], options);

//READY
d_client.on('ready', () => {
  console.info(`BOT logged in as ${d_client.user.username}!`);
});

m_client.on('connect', () => {
    console.info('MQTT connected');
    m_client.subscribe(args[6]);
});

//Commands
m_client.on('message', (topic, message) => {
  if (topic == args[6]){  
    const Server = d_client.guilds.cache.get(args[8])
    const you = Server.members.cache.get(args[9])
    switch(message.toString()){
      case 'mute':
        you.voice.setMute(true);
        break;
      case 'deaf':
        you.voice.setDeaf(true);
        you.voice.setMute(true);
        break;
      case 'kick':
        you.voice.kick();
        break;
      case 'undeaf':
        you.voice.setDeaf(false);
        you.voice.setMute(false);
        break;
      case 'unmute':
        you.voice.setMute(false);
        break;
      default:
        console.warn(`The Command '${message.toString()}' is not supported`)
    }
  }
});

//In Voicechannel?
d_client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.channelID === null){
    if (oldState.member.id === args[9]){
      m_client.publish(args[7], '{"voice_connection":"false", "mute": "unavailable", "deaf": "unavailable"}');
    }
  }
  else if (oldState.channelID === null){   
    if (newState.member.id === args[9]){
      deaf = newState.member.voice.deaf;
      mute = newState.member.voice.mute;
      voice = {"voice_connection": "true", "mute": mute, "deaf": deaf};
      voice_json = JSON.stringify(voice);
      m_client.publish(args[7], voice_json);
    }
  }
  else{
    if (newState.member.id === args[9]){
      deaf = newState.member.voice.deaf;
      mute = newState.member.voice.mute;
      voice = {"voice_connection": "true", "mute": mute, "deaf": deaf};
      voice_json = JSON.stringify(voice);
      m_client.publish(args[7], voice_json);
    }
  }
});

//Online
d_client.on('presenceUpdate', (oldPresence, newPresence) => {
  onlineMembers = d_client.guilds.cache.get(args[8]).members.cache
    .filter(member => member.presence.status !== 'offline');
  online = []
  onlineMembers.forEach((member) => {
    if(member.user.bot) return;
    online.push({"username": member.user.username, "activity": member.presence.activities})
  });
  online_json = JSON.stringify(online)
  m_client.publish(args[5], online_json);
});

d_client.login(args[0]);