"""
Some reasoning-capable models (Nemotron, DeepSeek-R1, QwQ, etc.) emit their
internal reasoning wrapped in <think>...</think> before the real answer.
That must never reach the user. This buffers across streamed chunks since
the tags can be split across multiple deltas (e.g. "<th" then "ink>").
"""


class ThinkFilter:
    def __init__(self, on_emit):
        """on_emit(text): called with each piece of *visible* text as soon
        as it's safe to show (i.e. confirmed to be outside a <think> block).
        """
        self._on_emit = on_emit
        self._buffer = ""
        self._in_think_block = False
        self.full_text = ""

    def feed(self, chunk_text: str):
        self._buffer += chunk_text

        while True:
            if not self._in_think_block:
                start = self._buffer.find("<think>")
                if start == -1:
                    # No opening tag pending — flush everything we have, but
                    # hold back a small tail in case "<think>" is split
                    # across this chunk and the next one.
                    hold_back = len("<think>") - 1
                    if len(self._buffer) > hold_back:
                        emit = self._buffer[: len(self._buffer) - hold_back]
                        self._buffer = self._buffer[len(self._buffer) - hold_back:]
                        if emit:
                            self.full_text += emit
                            self._on_emit(emit)
                    break
                else:
                    pre = self._buffer[:start]
                    if pre:
                        self.full_text += pre
                        self._on_emit(pre)
                    self._buffer = self._buffer[start + len("<think>"):]
                    self._in_think_block = True
            else:
                end = self._buffer.find("</think>")
                if end == -1:
                    # Still inside reasoning — discard, nothing to show.
                    self._buffer = ""
                    break
                else:
                    self._buffer = self._buffer[end + len("</think>"):]
                    self._in_think_block = False

    def flush(self):
        """Call once streaming is done to emit any trailing held-back text."""
        if self._buffer and not self._in_think_block:
            self.full_text += self._buffer
            self._on_emit(self._buffer)
            self._buffer = ""
