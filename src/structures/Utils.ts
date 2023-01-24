/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, @typescript-eslint/no-var-requires*/
import { Manager } from "./Manager";
import { Node, NodeStats } from "./Node";
import { Player, PlayerFilters, Track, UnresolvedTrack } from "./Player";
import { Queue } from "./Queue";

/** @hidden */
const TRACK_SYMBOL = Symbol("track"),
  /** @hidden */
  UNRESOLVED_TRACK_SYMBOL = Symbol("unresolved"),
  SIZES = [
    "0",
    "1",
    "2",
    "3",
    "default",
    "mqdefault",
    "hqdefault",
    "maxresdefault",
  ];

/** @hidden */
const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export abstract class TrackUtils {
  static trackPartial: string[] | null = null;
  private static manager: Manager;

  /** @hidden */
  public static init(manager: Manager): void {
    this.manager = manager;
  }

  static setTrackPartial(partial: string[]): void {
    if (!Array.isArray(partial) || !partial.every(str => typeof str === "string"))
      throw new Error("Provided partial is not an array or not a string array.");
    if (!partial.includes("track")) partial.unshift("track");

    this.trackPartial = partial;
  }

  /**
   * Checks if the provided argument is a valid Track or UnresolvedTrack, if provided an array then every element will be checked.
   * @param trackOrTracks
   */
  static validate(trackOrTracks: unknown): boolean {
    if (typeof trackOrTracks === "undefined")
      throw new RangeError("Provided argument must be present.");

    if (Array.isArray(trackOrTracks) && trackOrTracks.length) {
      for (const track of trackOrTracks) {
        if (!(track[TRACK_SYMBOL] || track[UNRESOLVED_TRACK_SYMBOL])) return false
      }
      return true;
    }

    return (
      trackOrTracks[TRACK_SYMBOL] ||
      trackOrTracks[UNRESOLVED_TRACK_SYMBOL]
    ) === true;
  }

  /**
   * Checks if the provided argument is a valid UnresolvedTrack.
   * @param track
   */
  static isUnresolvedTrack(track: unknown): boolean {
    if (typeof track === "undefined")
      throw new RangeError("Provided argument must be present.");
    return track[UNRESOLVED_TRACK_SYMBOL] === true;
  }

  /**
   * Checks if the provided argument is a valid Track.
   * @param track
   */
  static isTrack(track: unknown): boolean {
    if (typeof track === "undefined")
      throw new RangeError("Provided argument must be present.");
    return track[TRACK_SYMBOL] === true;
  }

  /**
   * Builds a Track from the raw data from Lavalink and a optional requester.
   * @param data
   * @param requester
   */
  static build(data: TrackData, requester?: unknown): Track {
    if (typeof data === "undefined")
      throw new RangeError('Argument "data" must be present.');
    if(!data.info) data.info = {} as Partial<TrackDataInfoExtended>;
    try {
      const track: Track = {
        track: data.track,
        encodedTrack: data.encoded,
        // add all lavalink Info
        ...data.info,

        // lavalink Data
        title: data.info.title,
        identifier: data.info.identifier,
        author: data.info.author,
        duration: data.info.length,
        isSeekable: data.info.isSeekable,
        isStream: data.info.isStream,
        uri: data.info.uri,
        artworkURL: data.info.artworkUrl?.replace("/maxresdefault.jpg",  "/mqdefault.jpg"),
        isrc: data.info.isrc,

        // library data
        isPreview: (data.info.identifier?.includes?.("/preview") && data.info.identifier?.includes?.("soundcloud")) || (data.info.length === 30000 && ["soundcloud.", "deezer."].some(domain => data.info.identifier?.includes?.(domain))),
        // parsed Thumbnail
        thumbnail: (data.info.artworkUrl?.replace("/maxresdefault.jpg",  "/mqdefault.jpg") || data.info.thumbnail || data.info.image) ||  ["youtube.", "youtu.be"].some(d => data.info.uri?.includes?.(d))
            ? `https://img.youtube.com/vi/${data.info.identifier}/mqdefault.jpg` : (data.info?.md5_image && data.info?.uri?.includes?.("deezer"))
            ? `https://cdns-images.dzcdn.net/images/cover/${data.info.md5_image}/500x500.jpg` : null,
        displayThumbnail(size = "mqdefault"): string | null {
          const finalSize = SIZES.find((s) => s === size) ?? "default";
          return (data?.info?.uri?.includes?.("youtube.") || data?.info?.uri?.includes?.("youtu.be"))
          ? `https://img.youtube.com/vi/${data.info.identifier}/${finalSize}.jpg`
          : (data.info?.md5_image && data.info?.uri?.includes?.("deezer"))
          ? `https://cdns-images.dzcdn.net/images/cover/${data.info.md5_image}/500x500.jpg`
          :  data.info?.thumbnail || data.info?.image
        },
        requester,
      };

      track.displayThumbnail = track.displayThumbnail.bind(track);

      if (this.trackPartial) {
        for (const key of Object.keys(track)) {
          if (this.trackPartial.includes(key)) continue;
          delete track[key];
        }
      }

      Object.defineProperty(track, TRACK_SYMBOL, {
        configurable: true,
        value: true
      });

      return track;
    } catch (error) {
      throw new RangeError(`Argument "data" is not a valid track: ${error.message}`);
    }
  }

  /**
   * Builds a UnresolvedTrack to be resolved before being played  .
   * @param query
   * @param requester
   */
  static buildUnresolved(query: string | UnresolvedQuery, requester?: unknown): UnresolvedTrack {
    if (typeof query === "undefined")
      throw new RangeError('Argument "query" must be present.');

    let unresolvedTrack: Partial<UnresolvedTrack> = {
      requester,
      async resolve(): Promise<void> {
        const resolved = await TrackUtils.getClosestTrack(this)
        Object.getOwnPropertyNames(this).forEach(prop => delete this[prop]);
        Object.assign(this, resolved);
      }
    };

    if (typeof query === "string") unresolvedTrack.title = query;
    else unresolvedTrack = { ...unresolvedTrack, ...query }

    Object.defineProperty(unresolvedTrack, UNRESOLVED_TRACK_SYMBOL, {
      configurable: true,
      value: true
    });

    return unresolvedTrack as UnresolvedTrack;
  }

  static async getClosestTrack(
    unresolvedTrack: UnresolvedTrack,
    customNode?: Node,
  ): Promise<Track> {
    if (!TrackUtils.manager) throw new RangeError("Manager has not been initiated.");

    if (!TrackUtils.isUnresolvedTrack(unresolvedTrack))
      throw new RangeError("Provided track is not a UnresolvedTrack.");

    const query = [unresolvedTrack.author, unresolvedTrack.title].filter(str => !!str).join(" - ");
    const isvalidUri = (str) => {
      const valids = ["www.youtu", "music.youtu", "soundcloud.com"];
      if(TrackUtils.manager.options.validUnresolvedUris && TrackUtils.manager.options.validUnresolvedUris.length) {
          valids.push(...TrackUtils.manager.options.validUnresolvedUris);
      }
      // auto remove plugins which make it to unresolved, so that it can search on youtube etc.
      if(TrackUtils.manager.options.plugins && TrackUtils.manager.options.plugins.length) {
          const pluginNames = TrackUtils.manager.options.plugins.map(c => c?.constructor?.name?.toLowerCase?.());
          for(const valid of valids) if(pluginNames?.some?.(v => valid?.toLowerCase?.().includes?.(v))) valids.splice(valids.indexOf(valid), 1);
      }
      if(!str) return false;
      if(valids.some(x => str.includes(x.toLowerCase()))) return true;
      return false
    }
    const res = isvalidUri(unresolvedTrack.uri) ? await TrackUtils.manager.search(unresolvedTrack.uri, unresolvedTrack.requester, customNode) : await TrackUtils.manager.search(query, unresolvedTrack.requester, customNode);

    if (res.loadType !== "SEARCH_RESULT") throw res.exception ?? {
      message: "No tracks found.",
      severity: "COMMON",
    };

    if (unresolvedTrack.author) {
      const channelNames = [unresolvedTrack.author, `${unresolvedTrack.author} - Topic`];

      const originalAudio = res.tracks.find(track => {
        return (
          channelNames.some(name => new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.author)) ||
          new RegExp(`^${escapeRegExp(unresolvedTrack.title)}$`, "i").test(track.title)
        );
      });

      if (originalAudio) {
        originalAudio.uri = unresolvedTrack.uri;
        if(TrackUtils.manager.options.useUnresolvedData) { // overwrite values
            if(unresolvedTrack.thumbnail?.length) originalAudio.thumbnail = unresolvedTrack.thumbnail;
            if(unresolvedTrack.title?.length) originalAudio.title = unresolvedTrack.title;
            if(unresolvedTrack.author?.length) originalAudio.author = unresolvedTrack.author;
        } else { // only overwrite if undefined / invalid
            if((originalAudio.title == 'Unknown title' || originalAudio.title == "Unspecified description") && originalAudio.title != unresolvedTrack.title) originalAudio.title = unresolvedTrack.title;
            if(originalAudio.author != unresolvedTrack.author) originalAudio.author = unresolvedTrack.author;
            if(originalAudio.thumbnail != unresolvedTrack.thumbnail) originalAudio.thumbnail = unresolvedTrack.thumbnail;    
        }
        for(const key of Object.keys(unresolvedTrack)) if(!originalAudio[key]) originalAudio[key] = unresolvedTrack[key]; // add non-existing values
        return originalAudio;
      }
    }

    if (unresolvedTrack.duration) { 
      const sameDuration = res.tracks.find(track =>
        (track.duration >= (unresolvedTrack.duration - 1500)) &&
        (track.duration <= (unresolvedTrack.duration + 1500))
      );

      if (sameDuration) {
        sameDuration.uri = unresolvedTrack.uri;
        if(TrackUtils.manager.options.useUnresolvedData) { // overwrite values
            if(unresolvedTrack.thumbnail?.length) sameDuration.thumbnail = unresolvedTrack.thumbnail;
            if(unresolvedTrack.title?.length) sameDuration.title = unresolvedTrack.title;
            if(unresolvedTrack.author?.length) sameDuration.author = unresolvedTrack.author;
        } else { // only overwrite if undefined / invalid
            if((sameDuration.title == 'Unknown title' || sameDuration.title == "Unspecified description") && sameDuration.title != unresolvedTrack.title) sameDuration.title = unresolvedTrack.title;
            if(sameDuration.author != unresolvedTrack.author) sameDuration.author = unresolvedTrack.author;
            if(sameDuration.thumbnail != unresolvedTrack.thumbnail) sameDuration.thumbnail = unresolvedTrack.thumbnail;
        }
        for(const key of Object.keys(unresolvedTrack)) if(!sameDuration[key]) sameDuration[key] = unresolvedTrack[key]; // add non-existing values
        return sameDuration;
      }
    }
    res.tracks[0].uri = unresolvedTrack.uri;
    if(TrackUtils.manager.options.useUnresolvedData) { // overwrite values
        if(unresolvedTrack.thumbnail?.length) res.tracks[0].thumbnail = unresolvedTrack.thumbnail;
        if(unresolvedTrack.title?.length) res.tracks[0].title = unresolvedTrack.title;
        if(unresolvedTrack.author?.length) res.tracks[0].author = unresolvedTrack.author;
    } else { // only overwrite if undefined / invalid
        if((res.tracks[0].title == 'Unknown title' || res.tracks[0].title == "Unspecified description") && unresolvedTrack.title != res.tracks[0].title) res.tracks[0].title = unresolvedTrack.title;
        if(unresolvedTrack.author != res.tracks[0].author) res.tracks[0].author = unresolvedTrack.author;
        if(unresolvedTrack.thumbnail != res.tracks[0].thumbnail) res.tracks[0].thumbnail = unresolvedTrack.thumbnail;
    }
    for(const key of Object.keys(unresolvedTrack)) if(!res.tracks[0][key]) res.tracks[0][key] = unresolvedTrack[key]; // add non-existing values
    return res.tracks[0];
  }
}

