import { Manager } from "./Manager";
import { Node, NodeStats } from "./Node";
import { Player, Track, UnresolvedTrack } from "./Player";
import { Queue } from "./Queue";
export declare abstract class TrackUtils {
    static trackPartial: string[] | null;
    private static manager;
    /** @hidden */
    static init(manager: Manager): void;
    static setTrackPartial(partial: string[]): void;
    /**
     * Checks if the provided argument is a valid Track or UnresolvedTrack, if provided an array then every element will be checked.
     * @param trackOrTracks
     */
    static validate(trackOrTracks: unknown): boolean;
    /**
     * Checks if the provided argument is a valid UnresolvedTrack.
     * @param track
     */
    static isUnresolvedTrack(track: unknown): boolean;
    /**
     * Checks if the provided argument is a valid Track.
     * @param track
     */
    static isTrack(track: unknown): boolean;
    /**
     * Builds a Track from the raw data from Lavalink and a optional requester.
     * @param data
     * @param requester
     */
    static build(data: Partial<TrackData>, requester?: unknown): Track;
    /**
     * Builds a UnresolvedTrack to be resolved before being played  .
     * @param query
     * @param requester
     */
    static buildUnresolved(query: string | UnresolvedQuery, requester?: unknown): UnresolvedTrack;
    static getClosestTrack(unresolvedTrack: UnresolvedTrack, customNode?: Node): Promise<Track>;
}
/** Gets or extends structures to extend the built in, or already extended, classes to add more functionality. */
export declare abstract class Structure {
    /**
     * Extends a class.
     * @param name
     * @param extender
     */
    static extend<K extends keyof Extendable, T extends Extendable[K]>(name: K, extender: (target: Extendable[K]) => T): T;
    /**
     * Get a structure from available structures by name.
     * @param name
     */
    static get<K extends keyof Extendable>(name: K): Extendable[K];
}
export declare class Plugin {
    load(manager: Manager): void;
    unload(manager: Manager): void;
}
export interface UnresolvedQuery {
    /** The title to search against. */
    title: string;
    /** The author to search against. */
    author?: string;
    /** The duration to search within 1500 milliseconds of the results from YouTube. */
    duration?: number;
    /** Thumbnail of the track */
    thumbnail?: string;
    /** If the Track has a artworkURL --> will overwrite thumbnail too! (if not a youtube video) */
    artworkURL: string | null;
    /** Identifier of the track */
    identifier?: string;
    /** If it's a local track */
    local?: boolean;
}
export type Sizes = "0" | "1" | "2" | "3" | "default" | "mqdefault" | "hqdefault" | "maxresdefault";
export type LoadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "LOAD_FAILED" | "NO_MATCHES";
export type State = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "DISCONNECTING" | "DESTROYING";
export type PlayerEvents = TrackStartEvent | TrackEndEvent | TrackStuckEvent | TrackExceptionEvent | WebSocketClosedEvent;
export type PlayerEventType = "TrackStartEvent" | "TrackEndEvent" | "TrackExceptionEvent" | "TrackStuckEvent" | "WebSocketClosedEvent";
export type TrackEndReason = "FINISHED" | "LOAD_FAILED" | "STOPPED" | "REPLACED" | "CLEANUP";
export type Severity = "COMMON" | "SUSPICIOUS" | "FAULT";
export interface InvalidLavalinkRestRequest {
    timestamp: number;
    status: number;
    error: string;
    message?: string;
    path: string;
}
export interface LavalinkPlayerVoice {
    token: string;
    endpoint: string;
    sessionId: string;
    connected?: boolean;
    ping?: number;
}
export interface LavalinkPlayerVoiceOptions extends Omit<LavalinkPlayerVoice, 'connected' | 'ping'> {
}
export interface PlayerUpdateOptions {
    encodedTrack?: string | null;
    identifier?: string;
    position?: number;
    endTime?: number;
    volume?: number;
    paused?: boolean;
    filters?: Partial<LavalinkFilterData>;
    voice?: LavalinkPlayerVoiceOptions;
}
export interface PlayerUpdateInfo {
    guildId: string;
    playerOptions: PlayerUpdateOptions;
    noReplace?: boolean;
}
export interface LavalinkPlayerUpdateTrack {
    encoded?: string;
    info: TrackDataInfo;
}
export interface LavalinkPlayer {
    guildId: string;
    track?: LavalinkPlayerUpdateTrack;
    volume: number;
    paused: boolean;
    voice: LavalinkPlayerVoice;
    filters: Partial<LavalinkFilterData>;
}
export interface FetchOptions {
    endpoint: string;
    options: {
        headers?: Record<string, string>;
        params?: Record<string, string>;
        method?: string;
        body?: Record<string, unknown>;
        [key: string]: unknown;
    };
}
export interface UsedFetchOptions {
    method: string;
    headers: Record<string, string>;
    signal: AbortSignal;
    body?: string;
}
export interface Address {
    address: string;
    failingTimestamp: number;
    failingTime: string;
}
export interface RoutePlanner {
    class?: string;
    details?: {
        ipBlock: {
            type: string;
            size: string;
        };
        failingAddresses: Address[];
    };
    rotateIndex?: string;
    ipIndex?: string;
    currentAddress?: string;
    blockIndex?: string;
    currentAddressIndex?: string;
}
export interface Session {
    resumingKey?: string;
    timeout: number;
}
export interface LavalinkPlayerVoice {
    token: string;
    endpoint: string;
    sessionId: string;
    connected?: boolean;
    ping?: number;
}
export interface TrackData {
    /** @deprecated */
    track?: string;
    encoded?: string;
    encodedTrack?: string;
    info: Partial<TrackDataInfoExtended>;
    pluginInfo: Partial<PluginDataInfo> | Record<string, string | number>;
}
/** Data from Lavalink */
export interface TrackDataInfo {
    title: string;
    identifier: string;
    author: string;
    length: number;
    isSeekable: boolean;
    position?: number;
    isStream: boolean;
    uri: string;
    sourceName: string;
    artworkUrl: string | null;
    isrc: string | null;
}
export interface TrackDataInfoExtended extends TrackDataInfo {
    /** Things provided by an library */
    thumbnail?: string;
    /** Things provided by a library */
    md5_image?: string;
    /** Things provided by a library */
    image?: string;
}
export interface PluginDataInfo {
    type?: string;
    identifier?: string;
    artworkURL?: string;
    author?: string;
}
export interface Extendable {
    Player: typeof Player;
    Queue: typeof Queue;
    Node: typeof Node;
}
export interface VoiceState {
    op: "voiceUpdate";
    guildId: string;
    event: VoiceServer;
    sessionId?: string;
    guild_id: string;
    user_id: string;
    session_id: string;
    channel_id: string;
}
export interface VoiceServer {
    token: string;
    guild_id: string;
    endpoint: string;
}
export interface VoicePacket {
    t?: "VOICE_SERVER_UPDATE" | "VOICE_STATE_UPDATE";
    d: VoiceState | VoiceServer;
}
export interface NodeMessage extends NodeStats {
    type: PlayerEventType;
    op: "stats" | "playerUpdate" | "event";
    guildId: string;
}
export interface PlayerEvent {
    op: "event";
    type: PlayerEventType;
    guildId: string;
}
export interface Exception {
    severity: Severity;
    message: string;
    cause: string;
}
export interface TrackStartEvent extends PlayerEvent {
    type: "TrackStartEvent";
    track: string;
}
export interface TrackEndEvent extends PlayerEvent {
    type: "TrackEndEvent";
    track: string;
    reason: TrackEndReason;
}
export interface TrackExceptionEvent extends PlayerEvent {
    type: "TrackExceptionEvent";
    exception?: Exception;
    error: string;
}
export interface TrackStuckEvent extends PlayerEvent {
    type: "TrackStuckEvent";
    thresholdMs: number;
}
export interface WebSocketClosedEvent extends PlayerEvent {
    type: "WebSocketClosedEvent";
    code: number;
    byRemote: boolean;
    reason: string;
}
export interface PlayerUpdate {
    op: "playerUpdate";
    state: {
        position: number;
        time: number;
    };
    guildId: string;
}
export interface EQBand {
    band: number;
    gain: number;
}
export interface KaraokeFilter {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
}
export interface TimescaleFilter {
    speed?: number;
    pitch?: number;
    rate?: number;
}
export interface FreqFilter {
    frequency?: number;
    depth?: number;
}
export interface RotationFilter {
    rotationHz?: number;
}
export interface DistortionFilter {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}
export interface ChannelMixFilter {
    leftToLeft?: number;
    leftToRight?: number;
    rightToLeft?: number;
    rightToRight?: number;
}
export interface LowPassFilter {
    smoothing?: number;
}
export interface EchoFilter {
    delay: number;
    decay: number;
}
export interface ReverbFilter {
    delay: number;
    decay: number;
}
export interface LavalinkFilterData {
    volume?: number;
    equalizer?: EQBand[];
    karaoke?: KaraokeFilter;
    timescale?: TimescaleFilter;
    tremolo?: FreqFilter;
    vibrato?: FreqFilter;
    rotation?: RotationFilter;
    distortion?: DistortionFilter;
    channelMix?: ChannelMixFilter;
    lowPass?: LowPassFilter;
    echo: EchoFilter;
    reverb: ReverbFilter;
}
