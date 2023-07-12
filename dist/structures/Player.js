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
    /** The real volume for the player (if volumedecrementer is used this will be diffrent to player.volume) */
    lavalinkVolume;
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
    /** The new VoiceState Data from Lavalink */
    voice;
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
        this.set("lastposition", undefined);
        if (typeof options.customData === "object" && Object.keys(options.customData).length) {
            this.data = { ...this.data, ...options.customData };
        }
        this.guild = options.guild;
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
        const customNode = this.manager.nodes.get(options.node);
        const regionNode = this.manager.leastUsedNodes.filter(x => x.regions?.includes(options.region?.toLowerCase()))?.first();
        this.node = customNode || regionNode || this.manager.leastUsedNodes.first();
        if (!this.node)
            throw new RangeError("No available nodes.");
        this.filters = {
            volume: false,
            vaporwave: false,
            custom: false,
            nightcore: false,
            echo: false,
            reverb: false,
            rotation: false,
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
            reverb: {
                delay: 0,
                decay: 0
            },
            rotation: {
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
    checkFiltersState(oldFilterTimescale) {
        this.filters.rotation = this.filterData.rotation.rotationHz !== 0;
        this.filters.vibrato = this.filterData.vibrato.frequency !== 0 || this.filterData.vibrato.depth !== 0;
        this.filters.tremolo = this.filterData.tremolo.frequency !== 0 || this.filterData.tremolo.depth !== 0;
        this.filters.echo = this.filterData.echo.decay !== 0 || this.filterData.echo.delay !== 0;
        this.filters.reverb = this.filterData.reverb.decay !== 0 || this.filterData.reverb.delay !== 0;
        this.filters.lowPass = this.filterData.lowPass.smoothing !== 0;
        this.filters.karaoke = Object.values(this.filterData.karaoke).some(v => v !== 0);
        if ((this.filters.nightcore || this.filters.vaporwave) && oldFilterTimescale) {
            if (oldFilterTimescale.pitch !== this.filterData.timescale.pitch || oldFilterTimescale.rate !== this.filterData.timescale.rate || oldFilterTimescale.speed !== this.filterData.timescale.speed) {
                this.filters.custom = Object.values(this.filterData.timescale).some(v => v !== 1);
                this.filters.nightcore = false;
                this.filters.vaporwave = false;
            }
        }
        return true;
    }
    /**
     * Reset all Filters
     */
    async resetFilters() {
        this.filters.echo = false;
        this.filters.reverb = false;
        this.filters.nightcore = false;
        this.filters.lowPass = false;
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
            reverb: {
                delay: 0,
                decay: 0
            },
            rotation: {
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
        await this.updatePlayerFilters();
        return this.filters;
    }
    /**
     * Set the AudioOutput Filter
     * @param type
     */
    async setAudioOutput(type) {
        if (this.node.info && !this.node.info?.filters?.includes("channelMix"))
            throw new Error("Node#Info#filters does not include the 'channelMix' Filter (Node has it not enable)");
        if (!type || !exports.validAudioOutputs[type])
            throw "Invalid audio type added, must be 'mono' / 'stereo' / 'left' / 'right'";
        this.filterData.channelMix = exports.validAudioOutputs[type];
        this.filters.audioOutput = type;
        await this.updatePlayerFilters();
        return this.filters.audioOutput;
    }
    /**
     * Set custom filter.timescale#speed . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed
     * @returns
     */
    async setSpeed(speed = 1) {
        if (this.node.info && !this.node.info?.filters?.includes("timescale"))
            throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)");
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
    async setPitch(pitch = 1) {
        if (this.node.info && !this.node.info?.filters?.includes("timescale"))
            throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)");
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
    async setRate(rate = 1) {
        if (this.node.info && !this.node.info?.filters?.includes("timescale"))
            throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)");
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
    async toggleRotation(rotationHz = 0.2) {
        if (this.node.info && !this.node.info?.filters?.includes("rotation"))
            throw new Error("Node#Info#filters does not include the 'rotation' Filter (Node has it not enable)");
        this.filterData.rotation.rotationHz = this.filters.rotation ? 0 : rotationHz;
        this.filters.rotation = !this.filters.rotation;
        return await this.updatePlayerFilters(), this.filters.rotation;
    }
    /**
     * Enabels / Disables the Vibrato effect, (Optional: provide your Own Data)
     * @param frequency
     * @param depth
     * @returns
     */
    async toggleVibrato(frequency = 2, depth = 0.5) {
        if (this.node.info && !this.node.info?.filters?.includes("vibrato"))
            throw new Error("Node#Info#filters does not include the 'vibrato' Filter (Node has it not enable)");
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
    async toggleTremolo(frequency = 2, depth = 0.5) {
        if (this.node.info && !this.node.info?.filters?.includes("tremolo"))
            throw new Error("Node#Info#filters does not include the 'tremolo' Filter (Node has it not enable)");
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
    async toggleLowPass(smoothing = 20) {
        if (this.node.info && !this.node.info?.filters?.includes("lowPass"))
            throw new Error("Node#Info#filters does not include the 'lowPass' Filter (Node has it not enable)");
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
    async toggleEcho(delay = 1, decay = 0.5) {
        if (this.node.info && !this.node.info?.filters?.includes("echo"))
            throw new Error("Node#Info#filters does not include the 'echo' Filter (Node has it not enable aka not installed!)");
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
    async toggleReverb(delay = 1, decay = 0.5) {
        if (this.node.info && !this.node.info?.filters?.includes("reverb"))
            throw new Error("Node#Info#filters does not include the 'reverb' Filter (Node has it not enable aka not installed!)");
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
    async toggleNightcore(speed = 1.289999523162842, pitch = 1.289999523162842, rate = 0.9365999523162842) {
        if (this.node.info && !this.node.info?.filters?.includes("timescale"))
            throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)");
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
    async toggleVaporwave(speed = 0.8500000238418579, pitch = 0.800000011920929, rate = 1) {
        if (this.node.info && !this.node.info?.filters?.includes("timescale"))
            throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)");
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
    async toggleKaraoke(level = 1, monoLevel = 1, filterBand = 220, filterWidth = 100) {
        if (this.node.info && !this.node.info?.filters?.includes("karaoke"))
            throw new Error("Node#Info#filters does not include the 'karaoke' Filter (Node has it not enable)");
        this.filterData.karaoke.level = this.filters.karaoke ? 0 : level;
        this.filterData.karaoke.monoLevel = this.filters.karaoke ? 0 : monoLevel;
        this.filterData.karaoke.filterBand = this.filters.karaoke ? 0 : filterBand;
        this.filterData.karaoke.filterWidth = this.filters.karaoke ? 0 : filterWidth;
        this.filters.karaoke = !this.filters.karaoke;
        await this.updatePlayerFilters();
        return this.filters.karaoke;
    }
    /** Function to find out if currently there is a custom timescamle etc. filter applied */
    isCustomFilterActive() {
        this.filters.custom = !this.filters.nightcore && !this.filters.vaporwave && Object.values(this.filterData.timescale).some(d => d !== 1);
        return this.filters.custom;
    }
    // function to update all filters at ONCE (and eqs)
    async updatePlayerFilters() {
        const sendData = { ...this.filterData };
        if (!this.filters.volume)
            delete sendData.volume;
        if (!this.filters.tremolo)
            delete sendData.tremolo;
        if (!this.filters.vibrato)
            delete sendData.vibrato;
        //if(!this.filters.karaoke) delete sendData.karaoke;
        if (!this.filters.echo)
            delete sendData.echo;
        if (!this.filters.reverb)
            delete sendData.reverb;
        if (!this.filters.lowPass)
            delete sendData.lowPass;
        if (!this.filters.karaoke)
            delete sendData.karaoke;
        // if (!this.filters.rotation) delete sendData.rotation;
        if (this.filters.audioOutput === "stereo")
            delete sendData.channelMix;
        const now = Date.now();
        sendData.equalizer = this.bands.map((gain, band) => ({ band, gain }));
        for (const key of [...Object.keys(sendData)]) {
            if (this.node.info && !this.node.info?.filters?.includes?.(key))
                delete sendData[key];
        }
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: {
                filters: sendData,
            }
        });
        this.ping = Date.now() - now;
        if (this.options.instaUpdateFiltersFix === true)
            this.filterUpdated = 1;
        return this;
    }
    /**
     * Same as Manager#search() but a shortcut on the player itself. Custom Node is provided via player.node internally
     * @param query
     * @param requester
     */
    search(query, requester) {
        return this.manager.search(query, requester, this.node);
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
        const finalOptions = getOptions(playOptions || optionsOrTrack, !!this.node.sessionId) ? optionsOrTrack : {};
        if (Utils_1.TrackUtils.isUnresolvedTrack(this.queue.current)) {
            try {
                this.queue.current = await Utils_1.TrackUtils.getClosestTrack(this.queue.current, this.node);
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
            encodedTrack: this.queue.current.encodedTrack,
            ...finalOptions,
        };
        if (typeof options.encodedTrack !== "string") {
            options.encodedTrack = options.encodedTrack.encodedTrack;
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
     * @param volume 0-500
     */
    async setVolume(volume) {
        volume = Number(volume);
        if (isNaN(volume))
            throw new TypeError("Volume must be a number.");
        this.volume = Math.max(Math.min(volume, 500), 0);
        let vol = Number(this.volume);
        if (this.manager.options.volumeDecrementer)
            vol *= this.manager.options.volumeDecrementer;
        this.lavalinkVolume = Math.floor(vol * 100) / 100;
        const now = Date.now();
        if (this.manager.options.applyVolumeAsFilter) {
            await this.node.updatePlayer({
                guildId: this.guild,
                playerOptions: {
                    filters: { volume: vol / 100 }
                }
            });
        }
        else {
            await this.node.updatePlayer({
                guildId: this.guild,
                playerOptions: {
                    volume: vol
                }
            });
        }
        this.ping = Date.now() - now;
        return this;
    }
    /**
     * Applies a Node-Filter for Volume (make it louder/quieter without distortion | only for new REST api).
     * @param volume 0-5
     */
    async setVolumeFilter(volume) {
        if (!this.node.sessionId)
            throw new Error("The Lavalink-Node is either not ready, or not up to date! (REST Api must be useable)");
        volume = Number(volume);
        if (isNaN(volume))
            throw new TypeError("Volume must be a number.");
        this.filterData.volume = Math.max(Math.min(volume, 5), 0);
        this.filters.volume = this.filterData.volume === 1 ? false : true;
        const now = Date.now();
        await this.node.updatePlayer({
            guildId: this.guild,
            playerOptions: {
                filters: { volume: this.filterData.volume }
            }
        });
        this.ping = Date.now() - now;
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
        if (this.paused === paused || (!this.queue.current && !this.queue.size))
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
        this.set("lastposition", this.position);
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
function getOptions(opts, allowFilters) {
    const valids = ["startTime", "endTime", "noReplace", "volume", "pause", "filters"];
    const returnObject = {};
    if (!opts)
        return false;
    for (const [key, value] of Object.entries(Object.assign({}, opts))) {
        if (valids.includes(key) && (key !== "filters" || (key === "filters" && allowFilters))) {
            returnObject[key] = value;
        }
    }
    return returnObject;
}
