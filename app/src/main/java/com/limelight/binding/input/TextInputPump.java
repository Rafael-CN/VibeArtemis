package com.limelight.binding.input;

import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Queue;

/**
 * Paces text and backspaces on their way to the host.
 *
 * <p>Two things make naive sending wrong here. moonlight-common-c queues at most
 * {@code MAX_QUEUED_INPUT_PACKETS} (150) input packets and drops the rest silently, so a
 * burst — deleting a whole word emits two key events per character — overflows it. And a
 * single commit can carry more text than we want to hand over at once, so it is split into
 * chunks that are drained one per tick.
 *
 * <p>This class exists separately from {@code Game} so the pacing logic can be tested on
 * the JVM. The bug it was extracted from — a flush that was only scheduled when the queue
 * happened to hold exactly one chunk, silently dropping every longer commit and then
 * wedging the queue for the rest of the session — was invisible precisely because nothing
 * covered it.
 *
 * <p>Not thread-safe: drive it from a single thread, as {@code Game} does from the main
 * looper.
 */
public class TextInputPump {

    /** How much UTF-8 goes to the native layer per tick. */
    public static final int UTF8_CHUNK_SIZE = 512;

    /**
     * Backspaces emitted per tick. Each one costs a down and an up event, so this stays
     * well under the native queue bound even when several ticks overlap in flight.
     */
    public static final int BACKSPACES_PER_TICK = 8;

    /** Where the paced output goes. Implemented by {@code Game}, mocked in tests. */
    public interface Sink {
        void sendText(String utf8Chunk);
        void sendBackspaces(int count);
    }

    /** Schedules the next drain. Implemented over a Handler in production. */
    public interface Scheduler {
        void postDelayed(Runnable task, long delayMs);
    }

    private final Sink sink;
    private final Scheduler scheduler;
    private final Queue<String> textQueue = new ArrayDeque<>();

    private boolean textFlushScheduled = false;
    private int pendingBackspaces = 0;
    private boolean backspaceFlushScheduled = false;

    private final Runnable drainText = new Runnable() {
        @Override
        public void run() {
            String chunk = textQueue.poll();
            if (chunk != null) {
                sink.sendText(chunk);
            }
            if (textQueue.isEmpty()) {
                textFlushScheduled = false;
            }
            else {
                scheduler.postDelayed(this, 15);
            }
        }
    };

    private final Runnable drainBackspaces = new Runnable() {
        @Override
        public void run() {
            int batch = Math.min(pendingBackspaces, BACKSPACES_PER_TICK);
            if (batch > 0) {
                sink.sendBackspaces(batch);
                pendingBackspaces -= batch;
            }
            if (pendingBackspaces > 0) {
                scheduler.postDelayed(this, 8);
            }
            else {
                backspaceFlushScheduled = false;
            }
        }
    };

    public TextInputPump(Sink sink, Scheduler scheduler) {
        this.sink = sink;
        this.scheduler = scheduler;
    }

    /** Queues text for delivery, splitting it without ever cutting a code point in half. */
    public void offerText(String text) {
        if (text == null || text.isEmpty()) {
            return;
        }

        byte[] utf8 = text.getBytes(StandardCharsets.UTF_8);
        int offset = 0;
        while (offset < utf8.length) {
            int end = Math.min(offset + UTF8_CHUNK_SIZE, utf8.length);
            // Walk back to the start of a code point if we landed on a continuation byte.
            while (end < utf8.length && (utf8[end] & 0xC0) == 0x80) {
                end--;
            }
            // A chunk boundary can never be empty: UTF_8 encoding produces at most 4 bytes
            // per code point, well below UTF8_CHUNK_SIZE, so `end` always advances.
            textQueue.add(new String(utf8, offset, end - offset, StandardCharsets.UTF_8));
            offset = end;
        }

        // Schedule on a flag, not on the queue size. Testing `size() == 1` here is what
        // used to drop every multi-chunk commit.
        if (!textFlushScheduled && !textQueue.isEmpty()) {
            textFlushScheduled = true;
            scheduler.postDelayed(drainText, 0);
        }
    }

    /** Queues {@code count} backspaces, to be emitted in small batches. */
    public void offerBackspaces(int count) {
        if (count <= 0) {
            return;
        }
        pendingBackspaces += count;
        if (!backspaceFlushScheduled) {
            backspaceFlushScheduled = true;
            scheduler.postDelayed(drainBackspaces, 0);
        }
    }

    /** Drops anything still queued. Used when the connection goes away. */
    public void clear() {
        textQueue.clear();
        pendingBackspaces = 0;
        textFlushScheduled = false;
        backspaceFlushScheduled = false;
    }

    public boolean isIdle() {
        return textQueue.isEmpty() && pendingBackspaces == 0;
    }

    public int pendingChunks() {
        return textQueue.size();
    }

    public int pendingBackspaces() {
        return pendingBackspaces;
    }
}
