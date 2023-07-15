import {
  LavalinkSearchPlatform,
  Manager,
  SearchQuery,
  SearchResult,
} from "./Manager";
import { Node } from "./Node";
import { Queue } from "./Queue";
import {
  LavalinkFilterData,
  LavalinkPlayerVoice,
  State,
  Structure,
  TimescaleFilter,
  TrackUtils,
  VoiceState,
} from "./Utils";

export type AudioOutputs = "mono" | "stereo" | "left" | "right";

export const validAudioOutputs = {
  mono: {
    // totalLeft: 1, totalRight: 1
    leftToLeft: 0.5, //each channel should in total 0 | 1, 0 === off, 1 === on, 0.5+0.5 === 1
    leftToRight: 0.5,
    rightToLeft: 0.5,
    rightToRight: 0.5,
  },
  stereo: {
    // totalLeft: 1, totalRight: 1
    leftToLeft: 1,
    leftToRight: 0,
    rightToLeft: 0,
    rightToRight: 1,
  },
  left: {
    // totalLeft: 1, totalRight: 0
    leftToLeft: 0.5,
    leftToRight: 0,
    rightToLeft: 0.5,
    rightToRight: 0,
  },
  right: {
    // totalLeft: 0, totalRight: 1
    leftToLeft: 0,
    leftToRight: 0.5,
    rightToLeft: 0,
    rightToRight: 0.5,
  },
};
function check(options: PlayerOptions) {
  if (!options) throw new TypeError("PlayerOptions must not be empty.");

  if (!/^\d+$/.test(options.guild))
    throw new TypeError(
      'Player option "guild" must be present and be a non-empty string.'
    );

  if (options.textChannel && !/^\d+$/.test(options.textChannel))
    throw new TypeError(
      'Player option "textChannel" must be a non-empty string.'
    );

  if (options.voiceChannel && !/^\d+$/.test(options.voiceChannel))
    throw new TypeError(
      'Player option "voiceChannel" must be a non-empty string.'
    );

  if (options.node && typeof options.node !== "string")
    throw new TypeError('Player option "node" must be a non-empty string.');

  if (
    typeof options.volume !== "undefined" &&
    typeof options.volume !== "number"
  )
    throw new TypeError('Player option "volume" must be a number.');

  if (
    typeof options.selfMute !== "undefined" &&
    typeof options.selfMute !== "boolean"
  )
    throw new TypeError('Player option "selfMute" must be a boolean.');

  if (
    typeof options.selfDeafen !== "undefined" &&
    typeof options.selfDeafen !== "boolean"
  )
    throw new TypeError('Player option "selfDeafen" must be a boolean.');
}

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
export class Player {
  /** The Queue for the Player. */
  public readonly queue = new (Structure.get("Queue"))() as Queue;
  /** Whether the queue repeats the track. */
  public trackRepeat = false;
  /** Whether the queue repeats the queue. */
  public queueRepeat = false;
  /** The time the player is in the track. */
  public position = 0;
  /** Whether the player is playing. */
  public playing = false;
  /** Whether the player is paused. */
  public paused = false;
  /** The volume for the player */
  public volume: number;
  /** The real volume for the player (if volumedecrementer is used this will be diffrent to player.volume) */
  public lavalinkVolume: number;
  /** The Node for the Player. */
  public node: Node;
  /** The guild for the player. */
  public guild: string;
  /** The voice channel for the player. */
  public voiceChannel: string | null = null;
  /** The text channel for the player. */
  public textChannel: string | null = null;
  /** The current state of the player. */
  public state: State = "DISCONNECTED";
  /** The equalizer bands array. */
  public bands = new Array<number>(15).fill(0.0);
  /** @deprecated The voice state object from Discord. */
  public voiceState: VoiceState;
  /** The new VoiceState Data from Lavalink */
  public voice: LavalinkPlayerVoice;
  /** The Manager. */
  public manager: Manager;
  private static _manager: Manager;
  private readonly data: Record<string, unknown> = {};
  /** Checker if filters should be updated or not! */
  public filterUpdated: number;
  /** When the player was created [Date] (from lavalink) */
  public createdAt: Date | null;
  /** When the player was created [Timestamp] (from lavalink) */
  public createdTimeStamp: number;
  /** If lavalink says it's connected or not */
  public connected: boolean | undefined;
  /** Last sent payload from lavalink */
  public payload: Partial<PlayerUpdatePayload>;
  /** A Voice-Region for voice-regioned based - Node identification(s) */
  public region: string;
  /** The Ping to the Lavalink Client in ms | < 0 == not connected | undefined == not defined yet. */
  public ping: number | undefined;
  /** The Voice Connection Ping from Lavalink in ms | < 0 == not connected | null == lavalinkversion is < 3.5.1 in where there is no ping info. | undefined == not defined yet. */
  public wsPing: number | null | undefined;
  /** All States of a Filter, however you can manually overwrite it with a string, if you need so */
  public filters: PlayerFilters;
  /** The Current Filter Data(s) */
  public filterData: LavalinkFilterData;

