/// <reference types="node" />
/// <reference types="node" />
import WebSocket from "ws";
import { Dispatcher, Pool } from "undici";
import { Manager } from "./Manager";
import { Player, Track, UnresolvedTrack } from "./Player";
import { LavalinkPlayer, PlayerEvent, PlayerEvents, PlayerUpdateInfo, RoutePlanner, Session, TrackEndEvent, TrackExceptionEvent, TrackStartEvent, TrackStuckEvent, WebSocketClosedEvent } from "./Utils";
import internal from "node:stream";
export type LavalinkVersion = "v2" | "v3" | "v4";
export declare class Node {
    options: NodeOptions;
    /** The socket for the node. */
    socket: WebSocket | null;
    /** The HTTP pool used for rest calls. */
    http: Pool;
    /** The amount of rest calls the node has made. */
    calls: number;
    /** The stats for the node. */
    stats: NodeStats;
    manager: Manager;
    version: LavalinkVersion;
    initialized: boolean;
    sessionId?: string | null;
    regions: string[];
    private static _manager;
    private reconnectTimeout?;
    private reconnectAttempts;
    info: LavalinkInfo | null;
    useVersionPath: boolean;
    /** Returns if connected to the Node. */
    get connected(): boolean;
    /** Returns the address for this node. */
    get address(): string;
    /** @hidden */
    static init(manager: Manager): void;
    get poolAddress(): string;
    /**
     * Creates an instance of Node.
     * @param options
     */
    constructor(options: NodeOptions);
    fetchInfo(): Promise<LavalinkInfo | null>;
    fetchVersion(): Promise<string | null>;
    /**
     * Gets all Players of a Node
     */
    getPlayers(): Promise<LavalinkPlayer[]>;
    /**
     * Gets specific Player Information
     */
    getPlayer(guildId: string): Promise<LavalinkPlayer | {}>;
    updatePlayer(data: PlayerUpdateInfo): Promise<LavalinkPlayer | {}>;
    private syncPlayerData;
    /**
     * Deletes a Lavalink Player (from Lavalink)
     * @param guildId
     */
    destroyPlayer(guildId: string): Promise<void>;
    /**
     * Updates the session with a resuming key and timeout
     * @param resumingKey
     * @param timeout
     */
    updateSession(resumingKey?: string, timeout?: number): Promise<Session | {}>;
    /**
     * Gets the stats of this node
     */
    fetchStats(): Promise<NodeStats | {}>;
    /**
     * Get routplanner Info from Lavalink
     */
    getRoutePlannerStatus(): Promise<RoutePlanner>;
    /**
     * Release blacklisted IP address into pool of IPs
     * @param address IP address
     */
    unmarkFailedAddress(address: string): Promise<void>;
    /**
     * Release blacklisted IP address into pool of IPs
     * @param address IP address
     */
    unmarkAllFailedAddresses(): Promise<void>;
    /** Connects to the Node. */
    connect(): void;
    /** Destroys the Node and all players connected with it. */
    destroy(): void;
    /**
     * Makes an API call to the Node
     * @param endpoint The endpoint that we will make the call to
     * @param modify Used to modify the request before being sent
     * @returns The returned data
     */
    makeRequest<T>(endpoint: string, modify?: ModifyRequest): Promise<T>;
    /**
     * Makes an API call to the Node and returns it as TEXT
     * @param endpoint The endpoint that we will make the call to
     * @param modify Used to modify the request before being sent
     * @returns The returned data
     */
    makeTextRequest<T>(endpoint: string, modify?: ModifyRequest): Promise<T>;
    /**
     * Sends data to the Node.
     * @param data
     */
    send(data: unknown): Promise<boolean>;
    private reconnect;
    protected open(): void;
    protected close(code: number, reason: string): void;
    protected error(error: Error): void;
    protected message(d: Buffer | string): void;
    protected handleEvent(payload: PlayerEvent & PlayerEvents): void;
    protected trackStart(player: Player, track: Track, payload: TrackStartEvent): void;
    protected trackEnd(player: Player, track: Track, payload: TrackEndEvent): void;
    protected queueEnd(player: Player, track: Track, payload: TrackEndEvent): void;
    protected trackStuck(player: Player, track: Track, payload: TrackStuckEvent): void;
    protected trackError(player: Player, track: Track | UnresolvedTrack, payload: TrackExceptionEvent): void;
    protected socketClosed(player: Player, payload: WebSocketClosedEvent): void;
}
/** Modifies any outgoing REST requests. */
export type ModifyRequest = (options: Dispatcher.RequestOptions) => void;
export interface NodeOptions {
    /** The host for the node. */
    host: string;
    /** The port for the node. */
    port?: number;
    /** The password for the node. */
    password?: string;
    /** Whether the host uses SSL. */
    secure?: boolean;
    /** The identifier for the node. */
    identifier?: string;
    /** The retryAmount for the node. */
    retryAmount?: number;
    /** The retryDelay for the node. */
    retryDelay?: number;
    /** The timeout used for api calls */
    requestTimeout?: number;
    /** Options for the undici http pool used for http requests */
    poolOptions?: Pool.Options;
    /** Regions for region sort */
    regions?: string[];
    /** Lavalink-Version */
    version?: LavalinkVersion;
    /** If it should use the version in the request Path(s) */
    useVersionPath?: boolean;
}
export interface LavalinkInfo {
    version: VersionObject;
    buildTime: number;
    git: GitObject;
    jvm: string;
    lavaplayer: string;
    sourceManagers: string[];
    filters: string[];
    plugins: PluginObject[];
}
export interface VersionObject {
    semver: string;
    major: number;
    minor: number;
    patch: internal;
    preRelease?: string;
}
export interface GitObject {
    branch: string;
    commit: string;
    commitTime: string;
}
export interface PluginObject {
    name: string;
    version: string;
}
export interface NodeStats {
    /** The amount of players on the node. */
    players: number;
    /** The amount of playing players on the node. */
    playingPlayers: number;
    /** The uptime for the node. */
    uptime: number;
    /** The memory stats for the node. */
    memory: MemoryStats;
    /** The cpu stats for the node. */
    cpu: CPUStats;
    /** The frame stats for the node. */
    frameStats: FrameStats;
}
export interface MemoryStats {
    /** The free memory of the allocated amount. */
    free: number;
    /** The used memory of the allocated amount. */
    used: number;
    /** The total allocated memory. */
    allocated: number;
    /** The reservable memory. */
    reservable: number;
}
export interface CPUStats {
    /** The core amount the host machine has. */
    cores: number;
    /** The system load. */
    systemLoad: number;
    /** The lavalink load. */
    lavalinkLoad: number;
}
export interface FrameStats {
    /** The amount of sent frames. */
    sent?: number;
    /** The amount of nulled frames. */
    nulled?: number;
    /** The amount of deficit frames. */
    deficit?: number;
}
