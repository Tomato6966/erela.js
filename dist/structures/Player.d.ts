import { Manager, SearchQuery, SearchResult } from "./Manager";
import { Node } from "./Node";
import { Queue } from "./Queue";
import { LavalinkFilterData, LavalinkPlayerVoice, TimescaleFilter } from "./Utils";
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
export interface PlayerFilters {
    /** Sets nightcore to false, and vaporwave to false */
    custom: boolean;
    /** Sets custom to false, and vaporwave to false */
    nightcore: boolean;
    /** Sets custom to false, and nightcore to false */
    vaporwave: boolean;
    /** only with the custom lavalink filter plugin */
    echo: boolean;
    /** only with the custom lavalink filter plugin */
    reverb: boolean;
    rotation: boolean;
    /** @deprecated */
    rotating: boolean;
    karaoke: boolean;
    tremolo: boolean;
    vibrato: boolean;
    lowPass: boolean;
    /** audio Output (default stereo, mono sounds the fullest and best for not-stereo tracks) */
    audioOutput: AudioOutputs;
    /** Lavalink Volume FILTER (not player Volume, think of it as a gain booster) */
    volume: boolean;
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
    /** The real volume for the player (if volumedecrementer is used this will be diffrent to player.volume) */
    lavalinkVolume: number;
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
    /** @deprecated The voice state object from Discord. */
    voiceState: VoiceState;
    /** The new VoiceState Data from Lavalink */
    voice: LavalinkPlayerVoice;
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
    filters: PlayerFilters;
    /** The Current Filter Data(s) */
    filterData: LavalinkFilterData;
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
    checkFiltersState(oldFilterTimescale?: Partial<TimescaleFilter>): boolean;
    /**
     * Reset all Filters
     */
    resetFilters(): Promise<PlayerFilters>;
    /**
     * Set the AudioOutput Filter
     * @param type
     */
    setAudioOutput(type: AudioOutputs): Promise<AudioOutputs>;
    /**
     * Set custom filter.timescale#speed . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed
     * @returns
     */
    setSpeed(speed?: number): Promise<boolean>;
    /**
     * Set custom filter.timescale#pitch . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed
     * @returns
     */
    setPitch(pitch?: number): Promise<boolean>;
    /**
     * Set custom filter.timescale#rate . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed
     * @returns
     */
    setRate(rate?: number): Promise<boolean>;
    /**
     * Enabels / Disables the rotation effect, (Optional: provide your Own Data)
     * @param rotationHz
     * @returns
     */
    toggleRotation(rotationHz?: number): Promise<boolean>;
    /**
     * @deprected - use #toggleRotation() Enabels / Disables the rotation effect, (Optional: provide your Own Data)
     * @param rotationHz
     * @returns
     */
    toggleRotating(rotationHz?: number): Promise<boolean>;
    /**
     * Enabels / Disables the Vibrato effect, (Optional: provide your Own Data)
     * @param frequency
     * @param depth
     * @returns
     */
    toggleVibrato(frequency?: number, depth?: number): Promise<boolean>;
    /**
     * Enabels / Disables the Tremolo effect, (Optional: provide your Own Data)
     * @param frequency
     * @param depth
     * @returns
     */
    toggleTremolo(frequency?: number, depth?: number): Promise<boolean>;
    /**
     * Enabels / Disables the LowPass effect, (Optional: provide your Own Data)
     * @param smoothing
     * @returns
     */
    toggleLowPass(smoothing?: number): Promise<boolean>;
    /**
     * Enabels / Disables the Echo effect, IMPORTANT! Only works with the correct Lavalink Plugin installed. (Optional: provide your Own Data)
     * @param delay
     * @param decay
     * @returns
     */
    toggleEcho(delay?: number, decay?: number): Promise<boolean>;
    /**
     * Enabels / Disables the Echo effect, IMPORTANT! Only works with the correct Lavalink Plugin installed. (Optional: provide your Own Data)
     * @param delay
     * @param decay
     * @returns
     */
    toggleReverb(delay?: number, decay?: number): Promise<boolean>;
    /**
     * Enables / Disabels a Nightcore-like filter Effect. Disables/Overwrides both: custom and Vaporwave Filter
     * @param speed
     * @param pitch
     * @param rate
     * @returns
     */
    toggleNightcore(speed?: number, pitch?: number, rate?: number): Promise<boolean>;
    /**
     * Enables / Disabels a Vaporwave-like filter Effect. Disables/Overwrides both: custom and nightcore Filter
     * @param speed
     * @param pitch
     * @param rate
     * @returns
     */
    toggleVaporwave(speed?: number, pitch?: number, rate?: number): Promise<boolean>;
    /**
     * Enable / Disables a Karaoke like Filter Effect
     * @param level
     * @param monoLevel
     * @param filterBand
     * @param filterWidth
     * @returns
     */
    toggleKaraoke(level?: number, monoLevel?: number, filterBand?: number, filterWidth?: number): Promise<boolean>;
    /** Function to find out if currently there is a custom timescamle etc. filter applied */
    isCustomFilterActive(): boolean;
    updatePlayerFilters(): Promise<Player>;
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
    setEQ(...bands: EqualizerBand[]): Promise<this>;
    /** Clears the equalizer bands. */
    clearEQ(): Promise<this>;
    /** Connect to the voice channel. */
    connect(): this;
    /** Disconnect from the voice channel. */
    disconnect(): this;
    /** Destroys the player. */
    destroy(disconnect?: boolean): Promise<void>;
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
     * @param volume 0-500
     */
    setVolume(volume: number): Promise<this>;
    /**
     * Applies a Node-Filter for Volume (make it louder/quieter without distortion | only for new REST api).
     * @param volume 0-5
     */
    setVolumeFilter(volume: number): Promise<this>;
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
    stop(amount?: number): Promise<this>;
    /**
     * Pauses the current track.
     * @param pause
     */
    pause(paused: boolean): Promise<this>;
    /**
     * Seeks to the position in the current track.
     * @param position
     */
    seek(position: number): Promise<this>;
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
    /** All vars to set on the customDatas */
    customData?: Record<string, string>;
}
/** If track partials are set some of these will be `undefined` as they were removed. */
export interface Track {
    /** @deprecated The base64 encoded track. */
    readonly track: string;
    /** The encoded base64 track. */
    readonly encodedTrack: string;
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
    /** If the Track has a artworkURL --> will overwrite thumbnail too! (if not a youtube video) */
    artworkURL: string | null;
    /** ISRC if available */
    isrc: string | null;
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
    /** If the Track has a artworkURL --> will overwrite thumbnail too! (if not a youtube video) */
    artworkURL: string | null;
    /** Identifier of the track */
    identifier?: string;
    /** If it's a local track */
    local?: boolean;
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
    /** The Lavalink Filters to use | only with the new REST API */
    readonly filters?: LavalinkFilterData;
}
export interface EqualizerBand {
    /** The band number being 0 to 14. */
    band: number;
    /** The gain amount being -0.25 to 1.00, 0.25 being double. */
    gain: number;
}
