"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = exports.Structure = exports.TrackUtils = void 0;
const Node_1 = require("./Node");
const Player_1 = require("./Player");
const Queue_1 = require("./Queue");
/** @hidden */
const TRACK_SYMBOL = Symbol("track"), 
/** @hidden */
UNRESOLVED_TRACK_SYMBOL = Symbol("unresolved"), SIZES = [
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
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
class TrackUtils {
    static trackPartial = null;
    static manager;
    /** @hidden */
    static init(manager) {
        this.manager = manager;
    }
    static setTrackPartial(partial) {
        if (!Array.isArray(partial) || !partial.every(str => typeof str === "string"))
            throw new Error("Provided partial is not an array or not a string array.");
        if (!partial.includes("track"))
            partial.unshift("track");
        this.trackPartial = partial;
    }
    /**
     * Checks if the provided argument is a valid Track or UnresolvedTrack, if provided an array then every element will be checked.
     * @param trackOrTracks
     */
    static validate(trackOrTracks) {
        if (typeof trackOrTracks === "undefined")
            throw new RangeError("Provided argument must be present.");
        if (Array.isArray(trackOrTracks) && trackOrTracks.length) {
            for (const track of trackOrTracks) {
                if (!(track[TRACK_SYMBOL] || track[UNRESOLVED_TRACK_SYMBOL]))
                    return false;
            }
            return true;
        }
        return (trackOrTracks[TRACK_SYMBOL] ||
            trackOrTracks[UNRESOLVED_TRACK_SYMBOL]) === true;
    }
    /**
     * Checks if the provided argument is a valid UnresolvedTrack.
     * @param track
     */
    static isUnresolvedTrack(track) {
        if (typeof track === "undefined")
            throw new RangeError("Provided argument must be present.");
        return track[UNRESOLVED_TRACK_SYMBOL] === true;
    }
    /**
     * Checks if the provided argument is a valid Track.
     * @param track
     */
    static isTrack(track) {
        if (typeof track === "undefined")
            throw new RangeError("Provided argument must be present.");
        return track[TRACK_SYMBOL] === true;
    }
    /**
     * Builds a Track from the raw data from Lavalink and a optional requester.
     * @param data
     * @param requester
     */
    static build(data, requester) {
        if (typeof data === "undefined")
            throw new RangeError('Argument "data" must be present.');
        const encodedTrackString = data.encoded || data.encodedTrack || data.track;
        if (!encodedTrackString)
            throw new RangeError("Argument 'data.encoded' / 'data.encodedTrack' / 'data.track' must be present.");
        if (!data.info)
            data.info = {};
        try {
            const track = {
                track: encodedTrackString,
                encodedTrack: encodedTrackString,
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
                artworkURL: data.info.artworkUrl?.replace("/maxresdefault.jpg", "/mqdefault.jpg"),
                isrc: data.info.isrc,
                // library data
                isPreview: (data.info.identifier?.includes?.("/preview") && data.info.identifier?.includes?.("soundcloud")) || (data.info.length === 30000 && ["soundcloud.", "deezer."].some(domain => data.info.identifier?.includes?.(domain))),
                // parsed Thumbnail
                thumbnail: (data.info.artworkUrl?.replace("/maxresdefault.jpg", "/mqdefault.jpg") || data.info.thumbnail || data.info.image) || ["youtube.", "youtu.be"].some(d => data.info.uri?.includes?.(d))
                    ? `https://img.youtube.com/vi/${data.info.identifier}/mqdefault.jpg` : (data.info?.md5_image && data.info?.uri?.includes?.("deezer"))
                    ? `https://cdns-images.dzcdn.net/images/cover/${data.info.md5_image}/500x500.jpg` : null,
                displayThumbnail(size = "mqdefault") {
                    const finalSize = SIZES.find((s) => s === size) ?? "default";
                    return (data?.info?.uri?.includes?.("youtube.") || data?.info?.uri?.includes?.("youtu.be"))
                        ? `https://img.youtube.com/vi/${data.info.identifier}/${finalSize}.jpg`
                        : (data.info?.md5_image && data.info?.uri?.includes?.("deezer"))
                            ? `https://cdns-images.dzcdn.net/images/cover/${data.info.md5_image}/500x500.jpg`
                            : data.info?.thumbnail || data.info?.image;
                },
                requester: requester || {},
            };
            track.displayThumbnail = track.displayThumbnail.bind(track);
            if (this.trackPartial) {
                for (const key of Object.keys(track)) {
                    if (this.trackPartial.includes(key))
                        continue;
                    delete track[key];
                }
            }
            Object.defineProperty(track, TRACK_SYMBOL, {
                configurable: true,
                value: true
            });
            return track;
        }
        catch (error) {
            throw new RangeError(`Argument "data" is not a valid track: ${error.message}`);
        }
    }
    /**
     * Builds a UnresolvedTrack to be resolved before being played  .
     * @param query
     * @param requester
     */
    static buildUnresolved(query, requester) {
        if (typeof query === "undefined")
            throw new RangeError('Argument "query" must be present.');
        let unresolvedTrack = {
            requester,
            async resolve() {
                const resolved = await TrackUtils.getClosestTrack(this);
                Object.getOwnPropertyNames(this).forEach(prop => delete this[prop]);
                Object.assign(this, resolved);
            }
        };
        if (typeof query === "string")
            unresolvedTrack.title = query;
        else
            unresolvedTrack = { ...unresolvedTrack, ...query };
        Object.defineProperty(unresolvedTrack, UNRESOLVED_TRACK_SYMBOL, {
            configurable: true,
            value: true
        });
        return unresolvedTrack;
    }
    static async getClosestTrack(unresolvedTrack, customNode) {
        if (!TrackUtils.manager)
            throw new RangeError("Manager has not been initiated.");
        if (!TrackUtils.isUnresolvedTrack(unresolvedTrack))
            throw new RangeError("Provided track is not a UnresolvedTrack.");
        const query = [unresolvedTrack.author, unresolvedTrack.title].filter(str => !!str).join(" - ");
        const isvalidUri = (str) => {
            const valids = ["www.youtu", "music.youtu", "soundcloud.com"];
            if (TrackUtils.manager.options.validUnresolvedUris && TrackUtils.manager.options.validUnresolvedUris.length) {
                valids.push(...TrackUtils.manager.options.validUnresolvedUris);
            }
            // auto remove plugins which make it to unresolved, so that it can search on youtube etc.
            if (TrackUtils.manager.options.plugins && TrackUtils.manager.options.plugins.length) {
                const pluginNames = TrackUtils.manager.options.plugins.map(c => c?.constructor?.name?.toLowerCase?.());
                for (const valid of valids)
                    if (pluginNames?.some?.(v => valid?.toLowerCase?.().includes?.(v)))
                        valids.splice(valids.indexOf(valid), 1);
            }
            if (!str)
                return false;
            if (valids.some(x => str.includes(x.toLowerCase())))
                return true;
            return false;
        };
        const res = isvalidUri(unresolvedTrack.uri) ? await TrackUtils.manager.search(unresolvedTrack.uri, unresolvedTrack.requester, customNode) : await TrackUtils.manager.search(query, unresolvedTrack.requester, customNode);
        if (res.loadType !== "SEARCH_RESULT")
            throw res.exception ?? {
                message: "No tracks found.",
                severity: "COMMON",
            };
        if (unresolvedTrack.author) {
            const channelNames = [unresolvedTrack.author, `${unresolvedTrack.author} - Topic`];
            const originalAudio = res.tracks.find(track => {
                return (channelNames.some(name => new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.author)) ||
                    new RegExp(`^${escapeRegExp(unresolvedTrack.title)}$`, "i").test(track.title));
            });
            if (originalAudio) {
                originalAudio.uri = unresolvedTrack.uri;
                if (TrackUtils.manager.options.useUnresolvedData) { // overwrite values
                    if (unresolvedTrack.thumbnail?.length)
                        originalAudio.thumbnail = unresolvedTrack.thumbnail;
                    if (unresolvedTrack.title?.length)
                        originalAudio.title = unresolvedTrack.title;
                    if (unresolvedTrack.author?.length)
                        originalAudio.author = unresolvedTrack.author;
                }
                else { // only overwrite if undefined / invalid
                    if ((originalAudio.title == 'Unknown title' || originalAudio.title == "Unspecified description") && originalAudio.title != unresolvedTrack.title)
                        originalAudio.title = unresolvedTrack.title;
                    if (originalAudio.author != unresolvedTrack.author)
                        originalAudio.author = unresolvedTrack.author;
                    if (originalAudio.thumbnail != unresolvedTrack.thumbnail)
                        originalAudio.thumbnail = unresolvedTrack.thumbnail;
                }
                for (const key of Object.keys(unresolvedTrack))
                    if (!originalAudio[key])
                        originalAudio[key] = unresolvedTrack[key]; // add non-existing values
                return originalAudio;
            }
        }
        if (unresolvedTrack.duration) {
            const sameDuration = res.tracks.find(track => (track.duration >= (unresolvedTrack.duration - 1500)) &&
                (track.duration <= (unresolvedTrack.duration + 1500)));
            if (sameDuration) {
                sameDuration.uri = unresolvedTrack.uri;
                if (TrackUtils.manager.options.useUnresolvedData) { // overwrite values
                    if (unresolvedTrack.thumbnail?.length)
                        sameDuration.thumbnail = unresolvedTrack.thumbnail;
                    if (unresolvedTrack.title?.length)
                        sameDuration.title = unresolvedTrack.title;
                    if (unresolvedTrack.author?.length)
                        sameDuration.author = unresolvedTrack.author;
                }
                else { // only overwrite if undefined / invalid
                    if ((sameDuration.title == 'Unknown title' || sameDuration.title == "Unspecified description") && sameDuration.title != unresolvedTrack.title)
                        sameDuration.title = unresolvedTrack.title;
                    if (sameDuration.author != unresolvedTrack.author)
                        sameDuration.author = unresolvedTrack.author;
                    if (sameDuration.thumbnail != unresolvedTrack.thumbnail)
                        sameDuration.thumbnail = unresolvedTrack.thumbnail;
                }
                for (const key of Object.keys(unresolvedTrack))
                    if (!sameDuration[key])
                        sameDuration[key] = unresolvedTrack[key]; // add non-existing values
                return sameDuration;
            }
        }
        res.tracks[0].uri = unresolvedTrack.uri;
        if (TrackUtils.manager.options.useUnresolvedData) { // overwrite values
            if (unresolvedTrack.thumbnail?.length)
                res.tracks[0].thumbnail = unresolvedTrack.thumbnail;
            if (unresolvedTrack.title?.length)
                res.tracks[0].title = unresolvedTrack.title;
            if (unresolvedTrack.author?.length)
                res.tracks[0].author = unresolvedTrack.author;
        }
        else { // only overwrite if undefined / invalid
            if ((res.tracks[0].title == 'Unknown title' || res.tracks[0].title == "Unspecified description") && unresolvedTrack.title != res.tracks[0].title)
                res.tracks[0].title = unresolvedTrack.title;
            if (unresolvedTrack.author != res.tracks[0].author)
                res.tracks[0].author = unresolvedTrack.author;
            if (unresolvedTrack.thumbnail != res.tracks[0].thumbnail)
                res.tracks[0].thumbnail = unresolvedTrack.thumbnail;
        }
        for (const key of Object.keys(unresolvedTrack))
            if (!res.tracks[0][key])
                res.tracks[0][key] = unresolvedTrack[key]; // add non-existing values
        return res.tracks[0];
    }
}
exports.TrackUtils = TrackUtils;
/** Gets or extends structures to extend the built in, or already extended, classes to add more functionality. */
class Structure {
    /**
     * Extends a class.
     * @param name
     * @param extender
     */
    static extend(name, extender) {
        if (!structures[name])
            throw new TypeError(`"${name} is not a valid structure`);
        const extended = extender(structures[name]);
        structures[name] = extended;
        return extended;
    }
    /**
     * Get a structure from available structures by name.
     * @param name
     */
    static get(name) {
        const structure = structures[name];
        if (!structure)
            throw new TypeError('"structure" must be provided.');
        return structure;
    }
}
exports.Structure = Structure;
class Plugin {
    load(manager) { }
    unload(manager) { }
}
exports.Plugin = Plugin;
const structures = {
    Player: Player_1.Player,
    Queue: Queue_1.Queue,
    Node: Node_1.Node,
};
;
