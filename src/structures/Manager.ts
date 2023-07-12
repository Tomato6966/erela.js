/* eslint-disable no-async-promise-executor */
import { Collection } from "@discordjs/collection";
import { EventEmitter } from "node:events";
import { VoiceState } from "..";
import { Node, NodeOptions } from "./Node";
import { Player, PlayerOptions, Track, UnresolvedTrack } from "./Player";
import { PluginDataInfo, v4LoadType } from "./Utils";
import {
  LoadType,
  Plugin,
  Structure,
  TrackData,
  TrackEndEvent,
  TrackExceptionEvent,
  TrackStartEvent,
  TrackStuckEvent,
  TrackUtils,
  VoicePacket,
  VoiceServer,
  WebSocketClosedEvent,
} from "./Utils";

const REQUIRED_KEYS = ["event", "guildId", "op", "sessionId"];

export const v4LoadTypes = {
  TrackLoaded: "track",
  PlaylistLoaded: "playlist",
  SearchResult: "search",
  NoMatches: "empty",
  LoadFailed: "error",
}
export const LoadTypes = {
  TrackLoaded: "TRACK_LOADED",
  PlaylistLoaded: "PLAYLIST_LOADED",
  SearchResult: "SEARCH_RESULT",
  NoMatches: "NO_MATCHES",
  LoadFailed: "LOAD_FAILED"
} as Record<"TrackLoaded"|"PlaylistLoaded"|"SearchResult"|"NoMatches"|"LoadFailed", LoadType>



function check(options: ManagerOptions) {
  if (!options) throw new TypeError("ManagerOptions must not be empty.");

  if (typeof options.send !== "function") 
    throw new TypeError('Manager option "send" must be present and a function.');

  if (typeof options.clientId !== "undefined" && !/^\d+$/.test(options.clientId))
    throw new TypeError('Manager option "clientId" must be a non-empty string.');

  if (typeof options.nodes !== "undefined" && !Array.isArray(options.nodes))
    throw new TypeError('Manager option "nodes" must be a array.');

  if (typeof options.shards !== "undefined" && typeof options.shards !== "number")
    throw new TypeError('Manager option "shards" must be a number.');

  if (typeof options.plugins !== "undefined" && !Array.isArray(options.plugins))
    throw new TypeError('Manager option "plugins" must be a Plugin array.');

  if (typeof options.autoPlay !== "undefined" &&typeof options.autoPlay !== "boolean")
    throw new TypeError('Manager option "autoPlay" must be a boolean.');

  if (typeof options.trackPartial !== "undefined" && !Array.isArray(options.trackPartial))
    throw new TypeError('Manager option "trackPartial" must be a string array.');

  if (typeof options.clientName !== "undefined" && typeof options.clientName !== "string")
    throw new TypeError('Manager option "clientName" must be a string.');
  
  if (typeof options.defaultSearchPlatform !== "undefined" && typeof options.defaultSearchPlatform !== "string")
  throw new TypeError('Manager option "defaultSearchPlatform" must be a string.');

  if (typeof options.volumeDecrementer !== "undefined" && (typeof options.volumeDecrementer !== "number" || isNaN(options.volumeDecrementer)))
    throw new TypeError('Manager option "volumeDecrementer" must be a number between 0 and 1.');

  if (options.volumeDecrementer > 1 || options.volumeDecrementer < 0)
    throw new TypeError('Manager option "volumeDecrementer" must be a number between 0 and 1.');

  if (typeof options.position_update_interval !== "undefined" && (typeof options.position_update_interval !== "number" || isNaN(options.position_update_interval)))
    throw new TypeError('Manager option "position_update_interval" must be a number between 50 and 1000., set it to 0 to disable it');
    
  if ((options.position_update_interval > 1000 || options.position_update_interval < 50) && options.position_update_interval !== 0)
  throw new TypeError('Manager option "position_update_interval" must be a number between 50 and 1000., set it to 0 to disable it');

  if (typeof options.validUnresolvedUris !== "undefined" && !Array.isArray(options.validUnresolvedUris) && !(options.validUnresolvedUris as string[]).every(v => typeof v === "string"))
    throw new TypeError('Manager option "validUnresolvedUris" must be an array of strings');
  
  if (typeof options.forceLoadPlugin !== "undefined" && typeof options.forceLoadPlugin !== "boolean")
    throw new TypeError('Manager option "forceLoadPlugin" must be a boolean');
  
  if (typeof options.allowedLinks !== "undefined" && !Array.isArray(options.allowedLinks) && !(options.allowedLinks as string[]).every(v => typeof v === "string"))
    throw new TypeError('Manager option "allowedLinks" must be an array of strings');
 
  if (typeof options.allowedLinksRegexes !== "undefined" && !Array.isArray(options.allowedLinksRegexes) && !(options.allowedLinksRegexes as RegExp[]).every(v => v instanceof RegExp))
    throw new TypeError('Manager option "allowedLinksRegexes" must be an array of regexes');
  
  if (typeof options.onlyAllowAllowedLinks !== "undefined" && typeof options.onlyAllowAllowedLinks !== "boolean")
    throw new TypeError('Manager option "onlyAllowAllowedLinks" must be a boolean');
  
  if (typeof options.defaultLeastUsedNodeSortType !== "undefined" && options.defaultLeastUsedNodeSortType !== "memory" && options.defaultLeastUsedNodeSortType !== "calls" && options.defaultLeastUsedNodeSortType !== "players")
    throw new TypeError('Manager option "defaultLeastUsedNodeSortType" must be a string of leastUsedNodeSortType ("memory" | "calls" | "players")');
  
  if (typeof options.defaultLeastLoadNodeSortType !== "undefined" && options.defaultLeastLoadNodeSortType !== "cpu" && options.defaultLeastLoadNodeSortType !== "memory")
    throw new TypeError('Manager option "defaultLeastLoadNodeSortType" must be a string of leastUsedNodeSortType ("cpu" | "memory")');
  
  if (typeof options.useUnresolvedData !== "undefined" && typeof options.useUnresolvedData !== "boolean")
    throw new TypeError('Manager option "useUnresolvedData" must be a boolean');
  
  if (typeof options.forceSearchLinkQueries !== "undefined" && typeof options.forceSearchLinkQueries !== "boolean")
    throw new TypeError('Manager option "forceSearchLinkQueries" must be a boolean');
  
  if (typeof options.userAgent !== "undefined" && typeof options.userAgent !== "string")
    throw new TypeError('Manager option "userAgent" must be a string (public useragent when doing fetch requests)');
  
  if (typeof options.restTimeout !== "undefined" && (typeof options.restTimeout !== "number" || isNaN(options.restTimeout)))
    throw new TypeError('Manager option "restTimeout" must be a number');
    
  if (typeof options.applyVolumeAsFilter !== "undefined" && typeof options.applyVolumeAsFilter !== "boolean")
    throw new TypeError('Manager option "applyVolumeAsFilter" must be a boolean');
}

