# What's different / better

## Added Support for Regioning System:

When creating the node(s) pass the variable regions, to auto-select the right region based on what region u provide in the players.create(options#region) options!

```js
const nodes = [
   {
     identifier: "USA_NODE", host, password, port
     regions: ["us-east", "us-central", "us-south", "us-west", "brazil"],
   },
   {
     identifier: "GERMANY_NODE", host, password, port
     regions: ["rotterdam", "russia"],
   },
]
```

When creating the Player, pass the rtcRegion like that:
```js
const { channel } = message.member.voice;
const player = client.musicManager.create({
  region: channel?.rtcRegion || undefined,
  guild: channel.guild.id,
  voiceChannel: channel.id,
  textChannel: message.channel.id,
  selfDeafen: true,
});

// find track:
client.musicManager.search(query, requester, player.node);
// or via player:
player.search(query, requester);
```

**IMPORTANT NOTE!**

*When using regioning, you must SEARCH on the same NODE as you play the TRACK on, best practice can be found in the JS script above for the search() method, just provide the correct node (the node the player is using)*

## Added Support for latest Versions of Lavalink (common known plugin searches)

```js
const source = "yt"; // "yt" / "ap" / "sp" / "sc" / "ytm" / "..."
client.musicManager.search({query, source}, requester, player.node);
// e.g. search on spotify 
client.musicManager.search({
   query: "Adele - Hello",
   source: "sp",
}, interaction.user, player.node);
```

## Added `instaUpdateFiltersFix` Player#Property. - Default: true (update filters & equalizers instantly when u send a filterupdate request with the provided filter functions)

```js
const player = client.musicManager.create({
    ...,
    instaUpdateFiltersFix: true, // to disable it (and save resources) set it to false
})
```

## Position updates every 250ms ( you can change that by doing: `new Manager({position_update_interval: 150})`) 

It is client sided, not server sided, means, that on your client player.position will be more accurate, if the server changes, the client will be updated either way by the server (real) data.

## Added Manager#Property: `volumeDecrementer` 

// e.g: `new Manager({volumeDecrementer:0.75});` will send to lavalink 75% of the volume not 100%, aka you will hear 75% of the set volume, tho see in the player.volume property the full 100% aka if you do `player.setVolume(100);` then `player.volume == 100` but lavalink receives `75`

- I use smt between 0.5 - 0.75 cause then the volume is not TOO LOUD at 100% (default) and not really earrapy at 150% (which users like to do when trolling ;) ) (for reference 1 is the same as not adding the option)


## Works for discordeno too (just do guildId.toString() to save players in a queue [Click here for rest](https://github.com/Tomato6966/erela.js#discordeno) )

- or any other discord lib ;)

## Added Inbuilt Filters

Variables to see which Filter is active:
```js
player.filters.nightcore // READONLY - {Boolean} if it's enabled or not
player.filters.rotating // READONLY - {Boolean} if it's enabled or not
player.filters.tremolo // READONLY - {Boolean} if it's enabled or not
player.filters.vibrato // READONLY - {Boolean} if it's enabled or not
player.filters.lowPass // READONLY - {Boolean} if it's enabled or not 

// only available with lavalink-filter-plugin
player.filters.echo // READONLY - {Boolean} if it's enabled or not
```

Functions to set the Filters:
```js
player.toggleRotating();
player.toggleVibrato();
player.toggleTremolo();
player.toggleLowPass();
player.toggleNightcore();
player.toggleKaraoke();

// only available with lavalink-filter-plugin
player.toggleEcho();
```

