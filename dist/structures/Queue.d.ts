import { Track, UnresolvedTrack } from "./Player";
/**
 * The player's queue, the `current` property is the currently playing track, think of the rest as the up-coming tracks.
 * @noInheritDoc
 */
export declare class Queue extends Array<Track | UnresolvedTrack> {
    /** The size of tracks in the queue. */
    get size(): number;
    /** The current track */
    current: Track | UnresolvedTrack | null;
    /** The previous track */
    previous: Track | UnresolvedTrack | null;
    /**
     * Adds a track to the queue.
     * @param track
     * @param [offset=null]
     */
    add(track: (Track | UnresolvedTrack) | (Track | UnresolvedTrack)[], offset?: number): void;
    /** Clears the queue. */
    clear(): void;
    /** Shuffles the queue. */
    shuffle(): void;
}