export interface Manager {
  /**
   * Emitted when a Node is created.
   * @event Manager#nodeCreate
   */
  on(event: "nodeCreate", listener: (node: Node) => void): this;

  /**
   * Emitted when a Node is destroyed.
   * @event Manager#nodeDestroy
   */
  on(event: "nodeDestroy", listener: (node: Node) => void): this;

  /**
   * Emitted when a Node connects.
   * @event Manager#nodeConnect
   */
  on(event: "nodeConnect", listener: (node: Node) => void): this;

  /**
   * Emitted when a Node reconnects.
   * @event Manager#nodeReconnect
   */
  on(event: "nodeReconnect", listener: (node: Node) => void): this;

  /**
   * Emitted when a Node disconnects.
   * @event Manager#nodeDisconnect
   */
  on(
    event: "nodeDisconnect",
    listener: (node: Node, reason: { code?: number; reason?: string }) => void
  ): this;

  /**
   * Emitted when a Node has an error.
   * @event Manager#nodeError
   */
  on(event: "nodeError", listener: (node: Node, error: Error) => void): this;

  /**
   * Emitted whenever any Lavalink event is received.
   * @event Manager#nodeRaw
   */
  on(event: "nodeRaw", listener: (payload: unknown) => void): this;

  /**
   * Emitted when a player is created.
   * @event Manager#playerCreate
   */
  on(event: "playerCreate", listener: (player: Player) => void): this;

  /**
   * Emitted when a player is destroyed.
   * @event Manager#playerDestroy
   */
  on(event: "playerDestroy", listener: (player: Player) => void): this;

  /**
   * Emitted when a player queue ends.
   * @event Manager#queueEnd
   */
  on(
    event: "queueEnd",
    listener: (
      player: Player,
      track: Track | UnresolvedTrack,
      payload: TrackEndEvent
    ) => void
  ): this;

  /**
   * Emitted when a player is moved to a new voice channel.
   * @event Manager#playerMove
   */
  on(
    event: "playerMove",
    listener: (player: Player, initChannel: string, newChannel: string) => void
  ): this;

  /**
   * Emitted when a player is disconnected from it's current voice channel.
   * @event Manager#playerDisconnect
   */
  on(
    event: "playerDisconnect",
    listener: (player: Player, oldChannel: string) => void
  ): this;

  /**
   * Emitted when a track starts.
   * @event Manager#trackStart
   */
  on(
    event: "trackStart",
    listener: (player: Player, track: Track, payload: TrackStartEvent) => void
  ): this;

  /**
   * Emitted when a track ends.
   * @event Manager#trackEnd
   */
  on(
    event: "trackEnd",
    listener: (player: Player, track: Track, payload: TrackEndEvent) => void
  ): this;

  /**
   * Emitted when a track gets stuck during playback.
   * @event Manager#trackStuck
   */
  on(
    event: "trackStuck",
    listener: (player: Player, track: Track, payload: TrackStuckEvent) => void
  ): this;

  /**
   * Emitted when a track has an error during playback.
   * @event Manager#trackError
   */
  on(
    event: "trackError",
    listener: (
      player: Player,
      track: Track | UnresolvedTrack,
      payload: TrackExceptionEvent
    ) => void
  ): this;

  /**
   * Emitted when a voice connection is closed.
   * @event Manager#socketClosed
   */
  on(
    event: "socketClosed",
    listener: (player: Player, payload: WebSocketClosedEvent) => void
  ): this;
}


/**
 * The main hub for interacting with Lavalink and using Erela.JS,
 * @noInheritDoc
 */