You can add in each function their Parameters, [Check this file for more infos](https://github.com/Tomato6966/erela.js/blob/main/dist/structures/Player.js#L139)

## Added Manager#validUnresolvedUris for unresolved tracks

- If an unresolved Track is saved from lavalink plugins, like spotify and u wanna search on spotify with that uri, then u should do this:
```js
const Manager = new Manager({
    ...,
    validUnresolvedUris: ["spotify.com"]
})
```

## Self Made Plugins!

You can also use my plugins, which make are better then their originals due to some things missing..

- [better-erela.js-deezer](https://github.com/Tomato6966/better-erela.js-deezer) | `npm i Tomato6966/better-erela.js-deezer` / `yarn add Tomato6966/better-erela.js-deezer`

## Added Manager#forceLoadPlugin for forcing plugin loadings

If you get errors like does not extend plugin, then you can do this to force load it!
```js
const Manager = new Manager({
    ...,
    forceLoadPlugin: true,
})
```

## Added manager.init("clientId", { clientId, clientName, shards });

This allows it, that you can add data from the client once you init the manager!
Like clientName or shards Count, you should init the manager either way, once it's ready!

## Added More player parameters:

 - `player.createdAt` Date object, when the player was created in LAVALINK
 - `player.createdTimeStamp` Date Timestamp in MS, when the player was created in LAVALINK
 - `player.connected` Lavalink connected state, if it's true, lavalink thinks player is connected...
 - `player.payload` Last payload from playerUpdate Event lavalink sent
 - `player.ping` Ping in ms from Lavalink server. if it's less then 0, it means player is not connected yet
 
<div align = "center">
    <img src = "https://solaris-site.netlify.app/projects/erelajs/images/transparent_logo.png">
    <hr>
    <br>
    <a href="https://discord.gg/menudocs">
<img src="https://img.shields.io/discord/416512197590777857?color=7289DA&label=Support&logo=discord&style=for-the-badge" alt="Discord">
</a>

<a href="https://www.npmjs.com/package/erela.js">
<img src="https://img.shields.io/npm/dw/erela.js?color=CC3534&logo=npm&style=for-the-badge" alt="Downloads">
</a>

<a href="https://www.npmjs.com/package/erela.js">
<img src="https://img.shields.io/npm/v/erela.js?color=red&label=Version&logo=npm&style=for-the-badge" alt="Npm version">
</a>

<br>

<a href="https://github.com/MenuDocs/erela.js">
<img src="https://img.shields.io/github/stars/MenuDocs/erela.js?color=333&logo=github&style=for-the-badge" alt="Github stars">
</a>

<a href="https://github.com/MenuDocs/erela.js/blob/master/LICENSE">
<img src="https://img.shields.io/github/license/MenuDocs/erela.js?color=6e5494&logo=github&style=for-the-badge" alt="License">
</a>
<hr>
</div>

> Erela was transferred to MenuDocs, because I no longer wish to work with Discord related development. It will from now on be maintained by [MenuDocs](https://github.com/MenuDocs). ~ @Solaris9

## Documentation & Guides

- [Documentation](https://erelajs-docs.netlify.app/docs/gettingstarted.html "Erela.js Documentation")

- [Guides](https://erelajs-docs.netlify.app/guides/introduction.html "Erela.js Guides")

## Prerequisites

- Java - [Azul](https://www.azul.com/downloads/zulu-community/?architecture=x86-64-bit&package=jdk "Download Azul OpenJDK"), [Adopt](https://adoptopenjdk.net/ "Download Adopt OpenJDK") or [sdkman](https://sdkman.io/install "Download sdkman")

- [Lavalink](https://ci.fredboat.com/viewLog.html?buildId=lastSuccessful&buildTypeId=Lavalink_Build&tab=artifacts&guest=1 "Download Lavalink")

**Note**: _Java v11 or newer is required to run the Lavalink.jar. Java v13 is recommended._ If you are using **sdkman** then _its a manager, not Java, you have to install sdkman and use sdkman to install Java_

**Warning**: Java v14 has issues with Lavalink.

## Installation

##### **NPM**

```bash
npm install erela.js
```

##### **Yarn**

```bash
yarn add erela.js
```

**Note**: _Node **v16** is required!_

## Getting Started

- Create an application.yml file in your working directory and copy the [example](https://github.com/freyacodes/Lavalink/blob/master/LavalinkServer/application.yml.example "application.yml file") into the created file and edit it with your configuration.

- Run the jar file by running `java -jar Lavalink.jar` in a Terminal window.

## Example usage

Please read the guides to start: <https://erelajs-docs.netlify.app/docs/gettingstarted.html#example-usage>

## Plugins

You can use plugins below to extend Erela.js' features easily.

Note: These are the only ones shown before being published, check the GitHub repository for a complete list.

- [erela.js-spotify](https://github.com/MenuDocs/erela.js-spotify) - Converts a Spotify URL into a UnresolvedTrack to play later.


# Discordeno

> Script for discordeno (sending data to shards)

```js

bot.musicManager = new Manager({
    volumeDecrementer: 0.75,
    position_update_interval: 100,
    nodes: [
        {
            identifier: `Node_1`,
            host: "localhost",
            port: 2333,
            password: "youshallnotpass"
        }
    ],
    // A send method to send data to the Discord WebSocket using your library.
    // Getting the shard for the guild and sending the data to the WebSocket.
    send(id, payload) {
        const shardId = bot.utils.calculateShardId(bot.gateway, BigInt(id));
        // somehow get the shard
        const shard = bot.gateway.shards.get(shardId);
        shard.send(payload);
        
        // if your rest is hosted seperately then just do your typical shard request(s)
    },
});

// in raw event
import { VoiceState, VoicePacket, VoiceServer } from "erela.js";
// code...
switch (data.t) {
  case "VOICE_SERVER_UPDATE":
  case "VOICE_STATE_UPDATE":
    bot.musicManager.updateVoiceState(data.d as VoiceState | VoiceServer | VoicePacket)
  break;
}
// code ...
```


## Contributors

👤 **Solaris**

- Author
- Website: <https://solaris.codes/>
- Github: [@Solaris9](https://github.com/Solaris9)

👤 **Anish Shobith**

- Contributor
- Github: [@Anish-Shobith](https://github.com/Anish-Shobith)

👤 **ayntee**

- Contributor
- Github: [@ayntee](https://github.com/ayntee)
