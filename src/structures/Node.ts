/* eslint-disable no-case-declarations */
import WebSocket from "ws";
import { Dispatcher, Pool } from "undici";
import { isAbsolute } from "path";
import { Manager } from "./Manager";
import { Player, PlayOptions, Track, UnresolvedTrack } from "./Player";
import {
  InvalidLavalinkRestRequest,
  LavalinkPlayer,
  PlayerEvent,
  PlayerEvents,
  PlayerUpdateInfo,
  RoutePlanner,
  Session,
  Structure,
  TrackEndEvent,
  TrackExceptionEvent,
  TrackStartEvent,
  TrackStuckEvent,
  TrackUtils,
  WebSocketClosedEvent,
} from "./Utils";
import internal from "node:stream";

function check(options: NodeOptions) {
  if (!options) throw new TypeError("NodeOptions must not be empty.");

  if (typeof options.host !== "string" || !/.+/.test(options.host))
    throw new TypeError('Node option "host" must be present and be a non-empty string.');

  if (typeof options.port !== "undefined" && typeof options.port !== "number")
    throw new TypeError('Node option "port" must be a number.');

  if (typeof options.password !== "undefined" && (typeof options.password !== "string" || !/.+/.test(options.password)))
    throw new TypeError('Node option "password" must be a non-empty string.');

  if (typeof options.secure !== "undefined" && typeof options.secure !== "boolean")
    throw new TypeError('Node option "secure" must be a boolean.');

  if (typeof options.identifier !== "undefined" && typeof options.identifier !== "string")
    throw new TypeError('Node option "identifier" must be a non-empty string.');

  if (typeof options.retryAmount !== "undefined" && typeof options.retryAmount !== "number")
    throw new TypeError('Node option "retryAmount" must be a positive number.');

  if (typeof options.retryDelay !== "undefined" && typeof options.retryDelay !== "number")
    throw new TypeError('Node option "retryDelay" must be a positive number.');

  if (typeof options.requestTimeout !== "undefined" && typeof options.requestTimeout !== "number")
    throw new TypeError('Node option "requestTimeout" must be a positive number.');

  if(typeof options.poolOptions !== "undefined" && typeof options.poolOptions !== "object") 
    throw new TypeError("Node option 'poolOptions' must be a correct undicie Http pool options-Object!");

  if(typeof options.regions !== "undefined" && !Array.isArray(options.regions))
    throw new TypeError("Node option 'regions' must an Array of Strings: string[]");

  if(typeof options.regions !== "undefined" && !options.regions.every(region => typeof region === "string"))
    throw new TypeError("Node option 'regions' must an Array of Strings: string[]");

  if(typeof options.version !== "undefined" && typeof options.version !== "string" && !["v2", "v3"].includes(options.version))
    throw new TypeError("Node Option 'version' must be either v2 or v3");

  if(typeof options.useVersionPath !== "undefined" && typeof options.useVersionPath !== "boolean") 
    throw new TypeError("Node Option 'useVersionPath' must be a Boolean");

  return true;
}

export type LavalinkVersion = "v2" | "v3" | "v4";

export class Node {
  /** The socket for the node. */
  public socket: WebSocket | null = null;
  /** The HTTP pool used for rest calls. */
  public http: Pool;
  /** The amount of rest calls the node has made. */
  public calls = 0;
  /** The stats for the node. */
  public stats: NodeStats;
  public manager: Manager

  public version: LavalinkVersion = "v3";
  public initialized: boolean = false;

  public sessionId?: string|null = null;

  public regions: string[];
  private static _manager: Manager;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 1;
  
  public info: LavalinkInfo|null = null;

  public useVersionPath = true;

  /** Returns if connected to the Node. */
  public get connected(): boolean {
    if (!this.socket) return false;
    return this.socket.readyState === WebSocket.OPEN;
  }

  /** Returns the address for this node. */
  public get address(): string {
    return `${this.options.host}:${this.options.port}`;
  }

  /** @hidden */
  public static init(manager: Manager): void {
    this._manager = manager;
  }