  /**
   * Set custom data.
   * @param key
   * @param value
   */
  public set(key: string, value: unknown): void {
    this.data[key] = value;
  }

  /**
   * Get custom data.
   * @param key
   */
  public get<T>(key: string): T {
    return this.data[key] as T;
  }

  /** @hidden */
  public static init(manager: Manager): void {
    this._manager = manager;
  }

  /**
   * Creates a new player, returns one if it already exists.
   * @param options
   */
  constructor(public options: PlayerOptions) {
    if (!this.manager) this.manager = Structure.get("Player")._manager;
    if (!this.manager) throw new RangeError("Manager has not been initiated.");

    if (this.manager.players.has(options.guild)) {
      return this.manager.players.get(options.guild);
    }

    check(options);

    /** When the player was created [Date] (from lavalink) | null */
    this.createdAt = null;
    /** When the player was created [Timestamp] (from lavalink) | 0 */
    this.createdTimeStamp = 0;
    /** If lavalink says it's connected or not */
    this.connected = undefined;
    /** Last sent payload from lavalink */
    this.payload = {};
    /** Ping to Lavalink from Client */
    this.ping = undefined;
    /** The Voice Connection Ping from Lavalink */
    (this.wsPing = undefined),
      /** The equalizer bands array. */
      (this.bands = new Array(15).fill(0.0));
    this.set("lastposition", undefined);

    if (
      typeof options.customData === "object" &&
      Object.keys(options.customData).length
    ) {
      this.data = { ...this.data, ...options.customData };
    }

    this.guild = options.guild;
    this.voiceState = Object.assign({
      op: "voiceUpdate",
      guildId: options.guild,
    });

    if (options.voiceChannel) this.voiceChannel = options.voiceChannel;
    if (options.textChannel) this.textChannel = options.textChannel;
    if (typeof options.instaUpdateFiltersFix === "undefined")
      this.options.instaUpdateFiltersFix = true;

    if (!this.manager.leastUsedNodes?.size) {
      if (this.manager.initiated) this.manager.initiated = false;
      this.manager.init(this.manager.options?.clientId);
    }

    this.region = options?.region;
    const customNode = this.manager.nodes.get(options.node);
    const regionNode = this.manager.leastUsedNodes
      .filter((x) => x.regions?.includes(options.region?.toLowerCase()))
      ?.first();
    this.node = customNode || regionNode || this.manager.leastUsedNodes.first();

    if (!this.node) throw new RangeError("No available nodes.");

    this.filters = {
      volume: false,
      vaporwave: false,
      custom: false,
      nightcore: false,
      echo: false,
      reverb: false,
      rotating: false,
      rotation: false,
      karaoke: false,
      tremolo: false,
      vibrato: false,
      lowPass: false,
      audioOutput: "stereo",
    };
    this.filterData = {
      lowPass: {
        smoothing: 0,
      },
      karaoke: {
        level: 0,
        monoLevel: 0,
        filterBand: 0,
        filterWidth: 0,
      },
      timescale: {
        speed: 1, // 0 = x
        pitch: 1, // 0 = x
        rate: 1, // 0 = x
      },
      echo: {
        delay: 0,
        decay: 0,
      },
      reverb: {
        delay: 0,
        decay: 0,
      },
      rotation: {
        rotationHz: 0,
      },
      tremolo: {
        frequency: 2, // 0 < x
        depth: 0.1, // 0 < x = 1
      },
      vibrato: {
        frequency: 2, // 0 < x = 14
        depth: 0.1, // 0 < x = 1
      },
      channelMix: validAudioOutputs.stereo,
      /*distortion: {
          sinOffset: 0,
          sinScale: 1,
          cosOffset: 0,
          cosScale: 1,
          tanOffset: 0,
          tanScale: 1,
          offset: 0,
          scale: 1
      }*/
    };

    this.manager.players.set(options.guild, this);
    this.manager.emit("playerCreate", this);
    this.setVolume(options.volume ?? 100);
  }
  checkFiltersState(oldFilterTimescale?: Partial<TimescaleFilter>) {
    this.filters.rotation = this.filterData.rotation.rotationHz !== 0;
    this.filters.vibrato =
      this.filterData.vibrato.frequency !== 0 ||
      this.filterData.vibrato.depth !== 0;
    this.filters.tremolo =
      this.filterData.tremolo.frequency !== 0 ||
      this.filterData.tremolo.depth !== 0;
    this.filters.echo =
      this.filterData.echo.decay !== 0 || this.filterData.echo.delay !== 0;
    this.filters.reverb =
      this.filterData.reverb.decay !== 0 || this.filterData.reverb.delay !== 0;
    this.filters.lowPass = this.filterData.lowPass.smoothing !== 0;
    this.filters.karaoke = Object.values(this.filterData.karaoke).some(
      (v) => v !== 0
    );
    if (
      (this.filters.nightcore || this.filters.vaporwave) &&
      oldFilterTimescale
    ) {
      if (
        oldFilterTimescale.pitch !== this.filterData.timescale.pitch ||
        oldFilterTimescale.rate !== this.filterData.timescale.rate ||
        oldFilterTimescale.speed !== this.filterData.timescale.speed
      ) {
        this.filters.custom = Object.values(this.filterData.timescale).some(
          (v) => v !== 1
        );
        this.filters.nightcore = false;
        this.filters.vaporwave = false;
      }
    }
    return true;
  }

