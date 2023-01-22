import { Manager, SearchQuery, SearchResult } from "./Manager";
import { Node } from "./Node";
import { Queue } from "./Queue";
import { Sizes, State, VoiceState } from "./Utils";
export type AudioOutputs = "mono" | "stereo" | "left" | "right";
export declare const validAudioOutputs: {
    mono: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    };
    stereo: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    };
    left: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    };
    right: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    };
};
export interface PlayerUpdatePayload {
    state: {
        connected: boolean;
        ping: number;
        position: number;
        time: number;
    };
    guildId: string;
}
export declare class Player {
    options: PlayerOptions;
    /** The Queue for the Player. */
    readonly queue: Queue;
    /** Whether the queue repeats the track. */
    trackRepeat: boolean;
    /** Whether the queue repeats the queue. */
    queueRepeat: boolean;
    /** The time the player is in the track. */
    position: number;
    /** Whether the player is playing. */
    playing: boolean;
    /** Whether the player is paused. */
    paused: boolean;
    /** The volume for the player */
    volume: number;
    /** The Node for the Player. */
    node: Node;
    /** The guild for the player. */
    guild: string;
    /** The voice channel for the player. */
    voiceChannel: string | null;
    /** The text channel for the player. */
    textChannel: string | null;
    /** The current state of the player. */
    state: State;
    /** The equalizer bands array. */
    bands: number[];
    /** The voice state object from Discord. */
    voiceState: VoiceState;
    /** The Manager. */
    manager: Manager;
    private static _manager;
    private readonly data;
    /** Checker if filters should be updated or not! */
    filterUpdated: number;
    /** When the player was created [Date] (from lavalink) */
    createdAt: Date | null;
    /** When the player was created [Timestamp] (from lavalink) */
    createdTimeStamp: number;
    /** If lavalink says it's connected or not */
    connected: boolean | undefined;
    /** Last sent payload from lavalink */
    payload: Partial<PlayerUpdatePayload>;
    /** A Voice-Region for voice-regioned based - Node identification(s) */
    region: string;
    /** The Ping to the Lavalink Client in ms | < 0 == not connected | undefined == not defined yet. */
    ping: number | undefined;
    /** The Voice Connection Ping from Lavalink in ms | < 0 == not connected | null == lavalinkversion is < 3.5.1 in where there is no ping info. | undefined == not defined yet. */
    wsPing: number | null | undefined;
    /** All States of a Filter, however you can manually overwrite it with a string, if you need so */
    filters: {
        nightcore: boolean | string;
        echo: boolean | string;
        rotating: boolean | string;
        karaoke: boolean | string;
        tremolo: boolean | string;
        vibrato: boolean | string;
        lowPass: boolean | string;
        /** audio Output (default stereo, mono sounds the fullest and best for not-stereo tracks) */
        audioOutput: AudioOutputs;
    };
    /** The Current Filter Data(s) */
    filterData: {
        channelMix?: {
            leftToLeft: number;
            leftToRight: number;
            rightToLeft: number;
            rightToRight: number;
        };
        lowPass: {
            smoothing: number;
        };
        karaoke: {
            level: number;
            monoLevel: number;
            filterBand: number;
            filterWidth: number;
        };
        timescale: {
            speed: number;
            pitch: number;
            rate: number;
        };
        echo: {
            delay: number;
            decay: number;
        };
        rotating: {
            rotationHz: number;
        };
        tremolo: {
            frequency: number;
            depth: number;
        };
        vibrato: {
            frequency: number;
            depth: number;
        };
        distortion?: {
            sinOffset: number;
            sinScale: number;
            cosOffset: number;
            cosScale: number;
            tanOffset: number;
            tanScale: number;
            offset: number;
            scale: number;
        };
    };
    /**
     * Set custom data.
     * @param key
     * @param value
     */
    set(key: string, value: unknown): void;
    /**
     * Get custom data.
     * @param key
     */
    get<T>(key: string): T;
    /** @hidden */
    static init(manager: Manager): void;
    /**
     * Creates a new player, returns one if it already exists.
     * @param options
     */
    constructor(options: PlayerOptions);
    resetFilters(): Promise<this>;
    /**
     *
     * @param {AudioOutputs} type
     */
    setAudioOutput(type: any): AudioOutputs;
    toggleRotating(rotationHz?: number): boolean;
    toggleVibrato(frequency?: number, depth?: number): boolean;
    toggleTremolo(frequency?: number, depth?: number): boolean;
    toggleLowPass(smoothing?: number): boolean;
    toggleEcho(delay?: number, decay?: number): boolean;
    toggleNightcore(speed?: number, pitch?: number, rate?: number): boolean;
    toggleKaraoke(level?: number, monoLevel?: number, filterBand?: number, filterWidth?: number): boolean;
    updatePlayerFilters(): Promise<this>;
    /**
     * Same as Manager#search() but a shortcut on the player itself.
     * @param query
     * @param requester
     */
    search(query: string | SearchQuery, requester?: unknown): Promise<SearchResult>;
    /**
     * Sets the players equalizer band on-top of the existing ones.
     * @param bands
     */
    setEQ(...bands: EqualizerBand[]): this;
    /** Clears the equalizer bands. */
    clearEQ(): this;
    /** Connect to the voice channel. */
    connect(): this;
    /** Disconnect from the voice channel. */
    disconnect(): this;
    /** Destroys the player. */
    destroy(disconnect?: boolean): void;
    /**
     * Sets the player voice channel.
     * @param channel
     */
    setVoiceChannel(channel: string): this;
    /**
     * Sets the player text channel.
     * @param channel
     */
    setTextChannel(channel: string): this;
    /** Plays the next track. */
    play(): Promise<void>;
    /**
     * Plays the specified track.
     * @param track
     */
    play(track: Track | UnresolvedTrack): Promise<void>;
    /**
     * Plays the next track with some options.
     * @param options
     */
    play(options: PlayOptions): Promise<void>;
    /**
     * Plays the specified track with some options.
     * @param track
     * @param options
     */
    play(track: Track | UnresolvedTrack, options: PlayOptions): Promise<void>;
    /**
     * Sets the player volume.
     * @param volume
     */
    setVolume(volume: number): this;
    /**
     * Sets the track repeat.
     * @param repeat
     */
    setTrackRepeat(repeat: boolean): this;
    /**
     * Sets the queue repeat.
     * @param repeat
     */
    setQueueRepeat(repeat: boolean): this;
    /** Stops the current track, optionally give an amount to skip to, e.g 5 would play the 5th song. */
    stop(amount?: number): this;
    /**
     * Pauses the current track.
     * @param pause
     */
    pause(pause: boolean): this;
    /**
     * Seeks to the position in the current track.
     * @param position
     */
    seek(position: number): this;
}
export interface PlayerOptions {
    /** The guild the Player belongs to. */
    guild: string;
    /** The text channel the Player belongs to. */
    textChannel: string;
    /** The voice channel the Player belongs to. */
    voiceChannel?: string;
    /** The node the Player uses. */
    node?: string;
    /** The initial volume the Player will use. */
    volume?: number;
    /** If the player should mute itself. */
    selfMute?: boolean;
    /** If the player should deaf itself. */
    selfDeafen?: boolean;
    /** Voice-Region */
    region?: string;
    /** If filters should be instantupdated */
    instaUpdateFiltersFix: boolean;
}
/** If track partials are set some of these will be `undefined` as they were removed. */
export interface Track {
    /** The base64 encoded track. */
    readonly track: string;
    /** The title of the track. */
    title: string;
    /** The identifier of the track. */
    identifier: string;
    /** The author of the track. */
    author: string;
    /** The duration of the track. */
    duration: number;
    /** If the track is seekable. */
    isSeekable: boolean;
    /** If the track is a stream.. */
    isStream: boolean;
    /** The uri of the track. */
    uri: string;
    /** The thumbnail of the track or null if it's a unsupported source. */
    thumbnail: string | null;
    /** The user that requested the track. */
    requester: unknown | null;
    /** Displays the track thumbnail with optional size or null if it's a unsupported source. */
    displayThumbnail(size?: Sizes): string;
    /** If the Track is a preview */
    isPreview: boolean;
}
/** Unresolved tracks can't be played normally, they will resolve before playing into a Track. */
export interface UnresolvedTrack extends Partial<Track> {
    /** The title to search against. */
    title: string;
    /** The author to search against. */
    author?: string;
    /** The duration to search within 1500 milliseconds of the results from YouTube. */
    duration?: number;
    /** Thumbnail of the track */
    thumbnail?: string;
    /** Identifier of the track */
    identifier?: string;
    /** Resolves into a Track. */
    resolve(): Promise<void>;
}
export interface PlayOptions {
    /** The position to start the track. */
    readonly startTime?: number;
    /** The position to end the track. */
    readonly endTime?: number;
    /** Whether to not replace the track if a play payload is sent. */
    readonly noReplace?: boolean;
    /** If to start "paused" */
    readonly pause?: boolean;
    /** The Volume to start with */
    readonly volume?: number;
}
export interface EqualizerBand {
    /** The band number being 0 to 14. */
    band: number;
    /** The gain amount being -0.25 to 1.00, 0.25 being double. */
    gain: number;
}