  public get poolAddress() {
    return `http${this.options.secure ? "s" : ""}://${this.address}`;
  }
  /**
   * Creates an instance of Node.
   * @param options
   */
  constructor(public options: NodeOptions) {
    if (!this.manager) this.manager = Structure.get("Node")._manager;
    if (!this.manager) throw new RangeError("Manager has not been initiated.");

    if (this.manager.nodes.has(options.identifier || options.host)) {
      return this.manager.nodes.get(options.identifier || options.host);
    }

    check(options);

    if (typeof this.options.version === "string") this.version = this.options.version;
    if (typeof this.options.useVersionPath === "boolean") this.useVersionPath = this.options.useVersionPath;

    this.options = {
      port: 2333,
      password: "youshallnotpass",
      secure: false,
      retryAmount: 5,
      retryDelay: 30e3,
      requestTimeout: 10e3,
      ...options,
    };

    if (this.options.secure) {
      this.options.port = 443;
    }
    this.http = new Pool(this.poolAddress, this.options.poolOptions);
    this.regions = options.regions?.map?.(x => x?.toLowerCase?.()) || [];
        
    this.options.identifier = options.identifier || options.host;
    this.stats = {
      players: 0,
      playingPlayers: 0,
      uptime: 0,
      memory: {
        free: 0,
        used: 0,
        allocated: 0,
        reservable: 0,
      },
      cpu: {
        cores: 0,
        systemLoad: 0,
        lavalinkLoad: 0,
      },
      frameStats: {
        sent: 0,
        nulled: 0,
        deficit: 0,
      },
    };

    if(this.version === "v4" && !this.useVersionPath) {
      console.error(`@deprecation-warning erela.js - ${this.version} was provided which requires #useVersionPath to be false --> set it to true for you!`)
      this.useVersionPath = true;
    }
    if(this.version && !["v3", "v4"].includes(this.version) && this.useVersionPath) {
      console.error(`@deprecation-warning erela.js - ${this.version} was provided which does not allow #useVersionPath to be true --> set it to false for you!`)
      this.useVersionPath = false;
    }
    if(!this.version) {
      console.error(`erela.js - For Node: ${this.options.identifier} - ${this.address} was no Version provided --> using v3 as a fallback`);
      this.version = "v3";
      this.useVersionPath = true;
    }

    this.manager.nodes.set(this.options.identifier, this);
    this.manager.emit("nodeCreate", this);
  }
  public async fetchInfo(): Promise<LavalinkInfo|null> {
    if(!this.sessionId) throw new Error("The Lavalink-Node is either not ready, or not up to date!");
    const resInfo = await this.makeRequest(`/info`, r => r.path = `/${["v3", "v4"].includes(this.version) ? this.version : "v3"}/info` ).catch(console.warn) || null;
    return resInfo as LavalinkInfo|null;
  }
  public async fetchVersion(): Promise<string|null> {
    if(!this.sessionId) throw new Error("The Lavalink-Node is either not ready, or not up to date!");
    const resInfo = await this.makeTextRequest(`/version`, r => r.path = "/version").catch(console.warn) || null;
    return resInfo as string|null;
  }
  /**
   * Gets all Players of a Node
   */
  public async getPlayers(): Promise<LavalinkPlayer[]> {
    if(!this.sessionId) throw new Error("The Lavalink-Node is either not ready, or not up to date!");
    const players = await this.makeRequest(`/sessions/${this.sessionId}/players`) as LavalinkPlayer[];
    if (!Array.isArray(players)) return [];
    else return players;
  }
  /**
   * Gets specific Player Information
   */
  public async getPlayer(guildId: string): Promise<LavalinkPlayer|{}> {
    if(!this.sessionId) throw new Error("The Lavalink-Node is either not ready, or not up to date!");
    return await this.makeRequest(`/sessions/${this.sessionId}/players/${guildId}`) as LavalinkPlayer | InvalidLavalinkRestRequest | null;
  }
  public async updatePlayer(data: PlayerUpdateInfo): Promise<LavalinkPlayer|{}> {
    if(!this.sessionId) throw new Error("The Lavalink-Node is either not ready, or not up to date!");
    this.syncPlayerData(data);
    const res = await this.makeRequest<LavalinkPlayer>(`/sessions/${this.sessionId}/players/${data.guildId}`, (r) => {
      r.method = "PATCH";
      r.headers = { Authorization: this.options.password, 'Content-Type': 'application/json' };
      r.body = JSON.stringify(data.playerOptions);
      if(data.noReplace) { 
        const url = new URL(`${this.poolAddress}${r.path}`);
        url.searchParams.append("noReplace", data.noReplace?.toString() || "false")
        r.path = url.toString().replace(this.poolAddress, "");
        console.log(r.path);
      }
    });
    this.syncPlayerData({}, res);
    return res;
  }
  private syncPlayerData(data:Partial<PlayerUpdateInfo>, res?:LavalinkPlayer) {
    if(("guildId" in data)) {
      const player = this.manager.players.get(data.guildId);
      if(!player) return;
      if(typeof data.playerOptions.paused !== "undefined") {
        player.paused = data.playerOptions.paused;
        player.playing = !data.playerOptions.paused;
      }
  
      if(typeof data.playerOptions.position !== "undefined") player.position = data.playerOptions.position
      if(typeof data.playerOptions.voice !== "undefined") player.voice = data.playerOptions.voice;
      if(typeof data.playerOptions.volume !== "undefined") {
        if (this.manager.options.volumeDecrementer) {
          player.volume = data.playerOptions.volume;
          player.lavalinkVolume = data.playerOptions.volume * this.manager.options.volumeDecrementer;
        } else {
          player.volume = data.playerOptions.volume;
          player.lavalinkVolume = data.playerOptions.volume;
        }
      }
      if(typeof data.playerOptions.filters !== "undefined") {
        const oldFilterTimescale = { ...(player.filterData.timescale||{}) };
        Object.freeze(oldFilterTimescale);
        if(data.playerOptions.filters.timescale) player.filterData.timescale = data.playerOptions.filters.timescale;
        if(data.playerOptions.filters.distortion) player.filterData.distortion = data.playerOptions.filters.distortion;
        if(data.playerOptions.filters.echo) player.filterData.echo = data.playerOptions.filters.echo;
        if(data.playerOptions.filters.vibrato) player.filterData.vibrato = data.playerOptions.filters.vibrato;
        if(data.playerOptions.filters.volume) player.filterData.volume = data.playerOptions.filters.volume;
        if(data.playerOptions.filters.equalizer) player.filterData.equalizer = data.playerOptions.filters.equalizer;
        if(data.playerOptions.filters.karaoke) player.filterData.karaoke = data.playerOptions.filters.karaoke;
        if(data.playerOptions.filters.lowPass) player.filterData.lowPass = data.playerOptions.filters.lowPass;
        if(data.playerOptions.filters.rotation) player.filterData.rotation = data.playerOptions.filters.rotation;
        if(data.playerOptions.filters.tremolo) player.filterData.tremolo = data.playerOptions.filters.tremolo;
        player.checkFiltersState(oldFilterTimescale);        
      };
    }
    if(res?.guildId === "string" && typeof res?.voice !== "undefined") {
      const player = this.manager.players.get(data.guildId);
      if(!player) return;

      if(typeof res?.voice?.connected === "boolean" && res.voice.connected === false) return player.destroy();
      player.wsPing = res?.voice?.ping || player?.wsPing;
    }
    return true;    
  }
  