/** Gets or extends structures to extend the built in, or already extended, classes to add more functionality. */
export abstract class Structure {
  /**
   * Extends a class.
   * @param name
   * @param extender
   */
  public static extend<K extends keyof Extendable, T extends Extendable[K]>(
    name: K,
    extender: (target: Extendable[K]) => T
  ): T {
    if (!structures[name]) throw new TypeError(`"${name} is not a valid structure`);
    const extended = extender(structures[name]);
    structures[name] = extended;
    return extended;
  }

  /**
   * Get a structure from available structures by name.
   * @param name
   */
  public static get<K extends keyof Extendable>(name: K): Extendable[K] {
    const structure = structures[name];
    if (!structure) throw new TypeError('"structure" must be provided.');
    return structure;
  }
}

export class Plugin {
  public load(manager: Manager): void {}

  public unload(manager: Manager): void {}
}

const structures = {
  Player: Player,
  Queue: Queue,
  Node: Node,
};

export interface UnresolvedQuery {
  /** The title of the unresolved track. */
  title: string;
  /** The author of the unresolved track. If provided it will have a more precise search. */
  author?: string;
  /** The duration of the unresolved track. If provided it will have a more precise search. */
  duration?: number;
}

export type Sizes =
  | "0"
  | "1"
  | "2"
  | "3"
  | "default"
  | "mqdefault"
  | "hqdefault"
  | "maxresdefault";

