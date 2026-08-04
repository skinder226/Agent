async function sendMessage(conversation_id, prompt, token, agent, onToken) {
    try {
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
            })
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
        console.log(error);
        return { error: `Error sending message: ${error.message}` };
    }
}

export default sendMessage;