  /**
   * Deletes a Lavalink Player (from Lavalink)
   * @param guildId
   */
  public async destroyPlayer(guildId: string): Promise<void> {
    if(!this.sessionId) {
      console.warn("@deprecated - The Lavalink-Node is either not up to date (or not ready)! -- Using WEBSOCKET instead of REST");
      await this.send({
        op: "destroy",
        guildId: guildId
      });
      return;
    }
    await this.makeRequest(`/sessions/${this.sessionId}/players/${guildId}`, r => {
      r.method = "DELETE";
    })
    return;
  }

  /**
   * Updates the session with a resuming key and timeout
   * @param resumingKey 
   * @param timeout
   */
  public updateSession(resumingKey?: string, timeout?: number): Promise<Session|{}> {
    if(!this.sessionId) throw new Error("the Lavalink-Node is either not ready, or not up to date!");
    return this.makeRequest(`/sessions/${this.sessionId}`, r => {
      r.method = "PATCH";
      r.headers = { Authorization: this.options.password, 'Content-Type': 'application/json' }
      r.body = JSON.stringify({ resumingKey, timeout });
    });
  }

  /**
   * Gets the stats of this node
   */
  public fetchStats(): Promise<NodeStats|{}> {
    return this.makeRequest(`/stats`);
  }

  /**
   * Get routplanner Info from Lavalink
   */
  public getRoutePlannerStatus(): Promise<RoutePlanner> {
    if(!this.sessionId) throw new Error("the Lavalink-Node is either not ready, or not up to date!");
      return this.makeRequest(`/routeplanner/status`);
  }

