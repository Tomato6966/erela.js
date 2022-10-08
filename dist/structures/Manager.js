"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
/* eslint-disable no-async-promise-executor */
const { Collection } = require("@discordjs/collection");
const Events = require("events");
const Utils = require("./Utils");
const REQUIRED_KEYS = ["event", "guildId", "op", "sessionId"];
function check(options) {
    if (!options)
        throw new TypeError("ManagerOptions must not be empty.");
    if (typeof options.send !== "function")
        throw new TypeError('Manager option "send" must be present and a function.');
    if (typeof options.clientId !== "undefined" &&
        !/^\d+$/.test(options.clientId))
        throw new TypeError('Manager option "clientId" must be a non-empty string.');
    if (typeof options.nodes !== "undefined" &&
        !Array.isArray(options.nodes))
        throw new TypeError('Manager option "nodes" must be a array.');
    if (typeof options.shards !== "undefined" &&
        typeof options.shards !== "number")
        throw new TypeError('Manager option "shards" must be a number.');
    if (typeof options.plugins !== "undefined" &&
        !Array.isArray(options.plugins))
        throw new TypeError('Manager option "plugins" must be a Plugin array.');
    if (typeof options.autoPlay !== "undefined" &&
        typeof options.autoPlay !== "boolean")
        throw new TypeError('Manager option "autoPlay" must be a boolean.');
    if (typeof options.trackPartial !== "undefined" &&
        !Array.isArray(options.trackPartial))
        throw new TypeError('Manager option "trackPartial" must be a string array.');
    if (typeof options.clientName !== "undefined" &&
        typeof options.clientName !== "string")
        throw new TypeError('Manager option "clientName" must be a string.');
    if (typeof options.defaultSearchPlatform !== "undefined" &&
        typeof options.defaultSearchPlatform !== "string")
        throw new TypeError('Manager option "defaultSearchPlatform" must be a string.');
    if(typeof options.allowedLinksRegexes !== "undefined" && !options.allowedLinksRegexes.every(re => re instanceof RegExp)) throw new TypeError("Every allowedLinkRegex, must be an instance of new RegExp('expression') or /regex/")
    if(typeof options.allowedLinks !== "undefined" && !options.allowedLinks.every(re => typeof re === "string")) throw new TypeError("Every allowedLins, must be a string")
}
/**
 * The main hub for interacting with Lavalink and using Erela.JS,
 * @noInheritDoc
 */
