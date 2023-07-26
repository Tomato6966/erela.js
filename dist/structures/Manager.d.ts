/// <reference types="node" />
import { Collection } from "@discordjs/collection";
import { EventEmitter } from "node:events";
import { VoiceState } from "..";
import { Node, NodeOptions } from "./Node";
import { Player, PlayerOptions, Track, UnresolvedTrack } from "./Player";
import { LoadType, Plugin, PluginDataInfo, TrackData, TrackEndEvent, TrackExceptionEvent, TrackStartEvent, TrackStuckEvent, VoicePacket, VoiceServer, WebSocketClosedEvent, v4LoadType } from "./Utils";
export declare const v4LoadTypes: {
    TrackLoaded: string;
    PlaylistLoaded: string;
    SearchResult: string;
    NoMatches: string;
    LoadFailed: string;
};
export declare const LoadTypes: Record<"TrackLoaded" | "PlaylistLoaded" | "SearchResult" | "NoMatches" | "LoadFailed", LoadType>;
export interface ManagerEvents {
    /**
     * Emitted when a Node is created.
     * @event Manager#nodeCreate
     */
    nodeCreate: (node: Node) => void;
    /**
     * Emitted when a Node is destroyed.
     * @event Manager#nodeDestroy
     */
    nodeDestroy: (node: Node) => void;
    /**
     * Emitted when a Node connects.
     * @event Manager#nodeConnect
     */
    nodeConnect: (node: Node) => void;
    /**
     * Emitted when a Node reconnects.
     * @event Manager#nodeReconnect
     */
    nodeReconnect: (node: Node) => void;
    /**
     * Emitted when a Node disconnects.
     * @event Manager#nodeDisconnect
     */
    nodeDisconnect: (node: Node, reason: {
        code?: number;
        reason?: string;
    }) => void;
    /**
     * Emitted when a Node has an error.
     * @event Manager#nodeError
     */
    nodeError: (node: Node, error: Error) => void;
    /**
     * Emitted whenever any Lavalink event is received.
     * @event Manager#nodeRaw
     */
    nodeRaw: (payload: unknown) => void;
    /**
     * Emitted when a player is created.
     * @event Manager#playerCreate
     */
    playerCreate: (player: Player) => void;
    /**
     * Emitted when a player is destroyed.
     * @event Manager#playerDestroy
     */
    playerDestroy: (player: Player) => void;
    /**
     * Emitted when a player queue ends.
     * @event Manager#queueEnd
     */
    queueEnd: (player: Player, track: Track | UnresolvedTrack, payload: TrackEndEvent) => void;
    /**
     * Emitted when a player is moved to a new voice channel.
     * @event Manager#playerMove
     */
    playerMove: (player: Player, initChannel: string, newChannel: string) => void;
    /**
     * Emitted when a player is disconnected from it's current voice channel.
     * @event Manager#playerDisconnect
     */
    playerDisconnect: (player: Player, oldChannel: string) => void;
    /**
     * Emitted when a track starts.
     * @event Manager#trackStart
     */
    trackStart: (player: Player, track: Track, payload: TrackStartEvent) => void;
    /**
     * Emitted when a track ends.
     * @event Manager#trackEnd
     */
    trackEnd: (player: Player, track: Track, payload: TrackEndEvent) => void;
    /**
     * Emitted when a track gets stuck during playback.
     * @event Manager#trackStuck
     */
    trackStuck: (player: Player, track: Track, payload: TrackStuckEvent) => void;
    /**
     * Emitted when a track has an error during playback.
     * @event Manager#trackError
     */
    trackError: (player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent) => void;
    /**
     * Emitted when a voice connection is closed.
     * @event Manager#socketClosed
     */
    socketClosed: (player: Player, payload: WebSocketClosedEvent) => void;
}
export interface Manager {
    on<K extends keyof ManagerEvents>(event: K, listener: ManagerEvents[K]): this;
    once<K extends keyof ManagerEvents>(event: K, listener: ManagerEvents[K]): this;
    emit<K extends keyof ManagerEvents>(event: K, ...args: Parameters<ManagerEvents[K]>): boolean;
    off<K extends keyof ManagerEvents>(event: K, listener: ManagerEvents[K]): this;
}
/**
 * The main hub for interacting with Lavalink and using Erela.JS,
 * @noInheritDoc
 */
export declare class Manager extends EventEmitter {
    static readonly DEFAULT_SOURCES: Record<SearchPlatform, LavalinkSearchPlatform>;
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
    searchLocal(query: string, requester?: unknown, customNode?: Node): Promise<SearchResult>;
    private applyPlaylistInfo;
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
    validatedQuery(queryString: string, node: Node): void;
    /**
     * Decodes the base64 encoded tracks and returns a TrackData array.
     * @param tracks
     */
    decodeTracks(tracks: string[]): Promise<TrackData[]>;
    /**
     * Decodes the base64 encoded track and returns a TrackData.
     * @param track
     */
    decodeTrack(encodedTrack: string): Promise<TrackData>;
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
export type SourcesRegex = "YoutubeRegex" | "YoutubeMusicRegex" | "SoundCloudRegex" | "SoundCloudMobileRegex" | "DeezerTrackRegex" | "DeezerArtistRegex" | "DeezerEpisodeRegex" | "DeezerMixesRegex" | "DeezerPageLinkRegex" | "DeezerPlaylistRegex" | "DeezerAlbumRegex" | "AllDeezerRegex" | "AllDeezerRegexWithoutPageLink" | "SpotifySongRegex" | "SpotifyPlaylistRegex" | "SpotifyArtistRegex" | "SpotifyEpisodeRegex" | "SpotifyShowRegex" | "SpotifyAlbumRegex" | "AllSpotifyRegex" | "mp3Url" | "m3uUrl" | "m3u8Url" | "mp4Url" | "m4aUrl" | "wavUrl" | "aacpUrl" | "tiktok" | "mixcloud" | "musicYandex" | "radiohost" | "bandcamp" | "appleMusic" | "TwitchTv" | "vimeo";
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
    tracks?: TrackData[];
    data?: TrackData[] | TrackData | {
        tracks: TrackData[];
    };
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
    pluginInfo: Partial<PluginDataInfo> | Record<string, string | number> | null;
}