  /**
   * Release blacklisted IP address into pool of IPs
   * @param address IP address
   */
  public async unmarkFailedAddress(address: string): Promise<void> {
    if(!this.sessionId) throw new Error("the Lavalink-Node is either not ready, or not up to date!");
      await this.makeRequest(`/routeplanner/free/address`, r => {
        r.method = "POST";
        r.headers = { Authorization: this.options.password, 'Content-Type': 'application/json' };
        r.body = JSON.stringify({ address });
      });
  }
  /**
   * Release blacklisted IP address into pool of IPs
   * @param address IP address
   */
  public async unmarkAllFailedAddresses(): Promise<void> {
    if(!this.sessionId) throw new Error("the Lavalink-Node is either not ready, or not up to date!");
      await this.makeRequest(`/routeplanner/free/all`, r => {
        r.method = "POST";
        r.headers = { Authorization: this.options.password, 'Content-Type': 'application/json' };
      });
  }

  /** Connects to the Node. */
  public connect(): void {
    if (this.connected) return;

    const headers = {
      Authorization: this.options.password,
      "Num-Shards": String(this.manager.options.shards),
      "User-Id": this.manager.options.clientId,
      "Client-Name": this.manager.options.clientName,
    };

    if(!this.initialized) this.initialized = true;

    this.socket = new WebSocket(`ws${this.options.secure ? "s" : ""}://${this.address}${["v3", "v4"].includes(this.version) ? `/${this.version}/websocket` : ``}`, { headers });
    this.socket.on("open", this.open.bind(this));
    this.socket.on("close", this.close.bind(this));
    this.socket.on("message", this.message.bind(this));
    this.socket.on("error", this.error.bind(this));
  }

  /** Destroys the Node and all players connected with it. */
  public destroy(): void {
    if (!this.connected) return;

    const players = this.manager.players.filter(p => p.node == this);
    if (players.size) players.forEach(p => p.destroy());

    this.socket.close(1000, "destroy");
    this.socket.removeAllListeners();
    this.socket = null;

    this.reconnectAttempts = 1;
    clearTimeout(this.reconnectTimeout);

    this.manager.emit("nodeDestroy", this);
    this.manager.destroyNode(this.options.identifier);
  }

  /**
   * Makes an API call to the Node
   * @param endpoint The endpoint that we will make the call to
   * @param modify Used to modify the request before being sent
   * @returns The returned data
   */
  public async makeRequest<T>(endpoint: string, modify?: ModifyRequest): Promise<T> {
    const options: Dispatcher.RequestOptions = {
      path: `${this.useVersionPath && this.version ? `/${this.version}` : ""}/${endpoint.replace(/^\//gm, "")}`,
      method: "GET",
      headers: {
        Authorization: this.options.password
      },
      headersTimeout: this.options.requestTimeout,
    }

    modify?.(options);

    if(this.version === "v3" || this.version === "v4") {
      const url = new URL(`${this.poolAddress}${options.path}`);
      url.searchParams.append("trace", "true");
      options.path = url.toString().replace(this.poolAddress, "");
    }

    const request = await this.http.request(options);
    this.calls++;

    if(options.method === "DELETE") return;

    return await request.body.json();
  }

  /**
   * Makes an API call to the Node and returns it as TEXT
   * @param endpoint The endpoint that we will make the call to
   * @param modify Used to modify the request before being sent
   * @returns The returned data
   */
  public async makeTextRequest<T>(endpoint: string, modify?: ModifyRequest): Promise<T> {
    const options: Dispatcher.RequestOptions = {
      path: `${this.useVersionPath && this.version ? `/${this.version}` : ""}/${endpoint.replace(/^\//gm, "")}`,
      method: "GET",
      headers: {
        Authorization: this.options.password
      },
      headersTimeout: this.options.requestTimeout,
    }

    modify?.(options);

    if(this.version === "v3" || this.version === "v4") {
      const url = new URL(`${this.poolAddress}${options.path}`);
      url.searchParams.append("trace", "true");
      options.path = url.toString().replace(this.poolAddress, "");
    }

    const request = await this.http.request(options);
    this.calls++;

    if(options.method === "DELETE") return;

    return await request.body.text() as T;
  }

