/// <reference types="node" />
import { Collection } from "@discordjs/collection";
import { EventEmitter } from "node:events";
import { VoiceState } from "..";
import { Node, NodeOptions } from "./Node";
import { Player, PlayerOptions, Track, UnresolvedTrack } from "./Player";
import { PluginDataInfo } from "./Utils";
import { LoadType, Plugin, TrackData, TrackEndEvent, TrackExceptionEvent, TrackStartEvent, TrackStuckEvent, VoicePacket, VoiceServer, WebSocketClosedEvent } from "./Utils";
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
    on(event: "nodeDisconnect", listener: (node: Node, reason: {
        code?: number;
        reason?: string;
    }) => void): this;
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
    on(event: "queueEnd", listener: (player: Player, track: Track | UnresolvedTrack, payload: TrackEndEvent) => void): this;
    /**
     * Emitted when a player is moved to a new voice channel.
     * @event Manager#playerMove
     */
    on(event: "playerMove", listener: (player: Player, initChannel: string, newChannel: string) => void): this;
    /**
     * Emitted when a player is disconnected from it's current voice channel.
     * @event Manager#playerDisconnect
     */
    on(event: "playerDisconnect", listener: (player: Player, oldChannel: string) => void): this;
    /**
     * Emitted when a track starts.
     * @event Manager#trackStart
     */
    on(event: "trackStart", listener: (player: Player, track: Track, payload: TrackStartEvent) => void): this;
    /**
     * Emitted when a track ends.
     * @event Manager#trackEnd
     */
    on(event: "trackEnd", listener: (player: Player, track: Track, payload: TrackEndEvent) => void): this;
    /**
     * Emitted when a track gets stuck during playback.
     * @event Manager#trackStuck
     */
    on(event: "trackStuck", listener: (player: Player, track: Track, payload: TrackStuckEvent) => void): this;
    /**
     * Emitted when a track has an error during playback.
     * @event Manager#trackError
     */
    on(event: "trackError", listener: (player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent) => void): this;
    /**
     * Emitted when a voice connection is closed.
     * @event Manager#socketClosed
     */
    on(event: "socketClosed", listener: (player: Player, payload: WebSocketClosedEvent) => void): this;
}
/**
 * The main hub for interacting with Lavalink and using Erela.JS,
 * @noInheritDoc
 */