  /**
   * Reset all Filters
   */
  public async resetFilters(): Promise<PlayerFilters> {
    this.filters.echo = false;
    this.filters.reverb = false;
    this.filters.nightcore = false;
    this.filters.lowPass = false;
    this.filters.rotating = false;
    this.filters.rotation = false;
    this.filters.tremolo = false;
    this.filters.vibrato = false;
    this.filters.karaoke = false;
    this.filters.karaoke = false;
    this.filters.volume = false;
    this.filters.audioOutput = "stereo";
    // disable all filters
    for (const [key, value] of Object.entries({
      volume: 1,
      lowPass: {
        smoothing: 0,
      },
      karaoke: {
        level: 0,
        monoLevel: 0,
        filterBand: 0,
        filterWidth: 0,
      },
      timescale: {
        speed: 1, // 0 = x
        pitch: 1, // 0 = x
        rate: 1, // 0 = x
      },
      echo: {
        delay: 0,
        decay: 0,
      },
      reverb: {
        delay: 0,
        decay: 0,
      },
      rotation: {
        rotationHz: 0,
      },
      tremolo: {
        frequency: 2, // 0 < x
        depth: 0.1, // 0 < x = 1
      },
      vibrato: {
        frequency: 2, // 0 < x = 14
        depth: 0.1, // 0 < x = 1
      },
      channelMix: validAudioOutputs.stereo,
    })) {
      this.filterData[key] = value;
    }
    await this.updatePlayerFilters();
    return this.filters;
  }
  /**
   * Set the AudioOutput Filter
   * @param type
   */
  public async setAudioOutput(type: AudioOutputs): Promise<AudioOutputs> {
    if (this.node.info && !this.node.info?.filters?.includes("channelMix"))
      throw new Error(
        "Node#Info#filters does not include the 'channelMix' Filter (Node has it not enable)"
      );
    if (!type || !validAudioOutputs[type])
      throw "Invalid audio type added, must be 'mono' / 'stereo' / 'left' / 'right'";
    this.filterData.channelMix = validAudioOutputs[type];
    this.filters.audioOutput = type;
    await this.updatePlayerFilters();
    return this.filters.audioOutput;
  }
  /**
   * Set custom filter.timescale#speed . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
   * @param speed
   * @returns
   */
  public async setSpeed(speed = 1): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("timescale"))
      throw new Error(
        "Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)"
      );
    // reset nightcore / vaporwave filter if enabled
    if (this.filters.nightcore || this.filters.vaporwave) {
      this.filterData.timescale.pitch = 1;
      this.filterData.timescale.speed = 1;
      this.filterData.timescale.rate = 1;
      this.filters.nightcore = false;
      this.filters.vaporwave = false;
    }

    this.filterData.timescale.speed = speed;

    // check if custom filter is active / not
    this.isCustomFilterActive();

    await this.updatePlayerFilters();
    return this.filters.custom;
  }
  /**
   * Set custom filter.timescale#pitch . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
   * @param speed
   * @returns
   */
  public async setPitch(pitch = 1): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("timescale"))
      throw new Error(
        "Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)"
      );
    // reset nightcore / vaporwave filter if enabled
    if (this.filters.nightcore || this.filters.vaporwave) {
      this.filterData.timescale.pitch = 1;
      this.filterData.timescale.speed = 1;
      this.filterData.timescale.rate = 1;
      this.filters.nightcore = false;
      this.filters.vaporwave = false;
    }

    this.filterData.timescale.pitch = pitch;

    // check if custom filter is active / not
    this.isCustomFilterActive();

    await this.updatePlayerFilters();
    return this.filters.custom;
  }
  /**
   * Set custom filter.timescale#rate . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
   * @param speed
   * @returns
   */
  public async setRate(rate = 1): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("timescale"))
      throw new Error(
        "Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)"
      );
    // reset nightcore / vaporwave filter if enabled
    if (this.filters.nightcore || this.filters.vaporwave) {
      this.filterData.timescale.pitch = 1;
      this.filterData.timescale.speed = 1;
      this.filterData.timescale.rate = 1;
      this.filters.nightcore = false;
      this.filters.vaporwave = false;
    }

    this.filterData.timescale.rate = rate;

    // check if custom filter is active / not
    this.isCustomFilterActive();
    await this.updatePlayerFilters();
    return this.filters.custom;
  }
  /**
   * Enabels / Disables the rotation effect, (Optional: provide your Own Data)
   * @param rotationHz
   * @returns
   */
  public async toggleRotation(rotationHz = 0.2): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("rotation"))
      throw new Error(
        "Node#Info#filters does not include the 'rotation' Filter (Node has it not enable)"
      );
    this.filterData.rotation.rotationHz = this.filters.rotation
      ? 0
      : rotationHz;

    this.filters.rotation = !this.filters.rotation;
    /** @deprecated but sync with rotating */
    this.filters.rotating = this.filters.rotation;

    return await this.updatePlayerFilters(), this.filters.rotation;
  }
  /**
   * @deprected - use #toggleRotation() Enabels / Disables the rotation effect, (Optional: provide your Own Data)
   * @param rotationHz
   * @returns
   */
  public async toggleRotating(rotationHz = 0.2): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("rotation"))
      throw new Error(
        "Node#Info#filters does not include the 'rotation' Filter (Node has it not enable)"
      );
    this.filterData.rotation.rotationHz = this.filters.rotation
      ? 0
      : rotationHz;

    this.filters.rotation = !this.filters.rotation;
    /** @deprecated but sync with rotating */
    this.filters.rotating = this.filters.rotation;

    return await this.updatePlayerFilters(), this.filters.rotation;
  }
  /**
   * Enabels / Disables the Vibrato effect, (Optional: provide your Own Data)
   * @param frequency
   * @param depth
   * @returns
   */
  public async toggleVibrato(frequency = 2, depth = 0.5): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("vibrato"))
      throw new Error(
        "Node#Info#filters does not include the 'vibrato' Filter (Node has it not enable)"
      );
    this.filterData.vibrato.frequency = this.filters.vibrato ? 0 : frequency;
    this.filterData.vibrato.depth = this.filters.vibrato ? 0 : depth;

    this.filters.vibrato = !this.filters.vibrato;
    await this.updatePlayerFilters();
    return this.filters.vibrato;
  }
  /**
   * Enabels / Disables the Tremolo effect, (Optional: provide your Own Data)
   * @param frequency
   * @param depth
   * @returns
   */
  public async toggleTremolo(frequency = 2, depth = 0.5): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("tremolo"))
      throw new Error(
        "Node#Info#filters does not include the 'tremolo' Filter (Node has it not enable)"
      );
    this.filterData.tremolo.frequency = this.filters.tremolo ? 0 : frequency;
    this.filterData.tremolo.depth = this.filters.tremolo ? 0 : depth;

    this.filters.tremolo = !this.filters.tremolo;
    await this.updatePlayerFilters();
    return this.filters.tremolo;
  }
  /**
   * Enabels / Disables the LowPass effect, (Optional: provide your Own Data)
   * @param smoothing
   * @returns
   */
  public async toggleLowPass(smoothing = 20): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("lowPass"))
      throw new Error(
        "Node#Info#filters does not include the 'lowPass' Filter (Node has it not enable)"
      );
    this.filterData.lowPass.smoothing = this.filters.lowPass ? 0 : smoothing;

    this.filters.lowPass = !this.filters.lowPass;
    await this.updatePlayerFilters();
    return this.filters.lowPass;
  }
  /**
   * Enabels / Disables the Echo effect, IMPORTANT! Only works with the correct Lavalink Plugin installed. (Optional: provide your Own Data)
   * @param delay
   * @param decay
   * @returns
   */
  public async toggleEcho(delay = 1, decay = 0.5): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("echo"))
      throw new Error(
        "Node#Info#filters does not include the 'echo' Filter (Node has it not enable aka not installed!)"
      );
    this.filterData.echo.delay = this.filters.echo ? 0 : delay;
    this.filterData.echo.decay = this.filters.echo ? 0 : decay;

    this.filters.echo = !this.filters.echo;
    await this.updatePlayerFilters();
    return this.filters.echo;
  }
  /**
   * Enabels / Disables the Echo effect, IMPORTANT! Only works with the correct Lavalink Plugin installed. (Optional: provide your Own Data)
   * @param delay
   * @param decay
   * @returns
   */
  public async toggleReverb(delay = 1, decay = 0.5): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("reverb"))
      throw new Error(
        "Node#Info#filters does not include the 'reverb' Filter (Node has it not enable aka not installed!)"
      );
    this.filterData.reverb.delay = this.filters.reverb ? 0 : delay;
    this.filterData.reverb.decay = this.filters.reverb ? 0 : decay;

    this.filters.reverb = !this.filters.reverb;
    await this.updatePlayerFilters();
    return this.filters.reverb;
  }
  /**
   * Enables / Disabels a Nightcore-like filter Effect. Disables/Overwrides both: custom and Vaporwave Filter
   * @param speed
   * @param pitch
   * @param rate
   * @returns
   */
  public async toggleNightcore(
    speed = 1.289999523162842,
    pitch = 1.289999523162842,
    rate = 0.9365999523162842
  ): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("timescale"))
      throw new Error(
        "Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)"
      );
    this.filterData.timescale.speed = this.filters.nightcore ? 1 : speed;
    this.filterData.timescale.pitch = this.filters.nightcore ? 1 : pitch;
    this.filterData.timescale.rate = this.filters.nightcore ? 1 : rate;

    this.filters.nightcore = !this.filters.nightcore;
    this.filters.vaporwave = false;
    this.filters.custom = false;
    await this.updatePlayerFilters();
    return this.filters.nightcore;
  }
  /**
   * Enables / Disabels a Vaporwave-like filter Effect. Disables/Overwrides both: custom and nightcore Filter
   * @param speed
   * @param pitch
   * @param rate
   * @returns
   */
  public async toggleVaporwave(
    speed = 0.8500000238418579,
    pitch = 0.800000011920929,
    rate = 1
  ): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("timescale"))
      throw new Error(
        "Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)"
      );
    this.filterData.timescale.speed = this.filters.vaporwave ? 1 : speed;
    this.filterData.timescale.pitch = this.filters.vaporwave ? 1 : pitch;
    this.filterData.timescale.rate = this.filters.vaporwave ? 1 : rate;

    this.filters.vaporwave = !this.filters.vaporwave;
    this.filters.nightcore = false;
    this.filters.custom = false;
    await this.updatePlayerFilters();
    return this.filters.vaporwave;
  }
  /**
   * Enable / Disables a Karaoke like Filter Effect
   * @param level
   * @param monoLevel
   * @param filterBand
   * @param filterWidth
   * @returns
   */
  public async toggleKaraoke(
    level = 1,
    monoLevel = 1,
    filterBand = 220,
    filterWidth = 100
  ): Promise<boolean> {
    if (this.node.info && !this.node.info?.filters?.includes("karaoke"))
      throw new Error(
        "Node#Info#filters does not include the 'karaoke' Filter (Node has it not enable)"
      );

    this.filterData.karaoke.level = this.filters.karaoke ? 0 : level;
    this.filterData.karaoke.monoLevel = this.filters.karaoke ? 0 : monoLevel;
    this.filterData.karaoke.filterBand = this.filters.karaoke ? 0 : filterBand;
    this.filterData.karaoke.filterWidth = this.filters.karaoke
      ? 0
      : filterWidth;

    this.filters.karaoke = !this.filters.karaoke;
    await this.updatePlayerFilters();
    return this.filters.karaoke;
  }

  /** Function to find out if currently there is a custom timescamle etc. filter applied */
  public isCustomFilterActive(): boolean {
    this.filters.custom =
      !this.filters.nightcore &&
      !this.filters.vaporwave &&
      Object.values(this.filterData.timescale).some((d) => d !== 1);
    return this.filters.custom;
  }
  // function to update all filters at ONCE (and eqs)
  async updatePlayerFilters(): Promise<Player> {
    const sendData = { ...this.filterData };

    if (!this.filters.volume) delete sendData.volume;
    if (!this.filters.tremolo) delete sendData.tremolo;
    if (!this.filters.vibrato) delete sendData.vibrato;
    //if(!this.filters.karaoke) delete sendData.karaoke;
    if (!this.filters.echo) delete sendData.echo;
    if (!this.filters.reverb) delete sendData.reverb;
    if (!this.filters.lowPass) delete sendData.lowPass;
    if (!this.filters.karaoke) delete sendData.karaoke;
    //if(!this.filters.rotating) delete sendData.rotating;
    if (this.filters.audioOutput === "stereo") delete sendData.channelMix;
    const now = Date.now();
    if (!this.node.sessionId) {
      if (sendData.rotation) {
        // @ts-ignore
        sendData.rotating = sendData.rotation;
        delete sendData.rotation;
      } // on websocket it's called rotating, and on rest it's called rotation
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#updatePlayerFilters)"
      );
      await this.node.send({
        op: "filters",
        guildId: this.guild,
        equalizer: this.bands.map((gain, band) => ({ band, gain })),
        ...sendData,
      });
    } else {
      sendData.equalizer = this.bands.map((gain, band) => ({ band, gain }));
      for (const key of [...Object.keys(sendData)]) {
        if (this.node.info && !this.node.info?.filters?.includes?.(key))
          delete sendData[key];
      }
      await this.node.updatePlayer({
        guildId: this.guild,
        playerOptions: {
          filters: sendData,
        },
      });
    }
    this.ping = Date.now() - now;
    if (this.options.instaUpdateFiltersFix === true) this.filterUpdated = 1;
    return this;
  }
  /**
   * Same as Manager#search() but a shortcut on the player itself. Custom Node is provided via player.node internally
   * @param query
   * @param requester
   */
  public search(
    query: string | SearchQuery,
    requester?: string
  ): Promise<SearchResult> {
    return this.manager.search(query, requester, this.node);
  }

  /**
   * Sets the players equalizer band on-top of the existing ones.
   * @param bands
   */
  public async setEQ(...bands: EqualizerBand[]): Promise<this> {
    // Hacky support for providing an array
    if (Array.isArray(bands[0])) bands = bands[0] as unknown as EqualizerBand[];

    if (
      !bands.length ||
      !bands.every(
        (band) => JSON.stringify(Object.keys(band).sort()) === '["band","gain"]'
      )
    )
      throw new TypeError(
        "Bands must be a non-empty object array containing 'band' and 'gain' properties."
      );

    for (const { band, gain } of bands) this.bands[band] = gain;
    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#setEQ)"
      );
      await this.node.send({
        op: "filters",
        guildId: this.guild,
        equalizer: this.bands.map((gain, band) => ({ band, gain })),
      });
    } else {
      await this.node.updatePlayer({
        guildId: this.guild,
        playerOptions: {
          filters: {
            equalizer: this.bands.map((gain, band) => ({ band, gain })),
          },
        },
      });
    }
    return this;
  }

  /** Clears the equalizer bands. */
  public async clearEQ(): Promise<this> {
    this.bands = new Array(15).fill(0.0);
    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#clearEQ)"
      );
      await this.node.send({
        op: "filters",
        guildId: this.guild,
        equalizer: this.bands.map((gain, band) => ({ band, gain })),
      });
    } else {
      await this.node.updatePlayer({
        guildId: this.guild,
        playerOptions: {
          filters: {
            equalizer: this.bands.map((gain, band) => ({ band, gain })),
          },
        },
      });
    }
    return this;
  }

  /** Connect to the voice channel. */
  public connect(): this {
    if (!this.voiceChannel)
      throw new RangeError("No voice channel has been set.");
    this.state = "CONNECTING";

    this.manager.options.send(this.guild, {
      op: 4,
      d: {
        guild_id: this.guild,
        channel_id: this.voiceChannel,
        self_mute: this.options.selfMute || false,
        self_deaf: this.options.selfDeafen || false,
      },
    });

    this.state = "CONNECTED";
    return this;
  }

  /** Disconnect from the voice channel. */
  public disconnect(): this {
    if (this.voiceChannel === null) return this;
    this.state = "DISCONNECTING";

    this.pause(true);
    this.manager.options.send(this.guild, {
      op: 4,
      d: {
        guild_id: this.guild,
        channel_id: null,
        self_mute: false,
        self_deaf: false,
      },
    });

    this.voiceChannel = null;
    this.state = "DISCONNECTED";
    return this;
  }

  /** Destroys the player. */
  public async destroy(disconnect = true): Promise<void> {
    this.state = "DESTROYING";
    if (disconnect) {
      this.disconnect();
    }

    await this.node.destroyPlayer(this.guild);

    this.manager.emit("playerDestroy", this);
    this.manager.players.delete(this.guild);
  }

  /**
   * Sets the player voice channel.
   * @param channel
   */
  public setVoiceChannel(channel: string): this {
    if (typeof channel !== "string")
      throw new TypeError("Channel must be a non-empty string.");

    this.voiceChannel = channel;
    this.connect();
    return this;
  }

  /**
   * Sets the player text channel.
   * @param channel
   */
  public setTextChannel(channel: string): this {
    if (typeof channel !== "string")
      throw new TypeError("Channel must be a non-empty string.");

    this.textChannel = channel;
    return this;
  }

  /** Plays the next track. */
  public async play(): Promise<void>;

  /**
   * Plays the specified track.
   * @param track
   */
  public async play(track: Track | UnresolvedTrack): Promise<void>;

  /**
   * Plays the next track with some options.
   * @param options
   */
  public async play(options: PlayOptions): Promise<void>;

  /**
   * Plays the specified track with some options.
   * @param track
   * @param options
   */
  public async play(
    track: Track | UnresolvedTrack,
    options: PlayOptions
  ): Promise<void>;
  public async play(
    optionsOrTrack?: PlayOptions | Track | UnresolvedTrack,
    playOptions?: PlayOptions
  ): Promise<void> {
    if (
      typeof optionsOrTrack !== "undefined" &&
      TrackUtils.validate(optionsOrTrack)
    ) {
      if (this.queue.current) this.queue.previous = this.queue.current;
      this.queue.current = optionsOrTrack as Track;
    }

    if (!this.queue.current) throw new RangeError("No current track.");

    const finalOptions = getOptions(
      playOptions || optionsOrTrack,
      !!this.node.sessionId
    )
      ? (optionsOrTrack as PlayOptions)
      : {};

    if (TrackUtils.isUnresolvedTrack(this.queue.current)) {
      try {
        this.queue.current = await TrackUtils.getClosestTrack(
          this.queue.current as UnresolvedTrack,
          this.node
        );
      } catch (error) {
        this.manager.emit("trackError", this, this.queue.current, error);
        if (this.queue[0]) return this.play(this.queue[0]);
        return;
      }
    }

    const options = {
      guildId: this.guild,
      encodedTrack: this.queue.current.track,
      ...finalOptions,
    };

    if (typeof options.encodedTrack !== "string") {
      options.encodedTrack = (options.encodedTrack as Track).track;
    }
    if (typeof options.volume === "number" && !isNaN(options.volume)) {
      this.volume = Math.max(Math.min(options.volume, 500), 0);
      let vol = Number(this.volume);
      if (this.manager.options.volumeDecrementer)
        vol *= this.manager.options.volumeDecrementer;
      this.lavalinkVolume = Math.floor(vol * 100) / 100;
      options.volume = vol;
    }

    this.set("lastposition", this.position);

    const now = Date.now();
    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#play)"
      );
      await this.node.send({
        track: options.encodedTrack,
        op: "play",
        guildId: this.guild,
        ...finalOptions,
      });
    } else {
      await this.node.updatePlayer({
        guildId: this.guild,
        noReplace: finalOptions.noReplace ?? false,
        playerOptions: options,
      });
    }
    this.ping = Date.now() - now;
    return;
  }

  /**
   * Sets the player volume.
   * @param volume 0-500
   */
  public async setVolume(volume: number): Promise<this> {
    volume = Number(volume);

    if (isNaN(volume)) throw new TypeError("Volume must be a number.");
    this.volume = Math.max(Math.min(volume, 500), 0);

    let vol = Number(this.volume);
    if (this.manager.options.volumeDecrementer)
      vol *= this.manager.options.volumeDecrementer;

    this.lavalinkVolume = Math.floor(vol * 100) / 100;

    const now = Date.now();
    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#setVolume)"
      );
      await this.node.send({
        op: "volume",
        guildId: this.guild,
        volume: vol,
      });
    } else {
      if (this.manager.options.applyVolumeAsFilter) {
        await this.node.updatePlayer({
          guildId: this.guild,
          playerOptions: {
            filters: { volume: vol / 100 },
          },
        });
      } else {
        await this.node.updatePlayer({
          guildId: this.guild,
          playerOptions: {
            volume: vol,
          },
        });
      }
    }
    this.ping = Date.now() - now;
    return this;
  }

  /**
   * Applies a Node-Filter for Volume (make it louder/quieter without distortion | only for new REST api).
   * @param volume 0-5
   */
  public async setVolumeFilter(volume: number): Promise<this> {
    if (!this.node.sessionId)
      throw new Error(
        "The Lavalink-Node is either not ready, or not up to date! (REST Api must be useable)"
      );
    volume = Number(volume);

    if (isNaN(volume)) throw new TypeError("Volume must be a number.");
    this.filterData.volume = Math.max(Math.min(volume, 5), 0);
    this.filters.volume = this.filterData.volume === 1 ? false : true;

    const now = Date.now();
    await this.node.updatePlayer({
      guildId: this.guild,
      playerOptions: {
        filters: { volume: this.filterData.volume },
      },
    });
    this.ping = Date.now() - now;
    return this;
  }

  /**
   * Sets the track repeat.
   * @param repeat
   */
  public setTrackRepeat(repeat: boolean): this {
    if (typeof repeat !== "boolean")
      throw new TypeError('Repeat can only be "true" or "false".');

    if (repeat) {
      this.trackRepeat = true;
      this.queueRepeat = false;
    } else {
      this.trackRepeat = false;
      this.queueRepeat = false;
    }

    return this;
  }

  /**
   * Sets the queue repeat.
   * @param repeat
   */
  public setQueueRepeat(repeat: boolean): this {
    if (typeof repeat !== "boolean")
      throw new TypeError('Repeat can only be "true" or "false".');

    if (repeat) {
      this.trackRepeat = false;
      this.queueRepeat = true;
    } else {
      this.trackRepeat = false;
      this.queueRepeat = false;
    }

    return this;
  }

  /** Stops the current track, optionally give an amount to skip to, e.g 5 would play the 5th song. */
  public async stop(amount?: number): Promise<this> {
    if (typeof amount === "number" && amount > 1) {
      if (amount > this.queue.length)
        throw new RangeError("Cannot skip more than the queue length.");
      this.queue.splice(0, amount - 1);
    }

    const now = Date.now();
    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#stop)"
      );
      await this.node.send({
        op: "stop",
        guildId: this.guild,
      });
    } else {
      await this.node.updatePlayer({
        guildId: this.guild,
        playerOptions: { encodedTrack: null },
      });
    }
    this.ping = Date.now() - now;

    return this;
  }

  /**
   * Pauses the current track.
   * @param pause
   */
  public async pause(paused: boolean): Promise<this> {
    if (typeof paused !== "boolean")
      throw new RangeError('Pause can only be "true" or "false".');

    // If already paused or the queue is empty do nothing https://github.com/MenuDocs/erela.js/issues/58
    if (this.paused === paused || !this.queue.totalSize) return this;

    this.playing = !paused;
    this.paused = paused;

    const now = Date.now();

    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#pause)"
      );
      await this.node.send({
        op: "pause",
        guildId: this.guild,
        pause: paused,
      });
    } else {
      await this.node.updatePlayer({
        guildId: this.guild,
        playerOptions: { paused },
      });
    }

    this.ping = Date.now() - now;

    return this;
  }

  /**
   * Seeks to the position in the current track.
   * @param position
   */
  public async seek(position: number): Promise<this> {
    if (!this.queue.current) return undefined;
    position = Number(position);

    if (isNaN(position)) {
      throw new RangeError("Position must be a number.");
    }
    if (position < 0 || position > this.queue.current.duration)
      position = Math.max(Math.min(position, this.queue.current.duration), 0);

    this.position = position;
    this.set("lastposition", this.position);

    const now = Date.now();

    if (!this.node.sessionId) {
      console.warn(
        "@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST (player#seek)"
      );
      await this.node.send({
        op: "seek",
        guildId: this.guild,
        position,
      });
    } else {
      await this.node.updatePlayer({
        guildId: this.guild,
        playerOptions: { position },
      });
    }
    this.ping = Date.now() - now;
    return this;
  }
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
  /** If the Track is a preview */
  isPreview: boolean;
  /** v4: If the Track has a artworkUrl --> will overwrite thumbnail too! (if not a youtube video) */
  artworkUrl: string | null;
  /** v4: ISRC if available */
  isrc: string | null;
  /** v4: Sourcename of how you found that track! */
  sourceName: LavalinkSearchPlatform | string | null;
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
  /** v4: If the Track has a artworkUrl --> will overwrite thumbnail too! (if not a youtube video) */
  artworkUrl: string | null;
  /** v4: If the Track has a ISRC */
  isrc?: string | null;
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

function getOptions(
  opts?: any,
  allowFilters?: boolean
): Partial<PlayOptions> | false {
  const valids = [
    "startTime",
    "endTime",
    "noReplace",
    "volume",
    "pause",
    "filters",
  ];
  const returnObject = {} as PlayOptions;
  if (!opts) return false;
  for (const [key, value] of Object.entries(Object.assign({}, opts))) {
    if (
      valids.includes(key) &&
      (key !== "filters" || (key === "filters" && allowFilters))
    ) {
      returnObject[key] = value;
    }
  }
  return returnObject as PlayOptions;
}
