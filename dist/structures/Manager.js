"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = exports.LoadTypes = void 0;
/* eslint-disable no-async-promise-executor */
const collection_1 = require("@discordjs/collection");
const node_events_1 = require("node:events");
const Utils_1 = require("./Utils");
const REQUIRED_KEYS = ["event", "guildId", "op", "sessionId"];
exports.LoadTypes = {
    TrackLoaded: "TRACK_LOADED",
    PlaylistLoaded: "PLAYLIST_LOADED",
    SearchResult: "SEARCH_RESULT",
    NoMatches: "NO_MATCHES",
    LoadFailed: "LOAD_FAILED"
};
function check(options) {
    if (!options)
        throw new TypeError("ManagerOptions must not be empty.");
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
    if (typeof options.autoPlay !== "undefined" && typeof options.autoPlay !== "boolean")
        throw new TypeError('Manager option "autoPlay" must be a boolean.');
    if (typeof options.trackPartial !== "undefined" && !Array.isArray(options.trackPartial))
        throw new TypeError('Manager option "trackPartial" must be a string array.');
    if (typeof options.clientName !== "undefined" && typeof options.clientName !== "string")
        throw new TypeError('Manager option "clientName" must be a string.');
    if (typeof options.defaultSearchPlatform !== "undefined" && typeof options.defaultSearchPlatform !== "string")
        throw new TypeError('Manager option "defaultSearchPlatform" must be a string.');
    /*
        nodes?: NodeOptions[];
        clientId?: string;
        clientName?: string;
        shards?: number;
        plugins?: Plugin[];
        autoPlay?: boolean;
        trackPartial?: string[];
        defaultSearchPlatform?: SearchPlatform;
        volumeDecrementer?: number;
        position_update_interval?: number;
        validUnresolvedUris?: string[];
        forceLoadPlugin?: boolean;
        allowedLinks?: String[];
        allowedLinksRegexes?: RegExp[];
        onlyAllowAllowedLinks?: boolean;
        defaultLeastUsedNodeSortType?: leastUsedNodeSortType;
        defaultLeastLoadNodeSortType?: leastLoadNodeSortType;
        forceSearchLinkQueries?: boolean;
        useUnresolvedData?: boolean;
        userAgent?: string;
        restTimeout?: number;
        applyVolumeAsFilter?: boolean;
        send(id: string, payload: Payload): void;
    */
}
/**
 * The main hub for interacting with Lavalink and using Erela.JS,
 * @noInheritDoc
 */