export declare class Manager extends EventEmitter {
    static readonly DEFAULT_SOURCES: Record<SearchPlatform, string>;
    static readonly regex: Record<SourcesRegex, RegExp>;
    /** The map of players. */
    readonly players: Collection<string, Player>;
    /** The map of nodes. */
    readonly nodes: Collection<string, Node>;
    /** The options that were set. */
    readonly options: ManagerOptions;
    /** If the Manager got initiated */
    initiated: boolean;
    /** Returns the least used Nodes. */
    get leastUsedNodes(): Collection<string, Node>;
    /** Returns the least used Nodes sorted by amount of calls. */
    get leastUsedNodesCalls(): Collection<string, Node>;
    /** Returns the least used Nodes sorted by amount of players. */
    get leastUsedNodesPlayers(): Collection<string, Node>;
    /** Returns the least used Nodes sorted by amount of memory usage. */
    get leastUsedNodesMemory(): Collection<string, Node>;
    /** Returns the least system load Nodes. */
    get leastLoadNodes(): Collection<string, Node>;
    get leastLoadNodesMemory(): Collection<string, Node>;
    /** Returns the least system load Nodes. */
    get leastLoadNodesCpu(): Collection<string, Node>;
    /** Get FIRST valid LINK QUERY out of a string query, if it's not a valid link, then it will return undefined */
    private getValidUrlOfQuery;
    /**
     * Initiates the Manager class.
     * @param options
     */
    constructor(options: ManagerOptions);
    /**
     * Initiates the Manager.
     * @param {string} clientID
     * @param {{ clientId?: string, clientName?: string, shards?: number }} objectClientData
     */
    init(clientID?: string, objectClientData?: {
        clientId?: string;
        clientName?: string;
        shards?: number;
    }): this;
    /**
     * Searches the enabled sources based off the URL or the `source` property.
     * @param query
     * @param requester
     * @param customNode
     * @returns The search result.
     */
    search(query: string | SearchQuery, requester?: unknown, customNode?: Node): Promise<SearchResult>;
    /**
       * Searches the a link directly without any source
       * @param query
       * @param requester
       * @param customNode
       * @returns The search result.
       */
    searchLink(query: string | SearchQuery, requester?: unknown, customNode?: Node): Promise<SearchResult>;
    /**
     * Decodes the base64 encoded tracks and returns a TrackData array.
     * @param tracks
     */
    decodeTracks(tracks: string[]): Promise<TrackData[]>;
    /**
     * Decodes the base64 encoded track and returns a TrackData.
     * @param track
     */
    decodeTrack(track: string): Promise<TrackData>;
    /**
     * Creates a player or returns one if it already exists.
     * @param options
     */
    create(options: PlayerOptions): Player;
    /**
     * Returns a player or undefined if it does not exist.
     * @param guild
     */
    get(guild: string): Player | undefined;
    /**
     * Destroys a player if it exists.
     * @param guild
     */
    destroy(guild: string): void;
    /**
     * Creates a node or returns one if it already exists.
     * @param options
     */
    createNode(options: NodeOptions): Node;
    /**
     * Destroys a node if it exists.
     * @param identifier
     */
    destroyNode(identifier: string): void;
    /**
     * Sends voice data to the Lavalink server.
     * @param data
     */
    updateVoiceState(data: VoicePacket | VoiceServer | VoiceState): Promise<void>;
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
    allowedLinks?: String[];
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
export type SearchPlatform = "youtube" | "youtube music" | "soundcloud" | "ytsearch" | "ytmsearch" | "ytm" | "yt" | "sc" | "am" | "amsearch" | "sp" | "sprec" | "spsuggestion" | "spsearch" | "scsearch" | "ytmsearch" | "dzisrc" | "dzsearch" | "ds" | "dz" | "deezer" | "ymsearch" | "speak" | "tts";
export type SourcesRegex = "YoutubeRegex" | "YoutubeMusicRegex" | "SoundCloudRegex" | "SoundCloudMobileRegex" | "DeezerTrackRegex" | "DeezerArtistRegex" | "DeezerEpisodeRegex" | "DeezerMixesRegex" | "DeezerPageLinkRegex" | "DeezerPlaylistRegex" | "DeezerAlbumRegex" | "AllDeezerRegex" | "SpotifySongRegex" | "SpotifyPlaylistRegex" | "SpotifyArtistRegex" | "SpotifyEpisodeRegex" | "SpotifyShowRegex" | "SpotifyAlbumRegex" | "AllSpotifyRegex" | "mp3Url" | "m3uUrl" | "m3u8Url" | "mp4Url" | "m4aUrl" | "wavUrl" | "tiktok" | "mixcloud" | "musicYandex" | "radiohost" | "bandcamp" | "appleMusic" | "TwitchTv" | "vimeo";
export interface SearchQuery {
    /** The source to search from. */
    source?: SearchPlatform | string;
    /** The query to search for. */
    query: string;
}
export interface SearchResult {
    /** The load type of the result. */
    loadType: LoadType;
    /** The array of tracks from the result. */
    tracks: Track[];
    /** The playlist info if the load type is PLAYLIST_LOADED. */
    playlist?: PlaylistInfo;
    /** The plugin info if the load type is PLAYLIST_LOADED. */
    pluginInfo?: Partial<PluginDataInfo> | Record<string, string | number>;
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
    /** The playlist selected track. */
    selectedTrack?: Track;
    /** The duration of the playlist. */
    duration: number;
}
export interface LavalinkResult {
    tracks: TrackData[];
    loadType: LoadType;
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
    pluginInfo: Partial<PluginDataInfo> | Record<string, string | number> | null;
}