export class Manager extends EventEmitter {
  public static readonly DEFAULT_SOURCES: Record<SearchPlatform, LavalinkSearchPlatform> = {
    // youtubemusic
    "youtube music": "ytmsearch",
    "ytmsearch": "ytmsearch",
    "ytm": "ytmsearch",
    // youtube
    "youtube": "ytsearch",
    "yt": "ytsearch",
    "ytsearch": "ytsearch",
    // soundcloud
    "soundcloud": "scsearch",
    "scsearch": "scsearch",
    "sc": "scsearch",
    // apple music
    "amsearch": "amsearch",
    "am": "amsearch",
    // spotify 
    "spsearch": "spsearch",
    "sp": "spsearch",
    "sprec": "sprec",
    "spsuggestion": "sprec",
    // deezer
    "dz": "dzsearch",
    "deezer": "dzsearch",
    "ds": "dzsearch",
    "dzsearch": "dzsearch",
    "dzisrc": "dzisrc",
    // yandexmusic
    "yandexmusic": "ymsearch",
    "yandex": "ymsearch",
    "ymsearch": "ymsearch",
    // speak
    "speak": "speak",
    "tts": "tts",
  }
  public static readonly regex: Record<SourcesRegex, RegExp> = {
    YoutubeRegex: /https?:\/\/?(?:www\.)?(?:(m|www)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/,
    YoutubeMusicRegex: /https?:\/\/?(?:www\.)?(?:(music|m|www)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/,
    
    SoundCloudRegex: /https:\/\/(?:on\.)?soundcloud\.com\//,
    SoundCloudMobileRegex: /https?:\/\/(soundcloud\.app\.goo\.gl)\/(\S+)/,

    DeezerTrackRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?track\/(\d+)/,
    DeezerPageLinkRegex: /(https?:\/\/|)?(?:www\.)?deezer\.page\.link\/(\S+)/,
    DeezerPlaylistRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?playlist\/(\d+)/,
    DeezerAlbumRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?album\/(\d+)/,
    DeezerArtistRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?artist\/(\d+)/,
    DeezerMixesRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?mixes\/genre\/(\d+)/,
    DeezerEpisodeRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?episode\/(\d+)/,
    // DeezerPodcastRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?podcast\/(\d+)/,
    AllDeezerRegexWithoutPageLink: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?(track|playlist|album|artist|mixes\/genre|episode)\/(\d+)/,
    AllDeezerRegex: /((https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?(track|playlist|album|artist|mixes\/genre|episode)\/(\d+)|(https?:\/\/|)?(?:www\.)?deezer\.page\.link\/(\S+))/,
    
    SpotifySongRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?track\/(?<identifier>[a-zA-Z0-9-_]+)/,
    SpotifyPlaylistRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?playlist\/(?<identifier>[a-zA-Z0-9-_]+)/,
    SpotifyArtistRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?artist\/(?<identifier>[a-zA-Z0-9-_]+)/,
    SpotifyEpisodeRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?episode\/(?<identifier>[a-zA-Z0-9-_]+)/,
    SpotifyShowRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?show\/(?<identifier>[a-zA-Z0-9-_]+)/,
    SpotifyAlbumRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?album\/(?<identifier>[a-zA-Z0-9-_]+)/,
    AllSpotifyRegex: /(https?:\/\/)(www\.)?open\.spotify\.com\/((?<region>[a-zA-Z-]+)\/)?(user\/(?<user>[a-zA-Z0-9-_]+)\/)?(?<type>track|album|playlist|artist|episode|show)\/(?<identifier>[a-zA-Z0-9-_]+)/,
    
    mp3Url: /(https?|ftp|file):\/\/(www.)?(.*?)\.(mp3)$/,
    m3uUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(m3u)$/,
    m3u8Url: /(https?|ftp|file):\/\/(www.)?(.*?)\.(m3u8)$/,
    mp4Url: /(https?|ftp|file):\/\/(www.)?(.*?)\.(mp4)$/,
    m4aUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(m4a)$/,
    wavUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(wav)$/,
    aacpUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(aacp)$/,

    tiktok: /https:\/\/www\.tiktok\.com\//,
    mixcloud: /https:\/\/www\.mixcloud\.com\//,
    musicYandex: /https:\/\/music\.yandex\.ru\//, 
    radiohost: /https?:\/\/[^.\s]+\.radiohost\.de\/(\S+)/,
    bandcamp: /https?:\/\/?(?:www\.)?([\d|\w]+)\.bandcamp\.com\/(\S+)/,
    appleMusic: /https?:\/\/?(?:www\.)?music\.apple\.com\/(\S+)/,
    TwitchTv: /https?:\/\/?(?:www\.)?twitch\.tv\/\w+/,
    vimeo: /https?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|)(\d+)(?:|\/\?)/,
}

  /** The map of players. */
  public readonly players = new Collection<string, Player>();
  /** The map of nodes. */
  public readonly nodes = new Collection<string, Node>();
  /** The options that were set. */
  public readonly options: ManagerOptions;
  /** If the Manager got initiated */
  public initiated = false;



  /** Returns the least used Nodes. */
  public get leastUsedNodes(): Collection<string, Node> {
    if(this.options.defaultLeastUsedNodeSortType === "memory") return this.leastUsedNodesMemory;
    else if(this.options.defaultLeastUsedNodeSortType === "calls")  return this.leastUsedNodesCalls;
    else return this.leastUsedNodesPlayers; // this.options.defaultLeastUsedNodeSortType === "players"
  }
  /** Returns the least used Nodes sorted by amount of calls. */
  public get leastUsedNodesCalls(): Collection<string, Node> {
    return this.nodes
      .filter((node) => node.connected)
      .sort((a, b) => b.calls - a.calls); // client sided sorting
  }
  /** Returns the least used Nodes sorted by amount of players. */
  public get leastUsedNodesPlayers(): Collection<string, Node> {
    return this.nodes
      .filter((node) => node.connected)
       .sort((a, b) => (a.stats?.players || 0) - (b.stats?.players || 0))
  }
  /** Returns the least used Nodes sorted by amount of memory usage. */
  public get leastUsedNodesMemory(): Collection<string, Node> {
    return this.nodes
      .filter((node) => node.connected)
      .sort((a, b) => (b.stats?.memory?.used || 0) - (a.stats?.memory?.used || 0)) // sort after memory
  }

  /** Returns the least system load Nodes. */
  public get leastLoadNodes(): Collection<string, Node> {
    if(this.options.defaultLeastLoadNodeSortType === "cpu") return this.leastLoadNodesCpu;
    else return this.leastLoadNodesMemory; // this.options.defaultLeastLoadNodeSortType === "memory"
  }


  
  public get leastLoadNodesMemory(): Collection<string, Node> {
    return this.nodes
            .filter((node) => node.connected)
            .sort((a, b) => {
            const aload = a.stats.memory?.used
                ? a.stats.memory.used
                : 0;
            const bload = b.stats.memory?.used
                ? b.stats.memory.used
                : 0;
            return aload - bload;
        });
  }

  /** Returns the least system load Nodes. */
  public get leastLoadNodesCpu(): Collection<string, Node> {
    return this.nodes
      .filter((node) => node.connected)
      .sort((a, b) => {
        const aload = a.stats.cpu
          ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100
          : 0;
        const bload = b.stats.cpu
          ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100
          : 0;
        return aload - bload;
      });
  }
  /** Get FIRST valid LINK QUERY out of a string query, if it's not a valid link, then it will return undefined */
  private getValidUrlOfQuery(query: string) {
      const args = query?.split?.(" ");
      if(!args?.length || !Array.isArray(args)) return undefined;
      let url;
      for (const arg of args) {
          try {
              url = new URL(arg);
              url = url.protocol === "http:" || url.protocol === "https:" ? url.href : false;
              break;
          } catch (_) {
              url = undefined;
          }
      }
      return url;
  }
  /**
   * Initiates the Manager class.
   * @param options
   */
  constructor(options: ManagerOptions) {
    super();

    check(options);

    Structure.get("Player").init(this);
    Structure.get("Node").init(this);
    TrackUtils.init(this);

    if (options.trackPartial) {
      TrackUtils.setTrackPartial(options.trackPartial);
      delete options.trackPartial;
    }

    this.options = {
      plugins: [],
      nodes: [{
        identifier: "default",
        host: "localhost",
        port: 2333,
        password: "youshallnotpass",
        secure: false,
        retryAmount: 5,
        retryDelay: 30e3,
        requestTimeout: 10e3,
        version: "v3",
        useVersionPath: true, // should be set on true, to use the latest rest api correctly!
      }],
      shards: 1,
      autoPlay: true,
      clientName: "erela.js",
      defaultSearchPlatform: "youtube",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0",
      restTimeout: 5000,
      allowedLinksRegexes: [...Object.values(Manager.regex)],
      onlyAllowAllowedLinks: true,
      defaultLeastLoadNodeSortType: "memory",
      defaultLeastUsedNodeSortType: "players",
      forceSearchLinkQueries: true,
      position_update_interval: 250,
      useUnresolvedData: true,
      volumeDecrementer: 1,
      ...options,
    };

    if (this.options.plugins) {
      for (const [index, plugin] of this.options.plugins.entries()) {
        if (!(plugin instanceof Plugin) && !this.options.forceLoadPlugin)
          throw new RangeError(`Plugin at index ${index} does not extend Plugin.`);
        plugin.load(this);
      }
    }

    if (this.options.nodes) {
      for (const nodeOptions of this.options.nodes)
        new (Structure.get("Node"))(nodeOptions);
    }
  }

  /**
   * Initiates the Manager.
   * @param {string} clientID
   * @param {{ clientId?: string, clientName?: string, shards?: number }} objectClientData 
   */
  public init(clientID?: string, objectClientData: { clientId?: string, clientName?: string, shards?: number } = {}): this {
    const { clientId, clientName, shards } = objectClientData;
    if (this.initiated) return this;
    if (typeof clientId !== "undefined") this.options.clientId = clientId;
    if (typeof clientID !== "undefined") this.options.clientId = clientID;
    if (typeof clientId !== "undefined") this.options.clientId = clientId;
    if (typeof clientName !== "undefined") this.options.clientName = clientName || `Unknown Name - ${clientId||clientID}`;
    if (typeof shards !== "undefined") this.options.shards = shards;
    
    if (typeof this.options.clientId !== "string") throw new Error('"clientId" set is not type of "string"');
    if (!this.options.clientId) throw new Error('"clientId" is not set. Pass it in Manager#init() or as a option in the constructor.');

    let success = 0;
    for (const node of this.nodes.values()) {
        try {
            node.connect();
            success++;
        }
        catch (err) {
            console.error(err);
            this.emit("nodeError", node, err);
        }
    }
    if(success > 0) this.initiated = true;
    else console.error("Could not connect to at least 1 Node");

    return this;
  }

  public searchLocal(
    query: string,
    requester?: unknown,
    customNode?: Node
  ): Promise<SearchResult> {
    return new Promise(async (resolve, reject) => {
      const node = customNode || this.leastUsedNodes.first();
      if (!node) throw new Error("No available nodes.");

      const res = await node.makeRequest<LavalinkResult>(`/loadtracks?identifier=${query}`) as any;
      if(!res) return reject(new Error("Query not found."));
      
      const dataArray = ([v4LoadTypes.LoadFailed, v4LoadTypes.NoMatches, LoadTypes.LoadFailed, LoadTypes.NoMatches].includes(res.loadType) 
        ? [] // error / No matches
        : res.loadType === v4LoadTypes.PlaylistLoaded 
          ? res.data.tracks // playlist
          : res?.[node.options?.version === "v4" ? "data" : "tracks"] && !Array.isArray(res?.[node.options?.version === "v4" ? "data" : "tracks"]) 
            ? [res?.[node.options?.version === "v4" ? "data" : "tracks"]] 
            : res?.[node.options?.version === "v4" ? "data" : "tracks"])?.filter(Boolean);

      const result: SearchResult = {
        loadType: res.loadType,
        pluginInfo: res.pluginInfo || res?.data?.pluginInfo,
        exception: res.exception ?? null,
        tracks: dataArray?.length ? dataArray?.map((track) => TrackUtils.build(track, requester)) : [],
      };

      this.applyPlaylistInfo(result, res, node);

      return resolve(result);
    })
  }

  private applyPlaylistInfo(result:SearchResult, res:any, node:Node) {
    // v4
    if (node.options?.version === "v4" && result.loadType === v4LoadTypes.PlaylistLoaded) {
      const selectedTrack = typeof res.data?.info?.selectedTrack !== "number" || res.data?.info?.selectedTrack === -1 ? null : result.tracks[res.data?.info?.selectedTrack];
      result.playlist = {
          name: res.data.info?.name || res.data.pluginInfo?.name || null,
          author: res.data.info?.author || res.data.pluginInfo?.author || null,
          thumbnail: res.data.info?.artworkUrl || res.data.pluginInfo?.artworkUrl || selectedTrack?.thumbnail || null,
          uri: res.data.info?.url || res.data.info?.uri || res.data.info?.link || res.data.pluginInfo?.url || res.data.pluginInfo?.uri || res.data.pluginInfo?.link || null,
          selectedTrack: selectedTrack,
          duration: result.tracks.reduce((acc, cur) => acc + (cur?.duration || 0), 0),
      }
    } else if (result.loadType === LoadTypes.PlaylistLoaded || result.loadType === v4LoadTypes.PlaylistLoaded) { // v3 / v2
      if (typeof res.playlistInfo === "object") {
          const selectedTrack = typeof res.playlistInfo?.selectedTrack !== "number" || res.playlistInfo?.selectedTrack === -1 ? null : result.tracks[res.playlistInfo?.selectedTrack];
          result.playlist = {
              ...res.playlistInfo,
              // transform other Data(s)
              name: res.playlistInfo.name || null,
              author: res.playlistInfo.author || null,
              thumbnail: selectedTrack?.thumbnail || null,
              uri: res.playlistInfo?.url || res.playlistInfo?.uri || res.playlistInfo?.link || null, 
              selectedTrack: selectedTrack,
              duration: result.tracks.reduce((acc, cur) => acc + (cur.duration || 0), 0),
          };
      }
    }
  }

  /**
   * Searches the enabled sources based off the URL or the `source` property.
   * @param query
   * @param requester
   * @param customNode
   * @returns The search result.
   */
  public search(
    query: string | SearchQuery,
    requester?: unknown, 
    customNode?: Node,
  ): Promise<SearchResult> {
    return new Promise(async (resolve, reject) => {
      const node = customNode || this.leastUsedNodes.first();
      if (!node) throw new Error("No available nodes.");
      const _query: SearchQuery = typeof query === "string" ? { query } : query;
      const _source = Manager.DEFAULT_SOURCES[_query.source ?? this.options.defaultSearchPlatform] ?? _query.source ?? this.options.defaultSearchPlatform;
      
      _query.query = _query?.query?.trim?.();

      const link = this.getValidUrlOfQuery(_query.query);
      if(this.options.allowedLinksRegexes?.length || this.options.allowedLinks?.length) {
          if(link && !this.options.allowedLinksRegexes?.some(regex => regex.test(link)) && !this.options.allowedLinks?.includes(link)) reject(new Error(`Query ${_query.query} Contains link: ${link}, which is not an allowed / valid Link`));
      }
      if(link && this.options.forceSearchLinkQueries) return await this.searchLink(link, requester, customNode).then(data => resolve(data)).catch(err => reject(err));

      // only set the source, if it's not a link 
      const srcSearch = !/^https?:\/\//.test(_query.query) ? `${_source}:` : "";
            
      this.validatedQuery(`${srcSearch}${_query.query}`, node);

      const res = await node
        .makeRequest<LavalinkResult>(`/loadtracks?identifier=${srcSearch}${encodeURIComponent(_query.query)}`)
        .catch(err => reject(err)) as any;

      if (!res) return reject(new Error("Query not found."));
      
      const dataArray = ([v4LoadTypes.LoadFailed, v4LoadTypes.NoMatches, LoadTypes.LoadFailed, LoadTypes.NoMatches].includes(res.loadType) 
        ? [] // error / No matches
        : res.loadType === v4LoadTypes.PlaylistLoaded 
          ? res.data.tracks // playlist
          : res?.[node.options?.version === "v4" ? "data" : "tracks"] && !Array.isArray(res?.[node.options?.version === "v4" ? "data" : "tracks"]) 
            ? [res?.[node.options?.version === "v4" ? "data" : "tracks"]] 
            : res?.[node.options?.version === "v4" ? "data" : "tracks"])?.filter(Boolean);

      const result: SearchResult = {
        loadType: res.loadType,
        exception: res.loadType === v4LoadTypes.LoadFailed ? res.data : res.exception ?? null,
        pluginInfo: res.pluginInfo ?? {},
        tracks: dataArray?.length ? dataArray?.map((track) => TrackUtils.build(track, requester)) : [],
      };

      this.applyPlaylistInfo(result, res, node);

      return resolve(result);
    });
  }
  /**
     * Searches the a link directly without any source
     * @param query
     * @param requester
     * @param customNode
     * @returns The search result.
     */
  public searchLink(
    query: string | SearchQuery,
    requester?: unknown, 
    customNode?: Node,
  ): Promise<SearchResult> {
    return new Promise(async (resolve, reject) => {
      const node = customNode || this.leastUsedNodes.first();
      if (!node) throw new Error("No available nodes.");

      const _query = typeof query === "string" ? { query } : query;
      _query.query = _query?.query?.trim?.();

      const link = this.getValidUrlOfQuery(_query.query);
      if(!link) return this.search(query, requester, customNode);

      if(this.options.allowedLinksRegexes?.length || this.options.allowedLinks?.length) {
          if(link && !this.options.allowedLinksRegexes?.some(regex => regex.test(link)) && !this.options.allowedLinks?.includes(link)) reject(new Error(`Query ${_query.query} Contains link: ${link}, which is not an allowed / valid Link`));
      }
      
      this.validatedQuery(_query.query, node);

      const res = await node
          .makeRequest<LavalinkResult>(`/loadtracks?identifier=${encodeURIComponent(_query.query)}`)
        .catch(err => reject(err)) as any;

      if (!res) return reject(new Error("Query not found."));

      const dataArray = ([v4LoadTypes.LoadFailed, v4LoadTypes.NoMatches, LoadTypes.LoadFailed, LoadTypes.NoMatches].includes(res.loadType) 
        ? [] // error / No matches
        : res.loadType === v4LoadTypes.PlaylistLoaded 
          ? res.data.tracks // playlist
          : res?.[node.options?.version === "v4" ? "data" : "tracks"] && !Array.isArray(res?.[node.options?.version === "v4" ? "data" : "tracks"]) 
            ? [res?.[node.options?.version === "v4" ? "data" : "tracks"]] 
            : res?.[node.options?.version === "v4" ? "data" : "tracks"])?.filter(Boolean);

      const result: SearchResult = {
        loadType: res.loadType,
        exception: res.exception ?? null,
        pluginInfo: res.pluginInfo ?? {},
        tracks: dataArray?.length ? dataArray?.map((track) => TrackUtils.build(track, requester)) : [],
      };

      this.applyPlaylistInfo(result, res, node);

      return resolve(result);
    });
  }

  validatedQuery(queryString:string, node:Node):void {
    if(!node.info) return;
    if(!node.info.sourceManagers?.length) throw new Error("Lavalink Node, has no sourceManagers enabled");
    
    // missing links: beam.pro local getyarn.io clypit pornhub reddit ocreamix soundgasm
    if((Manager.regex.YoutubeMusicRegex.test(queryString) || Manager.regex.YoutubeRegex.test(queryString)) && !node.info.sourceManagers.includes("youtube")) {
      throw new Error("Lavalink Node has not 'youtube' enabled");
    }
    if((Manager.regex.SoundCloudMobileRegex.test(queryString) || Manager.regex.SoundCloudRegex.test(queryString)) && !node.info.sourceManagers.includes("soundcloud")) {
      throw new Error("Lavalink Node has not 'soundcloud' enabled");
    }
    if(Manager.regex.bandcamp.test(queryString) && !node.info.sourceManagers.includes("bandcamp")) {
      throw new Error("Lavalink Node has not 'bandcamp' enabled");
    }
    if(Manager.regex.TwitchTv.test(queryString) && !node.info.sourceManagers.includes("twitch")) {
      throw new Error("Lavalink Node has not 'twitch' enabled");
    }
    if(Manager.regex.vimeo.test(queryString) && !node.info.sourceManagers.includes("vimeo")) {
      throw new Error("Lavalink Node has not 'vimeo' enabled");
    }
    if(Manager.regex.tiktok.test(queryString) && !node.info.sourceManagers.includes("tiktok")) {
      throw new Error("Lavalink Node has not 'tiktok' enabled");
    }
    if(Manager.regex.mixcloud.test(queryString) && !node.info.sourceManagers.includes("mixcloud")) {
      throw new Error("Lavalink Node has not 'mixcloud' enabled");
    }
    if(Manager.regex.AllSpotifyRegex.test(queryString) && !node.info.sourceManagers.includes("spotify")) {
      throw new Error("Lavalink Node has not 'spotify' enabled");
    }
    if(Manager.regex.appleMusic.test(queryString) && !node.info.sourceManagers.includes("applemusic")) {
      throw new Error("Lavalink Node has not 'applemusic' enabled");
    }
    if(Manager.regex.AllDeezerRegex.test(queryString) && !node.info.sourceManagers.includes("deezer")) {
      throw new Error("Lavalink Node has not 'deezer' enabled");
    }
    if(Manager.regex.AllDeezerRegex.test(queryString) && node.info.sourceManagers.includes("deezer") && !node.info.sourceManagers.includes("http")) {
      throw new Error("Lavalink Node has not 'http' enabled, which is required to have 'deezer' to work");
    }
    if(Manager.regex.musicYandex.test(queryString) && !node.info.sourceManagers.includes("yandexmusic")) {
      throw new Error("Lavalink Node has not 'yandexmusic' enabled");
    }
    
    const hasSource = queryString.split(":")[0];
    if(queryString.split(" ").length <= 1 || !queryString.split(" ")[0].includes(":")) return;
    const source = Manager.DEFAULT_SOURCES[hasSource] as LavalinkSearchPlatform;
    if(!source) throw new Error(`Lavalink Node SearchQuerySource: '${hasSource}' is not available`);

    if(source === "amsearch" && !node.info.sourceManagers.includes("applemusic"))  {
      throw new Error("Lavalink Node has not 'applemusic' enabled, which is required to have 'amsearch' work");
    }
    if(source === "dzisrc" && !node.info.sourceManagers.includes("deezer"))  {
      throw new Error("Lavalink Node has not 'deezer' enabled, which is required to have 'dzisrc' work");
    }
    if(source === "dzsearch" && !node.info.sourceManagers.includes("deezer"))  {
      throw new Error("Lavalink Node has not 'deezer' enabled, which is required to have 'dzsearch' work");
    }
    if(source === "dzisrc" && node.info.sourceManagers.includes("deezer") && !node.info.sourceManagers.includes("http"))  {
      throw new Error("Lavalink Node has not 'http' enabled, which is required to have 'dzisrc' to work");
    }
    if(source === "dzsearch" && node.info.sourceManagers.includes("deezer") && !node.info.sourceManagers.includes("http"))  {
      throw new Error("Lavalink Node has not 'http' enabled, which is required to have 'dzsearch' to work");
    }
    if(source === "scsearch" && !node.info.sourceManagers.includes("soundcloud"))  {
      throw new Error("Lavalink Node has not 'soundcloud' enabled, which is required to have 'scsearch' work");
    }
    if(source === "speak" && !node.info.sourceManagers.includes("speak"))  {
      throw new Error("Lavalink Node has not 'speak' enabled, which is required to have 'speak' work");
    }
    if(source === "tts" && !node.info.sourceManagers.includes("tts"))  {
      throw new Error("Lavalink Node has not 'tts' enabled, which is required to have 'tts' work");
    }
    if(source === "ymsearch" && !node.info.sourceManagers.includes("yandexmusic"))  {
      throw new Error("Lavalink Node has not 'yandexmusic' enabled, which is required to have 'ymsearch' work");
    }
    if(source === "ytmsearch" && !node.info.sourceManagers.includes("youtube"))  {
      throw new Error("Lavalink Node has not 'youtube' enabled, which is required to have 'ytmsearch' work");
    }
    if(source === "ytsearch" && !node.info.sourceManagers.includes("youtube"))  {
      throw new Error("Lavalink Node has not 'youtube' enabled, which is required to have 'ytsearch' work");
    }
    return;
  }
  /**
   * Decodes the base64 encoded tracks and returns a TrackData array.
   * @param tracks
   */
  public decodeTracks(tracks: string[]): Promise<TrackData[]> {
    return new Promise(async (resolve, reject) => {
      const node = this.nodes.first();
      if (!node) throw new Error("No available nodes.");

      const res = await node.makeRequest<TrackData[]>(`/decodetracks`, r => {
        r.method = "POST";
        r.body = JSON.stringify(tracks);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        r.headers!["Content-Type"] = "application/json";
      })
        .catch(err => reject(err));

      if (!res) {
        return reject(new Error("No data returned from query."));
      }

      return resolve(res);
    });
  }

  /**
   * Decodes the base64 encoded track and returns a TrackData.
   * @param track
   */
  public async decodeTrack(encodedTrack: string): Promise<TrackData> {
    const res = await this.decodeTracks([ encodedTrack ]);
    return res[0];
  }

  /**
   * Creates a player or returns one if it already exists.
   * @param options
   */
  public create(options: PlayerOptions): Player {
    if (this.players.has(options.guild)) {
      return this.players.get(options.guild);
    }

    return new (Structure.get("Player"))(options);
  }

  /**
   * Returns a player or undefined if it does not exist.
   * @param guild
   */
  public get(guild: string): Player | undefined {
    return this.players.get(guild);
  }

  /**
   * Destroys a player if it exists.
   * @param guild
   */
  public destroy(guild: string): void {
    this.players.delete(guild);
  }

  /**
   * Creates a node or returns one if it already exists.
   * @param options
   */
  public createNode(options: NodeOptions): Node {
    if (this.nodes.has(options.identifier || options.host)) {
      return this.nodes.get(options.identifier || options.host);
    }

    return new (Structure.get("Node"))(options);
  }

  /**
   * Destroys a node if it exists.
   * @param identifier
   */
  public destroyNode(identifier: string): void {
    const node = this.nodes.get(identifier);
    if (!node) return;
    node.destroy()
    this.nodes.delete(identifier)
  }

  /**
   * Sends voice data to the Lavalink server.
   * @param data
   */
  public async updateVoiceState(data: VoicePacket | VoiceServer | VoiceState): Promise<void> {
    if ("t" in data && !["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(data.t)) return;

    const update: VoiceServer | VoiceState = "d" in data ? data.d : data;
    if (!update || !("token" in update) && !("session_id" in update)) return;

    const player = this.players.get(update.guild_id) as Player;
    if (!player) return;
    
    // @ts-ignore
    const sessionIdChange = update.session_id && player.voice && player.voice?.sessionId !== update.session_id;
    // @ts-ignore
    const tokenChange = update.session_id && player.voice && player.voice?.token !== update.token;
    // @ts-ignore
    const endPointChange = update.session_id && player.voice && player.voice?.endpoint !== update.endpoint;

    if ("token" in update) {
      player.voiceState.event = update;
      if (!player.node?.sessionId) {
        if (REQUIRED_KEYS.every(key => key in player.voiceState)) {
          console.warn("@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST");
          await player.node.send(player.voiceState);
          return 
        }
      }
      await player.node.updatePlayer({
        guildId: player.guild,
        playerOptions: {
          voice: {
            token: update.token,
            endpoint: update.endpoint,
            sessionId: player.voice?.sessionId || player.voiceState.sessionId,
          }
        }
      });
      return 
    }

    /* voice state update */
    if (update.user_id !== this.options.clientId) return;      
    
    if (update.channel_id) {
      if (player.voiceChannel !== update.channel_id) {
        this.emit("playerMove", player, player.voiceChannel, update.channel_id);
      }
      if(player.voiceState) player.voiceState.sessionId = update.session_id;
      if(player.voice) player.voice.sessionId = update.session_id;
      player.voiceChannel = update.channel_id;
    } else {
      this.emit("playerDisconnect", player, player.voiceChannel);
      player.voiceChannel = null;
      player.voiceState = Object.assign({});
      player.voice = Object.assign({});
      await player.pause(true);
    }

    if (REQUIRED_KEYS.every(key => key in player.voiceState)) {
      console.log("DEBUG:", "endPointChange", endPointChange, "sessionIdChange", sessionIdChange, "tokenChange", tokenChange, "update", update);
      if (!player.node?.sessionId) { 
        console.warn("@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST");
        await player.node.send(player.voiceState);
        return;
      }
      return 
    }
    return 
  }
}

export interface Payload {
  /** The OP code */
  op: number;
  d: {
    guild_id: string;
    channel_id: string | null;
    self_mute: boolean;
    self_deaf: boolean;
  };
}

export interface ManagerOptions {
  /** The array of nodes to connect to. */
  nodes?: NodeOptions[];
  /** The client ID to use. */
  clientId?: string;
  /** Value to use for the `Client-Name` header. */
  clientName?: string;
  /** The shard count. */
  shards?: number;
  /** A array of plugins to use. */
  plugins?: Plugin[];
  /** Whether players should automatically play the next song. */
  autoPlay?: boolean;
  /** An array of track properties to keep. `track` will always be present. */
  trackPartial?: string[];
  /** @default "youtube" The default search platform to use, can be "youtube", "youtube music", "soundcloud", "deezer", "spotify", ... */
  defaultSearchPlatform?: SearchPlatform;
  /** used to decrement the volume to a % */
  volumeDecrementer?: number; 
  /** used to change the position_update_interval from 250ms to X ms */
  position_update_interval?: number;
  /** Extra Uris which are allowed to be saved as a unresolved from URI (only provide ones which can be handled by LAVALINK) */
  validUnresolvedUris?: string[];
  /** If the plugin should force-load plugins */
  forceLoadPlugin?: boolean;
  /** Array of valid link-Strings; */
  allowedLinks?: string[];
  /** RegExpressions for all Valid Links, default allowed ones are gotten from Manager#regex, aka for: youtube, spotify, soundcloud, deezer, mp3 urls of any kind, ... */
  allowedLinksRegexes?: RegExp[];
  /** If it should only allow setupped Links */
  onlyAllowAllowedLinks?: boolean;
  /** @default "players" the default sort type to retrieve the least used node */
  defaultLeastUsedNodeSortType?: leastUsedNodeSortType;
  /** @default "memory" the default sort type to retrieve the least load node */
  defaultLeastLoadNodeSortType?: leastLoadNodeSortType;
  /** If it should forceSearch a link via Manager#searchLink then set this to true! */
  forceSearchLinkQueries?: boolean;
  /** If it should use the unresolved Data of unresolved Tracks */
  useUnresolvedData?: boolean;
  /** Custom Useragent */
  userAgent?: string;
  /** Rest max request time */
  restTimeout?: number;
  /** Use the new REST Filter#Volume float Value instead of the % Volume (Library re-calculates it, sounds better, but yea)  */
  applyVolumeAsFilter?: boolean;
  /**
   * Function to send data to the websocket.
   * @param id
   * @param payload
   */
  send(id: string, payload: Payload): void;
}

export type leastUsedNodeSortType = "memory" | "calls" | "players";
export type leastLoadNodeSortType = "cpu" | "memory";

export type LavalinkSearchPlatform = "ytsearch" | "ytmsearch" | "scsearch" | "spsearch" | "sprec" | "amsearch" | "dzsearch" | "dzisrc" | "sprec" | "ymsearch" | "speak" | "tts";
export type ErelaSearchPlatform = "youtube" | "youtube music" | "soundcloud" | "ytm" | "yt" | "sc" | "am" | "sp" | "sprec" | "spsuggestion" | "ds" | "dz" | "deezer" | "yandex" | "yandexmusic";
export type SearchPlatform = LavalinkSearchPlatform | ErelaSearchPlatform;

export type SourcesRegex = "YoutubeRegex" | "YoutubeMusicRegex" | "SoundCloudRegex" | "SoundCloudMobileRegex" | "DeezerTrackRegex" | "DeezerArtistRegex" | "DeezerEpisodeRegex" | "DeezerMixesRegex" | "DeezerPageLinkRegex" | "DeezerPlaylistRegex" | "DeezerAlbumRegex" | "AllDeezerRegex" | "AllDeezerRegexWithoutPageLink" | "SpotifySongRegex" | "SpotifyPlaylistRegex" | "SpotifyArtistRegex" | "SpotifyEpisodeRegex" | "SpotifyShowRegex" | "SpotifyAlbumRegex" | "AllSpotifyRegex" | "mp3Url" | "m3uUrl" | "m3u8Url" | "mp4Url" | "m4aUrl" | "wavUrl" | "aacpUrl" | "tiktok" | "mixcloud" | "musicYandex" | "radiohost" | "bandcamp" | "appleMusic" | "TwitchTv" | "vimeo"

export interface SearchQuery {
  /** The source to search from. */
  source?: SearchPlatform | string;
  /** The query to search for. */
  query: string;
}

export interface SearchResult {
  /** The load type of the result. */
  loadType: v4LoadType | LoadType;
  /** The array of tracks from the result. */
  tracks: Track[];
  /** The playlist info if the load type is PLAYLIST_LOADED. */
  playlist?: PlaylistInfo;
  /** The plugin info if the load type is PLAYLIST_LOADED. */
  pluginInfo?: Partial<PluginDataInfo> | Record<string, string|number>;
  /** The exception when searching if one. */
  exception?: {
    /** The message for the exception. */
    message: string;
    /** The severity of exception. */
    severity: string;
  };
}

export interface PlaylistInfo {
  /** The playlist name. */
  name: string;
  /** The Playlist Author */
  author?: string;
  /** The Playlist Thumbnail */
  thumbnail?: string;
  /** A Uri to the playlist */
  uri?: string;
  /** The playlist selected track. */
  selectedTrack: Track | null;
  /** The duration of the entire playlist. (calcualted) */
  duration: number;
}



export interface LavalinkResult {
  // result from v3 / v2
  tracks?: TrackData[];
  // or if result is via v4:
  data?: TrackData[] /* on search query */
  | TrackData  /* on link result */
  | { tracks: TrackData[] }, /* on playlist result */
  loadType: LoadType | v4LoadType;
  exception?: {
    /** The message for the exception. */
    message: string;
    /** The severity of exception. */
    severity: string;

  };
  playlistInfo: {
    name: string;
    selectedTrack?: number;
  } | null;
  pluginInfo: Partial<PluginDataInfo> | Record<string, string|number> | null;
}
