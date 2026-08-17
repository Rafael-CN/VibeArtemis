package com.limelight.binding.input;

import org.junit.Before;
import org.junit.Test;

import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

/**
 * Covers the pacing of text and backspaces on the way to the host.
 *
 * The regression these tests exist for: a commit that produced more than one chunk was
 * silently dropped, and the leftover entries then wedged the queue for the rest of the
 * session. It survived because nothing exercised the multi-chunk path.
 */
public class TextInputPumpTest {

    /** Runs scheduled tasks when told to, so tests control time explicitly. */
    private static class FakeScheduler implements TextInputPump.Scheduler {
        final Deque<Runnable> pending = new ArrayDeque<>();

        @Override
        public void postDelayed(Runnable task, long delayMs) {
            pending.add(task);
        }

        /** Runs queued tasks until nothing more is scheduled, with a safety bound. */
        int drain() {
            int ticks = 0;
            while (!pending.isEmpty()) {
                if (++ticks > 10_000) {
                    throw new AssertionError("scheduler never settled — probable infinite reschedule");
                }
                pending.poll().run();
            }
            return ticks;
        }
    }

    private static class RecordingSink implements TextInputPump.Sink {
        final List<String> chunks = new ArrayList<>();
        int backspaces = 0;
        final List<Integer> backspaceBatches = new ArrayList<>();

        @Override
        public void sendText(String utf8Chunk) {
            chunks.add(utf8Chunk);
        }

        @Override
        public void sendBackspaces(int count) {
            backspaces += count;
            backspaceBatches.add(count);
        }

        String joined() {
            return String.join("", chunks);
        }
    }

    private FakeScheduler scheduler;
    private RecordingSink sink;
    private TextInputPump pump;

    @Before
    public void setUp() {
        scheduler = new FakeScheduler();
        sink = new RecordingSink();
        pump = new TextInputPump(sink, scheduler);
    }

    private static String repeat(String unit, int times) {
        StringBuilder sb = new StringBuilder(unit.length() * times);
        for (int i = 0; i < times; i++) {
            sb.append(unit);
        }
        return sb.toString();
    }

    @Test
    public void shortText_isDeliveredWhole() {
        pump.offerText("hello");
        scheduler.drain();

        assertEquals("hello", sink.joined());
        assertTrue(pump.isIdle());
    }

    /** The regression: text larger than one chunk used to be dropped entirely. */
    @Test
    public void multiChunkText_isFullyDelivered() {
        String text = repeat("a", TextInputPump.UTF8_CHUNK_SIZE * 3 + 17);

        pump.offerText(text);
        scheduler.drain();

        assertEquals("every byte must reach the sink", text, sink.joined());
        assertTrue("queue must be empty afterwards", pump.isIdle());
    }

    /** And the nastier half: the wedged queue broke every later commit too. */
    @Test
    public void queueKeepsWorkingAfterAMultiChunkCommit() {
        pump.offerText(repeat("b", TextInputPump.UTF8_CHUNK_SIZE * 2));
        scheduler.drain();
        sink.chunks.clear();

        pump.offerText("still alive");
        scheduler.drain();

        assertEquals("still alive", sink.joined());
    }

    @Test
    public void chunkBoundaryNeverSplitsACodePoint() {
        // Three-byte code points do not divide evenly into the chunk size, so a naive
        // split lands mid-sequence and corrupts the text.
        String text = repeat("日", TextInputPump.UTF8_CHUNK_SIZE);

        pump.offerText(text);
        scheduler.drain();

        assertEquals(text, sink.joined());
        for (String chunk : sink.chunks) {
            assertFalse("chunk must not contain a replacement char", chunk.contains("�"));
            assertTrue("chunk must round-trip through UTF-8",
                    new String(chunk.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8).equals(chunk));
        }
    }

    @Test
    public void supplementaryCharactersSurvive() {
        // Emoji are the case that modified UTF-8 mangles on the JNI boundary.
        String text = repeat("😀", 400);

        pump.offerText(text);
        scheduler.drain();

        assertEquals(text, sink.joined());
    }

    @Test
    public void emptyAndNullTextAreIgnored() {
        pump.offerText("");
        pump.offerText(null);

        assertTrue(pump.isIdle());
        assertEquals(0, sink.chunks.size());
    }

    @Test
    public void backspacesAreDeliveredInBoundedBatches() {
        pump.offerBackspaces(50);
        scheduler.drain();

        assertEquals(50, sink.backspaces);
        for (int batch : sink.backspaceBatches) {
            assertTrue("batch " + batch + " exceeds the per-tick bound",
                    batch <= TextInputPump.BACKSPACES_PER_TICK);
        }
        assertTrue(pump.isIdle());
    }

    @Test
    public void backspacesQueuedWhileDrainingAreNotLost() {
        pump.offerBackspaces(10);
        // Run a single tick, then pile on more while a flush is already scheduled.
        scheduler.pending.poll().run();
        pump.offerBackspaces(5);
        scheduler.drain();

        assertEquals(15, sink.backspaces);
    }

    @Test
    public void clearDropsPendingWork() {
        pump.offerText(repeat("c", TextInputPump.UTF8_CHUNK_SIZE * 4));
        pump.offerBackspaces(20);
        pump.clear();

        assertTrue(pump.isIdle());
        assertEquals(0, pump.pendingChunks());
        assertEquals(0, pump.pendingBackspaces());
    }

    @Test
    public void interleavedTextAndBackspacesBothComplete() {
        pump.offerText(repeat("d", TextInputPump.UTF8_CHUNK_SIZE + 1));
        pump.offerBackspaces(12);
        scheduler.drain();

        assertEquals(TextInputPump.UTF8_CHUNK_SIZE + 1, sink.joined().length());
        assertEquals(12, sink.backspaces);
        assertTrue(pump.isIdle());
    }
}