  /**
   * Sends data to the Node.
   * @param data
   */
  public send(data: unknown): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.connected) return resolve(false);
      if (!data || !JSON.stringify(data).startsWith("{")) {
        return reject(false);
      }
      this.socket.send(JSON.stringify(data), (error: Error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });
  }

  private reconnect(): void {
    this.reconnectTimeout = setTimeout(() => {
      if (this.reconnectAttempts >= this.options.retryAmount) {
        const error = new Error(`Unable to connect after ${this.options.retryAmount} attempts.`)

        this.manager.emit("nodeError", this, error);
        return this.destroy();
      }
      this.socket.removeAllListeners();
      this.socket = null;
      this.manager.emit("nodeReconnect", this);
      this.connect();
      this.reconnectAttempts++;
    }, this.options.retryDelay);
  }

  protected open(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.manager.emit("nodeConnect", this);
    setTimeout(() => {
      this.fetchInfo().then(x => this.info = x).catch(() => null).then(() => {
        if(!this.info && ["v3", "v4"].includes(this.version)) {
          const errorString = `Lavalink Node (${this.address}) does not provide any /${this.useVersionPath ? `${this.version}/` : ""}info --> but Version: ${this.version} was provided which means, Lavalink is not up to date! --> set #useVersionPath to false + set it so that`;
          this.useVersionPath = false; // fix it
          this.options.useVersionPath = false;
          throw new Error(errorString);
        }
      });
    }, 1500);
  }

  protected close(code: number, reason: string): void {
    this.manager.emit("nodeDisconnect", this, { code, reason });
    if (code !== 1000 || reason !== "destroy") this.reconnect();
  }

  protected error(error: Error): void {
    if (!error) return;
    this.manager.emit("nodeError", this, error);
  }

  protected message(d: Buffer | string): void {
    if (Array.isArray(d)) d = Buffer.concat(d);
    else if (d instanceof ArrayBuffer) d = Buffer.from(d);

    const payload = JSON.parse(d.toString());

    if (!payload.op) return;
    this.manager.emit("nodeRaw", payload);

    switch (payload.op) {
      case "stats":
        delete payload.op;
        this.stats = ({ ...payload } as unknown) as NodeStats;
        break;
      case "playerUpdate":
        const player = this.manager.players.get(payload.guildId);
        if (player) {
          delete payload.op;
          player.payload = Object.assign({}, payload)

          if(player.get("updateInterval")) clearInterval(player.get("updateInterval"))
          player.position = payload.state.position || 0;
          player.set("lastposition", player.position);
          player.connected = payload.state.connected;
          player.wsPing = payload.state.ping >= 0 ? payload.state.ping : player.wsPing <= 0 && player.connected ? null : player.wsPing || 0;
          
          if(!player.createdTimeStamp && payload.state.time) {
              player.createdTimeStamp = payload.state.time;
              player.createdAt = new Date(player.createdTimeStamp);
          }
          
          
          if(typeof this.manager.options.position_update_interval === "number" && this.manager.options.position_update_interval > 0) {
            let interValSelfCounter = (this.manager.options.position_update_interval ?? 250) as number;
            if(interValSelfCounter < 25) interValSelfCounter = 25;
            
            player.set("updateInterval", setInterval(() => {
              player.position += interValSelfCounter;
              player.set("lastposition", player.position);
              if(player.filterUpdated >= 1) {
                  player.filterUpdated++;
                  const maxMins = 8;
                  const currentDuration = player?.queue?.current?.duration || 0;
                  if(currentDuration <= maxMins*60_000 || isAbsolute(player?.queue?.current?.uri)) {
                    let maxSize = interValSelfCounter > 400 ? 2 : 3;
                    if(player.filterUpdated >= maxSize) {
                        player.filterUpdated = 0;
                        player.seek(player.position);
                    }
                  } else {
                    player.filterUpdated = 0;
                  }
              }
            }, interValSelfCounter));
          } else {
            if(player.filterUpdated >= 1) {
              const maxMins = 8;
              const currentDuration = player?.queue?.current?.duration || 0;
              if(currentDuration <= maxMins*60_000 || isAbsolute(player?.queue?.current?.uri)) {
                  player.seek(player.position);
              }
              player.filterUpdated = 0;
            }
          }
        }
        break;
      case "event":
        this.handleEvent(payload);
        break;
      case "ready":  // payload: { resumed: false, sessionId: 'ytva350aevn6n9n8', op: 'ready' }
          this.sessionId = payload.sessionId;
          // this.state = "CONNECTED";
          break;
      default:
        this.manager.emit("nodeError", this, new Error(`Unexpected op "${payload.op}" with data: ${JSON.stringify(payload)}`));
        return;
    }
  }

  protected handleEvent(payload: PlayerEvent & PlayerEvents): void {
    if (!payload.guildId) return;

    const player = this.manager.players.get(payload.guildId);
    if (!player) return;

    const track = player.queue.current;
    const type = payload.type;

    if (payload.type === "TrackStartEvent") {
      this.trackStart(player, track as Track, payload);
    } else if (payload.type === "TrackEndEvent") {
      this.trackEnd(player, track as Track, payload);
    } else if (payload.type === "TrackStuckEvent") {
      this.trackStuck(player, track as Track, payload);
    } else if (payload.type === "TrackExceptionEvent") {
      this.trackError(player, track, payload);
    } else if (payload.type === "WebSocketClosedEvent") {
      this.socketClosed(player, payload);
    } else {
      const error = new Error(`Node#event unknown event '${type}'.`);
      this.manager.emit("nodeError", this, error);
    }
  }

  protected trackStart(player: Player, track: Track, payload: TrackStartEvent): void {
    const finalOptions = player.get("finalOptions") as PlayOptions | undefined;
    if(finalOptions) {
        if(finalOptions.pause) {
            player.playing = !finalOptions.pause;
            player.paused = finalOptions.pause;
        }
        if(finalOptions.volume) player.volume = finalOptions.volume;
        if(finalOptions.startTime) player.position = finalOptions.startTime;
        player.set("finalOptions", undefined);
    } else {
        player.playing = true;
        player.paused = false;
    }
    this.manager.emit("trackStart", player, track, payload);
  }

  protected trackEnd(player: Player, track: Track, payload: TrackEndEvent): void {
    // If a track had an error while starting
    if (["LOAD_FAILED", "CLEAN_UP"].includes(payload.reason)) {
      player.queue.previous = player.queue.current;
      player.queue.current = player.queue.shift();

      if (!player.queue.current) return this.queueEnd(player, track, payload);

      this.manager.emit("trackEnd", player, track, payload);
      if (this.manager.options.autoPlay) player.play();
      return;
    }

    // If a track was forcibly played
    if (payload.reason === "REPLACED") {
      this.manager.emit("trackEnd", player, track, payload);
      return;
    }

    // If a track ended and is track repeating
    if (track && player.trackRepeat) {
      if (payload.reason === "STOPPED") {
        player.queue.previous = player.queue.current;
        player.queue.current = player.queue.shift();
      }

      if (!player.queue.current) return this.queueEnd(player, track, payload);

      this.manager.emit("trackEnd", player, track, payload);
      if (this.manager.options.autoPlay) player.play();
      return;
    }

    // If a track ended and is track repeating
    if (track && player.queueRepeat) {
      player.queue.previous = player.queue.current;

      if (payload.reason === "STOPPED") {
        player.queue.current = player.queue.shift();
        if (!player.queue.current) return this.queueEnd(player, track, payload);
      } else {
        player.queue.add(player.queue.current);
        player.queue.current = player.queue.shift();
      }

      this.manager.emit("trackEnd", player, track, payload);
      if (this.manager.options.autoPlay) player.play();
      return;
    }

    // If there is another song in the queue
    if (player.queue.length) {
      player.queue.previous = player.queue.current;
      player.queue.current = player.queue.shift();

      this.manager.emit("trackEnd", player, track, payload);
      if (this.manager.options.autoPlay) player.play();
      return;
    }

    // If there are no songs in the queue
    if (!player.queue.length) return this.queueEnd(player, track, payload);
  }


  protected queueEnd(player: Player, track: Track, payload: TrackEndEvent): void {
    player.queue.current = null;
    player.playing = false;
    this.manager.emit("queueEnd", player, track, payload);
  }

  protected trackStuck(player: Player, track: Track, payload: TrackStuckEvent): void {
    this.manager.emit("trackStuck", player, track, payload);
    player.stop();
  }

  protected trackError(
    player: Player,
    track: Track | UnresolvedTrack,
    payload: TrackExceptionEvent
  ): void {
    this.manager.emit("trackError", player, track, payload);
    player.stop();
  }

  protected socketClosed(player: Player, payload: WebSocketClosedEvent): void {
    this.manager.emit("socketClosed", player, payload);
  }
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