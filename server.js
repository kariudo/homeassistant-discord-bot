//Variables
const args = process.argv.slice(2)
const bot_token = args[0]
const mqtt_url = args[1]
const mqtt_port = args[2]
const mqtt_username = args[3]
const mqtt_password = args[4]
const topic_online = args[5]
const topic_command = args[6]
const topic_voice = args[7]
const guild_id = args[8]
const your_id = args[9]

//Discord
const Discord = require('discord.js');
const d_client = new Discord.Client();

d_client.on('ready', () => {
  console.info(`BOT logged in as ${d_client.user.username}!`);
});

//Mqtt
const mqtt = require('mqtt');
const options = {
  port: mqtt_port,
  host: mqtt_url,
  clientId: 'Node.js_' + Math.random().toString(16).substr(2, 8),
  username: mqtt_username,
  password: mqtt_password,
  clean: true,
  resubscribe: false
};
const m_client = mqtt.connect(mqtt_url, options);

m_client.on('connect', () => {
    console.info('MQTT connected');
    m_client.subscribe(topic_command);
});

//ERROR
m_client.on('error', (error) => {
  console.error(`MQTT ${error}`)
});
m_client.on('close', () => {
  console.error('MQTT disconnected')
});

//Commands
m_client.on('message', (topic, message) => {
  if (topic == topic_command){
    const Server = d_client.guilds.cache.get(guild_id)
    const you = Server.members.cache.get(your_id)
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
        console.error(`The Command '${message.toString()}' is not supported`)
    }
  }
});

//In Voicechannel?
d_client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.channelID === null){
    if (oldState.member.id === your_id){
      m_client.publish(topic_voice, '{"voice_connection":"false", "mute": "unavailable", "deaf": "unavailable"}');
    }
  }
  else if (oldState.channelID === null){
    if (newState.member.id === your_id){
      deaf = newState.member.voice.deaf;
      mute = newState.member.voice.mute;
      voice = {"voice_connection": "true", "mute": mute, "deaf": deaf};
      voice_json = JSON.stringify(voice);
      m_client.publish(topic_voice, voice_json);
    }
  }
  else{
    if (newState.member.id === your_id){
      deaf = newState.member.voice.deaf;
      mute = newState.member.voice.mute;
      voice = {"voice_connection": "true", "mute": mute, "deaf": deaf};
      voice_json = JSON.stringify(voice);
      m_client.publish(topic_voice, voice_json);
    }
  }
});

//Online
d_client.on('presenceUpdate', (oldPresence, newPresence) => {
  onlineMembers = d_client.guilds.cache.get(guild_id).members.cache
    .filter(member => member.presence.status !== 'offline');
  online = []
  onlineMembers.forEach((member) => {
    if(member.user.bot) return;
    online.push({"username": member.user.username, "activity": member.presence.activities})
  });
  online_json = JSON.stringify(online)
  m_client.publish(topic_online, online_json);
});

d_client.login(bot_token);