class Manager extends node_events_1.EventEmitter {
    static DEFAULT_SOURCES = {
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
        "ymsearch": "ymsearch",
        // speak
        "speak": "speak",
        "tts": "tts",
    };
    static regex = {
        YoutubeRegex: /https?:\/\/?(?:www\.)?(?:(m|www)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/,
        YoutubeMusicRegex: /https?:\/\/?(?:www\.)?(?:(music|m|www)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/,
        SoundCloudRegex: /https?:\/\/(soundcloud\.com)\/(\S+)/,
        SoundCloudMobileRegex: /https?:\/\/(soundcloud\.app\.goo\.gl)\/(\S+)/,
        DeezerTrackRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?track\/(\d+)/,
        DeezerPageLinkRegex: /(https?:\/\/|)?(?:www\.)?deezer\.page\.link\/(\S+)/,
        DeezerPlaylistRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?playlist\/(\d+)/,
        DeezerAlbumRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?album\/(\d+)/,
        DeezerArtistRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?artist\/(\d+)/,
        DeezerMixesRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?mixes\/genre\/(\d+)/,
        DeezerEpisodeRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?episode\/(\d+)/,
        // DeezerPodcastRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?podcast\/(\d+)/,
        AllDeezerRegex: /((https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?(track|playlist|album|artist|mixes\/genre|episode)\/(\d+)|(https?:\/\/|)?(?:www\.)?deezer\.page\.link\/(\S+))/,
        SpotifySongRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)track[\/:]([A-Za-z0-9]+)/,
        SpotifyPlaylistRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)playlist[\/:]([A-Za-z0-9]+)/,
        SpotifyArtistRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)artist[\/:]([A-Za-z0-9]+)/,
        SpotifyEpisodeRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)episode[\/:]([A-Za-z0-9]+)/,
        SpotifyShowRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)show[\/:]([A-Za-z0-9]+)/,
        SpotifyAlbumRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)album[\/:]([A-Za-z0-9]+)/,
        AllSpotifyRegex: /https?:\/\/(www\.)?open\.spotify\.com\/(?:.+)?(track|playlist|artist|episode|show|album)[\/:]([A-Za-z0-9]+)/,
        mp3Url: /(https?|ftp|file):\/\/(www.)?(.*?)\.(mp3)$/,
        m3uUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(m3u)$/,
        m3u8Url: /(https?|ftp|file):\/\/(www.)?(.*?)\.(m3u8)$/,
        mp4Url: /(https?|ftp|file):\/\/(www.)?(.*?)\.(mp4)$/,
        m4aUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(m4a)$/,
        wavUrl: /(https?|ftp|file):\/\/(www.)?(.*?)\.(wav)$/,
        tiktok: /https:\/\/www\.tiktok\.com\//,
        mixcloud: /https:\/\/www\.mixcloud\.com\//,
        musicYandex: /https:\/\/music\.yandex\.ru\//,
        radiohost: /https?:\/\/[^.\s]+\.radiohost\.de\/(\S+)/,
        bandcamp: /https?:\/\/?(?:www\.)?([\d|\w]+)\.bandcamp\.com\/(\S+)/,
        appleMusic: /https?:\/\/?(?:www\.)?music\.apple\.com\/(\S+)/,
        TwitchTv: /https?:\/\/?(?:www\.)?twitch\.tv\/\w+/,
        vimeo: /https?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)/,
    };
    /** The map of players. */
    players = new collection_1.Collection();
    /** The map of nodes. */
    nodes = new collection_1.Collection();
    /** The options that were set. */
    options;
    /** If the Manager got initiated */
    initiated = false;
    /** Returns the least used Nodes. */
    get leastUsedNodes() {
        if (this.options.defaultLeastUsedNodeSortType === "memory")
            return this.leastUsedNodesMemory;
        else if (this.options.defaultLeastUsedNodeSortType === "calls")
            return this.leastUsedNodesCalls;
        else
            return this.leastUsedNodesPlayers; // this.options.defaultLeastUsedNodeSortType === "players"
    }
    /** Returns the least used Nodes sorted by amount of calls. */
    get leastUsedNodesCalls() {
        return this.nodes
            .filter((node) => node.connected)
            .sort((a, b) => b.calls - a.calls); // client sided sorting
    }
    /** Returns the least used Nodes sorted by amount of players. */
    get leastUsedNodesPlayers() {
        return this.nodes
            .filter((node) => node.connected)
            .sort((a, b) => (a.stats?.players || 0) - (b.stats?.players || 0));
    }
    /** Returns the least used Nodes sorted by amount of memory usage. */
    get leastUsedNodesMemory() {
        return this.nodes
            .filter((node) => node.connected)
            .sort((a, b) => (b.stats?.memory?.used || 0) - (a.stats?.memory?.used || 0)); // sort after memory
    }
    /** Returns the least system load Nodes. */
    get leastLoadNodes() {
        if (this.options.defaultLeastLoadNodeSortType === "cpu")
            return this.leastLoadNodesCpu;
        else
            return this.leastLoadNodesMemory; // this.options.defaultLeastLoadNodeSortType === "memory"
    }
    get leastLoadNodesMemory() {
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
    get leastLoadNodesCpu() {
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
    getValidUrlOfQuery(query) {
        const args = query?.split?.(" ");
        if (!args?.length || !Array.isArray(args))
            return undefined;
        let url;
        for (const arg of args) {
            try {
                url = new URL(arg);
                url = url.protocol === "http:" || url.protocol === "https:" ? url.href : false;
                break;
            }
            catch (_) {
                url = undefined;
            }
        }
        return url;
    }
    /**
     * Initiates the Manager class.
     * @param options
     */
    constructor(options) {
        super();
        check(options);
        Utils_1.Structure.get("Player").init(this);
        Utils_1.Structure.get("Node").init(this);
        Utils_1.TrackUtils.init(this);
        if (options.trackPartial) {
            Utils_1.TrackUtils.setTrackPartial(options.trackPartial);
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
            ...options,
            allowedLinksRegexes: [...Object.values(Manager.regex)],
            onlyAllowAllowedLinks: true,
            defaultLeastLoadNodeSortType: "memory",
            defaultLeastUsedNodeSortType: "players",
            forceSearchLinkQueries: true,
            position_update_interval: 250,
            useUnresolvedData: true,
            volumeDecrementer: 1,
        };
        if (this.options.plugins) {
            for (const [index, plugin] of this.options.plugins.entries()) {
                if (!(plugin instanceof Utils_1.Plugin))
                    throw new RangeError(`Plugin at index ${index} does not extend Plugin.`);
                plugin.load(this);
            }
        }
        if (this.options.nodes) {
            for (const nodeOptions of this.options.nodes)
                new (Utils_1.Structure.get("Node"))(nodeOptions);
        }
    }
    /**
     * Initiates the Manager.
     * @param {string} clientID
     * @param {{ clientId?: string, clientName?: string, shards?: number }} objectClientData
     */
    init(clientID, objectClientData = {}) {
        const { clientId, clientName, shards } = objectClientData;
        if (this.initiated)
            return this;
        if (typeof clientId !== "undefined")
            this.options.clientId = clientId;
        if (typeof clientID !== "undefined")
            this.options.clientId = clientID;
        if (typeof clientId !== "undefined")
            this.options.clientId = clientId;
        if (typeof clientName !== "undefined")
            this.options.clientName = clientName || `Unknown Name - ${clientId || clientID}`;
        if (typeof shards !== "undefined")
            this.options.shards = shards;
        if (typeof this.options.clientId !== "string")
            throw new Error('"clientId" set is not type of "string"');
        if (!this.options.clientId)
            throw new Error('"clientId" is not set. Pass it in Manager#init() or as a option in the constructor.');
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
        if (success > 0)
            this.initiated = true;
        else
            console.error("Could not connect to at least 1 Node");
        return this;
    }
    /**
     * Searches the enabled sources based off the URL or the `source` property.
     * @param query
     * @param requester
     * @param customNode
     * @returns The search result.
     */
    search(query, requester, customNode) {
        return new Promise(async (resolve, reject) => {
            const node = customNode || this.leastUsedNodes.first();
            if (!node)
                throw new Error("No available nodes.");
            const _query = typeof query === "string" ? { query } : query;
            const _source = Manager.DEFAULT_SOURCES[_query.source ?? this.options.defaultSearchPlatform] ?? _query.source;
            _query.query = _query?.query?.trim?.();
            const link = this.getValidUrlOfQuery(_query.query);
            if (this.options.allowedLinksRegexes?.length || this.options.allowedLinks?.length) {
                if (link && !this.options.allowedLinksRegexes?.some(regex => regex.test(link)) && !this.options.allowedLinks?.includes(link))
                    reject(new Error(`Query ${_query.query} Contains link: ${link}, which is not an allowed / valid Link`));
            }
            if (link && this.options.forceSearchLinkQueries)
                return await this.searchLink(link, requester, customNode).then(data => resolve(data)).catch(err => reject(err));
            // only set the source, if it's not a link 
            const search = `${!/^https?:\/\//.test(_query.query) ? `${_source}:` : ""}${_query.query}`;
            const res = await node
                .makeRequest(`/loadtracks?identifier=${encodeURIComponent(search)}`)
                .catch(err => reject(err));
            if (!res)
                return reject(new Error("Query not found."));
            const result = {
                loadType: res.loadType,
                exception: res.exception ?? null,
                tracks: res.tracks?.map((track) => Utils_1.TrackUtils.build(track, requester)) ?? [],
            };
            if (result.loadType === "PLAYLIST_LOADED") {
                if (typeof res.playlistInfo === "object") {
                    result.playlist = {
                        ...result.playlist,
                        // transform other Data(s)
                        name: res.playlistInfo.name,
                        selectedTrack: res.playlistInfo.selectedTrack === -1 ? null :
                            Utils_1.TrackUtils.build(res.tracks[res.playlistInfo.selectedTrack], requester),
                        duration: result.tracks
                            .reduce((acc, cur) => acc + (cur.duration || 0), 0),
                    };
                }
                if (typeof res.pluginInfo === "object") {
                    result.pluginInfo = { ...result.pluginInfo };
                }
                // if(result.playlist || result.pluginInfo) {
                //   result.tracks.forEach(track => {
                //     if(result.playlist) track.playlist = result.playlist;
                //     if(result.pluginInfo) track.pluginInfo = result.pluginInfo;
                //   });
                // }
            }
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
    searchLink(query, requester, customNode) {
        return new Promise(async (resolve, reject) => {
            const node = customNode || this.leastUsedNodes.first();
            if (!node)
                throw new Error("No available nodes.");
            const _query = typeof query === "string" ? { query } : query;
            _query.query = _query?.query?.trim?.();
            const link = this.getValidUrlOfQuery(_query.query);
            if (!link)
                return this.search(query, requester, customNode);
            if (this.options.allowedLinksRegexes?.length || this.options.allowedLinks?.length) {
                if (link && !this.options.allowedLinksRegexes?.some(regex => regex.test(link)) && !this.options.allowedLinks?.includes(link))
                    reject(new Error(`Query ${_query.query} Contains link: ${link}, which is not an allowed / valid Link`));
            }
            const res = await node
                .makeRequest(`/loadtracks?identifier=${encodeURIComponent(_query.query)}`)
                .catch(err => reject(err));
            if (!res)
                return reject(new Error("Query not found."));
            const result = {
                loadType: res.loadType,
                exception: res.exception ?? null,
                tracks: res.tracks?.map((track) => Utils_1.TrackUtils.build(track, requester)) ?? [],
            };
            if (result.loadType === exports.LoadTypes.PlaylistLoaded) {
                if (typeof res.playlistInfo === "object") {
                    result.playlist = {
                        ...result.playlist,
                        // transform other Data(s)
                        name: res.playlistInfo.name,
                        selectedTrack: res.playlistInfo.selectedTrack === -1 ? null :
                            Utils_1.TrackUtils.build(res.tracks[res.playlistInfo.selectedTrack], requester),
                        duration: result.tracks
                            .reduce((acc, cur) => acc + (cur.duration || 0), 0),
                    };
                }
                if (typeof res.pluginInfo === "object") {
                    result.pluginInfo = { ...result.pluginInfo };
                }
                // if(result.playlist || result.pluginInfo) {
                //   result.tracks.forEach(track => {
                //     if(result.playlist) track.playlist = result.playlist;
                //     if(result.pluginInfo) track.pluginInfo = result.pluginInfo;
                //   });
                // }
            }
            return resolve(result);
        });
    }
    /**
     * Decodes the base64 encoded tracks and returns a TrackData array.
     * @param tracks
     */
    decodeTracks(tracks) {
        return new Promise(async (resolve, reject) => {
            const node = this.nodes.first();
            if (!node)
                throw new Error("No available nodes.");
            const res = await node.makeRequest(`/decodetracks`, r => {
                r.method = "POST";
                r.body = JSON.stringify(tracks);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                r.headers["Content-Type"] = "application/json";
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
    async decodeTrack(encodedTrack) {
        const res = await this.decodeTracks([encodedTrack]);
        return res[0];
    }
    /**
     * Creates a player or returns one if it already exists.
     * @param options
     */
    create(options) {
        if (this.players.has(options.guild)) {
            return this.players.get(options.guild);
        }
        return new (Utils_1.Structure.get("Player"))(options);
    }
    /**
     * Returns a player or undefined if it does not exist.
     * @param guild
     */
    get(guild) {
        return this.players.get(guild);
    }
    /**
     * Destroys a player if it exists.
     * @param guild
     */
    destroy(guild) {
        this.players.delete(guild);
    }
    /**
     * Creates a node or returns one if it already exists.
     * @param options
     */
    createNode(options) {
        if (this.nodes.has(options.identifier || options.host)) {
            return this.nodes.get(options.identifier || options.host);
        }
        return new (Utils_1.Structure.get("Node"))(options);
    }
    /**
     * Destroys a node if it exists.
     * @param identifier
     */
    destroyNode(identifier) {
        const node = this.nodes.get(identifier);
        if (!node)
            return;
        node.destroy();
        this.nodes.delete(identifier);
    }
    /**
     * Sends voice data to the Lavalink server.
     * @param data
     */
    async updateVoiceState(data) {
        if ("t" in data && !["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(data.t))
            return;
        const update = "d" in data ? data.d : data;
        if (!update || !("token" in update) && !("session_id" in update))
            return;
        const player = this.players.get(update.guild_id);
        if (!player)
            return;
        if ("token" in update) {
            player.voiceState.event = update;
            if (!player.node.sessionId) {
                if (REQUIRED_KEYS.every(key => key in player.voiceState))
                    await player.node.send(player.voiceState);
                return;
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
            return;
        }
        /* voice state update */
        if (update.user_id !== this.options.clientId)
            return;
        if (update.channel_id) {
            if (player.voiceChannel !== update.channel_id) {
                this.emit("playerMove", player, player.voiceChannel, update.channel_id);
            }
            player.voiceState.sessionId = update.session_id;
            player.voice.sessionId = update.session_id;
            player.voiceChannel = update.channel_id;
        }
        else {
            this.emit("playerDisconnect", player, player.voiceChannel);
            player.voiceChannel = null;
            player.voiceState = Object.assign({});
            player.voice = Object.assign({});
            await player.pause(true);
        }
        if (REQUIRED_KEYS.every(key => key in player.voiceState))
            await player.node.send(player.voiceState);
        return;
    }
}
exports.Manager = Manager;
