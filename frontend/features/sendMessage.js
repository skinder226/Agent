async function sendMessage(conversation_id, prompt, token, agent, onToken) {
    // Safety net: if the connection stalls/drops without cleanly signaling
    // done or throwing (seen with proxied SSE connections), reader.read()
    // can hang forever — which means this whole function never resolves,
    // which means the caller's isStreaming flag never gets reset. This
    // timer aborts the fetch if no new data has arrived for a while, so
    // the promise ALWAYS eventually settles one way or another.
    const IDLE_TIMEOUT_MS = 30_000;
    const controller = new AbortController();
    let idleTimer = null;
    const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
    };

    try {
        resetIdleTimer();

        const response = await fetch(`http://localhost:8000/agent/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                "conversation_id": conversation_id,
                "prompt": prompt,
                "agent": agent
            }),
            signal: controller.signal,
        });

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => "");
            return { error: errText || `Request failed with status ${response.status}` };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let images = [];
        let error = null;

        while (true) {
            const { done, value } = await reader.read();
            resetIdleTimer(); // got data (or a clean end) — connection is alive
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split("\n\n");
            buffer = parts.pop(); // keep incomplete chunk for next read

            for (const part of parts) {
                if (!part.startsWith("data: ")) continue;
                const jsonStr = part.slice(6);

                try {
                    const event = JSON.parse(jsonStr);

                    if (event.type === "token") {
                        fullText += event.content;
                        onToken?.(event.content); // stream to UI as it arrives
                    } else if (event.type === "done") {
                        images = event.images || [];
                    } else if (event.type === "error") {
                        error = event.message;
                    }
                } catch (e) {
                    console.log("Failed to parse SSE chunk:", jsonStr, e);
                }
            }
        }

        console.log("response", { fullText, images, error });

        if (error) {
            return { error };
        }

        return { ai_response: fullText, images };
    }
    catch (error) {
        if (error.name === "AbortError") {
            console.log("Stream stalled — no data for", IDLE_TIMEOUT_MS, "ms, aborted");
            return { error: "Connection stalled. Please try again." };
        }
        console.log(error);
        return { error: `Error sending message: ${error.message}` };
    }
    finally {
        if (idleTimer) clearTimeout(idleTimer);
    }
}

export default sendMessage;