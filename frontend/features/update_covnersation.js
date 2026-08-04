export const update_conversation = async (conversation_id,title, Authorization) => {
    try {
        console.log("Updating conversation with ID:", conversation_id, "and title:", title);
        const data = await fetch("http://localhost:8000/chat/update-conversation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Authorization}`
            },
            body: JSON.stringify({
                "conversation_id": conversation_id,
                "title": title
            })
        });
        let res = await data.json();
        return res;
    } catch (error) {
        console.log("Error in create_conversation", error);
        return []
    }
}