class Manager extends Events.EventEmitter {
    /**
     * Initiates the Manager class.
     * @param options
     */
    constructor(options) {
        super();
        /** The map of players. */
        this.players = new Collection();
        /** The map of nodes. */
        this.nodes = new Collection();
        this.initiated = false;
        check(options);
        Utils.Structure.get("Player").init(this);
        Utils.Structure.get("Node").init(this);
        Utils.TrackUtils.init(this);
        if (options.trackPartial) {
            Utils.TrackUtils.setTrackPartial(options.trackPartial);
            delete options.trackPartial;
        }
        if(options.volumeDecrementer) {
            this.volumeDecrementer = options.volumeDecrementer;
            delete options.volumeDecrementer;
        }
        this.forceLoadPlugin = options?.forceLoadPlugin ?? false;
        
        this.position_update_interval = 250;
        
        if(options.position_update_interval) {
            if(typeof options.position_update_interval == "number") this.position_update_interval = options.position_update_interval;
            delete options.position_update_interval;
        }

        this.options = Object.assign({ plugins: [], nodes: [{ identifier: "default", host: "localhost" }], shards: 1, autoPlay: true, clientName: "erela.js", defaultSearchPlatform: "youtube" }, options);
        if (this.options.plugins) {
            for (const [index, plugin] of this.options.plugins.entries()) {
                if (!this.forceLoadPlugin && !(plugin instanceof Utils.Plugin)) throw new RangeError(`Plugin at index ${index} does not extend Plugin.`);
                plugin.load(this);
            }
        }
        if (this.options.nodes) {
            for (const nodeOptions of this.options.nodes)
                new (Utils.Structure.get("Node"))(nodeOptions);
        }
        /**
         * @type {RegExp[]} Array of RegexPression Links
         */
        this.allowedLinksRegexes = [];
        /**
         * @type {string[]} Array of all Allowed Links
         */
        this.allowedLinks = [];

        if(options.allowedLinks) this.allowedLinks = options.allowedLinks;
        if(options.allowedLinksRegexes) {
            this.allowedLinksRegexes = options.allowedLinksRegexes;
        } else {
            this.allowedLinksRegexes = [
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
            ]
        }
    }
    /** Returns the least used Nodes. */
    get leastUsedNodes() {
        return this.nodes
            .filter((node) => node.connected)
            .sort((a, b) => b.calls - a.calls);
    }
    /** Get FIRST valid LINK QUERY out of a string query, if it's not a valid link, then it will return undefined */
    getValidUrlOfQuery(query) {
        const args = query?.split?.(" ");
        if(!args?.length || !Array.isArray(args)) return undefined
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
    /** Returns the least system load Nodes. */
    get leastLoadNodes() {
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
    /**
     * Initiates the Manager.
     * @param clientId
     */
    init(clientIdString, { clientId, clientName, shards } = {}) {
        if (this.initiated) return this;
        if (typeof clientIdString !== "undefined") this.options.clientId = clientIdString;
        if (typeof clientId !== "undefined") this.options.clientId = clientId;
        if (typeof clientName !== "undefined") this.options.clientName = clientName || `Unknown Name - ${clientId||clientIdString}`;
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
        return this;
    }
    /**
     * Searches the enabled sources based off the URL or the `source` property.
     * @param query
     * @param requester
     * @returns The search result.
     */
    search(query, requester, customNode) {
        const _query = typeof query === "string" ? { query } : query;
        _query.query = _query?.query?.trim?.();

        const link = this.getValidUrlOfQuery(_query.query);
        if(this.allowedLinksRegexes.length || this.allowedLinks.length) {
            if(link && !this.allowedLinksRegexes.some(regex => regex.test(link)) && !this.allowedLinks.includes(link)) throw new Error(`Query ${_query.query} Contains link: ${link}, which is not an allowed / valid Link`);
        }
        if(link && this.options.forceSearchLinkQueries) return this.searchLink(link, requester, customNode);

        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const node = customNode || this.leastUsedNodes.first();
            if(!this.initiated) throw new Error("Manager not initiated yet");
            if (!node) throw new Error("No available nodes.");
            const _source = (_b = Manager.DEFAULT_SOURCES[(_a = _query.source) !== null && _a !== void 0 ? _a : this.options.defaultSearchPlatform]) !== null && _b !== void 0 ? _b : _query.source;
            let search = _query.query;
            if (!/^https?:\/\//.test(search)) {
                search = `${_source}:${search}`;
            }
            const res = yield node
                .makeRequest(`/loadtracks?identifier=${encodeURIComponent(search)}`)
                .catch(err => reject(err));
            if (!res) {
                return reject(new Error("Query not found."));
            }
            const result = {
                loadType: res.loadType,
                exception: (_c = res.exception) !== null && _c !== void 0 ? _c : null,
                tracks: res.tracks.map((track) => Utils.TrackUtils.build(track, requester)),
            };
            if (result.loadType === "PLAYLIST_LOADED") {
                result.playlist = {
                    name: res.playlistInfo.name,
                    selectedTrack: res.playlistInfo.selectedTrack === -1 ? null :
                        Utils.TrackUtils.build(res.tracks[res.playlistInfo.selectedTrack], requester),
                    duration: result.tracks
                        .reduce((acc, cur) => acc + (cur.duration || 0), 0),
                };
            }
            return resolve(result);
        }));
    }
    
    /**
     * Searches the a link directly without any source
     * @param query
     * @param requester
     * @returns The search result.
     */
     searchLink(query, requester, customNode) {
        const _query = typeof query === "string" ? { query } : query;
        _query.query = _query?.query?.trim?.();
        const link = this.getValidUrlOfQuery(_query.query);
        if(!link) return this.search(query, requester, customNode);

        if(this.allowedLinksRegexes.length || this.allowedLinks.length) {
            if(link && !this.allowedLinksRegexes.some(regex => regex.test(link)) && !this.allowedLinks.includes(link)) throw new Error(`Query ${_query.query} Contains link: ${link}, which is not an allowed / valid Link`);
        }
        
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const node = customNode || this.leastUsedNodes.first();
            if(!this.initiated) throw new Error("Manager not initiated yet");
            if (!node) throw new Error("No available nodes.");
            const res = yield node
                .makeRequest(`/loadtracks?identifier=${encodeURIComponent(link)}`)
                .catch(err => reject(err));
            if (!res) {
                return reject(new Error("Query not found."));
            }
            const result = {
                loadType: res.loadType,
                exception: (_c = res.exception) !== null && _c !== void 0 ? _c : null,
                tracks: res.tracks.map((track) => Utils.TrackUtils.build(track, requester)),
            };
            if (result.loadType === "PLAYLIST_LOADED") {
                result.playlist = {
                    name: res.playlistInfo.name,
                    selectedTrack: res.playlistInfo.selectedTrack === -1 ? null :
                        Utils.TrackUtils.build(res.tracks[res.playlistInfo.selectedTrack], requester),
                    duration: result.tracks
                        .reduce((acc, cur) => acc + (cur.duration || 0), 0),
                };
            }
            return resolve(result);
        }));
    }
    /**
     * Decodes the base64 encoded tracks and returns a TrackData array.
     * @param tracks
     */
    decodeTracks(tracks) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if(!this.initiated) throw new Error("Manager not initiated yet");
            const node = this.nodes.first();
            if (!node)
                throw new Error("No available nodes.");
            const res = yield node.makeRequest(`/decodetracks`, r => {
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
        }));
    }
    /**
     * Decodes the base64 encoded track and returns a TrackData.
     * @param track
     */
    decodeTrack(track) {
        if(!this.initiated) throw new Error("Manager not initiated yet");
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.decodeTracks([track]);
            return res[0];
        });
    }
    /**
     * Creates a player or returns one if it already exists.
     * @param options
     */
    create(options) {
        if (this.players.has(options.guild)) return this.players.get(options.guild);
        return new (Utils.Structure.get("Player"))(options);
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
        if (this.nodes.has(options.identifier || options.host)) return this.nodes.get(options.identifier || options.host);
        return new (Utils.Structure.get("Node"))(options);
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
    updateVoiceState(data) {
        if ("t" in data && !["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(data.t))
            return;
        const update = "d" in data ? data.d : data;
        if (!update || !("token" in update) && !("session_id" in update))
            return;
        const player = this.players.get(update.guild_id);
        if (!player)
            return;
        if ("token" in update) {
            /* voice server update */
            player.voiceState.event = update;
        }
        else {
            /* voice state update */
            if (update.user_id !== this.options.clientId) {
                return;
            }
            if (update.channel_id) {
                if (player.voiceChannel !== update.channel_id) {
                    /* we moved voice channels. */
                    this.emit("playerMove", player, player.voiceChannel, update.channel_id);
                }
                player.voiceState.sessionId = update.session_id;
                player.voiceChannel = update.channel_id;
            }
            else {
                /* player got disconnected. */
                this.emit("playerDisconnect", player, player.voiceChannel);
                player.voiceChannel = null;
                player.voiceState = Object.assign({});
                player.pause(true);
            }
        }
        if (REQUIRED_KEYS.every(key => key in player.voiceState)) {
            player.node.send(player.voiceState);
        }
    }
}
exports.Manager = Manager;
Manager.DEFAULT_SOURCES = {
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
};
Manager.regex = {
    YoutubeRegex: /https?:\/\/?(?:www\.)?(?:(m|www)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/,
    YoutubeMusicRegex: /https?:\/\/?(?:www\.)?(?:(music|m|www)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts|playlist\?|watch\?v=|watch\?.+(?:&|&#38;);v=))([a-zA-Z0-9\-_]{11})?(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)?list=([a-zA-Z\-_0-9]{34}))?(?:\S+)?/,
    
    SoundCloudRegex: /https?:\/\/(soundcloud\.com)\/(\S+)/,
    SoundCloudMobileRegex: /https?:\/\/(soundcloud\.app\.goo\.gl)\/(\S+)/,

    DeezerTrackRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?track\/(\d+)/,
    DeezerPageLinkRegex: /(https?:\/\/|)?(?:www\.)?deezer\.page\.link\/(\S+)/,
    DeezerPlaylistRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?playlist\/(\d+)/,
    DeezerAlbumRegex: /(https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?album\/(\d+)/,
    AllDeezerRegex: /((https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?(track|playlist|album)\/(\d+)|(https?:\/\/|)?(?:www\.)?deezer\.page\.link\/(\S+))/,
    
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
    
    radiohost: /https?:\/\/[^.\s]+\.radiohost\.de\/(\S+)/,
    bandcamp: /https?:\/\/?(?:www\.)?([\d|\w]+)\.bandcamp\.com\/(\S+)/,
    appleMusic: /https?:\/\/?(?:www\.)?music\.apple\.com\/(\S+)/,
    TwitchTv: /https?:\/\/?(?:www\.)?twitch\.tv\/\w+/,
    vimeo: /https?:\/\/(www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)/,
}
