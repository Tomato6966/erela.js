"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.validAudioOutputs = void 0;
const Utils_1 = require("./Utils");
exports.validAudioOutputs = {
    mono: {
        leftToLeft: 0.5,
        leftToRight: 0.5,
        rightToLeft: 0.5,
        rightToRight: 0.5,
    },
    stereo: {
        leftToLeft: 1,
        leftToRight: 0,
        rightToLeft: 0,
        rightToRight: 1,
    },
    left: {
        leftToLeft: 0.5,
        leftToRight: 0,
        rightToLeft: 0.5,
        rightToRight: 0,
    },
    right: {
        leftToLeft: 0,
        leftToRight: 0.5,
        rightToLeft: 0,
        rightToRight: 0.5,
    },
};
function check(options) {
    if (!options)
        throw new TypeError("PlayerOptions must not be empty.");
    if (!/^\d+$/.test(options.guild))
        throw new TypeError('Player option "guild" must be present and be a non-empty string.');
    if (options.textChannel && !/^\d+$/.test(options.textChannel))
        throw new TypeError('Player option "textChannel" must be a non-empty string.');
    if (options.voiceChannel && !/^\d+$/.test(options.voiceChannel))
        throw new TypeError('Player option "voiceChannel" must be a non-empty string.');
    if (options.node && typeof options.node !== "string")
        throw new TypeError('Player option "node" must be a non-empty string.');
    if (typeof options.volume !== "undefined" &&
        typeof options.volume !== "number")
        throw new TypeError('Player option "volume" must be a number.');
    if (typeof options.selfMute !== "undefined" &&
        typeof options.selfMute !== "boolean")
        throw new TypeError('Player option "selfMute" must be a boolean.');
    if (typeof options.selfDeafen !== "undefined" &&
        typeof options.selfDeafen !== "boolean")
        throw new TypeError('Player option "selfDeafen" must be a boolean.');
}
class Player {
    options;
    /** The Queue for the Player. */
    queue = new (Utils_1.Structure.get("Queue"))();
    /** Whether the queue repeats the track. */
    trackRepeat = false;
    /** Whether the queue repeats the queue. */
    queueRepeat = false;
    /** The time the player is in the track. */
    position = 0;
    /** Whether the player is playing. */
    playing = false;
    /** Whether the player is paused. */
    paused = false;
    /** The volume for the player */
    volume;
    /** The Node for the Player. */
    node;
    /** The guild for the player. */
    guild;
    /** The voice channel for the player. */
    voiceChannel = null;
    /** The text channel for the player. */
    textChannel = null;
    /** The current state of the player. */
    state = "DISCONNECTED";
    /** The equalizer bands array. */
    bands = new Array(15).fill(0.0);
    /** The voice state object from Discord. */
    voiceState;
    /** The Manager. */
    manager;
    static _manager;
    data = {};
    /** Checker if filters should be updated or not! */
    filterUpdated;
    /** When the player was created [Date] (from lavalink) */
    createdAt;
    /** When the player was created [Timestamp] (from lavalink) */
    createdTimeStamp;
    /** If lavalink says it's connected or not */
    connected;
    /** Last sent payload from lavalink */
    payload;
    /** A Voice-Region for voice-regioned based - Node identification(s) */
    region;
    /** The Ping to the Lavalink Client in ms | < 0 == not connected | undefined == not defined yet. */
    ping;
    /** The Voice Connection Ping from Lavalink in ms | < 0 == not connected | null == lavalinkversion is < 3.5.1 in where there is no ping info. | undefined == not defined yet. */
    wsPing;
    /** All States of a Filter, however you can manually overwrite it with a string, if you need so */
    filters;
    /** The Current Filter Data(s) */
    filterData;
    /**
     * Set custom data.
     * @param key
     * @param value
     */
    set(key, value) {
        this.data[key] = value;
    }
    /**
     * Get custom data.
     * @param key
     */
    get(key) {
        return this.data[key];
    }
    /** @hidden */
    static init(manager) {
        this._manager = manager;
    }
    /**
     * Creates a new player, returns one if it already exists.
     * @param options
     */
    constructor(options) {
        this.options = options;
        if (!this.manager)
            this.manager = Utils_1.Structure.get("Player")._manager;
        if (!this.manager)
            throw new RangeError("Manager has not been initiated.");
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
        this.wsPing = undefined,
            /** The equalizer bands array. */
            this.bands = new Array(15).fill(0.0);
        this.set("lastposition", this.position);
        this.guild = options.guild;
        this.voiceState = Object.assign({ op: "voiceUpdate", guildId: options.guild });
        if (options.voiceChannel)
            this.voiceChannel = options.voiceChannel;
        if (options.textChannel)
            this.textChannel = options.textChannel;
        if (typeof options.instaUpdateFiltersFix === "undefined")
            this.options.instaUpdateFiltersFix = true;
        if (!this.manager.leastUsedNodes?.size) {
            if (this.manager.initiated)
                this.manager.initiated = false;
            this.manager.init(this.manager.options?.clientId);
        }
        this.region = options?.region;
        const node = this.manager.nodes.get(options.node);
        this.node = node || this.manager.leastUsedNodes.filter(x => x.regions?.includes(options.region?.toLowerCase()))?.first() || this.manager.leastUsedNodes.first();
        if (!this.node)
            throw new RangeError("No available nodes.");
        this.filters = {
            nightcore: false,
            echo: false,
            rotating: false,
            karaoke: false,
            tremolo: false,
            vibrato: false,
            lowPass: false,
            audioOutput: "stereo",
        };
        this.filterData = {
            lowPass: {
                smoothing: 0
            },
            karaoke: {
                level: 0,
                monoLevel: 0,
                filterBand: 0,
                filterWidth: 0
            },
            timescale: {
                speed: 1,
                pitch: 1,
                rate: 1 // 0 = x
            },
            echo: {
                delay: 0,
                decay: 0
            },
            rotating: {
                rotationHz: 0
            },
            tremolo: {
                frequency: 2,
                depth: 0.1 // 0 < x = 1
            },
            vibrato: {
                frequency: 2,
                depth: 0.1 // 0 < x = 1
            },
            channelMix: exports.validAudioOutputs.stereo,
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
    resetFilters() {
        this.filters.echo = false;
        this.filters.nightcore = false;
        this.filters.lowPass = false;
        this.filters.rotating = false;
        this.filters.tremolo = false;
        this.filters.vibrato = false;
        this.filters.karaoke = false;
        this.filters.karaoke = false;
        this.filters.audioOutput = "stereo";
        // disable all filters
        for (const [key, value] of Object.entries({
            lowPass: {
                smoothing: 0
            },
            karaoke: {
                level: 0,
                monoLevel: 0,
                filterBand: 0,
                filterWidth: 0
            },
            timescale: {
                speed: 1,
                pitch: 1,
                rate: 1 // 0 = x
            },
            echo: {
                delay: 0,
                decay: 0
            },
            rotating: {
                rotationHz: 0
            },
            tremolo: {
                frequency: 2,
                depth: 0.1 // 0 < x = 1
            },
            vibrato: {
                frequency: 2,
                depth: 0.1 // 0 < x = 1
            },
            channelMix: exports.validAudioOutputs.stereo,
        })) {
            this.filterData[key] = value;
        }
        return this.updatePlayerFilters();
        this.filters;
    }
    /**
     *
     * @param {AudioOutputs} type
     */
    setAudioOutput(type) {
        if (!type || !exports.validAudioOutputs[type])
            throw "Invalid audio type added, must be 'mono' / 'stereo' / 'left' / 'right'";
        this.filterData.channelMix = exports.validAudioOutputs[type];
        this.filters.audioOutput = type;
        return this.updatePlayerFilters(), this.filters.audioOutput;
    }
    // all effects possible to "toggle"
    toggleRotating(rotationHz = 0.2) {
        const filterDataName = "rotating", filterName = "rotating";
        this.filterData[filterDataName].rotationHz = this.filters[filterName] ? 0 : rotationHz;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    toggleVibrato(frequency = 2, depth = 0.5) {
        const filterDataName = "vibrato", filterName = "vibrato";
        this.filterData[filterDataName].frequency = this.filters[filterName] ? 0 : frequency;
        this.filterData[filterDataName].depth = this.filters[filterName] ? 0 : depth;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    toggleTremolo(frequency = 2, depth = 0.5) {
        const filterDataName = "tremolo", filterName = "tremolo";
        this.filterData[filterDataName].frequency = this.filters[filterName] ? 0 : frequency;
        this.filterData[filterDataName].depth = this.filters[filterName] ? 0 : depth;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    toggleLowPass(smoothing = 20) {
        const filterDataName = "lowPass", filterName = "lowPass";
        this.filterData[filterDataName].smoothing = this.filters[filterName] ? 0 : smoothing;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    toggleEcho(delay = 1, decay = 0.5) {
        const filterDataName = "echo", filterName = "echo";
        this.filterData[filterDataName].delay = this.filters[filterName] ? 0 : delay;
        this.filterData[filterDataName].decay = this.filters[filterName] ? 0 : decay;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    toggleNightcore(speed = 1.2999999523162842, pitch = 1.2999999523162842, rate = 1) {
        const filterDataName = "timescale", filterName = "nightcore";
        this.filterData[filterDataName].speed = this.filters[filterName] ? 1 : speed;
        this.filterData[filterDataName].pitch = this.filters[filterName] ? 1 : pitch;
        this.filterData[filterDataName].rate = this.filters[filterName] ? 1 : rate;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    toggleKaraoke(level = 1, monoLevel = 1, filterBand = 220, filterWidth = 100) {
        const filterDataName = "karaoke", filterName = "karaoke";
        this.filterData[filterDataName].level = this.filters[filterName] ? 0 : level;
        this.filterData[filterDataName].monoLevel = this.filters[filterName] ? 0 : monoLevel;
        this.filterData[filterDataName].filterBand = this.filters[filterName] ? 0 : filterBand;
        this.filterData[filterDataName].filterWidth = this.filters[filterName] ? 0 : filterWidth;
        this.filters[filterName] = !!!this.filters[filterName];
        return this.updatePlayerFilters(), this.filters[filterName];
    }
    // function to update all filters at ONCE (and eqs)
    async updatePlayerFilters() {
        const sendData = { ...this.filterData };
        if (!this.filters.tremolo)
            delete sendData.tremolo;
        if (!this.filters.vibrato)
            delete sendData.vibrato;
        //if(!this.filters.karaoke) delete sendData.karaoke;
        if (!this.filters.echo)
            delete sendData.echo;
        if (!this.filters.lowPass)
            delete sendData.lowPass;
        if (!this.filters.karaoke)
            delete sendData.karaoke;
        //if(!this.filters.rotating) delete sendData.rotating;
        if (this.filters.audioOutput === "stereo")
            delete sendData.channelMix;
        const now = Date.now();
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: {
                filters: { equalizer: this.bands.map((gain, band) => ({ band, gain })), ...sendData },
            }
        });
        this.ping = Date.now() - now;
        if (this.options.instaUpdateFiltersFix === true)
            this.filterUpdated = 1;
        return this;
    }
    /**
     * Same as Manager#search() but a shortcut on the player itself.
     * @param query
     * @param requester
     */
    search(query, requester) {
        return this.manager.search(query, requester);
    }
    /**
     * Sets the players equalizer band on-top of the existing ones.
     * @param bands
     */
    async setEQ(...bands) {
        // Hacky support for providing an array
        if (Array.isArray(bands[0]))
            bands = bands[0];
        if (!bands.length || !bands.every((band) => JSON.stringify(Object.keys(band).sort()) === '["band","gain"]'))
            throw new TypeError("Bands must be a non-empty object array containing 'band' and 'gain' properties.");
        for (const { band, gain } of bands)
            this.bands[band] = gain;
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: {
                filters: { equalizer: this.bands.map((gain, band) => ({ band, gain })) }
            }
        });
        return this;
    }
    /** Clears the equalizer bands. */
    async clearEQ() {
        this.bands = new Array(15).fill(0.0);
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: {
                filters: { equalizer: this.bands.map((gain, band) => ({ band, gain })) }
            }
        });
        return this;
    }
    /** Connect to the voice channel. */
    connect() {
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
    disconnect() {
        if (this.voiceChannel === null)
            return this;
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
    async destroy(disconnect = true) {
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
    setVoiceChannel(channel) {
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
    setTextChannel(channel) {
        if (typeof channel !== "string")
            throw new TypeError("Channel must be a non-empty string.");
        this.textChannel = channel;
        return this;
    }
    async play(optionsOrTrack, playOptions) {
        if (typeof optionsOrTrack !== "undefined" &&
            Utils_1.TrackUtils.validate(optionsOrTrack)) {
            if (this.queue.current)
                this.queue.previous = this.queue.current;
            this.queue.current = optionsOrTrack;
        }
        if (!this.queue.current)
            throw new RangeError("No current track.");
        const finalOptions = playOptions
            ? playOptions
            : getOptions(optionsOrTrack)
                ? optionsOrTrack
                : {};
        if (Utils_1.TrackUtils.isUnresolvedTrack(this.queue.current)) {
            try {
                this.queue.current = await Utils_1.TrackUtils.getClosestTrack(this.queue.current);
            }
            catch (error) {
                this.manager.emit("trackError", this, this.queue.current, error);
                if (this.queue[0])
                    return this.play(this.queue[0]);
                return;
            }
        }
        const options = {
            guildId: this.guild,
            encodedTrack: this.queue.current.track,
            ...finalOptions,
        };
        if (typeof options.encodedTrack !== "string") {
            options.encodedTrack = options.encodedTrack.track;
        }
        const now = Date.now();
        await this.node.updatePlayer({
            guildId: this.guild,
            noReplace: finalOptions.noReplace ?? false,
            playerOptions: options,
        });
        this.ping = Date.now() - now;
        return;
    }
    /**
     * Sets the player volume.
     * @param volume
     */
    setVolume(volume) {
        volume = Number(volume);
        if (isNaN(volume))
            throw new TypeError("Volume must be a number.");
        this.volume = Math.max(Math.min(volume, 500), 0);
        this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: {
                volume: this.volume
            }
        });
        return this;
    }
    /**
     * Sets the track repeat.
     * @param repeat
     */
    setTrackRepeat(repeat) {
        if (typeof repeat !== "boolean")
            throw new TypeError('Repeat can only be "true" or "false".');
        if (repeat) {
            this.trackRepeat = true;
            this.queueRepeat = false;
        }
        else {
            this.trackRepeat = false;
            this.queueRepeat = false;
        }
        return this;
    }
    /**
     * Sets the queue repeat.
     * @param repeat
     */
    setQueueRepeat(repeat) {
        if (typeof repeat !== "boolean")
            throw new TypeError('Repeat can only be "true" or "false".');
        if (repeat) {
            this.trackRepeat = false;
            this.queueRepeat = true;
        }
        else {
            this.trackRepeat = false;
            this.queueRepeat = false;
        }
        return this;
    }
    /** Stops the current track, optionally give an amount to skip to, e.g 5 would play the 5th song. */
    async stop(amount) {
        if (typeof amount === "number" && amount > 1) {
            if (amount > this.queue.length)
                throw new RangeError("Cannot skip more than the queue length.");
            this.queue.splice(0, amount - 1);
        }
        const now = Date.now();
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: { encodedTrack: null }
        });
        this.ping = Date.now() - now;
        return this;
    }
    /**
     * Pauses the current track.
     * @param pause
     */
    async pause(paused) {
        if (typeof paused !== "boolean")
            throw new RangeError('Pause can only be "true" or "false".');
        // If already paused or the queue is empty do nothing https://github.com/MenuDocs/erela.js/issues/58
        if (this.paused === paused || !this.queue.totalSize)
            return this;
        this.playing = !paused;
        this.paused = paused;
        const now = Date.now();
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: { paused },
        });
        this.ping = Date.now() - now;
        return this;
    }
    /**
     * Seeks to the position in the current track.
     * @param position
     */
    async seek(position) {
        if (!this.queue.current)
            return undefined;
        position = Number(position);
        if (isNaN(position)) {
            throw new RangeError("Position must be a number.");
        }
        if (position < 0 || position > this.queue.current.duration)
            position = Math.max(Math.min(position, this.queue.current.duration), 0);
        this.position = position;
        const now = Date.now();
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: { position }
        });
        this.ping = Date.now() - now;
        return this;
    }
}
exports.Player = Player;
function getOptions(opts) {
    const valids = ["startTime", "endTime", "noReplace", "volume", "pause"];
    const returnObject = {};
    if (!opts)
        return false;
    for (const [key, value] of Object.entries(Object.assign({}, opts))) {
        if (valids.includes(key))
            returnObject[key] = value;
    }
    return returnObject;
}