export type LoadType =
  | "TRACK_LOADED"
  | "PLAYLIST_LOADED"
  | "SEARCH_RESULT"
  | "LOAD_FAILED"
  | "NO_MATCHES";

export type State =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "DISCONNECTING"
  | "DESTROYING";

export type PlayerEvents =
  | TrackStartEvent
  | TrackEndEvent
  | TrackStuckEvent
  | TrackExceptionEvent
  | WebSocketClosedEvent;

export type PlayerEventType =
  | "TrackStartEvent"
  | "TrackEndEvent"
  | "TrackExceptionEvent"
  | "TrackStuckEvent"
  | "WebSocketClosedEvent";

export type TrackEndReason =
  | "FINISHED"
  | "LOAD_FAILED"
  | "STOPPED"
  | "REPLACED"
  | "CLEANUP";

export type Severity = "COMMON" | "SUSPICIOUS" | "FAULT";

export interface LavalinkPlayerVoice {
  token: string;
  endpoint: string;
  sessionId: string;
  connected?: boolean;
  ping?: number
}

export interface LavalinkPlayerVoiceOptions extends Omit<LavalinkPlayerVoice, 'connected'|'ping'> {}

export interface PlayerUpdateOptions {
  encodedTrack?: string|null;
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
export interface LavalinkPlayer {
  guildId: string;
  track?: {
    encoded: string;
    info: TrackDataInfo;
  };
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
      },
      failingAddresses: Address[]
  }
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
  ping?: number
}


export interface TrackData {
  track: string;
  encoded: string;
  info:  Partial<TrackDataInfoExtended>;
  pluginInfo: Partial<PluginDataInfo> | Record<string, string|number>;
}

/** Data from Lavalink */
export interface TrackDataInfo {
  title: string;
  identifier: string;
  author: string;
  length: number;
  isSeekable: boolean;
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
  smoothing?: number
}
export interface EchoFilter {
  delay: number
  decay: number
}
export interface LavalinkFilterData {
  volume?: number;
  equalizer?: EQBand[];
  karaoke?: KaraokeFilter;
  timescale?: TimescaleFilter;
  tremolo?: FreqFilter;
  vibrato?: FreqFilter;
  rotation?: RotationFilter;
  // rotating: RotationFilter
  distortion?: DistortionFilter;
  channelMix?: ChannelMixFilter;
  lowPass?: LowPassFilter;
  echo: EchoFilter,
};