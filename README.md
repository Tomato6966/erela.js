### Maintained + improved Fork from the official [menudocs/erela.js repository](https://github.com/menudocs/erela.js)!
Within this Repository, I did:
- updated erela.js to support Latest Lavalink Features (Sessions, REST-API, etc.)
- Added new [Features](#features)

### Install my Version:

npm:
```bash
npm i Tomato6966/erela.js
```

yarn:
```bash
yarn add Tomato6966/erela.js
```



## Docs:

### class Manager([ManagerOptions](#manageroptions))

```js
client.musicManager = new Manager(ManagerOptions)
```

#### ManagerOptions:
| Variable Name                | Value                                 | Default                                                                                                                        | Description                                                                                                                                                           |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nodes                        | [NodeOptions[]](#NodeOptions)                           | [DefaultNode](#defaultnode)                                                                                                    | What Nodes to use for this Manager                                                                                                                                    |
| clientId                     | string                                | -                                                                                                                              | the Bot-Client Id (Snowflake) / any                                                                                                                                   |
| clientName                   | string                                | "erela.js"                                                                                                                     | Value for the Lavalink Client-Name header                                                                                                                             |
| shards                       | number                                | 1                                                                                                                              | The Shard count                                                                                                                                                       |
| plugins                      | Plugin[]                              | -                                                                                                                              | Array of erela.js Plugins                                                                                                                                             |
| forceLoadPlugin              | boolean                               | true                                                                                                                           | If Plugins should be loaded, no matter which class they extend                                                                                                        |
| autoPlay                     | boolean                               | true                                                                                                                           | Wheter it should skip to the next song in the queue on Errors, songFinish, etc.                                                                                       |
| trackPartial                 | string[]                              | -                                                                                                                              | an array of track Properties to keep                                                                                                                                  |
| defaultSearchPlatform        | SearchPlatform                        | "youtube"                                                                                                                      | What Searchplatform to use, when searching without a source                                                                                                           |
| volumeDecrementer            | number                                | 1                                                                                                                              | how much % the Volume should decrement, when sending the volume, e.g. u do setVolume(100) with a decrementer of 0.75 and lavalink gets told to set the volume to: 75% |
| position_update_interval     | number                                | 250                                                                                                                            | in how many ms interval steps, the player-position should be incremented client sided ( Lavalink sends it every N seconds [defualt configuration is 5s] )             |
| validUnresolvedUris          | string[]                              | ["www.youtu", "music.youtu", "soundcloud.com"]                                                                                 | What Urls are allowed to be directly used from lavalink, when resolving unresolved tracks                                                                             |
| allowedLinks                 | string[]                              | -                                                                                                                              | Array of URLS to allow which you are too lazy to write REGEXes of (must be 1:1)                                                                                       |
| allowedLinksRegexes          | RegExp[]                              | Manager#regex                                                                                                                  | all regexes which allow URLS   (if 1 regex matches a given url, the url will be used)                                                                                 |
| onlyAllowAllowedLinks        | boolean                               | true                                                                                                                           | if it should only allow urls, from allowedLinksRegexes or allowedLinks                                                                                                |
| defaultLeastUsedNodeSortType | "memory" / "calls" / "players"        | "players"                                                                                                                      | How it should sort the NODES on Manager#leastUsedNode() (Before it was calls, now it's players)                                                                       |
| defaultLeastLoadNodeSortType | "cpu" / "memory"                      | "memory"                                                                                                                       | How it should sort the NODES on Manager#leastLoadNode() (Before it was cpu, now it's memory)                                                                          |
| forceSearchLinkQueries       | boolean                               | true                                                                                                                           | If it should force-load links via Manager#searchLink (which should happen automatically, but this forces it)                                                          |
| useUnresolvedData            | boolean                               | true                                                                                                                           | If it should use unresolved Tracks Data uppon their resolved ones                                                                                                     |
| userAgent                    | string                                | "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0" | What user Agent to use when doing Requests to Lavalink                                                                                                                |
| restTimeout                  | number                                | -                                                                                                                              | Amount of time to wait until the Rest Methods are rejected                                                                                                            |
| send                         | Function(id: string, payload:Payload) | -                                                                                                                              | The function to send payload to discord..                                                                                                                             |                             |                                       |                                                                                                                                |                                                                                                                                                                       |

#### Manager-Methods / Properties
| Method-Name / Variable-Name                                                            | returnData                              | Description                                                                                                         |     |
| -------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --- |
| `regex`                                                                                | Record<SourcesRegex, RegExp>            | An Object of all default Source Regexes, which you may use too!                                                     |     |
| `DEFAULT_SOURCES`                                                                      | Record<SearchPlatform, string>          | An Object of all SearchPlatform strings you may use, to convert to lavalink sources                                 |     |
| `players`                                                                              | Collection<guildId:string, Player>      | A Collection of all Players                                                                                         |     |
| `nodes`                                                                                | Collection<nodeIdentifier:string, node> | A Collection of all Nodes                                                                                           |     |
| `options`                                                                              | [ManagerOptions](#manageroptions)       | all Options given to the Manager                                                                                    |     |
| `leastUsedNodes`                                                                       | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Calls/Players/Memory Usages (`Manager#defaultLeastUsedNodeSortType`) |     |
| `leastUsedNodesCalls`                                                                  | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Calls Usages                                                         |     |
| `leastUsedNodesPlayers`                                                                | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Players Usages                                                       |     |
| `leastUsedNodesMemory`                                                                 | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Memory Usages                                                        |     |
| `leastLoadNodes`                                                                       | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Cpu/Memory Usages (`Manager#defaultLeastLoadNodeSortType`)           |     |
| `leastLoadNodesMemory`                                                                 | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Memory Usages                                                        |     |
| `leastLoadNodesCpu`                                                                    | Collection<nodeIdentifier:string, Node> | A Collection of all Nodes, but sorted by their Cpu Usages                                                           |     |
| `init(clientID:string, { clientId?: string, clientName?:string, shards?:number })`     | -                                       | Initialize the Manager (+ you can now add clientName and shards etc. too)                                           |     |
| `search({ query: string, source:SearchPlatform }, requester:unknown, customNode:Node)` | Promise\<SearchResult>                  | Search for a Query, you can specifcy the Node too (player.node) if you wanna use regioning!                         |     |
| `searchLink(link:string, requester:unknown, customNode:Node)`                          | Promise\<SearchResult>                  | Search for a Link on Lavalink                                                                                       |     |
| `decodeTracks(tracks:string[])`                                                        | Promise\<TrackData[]>                   | Decode Tracks from Lavalink                                                                                         |     |
| `decodeTrack(track:string)`                                                            | Promise\<TrackData>                     | Decode a single Track                                                                                               |     |
| `create(PlayerOptions)`                                                                | [Player](#Player)                       | Create a Player                                                                                                     |     |
| `get(guildId:string)`                                                                  | Player                                  | get a Player from a guildId                                                                                         |     |
| `destroy(guildId:string)`                                                              | void                                    | Destroy a Player of a GuildId                                                                                       |     |
| `createNode(NodeOptions)`                                                              | Node                                    | Creates a Node                                                                                                      |     |
| `destroyNode(NodeIdentifier:string)`                                                   | void                                    | Destroy a Node                                                                                                      |     |
| `updateVoiceState(data)`                                                                | Promise\<void>                          | update the Voice State to Lavalink                                                                                  |     |

#### Manager-Events

| Event-Names      | Parameters                                      | Description                                          |
|------------------|-------------------------------------------------|------------------------------------------------------|
| nodeCreate       | node                                            | Emitted once a node gets Created                     |
| nodeConnect      | node                                            | Emits when a node Connects                           |
| nodeReconnect    | node                                            | Emits when a node attempts a reconnect               |
| nodeDisconnect   | node, reason: { code?: number, reason?: string} | Emits when a node disconnects                        |
| nodeError        | node, error                                     | Emits when a node throws errors                      |
| nodeRaw          | payload                                         | Emits every payload from a Node                      |
| playerCreate     | player                                          | Emits when a player gets created                     |
| playerDestroy    | player                                          | Emits when a player get's destroyed                  |
| queueEnd         | player, track, payload                          | Emits when the queue End                             |
| playerMove       | player, initChannel, newChannel                 | Emits when the player moves from a VC to another one |
| playerDisconnect | player, oldChannel                              | Emits when the player Leaves the VC                  |
| trackStart       | player, track, payload                          | Emits when a track starts to play                    |
| trackEnd         | player, track, payload                          | Emits when a track ends playing                      |
| trackStuck       | player, track, payload                          | Emits when a track gets stucked and skips the track  |
| trackError       | player, track, payload                          | Emits when a track errors and skips it               |
| socketClosed     | player, payload                                 | Emits when a connection gets closed                  |


## Everything about Nodes:

## NodeOptions

SOON
## defaultnode

SOON

## Node-Methods

SOON


# Tutorials
Down below you see how what works!


## Regioning System:

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
  region: channel?.rtcRegion || undefined, // region
  guild: channel.guild.id,
  voiceChannel: channel.id,
  textChannel: message.channel.id,
  selfDeafen: true,
});

// searching tracks requires you to pass the node now!
client.musicManager.search(query, requester, player.node);


// or search via player, so you don't need to pass the node:
player.search(query, requester);
```

  
**IMPORTANT NOTE!**
> *When using regioning, you must SEARCH on the same NODE as you play the TRACK on, best practice can be found in the JS script above for the search() method, just provide the correct node (the node the player is using)*

  

### How to use custom Sources

> Lavalink provides default sources from: `scsearch`, `ytsearch`, `ytmsearch`, so that you don't need to type these weird names, you can simply type `soundcloud` or `youtube` or `youtube music`.
> However since Lavalink supports [Plugins](https://github.com/freyacodes/Lavalink/blob/master/PLUGINS.md) too, you can now also use them to search on things like: Spotify, Deezer, etc. Use the [LavaSrc](https://github.com/TopiSenpai/LavaSrc) Plugin for that!
> -> so you can also pass as a source `spotify`, or short: `sp`
> Check out [SearchPlatforms](#searchplatforms) to figure what all you can use! 

```js

const source = "yt"; // "yt" / "ap" / "sp" / "sc" / "ytm" / "..."
// request possibility
client.musicManager.search({query, source}, requester, player.node);
// e.g. search on spotify
client.musicManager.search({
   query: "Adele - Hello",
   source: "sp", // "spsearch" / "sprec" / etc. check out: 
   // or for deezer: source: "dz" / "deezer"
}, interaction.user, player.node);

```

  

## Added `instaUpdateFiltersFix` Player#Property. - Default: true 
Updates filters and Equalizers almost instantly, by seeking to the same player position after a filter/eq got applied
-> On default it's set to: `true` aka enabled, if your system is not able to handle the extra load, disable it!

```js
const player = client.musicManager.create({
    ...PlayerOptions,
    instaUpdateFiltersFix: true, // to disable it (and save resources) set it to false
})
```

## Update the Player Position way faster!
Lavalink sends the Player Stats (Position) every 5s. With the newest Lavalink Version you can adjust that, however if it's less than 2s your CPU Usage goes crazy high!!
-> To make it simpler, you can count the position on your Manager!
-> the default value is: 250 (in ms) to adjust / change that, do it with: 

```js
new Manager({
    ...ManagerOptions,
    position_update_interval: 150
})
```

It is client sided, not server sided, means, that on your client player.position will be more accurate, if the server changes, the client will be updated either way by the server (real) data.
  

## Added Manager#Property: `volumeDecrementer`

// e.g: `new Manager({volumeDecrementer:0.75});` will send to lavalink 75% of the volume not 100%, aka you will hear 75% of the set volume, tho see in the player.volume property the full 100% aka if you do `player.setVolume(100);` then `player.volume == 100` but lavalink receives `75`

- I use smt between 0.5 - 0.75 cause then the volume is not TOO LOUD at 100% (default) and not really earrapy at 150% (which users like to do when trolling ;) ) (for reference 1 is the same as not adding the option)


# This lib works for many discord Libs
I tested it in: discord.js, discordeno, oceanicJS, eris.
-> U just have to be sure, to pass all IDs as STRINGS (as that'S discord.js's default caching value-type)
  

## Inbuilt Filters

Variables to see which Filter is active:
```js

player.filters.nightcore // READONLY - {Boolean|String} if it's enabled or not
player.filters.rotating // READONLY - {Boolean} if it's enabled or not
player.filters.tremolo // READONLY - {Boolean} if it's enabled or not
player.filters.vibrato // READONLY - {Boolean} if it's enabled or not
player.filters.lowPass // READONLY - {Boolean} if it's enabled or not
player.filters.karaoke // READONLY - {Boolean} if it's enabled or not
player.filters.audioOutput // READONLY - {"stereo"|"mono"|"right"|"left"} how the audio is getting outputted

// only available with lavalink-filter-plugin
player.filters.echo // READONLY - {Boolean} if it's enabled or not

```

  

Functions to set the Filters:
> -> You can even use custom Data if you want, just pass them to the function parameter(s)!
```js

player.toggleRotating(rotationHz = 0.2);
player.toggleVibrato(frequency = 2, depth = 0.5);
player.toggleTremolo(frequency = 2, depth = 0.5);
player.toggleLowPass(smoothing = 20);
player.toggleNightcore(speed = 1.2999999523162842, pitch = 1.2999999523162842, rate=1);
player.toggleKaraoke(level = 1, monoLevel = 1, filterBand = 220, filterWidth = 100);
// default: stereo, rightChannel is right 100% and left 0%, and leftChannel is invert of rightChannel
player.setAudioOutput("stereo"|"mono"|"right"|"left");

// reset all filters to default
player.resetFilters();

// only available with lavalink-filter-plugin
player.toggleEcho(delay = 1, decay = 0.5);
```

  

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
- [erela.js-bandcamp-search](https://github.com/Tomato6966/erela.js-bandcamp-search) | `npm i Tomato6966/erela.js-bandcamp-search` / `yarn add Tomato6966/erela.js-bandcamp-search`


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
 - `player.wsPing` Ping in ms from Lavalink server. if it's less then 0, it means player is not connected yet
## Added Link (Url) Query Validation:


 - `Manager#allowedLinks` Array of Strings of Urls which are allowed
 - `Manager#allowedLinksRegexes` Array of Regexes which must match the link
    - `Manager#regex` --> Default Regexes applied to allowedLinksRegexes, if not Set (except spotify and deezer links)
If provided link to query is **not** valid, then it throws an error,

e.g.

```js

new Manager({

  allowedLinksRegexes: [

    Manager.regex.YoutubeRegex,

    Manager.regex.YoutubeMusicRegex,

    Manager.regex.SoundCloudRegex,

    Manager.regex.SoundCloudMobileRegex,

    // Manager.regex.AllDeezerRegex,

    // Manager.regex.AllSpotifyRegex,

    Manager.regex.mp3Url,

    Manager.regex.m3uUrl,

    Manager.regex.m3u8Url,

    Manager.regex.mp4Url,

    Manager.regex.m4aUrl,

    Manager.regex.wavUrl,

  

    //Manager.regex.vimeo,

    //Manager.regex.TwitchTv,

    //Manager.regex.appleMusic,

    //Manager.regex.bandcamp,

    //Manager.regex.radiohost,

    //Manager.regex.yandexmusic,

  ] // these are the default Values with comments, are all available, you can add your custom regexes if you want like this: /regex/ or new RegExp("regex", "flags");

})

// or: accept all the provided regexes:

new Manager({

  ...,

  allowedLinksRegexes: Object.values(Manager.regex),

})

```



# EVERYTHING BELOW IS OLD
-> These are from the old readme of erela.js
-> Will remove/adjust it soon!
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

  

> Erela was transferred to MenuDocs, because I no longer wish to work with Discord related development. It will from now on be maintained by [MenuDocs](https://github.com/MenuDocs). ~ @Solaris9 + now discontinued

  

## Documentation & Guides

  

- [Documentation](https://erelajs-docs.netlify.app/docs/gettingstarted.html "Erela.js Documentation") - discontinued

  

- [Guides](https://erelajs-docs.netlify.app/guides/introduction.html "Erela.js Guides") - discontinued

  

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

  

## exampleManager

  

```js

const { Manager } = require("erela.js"); // npm i Tomato6966/erela.js

  

const Deezer = require("better-erela.js-deezer"); // npm i Tomato6966/better-erela.js-deezer

const BandCampSearch = require("erela.js-bandcamp-search"); // npm i Tomato6966/erela.js-bandcamp-search"

  

// creation

client.musicManager = new Manager({

    defaultSearchPlatform: "ytsearch", // "ytmsearch" / "ytsearch" / "deezer" / "scsearch" // etc. etc. deezer only valid if you have MY better-erela.js-deezer plugin installed!

    handleError: false, // if true, you have to handle what happens when an Error happens, if false it auto skips!

    handleStuck: false, // if true, you have to handle what happens when an track gets stucked happens, if false it auto skips!

    volumeDecrementer: 0.75, // instead of sending 100% it sends 75%

    position_update_interval: 100, // update the player.position every 100ms

    nodes: [

        {

            identifier: `Use_Node_1`,

            port: 2333,  host: "localhost", // ip.address. e.g. 127.0.0.1

            regions: ["us-east", "us-central", "us-south", "us-west", "brazil"], // example regions

            password: "youshallnotpass",

            retryAmount: 10,

            retryDelay: 7500,

        },

        {

            identifier: `GERMANY_Node_1`,

            port: 2333, host: "localhost", // ip.address. e.g. 127.0.0.1

            regions: ["rotterdam", "russia"],

            password: "milrato_pass_3569",

            retryAmount: 10, retryDelay: 7500,

        }

    ],

    // every base-url provided in here, will be resolved once the track is beeing tryed to play, aka fetched by lavalink.

    validUnresolvedUris: [

        "spotify.com",  // only if your lavalink has spotify plugin

        "twitch.com",

        "twitch.tv",

        "vimeo.com",

        "bandcamp.com",

        "music.apple.com", // only if your lavalink has apple music plugin

    ],

    plugins: [

        new Deezer(),

        new BandCampSearch({

            querySource: ["bandcamp", "bc"],

        }),

    ],

    shards: client.ws.totalShards || 1,

    clientName: client.user?.username,

    clientId: client.user?.id || client.id,

    send(id, payload) {

        const guild = client.guilds.cache.get(id);

        if(!guild) return;

        guild.shard.send(payload);

    },

});

  

// init the manager

  

client.on("ready", () => {

  client.musicManager.init(client.user.id, {

    shards: client.ws.totalShards,

    clientName: client.user.username,

    clientId: client.user.id,

  });

})

  

// send voicestate updates

client.on("raw", (data) => {

    switch(data.t) {

        case "VOICE_SERVER_UPDATE":

        case "VOICE_STATE_UPDATE":

            client.musicManager.updateVoiceState(data.d)

        break;

    }

});

  

// example how to search with rtcRegion

const player = client.musicManager.create({

  region: interaction.member.voice.channel?.rtcRegion || undefined,

  guild: interaction.guildId,

  voiceChannel: interaction.member.voice.channel.id, // message.member.voice.channel.id,

  textChannel: interaction.channel.id,

  selfDeafen: true,

});

const query = `eminem without me`;

// Alternative query with sources: { query: `eminem without me`, source: "sc" };

const result = await client.musicManager.search(query, interaction, player.node)

```

  
  

all Valid Sources

```

youtube music === ytm

youtube       === yt

soundcloud    === sc

ytmsearch     === ytm

ytsearch      === yt

amsearch      === am

spsearch      === sp

yandexsearch  === ym

deezer        === dz

tts           === tts

speak         === speak
```